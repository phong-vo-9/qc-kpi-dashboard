// App header (ui.md §2, §15): title + last-sync, Refresh, dark-mode toggle, profile.
import { RefreshCw, Moon, Sun, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react'

// Sync-state line (ui.md §15).
function SyncLine({ status, lastRefresh }) {
  if (status === 'loading') return <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><Loader2 size={13} className="animate-spin" /> Đang Sync…</span>
  if (status === 'success') return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={13} /> Sync thành công</span>
  if (status === 'error') return <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle size={13} /> Sync lỗi</span>
  return (
    <span>
      {lastRefresh ? `Last Sync: ${new Date(lastRefresh).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
    </span>
  )
}

function IconButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick} title={title} aria-label={title}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
    >
      {children}
    </button>
  )
}

export default function Header({ lastRefresh, syncStatus, onRefresh, isDark, onToggleTheme, qcName }) {
  return (
    <header className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50 truncate">QC KPI Dashboard</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            <SyncLine status={syncStatus} lastRefresh={lastRefresh} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh} disabled={syncStatus === 'loading'}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={15} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <IconButton onClick={onToggleTheme} title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </IconButton>
          <div
            title={qcName || 'QC'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
          >
            <User size={17} />
          </div>
        </div>
      </div>
    </header>
  )
}
