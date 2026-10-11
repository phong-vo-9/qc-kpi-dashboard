import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Headphones, AlertTriangle, Ticket, MessageSquare } from 'lucide-react'
import ItsFilters, { EMPTY_ITS_FILTERS } from './ItsFilters.jsx'
import ItsKpiCards from './ItsKpiCards.jsx'
import ItsTable from './ItsTable.jsx'
import NonItsFeedbackTab from './NonItsFeedbackTab.jsx'
import { api, query } from '../../lib/api.js'

export default function ItsManagement() {
  const [activeSubTab, setActiveSubTab] = useState('jira-its') // 'jira-its' | 'non-its'
  const [tickets, setTickets] = useState([])
  const [rawTickets, setRawTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState(EMPTY_ITS_FILTERS)
  const [error, setError] = useState(null)

  // Load tickets from server
  const loadTickets = useCallback(async (currentFilters = filters) => {
    try {
      setLoading(true)
      const q = query(currentFilters)
      const data = await api(`/api/its${q ? `?${q}` : ''}`)
      if (Array.isArray(data)) {
        setTickets(data)
        // Keep raw tickets when filters are empty to extract complete available options
        if (!currentFilters.quarter && !currentFilters.year && !currentFilters.status && !currentFilters.type && !currentFilters.classify && !currentFilters.slaStatus && !currentFilters.search) {
          setRawTickets(data)
        }
      } else {
        setTickets([])
      }
      setError(null)
    } catch (err) {
      console.error('Lỗi khi tải danh sách ITS:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadTickets(filters)
  }, [loadTickets, filters])

  // Refresh directly from Jira
  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      const res = await api('/api/its/refresh', { method: 'POST' })
      if (res.success) {
        await loadTickets(filters)
      } else if (res.error) {
        alert('Lỗi làm mới ITS từ Jira:\n' + res.error)
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ Jira: ' + err.message)
    } finally {
      setRefreshing(false)
    }
  }

  // Toggle breached only filter from KPI card
  const handleToggleBreachedOnly = () => {
    setFilters((prev) => ({
      ...prev,
      slaStatus: prev.slaStatus === 'breached' ? '' : 'breached',
    }))
  }

  // Extract available options dynamically from all tickets
  const availableOptions = useMemo(() => {
    const source = rawTickets.length > 0 ? rawTickets : tickets

    const quartersSet = new Set()
    const yearsSet = new Set()
    const labelsSet = new Set()
    const statusesSet = new Set()
    const typesSet = new Set()
    const classifiesSet = new Set()

    for (const t of source) {
      if (t.quarter) quartersSet.add(t.quarter)
      if (t.year) yearsSet.add(t.year)
      if (t.status) statusesSet.add(t.status)
      if (t.type) typesSet.add(t.type)
      if (t.classify) {
        // Add the whole classify and the main parent
        classifiesSet.add(t.classify)
        const parent = t.classify.split(' > ')[0]?.trim()
        if (parent) classifiesSet.add(parent)
      }
      for (const l of t.labels || []) {
        if (l) labelsSet.add(l)
      }
    }

    return {
      quarters: Array.from(quartersSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => b - a),
      labels: Array.from(labelsSet).sort(),
      statuses: Array.from(statusesSet).sort(),
      types: Array.from(typesSet).sort(),
      classifies: Array.from(classifiesSet).sort(),
    }
  }, [rawTickets, tickets])

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Headphones size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Quản lý ITS & Feedback
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                Nguyễn Phú Thành
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Theo dõi tiến độ ITS Jira, cảnh báo SLA và quản lý các feedback xử lý trực tiếp trên Slack
            </p>
          </div>
        </div>

        {activeSubTab === 'jira-its' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
              <span>{refreshing ? 'Đang đồng bộ...' : 'Đồng bộ Jira'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('jira-its')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'jira-its'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Ticket size={16} />
          <span>Vé ITS Jira</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeSubTab === 'jira-its'
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {tickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('non-its')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'non-its'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800'
          }`}
        >
          <MessageSquare size={16} />
          <span>Feedback không tạo ITS</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeSubTab === 'non-its'
                ? 'bg-white/20 text-white'
                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            }`}
          >
            Slack & Chat
          </span>
        </button>
      </div>

      {/* Sub-tab 1: Vé ITS Jira */}
      {activeSubTab === 'jira-its' && (
        <div className="space-y-6 animate-fade-in">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>Lỗi: {error}</span>
            </div>
          )}

          {/* 2. Bộ lọc riêng theo ITS */}
          <ItsFilters
            applied={filters}
            onApply={setFilters}
            availableOptions={availableOptions}
          />

          {/* 3. Panel phía dưới bộ lọc: Tổng ITS, Open, Review, Đã xử lý, Cảnh báo trễ SLA */}
          <ItsKpiCards
            tickets={tickets}
            currentSlaFilter={filters.slaStatus}
            onToggleBreachedOnly={handleToggleBreachedOnly}
          />

          {/* 1. Bảng dữ liệu ITS */}
          <ItsTable tickets={tickets} />
        </div>
      )}

      {/* Sub-tab 2: Feedback không tạo ITS */}
      {activeSubTab === 'non-its' && <NonItsFeedbackTab />}
    </div>
  )
}
