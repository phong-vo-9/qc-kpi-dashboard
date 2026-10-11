import { useEffect, useState, useCallback } from 'react'
import {
  Clock,
  Calendar,
  RotateCcw,
  ExternalLink,
  FolderGit2,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { TempoReminderCard } from '../components/TempoReminder.jsx'
import BscTempoPanel from './bsc/BscTempoPanel.jsx'

export default function TimeManagement({ mode = 'dark', onNavigateToTask }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuarter, setSelectedQuarter] = useState('')

  // Load BSC/Tempo data for the selected quarter
  const loadData = useCallback(async (quarterStr) => {
    setLoading(true)
    try {
      let qUrl = '/api/bsc'
      if (quarterStr) {
        const parts = quarterStr.split('-')
        if (parts.length === 2) {
          qUrl += `?quarter=${encodeURIComponent(parts[0])}&year=${encodeURIComponent(parts[1])}`
        }
      }
      const res = await api(qUrl)
      setData(res)
      if (!quarterStr && res?.quarterLabel) {
        setSelectedQuarter(res.quarterLabel)
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Tempo / BSC:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(selectedQuarter)
  }, [selectedQuarter, loadData])

  const handleQuarterChange = (qLabel) => {
    setSelectedQuarter(qLabel)
  }

  const tempoAnalysis = data?.tempoAnalysis || {}
  const quarterLabel = data?.quarterLabel || selectedQuarter || 'Q3-2026'
  const availableQuarters = data?.availableQuarters || ['Q3-2026', 'Q2-2026', 'Q1-2026']

  const reportUrl =
    tempoAnalysis.tempoReportUrl ||
    `https://jira.vexere.net/secure/Tempo.jspa#/reports/planned-vs-actual/bc868685-a3b5-4fba-b024-d57f97612057?chartType=DONUT&from=${tempoAnalysis.dateRange?.from || '2026-07-01'}&groupBy=project&subType=MONTH&to=${tempoAnalysis.dateRange?.to || '2026-09-30'}&type=FIXED&worker=JIRAUSER14615`

  return (
    <div className="space-y-6">
      {/* ─── HEADER BAR TAB QUẢN LÝ TIME ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Clock size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                Quản lý Thời gian (Time & Tempo Management)
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                <ShieldCheck size={12} /> Live Jira Tempo
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Trung tâm quản lý giờ làm việc: Theo dõi chấm công hàng ngày (8h/ngày làm việc) và Báo cáo Kế hoạch vs Thực tế (Planned vs Actual) toàn diện từ tất cả các dự án (GOP, SSD, AW, ITS...).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quarter selector */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-700">
            <Calendar size={14} className="text-amber-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Kế hoạch Quý:</span>
            <select
              value={selectedQuarter}
              onChange={(e) => handleQuarterChange(e.target.value)}
              className="text-xs font-bold text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableQuarters.map((q) => {
                const qVal = typeof q === 'string' ? q : q?.label || ''
                const qText = typeof q === 'string' ? q : `${q.label} (Quý ${q.quarter?.slice(1) || ''} năm ${q.year})`
                return (
                  <option key={qVal} value={qVal} className="dark:bg-neutral-800 text-gray-900 dark:text-gray-100">
                    {qText}
                  </option>
                )
              })}
            </select>
          </div>

          {/* External Tempo Link */}
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs"
            title="Mở Báo cáo Tempo Planned vs Actual Report trực tiếp trên Jira"
          >
            <span>Tempo Planned vs Actual</span>
            <ExternalLink size={12} />
          </a>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadData(selectedQuarter)}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            title="Tải lại dữ liệu Tempo"
          >
            <RotateCcw size={15} className={loading ? 'animate-spin text-amber-500' : ''} />
          </button>
        </div>
      </div>

      {/* ─── PHẦN 1: LOG WORK HÀNG NGÀY & TUẦN NÀY (8h / NGÀY LÀM VIỆC) ─── */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
          <CalendarDays size={14} className="text-amber-500" />
          <span>1. Chấm công hàng ngày & tuần hiện tại (Daily 8h Workday Log)</span>
        </div>
        <TempoReminderCard />
      </section>

      {/* ─── PHẦN 2: KẾ HOẠCH VS THỰC TẾ THEO QUÝ (TẤT CẢ CÁC NGUỒN) ─── */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
          <span className="flex items-center gap-2">
            <FolderGit2 size={14} className="text-amber-500" />
            <span>2. Báo cáo Kế hoạch vs Thực tế theo Quý ({quarterLabel}) - Tất cả nguồn</span>
          </span>
          <span className="text-[11px] font-normal lowercase tracking-normal text-gray-400">
            bao gồm chi tiết 88 task, phân tích dự án & từng tháng
          </span>
        </div>
        {loading && !data ? (
          <div className="p-12 text-center text-gray-400 bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 animate-pulse">
            Đang tải dữ liệu Tempo Quý {quarterLabel}…
          </div>
        ) : (
          <BscTempoPanel
            tempoAnalysis={tempoAnalysis}
            quarterLabel={quarterLabel}
            mode={mode}
            onNavigateToTask={onNavigateToTask}
          />
        )}
      </section>
    </div>
  )
}
