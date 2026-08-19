// Fetch QC tasks from Jira Server / Data Center (REST API v2).
// Read-only. Supports basic auth (user + pass) or a Personal Access Token.

const STATUSES = ['Todo', 'In Progress', 'Ready to Test', 'Testing', 'Done', 'Released']

const FIELDS = [
  'summary', 'status', 'priority', 'assignee', 'labels', 'components', 'project',
  'created', 'updated', 'duedate', 'subtasks', 'customfield_10503', 'customfield_13212',
  'customfield_10109', 'customfield_10107', 'issuetype', 'reporter', 'issuelinks', 'customfield_11204',
]

function env() {
  return {
    url: (process.env.JIRA_URL || 'https://jira.vexere.net').replace(/\/$/, ''),
    user: process.env.JIRA_USER,
    pass: process.env.JIRA_PASS,
    token: process.env.JIRA_TOKEN,
    project: process.env.JIRA_PROJECT || 'GOP',
    qcName: process.env.JIRA_QC_NAME || 'Nguyễn Phú Thành',
  }
}

function authHeader(e) {
  if (e.token) return `Bearer ${e.token}`
  if (e.user && e.pass) return `Basic ${Buffer.from(`${e.user}:${e.pass}`).toString('base64')}`
  throw new Error('Thiếu thông tin đăng nhập Jira. Hãy đặt JIRA_USER + JIRA_PASS (hoặc JIRA_TOKEN) trong file .env')
}

function buildJql(project) {
  const statuses = STATUSES.map((s) => `"${s}"`).join(', ')
  return `project = "${project}" AND issuetype in (Task, Bug, Support) AND status in (${statuses}) ORDER BY created DESC`
}

export function parseSprint(sprintFieldVal) {
  if (!sprintFieldVal) return ''
  const arr = Array.isArray(sprintFieldVal) ? sprintFieldVal : [sprintFieldVal]
  for (let i = arr.length - 1; i >= 0; i--) {
    const s = arr[i]
    if (typeof s === 'string') {
      const match = /name=([^,\]]+)/.exec(s)
      if (match) return match[1].trim()
    } else if (s && typeof s === 'object' && s.name) {
      return s.name
    }
  }
  return ''
}

function parseNumberField(value) {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') return Number(value) || 0
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseNumberField(item)
      if (parsed) return parsed
    }
    return 0
  }
  if (typeof value === 'object') {
    return parseNumberField(value.value ?? value.customfieldvalue ?? value.customfieldvalues)
  }
  return 0
}

function normalize(issue, subtasksMap = {}) {
  const f = issue.fields || {}
  const qc = f.customfield_10503
  const links = f.issuelinks || []
  const linkedTask = links.map((l) => (l.inwardIssue || l.outwardIssue)?.key).filter(Boolean)[0] || ''
  return {
    key: issue.key,
    summary: f.summary || '',
    status: f.status?.name || '',
    priority: f.priority?.name || '',
    assignee: f.assignee?.displayName || '',
    assignedQC: qc?.displayName || qc?.name || '',
    qcWeight: Number(f.customfield_13212) || 0,
    storyPoints: parseNumberField(f.customfield_10109),
    labels: f.labels || [],
    project: f.project?.key || '',
    component: (f.components || []).map((c) => c.name).join(', '),
    created: f.created || null,
    updated: f.updated || null,
    duedate: f.duedate || null,
    bugCount: subtasksMap[issue.key] || 0,
    sprint: parseSprint(f.customfield_10107),
    type: f.issuetype?.name || 'Task',
    enddate: f.customfield_11204 || null,
    reporter: f.reporter?.displayName || '',
    linkedTask,
  }
}

async function fetchSubtasksMap(project, e, headers) {
  const jql = `project = "${project}" AND reporter = "${e.qcName}"`
  const subtasksMap = {}
  let startAt = 0
  const maxResults = 100

  while (true) {
    const res = await fetch(`${e.url}/rest/api/2/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jql,
        fields: ['parent'],
        startAt,
        maxResults,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Jira subtasks fetch error ${res.status}: ${text.slice(0, 300)}`)
    }
    const data = await res.json()
    for (const issue of data.issues || []) {
      const parentKey = issue.fields?.parent?.key
      if (parentKey) {
        subtasksMap[parentKey] = (subtasksMap[parentKey] || 0) + 1
      }
    }
    startAt += maxResults
    if (startAt >= (data.total || 0)) break
  }
  return subtasksMap
}

/**
 * Fetch the currently ACTIVE sprint for a project from Jira Agile API.
 * Only returns sprints with state=active (i.e. today is within the sprint window).
 * Returns null if unavailable.
 */
export async function fetchActiveSprint(projectKey) {
  const e = env()
  const headers = {
    Authorization: authHeader(e),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  try {
    // 1. Find boards for this project
    const boardRes = await fetch(
      `${e.url}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&maxResults=50`,
      { headers }
    )
    if (!boardRes.ok) return null
    const boardData = await boardRes.json()
    const boards = boardData.values || []
    if (!boards.length) return null

    // 2. Only look for state=active sprints — never future or closed
    for (const board of boards) {
      const sprintRes = await fetch(
        `${e.url}/rest/agile/1.0/board/${board.id}/sprint?state=active&maxResults=10`,
        { headers }
      )
      if (!sprintRes.ok) continue
      const sprintData = await sprintRes.json()
      const found = (sprintData.values || [])[0] // take the first active sprint
      if (found) {
        return {
          id: found.id,
          name: found.name,
          state: found.state,           // will be 'active'
          startDate: found.startDate || null,
          endDate: found.endDate || null,
          completeDate: found.completeDate || null,
          goal: found.goal || '',
          boardName: board.name,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function fetchTasks(projectOverride) {
  const e = env()
  const project = projectOverride || e.project
  const jql = buildJql(project)
  const headers = {
    Authorization: authHeader(e),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  let subtasksMap = {}
  try {
    subtasksMap = await fetchSubtasksMap(project, e, headers)
  } catch (err) {
    console.error('Không thể lấy danh sách bug subtasks:', err.message)
  }

  const out = []
  let startAt = 0
  const maxResults = 100

  while (true) {
    const res = await fetch(`${e.url}/rest/api/2/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jql, fields: FIELDS, startAt, maxResults }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Jira ${res.status}: ${text.slice(0, 300)}`)
    }
    const data = await res.json()

    for (const issue of data.issues || []) {
      // Filter strictly by Assigned QC (customfield_10503) only.
      // We do NOT fall back to assignee — that field represents who does the work,
      // not who did QC. Falling back caused tasks like AW-177 (where the developer
      // happened to share the QC's name as assignee) to appear incorrectly.
      const qc = issue.fields?.customfield_10503
      if (e.qcName) {
        const queryName = e.qcName.toLowerCase()
        let matches = false

        if (qc) {
          if (typeof qc === 'string') {
            // Some Jira Server instances return the field as a plain email string
            matches = qc.toLowerCase().includes(queryName) || queryName.includes(qc.toLowerCase())
          } else if (typeof qc === 'object') {
            // Normal user object: {displayName, name, emailAddress}
            const qcDisplayName = (qc.displayName || '').toLowerCase()
            const qcUsername = (qc.name || '').toLowerCase()
            const qcEmail = (qc.emailAddress || '').toLowerCase()
            matches =
              qcDisplayName.includes(queryName) ||
              qcUsername.includes(queryName) ||
              qcEmail.includes(queryName) ||
              queryName.includes(qcDisplayName) ||
              queryName.includes(qcUsername)
          }
        }

        if (!matches) continue
      }

      out.push(normalize(issue, subtasksMap))
    }

    startAt += maxResults
    if (startAt >= (data.total || 0)) break
  }

  return out
}
