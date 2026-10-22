import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Plus, Trash2, Link as LinkIcon, ExternalLink,
  Calendar, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  ShieldAlert, HelpCircle, FileText, Sparkles, RefreshCw
} from 'lucide-react'
import { api } from '../../lib/api.js'
import { detectLinkType, STATUS_META, PRIORITY_META } from './issue-utils.js'

export default function IssueModal({
  isOpen,
  onClose,
  onSave,
  issue = null,
  currentUser = 'QC',
}) {
  const [createdDate, setCreatedDate] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [solution, setSolution] = useState('')
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState('medium')
  const [links, setLinks] = useState([{ title: '', url: '' }])
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiRefine = async () => {
    if (!content.trim() && !title.trim()) {
      setErrorMsg('Vui lòng nhập ít nhất một vài từ mô tả vấn đề để AI hỗ trợ hoàn thiện')
      return
    }
    setAiLoading(true)
    setErrorMsg('')
    try {
      const res = await api('/api/issues/ai-parse', {
        method: 'POST',
        body: JSON.stringify({ text: `${title ? title + '\n' : ''}${content}` }),
      })
      if (res.title && (!title.trim() || title.length < 20)) setTitle(res.title)
      if (res.content) setContent(res.content)
      if (res.solution && !solution.trim()) setSolution(res.solution)
      if (res.priority) setPriority(res.priority)
      if (res.status) setStatus(res.status)
      if (Array.isArray(res.links) && res.links.length > 0) {
        setLinks((prev) => {
          const existingUrls = new Set(prev.map((l) => l.url.trim()))
          const newLinks = res.links.filter((l) => !existingUrls.has(l.url.trim()))
          const filteredPrev = prev.filter((l) => l.url.trim().length > 0)
          const merged = [...filteredPrev, ...newLinks]
          return merged.length > 0 ? merged : [{ title: '', url: '' }]
        })
      }
    } catch (err) {
      setErrorMsg('Lỗi AI: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    if (issue) {
      setCreatedDate(issue.createdDate || new Date().toISOString().split('T')[0])
      setTitle(issue.title || '')
      setContent(issue.content || '')
      setSolution(issue.solution || '')
      setStatus(issue.status || 'open')
      setPriority(issue.priority || 'medium')
      const existingLinks = Array.isArray(issue.links) && issue.links.length > 0
        ? issue.links.map((l) => ({ title: l.title || '', url: l.url || '' }))
        : [{ title: '', url: '' }]
      setLinks(existingLinks)
    } else {
      setCreatedDate(new Date().toISOString().split('T')[0])
      setTitle('')
      setContent('')
      setSolution('')
      setStatus('open')
      setPriority('medium')
      setLinks([{ title: '', url: '' }])
    }
    setErrorMsg('')
    setSubmitting(false)
  }, [isOpen, issue])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Links management
  const handleAddLink = () => {
    setLinks([...links, { title: '', url: '' }])
  }

  const handleLinkChange = (index, field, value) => {
    const next = [...links]
    next[index][field] = value
    setLinks(next)
  }

  const handleRemoveLink = (index) => {
    if (links.length === 1) {
      setLinks([{ title: '', url: '' }])
    } else {
      setLinks(links.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && !title.trim()) {
      setErrorMsg('Vui lòng nhập nội dung vấn đề')
      return
    }

    // Filter valid links (has url)
    const validLinks = links
      .map((l) => ({
        title: (l.title || '').trim(),
        url: (l.url || '').trim(),
      }))
      .filter((l) => l.url.length > 0)

    setSubmitting(true)
    setErrorMsg('')

    try {
      await onSave({
        id: issue?.id,
        createdDate,
        title: title.trim(),
        content: content.trim(),
        solution: solution.trim(),
        status,
        priority,
        links: validLinks,
        assignee: issue?.assignee || currentUser,
      })
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi lưu vấn đề')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {issue ? 'Chỉnh sửa Vấn đề' : 'Thêm Vấn đề mới'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
              {errorMsg}
            </div>
          )}

          {/* Row 1: Ngày tạo & Trạng thái & Mức độ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Ngày tạo */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Ngày tạo vấn đề <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={createdDate}
                  onChange={(e) => setCreatedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="open">Đang xử lý (Open)</option>
                <option value="resolved">Đã giải quyết (Resolved)</option>
                <option value="closed">Đã đóng (Closed)</option>
              </select>
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="critical">Nghiêm trọng (Critical)</option>
                <option value="high">Cao (High)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="low">Thấp (Low)</option>
              </select>
            </div>
          </div>

          {/* Tiêu đề ngắn gọn */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Tiêu đề tóm tắt (tuỳ chọn)
            </label>
            <input
              type="text"
              placeholder="VD: Lỗi tính sai phí bảo hiểm trên mobile web..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Nội dung vấn đề (Bắt buộc) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nội dung vấn đề <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAiRefine}
                disabled={aiLoading || (!content.trim() && !title.trim())}
                title="AI tự động phân tích, đặt tiêu đề, bóc tách link và gợi ý giải pháp"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {aiLoading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>{aiLoading ? 'AI đang tối ưu...' : '✨ AI Hoàn thiện'}</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              placeholder="Mô tả cụ thể vấn đề phát sinh, hiện tượng gặp phải, phạm vi ảnh hưởng..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs leading-relaxed text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
            />
          </div>

          {/* Link trao đổi / minh chứng (HỖ TRỢ NHIỀU LINK) */}
          <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Link trao đổi / minh chứng (có thể thêm nhiều link)
              </label>
              <button
                type="button"
                onClick={handleAddLink}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Thêm link khác</span>
              </button>
            </div>

            <div className="space-y-2">
              {links.map((linkItem, idx) => {
                const detected = detectLinkType(linkItem.url)
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-200/80 dark:border-neutral-800 rounded-lg"
                  >
                    {/* Tên link */}
                    <div className="w-full sm:w-1/3">
                      <input
                        type="text"
                        placeholder="Tên gợi nhớ (VD: Slack thread, Jira...)"
                        value={linkItem.title}
                        onChange={(e) => handleLinkChange(idx, 'title', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* URL */}
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={linkItem.url}
                          onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Tag nhận diện nguồn */}
                      {linkItem.url && (
                        <span
                          className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${detected.color}`}
                        >
                          {detected.label}
                        </span>
                      )}

                      {/* Nút xóa link */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        title="Xóa link này"
                        className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hướng giải quyết vấn đề */}
          <div className="pt-1 border-t border-gray-100 dark:border-neutral-800">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Hướng giải quyết vấn đề
            </label>
            <textarea
              rows={3}
              placeholder="Ghi nhận phương án xử lý, thỏa thuận thống nhất, hoặc các bước đã khắc phục..."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs leading-relaxed text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && !title.trim())}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang lưu...' : issue ? 'Cập nhật' : 'Thêm vấn đề'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
