import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, Plus, Search, Filter, Calendar, Layers, ExternalLink,
  Edit2, Trash2, CheckCircle2, CircleAlert, HelpCircle, Copy, Check,
  X, ChevronDown, ChevronUp, Sparkles, FolderKanban, RotateCcw, AlertCircle,
  Hash, ArrowUpDown, CornerDownRight, CheckSquare, Square, Bot,
  ArrowRight, Wand2, Maximize2, Minimize2
} from 'lucide-react'
import { Panel, Badge, EmptyState } from '../components/ui.jsx'
import { api, jiraUrl } from '../lib/api.js'

// Mẫu văn bản mặc định theo yêu cầu của người dùng để test nhanh
const SAMPLE_USER_TEXT = `[GOP-3647](https://jira.vexere.net/browse/GOP-3647)
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

// Hàm trích xuất số lượng vấn đề từ văn bản (1., 2., 3., hoặc gạch đầu dòng)
function extractIssueCount(text) {
  if (!text) return 1
  const matches = text.match(/^\s*(?:\d+[\.\)]|[-*•])\s+/gm)
  if (matches && matches.length > 0) {
    return matches.length
  }
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.length > 0 ? lines.length : 1
}

// Hàm thông minh (AI / NLP Parser) phân tích toàn bộ văn bản copy
function parseClearDocText(rawText, taskMap = new Map()) {
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
    // Dạng [KEY-123](url) hoặc URL https://.../browse/KEY-123 hoặc KEY-123
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

    // Nếu dòng trước đó là task link hoặc task key, dòng này thường là summary của task
    if (i > 0) {
      const prevLine = lines[i - 1]
      const wasPrevTask =
        prevLine.match(/^\[([A-Z0-9]+-\d+)\]/i) ||
        prevLine.match(/^https?:\/\/[^\s]+\/browse\/([A-Z0-9]+-\d+)/i) ||
        prevLine.match(/^([A-Z0-9]+-\d+)$/i)
      if (wasPrevTask && !line.startsWith('http') && !line.startsWith('[')) {
        // Dòng summary của task -> bỏ qua không cho vào nội dung câu hỏi
        continue
      }
    }

    // 2. Nhận diện Link Thread Clear:
    // Dạng [Tiêu đề thread](url) không phải task Jira
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
    // Đã có số: "1.", "1)", "Issue 1:", "- "
    if (/^\s*(?:\d+[\.\)]|[-*•])\s+/.test(l)) return true
    // Bắt đầu bằng từ khóa tiêu đề thường gặp trong clear doc tiếng Việt
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

  // Nếu không thấy trong taskMap nhưng mã task có tiền tố GOP-xxx thì project là GOP
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

// Kiểm tra xem task có phải là Regression Task không (dựa trên label, summary hoặc type)
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

// Phân tách các vấn đề / câu hỏi trong nội dung clear doc thành các mục có cấu trúc
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

// Lấy style màu sắc theo trạng thái Jira
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

// Badge trạng thái Jira có màu sắc và chấm tròn chỉ thị
export function JiraStatusBadge({ status }) {
  const s = status || 'Todo'
  const style = getStatusBadgeClasses(s)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border} shrink-0`}
      title={`Trạng thái Jira: ${s}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span className="truncate max-w-[110px]">{s}</span>
    </span>
  )
}

// Badge loại công việc: Task (Sky blue) vs Support (Purple)
export function TaskTypeBadge({ type }) {
  const isSupport = String(type || '').trim().toLowerCase() === 'support'
  if (isSupport) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200/80 dark:border-purple-500/30 shrink-0"
        title="Loại: Support"
      >
        Support
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/30 shrink-0"
      title="Loại: Task"
    >
      Task
    </span>
  )
}

export default function ClearDoc({ tasks = [], mode = 'dark', onNavigateToTask }) {
  // Dữ liệu từ backend
  const [clearDocs, setClearDocs] = useState([])
  const [taskStatuses, setTaskStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Quản lý trạng thái mở rộng nội dung từng hàng của bảng Clear doc
  const [expandedDocIds, setExpandedDocIds] = useState(new Set())
  const [copiedDocId, setCopiedDocId] = useState(null)

  // Toggle mở rộng / thu gọn 1 hàng
  const toggleExpand = (id) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle mở rộng / thu gọn tất cả hàng
  const isAllExpanded = clearDocs.length > 0 && expandedDocIds.size === clearDocs.length
  const toggleExpandAll = (docsList) => {
    if (isAllExpanded) {
      setExpandedDocIds(new Set())
    } else {
      setExpandedDocIds(new Set((docsList || clearDocs).map((d) => d.id)))
    }
  }

  // Sao chép nhanh nội dung 1 doc
  const handleCopyDocContent = (doc) => {
    if (!doc?.content) return
    navigator.clipboard.writeText(doc.content).then(() => {
      setCopiedDocId(doc.id)
      setTimeout(() => setCopiedDocId(null), 2000)
    })
  }

  // Bộ lọc độc lập của Tab Clear doc (không dùng bộ lọc chung)
  const [filterProject, setFilterProject] = useState('GOP')
  const [filterQuarter, setFilterQuarter] = useState('')
  const [filterSprint, setFilterSprint] = useState('all')
  const [search, setSearch] = useState('')

  // Chế độ xem: 'docs' (Bảng Clear doc như hình) | 'tracking' (Tiến độ Clear doc từng Task)
  const [viewMode, setViewMode] = useState('docs')

  // Checkbox chọn nhiều task ở tab tracking để gộp nhanh
  const [selectedTaskKeysForGroup, setSelectedTaskKeysForGroup] = useState([])

  // Modal Thêm / Chỉnh sửa tiêu chuẩn
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    project: 'GOP',
    sprint: '',
    quarter: '',
    year: '',
    taskKeys: [],
    threadTitle: '',
    threadUrl: '',
    content: '',
    issueCount: 1,
  })
  const [taskSearchInModal, setTaskSearchInModal] = useState('')
  const [isAutoCountLocked, setIsAutoCountLocked] = useState(false)

  // Modal AI Tự động điền dữ liệu
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiRawText, setAiRawText] = useState('')
  const [aiParsedResult, setAiParsedResult] = useState(null)

  // Tải danh sách Clear doc và Task statuses từ Backend
  const loadClearDocs = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, statuses] = await Promise.all([
        api('/api/clear-docs'),
        api('/api/clear-docs/task-status'),
      ])
      setClearDocs(Array.isArray(docs) ? docs : [])
      setTaskStatuses(statuses || {})
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Clear doc:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClearDocs()
  }, [loadClearDocs])

  // Lọc các task Jira chỉ lấy Task & Support và LOẠI TRỪ Regression Task
  const eligibleTasks = useMemo(() => {
    return tasks.filter((t) => (t.type === 'Task' || t.type === 'Support') && !isRegressionTask(t))
  }, [tasks])

  // Danh sách các Project có trong tasks
  const availableProjects = useMemo(() => {
    const list = [...new Set(eligibleTasks.map((t) => t.project).filter(Boolean))].sort()
    return list.length > 0 ? list : ['GOP', 'AW']
  }, [eligibleTasks])

  // Danh sách các Quý có trong tasks
  const availableQuarters = useMemo(() => {
    const map = new Map()
    for (const t of eligibleTasks) {
      if (t.quarter && t.year) {
        const key = `${t.quarter}-${t.year}`
        if (!map.has(key)) {
          map.set(key, { quarter: t.quarter, year: Number(t.year), label: key })
        }
      }
    }
    const arr = [...map.values()].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.quarter.localeCompare(a.quarter)
    })
    return arr
  }, [eligibleTasks])

  // Tự động gán Quý mặc định nếu chưa chọn
  useEffect(() => {
    if (!filterQuarter && availableQuarters.length > 0) {
      setFilterQuarter(availableQuarters[0].label)
    }
  }, [availableQuarters, filterQuarter])

  // Danh sách Sprint theo Project và Quý đã chọn
  const availableSprints = useMemo(() => {
    let pool = eligibleTasks
    if (filterProject && filterProject !== 'all') {
      pool = pool.filter((t) => t.project === filterProject)
    }
    if (filterQuarter && filterQuarter !== 'all') {
      const [q, y] = filterQuarter.split('-')
      pool = pool.filter((t) => t.quarter === q && String(t.year) === y)
    }
    const sprints = [...new Set(pool.map((t) => t.sprint).filter(Boolean))]
    return sprints.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  }, [eligibleTasks, filterProject, filterQuarter])

  // Map nhanh task key -> task object (dùng toàn bộ tasks để đảm bảo tìm thấy mọi task đã link)
  const taskMap = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      map.set(t.key, t)
    }
    return map
  }, [tasks])

  // Map task key -> danh sách Clear Doc liên kết
  const taskToClearDocMap = useMemo(() => {
    const map = new Map()
    for (const doc of clearDocs) {
      for (const k of (doc.taskKeys || [])) {
        if (!map.has(k)) map.set(k, [])
        map.get(k).push(doc)
      }
    }
    return map
  }, [clearDocs])

  // Lọc danh sách Clear Doc theo bộ lọc
  const filteredDocs = useMemo(() => {
    return clearDocs.filter((doc) => {
      if (filterProject && filterProject !== 'all' && doc.project !== filterProject) {
        return false
      }
      if (filterQuarter && filterQuarter !== 'all') {
        const [q, y] = filterQuarter.split('-')
        if (doc.quarter !== q || String(doc.year) !== y) {
          const matchesTaskQuarter = (doc.taskKeys || []).some((k) => {
            const t = taskMap.get(k)
            return t && t.quarter === q && String(t.year) === y
          })
          if (!matchesTaskQuarter) return false
        }
      }
      if (filterSprint && filterSprint !== 'all') {
        if (doc.sprint !== filterSprint) {
          const matchesTaskSprint = (doc.taskKeys || []).some((k) => {
            const t = taskMap.get(k)
            return t && t.sprint === filterSprint
          })
          if (!matchesTaskSprint) return false
        }
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchTitle = (doc.threadTitle || '').toLowerCase().includes(q)
        const matchContent = (doc.content || '').toLowerCase().includes(q)
        const matchTask = (doc.taskKeys || []).some((k) => {
          if (k.toLowerCase().includes(q)) return true
          const t = taskMap.get(k)
          return t && (t.summary || '').toLowerCase().includes(q)
        })
        if (!matchTitle && !matchContent && !matchTask) return false
      }
      return true
    })
  }, [clearDocs, filterProject, filterQuarter, filterSprint, search, taskMap])

  // Danh sách các Task áp dụng theo bộ lọc Sprint/Quý hiện tại (để theo dõi tiến độ)
  const currentScopeTasks = useMemo(() => {
    return eligibleTasks.filter((t) => {
      if (filterProject && filterProject !== 'all' && t.project !== filterProject) return false
      if (filterQuarter && filterQuarter !== 'all') {
        const [q, y] = filterQuarter.split('-')
        if (t.quarter !== q || String(t.year) !== y) return false
      }
      if (filterSprint && filterSprint !== 'all' && t.sprint !== filterSprint) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchKey = t.key.toLowerCase().includes(q)
        const matchSummary = (t.summary || '').toLowerCase().includes(q)
        if (!matchKey && !matchSummary) return false
      }
      return true
    })
  }, [eligibleTasks, filterProject, filterQuarter, filterSprint, search])

  // Thống kê số liệu BSC / KPI Mini Cards
  const stats = useMemo(() => {
    const totalThreads = filteredDocs.length
    const totalIssues = filteredDocs.reduce((sum, d) => sum + (Number(d.issueCount) || 0), 0)

    const totalTasksInScope = currentScopeTasks.length
    let tasksClearedCount = 0
    let tasksNotNeededCount = 0
    let tasksPendingCount = 0

    for (const t of currentScopeTasks) {
      const hasClear = (taskToClearDocMap.get(t.key) || []).length > 0
      const isNotNeeded = taskStatuses[t.key]?.status === 'not_needed'
      if (hasClear) {
        tasksClearedCount++
      } else if (isNotNeeded) {
        tasksNotNeededCount++
      } else {
        tasksPendingCount++
      }
    }

    const avgIssuesPerThread = totalThreads > 0 ? (totalIssues / totalThreads).toFixed(1) : 0
    const coverageRate = totalTasksInScope > 0
      ? (((tasksClearedCount + tasksNotNeededCount) / totalTasksInScope) * 100).toFixed(0)
      : 0

    return {
      totalThreads,
      totalIssues,
      totalTasksInScope,
      tasksClearedCount,
      tasksNotNeededCount,
      tasksPendingCount,
      avgIssuesPerThread,
      coverageRate,
    }
  }, [filteredDocs, currentScopeTasks, taskToClearDocMap, taskStatuses])

  // Tự động phân tích AI khi người dùng thay đổi aiRawText
  useEffect(() => {
    if (!aiRawText.trim()) {
      setAiParsedResult(null)
      return
    }
    const result = parseClearDocText(aiRawText, taskMap)
    setAiParsedResult(result)
  }, [aiRawText, taskMap])

  // Mở modal thêm mới
  const handleOpenAddModal = (presetTaskKeys = []) => {
    setEditingId(null)
    const [q, y] = filterQuarter && filterQuarter !== 'all' ? filterQuarter.split('-') : ['', '']
    setFormData({
      project: filterProject && filterProject !== 'all' ? filterProject : 'GOP',
      sprint: filterSprint && filterSprint !== 'all' ? filterSprint : (availableSprints[0] || ''),
      quarter: q,
      year: y ? Number(y) : new Date().getFullYear(),
      taskKeys: presetTaskKeys.length > 0 ? presetTaskKeys : [],
      threadTitle: '',
      threadUrl: '',
      content: '',
      issueCount: 1,
    })
    setIsAutoCountLocked(false)
    setTaskSearchInModal('')
    setIsModalOpen(true)
  }

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (doc) => {
    setEditingId(doc.id)
    setFormData({
      project: doc.project || 'GOP',
      sprint: doc.sprint || '',
      quarter: doc.quarter || '',
      year: doc.year || '',
      taskKeys: [...(doc.taskKeys || [])],
      threadTitle: doc.threadTitle || '',
      threadUrl: doc.threadUrl || '',
      content: doc.content || '',
      issueCount: doc.issueCount || 1,
    })
    setIsAutoCountLocked(true)
    setTaskSearchInModal('')
    setIsModalOpen(true)
  }

  // Áp dụng kết quả AI vào Form thêm/sửa
  const handleApplyAiResultToForm = () => {
    if (!aiParsedResult) return
    const [q, y] = filterQuarter && filterQuarter !== 'all' ? filterQuarter.split('-') : ['', '']
    setEditingId(null)
    setFormData({
      project: aiParsedResult.project || filterProject || 'GOP',
      sprint: aiParsedResult.sprint || filterSprint || '',
      quarter: aiParsedResult.quarter || q || '',
      year: aiParsedResult.year || (y ? Number(y) : new Date().getFullYear()),
      taskKeys: aiParsedResult.taskKeys || [],
      threadTitle: aiParsedResult.threadTitle || '',
      threadUrl: aiParsedResult.threadUrl || '',
      content: aiParsedResult.content || '',
      issueCount: aiParsedResult.issueCount || 1,
    })
    setIsAutoCountLocked(true)
    setIsAiModalOpen(false)
    setIsModalOpen(true)
  }

  // Lưu trực tiếp kết quả AI vào Database
  const handleDirectSaveAiResult = async () => {
    if (!aiParsedResult) return
    if (!aiParsedResult.threadTitle.trim()) {
      alert('Chưa nhận diện được tên thread clear doc!')
      return
    }
    if (aiParsedResult.taskKeys.length === 0) {
      alert('Chưa nhận diện được task nào!')
      return
    }

    const [q, y] = filterQuarter && filterQuarter !== 'all' ? filterQuarter.split('-') : ['', '']
    const docToSave = {
      project: aiParsedResult.project || filterProject || 'GOP',
      sprint: aiParsedResult.sprint || (filterSprint !== 'all' ? filterSprint : ''),
      quarter: aiParsedResult.quarter || q || '',
      year: aiParsedResult.year || (y ? Number(y) : new Date().getFullYear()),
      taskKeys: aiParsedResult.taskKeys,
      threadTitle: aiParsedResult.threadTitle,
      threadUrl: aiParsedResult.threadUrl,
      content: aiParsedResult.content,
      issueCount: aiParsedResult.issueCount,
    }

    try {
      await api('/api/clear-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docToSave),
      })
      setIsAiModalOpen(false)
      setAiRawText('')
      loadClearDocs()
    } catch (err) {
      alert('Lỗi khi lưu dữ liệu AI: ' + err.message)
    }
  }

  // Tự động đếm issueCount khi gõ nội dung (nếu người dùng chưa khóa sửa tay)
  const handleContentChange = (val) => {
    const updated = { ...formData, content: val }
    if (!isAutoCountLocked) {
      updated.issueCount = extractIssueCount(val)
    }
    setFormData(updated)
  }

  // Xóa mục Clear doc
  const handleDeleteDoc = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục Clear doc này không?')) return
    try {
      await api(`/api/clear-docs/${id}`, { method: 'DELETE' })
      setClearDocs((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      alert('Lỗi khi xóa: ' + err.message)
    }
  }

  // Đánh dấu / hủy đánh dấu task không cần clear doc
  const handleToggleTaskNotNeeded = async (taskKey) => {
    const isCurrentlyNotNeeded = taskStatuses[taskKey]?.status === 'not_needed'
    try {
      if (isCurrentlyNotNeeded) {
        await api('/api/clear-docs/task-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskKey, remove: true }),
        })
        setTaskStatuses((prev) => {
          const next = { ...prev }
          delete next[taskKey]
          return next
        })
      } else {
        await api('/api/clear-docs/task-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskKey, status: 'not_needed' }),
        })
        setTaskStatuses((prev) => ({
          ...prev,
          [taskKey]: { status: 'not_needed', updatedAt: new Date().toISOString() },
        }))
      }
    } catch (err) {
      alert('Lỗi cập nhật trạng thái task: ' + err.message)
    }
  }

  // Lưu form (Tạo mới hoặc Sửa)
  const handleSaveModal = async (e) => {
    e.preventDefault()
    if (!formData.threadTitle.trim()) {
      alert('Vui lòng nhập tên / tiêu đề thread clear doc!')
      return
    }
    if (formData.taskKeys.length === 0) {
      alert('Vui lòng chọn ít nhất 1 Task để gắn với mục Clear doc này!')
      return
    }

    try {
      if (editingId) {
        await api(`/api/clear-docs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await api('/api/clear-docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setIsModalOpen(false)
      loadClearDocs()
    } catch (err) {
      alert('Lỗi khi lưu dữ liệu: ' + err.message)
    }
  }

  // Sao chép bảng sang Clipboard (định dạng chuẩn để paste vào Excel / BSC)
  const handleCopyBscTable = () => {
    if (filteredDocs.length === 0) return
    const headers = ['Task', 'Link thread clear', 'Các vấn đề / nội dung clear', 'Tổng vấn đề']
    const rows = filteredDocs.map((doc) => {
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

    const tsv = [headers.join('\t'), ...rows].join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // Danh sách task hiển thị trong modal chọn (có tìm kiếm)
  const modalTaskOptions = useMemo(() => {
    let pool = eligibleTasks
    if (formData.project) {
      pool = pool.filter((t) => t.project === formData.project)
    }
    if (taskSearchInModal.trim()) {
      const q = taskSearchInModal.trim().toLowerCase()
      pool = pool.filter((t) => t.key.toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q))
    }
    return pool.slice(0, 50)
  }, [eligibleTasks, formData.project, taskSearchInModal])

  return (
    <div className="space-y-6">
      {/* ─── THANH CÔNG CỤ LỌC ĐỘC LẬP (PROJECT, QUÝ, SPRINT) ─── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tiêu đề & Icon */}
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Quản lý Clear Doc
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {filteredDocs.length} thread
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Theo dõi các vấn đề làm rõ tài liệu giữa QC và BA/Team, phục vụ đánh giá BSC
              </p>
            </div>
          </div>

          {/* Các nút hành động chính */}
          <div className="flex items-center gap-2">
            {/* NÚT AI TỰ ĐỘNG ĐIỀN */}
            <button
              onClick={() => {
                setAiRawText('')
                setAiParsedResult(null)
                setIsAiModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-sm hover:shadow transition-all group"
              title="Dán đoạn văn bản (mã Jira, link thread, nội dung) để AI tự động trích xuất và gộp dữ liệu"
            >
              <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
              <span>✨ AI Tự động điền</span>
            </button>

            <button
              onClick={handleCopyBscTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 shadow-sm transition-all"
              title="Sao chép toàn bộ bảng dữ liệu để dán vào Excel / Báo cáo BSC"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép!' : 'Sao chép bảng BSC'}</span>
            </button>

            <button
              onClick={() => handleOpenAddModal(selectedTaskKeysForGroup)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              <Plus size={15} />
              <span>Thêm Clear Doc</span>
            </button>
          </div>
        </div>

        {/* Thanh chọn Bộ lọc chuyên biệt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-neutral-800">
          {/* 1. Lọc Project */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <FolderKanban size={12} /> Dự án
            </label>
            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value)
                setFilterSprint('all')
              }}
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">Tất cả dự án</option>
              {availableProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 2. Lọc Quý */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} /> Quý đánh giá
            </label>
            <select
              value={filterQuarter}
              onChange={(e) => {
                setFilterQuarter(e.target.value)
                setFilterSprint('all')
              }}
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">Tất cả các quý</option>
              {availableQuarters.map((q) => (
                <option key={q.label} value={q.label}>{q.label} (Quý {q.quarter.slice(1)} năm {q.year})</option>
              ))}
            </select>
          </div>

          {/* 3. Lọc Sprint */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Layers size={12} /> Sprint
            </label>
            <select
              value={filterSprint}
              onChange={(e) => setFilterSprint(e.target.value)}
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">Tất cả sprint ({availableSprints.length})</option>
              {availableSprints.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 4. Ô tìm kiếm */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Search size={12} /> Tìm kiếm nhanh
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Mã task, tên thread, câu hỏi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI MINI CARDS: TỔNG KẾT NHANH ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <FileText size={13} className="text-blue-500" />
            <span>Tổng số Thread</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {stats.totalThreads}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Trong phạm vi lọc
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Hash size={13} className="text-indigo-500" />
            <span>Tổng vấn đề clear</span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {stats.totalIssues}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            TB {stats.avgIssuesPerThread} vấn đề / thread
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <CheckCircle2 size={13} className="text-green-500" />
            <span>Task có Clear Doc</span>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
            {stats.tasksClearedCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Gắn trong {stats.totalThreads} thread
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <CheckSquare size={13} className="text-gray-500" />
            <span>Không cần Clear</span>
          </div>
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-300 tabular-nums">
            {stats.tasksNotNeededCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Task đơn giản/đã rõ
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" />
            <span>Tỷ lệ hoàn thành</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {stats.coverageRate}%
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {stats.tasksPendingCount} task chưa đánh giá
          </div>
        </div>
      </div>

      {/* ─── THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM (VIEW TOGGLE) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-gray-200/70 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setViewMode('docs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'docs'
                ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Bảng Clear Doc ({filteredDocs.length})
          </button>
          <button
            onClick={() => setViewMode('tracking')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'tracking'
                ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Quản lý Task trong Sprint ({currentScopeTasks.length})
          </button>
        </div>

        {viewMode === 'tracking' && selectedTaskKeysForGroup.length > 0 && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Đã chọn <strong>{selectedTaskKeysForGroup.length}</strong> task:
            </span>
            <button
              onClick={() => handleOpenAddModal(selectedTaskKeysForGroup)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus size={13} /> Gộp vào Clear Doc mới
            </button>
            <button
              onClick={() => setSelectedTaskKeysForGroup([])}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* ─── CHẾ ĐỘ 1: BẢNG CLEAR DOC CHUẨN THEO HÌNH MẪU ─── */}
      {viewMode === 'docs' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {filteredDocs.length === 0 ? (
            <div className="py-14 text-center">
              <EmptyState
                icon={FileText}
                title="Chưa có dữ liệu Clear doc"
                hint="Nhấn '+ Thêm Clear Doc' hoặc '✨ AI Tự động điền' để tạo mục làm rõ tài liệu đầu tiên cho Sprint/Quý này."
              />
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm transition-all"
                >
                  <Sparkles size={15} /> Dán văn bản AI Auto-fill
                </button>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                  <Plus size={15} /> Thêm Clear Doc thủ công
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50/75 dark:bg-neutral-800/40 text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-[260px]">Task</th>
                    <th className="py-3 px-4 w-[230px]">Link thread clear</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <span>Các vấn đề / nội dung clear</span>
                        {filteredDocs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandAll(filteredDocs)}
                            className="normal-case font-semibold text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            title={isAllExpanded ? 'Thu gọn tất cả nội dung câu hỏi' : 'Mở rộng tất cả nội dung câu hỏi'}
                          >
                            {isAllExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                            <span>{isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[110px] text-center">Tổng vấn đề</th>
                    <th className="py-3 px-3 w-[100px] text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-800 text-sm">
                  {filteredDocs.map((doc) => {
                    const taskKeys = doc.taskKeys || []
                    const isExpanded = expandedDocIds.has(doc.id)
                    const issues = parseContentIssues(doc.content)
                    const totalIssuesCount = doc.issueCount || issues.length || 1

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-blue-50/20 dark:hover:bg-neutral-800/50 transition-colors group align-top"
                      >
                        {/* CỘT 1: TASK (Gộp nhiều task theo danh sách dọc) */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-2.5">
                            {taskKeys.length > 1 && (
                              <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100 dark:border-neutral-800">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 uppercase tracking-wider">
                                  {taskKeys.length} tasks gộp
                                </span>
                              </div>
                            )}
                            {taskKeys.map((k) => {
                              const t = taskMap.get(k)
                              return (
                                <div key={k} className="leading-snug">
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={jiraUrl(k)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono"
                                      title="Mở issue trên Jira"
                                    >
                                      <span>{k}</span>
                                      <ExternalLink size={11} className="opacity-70" />
                                    </a>
                                    {t?.type && <TaskTypeBadge type={t.type} />}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5" title={t?.summary}>
                                    {t?.summary || '—'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </td>

                        {/* CỘT 2: LINK THREAD CLEAR */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            {doc.threadUrl ? (
                              <a
                                href={doc.threadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-start gap-1 leading-snug break-words"
                                title={doc.threadUrl}
                              >
                                <span>{doc.threadTitle}</span>
                                <ExternalLink size={12} className="shrink-0 mt-0.5 opacity-70" />
                              </a>
                            ) : (
                              <span className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                                {doc.threadTitle}
                              </span>
                            )}
                            <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              {doc.sprint && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium">
                                  {doc.sprint}
                                </span>
                              )}
                              {doc.quarter && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 font-medium">
                                  {doc.quarter}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CỘT 3: CÁC VẤN ĐỀ / NỘI DUNG CLEAR (EXPANDABLE UI-UX) */}
                        <td className="py-3.5 px-4">
                          {isExpanded ? (
                            /* Trạng thái Mở Rộng: Hiển thị danh sách câu hỏi / vấn đề chuẩn hoá */
                            <div className="space-y-2.5 animate-fade-in">
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
                                <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-neutral-800/60 border border-gray-200/70 dark:border-neutral-700/60 whitespace-pre-line text-xs sm:text-[13px] leading-relaxed text-gray-800 dark:text-gray-200">
                                  {doc.content}
                                </div>
                              )}

                              {/* Thanh điều khiển khi mở rộng */}
                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(doc.id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 py-1 px-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  <ChevronUp size={13} />
                                  <span>Thu gọn nội dung</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyDocContent(doc)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline py-1 px-2"
                                >
                                  {copiedDocId === doc.id ? (
                                    <>
                                      <Check size={13} className="text-green-500" />
                                      <span className="text-green-600 dark:text-green-400 font-semibold">Đã sao chép</span>
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
                          ) : (
                            /* Trạng thái Thu Gọn: Hiển thị preview 2 dòng + Nút Xem Chi Tiết */
                            <div className="space-y-1.5">
                              <div className="text-xs sm:text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-2 pr-2 whitespace-pre-line">
                                {doc.content}
                              </div>
                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(doc.id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1 px-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border border-blue-200/70 dark:border-blue-500/30 shadow-2xs"
                                >
                                  <span>Xem chi tiết ({totalIssuesCount} vấn đề)</span>
                                  <ChevronDown size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* CỘT 4: TỔNG VẤN ĐỀ */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[34px] h-7 px-2 rounded-lg font-bold text-sm bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 tabular-nums shadow-xs">
                            {totalIssuesCount}
                          </span>
                        </td>

                        {/* CỘT 5: THAO TÁC (SAO CHÉP / SỬA / XÓA) */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyDocContent(doc)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                              title="Sao chép nội dung vấn đề"
                            >
                              {copiedDocId === doc.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(doc)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                              title="Chỉnh sửa mục Clear doc"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDoc(doc.id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
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
          )}
        </div>
      )}

      {/* ─── CHẾ ĐỘ 2: BẢNG QUẢN LÝ TIẾN ĐỘ CLEAR DOC CÁC TASK TRONG SPRINT ─── */}
      {viewMode === 'tracking' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-3 bg-gray-50/80 dark:bg-neutral-800/40 border-b border-gray-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-gray-600 dark:text-gray-300">
              Danh sách <strong>{currentScopeTasks.length}</strong> Task & Support trong phạm vi lọc (đã tự động loại trừ Regression Task). Bạn có thể tick chọn các task cùng 1 tính năng để gộp nhanh vào Clear doc, hoặc đánh dấu các task đơn giản không cần clear.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50/75 dark:bg-neutral-800/40 text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        currentScopeTasks.length > 0 &&
                        selectedTaskKeysForGroup.length === currentScopeTasks.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTaskKeysForGroup(currentScopeTasks.map((t) => t.key))
                        } else {
                          setSelectedTaskKeysForGroup([])
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-28">Mã Task</th>
                  <th className="py-3 px-4">Tên công việc (Summary)</th>
                  <th className="py-3 px-3 w-24 text-center">Loại</th>
                  <th className="py-3 px-3 w-32 text-center">Trạng thái Jira</th>
                  <th className="py-3 px-4 w-64">Trạng thái Clear Doc</th>
                  <th className="py-3 px-3 w-44 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {currentScopeTasks.map((t) => {
                  const linkedDocs = taskToClearDocMap.get(t.key) || []
                  const hasClear = linkedDocs.length > 0
                  const isNotNeeded = taskStatuses[t.key]?.status === 'not_needed'
                  const isSelected = selectedTaskKeysForGroup.includes(t.key)

                  return (
                    <tr
                      key={t.key}
                      className={`hover:bg-blue-50/20 dark:hover:bg-neutral-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTaskKeysForGroup((prev) => [...prev, t.key])
                            } else {
                              setSelectedTaskKeysForGroup((prev) => prev.filter((k) => k !== t.key))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Mã Task */}
                      <td className="py-3 px-3 font-bold whitespace-nowrap">
                        <a
                          href={jiraUrl(t.key)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono font-bold"
                        >
                          <span>{t.key}</span>
                          <ExternalLink size={11} className="opacity-70" />
                        </a>
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                        <span className="font-medium">{t.summary}</span>
                      </td>

                      {/* Loại */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <TaskTypeBadge type={t.type} />
                      </td>

                      {/* Status Jira */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <JiraStatusBadge status={t.status} />
                      </td>

                      {/* Trạng thái Clear Doc */}
                      <td className="py-3 px-4">
                        {hasClear ? (
                          <div className="space-y-1">
                            {linkedDocs.map((ld) => (
                              <div
                                key={ld.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/30 max-w-[240px]"
                                title={ld.threadTitle}
                              >
                                <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                                <span className="truncate">{ld.threadTitle}</span>
                              </div>
                            ))}
                          </div>
                        ) : isNotNeeded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 border border-gray-200 dark:border-neutral-700">
                            <CheckSquare size={13} className="text-gray-500" />
                            <span>Không cần clear</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30">
                            <CircleAlert size={13} className="text-amber-500" />
                            <span>Chưa có clear doc</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal([t.key])}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-800/80 transition-all shadow-2xs"
                            title="Tạo hoặc gộp Clear doc cho task này"
                          >
                            <Plus size={13} />
                            <span>Clear doc</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleTaskNotNeeded(t.key)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                              isNotNeeded
                                ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-gray-300 dark:border-neutral-700'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-dashed border-gray-300 dark:border-neutral-700'
                            }`}
                            title={isNotNeeded ? 'Nhấp để bỏ đánh dấu (chuyển lại cần clear doc)' : 'Đánh dấu task đơn giản, không cần làm rõ tài liệu'}
                          >
                            {isNotNeeded ? (
                              <>
                                <CheckSquare size={13} className="text-emerald-500" />
                                <span>Bỏ K.Cần</span>
                              </>
                            ) : (
                              <>
                                <Square size={13} />
                                <span>K.Cần doc</span>
                              </>
                            )}
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
      )}

      {/* ─── MODAL 1: AI TỰ ĐỘNG ĐIỀN DỮ LIỆU (TỰ ĐỘNG GỘP TASK & FORMAT) ─── */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-purple-200 dark:border-purple-900/50 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header Modal AI */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>AI Tự động điền dữ liệu Clear Doc</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white uppercase tracking-wider">
                      Smart Parser
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Dán văn bản thô bất kỳ chứa link task Jira, link thread và câu hỏi. Hệ thống sẽ tự động gộp task, nhận diện thread và đánh số vấn đề.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thân Modal AI */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs sm:text-sm">
              {/* Ô dán văn bản */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <FileText size={14} className="text-purple-500" />
                    <span>Dán văn bản cần phân tích vào đây</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAiRawText(SAMPLE_USER_TEXT)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <Wand2 size={12} />
                    <span>Dán đoạn văn bản mẫu của bạn</span>
                  </button>
                </div>

                <textarea
                  rows={8}
                  placeholder={`Ví dụ dán đoạn:\n[GOP-3647](https://jira.vexere.net/browse/GOP-3647)\nGMS - Phím tắt - Apply phím tắt cho Form Hàng\n[GOP-4351](https://jira.vexere.net/browse/GOP-4351)\n...\n[Clear doc về các task...](https://vexere.slack.com/...)\nVề UI trong doc...\nTác vụ...`}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  className="w-full border border-gray-200 dark:border-neutral-700 rounded-xl p-3 bg-gray-50/50 dark:bg-neutral-800/50 text-gray-800 dark:text-gray-200 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-purple-500/40 focus:bg-white dark:focus:bg-neutral-800"
                />
              </div>

              {/* KẾT QUẢ PHÂN TÍCH THÔNG MINH (LIVE PREVIEW) */}
              {aiParsedResult && (
                <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40 space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-300">
                      <Bot size={16} />
                      <span>Kết quả phân tích tự động</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        {aiParsedResult.taskKeys.length} task phát hiện
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300">
                        {aiParsedResult.issueCount} vấn đề clear
                      </span>
                    </div>
                  </div>

                  {/* 1. Các Task phát hiện & gộp */}
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                      Tasks được gộp chung:
                    </div>
                    {aiParsedResult.taskKeys.length === 0 ? (
                      <div className="text-xs text-amber-600">Không tìm thấy mã task trong văn bản</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {aiParsedResult.taskKeys.map((k) => {
                          const t = taskMap.get(k)
                          return (
                            <div
                              key={k}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 border border-purple-200 dark:border-purple-800/60 shadow-xs"
                            >
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{k}</span>
                              {t?.summary && (
                                <span className="text-gray-600 dark:text-gray-300 font-normal max-w-[200px] truncate">
                                  - {t.summary}
                                </span>
                              )}
                              <CheckCircle2 size={13} className="text-green-500" />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Thread clear doc */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wider">
                        Tiêu đề Thread:
                      </div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {aiParsedResult.threadTitle || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wider">
                        Đường dẫn Thread URL:
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                        {aiParsedResult.threadUrl ? (
                          <a href={aiParsedResult.threadUrl} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                            <span className="truncate max-w-[280px]">{aiParsedResult.threadUrl}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Không có link URL</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Phân loại Project, Sprint, Quý */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Tự nhận diện:
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
                      Dự án: {aiParsedResult.project || 'GOP'}
                    </span>
                    {aiParsedResult.sprint && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
                        Sprint: {aiParsedResult.sprint}
                      </span>
                    )}
                    {aiParsedResult.quarter && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
                        Quý: {aiParsedResult.quarter}-{aiParsedResult.year}
                      </span>
                    )}
                  </div>

                  {/* 4. Nội dung đã định dạng */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                      Nội dung đã được sắp xếp & đánh số ({aiParsedResult.issueCount} vấn đề):
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-purple-100 dark:border-neutral-800 max-h-48 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                      {aiParsedResult.content}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal AI */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/30">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!aiParsedResult || aiParsedResult.taskKeys.length === 0}
                  onClick={handleApplyAiResultToForm}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-white dark:bg-neutral-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mở Form để chỉnh sửa thêm
                </button>

                <button
                  type="button"
                  disabled={!aiParsedResult || aiParsedResult.taskKeys.length === 0}
                  onClick={handleDirectSaveAiResult}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={14} />
                  <span>Lưu trực tiếp vào Clear Doc</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: THÊM / CHỈNH SỬA CLEAR DOC TIÊU CHUẨN ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText size={18} />
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {editingId ? 'Chỉnh sửa mục Clear Doc' : 'Thêm mới mục Clear Doc'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung Form */}
            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
              {/* Banner AI Quick-fill bên trong form */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
                  <Sparkles size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Bạn có đoạn văn bản copy? Dùng AI để tự động trích xuất các ô bên dưới.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setIsAiModalOpen(true)
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs shrink-0 ml-2"
                >
                  Dán bằng AI
                </button>
              </div>

              {/* Dự án, Quý, Sprint */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Dự án <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                  >
                    {availableProjects.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Quý đánh giá
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Q3 hoặc Q3-2026"
                    value={formData.quarter ? `${formData.quarter}-${formData.year || ''}` : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim()
                      const parts = val.split('-')
                      setFormData({
                        ...formData,
                        quarter: parts[0] || '',
                        year: parts[1] ? Number(parts[1]) : formData.year,
                      })
                    }}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Sprint
                  </label>
                  <input
                    type="text"
                    placeholder="VD: GMS 8.6"
                    value={formData.sprint}
                    onChange={(e) => setFormData({ ...formData, sprint: e.target.value })}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* CHỌN VÀ GỘP NHIỀU TASK */}
              <div className="space-y-2 p-3 bg-gray-50/75 dark:bg-neutral-800/40 rounded-xl border border-gray-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <span>Chọn các Task gộp chung vào thread này</span>
                    <span className="text-red-500">*</span>
                    <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                      ({formData.taskKeys.length} task đã chọn)
                    </span>
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">
                    Chỉ áp dụng cho Task & Support
                  </span>
                </div>

                {/* Các task đã chọn (Badges) */}
                {formData.taskKeys.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {formData.taskKeys.map((k) => {
                      const t = taskMap.get(k)
                      return (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                        >
                          <span>{k}</span>
                          {t?.summary && (
                            <span className="font-normal text-[11px] text-blue-700/80 dark:text-blue-300/80 max-w-[140px] truncate">
                              - {t.summary}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                taskKeys: formData.taskKeys.filter((x) => x !== k),
                              })
                            }}
                            className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-500/40 rounded text-blue-600 dark:text-blue-300"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Tìm kiếm và chọn thêm task */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Gõ mã task (GOP-...) hoặc từ khóa tên task để tìm..."
                      value={taskSearchInModal}
                      onChange={(e) => setTaskSearchInModal(e.target.value)}
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                    />
                    <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                  </div>

                  {/* Danh sách task có thể chọn */}
                  <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-neutral-700 rounded-lg divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-800">
                    {modalTaskOptions.length === 0 ? (
                      <div className="p-2 text-center text-xs text-gray-400">
                        Không tìm thấy task phù hợp
                      </div>
                    ) : (
                      modalTaskOptions.map((t) => {
                        const isChecked = formData.taskKeys.includes(t.key)
                        return (
                          <div
                            key={t.key}
                            onClick={() => {
                              if (isChecked) {
                                setFormData({
                                  ...formData,
                                  taskKeys: formData.taskKeys.filter((x) => x !== t.key),
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  taskKeys: [...formData.taskKeys, t.key],
                                })
                              }
                            }}
                            className="flex items-center justify-between px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                              />
                              <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                {t.key}
                              </span>
                              <span className="text-gray-600 dark:text-gray-300 truncate">
                                {t.summary}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <TaskTypeBadge type={t.type} />
                              <span className="text-[10px] text-gray-400">
                                {t.sprint || 'No sprint'}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* LINK THREAD CLEAR */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tên hiển thị thread clear <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Clear doc về các task liên quan tới Phím tắt"
                    value={formData.threadTitle}
                    onChange={(e) => setFormData({ ...formData, threadTitle: e.target.value })}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                    <span>Đường dẫn URL liên kết thread (tùy chọn)</span>
                    <span className="text-[11px] font-normal text-gray-400">Slack, Lark, Confluence, Google Docs...</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.threadUrl}
                    onChange={(e) => setFormData({ ...formData, threadUrl: e.target.value })}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* CÁC VẤN ĐỀ / NỘI DUNG CLEAR & TỔNG VẤN ĐỀ */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Các vấn đề / nội dung clear doc <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Tổng vấn đề:
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={formData.issueCount}
                      onChange={(e) => {
                        setIsAutoCountLocked(true)
                        setFormData({ ...formData, issueCount: Math.max(1, Number(e.target.value) || 1) })
                      }}
                      className="w-16 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-center font-bold text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40"
                    />
                    {isAutoCountLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoCountLocked(false)
                          setFormData({ ...formData, issueCount: extractIssueCount(formData.content) })
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                        title="Tự động đếm lại từ nội dung"
                      >
                        Tự đếm lại
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={7}
                  required
                  placeholder={`1. Về UI trong doc\n   Hiện tại em thấy trong doc đang có 2 hình ảnh phần Phím tắt hơi khác nhau. Mình sẽ chốt UI theo hình nào vậy chị?\n2. Tác vụ "Mở danh sách phím tắt"\n   Em thấy có cấu hình tác vụ "Mở danh sách phím tắt" với phím Ctrl + /. Khi nhấn thì hiển thị dạng gì ạ?`}
                  value={formData.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg p-3 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-mono leading-relaxed focus:ring-2 focus:ring-blue-500/40"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>Mẹo: Bạn có thể gõ danh sách số 1. ..., 2. ... hệ thống sẽ tự động gợi ý đếm số lượng vấn đề.</span>
                  <span>{extractIssueCount(formData.content)} mục được phát hiện</span>
                </div>
              </div>

              {/* Footer Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                >
                  {editingId ? 'Cập nhật' : 'Lưu Clear Doc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
