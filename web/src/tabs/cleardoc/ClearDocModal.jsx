import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText, Sparkles, X, Search, Layers, Check, ExternalLink,
  RotateCcw, AlertCircle
} from 'lucide-react'
import { extractIssueCount } from './cleardoc-utils.js'
import { TaskTypeBadge } from './ClearDocBadges.jsx'

export function ClearDocModal({
  isOpen,
  onClose,
  editingId,
  formData,
  setFormData,
  eligibleTasks = [],
  taskMap = new Map(),
  availableProjects = [],
  onSave,
  onOpenAiModal,
}) {
  const [taskSearchInModal, setTaskSearchInModal] = useState('')
  const [isAutoCountLocked, setIsAutoCountLocked] = useState(Boolean(editingId))

  // Lọc danh sách task hiển thị trong modal
  const modalTaskOptions = useMemo(() => {
    let pool = eligibleTasks
    if (formData.project) {
      pool = pool.filter((t) => t.project === formData.project)
    }
    if (taskSearchInModal.trim()) {
      const q = taskSearchInModal.trim().toLowerCase()
      pool = pool.filter((t) => t.key.toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q))
    }
    return pool.slice(0, 50)
  }, [eligibleTasks, formData.project, taskSearchInModal])

  if (!isOpen) return null

  // Khi chọn 1 task, nếu project hoặc sprint đang trống thì tự điền
  const handleToggleTask = (taskKey) => {
    const isSelected = formData.taskKeys.includes(taskKey)
    if (isSelected) {
      setFormData({
        ...formData,
        taskKeys: formData.taskKeys.filter((k) => k !== taskKey),
      })
    } else {
      const targetTask = taskMap.get(taskKey)
      const nextData = {
        ...formData,
        taskKeys: [...formData.taskKeys, taskKey],
      }
      if (targetTask) {
        if (!nextData.project && targetTask.project) nextData.project = targetTask.project
        if (!nextData.sprint && targetTask.sprint) nextData.sprint = targetTask.sprint
        if (!nextData.quarter && targetTask.quarter) nextData.quarter = targetTask.quarter
        if (!nextData.year && targetTask.year) nextData.year = targetTask.year
      }
      setFormData(nextData)
    }
  }

  // Tự động đếm issueCount khi gõ nội dung (nếu chưa khóa sửa tay)
  const handleContentChange = (val) => {
    const updated = { ...formData, content: val }
    if (!isAutoCountLocked) {
      updated.issueCount = extractIssueCount(val)
    }
    setFormData(updated)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(e)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText size={18} />
            </span>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {editingId ? 'Chỉnh sửa mục Clear Doc' : 'Thêm mới mục Clear Doc'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
          {/* Banner AI Quick-fill bên trong form */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Bạn có đoạn văn bản copy? Dùng AI Smart Parser để tự động điền và gộp dữ liệu.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenAiModal()
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs shrink-0 ml-3 transition-colors"
            >
              Mở AI Parser
            </button>
          </div>

          {/* Dự án, Quý, Sprint */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Dự án <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
              >
                {availableProjects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Quý đánh giá
              </label>
              <input
                type="text"
                placeholder="VD: Q3 hoặc Q3-2026"
                value={formData.quarter ? `${formData.quarter}-${formData.year || ''}` : ''}
                onChange={(e) => {
                  const val = e.target.value.trim()
                  const parts = val.split('-')
                  setFormData({
                    ...formData,
                    quarter: parts[0] || '',
                    year: parts[1] ? Number(parts[1]) : formData.year,
                  })
                }}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sprint
              </label>
              <input
                type="text"
                placeholder="VD: GMS 8.6"
                value={formData.sprint}
                onChange={(e) => setFormData({ ...formData, sprint: e.target.value })}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>

          {/* CHỌN VÀ GỘP NHIỀU TASK */}
          <div className="space-y-2 p-3.5 bg-gray-50/80 dark:bg-neutral-800/60 rounded-xl border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <span>Chọn các Task gộp chung vào thread này</span>
                <span className="text-red-500">*</span>
                <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                  ({formData.taskKeys.length} task đã chọn)
                </span>
              </label>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Chỉ áp dụng Task & Support
              </span>
            </div>

            {/* Các task đã chọn (Badges) */}
            {formData.taskKeys.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-1">
                {formData.taskKeys.map((k) => {
                  const t = taskMap.get(k)
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                    >
                      <span className="font-mono">{k}</span>
                      {t?.summary && (
                        <span className="font-normal text-[11px] text-blue-700/80 dark:text-blue-300/80 max-w-[130px] truncate">
                          - {t.summary}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleTask(k)}
                        className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-500/40 rounded text-blue-600 dark:text-blue-300"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Tìm kiếm và chọn thêm task */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Gõ mã task (GOP-...) hoặc từ khóa tên task để tìm..."
                  value={taskSearchInModal}
                  onChange={(e) => setTaskSearchInModal(e.target.value)}
                  className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                />
                <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              </div>

              {/* Danh sách task có thể chọn */}
              <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-neutral-700 rounded-lg divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-800">
                {modalTaskOptions.length === 0 ? (
                  <div className="p-2 text-center text-xs text-gray-400">
                    Không tìm thấy task phù hợp
                  </div>
                ) : (
                  modalTaskOptions.map((t) => {
                    const isChecked = formData.taskKeys.includes(t.key)
                    return (
                      <div
                        key={t.key}
                        onClick={() => handleToggleTask(t.key)}
                        className="flex items-center justify-between px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                          <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 font-mono">
                            {t.key}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 truncate">
                            {t.summary}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <TaskTypeBadge type={t.type} />
                          <span className="text-[10px] text-gray-400">
                            {t.sprint || 'No sprint'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* LINK THREAD CLEAR */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tên hiển thị thread clear <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Clear doc về các task liên quan tới Phím tắt"
                value={formData.threadTitle}
                onChange={(e) => setFormData({ ...formData, threadTitle: e.target.value })}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                <span>Đường dẫn URL liên kết thread (tùy chọn)</span>
                <span className="text-[11px] font-normal text-gray-400">Slack, Lark, Confluence, Google Docs...</span>
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.threadUrl}
                onChange={(e) => setFormData({ ...formData, threadUrl: e.target.value })}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>

          {/* CÁC VẤN ĐỀ / NỘI DUNG CLEAR & TỔNG VẤN ĐỀ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Các vấn đề / nội dung clear doc <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Tổng vấn đề:
                </span>
                <input
                  type="number"
                  min="1"
                  value={formData.issueCount}
                  onChange={(e) => {
                    setIsAutoCountLocked(true)
                    setFormData({ ...formData, issueCount: Math.max(1, Number(e.target.value) || 1) })
                  }}
                  className="w-16 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-center font-bold text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40"
                />
                {isAutoCountLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoCountLocked(false)
                      setFormData({ ...formData, issueCount: extractIssueCount(formData.content) })
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    title="Tự động đếm lại từ nội dung"
                  >
                    Tự đếm lại
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={7}
              required
              placeholder={`1. Về UI trong doc\n   Hiện tại em thấy trong doc đang có 2 hình ảnh phần Phím tắt hơi khác nhau. Mình sẽ chốt UI theo hình nào vậy chị?\n2. Tác vụ "Mở danh sách phím tắt"\n   Em thấy có cấu hình tác vụ "Mở danh sách phím tắt" với phím Ctrl + /. Khi nhấn thì hiển thị dạng gì ạ?`}
              value={formData.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg p-3 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500/40"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Mẹo: Bạn có thể gõ danh sách số 1. ..., 2. ... hệ thống sẽ tự động gợi ý đếm số lượng vấn đề.</span>
              <span>{extractIssueCount(formData.content)} mục được phát hiện</span>
            </div>
          </div>

          {/* Footer Modal Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              {editingId ? 'Cập nhật Clear Doc' : 'Lưu Clear Doc'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
