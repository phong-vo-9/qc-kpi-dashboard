import { Layers, Clock, Eye, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react'

export function isTicketOpen(ticket) {
  const s = String(ticket.status || '').toLowerCase().trim()
  return ['open', 'to do', 'todo', 'waiting for support', 'waiting for customer', 'backlog', 'reopened'].includes(s)
}

export function isTicketReviewing(ticket) {
  const s = String(ticket.status || '').toLowerCase().trim()
  return ['in review', 'reviewing', 'under review', 'testing', 'ready to test', 'in progress', 'pending'].includes(s)
}

export function isTicketResolved(ticket) {
  const s = String(ticket.status || '').toLowerCase().trim()
  return ['done', 'resolved', 'closed', 'released', 'rejected', 'not reproducible', "won't do", 'cancelled'].includes(s)
}

export function isTicketBreached(ticket) {
  return Boolean(ticket.slaResolutionBreached || ticket.slaFirstResponseBreached)
}

export default function ItsKpiCards({
  tickets = [],
  currentSlaFilter = '',
  onToggleBreachedOnly,
}) {
  const total = tickets.length
  const openCount = tickets.filter(isTicketOpen).length
  const reviewCount = tickets.filter(isTicketReviewing).length
  const resolvedCount = tickets.filter(isTicketResolved).length
  const breachedCount = tickets.filter(isTicketBreached).length

  const resolvedRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0
  const isBreachedFilterActive = currentSlaFilter === 'breached'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* 1. Tổng ITS */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng ITS</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Layers size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {total}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Gán cho Nguyễn Phú Thành
        </div>
      </div>

      {/* 2. Đang Open */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Đang Open</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <Clock size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {openCount}
        </div>
        <div className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
          Chưa xử lý / Đang chờ
        </div>
      </div>

      {/* 3. Đang Review */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Đang Review</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            <Eye size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {reviewCount}
        </div>
        <div className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">
          Đang xem xét / kiểm tra
        </div>
      </div>

      {/* 4. Đã xử lý */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Đã xử lý</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {resolvedCount}
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ({resolvedRate}%)
          </span>
        </div>
        <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
          Đã xong / Đóng ticket
        </div>
      </div>

      {/* 5. CẢNH BÁO TRỄ SLA (Nổi bật, Clickable) */}
      <button
        type="button"
        onClick={onToggleBreachedOnly}
        className={`text-left rounded-xl border shadow-sm p-4 transition-all transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
          isBreachedFilterActive
            ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400 shadow-red-200 dark:shadow-none'
            : breachedCount > 0
            ? 'bg-red-50/90 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 hover:border-red-300 dark:hover:border-red-500/50'
            : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 opacity-90'
        }`}
      >
        {breachedCount > 0 && !isBreachedFilterActive && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}

        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${
            isBreachedFilterActive
              ? 'text-white'
              : breachedCount > 0
              ? 'text-red-700 dark:text-red-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            <AlertTriangle size={16} className={isBreachedFilterActive ? 'text-white' : breachedCount > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'} />
            Cảnh báo Trễ SLA
          </span>
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
            isBreachedFilterActive
              ? 'bg-white/20 text-white'
              : breachedCount > 0
              ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300'
              : 'bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-gray-500'
          }`}>
            <ArrowUpRight size={15} />
          </span>
        </div>

        <div className={`text-3xl font-extrabold tabular-nums ${
          isBreachedFilterActive
            ? 'text-white'
            : breachedCount > 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-400 dark:text-neutral-500'
        }`}>
          {breachedCount}
        </div>

        <div className={`text-xs mt-1 font-medium ${
          isBreachedFilterActive
            ? 'text-white/90 underline'
            : breachedCount > 0
            ? 'text-red-600/90 dark:text-red-400/90'
            : 'text-gray-400 dark:text-neutral-500'
        }`}>
          {isBreachedFilterActive
            ? 'Đang lọc xem vé trễ (Click bỏ lọc)'
            : breachedCount > 0
            ? 'Click xem ngay các vé trễ SLA'
            : 'Không có vé trễ SLA 🎉'}
        </div>
      </button>
    </div>
  )
}
