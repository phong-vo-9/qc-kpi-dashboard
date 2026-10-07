import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ExternalLink, Copy, Check, Edit2, Trash2, Layers,
  Calendar, FolderKanban, Hash, MessageSquare, CheckCircle2
} from 'lucide-react'
import { jiraUrl } from '../../lib/api.js'
import { parseContentIssues } from './cleardoc-utils.js'
import { JiraStatusBadge, TaskTypeBadge, PlatformBadge } from './ClearDocBadges.jsx'

export function ClearDocDrawer({
  isOpen,
  doc,
  taskMap = new Map(),
  onClose,
  onEdit,
  onDelete,
}) {
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedIssueIdx, setCopiedIssueIdx] = useState(null)

  if (!isOpen || !doc) return null

  const taskKeys = doc.taskKeys || []
  const issues = parseContentIssues(doc.content)

  const handleCopyAll = () => {
    if (!doc.content) return
    navigator.clipboard.writeText(doc.content).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }

  const handleCopySingleIssue = (issText, idx) => {
    navigator.clipboard.writeText(issText).then(() => {
      setCopiedIssueIdx(idx)
      setTimeout(() => setCopiedIssueIdx(null), 2000)
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800 shadow-2xl h-full flex flex-col z-10 animate-slide-left">
        {/* Header Drawer */}
        <div className="p-5 border-b border-gray-100 dark:border-neutral-800 space-y-3 bg-gray-50/50 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 uppercase tracking-wider">
                  Chi tiết Clear Doc
                </span>
                {doc.threadUrl && <PlatformBadge url={doc.threadUrl} />}
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug break-words">
                {doc.threadTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Meta Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            {doc.project && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium">
                <FolderKanban size={12} className="text-gray-400" />
                <span>{doc.project}</span>
              </span>
            )}
            {doc.sprint && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium">
                <Layers size={12} className="text-gray-400" />
                <span>{doc.sprint}</span>
              </span>
            )}
            {doc.quarter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium">
                <Calendar size={12} className="text-gray-400" />
                <span>{doc.quarter}{doc.year ? `-${doc.year}` : ''}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-500/30">
              <Hash size={12} />
              <span>{doc.issueCount || issues.length || 1} vấn đề</span>
            </span>
          </div>

          {/* Link Thread URL Button nếu có */}
          {doc.threadUrl && (
            <a
              href={doc.threadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1 break-all"
            >
              <span>Mở liên kết nguồn thảo luận</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Body Drawer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs sm:text-sm">
          {/* 1. Các Task Jira liên kết */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Các Task Jira liên quan ({taskKeys.length})</span>
            </h4>
            <div className="space-y-2">
              {taskKeys.map((k) => {
                const t = taskMap.get(k)
                return (
                  <div
                    key={k}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200/80 dark:border-neutral-700/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={jiraUrl(k)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          <span>{k}</span>
                          <ExternalLink size={11} className="opacity-70" />
                        </a>
                        {t?.type && <TaskTypeBadge type={t.type} />}
                      </div>
                      {t?.status && <JiraStatusBadge status={t.status} />}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {t?.summary || '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Danh sách các vấn đề / nội dung câu hỏi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chi tiết các vấn đề làm rõ ({issues.length || doc.issueCount || 1})
              </h4>
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedAll ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedAll ? 'Đã sao chép tất cả' : 'Sao chép toàn bộ'}</span>
              </button>
            </div>

            {issues.length > 0 ? (
              <div className="space-y-3">
                {issues.map((iss, idx) => {
                  const fullText = [iss.header, ...iss.details].join('\n')
                  const isCopied = copiedIssueIdx === idx

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-xs space-y-2 relative group hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-snug">
                            {iss.header.replace(/^\s*(?:\d+[\.\)]|[-*•])\s*/, '')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySingleIssue(fullText, idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all shrink-0"
                          title="Sao chép mục này"
                        >
                          {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>

                      {iss.details.length > 0 && (
                        <div className="pl-7 space-y-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-neutral-800 pt-2">
                          {iss.details.map((d, dIdx) => (
                            <p key={dIdx} className="whitespace-pre-line">{d}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {doc.content}
              </div>
            )}
          </div>
        </div>

        {/* Footer Drawer */}
        <div className="p-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(doc)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 shadow-xs transition-all"
            >
              <Edit2 size={13} />
              <span>Chỉnh sửa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onDelete(doc.id)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
            >
              <Trash2 size={13} />
              <span>Xóa</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-900 text-white dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
