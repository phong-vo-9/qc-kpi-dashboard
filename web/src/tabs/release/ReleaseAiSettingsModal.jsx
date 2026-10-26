import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles, Key, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { api } from '../../lib/api.js'

export function ReleaseAiSettingsModal({ isOpen, onClose, onSaved }) {
  const [provider, setProvider] = useState('gemini')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-3.5-flash')
  const [teamName, setTeamName] = useState('Team GMS')
  const [mentionTag, setMentionTag] = useState('@channel')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      api('/api/release/config')
        .then((cfg) => {
          if (cfg) {
            setProvider(cfg.provider || 'gemini')
            const targetModel = cfg.model === 'gemini-2.5-flash' || !cfg.model
              ? (cfg.provider === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o-mini')
              : cfg.model
            setModel(targetModel)
            setTeamName(cfg.teamName || 'Team GMS')
            setMentionTag(cfg.mentionTag !== undefined ? cfg.mentionTag : '@channel')
            setHasApiKey(Boolean(cfg.hasApiKey))
          }
        })
        .catch(() => {})
      setStatusMessage('')
      setApiKey('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    if (newProvider === 'gemini') {
      setModel('gemini-3.5-flash')
    } else if (newProvider === 'deepseek') {
      setModel('deepseek-chat')
    } else {
      setModel('gpt-4o-mini')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setStatusMessage('')
    try {
      const payload = {
        provider,
        model,
        teamName,
        mentionTag,
      }
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim()
      }
      const res = await api('/api/release/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setIsSaving(false)
      setStatusMessage('✓ Đã lưu cài đặt AI thành công!')
      setHasApiKey(Boolean(res.hasApiKey))
      if (onSaved) onSaved(res)
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      setIsSaving(false)
      setStatusMessage(`Lỗi: ${err.message}`)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Cài đặt AI Release</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cấu hình API Key để tự động tóm tắt In Scope / Out of Scope
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Chọn Nhà cung cấp AI (Provider)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  provider === 'gemini'
                    ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                    : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Google Gemini
                <span className="block text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">(Khuyên dùng - Free)</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  provider === 'openai'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-2xs font-bold'
                    : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                OpenAI
                <span className="block text-[10px] text-gray-400 mt-0.5">(GPT-4o mini)</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('deepseek')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  provider === 'deepseek'
                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-2xs font-bold'
                    : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                DeepSeek
                <span className="block text-[10px] text-gray-400 mt-0.5">(Chat / R1)</span>
              </button>
            </div>
          </div>

          {/* Model selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Model
              </label>
              {provider === 'gemini' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3.5-flash')}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      model === 'gemini-3.5-flash'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    gemini-3.5-flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setModel('gemini-3.5-flash-lite')}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      model === 'gemini-3.5-flash-lite'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    flash-lite
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o-mini'}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Key size={13} className="text-gray-400" />
                API Key {provider === 'gemini' ? 'Google AI Studio' : provider.toUpperCase()}
              </label>
              {hasApiKey && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Đã có key trong hệ thống
                </span>
              )}
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? '•••••••••••••••••••••••• (Nhập nếu muốn đổi key mới)' : 'Dán API Key tại đây...'}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
            {provider === 'gemini' && (
              <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                Lấy API Key Google Gemini miễn phí tại:
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com <ExternalLink size={10} />
                </a>
              </p>
            )}
          </div>

          {/* Default Team Name & Tag */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tên Team mặc định
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team GMS"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tag Mention mặc định
              </label>
              <select
                value={mentionTag}
                onChange={(e) => setMentionTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="@channel">@channel</option>
                <option value="@here">@here</option>
                <option value="@all">@all</option>
                <option value="">Không tag</option>
              </select>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`text-xs p-2.5 rounded-xl flex items-center gap-2 ${
                statusMessage.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
