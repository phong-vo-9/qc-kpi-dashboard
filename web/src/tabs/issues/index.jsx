import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, RefreshCw, Plus, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { api, query } from '../../lib/api.js'
import IssueKpiCards from './IssueKpiCards.jsx'
import IssueFilters from './IssueFilters.jsx'
import IssueTable from './IssueTable.jsx'
import IssueModal from './IssueModal.jsx'
import IssueAiModal from './IssueAiModal.jsx'

export default function IssuesManagement({ mode = 'light', currentUser = 'QC' }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState(null)
  const [toast, setToast] = useState(null)

  const [filters, setFilters] = useState(() => {
    try {
      const saved = sessionStorage.getItem('qc_issues_filters')
      return saved
        ? JSON.parse(saved)
        : { search: '', status: 'all', priority: 'all', fromDate: '', toDate: '' }
    } catch {
      return { search: '', status: 'all', priority: 'all', fromDate: '', toDate: '' }
    }
  })

  // Save filters to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('qc_issues_filters', JSON.stringify(filters))
    } catch {}
  }, [filters])

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load issues
  const loadIssues = useCallback(async () => {
    setLoading(true)
    try {
      const q = query({
        search: filters.search || '',
        status: filters.status !== 'all' ? filters.status : '',
        priority: filters.priority !== 'all' ? filters.priority : '',
        fromDate: filters.fromDate || '',
        toDate: filters.toDate || '',
      })
      const data = await api(`/api/issues?${q}`)
      setIssues(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Lỗi tải danh sách vấn đề:', err)
      showToast('Không tải được danh sách vấn đề', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  // Save / Update Issue
  const handleSaveIssue = async (issueData) => {
    if (issueData.id) {
      // Update
      const res = await api(`/api/issues/${issueData.id}`, {
        method: 'PUT',
        body: JSON.stringify(issueData),
      })
      if (res.error) throw new Error(res.error)
      showToast('Cập nhật vấn đề thành công!')
    } else {
      // Create
      const res = await api('/api/issues', {
        method: 'POST',
        body: JSON.stringify(issueData),
      })
      if (res.error) throw new Error(res.error)
      showToast('Thêm vấn đề mới thành công!')
    }
    loadIssues()
  }

  // Quick Status Toggle
  const handleStatusChange = async (id, nextStatus) => {
    const target = issues.find((i) => i.id === id)
    if (!target) return
    try {
      await api(`/api/issues/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...target, status: nextStatus }),
      })
      // Optimistic update
      setIssues((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: nextStatus } : i))
      )
      showToast(
        nextStatus === 'resolved'
          ? 'Đã chuyển sang Đã giải quyết'
          : nextStatus === 'closed'
          ? 'Đã đóng vấn đề'
          : 'Đã mở lại vấn đề'
      )
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái', 'error')
      loadIssues()
    }
  }

  // Delete Issue
  const handleDeleteIssue = async (id) => {
    try {
      await api(`/api/issues/${id}`, { method: 'DELETE' })
      setIssues((prev) => prev.filter((i) => i.id !== id))
      showToast('Đã xóa vấn đề thành công!')
    } catch (err) {
      showToast('Lỗi khi xóa vấn đề', 'error')
      loadIssues()
    }
  }

  // Open modal for creating new issue
  const handleAddNew = () => {
    setEditingIssue(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleEdit = (issue) => {
    setEditingIssue(issue)
    setIsModalOpen(true)
  }

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      fromDate: '',
      toDate: '',
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/80 dark:text-rose-200 dark:border-rose-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/80 dark:text-emerald-200 dark:border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircle size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Quản lý Vấn đề (Issues Management)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                {issues.length} vấn đề
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Ghi nhận và theo dõi các phát sinh, tài liệu minh chứng, link trao đổi cùng hướng giải quyết
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          <button
            onClick={loadIssues}
            disabled={loading}
            title="Làm mới dữ liệu"
            className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-blue-500' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 shadow-sm transition-all hover:shadow active:scale-[0.98] cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Tạo nhanh bằng AI</span>
          </button>

          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all hover:shadow active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Thêm vấn đề</span>
          </button>
        </div>
      </div>

      {/* 1. KPI Summary Cards */}
      <IssueKpiCards
        issues={issues}
        currentStatusFilter={filters.status}
        currentPriorityFilter={filters.priority}
        onFilterStatus={(st) => setFilters({ ...filters, status: st })}
        onFilterPriority={(pr) => setFilters({ ...filters, priority: pr })}
      />

      {/* 2. Filters & Search Toolbar */}
      <IssueFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        onAddNew={handleAddNew}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* 3. Issues Table */}
      <IssueTable
        issues={issues}
        onEdit={handleEdit}
        onDelete={handleDeleteIssue}
        onStatusChange={handleStatusChange}
        onAddNew={handleAddNew}
      />

      {/* 4. Add/Edit Modal */}
      <IssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveIssue}
        issue={editingIssue}
        currentUser={currentUser}
      />

      {/* 5. AI Assistant Modal */}
      <IssueAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSave={handleSaveIssue}
        currentUser={currentUser}
      />
    </div>
  )
}
