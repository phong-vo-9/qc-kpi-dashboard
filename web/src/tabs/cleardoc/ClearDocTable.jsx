import { useState } from 'react'
import {
  FileText, Sparkles, Plus, ExternalLink, ChevronDown, ChevronUp,
  Copy, Check, Edit2, Trash2, Maximize2, Minimize2, PanelRightOpen
} from 'lucide-react'
import { EmptyState } from '../../components/ui.jsx'
import { parseContentIssues } from './cleardoc-utils.js'
import { TaskPillGroup, PlatformBadge } from './ClearDocBadges.jsx'

export function ClearDocTable({
  docs = [],
  taskMap = new Map(),
  expandedDocIds = new Set(),
  copiedDocId = null,
  onToggleExpand,
  onToggleExpandAll,
  onCopyDocContent,
  onOpenDocDrawer,
  onOpenEditModal,
  onDeleteDoc,
  onOpenAddModal,
  onOpenAiModal,
}) {
  const isAllExpanded = docs.length > 0 && docs.every((d) => expandedDocIds.has(d.id))

  if (docs.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-xs p-10 text-center">
        <EmptyState
          icon={FileText}
          title="Chưa có dữ liệu Clear doc"
          hint="Nhấn '+ Thêm Clear Doc' hoặc '✨ AI Tự động điền' để tạo mục làm rõ tài liệu đầu tiên cho Sprint/Quý này."
        />
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={onOpenAiModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xs transition-all"
          >
            <Sparkles size={14} />
            <span>Dán văn bản AI Auto-fill</span>
          </button>
          <button
            onClick={() => onOpenAddModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
          >
            <Plus size={14} />
            <span>Thêm Clear Doc thủ công</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50/90 dark:bg-neutral-800 text-xs text-gray-700 dark:text-gray-200 font-bold uppercase tracking-wider">
              <th className="py-3 px-4 w-[240px]">Task liên quan</th>
              <th className="py-3 px-4 w-[220px]">Thread Clear</th>
              <th className="py-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <span>Các vấn đề / nội dung làm rõ</span>
                  {docs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onToggleExpandAll(docs)}
                      className="normal-case font-semibold text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      title={isAllExpanded ? 'Thu gọn tất cả nội dung câu hỏi' : 'Mở rộng tất cả nội dung câu hỏi'}
                    >
                      {isAllExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                      <span>{isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                    </button>
                  )}
                </div>
              </th>
              <th className="py-3 px-4 w-[100px] text-center">Tổng vấn đề</th>
              <th className="py-3 px-3 w-[110px] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-neutral-800 text-sm">
            {docs.map((doc) => {
              const taskKeys = doc.taskKeys || []
              const isExpanded = expandedDocIds.has(doc.id)
              const issues = parseContentIssues(doc.content)
              const totalIssuesCount = doc.issueCount || issues.length || 1

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-blue-50/20 dark:hover:bg-neutral-800/40 transition-colors group align-top"
                >
                  {/* CỘT 1: TASK (Gọn gàng với TaskPillGroup) */}
                  <td className="py-3.5 px-4">
                    <TaskPillGroup taskKeys={taskKeys} taskMap={taskMap} />
                  </td>

                  {/* CỘT 2: LINK THREAD CLEAR */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      {doc.threadUrl ? (
                        <a
                          href={doc.threadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-start gap-1 leading-snug break-words group/link"
                          title={doc.threadUrl}
                        >
                          <span className="line-clamp-2">{doc.threadTitle}</span>
                          <ExternalLink size={12} className="shrink-0 mt-0.5 opacity-70 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                          {doc.threadTitle}
                        </span>
                      )}

                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5">
                        {doc.threadUrl && <PlatformBadge url={doc.threadUrl} />}
                        {doc.sprint && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium text-[10px]">
                            {doc.sprint}
                          </span>
                        )}
                        {doc.quarter && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium text-[10px]">
                            {doc.quarter}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* CỘT 3: CÁC VẤN ĐỀ / NỘI DUNG CLEAR (EXPANDABLE + DRAWER TRIGGER) */}
                  <td className="py-3.5 px-4">
                    {isExpanded ? (
                      /* Trạng thái Mở Rộng Inline */
                      <div className="space-y-2 animate-fade-in">
                        {issues.length > 0 ? (
                          <div className="space-y-2">
                            {issues.map((iss, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-gray-50/80 dark:bg-neutral-800/60 border border-gray-200/70 dark:border-neutral-700/60 text-xs sm:text-[13px] leading-relaxed transition-all hover:border-blue-300 dark:hover:border-blue-500/40"
                              >
                                <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-start gap-1.5">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1">{iss.header.replace(/^\s*(?:\d+[\.\)]|[-*•])\s*/, '')}</span>
                                </div>
                                {iss.details.length > 0 && (
                                  <div className="mt-1.5 pl-6 text-gray-600 dark:text-gray-300 text-xs leading-relaxed space-y-1">
                                    {iss.details.map((d, dIdx) => (
                                      <p key={dIdx} className="whitespace-pre-line">{d}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-neutral-800/60 border border-gray-200/70 dark:border-neutral-700/60 whitespace-pre-line text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                            {doc.content}
                          </div>
                        )}

                        {/* Thanh điều khiển khi mở rộng */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => onToggleExpand(doc.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <ChevronUp size={13} />
                            <span>Thu gọn</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => onOpenDocDrawer(doc)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <PanelRightOpen size={13} />
                              <span>Mở Drawer chi tiết</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onCopyDocContent(doc)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {copiedDocId === doc.id ? (
                                <>
                                  <Check size={13} className="text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã sao chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  <span>Sao chép nội dung</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Trạng thái Thu Gọn: 2 dòng xem trước + nút toggle & drawer */
                      <div className="space-y-1.5">
                        <div className="text-xs sm:text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-2 pr-2 whitespace-pre-line">
                          {doc.content}
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => onToggleExpand(doc.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-0.5 px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border border-blue-200/70 dark:border-blue-500/30"
                          >
                            <span>Xem chi tiết ({totalIssuesCount} vấn đề)</span>
                            <ChevronDown size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDocDrawer(doc)}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 py-0.5 px-1.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Mở toàn màn hình xem dạng ngăn kéo bên phải"
                          >
                            <PanelRightOpen size={12} />
                            <span>Xem Drawer</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* CỘT 4: TỔNG VẤN ĐỀ */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-lg font-bold text-xs bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 tabular-nums shadow-2xs">
                      {totalIssuesCount}
                    </span>
                  </td>

                  {/* CỘT 5: THAO TÁC */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenDocDrawer(doc)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Mở ngăn kéo Drawer xem chi tiết"
                      >
                        <PanelRightOpen size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopyDocContent(doc)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Sao chép nội dung vấn đề"
                      >
                        {copiedDocId === doc.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(doc)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Chỉnh sửa mục Clear doc"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Xóa mục Clear doc"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
