import './env.js' // must be first: loads ../.env into process.env
import express from 'express'
import { fetchTasks, fetchActiveSprint, fetchBugBacklog } from './jira.js'
import { saveTasks, saveBugBacklog, getTasks, getBugBacklog, getMeta } from './db.js'
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

const ENVIRONMENT_ORDER = ['Dev', 'UAT', 'Canary', 'Staging', 'Production']

const emptyEnvironmentCounts = () =>
  Object.fromEntries(ENVIRONMENT_ORDER.map((env) => [env, 0]))

// Keep sprint analysis focused on GOP for now.
// Add AW back here when the analysis panel needs it again.
const SPRINT_ANALYSIS_PROJECTS = ['GOP']

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
    const backlogProject = process.env.JIRA_PROJECT || 'GOP'
    if (proj) {
      const tasks = await fetchTasks(proj)
      saveTasks(tasks, proj)
      try {
        const bugBacklog = await fetchBugBacklog(backlogProject)
        saveBugBacklog(bugBacklog, backlogProject)
        res.json({ count: tasks.length, backlogCount: bugBacklog.length, lastRefresh: getMeta('lastRefresh') })
      } catch (bugErr) {
        console.error(`Error fetching bug backlog for ${backlogProject}:`, bugErr.message)
        res.json({ count: tasks.length, backlogCount: 0, backlogError: bugErr.message, lastRefresh: getMeta('lastRefresh') })
      }
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
      try {
        const bugBacklog = await fetchBugBacklog(backlogProject)
        saveBugBacklog(bugBacklog, backlogProject)
        res.json({ count: allTasks.length, backlogCount: bugBacklog.length, lastRefresh: getMeta('lastRefresh') })
      } catch (bugErr) {
        console.error(`Error fetching bug backlog for ${backlogProject}:`, bugErr.message)
        res.json({ count: allTasks.length, backlogCount: 0, backlogError: bugErr.message, lastRefresh: getMeta('lastRefresh') })
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tasks', (req, res) => {
  res.json(applyFilters(getTasks(), req.query))
})

app.get('/api/bug-backlog', (req, res) => {
  const all = getBugBacklog().map(decorate)
  const selectedProjects = splitMultiValue(req.query.project)
  const rows = selectedProjects.length ? all.filter((x) => selectedProjects.includes(x.project)) : all
  res.json(rows)
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

/**
 * GET /api/sprint-analysis
 * Source of truth for active sprint = Jira Agile API (state=active).
 * Task stats are then computed from DB tasks matching that sprint name (scoped to QC).
 * Falls back to heuristic (most recent sprint with open tasks) if Jira Agile API fails.
 */
app.get('/api/sprint-analysis', async (_req, res) => {
  try {
    const allTasks = getTasks().map(decorate)

    // Group tasks by project
    const projectMap = {}
    for (const t of allTasks) {
      if (!t.project) continue
      if (!SPRINT_ANALYSIS_PROJECTS.includes(t.project)) continue
      if (!projectMap[t.project]) projectMap[t.project] = []
      projectMap[t.project].push(t)
    }

    const DONE_STATUSES = new Set(['done', 'released'])

    const results = []
    for (const [project, tasks] of Object.entries(projectMap)) {
      // ── Step 1: Ask Jira for the authoritative active sprint ──────────────
      let sprintMeta = null
      let activeSprint = null
      try {
        sprintMeta = await fetchActiveSprint(project)
        if (sprintMeta) activeSprint = sprintMeta.name
      } catch {
        // ignore — fall through to heuristic
      }

      // ── Step 2: Fallback — derive active sprint from task data ─────────────
      // Only used when Jira Agile API is unavailable.
      if (!activeSprint) {
        const sprintNames = [...new Set(tasks.map((t) => t.sprint).filter(Boolean))]
        sprintNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        // Pick most recent sprint that still has open tasks
        activeSprint = sprintNames.findLast((s) => {
          const spTasks = tasks.filter((t) => t.sprint === s && t.type !== 'Bug')
          return spTasks.some((t) => !DONE_STATUSES.has((t.status || '').toLowerCase().trim()))
        }) || sprintNames[sprintNames.length - 1]
      }

      if (!activeSprint) {
        results.push({ project, sprintName: null, sprintMeta: null, totalTasks: 0, doneTasks: 0,
          totalSP: 0, doneSP: 0, totalWeight: 0, doneWeight: 0, statusCounts: {},
          environmentCounts: emptyEnvironmentCounts(), missingEnvironment: 0,
          missingEnd: 0, overdueEnd: 0, missingDue: 0, overdueDue: 0 })
        continue
      }

      // ── Step 3: Compute stats from QC's tasks in that sprint ──────────────
      const spTasks = tasks.filter((t) => t.sprint === activeSprint && t.type !== 'Bug')
      const doneTasks = spTasks.filter((t) => DONE_STATUSES.has((t.status || '').toLowerCase().trim())).length
      const totalSP = spTasks.reduce((s, t) => s + (t.storyPoints || 0), 0)
      const doneSP = spTasks.filter((t) => DONE_STATUSES.has((t.status || '').toLowerCase().trim()))
        .reduce((s, t) => s + (t.storyPoints || 0), 0)
      const totalWeight = spTasks.reduce((s, t) => s + (t.qcWeight || 0), 0)
      const doneWeight = spTasks.filter((t) => DONE_STATUSES.has((t.status || '').toLowerCase().trim()))
        .reduce((s, t) => s + (t.qcWeight || 0), 0)

      const statusCounts = {}
      const environmentCounts = emptyEnvironmentCounts()
      let missingEnvironment = 0
      for (const t of spTasks) {
        const s = t.status || 'Unknown'
        statusCounts[s] = (statusCounts[s] || 0) + 1
        if (t.environment && Object.prototype.hasOwnProperty.call(environmentCounts, t.environment)) {
          environmentCounts[t.environment] += 1
        } else {
          missingEnvironment += 1
        }
      }

      const today = new Date().toISOString().split('T')[0]
      const missingEnd = spTasks.filter((t) => !t.enddate).length
      const overdueEnd = spTasks.filter(
        (t) => t.enddate && t.enddate < today && !DONE_STATUSES.has((t.status || '').toLowerCase().trim())
      ).length
      // Due date is only evaluated for issues that have an End date.
      const missingDue = spTasks.filter((t) => t.enddate && !t.duedate).length
      const overdueDue = spTasks.filter(
        (t) => t.enddate && t.duedate && t.duedate < today && !DONE_STATUSES.has((t.status || '').toLowerCase().trim())
      ).length

      results.push({
        project,
        sprintName: activeSprint,
        sprintMeta,  // { startDate, endDate, state:'active', goal, ... } or null
        totalTasks: spTasks.length,
        doneTasks,
        totalSP,
        doneSP,
        totalWeight,
        doneWeight,
        statusCounts,
        environmentCounts,
        missingEnvironment,
        missingEnd,
        overdueEnd,
        missingDue,
        overdueDue,
      })
    }

    res.json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => console.log(`QC KPI API → http://localhost:${PORT}`))
