// Reusable UI primitives — cards, panels, badges, progress bars, states.
// UI text is Vietnamese (repo convention). Icons via lucide-react (ui.md §20).

// Entity → soft icon-chip classes (ui.md §18 color tokens).
const ENTITY_CHIP = {
  task: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  review: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  tc: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  td: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  qc: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  bug: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
}
const ENTITY_BAR = {
  task: 'bg-blue-500', review: 'bg-green-500', tc: 'bg-violet-500',
  td: 'bg-orange-500', qc: 'bg-indigo-500', bug: 'bg-red-500',
}

// A surface panel (charts, tables, grouped content).
export function Panel({ title, right, children, className = '' }) {
  return (
    <section className={`bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          {title && <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{title}</h3>}
          {right}
        </header>
      )}
      <div className="px-4 pb-4">{children}</div>
    </section>
  )
}

// KPI card (ui.md §4): Icon → Name → Value → Subtitle.
export function KpiCard({ icon: Icon, label, value, subtitle, entity = 'task', tooltip }) {
  return (
    <div
      title={tooltip}
      className="animate-fade-in bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${ENTITY_CHIP[entity]}`}>
          {Icon && <Icon size={18} strokeWidth={2.2} />}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{value}</div>
      {subtitle != null && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

// A single labelled progress bar (ui.md §5) — value with note + filled bar.
export function ProgressBar({ label, value, note, max, entity = 'task' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium tabular-nums">
          {value}
          {note && <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">({note})</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
        <div className={`h-full rounded-full ${ENTITY_BAR[entity]} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// A small pill/badge.
export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

// A pair of stat figures inside a panel (e.g. Total / Average / Highest / Lowest).
export function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{value}</div>
    </div>
  )
}

// Empty state (ui.md §12).
export function EmptyState({ title = 'Không có dữ liệu', hint = 'Không tìm thấy task nào.', icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <Icon size={40} className="text-gray-300 dark:text-neutral-600 mb-3" strokeWidth={1.5} />}
      <div className="font-medium text-gray-600 dark:text-gray-300">{title}</div>
      <div className="text-sm text-gray-400 dark:text-gray-500">{hint}</div>
    </div>
  )
}

// Skeleton block (ui.md §13).
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-800 ${className}`} />
}
