// Tab 2 — Danh sách Task (ui.md §9–12): search, badge table, Jira links, pagination.
import { useMemo, useState, useEffect } from 'react'
import { Search, ExternalLink, Inbox } from 'lucide-react'
import { Badge, EmptyState } from '../components/ui.jsx'
import { statusStyle } from '../lib/tokens.js'
import { jiraUrl } from '../lib/api.js'

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('vi-VN') : '—')

// Render level badges (R1/R2/R3, TC1..., TD1...) for the flags that are set.
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
  <th className={`py-2 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap ${className}`}>{children}</th>
)

const PAGE_SIZES = [10, 20, 50, 100]

export default function Tasks({ tasks }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter((t) => t.key.toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q))
  }, [tasks, search])

  // Reset to page 1 whenever the result set or page size changes.
  useEffect(() => setPage(1), [search, pageSize, tasks])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
      {/* Search + count (§9) */}
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
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} hint="Không tìm thấy task nào." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-neutral-800">
                  <TH>Task</TH>
                  <TH>Summary</TH>
                  <TH>Status</TH>
                  <TH>Quarter</TH>
                  <TH>Sprint</TH>
                  <TH className="text-center">Review</TH>
                  <TH className="text-center">Test Case</TH>
                  <TH className="text-center">Test Design</TH>
                  <TH className="text-right">QC Weight</TH>
                  <TH className="text-right">Bug</TH>
                  <TH>Created</TH>
                  <TH>Updated</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.key} className="border-b border-gray-50 dark:border-neutral-800/60 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="py-2 px-3">
                      <a href={jiraUrl(t.key)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                        {t.key} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate text-gray-700 dark:text-gray-200" title={t.summary}>{t.summary}</td>
                    <td className="py-2 px-3"><Badge className={statusStyle(t.status)}>{t.status || '—'}</Badge></td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.quarter || '—'}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap truncate max-w-[150px]" title={t.sprint}>{t.sprint || '—'}</td>
                    <td className="py-2 px-3"><Levels task={t} prefix="R" keys={['review1', 'review2', 'review3']} /></td>
                    <td className="py-2 px-3"><Levels task={t} prefix="TC" keys={['tc1', 'tc2', 'tc3']} /></td>
                    <td className="py-2 px-3"><Levels task={t} prefix="TD" keys={['td1', 'td2', 'td3']} /></td>
                    <td className="py-2 px-3 text-right">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 tabular-nums">{t.qcWeight}</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {t.bugCount > 0
                        ? <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 tabular-nums">{t.bugCount}</span>
                        : <span className="text-gray-300 dark:text-neutral-600 tabular-nums">0</span>}
                    </td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">{fmtDate(t.created)}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">{fmtDate(t.updated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (§11) */}
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
                {start + 1}–{Math.min(start + pageSize, filtered.length)} / {filtered.length}
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
