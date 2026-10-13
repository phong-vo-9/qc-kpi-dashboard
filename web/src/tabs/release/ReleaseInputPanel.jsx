import { useState } from 'react'
import {
  Rocket, Sparkles, Settings, History, Plus, X,
  Layers, ChevronDown, ChevronUp, AlertCircle, HelpCircle, Zap
} from 'lucide-react'

export function ReleaseInputPanel({
  taskKeys = [],
  onAddTaskKey,
  onRemoveTaskKey,
  onClearTaskKeys,
  headerTitle,
  onChangeHeaderTitle,
  teamName,
  onChangeTeamName,
  mentionTag,
  onChangeMentionTag,
  customInstructions,
  onChangeCustomInstructions,
  onGenerateRelease,
  isGenerating,
  onOpenAiSettings,
  onOpenQuickPick,
  onOpenHistory,
  hasApiKey,
  activeSprintName = '',
}) {
  const [inputText, setInputText] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleAddTasks = (e) => {
    e?.preventDefault()
    if (!inputText.trim()) return
    onAddTaskKey(inputText)
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddTasks()
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm p-5 space-y-5">
      {/* Header Panel */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Rocket size={16} />
            </span>
            Thiết lập Release
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Cung cấp mã task và cấu hình thông tin thông báo
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenHistory}
            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Lịch sử Release"
          >
            <History size={16} />
          </button>
          <button
            type="button"
            onClick={onOpenAiSettings}
            className={`p-1.5 rounded-xl transition-colors relative ${
              hasApiKey
                ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
            }`}
            title="Cài đặt AI"
          >
            <Settings size={16} />
            {!hasApiKey && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Header Title in đậm (VD: GMS RELEASED PROD) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Tiêu đề thông báo (In đậm)
          </label>
          <div className="flex items-center gap-1">
            {['PROD', 'CAN', 'UAT'].map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => {
                  const prefix = (teamName || 'Team GMS').replace(/^Team\s*/i, '').trim() || 'GMS'
                  onChangeHeaderTitle(`${prefix} RELEASED ${env === 'CAN' ? 'CANARY' : env}`)
                }}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-neutral-800 dark:hover:bg-blue-500/20 dark:hover:text-blue-300 text-gray-600 dark:text-gray-400 transition-colors"
              >
                +{env}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          value={headerTitle}
          onChange={(e) => onChangeHeaderTitle(e.target.value)}
          placeholder="GMS RELEASED PROD"
          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 text-xs font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Team info & Tag mention */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Tên Team
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => onChangeTeamName(e.target.value)}
            placeholder="Team GMS"
            className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Tag Mention
          </label>
          <select
            value={mentionTag}
            onChange={(e) => onChangeMentionTag(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="@channel">@channel</option>
            <option value="@here">@here</option>
            <option value="@all">@all</option>
            <option value="">Không tag</option>
          </select>
        </div>
      </div>

      {/* Task Keys Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            Danh sách Task Release ({taskKeys.length})
          </label>
          <button
            type="button"
            onClick={onOpenQuickPick}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            <Zap size={12} className="text-amber-500 fill-amber-500" />
            {activeSprintName ? 'Chọn nhanh từ Sprint active' : 'Chọn nhanh từ Sprint'}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập mã task (VD: GOP-4351, GOP-3647 hoặc dán link Jira)..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleAddTasks}
            disabled={!inputText.trim()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            <Plus size={14} /> Thêm
          </button>
        </div>

        {/* Task Chips Display */}
        {taskKeys.length > 0 ? (
          <div className="p-2.5 rounded-xl bg-gray-50/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800/80 flex flex-wrap gap-1.5 items-center max-h-36 overflow-y-auto">
            {taskKeys.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20 shadow-2xs group"
              >
                {key}
                <button
                  type="button"
                  onClick={() => onRemoveTaskKey(key)}
                  className="p-0.5 rounded text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={onClearTaskKeys}
              className="text-[11px] text-gray-400 hover:text-red-500 hover:underline px-2 py-1 ml-auto"
            >
              Xóa hết
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 italic py-1">
            Chưa có task nào. Hãy nhập mã task hoặc bấm "Chọn nhanh từ Sprint" ở trên.
          </div>
        )}
      </div>

      {/* Advanced / Custom prompt instructions */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Tùy chọn nâng cao / Ghi chú cho AI
        </button>

        {showAdvanced && (
          <div className="mt-2.5 space-y-2 animate-fade-in">
            <textarea
              rows={2}
              value={customInstructions}
              onChange={(e) => onChangeCustomInstructions(e.target.value)}
              placeholder="Ghi chú thêm cho AI (VD: Nhấn mạnh tính năng chỉ áp dụng trên macOS; Out of scope nhớ bổ sung màn hình cấu hình BMS...)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerateRelease}
          disabled={taskKeys.length === 0 || isGenerating}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Đang đọc Jira & AI tạo thông báo...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="text-purple-200 group-hover:rotate-12 transition-transform" />
              <span>Tạo thông báo Release bằng AI</span>
            </>
          )}
        </button>
      </div>

      {/* AI Key Notice */}
      {!hasApiKey && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-[11px] leading-relaxed">
            <span>Chưa cấu hình API Key cho AI. </span>
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200"
            >
              Bấm vào đây để cài đặt Google Gemini Key miễn phí
            </button>
            <span> giúp AI tự động phân tích In Scope / Out of Scope chuẩn xác nhất.</span>
          </div>
        </div>
      )}
    </div>
  )
}
