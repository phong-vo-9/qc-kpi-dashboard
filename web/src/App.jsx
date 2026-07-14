import { useEffect, useState, useCallback } from 'react'
import { LayoutDashboard, Table2 } from 'lucide-react'
import Header from './components/Header.jsx'
import Filters, { EMPTY_FILTERS } from './components/Filters.jsx'
import { Skeleton } from './components/ui.jsx'
import Overview from './tabs/Overview.jsx'
import Tasks from './tabs/Tasks.jsx'
import { api, query } from './lib/api.js'
import { useDarkMode } from './lib/useDarkMode.js'

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'tasks', label: 'Danh sách Task', icon: Table2 },
]

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export default function App() {
  const { isDark, toggle, theme } = useDarkMode()
  const [tab, setTab] = useState('overview')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [options, setOptions] = useState({ projects: [], sprints: [], years: [], quarters: [], statuses: [] })
  const [kpi, setKpi] = useState(null)
  const [tasks, setTasks] = useState([])
  const [meta, setMeta] = useState({})
  const [syncStatus, setSyncStatus] = useState('idle') // idle | loading | success | error

  const load = useCallback(async () => {
    const q = query(filters)
    const [k, t, o, m] = await Promise.all([
      api(`/api/kpi?${q}`), api(`/api/tasks?${q}`), api('/api/filters'), api('/api/meta'),
    ])
    setKpi(k); setTasks(t); setOptions(o); setMeta(m)
  }, [filters])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setSyncStatus('loading')
    try {
      const r = await api('/api/refresh' + (filters.project ? `?project=${filters.project}` : ''), { method: 'POST' })
      if (r.error) {
        setSyncStatus('error')
        alert('Lỗi đồng bộ Jira:\n' + r.error)
      } else {
        await load()
        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 2500)
      }
    } catch (e) {
      setSyncStatus('error')
      alert('Không kết nối được backend: ' + e.message)
    }
  }

  const mode = isDark ? 'dark' : 'light'
  const qcName = meta.qcName

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-800 dark:text-gray-100">
      <Header
        lastRefresh={meta.lastRefresh} syncStatus={syncStatus} onRefresh={refresh}
        isDark={isDark} onToggleTheme={toggle} qcName={qcName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tabs (§1) */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl w-fit">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Global filters (§3) */}
        <Filters options={options} applied={filters} onApply={setFilters} />

        {/* Tab content */}
        {!kpi ? (
          <LoadingSkeleton />
        ) : tab === 'overview' ? (
          <div key={theme}><Overview kpi={kpi} mode={mode} /></div>
        ) : (
          <Tasks tasks={tasks} />
        )}
      </main>
    </div>
  )
}
