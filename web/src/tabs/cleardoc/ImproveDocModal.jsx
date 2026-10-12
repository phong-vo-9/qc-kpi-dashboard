import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, X, Search, Layers, Check, ExternalLink,
  MessageSquare, FileText, AlertCircle, Lightbulb
} from 'lucide-react'
import { TaskTypeBadge } from './ClearDocBadges.jsx'

const RESOLUTION_SUGGESTIONS = [
  'Tách card riêng để xử lý.',
  'Tạm bypass, fix sau.',
  'Improve cơ chế đồng bộ sau.',
  'UI enhance sau.',
  'Chờ PO confirm.',
  'Bổ sung spec Sprint tới.',
]

export function ImproveDocModal({
  isOpen,
  onClose,
  editingId,
  formData,
  setFormData,
  eligibleTasks = [],
  taskMap = new Map(),
  availableProjects = [],
  onSave,
}) {
  const [taskSearch, setTaskSearch] = useState('')
  const [isSearchingTask, setIsSearchingTask] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTaskSearch('')
      setIsSearchingTask(false)
    }
  }, [isOpen])

  // Lọc task gợi ý cho Task gốc
  const filteredTaskOptions = useMemo(() => {
    let pool = eligibleTasks
    if (formData.project && formData.project !== 'all') {
      pool = pool.filter((t) => t.project === formData.project)
    }
    if (taskSearch.trim()) {
      const q = taskSearch.trim().toLowerCase()
      pool = pool.filter((t) => t.key.toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q))
    }
    return pool.slice(0, 30)
  }, [eligibleTasks, formData.project, taskSearch])

  if (!isOpen) return null

  const handleSelectOriginTask = (taskKey) => {
    const t = taskMap.get(taskKey)
    setFormData((prev) => ({
      ...prev,
      originTaskKey: taskKey,
      project: t?.project || prev.project || 'GOP',
      sprint: t?.sprint || prev.sprint || '',
      quarter: t?.quarter || prev.quarter || '',
      year: t?.year || prev.year || null,
    }))
    setIsSearchingTask(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(e)
  }

  const selectedOriginTask = formData.originTaskKey ? taskMap.get(formData.originTaskKey) : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Lightbulb size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {editingId ? 'Chỉnh sửa vấn đề Improve' : 'Thêm mới vấn đề Improve'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ghi nhận các nội dung phát sinh ngoài scope / cần cải tiến thêm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
          {/* TRƯỜNG 1: TASK GỐC */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                <span>Task gốc phát sinh vấn đề</span>
                <span className="text-red-500">*</span>
              </label>
              {selectedOriginTask && (
                <button
                  type="button"
                  onClick={() => setIsSearchingTask(!isSearchingTask)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isSearchingTask ? 'Đóng tìm kiếm' : 'Đổi task khác'}
                </button>
              )}
            </div>

            {/* Task đã chọn */}
            {formData.originTaskKey && !isSearchingTask ? (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/40 dark:bg-blue-500/5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formData.originTaskKey}
                    </span>
                    {selectedOriginTask?.type && <TaskTypeBadge type={selectedOriginTask.type} />}
                    {formData.sprint && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 text-gray-500 border border-gray-200 dark:border-neutral-700">
                        {formData.sprint}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                    {selectedOriginTask?.summary || 'Không tìm thấy chi tiết task'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchingTask(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                >
                  Thay đổi
                </button>
              </div>
            ) : (
              /* Ô tìm kiếm và chọn task */
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Tìm theo mã task (VD: GOP-3986) hoặc tên tóm tắt..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-700 divide-y divide-gray-100 dark:divide-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 p-1">
                  {filteredTaskOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">
                      Không tìm thấy task phù hợp trong Sprint này. Bạn có thể tự gõ mã task:
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (taskSearch.trim()) {
                              setFormData((prev) => ({
                                ...prev,
                                originTaskKey: taskSearch.trim().toUpperCase(),
                              }))
                              setIsSearchingTask(false)
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Chọn mã "{taskSearch.trim().toUpperCase()}"
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredTaskOptions.map((t) => (
                      <div
                        key={t.key}
                        onClick={() => handleSelectOriginTask(t.key)}
                        className="p-2 rounded hover:bg-purple-50 dark:hover:bg-neutral-700/60 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 mr-2">
                            {t.key}
                          </span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {t.summary}
                          </span>
                        </div>
                        {t.type && <TaskTypeBadge type={t.type} />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TRƯỜNG 2: CARD XỬ LÝ (TUỲ CHỌN) */}
          <div>
            <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
              Card xử lý (Jira Key làm thêm)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.targetTaskKey || ''}
                onChange={(e) => setFormData({ ...formData, targetTaskKey: e.target.value.toUpperCase() })}
                placeholder="VD: GOP-4394 (để trống nếu chưa có card, sẽ hiển thị 'Chưa bổ sung card')"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 font-mono font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              💡 Nếu chưa tạo card Jira, bạn có thể để trống và bổ sung nhanh sau trực tiếp trên bảng.
            </p>
          </div>

          {/* TRƯỜNG 3: LINK SLACK */}
          <div>
            <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
              Link Slack thread / tin nhắn thảo luận
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-amber-500">
                <MessageSquare size={14} />
              </span>
              <input
                type="url"
                value={formData.slackUrl || ''}
                onChange={(e) => setFormData({ ...formData, slackUrl: e.target.value })}
                placeholder="https://vexere.slack.com/archives/.../p169..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* TRƯỜNG 4: NỘI DUNG IMPROVE */}
          <div>
            <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
              <span>Nội dung Improve</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="VD: Lịch sử tạo/thu hồi yêu cầu Sửa cước hiển thị thừa tiền hủy, tiền hoàn dù không có hai field này khi tạo yêu cầu..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed text-xs sm:text-sm"
            />
          </div>

          {/* TRƯỜNG 5: HƯỚNG XỬ LÝ ĐÃ GHI NHẬN */}
          <div>
            <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
              Hướng xử lý đã ghi nhận
            </label>
            <input
              type="text"
              value={formData.resolution || ''}
              onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
              placeholder="VD: Tách card riêng để xử lý / Tạm bypass, fix sau..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs sm:text-sm mb-2"
            />

            {/* Gợi ý nhanh */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400">Gợi ý nhanh:</span>
              {RESOLUTION_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setFormData({ ...formData, resolution: sug })}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:text-purple-700 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-end gap-2 bg-gray-50/60 dark:bg-neutral-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
          >
            {editingId ? 'Cập nhật Improve Doc' : 'Lưu Improve Doc'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
