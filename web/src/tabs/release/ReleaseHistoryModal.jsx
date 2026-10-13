import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, History, Trash2, Copy, Check, ArrowRight, ExternalLink } from 'lucide-react'
import { api } from '../../lib/api.js'

export function ReleaseHistoryModal({
  isOpen,
  onClose,
  onLoadRelease,
}) {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await api('/api/release/history')
      setHistoryList(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error('Lỗi tải lịch sử release:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadHistory()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi Release này?')) return
    try {
      await api(`/api/release/history/${id}`, { method: 'DELETE' })
      setHistoryList((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      alert('Lỗi xóa lịch sử: ' + err.message)
    }
  }

  const handleCopyText = (text, id, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (isoString) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return isoString
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <History size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Lịch sử các đợt Release
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Xem lại hoặc khôi phục các thông báo release đã tạo trước đó
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

        {/* Content list */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Đang tải lịch sử release...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Chưa có bản ghi release nào được lưu. Sau khi tạo thông báo release, hãy bấm "Lưu vào lịch sử"!
            </div>
          ) : (
            historyList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all bg-gray-50/40 dark:bg-neutral-800/40 space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      {item.teamName || 'Team GMS'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyText(`${item.notificationMsg}\n\n${item.scopeMsg}`, item.id, e)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 hover:bg-gray-100 flex items-center gap-1"
                    >
                      {copiedId === item.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedId === item.id ? 'Đã copy!' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadRelease(item)
                        onClose()
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 flex items-center gap-1"
                    >
                      Nạp vào Editor <ArrowRight size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Task chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400">Tasks:</span>
                  {item.taskKeys.map((key) => (
                    <span
                      key={key}
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200"
                    >
                      {key}
                    </span>
                  ))}
                </div>

                {/* Preview snippet */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800/80 text-[11px] text-gray-600 dark:text-gray-300 font-mono line-clamp-2">
                  {item.notificationMsg}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 dark:border-neutral-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
