import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  ExternalLink, Copy, Check, Calendar, Hash,
  Edit2, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  MessageSquare, Layers, CheckCircle2, Clock, AlertCircle, X
} from 'lucide-react'
import { formatIsoToDmy } from './non-its-parser.js'

const PAGE_SIZES = [10, 20, 50, 100]

const PROJECT_BADGES = {
  GOP: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  AW: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  GMS: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  BOP: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  LOVABUS: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
}

function ProjectBadge({ project }) {
  if (!project) return <span className="text-gray-300 dark:text-neutral-600">—</span>
  const badgeClass =
    PROJECT_BADGES[project.toUpperCase()] ||
    'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 border-gray-200 dark:border-neutral-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
      {project}
    </span>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-300 dark:text-neutral-600">—</span>
  const s = status.toLowerCase()

  let color = 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 border-gray-200 dark:border-neutral-700'
  let Icon = CheckCircle2

  if (s.includes('đã xử lý') || s.includes('kết luận') || s.includes('đã đóng')) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
    Icon = CheckCircle2
  } else if (s.includes('đang xử lý')) {
    color = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
    Icon = Clock
  } else if (s.includes('chờ') || s.includes('cần làm rõ')) {
    color = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
    Icon = AlertCircle
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium border ${color}`}>
      <Icon size={12} />
      <span>{status}</span>
    </span>
  )
}

export default function NonItsFeedbackTable({
  feedbacks = [],
  onEdit,
  onDelete,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [copiedId, setCopiedId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)

  // Copy URL Slack
  const handleCopySlackUrl = (url, id) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Pagination calculation
  const totalCount = feedbacks.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Ensure current page is valid when total pages change
  const validPage = Math.min(currentPage, totalPages)

  const paginatedFeedbacks = useMemo(() => {
    const start = (validPage - 1) * pageSize
    return feedbacks.slice(start, start + pageSize)
  }, [feedbacks, validPage, pageSize])

  const startIndex = totalCount === 0 ? 0 : (validPage - 1) * pageSize + 1
  const endIndex = Math.min(validPage * pageSize, totalCount)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
      {/* Table header bar */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Danh sách Feedback không tạo ITS
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium">
            {totalCount} bản ghi
          </span>
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Hiển thị</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-2 py-1 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz} dòng
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-100/70 dark:bg-neutral-800/60 text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-12 text-center">STT</th>
              <th className="py-3 px-3 w-28 whitespace-nowrap">Ngày feedback</th>
              <th className="py-3 px-3 w-20 text-center">Dự án</th>
              <th className="py-3 px-4 min-w-[220px]">Nội dung feedback</th>
              <th className="py-3 px-3 w-44 whitespace-nowrap">Link Slack</th>
              <th className="py-3 px-4 min-w-[280px]">Nội dung xử lý</th>
              <th className="py-3 px-3 w-40 whitespace-nowrap text-center">Trạng thái</th>
              <th className="py-3 px-3 w-24 text-center whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
            {paginatedFeedbacks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <MessageSquare size={36} className="text-gray-300 dark:text-neutral-700" />
                    <p className="text-sm font-medium">Chưa có feedback nào phù hợp với bộ lọc</p>
                    <p className="text-xs text-gray-400">
                      Hãy bấm <strong>"AI Nhập nhanh (Paste)"</strong> hoặc <strong>"Thêm feedback mới"</strong> để lưu trữ.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedFeedbacks.map((item, idx) => {
                const rowNumber = (validPage - 1) * pageSize + idx + 1
                const isExpanded = expandedId === item.id
                const slackUrl = item.slackUrl || item.slack_url
                const slackTitle = item.slackTitle || item.slack_title || 'Slack Thread'
                const isLongResolution = item.resolution && item.resolution.length > 90

                return (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-blue-50/40 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    {/* STT */}
                    <td className="py-3 px-3 text-center text-gray-400 dark:text-gray-500 font-mono text-[11px]">
                      {rowNumber}
                    </td>

                    {/* Ngày feedback */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium">
                        <Calendar size={12} className="text-gray-400" />
                        <span>{formatIsoToDmy(item.date)}</span>
                      </div>
                    </td>

                    {/* Dự án */}
                    <td className="py-3 px-3 text-center">
                      <ProjectBadge project={item.project} />
                    </td>

                    {/* Nội dung feedback */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs leading-snug">
                        {item.title}
                      </div>
                    </td>

                    {/* Link Slack */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {slackUrl ? (
                        <div className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-lg px-2.5 py-1 text-xs">
                          <Hash size={12} className="text-purple-500" />
                          <a
                            href={slackUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline flex items-center gap-1"
                            title={slackUrl}
                          >
                            <span>{slackTitle}</span>
                            <ExternalLink size={11} className="opacity-70" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopySlackUrl(slackUrl, item.id)}
                            className="ml-1 p-0.5 text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 transition-colors"
                            title="Sao chép liên kết"
                          >
                            {copiedId === item.id ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Nội dung xử lý */}
                    <td className="py-3 px-4">
                      {item.resolution ? (
                        <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                          <p className={!isExpanded && isLongResolution ? 'line-clamp-2' : ''}>
                            {item.resolution}
                          </p>
                          {isLongResolution && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-flex items-center gap-0.5 font-medium"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Thu gọn</span>
                                  <ChevronUp size={11} />
                                </>
                              ) : (
                                <>
                                  <span>Xem thêm</span>
                                  <ChevronDown size={11} />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-neutral-600 italic">Chưa có nội dung xử lý</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit && onEdit(item)}
                          className="p-1 rounded text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Chỉnh sửa feedback"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="p-1 rounded text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Xóa feedback"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-neutral-900/60 text-xs text-gray-600 dark:text-gray-400">
        <div>
          Hiển thị <span className="font-semibold text-gray-900 dark:text-gray-100">{startIndex}</span> -{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{endIndex}</span> trên{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{totalCount}</span> mục
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={validPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span className="px-3 py-1 font-medium">
            Trang <span className="font-semibold text-gray-900 dark:text-gray-100">{validPage}</span> /{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span>
          </span>

          <button
            type="button"
            disabled={validPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingItem &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-md p-6 flex flex-col gap-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                    Xác nhận xóa feedback
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Bạn có chắc chắn muốn xóa feedback này không? Thao tác này sẽ xóa vĩnh viễn dữ liệu và không thể hoàn tác.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700 text-xs space-y-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {deletingItem.title}
                </div>
                <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2 text-[11px]">
                  <span>Ngày: {formatIsoToDmy(deletingItem.date)}</span>
                  <span>•</span>
                  <span>Dự án: {deletingItem.project}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = deletingItem.id
                    setDeletingItem(null)
                    onDelete && onDelete(idToDelete)
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
