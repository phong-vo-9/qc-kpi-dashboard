import './env.js' // must be first: loads ../.env into process.env
import express from 'express'
import { fetchTasks } from './jira.js'
import { saveTasks, getTasks, getMeta } from './db.js'
import { computeAggregates, decorate } from './kpi.js'

const app = express()
const PORT = process.env.PORT || 3001

// Apply global filters (ui.md §3): Project / Year / Quarter / Status +
// Review / Test Case / Test Design level. Year & quarter come from labels.
// review/tc/td accept a level "1" | "2" | "3" → require that level's flag.
function applyFilters(tasks, q = {}) {
  return tasks.map(decorate).filter((t) => {
    if (q.project && t.project !== q.project) return false
    if (q.year && String(t.year) !== String(q.year)) return false
    if (q.quarter && t.quarter !== q.quarter) return false
    if (q.sprint && t.sprint !== q.sprint) return false
    if (q.status && t.status !== q.status) return false
    if (q.review && !t[`review${q.review}`]) return false
    if (q.tc && !t[`tc${q.tc}`]) return false
    if (q.td && !t[`td${q.td}`]) return false
    return true
  })
}

// Sync data from Jira into the local SQLite cache.
app.post('/api/refresh', async (req, res) => {
  try {
    const tasks = await fetchTasks(req.query.project)
    saveTasks(tasks)
    res.json({ count: tasks.length, lastRefresh: getMeta('lastRefresh') })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tasks', (req, res) => {
  res.json(applyFilters(getTasks(), req.query))
})

app.get('/api/kpi', (req, res) => {
  res.json(computeAggregates(applyFilters(getTasks(), req.query)))
})

app.get('/api/filters', (req, res) => {
  const t = getTasks().map(decorate)
  const uniq = (arr) => [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ''))]
  res.json({
    projects: uniq(t.map((x) => x.project)).sort(),
    years: uniq(t.map((x) => x.year)).sort(),
    quarters: uniq(t.map((x) => x.quarter)).sort(),
    sprints: uniq(t.map((x) => x.sprint)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })),
    statuses: uniq(t.map((x) => x.status)).sort(),
    // Review / Test Case / Test Design levels are fixed 1–3.
    levels: ['1', '2', '3'],
  })
})

app.get('/api/meta', (_req, res) =>
  res.json({ lastRefresh: getMeta('lastRefresh'), qcName: process.env.JIRA_QC_NAME || '' }))

app.listen(PORT, () => console.log(`QC KPI API → http://localhost:${PORT}`))
