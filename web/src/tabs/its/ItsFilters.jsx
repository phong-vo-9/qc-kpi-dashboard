import { useState, useEffect, useMemo } from 'react'
import { SlidersHorizontal, RotateCcw, Search, ChevronDown, Check, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { statusStyle } from '../../lib/tokens.js'

export const EMPTY_ITS_FILTERS = {
  quarter: '',
  year: '',
  label: '',
  status: '',
  type: '',
  classify: '',
  slaStatus: '',
  search: '',
}

function MultiSelect({ label, value, onChange, options, render = (o) => o, optionClassName, panelClassName = '' }) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => (
    value ? String(value).split(',').map((v) => v.trim()).filter(Boolean) : []
  ), [value])

  const toggle = (rawOpt) => {
    const opt = String(rawOpt)
    const next = selected.includes(opt)
      ? selected.filter((x) => x !== opt)
      : [...selected, opt]
    onChange({ target: { value: next.join(',') } })
  }

  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open])

  return (
    <div className="flex flex-col gap-1 min-w-0 relative" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-left w-full h-[36px]"
      >
        <span className="truncate">{selected.length === 0 ? 'Tất cả' : `${selected.length} đã chọn`}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-50 top-full left-0 mt-1 w-max min-w-full max-w-[min(26rem,calc(100vw-2rem))] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-2 space-y-1 max-h-64 overflow-auto ${panelClassName}`}>
          {options.length === 0 ? (
            <div className="text-xs text-gray-400 py-2 text-center">Không có tùy chọn</div>
          ) : (
            options.map((rawOpt) => {
              const opt = String(rawOpt)
              const active = selected.includes(opt)
              const colorClass = optionClassName?.(opt) || 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <span className={`whitespace-nowrap px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
                    {render(rawOpt)}
                  </span>
                  {active && <Check size={13} className="text-blue-600 dark:text-blue-300 flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function ItsFilters({
  applied,
  onApply,
  availableOptions = {},
}) {
  const [draft, setDraft] = useState(applied)

  useEffect(() => {
    setDraft(applied)
  }, [applied])

  const set = (key) => (e) => {
    const val = e.target.value
    setDraft((prev) => ({ ...prev, [key]: val }))
  }

  const handleApply = () => {
    onApply(draft)
  }

  const handleReset = () => {
    setDraft(EMPTY_ITS_FILTERS)
    onApply(EMPTY_ITS_FILTERS)
  }

  const quarters = availableOptions.quarters || ['Q1', 'Q2', 'Q3', 'Q4']
  const years = availableOptions.years || [2026, 2025]
  const labels = availableOptions.labels || ['Q3-2026', 'Q4-2026', 'OperationSupport', 'GMS', 'ahamove', 'data-fix']
  const statuses = availableOptions.statuses || ['Done', 'Not Reproducible', 'Rejected', 'Closed', 'Open', 'In Progress']
  const types = availableOptions.types || ['Bug', 'Support', 'Incident', 'Task']
  const classifies = availableOptions.classifies || ['Feedback bug', 'Rule sản phẩm', 'Bug can not reproduce', 'Support']

  const slaStatuses = [
    { id: '', label: 'Tất cả SLA', icon: null },
    { id: 'breached', label: '🚨 Trễ SLA', icon: AlertTriangle },
    { id: 'warning', label: '⚠️ Sắp trễ (< 4h)', icon: Clock },
    { id: 'ok', label: '✅ Trong hạn', icon: CheckCircle2 },
  ]

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <SlidersHorizontal size={16} className="text-blue-600 dark:text-blue-400" />
          <span>Bộ lọc Quản lý ITS</span>
        </div>

        {/* Quick Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã ITS, tóm tắt, bug liên kết..."
            value={draft.search}
            onChange={set('search')}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Quý */}
        <MultiSelect
          label="Quý"
          value={draft.quarter}
          onChange={set('quarter')}
          options={quarters}
          panelClassName="min-w-32"
        />

        {/* Năm */}
        <MultiSelect
          label="Năm"
          value={draft.year}
          onChange={set('year')}
          options={years}
          panelClassName="min-w-32"
        />

        {/* Trạng thái */}
        <MultiSelect
          label="Trạng thái"
          value={draft.status}
          onChange={set('status')}
          options={statuses}
          optionClassName={statusStyle}
          panelClassName="min-w-44"
        />

        {/* Type */}
        <MultiSelect
          label="Loại (Type)"
          value={draft.type}
          onChange={set('type')}
          options={types}
          panelClassName="min-w-36"
        />

        {/* Classify */}
        <MultiSelect
          label="Phân loại (Classify)"
          value={draft.classify}
          onChange={set('classify')}
          options={classifies}
          panelClassName="min-w-56"
        />

        {/* SLA Status Single Select */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tình trạng SLA</span>
          <select
            value={draft.slaStatus}
            onChange={set('slaStatus')}
            className="border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 h-[36px]"
          >
            {slaStatuses.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2">
          {/* Quick chip: Q3-2026 */}
          <button
            type="button"
            onClick={() => {
              const next = { ...draft, quarter: 'Q3', year: '2026' }
              setDraft(next)
              onApply(next)
            }}
            className="text-xs px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-300 font-medium transition-colors"
          >
            📅 Quý 3/2026
          </button>
          {/* Quick chip: Trễ SLA */}
          <button
            type="button"
            onClick={() => {
              const next = { ...draft, slaStatus: draft.slaStatus === 'breached' ? '' : 'breached' }
              setDraft(next)
              onApply(next)
            }}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              draft.slaStatus === 'breached'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-300'
            }`}
          >
            🚨 Chỉ vé trễ SLA
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  )
}
