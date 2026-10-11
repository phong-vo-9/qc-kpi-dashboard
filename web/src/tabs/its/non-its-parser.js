/**
 * Bộ trích xuất thông minh dữ liệu Feedback không tạo ITS từ văn bản copy
 */

export const SAMPLE_NON_ITS_TEXT = `14/07/2026
GOP
Phúc Lợi — phụ phí không tự áp dụng
[Thread 5](https://vexere.slack.com/archives/C018WQWPR9Q/p1784016615812979)
Giải thích ngưỡng giá trị hàng và cách tính VAT theo cước tự động; Dev xác nhận logic cũ không thay đổi.
Đã xử lý / phản hồi kết luận`

export const KNOWN_PROJECTS = ['GOP', 'AW', 'GMS', 'BOP', 'LOVABUS', 'CRM', 'ERP', 'CORE']

export const KNOWN_STATUSES = [
  'Đã xử lý / phản hồi kết luận',
  'Đã xử lý',
  'Đang xử lý',
  'Chờ phản hồi',
  'Cần làm rõ',
  'Đã đóng',
]

/**
 * Chuyển đổi định dạng ngày dd/mm/yyyy hoặc dd-mm-yyyy sang yyyy-mm-dd
 */
export function normalizeDateToIso(str) {
  if (!str) return ''
  const trimmed = str.trim()
  // dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }
  // yyyy-mm-dd
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
  if (ymdMatch) {
    const year = ymdMatch[1]
    const month = ymdMatch[2].padStart(2, '0')
    const day = ymdMatch[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return ''
}

/**
 * Chuyển yyyy-mm-dd thành dd/mm/yyyy hiển thị
 */
export function formatIsoToDmy(isoStr) {
  if (!isoStr) return ''
  const parts = isoStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return isoStr
}

/**
 * Phân tích văn bản dán vào thành đối tượng dữ liệu Feedback
 */
export function parseNonItsFeedbackText(text) {
  if (!text || typeof text !== 'string') {
    return {
      date: new Date().toISOString().split('T')[0],
      project: 'GOP',
      title: '',
      slackUrl: '',
      slackTitle: '',
      resolution: '',
      status: 'Đã xử lý / phản hồi kết luận',
      confidence: 0,
    }
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  let date = ''
  let project = ''
  let title = ''
  let slackUrl = ''
  let slackTitle = ''
  let resolution = ''
  let status = ''

  const remainingLines = []
  let confidenceScore = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 1. Kiểm tra ngày tháng
    const parsedIso = normalizeDateToIso(line)
    if (parsedIso && !date) {
      date = parsedIso
      confidenceScore += 20
      continue
    }

    // 2. Kiểm tra Dự án (GOP, AW, GMS...)
    const upper = line.toUpperCase()
    if (!project && KNOWN_PROJECTS.includes(upper)) {
      project = upper
      confidenceScore += 20
      continue
    }

    // 3. Kiểm tra Link Slack dạng Markdown: [Thread 10](https://...) hoặc Slack angle bracket <https://...|Thread 10> hoặc URL
    const mdSlackMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/i)
    if (mdSlackMatch && !slackUrl) {
      slackTitle = mdSlackMatch[1].trim()
      slackUrl = mdSlackMatch[2].trim()
      confidenceScore += 20
      continue
    }

    const angleSlackMatch = line.match(/<(https?:\/\/[^\|\s>]+)\|([^>]+)>/i)
    if (angleSlackMatch && !slackUrl) {
      slackUrl = angleSlackMatch[1].trim()
      slackTitle = angleSlackMatch[2].trim()
      confidenceScore += 20
      continue
    }

    const plainAngleMatch = line.match(/<(https?:\/\/[^\s>]+)>/i)
    if (plainAngleMatch && !slackUrl) {
      slackUrl = plainAngleMatch[1].trim()
      slackTitle = 'Thread Slack'
      confidenceScore += 18
      continue
    }

    const anySlackMatch = line.match(/(https?:\/\/[^\s]+slack\.com[^\s\)]*)/i)
    if (anySlackMatch && !slackUrl) {
      slackUrl = anySlackMatch[1].trim()
      const titleCandidate = line.replace(anySlackMatch[0], '').replace(/[\[\]\(\)\:\-–]/g, ' ').trim()
      slackTitle = titleCandidate || 'Thread Slack'
      confidenceScore += 18
      continue
    }

    const anyUrlMatch = line.match(/^(https?:\/\/[^\s]+)$/i)
    if (anyUrlMatch && !slackUrl) {
      slackUrl = anyUrlMatch[1].trim()
      slackTitle = 'Liên kết'
      confidenceScore += 15
      continue
    }

    // 4. Kiểm tra trạng thái
    const matchedStatus = KNOWN_STATUSES.find(
      (st) => line.toLowerCase() === st.toLowerCase() || line.toLowerCase().startsWith(st.toLowerCase())
    )
    if (matchedStatus && !status) {
      status = matchedStatus
      confidenceScore += 20
      continue
    }

    // Dòng thông thường
    remainingLines.push(line)
  }

  // Phân bổ remainingLines:
  // Thường dòng đầu tiên còn lại là tiêu đề/nội dung feedback
  // Các dòng tiếp theo là nội dung xử lý / giải thích
  if (remainingLines.length > 0) {
    title = remainingLines[0]
    confidenceScore += 10
    if (remainingLines.length > 1) {
      resolution = remainingLines.slice(1).join('\n')
      confidenceScore += 10
    }
  }

  // Fallbacks mặc định an toàn
  if (!date) {
    date = new Date().toISOString().split('T')[0]
  }
  if (!project) {
    project = 'GOP'
  }
  if (!status) {
    status = 'Đã xử lý / phản hồi kết luận'
  }
  if (!slackTitle && slackUrl) {
    slackTitle = 'Thread Slack'
  }

  return {
    date,
    project,
    title,
    slackUrl,
    slackTitle,
    resolution,
    status,
    confidence: Math.min(100, confidenceScore),
  }
}
