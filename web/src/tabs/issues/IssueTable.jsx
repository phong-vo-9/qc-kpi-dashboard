import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ExternalLink, Copy, Check, Calendar, Edit2, Trash2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Clock, CheckCheck, ShieldAlert,
  AlertTriangle, HelpCircle, Link as LinkIcon, MessageSquare,
  FileText, CornerDownRight, Lightbulb, X, Eye, Image as ImageIcon
} from 'lucide-react'
import {
  formatDateDmy, detectLinkType, STATUS_META, PRIORITY_META
} from './issue-utils.js'
import IssueImageViewer from './IssueImageViewer.jsx'

const PAGE_SIZES = [10, 20, 50, 100]

export default function IssueTable({
  issues = [],
  onEdit,
  onDelete,
  onStatusChange,
  onAddNew,
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [copiedLinkIndex, setCopiedLinkIndex] = useState(null)
  const [copiedContentId, setCopiedContentId] = useState(null)
  const [deletingIssue, setDeletingIssue] = useState(null)
  const [viewerData, setViewerData] = useState(null)

  // Toggle expand row
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Copy URL
  const handleCopyLink = (url, key) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedLinkIndex(key)
    setTimeout(() => setCopiedLinkIndex(null), 1800)
  }

  // Copy Content
  const handleCopyContent = (text, id) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedContentId(id)
    setTimeout(() => setCopiedContentId(null), 1800)
  }

  // Pagination calculation
  const totalCount = issues.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedIssues = issues.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
      {/* Table container */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-neutral-800/60 border-b border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3.5 w-28 whitespace-nowrap">Ngày tạo</th>
              <th className="py-3 px-3.5 min-w-[280px]">Nội dung vấn đề</th>
              <th className="py-3 px-3.5 w-24 whitespace-nowrap text-center">Hình ảnh</th>
              <th className="py-3 px-3.5 min-w-[200px] w-56">Link trao đổi / Minh chứng</th>
              <th className="py-3 px-3.5 min-w-[240px]">Hướng giải quyết</th>
              <th className="py-3 px-3.5 w-36 whitespace-nowrap">Trạng thái</th>
              <th className="py-3 px-3.5 w-28 whitespace-nowrap">Mức độ</th>
              <th className="py-3 px-3.5 w-24 text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
            {paginatedIssues.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400">
                      <AlertCircle size={24} />
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Chưa có vấn đề nào được ghi nhận
                    </div>
                    <p className="text-xs text-gray-400 max-w-sm">
                      Bấm vào nút bên dưới để thêm mới vấn đề phát sinh cùng link trao đổi và hướng xử lý.
                    </p>
                    {onAddNew && (
                      <button
                        onClick={onAddNew}
                        className="mt-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        + Thêm vấn đề đầu tiên
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedIssues.map((issue) => {
                const isExpanded = expandedIds.has(issue.id)
                const statusInfo = STATUS_META[issue.status] || STATUS_META.open
                const priorityInfo = PRIORITY_META[issue.priority] || PRIORITY_META.medium
                const StatusIcon = statusInfo.icon
                const PriorityIcon = priorityInfo.icon
                const linksList = Array.isArray(issue.links) ? issue.links : []
                const imagesList = (Array.isArray(issue.images) ? issue.images : [])
                  .map((img) => (typeof img === 'string' ? { url: img, name: 'Hình ảnh' } : img))
                  .filter((img) => img && img.url)

                return (
                  <tr
                    key={issue.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-neutral-800/30 transition-colors group align-top"
                  >
                    {/* 1. Ngày tạo */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100/80 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium">
                        <Calendar size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        <span>{formatDateDmy(issue.createdDate)}</span>
                      </div>
                    </td>

                    {/* 2. Nội dung vấn đề */}
                    <td className="py-3.5 px-3.5">
                      <div className="space-y-1">
                        {issue.title && (
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs flex items-center gap-1.5">
                            <span>{issue.title}</span>
                          </div>
                        )}
                        <div
                          className={`text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed ${
                            !isExpanded && issue.content.length > 180 ? 'line-clamp-2' : ''
                          }`}
                        >
                          {issue.content}
                        </div>
                        {issue.content.length > 180 && (
                          <button
                            onClick={() => toggleExpand(issue.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                          >
                            {isExpanded ? (
                              <>
                                <span>Thu gọn</span> <ChevronUp size={12} />
                              </>
                            ) : (
                              <>
                                <span>Xem đầy đủ</span> <ChevronDown size={12} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 3. Hình ảnh */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                      {imagesList.length === 0 ? (
                        <span className="text-gray-300 dark:text-neutral-600 select-none text-xs">—</span>
                      ) : (
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setViewerData({
                                images: imagesList,
                                index: 0,
                                title: issue.title || issue.content,
                              })
                            }
                            className="group relative w-12 h-10 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
                            title={imagesList.length > 1 ? `Xem ${imagesList.length} hình ảnh` : 'Bấm để phóng to xem ảnh'}
                          >
                            <img
                              src={imagesList[0].url}
                              alt={imagesList[0].name || 'Hình ảnh'}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                              loading="lazy"
                            />
                            {imagesList.length > 1 && (
                              <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs backdrop-blur-2xs">
                                <ImageIcon size={8} />
                                <span>+{imagesList.length - 1}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Eye size={13} className="text-white drop-shadow" />
                            </div>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 4. Link trao đổi / Minh chứng (Nhiều link) */}
                    <td className="py-3.5 px-3.5">
                      {linksList.length === 0 ? (
                        <span className="text-gray-300 dark:text-neutral-600 italic">Không có link</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {linksList.map((linkItem, lIdx) => {
                            const detected = detectLinkType(linkItem.url)
                            const linkKey = `${issue.id}_${lIdx}`
                            const isCopied = copiedLinkIndex === linkKey
                            const linkTitle =
                              linkItem.title ||
                              (linkItem.url ? new URL(linkItem.url).pathname.split('/').filter(Boolean).pop() || detected.label : 'Link')

                            return (
                              <div
                                key={lIdx}
                                className="inline-flex items-center gap-1.5 max-w-full text-[11.5px] group/link"
                              >
                                <a
                                  href={linkItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={linkItem.url}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium truncate hover:opacity-85 transition-opacity max-w-[190px] ${detected.color}`}
                                >
                                  <ExternalLink size={11} className="shrink-0" />
                                  <span className="truncate">{linkTitle}</span>
                                </a>

                                <button
                                  onClick={() => handleCopyLink(linkItem.url, linkKey)}
                                  title="Sao chép URL"
                                  className="opacity-0 group-hover/link:opacity-100 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-opacity"
                                >
                                  {isCopied ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>

                    {/* 4. Hướng giải quyết */}
                    <td className="py-3.5 px-3.5">
                      {issue.solution ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-200 whitespace-pre-line leading-relaxed text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-emerald-800 dark:text-emerald-300 mb-1">
                            <Lightbulb size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Giải pháp:</span>
                          </div>
                          <div className={!isExpanded && issue.solution.length > 150 ? 'line-clamp-2' : ''}>
                            {issue.solution}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-neutral-800/60 border border-gray-200/60 dark:border-neutral-800">
                            Chưa có hướng giải quyết
                          </span>
                          <button
                            onClick={() => onEdit(issue)}
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                          >
                            + Thêm
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 5. Trạng thái */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const nextStatus =
                            issue.status === 'open'
                              ? 'resolved'
                              : issue.status === 'resolved'
                              ? 'closed'
                              : 'open'
                          onStatusChange && onStatusChange(issue.id, nextStatus)
                        }}
                        title="Click để đổi nhanh trạng thái"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-transform hover:scale-102 active:scale-98 cursor-pointer ${statusInfo.badge}`}
                      >
                        <StatusIcon size={13} />
                        <span>{statusInfo.label}</span>
                      </button>
                    </td>

                    {/* 6. Mức độ ưu tiên */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${priorityInfo.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
                        <span>{priorityInfo.label}</span>
                      </span>
                    </td>

                    {/* 7. Thao tác */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        {/* Copy Content */}
                        <button
                          onClick={() => handleCopyContent(`${issue.title ? issue.title + '\n' : ''}${issue.content}\nGiải pháp: ${issue.solution || 'Chưa có'}`, issue.id)}
                          title="Sao chép nội dung"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {copiedContentId === issue.id ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEdit(issue)}
                          title="Chỉnh sửa vấn đề"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingIssue(issue)}
                          title="Xóa vấn đề"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
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
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/70 dark:bg-neutral-800/40 border-t border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded text-xs text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
            >
              {PAGE_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz} / trang
                </option>
              ))}
            </select>
            <span>trong tổng số <strong className="font-semibold text-gray-800 dark:text-gray-200">{totalCount}</strong> vấn đề</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-md border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-medium">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingIssue &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <ShieldAlert size={20} />
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                    Xác nhận xóa vấn đề
                  </h3>
                </div>
                <button
                  onClick={() => setDeletingIssue(null)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa vấn đề này không? Thao tác này sẽ xóa vĩnh viễn và không thể khôi phục.
              </p>

              {deletingIssue.title && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {deletingIssue.title}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingIssue(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDelete = deletingIssue.id
                    setDeletingIssue(null)
                    await onDelete(idToDelete)
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Lightbox Image Viewer */}
      {viewerData && (
        <IssueImageViewer
          images={viewerData.images}
          initialIndex={viewerData.index}
          title={viewerData.title}
          onClose={() => setViewerData(null)}
        />
      )}
    </div>
  )
}
