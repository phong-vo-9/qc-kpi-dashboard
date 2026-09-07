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

export default db
