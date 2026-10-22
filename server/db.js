// SQLite cache of fetched Jira tasks.
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'data.db'))
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  key TEXT PRIMARY KEY,
  summary TEXT, status TEXT, priority TEXT, assignee TEXT, assignedQC TEXT,
  qcWeight REAL, storyPoints REAL, environment TEXT, labels TEXT, project TEXT, component TEXT,
  created TEXT, updated TEXT, duedate TEXT, bugCount INTEGER,
  sprint TEXT, type TEXT, enddate TEXT, reporter TEXT, linkedTask TEXT
);
CREATE TABLE IF NOT EXISTS bug_backlog (
  key TEXT PRIMARY KEY,
  summary TEXT, status TEXT, priority TEXT, assignee TEXT, assignedQC TEXT,
  qcWeight REAL, storyPoints REAL, environment TEXT, labels TEXT, project TEXT, component TEXT,
  created TEXT, updated TEXT, duedate TEXT, bugCount INTEGER,
  sprint TEXT, type TEXT, enddate TEXT, reporter TEXT, linkedTask TEXT
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS clear_docs (
  id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  sprint TEXT,
  quarter TEXT,
  year INTEGER,
  task_keys TEXT NOT NULL,
  thread_title TEXT NOT NULL,
  thread_url TEXT,
  content TEXT NOT NULL,
  issue_count INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS clear_doc_task_status (
  task_key TEXT PRIMARY KEY,
  status TEXT DEFAULT 'not_needed',
  note TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS improve_docs (
  id TEXT PRIMARY KEY,
  origin_task_key TEXT NOT NULL,
  target_task_key TEXT,
  slack_url TEXT,
  content TEXT NOT NULL,
  resolution TEXT,
  project TEXT NOT NULL,
  sprint TEXT,
  quarter TEXT,
  year INTEGER,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS its_tickets (
  key TEXT PRIMARY KEY,
  summary TEXT,
  title TEXT,
  link TEXT,
  project TEXT,
  type TEXT,
  priority TEXT,
  status TEXT,
  status_category TEXT,
  resolution TEXT,
  assignee TEXT,
  assignee_username TEXT,
  reporter TEXT,
  labels TEXT,
  created TEXT,
  updated TEXT,
  resolved TEXT,
  component TEXT,
  classify TEXT,
  sla_first_response TEXT,
  sla_first_response_remaining TEXT,
  sla_first_response_breached INTEGER DEFAULT 0,
  sla_resolution TEXT,
  sla_resolution_remaining TEXT,
  sla_resolution_breached INTEGER DEFAULT 0,
  linked_bugs TEXT,
  quarter TEXT,
  year INTEGER,
  imported_at TEXT
);
CREATE TABLE IF NOT EXISTS non_its_feedbacks (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  project TEXT DEFAULT 'GOP',
  title TEXT NOT NULL,
  slack_url TEXT,
  slack_title TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'Đã xử lý / phản hồi kết luận',
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS release_history (
  id TEXT PRIMARY KEY,
  team_name TEXT,
  task_keys TEXT,
  mention_tag TEXT,
  notification_msg TEXT,
  scope_msg TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  created_date TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  links TEXT DEFAULT '[]',
  solution TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  project TEXT DEFAULT 'GOP',
  assignee TEXT,
  created_at TEXT,
  updated_at TEXT
);
`)

try { db.exec('ALTER TABLE tasks ADD COLUMN sprint TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN type TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN enddate TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN reporter TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN linkedTask TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN storyPoints REAL;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN environment TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN sprint TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN type TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN enddate TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN reporter TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN linkedTask TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN storyPoints REAL;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN environment TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN planSeconds REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN loggedSeconds REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN planSeconds REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE bug_backlog ADD COLUMN loggedSeconds REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE its_tickets ADD COLUMN sla_first_response_detail TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE its_tickets ADD COLUMN sla_resolution_detail TEXT;'); } catch (e) {}

const ISSUE_COLUMNS = 'key,summary,status,priority,assignee,assignedQC,qcWeight,storyPoints,environment,labels,project,component,created,updated,duedate,bugCount,sprint,type,enddate,reporter,linkedTask,planSeconds,loggedSeconds'
const ISSUE_VALUES = '@key,@summary,@status,@priority,@assignee,@assignedQC,@qcWeight,@storyPoints,@environment,@labels,@project,@component,@created,@updated,@duedate,@bugCount,@sprint,@type,@enddate,@reporter,@linkedTask,@planSeconds,@loggedSeconds'

const insertTasks = db.prepare(`
INSERT INTO tasks (${ISSUE_COLUMNS})
VALUES (${ISSUE_VALUES})
`)

const insertBugBacklog = db.prepare(`
INSERT INTO bug_backlog (${ISSUE_COLUMNS})
VALUES (${ISSUE_VALUES})
`)

function persistIssues(table, rows, projectFilter) {
  const insert = table === 'tasks' ? insertTasks : insertBugBacklog
  const tx = db.transaction((items) => {
    if (projectFilter) {
      db.prepare(`DELETE FROM ${table} WHERE project = ?`).run(projectFilter)
    } else {
      db.prepare(`DELETE FROM ${table}`).run()
    }
    for (const r of items) {
      insert.run({
        ...r,
        storyPoints: Number(r.storyPoints) || 0,
        environment: r.environment || '',
        labels: JSON.stringify(r.labels || []),
        type: r.type || 'Task',
        enddate: r.enddate || null,
        reporter: r.reporter || '',
        linkedTask: r.linkedTask || '',
        planSeconds: Number(r.planSeconds) || 0,
        loggedSeconds: Number(r.loggedSeconds) || 0,
      })
    }
  })
  tx(rows)
  setMeta('lastRefresh', new Date().toISOString())
}

export function setMeta(k, v) {
  db.prepare('INSERT INTO meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=?').run(k, v, v)
}

export function getMeta(k) {
  return db.prepare('SELECT v FROM meta WHERE k=?').get(k)?.v || null
}

// Replace the cache with the freshly fetched set (drops stale tasks too).
export function saveTasks(tasks, projectFilter) {
  persistIssues('tasks', tasks, projectFilter)
}

export function saveBugBacklog(tasks, projectFilter) {
  persistIssues('bug_backlog', tasks, projectFilter)
}

export function getTasks() {
  return db.prepare('SELECT * FROM tasks').all().map((r) => ({ ...r, labels: JSON.parse(r.labels || '[]') }))
}

export function getBugBacklog() {
  return db.prepare('SELECT * FROM bug_backlog').all().map((r) => ({ ...r, labels: JSON.parse(r.labels || '[]') }))
}

export function getClearDocs(filters = {}) {
  let query = 'SELECT * FROM clear_docs'
  const conditions = []
  const params = []

  if (filters.project) {
    conditions.push('project = ?')
    params.push(filters.project)
  }
  if (filters.quarter) {
    conditions.push('quarter = ?')
    params.push(filters.quarter)
  }
  if (filters.year) {
    conditions.push('year = ?')
    params.push(Number(filters.year))
  }
  if (filters.sprint) {
    conditions.push('sprint = ?')
    params.push(filters.sprint)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY created_at DESC'

  const rows = db.prepare(query).all(...params)
  return rows.map((r) => ({
    id: r.id,
    project: r.project,
    sprint: r.sprint,
    quarter: r.quarter,
    year: r.year,
    taskKeys: JSON.parse(r.task_keys || '[]'),
    threadTitle: r.thread_title,
    threadUrl: r.thread_url,
    content: r.content,
    issueCount: r.issue_count || 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function saveClearDoc(doc) {
  const stmt = db.prepare(`
    INSERT INTO clear_docs (
      id, project, sprint, quarter, year, task_keys, thread_title, thread_url, content, issue_count, created_at, updated_at
    ) VALUES (
      @id, @project, @sprint, @quarter, @year, @task_keys, @thread_title, @thread_url, @content, @issue_count, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      project = @project,
      sprint = @sprint,
      quarter = @quarter,
      year = @year,
      task_keys = @task_keys,
      thread_title = @thread_title,
      thread_url = @thread_url,
      content = @content,
      issue_count = @issue_count,
      updated_at = @updated_at
  `)

  stmt.run({
    id: doc.id,
    project: doc.project || 'GOP',
    sprint: doc.sprint || '',
    quarter: doc.quarter || '',
    year: doc.year ? Number(doc.year) : null,
    task_keys: JSON.stringify(doc.taskKeys || []),
    thread_title: doc.threadTitle || '',
    thread_url: doc.threadUrl || '',
    content: doc.content || '',
    issue_count: Number(doc.issueCount) || 1,
    created_at: doc.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export function deleteClearDoc(id) {
  return db.prepare('DELETE FROM clear_docs WHERE id = ?').run(id)
}

export function getClearDocTaskStatuses() {
  const rows = db.prepare('SELECT * FROM clear_doc_task_status').all()
  const map = {}
  for (const r of rows) {
    map[r.task_key] = { status: r.status, note: r.note, updatedAt: r.updated_at }
  }
  return map
}

export function setClearDocTaskStatus(taskKey, status = 'not_needed', note = '') {
  return db.prepare(`
    INSERT INTO clear_doc_task_status (task_key, status, note, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(task_key) DO UPDATE SET
      status = excluded.status,
      note = excluded.note,
      updated_at = excluded.updated_at
  `).run(taskKey, status, note, new Date().toISOString())
}

export function deleteClearDocTaskStatus(taskKey) {
  return db.prepare('DELETE FROM clear_doc_task_status WHERE task_key = ?').run(taskKey)
}

export function getImproveDocs(filters = {}) {
  let query = 'SELECT * FROM improve_docs'
  const conditions = []
  const params = []

  if (filters.project && filters.project !== 'all') {
    conditions.push('project = ?')
    params.push(filters.project)
  }
  if (filters.quarter && filters.quarter !== 'all') {
    conditions.push('quarter = ?')
    params.push(filters.quarter)
  }
  if (filters.year && filters.year !== 'all') {
    conditions.push('year = ?')
    params.push(Number(filters.year))
  }
  if (filters.sprint && filters.sprint !== 'all') {
    conditions.push('sprint = ?')
    params.push(filters.sprint)
  }
  if (filters.hasTargetCard === 'yes') {
    conditions.push("target_task_key IS NOT NULL AND TRIM(target_task_key) != ''")
  } else if (filters.hasTargetCard === 'no') {
    conditions.push("(target_task_key IS NULL OR TRIM(target_task_key) = '')")
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY created_at DESC'

  const rows = db.prepare(query).all(...params)
  return rows.map((r) => ({
    id: r.id,
    originTaskKey: r.origin_task_key,
    targetTaskKey: r.target_task_key || '',
    slackUrl: r.slack_url || '',
    content: r.content,
    resolution: r.resolution || '',
    project: r.project,
    sprint: r.sprint,
    quarter: r.quarter,
    year: r.year,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function saveImproveDoc(doc) {
  const stmt = db.prepare(`
    INSERT INTO improve_docs (
      id, origin_task_key, target_task_key, slack_url, content, resolution, project, sprint, quarter, year, created_at, updated_at
    ) VALUES (
      @id, @origin_task_key, @target_task_key, @slack_url, @content, @resolution, @project, @sprint, @quarter, @year, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      origin_task_key = @origin_task_key,
      target_task_key = @target_task_key,
      slack_url = @slack_url,
      content = @content,
      resolution = @resolution,
      project = @project,
      sprint = @sprint,
      quarter = @quarter,
      year = @year,
      updated_at = @updated_at
  `)

  stmt.run({
    id: doc.id,
    origin_task_key: doc.originTaskKey || '',
    target_task_key: doc.targetTaskKey || '',
    slack_url: doc.slackUrl || '',
    content: doc.content || '',
    resolution: doc.resolution || '',
    project: doc.project || 'GOP',
    sprint: doc.sprint || '',
    quarter: doc.quarter || '',
    year: doc.year ? Number(doc.year) : null,
    created_at: doc.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export function updateImproveDocTargetCard(id, targetTaskKey) {
  return db.prepare(`
    UPDATE improve_docs
    SET target_task_key = ?, updated_at = ?
    WHERE id = ?
  `).run(targetTaskKey || '', new Date().toISOString(), id)
}

export function deleteImproveDoc(id) {
  return db.prepare('DELETE FROM improve_docs WHERE id = ?').run(id)
}

// Seed default improve docs from initial screenshot if empty
try {
  const countImprove = db.prepare('SELECT count(*) as c FROM improve_docs').get().c
  if (countImprove === 0) {
    const seedItems = [
      {
        id: 'imp_seed_1',
        originTaskKey: 'GOP-3986',
        targetTaskKey: 'GOP-4394',
        slackUrl: '',
        content: 'Lịch sử tạo/thu hồi yêu cầu Sửa cước hiển thị thừa tiền hủy, tiền hoàn dù không có hai field này khi tạo yêu cầu.',
        resolution: 'Tách card riêng để xử lý.',
        project: 'GOP',
        sprint: 'GMS 08/09/2026 - 21/09/2026',
        quarter: 'Q3',
        year: 2026,
      },
      {
        id: 'imp_seed_2',
        originTaskKey: 'GOP-3986',
        targetTaskKey: 'GOP-4395',
        slackUrl: '',
        content: 'Lịch sử yêu cầu giao nhận tận nơi bỏ trống loại yêu cầu (Hủy lấy/giao, Sửa thông tin lấy/giao), đồng thời thừa tiền hủy, tiền hoàn.',
        resolution: 'Tách card riêng để xử lý.',
        project: 'GOP',
        sprint: 'GMS 08/09/2026 - 21/09/2026',
        quarter: 'Q3',
        year: 2026,
      },
      {
        id: 'imp_seed_3',
        originTaskKey: 'GOP-4018',
        targetTaskKey: 'GOP-4363',
        slackUrl: '',
        content: 'Chuyển phơi thành công nhưng không chuyển Booking Sheet sang chuyến mới để kiểm tra và thao tác tiếp.',
        resolution: 'Tạm bypass, fix sau.',
        project: 'GOP',
        sprint: 'GMS 08/09/2026 - 21/09/2026',
        quarter: 'Q3',
        year: 2026,
      },
      {
        id: 'imp_seed_4',
        originTaskKey: 'GOP-4018',
        targetTaskKey: 'GOP-4365',
        slackUrl: '',
        content: 'Phơi nhúng trên BMS chưa cập nhật cấu hình hiển thị sau khi nhấn Làm mới; hiện phải clear cache.',
        resolution: 'Improve cơ chế đồng bộ sau.',
        project: 'GOP',
        sprint: 'GMS 08/09/2026 - 21/09/2026',
        quarter: 'Q3',
        year: 2026,
      },
      {
        id: 'imp_seed_5',
        originTaskKey: 'GOP-4348',
        targetTaskKey: '',
        slackUrl: '',
        content: 'Trạng thái cuộc gọi trong chi tiết đơn hàng chưa lấy màu nền như ngoài bảng hàng.',
        resolution: 'UI enhance sau.',
        project: 'GOP',
        sprint: 'GMS 08/09/2026 - 21/09/2026',
        quarter: 'Q3',
        year: 2026,
      },
      {
        id: 'imp_seed_6',
        originTaskKey: 'GOP-4348',
        targetTaskKey: '',
        slackUrl: '',
        content: 'Cần bổ sung cách hiển thị khi nội dung trạng thái cuộc gọi quá dài.',
        resolution: 'UI enhance sau.',
        project: 'GOP',
        sprint: 'GMS 08/09/2026 - 21/09/2026',
        quarter: 'Q3',
        year: 2026,
      },
    ]
    for (const item of seedItems) {
      saveImproveDoc(item)
    }
  }
} catch (e) {
  console.error('Error seeding improve_docs:', e)
}

const insertItsTicket = db.prepare(`
  INSERT INTO its_tickets (
    key, summary, title, link, project, type, priority, status, status_category, resolution,
    assignee, assignee_username, reporter, labels, created, updated, resolved, component,
    classify, sla_first_response, sla_first_response_remaining, sla_first_response_breached,
    sla_resolution, sla_resolution_remaining, sla_resolution_breached, linked_bugs,
    quarter, year, imported_at, sla_first_response_detail, sla_resolution_detail
  ) VALUES (
    @key, @summary, @title, @link, @project, @type, @priority, @status, @status_category, @resolution,
    @assignee, @assignee_username, @reporter, @labels, @created, @updated, @resolved, @component,
    @classify, @sla_first_response, @sla_first_response_remaining, @sla_first_response_breached,
    @sla_resolution, @sla_resolution_remaining, @sla_resolution_breached, @linked_bugs,
    @quarter, @year, @imported_at, @sla_first_response_detail, @sla_resolution_detail
  )
  ON CONFLICT(key) DO UPDATE SET
    summary = excluded.summary,
    title = excluded.title,
    link = excluded.link,
    project = excluded.project,
    type = excluded.type,
    priority = excluded.priority,
    status = excluded.status,
    status_category = excluded.status_category,
    resolution = excluded.resolution,
    assignee = excluded.assignee,
    assignee_username = excluded.assignee_username,
    reporter = excluded.reporter,
    labels = excluded.labels,
    created = excluded.created,
    updated = excluded.updated,
    resolved = excluded.resolved,
    component = excluded.component,
    classify = excluded.classify,
    sla_first_response = excluded.sla_first_response,
    sla_first_response_remaining = excluded.sla_first_response_remaining,
    sla_first_response_breached = excluded.sla_first_response_breached,
    sla_resolution = excluded.sla_resolution,
    sla_resolution_remaining = excluded.sla_resolution_remaining,
    sla_resolution_breached = excluded.sla_resolution_breached,
    linked_bugs = excluded.linked_bugs,
    quarter = excluded.quarter,
    year = excluded.year,
    imported_at = excluded.imported_at,
    sla_first_response_detail = excluded.sla_first_response_detail,
    sla_resolution_detail = excluded.sla_resolution_detail
`)

export function saveItsTickets(tickets, replace = false) {
  const tx = db.transaction((rows) => {
    if (replace) {
      db.prepare('DELETE FROM its_tickets').run()
    }
    const now = new Date().toISOString()
    for (const t of rows) {
      insertItsTicket.run({
        key: t.key,
        summary: t.summary || '',
        title: t.title || t.summary || '',
        link: t.link || `https://jira.vexere.net/browse/${t.key}`,
        project: t.project || 'ITS',
        type: t.type || 'Bug',
        priority: t.priority || 'Medium',
        status: t.status || 'Open',
        status_category: t.statusCategory || t.status_category || '',
        resolution: t.resolution || '',
        assignee: t.assignee || '',
        assignee_username: t.assigneeUsername || t.assignee_username || '',
        reporter: t.reporter || '',
        labels: JSON.stringify(t.labels || []),
        created: t.created || '',
        updated: t.updated || '',
        resolved: t.resolved || '',
        component: t.component || '',
        classify: t.classify || '',
        sla_first_response: t.slaFirstResponse || t.sla_first_response || '',
        sla_first_response_remaining: t.slaFirstResponseRemaining || t.sla_first_response_remaining || '',
        sla_first_response_breached: t.slaFirstResponseBreached ? 1 : 0,
        sla_resolution: t.slaResolution || t.sla_resolution || '',
        sla_resolution_remaining: t.slaResolutionRemaining || t.sla_resolution_remaining || '',
        sla_resolution_breached: t.slaResolutionBreached ? 1 : 0,
        linked_bugs: JSON.stringify(t.linkedBugs || t.linked_bugs || []),
        quarter: t.quarter || '',
        year: t.year ? Number(t.year) : null,
        imported_at: t.importedAt || now,
        sla_first_response_detail: JSON.stringify(t.slaFirstResponseDetail || {}),
        sla_resolution_detail: JSON.stringify(t.slaResolutionDetail || {}),
      })
    }
  })
  tx(tickets)
  setMeta('itsLastImport', new Date().toISOString())
}

export function getItsTickets() {
  const rows = db.prepare('SELECT * FROM its_tickets ORDER BY created DESC').all()
  return rows.map((r) => ({
    key: r.key,
    summary: r.summary,
    title: r.title,
    link: r.link,
    project: r.project,
    type: r.type,
    priority: r.priority,
    status: r.status,
    statusCategory: r.status_category,
    resolution: r.resolution,
    assignee: r.assignee,
    assigneeUsername: r.assignee_username,
    reporter: r.reporter,
    labels: JSON.parse(r.labels || '[]'),
    created: r.created,
    updated: r.updated,
    resolved: r.resolved,
    component: r.component,
    classify: r.classify,
    slaFirstResponse: r.sla_first_response,
    slaFirstResponseRemaining: r.sla_first_response_remaining,
    slaFirstResponseBreached: Boolean(r.sla_first_response_breached),
    slaFirstResponseDetail: JSON.parse(r.sla_first_response_detail || '{}'),
    slaResolution: r.sla_resolution,
    slaResolutionRemaining: r.sla_resolution_remaining,
    slaResolutionBreached: Boolean(r.sla_resolution_breached),
    slaResolutionDetail: JSON.parse(r.sla_resolution_detail || '{}'),
    linkedBugs: JSON.parse(r.linked_bugs || '[]'),
    quarter: r.quarter,
    year: r.year,
    importedAt: r.imported_at,
  }))
}

export function clearItsTickets() {
  return db.prepare('DELETE FROM its_tickets').run()
}

export function deleteItsTicket(key) {
  return db.prepare('DELETE FROM its_tickets WHERE key = ?').run(key)
}

// Seed initial sample ticket ITS-29638 if table is empty
try {
  const count = db.prepare('SELECT count(*) as c FROM its_tickets').get()?.c || 0
  if (count === 0) {
    saveItsTickets([{
      key: 'ITS-29638',
      title: '[ITS-29638] Thành Công - k trả đx tiền thu hộ',
      summary: 'Thành Công - k trả đx tiền thu hộ',
      link: 'https://jira.vexere.net/browse/ITS-29638',
      project: 'ITS',
      type: 'Bug',
      priority: 'Medium',
      status: 'Done',
      statusCategory: 'done',
      resolution: 'Done',
      assignee: 'Nguyễn Phú Thành (QC)',
      assigneeUsername: 'phuthanh.nguyen@vexere.com',
      reporter: 'Trần Tiến Phong (SI SaaS)',
      labels: ['Q3-2026'],
      created: 'Thu, 27 Aug 2026 08:40:13 +0700',
      updated: 'Thu, 8 Oct 2026 16:04:36 +0700',
      resolved: 'Fri, 4 Sep 2026 17:35:26 +0700',
      component: 'SaaS - GMS',
      classify: 'Feedback bug > Rule sản phẩm',
      slaFirstResponse: '5h 30m',
      slaFirstResponseRemaining: '5:30',
      slaFirstResponseBreached: false,
      slaResolution: '3d 3h',
      slaResolutionRemaining: '21:30',
      slaResolutionBreached: false,
      linkedBugs: [{ key: 'GOP-4346', link: 'https://jira.vexere.net/browse/GOP-4346', type: 'relates to' }],
      quarter: 'Q3',
      year: 2026,
    }])
  }
} catch (e) {
  console.error('Lỗi khởi tạo mẫu ITS:', e.message)
}

// Non-ITS Feedback helper methods
const insertNonItsFeedback = db.prepare(`
  INSERT INTO non_its_feedbacks (
    id, date, project, title, slack_url, slack_title, resolution, status, created_at, updated_at
  ) VALUES (
    @id, @date, @project, @title, @slack_url, @slack_title, @resolution, @status, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    date = excluded.date,
    project = excluded.project,
    title = excluded.title,
    slack_url = excluded.slack_url,
    slack_title = excluded.slack_title,
    resolution = excluded.resolution,
    status = excluded.status,
    updated_at = excluded.updated_at
`)

export function saveNonItsFeedback(item) {
  const now = new Date().toISOString()
  const id = item.id || 'nif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
  insertNonItsFeedback.run({
    id,
    date: item.date || now.split('T')[0],
    project: item.project || 'GOP',
    title: item.title || '',
    slack_url: item.slackUrl || item.slack_url || '',
    slack_title: item.slackTitle || item.slack_title || '',
    resolution: item.resolution || '',
    status: item.status || 'Đã xử lý / phản hồi kết luận',
    created_at: item.createdAt || item.created_at || now,
    updated_at: now,
  })
  return id
}

export function getNonItsFeedbacks(filters = {}) {
  let query = 'SELECT * FROM non_its_feedbacks'
  const conditions = []
  const params = []

  if (filters.fromDate) {
    conditions.push('date >= ?')
    params.push(filters.fromDate)
  }
  if (filters.toDate) {
    conditions.push('date <= ?')
    params.push(filters.toDate)
  }
  if (filters.project) {
    conditions.push('project = ?')
    params.push(filters.project)
  }
  if (filters.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.search) {
    conditions.push('(title LIKE ? OR resolution LIKE ?)')
    const s = `%${filters.search}%`
    params.push(s, s)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY date DESC, created_at DESC'

  const rows = db.prepare(query).all(...params)
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    project: r.project,
    title: r.title,
    slackUrl: r.slack_url,
    slackTitle: r.slack_title,
    resolution: r.resolution,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function deleteNonItsFeedback(id) {
  return db.prepare('DELETE FROM non_its_feedbacks WHERE id = ?').run(id)
}

// Seed sample non-ITS feedback if empty
try {
  const fbCount = db.prepare('SELECT count(*) as c FROM non_its_feedbacks').get()?.c || 0
  if (fbCount === 0) {
    saveNonItsFeedback({
      id: 'fb_sample_1',
      date: '2026-07-14',
      project: 'GOP',
      title: 'Phúc Lợi — phụ phí không tự áp dụng',
      slackUrl: 'https://vexere.slack.com/archives/C018WQWPR9Q/p1784016615812979',
      slackTitle: 'Thread 5',
      resolution: 'Giải thích ngưỡng giá trị hàng và cách tính VAT theo cước tự động; Dev xác nhận logic cũ không thay đổi.',
      status: 'Đã xử lý / phản hồi kết luận',
    })
  }
} catch (e) {
  console.error('Lỗi khởi tạo mẫu non-ITS feedback:', e.message)
}

// Release History helpers
const insertReleaseHistory = db.prepare(`
  INSERT INTO release_history (id, team_name, task_keys, mention_tag, notification_msg, scope_msg, created_at)
  VALUES (@id, @team_name, @task_keys, @mention_tag, @notification_msg, @scope_msg, @created_at)
  ON CONFLICT(id) DO UPDATE SET
    team_name = excluded.team_name,
    task_keys = excluded.task_keys,
    mention_tag = excluded.mention_tag,
    notification_msg = excluded.notification_msg,
    scope_msg = excluded.scope_msg
`)

export function saveReleaseHistory(entry) {
  const id = entry.id || 'rel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
  const createdAt = entry.createdAt || new Date().toISOString()
  insertReleaseHistory.run({
    id,
    team_name: entry.teamName || 'Team GMS',
    task_keys: Array.isArray(entry.taskKeys) ? entry.taskKeys.join(',') : (entry.taskKeys || ''),
    mention_tag: entry.mentionTag || '@channel',
    notification_msg: entry.notificationMsg || '',
    scope_msg: entry.scopeMsg || '',
    created_at: createdAt,
  })
  return { id, ...entry, createdAt }
}

export function getReleaseHistory(limit = 30) {
  const rows = db.prepare('SELECT * FROM release_history ORDER BY created_at DESC LIMIT ?').all(limit)
  return rows.map((r) => ({
    id: r.id,
    teamName: r.team_name,
    taskKeys: r.task_keys ? r.task_keys.split(',') : [],
    mentionTag: r.mention_tag,
    notificationMsg: r.notification_msg,
    scopeMsg: r.scope_msg,
    createdAt: r.created_at,
  }))
}

export function deleteReleaseHistory(id) {
  return db.prepare('DELETE FROM release_history WHERE id = ?').run(id)
}

// ==========================================
// Issues Management (Quản lý Vấn đề)
// ==========================================

const insertIssue = db.prepare(`
  INSERT INTO issues (
    id, created_date, title, content, links, solution, status, priority, project, assignee, created_at, updated_at
  ) VALUES (
    @id, @created_date, @title, @content, @links, @solution, @status, @priority, @project, @assignee, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    created_date = excluded.created_date,
    title = excluded.title,
    content = excluded.content,
    links = excluded.links,
    solution = excluded.solution,
    status = excluded.status,
    priority = excluded.priority,
    project = excluded.project,
    assignee = excluded.assignee,
    updated_at = excluded.updated_at
`)

export function saveIssue(item) {
  const now = new Date().toISOString()
  const id = item.id || 'iss_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
  const linksJson = Array.isArray(item.links)
    ? JSON.stringify(item.links)
    : (typeof item.links === 'string' && item.links.trim() ? item.links : '[]')

  insertIssue.run({
    id,
    created_date: item.createdDate || item.created_date || now.split('T')[0],
    title: (item.title || '').trim(),
    content: (item.content || '').trim(),
    links: linksJson,
    solution: (item.solution || '').trim(),
    status: item.status || 'open',
    priority: item.priority || 'medium',
    project: item.project || 'GOP',
    assignee: item.assignee || '',
    created_at: item.createdAt || item.created_at || now,
    updated_at: now,
  })

  return {
    id,
    createdDate: item.createdDate || item.created_date || now.split('T')[0],
    title: (item.title || '').trim(),
    content: (item.content || '').trim(),
    links: typeof linksJson === 'string' ? JSON.parse(linksJson) : linksJson,
    solution: (item.solution || '').trim(),
    status: item.status || 'open',
    priority: item.priority || 'medium',
    project: item.project || 'GOP',
    assignee: item.assignee || '',
    createdAt: item.createdAt || item.created_at || now,
    updatedAt: now,
  }
}

export function getIssues(filters = {}) {
  let query = 'SELECT * FROM issues'
  const conditions = []
  const params = []

  if (filters.fromDate) {
    conditions.push('created_date >= ?')
    params.push(filters.fromDate)
  }
  if (filters.toDate) {
    conditions.push('created_date <= ?')
    params.push(filters.toDate)
  }
  if (filters.status && filters.status !== 'all') {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.priority && filters.priority !== 'all') {
    conditions.push('priority = ?')
    params.push(filters.priority)
  }
  if (filters.project && filters.project !== 'all') {
    conditions.push('project = ?')
    params.push(filters.project)
  }
  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`
    conditions.push('(title LIKE ? OR content LIKE ? OR solution LIKE ?)')
    params.push(s, s, s)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY created_date DESC, created_at DESC'

  const rows = db.prepare(query).all(...params)
  return rows.map((r) => {
    let parsedLinks = []
    try {
      parsedLinks = r.links ? JSON.parse(r.links) : []
    } catch {
      parsedLinks = []
    }
    return {
      id: r.id,
      createdDate: r.created_date,
      title: r.title || '',
      content: r.content || '',
      links: Array.isArray(parsedLinks) ? parsedLinks : [],
      solution: r.solution || '',
      status: r.status || 'open',
      priority: r.priority || 'medium',
      project: r.project || 'GOP',
      assignee: r.assignee || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  })
}

export function deleteIssue(id) {
  return db.prepare('DELETE FROM issues WHERE id = ?').run(id)
}

export function getIssueStats(filters = {}) {
  const issues = getIssues(filters)
  const total = issues.length
  const openCount = issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length
  const resolvedCount = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length
  const criticalCount = issues.filter((i) => i.priority === 'critical' || i.priority === 'high').length
  const resolvedRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0

  return {
    total,
    openCount,
    resolvedCount,
    criticalCount,
    resolvedRate,
  }
}

// Seed sample issues if empty
try {
  const count = db.prepare('SELECT count(*) as c FROM issues').get()?.c || 0
  if (count === 0) {
    saveIssue({
      id: 'iss_sample_1',
      createdDate: '2026-03-15',
      title: 'Môi trường Staging bị lỗi 502 khi gọi API tính giá vé nâng cấp',
      content: 'Trong đợt release tính năng mới, môi trường Staging gateway trả về 502 Bad Gateway liên tục khi user thực hiện chọn ghế VIP và tính phụ phí. Nghi ngờ xung đột service định giá.',
      links: [
        { title: 'Slack trao đổi với Backend Team', url: 'https://vexere.slack.com/archives/C018WQWPR9Q/p1784016615812979' },
        { title: 'Jira Task phát sinh', url: 'https://jira.vexere.net/browse/GOP-1425' },
        { title: 'Log Datadog ghi nhận lỗi', url: 'https://app.datadoghq.com/logs' }
      ],
      solution: 'Backend đã rollback commit cấu hình rate limit ở API Gateway. QC đã test lại 15 kịch bản đặt vé trên Staging và xác nhận hoạt động bình thường, không còn lỗi 502.',
      status: 'resolved',
      priority: 'high',
      project: 'GOP',
      assignee: 'QC',
    })
    saveIssue({
      id: 'iss_sample_2',
      createdDate: '2026-03-20',
      title: 'Thiếu tài liệu đặc tả (BRD) cho kịch bản hoàn tiền tự động qua ZaloPay',
      content: 'Khi thực hiện test case hoàn tiền vé qua ZaloPay, phát hiện kịch bản khách hủy vé sát giờ khởi hành (dưới 2 tiếng) chưa có quy chuẩn hoàn bao nhiêu % và phí giao dịch xử lý ra sao.',
      links: [
        { title: 'Thread thảo luận với Product Owner', url: 'https://vexere.slack.com/archives/C02XYZ123/p178401999999' },
        { title: 'Tài liệu Confluence cần bổ sung', url: 'https://wiki.vexere.net/pages/viewpage.action?pageId=987654' }
      ],
      solution: 'PO đã họp thống nhất với Finance và cập nhật mục 3.4 trong tài liệu Confluence. Đã tạo ticket follow-up để Dev điều chỉnh logic khấu trừ.',
      status: 'open',
      priority: 'medium',
      project: 'GOP',
      assignee: 'QC',
    })
  }
} catch (e) {
  console.error('Lỗi khởi tạo mẫu Issues:', e.message)
}

export default db



