// Tab 1 — Tổng quan (ui.md §4–8): KPI cards, progress bars, QC Weight,
// Bug statistics, charts.
import {
  ClipboardList, ClipboardCheck, ListChecks, PencilRuler, Scale, Bug,
} from 'lucide-react'
import { KpiCard, Panel, ProgressBar, Stat, Badge } from '../components/ui.jsx'
import { PieCard, BarCard, LineCard } from '../components/charts.jsx'
import { ENTITY, ramp, statusStyle } from '../lib/tokens.js'

export default function Overview({ kpi, mode }) {
  const e = ENTITY[mode]
  const { review, testCase, testDesign, ratios, averages, qcWeight, bug, status } = kpi
  const released = status.counts['Released'] || 0
  const done = status.counts['Done'] || 0

  const reviewPie = [
    { name: 'Review 1', value: review.r1 }, { name: 'Review 2', value: review.r2 }, { name: 'Review 3', value: review.r3 },
  ]
  const tcPie = [
    { name: 'TC 1', value: testCase.tc1 }, { name: 'TC 2', value: testCase.tc2 }, { name: 'TC 3', value: testCase.tc3 },
  ]
  const tdPie = [
    { name: 'TD 1', value: testDesign.td1 }, { name: 'TD 2', value: testDesign.td2 }, { name: 'TD 3', value: testDesign.td3 },
  ]

  return (
    <div className="space-y-6">
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
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">QC Weight theo Quarter</div>
            <BarCard data={qcWeight.byQuarter} dataKey="weight" xKey="quarter" color={e.qc} mode={mode} height={220} showLabels />
          </div>
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
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bug Distribution</div>
            <PieCard data={bug.distribution} colors={ramp(mode, 'bug', 4)} mode={mode} height={220} centerCaption="Task" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bug theo Quarter</div>
            <BarCard data={bug.byQuarter} dataKey="bug" xKey="quarter" color={e.bug} mode={mode} height={220} showLabels />
          </div>
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

      <Panel title="Task theo Quarter">
        <LineCard data={kpi.taskByQuarter} series={[{ key: 'task', name: 'Task', color: e.task }]} xKey="quarter" mode={mode} />
      </Panel>
    </div>
  )
}
