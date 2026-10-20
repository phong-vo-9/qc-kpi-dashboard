import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { sortSprints } from '../../lib/sprints.js'
import {
  isRegressionTask,
  formatBscTsv,
  formatMarkdownReport,
  formatImproveDocTsv,
  formatImproveDocMarkdown
} from './cleardoc-utils.js'
import { ClearDocHeader } from './ClearDocHeader.jsx'
import { ClearDocKpiCards } from './ClearDocKpiCards.jsx'
import { ClearDocTable } from './ClearDocTable.jsx'
import { ClearDocDrawer } from './ClearDocDrawer.jsx'
import { ClearDocTrackingTable } from './ClearDocTrackingTable.jsx'
import { ClearDocModal } from './ClearDocModal.jsx'
import { ClearDocAiModal } from './ClearDocAiModal.jsx'
import { ClearDocToast, ClearDocConfirmDialog } from './ClearDocFeedback.jsx'
import { ImproveDocTable } from './ImproveDocTable.jsx'
import { ImproveDocKpiCards } from './ImproveDocKpiCards.jsx'
import { ImproveDocModal } from './ImproveDocModal.jsx'

export default function ClearDoc({ tasks = [], mode = 'dark', onNavigateToTask }) {
  // Dữ liệu từ backend
  const [clearDocs, setClearDocs] = useState([])
  const [taskStatuses, setTaskStatuses] = useState({})
  const [improveDocs, setImproveDocs] = useState([])
  const [loading, setLoading] = useState(true)

  // Feedback: Toast & Confirm Dialog
  const [toast, setToast] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    isDanger: true,
    onConfirm: () => {},
  })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev))
    }, 3200)
  }

  // Quản lý trạng thái mở rộng nội dung từng hàng của bảng Clear doc
  const [expandedDocIds, setExpandedDocIds] = useState(new Set())
  const [copiedDocId, setCopiedDocId] = useState(null)

  // Drawer xem chi tiết
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedDrawerDoc, setSelectedDrawerDoc] = useState(null)

  // Bộ lọc độc lập của Tab Clear doc
  const [filterProject, setFilterProject] = useState('GOP')
  const [filterQuarter, setFilterQuarter] = useState('')
  const [filterSprint, setFilterSprint] = useState('all')
  const [search, setSearch] = useState('')
  const [quickTag, setQuickTag] = useState('') // 'multi_task' | 'has_url' | 'multi_issue'

  // Chế độ xem: 'docs' (Bảng Clear doc) | 'tracking' (Tiến độ Clear doc từng Task) | 'improve' (Bảng Improve doc)
  const [viewMode, setViewMode] = useState('docs')
  const [trackingFilter, setTrackingFilter] = useState('all') // 'all' | 'pending' | 'cleared' | 'not_needed'
  const [improveCardFilter, setImproveCardFilter] = useState('all') // 'all' | 'pending' | 'has_card'

  // Checkbox chọn nhiều task ở tab tracking để gộp nhanh
  const [selectedTaskKeysForGroup, setSelectedTaskKeysForGroup] = useState([])

  // Modal Thêm / Chỉnh sửa tiêu chuẩn Clear Doc
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

  // Modal AI Tự động điền dữ liệu
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  // Modal & Form Improve Doc
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false)
  const [editingImproveId, setEditingImproveId] = useState(null)
  const [copiedImproveId, setCopiedImproveId] = useState(null)
  const [improveFormData, setImproveFormData] = useState({
    originTaskKey: '',
    targetTaskKey: '',
    slackUrl: '',
    content: '',
    resolution: '',
    project: 'GOP',
    sprint: '',
    quarter: '',
    year: '',
  })

  // Tải danh sách Clear doc, Task statuses và Improve doc từ Backend
  const loadClearDocs = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, statuses, improves] = await Promise.all([
        api('/api/clear-docs'),
        api('/api/clear-docs/task-status'),
        api('/api/improve-docs'),
      ])
      setClearDocs(Array.isArray(docs) ? docs : [])
      setTaskStatuses(statuses || {})
      setImproveDocs(Array.isArray(improves) ? improves : [])
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Clear doc & Improve doc:', err)
      showToast('Lỗi khi tải dữ liệu: ' + err.message, 'error')
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
    return sortSprints(sprints)
  }, [eligibleTasks, filterProject, filterQuarter])

  // Map nhanh task key -> task object
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
      if (quickTag === 'multi_task' && (doc.taskKeys || []).length <= 1) {
        return false
      }
      if (quickTag === 'has_url' && !doc.threadUrl) {
        return false
      }
      if (quickTag === 'multi_issue' && (Number(doc.issueCount) || 1) <= 2) {
        return false
      }
      return true
    })
  }, [clearDocs, filterProject, filterQuarter, filterSprint, search, quickTag, taskMap])

  // Danh sách các Task áp dụng theo bộ lọc Sprint/Quý hiện tại
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
      ? Math.round(((tasksClearedCount + tasksNotNeededCount) / totalTasksInScope) * 100)
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

  // Lọc danh sách Improve Doc theo bộ lọc
  const filteredImproveDocs = useMemo(() => {
    return improveDocs.filter((doc) => {
      if (filterProject && filterProject !== 'all' && doc.project !== filterProject) return false
      if (filterQuarter && filterQuarter !== 'all') {
        const [q, y] = filterQuarter.split('-')
        if (doc.quarter !== q || String(doc.year) !== y) {
          const t = taskMap.get(doc.originTaskKey)
          if (!t || t.quarter !== q || String(t.year) !== y) return false
        }
      }
      if (filterSprint && filterSprint !== 'all') {
        if (doc.sprint !== filterSprint) {
          const t = taskMap.get(doc.originTaskKey)
          if (!t || t.sprint !== filterSprint) return false
        }
      }

      if (improveCardFilter === 'pending' && doc.targetTaskKey && doc.targetTaskKey.trim()) return false
      if (improveCardFilter === 'has_card' && (!doc.targetTaskKey || !doc.targetTaskKey.trim())) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const inOrigin = (doc.originTaskKey || '').toLowerCase().includes(q)
        const inTarget = (doc.targetTaskKey || '').toLowerCase().includes(q)
        const inContent = (doc.content || '').toLowerCase().includes(q)
        const inRes = (doc.resolution || '').toLowerCase().includes(q)
        if (!inOrigin && !inTarget && !inContent && !inRes) return false
      }

      return true
    })
  }, [improveDocs, filterProject, filterQuarter, filterSprint, improveCardFilter, search])

  // Thống kê Improve Doc (cho Mini KPI cards)
  const improveStats = useMemo(() => {
    let pool = improveDocs
    if (filterProject && filterProject !== 'all') pool = pool.filter((d) => d.project === filterProject)
    if (filterQuarter && filterQuarter !== 'all') {
      const [q, y] = filterQuarter.split('-')
      pool = pool.filter((d) => {
        if (d.quarter === q && String(d.year) === y) return true
        const t = taskMap.get(d.originTaskKey)
        return Boolean(t && t.quarter === q && String(t.year) === y)
      })
    }
    if (filterSprint && filterSprint !== 'all') {
      pool = pool.filter((d) => {
        if (d.sprint === filterSprint) return true
        const t = taskMap.get(d.originTaskKey)
        return Boolean(t && t.sprint === filterSprint)
      })
    }

    const total = pool.length
    const uniqueOriginTasks = new Set(pool.map((d) => d.originTaskKey).filter(Boolean)).size
    const pendingCards = pool.filter((d) => !d.targetTaskKey || !d.targetTaskKey.trim()).length
    const hasCards = pool.filter((d) => Boolean(d.targetTaskKey && d.targetTaskKey.trim())).length

    return { total, uniqueOriginTasks, pendingCards, hasCards }
  }, [improveDocs, filterProject, filterQuarter, filterSprint, taskMap])

  // Mở Drawer chi tiết
  const handleOpenDocDrawer = (doc) => {
    setSelectedDrawerDoc(doc)
    setIsDrawerOpen(true)
  }

  // Toggle mở rộng / thu gọn 1 hàng
  const toggleExpand = (id) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Toggle mở rộng / thu gọn tất cả hàng đang hiển thị
  const toggleExpandAll = (docsList) => {
    const list = docsList || filteredDocs
    if (!list || list.length === 0) return
    const allCurrentlyExpanded = list.every((d) => expandedDocIds.has(d.id))
    if (allCurrentlyExpanded) {
      setExpandedDocIds((prev) => {
        const next = new Set(prev)
        list.forEach((d) => next.delete(d.id))
        return next
      })
    } else {
      setExpandedDocIds((prev) => {
        const next = new Set(prev)
        list.forEach((d) => next.add(d.id))
        return next
      })
    }
  }

  // Sao chép nhanh nội dung 1 doc
  const handleCopyDocContent = (doc) => {
    if (!doc?.content) return
    navigator.clipboard.writeText(doc.content).then(() => {
      setCopiedDocId(doc.id)
      showToast('Đã sao chép nội dung câu hỏi!', 'success')
      setTimeout(() => setCopiedDocId(null), 2000)
    })
  }

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
    setIsModalOpen(true)
  }

  // Áp dụng kết quả AI vào Form thủ công
  const handleApplyAiResultToForm = (aiData) => {
    setEditingId(null)
    setFormData(aiData)
    setIsAiModalOpen(false)
    setIsModalOpen(true)
  }

  // Lưu trực tiếp kết quả AI vào Database
  const handleDirectSaveAiResult = async (docToSave) => {
    try {
      await api('/api/clear-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docToSave),
      })
      setIsAiModalOpen(false)
      loadClearDocs()
      showToast(`Đã lưu thành công Clear Doc cho ${docToSave.taskKeys.join(', ')}!`, 'success')
    } catch (err) {
      showToast('Lỗi khi lưu dữ liệu AI: ' + err.message, 'error')
    }
  }

  // Xóa mục Clear doc
  const handleDeleteDoc = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa mục Clear Doc',
      message: 'Bạn có chắc chắn muốn xóa mục Clear doc này? Thao tác này không thể hoàn tác.',
      confirmText: 'Xóa ngay',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api(`/api/clear-docs/${id}`, { method: 'DELETE' })
          setClearDocs((prev) => prev.filter((d) => d.id !== id))
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          showToast('Đã xóa mục Clear Doc thành công!', 'success')
        } catch (err) {
          showToast('Lỗi khi xóa: ' + err.message, 'error')
        }
      },
    })
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
        showToast(`Đã chuyển ${taskKey} về trạng thái cần Clear Doc`, 'info')
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
        showToast(`Đã đánh dấu ${taskKey} là không cần Clear Doc`, 'success')
      }
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái: ' + err.message, 'error')
    }
  }

  // Đánh dấu hàng loạt task không cần clear
  const handleBatchSetNotNeeded = async (taskKeys = []) => {
    if (taskKeys.length === 0) return
    try {
      await Promise.all(
        taskKeys.map((k) =>
          api('/api/clear-docs/task-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskKey: k, status: 'not_needed' }),
          })
        )
      )
      setTaskStatuses((prev) => {
        const next = { ...prev }
        taskKeys.forEach((k) => {
          next[k] = { status: 'not_needed', updatedAt: new Date().toISOString() }
        })
        return next
      })
      setSelectedTaskKeysForGroup([])
      showToast(`Đã đánh dấu ${taskKeys.length} task là Không cần Clear!`, 'success')
    } catch (err) {
      showToast('Lỗi khi cập nhật hàng loạt: ' + err.message, 'error')
    }
  }

  // Lưu form (Tạo mới hoặc Sửa)
  const handleSaveModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!formData.threadTitle.trim()) {
      showToast('Vui lòng nhập tên / tiêu đề thread clear doc!', 'warning')
      return
    }
    if (formData.taskKeys.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 Task để gắn với mục Clear doc này!', 'warning')
      return
    }

    try {
      if (editingId) {
        await api(`/api/clear-docs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        showToast('Cập nhật Clear Doc thành công!', 'success')
      } else {
        await api('/api/clear-docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        showToast('Thêm mới Clear Doc thành công!', 'success')
      }
      setIsModalOpen(false)
      loadClearDocs()
    } catch (err) {
      showToast('Lỗi khi lưu dữ liệu: ' + err.message, 'error')
    }
  }

  // Sao chép bảng sang Clipboard (định dạng TSV cho Excel)
  const handleCopyBscTsv = () => {
    if (filteredDocs.length === 0) {
      showToast('Không có dữ liệu Clear Doc để sao chép!', 'warning')
      return
    }
    const tsv = formatBscTsv(filteredDocs, taskMap)
    navigator.clipboard.writeText(tsv).then(() => {
      showToast(`Đã sao chép ${filteredDocs.length} dòng chuẩn TSV vào Clipboard!`, 'success')
    })
  }

  // Sao chép báo cáo Markdown
  const handleCopyMarkdownReport = () => {
    if (filteredDocs.length === 0) {
      showToast('Không có dữ liệu Clear Doc để sao chép!', 'warning')
      return
    }
    const md = formatMarkdownReport(filteredDocs, taskMap, stats)
    navigator.clipboard.writeText(md).then(() => {
      showToast('Đã sao chép báo cáo Markdown vào Clipboard!', 'success')
    })
  }

  // ─── IMPROVE DOC HANDLERS ───
  const handleOpenAddImproveModal = (defaultTaskKey = '') => {
    setEditingImproveId(null)
    const t = defaultTaskKey ? taskMap.get(defaultTaskKey) : null
    setImproveFormData({
      originTaskKey: defaultTaskKey || '',
      targetTaskKey: '',
      slackUrl: '',
      content: '',
      resolution: '',
      project: t?.project || (filterProject !== 'all' ? filterProject : 'GOP'),
      sprint: t?.sprint || (filterSprint !== 'all' ? filterSprint : ''),
      quarter: t?.quarter || (filterQuarter !== 'all' ? filterQuarter.split('-')[0] : ''),
      year: t?.year || (filterQuarter !== 'all' ? filterQuarter.split('-')[1] : ''),
    })
    setIsImproveModalOpen(true)
  }

  const handleOpenEditImproveModal = async (doc, isQuickSave = false) => {
    if (isQuickSave) {
      try {
        await api(`/api/improve-docs/${doc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc),
        })
        setImproveDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)))
        showToast('Cập nhật link Slack thành công!', 'success')
      } catch (err) {
        showToast('Lỗi cập nhật: ' + err.message, 'error')
      }
      return
    }

    setEditingImproveId(doc.id)
    setImproveFormData({
      originTaskKey: doc.originTaskKey,
      targetTaskKey: doc.targetTaskKey || '',
      slackUrl: doc.slackUrl || '',
      content: doc.content || '',
      resolution: doc.resolution || '',
      project: doc.project || 'GOP',
      sprint: doc.sprint || '',
      quarter: doc.quarter || '',
      year: doc.year || '',
    })
    setIsImproveModalOpen(true)
  }

  const handleSaveImproveModal = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!improveFormData.originTaskKey.trim()) {
      showToast('Vui lòng chọn hoặc nhập Task gốc!', 'warning')
      return
    }
    if (!improveFormData.content.trim()) {
      showToast('Vui lòng nhập nội dung Improve!', 'warning')
      return
    }

    try {
      if (editingImproveId) {
        await api(`/api/improve-docs/${editingImproveId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(improveFormData),
        })
        showToast('Cập nhật Improve Doc thành công!', 'success')
      } else {
        await api('/api/improve-docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(improveFormData),
        })
        showToast('Thêm mới Improve Doc thành công!', 'success')
      }
      setIsImproveModalOpen(false)
      loadClearDocs()
    } catch (err) {
      showToast('Lỗi khi lưu Improve Doc: ' + err.message, 'error')
    }
  }

  const handleUpdateImproveTargetCard = async (id, targetTaskKey) => {
    try {
      await api(`/api/improve-docs/${id}/target-card`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTaskKey }),
      })
      setImproveDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, targetTaskKey } : d))
      )
      showToast(targetTaskKey ? `Đã gán card ${targetTaskKey}!` : 'Đã chuyển về Chưa bổ sung card', 'success')
    } catch (err) {
      showToast('Lỗi khi gán card: ' + err.message, 'error')
    }
  }

  const handleDeleteImproveDoc = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa vấn đề Improve Doc',
      message: 'Bạn có chắc chắn muốn xóa mục Improve này? Thao tác này không thể hoàn tác.',
      confirmText: 'Xóa ngay',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api(`/api/improve-docs/${id}`, { method: 'DELETE' })
          setImproveDocs((prev) => prev.filter((d) => d.id !== id))
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          showToast('Đã xóa mục Improve Doc thành công!', 'success')
        } catch (err) {
          showToast('Lỗi khi xóa: ' + err.message, 'error')
        }
      },
    })
  }

  const handleCopyImproveContent = (doc) => {
    const text = `Task gốc: ${doc.originTaskKey}\nCard xử lý: ${doc.targetTaskKey || 'Chưa bổ sung card'}\nSlack: ${doc.slackUrl || '—'}\nNội dung: ${doc.content}\nHướng xử lý: ${doc.resolution || '—'}`
    navigator.clipboard.writeText(text).then(() => {
      setCopiedImproveId(doc.id)
      setTimeout(() => setCopiedImproveId(null), 2000)
      showToast('Đã sao chép nội dung Improve!', 'success')
    })
  }

  const handleCopyImproveTsv = () => {
    if (filteredImproveDocs.length === 0) {
      showToast('Không có dữ liệu Improve Doc để sao chép!', 'warning')
      return
    }
    const tsv = formatImproveDocTsv(filteredImproveDocs, taskMap)
    navigator.clipboard.writeText(tsv).then(() => {
      showToast(`Đã sao chép ${filteredImproveDocs.length} dòng Improve TSV vào Clipboard!`, 'success')
    })
  }

  const handleCopyImproveMarkdown = () => {
    if (filteredImproveDocs.length === 0) {
      showToast('Không có dữ liệu Improve Doc để sao chép!', 'warning')
      return
    }
    const md = formatImproveDocMarkdown(filteredImproveDocs, taskMap, improveStats)
    navigator.clipboard.writeText(md).then(() => {
      showToast('Đã sao chép báo cáo Improve Markdown vào Clipboard!', 'success')
    })
  }

  // Click vào KPI Card để điều hướng nhanh
  const handleKpiCardClick = (targetScope) => {
    setViewMode('tracking')
    setTrackingFilter(targetScope)
  }

  // Reset bộ lọc
  const handleResetFilters = () => {
    setFilterProject('GOP')
    setFilterSprint('all')
    setSearch('')
    setQuickTag('')
    setImproveCardFilter('all')
    showToast('Đã đặt lại bộ lọc về mặc định', 'info')
  }

  return (
    <div className="space-y-5">
      {/* ─── THANH CÔNG CỤ LỌC & HÀNH ĐỘNG ─── */}
      <ClearDocHeader
        viewMode={viewMode}
        filteredDocsCount={filteredDocs.length}
        filteredImproveDocsCount={filteredImproveDocs.length}
        filterProject={filterProject}
        setFilterProject={setFilterProject}
        availableProjects={availableProjects}
        filterQuarter={filterQuarter}
        setFilterQuarter={setFilterQuarter}
        availableQuarters={availableQuarters}
        filterSprint={filterSprint}
        setFilterSprint={setFilterSprint}
        availableSprints={availableSprints}
        search={search}
        setSearch={setSearch}
        quickTag={quickTag}
        setQuickTag={setQuickTag}
        onResetFilters={handleResetFilters}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenAddModal={() => handleOpenAddModal(selectedTaskKeysForGroup)}
        onOpenAddImproveModal={() => handleOpenAddImproveModal()}
        onCopyBscTsv={handleCopyBscTsv}
        onCopyMarkdownReport={handleCopyMarkdownReport}
        onCopyImproveTsv={handleCopyImproveTsv}
        onCopyImproveMarkdown={handleCopyImproveMarkdown}
      />

      {/* ─── KPI MINI CARDS TƯƠNG TÁC (CLICK-TO-FILTER) ─── */}
      {viewMode === 'improve' ? (
        <ImproveDocKpiCards
          stats={improveStats}
          cardFilter={improveCardFilter}
          onFilterChange={setImproveCardFilter}
        />
      ) : (
        <ClearDocKpiCards
          stats={stats}
          onCardClick={handleKpiCardClick}
        />
      )}

      {/* ─── THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM (VIEW TOGGLE) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-gray-200/80 dark:bg-neutral-800/80 rounded-xl">
          <button
            onClick={() => setViewMode('docs')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'docs'
                ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Bảng Clear Doc ({filteredDocs.length})
          </button>
          <button
            onClick={() => setViewMode('tracking')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'tracking'
                ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Quản lý Task trong Sprint ({currentScopeTasks.length})
          </button>
          <button
            onClick={() => setViewMode('improve')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'improve'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span>💡 Improve Doc ({filteredImproveDocs.length})</span>
            {improveStats.pendingCards > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                {improveStats.pendingCards} chờ card
              </span>
            )}
          </button>
        </div>

        {viewMode === 'tracking' && selectedTaskKeysForGroup.length > 0 && (
          <div className="text-xs text-gray-500">
            Đang chọn {selectedTaskKeysForGroup.length} task ở chế độ gộp
          </div>
        )}

        {viewMode === 'improve' && (
          <div className="text-xs text-gray-500">
            Hiển thị {filteredImproveDocs.length} vấn đề cải tiến
          </div>
        )}
      </div>

      {/* ─── CHẾ ĐỘ 1: BẢNG CLEAR DOC ─── */}
      {viewMode === 'docs' && (
        <ClearDocTable
          docs={filteredDocs}
          taskMap={taskMap}
          expandedDocIds={expandedDocIds}
          copiedDocId={copiedDocId}
          onToggleExpand={toggleExpand}
          onToggleExpandAll={toggleExpandAll}
          onCopyDocContent={handleCopyDocContent}
          onOpenDocDrawer={handleOpenDocDrawer}
          onOpenEditModal={handleOpenEditModal}
          onDeleteDoc={handleDeleteDoc}
          onOpenAddModal={() => handleOpenAddModal(selectedTaskKeysForGroup)}
          onOpenAiModal={() => setIsAiModalOpen(true)}
        />
      )}

      {/* ─── CHẾ ĐỘ 2: TIẾN ĐỘ TASK TRONG SPRINT ─── */}
      {viewMode === 'tracking' && (
        <ClearDocTrackingTable
          currentScopeTasks={currentScopeTasks}
          taskToClearDocMap={taskToClearDocMap}
          taskStatuses={taskStatuses}
          selectedTaskKeys={selectedTaskKeysForGroup}
          setSelectedTaskKeys={setSelectedTaskKeysForGroup}
          onOpenAddModalWithTasks={(keys) => handleOpenAddModal(keys)}
          onToggleTaskNotNeeded={handleToggleTaskNotNeeded}
          onBatchSetNotNeeded={handleBatchSetNotNeeded}
          onOpenDocDrawer={handleOpenDocDrawer}
          trackingFilter={trackingFilter}
          setTrackingFilter={setTrackingFilter}
        />
      )}

      {/* ─── CHẾ ĐỘ 3: BẢNG IMPROVE DOC ─── */}
      {viewMode === 'improve' && (
        <ImproveDocTable
          docs={filteredImproveDocs}
          taskMap={taskMap}
          project={filterProject}
          onOpenAddModal={(taskKey) => handleOpenAddImproveModal(typeof taskKey === 'string' ? taskKey : '')}
          onOpenEditModal={handleOpenEditImproveModal}
          onDeleteDoc={handleDeleteImproveDoc}
          onUpdateTargetCard={handleUpdateImproveTargetCard}
          onCopyContent={handleCopyImproveContent}
          copiedId={copiedImproveId}
        />
      )}

      {/* ─── SLIDE-OVER DRAWER XEM CHI TIẾT ─── */}
      <ClearDocDrawer
        isOpen={isDrawerOpen}
        doc={selectedDrawerDoc}
        taskMap={taskMap}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteDoc}
      />

      {/* ─── MODAL AI SMART PARSER 2.0 ─── */}
      <ClearDocAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        taskMap={taskMap}
        filterProject={filterProject}
        filterSprint={filterSprint}
        filterQuarter={filterQuarter}
        onDirectSave={handleDirectSaveAiResult}
        onApplyToForm={handleApplyAiResultToForm}
        showToast={showToast}
      />

      {/* ─── MODAL TIÊU CHUẨN THÊM / SỬA CLEAR DOC ─── */}
      <ClearDocModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        eligibleTasks={eligibleTasks}
        taskMap={taskMap}
        availableProjects={availableProjects}
        onSave={handleSaveModal}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* ─── MODAL TIÊU CHUẨN THÊM / SỬA IMPROVE DOC ─── */}
      <ImproveDocModal
        isOpen={isImproveModalOpen}
        onClose={() => setIsImproveModalOpen(false)}
        editingId={editingImproveId}
        formData={improveFormData}
        setFormData={setImproveFormData}
        eligibleTasks={eligibleTasks}
        taskMap={taskMap}
        availableProjects={availableProjects}
        onSave={handleSaveImproveModal}
      />

      {/* ─── HỘP THOẠI XÁC NHẬN (CONFIRM DIALOG) ─── */}
      <ClearDocConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDanger={confirmDialog.isDanger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ─── THÔNG BÁO TOAST ─── */}
      <ClearDocToast
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
