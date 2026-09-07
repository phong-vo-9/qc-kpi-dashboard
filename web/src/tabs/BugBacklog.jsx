import { useEffect, useMemo, useState } from 'react'
import { Search, Bug, Filter, Layers3, Clock3, PlayCircle, ClipboardCheck, CheckCircle2, ExternalLink } from 'lucide-react'
import { Badge, EmptyState, Panel } from '../components/ui.jsx'
import { jiraUrl } from '../lib/api.js'
import { statusStyle } from '../lib/tokens.js'
import {
  BUG_GMS_MODULES,
  BUG_STATUS_BUCKETS,
  canonicalBugStatus,
  bugStatusOrder,
  normalizeBugLabel,
} from '../lib/bugModules.js'

const PAGE_SIZES = [10, 20, 50, 100]
const UNCLASSIFIED = { label: '__unclassified__', name: 'Chưa phân loại' }

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const toTime = (dateStr) => {
  if (!dateStr) return Number.POSITIVE_INFINITY
  const ts = new Date(dateStr).getTime()
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts
}

const SortableTH = ({ activeField, direction, field, onSort, children, className = '' }) => (
  <th
    onClick={() => onSort(field)}
    className={`py-2 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors select-none ${className}`}
  >
    <div className="flex items-center gap-1">
      {children}
      <span className="text-[10px] text-gray-400">{activeField !== field ? '↕' : direction === 'asc' ? '▲' : '▼'}</span>
    </div>
  </th>
)

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${tone}`}>
            <Icon size={18} />
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{value}</div>
      </div>
    </div>
  )
}

export default function BugBacklog({ bugs = [], highlightKey }) {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('updated')
  const [sortDirection, setSortDirection] = useState('desc')

  const gmsModuleMap = useMemo(
    () => new Map(BUG_GMS_MODULES.map((m) => [normalizeBugLabel(m.label), m])),
    []
  )

  const backlog = useMemo(() => (
    bugs
      .filter((x) => x.type === 'Bug')
      .map((bug) => {
        const moduleMatches = []
        for (const label of bug.labels || []) {
          const hit = gmsModuleMap.get(normalizeBugLabel(label))
          if (hit && !moduleMatches.some((m) => m.label.toLowerCase() === hit.label.toLowerCase())) {
            moduleMatches.push(hit)
          }
        }
        const primaryModule = moduleMatches[0] || UNCLASSIFIED
        return {
          ...bug,
          bugStatus: canonicalBugStatus(bug.status),
          primaryModule,
          moduleMatches: moduleMatches.length ? moduleMatches : [UNCLASSIFIED],
        }
      })
  ), [bugs, gmsModuleMap])

  const moduleStats = useMemo(() => {
    const map = new Map()
    for (const bug of backlog) {
      const key = bug.primaryModule.label
      const current = map.get(key) || { ...bug.primaryModule, count: 0, todo: 0, inProgress: 0, readyToTest: 0, testing: 0, done: 0 }
      current.count += 1
      if (bug.bugStatus === 'Todo') current.todo += 1
      else if (bug.bugStatus === 'In Progress') current.inProgress += 1
      else if (bug.bugStatus === 'Ready to Test') current.readyToTest += 1
      else if (bug.bugStatus === 'Testing') current.testing += 1
      else if (bug.bugStatus === 'Done') current.done += 1
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'))
  }, [backlog])

  const statusStats = useMemo(() => {
    const counts = Object.fromEntries(BUG_STATUS_BUCKETS.map((s) => [s, 0]))
    for (const bug of backlog) {
      if (counts[bug.bugStatus] != null) counts[bug.bugStatus] += 1
    }
    return counts
  }, [backlog])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return backlog.filter((bug) => {
      if (moduleFilter !== 'all' && bug.primaryModule.label !== moduleFilter) return false
      if (statusFilter !== 'all' && bug.bugStatus !== statusFilter) return false
      if (!q) return true
      const moduleText = [bug.primaryModule.name, ...bug.moduleMatches.map((m) => m.name)].join(' ')
      return (
        bug.key.toLowerCase().includes(q) ||
        (bug.summary || '').toLowerCase().includes(q) ||
        moduleText.toLowerCase().includes(q) ||
        (bug.priority || '').toLowerCase().includes(q) ||
        (bug.assignee || '').toLowerCase().includes(q) ||
        (bug.reporter || '').toLowerCase().includes(q)
      )
    })
  }, [backlog, moduleFilter, search, statusFilter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    return list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'module') {
        cmp = (a.primaryModule?.name || '').localeCompare(b.primaryModule?.name || '', 'vi', { numeric: true, sensitivity: 'base' })
      } else if (sortField === 'status') {
        cmp = bugStatusOrder(a.bugStatus) - bugStatusOrder(b.bugStatus)
      } else if (sortField === 'created' || sortField === 'updated' || sortField === 'duedate') {
        cmp = toTime(a[sortField]) - toTime(b[sortField])
      } else {
        cmp = String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''), 'vi', { numeric: true, sensitivity: 'base' })
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortDirection, sortField])

  useEffect(() => setPage(1), [search, moduleFilter, statusFilter, pageSize, sortField, sortDirection])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  const total = backlog.length
  const filterModules = moduleStats.filter((m) => m.label !== UNCLASSIFIED.label)
  const quickModules = filterModules.slice(0, 8)

  const isOverdue = (bug) => {
    if (!bug.duedate) return false
    const todayStr = new Date().toISOString().split('T')[0]
    return bug.duedate < todayStr && bug.bugStatus !== 'Done'
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'status' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Bộ lọc backlog" right={<Badge className="bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">{filtered.length}/{total}</Badge>}>
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo bug ID, summary, assignee, reporter..."
                className="pl-9 pr-3 py-2 w-full text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Filter size={15} />
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <option value="all">Tất cả module</option>
                {filterModules.map((m) => (
                  <option key={m.label} value={m.label}>{m.name} ({m.count})</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Layers3 size={15} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <option value="all">Tất cả trạng thái</option>
                {BUG_STATUS_BUCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModuleFilter('all')}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${moduleFilter === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
            >
              Tất cả
            </button>
            {quickModules.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setModuleFilter(m.label)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${moduleFilter === m.label ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
                title={m.name}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="truncate max-w-[220px]">{m.name}</span>
                  <span className="tabular-nums text-xs opacity-70">{m.count}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 pt-2">
            <StatCard icon={Bug} label="Tổng bug" value={total} tone="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
            <StatCard icon={Clock3} label="Todo" value={statusStats.Todo} tone="bg-gray-50 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300" />
            <StatCard icon={PlayCircle} label="In Progress" value={statusStats['In Progress']} tone="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
            <StatCard icon={ClipboardCheck} label="Ready to Test" value={statusStats['Ready to Test']} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" />
            <StatCard icon={CheckCircle2} label="Done" value={statusStats.Done} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
          </div>
        </div>
      </Panel>

      <Panel title="Danh sách bug backlog" right={<Badge className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">{sorted.length} bug</Badge>}>
        {sorted.length === 0 ? (
          <EmptyState icon={Bug} hint="Không có bug nào khớp bộ lọc hiện tại." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-neutral-800">
                    <SortableTH field="key" activeField={sortField} direction={sortDirection} onSort={handleSort}>Bug ID</SortableTH>
                    <SortableTH field="summary" activeField={sortField} direction={sortDirection} onSort={handleSort} className="w-[320px]">Summary</SortableTH>
                    <SortableTH field="module" activeField={sortField} direction={sortDirection} onSort={handleSort}>Module</SortableTH>
                    <SortableTH field="status" activeField={sortField} direction={sortDirection} onSort={handleSort}>Status</SortableTH>
                    <SortableTH field="priority" activeField={sortField} direction={sortDirection} onSort={handleSort}>Priority</SortableTH>
                    <SortableTH field="assignee" activeField={sortField} direction={sortDirection} onSort={handleSort}>Assignee</SortableTH>
                    <SortableTH field="reporter" activeField={sortField} direction={sortDirection} onSort={handleSort}>Reporter</SortableTH>
                    <SortableTH field="created" activeField={sortField} direction={sortDirection} onSort={handleSort}>Created</SortableTH>
                    <SortableTH field="duedate" activeField={sortField} direction={sortDirection} onSort={handleSort}>Due date</SortableTH>
                    <th className="py-2 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Labels</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((bug) => {
                    const highlighted = bug.key === highlightKey
                    return (
                      <tr
                        key={bug.key}
                        id={`task-${bug.key}`}
                        className={`border-b border-gray-50 dark:border-neutral-800/60 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-all ${highlighted ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 bg-blue-500/10' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <a href={jiraUrl(bug.key)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                            {bug.key} <ExternalLink size={12} />
                          </a>
                        </td>
                        <td className="py-2 px-3 w-[320px] max-w-[320px] truncate text-gray-700 dark:text-gray-200" title={bug.summary}>{bug.summary}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setModuleFilter(bug.primaryModule.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 hover:opacity-90"
                              title={bug.primaryModule.name}
                            >
                              {bug.primaryModule.name}
                            </button>
                            {bug.moduleMatches.length > 1 && (
                              <Badge className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                                +{bug.moduleMatches.length - 1}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3"><Badge className={statusStyle(bug.bugStatus)}>{bug.bugStatus}</Badge></td>
                        <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-gray-300">{bug.priority || '—'}</span></td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{bug.assignee || '—'}</td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{bug.reporter || '—'}</td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateDMY(bug.created)}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isOverdue(bug) ? (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><Clock3 size={12} /> {formatDateDMY(bug.duedate)}</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">{formatDateDMY(bug.duedate)}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 min-w-[220px]">
                          <div className="flex flex-wrap gap-1.5">
                            {bug.moduleMatches.slice(0, 3).map((module) => (
                              <Badge key={module.label} className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300" title={module.name}>
                                {module.name}
                              </Badge>
                            ))}
                            {bug.moduleMatches.length > 3 && (
                              <Badge className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">+{bug.moduleMatches.length - 3}</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 text-sm">
              <label className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                Bug / trang
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400 tabular-nums">{start + 1}–{Math.min(start + pageSize, sorted.length)} / {sorted.length}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Trước
                  </button>
                  <span className="px-3 py-1 text-gray-500 dark:text-gray-400 tabular-nums">{page}/{pageCount}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
