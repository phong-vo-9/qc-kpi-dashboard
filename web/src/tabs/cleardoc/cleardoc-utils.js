// cleardoc-utils.js: Utility functions, NLP parser, data formatters for Clear Doc tab

export const SAMPLE_USER_TEXT = `[GOP-3647](https://jira.vexere.net/browse/GOP-3647)
GMS - Phím tắt - Apply phím tắt cho Form Hàng
[GOP-4351](https://jira.vexere.net/browse/GOP-4351)
GMS - Phím tắt - Danh sách phím tắt - Phím tắt chung
[GOP-4350](https://jira.vexere.net/browse/GOP-4350)
BMS -UI - Phím tắt - Cấu hình
[Clear doc về các task liên quan tới Phím tắt](https://vexere.slack.com/archives/C012EJ1RKU0/p1788858019607759)
Về UI trong doc
Hiện tại em thấy trong doc đang có 2 hình ảnh phần Phím tắt hơi khác nhau (em có khoanh 2 chỗ trong hình đính kèm). Mình sẽ chốt UI/tác vụ theo hình nào vậy chị?
Tác vụ “Mở danh sách phím tắt”
Em thấy có cấu hình tác vụ “Mở danh sách phím tắt” với phím Ctrl + /.
Ví dụ khi user đang ở GMS và nhấn Ctrl + / thì danh sách phím tắt sẽ được hiển thị dưới dạng gì ạ (Modal/Popup/Dropdown/...)?
Hiện tại em chưa thấy phần này được mô tả trong doc hoặc Figma nên chưa rõ expected behavior.
Về phím tắt trên MacOS
Ví dụ user cấu hình tác vụ A với phím tắt Ctrl + A, khi sử dụng trên MacOS (nơi thường dùng Command thay cho Ctrl) thì phím tắt này có được tự động mapping sang Command + A không chị? Hay chỉ apply đúng tổ hợp phím đã cấu hình?
Confirm các tác vụ sẽ có trong đợt improve này bao gồm 8 tác vụ`

/**
 * Trích xuất số lượng vấn đề từ văn bản (dựa vào số thứ tự 1., 2., hoặc gạch đầu dòng)
 */
export function extractIssueCount(text) {
  if (!text) return 1
  const matches = text.match(/^\s*(?:\d+[\.\)]|[-*•])\s+/gm)
  if (matches && matches.length > 0) {
    return matches.length
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.length > 0 ? lines.length : 1
}

/**
 * NLP Smart Parser: Phân tích toàn bộ văn bản copy từ Slack, Jira, Confluence, etc.
 */
export function parseClearDocText(rawText, taskMap = new Map()) {
  if (!rawText || !rawText.trim()) return null

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)

  const taskKeys = []
  let threadTitle = ''
  let threadUrl = ''
  const issueLines = []
  let foundThreadLink = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 1. Nhận diện Task Jira:
    const jiraLinkMatch = line.match(/^\[([A-Z0-9]+-\d+)\]\((https?:\/\/[^\s\)]+)\)/i)
    const browseLinkMatch = line.match(/^https?:\/\/[^\s]+\/browse\/([A-Z0-9]+-\d+)/i)
    const plainTaskKeyMatch = line.match(/^([A-Z0-9]+-\d+)(?:\s*[:\-–]\s*(.*))?$/i)

    if (jiraLinkMatch) {
      const key = jiraLinkMatch[1].toUpperCase()
      if (!taskKeys.includes(key)) taskKeys.push(key)
      continue
    }

    if (browseLinkMatch) {
      const key = browseLinkMatch[1].toUpperCase()
      if (!taskKeys.includes(key)) taskKeys.push(key)
      continue
    }

    if (plainTaskKeyMatch) {
      const key = plainTaskKeyMatch[1].toUpperCase()
      if (!taskKeys.includes(key)) taskKeys.push(key)
      continue
    }

    // Nếu dòng trước đó là task link hoặc task key, dòng này thường là summary của task -> bỏ qua
    if (i > 0) {
      const prevLine = lines[i - 1]
      const wasPrevTask =
        prevLine.match(/^\[([A-Z0-9]+-\d+)\]/i) ||
        prevLine.match(/^https?:\/\/[^\s]+\/browse\/([A-Z0-9]+-\d+)/i) ||
        prevLine.match(/^([A-Z0-9]+-\d+)$/i)
      if (wasPrevTask && !line.startsWith('http') && !line.startsWith('[')) {
        continue
      }
    }

    // 2. Nhận diện Link Thread Clear:
    const threadLinkMatch = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/)
    if (threadLinkMatch && !foundThreadLink) {
      threadTitle = threadLinkMatch[1].trim()
      threadUrl = threadLinkMatch[2].trim()
      foundThreadLink = true
      continue
    }

    // Dạng URL thuần (Slack, Lark, Docs...)
    if (!foundThreadLink) {
      const plainUrlMatch = line.match(/^(https?:\/\/[^\s]+)$/)
      if (plainUrlMatch && !plainUrlMatch[1].includes('/browse/')) {
        threadUrl = plainUrlMatch[1]
        if (i > 0 && !lines[i - 1].startsWith('http') && !lines[i - 1].match(/^[A-Z0-9]+-\d+/i)) {
          threadTitle = lines[i - 1]
        }
        foundThreadLink = true
        continue
      }
    }

    // 3. Các dòng câu hỏi / nội dung clear doc
    issueLines.push(line)
  }

  // 4. Phân tích các vấn đề / câu hỏi trong issueLines
  const issues = []
  let currentIssue = []

  const isHeadingLine = (l) => {
    if (/^\s*(?:\d+[\.\)]|[-*•])\s+/.test(l)) return true
    if (/^(Về |Tác vụ |Confirm |Xác nhận |Kiểm tra |Lưu ý |Quy tắc |Behavior |Case |Phần |Mục |Q&A|Câu hỏi|Bug|Issue|Hỏi|Lỗi)/i.test(l)) return true
    return false
  }

  for (let i = 0; i < issueLines.length; i++) {
    const l = issueLines[i]
    if (isHeadingLine(l)) {
      if (currentIssue.length > 0) {
        issues.push(currentIssue.join('\n'))
        currentIssue = []
      }
      currentIssue.push(l)
    } else {
      currentIssue.push(l)
    }
  }

  if (currentIssue.length > 0) {
    issues.push(currentIssue.join('\n'))
  }

  // Tự động đánh số thứ tự 1., 2., 3. nếu chưa có
  const formattedContent = issues
    .map((iss, idx) => {
      const trimmed = iss.trim()
      if (/^\s*\d+[\.\)]\s+/.test(trimmed)) {
        return trimmed
      }
      return `${idx + 1}. ${trimmed}`
    })
    .join('\n\n')

  // 5. Tự động nhận diện Dự án, Sprint, Quý từ taskMap
  let detectedProject = ''
  let detectedSprint = ''
  let detectedQuarter = ''
  let detectedYear = ''

  for (const k of taskKeys) {
    const t = taskMap.get(k)
    if (t) {
      if (!detectedProject && t.project) detectedProject = t.project
      if (!detectedSprint && t.sprint) detectedSprint = t.sprint
      if (!detectedQuarter && t.quarter) detectedQuarter = t.quarter
      if (!detectedYear && t.year) detectedYear = t.year
    }
  }

  if (!detectedProject && taskKeys.length > 0) {
    const firstKey = taskKeys[0]
    const pMatch = firstKey.match(/^([A-Z0-9]+)-/i)
    if (pMatch) detectedProject = pMatch[1].toUpperCase()
  }

  return {
    taskKeys,
    threadTitle: threadTitle || (taskKeys.length > 0 ? `Clear doc cho ${taskKeys.join(', ')}` : 'Clear doc'),
    threadUrl,
    content: formattedContent || issueLines.join('\n'),
    issueCount: issues.length > 0 ? issues.length : 1,
    project: detectedProject || 'GOP',
    sprint: detectedSprint || '',
    quarter: detectedQuarter || '',
    year: detectedYear || '',
  }
}

/**
 * Kiểm tra xem task có phải là Regression Task không (dựa trên label, summary hoặc type)
 */
export function isRegressionTask(t) {
  if (!t) return false
  const labels = t.labels || []
  const hasRegLabel = labels.some((l) => {
    const s = String(l).toLowerCase().replace(/[\s\-_]/g, '')
    return s.includes('regression')
  })
  if (hasRegLabel) return true

  const sum = (t.summary || '').toLowerCase()
  if (sum.includes('regression')) return true

  const typ = (t.type || '').toLowerCase()
  if (typ.includes('regression')) return true

  const issueType = (t.issueType || '').toLowerCase()
  if (issueType.includes('regression')) return true

  return false
}

/**
 * Phân tách các vấn đề / câu hỏi trong nội dung clear doc thành các mục có cấu trúc
 */
export function parseContentIssues(text) {
  if (!text || !text.trim()) return []
  const lines = text.split('\n')
  const issues = []
  let current = null

  const isHeading = (l) => /^\s*(?:\d+[\.\)]|[-*•]|Issue\s+\d+:?)\s+/i.test(l)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (isHeading(trimmed)) {
      if (current) issues.push(current)
      current = { header: trimmed, details: [] }
    } else if (current) {
      current.details.push(trimmed)
    } else {
      current = { header: trimmed, details: [] }
    }
  }

  if (current) issues.push(current)
  return issues
}

/**
 * Lấy style màu sắc theo trạng thái Jira
 */
export function getStatusBadgeClasses(status) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'released') {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200/80 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    }
  }
  if (s === 'done' || s === 'closed') {
    return {
      bg: 'bg-blue-50 dark:bg-blue-500/15',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200/80 dark:border-blue-500/30',
      dot: 'bg-blue-500',
    }
  }
  if (s === 'in progress' || s === 'in-progress' || s === 'inprogress') {
    return {
      bg: 'bg-sky-50 dark:bg-sky-500/15',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200/80 dark:border-sky-500/30',
      dot: 'bg-sky-500',
    }
  }
  if (s === 'testing' || s === 'ready to test') {
    return {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200/80 dark:border-amber-500/30',
      dot: 'bg-amber-500',
    }
  }
  return {
    bg: 'bg-slate-100 dark:bg-neutral-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-neutral-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
  }
}

/**
 * Nhận diện loại platform từ url (Slack, Lark, Confluence, Docs, Jira...)
 */
export function detectPlatform(url) {
  if (!url) return null
  const u = url.toLowerCase()
  if (u.includes('slack.com')) return { name: 'Slack', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30' }
  if (u.includes('larksuite.com') || u.includes('feishu.cn')) return { name: 'Lark', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30' }
  if (u.includes('docs.google.com')) return { name: 'Google Docs', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30' }
  if (u.includes('confluence') || u.includes('atlassian.net/wiki')) return { name: 'Confluence', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30' }
  if (u.includes('/browse/')) return { name: 'Jira', color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30' }
  return { name: 'Link', color: 'text-gray-600 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700' }
}

/**
 * Xuất dữ liệu định dạng TSV chuẩn để dán vào Excel / Báo cáo BSC
 */
export function formatBscTsv(docs, taskMap) {
  if (!docs || docs.length === 0) return ''
  const headers = ['Task', 'Link thread clear', 'Các vấn đề / nội dung clear', 'Tổng vấn đề']
  const rows = docs.map((doc) => {
    const taskStr = (doc.taskKeys || [])
      .map((k) => {
        const t = taskMap.get(k)
        return t ? `${k}: ${t.summary}` : k
      })
      .join('; ')
    const threadStr = doc.threadUrl ? `${doc.threadTitle} (${doc.threadUrl})` : doc.threadTitle
    const contentStr = `"${(doc.content || '').replace(/"/g, '""')}"`
    return [taskStr, threadStr, contentStr, doc.issueCount || 1].join('\t')
  })
  return [headers.join('\t'), ...rows].join('\n')
}

/**
 * Xuất định dạng Markdown tóm tắt để gửi vào Slack/Teams chat
 */
export function formatMarkdownReport(docs, taskMap, stats) {
  if (!docs || docs.length === 0) return ''
  let md = `### 📋 Báo Cáo Clear Doc (${docs.length} thread - ${stats?.totalIssues || 0} vấn đề)\n\n`
  docs.forEach((doc, idx) => {
    const tasks = (doc.taskKeys || []).join(', ')
    md += `**${idx + 1}. ${doc.threadTitle}**\n`
    md += `- **Task liên quan:** ${tasks || '—'}\n`
    if (doc.threadUrl) md += `- **Link thread:** ${doc.threadUrl}\n`
    md += `- **Số vấn đề:** ${doc.issueCount || 1}\n`
    if (doc.content) {
      md += `- **Nội dung:**\n\`\`\`\n${doc.content}\n\`\`\`\n`
    }
    md += `\n`
  })
  return md
}
