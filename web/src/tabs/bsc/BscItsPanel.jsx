import { useState, useMemo } from 'react'
import {
  Headphones,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  Bug,
  ChevronDown,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Tag,
  Filter,
} from 'lucide-react'
import { Panel } from '../../components/ui.jsx'

export default function BscItsPanel({
  itsAnalysis = {},
  quarterLabel = '',
  mode = 'dark',
}) {
  const [expanded, setExpanded] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'resolved' | 'pending' | 'breached'
  const [classifyFilter, setClassifyFilter] = useState('')
  const [search, setSearch] = useState('')

  const {
    total = 0,
    openCount = 0,
    reviewingCount = 0,
    resolvedCount = 0,
    resolvedRate = 0,
    breachedCount = 0,
    slaComplianceRate = 100,
    slaResolutionBreachedCount = 0,
    slaFirstResponseBreachedCount = 0,
    linkedBugsCount = 0,
    byClassify = {},
    tickets = [],
  } = itsAnalysis

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    let list = tickets || []

    if (statusFilter === 'resolved') {
      list = list.filter((t) => {
        const s = String(t.status || '').toLowerCase().trim()
        return ['done', 'resolved', 'closed', 'released', 'rejected', 'not reproducible', "won't do", 'cancelled'].includes(s)
      })
    } else if (statusFilter === 'pending') {
      list = list.filter((t) => {
        const s = String(t.status || '').toLowerCase().trim()
        return !['done', 'resolved', 'closed', 'released', 'rejected', 'not reproducible', "won't do", 'cancelled'].includes(s)
      })
    } else if (statusFilter === 'breached') {
      list = list.filter((t) => Boolean(t.slaResolutionBreached || t.slaFirstResponseBreached))
    }

    if (classifyFilter) {
      list = list.filter((t) => (t.classify || 'Chưa phân loại') === classifyFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) =>
        (t.key || '').toLowerCase().includes(q) ||
        (t.summary || '').toLowerCase().includes(q) ||
        (t.reporter || '').toLowerCase().includes(q) ||
        (t.classify || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [tickets, statusFilter, classifyFilter, search])

  const classifyEntries = useMemo(() => {
    return Object.entries(byClassify).sort((a, b) => b[1] - a[1])
  }, [byClassify])

  const pendingCount = openCount + reviewingCount

  return (
    <Panel
      title={`Xử lý Ticket ITS (${quarterLabel})`}
      className="overflow-hidden border-cyan-200/80 dark:border-cyan-500/20"
      right={(
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            breachedCount === 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
          }`}>
            {breachedCount === 0 ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            SLA: {slaComplianceRate}% ({breachedCount} vi phạm)
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300 text-xs font-medium">
            <Headphones size={12} /> Vận hành ITS
          </span>
        </div>
      )}
    >
      {/* ─── BANNER TỔNG QUAN XỬ LÝ ITS ─── */}
      <div className="mb-4 rounded-xl bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 p-4 dark:from-cyan-950/25 dark:via-sky-950/20 dark:to-blue-950/25 border border-cyan-100/60 dark:border-cyan-500/15">
        <div className="flex flex-wrap items-center gap-5">
          {/* Conic Ring Gauge Tỷ lệ xử lý */}
          <div
            className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full shadow-xs"
            style={{
              background: `conic-gradient(#06b6d4 ${resolvedRate}%, rgba(148,163,184,.18) 0)`,
            }}
          >
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-sm">
              <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-50">
                {resolvedRate}%
              </span>
              <span className="text-[10px] text-gray-400 font-medium">đã xử lý</span>
            </div>
          </div>

          {/* Metric grid */}
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
              <Headphones size={17} className="text-cyan-500" />
              Tiến độ giải quyết & Cam kết chất lượng dịch vụ (SLA)
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Tổng số ticket hỗ trợ vận hành ITS được phân công cho QC trong quý <strong className="text-cyan-700 dark:text-cyan-300">{quarterLabel}</strong>, đánh giá khả năng phản hồi và xử lý đúng hạn.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Tổng ITS</div>
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-50">{total}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Đã xử lý</div>
                <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{resolvedCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Đang Review</div>
                <div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{reviewingCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Đang chờ (Open)</div>
                <div className={`text-lg font-bold tabular-nums ${openCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {openCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Vi phạm SLA</div>
                <div className={`text-lg font-bold tabular-nums ${breachedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {breachedCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Bug từ ITS</div>
                <div className="text-lg font-bold tabular-nums text-purple-600 dark:text-purple-400">{linkedBugsCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar trạng thái */}
        <div className="mt-4 pt-3 border-t border-cyan-100/70 dark:border-cyan-500/15">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Phân bổ trạng thái xử lý</span>
            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">{resolvedCount}/{total} ticket hoàn tất</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
            <div
              style={{ width: `${total > 0 ? (resolvedCount / total) * 100 : 0}%` }}
              className="bg-emerald-500 transition-all duration-700"
              title={`Đã xử lý: ${resolvedCount} ticket`}
            />
            <div
              style={{ width: `${total > 0 ? (reviewingCount / total) * 100 : 0}%` }}
              className="bg-indigo-500 transition-all duration-700"
              title={`Đang Review: ${reviewingCount} ticket`}
            />
            <div
              style={{ width: `${total > 0 ? (openCount / total) * 100 : 0}%` }}
              className="bg-amber-400 transition-all duration-700"
              title={`Đang chờ: ${openCount} ticket`}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Đã xử lý: <strong>{resolvedCount}</strong> ({total > 0 ? Math.round((resolvedCount / total) * 100) : 0}%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Đang Review: <strong>{reviewingCount}</strong> ({total > 0 ? Math.round((reviewingCount / total) * 100) : 0}%)
            </span>
            {openCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Đang chờ: <strong>{openCount}</strong> ({total > 0 ? Math.round((openCount / total) * 100) : 0}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── NÚT MỞ RỘNG / THU GỌN DANH SÁCH CHI TIẾT ─── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200/80 px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:border-neutral-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800/70 transition-colors"
      >
        <span>
          {expanded
            ? 'Ẩn danh sách ticket ITS'
            : `Xem chi tiết ${total} ticket ITS trong Quý (Phân loại & SLA)`}
        </span>
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ─── PHẦN CHI TIẾT (KHI MỞ RỘNG) ─── */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-1">
          {/* Quick Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-neutral-900 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Tất cả ({total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('resolved')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  statusFilter === 'resolved'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Đã xử lý ({resolvedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Chưa xong ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('breached')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  statusFilter === 'breached'
                    ? 'bg-white dark:bg-neutral-900 text-rose-700 dark:text-rose-300 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Vi phạm SLA ({breachedCount})
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã ticket, tiêu đề, loại lỗi..."
                className="w-full pl-8 pr-3 py-1 text-xs border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Classify Chips */}
          {classifyEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-gray-400 text-[11px] font-medium mr-1">Phân loại sự cố:</span>
              <button
                type="button"
                onClick={() => setClassifyFilter('')}
                className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                  !classifyFilter
                    ? 'bg-cyan-500 text-white font-semibold'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              {classifyEntries.map(([clsName, clsCount]) => (
                <button
                  key={clsName}
                  type="button"
                  onClick={() => setClassifyFilter(classifyFilter === clsName ? '' : clsName)}
                  className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                    classifyFilter === clsName
                      ? 'bg-cyan-500 text-white font-semibold'
                      : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-700 hover:border-cyan-400'
                  }`}
                >
                  {clsName}: <strong>{clsCount}</strong>
                </button>
              ))}
            </div>
          )}

          {/* Ticket List */}
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                Không tìm thấy ticket ITS phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isBreached = Boolean(t.slaResolutionBreached || t.slaFirstResponseBreached)
                const isResolved = ['done', 'resolved', 'closed', 'released', 'rejected', 'not reproducible', "won't do", 'cancelled'].includes(String(t.status || '').toLowerCase().trim())
                return (
                  <div
                    key={t.key}
                    className="p-2.5 rounded-lg border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-cyan-300 dark:hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-xs text-cyan-600 dark:text-cyan-400 shrink-0">
                          {t.key}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={t.summary}>
                          {t.summary}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* SLA badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isBreached
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        }`}>
                          {isBreached ? 'SLA Vi phạm' : 'SLA Đạt'}
                        </span>

                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        }`}>
                          {t.status}
                        </span>

                        {/* External link */}
                        {t.link && (
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                            title="Mở ticket trên Jira ITS"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 pt-1">
                      {t.classify && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                          <Tag size={9} /> {t.classify}
                        </span>
                      )}
                      {t.priority && (
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-neutral-800">
                          Ưu tiên: <strong>{t.priority}</strong>
                        </span>
                      )}
                      {t.reporter && (
                        <span>
                          Người báo: <strong>{t.reporter}</strong>
                        </span>
                      )}
                      {Array.isArray(t.linkedBugs) && t.linkedBugs.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                          <Bug size={10} /> {t.linkedBugs.length} bug liên kết
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
