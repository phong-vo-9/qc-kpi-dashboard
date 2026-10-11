import { useMemo } from 'react'
import {
  Clock,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  FolderGit2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Panel } from '../../components/ui.jsx'

export default function BscTempoSummaryCard({
  tempoAnalysis = {},
  quarterLabel = '',
  mode = 'dark',
  onNavigateTab,
}) {
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
    tempoReportUrl = '',
  } = tempoAnalysis

  const reportUrl =
    tempoReportUrl ||
    `https://jira.vexere.net/secure/Tempo.jspa#/reports/planned-vs-actual/bc868685-a3b5-4fba-b024-d57f97612057?chartType=DONUT&from=${dateRange.from || '2026-07-01'}&groupBy=project&subType=MONTH&to=${dateRange.to || '2026-09-30'}&type=FIXED&worker=JIRAUSER14615`

  return (
    <Panel
      title={`Tổng quan Giờ làm & Kế hoạch Tempo (${quarterLabel})`}
      className="overflow-hidden border-amber-200/80 dark:border-amber-500/20"
      right={(
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('time')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-xs"
            >
              <span>Xem chi tiết tại Quản lý Time</span>
              <ArrowRight size={13} />
            </button>
          )}
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-colors border border-gray-200 dark:border-neutral-700"
            title="Mở Báo cáo Tempo Planned vs Actual Report trên Jira"
          >
            <span>Tempo Jira</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}
    >
      {/* ─── NỘI DUNG TỔNG QUAN GỌN GÀNG ─── */}
      <div className="space-y-4">
        {/* Row 1: Donut Gauge + Core Metrics */}
        <div className="flex flex-wrap items-center gap-5 p-4 rounded-xl bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-yellow-50/70 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-yellow-950/20 border border-amber-100/70 dark:border-amber-500/15">
          {/* Conic Ring Gauge */}
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full shadow-xs"
            style={{
              background: `conic-gradient(#f59e0b ${Math.min(100, completionRate)}%, rgba(148,163,184,.18) 0)`,
            }}
          >
            <div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-base font-extrabold tabular-nums text-gray-900 dark:text-gray-50">
                {completionRate}%
              </span>
              <span className="text-[9px] text-gray-400 font-medium">đạt Plan</span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="min-w-[200px] flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-gray-100 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Tổng giờ Plan</div>
              <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{totalPlannedHours}h</div>
              <div className="text-[10px] text-gray-400">Tất cả nguồn dự án</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-gray-100 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Tổng giờ Log (Actual)</div>
              <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{totalActualHours}h</div>
              <div className="text-[10px] text-gray-400">Tempo Timesheet</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-gray-100 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Chênh lệch (Act - Plan)</div>
              <div className={`text-lg font-bold tabular-nums ${diffHours > 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {diffHours > 0 ? `+${diffHours}h` : `${diffHours}h`}
              </div>
              <div className="text-[10px] text-gray-400">{diffHours <= 0 ? 'Trong định mức' : 'Vượt kế hoạch'}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-gray-100 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">Vượt Plan Time</div>
              <div className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {overloggedCount} <span className="text-xs font-normal text-rose-500">task</span>
              </div>
              <div className="text-[10px] text-rose-500 font-medium">+{totalOverloggedHours}h phụ trội</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-gray-100 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Đúng tiến độ</div>
              <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {onTrackCount} <span className="text-xs font-normal">task</span>
              </div>
              <div className="text-[10px] text-gray-400">Log ≤ Plan</div>
            </div>
          </div>
        </div>

        {/* Row 2: Mini Project Breakdown & Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Projects Mini Bars */}
          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-neutral-900/50 border border-gray-200/60 dark:border-neutral-800">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-2.5">
              <span className="flex items-center gap-1.5">
                <FolderGit2 size={13} className="text-amber-500" />
                Phân bổ theo Dự án ({projects.length} dự án)
              </span>
              <span className="text-[11px] font-normal text-gray-400">Act / Plan</span>
            </div>
            <div className="space-y-2">
              {projects.map((p) => {
                const pct = p.plannedHours > 0 ? Math.round((p.actualHours / p.plannedHours) * 100) : (p.actualHours > 0 ? 100 : 0)
                const isOver = p.plannedHours > 0 && p.actualHours > p.plannedHours
                return (
                  <div key={p.project} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{p.project}</span>
                      <span className="tabular-nums text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-gray-100">{p.actualHours}h</strong> / {p.plannedHours}h
                        <span className={`ml-1.5 font-bold ${isOver ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-200/70 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly Mini Summary */}
          <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-neutral-900/50 border border-gray-200/60 dark:border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-2.5">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-500" />
                  Tiến độ 3 tháng trong Quý
                </span>
                <span className="text-[11px] font-normal text-gray-400">Act / Plan</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {months.map((m) => (
                  <div key={m.key} className="p-2 rounded-lg bg-white dark:bg-neutral-800/80 border border-gray-100 dark:border-neutral-700/60 text-center">
                    <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{m.label}</div>
                    <div className="text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
                      {m.actualHours}h
                    </div>
                    <div className="text-[10px] text-gray-400">/ {m.plannedHours}h</div>
                    <div className={`text-[10px] font-bold mt-1 ${m.actualHours > m.plannedHours ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {m.completionRate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Link bar */}
            {onNavigateTab && (
              <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Xem 88 task & phân tích chi tiết:
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('time')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  Mở Tab Quản lý Time <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
