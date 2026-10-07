import { useState } from 'react'
import { ExternalLink, Layers, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { jiraUrl } from '../../lib/api.js'
import { getStatusBadgeClasses, detectPlatform } from './cleardoc-utils.js'

// Badge trạng thái Jira có chấm tròn chỉ thị
export function JiraStatusBadge({ status }) {
  const s = status || 'Todo'
  const style = getStatusBadgeClasses(s)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border} shrink-0`}
      title={`Trạng thái Jira: ${s}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span className="truncate max-w-[100px]">{s}</span>
    </span>
  )
}

// Badge loại công việc: Task (Sky blue) vs Support (Purple)
export function TaskTypeBadge({ type }) {
  const isSupport = String(type || '').trim().toLowerCase() === 'support'
  if (isSupport) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200/80 dark:border-purple-500/30 shrink-0"
        title="Loại: Support"
      >
        Support
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/30 shrink-0"
      title="Loại: Task"
    >
      Task
    </span>
  )
}

// Badge hiển thị Platform của link thảo luận (Slack, Lark, Confluence...)
export function PlatformBadge({ url }) {
  const platform = detectPlatform(url)
  if (!platform) return null
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${platform.color} shrink-0`}
      title={`Nguồn thảo luận: ${platform.name}`}
    >
      <MessageSquare size={10} />
      <span>{platform.name}</span>
    </span>
  )
}

/**
 * Hiển thị cụm các Task được gộp:
 * - Khi có 1 task: hiển thị gọn gàng mã + tên
 * - Khi có nhiều task: hiển thị task chính + các tag pills với nút thu gọn/mở rộng,
 *   tránh việc bảng bị kéo dãn dọc quá mức.
 */
export function TaskPillGroup({ taskKeys = [], taskMap = new Map() }) {
  const [expanded, setExpanded] = useState(false)

  if (taskKeys.length === 0) {
    return <span className="text-gray-400 text-xs italic">Không có task</span>
  }

  // 1 task đơn lẻ
  if (taskKeys.length === 1) {
    const k = taskKeys[0]
    const t = taskMap.get(k)
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <a
            href={jiraUrl(k)}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono group"
            title="Mở issue trên Jira"
          >
            <span>{k}</span>
            <ExternalLink size={11} className="opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
          {t?.type && <TaskTypeBadge type={t.type} />}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2" title={t?.summary}>
          {t?.summary || '—'}
        </div>
      </div>
    )
  }

  // Nhiều tasks được gộp
  const primaryKey = taskKeys[0]
  const primaryTask = taskMap.get(primaryKey)
  const remainingKeys = taskKeys.slice(1)

  return (
    <div className="space-y-1.5">
      {/* Header chỉ báo gộp */}
      <div className="flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          <Layers size={10} />
          <span>{taskKeys.length} tasks gộp</span>
        </span>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
        >
          <span>{expanded ? 'Thu gọn' : `+${remainingKeys.length} task`}</span>
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Task đầu tiên (chính) */}
      <div className="p-1.5 rounded-md bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-1.5">
          <a
            href={jiraUrl(primaryKey)}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono"
            title="Mở issue trên Jira"
          >
            <span>{primaryKey}</span>
            <ExternalLink size={10} className="opacity-70" />
          </a>
          {primaryTask?.type && <TaskTypeBadge type={primaryTask.type} />}
        </div>
        <div className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5" title={primaryTask?.summary}>
          {primaryTask?.summary || '—'}
        </div>
      </div>

      {/* Danh sách các task phụ khi mở rộng */}
      {expanded ? (
        <div className="space-y-1.5 pl-1 pt-1 border-l-2 border-blue-200 dark:border-blue-800">
          {remainingKeys.map((k) => {
            const t = taskMap.get(k)
            return (
              <div key={k} className="p-1.5 rounded-md bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-700/60">
                <div className="flex items-center gap-1.5">
                  <a
                    href={jiraUrl(k)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <span>{k}</span>
                    <ExternalLink size={10} className="opacity-70" />
                  </a>
                  {t?.type && <TaskTypeBadge type={t.type} />}
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5" title={t?.summary}>
                  {t?.summary || '—'}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Khi thu gọn: hiển thị tag pills ngang gọn gàng */
        <div className="flex flex-wrap gap-1">
          {remainingKeys.map((k) => {
            const t = taskMap.get(k)
            return (
              <a
                key={k}
                href={jiraUrl(k)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                title={`${k}: ${t?.summary || ''}`}
              >
                <span>{k}</span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
