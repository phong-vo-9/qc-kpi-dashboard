import { useEffect, useMemo, useState } from 'react'
import { Search, Bug, Filter, Layers3, Clock3, PlayCircle, ClipboardCheck, CheckCircle2, ExternalLink, RotateCcw, GripVertical, Plus, Save, Check, Sparkles, Target, AlertCircle, X } from 'lucide-react'
import { Badge, EmptyState, Panel } from '../components/ui.jsx'
import { jiraUrl } from '../lib/api.js'
import { statusStyle } from '../lib/tokens.js'
import {
  BUG_GMS_MODULES,
  BUG_STATUS_BUCKETS,
  canonicalBugStatus,
  bugStatusOrder,
  normalizeBugLabel,
} from '../lib/bugModules.js'

const PAGE_SIZES = [10, 20, 50, 100]
const UNCLASSIFIED = { label: '__unclassified__', name: 'Chưa phân loại' }

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const toTime = (dateStr) => {
  if (!dateStr) return Number.POSITIVE_INFINITY
  const ts = new Date(dateStr).getTime()
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts
}

const SortableTH = ({ activeField, direction, field, onSort, children, className = '' }) => (
  <th
    onClick={() => onSort(field)}
    className={`py-2 px-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors select-none ${className}`}
  >
    <div className="flex items-center gap-1">
      {children}
      <span className="text-[10px] text-gray-400">{activeField !== field ? '↕' : direction === 'asc' ? '▲' : '▼'}</span>
    </div>
  </th>
)

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 transition-colors hover:border-gray-300 dark:hover:border-neutral-700">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${tone}`}>
            <Icon size={18} />
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{value}</div>
      </div>
    </div>
  )
}

const priorityRank = (priority) => {
  const p = String(priority || '').toLowerCase()
  if (p.includes('highest') || p === 'p1' || p.includes('blocker') || p.includes('critical')) return 0
  if (p.includes('high') || p === 'p2' || p.includes('major')) return 1
  if (p.includes('medium') || p === 'p3' || p.includes('normal')) return 2
  return 3
}

const storyPointsOf = (bug) => {
  const value = Number(bug?.storyPoints ?? bug?.storypoints ?? bug?.storyPoint ?? 0)
  return Number.isFinite(value) ? value : 0
}

function PlanBugCard({ bug, onRemove, onDragStart, onDragEnd, onOpen }) {
  const priority = bug.priority || 'Chưa gán'
  const priorityTone = priorityRank(priority) === 0
    ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    : priorityRank(priority) === 1
      ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
      : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-gray-300'
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, bug.key)}
      onDragEnd={onDragEnd}
      className="group flex items-start gap-2 rounded-xl border border-gray-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={16} className="mt-0.5 shrink-0 text-gray-300 group-hover:text-blue-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <button type="button" onClick={() => onOpen(bug)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">{bug.key}</button>
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${priorityTone}`}>{priority}</span>
        </div>
        <p className="text-sm font-medium leading-5 text-gray-800 dark:text-gray-100 line-clamp-2" title={bug.summary}>{bug.summary || 'Không có summary'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{bug.primaryModule?.name || 'Chưa phân loại'}</span>
          <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">{storyPointsOf(bug)} SP</span>
          <span>{bug.bugStatus}</span>
        </div>
      </div>
      <button type="button" onClick={() => onRemove(bug.key)} aria-label={`Bỏ ${bug.key}`} className="shrink-0 rounded-md p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-all"><X size={15} /></button>
    </div>
  )
}

function PlanningBoard({ backlog, filtered }) {
  const [plannedKeys, setPlannedKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qc-kpi-bug-plan') || '[]') } catch { return [] }
  })
  const [sprintName, setSprintName] = useState('Sprint kế tiếp')
  const [capacity, setCapacity] = useState(5)
  const [capacityMode, setCapacityMode] = useState('bugs')
  const [dragKey, setDragKey] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [saved, setSaved] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const plannedBugs = plannedKeys.map((key) => backlog.find((bug) => bug.key === key)).filter(Boolean)
  const availableBugs = filtered.filter((bug) => !plannedKeys.includes(bug.key))
  const totalSP = plannedBugs.reduce((sum, bug) => sum + storyPointsOf(bug), 0)
  const isOverCapacity = capacityMode === 'bugs' ? plannedBugs.length > capacity : totalSP > capacity
  const capacityValue = capacityMode === 'bugs' ? plannedBugs.length : totalSP

  const persist = (keys) => {
    setPlannedKeys(keys)
    try { localStorage.setItem('qc-kpi-bug-plan', JSON.stringify(keys)) } catch { /* ignore storage errors */ }
    setSaved(false); setConfirmed(false)
  }
  const addBug = (key, index) => {
    if (!key || plannedKeys.includes(key)) return
    const next = [...plannedKeys]
    if (typeof index === 'number') next.splice(index, 0, key)
    else next.push(key)
    persist(next)
  }
  const removeBug = (key) => persist(plannedKeys.filter((item) => item !== key))
  const handleDrop = (event, targetIndex) => {
    event.preventDefault()
    event.stopPropagation()
    const source = event.dataTransfer.getData('text/plain') || dragKey
    if (!source) return
    const sourceIndex = plannedKeys.indexOf(source)
    if (sourceIndex >= 0) {
      const next = [...plannedKeys]
      next.splice(sourceIndex, 1)
      const adjusted = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      next.splice(Math.max(0, adjusted), 0, source)
      persist(next)
    } else addBug(source, targetIndex)
    setDragOver(null); setDragKey(null)
  }
  const suggest = () => {
    const candidates = backlog.filter((bug) => !plannedKeys.includes(bug.key) && bug.bugStatus !== 'Done').sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || toTime(a.created) - toTime(b.created))
    const slots = capacityMode === 'bugs' ? Math.max(0, capacity - plannedBugs.length) : candidates.reduce((count, bug) => count + storyPointsOf(bug), 0)
    if (capacityMode === 'bugs') persist([...plannedKeys, ...candidates.slice(0, slots).map((bug) => bug.key)])
    else {
      let used = totalSP; const picks = []
      for (const bug of candidates) { if (used + storyPointsOf(bug) > capacity) continue; picks.push(bug.key); used += storyPointsOf(bug) }
      persist([...plannedKeys, ...picks])
    }
  }
  const savePlan = () => { try { localStorage.setItem('qc-kpi-bug-plan', JSON.stringify(plannedKeys)) } catch { /* ignore */ } setSaved(true); setConfirmed(false) }
  const confirmPlan = () => { savePlan(); setConfirmed(true) }
  const openBug = (bug) => window.open(jiraUrl(bug.key), '_blank', 'noopener,noreferrer')

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-500/20 dark:from-blue-500/10 dark:via-neutral-900 dark:to-indigo-500/10">
      <div className="border-b border-blue-100/80 px-5 py-4 dark:border-blue-500/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Target size={19} className="text-blue-600 dark:text-blue-400" /><h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">Lên kế hoạch sprint</h2><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">Draft</span></div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Kéo bug vào sprint dự kiến, sắp xếp theo thứ tự ưu tiên rồi lưu lại.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} className="w-40 rounded-lg border border-blue-200 bg-white/80 px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100" aria-label="Tên sprint" />
            <select value={capacityMode} onChange={(e) => setCapacityMode(e.target.value)} className="rounded-lg border border-blue-200 bg-white/80 px-2.5 py-2 text-sm text-gray-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-200"><option value="bugs">bug</option><option value="sp">story point</option></select>
            <label className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white/80 px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"><input type="number" min="1" max="100" value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))} className="w-12 bg-transparent text-center font-semibold text-gray-800 outline-none dark:text-gray-100" aria-label="Capacity" /><span className="text-gray-500 dark:text-gray-400">capacity</span></label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm"><div className={`font-semibold ${isOverCapacity ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>{capacityValue} / {capacity} {capacityMode === 'bugs' ? 'bug' : 'SP'}</div><div className="h-1.5 w-28 overflow-hidden rounded-full bg-blue-100 dark:bg-neutral-800"><div className={`h-full rounded-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (capacityValue / capacity) * 100)}%` }} /></div>{isOverCapacity && <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><AlertCircle size={13} /> Vượt capacity</span>}</div>
          <div className="flex items-center gap-2"><button type="button" onClick={suggest} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-neutral-900 dark:text-blue-300 dark:hover:bg-blue-500/10"><Sparkles size={14} /> Gợi ý bug ưu tiên</button><button type="button" onClick={savePlan} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-200"><Save size={14} /> {saved ? 'Đã lưu' : 'Lưu nháp'}</button><button type="button" onClick={confirmPlan} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><Check size={14} /> {confirmed ? 'Đã chốt' : 'Chốt kế hoạch'}</button></div>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div onDragOver={(e) => { e.preventDefault(); setDragOver('available') }} onDrop={(e) => { e.preventDefault(); const source = e.dataTransfer.getData('text/plain') || dragKey; if (source && plannedKeys.includes(source)) removeBug(source); setDragOver(null) }} className={`rounded-xl border bg-white/70 p-3 dark:bg-neutral-900/60 ${dragOver === 'available' ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-gray-200/80 dark:border-neutral-800'}`}>
          <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Backlog khả dụng</h3><p className="text-xs text-gray-500 dark:text-gray-400">{availableBugs.length} bug đang hiển thị</p></div><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-gray-300">{filtered.length}</span></div>
          <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
            {availableBugs.slice(0, 60).map((bug) => <div key={bug.key} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', bug.key); setDragKey(bug.key) }} onDragEnd={() => setDragKey(null)} className="group flex cursor-grab items-center gap-2 rounded-lg border border-gray-100 bg-white p-2.5 hover:border-blue-200 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><GripVertical size={15} className="shrink-0 text-gray-300 group-hover:text-blue-400" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><button type="button" onClick={() => openBug(bug)} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">{bug.key}</button><span className="truncate text-[11px] text-gray-400">{bug.primaryModule?.name}</span></div><p className="truncate text-xs text-gray-700 dark:text-gray-300" title={bug.summary}>{bug.summary}</p></div><span className="shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">{storyPointsOf(bug)} SP</span><button type="button" onClick={() => addBug(bug.key)} className="rounded-md p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"><Plus size={15} /></button></div>)}
            {availableBugs.length === 0 && <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-xs text-gray-400 dark:border-neutral-700">Không còn bug phù hợp bộ lọc</div>}
            {availableBugs.length > 60 && <p className="pt-2 text-center text-[11px] text-gray-400">Hiển thị 60 bug đầu tiên — dùng bộ lọc để thu hẹp.</p>}
          </div>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDragOver('planned') }} onDrop={(e) => handleDrop(e, plannedKeys.length)} className={`rounded-xl border p-3 ${dragOver === 'planned' ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-500/20 dark:bg-blue-500/10' : 'border-blue-200/80 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5'}`}>
          <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{sprintName || 'Sprint kế tiếp'}</h3><p className="text-xs text-gray-500 dark:text-gray-400">Thứ tự từ trên xuống là mức ưu tiên</p></div><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">{plannedBugs.length} bug · {totalSP} SP</span></div>
          <div className="max-h-[390px] min-h-[150px] space-y-2 overflow-y-auto pr-1">
            {plannedBugs.map((bug, index) => <div key={bug.key} onDragOver={(e) => { e.preventDefault(); setDragOver(index) }} onDrop={(e) => handleDrop(e, index)}><PlanBugCard bug={bug} onRemove={removeBug} onDragStart={(e, key) => { e.dataTransfer.setData('text/plain', key); setDragKey(key) }} onDragEnd={() => { setDragKey(null); setDragOver(null) }} onOpen={openBug} /></div>)}
            {plannedBugs.length === 0 && <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-blue-200 text-center dark:border-blue-500/30"><Target size={24} className="mb-2 text-blue-300" /><p className="text-sm font-medium text-gray-600 dark:text-gray-300">Kéo bug vào đây để lập kế hoạch</p><p className="mt-1 text-xs text-gray-400">Hoặc bấm dấu + ở backlog khả dụng</p></div>}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function BugBacklog({ bugs = [], highlightKey }) {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('updated')
  const [sortDirection, setSortDirection] = useState('desc')

  const gmsModuleMap = useMemo(
    () => new Map(BUG_GMS_MODULES.map((m) => [normalizeBugLabel(m.label), m])),
    []
  )

  const backlog = useMemo(() => (
    bugs
      .filter((x) => x.type === 'Bug')
      .map((bug) => {
        const moduleMatches = []
        for (const label of bug.labels || []) {
          const hit = gmsModuleMap.get(normalizeBugLabel(label))
          if (hit && !moduleMatches.some((m) => m.label.toLowerCase() === hit.label.toLowerCase())) moduleMatches.push(hit)
        }
        const primaryModule = moduleMatches[0] || UNCLASSIFIED
        return { ...bug, bugStatus: canonicalBugStatus(bug.status), primaryModule, moduleMatches: moduleMatches.length ? moduleMatches : [UNCLASSIFIED] }
      })
  ), [bugs, gmsModuleMap])

  const moduleStats = useMemo(() => {
    const map = new Map()
    for (const bug of backlog) {
      const key = bug.primaryModule.label
      const current = map.get(key) || { ...bug.primaryModule, count: 0, todo: 0, inProgress: 0, readyToTest: 0, testing: 0, done: 0 }
      current.count += 1
      if (bug.bugStatus === 'Todo') current.todo += 1
      else if (bug.bugStatus === 'In Progress') current.inProgress += 1
      else if (bug.bugStatus === 'Ready to Test') current.readyToTest += 1
      else if (bug.bugStatus === 'Testing') current.testing += 1
      else if (bug.bugStatus === 'Done') current.done += 1
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'))
  }, [backlog])

  const statusStats = useMemo(() => {
    const counts = Object.fromEntries(BUG_STATUS_BUCKETS.map((s) => [s, 0]))
    for (const bug of backlog) {
      if (counts[bug.bugStatus] != null) counts[bug.bugStatus] += 1
    }
    return counts
  }, [backlog])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return backlog.filter((bug) => {
      if (moduleFilter !== 'all' && bug.primaryModule.label !== moduleFilter) return false
      if (statusFilter !== 'all' && bug.bugStatus !== statusFilter) return false
      if (!q) return true
      const moduleText = [bug.primaryModule.name, ...bug.moduleMatches.map((m) => m.name)].join(' ')
      return (
        bug.key.toLowerCase().includes(q) ||
        (bug.summary || '').toLowerCase().includes(q) ||
        moduleText.toLowerCase().includes(q) ||
        (bug.priority || '').toLowerCase().includes(q) ||
        (bug.assignee || '').toLowerCase().includes(q) ||
        (bug.reporter || '').toLowerCase().includes(q)
      )
    })
  }, [backlog, moduleFilter, search, statusFilter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    return list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'module') {
        cmp = (a.primaryModule?.name || '').localeCompare(b.primaryModule?.name || '', 'vi', { numeric: true, sensitivity: 'base' })
      } else if (sortField === 'status') {
        cmp = bugStatusOrder(a.bugStatus) - bugStatusOrder(b.bugStatus)
      } else if (sortField === 'created' || sortField === 'updated' || sortField === 'duedate') {
        cmp = toTime(a[sortField]) - toTime(b[sortField])
      } else {
        cmp = String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''), 'vi', { numeric: true, sensitivity: 'base' })
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortDirection, sortField])

  useEffect(() => setPage(1), [search, moduleFilter, statusFilter, pageSize, sortField, sortDirection])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  const total = backlog.length
  const filterModules = moduleStats.filter((m) => m.label !== UNCLASSIFIED.label)

  const isOverdue = (bug) => {
    if (!bug.enddate || !bug.duedate) return false
    const todayStr = new Date().toISOString().split('T')[0]
    return bug.duedate < todayStr && bug.bugStatus !== 'Done'
  }


  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'status' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Bộ lọc backlog" right={<Badge className="bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">{filtered.length}/{total}</Badge>}>
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo bug ID, summary, assignee, reporter..."
                className="pl-9 pr-3 py-2 w-full text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Filter size={15} />
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <option value="all">Tất cả module</option>
                {filterModules.map((m) => (
                  <option key={m.label} value={m.label}>{m.name} ({m.count})</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Layers3 size={15} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <option value="all">Tất cả trạng thái</option>
                {BUG_STATUS_BUCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          {(search || moduleFilter !== 'all' || statusFilter !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">?ang l?c:</span>
              {search && <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">T?m ki?m: {search}</Badge>}
              {moduleFilter !== 'all' && <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Module: {moduleFilter}</Badge>}
              {statusFilter !== 'all' && <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Status: {statusFilter}</Badge>}
              <button type="button" onClick={() => { setSearch(''); setModuleFilter('all'); setStatusFilter('all') }} className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
                <RotateCcw size={13} /> Xo? b? l?c
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 pt-2">
            <StatCard icon={Bug} label="Tổng bug" value={total} tone="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
            <StatCard icon={Clock3} label="Todo" value={statusStats.Todo} tone="bg-gray-50 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300" />
            <StatCard icon={PlayCircle} label="In Progress" value={statusStats['In Progress']} tone="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
            <StatCard icon={ClipboardCheck} label="Ready to Test" value={statusStats['Ready to Test']} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" />
            <StatCard icon={CheckCircle2} label="Done" value={statusStats.Done} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" />
          </div>
        </div>
      </Panel>

      <PlanningBoard backlog={backlog} filtered={filtered} />

      <Panel title="Danh sách bug backlog" right={<Badge className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">{sorted.length} bug</Badge>}>
        {sorted.length === 0 ? (
          <EmptyState icon={Bug} hint="Không có bug nào khớp bộ lọc hiện tại." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-neutral-900">
                  <tr className="text-left border-b border-gray-100 dark:border-neutral-800">
                    <SortableTH field="key" activeField={sortField} direction={sortDirection} onSort={handleSort}>Bug ID</SortableTH>
                    <SortableTH field="summary" activeField={sortField} direction={sortDirection} onSort={handleSort} className="w-[320px]">Summary</SortableTH>
                    <SortableTH field="module" activeField={sortField} direction={sortDirection} onSort={handleSort} className="w-[190px]">Module</SortableTH>
                    <SortableTH field="status" activeField={sortField} direction={sortDirection} onSort={handleSort}>Status</SortableTH>
                    <SortableTH field="priority" activeField={sortField} direction={sortDirection} onSort={handleSort}>Priority</SortableTH>
                    <SortableTH field="assignee" activeField={sortField} direction={sortDirection} onSort={handleSort}>Assignee</SortableTH>
                    <SortableTH field="reporter" activeField={sortField} direction={sortDirection} onSort={handleSort}>Reporter</SortableTH>
                    <SortableTH field="created" activeField={sortField} direction={sortDirection} onSort={handleSort}>Created</SortableTH>
                    <SortableTH field="duedate" activeField={sortField} direction={sortDirection} onSort={handleSort}>Due date</SortableTH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((bug) => {
                    const highlighted = bug.key === highlightKey
                    return (
                      <tr
                        key={bug.key}
                        id={`task-${bug.key}`}
                        className={`border-b border-gray-50 dark:border-neutral-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all ${highlighted ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 bg-blue-500/10' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <a href={jiraUrl(bug.key)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                            {bug.key} <ExternalLink size={12} />
                          </a>
                        </td>
                        <td className="py-2 px-3 w-[320px] max-w-[320px] truncate text-gray-700 dark:text-gray-200" title={bug.summary}>{bug.summary}</td>
                        <td className="py-2 px-3 min-w-[190px]">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setModuleFilter(bug.primaryModule.label)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 hover:opacity-90"
                              title={bug.primaryModule.name}
                            >
                              {bug.primaryModule.name}
                            </button>
                            {bug.moduleMatches.length > 1 && (
                              <Badge className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                                +{bug.moduleMatches.length - 1}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3"><Badge className={statusStyle(bug.bugStatus)}>{bug.bugStatus}</Badge></td>
                        <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-gray-300">{bug.priority || '—'}</span></td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{bug.assignee || '—'}</td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{bug.reporter || '—'}</td>
                        <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateDMY(bug.created)}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isOverdue(bug) ? (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><Clock3 size={12} /> {formatDateDMY(bug.duedate)}</span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">{formatDateDMY(bug.duedate)}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-100 dark:border-neutral-800 text-sm">
              <label className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                Bug / trang
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400 tabular-nums">{start + 1}–{Math.min(start + pageSize, sorted.length)} / {sorted.length}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Trước
                  </button>
                  <span className="px-3 py-1 text-gray-500 dark:text-gray-400 tabular-nums">{page}/{pageCount}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
