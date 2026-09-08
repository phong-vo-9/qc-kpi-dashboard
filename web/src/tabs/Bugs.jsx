import { useMemo, useState, useEffect } from 'react'
import { Search, ExternalLink, Inbox, AlertTriangle, Bug, CalendarOff, ChevronDown } from 'lucide-react'
import { Badge, EmptyState, Panel, Stat } from '../components/ui.jsx'
import { statusStyle } from '../lib/tokens.js'
import { jiraUrl } from '../lib/api.js'

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const TH = ({ children, className = '' }) => (
  <th className={`py-2 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap ${className}`}>{children}</th>
)

const PAGE_SIZES = [10, 20, 50, 100]

const isFixedBug = (bug) => ['done', 'released'].includes(String(bug.status || '').trim().toLowerCase())

export function GmsSprintStatsPanel({ bugs }) {
  const [sprintsExpanded, setSprintsExpanded] = useState(false)
  const sprintStats = useMemo(() => {
    const grouped = new Map()
    for (const bug of bugs) {
      const sprint = String(bug.sprint || '').trim()
      // GMS is a sprint prefix, not a project/module label.
      if (!/^GMS(?:\s|$)/i.test(sprint)) continue
      const current = grouped.get(sprint) || { sprint, total: 0, fixed: 0 }
      current.total += 1
      if (isFixedBug(bug)) current.fixed += 1
      grouped.set(sprint, current)
    }
    return [...grouped.values()]
      .map((item) => ({ ...item, open: item.total - item.fixed, rate: item.total ? Math.round((item.fixed / item.total) * 100) : 0 }))
      .sort((a, b) => a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: 'base' }))
  }, [bugs])

  const totals = useMemo(() => sprintStats.reduce(
    (acc, item) => ({ total: acc.total + item.total, fixed: acc.fixed + item.fixed }),
    { total: 0, fixed: 0 }
  ), [sprintStats])
  const overallRate = totals.total ? Math.round((totals.fixed / totals.total) * 100) : 0

  return (
    <Panel
      title="Bug GMS đã fix theo Sprint"
      right={(
        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          {sprintStats.length} sprint
        </Badge>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <div>
            <div className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Tiến độ fix GMS</div>
            <div className="text-xs text-indigo-700/70 dark:text-indigo-300/70">Chỉ các sprint GMS có bug được assign cho bạn trong bộ lọc hiện tại</div>
          </div>
          <div className="flex items-baseline gap-1.5 text-indigo-900 dark:text-indigo-100">
            <span className="text-2xl font-bold tabular-nums">{overallRate}%</span>
            <span className="text-xs text-indigo-700/70 dark:text-indigo-300/70">đã fix</span>
          </div>
        </div>

        {sprintStats.length === 0 ? (
          <EmptyState icon={Bug} title="Chưa có sprint GMS" hint="Hãy chọn bộ lọc có bug GMS được assign cho bạn." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-neutral-800/70">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Tổng bug</div>
                <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{totals.total}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Đã fix</div>
                <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{totals.fixed}</div>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80">Còn lại</div>
                <div className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{totals.total - totals.fixed}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSprintsExpanded((expanded) => !expanded)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
              aria-expanded={sprintsExpanded}
            >
              {sprintsExpanded ? 'Ẩn chi tiết sprint' : 'Xem chi tiết từng sprint'}
              <ChevronDown size={14} className={`transition-transform ${sprintsExpanded ? 'rotate-180' : ''}`} />
            </button>

            {sprintsExpanded && <div className="grid gap-2.5 md:grid-cols-2">
              {sprintStats.map((item) => (
                <div key={item.sprint} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-200" title={item.sprint}>{item.sprint}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{item.rate}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${item.rate}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span><strong className="font-semibold text-emerald-600 dark:text-emerald-400">{item.fixed}</strong> đã fix</span>
                    <span>{item.open} còn lại / {item.total} bug</span>
                  </div>
                </div>
              ))}
            </div>}
          </>
        )}
      </div>
    </Panel>
  )
}

function LateReportCard({ title, icon: Icon, count, tasks, onNavigate, colorClass }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${colorClass}`}>
            <Icon size={18} />
          </span>
          <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{title}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{count}</div>
      </div>
      {count > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {expanded ? 'Ẩn danh sách' : 'Xem danh sách'}
          </button>
          {expanded && (
            <ul className="mt-2 max-h-40 overflow-y-auto space-y-1.5 divide-y divide-gray-100 dark:divide-neutral-800 text-xs">
              {tasks.map((t) => (
                <li key={t.key} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] sm:max-w-md" title={t.summary}>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.key}</span>: {t.summary}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onNavigate(t.key)}
                      className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    >
                      Xem
                    </button>
                    <a href={jiraUrl(t.key)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function Bugs({ tasks, highlightKey, onNavigateToTask }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('key')
  const [sortDirection, setSortDirection] = useState('desc')

  // Filter tasks to only include bugs
  const bugs = useMemo(() => {
    return tasks.filter((x) => x.type === 'Bug')
  }, [tasks])

  const dueDateWarnings = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const isDone = (x) => x.status === 'Done' || x.status === 'Released'
    const missingEnd = bugs.filter((x) => !x.enddate)
    const overdueEnd = bugs.filter((x) => x.enddate && x.enddate < todayStr && !isDone(x))
    // A Due date is checked only when End date exists.
    const missingDue = bugs.filter((x) => x.enddate && !x.duedate)
    const overdueDue = bugs.filter((x) => x.enddate && x.duedate && x.duedate < todayStr && !isDone(x))
    return { missingEnd, overdueEnd, missingDue, overdueDue }
  }, [bugs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bugs
    return bugs.filter((t) => t.key.toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q))
  }, [bugs, search])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sorted = useMemo(() => {
    const list = [...filtered]
    return list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'storyPoints') {
        valA = a.storyPoints || 0
        valB = b.storyPoints || 0
      } else if (sortField === 'qcWeight') {
        valA = a.qcWeight || 0
        valB = b.qcWeight || 0
      }

      if (valA === valB) return 0
      if (valA == null || valA === '') return 1
      if (valB == null || valB === '') return -1

      let cmp = 0
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB
      } else {
        cmp = String(valA).localeCompare(String(valB))
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDirection])

  useEffect(() => setPage(1), [search, pageSize, bugs, sortField])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  // Calculate Bug statistics (Total Bug, by Status, by Priority, by Project)
  const stats = useMemo(() => {
    const statusCounts = {}
    const priorityCounts = {}
    const projectCounts = {}

    bugs.forEach((b) => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
      priorityCounts[b.priority] = (priorityCounts[b.priority] || 0) + 1
      projectCounts[b.project] = (projectCounts[b.project] || 0) + 1
    })

    return {
      total: bugs.length,
      status: Object.entries(statusCounts).map(([k, v]) => ({ name: k, count: v })),
      priority: Object.entries(priorityCounts).map(([k, v]) => ({ name: k, count: v })),
      project: Object.entries(projectCounts).map(([k, v]) => ({ name: k, count: v })),
    }
  }, [bugs])

  const SortableTH = ({ field, children, className = '' }) => {
    const active = sortField === field
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors select-none ${className}`}
      >
        <div className="flex items-center gap-1">
          {children}
          <span className="text-[10px] text-gray-400">
            {!active ? '↕' : sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        </div>
      </th>
    )
  }

  const isOverdue = (t) => {
    if (!t.enddate || !t.duedate) return false
    const todayStr = new Date().toISOString().split('T')[0]
    return t.duedate < todayStr && t.status !== 'Done' && t.status !== 'Released'
  }

  return (
    <div className="space-y-6">
      <GmsSprintStatsPanel bugs={bugs} />

      <Panel title="Cảnh báo ngày hạn" right={<AlertTriangle size={16} className="text-gray-400" />}>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <LateReportCard
            title="Thiếu End date"
            icon={CalendarOff}
            count={dueDateWarnings.missingEnd.length}
            tasks={dueDateWarnings.missingEnd}
            onNavigate={onNavigateToTask}
            colorClass="bg-slate-50 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
          />
          <LateReportCard
            title="Trễ End date"
            icon={AlertTriangle}
            count={dueDateWarnings.overdueEnd.length}
            tasks={dueDateWarnings.overdueEnd}
            onNavigate={onNavigateToTask}
            colorClass="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
          />
          <LateReportCard
            title="Thiếu Due date"
            icon={CalendarOff}
            count={dueDateWarnings.missingDue.length}
            tasks={dueDateWarnings.missingDue}
            onNavigate={onNavigateToTask}
            colorClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          />
          <LateReportCard
            title="Trễ Due date"
            icon={AlertTriangle}
            count={dueDateWarnings.overdueDue.length}
            tasks={dueDateWarnings.overdueDue}
            onNavigate={onNavigateToTask}
            colorClass="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
          />
        </div>
      </Panel>

      {/* KPI Cards for Bugs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 flex items-center gap-4">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <Bug size={24} />
          </span>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tổng số Bug (Type)</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{stats.total}</div>
          </div>
        </div>

        <Panel title="Bug theo Status" className="md:col-span-1">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {stats.status.length === 0 && <span className="text-xs text-gray-400">Không có dữ liệu</span>}
            {stats.status.map((s) => (
              <Badge key={s.name} className={statusStyle(s.name)}>
                {s.name}: {s.count}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel title="Bug theo Priority" className="md:col-span-1">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {stats.priority.length === 0 && <span className="text-xs text-gray-400">Không có dữ liệu</span>}
            {stats.priority.map((p) => (
              <Badge key={p.name} className="bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-gray-300 border border-slate-200 dark:border-neutral-700">
                {p.name}: {p.count}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel title="Bug theo Project" className="md:col-span-1">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {stats.project.length === 0 && <span className="text-xs text-gray-400">Không có dữ liệu</span>}
            {stats.project.map((pr) => (
              <Badge key={pr.name} className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                {pr.name}: {pr.count}
              </Badge>
            ))}
          </div>
        </Panel>
      </div>

      {/* Bug Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã Bug hoặc summary…"
              className="pl-9 pr-3 py-2 w-72 max-w-full text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {sorted.length} bug{sorted.length !== 1 ? 's' : ''}
          </div>
        </div>

        {sorted.length === 0 ? (
          <EmptyState icon={Inbox} hint="Không tìm thấy bug nào." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-neutral-800">
                    <SortableTH field="key">Bug ID</SortableTH>
                    <TH className="w-[260px] max-w-[260px]">Summary</TH>
                    <SortableTH field="status">Status</SortableTH>
                    <SortableTH field="priority">Priority</SortableTH>
                    <SortableTH field="storyPoints" className="text-right">SP</SortableTH>
                    <SortableTH field="qcWeight" className="text-right">Weight</SortableTH>
                    <SortableTH field="project">Project</SortableTH>
                    <SortableTH field="reporter">Reporter</SortableTH>
                    <SortableTH field="linkedTask">Linked Task</SortableTH>
                    <SortableTH field="created">Created</SortableTH>
                    <SortableTH field="duedate">Due date</SortableTH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const isHighlighted = t.key === highlightKey
                    return (
                      <tr
                        key={t.key}
                        id={`task-${t.key}`}
                        className={`border-b border-gray-50 dark:border-neutral-800/60 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-all ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 bg-blue-500/10' : ''
                          }`}
                      >
                        <td className="py-2 px-3">
                          <a href={jiraUrl(t.key)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                            {t.key} <ExternalLink size={12} />
                          </a>
                        </td>
                        <td className="py-2 px-3 w-[260px] max-w-[260px] truncate text-gray-700 dark:text-gray-200" title={t.summary}>{t.summary}</td>
                        <td className="py-2 px-3"><Badge className={statusStyle(t.status)}>{t.status || '—'}</Badge></td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-gray-300">
                            {t.priority || '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-1.5 py-0.5 rounded text-[13.5px] font-medium bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300 tabular-nums">
                            {t.storyPoints || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-1.5 py-0.5 rounded text-[13.5px] font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 tabular-nums">
                            {t.qcWeight || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.project || '—'}</td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.reporter || '—'}</td>
                        <td className="py-2 px-3">
                          {t.linkedTask ? (
                            <a href={jiraUrl(t.linkedTask)} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                              {t.linkedTask} <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-gray-300 dark:text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateDMY(t.created)}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isOverdue(t) ? (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                              <AlertTriangle size={12} /> {formatDateDMY(t.duedate)}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">{formatDateDMY(t.duedate)}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 text-sm">
              <label className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                Bug / trang
                <select
                  value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                  {start + 1}–{Math.min(start + pageSize, sorted.length)} / {sorted.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >Trước</button>
                  <span className="px-3 py-1 text-gray-500 dark:text-gray-400 tabular-nums">{page}/{pageCount}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >Sau</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
