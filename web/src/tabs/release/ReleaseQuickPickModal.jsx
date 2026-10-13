import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Check, Layers, Filter, Zap, Calendar } from 'lucide-react'

export function ReleaseQuickPickModal({
  isOpen,
  onClose,
  tasks = [],
  activeSprintName = '',
  selectedKeys = [],
  onSelectTasks,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  // Mặc định lọc theo Done & Released để tiện nhất cho việc Release
  const [statusFilter, setStatusFilter] = useState('done_released') // 'all' | 'done_released' | 'Done' | 'Released' | 'Testing'
  const [sprintFilter, setSprintFilter] = useState(activeSprintName || 'active')
  const [tempSelected, setTempSelected] = useState(new Set(selectedKeys))

  // Danh sách các Sprint từ tasks
  const allSprints = useMemo(() => {
    const list = Array.from(new Set(tasks.map((t) => t.sprint).filter(Boolean)))
    // Sắp xếp đưa active sprint lên đầu nếu có
    return list.sort((a, b) => {
      if (a === activeSprintName) return -1
      if (b === activeSprintName) return 1
      return b.localeCompare(a)
    })
  }, [tasks, activeSprintName])

  // Đồng bộ khi mở modal: luôn ưu tiên Active Sprint
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedKeys))
      setSearchTerm('')
      setStatusFilter('done_released')
      if (activeSprintName) {
        setSprintFilter(activeSprintName)
      } else if (allSprints.length > 0) {
        setSprintFilter(allSprints[0])
      } else {
        setSprintFilter('all')
      }
    }
  }, [isOpen, selectedKeys, activeSprintName, allSprints])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Lọc theo Sprint
      if (sprintFilter === 'active') {
        if (activeSprintName) {
          if (t.sprint !== activeSprintName) return false
        }
      } else if (sprintFilter !== 'all') {
        if (t.sprint !== sprintFilter) return false
      }

      // 2. Lọc theo Status
      const s = (t.status || '').toLowerCase()
      if (statusFilter === 'done_released') {
        if (!s.includes('done') && !s.includes('release')) return false
      } else if (statusFilter === 'Done') {
        if (!s.includes('done')) return false
      } else if (statusFilter === 'Released') {
        if (!s.includes('release')) return false
      } else if (statusFilter === 'Testing') {
        if (!s.includes('test')) return false
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const matchKey = t.key.toLowerCase().includes(q)
        const matchSummary = (t.summary || '').toLowerCase().includes(q)
        if (!matchKey && !matchSummary) return false
      }

      return true
    })
  }, [tasks, sprintFilter, activeSprintName, statusFilter, searchTerm])

  if (!isOpen) return null

  const toggleTask = (key) => {
    const next = new Set(tempSelected)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setTempSelected(next)
  }

  const handleSelectAllFiltered = () => {
    const next = new Set(tempSelected)
    filteredTasks.forEach((t) => next.add(t.key))
    setTempSelected(next)
  }

  const handleDeselectAllFiltered = () => {
    const next = new Set(tempSelected)
    filteredTasks.forEach((t) => next.delete(t.key))
    setTempSelected(next)
  }

  const handleConfirm = () => {
    onSelectTasks(Array.from(tempSelected))
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Zap size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Chọn nhanh từ Sprint Active
                </h3>
                {activeSprintName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {activeSprintName ? (
                  <span>Sprint: <strong className="text-gray-700 dark:text-gray-300">{activeSprintName}</strong></span>
                ) : (
                  'Tick chọn các task đã hoàn thiện để đưa vào danh sách Release'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters bar */}
        <div className="p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã task (VD: GOP-4482) hoặc tiêu đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Sprint Selector Dropdown */}
            <div className="flex items-center gap-1 shrink-0">
              <Calendar size={13} className="text-gray-400" />
              <select
                value={sprintFilter}
                onChange={(e) => setSprintFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[200px] truncate"
              >
                {activeSprintName && (
                  <option value={activeSprintName}>
                    ⚡ {activeSprintName} (Active)
                  </option>
                )}
                {allSprints
                  .filter((s) => s !== activeSprintName)
                  .map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                <option value="all">Tất cả Sprint</option>
              </select>
            </div>
          </div>

          {/* Status filter pills */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: 'done_released', label: 'Done & Released' },
                { id: 'Done', label: 'Done' },
                { id: 'Released', label: 'Released' },
                { id: 'Testing', label: 'Testing' },
                { id: 'all', label: 'Tất cả Status' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === st.id
                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                      : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-auto">
              <span>
                Đã chọn: <strong className="text-blue-600 dark:text-blue-400 font-bold">{tempSelected.size}</strong> task
                (Tìm thấy {filteredTasks.length} task)
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-medium"
              >
                Chọn tất cả
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleDeselectAllFiltered}
                className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline font-medium"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {/* List of Tasks */}
        <div className="overflow-y-auto flex-1 p-4 divide-y divide-gray-100 dark:divide-neutral-800">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Không tìm thấy task nào trong Sprint này phù hợp với bộ lọc status.
            </div>
          ) : (
            filteredTasks.map((t) => {
              const isChecked = tempSelected.has(t.key)
              return (
                <div
                  key={t.key}
                  onClick={() => toggleTask(t.key)}
                  className={`py-2.5 px-3 rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-blue-50/70 dark:bg-blue-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {t.key}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          (t.status || '').toLowerCase().includes('done')
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : (t.status || '').toLowerCase().includes('release')
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                        }`}
                      >
                        {t.status || 'Unknown'}
                      </span>
                      {t.sprint && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {t.sprint}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                      {t.summary}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 shrink-0">
          <span className="text-xs text-gray-500">
            {tempSelected.size} task được chọn
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check size={14} /> Áp dụng vào Release ({tempSelected.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
