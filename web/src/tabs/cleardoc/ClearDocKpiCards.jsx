import { FileText, Hash, CheckCircle2, CheckSquare, Sparkles, ArrowRight } from 'lucide-react'

export function ClearDocKpiCards({ stats, onCardClick }) {
  const {
    totalThreads = 0,
    totalIssues = 0,
    tasksClearedCount = 0,
    tasksNotNeededCount = 0,
    tasksPendingCount = 0,
    avgIssuesPerThread = 0,
    coverageRate = 0,
  } = stats || {}

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3">
      {/* 1. Tổng số Thread */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="p-1 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText size={13} />
            </span>
            <span>Tổng số Thread</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums mt-1">
          {totalThreads}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">
          Trong phạm vi lọc
        </div>
      </div>

      {/* 2. Tổng vấn đề clear */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 shadow-xs relative overflow-hidden transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="p-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Hash size={13} />
            </span>
            <span>Tổng vấn đề clear</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
          {totalIssues}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">
          TB <strong className="text-indigo-600 dark:text-indigo-300">{avgIssuesPerThread}</strong> vấn đề / thread
        </div>
      </div>

      {/* 3. Task có Clear Doc */}
      <div
        onClick={() => onCardClick && onCardClick('cleared')}
        className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 shadow-xs relative overflow-hidden cursor-pointer group transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs"
        title="Nhấp để xem danh sách task đã có clear doc"
      >
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
            </span>
            <span>Task có Clear Doc</span>
          </div>
          <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 text-emerald-500 transition-all" />
        </div>
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
          {tasksClearedCount}
        </div>
        <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
          <span>Gắn trong {totalThreads} thread</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Xem task →</span>
        </div>
      </div>

      {/* 4. Không cần Clear */}
      <div
        onClick={() => onCardClick && onCardClick('not_needed')}
        className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 shadow-xs relative overflow-hidden cursor-pointer group transition-all hover:border-slate-300 dark:hover:border-neutral-700 hover:shadow-xs"
        title="Nhấp để xem danh sách task không cần clear doc"
      >
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="p-1 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300">
              <CheckSquare size={13} />
            </span>
            <span>Không cần Clear</span>
          </div>
          <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 text-slate-500 transition-all" />
        </div>
        <div className="text-2xl font-bold text-gray-700 dark:text-gray-200 tabular-nums mt-1">
          {tasksNotNeededCount}
        </div>
        <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
          <span>Task đơn giản/đã rõ</span>
          <span className="text-[10px] text-gray-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Xem task →</span>
        </div>
      </div>

      {/* 5. Tỷ lệ hoàn thành */}
      <div
        onClick={() => onCardClick && onCardClick('pending')}
        className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 shadow-xs relative overflow-hidden col-span-2 sm:col-span-1 cursor-pointer group transition-all hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xs"
        title="Nhấp để lọc nhanh các task chưa đánh giá"
      >
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="p-1 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={13} />
            </span>
            <span>Tỷ lệ hoàn thành</span>
          </div>
          <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 text-amber-500 transition-all" />
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {coverageRate}%
          </div>
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${tasksPendingCount > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
            {tasksPendingCount > 0 ? `${tasksPendingCount} cần xử lý` : 'Đầy đủ 100%'}
          </span>
        </div>
        {/* Progress Bar Mini */}
        <div className="w-full bg-gray-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, coverageRate))}%` }}
          />
        </div>
      </div>
    </div>
  )
}
