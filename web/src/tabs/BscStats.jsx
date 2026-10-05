import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Award, ClipboardList, ClipboardCheck, ListChecks, PencilRuler, Scale, Bug,
  Bot, CheckCircle2, CircleAlert, ChevronDown, ExternalLink, Gauge, Calendar,
  Info, Search, RotateCcw, CircleDot, Layers, BarChart2
} from 'lucide-react'
import { KpiCard, Panel, ProgressBar, Stat, Badge } from '../components/ui.jsx'
import { PieCard, BarCard, LineCard } from '../components/charts.jsx'
import { ENTITY, ramp } from '../lib/tokens.js'
import { api, jiraUrl } from '../lib/api.js'

export default function BscStats({ mode = 'dark', onNavigateToTask }) {
  const e = ENTITY[mode]
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [bugTab, setBugTab] = useState('logged') // 'logged' | 'fixed'
  const [bugSearch, setBugSearch] = useState('')
  // Requirement 4: Cho phép lựa chọn thống kê theo Task (Task, Support), theo Bug (Type là Bug), hoặc Tổng hợp
  const [weightScope, setWeightScope] = useState('task') // 'task' | 'bug' | 'all'

  // Load BSC data for a given quarter
  const loadData = useCallback(async (quarterStr) => {
    setLoading(true)
    try {
      let qUrl = '/api/bsc'
      if (quarterStr) {
        const parts = quarterStr.split('-')
        if (parts.length === 2) {
          qUrl += `?quarter=${encodeURIComponent(parts[0])}&year=${encodeURIComponent(parts[1])}`
        }
      }
      const res = await api(qUrl)
      setData(res)
      if (!quarterStr && res?.quarterLabel) {
        setSelectedQuarter(res.quarterLabel)
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu BSC:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(selectedQuarter)
  }, [selectedQuarter, loadData])

  const handleQuarterChange = (qLabel) => {
    setSelectedQuarter(qLabel)
  }

  // Pre-calculations when data is ready
  const {
    quarter = 'Q3',
    year = 2026,
    quarterLabel = 'Q3-2026',
    availableQuarters = [],
    bscTasks = [],
    bugIssues = [],
    aggregatesTasks = {},
    aggregatesBugs = {},
    aggregatesAll = {},
    totals = {},
    myLoggedBugs = [],
    myFixedBugs = [],
    automationAnalysis = {},
    regressionAnalysis = {},
  } = data || {}

  const {
    review = { r1: 0, r2: 0, r3: 0 },
    testCase = { tc1: 0, tc2: 0, tc3: 0 },
    testDesign = { td1: 0, td2: 0, td3: 0 },
    ratios = { r1: 0, r2: 0, r3: 0, tc1: 0, tc2: 0, tc3: 0, td1: 0, td2: 0, td3: 0 },
    averages = { review: 0, testCase: 0, testDesign: 0 },
    bug = { total: 0, perTask: 0, highest: 0, distribution: [], bySprint: [], top5: [] },
  } = aggregatesTasks || {}

  const totalBscTasks = totals.taskCount || bscTasks.length
  const totalBugIssues = totals.bugCount || bugIssues.length
  const subtaskBugCount = totals.subtaskBugCount || bug.total || 0

  const taskCountByType = useMemo(() => {
    const counts = { Task: 0, Support: 0 }
    for (const t of bscTasks) {
      if (counts[t.type] !== undefined) counts[t.type] += 1
      else counts[t.type] = 1
    }
    return counts
  }, [bscTasks])

  // Active aggregates for QC Weight and Story Points based on selected scope (Requirement 4)
  const activeWeightAgg = useMemo(() => {
    if (weightScope === 'bug') return aggregatesBugs
    if (weightScope === 'all') return aggregatesAll
    return aggregatesTasks
  }, [weightScope, aggregatesTasks, aggregatesBugs, aggregatesAll])

  const activeQcWeight = activeWeightAgg?.qcWeight || { total: 0, average: 0, highest: 0, lowest: 0, bySprint: [], top5: [] }
  const activeStoryPoints = activeWeightAgg?.storyPoints || { total: 0, average: 0, highest: 0, lowest: 0, bySprint: [], top5: [] }

  // Bug lists with search filtering
  const filteredBugs = useMemo(() => {
    const list = bugTab === 'logged' ? myLoggedBugs : myFixedBugs
    if (!bugSearch.trim()) return list
    const q = bugSearch.trim().toLowerCase()
    return list.filter(
      (b) =>
        (b.key && b.key.toLowerCase().includes(q)) ||
        (b.summary && b.summary.toLowerCase().includes(q))
    )
  }, [bugTab, myLoggedBugs, myFixedBugs, bugSearch])

  // Logged bug status breakdown
  const loggedBugStatusBreakdown = useMemo(() => {
    const counts = {}
    for (const b of myLoggedBugs) {
      const s = b.status || 'Khác'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [myLoggedBugs])

  // Review / TC / TD Pies
  const reviewPie = [
    { name: 'Review 1', value: review.r1 },
    { name: 'Review 2', value: review.r2 },
    { name: 'Review 3', value: review.r3 },
  ]
  const tcPie = [
    { name: 'TC 1', value: testCase.tc1 },
    { name: 'TC 2', value: testCase.tc2 },
    { name: 'TC 3', value: testCase.tc3 },
  ]
  const tdPie = [
    { name: 'TD 1', value: testDesign.td1 },
    { name: 'TD 2', value: testDesign.td2 },
    { name: 'TD 3', value: testDesign.td3 },
  ]

  const [autoExpanded, setAutoExpanded] = useState(false)
  const [regExpanded, setRegExpanded] = useState(false)

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-gray-100 dark:bg-neutral-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-neutral-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── BỘ LỌC THỜI GIAN BSC (CHỈ THEO QUÝ) ─── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Award size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Thống kê BSC (Balanced Scorecard)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Báo cáo đánh giá hiệu suất QC theo Quý
              </p>
            </div>
          </div>

          {/* Quarter selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Chọn Quý đánh giá:
              </span>
            </div>
            <select
              value={selectedQuarter}
              onChange={(e) => handleQuarterChange(e.target.value)}
              className="border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-sm"
            >
              {availableQuarters.map((q) => (
                <option key={q.label} value={q.label}>
                  {q.label} (Quý {q.quarter.slice(1)} năm {q.year})
                </option>
              ))}
            </select>
            <button
              onClick={() => loadData(selectedQuarter)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="Tải lại số liệu BSC"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* BSC Rules Banner */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-850 dark:text-amber-200 text-xs leading-relaxed">
          <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Quy tắc tính chỉ số BSC:</span> Toàn bộ số liệu chỉ tính các task có trạng thái <strong className="underline">Released</strong> trong Quý <span className="font-bold text-amber-700 dark:text-amber-300">{quarterLabel}</span>. Chỉ tính loại <strong>Task</strong> và <strong>Support</strong> (loại trừ các task có nhãn <code>RegressionTest</code>).
            <br />
            <span className="text-amber-700 dark:text-amber-350">
              *(Riêng chỉ số "Bug tôi đã log" thống kê tất cả các bug do bạn tạo trong Quý không phân biệt trạng thái. Mục Automation không tính Regression Test).*
            </span>
          </div>
        </div>
      </div>

      {/* ─── PHẦN 1: KPI CARDS PANEL (8 THẺ TRÌNH BÀY HỢP LÝ THEO YÊU CẦU 1 & 2) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* 1. Total Task */}
        <KpiCard
          icon={ClipboardList}
          entity="task"
          label="Total Task (BSC)"
          value={totalBscTasks}
          subtitle={`Task ${taskCountByType.Task || 0} · Support ${taskCountByType.Support || 0}`}
          tooltip="Chỉ tính Task & Support có status Released trong quý, không tính Regression Test"
        />

        {/* 2. Total Bug (Type là Bug) */}
        <KpiCard
          icon={Bug}
          entity="bug"
          label="Total Bug (Type Bug)"
          value={totalBugIssues}
          subtitle={`QC Wt: ${totals.bugQcWeight || 0} · SP: ${totals.bugStoryPoints || 0}`}
          tooltip={`Tổng số issue Type là Bug đã Released (${totalBugIssues} bug). QC Weight của bug: ${totals.bugQcWeight || 0}, Story Points của bug: ${totals.bugStoryPoints || 0}`}
        />

        {/* 3. Bug Subtask (Yêu cầu 2: các bug subtask của task và support) */}
        <KpiCard
          icon={CircleDot}
          entity="bug"
          label="Bug Subtask"
          value={subtaskBugCount}
          subtitle={`TB ${totalBscTasks > 0 ? (subtaskBugCount / totalBscTasks).toFixed(2) : 0} / task`}
          tooltip={`Tổng cộng ${subtaskBugCount} bug subtask phát sinh gắn trên ${totalBscTasks} Task & Support trong quý`}
        />

        {/* 4. Review */}
        <KpiCard
          icon={ClipboardCheck}
          entity="review"
          label="Review"
          value={aggregatesTasks.totalReview || 0}
          subtitle={`TB ${averages.review} / task`}
          tooltip="Tổng lượt Review = Review1 + Review2 + Review3 của các task BSC Released"
        />

        {/* 5. Test Case */}
        <KpiCard
          icon={ListChecks}
          entity="tc"
          label="Test Case"
          value={aggregatesTasks.totalTestCase || 0}
          subtitle={`TB ${averages.testCase} / task`}
          tooltip="Tổng lượt Test Case = TC1 + TC2 + TC3 của các task BSC Released"
        />

        {/* 6. Test Design */}
        <KpiCard
          icon={PencilRuler}
          entity="td"
          label="Test Design"
          value={aggregatesTasks.totalTestDesign || 0}
          subtitle={`TB ${averages.testDesign} / task`}
          tooltip="Tổng lượt Test Design = TD1 + TD2 + TD3 của các task BSC Released"
        />

        {/* 7. Tổng QC Weight */}
        <KpiCard
          icon={Scale}
          entity="qc"
          label="Tổng QC Weight"
          value={totals.totalQcWeight || 0}
          subtitle={`Task: ${totals.taskQcWeight || 0} · Bug: ${totals.bugQcWeight || 0}`}
          tooltip={`Tổng QC Weight = Task (${totals.taskQcWeight || 0}) + Bug (${totals.bugQcWeight || 0}) = ${totals.totalQcWeight || 0}`}
        />

        {/* 8. Tổng Story Points */}
        <KpiCard
          icon={Gauge}
          entity="story"
          label="Tổng Story Points"
          value={totals.totalStoryPoints || 0}
          subtitle={`Task: ${totals.taskStoryPoints || 0} · Bug: ${totals.bugStoryPoints || 0}`}
          tooltip={`Tổng Story Points = Task (${totals.taskStoryPoints || 0}) + Bug (${totals.bugStoryPoints || 0}) = ${totals.totalStoryPoints || 0}`}
        />
      </div>

      {/* ─── PHẦN 2: THỐNG KÊ CHI TIẾT REVIEW, TEST CASE, TEST DESIGN ─── */}
      <div className="grid md:grid-cols-3 gap-4">
        <Panel title="Review (Cấp độ 1–3)">
          <div className="space-y-3">
            <ProgressBar label="Review 1" value={review.r1} note={`${ratios.r1} / task`} max={totalBscTasks || 1} entity="review" />
            <ProgressBar label="Review 2" value={review.r2} note={`${ratios.r2} / task`} max={totalBscTasks || 1} entity="review" />
            <ProgressBar label="Review 3" value={review.r3} note={`${ratios.r3} / task`} max={totalBscTasks || 1} entity="review" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <PieCard data={reviewPie} colors={ramp(mode, 'review')} mode={mode} height={180} />
          </div>
        </Panel>

        <Panel title="Test Case (Cấp độ 1–3)">
          <div className="space-y-3">
            <ProgressBar label="TC 1" value={testCase.tc1} note={`${ratios.tc1} / task`} max={totalBscTasks || 1} entity="tc" />
            <ProgressBar label="TC 2" value={testCase.tc2} note={`${ratios.tc2} / task`} max={totalBscTasks || 1} entity="tc" />
            <ProgressBar label="TC 3" value={testCase.tc3} note={`${ratios.tc3} / task`} max={totalBscTasks || 1} entity="tc" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <PieCard data={tcPie} colors={ramp(mode, 'tc')} mode={mode} height={180} />
          </div>
        </Panel>

        <Panel title="Test Design (Cấp độ 1–3)">
          <div className="space-y-3">
            <ProgressBar label="TD 1" value={testDesign.td1} note={`${ratios.td1} / task`} max={totalBscTasks || 1} entity="td" />
            <ProgressBar label="TD 2" value={testDesign.td2} note={`${ratios.td2} / task`} max={totalBscTasks || 1} entity="td" />
            <ProgressBar label="TD 3" value={testDesign.td3} note={`${ratios.td3} / task`} max={totalBscTasks || 1} entity="td" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <PieCard data={tdPie} colors={ramp(mode, 'td')} mode={mode} height={180} />
          </div>
        </Panel>
      </div>

      {/* ─── PHẦN 3: THỐNG KÊ BUG BSC (BUG TÔI ĐÃ LOG & BUG ĐÃ FIX) ─── */}
      <Panel
        title={`Thống kê Bug BSC (${quarterLabel})`}
        right={(
          <span className="text-xs text-gray-500 dark:text-gray-400">
            QC: <strong className="text-gray-700 dark:text-gray-200">{data?.qcName}</strong>
          </span>
        )}
      >
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-500/[0.04] border border-rose-100/70 dark:border-rose-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Bug tôi đã log trong Quý</span>
              <span className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{myLoggedBugs.length}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
              Tổng số bug bạn phát hiện & tạo trong quý (mọi trạng thái)
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(loggedBugStatusBreakdown).map(([st, count]) => (
                <span key={st} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-neutral-700">
                  {st}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-500/[0.04] border border-emerald-100/70 dark:border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Bug đã fix (QC & Released)</span>
              <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{myFixedBugs.length}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
              Bug có Assigned QC là bạn và đã nghiệm thu Released thành công
            </p>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              ✓ Đã hoàn tất quy trình Release
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-500/[0.04] border border-indigo-100/70 dark:border-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Tỷ lệ Bug / Task (BSC)</span>
              <span className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {totalBscTasks > 0 ? (myFixedBugs.length / totalBscTasks).toFixed(2) : 0}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Số bug đã fix trên mỗi Task Released trong quý
            </p>
          </div>
        </div>

        {/* Bug list inspection */}
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 p-3 bg-gray-50/50 dark:bg-neutral-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800">
              <button
                onClick={() => setBugTab('logged')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  bugTab === 'logged'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Bug tôi đã log ({myLoggedBugs.length})
              </button>
              <button
                onClick={() => setBugTab('fixed')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  bugTab === 'fixed'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Bug đã fix ({myFixedBugs.length})
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={bugSearch}
                onChange={(e) => setBugSearch(e.target.value)}
                placeholder="Tìm mã hoặc tên bug..."
                className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-gray-100 dark:divide-neutral-800 text-xs">
            {filteredBugs.length === 0 ? (
              <div className="py-6 text-center text-gray-400 italic">Không tìm thấy bug phù hợp.</div>
            ) : (
              filteredBugs.map((b) => (
                <div key={b.key} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0">{b.key}</span>
                    <span className="text-gray-700 dark:text-gray-300 truncate" title={b.summary}>{b.summary}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 shrink-0">{b.status}</span>
                    {b.priority && (
                      <span className="text-[10px] text-gray-400 shrink-0">{b.priority}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onNavigateToTask && (
                      <button
                        onClick={() => onNavigateToTask(b.key)}
                        className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                      >
                        Xem
                      </button>
                    )}
                    <a href={jiraUrl(b.key)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Panel>

      {/* ─── PHẦN 4: PHÂN TÍCH AUTOMATION THEO TỪNG SPRINT (YÊU CẦU 3: KHÔNG TÍNH REGRESSION TEST) ─── */}
      <Panel
        title={`Phân tích Automation Task theo Sprint (${quarterLabel} - Released)`}
        className="overflow-hidden border-cyan-200/70 dark:border-cyan-500/20"
        right={(
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Bot size={13} /> Label: AutomationTest (Không tính Regression)
          </span>
        )}
      >
        <div className="mb-4 rounded-xl bg-gradient-to-r from-cyan-50 via-sky-50 to-indigo-50 p-4 dark:from-cyan-500/[0.08] dark:via-sky-500/[0.06] dark:to-indigo-500/[0.08]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#06b6d4 ${automationAnalysis.ratio || 0}%, rgba(148,163,184,.18) 0)` }}>
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-sm">
                <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{automationAnalysis.ratio || 0}%</span>
                <span className="text-[10px] text-gray-400">bao phủ</span>
              </div>
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                <Bot size={17} className="text-cyan-500" /> Automation coverage (Released, không tính Regression)
              </div>
              <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Tỷ lệ task có label <span className="font-semibold text-cyan-700 dark:text-cyan-300">AutomationTest</span> trên tổng Task/Support đã <strong>Released</strong> của các sprint GMS (đã loại trừ RegressionTest).
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div><div className="text-[10px] uppercase tracking-wider text-gray-400">Tổng task Released</div><div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{automationAnalysis.total || 0}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-gray-400">Automation Released</div><div className="text-lg font-bold tabular-nums text-cyan-600 dark:text-cyan-300">{automationAnalysis.automation || 0}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-gray-400">Tỷ lệ</div><div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-300">{automationAnalysis.ratio || 0}%</div></div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAutoExpanded(!autoExpanded)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200/80 px-3 py-2 text-left text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800/70"
        >
          <span>{autoExpanded ? 'Ẩn chi tiết sprint' : `Xem chi tiết ${(automationAnalysis.sprints || []).length} sprint GMS`}</span>
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${autoExpanded ? 'rotate-180' : ''}`} />
        </button>

        {autoExpanded && (
          <div className="mt-3">
            {(automationAnalysis.sprints || []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-neutral-700">Chưa có dữ liệu sprint GMS.</div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {(automationAnalysis.sprints || []).map((row) => {
                  const pct = Number(row.ratio || 0)
                  return (
                    <div key={`${row.project}-${row.sprint}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          {row.project && <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">{row.project}</span>}
                          <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-200" title={row.sprint}>{row.sprint}</span>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-gray-600 dark:text-gray-300">{row.automation}/{row.total} · {pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ─── PHẦN 5: PHÂN TÍCH REGRESSION TEST THEO TỪNG SPRINT (CHỈ TÍNH RELEASED) ─── */}
      <Panel
        title={`Phân tích RegressionTest theo Sprint (${quarterLabel} - Released)`}
        className="overflow-hidden border-violet-200/70 dark:border-violet-500/20"
        right={(
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            <CheckCircle2 size={13} /> Label: RegressionTest
          </span>
        )}
      >
        <div className="mb-4 rounded-xl bg-gradient-to-r from-violet-50 via-fuchsia-50 to-indigo-50 p-4 dark:from-violet-500/[0.08] dark:via-fuchsia-500/[0.06] dark:to-indigo-500/[0.08]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#8b5cf6 ${regressionAnalysis.ratio || 0}%, rgba(148,163,184,.18) 0)` }}>
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-sm">
                <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{regressionAnalysis.ratio || 0}%</span>
                <span className="text-[10px] text-gray-400">sprint đạt</span>
              </div>
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                <CheckCircle2 size={17} className="text-violet-500" /> Regression coverage (Released)
              </div>
              <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Mỗi sprint chỉ cần <span className="font-semibold text-violet-700 dark:text-violet-300">1 task Released</span> có label <span className="font-semibold text-violet-700 dark:text-violet-300">RegressionTest</span> là được tính đã bao phủ.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div><div className="text-[10px] uppercase tracking-wider text-gray-400">Sprint đạt</div><div className="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-300">{regressionAnalysis.coveredSprints || 0}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-gray-400">Tổng sprint</div><div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{regressionAnalysis.totalSprints || 0}</div></div>
                <div><div className="text-[10px] uppercase tracking-wider text-gray-400">Task Regression</div><div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-300">{regressionAnalysis.regressionTasks || 0}</div></div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRegExpanded(!regExpanded)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200/80 px-3 py-2 text-left text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-800/70"
        >
          <span>{regExpanded ? 'Ẩn chi tiết sprint' : `Xem chi tiết ${(regressionAnalysis.sprints || []).length} sprint GMS`}</span>
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${regExpanded ? 'rotate-180' : ''}`} />
        </button>

        {regExpanded && (
          <div className="mt-3">
            {(regressionAnalysis.sprints || []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-neutral-700">Chưa có dữ liệu sprint GMS.</div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {(regressionAnalysis.sprints || []).map((row) => (
                  <div key={`${row.project}-${row.sprint}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        {row.covered ? <CheckCircle2 size={15} className="shrink-0 text-emerald-500" /> : <CircleAlert size={15} className="shrink-0 text-amber-500" />}
                        {row.project && <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">{row.project}</span>}
                        <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-200" title={row.sprint}>{row.sprint}</span>
                      </div>
                      <span className={`shrink-0 font-semibold tabular-nums ${row.covered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {row.covered ? `${row.regressionTasks} task` : 'Chưa có'}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                      <div className={`h-full rounded-full transition-all duration-700 ${row.covered ? 'bg-gradient-to-r from-violet-400 to-indigo-500' : 'bg-amber-300 dark:bg-amber-500/60'}`} style={{ width: row.covered ? '100%' : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ─── PHẦN 6: THỐNG KÊ QC WEIGHT VÀ STORY POINTS CÓ 2 LỰA CHỌN (YÊU CẦU 4) ─── */}
      <div className="space-y-4">
        {/* Toggle chuyển đổi phạm vi thống kê */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart2 size={16} />
            </span>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Phân tích QC Weight & Story Points ({quarterLabel})
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Lựa chọn phạm vi thống kê theo Task (Task & Support) hoặc theo Bug (Type là Bug)
              </div>
            </div>
          </div>

          {/* Segmented Control Button */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
            <button
              onClick={() => setWeightScope('task')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                weightScope === 'task'
                  ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ClipboardList size={13} />
              <span>Theo Task ({totalBscTasks})</span>
            </button>

            <button
              onClick={() => setWeightScope('bug')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                weightScope === 'bug'
                  ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Bug size={13} />
              <span>Theo Bug ({totalBugIssues})</span>
            </button>

            <button
              onClick={() => setWeightScope('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                weightScope === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Layers size={13} />
              <span>Tổng hợp ({totalBscTasks + totalBugIssues})</span>
            </button>
          </div>
        </div>

        {/* Panel QC Weight */}
        <Panel
          title={`QC Weight · ${weightScope === 'task' ? 'Theo Task & Support' : weightScope === 'bug' ? 'Theo Bug (Type Bug)' : 'Tổng hợp cả Task & Bug'} (${quarterLabel})`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Stat label="Total QC Weight" value={activeQcWeight.total} />
            <Stat label={`Average / ${weightScope === 'bug' ? 'Bug' : 'Task'}`} value={activeQcWeight.average} />
            <Stat label="Highest" value={activeQcWeight.highest} />
            <Stat label="Lowest" value={activeQcWeight.lowest} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                QC Weight theo Sprint ({weightScope === 'task' ? 'Task' : weightScope === 'bug' ? 'Bug' : 'Tất cả'})
              </div>
              <BarCard data={activeQcWeight.bySprint || []} dataKey="weight" xKey="sprint" color={weightScope === 'bug' ? '#ef4444' : e.qc} mode={mode} height={220} showLabels />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Top 5 {weightScope === 'bug' ? 'Bug' : 'Task'} theo QC Weight
              </div>
              <BarCard data={activeQcWeight.top5 || []} dataKey="weight" xKey="key" color={weightScope === 'bug' ? '#ef4444' : e.qc} mode={mode} height={220} horizontal />
            </div>
          </div>
        </Panel>

        {/* Panel Story Points */}
        <Panel
          title={`Story Points · ${weightScope === 'task' ? 'Theo Task & Support' : weightScope === 'bug' ? 'Theo Bug (Type Bug)' : 'Tổng hợp cả Task & Bug'} (${quarterLabel})`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Stat label="Total Story Points" value={activeStoryPoints.total} />
            <Stat label={`Average / ${weightScope === 'bug' ? 'Bug' : 'Task'}`} value={activeStoryPoints.average} />
            <Stat label="Highest" value={activeStoryPoints.highest} />
            <Stat label="Lowest" value={activeStoryPoints.lowest} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Story Points theo Sprint ({weightScope === 'task' ? 'Task' : weightScope === 'bug' ? 'Bug' : 'Tất cả'})
              </div>
              <BarCard data={activeStoryPoints.bySprint || []} dataKey="points" xKey="sprint" color={weightScope === 'bug' ? '#f59e0b' : e.story} mode={mode} height={220} showLabels />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Top 5 {weightScope === 'bug' ? 'Bug' : 'Task'} theo Story Points
              </div>
              <BarCard data={activeStoryPoints.top5 || []} dataKey="points" xKey="key" color={weightScope === 'bug' ? '#f59e0b' : e.story} mode={mode} height={220} horizontal />
            </div>
          </div>
        </Panel>
      </div>

      {/* Thống kê Bug Subtasks Distribution */}
      <Panel title={`Bug Subtasks trên Task & Support (${quarterLabel} - Released)`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Total Bug Subtasks" value={subtaskBugCount} />
          <Stat label="Bug Subtask / Task" value={aggregatesTasks.bug?.perTask || 0} />
          <Stat label="Nhiều nhất trên 1 Task" value={aggregatesTasks.bug?.highest || 0} />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phân bố Bug Subtask trên Task</div>
            <PieCard data={aggregatesTasks.bug?.distribution || []} colors={ramp(mode, 'bug', 4)} mode={mode} height={220} centerCaption="Task" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bug Subtask theo Sprint</div>
            <BarCard data={aggregatesTasks.bug?.bySprint || []} dataKey="bug" xKey="sprint" color={e.bug} mode={mode} height={220} showLabels />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top 5 Task có nhiều Bug Subtask</div>
            <BarCard data={aggregatesTasks.bug?.top5 || []} dataKey="bug" xKey="key" color={e.bug} mode={mode} height={220} horizontal />
          </div>
        </div>
      </Panel>

      {/* Task theo Sprint Chart */}
      <Panel title={`Task Released theo Sprint (${quarterLabel})`}>
        <LineCard
          data={aggregatesTasks.taskBySprint || []}
          series={[{ key: 'task', name: 'Task Released', color: e.task }]}
          xKey="sprint"
          mode={mode}
        />
      </Panel>
    </div>
  )
}
