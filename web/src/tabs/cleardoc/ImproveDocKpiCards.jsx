import { Lightbulb, FileText, AlertCircle, CheckCircle2, Filter } from 'lucide-react'

export function ImproveDocKpiCards({
  stats = { total: 0, uniqueOriginTasks: 0, pendingCards: 0, hasCards: 0 },
  cardFilter = 'all',
  onFilterChange = () => {},
}) {
  const cards = [
    {
      id: 'all',
      title: 'Tổng vấn đề Improve',
      value: stats.total,
      icon: Lightbulb,
      textColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100/70 dark:bg-purple-500/15',
      activeBorder: 'border-purple-500 ring-1 ring-purple-500/30 bg-purple-50/30 dark:bg-purple-950/20',
      clickable: true,
    },
    {
      id: 'origin_tasks',
      title: 'Task gốc liên quan',
      value: stats.uniqueOriginTasks,
      icon: FileText,
      textColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100/70 dark:bg-blue-500/15',
      activeBorder: 'border-blue-500',
      clickable: false,
    },
    {
      id: 'pending',
      title: 'Chưa bổ sung card',
      value: stats.pendingCards,
      icon: AlertCircle,
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100/70 dark:bg-amber-500/15',
      activeBorder: 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20',
      badge: stats.pendingCards > 0 ? `${stats.pendingCards} chờ xử lý` : 'Đã đủ card',
      badgeColor: stats.pendingCards > 0
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
      clickable: true,
    },
    {
      id: 'has_card',
      title: 'Đã có card xử lý',
      value: stats.hasCards,
      icon: CheckCircle2,
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100/70 dark:bg-emerald-500/15',
      activeBorder: 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20',
      clickable: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {cards.map((c) => {
        const Icon = c.icon
        const isActive = cardFilter === c.id
        const clickable = c.clickable !== false

        return (
          <div
            key={c.id}
            onClick={() => {
              if (!clickable) return
              onFilterChange(isActive && c.id !== 'all' ? 'all' : c.id)
            }}
            title={clickable ? (isActive ? 'Nhấp để bỏ lọc' : 'Nhấp để lọc danh sách') : undefined}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all select-none ${
              clickable ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'
            } ${
              isActive
                ? c.activeBorder
                : 'bg-white dark:bg-neutral-900 border-gray-200/90 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center ${c.bgColor} ${c.textColor}`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                    {c.value}
                  </span>
                  {isActive && c.id !== 'all' && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600 dark:text-blue-400">
                      <Filter size={9} /> Đang lọc
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {c.title}
                </div>
              </div>
            </div>

            {c.badge && (
              <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1.5 ${c.badgeColor}`}>
                {c.badge}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
