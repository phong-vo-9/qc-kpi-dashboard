// Label parsing + KPI aggregation (spec sections 10–13; UI spec ui.md §6,7,17).

const RE_QUARTER = /^Q([1-4])-(\d{4})$/i

// Canonical status order (matches Jira workflow) — used for stable chart/badge ordering.
export const STATUS_ORDER = ['Todo', 'In Progress', 'Ready to Test', 'Testing', 'Done', 'Released']

// Turn a task's raw labels into KPI flags + quarter/year.
export function parseLabels(labels = []) {
  const has = (name) => labels.some((l) => String(l).toLowerCase() === name.toLowerCase())
  let quarter = null
  let year = null
  for (const l of labels) {
    const m = RE_QUARTER.exec(String(l))
    if (m) {
      quarter = `Q${m[1]}`
      year = Number(m[2])
    }
  }
  return {
    review1: has('Review1'), review2: has('Review2'), review3: has('Review3'),
    tc1: has('TestCase1'), tc2: has('TestCase2'), tc3: has('TestCase3'),
    td1: has('TestDesign1'), td2: has('TestDesign2'), td3: has('TestDesign3'),
    quarter, year,
  }
}

export function decorate(task) {
  return { ...task, ...parseLabels(task.labels) }
}

// Bucket a bug count into a distribution band (ui.md §7 "Bug Distribution").
function bugBand(n) {
  if (n <= 0) return '0'
  if (n <= 2) return '1-2'
  if (n <= 5) return '3-5'
  return '6+'
}
const BUG_BANDS = ['0', '1-2', '3-5', '6+']

export function computeAggregates(tasks) {
  const t = tasks.map(decorate)
  const total = t.length
  const cnt = (k) => t.filter((x) => x[k]).length

  const review = { r1: cnt('review1'), r2: cnt('review2'), r3: cnt('review3') }
  const testCase = { tc1: cnt('tc1'), tc2: cnt('tc2'), tc3: cnt('tc3') }
  const testDesign = { td1: cnt('td1'), td2: cnt('td2'), td3: cnt('td3') }

  const totalReview = review.r1 + review.r2 + review.r3
  const totalTestCase = testCase.tc1 + testCase.tc2 + testCase.tc3
  const totalTestDesign = testDesign.td1 + testDesign.td2 + testDesign.td3

  const weights = t.map((x) => x.qcWeight || 0)
  const totalQcWeight = weights.reduce((s, w) => s + w, 0)
  const totalBug = t.reduce((s, x) => s + (x.bugCount || 0), 0)

  // QC Weight and Bug aggregated per Quarter (ui.md §6, §7).
  const qwByQuarter = {}
  const bugByQuarter = {}
  const taskByQuarter = {}
  for (const x of t) {
    if (!x.quarter) continue
    qwByQuarter[x.quarter] = (qwByQuarter[x.quarter] || 0) + (x.qcWeight || 0)
    bugByQuarter[x.quarter] = (bugByQuarter[x.quarter] || 0) + (x.bugCount || 0)
    taskByQuarter[x.quarter] = (taskByQuarter[x.quarter] || 0) + 1
  }
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

  // QC Weight per Status (ui.md §6).
  const qwByStatus = {}
  const statusCounts = {}
  for (const x of t) {
    const s = x.status || 'Unknown'
    statusCounts[s] = (statusCounts[s] || 0) + 1
    qwByStatus[s] = (qwByStatus[s] || 0) + (x.qcWeight || 0)
  }
  // Order known statuses first, then any extras seen in the data.
  const seenStatuses = [
    ...STATUS_ORDER.filter((s) => s in statusCounts),
    ...Object.keys(statusCounts).filter((s) => !STATUS_ORDER.includes(s)),
  ]

  // Bug distribution bands (ui.md §7 pie chart).
  const bandCounts = {}
  for (const x of t) bandCounts[bugBand(x.bugCount || 0)] = (bandCounts[bugBand(x.bugCount || 0)] || 0) + 1

  const ratio = (n) => (total ? +(n / total).toFixed(2) : 0)

  return {
    total,
    review, testCase, testDesign,
    totalReview, totalTestCase, totalTestDesign,
    ratios: {
      r1: ratio(review.r1), r2: ratio(review.r2), r3: ratio(review.r3),
      tc1: ratio(testCase.tc1), tc2: ratio(testCase.tc2), tc3: ratio(testCase.tc3),
      td1: ratio(testDesign.td1), td2: ratio(testDesign.td2), td3: ratio(testDesign.td3),
    },
    // Average count per task, across all levels (ui.md §17).
    averages: {
      review: ratio(totalReview),
      testCase: ratio(totalTestCase),
      testDesign: ratio(totalTestDesign),
    },
    // Status breakdown (ui.md §17) — ordered list + lookup map.
    status: {
      order: seenStatuses,
      counts: statusCounts,
      list: seenStatuses.map((s) => ({ status: s, count: statusCounts[s] })),
    },
    qcWeight: {
      total: totalQcWeight,
      average: total ? +(totalQcWeight / total).toFixed(2) : 0,
      highest: weights.length ? Math.max(...weights) : 0,
      lowest: weights.length ? Math.min(...weights) : 0,
      byQuarter: quarters.map((q) => ({ quarter: q, weight: qwByQuarter[q] || 0 })),
      byStatus: seenStatuses.map((s) => ({ status: s, weight: qwByStatus[s] || 0 })),
      top5: [...t].sort((a, b) => b.qcWeight - a.qcWeight).slice(0, 5).map((x) => ({ key: x.key, weight: x.qcWeight })),
    },
    bug: {
      total: totalBug,
      perTask: ratio(totalBug), // Bug / Task (ui.md §7)
      average: ratio(totalBug), // alias — Average Bug per task
      highest: t.length ? Math.max(...t.map((x) => x.bugCount || 0)) : 0,
      byQuarter: quarters.map((q) => ({ quarter: q, bug: bugByQuarter[q] || 0 })),
      distribution: BUG_BANDS.map((b) => ({ name: b, value: bandCounts[b] || 0 })),
      top5: [...t].sort((a, b) => b.bugCount - a.bugCount).slice(0, 5).map((x) => ({ key: x.key, bug: x.bugCount })),
    },
    // Task volume per quarter (ui.md §8 line chart).
    taskByQuarter: quarters.map((q) => ({ quarter: q, task: taskByQuarter[q] || 0 })),

    // ── Back-compat aliases (kept so older callers/tests don't break) ──
    totalBug,
    topBug: [...t].sort((a, b) => b.bugCount - a.bugCount).slice(0, 5).map((x) => ({ key: x.key, bug: x.bugCount })),
  }
}
