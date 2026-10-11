import { useState, useMemo } from 'react'
import {
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Search,
  ExternalLink,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FolderGit2,
  Layers,
  ArrowUpRight,
  Flame,
} from 'lucide-react'
import { Panel } from '../../components/ui.jsx'
import { jiraUrl } from '../../lib/api.js'

export default function BscTempoPanel({
  tempoAnalysis = {},
  quarterLabel = '',
  mode = 'dark',
  onNavigateToTask,
}) {
  const [expanded, setExpanded] = useState(false)
  const [filterType, setFilterType] = useState('all') // 'all' | 'overlogged' | 'on_track' | 'missing_plan'
  const [projectFilter, setProjectFilter] = useState('all') // 'all' | 'GOP' | 'SSD' | ...
  const [search, setSearch] = useState('')

  const {
    totalPlannedHours = 0,
    totalActualHours = 0,
    completionRate = 0,
    diffHours = 0,
    totalOverloggedHours = 0,
    dateRange = {},
    months = [],
    projects = [],
    overloggedCount = 0,
    onTrackCount = 0,
    missingPlanCount = 0,
    tasks = [],
    tempoReportUrl = '',
  } = tempoAnalysis

  const reportUrl =
    tempoReportUrl ||
    `https://jira.vexere.net/secure/Tempo.jspa#/reports/planned-vs-actual/bc868685-a3b5-4fba-b024-d57f97612057?chartType=DONUT&from=${dateRange.from || '2026-07-01'}&groupBy=project&subType=MONTH&to=${dateRange.to || '2026-09-30'}&type=FIXED&worker=JIRAUSER14615`

  // Distinct projects from tasks
  const distinctProjects = useMemo(() => {
    const set = new Set()
    for (const t of tasks) {
      if (t.project) set.add(t.project)
    }
    return Array.from(set).sort()
  }, [tasks])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let list = tasks || []

    if (filterType === 'overlogged') {
      list = list.filter((t) => t.statusType === 'overlogged')
    } else if (filterType === 'on_track') {
      list = list.filter((t) => t.statusType === 'on_track')
    } else if (filterType === 'missing_plan') {
      list = list.filter((t) => t.statusType === 'missing_plan')
    }

    if (projectFilter !== 'all') {
      list = list.filter((t) => (t.project || '').toUpperCase() === projectFilter.toUpperCase())
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) =>
        (t.key || '').toLowerCase().includes(q) ||
        (t.summary || '').toLowerCase().includes(q) ||
        (t.project || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [tasks, filterType, projectFilter, search])

  // Max month planned/actual for chart percentage
  const maxMonthHours = useMemo(() => {
    if (!months || months.length === 0) return 1
    return Math.max(...months.map((m) => Math.max(m.plannedHours || 0, m.actualHours || 0)), 1)
  }, [months])

  return (
    <Panel
      title={`Quản lý Giờ làm & Kế hoạch Tempo (${quarterLabel})`}
      className="overflow-hidden border-amber-200/80 dark:border-amber-500/20"
      right={(
        <div className="flex items-center gap-2">
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-colors border border-amber-300/40 dark:border-amber-500/30"
            title="Mở Báo cáo Planned vs Actual Report trên Tempo"
          >
            <span>Tempo Planned vs Actual</span>
            <ExternalLink size={11} />
          </a>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 text-xs font-medium">
            <Clock size={12} /> Báo cáo Tempo toàn diện
          </span>
        </div>
      )}
    >
      {/* ─── BANNER TỔNG QUAN GIỜ LÀM TEMPO ─── */}
      <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4 dark:from-amber-950/25 dark:via-orange-950/20 dark:to-yellow-950/25 border border-amber-100/60 dark:border-amber-500/15">
        <div className="flex flex-wrap items-center gap-5">
          {/* Conic Ring Gauge Tỷ lệ hoàn thành Plan */}
          <div
            className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full shadow-xs"
            style={{
              background: `conic-gradient(#f59e0b ${Math.min(100, completionRate)}%, rgba(148,163,184,.18) 0)`,
            }}
          >
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-50">
                {completionRate}%
              </span>
              <span className="text-[10px] text-gray-400 font-medium">đạt Plan</span>
            </div>
          </div>

          {/* Metric grid */}
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
              <Clock size={17} className="text-amber-500" />
              Tổng quan Kế hoạch vs Thực tế (Planned vs Actual từ tất cả các nguồn)
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Dữ liệu tổng hợp từ Báo cáo Tempo Planned vs Actual bao gồm toàn bộ các dự án (GOP, SSD, AW, ITS...) mà bạn đã lên kế hoạch và log work trong Quý <strong className="text-amber-700 dark:text-amber-300">{quarterLabel}</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Tổng giờ Plan (Tất cả nguồn)</div>
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{totalPlannedHours}h</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Tổng giờ Log (Tempo)</div>
                <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{totalActualHours}h</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Chênh lệch (Actual - Plan)</div>
                <div className={`text-lg font-bold tabular-nums ${diffHours > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {diffHours > 0 ? `+${diffHours}h` : `${diffHours}h`}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Vượt Plan Time</div>
                <div className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {overloggedCount} <span className="text-xs font-normal text-rose-500">(+{totalOverloggedHours}h)</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Đúng tiến độ</div>
                <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{onTrackCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Chưa có Plan</div>
                <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{missingPlanCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tiến độ Plan vs Actual tổng */}
        <div className="mt-4 pt-3 border-t border-amber-100/70 dark:border-amber-500/15">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Tiến độ tiêu hao thời gian thực tế toàn Quý so với Kế hoạch</span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {totalActualHours}h / {totalPlannedHours}h ({completionRate}%)
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
            <div
              style={{ width: `${Math.min(100, completionRate)}%` }}
              className={`h-full rounded-full transition-all duration-700 ${
                completionRate > 105
                  ? 'bg-rose-500'
                  : completionRate >= 85
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ─── PHÂN BỔ THEO DỰ ÁN (PROJECT BREAKDOWN TỪ TEMPO REPORT) ─── */}
      {projects && projects.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <FolderGit2 size={14} className="text-amber-500" />
            <span>Phân bổ Giờ Kế hoạch & Thực tế theo Dự án (GroupBy: Project)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {projects.map((p) => {
              const isOver = p.diffHours > 0
              return (
                <div
                  key={p.project}
                  className="p-3 rounded-xl border border-gray-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      {p.project}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {p.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>Act: <strong className="text-gray-800 dark:text-gray-200">{p.actualHours}h</strong></span>
                    <span>Plan: <strong>{p.plannedHours}h</strong></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                    <div
                      style={{ width: `${Math.min(100, p.completionRate || 0)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-rose-500' : p.completionRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── PHÂN BỔ GIỜ LOG THEO CÁC THÁNG TRONG QUÝ ─── */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <CalendarDays size={14} className="text-amber-500" />
          <span>Chi tiết Kế hoạch vs Thực tế theo từng tháng trong Quý (Subtype: Month)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {months.map((m) => {
            const pct = maxMonthHours > 0 ? Math.round((m.actualHours / maxMonthHours) * 100) : 0
            return (
              <div
                key={m.key}
                className="p-3 rounded-xl border border-gray-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{m.label} ({m.key})</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {m.completionRate}% đạt
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                  <span>Actual: <strong className="text-gray-800 dark:text-gray-200">{m.actualHours}h</strong></span>
                  <span>Plan: <strong>{m.plannedHours}h</strong></span>
                  <span className={m.diffHours > 0 ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {m.diffHours > 0 ? `+${m.diffHours}h` : `${m.diffHours}h`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                  <div
                    style={{ width: `${Math.min(100, m.completionRate || 0)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── NÚT THU GỌN / MỞ RỘNG BẢNG TASK CHI TIẾT ─── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200/80 px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:border-neutral-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800/70 transition-colors"
      >
        <span>
          {expanded
            ? 'Ẩn bảng phân bổ chi tiết các công việc (Plan vs Actual)'
            : `Xem chi tiết ${tasks.length} công việc và task (tất cả các nguồn) kèm giờ Plan, Actual và độ lệch`}
        </span>
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ─── PHẦN BẢNG TASK CHI TIẾT KHI MỞ RỘNG ─── */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-1">
          {/* Quick Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Tất cả ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('overlogged')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  filterType === 'overlogged'
                    ? 'bg-white dark:bg-neutral-900 text-rose-700 dark:text-rose-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Vượt Plan ({overloggedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('on_track')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  filterType === 'on_track'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Đúng tiến độ ({onTrackCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('missing_plan')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  filterType === 'missing_plan'
                    ? 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Chưa có Plan ({missingPlanCount})
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã công việc, tên task, dự án..."
                className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Project chips */}
          {distinctProjects.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-400 text-[11px] font-medium mr-1">Lọc theo dự án:</span>
              <button
                type="button"
                onClick={() => setProjectFilter('all')}
                className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                  projectFilter === 'all'
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Tất cả dự án
              </button>
              {distinctProjects.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProjectFilter(projectFilter === p ? 'all' : p)}
                  className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                    projectFilter === p
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-700 hover:border-amber-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Table of tasks */}
          <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900">
            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                Không tìm thấy công việc phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50/80 dark:bg-neutral-950/40 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    <th className="py-2.5 px-3">Mã Task / Issue</th>
                    <th className="py-2.5 px-3">Tiêu đề công việc</th>
                    <th className="py-2.5 px-3">Dự án</th>
                    <th className="py-2.5 px-3 text-right">Plan Time</th>
                    <th className="py-2.5 px-3 text-right">Actual Time</th>
                    <th className="py-2.5 px-3 text-right">Độ lệch</th>
                    <th className="py-2.5 px-3 text-center">Tiến độ Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/80">
                  {filteredTasks.map((t) => {
                    const isOver = t.statusType === 'overlogged'
                    const isMissing = t.statusType === 'missing_plan'
                    return (
                      <tr
                        key={t.key}
                        className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors"
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {onNavigateToTask ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToTask(t.key)}
                                className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {t.key}
                              </button>
                            ) : (
                              <span className="font-bold text-blue-600 dark:text-blue-400">{t.key}</span>
                            )}
                            <a
                              href={jiraUrl(t.key)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-blue-500"
                            >
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        </td>
                        <td className="py-2 px-3 max-w-[280px]">
                          <div className="truncate font-medium text-gray-800 dark:text-gray-200" title={t.summary}>
                            {t.summary || '—'}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-[11px]">
                          <span className="px-1.5 py-0.5 rounded font-bold bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                            {t.project || '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums">
                          {isMissing ? (
                            <span className="text-amber-500 font-semibold text-[11px]">Chưa plan</span>
                          ) : (
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t.planHours}h</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums font-bold text-gray-900 dark:text-gray-100">
                          {t.loggedHours}h
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums font-semibold">
                          {isMissing ? (
                            <span className="text-gray-400">—</span>
                          ) : isOver ? (
                            <span className="text-rose-600 dark:text-rose-400">+{t.diffHours}h</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">{t.diffHours}h</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {isMissing ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                              Thiếu Plan
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`text-[11px] font-bold tabular-nums ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {t.pct}%
                              </span>
                              <div className="w-12 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, t.pct || 0)}%` }}
                                  className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
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
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
