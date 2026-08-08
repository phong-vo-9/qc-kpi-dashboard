// Tab 1 — Tổng quan (ui.md §4–8): KPI cards, progress bars, QC Weight,
// Bug statistics, charts.
import { useState } from 'react'
import {
  ClipboardList, ClipboardCheck, ListChecks, PencilRuler, Scale, Bug,
  AlertTriangle, CalendarOff, ExternalLink
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

export default function Overview({ kpi, mode, tasks = [], onNavigateToTask }) {
  const e = ENTITY[mode]
  const { review, testCase, testDesign, ratios, averages, qcWeight, bug, status } = kpi
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

  return (
    <div className="space-y-6">
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

      {/* KPI cards (§4) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
