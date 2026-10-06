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

const ISSUE_COLUMNS = 'key,summary,status,priority,assignee,assignedQC,qcWeight,storyPoints,environment,labels,project,component,created,updated,duedate,bugCount,sprint,type,enddate,reporter,linkedTask'
const ISSUE_VALUES = '@key,@summary,@status,@priority,@assignee,@assignedQC,@qcWeight,@storyPoints,@environment,@labels,@project,@component,@created,@updated,@duedate,@bugCount,@sprint,@type,@enddate,@reporter,@linkedTask'

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

export default db
