import { AlertCircle, CheckCircle2, Clock, ShieldAlert, Sparkles } from 'lucide-react'

export default function IssueKpiCards({
  issues = [],
  currentStatusFilter = 'all',
  currentPriorityFilter = 'all',
  onFilterStatus,
  onFilterPriority,
}) {
  const total = issues.length
  const openCount = issues.filter((i) => i.status === 'open').length
  const resolvedCount = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length
  const highPriorityCount = issues.filter((i) => i.priority === 'critical' || i.priority === 'high').length
  const resolvedRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 1. Tổng Vấn đề */}
      <div
        onClick={() => {
          onFilterStatus && onFilterStatus('all')
          onFilterPriority && onFilterPriority('all')
        }}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
          currentStatusFilter === 'all' && currentPriorityFilter === 'all'
            ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30'
            : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng Vấn đề</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <AlertCircle size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {total}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center justify-between">
          <span>Ghi nhận trong hệ thống</span>
          {total > 0 && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">100%</span>
          )}
        </div>
      </div>

      {/* 2. Đang xử lý */}
      <div
        onClick={() => onFilterStatus && onFilterStatus(currentStatusFilter === 'open' ? 'all' : 'open')}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
          currentStatusFilter === 'open'
            ? 'ring-2 ring-amber-500/40 dark:ring-amber-400/40'
            : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Đang xử lý</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <Clock size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {openCount}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center justify-between">
          <span>Cần theo dõi & giải quyết</span>
          {total > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {Math.round((openCount / total) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* 3. Đã giải quyết */}
      <div
        onClick={() => onFilterStatus && onFilterStatus(currentStatusFilter === 'resolved' ? 'all' : 'resolved')}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
          currentStatusFilter === 'resolved'
            ? 'ring-2 ring-emerald-500/40 dark:ring-emerald-400/40'
            : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Đã giải quyết</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {resolvedCount}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center justify-between">
          <span>Tỷ lệ hoàn thành:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{resolvedRate}%</span>
        </div>
      </div>

      {/* 4. Mức độ Cao / Nghiêm trọng */}
      <div
        onClick={() => onFilterPriority && onFilterPriority(currentPriorityFilter === 'high' ? 'all' : 'high')}
        className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
          currentPriorityFilter === 'high' || currentPriorityFilter === 'critical'
            ? 'ring-2 ring-rose-500/40 dark:ring-rose-400/40'
            : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Ưu tiên Cao / Critical</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <ShieldAlert size={18} strokeWidth={2.2} />
          </span>
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
          {highPriorityCount}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center justify-between">
          <span>Ảnh hưởng tiến độ / hệ thống</span>
          {highPriorityCount > 0 && (
            <span className="text-rose-600 dark:text-rose-400 font-medium">Cần lưu ý</span>
          )}
        </div>
      </div>
    </div>
  )
}
