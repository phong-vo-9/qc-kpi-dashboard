import { useState, useMemo } from 'react'
import {
  ExternalLink, ChevronDown, ChevronUp, Edit2, Trash2, Copy, Check,
  Plus, MessageSquare, ArrowUpDown, AlertCircle, Sparkles, X, Layers
} from 'lucide-react'
import { jiraUrl } from '../../lib/api.js'
import { TaskTypeBadge } from './ClearDocBadges.jsx'
import { getResolutionBadgeClasses } from './cleardoc-utils.js'

export function ImproveDocTable({
  docs = [],
  taskMap = new Map(),
  project = 'GOP',
  onOpenAddModal = () => {},
  onOpenEditModal = () => {},
  onDeleteDoc = () => {},
  onUpdateTargetCard = () => {},
  onCopyContent = () => {},
  copiedId = null,
}) {
  const [isSectionOpen, setIsSectionOpen] = useState(true)
  const [sortField, setSortField] = useState('originTaskKey')
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'

  // Inline quick editing of target card (mã Jira)
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardValue, setInlineCardValue] = useState('')

  // Inline quick editing of Slack link
  const [editingSlackId, setEditingSlackId] = useState(null)
  const [inlineSlackValue, setInlineSlackValue] = useState('')

  // Thống kê số task distinct và số vấn đề
  const uniqueTasksCount = useMemo(() => {
    return new Set(docs.map((d) => d.originTaskKey).filter(Boolean)).size
  }, [docs])

  const totalIssuesCount = docs.length

  // ─── GỘP NHÓM THEO TASK GỐC (PHƯƠNG ÁN 1: ROWSPAN) ───
  const groupedDocs = useMemo(() => {
    // 1. Phân nhóm theo originTaskKey
    const map = new Map()
    for (const doc of docs) {
      const key = doc.originTaskKey || 'Chưa gán task'
      if (!map.has(key)) {
        map.set(key, { originTaskKey: key, items: [] })
      }
      map.get(key).items.push(doc)
    }

    const groups = Array.from(map.values())

    // 2. Sắp xếp các item bên trong từng nhóm
    for (const g of groups) {
      g.items.sort((a, b) => {
        let valA = a[sortField] || ''
        let valB = b[sortField] || ''
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // 3. Sắp xếp các nhóm Task cha
    groups.sort((a, b) => {
      if (sortField === 'originTaskKey') {
        const keyA = a.originTaskKey.toLowerCase()
        const keyB = b.originTaskKey.toLowerCase()
        return sortOrder === 'asc' ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
      }
      // Khi sắp xếp theo cột khác, so sánh theo giá trị item đầu tiên của từng nhóm
      const firstA = a.items[0]?.[sortField] || ''
      const firstB = b.items[0]?.[sortField] || ''
      const strA = typeof firstA === 'string' ? firstA.toLowerCase() : String(firstA)
      const strB = typeof firstB === 'string' ? firstB.toLowerCase() : String(firstB)
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return groups
  }, [docs, sortField, sortOrder])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleStartEditCard = (doc) => {
    setEditingCardId(doc.id)
    setInlineCardValue(doc.targetTaskKey || '')
  }

  const handleSaveInlineCard = async (docId) => {
    if (editingCardId === docId) {
      await onUpdateTargetCard(docId, inlineCardValue.trim().toUpperCase())
      setEditingCardId(null)
      setInlineCardValue('')
    }
  }

  const handleStartEditSlack = (doc) => {
    setEditingSlackId(doc.id)
    setInlineSlackValue(doc.slackUrl || '')
  }

  const handleSaveInlineSlack = async (doc) => {
    if (editingSlackId === doc.id) {
      const updated = { ...doc, slackUrl: inlineSlackValue.trim() }
      await onOpenEditModal(updated, true) // quick silent save
      setEditingSlackId(null)
      setInlineSlackValue('')
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-xs overflow-hidden transition-all">
      {/* ─── BANNER TIÊU ĐỀ: ▾ Xem Improve — GOP (3 task · 6 vấn đề) ─── */}
      <div
        onClick={() => setIsSectionOpen(!isSectionOpen)}
        className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 dark:bg-neutral-800/80 border-b border-gray-200 dark:border-neutral-800 cursor-pointer select-none hover:bg-gray-100/70 dark:hover:bg-neutral-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100">
          <span className="text-gray-500 dark:text-gray-400">
            {isSectionOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </span>
          <span>Xem Improve — {project || 'Tất cả'}</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            ({uniqueTasksCount} task · {totalIssuesCount} vấn đề)
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-800/30">
            <Layers size={11} /> Gộp theo Task gốc
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenAddModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all"
          >
            <Plus size={14} />
            <span>Thêm Improve</span>
          </button>
        </div>
      </div>

      {/* ─── NỘI DUNG BẢNG KHI MỞ RỘNG ─── */}
      {isSectionOpen && (
        <div className="overflow-x-auto">
          {docs.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3">
                <Sparkles size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Chưa có ghi nhận Improve doc nào
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
                Ghi nhận các vấn đề phát sinh ngoài scope hoặc cần cải tiến sau để tránh bị sót card Jira.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onOpenAddModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all"
                >
                  <Plus size={14} />
                  <span>+ Thêm vấn đề Improve đầu tiên</span>
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50 text-gray-700 dark:text-gray-200 font-bold uppercase tracking-wider text-[11px]">
                  {/* CỘT 1: Task gốc */}
                  <th
                    onClick={() => handleSort('originTaskKey')}
                    className="py-3 px-4 w-[210px] sm:w-[230px] cursor-pointer hover:bg-gray-100/60 dark:hover:bg-neutral-700/40 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Task gốc</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>

                  {/* CỘT 2: Card xử lý */}
                  <th
                    onClick={() => handleSort('targetTaskKey')}
                    className="py-3 px-4 w-[170px] cursor-pointer hover:bg-gray-100/60 dark:hover:bg-neutral-700/40 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Card xử lý</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>

                  {/* CỘT 3: Link Slack */}
                  <th className="py-3 px-4 w-[130px] select-none">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-amber-500" />
                      <span>Link Slack</span>
                    </div>
                  </th>

                  {/* CỘT 4: Nội dung Improve */}
                  <th
                    onClick={() => handleSort('content')}
                    className="py-3 px-4 cursor-pointer hover:bg-gray-100/60 dark:hover:bg-neutral-700/40 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nội dung Improve</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>

                  {/* CỘT 5: Hướng xử lý đã ghi nhận */}
                  <th
                    onClick={() => handleSort('resolution')}
                    className="py-3 px-4 w-[200px] cursor-pointer hover:bg-gray-100/60 dark:hover:bg-neutral-700/40 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Hướng xử lý đã ghi nhận</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>

                  {/* CỘT 6: Thao tác */}
                  <th className="py-3 px-3 w-[90px] text-center select-none">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {groupedDocs.map((group, groupIndex) => {
                  const originTask = taskMap.get(group.originTaskKey)
                  const isFirstGroup = groupIndex === 0

                  return group.items.map((doc, itemIndex) => {
                    const isFirstItem = itemIndex === 0
                    const targetTask = doc.targetTaskKey ? taskMap.get(doc.targetTaskKey) : null
                    const resStyle = getResolutionBadgeClasses(doc.resolution)
                    const hasCard = Boolean(doc.targetTaskKey && doc.targetTaskKey.trim())

                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-purple-50/20 dark:hover:bg-neutral-800/40 transition-colors align-top group ${
                          isFirstItem
                            ? isFirstGroup
                              ? 'border-t-0'
                              : 'border-t-2 border-gray-200 dark:border-neutral-700'
                            : 'border-t border-gray-100 dark:border-neutral-800/60'
                        }`}
                      >
                        {/* ─── CỘT 1: TASK GỐC (GỘP HÀNG ROWSPAN) ─── */}
                        {isFirstItem && (
                          <td
                            rowSpan={group.items.length}
                            className="py-3.5 px-4 align-top border-r border-gray-100 dark:border-neutral-800/80 bg-gray-50/30 dark:bg-neutral-900/40 select-text"
                          >
                            <div className="space-y-1.5 sticky top-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a
                                  href={jiraUrl(group.originTaskKey)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono group/link"
                                  title={`Mở Jira: ${group.originTaskKey}`}
                                >
                                  <span>{group.originTaskKey}</span>
                                  <ExternalLink size={11} className="opacity-60 group-hover/link:opacity-100" />
                                </a>
                                {originTask?.type && <TaskTypeBadge type={originTask.type} />}
                              </div>

                              {originTask?.summary && (
                                <div
                                  className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-3 leading-snug font-medium"
                                  title={originTask.summary}
                                >
                                  {originTask.summary}
                                </div>
                              )}

                              <div className="pt-1.5 flex items-center justify-between gap-1 border-t border-dashed border-gray-200/70 dark:border-neutral-800">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  group.items.length > 1
                                    ? 'bg-purple-100/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40'
                                    : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'
                                }`}>
                                  {group.items.length} vấn đề
                                </span>

                                <button
                                  type="button"
                                  onClick={() => onOpenAddModal(group.originTaskKey)}
                                  className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 hover:text-purple-700 transition-colors"
                                  title={`Thêm vấn đề Improve cho task ${group.originTaskKey}`}
                                >
                                  <Plus size={10} /> Thêm
                                </button>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* ─── CỘT 2: CARD XỬ LÝ ─── */}
                        <td className="py-3.5 px-4">
                          {editingCardId === doc.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={inlineCardValue}
                                onChange={(e) => setInlineCardValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineCard(doc.id)
                                  if (e.key === 'Escape') setEditingCardId(null)
                                }}
                                placeholder="VD: GOP-4394"
                                autoFocus
                                className="w-24 px-2 py-1 text-xs uppercase font-mono font-bold rounded border border-blue-400 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineCard(doc.id)}
                                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                title="Lưu"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCardId(null)}
                                className="p-1 rounded bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                                title="Hủy"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : hasCard ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={jiraUrl(doc.targetTaskKey)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono group/card"
                                  title={`Mở Jira: ${doc.targetTaskKey}`}
                                >
                                  <span>{doc.targetTaskKey}</span>
                                  <ExternalLink size={11} className="opacity-60 group-hover/card:opacity-100" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCard(doc)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 transition-opacity"
                                  title="Đổi mã card"
                                >
                                  <Edit2 size={11} />
                                </button>
                              </div>
                              {targetTask?.summary && (
                                <div
                                  className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1"
                                  title={targetTask.summary}
                                >
                                  {targetTask.summary}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span
                                onClick={() => handleStartEditCard(doc)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border border-gray-200/80 dark:border-neutral-700 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 transition-colors"
                                title="Nhấp để nhập nhanh mã Jira card"
                              >
                                <AlertCircle size={10} className="text-amber-500 shrink-0" />
                                <span>Chưa bổ sung card</span>
                              </span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCard(doc)}
                                  className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <Plus size={10} />
                                  <span>Gán card</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* ─── CỘT 3: LINK SLACK ─── */}
                        <td className="py-3.5 px-4">
                          {doc.slackUrl ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={doc.slackUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/25 hover:bg-amber-100/90 dark:hover:bg-amber-500/20 whitespace-nowrap transition-colors group/slack"
                                title={doc.slackUrl}
                              >
                                <MessageSquare size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Slack</span>
                                <ExternalLink size={9} className="opacity-60 group-hover/slack:opacity-100" />
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(doc)}
                              className="text-xs text-gray-400 dark:text-gray-500 hover:text-amber-600 hover:underline inline-flex items-center gap-1"
                              title="Thêm link thảo luận Slack"
                            >
                              <span>—</span>
                              <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">+ Link</span>
                            </button>
                          )}
                        </td>

                        {/* ─── CỘT 4: NỘI DUNG IMPROVE ─── */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs sm:text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line font-normal">
                            {doc.content}
                          </div>
                        </td>

                        {/* ─── CỘT 5: HƯỚNG XỬ LÝ ĐÃ GHI NHẬN ─── */}
                        <td className="py-3.5 px-4">
                          {doc.resolution ? (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border leading-snug ${resStyle.bg} ${resStyle.text} ${resStyle.border}`}
                            >
                              {doc.resolution}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* ─── CỘT 6: THAO TÁC ─── */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {/* Nút Copy */}
                            <button
                              type="button"
                              onClick={() => onCopyContent(doc)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                              title="Sao chép nội dung"
                            >
                              {copiedId === doc.id ? (
                                <Check size={14} className="text-emerald-500" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>

                            {/* Nút Sửa */}
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(doc)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-neutral-800 transition-colors"
                              title="Chỉnh sửa vấn đề Improve"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Nút Xóa */}
                            <button
                              type="button"
                              onClick={() => onDeleteDoc(doc.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-neutral-800 transition-colors"
                              title="Xóa vấn đề Improve"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
