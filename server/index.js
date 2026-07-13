import './env.js' // must be first: loads ../.env into process.env
import express from 'express'
import { fetchTasks } from './jira.js'
import { saveTasks, getTasks, getMeta } from './db.js'
import { computeAggregates, decorate } from './kpi.js'

const app = express()
const PORT = process.env.PORT || 3001

// Apply Project / Year / Quarter filters (year & quarter come from labels).
function applyFilters(tasks, q = {}) {
  return tasks.map(decorate).filter((t) => {
    if (q.project && t.project !== q.project) return false
    if (q.year && String(t.year) !== String(q.year)) return false
    if (q.quarter && t.quarter !== q.quarter) return false
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
  })
})

app.get('/api/meta', (_req, res) => res.json({ lastRefresh: getMeta('lastRefresh') }))

app.listen(PORT, () => console.log(`QC KPI API → http://localhost:${PORT}`))
