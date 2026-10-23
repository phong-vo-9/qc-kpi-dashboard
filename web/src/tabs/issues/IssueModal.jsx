import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Plus, Trash2, Link as LinkIcon, ExternalLink,
  Calendar, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  ShieldAlert, HelpCircle, FileText, Sparkles, RefreshCw,
  Image as ImageIcon, ImagePlus, Upload, Eye, Loader2
} from 'lucide-react'
import { api } from '../../lib/api.js'
import {
  compressImageFile, formatBytes, isImageUrl,
  detectLinkType, STATUS_META, PRIORITY_META
} from './issue-utils.js'
import IssueImageViewer from './IssueImageViewer.jsx'

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
  const [images, setImages] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputVal, setUrlInputVal] = useState('')
  const [pasteNotice, setPasteNotice] = useState('')
  const [previewViewer, setPreviewViewer] = useState(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const fileInputRef = useRef(null)

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
      if (Array.isArray(res.images) && res.images.length > 0) {
        setImages((prev) => {
          const existingUrls = new Set(prev.map((img) => (img.url || img)))
          const newImgs = res.images.filter((img) => !existingUrls.has(img.url || img))
          return [...prev, ...newImgs]
        })
      }
    } catch (err) {
      setErrorMsg('Lỗi AI: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // Populate data when modal opens
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

      const existingImages = Array.isArray(issue.images) && issue.images.length > 0
        ? issue.images.map((img) => (typeof img === 'string' ? { url: img, name: 'Hình ảnh' } : img))
        : []
      setImages(existingImages)
    } else {
      setCreatedDate(new Date().toISOString().split('T')[0])
      setTitle('')
      setContent('')
      setSolution('')
      setStatus('open')
      setPriority('medium')
      setLinks([{ title: '', url: '' }])
      setImages([])
    }
    setErrorMsg('')
    setPasteNotice('')
    setShowUrlInput(false)
    setUrlInputVal('')
    setSubmitting(false)
  }, [isOpen, issue])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (previewViewer) {
          setPreviewViewer(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, previewViewer])

  // Support direct paste from clipboard (Win+Shift+S / Snipping Tool / Ctrl+V)
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageItems = Array.from(items).filter((it) => it.type && it.type.startsWith('image/'))
      if (imageItems.length === 0) return

      const files = imageItems.map((it) => it.getAsFile()).filter(Boolean)
      if (files.length === 0) return

      setCompressing(true)
      try {
        const compressedList = await Promise.all(files.map((file) => compressImageFile(file)))
        setImages((prev) => [...prev, ...compressedList])
        setPasteNotice(`✨ Đã dán ${compressedList.length} ảnh chụp màn hình từ Clipboard!`)
        setTimeout(() => setPasteNotice(''), 3500)
      } catch (err) {
        console.error('Lỗi khi nén ảnh clipboard:', err)
        setErrorMsg('Không thể xử lý ảnh dán từ clipboard: ' + err.message)
      } finally {
        setCompressing(false)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen])

  if (!isOpen) return null

  // File upload processing
  const handleProcessFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    const imageFiles = Array.from(fileList).filter((f) => f.type && f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)')
      return
    }

    setCompressing(true)
    setErrorMsg('')
    try {
      const processed = await Promise.all(imageFiles.map((f) => compressImageFile(f)))
      setImages((prev) => [...prev, ...processed])
    } catch (err) {
      setErrorMsg('Lỗi xử lý ảnh: ' + err.message)
    } finally {
      setCompressing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeave = () => {
    setIsDraggingOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (e.dataTransfer?.files) {
      handleProcessFiles(e.dataTransfer.files)
    }
  }

  // Add image by URL
  const handleAddUrlImage = () => {
    const trimmed = urlInputVal.trim()
    if (!trimmed) return
    setImages((prev) => [
      ...prev,
      {
        url: trimmed,
        name: trimmed.split('/').filter(Boolean).pop() || 'Hình ảnh liên kết',
      },
    ])
    setUrlInputVal('')
    setShowUrlInput(false)
  }

  // Remove image
  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Update image name
  const handleImageNameChange = (index, newName) => {
    setImages((prev) =>
      prev.map((img, idx) => (idx === index ? { ...img, name: newName } : img))
    )
  }

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

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && !title.trim()) {
      setErrorMsg('Vui lòng nhập nội dung vấn đề')
      return
    }

    const validLinks = links
      .map((l) => ({
        title: (l.title || '').trim(),
        url: (l.url || '').trim(),
      }))
      .filter((l) => l.url.length > 0)

    const validImages = images
      .map((img) => ({
        url: typeof img === 'string' ? img : img.url,
        name: (typeof img === 'object' && img.name ? img.name : 'Hình ảnh').trim(),
        size: typeof img === 'object' ? img.size : null,
      }))
      .filter((img) => img.url && img.url.trim().length > 0)

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
        images: validImages,
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
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
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

          {pasteNotice && (
            <div className="p-2.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between animate-fade-in">
              <span>{pasteNotice}</span>
              <button
                type="button"
                onClick={() => setPasteNotice('')}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 text-[11px]"
              >
                ✕
              </button>
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

          {/* CỘT / KHU VỰC HÌNH ẢNH MINH CHỨNG */}
          <div className="space-y-2.5 pt-1 border-t border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon size={14} className="text-blue-500 dark:text-blue-400" />
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Hình ảnh minh chứng / Screenshot (nếu có)
                </label>
                {images.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                    {images.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {showUrlInput ? 'Ẩn link URL' : '+ Nhập link URL ảnh'}
                </button>
              </div>
            </div>

            {/* URL input accordion */}
            {showUrlInput && (
              <div className="flex items-center gap-2 p-2 bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/70 dark:border-blue-500/30 rounded-lg animate-fade-in">
                <input
                  type="url"
                  placeholder="Dán link ảnh (https://...png, jpg, webp...)"
                  value={urlInputVal}
                  onChange={(e) => setUrlInputVal(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-blue-200 dark:border-neutral-700 rounded-md text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddUrlImage}
                  disabled={!urlInputVal.trim()}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
                >
                  Thêm ảnh
                </button>
              </div>
            )}

            {/* Drag & Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-3.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/15'
                  : 'border-gray-200 dark:border-neutral-700/80 bg-gray-50/50 dark:bg-neutral-800/40 hover:bg-gray-100/60 dark:hover:bg-neutral-800/70 hover:border-gray-300 dark:hover:border-neutral-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleProcessFiles(e.target.files)}
                className="hidden"
              />

              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 mb-1.5">
                {compressing ? (
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                ) : (
                  <ImagePlus size={18} />
                )}
              </div>

              <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
                {compressing ? (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Đang nén & tối ưu ảnh...</span>
                ) : (
                  <>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      Bấm để chọn ảnh từ máy
                    </span>{' '}
                    hoặc kéo thả vào đây
                  </>
                )}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                💡 <strong className="text-gray-600 dark:text-gray-400 font-semibold">Mẹo:</strong> Nhấn{' '}
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded">
                  Ctrl + V
                </kbd>{' '}
                để dán trực tiếp ảnh chụp màn hình bất kỳ lúc nào
              </div>
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group/img relative rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/60 overflow-hidden flex flex-col shadow-2xs hover:shadow-sm transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative h-24 w-full bg-gray-100 dark:bg-neutral-900 cursor-pointer overflow-hidden"
                      onClick={() => setPreviewViewer({ images, index: idx })}
                    >
                      <img
                        src={img.url}
                        alt={img.name || `Ảnh ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white backdrop-blur-2xs">
                          <Eye size={11} /> Phóng to
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(idx)
                        }}
                        title="Xóa ảnh này"
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-rose-600 text-white transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>

                      {/* Size tag */}
                      {img.size && (
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-black/60 text-white/90 backdrop-blur-2xs">
                          {formatBytes(img.size)}
                        </div>
                      )}
                    </div>

                    {/* Caption edit */}
                    <div className="p-1.5 bg-white dark:bg-neutral-800 border-t border-gray-100 dark:border-neutral-700/60">
                      <input
                        type="text"
                        placeholder="Chú thích ảnh..."
                        value={img.name || ''}
                        onChange={(e) => handleImageNameChange(idx, e.target.value)}
                        className="w-full px-1.5 py-0.5 text-[11px] bg-transparent text-gray-700 dark:text-gray-300 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
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
                        className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer"
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || (!content.trim() && !title.trim())}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Đang lưu...' : issue ? 'Cập nhật' : 'Thêm vấn đề'}
            </button>
          </div>
        </form>

        {/* Lightbox Preview if clicked inside modal */}
        {previewViewer && (
          <IssueImageViewer
            images={previewViewer.images}
            initialIndex={previewViewer.index}
            title={title || 'Xem trước ảnh minh chứng'}
            onClose={() => setPreviewViewer(null)}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
