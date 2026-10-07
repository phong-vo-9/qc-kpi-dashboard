import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

/**
 * Toast Notification nổi hiện đại
 */
export function ClearDocToast({ toast, onClose }) {
  if (!toast) return null

  const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
    error: <XCircle size={16} className="text-rose-500 shrink-0" />,
    info: <Info size={16} className="text-blue-500 shrink-0" />,
  }

  const borderColors = {
    success: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200',
    warning: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200',
    error: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200',
    info: 'border-blue-200 dark:border-blue-800/60 bg-blue-50/95 dark:bg-blue-950/90 text-blue-900 dark:text-blue-200',
  }

  const type = toast.type || 'success'

  return createPortal(
    <div className="fixed bottom-5 right-5 z-50 animate-bounce-subtle pointer-events-auto">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md max-w-md ${borderColors[type]}`}
      >
        {icons[type]}
        <div className="text-xs font-medium flex-1 pr-2">
          {toast.message}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  )
}

/**
 * Hộp thoại xác nhận thay thế window.confirm
 */
export function ClearDocConfirmDialog({ isOpen, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy bỏ', isDanger = false, onConfirm, onCancel }) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${isDanger ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'}`}>
            {isDanger ? <AlertTriangle size={20} /> : <Info size={20} />}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm transition-all ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
