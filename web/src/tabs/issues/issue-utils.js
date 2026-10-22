// Utility functions and constants for Issues Management
import {
  MessageSquare, ExternalLink, FileText, CheckCircle2,
  Clock, AlertTriangle, AlertCircle, ShieldAlert,
  CheckCheck, HelpCircle
} from 'lucide-react'

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'open', label: 'Đang xử lý' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: 'closed', label: 'Đã đóng' },
]

export const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Tất cả mức độ' },
  { value: 'critical', label: 'Nghiêm trọng (Critical)' },
  { value: 'high', label: 'Cao (High)' },
  { value: 'medium', label: 'Trung bình (Medium)' },
  { value: 'low', label: 'Thấp (Low)' },
]

export function formatDateDmy(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) {
      const parts = String(dateStr).split('T')[0].split('-')
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
      return dateStr
    }
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

export function detectLinkType(url = '') {
  const lower = String(url).toLowerCase()
  if (lower.includes('slack.com')) {
    return { type: 'slack', label: 'Slack', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30' }
  }
  if (lower.includes('jira') || lower.includes('/browse/')) {
    return { type: 'jira', label: 'Jira', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30' }
  }
  if (lower.includes('docs.google') || lower.includes('drive.google') || lower.includes('confluence') || lower.includes('wiki')) {
    return { type: 'doc', label: 'Tài liệu', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30' }
  }
  if (lower.includes('sheets.google')) {
    return { type: 'sheet', label: 'Sheet', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30' }
  }
  if (lower.includes('figma.com')) {
    return { type: 'figma', label: 'Figma', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30' }
  }
  if (lower.includes('github.com') || lower.includes('gitlab.com')) {
    return { type: 'git', label: 'Git', color: 'bg-neutral-100 text-neutral-800 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700' }
  }
  return { type: 'link', label: 'Link', color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700' }
}

export const STATUS_META = {
  open: {
    label: 'Đang xử lý',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    icon: Clock,
  },
  resolved: {
    label: 'Đã giải quyết',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Đã đóng',
    badge: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700',
    icon: CheckCheck,
  },
}

export const PRIORITY_META = {
  critical: {
    label: 'Nghiêm trọng',
    badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    dot: 'bg-rose-500',
    icon: ShieldAlert,
  },
  high: {
    label: 'Cao',
    badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40',
    dot: 'bg-orange-500',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Trung bình',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    dot: 'bg-blue-500',
    icon: AlertCircle,
  },
  low: {
    label: 'Thấp',
    badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:border-neutral-700',
    dot: 'bg-gray-400',
    icon: HelpCircle,
  },
}
