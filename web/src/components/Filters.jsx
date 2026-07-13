// Global filter bar (ui.md §3): Project, Year, Quarter, Status, Review /
// Test Case / Test Design level, with Reset + Apply. Filters are staged in a
// local draft and only committed to the API on "Apply".
import { useState, useEffect } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'

const EMPTY = { project: '', year: '', quarter: '', status: '', review: '', tc: '', td: '' }

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

export default function Filters({ options, applied, onApply }) {
  const [draft, setDraft] = useState(applied)
  useEffect(() => setDraft(applied), [applied])
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  const levels = ['1', '2', '3']

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
        <SlidersHorizontal size={15} /> Bộ lọc
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Field label="Project" value={draft.project} onChange={set('project')} options={options.projects || []} />
        <Field label="Year" value={draft.year} onChange={set('year')} options={options.years || []} />
        <Field label="Quarter" value={draft.quarter} onChange={set('quarter')} options={options.quarters || []} />
        <Field label="Status" value={draft.status} onChange={set('status')} options={options.statuses || []} />
        <Field label="Review" value={draft.review} onChange={set('review')} options={levels} render={(l) => `Review ${l}`} />
        <Field label="Test Case" value={draft.tc} onChange={set('tc')} options={levels} render={(l) => `TC ${l}`} />
        <Field label="Test Design" value={draft.td} onChange={set('td')} options={levels} render={(l) => `TD ${l}`} />
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={() => onApply(EMPTY)}
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
