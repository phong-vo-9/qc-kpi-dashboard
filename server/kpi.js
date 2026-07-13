// Label parsing + KPI aggregation (spec sections 10–13).

const RE_QUARTER = /^Q([1-4])-(\d{4})$/i

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

export function computeAggregates(tasks) {
  const t = tasks.map(decorate)
  const total = t.length
  const cnt = (k) => t.filter((x) => x[k]).length

  const review = { r1: cnt('review1'), r2: cnt('review2'), r3: cnt('review3') }
  const testCase = { tc1: cnt('tc1'), tc2: cnt('tc2'), tc3: cnt('tc3') }
  const testDesign = { td1: cnt('td1'), td2: cnt('td2'), td3: cnt('td3') }

  const totalQcWeight = t.reduce((s, x) => s + (x.qcWeight || 0), 0)
  const totalBug = t.reduce((s, x) => s + (x.bugCount || 0), 0)

  const byQuarter = {}
  for (const x of t) {
    if (x.quarter) byQuarter[x.quarter] = (byQuarter[x.quarter] || 0) + (x.qcWeight || 0)
  }

  const ratio = (n) => (total ? +(n / total).toFixed(2) : 0)

  return {
    total,
    review, testCase, testDesign,
    totalReview: review.r1 + review.r2 + review.r3,
    totalTestCase: testCase.tc1 + testCase.tc2 + testCase.tc3,
    totalTestDesign: testDesign.td1 + testDesign.td2 + testDesign.td3,
    ratios: {
      r1: ratio(review.r1), r2: ratio(review.r2), r3: ratio(review.r3),
      tc1: ratio(testCase.tc1), tc2: ratio(testCase.tc2), tc3: ratio(testCase.tc3),
      td1: ratio(testDesign.td1), td2: ratio(testDesign.td2), td3: ratio(testDesign.td3),
    },
    qcWeight: {
      total: totalQcWeight,
      average: total ? +(totalQcWeight / total).toFixed(2) : 0,
      byQuarter: ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({ quarter: q, weight: byQuarter[q] || 0 })),
      top5: [...t].sort((a, b) => b.qcWeight - a.qcWeight).slice(0, 5).map((x) => ({ key: x.key, weight: x.qcWeight })),
    },
    totalBug,
    topBug: [...t].sort((a, b) => b.bugCount - a.bugCount).slice(0, 5).map((x) => ({ key: x.key, bug: x.bugCount })),
  }
}
