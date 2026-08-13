import './env.js' // must be first: loads ../.env into process.env
import express from 'express'
import { fetchTasks } from './jira.js'
import { saveTasks, getTasks, getMeta } from './db.js'
import { STATUS_ORDER, computeAggregates, decorate } from './kpi.js'

const app = express()
const PORT = process.env.PORT || 3001

const splitMultiValue = (value) =>
  String(value || '').split(',').map((v) => v.trim()).filter(Boolean)

const matchesMulti = (value, filter) => {
  const selected = splitMultiValue(filter)
  if (selected.length === 0) return true
  return selected.includes(value)
}

const matchesAnyLevel = (task, prefix, filter) => {
  const selected = splitMultiValue(filter)
  if (selected.length === 0) return true
  return selected.some((level) => task[`${prefix}${level}`])
}

const sortStatuses = (statuses) => [
  ...STATUS_ORDER.filter((status) => statuses.includes(status)),
  ...statuses.filter((status) => !STATUS_ORDER.includes(status)).sort(),
]

// Apply global filters (ui.md §3): Project / Year / Quarter / Status +
// Review / Test Case / Test Design level. Year & quarter come from labels.
// review/tc/td accept a level "1" | "2" | "3" → require that level's flag.
function applyFilters(tasks, q = {}) {
  return tasks.map(decorate).filter((t) => {
    if (!matchesMulti(t.project, q.project)) return false
    if (!matchesMulti(String(t.year || ''), q.year)) return false
    if (!matchesMulti(t.quarter, q.quarter)) return false
    if (!matchesMulti(t.sprint, q.sprint)) return false
    if (!matchesMulti(t.status, q.status)) return false
    if (!matchesMulti(t.type, q.type)) return false
    if (!matchesAnyLevel(t, 'review', q.review)) return false
    if (!matchesAnyLevel(t, 'tc', q.tc)) return false
    if (!matchesAnyLevel(t, 'td', q.td)) return false
    if (q.label) {
      const filterLabels = splitMultiValue(q.label)
      // Each filter label is matched with 'includes' (case-insensitive) against task labels
      if (!filterLabels.some(fl =>
        t.labels.some(tl => tl.toLowerCase().includes(fl.toLowerCase()))
      )) return false
    }
    return true
  })
}

// Sync data from Jira into the local SQLite cache.
app.post('/api/refresh', async (req, res) => {
  try {
    const proj = req.query.project
    if (proj) {
      const tasks = await fetchTasks(proj)
      saveTasks(tasks, proj)
      res.json({ count: tasks.length, lastRefresh: getMeta('lastRefresh') })
    } else {
      const projectsToFetch = ['GOP', 'AW']
      let allTasks = []
      for (const p of projectsToFetch) {
        try {
          const tasks = await fetchTasks(p)
          allTasks = allTasks.concat(tasks)
        } catch (e) {
          console.error(`Error fetching project ${p}:`, e.message)
        }
      }
      saveTasks(allTasks)
      res.json({ count: allTasks.length, lastRefresh: getMeta('lastRefresh') })
    }
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
  const all = getTasks().map(decorate)
  const selectedProjects = splitMultiValue(req.query.project)
  const t = selectedProjects.length ? all.filter((x) => selectedProjects.includes(x.project)) : all
  const uniq = (arr) => [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ''))]

  // Labels are fixed to only these 3 filter categories (matched with includes, case-insensitive)
  const FIXED_LABELS = ['Sprint-Goal', 'RegressionTest', 'ĐộtXuất']

  res.json({
    projects: uniq(all.map((x) => x.project)).sort(),
    years: uniq(t.map((x) => x.year)).sort(),
    quarters: uniq(t.map((x) => x.quarter)).sort(),
    sprints: uniq(t.map((x) => x.sprint)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })),
    statuses: sortStatuses(uniq(t.map((x) => x.status))),
    labels: FIXED_LABELS,
    types: ['Task', 'Bug', 'Support'],
    // Review / Test Case / Test Design levels are fixed 1–3.
    levels: ['1', '2', '3'],
  })
})

app.get('/api/meta', (_req, res) =>
  res.json({ lastRefresh: getMeta('lastRefresh'), qcName: process.env.JIRA_QC_NAME || '' }))

app.listen(PORT, () => console.log(`QC KPI API → http://localhost:${PORT}`))
