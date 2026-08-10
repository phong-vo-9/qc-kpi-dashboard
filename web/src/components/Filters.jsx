import { useState, useEffect } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'

const EMPTY = { project: '', sprint: '', year: '', quarter: '', status: '', review: '', tc: '', td: '', type: '', label: '' }

function Field({ label, value, onChange, options, render = (o) => o }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value} onChange={onChange}
        className="border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <option value="">Tất cả</option>
        {options.map((o) => <option key={o} value={o}>{render(o)}</option>)}
      </select>
    </label>
  )
}

function MultiSelect({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',') : []
  const toggle = (opt) => {
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

  const LABEL_COLORS = {
    'sprint-goal': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    regressiontest: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    dotxuat: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  }

  return (
    <div className="flex flex-col gap-1 min-w-0 relative" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-left w-full"
      >
        <span className="truncate">
          {selected.length === 0 ? 'Tất cả' : `${selected.length} đã chọn`}
        </span>
        <span className="text-xs text-gray-400 ml-1">▼</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-2 space-y-1">
          {options.map((opt) => {
            const active = selected.includes(opt)
            const key = opt.toLowerCase().replace(/[^a-z0-9]/g, '')
            const colorClass = LABEL_COLORS[opt.toLowerCase()] || LABEL_COLORS[key] || 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300'
            return (
              <label key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded text-xs cursor-pointer text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(opt)}
                  className="rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                />
                <span className={`px-1.5 py-0.5 rounded font-medium ${colorClass}`}>{opt}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Filters({ options, applied, onApply, onProjectChange }) {
  const [draft, setDraft] = useState(applied)
  useEffect(() => setDraft(applied), [applied])

  const set = (k) => (e) => {
    const newVal = e.target.value
    if (k === 'project') onProjectChange?.(newVal)
    setDraft((d) => {
      const next = { ...d, [k]: newVal }
      if (k === 'project') next.sprint = ''
      return next
    })
  }

  const reset = () => {
    setDraft(EMPTY)
    onProjectChange?.('')
    onApply(EMPTY)
  }

  const levels = ['1', '2', '3']
  const FIXED_LABELS = ['Sprint-Goal', 'RegressionTest', 'ĐộtXuất']

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
        <SlidersHorizontal size={15} /> Bộ lọc
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
        <Field label="Project" value={draft.project} onChange={set('project')} options={options.projects || []} />
        <Field label="Sprint" value={draft.sprint} onChange={set('sprint')} options={options.sprints || []} />
        <Field label="Year" value={draft.year} onChange={set('year')} options={options.years || []} />
        <Field label="Quarter" value={draft.quarter} onChange={set('quarter')} options={options.quarters || []} />
        <Field label="Status" value={draft.status} onChange={set('status')} options={options.statuses || []} />
        <Field label="Type" value={draft.type} onChange={set('type')} options={options.types || ['Task', 'Bug']} />
        <Field label="Review" value={draft.review} onChange={set('review')} options={levels} render={(l) => `Review ${l}`} />
        <Field label="Test Case" value={draft.tc} onChange={set('tc')} options={levels} render={(l) => `TC ${l}`} />
        <Field label="Test Design" value={draft.td} onChange={set('td')} options={levels} render={(l) => `TD ${l}`} />
        <MultiSelect label="Label" value={draft.label} onChange={set('label')} options={FIXED_LABELS} />
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw size={14} /> Reset
        </button>
        <button
          onClick={() => onApply(draft)}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export { EMPTY as EMPTY_FILTERS }
