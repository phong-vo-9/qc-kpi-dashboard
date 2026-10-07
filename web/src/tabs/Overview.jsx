// Tab 1 — Tổng quan
import { useState, useMemo } from 'react'
import {
  ClipboardList, ClipboardCheck, ListChecks, PencilRuler, Scale, Bug,
  AlertTriangle, CalendarOff, ExternalLink, Gauge, Zap, Server, Bot, ChevronDown
} from 'lucide-react'
import { KpiCard, Panel, ProgressBar } from '../components/ui.jsx'
import { jiraUrl } from '../lib/api.js'

function LateReportCard({ title, icon: Icon, count, tasks, onNavigate, colorClass }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${colorClass}`}>
            <Icon size={18} />
          </span>
          <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{title}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{count}</div>
      </div>
      {count > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {expanded ? 'Ẩn danh sách' : 'Xem danh sách'}
          </button>
          {expanded && (
            <ul className="mt-2 max-h-40 overflow-y-auto space-y-1.5 divide-y divide-gray-100 dark:divide-neutral-800 text-xs">
              {tasks.map((t) => (
                <li key={t.key} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] sm:max-w-md" title={t.summary}>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.key}</span>: {t.summary}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onNavigate(t.key)}
                      className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    >
                      Xem
                    </button>
                    <a href={jiraUrl(t.key)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sprint Analysis Panel ───────────────────────────────────────────────────

const PROJECT_COLORS = {
  GOP: { bg: 'bg-violet-50/30 dark:bg-violet-500/[0.04]', border: 'border-violet-200/70 dark:border-violet-500/20', badge: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300', bar: '#8b5cf6', icon: '🚀' },
  AW:  { bg: 'bg-sky-50/30 dark:bg-sky-500/[0.04]',     border: 'border-sky-200/70 dark:border-sky-500/20',     badge: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',     bar: '#0ea5e9', icon: '✈️' },
}
const DEFAULT_COLOR = { bg: 'bg-gray-50/30 dark:bg-neutral-800/30', border: 'border-gray-200 dark:border-neutral-700', badge: 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300', bar: '#6b7280', icon: '📋' }

const ENVIRONMENT_ORDER = ['Dev', 'UAT', 'Canary', 'Staging', 'Production']
const ENVIRONMENT_STYLE = {
  Dev: { chip: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300', bar: 'bg-green-500' },
  UAT: { chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', bar: 'bg-sky-500' },
  Canary: { chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', bar: 'bg-amber-500' },
  Staging: { chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', bar: 'bg-violet-500' },
  Production: { chip: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', bar: 'bg-red-500' },
}

const STATUS_COLORS = {
  Todo: {
    bar: 'bg-gray-500 dark:bg-gray-400',
    text: 'text-gray-700 dark:text-gray-300',
    chip: 'bg-gray-100 dark:bg-gray-500/15',
  },
  'In Progress': {
    bar: 'bg-orange-500 dark:bg-orange-400',
    text: 'text-orange-700 dark:text-orange-300',
    chip: 'bg-orange-50 dark:bg-orange-500/10',
  },
  Done: {
    bar: 'bg-blue-600 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    chip: 'bg-blue-50 dark:bg-blue-500/10',
  },
  Released: {
    bar: 'bg-emerald-600 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    chip: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function SprintCountdown({ startDate, endDate }) {
  if (!startDate || !endDate) {
    return <div className="text-xs text-gray-400 italic">Không có dữ liệu ngày từ Jira Agile API</div>
  }
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Normalize to midnight local time to avoid timezone offsets in Jira's endDate
  // causing different sprint cards to show different day counts for the same calendar date
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endMidnight   = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate())

  const totalMs = endMidnight - startMidnight
  const elapsedMs = Math.max(0, todayMidnight - startMidnight)
  const remainMs = Math.max(0, endMidnight - todayMidnight)
  const daysTotal = Math.round(totalMs / 86400000)
  const daysLeft = Math.round(remainMs / 86400000)
  const pct = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 100

  const isOverdue = todayMidnight > endMidnight
  const isUrgent = !isOverdue && daysLeft <= 3
  const barColor = isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#22c55e'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{formatDate(startDate)}</span>
        <span className={`font-semibold tabular-nums ${
          isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-green-600 dark:text-green-400'
        }`}>
          {isOverdue ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`}
        </span>
        <span className="text-gray-500 dark:text-gray-400">{formatDate(endDate)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="text-[11px] text-gray-400 text-right">{daysTotal} ngày / sprint</div>
    </div>
  )
}

function SprintAlerts({ sprintMeta, missingEnd, overdueEnd, missingDue, overdueDue, totalTasks, doneTasks }) {
  const alerts = []
  if (sprintMeta?.endDate) {
    const now = new Date()
    const end = new Date(sprintMeta.endDate)
    const daysLeft = Math.ceil((end - now) / 86400000)
    if (daysLeft < 0) alerts.push({ type: 'error', msg: `Sprint đã kết thúc ${Math.abs(daysLeft)} ngày trước` })
    else if (daysLeft <= 1) alerts.push({ type: 'error', msg: `Sprint kết thúc hôm nay / ngày mai!` })
    else if (daysLeft <= 3) alerts.push({ type: 'warn', msg: `Sprint sắp kết thúc — còn ${daysLeft} ngày` })
  }
  if (overdueEnd > 0) alerts.push({ type: 'warn', msg: `${overdueEnd} task trễ end date` })
  if (missingEnd > 0) alerts.push({ type: 'info', msg: `${missingEnd} task thiếu end date` })
  if (overdueDue > 0) alerts.push({ type: 'warn', msg: `${overdueDue} task trễ due date` })
  if (missingDue > 0) alerts.push({ type: 'info', msg: `${missingDue} task thiếu due date` })
  const remaining = totalTasks - doneTasks
  if (sprintMeta?.endDate) {
    const daysLeft = Math.ceil((new Date(sprintMeta.endDate) - new Date()) / 86400000)
    if (daysLeft > 0 && remaining > 0 && remaining > daysLeft) {
      alerts.push({ type: 'warn', msg: `${remaining} task chưa xong, chỉ còn ${daysLeft} ngày` })
    }
  }
  if (alerts.length === 0) alerts.push({ type: 'ok', msg: 'Sprint đang diễn ra bình thường ✓' })

  const styles = {
    error: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200/70 dark:border-red-500/20',
    warn:  'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20',
    info:  'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20',
    ok:    'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200/70 dark:border-green-500/20',
  }
  return (
    <div className="space-y-1">
      {alerts.map((a, i) => (
        <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg ${styles[a.type]}`}>{a.msg}</div>
      ))}
    </div>
  )
}

function SprintProjectCard({ data }) {
  const col = PROJECT_COLORS[data.project] || DEFAULT_COLOR
  const pct = data.totalTasks > 0 ? ((data.doneTasks / data.totalTasks) * 100).toFixed(1) : 0
  const spPct = data.totalSP > 0 ? ((data.doneSP / data.totalSP) * 100).toFixed(1) : 0

  if (!data.sprintName) {
    return (
      <div className={`p-4 rounded-xl border ${col.bg} ${col.border}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{col.icon}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{data.project}</span>
        </div>
        <p className="text-sm text-gray-400">Không tìm thấy sprint active</p>
      </div>
    )
  }

  return (
    <div className={`p-5 rounded-xl border ${col.bg} ${col.border} space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{col.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">{data.project}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${col.badge}`}>
                {data.sprintMeta?.state === 'active' ? 'Active' : data.sprintMeta?.state || 'Active'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={data.sprintName}>
              {data.sprintName}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{pct}%</div>
          <div className="text-[11px] text-gray-400">hoàn thành</div>
        </div>
      </div>

      {/* Countdown bar */}
      <SprintCountdown startDate={data.sprintMeta?.startDate} endDate={data.sprintMeta?.endDate} />

      {/* Progress stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-neutral-900/60">
          <div className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-50">{data.doneTasks}/{data.totalTasks}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Tasks</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-neutral-900/60">
          <div className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-50">{data.doneSP}/{data.totalSP}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">SP</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/60 dark:bg-neutral-900/60">
          <div className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-50">{data.doneWeight}/{data.totalWeight}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">QC Wt</div>
        </div>
      </div>

      {/* SP progress bar */}
      {data.totalSP > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Story Points đạt</span>
            <span className="font-medium">{spPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-400 transition-all duration-700" style={{ width: `${spPct}%` }} />
          </div>
        </div>
      )}

      {/* Sprint goal */}
      {data.sprintMeta?.goal && (
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-neutral-700 pt-3">
          <span className="font-medium text-gray-700 dark:text-gray-300">🎯 Sprint Goal:</span>{' '}
          {data.sprintMeta.goal}
        </div>
      )}

      {/* Alerts */}
      <SprintAlerts
        sprintMeta={data.sprintMeta}
        missingEnd={data.missingEnd}
        overdueEnd={data.overdueEnd}
        missingDue={data.missingDue}
        overdueDue={data.overdueDue}
        totalTasks={data.totalTasks}
        doneTasks={data.doneTasks}
      />
    </div>
  )
}

function SprintAnalysisPanel({ sprintAnalysis }) {
  if (!sprintAnalysis || sprintAnalysis.length === 0) {
    return (
      <Panel title="Phân tích Sprint Active" className="h-full">
        <p className="text-sm text-gray-400">Đang tải thông tin sprint...</p>
      </Panel>
    )
  }
  return (
    <Panel title="Phân tích Sprint Active" className="h-full">
      <div className={`grid w-full gap-4 ${sprintAnalysis.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {sprintAnalysis.map((d) => <SprintProjectCard key={d.project} data={d} />)}
      </div>
    </Panel>
  )
}

// ─── Main Overview ────────────────────────────────────────────────────────────

function SprintEnvironmentPanel({ sprintAnalysis }) {
  if (!sprintAnalysis || sprintAnalysis.length === 0) {
    return (
      <Panel title="Môi trường Sprint Active" className="h-full">
        <p className="text-sm text-gray-400">Đang tải thống kê environment...</p>
      </Panel>
    )
  }

  const activeProjects = sprintAnalysis.filter((d) => d.sprintName)
  const totalsByEnv = ENVIRONMENT_ORDER.reduce((acc, env) => {
    acc[env] = 0
    return acc
  }, {})
  let totalTasks = 0
  let missingEnvironment = 0
  for (const d of activeProjects) {
    totalTasks += d.totalTasks || 0
    missingEnvironment += d.missingEnvironment || 0
    const counts = d.environmentCounts || {}
    for (const env of ENVIRONMENT_ORDER) {
      totalsByEnv[env] += counts[env] || 0
    }
  }

  return (
    <Panel
      title="Môi trường Sprint Active"
      className="h-full"
      right={<Server size={16} className="text-gray-400" />}
    >
      {activeProjects.length === 0 ? (
        <p className="text-sm text-gray-400">Không tìm thấy sprint active để thống kê environment.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {ENVIRONMENT_ORDER.map((env) => {
              const count = totalsByEnv[env] || 0
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
              const envStyle = ENVIRONMENT_STYLE[env]
              return (
                <div key={env} className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 p-2">
                  <div className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${envStyle.chip}`}>{env}</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{count}</div>
                  <div className="text-[11px] text-gray-400">{pct}%</div>
                </div>
              )
            })}
          </div>
          {missingEnvironment > 0 && (
            <div className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
              Chưa có Env: <span className="font-semibold tabular-nums">{missingEnvironment}</span> task
            </div>
          )}
          <div className={`grid w-full gap-4 ${activeProjects.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
            {activeProjects.map((d) => {
            const col = PROJECT_COLORS[d.project] || DEFAULT_COLOR
            const total = d.totalTasks || 0
            const counts = d.environmentCounts || {}
            return (
              <div key={d.project} className={`p-4 rounded-xl border ${col.bg} ${col.border}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{col.icon}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-50">{d.project}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${col.badge}`}>Active</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={d.sprintName}>
                      {d.sprintName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{total}</div>
                    <div className="text-[11px] text-gray-400">tasks</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {ENVIRONMENT_ORDER.map((env) => {
                    const count = counts[env] || 0
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const envStyle = ENVIRONMENT_STYLE[env]
                    return (
                      <div key={env}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${envStyle.chip}`}>{env}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {count} task{count !== 1 ? 's' : ''} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/70 dark:bg-neutral-800 overflow-hidden">
                          <div className={`h-full rounded-full ${envStyle.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {(d.missingEnvironment || 0) > 0 && (
                    <div className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                      Chưa có Env: <span className="font-semibold tabular-nums">{d.missingEnvironment}</span> task
                    </div>
                  )}
                </div>
              </div>
            )
            })}
          </div>
        </div>
      )}
    </Panel>
  )
}

function AutomationFilteredPanel({ tasks = [], onNavigateToTask }) {
  const [expanded, setExpanded] = useState(false)

  const isRegressionTask = (t) => {
    if (!t) return false
    const labels = t.labels || []
    if (labels.some((l) => String(l).toLowerCase().replace(/[\s_-]/g, '') === 'regressiontest')) return true
    const summary = String(t.summary || '').toLowerCase()
    if (summary.includes('regression test') || summary.includes('regressiontest')) return true
    return false
  }

  // Loại bỏ các task RegressionTest theo yêu cầu
  const nonRegressionTasks = useMemo(() => {
    return tasks.filter((t) => !isRegressionTask(t))
  }, [tasks])

  const automationTasks = useMemo(() => {
    return nonRegressionTasks.filter((t) =>
      (t.labels || []).some((l) => String(l).trim().toLowerCase() === 'automationtest')
    )
  }, [nonRegressionTasks])

  const total = nonRegressionTasks.length
  const autoCount = automationTasks.length
  const ratio = total > 0 ? Number(((autoCount / total) * 100).toFixed(1)) : 0

  const completed = automationTasks.filter((t) =>
    ['done', 'released'].includes((t.status || '').toLowerCase().trim())
  ).length
  const totalSP = automationTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const totalWeight = automationTasks.reduce((sum, t) => sum + (t.qcWeight || 0), 0)

  const statusCounts = useMemo(() => {
    const counts = {}
    for (const t of automationTasks) {
      const s = t.status || 'Khác'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [automationTasks])

  return (
    <Panel
      title="Thống kê Automation Task (Theo bộ lọc hiện tại)"
      right={(
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
          <Bot size={13} /> Label: AutomationTest (Không tính Regression)
        </span>
      )}
    >
      <div className="rounded-xl bg-gradient-to-r from-cyan-50/70 via-sky-50/50 to-indigo-50/60 p-4 dark:from-cyan-500/[0.08] dark:via-sky-500/[0.06] dark:to-indigo-500/[0.08] border border-cyan-100/70 dark:border-cyan-500/15">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#06b6d4 ${ratio}%, rgba(148,163,184,.18) 0)` }}>
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{ratio}%</span>
              <span className="text-[10px] text-gray-400">tỷ lệ</span>
            </div>
          </div>

          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
              <Bot size={17} className="text-cyan-500" />
              <span>Tiến độ Automation</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({autoCount}/{total} tasks trong bộ lọc · Đã loại trừ RegressionTest)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Task Automation</div>
                <div className="text-lg font-bold tabular-nums text-cyan-600 dark:text-cyan-400">{autoCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Đã hoàn thành</div>
                <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {completed} <span className="text-xs font-normal text-gray-400">({autoCount > 0 ? ((completed / autoCount) * 100).toFixed(0) : 0}%)</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Tổng Story Points</div>
                <div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{totalSP} SP</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Tổng QC Weight</div>
                <div className="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">{totalWeight}</div>
              </div>
            </div>

            {autoCount > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Trạng thái:</span>
                {Object.entries(statusCounts).map(([st, cnt]) => (
                  <span key={st} className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/80 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-neutral-700">
                    {st}: <strong>{cnt}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {autoCount > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200/80 px-3 py-2 text-left text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800/70"
          >
            <span>{expanded ? 'Ẩn danh sách task Automation' : `Xem danh sách ${autoCount} task Automation`}</span>
            <ChevronDown size={15} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1.5 divide-y divide-gray-100 dark:divide-neutral-800 text-xs">
              {automationTasks.map((t) => (
                <div key={t.key} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">{t.key}</span>
                    <span className="text-gray-600 dark:text-gray-400 truncate" title={t.summary}>{t.summary}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 shrink-0">{t.status}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.storyPoints > 0 && <span className="text-[11px] text-gray-400">{t.storyPoints} SP</span>}
                    <button
                      onClick={() => onNavigateToTask(t.key)}
                      className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    >
                      Xem
                    </button>
                    <a href={jiraUrl(t.key)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}


export default function Overview({ kpi, tasks = [], onNavigateToTask, sprintAnalysis = [] }) {
  const { averages, qcWeight, storyPoints, bug, status } = kpi
  const released = status.counts['Released'] || 0
  const done = status.counts['Done'] || 0
  const statusTotal = status.list.reduce((sum, item) => sum + item.count, 0)

  // Calculate date warnings for tasks (excluding Bugs). Due date warnings are
  // only meaningful once an End date has been set.
  const taskIssues = tasks.filter((x) => x.type === 'Task')
  const todayStr = new Date().toISOString().split('T')[0]
  const isDone = (x) => x.status === 'Done' || x.status === 'Released'
  const missingEnd = taskIssues.filter((x) => !x.enddate)
  const overdueEnd = taskIssues.filter((x) => x.enddate && x.enddate < todayStr && !isDone(x))
  const missingDue = taskIssues.filter((x) => x.enddate && !x.duedate)
  const overdueDue = taskIssues.filter((x) => x.enddate && x.duedate && x.duedate < todayStr && !isDone(x))

  const specialStats = useMemo(() => {
    const targetTasks = tasks.filter((t) => t.type !== 'Bug')
    const totalCount = targetTasks.length

    // Overall Progress (excluding bugs)
    const completedTasks = targetTasks.filter((t) => ['done', 'released'].includes((t.status || '').toLowerCase().trim()))
    const overallSP = targetTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const overallDoneSP = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const overallWeight = targetTasks.reduce((sum, t) => sum + (t.qcWeight || 0), 0)
    const overallDoneWeight = completedTasks.reduce((sum, t) => sum + (t.qcWeight || 0), 0)

    // Sprint Goal
    const goalTasks = targetTasks.filter((t) =>
      (t.labels || []).some((l) => ['sprintgoal', 'sprint-goal'].includes(l.toLowerCase().trim()))
    )
    const goalDone = goalTasks.filter((t) => ['done', 'released'].includes((t.status || '').toLowerCase().trim())).length
    const goalSP = goalTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const goalWeight = goalTasks.reduce((sum, t) => sum + (t.qcWeight || 0), 0)

    // Đột xuất
    const dxTasks = targetTasks.filter((t) =>
      (t.labels || []).some((l) => ['độtxuất', 'đột xuất', 'dotxuat', 'dot xuat'].includes(l.toLowerCase().trim()))
    )
    const dxDone = dxTasks.filter((t) => ['done', 'released'].includes((t.status || '').toLowerCase().trim())).length
    const dxSP = dxTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const dxWeight = dxTasks.reduce((sum, t) => sum + (t.qcWeight || 0), 0)

    return {
      totalCount,
      completedCount: completedTasks.length,
      overallSP,
      overallDoneSP,
      overallWeight,
      overallDoneWeight,
      goalCount: goalTasks.length,
      goalDone,
      goalSP,
      goalWeight,
      dxCount: dxTasks.length,
      dxDone,
      dxSP,
      dxWeight,
      dxRatio: totalCount > 0 ? ((dxTasks.length / totalCount) * 100).toFixed(1) : 0
    }
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* KPI cards — primary overview, directly below the global filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard icon={ClipboardList} entity="task" label="Total Task" value={kpi.total}
          subtitle={`Released ${released} · Done ${done}`} />
        <KpiCard icon={ClipboardCheck} entity="review" label="Review" value={kpi.totalReview}
          subtitle={`TB ${averages.review} / task`} tooltip="Tổng lượt Review = Review1 + Review2 + Review3" />
        <KpiCard icon={ListChecks} entity="tc" label="Test Case" value={kpi.totalTestCase}
          subtitle={`TB ${averages.testCase} / task`} />
        <KpiCard icon={PencilRuler} entity="td" label="Test Design" value={kpi.totalTestDesign}
          subtitle={`TB ${averages.testDesign} / task`} />
        <KpiCard icon={Scale} entity="qc" label="QC Weight" value={qcWeight.total}
          subtitle={`TB ${qcWeight.average} / task`} tooltip="Average QC Weight = Total QC Weight / Total Task" />
        <KpiCard icon={Gauge} entity="story" label="Story Points" value={storyPoints.total}
          subtitle={`TB ${storyPoints.average} / task`} tooltip="Average Story Points = Total Story Points / Total Task" />
        <KpiCard icon={Bug} entity="bug" label="Bug" value={bug.total}
          subtitle={`${bug.perTask} bug / task`} tooltip="Bug / Task = Total Bug / Total Task" />
      </div>

      {/* Compact status strip */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Trạng thái task
          </div>
          {statusTotal > 0 && <span className="text-xs text-gray-400">{statusTotal} task</span>}
        </div>
        {statusTotal > 0 ? (
          <>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800" aria-label="Tỷ lệ trạng thái task">
              {status.list.map((s) => {
                const pct = (s.count / statusTotal) * 100
                return <div key={s.status} title={`${s.status}: ${s.count} (${pct.toFixed(1)}%)`} className={`${STATUS_COLORS[s.status]?.bar || 'bg-gray-400'} transition-all duration-500`} style={{ width: `${pct}%` }} />
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {status.list.map((s) => {
                const pct = (s.count / statusTotal) * 100
                return (
                  <div key={s.status} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${STATUS_COLORS[s.status]?.chip || 'bg-gray-50 dark:bg-neutral-800'}`}>
                    <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s.status]?.bar || 'bg-gray-400'}`} />
                    <span className={STATUS_COLORS[s.status]?.text || 'text-gray-600 dark:text-gray-300'}>{s.status}</span>
                    <span className={`font-semibold tabular-nums ${STATUS_COLORS[s.status]?.text || 'text-gray-700 dark:text-gray-200'}`}>{s.count}</span>
                    <span className="text-gray-500 dark:text-gray-400">({pct.toFixed(1)}%)</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-gray-400">Chưa có dữ liệu trạng thái.</div>
        )}
      </div>

      {/* Sprint panels */}
      <div className="grid gap-4 xl:grid-cols-2 items-stretch">
        <div className="min-w-0 h-full">
          <SprintAnalysisPanel sprintAnalysis={sprintAnalysis} />
        </div>
        <div className="min-w-0 h-full">
          <SprintEnvironmentPanel sprintAnalysis={sprintAnalysis} />
        </div>
      </div>

      {/* Báo cáo ngày hạn */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <LateReportCard
          title="Thiếu End date"
          icon={CalendarOff}
          count={missingEnd.length}
          tasks={missingEnd}
          onNavigate={onNavigateToTask}
          colorClass="bg-slate-50 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
        />
        <LateReportCard
          title="Trễ End date"
          icon={AlertTriangle}
          count={overdueEnd.length}
          tasks={overdueEnd}
          onNavigate={onNavigateToTask}
          colorClass="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        />
        <LateReportCard
          title="Thiếu Due date"
          icon={CalendarOff}
          count={missingDue.length}
          tasks={missingDue}
          onNavigate={onNavigateToTask}
          colorClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <LateReportCard
          title="Trễ Due date"
          icon={AlertTriangle}
          count={overdueDue.length}
          tasks={overdueDue}
          onNavigate={onNavigateToTask}
          colorClass="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        />
      </div>

      {/* Thống kê nhiệm vụ */}
      <Panel title="Tiến độ hoàn thành & Nhiệm vụ đặc biệt">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Tiến độ hoàn thành chung */}
          <div className="p-4 rounded-xl bg-blue-50/20 dark:bg-blue-500/[0.02] border border-blue-100/70 dark:border-blue-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">📊</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">Tiến độ chung (Task)</span>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                {specialStats.completedCount}/{specialStats.totalCount} tasks
              </div>
            </div>
            
            <div className="space-y-3">
              <ProgressBar 
                label="Hoàn thành (Done + Released)" 
                value={specialStats.completedCount} 
                note={`${((specialStats.completedCount / (specialStats.totalCount || 1)) * 100).toFixed(1)}%`} 
                max={specialStats.totalCount || 1} 
                entity="task" 
              />
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Story Points Đạt</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                    {specialStats.overallDoneSP} / {specialStats.overallSP} SP
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">QC Weight Đạt</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                    {specialStats.overallDoneWeight} / {specialStats.overallWeight}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sprint Goal Card */}
          <div className="p-4 rounded-xl bg-amber-50/20 dark:bg-amber-500/[0.02] border border-amber-100/70 dark:border-amber-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">🏆</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">Sprint Goal</span>
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                {specialStats.goalCount} tasks
              </div>
            </div>
            
            <div className="space-y-3">
              <ProgressBar 
                label="Tiến độ hoàn thành" 
                value={specialStats.goalDone} 
                note={`${specialStats.goalDone}/${specialStats.goalCount} tasks`} 
                max={specialStats.goalCount || 1} 
                entity="review" 
              />
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Tổng Story Points</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{specialStats.goalSP} SP</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Tổng QC Weight</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{specialStats.goalWeight}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Đột xuất Card */}
          <div className="p-4 rounded-xl bg-orange-50/15 dark:bg-orange-500/[0.01] border border-orange-100/60 dark:border-orange-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-orange-500 fill-orange-500/10" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">Đột xuất (Phát sinh)</span>
              </div>
              <div className="text-xs text-orange-850 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                {specialStats.dxCount} tasks ({specialStats.dxRatio}%)
              </div>
            </div>
            
            <div className="space-y-3">
              <ProgressBar 
                label="Tiến độ hoàn thành" 
                value={specialStats.dxDone} 
                note={`${specialStats.dxDone}/${specialStats.dxCount} tasks`} 
                max={specialStats.dxCount || 1} 
                entity="bug" 
              />
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Tổng Story Points</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{specialStats.dxSP} SP</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">Tổng QC Weight</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">{specialStats.dxWeight}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Thống kê Automation Task theo điều kiện lọc hiện tại */}
      <AutomationFilteredPanel tasks={tasks} onNavigateToTask={onNavigateToTask} />
    </div>
  )
}
