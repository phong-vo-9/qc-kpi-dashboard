import { useState } from 'react'
import {
  FileText, Sparkles, Copy, Plus, FolderKanban, Calendar, Layers,
  Search, X, RotateCcw, Check, Share2, FileSpreadsheet
} from 'lucide-react'

export function ClearDocHeader({
  filteredDocsCount = 0,
  filterProject,
  setFilterProject,
  availableProjects = [],
  filterQuarter,
  setFilterQuarter,
  availableQuarters = [],
  filterSprint,
  setFilterSprint,
  availableSprints = [],
  search,
  setSearch,
  quickTag,
  setQuickTag,
  onResetFilters,
  onOpenAiModal,
  onOpenAddModal,
  onCopyBscTsv,
  onCopyMarkdownReport,
}) {
  const [copiedType, setCopiedType] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleCopyTsv = () => {
    onCopyBscTsv()
    setCopiedType('tsv')
    setTimeout(() => setCopiedType(null), 2200)
    setShowExportMenu(false)
  }

  const handleCopyMd = () => {
    onCopyMarkdownReport()
    setCopiedType('md')
    setTimeout(() => setCopiedType(null), 2200)
    setShowExportMenu(false)
  }

  const isFiltered =
    filterProject !== 'GOP' ||
    filterSprint !== 'all' ||
    Boolean(search) ||
    Boolean(quickTag)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-xs p-4 space-y-4">
      {/* ─── DÒNG 1: TIÊU ĐỀ & CÁC NÚT HÀNH ĐỘNG CHÍNH ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Tiêu đề & Icon */}
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <FileText size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Quản lý Clear Doc
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                {filteredDocsCount} thread
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Theo dõi làm rõ tài liệu & yêu cầu giữa QC và BA/Team, phục vụ chấm điểm BSC
            </p>
          </div>
        </div>

        {/* Các nút hành động chính */}
        <div className="flex items-center gap-2">
          {/* NÚT AI TỰ ĐỘNG ĐIỀN */}
          <button
            onClick={onOpenAiModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-xs hover:shadow transition-all group"
            title="Dán văn bản thô để AI trích xuất task Jira, link thread và đánh số câu hỏi tự động"
          >
            <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
            <span>✨ AI Tự động điền</span>
          </button>

          {/* NÚT XUẤT / SAO CHÉP BẢNG BSC (DROPDOWN) */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 shadow-xs transition-all"
              title="Xuất bảng Clear Doc sang Excel hoặc Markdown"
            >
              {copiedType ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedType ? 'Đã sao chép!' : 'Xuất dữ liệu BSC'}</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-52 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-xl py-1 z-30 animate-fade-in text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={handleCopyTsv}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-neutral-700/60 text-gray-800 dark:text-gray-200"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <div>
                    <div className="font-semibold">Sao chép bảng TSV</div>
                    <div className="text-[10px] text-gray-400">Chuẩn dán trực tiếp vào Excel / BSC</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMd}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-neutral-700/60 text-gray-800 dark:text-gray-200 border-t border-gray-100 dark:border-neutral-700/60"
                >
                  <Share2 size={14} className="text-blue-600" />
                  <div>
                    <div className="font-semibold">Sao chép Markdown</div>
                    <div className="text-[10px] text-gray-400">Gửi báo cáo vào Slack / Lark channel</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* NÚT THÊM THỦ CÔNG */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
          >
            <Plus size={15} />
            <span>Thêm Clear Doc</span>
          </button>
        </div>
      </div>

      {/* ─── DÒNG 2: THANH BỘ LỌC CHUYÊN BIỆT ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
        {/* 1. Lọc Project */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <FolderKanban size={12} /> Dự án
          </label>
          <select
            value={filterProject}
            onChange={(e) => {
              setFilterProject(e.target.value)
              setFilterSprint('all')
            }}
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Tất cả dự án</option>
            {availableProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* 2. Lọc Quý */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={12} /> Quý đánh giá
          </label>
          <select
            value={filterQuarter}
            onChange={(e) => {
              setFilterQuarter(e.target.value)
              setFilterSprint('all')
            }}
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Tất cả các quý</option>
            {availableQuarters.map((q) => (
              <option key={q.label} value={q.label}>{q.label} (Quý {q.quarter.slice(1)} năm {q.year})</option>
            ))}
          </select>
        </div>

        {/* 3. Lọc Sprint */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Layers size={12} /> Sprint
          </label>
          <select
            value={filterSprint}
            onChange={(e) => setFilterSprint(e.target.value)}
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Tất cả sprint ({availableSprints.length})</option>
            {availableSprints.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 4. Ô tìm kiếm */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Search size={12} /> Tìm kiếm nhanh
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Mã task, tên thread, câu hỏi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── DÒNG 3: QUICK FILTER CHIPS & RESET ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-50 dark:border-neutral-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-400 mr-1">Bộ lọc nhanh:</span>
          <button
            type="button"
            onClick={() => setQuickTag(quickTag === 'multi_task' ? '' : 'multi_task')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border ${
              quickTag === 'multi_task'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-700 hover:bg-gray-100'
            }`}
          >
            Nhiều hơn 1 task
          </button>

          <button
            type="button"
            onClick={() => setQuickTag(quickTag === 'has_url' ? '' : 'has_url')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border ${
              quickTag === 'has_url'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-700 hover:bg-gray-100'
            }`}
          >
            Có link thread URL
          </button>

          <button
            type="button"
            onClick={() => setQuickTag(quickTag === 'multi_issue' ? '' : 'multi_issue')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border ${
              quickTag === 'multi_issue'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-700 hover:bg-gray-100'
            }`}
          >
            &gt; 2 vấn đề
          </button>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:underline"
          >
            <RotateCcw size={11} />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  )
}
