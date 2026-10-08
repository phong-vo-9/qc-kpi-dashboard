// Tiny fetch helpers — the browser only ever calls /api/* (Vite proxies to Express).
export const api = (path, opts = {}) => {
  const headers = {
    ...(opts.body && typeof opts.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  }
  return fetch(path, { ...opts, headers }).then((r) => r.json())
}

// Build a query string from a filters object, dropping empty values.
export const query = (f) =>
  new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null))).toString()

// Jira browse URL for a task key (ui.md §10 — open issue in a new tab).
const JIRA_BASE = 'https://jira.vexere.net'
export const jiraUrl = (key) => `${JIRA_BASE}/browse/${key}`
