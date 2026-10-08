import { useState, useMemo, useEffect } from 'react'
import {
  ExternalLink, Copy, Check, AlertTriangle, Clock, CheckCircle2,
  Bug, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, HelpCircle
} from 'lucide-react'
import { statusStyle } from '../../lib/tokens.js'

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const PAGE_SIZES = [10, 20, 50, 100]

const TYPE_STYLE = {
  Bug: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 border border-red-200 dark:border-red-500/20',
  Support: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20',
  Incident: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20',
  Task: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20',
}

function TypeBadge({ type }) {
  if (!type) return <span className="text-gray-300 dark:text-neutral-600">—</span>
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${TYPE_STYLE[type] || 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}>
      {type}
    </span>
  )
}

function SlaBadge({ label, slaText, detail = {}, isBreached = false }) {
  const remainingMillis = detail.remainingMillis
  const isWarning = !isBreached && remainingMillis != null && remainingMillis > 0 && remainingMillis <= 4 * 3600 * 1000

  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
  let Icon = CheckCircle2
  let statusText = 'Đạt hạn'

  if (isBreached) {
    colorClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40 font-semibold'
    Icon = AlertTriangle
    statusText = 'Trễ SLA'
  } else if (isWarning) {
    colorClass = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
    Icon = Clock
    statusText = 'Sắp hết hạn'
  }

  const tooltip = `${label}:
- Trạng thái: ${statusText}
- Thời gian còn lại: ${slaText || '—'}
- Thời gian mục tiêu: ${detail.goalFriendly || '—'}
- Đã trôi qua: ${detail.elapsedFriendly || '—'}
- Tiến trình: ${detail.ongoing ? 'Đang chạy' : 'Đã dừng'}`

  return (
    <div
      title={tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11.5px] transition-transform hover:scale-105 cursor-help ${colorClass}`}
    >
      <Icon size={12} className="flex-shrink-0" />
      <span className="font-medium text-[10.5px] opacity-80">{label}:</span>
      <span className="font-semibold tabular-nums">{slaText || '—'}</span>
    </div>
  )
}

function LinkedBugsCell({ bugs = [] }) {
  if (!bugs || bugs.length === 0) {
    return <span className="text-gray-300 dark:text-neutral-600">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {bugs.map((b) => (
        <a
          key={b.key}
          href={b.link}
          target="_blank"
          rel="noreferrer"
          title={`[${b.type || 'Bug'}] ${b.summary || ''}${b.status ? ` • ${b.status}` : ''}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 transition-colors group"
        >
          <Bug size={12} className="text-rose-500 group-hover:animate-bounce" />
          <span>{b.key}</span>
          <ExternalLink size={10} className="opacity-70" />
        </a>
      ))}
    </div>
  )
}

function ClassifyBadge({ classify }) {
  if (!classify) return <span className="text-gray-300 dark:text-neutral-600">—</span>

  // If classify contains ' > ', highlight the parent and child gracefully
  const parts = classify.split(' > ')
  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((p, idx) => (
        <span
          key={idx}
          className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
            idx === 0
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
          }`}
        >
          {idx > 0 && <span className="text-gray-400 mr-1 font-bold">›</span>}
          {p.trim()}
        </span>
      ))}
    </div>
  )
}

export default function ItsTable({ tickets = [] }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('created')
  const [sortAsc, setSortAsc] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = (key, e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(field === 'key' || field === 'status')
    }
  }

  const sorted = useMemo(() => {
    const list = [...tickets]
    return list.sort((a, b) => {
      let va = a[sortField]
      let vb = b[sortField]

      // Special sorting for SLA: breached tickets on top when sorting by sla
      if (sortField === 'sla') {
        const aBreached = Boolean(a.slaResolutionBreached || a.slaFirstResponseBreached)
        const bBreached = Boolean(b.slaResolutionBreached || b.slaFirstResponseBreached)
        if (aBreached !== bBreached) return aBreached ? -1 : 1
        va = a.slaResolutionDetail?.remainingMillis ?? 999999999
        vb = b.slaResolutionDetail?.remainingMillis ?? 999999999
      }

      if (va === vb) return 0
      if (va == null || va === '') return 1
      if (vb == null || vb === '') return -1

      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb))
      }
      return sortAsc ? cmp : -cmp
    })
  }, [tickets, sortField, sortAsc])

  useEffect(() => {
    setPage(1)
  }, [tickets, pageSize])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const startIdx = (page - 1) * pageSize
  const currentRows = sorted.slice(startIdx, startIdx + pageSize)

  const SortHeader = ({ field, children, className = '' }) => {
    const isActive = sortField === field
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-3 px-3 font-semibold text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 select-none transition-colors ${className}`}
      >
        <div className="flex items-center gap-1">
          <span>{children}</span>
          <ArrowUpDown size={12} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-neutral-600'} />
        </div>
      </th>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      {/* Table header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Danh sách Ticket ITS
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 font-medium">
            {tickets.length} kết quả
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Hiển thị:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 text-xs"
          >
            {PAGE_SIZES.map((sz) => (
              <option key={sz} value={sz}>{sz} dòng</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/80 dark:bg-neutral-800/60 border-b border-gray-200 dark:border-neutral-800">
            <tr>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-12 text-center">STT</th>
              <SortHeader field="key">ITS</SortHeader>
              <SortHeader field="summary">Summary</SortHeader>
              <SortHeader field="type">Type</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="classify">Classify</SortHeader>
              <SortHeader field="sla">SLA (Phản hồi & Xử lý)</SortHeader>
              <th className="py-3 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Link Bug liên kết</th>
              <SortHeader field="created">Ngày tạo</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/80 text-sm">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <Inbox size={36} className="mx-auto mb-2 opacity-50" />
                  <div>Không có ticket ITS nào thỏa mãn bộ lọc hiện tại.</div>
                </td>
              </tr>
            ) : (
              currentRows.map((ticket, idx) => {
                const isBreached = Boolean(ticket.slaResolutionBreached || ticket.slaFirstResponseBreached)
                return (
                  <tr
                    key={ticket.key}
                    className={`hover:bg-blue-50/40 dark:hover:bg-neutral-800/40 transition-colors ${
                      isBreached ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                    }`}
                  >
                    {/* STT */}
                    <td className="py-3 px-3 text-xs text-gray-400 dark:text-gray-500 text-center tabular-nums">
                      {startIdx + idx + 1}
                    </td>

                    {/* Link ITS */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={ticket.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm hover:underline"
                        >
                          <span>{ticket.key}</span>
                          <ExternalLink size={12} />
                        </a>

                        <button
                          type="button"
                          onClick={(e) => handleCopy(ticket.key, e)}
                          title="Copy mã ITS"
                          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                          {copiedKey === ticket.key ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                        </button>

                        {isBreached && (
                          <span
                            title="Cảnh báo: Ticket này đã bị trễ SLA!"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/30"
                          >
                            <AlertTriangle size={12} className="text-red-600 dark:text-red-400 animate-pulse flex-shrink-0" />
                            <span>Trễ SLA</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Summary */}
                    <td className="py-3 px-3 min-w-[220px] max-w-md">
                      <div
                        title={ticket.summary}
                        className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2 font-medium"
                      >
                        {ticket.summary}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3">
                      <TypeBadge type={ticket.type} />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusStyle(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>

                    {/* Classify */}
                    <td className="py-3 px-3 min-w-[150px]">
                      <ClassifyBadge classify={ticket.classify} />
                    </td>

                    {/* SLA (Time to Resolution & Time to First Response) */}
                    <td className="py-3 px-3 min-w-[210px]">
                      <div className="flex flex-col gap-1.5">
                        <SlaBadge
                          label="Phản hồi"
                          slaText={ticket.slaFirstResponse}
                          detail={ticket.slaFirstResponseDetail}
                          isBreached={ticket.slaFirstResponseBreached}
                        />
                        <SlaBadge
                          label="Xử lý"
                          slaText={ticket.slaResolution}
                          detail={ticket.slaResolutionDetail}
                          isBreached={ticket.slaResolutionBreached}
                        />
                      </div>
                    </td>

                    {/* Link Bug */}
                    <td className="py-3 px-3 min-w-[140px]">
                      <LinkedBugsCell bugs={ticket.linkedBugs} />
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                      {formatDateDMY(ticket.created)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {PAGE_SIZES.map((sz) => (
                <option key={sz} value={sz}>{sz} / trang</option>
              ))}
            </select>
          </label>
          <span className="text-gray-300 dark:text-neutral-700">|</span>
          <span className="text-gray-500 dark:text-gray-400 tabular-nums">
            {sorted.length === 0
              ? '0 ticket'
              : `${startIdx + 1}–${Math.min(startIdx + pageSize, sorted.length)} trên tổng số ${sorted.length} ticket`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <ChevronLeft size={14} />
            <span>Trước</span>
          </button>

          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1
              if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} className="text-gray-400 px-1">...</span>
                }
                return null
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <span>Sau</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
