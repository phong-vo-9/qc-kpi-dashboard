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
  qcWeight REAL, labels TEXT, project TEXT, component TEXT,
  created TEXT, updated TEXT, duedate TEXT, bugCount INTEGER,
  sprint TEXT
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`)

try {
  db.exec('ALTER TABLE tasks ADD COLUMN sprint TEXT;')
} catch (e) {
  // Ignored if column already exists
}

const insert = db.prepare(`
INSERT INTO tasks (key,summary,status,priority,assignee,assignedQC,qcWeight,labels,project,component,created,updated,duedate,bugCount,sprint)
VALUES (@key,@summary,@status,@priority,@assignee,@assignedQC,@qcWeight,@labels,@project,@component,@created,@updated,@duedate,@bugCount,@sprint)
`)

export function setMeta(k, v) {
  db.prepare('INSERT INTO meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=?').run(k, v, v)
}

export function getMeta(k) {
  return db.prepare('SELECT v FROM meta WHERE k=?').get(k)?.v || null
}

// Replace the cache with the freshly fetched set (drops stale tasks too).
export function saveTasks(tasks) {
  const tx = db.transaction((rows) => {
    db.prepare('DELETE FROM tasks').run()
    for (const r of rows) insert.run({ ...r, labels: JSON.stringify(r.labels || []) })
  })
  tx(tasks)
  setMeta('lastRefresh', new Date().toISOString())
}

export function getTasks() {
  return db.prepare('SELECT * FROM tasks').all().map((r) => ({ ...r, labels: JSON.parse(r.labels || '[]') }))
}

export default db
