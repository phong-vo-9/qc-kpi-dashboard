import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  ExternalLink,
  CalendarCheck,
  CalendarDays,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
} from 'lucide-react'
import { api, jiraUrl } from '../lib/api.js'

/**
 * Sinh URL Timesheet Tempo tương ứng với tháng hiện tại hoặc ngày cụ thể
 * Worker: JIRAUSER14615
 */
export function getTempoTimesheetUrl(worker = 'JIRAUSER14615') {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const from = `${year}-${month}-01`
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  return `https://jira.vexere.net/secure/Tempo.jspa#/my-work/timesheet?columns=WORKED_COLUMN&dateDisplayType=days&from=${from}&groupBy=issue&periodType=CURRENT_PERIOD&subPeriodType=MONTH&to=${to}&viewType=TIMESHEET&worker=${worker}`
}

/**
 * Helper lấy thông tin ngày trong tuần (Fallback offline)
 */
export function getWorkdayInfo(date = new Date()) {
  const day = date.getDay() // 0: Chủ Nhật, 1: T2, ..., 6: T7
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const isWeekend = day === 0 || day === 6
  const isWorkday = !isWeekend

  const formattedDate = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return {
    dayOfWeek: dayNames[day],
    dayIndex: day,
    isWeekend,
    isWorkday,
    formattedDate,
    targetHours: isWorkday ? 8 : 0,
  }
}

// Global cache & listeners để đồng bộ dữ liệu giữa Header và Overview Card
const tempoListeners = new Set()
let globalTempoData = null
let isFetchingTempo = false

export async function refreshTempoData(force = false) {
  if (isFetchingTempo) return globalTempoData
  isFetchingTempo = true
  try {
    const res = await api(`/api/tempo-today${force ? '?force=1' : ''}`)
    globalTempoData = res
    tempoListeners.forEach((fn) => fn(res))
    return res
  } catch (err) {
    console.error('Lỗi tải dữ liệu Tempo:', err)
    return null
  } finally {
    isFetchingTempo = false
  }
}

export function useTempoData() {
  const [data, setData] = useState(globalTempoData)
  const [loading, setLoading] = useState(!globalTempoData)

  useEffect(() => {
    const listener = (newData) => {
      setData(newData)
      setLoading(false)
    }
    tempoListeners.add(listener)

    if (!globalTempoData) {
      setLoading(true)
      refreshTempoData().then(() => setLoading(false))
    }

    return () => {
      tempoListeners.delete(listener)
    }
  }, [])

  return {
    data,
    loading,
    refresh: () => refreshTempoData(true),
  }
}

/**
 * Nút tắt nhanh đặt trên Header (luôn thấy ở mọi Tab và khi cuộn chuột)
 * Hiển thị trực tiếp: Tempo: X.Xh/8h
 */
export function TempoHeaderButton() {
  const { data, loading, refresh } = useTempoData()
  const fallback = getWorkdayInfo()
  const url = getTempoTimesheetUrl()

  const isWorkday = data ? data.isWorkday : fallback.isWorkday
  const dayOfWeek = data?.dayOfWeek || fallback.dayOfWeek
  const todayLogged = data ? data.todayLoggedHours : 0
  const isCompleted = data ? data.isCompleted : false
  const remaining = data ? data.remainingHours : 8

  let badgeStyle = ''
  let label = ''

  if (!isWorkday) {
    badgeStyle =
      'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30'
    label = 'Nghỉ'
  } else if (isCompleted) {
    badgeStyle =
      'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
    label = `${todayLogged}h / 8h`
  } else {
    badgeStyle =
      'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
    label = `${todayLogged}h / 8h`
  }

  const tooltip = isWorkday
    ? `Log Work hôm nay (${dayOfWeek}): Đã log ${todayLogged}h / 8.0h. ${
        isCompleted ? 'Đã đạt chỉ tiêu!' : `Còn thiếu ${remaining}h!`
      } Bấm để mở Timesheet.`
    : `Hôm nay là ${dayOfWeek} (Cuối tuần). Không bắt buộc log time. Bấm để mở Timesheet.`

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-medium border transition-all duration-200 group shadow-sm ${badgeStyle}`}
    >
      {loading ? (
        <RefreshCw size={13} className="animate-spin text-gray-400" />
      ) : !isWorkday ? (
        <Coffee size={14} className="text-teal-600 dark:text-teal-400" />
      ) : isCompleted ? (
        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Clock size={14} className="text-amber-600 dark:text-amber-400 animate-pulse" />
      )}

      <span className="hidden md:inline font-semibold">Tempo:</span>
      <span className="font-bold tabular-nums">{loading ? '...' : label}</span>

      {isWorkday && !isCompleted && !loading && (
        <span className="hidden sm:inline-block text-[10px] px-1 py-0.2 bg-amber-200/80 dark:bg-amber-400/20 text-amber-900 dark:text-amber-200 rounded font-semibold">
          -{remaining}h
        </span>
      )}

      <ExternalLink
        size={12}
        className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
      />
    </a>
  )
}

/**
 * Panel nhắc nhở & theo dõi thời gian log chi tiết đặt tại đầu tab Tổng quan (Overview)
 */
export function TempoReminderCard() {
  const [collapsed, setCollapsed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { data, loading, refresh } = useTempoData()
  const fallback = getWorkdayInfo()
  const tempoUrl = getTempoTimesheetUrl()

  const handleManualRefresh = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRefreshing(true)
    await refresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const isWorkday = data ? data.isWorkday : fallback.isWorkday
  const dayOfWeek = data?.dayOfWeek || fallback.dayOfWeek
  const todayLogged = data ? data.todayLoggedHours : 0
  const targetHours = data ? data.targetHours : fallback.targetHours
  const remainingHours = data ? data.remainingHours : 8
  const percent = data ? data.percent : (isWorkday ? 0 : 100)
  const isCompleted = data ? data.isCompleted : false
  const monthLogged = data?.monthLoggedHours || 0
  const items = data?.items || []
  const formattedDate = fallback.formattedDate

  // Màu sắc chủ đạo theo trạng thái
  let statusTheme = {
    bg: 'bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/20 dark:via-neutral-900 dark:to-neutral-900 border-amber-200/90 dark:border-amber-500/25',
    iconBg: 'bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-300',
    barColor:
      percent >= 100
        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
        : percent >= 50
        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
        : 'bg-gradient-to-r from-rose-500 to-amber-500',
    badgeText: isCompleted ? 'Đã hoàn thành 8h' : `Đã log ${todayLogged}h / 8.0h (Còn ${remainingHours}h)`,
    badgeClass: isCompleted
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
  }

  if (!isWorkday) {
    statusTheme = {
      bg: 'bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-white dark:from-teal-950/20 dark:via-neutral-900 dark:to-neutral-900 border-teal-200/90 dark:border-teal-500/25',
      iconBg: 'bg-teal-500 text-white dark:bg-teal-500/20 dark:text-teal-300',
      barColor: 'bg-teal-500',
      badgeText: 'Cuối tuần: Nghỉ ngơi 🎉',
      badgeClass:
        'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30',
    }
  } else if (isCompleted) {
    statusTheme = {
      bg: 'bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/20 dark:via-neutral-900 dark:to-neutral-900 border-emerald-200/90 dark:border-emerald-500/25',
      iconBg: 'bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-300',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      badgeText: `Đã hoàn thành: ${todayLogged}h / 8.0h (100%)`,
      badgeClass:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
    }
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${statusTheme.bg}`}>
      {/* Header bar của Card */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${statusTheme.iconBg}`}>
            {!isWorkday ? (
              <Coffee size={22} />
            ) : isCompleted ? (
              <CheckCircle2 size={22} />
            ) : (
              <Clock size={22} className="animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Log Work Tempo (8h / Ngày làm việc)
              </h3>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 border border-gray-200 dark:border-neutral-700">
                <CalendarDays size={12} />
                {dayOfWeek}, {formattedDate}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusTheme.badgeClass}`}>
                {statusTheme.badgeText}
              </span>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {isWorkday ? (
                <>
                  <span>
                    Tiến độ hôm nay:{' '}
                    <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                      {todayLogged}h / 8.0h
                    </span>{' '}
                    ({percent}%)
                  </span>
                  {!isCompleted && (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      • Còn thiếu {remainingHours} giờ để đạt định mức
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      • Đã hoàn thành mục tiêu 8 tiếng ngày hôm nay!
                    </span>
                  )}
                </>
              ) : (
                <span>
                  Hôm nay là cuối tuần (không bắt buộc log time). Chúc bạn có thời gian nghỉ ngơi thoải mái!
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            title="Làm mới số giờ log từ Tempo"
            className="p-2 rounded-xl text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <RefreshCw size={16} className={isRefreshing || loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <a
            href={tempoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <span>Mở Tempo Timesheet</span>
            <ExternalLink size={14} />
          </a>

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Mở rộng chi tiết' : 'Thu gọn'}
            aria-label={collapsed ? 'Mở rộng chi tiết' : 'Thu gọn'}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Progress Bar & Thống kê nhanh */}
      {!collapsed && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-100/80 dark:border-neutral-800/80">
          {/* Thanh Progress Bar */}
          {isWorkday && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Tiến độ Log Work hôm nay:
                </span>
                <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {todayLogged}h / 8.0h ({percent}%)
                </span>
              </div>
              <div className="w-full bg-gray-200/70 dark:bg-neutral-800 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${statusTheme.barColor}`}
                  style={{ width: `${Math.min(100, Math.max(percent > 0 ? 3 : 0, percent))}%` }}
                />
              </div>
            </div>
          )}

          {/* 3 Thẻ thống kê nhanh */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/75 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mục tiêu hôm nay
                </span>
                <div className="text-xl font-black text-gray-900 dark:text-gray-100 tabular-nums mt-0.5">
                  {isWorkday ? '8.0 giờ' : '0 giờ'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isWorkday ? 'Áp dụng T2 — T6' : 'Cuối tuần nghỉ ngơi'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CalendarCheck size={18} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/75 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Đã log hôm nay
                </span>
                <div className="text-xl font-black tabular-nums mt-0.5 text-gray-900 dark:text-gray-100">
                  <span className={todayLogged >= 8 ? 'text-emerald-600 dark:text-emerald-400' : todayLogged > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}>
                    {todayLogged} giờ
                  </span>
                </div>
                <div className="text-[11px] mt-0.5">
                  {isWorkday ? (
                    remainingHours > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        Thiếu -{remainingHours}h nữa
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Đạt chuẩn 8h 
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">Không bắt buộc</span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/75 dark:bg-neutral-800/40 border border-gray-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tổng log trong tháng
                </span>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">
                  {monthLogged} giờ
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers size={18} />
              </div>
            </div>
          </div>

          {/* Danh sách các công việc đã log hôm nay */}
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Các task đã log work hôm nay ({items.length} đầu việc)
              </span>
              <a
                href={tempoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                Xem đầy đủ trên Tempo <ExternalLink size={11} />
              </a>
            </div>

            {items.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 divide-y divide-gray-100 dark:divide-neutral-800/80">
                {items.map((item, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex items-center gap-2">
                      <a
                        href={jiraUrl(item.key)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        {item.key}
                      </a>
                      <span className="text-gray-700 dark:text-gray-300 truncate" title={item.summary}>
                        {item.summary}
                      </span>
                      {item.comment && (
                        <span className="text-gray-400 dark:text-gray-500 text-[11px] italic truncate shrink-0 hidden sm:inline">
                          ({item.comment})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-200 shrink-0 px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 tabular-nums">
                      {item.timeSpent || `${item.hours}h`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                {isWorkday ? (
                  <>
                    Chưa có công việc nào được log hôm nay.{' '}
                    <a href={tempoUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      Bấm vào đây để log work ngay trên Tempo ↗
                    </a>
                  </>
                ) : (
                  <>
                    Hôm nay là cuối tuần. Không có yêu cầu log work.{' '}
                    {data?.latestLoggedInfo && (
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        (Ngày làm việc gần nhất {data.latestLoggedInfo.dayOfWeek} {data.latestLoggedInfo.date}: đã log đủ {data.latestLoggedInfo.loggedHours}h)
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TempoReminderCard
