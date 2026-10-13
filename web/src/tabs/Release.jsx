import { useState, useEffect, useCallback, useMemo } from 'react'
import { Rocket, Sparkles, Check, AlertCircle } from 'lucide-react'
import { api } from '../lib/api.js'
import { ReleaseInputPanel } from './release/ReleaseInputPanel.jsx'
import { ReleaseOutputPanel } from './release/ReleaseOutputPanel.jsx'
import { ReleaseAiSettingsModal } from './release/ReleaseAiSettingsModal.jsx'
import { ReleaseQuickPickModal } from './release/ReleaseQuickPickModal.jsx'
import { ReleaseHistoryModal } from './release/ReleaseHistoryModal.jsx'

export default function Release({ tasks = [], sprintAnalysis = [], options = {} }) {
  // Mặc định nạp 2 task mẫu từ ví dụ của người dùng để có thể trải nghiệm ngay
  const [taskKeys, setTaskKeys] = useState(['GOP-4351', 'GOP-3647'])
  const [headerTitle, setHeaderTitle] = useState('GMS RELEASED PROD')
  const [teamName, setTeamName] = useState('Team GMS')
  const [mentionTag, setMentionTag] = useState('@channel')
  const [customInstructions, setCustomInstructions] = useState('')

  const [notificationMessage, setNotificationMessage] = useState('')
  const [scopeMessage, setScopeMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [isFallback, setIsFallback] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)

  // Modals
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false)
  const [isQuickPickOpen, setIsQuickPickOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Tự động xác định tên Sprint hiện tại đang Active
  const activeSprintName = useMemo(() => {
    if (Array.isArray(sprintAnalysis)) {
      const found = sprintAnalysis.find((s) => s.sprintName)?.sprintName
      if (found) return found
    }
    // Fallback: Tìm sprint của task gần nhất
    const taskWithSprint = tasks.find((t) => t.sprint)
    return taskWithSprint?.sprint || ''
  }, [sprintAnalysis, tasks])

  // Load initial AI config
  useEffect(() => {
    api('/api/release/config')
      .then((cfg) => {
        if (cfg) {
          if (cfg.headerTitle !== undefined) setHeaderTitle(cfg.headerTitle)
          if (cfg.teamName) setTeamName(cfg.teamName)
          if (cfg.mentionTag !== undefined) setMentionTag(cfg.mentionTag)
          setHasApiKey(Boolean(cfg.hasApiKey))
        }
      })
      .catch(() => {})
  }, [])

  // Thêm mã task (hỗ trợ nhập nhiều mã hoặc paste link)
  const handleAddTaskKey = (rawInput) => {
    if (!rawInput) return
    const matches = String(rawInput).toUpperCase().match(/\b[A-Z][A-Z0-9]+-\d+\b/g)
    if (matches) {
      setTaskKeys((prev) => Array.from(new Set([...prev, ...matches])))
    } else {
      const trimmed = rawInput.trim().toUpperCase()
      if (trimmed) {
        setTaskKeys((prev) => Array.from(new Set([...prev, trimmed])))
      }
    }
  }

  const handleRemoveTaskKey = (keyToRemove) => {
    setTaskKeys((prev) => prev.filter((k) => k !== keyToRemove))
  }

  const handleClearTaskKeys = () => {
    setTaskKeys([])
  }

  const handleSelectFromQuickPick = (keys) => {
    setTaskKeys(keys)
    showToast(`Đã áp dụng ${keys.length} task từ Sprint vào Release!`)
  }

  // Sinh thông báo Release bằng AI
  const handleGenerateRelease = useCallback(async () => {
    if (taskKeys.length === 0) return
    setIsGenerating(true)
    setAiError('')
    try {
      const res = await api('/api/release/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskKeys,
          headerTitle,
          teamName,
          mentionTag,
          customInstructions,
        }),
      })

      if (res.error) {
        setAiError(res.error)
      } else {
        setAiError('')
      }

      setNotificationMessage(res.notificationMessage || '')
      setScopeMessage(res.scopeMessage || '')
      setIsFallback(Boolean(res.isFallback))

      if (res.isFallback) {
        showToast('Đã tạo khung Release mặc định!')
      } else {
        showToast('✓ AI đã tạo xong thông báo & phân tích Scope!')
      }
    } catch (err) {
      setAiError(`Lỗi kết nối server: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }, [taskKeys, headerTitle, teamName, mentionTag, customInstructions])

  // Lưu vào lịch sử
  const handleSaveHistory = async () => {
    if (!notificationMessage && !scopeMessage) {
      alert('Chưa có nội dung release để lưu!')
      return
    }
    try {
      await api('/api/release/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerTitle,
          teamName,
          taskKeys,
          mentionTag,
          notificationMsg: notificationMessage,
          scopeMsg: scopeMessage,
        }),
      })
      showToast('✓ Đã lưu bản Release vào lịch sử!')
    } catch (err) {
      alert('Lỗi lưu lịch sử: ' + err.message)
    }
  }

  // Nạp từ lịch sử vào editor
  const handleLoadFromHistory = (item) => {
    if (item.headerTitle) setHeaderTitle(item.headerTitle)
    if (item.teamName) setTeamName(item.teamName)
    if (item.mentionTag !== undefined) setMentionTag(item.mentionTag)
    if (item.taskKeys && item.taskKeys.length > 0) setTaskKeys(item.taskKeys)
    setNotificationMessage(item.notificationMsg || '')
    setScopeMessage(item.scopeMsg || '')
    showToast('Đã nạp bản Release từ lịch sử vào Editor!')
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
          <Check size={14} className="text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <ReleaseInputPanel
            taskKeys={taskKeys}
            onAddTaskKey={handleAddTaskKey}
            onRemoveTaskKey={handleRemoveTaskKey}
            onClearTaskKeys={handleClearTaskKeys}
            headerTitle={headerTitle}
            onChangeHeaderTitle={setHeaderTitle}
            teamName={teamName}
            onChangeTeamName={setTeamName}
            mentionTag={mentionTag}
            onChangeMentionTag={setMentionTag}
            customInstructions={customInstructions}
            onChangeCustomInstructions={setCustomInstructions}
            onGenerateRelease={handleGenerateRelease}
            isGenerating={isGenerating}
            onOpenAiSettings={() => setIsAiSettingsOpen(true)}
            onOpenQuickPick={() => setIsQuickPickOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            hasApiKey={hasApiKey}
            activeSprintName={activeSprintName}
          />
        </div>

        {/* Right Column: Output & Copy (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <ReleaseOutputPanel
            notificationMessage={notificationMessage}
            scopeMessage={scopeMessage}
            onChangeNotificationMessage={setNotificationMessage}
            onChangeScopeMessage={setScopeMessage}
            onSaveHistory={handleSaveHistory}
            onRegenerate={handleGenerateRelease}
            isGenerating={isGenerating}
            aiError={aiError}
            isFallback={isFallback}
          />
        </div>
      </div>

      {/* Modals */}
      <ReleaseAiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
        onSaved={(cfg) => {
          setHasApiKey(Boolean(cfg.hasApiKey))
          if (cfg.headerTitle !== undefined) setHeaderTitle(cfg.headerTitle)
          if (cfg.teamName) setTeamName(cfg.teamName)
          if (cfg.mentionTag !== undefined) setMentionTag(cfg.mentionTag)
        }}
      />

      <ReleaseQuickPickModal
        isOpen={isQuickPickOpen}
        onClose={() => setIsQuickPickOpen(false)}
        tasks={tasks}
        activeSprintName={activeSprintName}
        selectedKeys={taskKeys}
        onSelectTasks={handleSelectFromQuickPick}
      />

      <ReleaseHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadRelease={handleLoadFromHistory}
      />
    </div>
  )
}
