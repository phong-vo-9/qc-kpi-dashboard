import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, Plus, RefreshCw, MessageSquare, AlertCircle, CheckCircle2
} from 'lucide-react'
import NonItsFeedbackFilters, { EMPTY_NON_ITS_FILTERS } from './NonItsFeedbackFilters.jsx'
import NonItsFeedbackKpiCards from './NonItsFeedbackKpiCards.jsx'
import NonItsFeedbackTable from './NonItsFeedbackTable.jsx'
import NonItsFeedbackAiModal from './NonItsFeedbackAiModal.jsx'
import NonItsFeedbackModal from './NonItsFeedbackModal.jsx'
import { api, query } from '../../lib/api.js'

export default function NonItsFeedbackTab() {
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_NON_ITS_FILTERS)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load feedbacks from backend
  const loadFeedbacks = useCallback(async (currentFilters = filters) => {
    try {
      setLoading(true)
      const q = query({
        fromDate: currentFilters.fromDate,
        toDate: currentFilters.toDate,
        project: currentFilters.project,
        status: currentFilters.status,
        search: currentFilters.search,
      })
      const data = await api(`/api/non-its-feedbacks${q ? `?${q}` : ''}`)
      if (Array.isArray(data)) {
        setFeedbacks(data)
      } else {
        setFeedbacks([])
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách feedback:', err)
      showToast('Không thể tải feedback: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadFeedbacks(filters)
  }, [loadFeedbacks, filters])

  // Save new or updated feedback
  const handleSave = async (itemData) => {
    try {
      if (itemData.id) {
        await api(`/api/non-its-feedbacks/${itemData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        })
        showToast('Đã cập nhật feedback thành công!', 'success')
      } else {
        await api('/api/non-its-feedbacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        })
        showToast('Đã thêm feedback mới thành công!', 'success')
      }
      await loadFeedbacks(filters)
    } catch (err) {
      console.error('Lỗi khi lưu feedback:', err)
      showToast('Lỗi khi lưu: ' + err.message, 'error')
    }
  }

  // Delete feedback
  const handleDelete = async (id) => {
    try {
      await api(`/api/non-its-feedbacks/${id}`, {
        method: 'DELETE',
      })
      showToast('Đã xóa feedback thành công!', 'success')
      await loadFeedbacks(filters)
    } catch (err) {
      console.error('Lỗi khi xóa feedback:', err)
      showToast('Lỗi khi xóa: ' + err.message, 'error')
    }
  }

  // Edit item
  const handleEdit = (item) => {
    setEditingItem(item)
    setIsManualModalOpen(true)
  }

  // Quick filter by status from KPI card
  const handleFilterStatus = (statusValue) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === statusValue ? '' : statusValue,
    }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-in">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-800'
                : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/90 dark:text-red-200 dark:border-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>Quản lý feedback không tạo ITS</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300">
                Slack & Trực tiếp
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ghi nhận các trao đổi, thắc mắc tính năng hoặc giải quyết sự vụ không mở ticket ITS Jira
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* AI Nhập Nhanh Button */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all cursor-pointer"
          >
            <Sparkles size={14} />
            <span>AI Nhập nhanh (Paste)</span>
          </button>

          {/* Thêm thủ công Button */}
          <button
            type="button"
            onClick={() => {
              setEditingItem(null)
              setIsManualModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>Thêm feedback</span>
          </button>

          {/* Làm mới */}
          <button
            type="button"
            onClick={() => loadFeedbacks(filters)}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Bộ lọc theo ngày feedback và tiêu chí */}
      <NonItsFeedbackFilters
        applied={filters}
        onApply={setFilters}
        totalCount={feedbacks.length}
        filteredCount={feedbacks.length}
      />

      {/* KPI Panel */}
      <NonItsFeedbackKpiCards
        feedbacks={feedbacks}
        currentStatusFilter={filters.status}
        onFilterStatus={handleFilterStatus}
      />

      {/* Bảng danh sách Feedback */}
      <NonItsFeedbackTable
        feedbacks={feedbacks}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal AI Auto-fill khi Paste */}
      <NonItsFeedbackAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSave={handleSave}
        showToast={showToast}
      />

      {/* Modal Thêm / Sửa thủ công */}
      <NonItsFeedbackModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false)
          setEditingItem(null)
        }}
        onSave={handleSave}
        item={editingItem}
        showToast={showToast}
      />
    </div>
  )
}
