# CLAUDE.md

Guidance for Claude Code (or any AI assistant) working in this repo. Read this before making changes.

## What this is

A **localhost, read-only** dashboard that pulls QC tasks from a self-hosted Jira Server and shows KPI stats. It never writes back to Jira. Full product spec: `docs/SPEC.md`. User-facing README (Vietnamese): `README.md`.

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), ES modules, in `server/`
- **Frontend:** React + Vite + TailwindCSS + Recharts, in `web/`
- **Monorepo:** npm workspaces. Root `npm install` installs both; root `npm run dev` runs both.
- The browser **never** calls Jira directly — Vite proxies `/api/*` to Express (`web/vite.config.js`).

## Commands

```bash
npm install     # root — installs server + web (workspaces)
npm run dev     # root — Express on :3001 + Vite on :5173 (concurrently)
npm start       # backend only
npm run build --workspace web   # production build of the frontend
```

Target platform is **Windows/PC** — keep all scripts cross-platform (no bash-only syntax, no `&&`-chained shell assumptions in package.json scripts).

## How it works (data flow)

```
Jira REST v2 ──▶ server/jira.js (fetch + filter by Assigned QC)
             ──▶ server/db.js   (replace SQLite cache)
             ──▶ server/kpi.js  (parse labels + aggregate)
             ──▶ server/index.js (/api/* routes)
             ──▶ web/src/App.jsx (cards, charts, table, filters)
```

`POST /api/refresh` re-fetches from Jira and **replaces** the whole `tasks` table. All reads (`/api/kpi`, `/api/tasks`, `/api/filters`) come from SQLite, so the UI is fast and works offline after one sync.

## Key files

| File | Responsibility |
| --- | --- |
| `server/jira.js` | Jira REST v2 call, JQL, auth, field mapping (`normalize`). **Most Jira-specific tweaks go here.** |
| `server/kpi.js` | `parseLabels` (label → KPI flags + quarter/year) and `computeAggregates` (all counts/ratios/top-5). **KPI rule changes go here.** |
| `server/db.js` | SQLite schema + `saveTasks`/`getTasks`/meta. |
| `server/index.js` | Routes + `applyFilters` (Project/Year/Quarter). |
| `server/env.js` | Loads root `.env` — imported FIRST in `index.js`. |
| `web/src/App.jsx` | Entire UI (single file: cards, pies, bars, table, filters, Refresh). |

## Jira-specific config (the parts most likely to need adjusting)

Set in `.env` (copy from `.env.example`, never commit real values):

- `JIRA_URL` — `https://jira.vexere.net`
- `JIRA_USER` + `JIRA_PASS` — basic auth. Or `JIRA_TOKEN` (PAT, takes priority).
- `JIRA_PROJECT` — default `GOP`.
- `JIRA_QC_NAME` — must match the QC's **display name** in Jira. Filtering by Assigned QC is done in code (`jira.js`), not JQL, and matches with a two-way `includes`.

Hard-coded in `server/jira.js` (change here if the live instance differs):

- Custom fields: `customfield_10503` = Assigned QC, `customfield_13212` = QC Weight.
- Statuses fetched: `Todo, In Progress, Ready to Test, Testing, Done, Released`.
- Issue type: `Task` only. Bug count = number of subtasks (`fields.subtasks.length`).

## Label → KPI rules (see `parseLabels`)

- Quarter/Year from labels like `Q1-2026` → `quarter: "Q1"`, `year: 2026`.
- `Review1/2/3`, `TestCase1/2/3` (→ TC1/2/3), `TestDesign1/2/3` (→ TD1/2/3) are boolean flags per task.
- Ratios = count / total task, rounded to 2 decimals.

## Common first-run issues (what the friend will likely hit)

- **`Jira 401`** → wrong `JIRA_USER`/`JIRA_PASS`.
- **Refresh OK but Tổng Task = 0** → `JIRA_QC_NAME` doesn't match the Jira display name, OR custom field IDs differ. Fix in `.env` / `server/jira.js`.
- **`Jira 400`** → JQL rejected (status name or project mismatch) — check `buildJql` in `jira.js`.
- Only these can't be tested off the Jira network; everything else was verified before first commit.

## Conventions & guardrails

- **Read-only.** Never add code that writes/updates/creates Jira issues.
- **Never commit `.env` or `*.db`** (already in `.gitignore`).
- UI text is **Vietnamese** — keep new user-facing strings in Vietnamese.
- Backend is **ESM** (`"type": "module"`) — use `import`, not `require`.
- Keep the design extensible per `docs/SPEC.md` §20 (multi-project, Sprint/Month, trends) — add to `kpi.js`/`applyFilters`, don't rearchitect.
- After changing KPI logic, sanity-check `/api/kpi` against a known Jira count.
