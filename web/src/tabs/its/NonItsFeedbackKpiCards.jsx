import { MessageSquare, CheckCircle2, Clock, Hash, ExternalLink } from 'lucide-react'

export function isFeedbackResolved(item) {
  const s = String(item.status || '').toLowerCase()
  return s.includes('đã xử lý') || s.includes('đã đóng') || s.includes('kết luận')
}

export function isFeedbackPending(item) {
  const s = String(item.status || '').toLowerCase()
  return s.includes('đang xử lý') || s.includes('chờ') || s.includes('cần làm rõ')
}

export default function NonItsFeedbackKpiCards({
  feedbacks = [],
  currentStatusFilter = '',
  onFilterStatus,
}) {
  const total = feedbacks.length
  const resolvedCount = feedbacks.filter(isFeedbackResolved).length
  const pendingCount = feedbacks.filter(isFeedbackPending).length
  const hasSlackCount = feedbacks.filter((f) => Boolean(f.slackUrl || f.slack_url)).length

  const resolvedRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. Tổng Feedback */}
      <div
        onClick={() => onFilterStatus && onFilterStatus('')}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md cursor-pointer ${
          !currentStatusFilter ? 'ring-2 ring-blue-500/20' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng Feedback</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <MessageSquare size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {total}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Xử lý trực tiếp (không tạo ITS)
        </div>
      </div>

      {/* 2. Đã xử lý / Kết luận */}
      <div
        onClick={() => onFilterStatus && onFilterStatus('Đã xử lý / phản hồi kết luận')}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md cursor-pointer ${
          currentStatusFilter.includes('Đã xử lý') ? 'ring-2 ring-emerald-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Đã xử lý / Kết luận
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {resolvedCount}
          </span>
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            {resolvedRate}%
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Đã giải thích hoặc chốt logic
        </div>
      </div>

      {/* 3. Đang xử lý / Chờ phản hồi */}
      <div
        onClick={() => onFilterStatus && onFilterStatus('Đang xử lý')}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md cursor-pointer ${
          currentStatusFilter.includes('Đang xử lý') ? 'ring-2 ring-amber-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Đang xử lý
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <Clock size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
          {pendingCount}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Đang trao đổi hoặc theo dõi Dev
        </div>
      </div>

      {/* 4. Có Link Slack Thread */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-violet-700 dark:text-violet-400">
            Có Link Slack
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
            <Hash size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
          {hasSlackCount}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Gắn kèm nguồn thread thảo luận
        </div>
      </div>
    </div>
  )
}
