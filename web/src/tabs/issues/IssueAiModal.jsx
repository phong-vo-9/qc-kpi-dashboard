import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, Bot, X, ClipboardPaste, RotateCcw,
  CheckCircle2, ExternalLink, Calendar, AlertTriangle,
  Clock, ShieldAlert, AlertCircle, Plus, Trash2, ArrowRight,
  Layers, Lightbulb, Check, RefreshCw
} from 'lucide-react'
import { api } from '../../lib/api.js'
import { detectLinkType, STATUS_META, PRIORITY_META } from './issue-utils.js'

const SAMPLE_TEXT = `Hôm nay trên Staging hệ thống bị lỗi thanh toán VNPAY trả về mã 99 khi user book vé giường nằm. Dev đang nghi ngờ do cấu hình sai secret key ở Payment Gateway.
Thread Slack trao đổi với Dev: https://vexere.slack.com/archives/C018WQWPR9Q/p1784016615812979
Ticket Jira: https://jira.vexere.net/browse/GOP-3891
Tạm thời Backend đã rollback về cấu hình cũ để không ảnh hưởng các tester khác, sáng mai Dev update lại key và QC cần retest lại toàn bộ.`

export default function IssueAiModal({
  isOpen,
  onClose,
  onSave,
  currentUser = 'QC',
}) {
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedSample, setCopiedSample] = useState(false)

  // Clear state when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
    }
  }, [isOpen])

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip && clip.trim()) {
        setRawText(clip.trim())
      }
    } catch (err) {
      setErrorMsg('Không thể truy cập Clipboard: ' + err.message)
    }
  }

  // Load sample text
  const handleLoadSample = () => {
    setRawText(SAMPLE_TEXT)
    setCopiedSample(true)
    setTimeout(() => setCopiedSample(false), 2000)
  }

  // Clear input
  const handleClear = () => {
    setRawText('')
    setParsedData(null)
    setErrorMsg('')
  }

  // Call AI parse API
  const handleAiParse = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Vui lòng nhập nội dung hoặc dán ghi chú vấn đề!')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const res = await api('/api/issues/ai-parse', {
        method: 'POST',
        body: JSON.stringify({ text: rawText.trim() }),
      })

      if (res.error) throw new Error(res.error)

      setParsedData({
        createdDate: new Date().toISOString().split('T')[0],
        title: res.title || '',
        content: res.content || rawText.trim(),
        links: Array.isArray(res.links) ? res.links : [],
        solution: res.solution || '',
        priority: res.priority || 'medium',
        status: res.status || 'open',
        isFallback: Boolean(res.isFallback),
      })
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi gọi AI phân tích')
    } finally {
      setLoading(false)
    }
  }

  // Update field in parsed result
  const handleFieldChange = (field, value) => {
    setParsedData((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  // Add/remove link in preview
  const handleAddLink = () => {
    if (!parsedData) return
    setParsedData({
      ...parsedData,
      links: [...parsedData.links, { title: '', url: '' }],
    })
  }

  const handleLinkChange = (index, field, value) => {
    if (!parsedData) return
    const next = [...parsedData.links]
    next[index][field] = value
    setParsedData({ ...parsedData, links: next })
  }

  const handleRemoveLink = (index) => {
    if (!parsedData) return
    setParsedData({
      ...parsedData,
      links: parsedData.links.filter((_, i) => i !== index),
    })
  }

  // Save to database
  const handleSave = async () => {
    if (!parsedData) return
    if (!parsedData.title.trim() && !parsedData.content.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề hoặc nội dung vấn đề!')
      return
    }

    const validLinks = (parsedData.links || [])
      .map((l) => ({ title: (l.title || '').trim(), url: (l.url || '').trim() }))
      .filter((l) => l.url.length > 0)

    try {
      await onSave({
        createdDate: parsedData.createdDate,
        title: parsedData.title.trim(),
        content: parsedData.content.trim(),
        solution: parsedData.solution.trim(),
        priority: parsedData.priority,
        status: parsedData.status,
        links: validLinks,
        assignee: currentUser,
      })
      handleClear()
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi lưu vấn đề')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/40 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/10">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>AI Phân tích & Tự tạo Vấn đề</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  Smart Assistant
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dán ghi chú thô hoặc đoạn chat — AI sẽ tự động trau chuốt, bóc tách link và gợi ý giải pháp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/80 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột Trái: Input ghi chú thô (5 columns) */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span>Nội dung thô / Đoạn trao đổi</span>
                  <span className="text-rose-500">*</span>
                </label>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    title="Dán từ Clipboard"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <ClipboardPaste size={12} />
                    <span>Dán</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    title="Nạp văn bản mẫu"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                  >
                    {copiedSample ? <Check size={12} /> : <Lightbulb size={12} />}
                    <span>Mẫu</span>
                  </button>

                  {rawText && (
                    <button
                      type="button"
                      onClick={handleClear}
                      title="Xóa trắng"
                      className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div className="relative flex-1 min-h-[260px]">
                <textarea
                  rows={13}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Ví dụ: Hôm nay trên Staging gặp lỗi tính sai phụ phí khi book vé VIP. Đã bàn với Backend ở thread Slack https://... và tạo task GOP-1234. Giải pháp là rollback và retest lại..."
                  className="w-full h-full p-3.5 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs leading-relaxed text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-mono"
                />
              </div>

              {/* Phân tích CTA Button */}
              <button
                type="button"
                onClick={handleAiParse}
                disabled={loading || !rawText.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>AI đang phân tích & cấu trúc hóa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Phân tích & Tự tạo vấn đề bằng AI</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            {/* Cột Phải: Kết quả phân tích (7 columns) */}
            <div className="lg:col-span-7 flex flex-col bg-gray-50/60 dark:bg-neutral-800/30 border border-gray-200/80 dark:border-neutral-800 rounded-xl p-4 min-h-[360px]">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-neutral-800 mb-3">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <Bot size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Kết quả AI cấu trúc hóa (Cho phép chỉnh sửa trước khi lưu)</span>
                </span>
                {parsedData && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Đã hoàn thiện
                  </span>
                )}
              </div>

              {!parsedData ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-gray-500 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Sparkles size={28} />
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Chưa có dữ liệu phân tích
                  </div>
                  <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                    Hãy nhập hoặc dán nội dung thô vào cột bên trái, sau đó bấm nút{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">"Phân tích & Tự tạo vấn đề bằng AI"</strong> để AI tự động trích xuất các trường thông tin.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                  {/* Row: Ngày tạo & Trạng thái & Mức độ */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Ngày tạo
                      </label>
                      <input
                        type="date"
                        value={parsedData.createdDate}
                        onChange={(e) => handleFieldChange('createdDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Trạng thái suy luận
                      </label>
                      <select
                        value={parsedData.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        <option value="open">Đang xử lý (Open)</option>
                        <option value="resolved">Đã giải quyết (Resolved)</option>
                        <option value="closed">Đã đóng (Closed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Mức độ ưu tiên
                      </label>
                      <select
                        value={parsedData.priority}
                        onChange={(e) => handleFieldChange('priority', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        <option value="critical">Nghiêm trọng (Critical)</option>
                        <option value="high">Cao (High)</option>
                        <option value="medium">Trung bình (Medium)</option>
                        <option value="low">Thấp (Low)</option>
                      </select>
                    </div>
                  </div>

                  {/* Tiêu đề */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>Tiêu đề chuẩn hóa</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">✨ AI đặt tên</span>
                    </label>
                    <input
                      type="text"
                      value={parsedData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-neutral-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Nội dung trau chuốt */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>Nội dung vấn đề chi tiết</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">✨ AI viết lại mạch lạc</span>
                    </label>
                    <textarea
                      rows={4}
                      value={parsedData.content}
                      onChange={(e) => handleFieldChange('content', e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs leading-relaxed text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                    />
                  </div>

                  {/* Links trích xuất */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                        Link trao đổi / minh chứng ({parsedData.links?.length || 0})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                        <span>Thêm link</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {parsedData.links?.length === 0 ? (
                        <div className="text-[11px] text-gray-400 italic p-2 bg-white dark:bg-neutral-800 rounded border border-dashed border-gray-200 dark:border-neutral-700">
                          Không tìm thấy link trong văn bản thô. Bạn có thể bấm "+ Thêm link" nếu cần.
                        </div>
                      ) : (
                        parsedData.links.map((linkItem, lIdx) => {
                          const detected = detectLinkType(linkItem.url)
                          return (
                            <div
                              key={lIdx}
                              className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs"
                            >
                              <input
                                type="text"
                                placeholder="Tên gợi nhớ"
                                value={linkItem.title}
                                onChange={(e) => handleLinkChange(lIdx, 'title', e.target.value)}
                                className="w-1/3 px-2 py-1 bg-gray-50 dark:bg-neutral-700/60 border border-gray-200 dark:border-neutral-600 rounded text-[11px] text-gray-800 dark:text-gray-200 focus:outline-none"
                              />
                              <input
                                type="url"
                                placeholder="URL https://..."
                                value={linkItem.url}
                                onChange={(e) => handleLinkChange(lIdx, 'url', e.target.value)}
                                className="flex-1 px-2 py-1 bg-gray-50 dark:bg-neutral-700/60 border border-gray-200 dark:border-neutral-600 rounded text-[11px] text-gray-800 dark:text-gray-200 focus:outline-none"
                              />
                              <span
                                className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${detected.color}`}
                              >
                                {detected.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLink(lIdx)}
                                className="p-1 text-gray-400 hover:text-rose-500 rounded"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Hướng giải quyết */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>Hướng giải quyết</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✨ AI đề xuất & cấu trúc</span>
                    </label>
                    <textarea
                      rows={3}
                      value={parsedData.solution}
                      onChange={(e) => handleFieldChange('solution', e.target.value)}
                      placeholder="Ghi nhận phương án xử lý hoặc checklist giải quyết..."
                      className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs leading-relaxed text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {parsedData && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Kiểm tra lại nội dung trước khi lưu</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!parsedData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Lưu vấn đề vào hệ thống</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
