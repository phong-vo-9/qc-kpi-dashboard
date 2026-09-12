import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, RotateCcw, Rocket, SlidersHorizontal } from 'lucide-react'
import { statusStyle } from '../lib/tokens.js'

const EMPTY = { project: '', sprint: '', year: '', quarter: '', status: '', review: '', tc: '', td: '', type: '', label: '' }

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

  const LABEL_COLORS = {
    'sprint-goal': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    regressiontest: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    automationtest: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    dotxuat: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  }
  const defaultOptionClass = 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300'

  return (
    <div className="flex flex-col gap-1 min-w-0 relative" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-left w-full"
      >
        <span className="truncate">{selected.length === 0 ? 'Tất cả' : `${selected.length} đã chọn`}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-50 top-full left-0 mt-1 w-max min-w-full max-w-[min(28rem,calc(100vw-2rem))] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg shadow-lg p-2 space-y-1 max-h-64 overflow-auto ${panelClassName}`}>
          {options.map((rawOpt) => {
            const opt = String(rawOpt)
            const active = selected.includes(opt)
            const key = opt.toLowerCase().replace(/[^a-z0-9]/g, '')
            const colorClass = optionClassName?.(opt) || LABEL_COLORS[opt.toLowerCase()] || LABEL_COLORS[key] || defaultOptionClass
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
          })}
        </div>
      )}
    </div>
  )
}

export default function Filters({ options, applied, onApply, onProjectChange, sprintAnalysis = [] }) {
  const [draft, setDraft] = useState(applied)
  useEffect(() => setDraft(applied), [applied])

  const gopCurrentSprint = useMemo(
    () => sprintAnalysis.find((d) => d.project === 'GOP' && d.sprintName)?.sprintName || '',
    [sprintAnalysis]
  )

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

  const setGopCurrentSprint = () => {
    if (!gopCurrentSprint) return
    const next = { ...draft, project: 'GOP', sprint: gopCurrentSprint }
    setDraft(next)
    onProjectChange?.('GOP')
    onApply(next)
  }

  const levels = ['1', '2', '3']
  const FIXED_LABELS = ['Sprint-Goal', 'RegressionTest', 'AutomationTest', 'ĐộtXuất']
  const typeStyle = (type) => ({
    Task: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-100 dark:border-sky-500/20',
    Bug: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 border border-red-200 dark:border-red-500/20',
    Support: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-100 dark:border-purple-500/20',
  }[type] || 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300')

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
        <SlidersHorizontal size={15} /> Bộ lọc
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
        <MultiSelect label="Project" value={draft.project} onChange={set('project')} options={options.projects || []} panelClassName="min-w-44" />
        <MultiSelect label="Sprint" value={draft.sprint} onChange={set('sprint')} options={options.sprints || []} panelClassName="min-w-56" />
        <MultiSelect label="Year" value={draft.year} onChange={set('year')} options={options.years || []} panelClassName="min-w-36" />
        <MultiSelect label="Quarter" value={draft.quarter} onChange={set('quarter')} options={options.quarters || []} panelClassName="min-w-36" />
        <MultiSelect label="Status" value={draft.status} onChange={set('status')} options={options.statuses || []} optionClassName={statusStyle} panelClassName="min-w-56" />
        <MultiSelect label="Type" value={draft.type} onChange={set('type')} options={options.types || ['Task', 'Bug']} optionClassName={typeStyle} panelClassName="min-w-44" />
        <MultiSelect label="Review" value={draft.review} onChange={set('review')} options={levels} render={(l) => `Review ${l}`} panelClassName="min-w-44" />
        <MultiSelect label="Test Case" value={draft.tc} onChange={set('tc')} options={levels} render={(l) => `TC ${l}`} panelClassName="min-w-40" />
        <MultiSelect label="Test Design" value={draft.td} onChange={set('td')} options={levels} render={(l) => `TD ${l}`} panelClassName="min-w-44" />
        <MultiSelect label="Label" value={draft.label} onChange={set('label')} options={FIXED_LABELS} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 mt-3">
        <button
          onClick={setGopCurrentSprint}
          disabled={!gopCurrentSprint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-amber-200 dark:border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Rocket size={14} /> GOP hiện tại
        </button>
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
