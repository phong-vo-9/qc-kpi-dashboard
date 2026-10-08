import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, Bot, X, ClipboardPaste, RotateCcw,
  CheckCircle2, ExternalLink, Calendar, Layers, Hash, FileText, Check
} from 'lucide-react'
import {
  SAMPLE_NON_ITS_TEXT,
  parseNonItsFeedbackText,
  KNOWN_PROJECTS,
  KNOWN_STATUSES,
  formatIsoToDmy,
} from './non-its-parser.js'

export default function NonItsFeedbackAiModal({
  isOpen,
  onClose,
  onSave,
  showToast,
}) {
  const [rawText, setRawText] = useState('')
  const [formData, setFormData] = useState(null)
  const [copiedSample, setCopiedSample] = useState(false)

  // Tự động phân tích khi văn bản thô thay đổi
  useEffect(() => {
    if (!rawText.trim()) {
      setFormData(null)
      return
    }
    const extracted = parseNonItsFeedbackText(rawText)
    setFormData(extracted)
  }, [rawText])

  if (!isOpen) return null

  // Đọc từ clipboard
  const handlePasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip && clip.trim()) {
        setRawText(clip)
        if (showToast) showToast('Đã dán văn bản từ Clipboard!', 'success')
      } else {
        if (showToast) showToast('Clipboard đang trống!', 'warning')
      }
    } catch (err) {
      if (showToast) showToast('Không thể đọc Clipboard: ' + err.message, 'error')
    }
  }

  // Nạp văn bản mẫu
  const handlePasteSample = () => {
    setRawText(SAMPLE_NON_ITS_TEXT)
    setCopiedSample(true)
    setTimeout(() => setCopiedSample(false), 2000)
    if (showToast) showToast('Đã nạp văn bản mẫu!', 'info')
  }

  // Xóa trắng
  const handleClear = () => {
    setRawText('')
    setFormData(null)
  }

  // Cập nhật trường trong formData
  const handleFieldChange = (field, value) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  // Lưu bản ghi
  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!formData) return
    if (!formData.title?.trim()) {
      if (showToast) showToast('Vui lòng nhập nội dung feedback!', 'warning')
      return
    }
    onSave({
      date: formData.date,
      project: formData.project,
      title: formData.title.trim(),
      slackUrl: formData.slackUrl?.trim() || '',
      slackTitle: formData.slackTitle?.trim() || (formData.slackUrl ? 'Thread Slack' : ''),
      resolution: formData.resolution?.trim() || '',
      status: formData.status || 'Đã xử lý / phản hồi kết luận',
    })
    setRawText('')
    setFormData(null)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-transparent dark:from-blue-950/20 dark:via-indigo-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  AI Trích xuất thông minh Feedback
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  <Sparkles size={11} /> Auto-fill
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dán văn bản feedback từ Slack/chat để AI tự động trích xuất các trường thông tin
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

        {/* Body 2 Cột */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cột trái: Input Raw Text */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <FileText size={14} className="text-blue-500" />
                <span>Nội dung copy / dán (Raw text):</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 transition-colors"
                  title="Dán từ Clipboard hệ thống"
                >
                  <ClipboardPaste size={12} />
                  <span>Dán clipboard</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 transition-colors"
                  title="Thử với văn bản mẫu"
                >
                  {copiedSample ? <Check size={12} className="text-emerald-500" /> : <Sparkles size={12} />}
                  <span>Mẫu</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    title="Xóa trắng"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Dán nội dung vào đây. Ví dụ:\n14/07/2026\nGOP\nPhúc Lợi — phụ phí không tự áp dụng\n[Thread 5](https://vexere.slack.com/archives/...)\nGiải thích ngưỡng giá trị hàng...\nĐã xử lý / phản hồi kết luận`}
              className="w-full flex-1 p-3 text-xs font-mono leading-relaxed rounded-xl border border-gray-300 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-950 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-inner"
            />
            <p className="text-[11px] text-gray-400 italic">
              * Tự động nhận diện Ngày (dd/mm/yyyy), Dự án (GOP, AW...), Link Slack [Thread](url), Nội dung & Trạng thái.
            </p>
          </div>

          {/* Cột phải: Live Extracted Preview Form */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" />
                <span>Kết quả AI trích xuất (Xem & Sửa trực tiếp):</span>
              </label>
              {formData && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> Độ chính xác {formData.confidence}%
                </span>
              )}
            </div>

            {formData ? (
              <div className="space-y-3 bg-gray-50/70 dark:bg-neutral-800/40 p-4 rounded-xl border border-gray-200/80 dark:border-neutral-800 text-xs flex-1">
                {/* Row: Ngày & Dự án */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <Calendar size={12} /> Ngày feedback
                    </label>
                    <input
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => handleFieldChange('date', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <Layers size={12} /> Dự án
                    </label>
                    <select
                      value={formData.project || 'GOP'}
                      onChange={(e) => handleFieldChange('project', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                    >
                      {KNOWN_PROJECTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tiêu đề / Nội dung feedback */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Nội dung feedback <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="VD: Phúc Lợi — phụ phí không tự áp dụng"
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Link Slack & Tiêu đề thread */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Hash size={12} /> Link Slack Thread
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Tên thread (VD: Thread 5)"
                      value={formData.slackTitle || ''}
                      onChange={(e) => handleFieldChange('slackTitle', e.target.value)}
                      className="col-span-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                    />
                    <div className="col-span-2 relative">
                      <input
                        type="url"
                        placeholder="https://vexere.slack.com/archives/..."
                        value={formData.slackUrl || ''}
                        onChange={(e) => handleFieldChange('slackUrl', e.target.value)}
                        className="w-full pr-7 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 font-mono"
                      />
                      {formData.slackUrl && (
                        <a
                          href={formData.slackUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute right-2 top-2 text-blue-500 hover:text-blue-700"
                          title="Mở link thử nghiệm"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nội dung xử lý */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Nội dung xử lý / Giải thích
                  </label>
                  <textarea
                    rows={3}
                    value={formData.resolution || ''}
                    onChange={(e) => handleFieldChange('resolution', e.target.value)}
                    placeholder="Giải thích ngưỡng giá trị hàng và cách tính VAT..."
                    className="w-full p-2.5 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status || 'Đã xử lý / phản hồi kết luận'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                  >
                    {KNOWN_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 text-gray-400">
                <Sparkles size={36} className="text-gray-300 dark:text-neutral-700 mb-3 animate-pulse" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Chưa có dữ liệu trích xuất
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                  Hãy dán nội dung vào ô bên trái hoặc bấm <strong>"Dán clipboard"</strong> / <strong>"Mẫu"</strong> để AI bóc tách ngay tức thì.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/70 dark:bg-neutral-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={!formData || !formData.title?.trim()}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Lưu Feedback vào hệ thống</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
