import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, Bot, X, Wand2, ClipboardPaste, RotateCcw,
  CheckCircle2, ExternalLink, Check, Plus, AlertCircle
} from 'lucide-react'
import { SAMPLE_USER_TEXT, parseClearDocText } from './cleardoc-utils.js'

export function ClearDocAiModal({
  isOpen,
  onClose,
  taskMap = new Map(),
  filterProject = 'GOP',
  filterSprint = 'all',
  filterQuarter = '',
  onDirectSave,
  onApplyToForm,
  showToast,
}) {
  const [rawText, setRawText] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [newTaskInput, setNewTaskInput] = useState('')

  // Phân tích tự động mỗi khi rawText thay đổi
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedData(null)
      return
    }
    const result = parseClearDocText(rawText, taskMap)
    setParsedData(result)
  }, [rawText, taskMap])

  if (!isOpen) return null

  // Đọc từ Clipboard trình duyệt
  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      if (clipText && clipText.trim()) {
        setRawText(clipText)
        if (showToast) showToast('Đã dán văn bản từ Clipboard thành công!', 'success')
      } else {
        if (showToast) showToast('Clipboard đang trống!', 'warning')
      }
    } catch (err) {
      if (showToast) showToast('Không thể đọc Clipboard: ' + err.message, 'error')
    }
  }

  // Dán văn bản mẫu
  const handlePasteSample = () => {
    setRawText(SAMPLE_USER_TEXT)
    if (showToast) showToast('Đã dán đoạn văn bản mẫu thành công!', 'info')
  }

  // Xóa trắng
  const handleClear = () => {
    setRawText('')
    setParsedData(null)
  }

  // Thêm nhanh mã task thủ công vào parsedData
  const handleAddNewTask = () => {
    if (!newTaskInput.trim() || !parsedData) return
    const key = newTaskInput.trim().toUpperCase()
    if (!parsedData.taskKeys.includes(key)) {
      setParsedData({
        ...parsedData,
        taskKeys: [...parsedData.taskKeys, key],
      })
    }
    setNewTaskInput('')
  }

  // Xóa mã task khỏi parsedData
  const handleRemoveTask = (keyToRemove) => {
    if (!parsedData) return
    setParsedData({
      ...parsedData,
      taskKeys: parsedData.taskKeys.filter((k) => k !== keyToRemove),
    })
  }

  // Lưu trực tiếp
  const handleSave = () => {
    if (!parsedData) return
    if (!parsedData.threadTitle.trim()) {
      if (showToast) showToast('Chưa nhận diện được tên thread clear doc!', 'warning')
      return
    }
    if (parsedData.taskKeys.length === 0) {
      if (showToast) showToast('Chưa nhận diện được task Jira nào!', 'warning')
      return
    }

    const [q, y] = filterQuarter && filterQuarter !== 'all' ? filterQuarter.split('-') : ['', '']
    const docToSave = {
      project: parsedData.project || filterProject || 'GOP',
      sprint: parsedData.sprint || (filterSprint !== 'all' ? filterSprint : ''),
      quarter: parsedData.quarter || q || '',
      year: parsedData.year || (y ? Number(y) : new Date().getFullYear()),
      taskKeys: parsedData.taskKeys,
      threadTitle: parsedData.threadTitle,
      threadUrl: parsedData.threadUrl,
      content: parsedData.content,
      issueCount: parsedData.issueCount,
    }

    onDirectSave(docToSave)
  }

  // Áp dụng vào form thủ công
  const handleApply = () => {
    if (!parsedData) return
    const [q, y] = filterQuarter && filterQuarter !== 'all' ? filterQuarter.split('-') : ['', '']
    onApplyToForm({
      project: parsedData.project || filterProject || 'GOP',
      sprint: parsedData.sprint || filterSprint || '',
      quarter: parsedData.quarter || q || '',
      year: parsedData.year || (y ? Number(y) : new Date().getFullYear()),
      taskKeys: parsedData.taskKeys || [],
      threadTitle: parsedData.threadTitle || '',
      threadUrl: parsedData.threadUrl || '',
      content: parsedData.content || '',
      issueCount: parsedData.issueCount || 1,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-purple-200 dark:border-purple-900/50 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header Modal AI */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-pink-50/60 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
              <Sparkles size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  AI Smart Parser 2.0
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white uppercase tracking-wider">
                  Tự động gộp & trích xuất
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Dán đoạn chat từ Slack, Jira hoặc Lark. Hệ thống tự động gộp task, nhận diện thread, bóc tách và đánh số từng câu hỏi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thân Modal AI: GIAO DIỆN 2 CỘT (DUAL-PANE) TRÊN DESKTOP */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs sm:text-sm">
          {/* CỘT TRÁI: Ô DÁN VĂN BẢN & CÁC CÔNG CỤ NHANH */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>Văn bản nguồn cần trích xuất</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                  title="Đọc trực tiếp từ Clipboard máy tính"
                >
                  <ClipboardPaste size={12} />
                  <span>Dán từ Clipboard</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 hover:underline"
                >
                  <Wand2 size={11} />
                  <span>Dán mẫu</span>
                </button>

                {rawText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-gray-400 hover:text-red-500"
                    title="Xóa văn bản"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={16}
              placeholder={`Dán đoạn văn bản bất kỳ ở đây, ví dụ:\n\n[GOP-3647](https://jira.vexere.net/browse/GOP-3647)\nGMS - Phím tắt - Apply phím tắt cho Form Hàng\n[GOP-4351](https://jira.vexere.net/browse/GOP-4351)\n...\n[Clear doc về các task liên quan tới Phím tắt](https://vexere.slack.com/...)\nVề UI trong doc...\nTác vụ "Mở danh sách phím tắt"...`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="flex-1 w-full border border-gray-200 dark:border-neutral-700 rounded-xl p-3 bg-gray-50/50 dark:bg-neutral-800/40 text-gray-800 dark:text-gray-200 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-purple-500/40 focus:bg-white dark:focus:bg-neutral-800 resize-none"
            />

            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Hỗ trợ định dạng Jira link markdown, Plain URL, câu hỏi tự do.</span>
              <span>{rawText.length} ký tự</span>
            </div>
          </div>

          {/* CỘT PHẢI: KẾT QUẢ PHÂN TÍCH THỜI GIAN THỰC & CHỈNH SỬA TRỰC TIẾP */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Bot size={14} className="text-purple-500" />
                <span>Xem trước & Tinh chỉnh kết quả</span>
              </div>
              {parsedData && (
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    {parsedData.taskKeys.length} tasks
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300">
                    {parsedData.issueCount} vấn đề
                  </span>
                </div>
              )}
            </div>

            {parsedData ? (
              <div className="flex-1 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4 bg-purple-50/20 dark:bg-purple-950/15 space-y-3.5 overflow-y-auto">
                {/* 1. Các Task phát hiện & gộp */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Tasks được gộp ({parsedData.taskKeys.length}):</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                      (Nhấp dấu x để xóa task thừa)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {parsedData.taskKeys.map((k) => {
                      const t = taskMap.get(k)
                      return (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-md text-xs font-bold bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 border border-purple-200 dark:border-purple-800 shadow-2xs"
                        >
                          <span>{k}</span>
                          {t?.summary && (
                            <span className="font-normal text-[10px] text-gray-500 dark:text-gray-400 max-w-[100px] truncate">
                              - {t.summary}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(k)}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400 hover:text-red-500"
                            title="Xóa task này"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      )
                    })}

                    {/* Ô thêm nhanh task */}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="+ Thêm mã task"
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewTask()}
                        className="w-24 text-[11px] px-1.5 py-0.5 border border-dashed border-gray-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:border-purple-500"
                      />
                      {newTaskInput && (
                        <button
                          type="button"
                          onClick={handleAddNewTask}
                          className="p-1 rounded bg-purple-600 text-white"
                        >
                          <Plus size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Tiêu đề Thread (Editable) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Tiêu đề Thread Clear:
                  </label>
                  <input
                    type="text"
                    value={parsedData.threadTitle}
                    onChange={(e) => setParsedData({ ...parsedData, threadTitle: e.target.value })}
                    className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                {/* 3. Link Thread URL (Editable) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Link URL thảo luận (tùy chọn):
                  </label>
                  <input
                    type="url"
                    placeholder="https://vexere.slack.com/archives/..."
                    value={parsedData.threadUrl}
                    onChange={(e) => setParsedData({ ...parsedData, threadUrl: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                {/* 4. Tự nhận diện phân loại */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Tự nhận diện:</span>
                  <span className="px-2 py-0.5 rounded font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
                    Dự án: {parsedData.project || filterProject || 'GOP'}
                  </span>
                  {parsedData.sprint && (
                    <span className="px-2 py-0.5 rounded font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
                      Sprint: {parsedData.sprint}
                    </span>
                  )}
                  {parsedData.quarter && (
                    <span className="px-2 py-0.5 rounded font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
                      Quý: {parsedData.quarter}-{parsedData.year}
                    </span>
                  )}
                </div>

                {/* 5. Nội dung các câu hỏi đã đánh số */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nội dung đã format ({parsedData.issueCount} vấn đề):
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Số vấn đề:</span>
                      <input
                        type="number"
                        min="1"
                        value={parsedData.issueCount}
                        onChange={(e) =>
                          setParsedData({ ...parsedData, issueCount: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-12 text-center text-xs font-bold border border-gray-200 dark:border-neutral-700 rounded px-1 py-0.5 bg-white dark:bg-neutral-800"
                      />
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={parsedData.content}
                    onChange={(e) => setParsedData({ ...parsedData, content: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-purple-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs leading-relaxed text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>
            ) : (
              /* Trạng thái trống khi chưa có văn bản */
              <div className="flex-1 border border-dashed border-gray-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 text-gray-400">
                <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-500">
                  <Sparkles size={24} />
                </div>
                <div className="max-w-xs space-y-1">
                  <div className="font-semibold text-xs text-gray-700 dark:text-gray-300">
                    Sẵn sàng trích xuất thông minh
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Dán nội dung vào ô bên trái hoặc bấm <strong>"Dán từ Clipboard"</strong> để hệ thống tự động bóc tách và hiển thị xem trước tại đây.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal AI */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!parsedData || parsedData.taskKeys.length === 0}
              onClick={handleApply}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-white dark:bg-neutral-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mở Form để chỉnh sửa thêm
            </button>

            <button
              type="button"
              disabled={!parsedData || parsedData.taskKeys.length === 0 || !parsedData.threadTitle.trim()}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} />
              <span>Lưu trực tiếp vào Clear Doc</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
