import { Search, Plus, Filter, RotateCcw, Calendar, Sparkles } from 'lucide-react'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './issue-utils.js'

export default function IssueFilters({
  filters,
  onChange,
  onReset,
  onAddNew,
  onOpenAiModal,
}) {
  const isFiltered =
    Boolean(filters.search) ||
    (filters.status && filters.status !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    Boolean(filters.fromDate) ||
    Boolean(filters.toDate)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            placeholder="Tìm theo nội dung, tiêu đề, hướng giải quyết..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Right: Controls & Add New Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Select */}
          <div className="min-w-[140px]">
            <select
              value={filters.status || 'all'}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <div className="min-w-[140px]">
            <select
              value={filters.priority || 'all'}
              onChange={(e) => onChange({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1">
            <Calendar size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
            <input
              type="date"
              title="Từ ngày"
              value={filters.fromDate || ''}
              onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
              className="bg-transparent text-xs text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
            <input
              type="date"
              title="Đến ngày"
              value={filters.toDate || ''}
              onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
              className="bg-transparent text-xs text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={onReset}
              title="Xóa bộ lọc"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}

          {/* AI Quick Create Button */}
          {onOpenAiModal && (
            <button
              type="button"
              onClick={onOpenAiModal}
              title="Dán văn bản thô, AI sẽ tự động phân tích và tạo vấn đề"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 shadow-sm transition-all hover:shadow active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Nhập bằng AI</span>
            </button>
          )}

          {/* Add New Issue CTA */}
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all hover:shadow active:scale-[0.98] shrink-0"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Thêm vấn đề</span>
          </button>
        </div>
      </div>
    </div>
  )
}
