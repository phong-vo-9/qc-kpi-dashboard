// Fetch QC tasks from Jira Server / Data Center (REST API v2).
// Read-only. Supports basic auth (user + pass) or a Personal Access Token.

const STATUSES = ['Todo', 'In Progress', 'Ready to Test', 'Testing', 'Done', 'Released']

const FIELDS = [
  'summary', 'status', 'priority', 'assignee', 'labels', 'components', 'project',
  'created', 'updated', 'duedate', 'subtasks', 'customfield_10503', 'customfield_13212',
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
  return `project = "${project}" AND issuetype = Task AND status in (${statuses}) ORDER BY created DESC`
}

function normalize(issue) {
  const f = issue.fields || {}
  const qc = f.customfield_10503
  return {
    key: issue.key,
    summary: f.summary || '',
    status: f.status?.name || '',
    priority: f.priority?.name || '',
    assignee: f.assignee?.displayName || '',
    assignedQC: qc?.displayName || qc?.name || '',
    qcWeight: Number(f.customfield_13212) || 0,
    labels: f.labels || [],
    project: f.project?.key || '',
    component: (f.components || []).map((c) => c.name).join(', '),
    created: f.created || null,
    updated: f.updated || null,
    duedate: f.duedate || null,
    bugCount: (f.subtasks || []).length,
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
      // Filter by Assigned QC (customfield_10503) in code — robust across Jira user-field formats.
      const qc = issue.fields?.customfield_10503
      if (e.qcName) {
        if (!qc) continue
        const queryName = e.qcName.toLowerCase()
        const qcDisplayName = (qc.displayName || '').toLowerCase()
        const qcUsername = (qc.name || '').toLowerCase()
        const qcEmail = (qc.emailAddress || '').toLowerCase()

        const matches =
          qcDisplayName.includes(queryName) ||
          qcUsername.includes(queryName) ||
          qcEmail.includes(queryName) ||
          queryName.includes(qcDisplayName) ||
          queryName.includes(qcUsername)

        if (!matches) continue
      }

      out.push(normalize(issue))
    }

    startAt += maxResults
    if (startAt >= (data.total || 0)) break
  }

  return out
}
