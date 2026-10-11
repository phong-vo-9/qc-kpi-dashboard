import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Layers, Hash, ExternalLink, Save, Plus } from 'lucide-react'
import { KNOWN_PROJECTS, KNOWN_STATUSES } from './non-its-parser.js'

export default function NonItsFeedbackModal({
  isOpen,
  onClose,
  onSave,
  item = null,
  showToast,
}) {
  const isEdit = Boolean(item && item.id)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    project: 'GOP',
    title: '',
    slackTitle: '',
    slackUrl: '',
    resolution: '',
    status: 'Đã xử lý / phản hồi kết luận',
  })

  useEffect(() => {
    if (item) {
      setFormData({
        id: item.id,
        date: item.date || new Date().toISOString().split('T')[0],
        project: item.project || 'GOP',
        title: item.title || '',
        slackTitle: item.slackTitle || item.slack_title || '',
        slackUrl: item.slackUrl || item.slack_url || '',
        resolution: item.resolution || '',
        status: item.status || 'Đã xử lý / phản hồi kết luận',
      })
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        project: 'GOP',
        title: '',
        slackTitle: '',
        slackUrl: '',
        resolution: '',
        status: 'Đã xử lý / phản hồi kết luận',
      })
    }
  }, [item, isOpen])

  if (!isOpen) return null

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      if (showToast) showToast('Vui lòng nhập nội dung feedback!', 'warning')
      return
    }
    onSave({
      ...formData,
      title: formData.title.trim(),
      slackTitle: formData.slackTitle.trim() || (formData.slackUrl ? 'Thread Slack' : ''),
      slackUrl: formData.slackUrl.trim(),
      resolution: formData.resolution.trim(),
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
              {isEdit ? <Save size={16} /> : <Plus size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {isEdit ? 'Chỉnh sửa Feedback không tạo ITS' : 'Thêm Feedback mới'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lưu trữ và theo dõi các vấn đề xử lý trực tiếp không qua ITS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Row 1: Ngày feedback & Dự án */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-gray-400" /> Ngày feedback <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Layers size={13} className="text-gray-400" /> Dự án <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.project}
                onChange={(e) => handleChange('project', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {KNOWN_PROJECTS.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Nội dung feedback */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nội dung feedback <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Phúc Lợi — phụ phí không tự áp dụng"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Row 3: Slack thread & URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Hash size={13} className="text-gray-400" /> Link Slack Thread
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Tên thread (VD: Thread 5)"
                value={formData.slackTitle}
                onChange={(e) => handleChange('slackTitle', e.target.value)}
                className="col-span-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
              />
              <div className="col-span-2 relative">
                <input
                  type="url"
                  placeholder="https://vexere.slack.com/archives/..."
                  value={formData.slackUrl}
                  onChange={(e) => handleChange('slackUrl', e.target.value)}
                  className="w-full pr-8 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 font-mono"
                />
                {formData.slackUrl && (
                  <a
                    href={formData.slackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-2.5 top-2.5 text-blue-500 hover:text-blue-700"
                    title="Mở link Slack"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Nội dung xử lý */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nội dung xử lý / Giải thích
            </label>
            <textarea
              rows={4}
              placeholder="Giải thích chi tiết ngưỡng giá trị hàng, cách tính VAT hoặc kết luận..."
              value={formData.resolution}
              onChange={(e) => handleChange('resolution', e.target.value)}
              className="w-full p-3 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Row 5: Trạng thái */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trạng thái
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              {KNOWN_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Footer inside form */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              {isEdit ? 'Cập nhật Feedback' : 'Tạo Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
