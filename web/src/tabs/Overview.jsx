// Tab 1 — Tổng quan (ui.md §4–8): KPI cards, progress bars, QC Weight,
// Bug statistics, charts.
import { useState, useMemo } from 'react'
import {
  ClipboardList, ClipboardCheck, ListChecks, PencilRuler, Scale, Bug,
  AlertTriangle, CalendarOff, ExternalLink, Gauge, Zap
} from 'lucide-react'
import { KpiCard, Panel, ProgressBar, Stat, Badge } from '../components/ui.jsx'
import { PieCard, BarCard, LineCard } from '../components/charts.jsx'
import { ENTITY, ramp, statusStyle } from '../lib/tokens.js'
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
  const totalMs = end - start
  const elapsedMs = Math.max(0, now - start)
  const remainMs = Math.max(0, end - now)
  const daysTotal = Math.round(totalMs / 86400000)
  const daysLeft = Math.ceil(remainMs / 86400000)
  const pct = totalMs > 0 ? Math.min(100, (elapsedMs / totalMs) * 100) : 100

  const isOverdue = now > end
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

function SprintAlerts({ sprintMeta, missingDue, overdueDue, totalTasks, doneTasks }) {
  const alerts = []
  if (sprintMeta?.endDate) {
    const now = new Date()
    const end = new Date(sprintMeta.endDate)
    const daysLeft = Math.ceil((end - now) / 86400000)
    if (daysLeft < 0) alerts.push({ type: 'error', msg: `Sprint đã kết thúc ${Math.abs(daysLeft)} ngày trước` })
    else if (daysLeft <= 1) alerts.push({ type: 'error', msg: `Sprint kết thúc hôm nay / ngày mai!` })
    else if (daysLeft <= 3) alerts.push({ type: 'warn', msg: `Sprint sắp kết thúc — còn ${daysLeft} ngày` })
  }
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
      <Panel title="Phân tích Sprint Active">
        <p className="text-sm text-gray-400">Đang tải thông tin sprint...</p>
      </Panel>
    )
  }
  return (
    <Panel title="Phân tích Sprint Active">
      <div className={`grid gap-4 ${sprintAnalysis.length === 1 ? 'md:grid-cols-1 max-w-lg' : 'md:grid-cols-2'}`}>
        {sprintAnalysis.map((d) => <SprintProjectCard key={d.project} data={d} />)}
      </div>
    </Panel>
  )
}

// ─── Main Overview ────────────────────────────────────────────────────────────

export default function Overview({ kpi, mode, tasks = [], onNavigateToTask, sprintAnalysis = [] }) {
  const e = ENTITY[mode]
  const { review, testCase, testDesign, ratios, averages, qcWeight, storyPoints, bug, status } = kpi
  const released = status.counts['Released'] || 0
  const done = status.counts['Done'] || 0
  const hasSprints = qcWeight.bySprint && qcWeight.bySprint.length > 0

  const reviewPie = [
    { name: 'Review 1', value: review.r1 }, { name: 'Review 2', value: review.r2 }, { name: 'Review 3', value: review.r3 },
  ]
  const tcPie = [
    { name: 'TC 1', value: testCase.tc1 }, { name: 'TC 2', value: testCase.tc2 }, { name: 'TC 3', value: testCase.tc3 },
  ]
  const tdPie = [
    { name: 'TD 1', value: testDesign.td1 }, { name: 'TD 2', value: testDesign.td2 }, { name: 'TD 3', value: testDesign.td3 },
  ]

  // Calculate missing and overdue due dates for tasks (excluding Bugs)
  const taskIssues = tasks.filter((x) => x.type === 'Task')
  const todayStr = new Date().toISOString().split('T')[0]
  const missingDue = taskIssues.filter((x) => !x.duedate)
  const overdueDue = taskIssues.filter((x) => x.duedate && x.duedate < todayStr && x.status !== 'Done' && x.status !== 'Released')

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
      {/* Sprint Analysis Panel */}
      <SprintAnalysisPanel sprintAnalysis={sprintAnalysis} />

      {/* Báo cáo trễ hạn */}
      <div className="grid md:grid-cols-2 gap-4">
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

      {/* KPI cards (§4) */}
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

      {/* Status distribution (§17) */}
      <Panel title="Phân bố trạng thái">
        <div className="flex flex-wrap gap-2">
          {status.list.length === 0 && <span className="text-sm text-gray-400">Chưa có dữ liệu</span>}
          {status.list.map((s) => (
            <Badge key={s.status} className={statusStyle(s.status)}>
              {s.status} <span className="font-bold tabular-nums">{s.count}</span>
            </Badge>
          ))}
        </div>
      </Panel>

      {/* Progress bars per level (§5) */}
      <div className="grid md:grid-cols-3 gap-4">
        <Panel title="Review">
          <ProgressBar label="Review 1" value={review.r1} note={`${ratios.r1} / task`} max={kpi.total} entity="review" />
          <ProgressBar label="Review 2" value={review.r2} note={`${ratios.r2} / task`} max={kpi.total} entity="review" />
          <ProgressBar label="Review 3" value={review.r3} note={`${ratios.r3} / task`} max={kpi.total} entity="review" />
        </Panel>
        <Panel title="Test Case">
          <ProgressBar label="TC 1" value={testCase.tc1} note={`${ratios.tc1} / task`} max={kpi.total} entity="tc" />
          <ProgressBar label="TC 2" value={testCase.tc2} note={`${ratios.tc2} / task`} max={kpi.total} entity="tc" />
          <ProgressBar label="TC 3" value={testCase.tc3} note={`${ratios.tc3} / task`} max={kpi.total} entity="tc" />
        </Panel>
        <Panel title="Test Design">
          <ProgressBar label="TD 1" value={testDesign.td1} note={`${ratios.td1} / task`} max={kpi.total} entity="td" />
          <ProgressBar label="TD 2" value={testDesign.td2} note={`${ratios.td2} / task`} max={kpi.total} entity="td" />
          <ProgressBar label="TD 3" value={testDesign.td3} note={`${ratios.td3} / task`} max={kpi.total} entity="td" />
        </Panel>
      </div>

      {/* QC Weight (§6) */}
      <Panel title="QC Weight">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Stat label="Total" value={qcWeight.total} />
          <Stat label="Average / Task" value={qcWeight.average} />
          <Stat label="Highest" value={qcWeight.highest} />
          <Stat label="Lowest" value={qcWeight.lowest} />
        </div>
        <div className={`grid gap-6 ${hasSprints ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QC Weight theo Quarter</div>
            <BarCard data={qcWeight.byQuarter} dataKey="weight" xKey="quarter" color={e.qc} mode={mode} height={220} showLabels />
          </div>
          {hasSprints && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QC Weight theo Sprint</div>
              <BarCard data={qcWeight.bySprint} dataKey="weight" xKey="sprint" color={e.qc} mode={mode} height={220} showLabels />
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top 5 Task theo QC Weight</div>
            <BarCard data={qcWeight.top5} dataKey="weight" xKey="key" color={e.qc} mode={mode} height={220} horizontal />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QC Weight theo Status</div>
          <BarCard data={qcWeight.byStatus} dataKey="weight" xKey="status" color={e.qc} mode={mode} height={220} showLabels />
        </div>
      </Panel>

      {/* Story Points */}
      <Panel title="Story Points">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Stat label="Total" value={storyPoints.total} />
          <Stat label="Average / Task" value={storyPoints.average} />
          <Stat label="Highest" value={storyPoints.highest} />
          <Stat label="Lowest" value={storyPoints.lowest} />
        </div>
        <div className={`grid gap-6 ${hasSprints ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Story Points theo Quarter</div>
            <BarCard data={storyPoints.byQuarter} dataKey="points" xKey="quarter" color={e.story} mode={mode} height={220} showLabels />
          </div>
          {hasSprints && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Story Points theo Sprint</div>
              <BarCard data={storyPoints.bySprint} dataKey="points" xKey="sprint" color={e.story} mode={mode} height={220} showLabels />
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top 5 Task theo Story Points</div>
            <BarCard data={storyPoints.top5} dataKey="points" xKey="key" color={e.story} mode={mode} height={220} horizontal />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Story Points theo Status</div>
          <BarCard data={storyPoints.byStatus} dataKey="points" xKey="status" color={e.story} mode={mode} height={220} showLabels />
        </div>
      </Panel>

      {/* Bug statistics (§7) */}
      <Panel title="Bug Statistics">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Total Bug" value={bug.total} />
          <Stat label="Bug / Task" value={bug.perTask} />
          <Stat label="Nhiều nhất" value={bug.highest} />
        </div>
        <div className={`grid gap-6 ${hasSprints ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bug Distribution</div>
            <PieCard data={bug.distribution} colors={ramp(mode, 'bug', 4)} mode={mode} height={220} centerCaption="Task" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bug theo Quarter</div>
            <BarCard data={bug.byQuarter} dataKey="bug" xKey="quarter" color={e.bug} mode={mode} height={220} showLabels />
          </div>
          {hasSprints && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bug theo Sprint</div>
              <BarCard data={bug.bySprint} dataKey="bug" xKey="sprint" color={e.bug} mode={mode} height={220} showLabels />
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top 5 Task nhiều Bug</div>
            <BarCard data={bug.top5} dataKey="bug" xKey="key" color={e.bug} mode={mode} height={220} horizontal />
          </div>
        </div>
      </Panel>

      {/* Charts (§8) — level breakdown pies + task-by-quarter trend */}
      <div className="grid md:grid-cols-3 gap-4">
        <Panel title="Review (cấp độ)"><PieCard data={reviewPie} colors={ramp(mode, 'review')} mode={mode} /></Panel>
        <Panel title="Test Case (cấp độ)"><PieCard data={tcPie} colors={ramp(mode, 'tc')} mode={mode} /></Panel>
        <Panel title="Test Design (cấp độ)"><PieCard data={tdPie} colors={ramp(mode, 'td')} mode={mode} /></Panel>
      </div>

      {hasSprints ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title="Task theo Quarter">
            <LineCard data={kpi.taskByQuarter} series={[{ key: 'task', name: 'Task', color: e.task }]} xKey="quarter" mode={mode} />
          </Panel>
          <Panel title="Task theo Sprint">
            <LineCard data={kpi.taskBySprint} series={[{ key: 'task', name: 'Task', color: e.task }]} xKey="sprint" mode={mode} />
          </Panel>
        </div>
      ) : (
        <Panel title="Task theo Quarter">
          <LineCard data={kpi.taskByQuarter} series={[{ key: 'task', name: 'Task', color: e.task }]} xKey="quarter" mode={mode} />
        </Panel>
      )}
    </div>
  )
}
