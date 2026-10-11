import { useMemo, useState, useEffect } from 'react'
import {
  Search,
  ExternalLink,
  Inbox,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Star,
  Zap,
  RefreshCw,
  Bot,
  Filter,
  Check,
} from 'lucide-react'
import { Badge, EmptyState } from '../components/ui.jsx'
import { statusStyle } from '../lib/tokens.js'
import { jiraUrl } from '../lib/api.js'

const PAGE_SIZES = [10, 20, 50, 100]

const formatHours = (seconds) => {
  if (!seconds || seconds <= 0) return '0h'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export default function TaskTimeManagement({ tasks = [], highlightKey }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'missing_plan' | 'overlogged' | 'on_track' | 'in_progress'
  const [sprintFilter, setSprintFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('default')
  const [sortDirection, setSortDirection] = useState('desc')

  // Filter tasks (exclude Bug type, focus on Task/Support)
  const taskIssues = useMemo(() => {
    return tasks.filter((t) => t.type !== 'Bug')
  }, [tasks])

  // Get distinct sprints
  const distinctSprints = useMemo(() => {
    const set = new Set()
    for (const t of taskIssues) {
      if (t.sprint) set.add(t.sprint)
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [taskIssues])

  // Aggregate metrics
  const stats = useMemo(() => {
    let missingPlanCount = 0
    let overloggedCount = 0
    let onTrackCount = 0
    let totalPlanSeconds = 0
    let totalLoggedSeconds = 0
    let totalOverloggedSeconds = 0

    for (const t of taskIssues) {
      const plan = Number(t.planSeconds) || 0
      const logged = Number(t.loggedSeconds) || 0
      totalPlanSeconds += plan
      totalLoggedSeconds += logged

      if (plan === 0) {
        missingPlanCount++
      } else if (logged > plan) {
        overloggedCount++
        totalOverloggedSeconds += logged - plan
      } else {
        onTrackCount++
      }
    }

    const overallPct = totalPlanSeconds > 0 ? Math.round((totalLoggedSeconds / totalPlanSeconds) * 100) : 0

    return {
      totalTasks: taskIssues.length,
      missingPlanCount,
      overloggedCount,
      onTrackCount,
      totalPlanSeconds,
      totalLoggedSeconds,
      totalOverloggedSeconds,
      totalPlanHours: (totalPlanSeconds / 3600).toFixed(1),
      totalLoggedHours: (totalLoggedSeconds / 3600).toFixed(1),
      totalOverloggedHours: (totalOverloggedSeconds / 3600).toFixed(1),
      overallPct,
    }
  }, [taskIssues])

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return taskIssues.filter((t) => {
      // 1. Text search
      if (q) {
        const matchKey = t.key.toLowerCase().includes(q)
        const matchSummary = (t.summary || '').toLowerCase().includes(q)
        const matchSprint = (t.sprint || '').toLowerCase().includes(q)
        if (!matchKey && !matchSummary && !matchSprint) return false
      }

      // 2. Sprint dropdown
      if (sprintFilter && t.sprint !== sprintFilter) {
        return false
      }

      // 3. Quick Filter Status
      const plan = Number(t.planSeconds) || 0
      const logged = Number(t.loggedSeconds) || 0

      if (filterType === 'missing_plan') {
        return plan === 0
      }
      if (filterType === 'overlogged') {
        return plan > 0 && logged > plan
      }
      if (filterType === 'on_track') {
        return plan > 0 && logged <= plan
      }
      if (filterType === 'in_progress') {
        return ['In Progress', 'Testing', 'Ready to Test'].includes(t.status)
      }

      return true
    })
  }, [taskIssues, search, sprintFilter, filterType])

  // Sorting
  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sortField === 'default') {
      // Default sort: Overlogged first, then missing plan, then highest log time
      return list.sort((a, b) => {
        const aPlan = Number(a.planSeconds) || 0
        const aLog = Number(a.loggedSeconds) || 0
        const bPlan = Number(b.planSeconds) || 0
        const bLog = Number(b.loggedSeconds) || 0

        const aOver = aPlan > 0 && aLog > aPlan
        const bOver = bPlan > 0 && bLog > bPlan
        if (aOver !== bOver) return aOver ? -1 : 1

        const aMiss = aPlan === 0
        const bMiss = bPlan === 0
        if (aMiss !== bMiss) return aMiss ? -1 : 1

        return bLog - aLog
      })
    }

    return list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'planSeconds') {
        valA = Number(a.planSeconds) || 0
        valB = Number(b.planSeconds) || 0
      } else if (sortField === 'loggedSeconds') {
        valA = Number(a.loggedSeconds) || 0
        valB = Number(b.loggedSeconds) || 0
      } else if (sortField === 'diffSeconds') {
        const aP = Number(a.planSeconds) || 0
        const aL = Number(a.loggedSeconds) || 0
        const bP = Number(b.planSeconds) || 0
        const bL = Number(b.loggedSeconds) || 0
        valA = aP - aL
        valB = bP - bL
      } else if (sortField === 'progressPercent') {
        valA = a.planSeconds > 0 ? (a.loggedSeconds / a.planSeconds) : -1
        valB = b.planSeconds > 0 ? (b.loggedSeconds / b.planSeconds) : -1
      }

      if (valA === valB) return 0
      if (valA == null || valA === '') return 1
      if (valB == null || valB === '') return -1

      let cmp = 0
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB
      } else {
        cmp = String(valA).localeCompare(String(valB))
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDirection])

  useEffect(() => setPage(1), [search, sprintFilter, filterType, pageSize])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortableTH = ({ field, children, className = '' }) => {
    const active = sortField === field
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer hover:bg-gray-100/80 dark:hover:bg-neutral-800 transition-colors select-none text-[13px] ${className}`}
      >
        <div className="flex items-center gap-1">
          {children}
          <span className="text-[10px] text-gray-400">
            {!active ? '↕' : sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        </div>
      </th>
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── 1. TOP STATS / ALERT PANELS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Panel 1: Chưa có Plan Time */}
        <button
          type="button"
          onClick={() => setFilterType((prev) => (prev === 'missing_plan' ? 'all' : 'missing_plan'))}
          className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-sm relative overflow-hidden group ${
            filterType === 'missing_plan'
              ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-600'
              : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 hover:border-amber-300 dark:hover:border-amber-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Chưa có Plan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
            {stats.missingPlanCount}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cần lên kế hoạch trên Tempo
          </p>
          {filterType === 'missing_plan' && (
            <span className="absolute bottom-2 right-2 text-[10px] bg-amber-500 text-white font-medium px-1.5 py-0.5 rounded">
              Đang lọc
            </span>
          )}
        </button>

        {/* Panel 2: Log Time vượt Plan (Overlogged) */}
        <button
          type="button"
          onClick={() => setFilterType((prev) => (prev === 'overlogged' ? 'all' : 'overlogged'))}
          className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-sm relative overflow-hidden group ${
            filterType === 'overlogged'
              ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-600'
              : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 hover:border-rose-300 dark:hover:border-rose-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Vượt Plan Time
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {stats.overloggedCount}
          </div>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 font-medium">
            Vượt +{stats.totalOverloggedHours}h so với kế hoạch
          </p>
          {filterType === 'overlogged' && (
            <span className="absolute bottom-2 right-2 text-[10px] bg-rose-500 text-white font-medium px-1.5 py-0.5 rounded">
              Đang lọc
            </span>
          )}
        </button>

        {/* Panel 3: Đúng tiến độ (On Track) */}
        <button
          type="button"
          onClick={() => setFilterType((prev) => (prev === 'on_track' ? 'all' : 'on_track'))}
          className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-sm relative overflow-hidden group ${
            filterType === 'on_track'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-600'
              : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Đúng tiến độ
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.onTrackCount}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Log time trong định mức
          </p>
          {filterType === 'on_track' && (
            <span className="absolute bottom-2 right-2 text-[10px] bg-emerald-500 text-white font-medium px-1.5 py-0.5 rounded">
              Đang lọc
            </span>
          )}
        </button>

        {/* Panel 4: Tổng quan Giờ làm (Tempo Overview) */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Tổng giờ QC (Tempo)
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
                {stats.totalLoggedHours}h
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">/</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 tabular-nums">
                {stats.totalPlanHours}h plan
              </span>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
              <span>Tỷ lệ hoàn thành</span>
              <span className="font-semibold tabular-nums">{stats.overallPct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  stats.overallPct > 100
                    ? 'bg-rose-500'
                    : stats.overallPct > 80
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, stats.overallPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. SEARCH & QUICK FILTER PILLS ─── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }`}
            >
              Tất cả ({taskIssues.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('missing_plan')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'missing_plan'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25'
              }`}
            >
              <AlertCircle size={13} />
              Chưa có Plan ({stats.missingPlanCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('overlogged')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'overlogged'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25'
              }`}
            >
              <AlertTriangle size={13} />
              Vượt Plan ({stats.overloggedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('on_track')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'on_track'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
              }`}
            >
              <CheckCircle2 size={13} />
              Đúng tiến độ ({stats.onTrackCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('in_progress')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'in_progress'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/25'
              }`}
            >
              <TrendingUp size={13} />
              Đang thực hiện
            </button>
          </div>

          {/* Right controls: Sprint filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {distinctSprints.length > 0 && (
              <select
                value={sprintFilter}
                onChange={(e) => setSprintFilter(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">Tất cả Sprint</option>
                {distinctSprints.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm task hoặc summary…"
                className="pl-8 pr-3 py-1.5 w-60 max-w-full text-xs rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. TIME TRACKING TABLE ─── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <EmptyState
            icon={Inbox}
            hint="Không tìm thấy task nào phù hợp với bộ lọc quản lý thời gian."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/40">
                    <SortableTH field="key" className="w-32">
                      Task
                    </SortableTH>
                    <th className="py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 text-[13px]">
                      Summary
                    </th>
                    <SortableTH field="status" className="w-32">
                      Status
                    </SortableTH>
                    <th className="py-2.5 px-3 font-semibold text-gray-600 dark:text-gray-300 text-[13px] w-36">
                      Sprint
                    </th>
                    <SortableTH field="planSeconds" className="text-right w-28">
                      Plan Time
                    </SortableTH>
                    <SortableTH field="loggedSeconds" className="text-right w-28">
                      Log Time
                    </SortableTH>
                    <SortableTH field="diffSeconds" className="text-right w-28">
                      Chênh lệch
                    </SortableTH>
                    <SortableTH field="progressPercent" className="w-56 text-center">
                      Tiến độ hiển thị
                    </SortableTH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/60">
                  {rows.map((t) => {
                    const planSec = Number(t.planSeconds) || 0
                    const loggedSec = Number(t.loggedSeconds) || 0
                    const diffSec = planSec - loggedSec
                    const isOverlogged = planSec > 0 && loggedSec > planSec
                    const isMissingPlan = planSec === 0
                    const pct = planSec > 0 ? Math.round((loggedSec / planSec) * 100) : null
                    const isHighlighted = t.key === highlightKey

                    const isGoal = (t.labels || []).some((l) =>
                      ['sprintgoal', 'sprint-goal'].includes(l.toLowerCase())
                    )
                    const isDotXuat = (t.labels || []).some((l) =>
                      ['độtxuất', 'đột xuất', 'dotxuat', 'dot xuat'].includes(l.toLowerCase().trim())
                    )

                    return (
                      <tr
                        key={t.key}
                        id={`task-time-${t.key}`}
                        className={`transition-colors duration-150 ${
                          isOverlogged
                            ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/60 dark:hover:bg-rose-950/20'
                            : isMissingPlan
                            ? 'bg-amber-50/20 dark:bg-amber-950/5 hover:bg-amber-50/40 dark:hover:bg-amber-950/15'
                            : 'hover:bg-gray-50/80 dark:hover:bg-neutral-800/40'
                        } ${
                          isHighlighted
                            ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 bg-blue-500/10'
                            : ''
                        }`}
                      >
                        {/* Task key */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 font-medium">
                            {isGoal && <span title="Sprint Goal">🏆</span>}
                            {isDotXuat && <Zap size={13} className="text-orange-500" title="Đột xuất" />}
                            <a
                              href={jiraUrl(t.key)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-[13.5px]"
                            >
                              {t.key} <ExternalLink size={11} />
                            </a>
                          </div>
                        </td>

                        {/* Summary */}
                        <td
                          className="py-2.5 px-3 max-w-[280px] truncate text-gray-800 dark:text-gray-200 text-[13px]"
                          title={t.summary}
                        >
                          {t.summary}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge className={`${statusStyle(t.status)} !text-[12.5px]`}>
                            {t.status || '—'}
                          </Badge>
                        </td>

                        {/* Sprint */}
                        <td
                          className="py-2.5 px-3 whitespace-nowrap truncate max-w-[140px] text-gray-500 dark:text-gray-400 text-xs"
                          title={t.sprint}
                        >
                          {t.sprint || '—'}
                        </td>

                        {/* Plan Time */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {isMissingPlan ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-100/70 dark:bg-amber-500/15 border border-amber-200/80 dark:border-amber-500/25">
                              <AlertCircle size={11} /> Chưa có
                            </span>
                          ) : (
                            <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums text-[13.5px]">
                              {formatHours(planSec)}
                            </span>
                          )}
                        </td>

                        {/* Log Time */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {loggedSec > 0 ? (
                            <span
                              className={`font-semibold tabular-nums text-[13.5px] ${
                                isOverlogged
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              {formatHours(loggedSec)}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-neutral-600 tabular-nums">
                              0h
                            </span>
                          )}
                        </td>

                        {/* Chênh lệch (+/-) */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {isMissingPlan ? (
                            <span className="text-gray-300 dark:text-neutral-600">—</span>
                          ) : isOverlogged ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 tabular-nums">
                              +{formatHours(Math.abs(diffSec))}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              -{formatHours(diffSec)}
                            </span>
                          )}
                        </td>

                        {/* Tiến độ hiển thị (Progress Bar) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isMissingPlan ? (
                            <div className="flex items-center justify-center">
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                                Chưa thiết lập kế hoạch
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs tabular-nums">
                                <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                                  {formatHours(loggedSec)} / {formatHours(planSec)}
                                </span>
                                <span
                                  className={`font-bold text-[11px] ${
                                    isOverlogged
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : pct > 80
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-gray-200/50 dark:border-neutral-700/50">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOverlogged
                                      ? 'bg-rose-500'
                                      : pct > 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-t border-gray-100 dark:border-neutral-800 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/30 dark:bg-neutral-800/20">
              <label className="flex items-center gap-2">
                Hiển thị:
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} task / trang
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-3">
                <span className="tabular-nums">
                  {start + 1}–{Math.min(start + pageSize, sorted.length)} / {sorted.length} task
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-md border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Trước
                  </button>
                  <span className="px-2.5 py-1 text-gray-500 dark:text-gray-400 tabular-nums">
                    {page} / {pageCount}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="px-2.5 py-1 rounded-md border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
