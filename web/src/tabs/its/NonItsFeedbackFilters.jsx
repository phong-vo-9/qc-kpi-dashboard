import { useState, useEffect } from 'react'
import { Calendar, Search, Filter, RotateCcw, X, Clock, Layers } from 'lucide-react'
import { KNOWN_PROJECTS, KNOWN_STATUSES } from './non-its-parser.js'

export const EMPTY_NON_ITS_FILTERS = {
  fromDate: '',
  toDate: '',
  project: '',
  status: '',
  search: '',
}

export default function NonItsFeedbackFilters({
  applied = EMPTY_NON_ITS_FILTERS,
  onApply,
  totalCount = 0,
  filteredCount = 0,
}) {
  const [draft, setDraft] = useState(applied)

  useEffect(() => {
    setDraft(applied)
  }, [applied])

  const handleChange = (key, value) => {
    const updated = { ...draft, [key]: value }
    setDraft(updated)
    onApply(updated)
  }

  const handleReset = () => {
    setDraft(EMPTY_NON_ITS_FILTERS)
    onApply(EMPTY_NON_ITS_FILTERS)
  }

  // Quick preset shortcuts
  const applyPreset = (preset) => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    let nextFrom = ''
    let nextTo = ''

    if (preset === 'today') {
      nextFrom = todayStr
      nextTo = todayStr
    } else if (preset === '7days') {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 7)
      nextFrom = d7.toISOString().split('T')[0]
      nextTo = todayStr
    } else if (preset === '30days') {
      const d30 = new Date()
      d30.setDate(d30.getDate() - 30)
      nextFrom = d30.toISOString().split('T')[0]
      nextTo = todayStr
    } else if (preset === 'q3-2026') {
      nextFrom = '2026-07-01'
      nextTo = '2026-09-30'
    } else if (preset === 'q4-2026') {
      nextFrom = '2026-10-01'
      nextTo = '2026-12-31'
    } else if (preset === 'all') {
      nextFrom = ''
      nextTo = ''
    }

    const updated = { ...draft, fromDate: nextFrom, toDate: nextTo }
    setDraft(updated)
    onApply(updated)
  }

  const hasActiveFilters = Boolean(
    draft.fromDate || draft.toDate || draft.project || draft.status || draft.search
  )

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 shadow-sm space-y-3.5">
      {/* Top row: Header & quick status badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          <Filter size={16} className="text-blue-500" />
          <span>Bộ lọc Feedback không tạo ITS</span>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            (Hiển thị {filteredCount}/{totalCount} mục)
          </span>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mr-1">
            <Clock size={12} /> Nhanh:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'today', label: 'Hôm nay' },
            { id: '7days', label: '7 ngày qua' },
            { id: 'q3-2026', label: 'Quý 3/2026' },
            { id: 'q4-2026', label: 'Quý 4/2026' },
          ].map((p) => {
            const isActive =
              (p.id === 'all' && !draft.fromDate && !draft.toDate) ||
              (p.id === 'q3-2026' && draft.fromDate === '2026-07-01' && draft.toDate === '2026-09-30') ||
              (p.id === 'q4-2026' && draft.fromDate === '2026-10-01' && draft.toDate === '2026-12-31')

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 shadow-xs'
                    : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700'
                }`}
              >
                {p.label}
              </button>
            )
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
              title="Đặt lại tất cả bộ lọc"
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Từ ngày */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Calendar size={13} className="text-gray-400" />
            <span>Từ ngày feedback</span>
          </label>
          <input
            type="date"
            value={draft.fromDate || ''}
            onChange={(e) => handleChange('fromDate', e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Đến ngày */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Calendar size={13} className="text-gray-400" />
            <span>Đến ngày feedback</span>
          </label>
          <input
            type="date"
            value={draft.toDate || ''}
            onChange={(e) => handleChange('toDate', e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dự án */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Layers size={13} className="text-gray-400" />
            <span>Dự án</span>
          </label>
          <select
            value={draft.project || ''}
            onChange={(e) => handleChange('project', e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả dự án</option>
            {KNOWN_PROJECTS.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
          </select>
        </div>

        {/* Trạng thái */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Trạng thái
          </label>
          <select
            value={draft.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {KNOWN_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Tìm kiếm */}
        <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Search size={13} className="text-gray-400" />
            <span>Tìm kiếm từ khóa</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Nội dung, xử lý, Slack..."
              value={draft.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            {draft.search && (
              <button
                type="button"
                onClick={() => handleChange('search', '')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
