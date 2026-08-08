import { useMemo, useState, useEffect } from 'react'
import { Search, ExternalLink, Inbox, AlertTriangle, Star } from 'lucide-react'
import { Badge, EmptyState } from '../components/ui.jsx'
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

function Levels({ task, prefix, keys }) {
  const on = keys.map((k, i) => (task[k] ? i + 1 : null)).filter(Boolean)
  if (on.length === 0) return <span className="text-gray-300 dark:text-neutral-600">—</span>
  return (
    <div className="flex gap-1 justify-center">
      {on.map((n) => (
        <span key={n} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
          {prefix}{n}
        </span>
      ))}
    </div>
  )
}

const TH = ({ children, className = '' }) => (
  <th className={`py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs ${className}`}>{children}</th>
)

const PAGE_SIZES = [10, 20, 50, 100]

export default function Tasks({ tasks, highlightKey }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('default')
  const [sortDirection, setSortDirection] = useState('asc')

  const taskIssues = useMemo(() => {
    // Show Task and Support types; Bug goes to the Bugs tab
    return tasks.filter((t) => t.type !== 'Bug')
  }, [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return taskIssues
    return taskIssues.filter((t) => t.key.toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q))
  }, [taskIssues, search])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'duedate' || field === 'key' ? 'asc' : 'desc')
    }
  }

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sortField === 'default') {
      return list.sort((a, b) => {
        const aGoal = (a.labels || []).some(l => l.toLowerCase() === 'sprintgoal')
        const bGoal = (b.labels || []).some(l => l.toLowerCase() === 'sprintgoal')
        if (aGoal !== bGoal) return aGoal ? -1 : 1

        if (a.duedate !== b.duedate) {
          if (!a.duedate) return 1
          if (!b.duedate) return -1
          return a.duedate.localeCompare(b.duedate)
        }

        if (a.updated !== b.updated) {
          if (!a.updated) return 1
          if (!b.updated) return -1
          return b.updated.localeCompare(a.updated)
        }
        return 0
      })
    }

    return list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'bug') {
        valA = a.bugCount || 0
        valB = b.bugCount || 0
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

  useEffect(() => setPage(1), [search, pageSize, tasks, sortField])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  const SortableTH = ({ field, children, className = '' }) => {
    const active = sortField === field
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors select-none text-xs ${className}`}
      >
        <div className="flex items-center gap-0.5">
          {children}
          <span className="text-[10px] text-gray-400">
            {!active ? '↕' : sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        </div>
      </th>
    )
  }

  const renderLabels = (labels = []) => {
    if (!labels || labels.length === 0) return <span className="text-gray-300 dark:text-neutral-600">—</span>
    return (
      <div className="flex flex-wrap gap-1">
        {labels.map((lbl) => {
          if (lbl.toLowerCase() === 'sprintgoal') {
            return (
              <span key={lbl} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/35">
                <Star size={10} className="fill-amber-500 text-amber-500" /> SprintGoal
              </span>
            )
          }
          if (lbl.toLowerCase() === 'regression test') {
            return (
              <span key={lbl} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 border border-teal-100 dark:border-teal-500/20">
                Regression test
              </span>
            )
          }
          if (lbl.toLowerCase() === 'đột xuất') {
            return (
              <span key={lbl} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-100 dark:border-rose-500/20">
                Đột xuất
              </span>
            )
          }
          return (
            <span key={lbl} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
              {lbl}
            </span>
          )
        })}
      </div>
    )
  }

  const isOverdue = (t) => {
    if (!t.duedate) return false
    const todayStr = new Date().toISOString().split('T')[0]
    return t.duedate < todayStr && t.status !== 'Done' && t.status !== 'Released'
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
      {/* Search + count */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-neutral-800">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã task hoặc summary…"
            className="pl-9 pr-3 py-2 w-72 max-w-full text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {sorted.length} task{sorted.length !== 1 ? 's' : ''}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Inbox} hint="Không tìm thấy task nào." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-neutral-800">
                  <SortableTH field="key">Task</SortableTH>
                  <TH>Summary</TH>
                  <SortableTH field="type">Type</SortableTH>
                  <SortableTH field="status">Status</SortableTH>
                  <TH>Q</TH>
                  <TH>Sprint</TH>
                  <SortableTH field="duedate">Due</SortableTH>
                  <TH className="text-center">Rev</TH>
                  <TH className="text-center">TC</TH>
                  <TH className="text-center">TD</TH>
                  <SortableTH field="qcWeight" className="text-right">Weight</SortableTH>
                  <SortableTH field="bug" className="text-right">Bug</SortableTH>
                  <SortableTH field="updated">Updated</SortableTH>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const isGoal = (t.labels || []).some(l => l.toLowerCase() === 'sprintgoal')
                  const isHighlighted = t.key === highlightKey
                  
                  return (
                    <tr
                      key={t.key}
                      id={`task-${t.key}`}
                      className={`border-b border-gray-50 dark:border-neutral-800/60 transition-all ${
                        isGoal
                          ? 'bg-amber-50/80 dark:bg-amber-500/[0.06] border-l-4 border-l-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-500/[0.1]'
                          : 'hover:bg-gray-50 dark:hover:bg-neutral-800/50'
                      } ${
                        isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="py-2 px-2">
                        <a href={jiraUrl(t.key)} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap text-xs">
                          {t.key} <ExternalLink size={11} />
                        </a>
                      </td>
                      <td className="py-2 px-2 max-w-[200px] truncate text-gray-700 dark:text-gray-200 text-xs" title={t.summary}>
                        {isGoal && <Star size={11} className="inline mr-1 fill-amber-400 text-amber-400 flex-shrink-0" />}
                        {t.summary}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {t.type === 'Support'
                          ? <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-100 dark:border-purple-500/20">Support</span>
                          : <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-100 dark:border-sky-500/20">Task</span>
                        }
                      </td>
                      <td className="py-2 px-2"><Badge className={statusStyle(t.status)}>{t.status || '—'}</Badge></td>
                      <td className="py-2 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{t.quarter || '—'}</td>
                      <td className="py-2 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap truncate max-w-[100px] text-xs" title={t.sprint}>{t.sprint || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-xs">
                        {isOverdue(t) ? (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                            <AlertTriangle size={11} /> {formatDateDMY(t.duedate)}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">{formatDateDMY(t.duedate)}</span>
                        )}
                      </td>
                      <td className="py-2 px-2"><Levels task={t} prefix="R" keys={['review1', 'review2', 'review3']} /></td>
                      <td className="py-2 px-2"><Levels task={t} prefix="TC" keys={['tc1', 'tc2', 'tc3']} /></td>
                      <td className="py-2 px-2"><Levels task={t} prefix="TD" keys={['td1', 'td2', 'td3']} /></td>
                      <td className="py-2 px-2 text-right">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 tabular-nums">{t.qcWeight}</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {t.bugCount > 0
                          ? <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 tabular-nums">{t.bugCount}</span>
                          : <span className="text-gray-300 dark:text-neutral-600 tabular-nums">0</span>}
                      </td>
                      <td className="py-2 px-2 text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums text-xs">{formatDateDMY(t.updated)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 text-sm">
            <label className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              Task / trang
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
  )
}
