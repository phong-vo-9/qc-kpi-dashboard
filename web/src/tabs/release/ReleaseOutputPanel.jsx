import { useState } from 'react'
import {
  Copy, Check, Edit3, Eye, Send, CheckSquare, Save,
  RefreshCw, ExternalLink, Sparkles, AlertCircle, FileText
} from 'lucide-react'

export function ReleaseOutputPanel({
  notificationMessage = '',
  scopeMessage = '',
  onChangeNotificationMessage,
  onChangeScopeMessage,
  onSaveHistory,
  onRegenerate,
  isGenerating,
  aiError,
  isFallback,
}) {
  const [copiedSection, setCopiedSection] = useState(null) // 'notify' | 'notify-jira' | 'scope' | 'all'
  const [isEditingNotify, setIsEditingNotify] = useState(false)
  const [isEditingScope, setIsEditingScope] = useState(false)

  // Copy thông minh: Ghi cả Rich Text HTML và Plain text vào Clipboard
  // Khi paste vào Jira Visual tab hoặc Slack, mã task sẽ là link màu xanh và Header in đậm y hệt trong ảnh!
  const handleCopyNotificationRich = async () => {
    if (!notificationMessage) return

    // Chuyển markdown sang HTML để paste rich text vào Jira / Slack
    let html = notificationMessage
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      .replace(
        /\[([A-Z][A-Z0-9]+-\d+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" style="color: #1d9bd1; text-decoration: underline; font-weight: 600;">$1</a>'
      )
      .replace(/(@channel|@here|@all)/g, '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 4px; font-weight: 600;">$1</span>')
      .replace(/\n/g, '<br/>')

    try {
      const blobHtml = new Blob([html], { type: 'text/html' })
      const blobText = new Blob([notificationMessage], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ])
      setCopiedSection('notify')
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (e) {
      navigator.clipboard.writeText(notificationMessage)
      setCopiedSection('notify')
      setTimeout(() => setCopiedSection(null), 2000)
    }
  }

  // Copy Jira Markup (dành cho chế độ Text trên Jira: [KEY|URL])
  const handleCopyJiraMarkup = () => {
    if (!notificationMessage) return
    const jiraMarkup = notificationMessage.replace(
      /\[([A-Z][A-Z0-9]+-\d+)\]\((https?:\/\/[^\s)]+)\)/g,
      '[$1|$2]'
    )
    navigator.clipboard.writeText(jiraMarkup)
    setCopiedSection('notify-jira')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const handleCopyScope = () => {
    if (!scopeMessage) return
    navigator.clipboard.writeText(scopeMessage)
    setCopiedSection('scope')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const handleCopyAll = async () => {
    const fullText = `${notificationMessage}\n\n${scopeMessage}`.trim()
    try {
      let html = fullText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
        .replace(
          /\[([A-Z][A-Z0-9]+-\d+)\]\((https?:\/\/[^\s)]+)\)/g,
          '<a href="$2" style="color: #1d9bd1; text-decoration: underline; font-weight: 600;">$1</a>'
        )
        .replace(/\n/g, '<br/>')
      const blobHtml = new Blob([html], { type: 'text/html' })
      const blobText = new Blob([fullText], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ])
    } catch (e) {
      navigator.clipboard.writeText(fullText)
    }
    setCopiedSection('all')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  // Tách nội dung In Scope và Out of Scope để hiển thị giao diện đẹp
  const parseScopeContent = (raw) => {
    if (!raw) return { inScope: '', outScope: '' }
    const outMatch = raw.match(/Out of scope([\s\S]*)$/i)
    const inMatch = raw.match(/In scope([\s\S]*?)(?=Out of scope|$)/i)

    return {
      inScope: inMatch ? inMatch[1].trim() : '',
      outScope: outMatch ? outMatch[1].trim() : '',
    }
  }

  const { inScope, outScope } = parseScopeContent(scopeMessage)

  // Render text mô phỏng như ảnh chụp thực tế
  const renderFormattedPreview = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    return (
      <div className="space-y-1.5 text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-2" />
          }

          // Kiểm tra header in đậm (dạng *HEADER*)
          const boldMatch = line.match(/^\*([^*]+)\*$/)
          if (boldMatch) {
            return (
              <div key={idx} className="text-sm font-extrabold text-gray-900 dark:text-gray-50 tracking-wide pb-1">
                {boldMatch[1]}
              </div>
            )
          }

          // Kiểm tra dòng task dạng • [KEY](URL) — Summary
          const taskMatch = line.match(/^•\s*\[([A-Z][A-Z0-9]+-\d+)\]\(([^)]+)\)\s*(—|-)\s*(.*)$/)
          if (taskMatch) {
            const [, key, url, , summary] = taskMatch
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-0.5">
                <span className="text-gray-400 dark:text-gray-500 font-bold">•</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 hover:underline shrink-0"
                >
                  {key}
                </a>
                <span className="text-gray-400 dark:text-gray-500">—</span>
                <span className="text-gray-800 dark:text-gray-200">{summary}</span>
              </div>
            )
          }

          // Kiểm tra tag mention như @channel
          if (line.includes('@channel') || line.includes('@here') || line.includes('@all')) {
            const parts = line.split(/(@channel|@here|@all)/g)
            return (
              <div key={idx} className="pt-1">
                {parts.map((p, pIdx) =>
                  p === '@channel' || p === '@here' || p === '@all' ? (
                    <span
                      key={pIdx}
                      className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                    >
                      {p}
                    </span>
                  ) : (
                    <span key={pIdx}>{p}</span>
                  )
                )}
              </div>
            )
          }

          return <div key={idx}>{line}</div>
        })}
      </div>
    )
  }

  // Empty state khi chưa có nội dung
  if (!notificationMessage && !scopeMessage && !isGenerating) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm p-8 flex flex-col items-center justify-center text-center min-h-[460px]">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
          <Send size={26} />
        </div>
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
          Chưa có thông báo Release nào
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mt-1.5 leading-relaxed">
          Hãy nhập mã task ở cột bên trái (ví dụ: <code className="font-mono bg-gray-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">GOP-4351, GOP-3647</code>) và bấm <strong>"Tạo thông báo Release bằng AI"</strong> để xem kết quả.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {aiError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* CARD 1: Tin nhắn Thông báo Release */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all">
        {/* Header Card 1 */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/70 dark:bg-neutral-800/50 border-b border-gray-100 dark:border-neutral-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
              <Send size={14} />
            </span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Phần 1: Thông báo Release
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditingNotify(!isEditingNotify)}
              className="px-2 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1"
            >
              {isEditingNotify ? <Eye size={12} /> : <Edit3 size={12} />}
              {isEditingNotify ? 'Xem' : 'Sửa'}
            </button>

            {/* Nút copy Jira Markup */}
            <button
              type="button"
              onClick={handleCopyJiraMarkup}
              title="Copy định dạng Markup cho tab Text trong Jira"
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <FileText size={12} />
              {copiedSection === 'notify-jira' ? 'Đã copy Markup!' : 'Jira Markup'}
            </button>

            {/* Nút copy chính (Rich Text: paste ra link xanh và bold) */}
            <button
              type="button"
              onClick={handleCopyNotificationRich}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                copiedSection === 'notify'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
              }`}
            >
              {copiedSection === 'notify' ? <Check size={13} /> : <Copy size={13} />}
              {copiedSection === 'notify' ? 'Đã copy!' : 'Copy Thông báo'}
            </button>
          </div>
        </div>

        {/* Body Card 1 */}
        <div className="p-4">
          {isEditingNotify ? (
            <textarea
              rows={6}
              value={notificationMessage}
              onChange={(e) => onChangeNotificationMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono leading-relaxed"
            />
          ) : (
            <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 select-all">
              {renderFormattedPreview(notificationMessage)}
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: Phạm vi In Scope & Out of Scope */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all">
        {/* Header Card 2 */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/70 dark:bg-neutral-800/50 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
              <CheckSquare size={14} />
            </span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Phần 2: In scope & Out of scope
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditingScope(!isEditingScope)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1"
            >
              {isEditingScope ? <Eye size={12} /> : <Edit3 size={12} />}
              {isEditingScope ? 'Xem' : 'Sửa'}
            </button>
            <button
              type="button"
              onClick={handleCopyScope}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                copiedSection === 'scope'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
              }`}
            >
              {copiedSection === 'scope' ? <Check size={13} /> : <Copy size={13} />}
              {copiedSection === 'scope' ? 'Đã copy!' : 'Copy In/Out Scope'}
            </button>
          </div>
        </div>

        {/* Body Card 2 */}
        <div className="p-4 space-y-3">
          {isEditingScope ? (
            <textarea
              rows={8}
              value={scopeMessage}
              onChange={(e) => onChangeScopeMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono leading-relaxed"
            />
          ) : (
            <div className="space-y-3">
              {/* In scope box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    In scope
                  </span>
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {inScope || scopeMessage}
                </div>
              </div>

              {/* Out of scope box */}
              {outScope && (
                <div className="p-3.5 rounded-xl bg-orange-50/40 dark:bg-orange-500/5 border border-orange-200/60 dark:border-orange-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300">
                      Out of scope
                    </span>
                  </div>
                  <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {outScope}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Toolbar: Copy All + Save + Regenerate */}
      <div className="flex items-center justify-between p-3.5 bg-gray-50/80 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              copiedSection === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 dark:bg-neutral-700 hover:bg-black dark:hover:bg-neutral-600 text-white shadow-sm'
            }`}
          >
            {copiedSection === 'all' ? <Check size={13} /> : <Copy size={13} />}
            {copiedSection === 'all' ? 'Đã copy tất cả!' : 'Copy Toàn bộ (Cả 2 phần)'}
          </button>
          <button
            type="button"
            onClick={onSaveHistory}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
          >
            <Save size={13} /> Lưu vào Lịch sử
          </button>
        </div>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 flex items-center gap-1.5 ml-auto"
        >
          <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
          Tạo lại (Regenerate)
        </button>
      </div>
    </div>
  )
}
