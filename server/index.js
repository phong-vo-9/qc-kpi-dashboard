import './env.js' // must be first: loads ../.env into process.env
import express from 'express'
import { fetchTasks, fetchActiveSprint, fetchBugBacklog, fetchItsTickets, fetchTempoWorklogs, fetchTempoAllocations } from './jira.js'
import { saveTasks, saveBugBacklog, getTasks, getBugBacklog, getMeta, getClearDocs, saveClearDoc, deleteClearDoc, getClearDocTaskStatuses, setClearDocTaskStatus, deleteClearDocTaskStatus, getItsTickets, saveItsTickets, clearItsTickets, deleteItsTicket, getNonItsFeedbacks, saveNonItsFeedback, deleteNonItsFeedback } from './db.js'
import { STATUS_ORDER, computeAggregates, decorate } from './kpi.js'

const app = express()
app.use(express.json())
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

// Compare labels independent of case, spaces, punctuation, and Vietnamese accents.
// Jira labels can be entered as e.g. "RegressionTest" or "Regression Test".
const normalizeLabel = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

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
    if (q.excludeLabel) {
      const excluded = splitMultiValue(q.excludeLabel).map(normalizeLabel).filter(Boolean)
      if (t.labels.some((label) => excluded.some((item) => normalizeLabel(label).includes(item)))) return false
    }
    if (q.label) {
      const filterLabels = splitMultiValue(q.label)
      // Each filter label is matched with 'includes' (case-insensitive) against task labels
      if (!filterLabels.some(fl =>
        t.labels.some(tl => normalizeLabel(tl).includes(normalizeLabel(fl)))
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
        const its = await fetchItsTickets()
        saveItsTickets(its, true)
      } catch (e) {
        console.error('Lỗi sync ITS:', e.message)
      }
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

let tempoCache = {
  timestamp: 0,
  data: null,
  key: '',
}

app.get('/api/tempo-today', async (req, res) => {
  try {
    const now = new Date()
    const targetDate = req.query.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)
    const force = req.query.force === '1' || req.query.force === 'true'

    const cacheKey = targetDate
    const nowMs = Date.now()
    if (!force && tempoCache.data && tempoCache.key === cacheKey && nowMs - tempoCache.timestamp < 30000) {
      return res.json(tempoCache.data)
    }

    const [year, month] = targetDate.split('-')
    const lastDayOfMonth = new Date(Number(year), Number(month), 0).getDate()
    const from = `${year}-${month}-01`
    const to = `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`

    const worklogs = await fetchTempoWorklogs(from, to)

    // Filter targetDate worklogs
    const todayLogs = worklogs.filter((w) => (w.started || '').slice(0, 10) === targetDate)
    const todaySeconds = todayLogs.reduce((sum, w) => sum + (Number(w.timeSpentSeconds) || 0), 0)
    const todayHours = Math.round((todaySeconds / 3600) * 10) / 10

    // Month total
    const monthSeconds = worklogs.reduce((sum, w) => sum + (Number(w.timeSpentSeconds) || 0), 0)
    const monthHours = Math.round((monthSeconds / 3600) * 10) / 10

    // Day of week
    const dateObj = new Date(`${targetDate}T12:00:00+07:00`)
    const dayOfWeekIdx = dateObj.getDay()
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
    const isWeekend = dayOfWeekIdx === 0 || dayOfWeekIdx === 6
    const isWorkday = !isWeekend

    const targetHours = isWorkday ? 8 : 0
    const remainingHours = isWorkday ? Math.max(0, Math.round((targetHours - todayHours) * 10) / 10) : 0
    const percent = targetHours > 0 ? Math.min(100, Math.round((todayHours / targetHours) * 100)) : (isWeekend ? 100 : 0)
    const isCompleted = isWorkday ? todayHours >= targetHours : true

    const items = todayLogs.map((w) => ({
      key: w.issue?.key || '',
      summary: w.issue?.summary || '',
      timeSpent: w.timeSpent || '',
      seconds: w.timeSpentSeconds || 0,
      hours: Math.round(((w.timeSpentSeconds || 0) / 3600) * 10) / 10,
      comment: (w.comment || '').trim(),
      started: w.started,
    }))

    // Find the most recent day with logged work in this month
    const datesWithLogs = Array.from(new Set(worklogs.map((w) => (w.started || '').slice(0, 10)))).sort().reverse()
    const latestLoggedDate = datesWithLogs.find((d) => d !== targetDate) || null

    let latestLoggedInfo = null
    if (latestLoggedDate && latestLoggedDate !== targetDate) {
      const logs = worklogs.filter((w) => (w.started || '').slice(0, 10) === latestLoggedDate)
      const secs = logs.reduce((sum, w) => sum + (Number(w.timeSpentSeconds) || 0), 0)
      const hrs = Math.round((secs / 3600) * 10) / 10
      const dObj = new Date(`${latestLoggedDate}T12:00:00+07:00`)
      latestLoggedInfo = {
        date: latestLoggedDate,
        dayOfWeek: dayNames[dObj.getDay()],
        loggedHours: hrs,
        itemsCount: logs.length,
      }
    }

    const payload = {
      date: targetDate,
      dayOfWeek: dayNames[dayOfWeekIdx],
      dayOfWeekIdx,
      isWorkday,
      isWeekend,
      targetHours,
      todayLoggedSeconds: todaySeconds,
      todayLoggedHours: todayHours,
      remainingHours,
      percent,
      isCompleted,
      monthLoggedHours: monthHours,
      items,
      latestLoggedInfo,
      cachedAt: new Date().toISOString(),
    }

    tempoCache = {
      timestamp: nowMs,
      data: payload,
      key: cacheKey,
    }

    res.json(payload)
  } catch (err) {
    console.error('Lỗi API /api/tempo-today:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Clear Doc APIs
app.get('/api/clear-docs', (req, res) => {
  try {
    const docs = getClearDocs(req.query)
    res.json(docs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/clear-docs', (req, res) => {
  try {
    const doc = req.body
    if (!doc.id) {
      doc.id = 'cd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    }
    saveClearDoc(doc)
    res.json({ success: true, doc })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/clear-docs/:id', (req, res) => {
  try {
    const doc = { ...req.body, id: req.params.id }
    saveClearDoc(doc)
    res.json({ success: true, doc })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/clear-docs/:id', (req, res) => {
  try {
    deleteClearDoc(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/clear-docs/task-status', (req, res) => {
  try {
    const statuses = getClearDocTaskStatuses()
    res.json(statuses)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/clear-docs/task-status', (req, res) => {
  try {
    const { taskKey, status, note, remove } = req.body
    if (!taskKey) return res.status(400).json({ error: 'taskKey is required' })
    if (remove) {
      deleteClearDocTaskStatus(taskKey)
    } else {
      setClearDocTaskStatus(taskKey, status || 'not_needed', note || '')
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ITS Management APIs
app.get('/api/its', async (req, res) => {
  try {
    let tickets = getItsTickets()
    if (tickets.length === 0) {
      try {
        const fetched = await fetchItsTickets()
        if (fetched.length > 0) {
          saveItsTickets(fetched, true)
          tickets = getItsTickets()
        }
      } catch (fetchErr) {
        console.error('Không thể auto-fetch ITS tickets:', fetchErr.message)
      }
    }

    const { quarter, year, status, type, label, slaStatus, classify, search } = req.query

    if (quarter) {
      const quarters = splitMultiValue(quarter)
      tickets = tickets.filter(t => quarters.includes(t.quarter))
    }
    if (year) {
      const years = splitMultiValue(year).map(Number)
      tickets = tickets.filter(t => years.includes(t.year))
    }
    if (status) {
      const statuses = splitMultiValue(status).map(s => s.toLowerCase())
      tickets = tickets.filter(t => statuses.includes((t.status || '').toLowerCase()))
    }
    if (type) {
      const types = splitMultiValue(type).map(ty => ty.toLowerCase())
      tickets = tickets.filter(t => types.includes((t.type || '').toLowerCase()))
    }
    if (classify) {
      const classifies = splitMultiValue(classify).map(c => c.toLowerCase())
      tickets = tickets.filter(t => classifies.some(c => (t.classify || '').toLowerCase().includes(c)))
    }
    if (label) {
      const labels = splitMultiValue(label).map(l => l.toLowerCase())
      tickets = tickets.filter(t => (t.labels || []).some(tl => labels.some(fl => tl.toLowerCase().includes(fl))))
    }
    if (slaStatus) {
      if (slaStatus === 'breached') {
        tickets = tickets.filter(t => t.slaResolutionBreached || t.slaFirstResponseBreached)
      } else if (slaStatus === 'warning') {
        tickets = tickets.filter(t => {
          if (t.slaResolutionBreached || t.slaFirstResponseBreached) return false
          const resMillis = t.slaResolutionDetail?.remainingMillis
          const respMillis = t.slaFirstResponseDetail?.remainingMillis
          const isResWarning = resMillis != null && resMillis > 0 && resMillis <= 4 * 3600 * 1000
          const isRespWarning = respMillis != null && respMillis > 0 && respMillis <= 4 * 3600 * 1000
          return isResWarning || isRespWarning
        })
      } else if (slaStatus === 'ok') {
        tickets = tickets.filter(t => !t.slaResolutionBreached && !t.slaFirstResponseBreached)
      }
    }
    if (search) {
      const q = search.trim().toLowerCase()
      tickets = tickets.filter(t =>
        (t.key || '').toLowerCase().includes(q) ||
        (t.summary || '').toLowerCase().includes(q) ||
        (t.classify || '').toLowerCase().includes(q) ||
        (t.linkedBugs || []).some(b => (b.key || '').toLowerCase().includes(q) || (b.summary || '').toLowerCase().includes(q))
      )
    }

    res.json(tickets)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/its/refresh', async (req, res) => {
  try {
    const itsTickets = await fetchItsTickets()
    saveItsTickets(itsTickets, true)
    res.json({ success: true, count: itsTickets.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/its/import', (req, res) => {
  try {
    const { tickets, replace } = req.body
    if (!Array.isArray(tickets)) {
      return res.status(400).json({ error: 'tickets must be an array' })
    }
    saveItsTickets(tickets, Boolean(replace))
    res.json({ success: true, count: tickets.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/its/clear', (req, res) => {
  try {
    clearItsTickets()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/its/:key', (req, res) => {
  try {
    deleteItsTicket(req.params.key)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Non-ITS Feedback Management APIs
app.get('/api/non-its-feedbacks', (req, res) => {
  try {
    const list = getNonItsFeedbacks(req.query)
    res.json(list)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/non-its-feedbacks', (req, res) => {
  try {
    if (!req.body || !req.body.title || !String(req.body.title).trim()) {
      return res.status(400).json({ error: 'Nội dung feedback không được để trống' })
    }
    const id = saveNonItsFeedback(req.body)
    res.json({ success: true, id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/non-its-feedbacks/:id', (req, res) => {
  try {
    if (!req.body || !req.body.title || !String(req.body.title).trim()) {
      return res.status(400).json({ error: 'Nội dung feedback không được để trống' })
    }
    const id = saveNonItsFeedback({ ...req.body, id: req.params.id })
    res.json({ success: true, id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/non-its-feedbacks/:id', (req, res) => {
  try {
    deleteNonItsFeedback(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// AI Parse Clear Doc endpoint
app.post('/api/ai/parse-clear-doc', (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'text is required' })

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const taskKeys = []
    let threadTitle = ''
    let threadUrl = ''
    const issueLines = []
    let foundThreadLink = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const jiraLinkMatch = line.match(/^\[([A-Z0-9]+-\d+)\]\((https?:\/\/[^\s\)]+)\)/i)
      const browseLinkMatch = line.match(/^https?:\/\/[^\s]+\/browse\/([A-Z0-9]+-\d+)/i)
      const plainTaskKeyMatch = line.match(/^([A-Z0-9]+-\d+)(?:\s*[:\-–]\s*(.*))?$/i)

      if (jiraLinkMatch) {
        const key = jiraLinkMatch[1].toUpperCase()
        if (!taskKeys.includes(key)) taskKeys.push(key)
        continue
      }
      if (browseLinkMatch) {
        const key = browseLinkMatch[1].toUpperCase()
        if (!taskKeys.includes(key)) taskKeys.push(key)
        continue
      }
      if (plainTaskKeyMatch) {
        const key = plainTaskKeyMatch[1].toUpperCase()
        if (!taskKeys.includes(key)) taskKeys.push(key)
        continue
      }

      if (i > 0) {
        const prevLine = lines[i - 1]
        const wasPrevTask =
          prevLine.match(/^\[([A-Z0-9]+-\d+)\]/i) ||
          prevLine.match(/^https?:\/\/[^\s]+\/browse\/([A-Z0-9]+-\d+)/i) ||
          prevLine.match(/^([A-Z0-9]+-\d+)$/i)
        if (wasPrevTask && !line.startsWith('http') && !line.startsWith('[')) {
          continue
        }
      }

      const threadLinkMatch = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/)
      if (threadLinkMatch && !foundThreadLink) {
        threadTitle = threadLinkMatch[1].trim()
        threadUrl = threadLinkMatch[2].trim()
        foundThreadLink = true
        continue
      }

      if (!foundThreadLink) {
        const plainUrlMatch = line.match(/^(https?:\/\/[^\s]+)$/)
        if (plainUrlMatch && !plainUrlMatch[1].includes('/browse/')) {
          threadUrl = plainUrlMatch[1]
          if (i > 0 && !lines[i - 1].startsWith('http') && !lines[i - 1].match(/^[A-Z0-9]+-\d+/i)) {
            threadTitle = lines[i - 1]
          }
          foundThreadLink = true
          continue
        }
      }

      issueLines.push(line)
    }

    const issues = []
    let currentIssue = []
    const isHeadingLine = (l) => {
      if (/^\s*(?:\d+[\.\)]|[-*•])\s+/.test(l)) return true
      if (/^(Về |Tác vụ |Confirm |Xác nhận |Kiểm tra |Lưu ý |Quy tắc |Behavior |Case |Phần |Mục |Q&A|Câu hỏi|Bug|Issue|Hỏi|Lỗi)/i.test(l)) return true
      return false
    }

    for (let i = 0; i < issueLines.length; i++) {
      const l = issueLines[i]
      if (isHeadingLine(l)) {
        if (currentIssue.length > 0) {
          issues.push(currentIssue.join('\n'))
          currentIssue = []
        }
        currentIssue.push(l)
      } else {
        currentIssue.push(l)
      }
    }
    if (currentIssue.length > 0) issues.push(currentIssue.join('\n'))

    const formattedContent = issues
      .map((iss, idx) => {
        const trimmed = iss.trim()
        if (/^\s*\d+[\.\)]\s+/.test(trimmed)) return trimmed
        return `${idx + 1}. ${trimmed}`
      })
      .join('\n\n')

    const allTasks = getTasks().map(decorate)
    const taskMap = new Map(allTasks.map(t => [t.key, t]))

    let detectedProject = ''
    let detectedSprint = ''
    let detectedQuarter = ''
    let detectedYear = ''

    for (const k of taskKeys) {
      const t = taskMap.get(k)
      if (t) {
        if (!detectedProject && t.project) detectedProject = t.project
        if (!detectedSprint && t.sprint) detectedSprint = t.sprint
        if (!detectedQuarter && t.quarter) detectedQuarter = t.quarter
        if (!detectedYear && t.year) detectedYear = t.year
      }
    }

    if (!detectedProject && taskKeys.length > 0) {
      const m = taskKeys[0].match(/^([A-Z0-9]+)-/i)
      if (m) detectedProject = m[1].toUpperCase()
    }

    res.json({
      taskKeys,
      threadTitle: threadTitle || (taskKeys.length > 0 ? `Clear doc cho ${taskKeys.join(', ')}` : 'Clear doc'),
      threadUrl,
      content: formattedContent || issueLines.join('\n'),
      issueCount: issues.length > 0 ? issues.length : 1,
      project: detectedProject || 'GOP',
      sprint: detectedSprint || '',
      quarter: detectedQuarter || '',
      year: detectedYear || '',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/kpi', (req, res) => {
  res.json(computeAggregates(applyFilters(getTasks(), req.query)))
})

// Automation coverage intentionally ignores the Label filter so selecting
// AutomationTest does not make the denominator equal to the automation subset.
app.get('/api/automation-analysis', (req, res) => {
  const isRegression = (task) => (task.labels || []).some(
    (label) => normalizeLabel(label) === 'regressiontest'
  )
  const filtered = applyFilters(getTasks(), { ...req.query, label: '' })
    .filter((task) => task.type !== 'Bug' && !isRegression(task) && /^GMS\s+/i.test(String(task.sprint || '').trim()))
  const isAutomation = (task) => (task.labels || []).some(
    (label) => String(label).trim().toLowerCase() === 'automationtest'
  )
  const bySprint = new Map()
  let noSprint = 0
  for (const task of filtered) {
    if (!task.sprint) {
      noSprint += 1
      continue
    }
    const groupKey = `${task.project || ''}\u0000${task.sprint}`
    if (!bySprint.has(groupKey)) bySprint.set(groupKey, { project: task.project || '', sprint: task.sprint, total: 0, automation: 0 })
    const row = bySprint.get(groupKey)
    row.total += 1
    if (isAutomation(task)) row.automation += 1
  }
  const sprints = [...bySprint.values()]
    .map((row) => ({ ...row, ratio: row.total ? Number(((row.automation / row.total) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => a.project.localeCompare(b.project) || a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: 'base' }))
  const total = filtered.length
  const automation = filtered.filter(isAutomation).length
  res.json({
    total,
    automation,
    ratio: total ? Number(((automation / total) * 100).toFixed(1)) : 0,
    noSprint,
    sprints,
  })
})

// Regression coverage is measured per sprint: one RegressionTest task is enough
// to mark the whole sprint as covered.
app.get('/api/regression-analysis', (req, res) => {
  const filtered = applyFilters(getTasks(), { ...req.query, label: '' })
    .filter((task) => task.type !== 'Bug' && /^GMS\s+/i.test(String(task.sprint || '').trim()))
  const isRegression = (task) => (task.labels || []).some(
    (label) => normalizeLabel(label) === 'regressiontest'
  )
  const bySprint = new Map()
  let noSprint = 0
  for (const task of filtered) {
    if (!task.sprint) {
      noSprint += 1
      continue
    }
    const groupKey = `${task.project || ''}\u0000${task.sprint}`
    if (!bySprint.has(groupKey)) bySprint.set(groupKey, {
      project: task.project || '',
      sprint: task.sprint,
      total: 0,
      regressionTasks: 0,
    })
    const row = bySprint.get(groupKey)
    row.total += 1
    if (isRegression(task)) row.regressionTasks += 1
  }
  const sprints = [...bySprint.values()]
    .map((row) => ({ ...row, covered: row.regressionTasks > 0 }))
    .sort((a, b) => a.project.localeCompare(b.project) || a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: 'base' }))
  const coveredSprints = sprints.filter((row) => row.covered).length
  res.json({
    totalSprints: sprints.length,
    coveredSprints,
    regressionTasks: filtered.filter(isRegression).length,
    ratio: sprints.length ? Number(((coveredSprints / sprints.length) * 100).toFixed(1)) : 0,
    noSprint,
    sprints,
  })
})

const normalizePersonName = (value) => String(value || '')
  .trim()
  .toLocaleLowerCase('vi')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')

const tempoQuarterCache = new Map()
const tempoQuarterAllocCache = new Map()

function getQuarterDateRange(quarter, year) {
  const y = Number(year) || new Date().getFullYear()
  const q = String(quarter || 'Q3').toUpperCase()
  const map = {
    Q1: {
      from: `${y}-01-01`,
      to: `${y}-03-31`,
      months: [
        { key: `${y}-01`, label: 'Tháng 1' },
        { key: `${y}-02`, label: 'Tháng 2' },
        { key: `${y}-03`, label: 'Tháng 3' },
      ],
    },
    Q2: {
      from: `${y}-04-01`,
      to: `${y}-06-30`,
      months: [
        { key: `${y}-04`, label: 'Tháng 4' },
        { key: `${y}-05`, label: 'Tháng 5' },
        { key: `${y}-06`, label: 'Tháng 6' },
      ],
    },
    Q3: {
      from: `${y}-07-01`,
      to: `${y}-09-30`,
      months: [
        { key: `${y}-07`, label: 'Tháng 7' },
        { key: `${y}-08`, label: 'Tháng 8' },
        { key: `${y}-09`, label: 'Tháng 9' },
      ],
    },
    Q4: {
      from: `${y}-10-01`,
      to: `${y}-12-31`,
      months: [
        { key: `${y}-10`, label: 'Tháng 10' },
        { key: `${y}-11`, label: 'Tháng 11' },
        { key: `${y}-12`, label: 'Tháng 12' },
      ],
    },
  }
  return map[q] || map.Q3
}

app.get('/api/bsc', async (req, res) => {
  const allTasks = getTasks().map(decorate)
  const qcName = process.env.JIRA_QC_NAME || 'Nguyễn Phú Thành'

  // Extract distinct available quarters from decorated tasks
  const quartersMap = new Map()
  for (const t of allTasks) {
    if (t.quarter && t.year) {
      const qKey = `${t.quarter}-${t.year}`
      if (!quartersMap.has(qKey)) {
        quartersMap.set(qKey, { quarter: t.quarter, year: Number(t.year), label: qKey })
      }
    }
  }
  const availableQuarters = [...quartersMap.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.quarter.localeCompare(a.quarter)
  })

  // Selected quarter and year
  let selQuarter = req.query.quarter
  let selYear = req.query.year ? Number(req.query.year) : undefined

  if (!selQuarter || !selYear) {
    if (availableQuarters.length > 0) {
      selQuarter = availableQuarters[0].quarter
      selYear = availableQuarters[0].year
    } else {
      selQuarter = 'Q3'
      selYear = 2026
    }
  }

  const quarterTasks = allTasks.filter((t) => t.quarter === selQuarter && t.year === selYear)

  const isRegression = (task) => (task.labels || []).some(
    (label) => normalizeLabel(label) === 'regressiontest'
  )
  const isAutomation = (task) => (task.labels || []).some(
    (label) => String(label).trim().toLowerCase() === 'automationtest'
  )

  // 1. BSC Tasks: status Released, type Task & Support, excluding RegressionTest
  const bscTasks = quarterTasks.filter((t) =>
    t.status === 'Released' &&
    (t.type === 'Task' || t.type === 'Support') &&
    !isRegression(t)
  )

  // Standalone Bug issues that are Released in this quarter
  const bugIssues = quarterTasks.filter((t) =>
    t.status === 'Released' && t.type === 'Bug'
  )

  const aggregatesTasks = computeAggregates(bscTasks)
  const aggregatesBugs = computeAggregates(bugIssues)
  const aggregatesAll = computeAggregates([...bscTasks, ...bugIssues])

  const gmsSprintsSet = new Set()
  for (const t of quarterTasks) {
    if (t.status === 'Released') {
      const s = String(t.sprint || '').trim()
      if (/^GMS(?:\s|$)/i.test(s)) gmsSprintsSet.add(s)
    }
  }

  const totals = {
    taskCount: bscTasks.length,
    bugCount: bugIssues.length,
    subtaskBugCount: aggregatesTasks.bug.total,
    taskQcWeight: aggregatesTasks.qcWeight.total,
    bugQcWeight: aggregatesBugs.qcWeight.total,
    totalQcWeight: aggregatesAll.qcWeight.total,
    taskStoryPoints: aggregatesTasks.storyPoints.total,
    bugStoryPoints: aggregatesBugs.storyPoints.total,
    totalStoryPoints: aggregatesAll.storyPoints.total,
    gmsSprintCount: gmsSprintsSet.size,
  }

  // 2. Bugs
  const isQc = (name) => {
    const normalizedName = normalizePersonName(name)
    const normalizedQc = normalizePersonName(qcName)
    if (!normalizedName || !normalizedQc) return false
    if (normalizedName === normalizedQc) return true
    if (normalizedName.includes(normalizedQc) || normalizedQc.includes(normalizedName)) return true

    const emailLocalPart = normalizedQc.split('@')[0]
    const emailTokens = emailLocalPart.split(/[._-]+/).filter((token) => token.length >= 3)
    if (!normalizedQc.includes('@') || emailTokens.length === 0) return false
    const nameCompact = normalizedName.replace(/[^a-z0-9]/g, '')
    return emailTokens.every((token) => nameCompact.includes(token))
  }

  // Bug tôi đã log trong quý (tất cả trạng thái)
  const myLoggedBugs = quarterTasks.filter((t) =>
    t.type === 'Bug' && isQc(t.reporter)
  )

  // Bug đã fix (assigned QC là tôi và đã Released)
  const myFixedBugs = quarterTasks.filter((t) =>
    t.type === 'Bug' && isQc(t.assignedQC) && t.status === 'Released'
  )

  // 3. Automation Analysis for Released tasks in this Quarter (excluding RegressionTest)
  const releasedGmsAutoTasks = quarterTasks.filter((t) =>
    t.status === 'Released' &&
    t.type !== 'Bug' &&
    !isRegression(t) &&
    /^GMS\s+/i.test(String(t.sprint || '').trim())
  )

  const autoBySprint = new Map()
  let autoNoSprint = 0
  for (const task of releasedGmsAutoTasks) {
    if (!task.sprint) {
      autoNoSprint += 1
      continue
    }
    const groupKey = `${task.project || ''}\u0000${task.sprint}`
    if (!autoBySprint.has(groupKey)) {
      autoBySprint.set(groupKey, { project: task.project || '', sprint: task.sprint, total: 0, automation: 0 })
    }
    const row = autoBySprint.get(groupKey)
    row.total += 1
    if (isAutomation(task)) row.automation += 1
  }
  const autoSprints = [...autoBySprint.values()]
    .map((row) => ({ ...row, ratio: row.total ? Number(((row.automation / row.total) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => a.project.localeCompare(b.project) || a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: 'base' }))

  const autoTotal = releasedGmsAutoTasks.length
  const autoCount = releasedGmsAutoTasks.filter(isAutomation).length
  const automationAnalysis = {
    total: autoTotal,
    automation: autoCount,
    ratio: autoTotal ? Number(((autoCount / autoTotal) * 100).toFixed(1)) : 0,
    noSprint: autoNoSprint,
    sprints: autoSprints,
  }

  // 4. Regression Analysis for Released tasks in this Quarter
  const releasedGmsTasks = quarterTasks.filter((t) =>
    t.status === 'Released' &&
    t.type !== 'Bug' &&
    /^GMS\s+/i.test(String(t.sprint || '').trim())
  )

  const regBySprint = new Map()
  let regNoSprint = 0
  for (const task of releasedGmsTasks) {
    if (!task.sprint) {
      regNoSprint += 1
      continue
    }
    const groupKey = `${task.project || ''}\u0000${task.sprint}`
    if (!regBySprint.has(groupKey)) {
      regBySprint.set(groupKey, { project: task.project || '', sprint: task.sprint, total: 0, regressionTasks: 0 })
    }
    const row = regBySprint.get(groupKey)
    row.total += 1
    if (isRegression(task)) row.regressionTasks += 1
  }
  const regSprints = [...regBySprint.values()]
    .map((row) => ({ ...row, covered: row.regressionTasks > 0 }))
    .sort((a, b) => a.project.localeCompare(b.project) || a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: 'base' }))

  const regCoveredSprints = regSprints.filter((row) => row.covered).length
  const regressionAnalysis = {
    totalSprints: regSprints.length,
    coveredSprints: regCoveredSprints,
    regressionTasks: releasedGmsTasks.filter(isRegression).length,
    ratio: regSprints.length ? Number(((regCoveredSprints / regSprints.length) * 100).toFixed(1)) : 0,
    noSprint: regNoSprint,
    sprints: regSprints,
  }

  // 5. Clear Doc Analysis for Released BSC tasks in this Quarter
  const qDocs = getClearDocs({ quarter: selQuarter, year: selYear })
  const qTaskStatuses = getClearDocTaskStatuses()
  const taskToClearDocMap = new Map()
  for (const doc of qDocs) {
    for (const key of (doc.taskKeys || [])) {
      if (!taskToClearDocMap.has(key)) taskToClearDocMap.set(key, [])
      taskToClearDocMap.get(key).push(doc)
    }
  }

  let tasksClearedCount = 0
  let tasksNotNeededCount = 0
  let tasksPendingCount = 0
  for (const t of bscTasks) {
    if (taskToClearDocMap.has(t.key)) {
      tasksClearedCount++
    } else if (qTaskStatuses[t.key]?.status === 'not_needed') {
      tasksNotNeededCount++
    } else {
      tasksPendingCount++
    }
  }

  const totalThreads = qDocs.length
  const totalIssues = qDocs.reduce((sum, d) => sum + (Number(d.issueCount) || 1), 0)
  const avgIssuesPerThread = totalThreads > 0 ? Number((totalIssues / totalThreads).toFixed(1)) : 0
  const coverageRate = bscTasks.length > 0
    ? Number((((tasksClearedCount + tasksNotNeededCount) / bscTasks.length) * 100).toFixed(1))
    : 0

  // Sprint breakdown for Clear Doc
  const clearBySprint = new Map()
  for (const t of bscTasks) {
    if (!t.sprint) continue
    const groupKey = `${t.project || ''}\u0000${t.sprint}`
    if (!clearBySprint.has(groupKey)) {
      clearBySprint.set(groupKey, {
        project: t.project || '',
        sprint: t.sprint,
        totalTasks: 0,
        clearedTasks: 0,
        notNeededTasks: 0,
        pendingTasks: 0,
        threadCount: 0,
        issueCount: 0,
      })
    }
    const row = clearBySprint.get(groupKey)
    row.totalTasks++
    if (taskToClearDocMap.has(t.key)) {
      row.clearedTasks++
    } else if (qTaskStatuses[t.key]?.status === 'not_needed') {
      row.notNeededTasks++
    } else {
      row.pendingTasks++
    }
  }

  for (const d of qDocs) {
    if (!d.sprint) continue
    const groupKey = `${d.project || ''}\u0000${d.sprint}`
    if (clearBySprint.has(groupKey)) {
      const row = clearBySprint.get(groupKey)
      row.threadCount++
      row.issueCount += (Number(d.issueCount) || 1)
    }
  }

  const clearSprints = [...clearBySprint.values()]
    .map((row) => ({
      ...row,
      ratio: row.totalTasks > 0 ? Number((((row.clearedTasks + row.notNeededTasks) / row.totalTasks) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.project.localeCompare(b.project) || a.sprint.localeCompare(b.sprint, undefined, { numeric: true, sensitivity: 'base' }))

  const clearDocAnalysis = {
    totalThreads,
    totalIssues,
    avgIssuesPerThread,
    totalTasks: bscTasks.length,
    clearedTasks: tasksClearedCount,
    notNeededTasks: tasksNotNeededCount,
    pendingTasks: tasksPendingCount,
    coverageRate,
    sprints: clearSprints,
    docs: qDocs,
  }

  // 6. ITS Analysis for this Quarter
  const allIts = getItsTickets()
  const quarterIts = allIts.filter((t) => {
    const matchQ = String(t.quarter || '').toUpperCase() === String(selQuarter || '').toUpperCase()
    const matchY = Number(t.year) === Number(selYear)
    return matchQ && matchY
  })

  const isTicketOpen = (t) => ['open', 'to do', 'todo', 'waiting for support', 'waiting for customer', 'backlog', 'reopened'].includes(String(t.status || '').toLowerCase().trim())
  const isTicketReviewing = (t) => ['in review', 'reviewing', 'under review', 'testing', 'ready to test', 'in progress', 'pending'].includes(String(t.status || '').toLowerCase().trim())
  const isTicketResolved = (t) => ['done', 'resolved', 'closed', 'released', 'rejected', 'not reproducible', "won't do", 'cancelled'].includes(String(t.status || '').toLowerCase().trim())
  const isTicketBreached = (t) => Boolean(t.slaResolutionBreached || t.slaFirstResponseBreached)

  const itsTotal = quarterIts.length
  const itsOpenCount = quarterIts.filter(isTicketOpen).length
  const itsReviewingCount = quarterIts.filter(isTicketReviewing).length
  const itsResolvedCount = quarterIts.filter(isTicketResolved).length
  const itsResolvedRate = itsTotal > 0 ? Math.round((itsResolvedCount / itsTotal) * 100) : 0
  const itsBreachedCount = quarterIts.filter(isTicketBreached).length
  const itsSlaComplianceRate = itsTotal > 0 ? Math.round(((itsTotal - itsBreachedCount) / itsTotal) * 100) : 100
  const itsResBreachedCount = quarterIts.filter((t) => Boolean(t.slaResolutionBreached)).length
  const itsRespBreachedCount = quarterIts.filter((t) => Boolean(t.slaFirstResponseBreached)).length
  const itsLinkedBugsCount = quarterIts.reduce((sum, t) => sum + (Array.isArray(t.linkedBugs) ? t.linkedBugs.length : 0), 0)

  const itsByClassify = {}
  for (const t of quarterIts) {
    const c = t.classify || 'Chưa phân loại'
    itsByClassify[c] = (itsByClassify[c] || 0) + 1
  }

  const itsByStatus = {}
  for (const t of quarterIts) {
    const s = t.status || 'Khác'
    itsByStatus[s] = (itsByStatus[s] || 0) + 1
  }

  const itsAnalysis = {
    total: itsTotal,
    openCount: itsOpenCount,
    reviewingCount: itsReviewingCount,
    resolvedCount: itsResolvedCount,
    resolvedRate: itsResolvedRate,
    breachedCount: itsBreachedCount,
    slaComplianceRate: itsSlaComplianceRate,
    slaResolutionBreachedCount: itsResBreachedCount,
    slaFirstResponseBreachedCount: itsRespBreachedCount,
    linkedBugsCount: itsLinkedBugsCount,
    byClassify: itsByClassify,
    byStatus: itsByStatus,
    tickets: quarterIts,
  }

  // 7. Tempo Log Work & Plan vs Actual Analysis for this Quarter (Toàn diện từ mọi nguồn)
  const qRange = getQuarterDateRange(selQuarter, selYear)
  const qCacheKey = `${selQuarter}-${selYear}`
  const nowMs = Date.now()
  const force = req.query.force === '1' || req.query.force === 'true'

  let tempoWorklogs = []
  const cachedTempo = tempoQuarterCache.get(qCacheKey)
  if (!force && cachedTempo && nowMs - cachedTempo.timestamp < 180000) {
    tempoWorklogs = cachedTempo.data
  } else {
    try {
      tempoWorklogs = await fetchTempoWorklogs(qRange.from, qRange.to)
      tempoQuarterCache.set(qCacheKey, { data: tempoWorklogs, timestamp: nowMs })
    } catch (err) {
      console.error('Không thể lấy Tempo worklogs của quý:', err.message)
      tempoWorklogs = []
    }
  }

  let tempoAllocations = []
  const cachedAlloc = tempoQuarterAllocCache.get(qCacheKey)
  if (!force && cachedAlloc && nowMs - cachedAlloc.timestamp < 180000) {
    tempoAllocations = cachedAlloc.data
  } else {
    try {
      tempoAllocations = await fetchTempoAllocations(qRange.from, qRange.to)
      tempoQuarterAllocCache.set(qCacheKey, { data: tempoAllocations, timestamp: nowMs })
    } catch (err) {
      console.error('Không thể lấy Tempo allocations của quý:', err.message)
      tempoAllocations = []
    }
  }

  // Tổng giờ Actual & Planned từ toàn bộ nguồn
  const totalActualSeconds = tempoWorklogs.reduce((sum, w) => sum + (Number(w.timeSpentSeconds) || 0), 0)
  const totalActualHours = Math.round((totalActualSeconds / 3600) * 10) / 10

  const totalPlannedSeconds = tempoAllocations.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0)
  const totalPlannedHours = Math.round((totalPlannedSeconds / 3600) * 10) / 10

  const completionRate = totalPlannedHours > 0
    ? Math.round((totalActualHours / totalPlannedHours) * 100)
    : 0
  const diffHours = Math.round((totalActualHours - totalPlannedHours) * 10) / 10

  // Phân tích theo từng dự án (Project Breakdown: GOP, SSD, AW, ITS...)
  const projectMap = new Map()
  for (const item of tempoAllocations) {
    const pKey = item.planItem?.project?.key || item.planItem?.key?.split('-')[0] || 'Khác'
    if (!projectMap.has(pKey)) {
      projectMap.set(pKey, { project: pKey, plannedSec: 0, actualSec: 0 })
    }
    projectMap.get(pKey).plannedSec += (Number(item.seconds) || 0)
  }
  for (const w of tempoWorklogs) {
    const pKey = w.issue?.projectKey || w.issue?.key?.split('-')[0] || 'Khác'
    if (!projectMap.has(pKey)) {
      projectMap.set(pKey, { project: pKey, plannedSec: 0, actualSec: 0 })
    }
    projectMap.get(pKey).actualSec += (Number(w.timeSpentSeconds) || 0)
  }

  const projectsBreakdown = [...projectMap.values()].map((p) => {
    const plannedHours = Math.round((p.plannedSec / 3600) * 10) / 10
    const actualHours = Math.round((p.actualSec / 3600) * 10) / 10
    const pDiff = Math.round((actualHours - plannedHours) * 10) / 10
    const rate = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : (actualHours > 0 ? 100 : 0)
    return {
      project: p.project,
      plannedHours,
      actualHours,
      diffHours: pDiff,
      completionRate: rate,
    }
  }).sort((a, b) => b.plannedHours - a.plannedHours || b.actualHours - a.actualHours)

  // Phân tích theo từng tháng trong Quý (Planned vs Actual cả 3 tháng)
  const monthlyBreakdown = qRange.months.map((mObj) => {
    const pAlloc = tempoAllocations.filter((item) => (item.start || item.startDate || '').startsWith(mObj.key))
    const pSec = pAlloc.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0)
    const pHours = Math.round((pSec / 3600) * 10) / 10

    const aLogs = tempoWorklogs.filter((w) => (w.started || '').startsWith(mObj.key))
    const aSec = aLogs.reduce((sum, w) => sum + (Number(w.timeSpentSeconds) || 0), 0)
    const aHours = Math.round((aSec / 3600) * 10) / 10

    const mRate = pHours > 0 ? Math.round((aHours / pHours) * 100) : 0
    const mDiff = Math.round((aHours - pHours) * 10) / 10

    return {
      key: mObj.key,
      label: mObj.label,
      plannedSeconds: pSec,
      plannedHours: pHours,
      actualSeconds: aSec,
      actualHours: aHours,
      completionRate: mRate,
      diffHours: mDiff,
      worklogsCount: aLogs.length,
    }
  })

  // Hợp nhất toàn bộ các task / work items từ cả Plan và Actual của mọi nguồn
  const itemMap = new Map()
  for (const item of tempoAllocations) {
    const k = item.planItem?.key || (item.planItem?.id ? String(item.planItem.id) : null)
    if (!k) continue
    if (!itemMap.has(k)) {
      itemMap.set(k, {
        key: k,
        summary: item.description || item.planItem?.summary || '',
        project: k.split('-')[0],
        planSeconds: 0,
        loggedSeconds: 0,
      })
    }
    const entry = itemMap.get(k)
    entry.planSeconds += (Number(item.seconds) || 0)
    if (item.description && !entry.summary) entry.summary = item.description
  }

  for (const w of tempoWorklogs) {
    const k = w.issue?.key
    if (!k) continue
    if (!itemMap.has(k)) {
      itemMap.set(k, {
        key: k,
        summary: w.issue?.summary || '',
        project: w.issue?.projectKey || k.split('-')[0],
        planSeconds: 0,
        loggedSeconds: 0,
      })
    }
    const entry = itemMap.get(k)
    entry.loggedSeconds += (Number(w.timeSpentSeconds) || 0)
    if (w.issue?.summary && !entry.summary) entry.summary = w.issue.summary
  }

  let overloggedTasksCount = 0
  let totalOverloggedSeconds = 0
  let onTrackTasksCount = 0
  let missingPlanTasksCount = 0

  const allItemsList = [...itemMap.values()].map((item) => {
    const plan = item.planSeconds
    const logged = item.loggedSeconds
    let statusType = 'on_track'

    if (plan === 0) {
      missingPlanTasksCount++
      statusType = 'missing_plan'
    } else if (logged > plan) {
      overloggedTasksCount++
      totalOverloggedSeconds += (logged - plan)
      statusType = 'overlogged'
    } else {
      onTrackTasksCount++
      statusType = 'on_track'
    }

    const diffSeconds = logged - plan
    const pct = plan > 0 ? Math.round((logged / plan) * 100) : null

    return {
      key: item.key,
      summary: item.summary || '',
      project: item.project || '',
      planSeconds: plan,
      planHours: Math.round((plan / 3600) * 10) / 10,
      loggedSeconds: logged,
      loggedHours: Math.round((logged / 3600) * 10) / 10,
      diffHours: Math.round((diffSeconds / 3600) * 10) / 10,
      pct,
      statusType,
    }
  })

  // Sắp xếp: Vượt plan lên trước, sau đó là actual hours giảm dần
  allItemsList.sort((a, b) => {
    if (a.statusType === 'overlogged' && b.statusType !== 'overlogged') return -1
    if (b.statusType === 'overlogged' && a.statusType !== 'overlogged') return 1
    return (b.loggedSeconds || 0) - (a.loggedSeconds || 0)
  })

  const totalOverloggedHours = Math.round((totalOverloggedSeconds / 3600) * 10) / 10

  const tempoAnalysis = {
    totalPlannedSeconds,
    totalPlannedHours,
    totalActualSeconds,
    totalActualHours,
    totalLoggedSeconds: totalActualSeconds,
    totalLoggedHours: totalActualHours,
    taskTotalPlanHours: totalPlannedHours,
    taskTotalLoggedHours: totalActualHours,
    completionRate,
    planCompletionRate: completionRate,
    diffHours,
    totalOverloggedHours,
    dateRange: { from: qRange.from, to: qRange.to },
    months: monthlyBreakdown,
    projects: projectsBreakdown,
    overloggedCount: overloggedTasksCount,
    onTrackCount: onTrackTasksCount,
    missingPlanCount: missingPlanTasksCount,
    tasks: allItemsList,
    tempoReportUrl: `https://jira.vexere.net/secure/Tempo.jspa#/reports/planned-vs-actual/bc868685-a3b5-4fba-b024-d57f97612057?chartType=DONUT&from=${qRange.from}&groupBy=project&subType=MONTH&to=${qRange.to}&type=FIXED&worker=JIRAUSER14615`,
  }

  totals.itsTotal = itsAnalysis.total
  totals.itsResolved = itsAnalysis.resolvedCount
  totals.itsResolvedRate = itsAnalysis.resolvedRate
  totals.itsBreached = itsAnalysis.breachedCount
  totals.tempoLoggedHours = tempoAnalysis.totalActualHours
  totals.tempoPlanHours = tempoAnalysis.totalPlannedHours
  totals.tempoCompletionRate = tempoAnalysis.completionRate

  res.json({
    quarter: selQuarter,
    year: selYear,
    quarterLabel: `${selQuarter}-${selYear}`,
    availableQuarters,
    qcName,
    bscTasks,
    bugIssues,
    aggregates: aggregatesTasks,
    aggregatesTasks,
    aggregatesBugs,
    aggregatesAll,
    totals,
    myLoggedBugs,
    myFixedBugs,
    automationAnalysis,
    regressionAnalysis,
    clearDocAnalysis,
    itsAnalysis,
    tempoAnalysis,
  })
})


app.get('/api/filters', (req, res) => {
  const all = getTasks().map(decorate)
  const selectedProjects = splitMultiValue(req.query.project)
  const t = selectedProjects.length ? all.filter((x) => selectedProjects.includes(x.project)) : all
  const uniq = (arr) => [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ''))]

  // Labels are fixed to these filter categories (matched with includes, case-insensitive)
  const FIXED_LABELS = ['Sprint-Goal', 'RegressionTest', 'AutomationTest', 'ĐộtXuất']

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
