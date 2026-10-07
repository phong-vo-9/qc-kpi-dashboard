import { useState, useMemo } from 'react'
import {
  CheckCircle2, CircleAlert, CheckSquare, Square, Plus, ExternalLink,
  Layers, Check, X, ShieldAlert, Sparkles, Filter
} from 'lucide-react'
import { jiraUrl } from '../../lib/api.js'
import { JiraStatusBadge, TaskTypeBadge } from './ClearDocBadges.jsx'

export function ClearDocTrackingTable({
  currentScopeTasks = [],
  taskToClearDocMap = new Map(),
  taskStatuses = {},
  selectedTaskKeys = [],
  setSelectedTaskKeys,
  onOpenAddModalWithTasks,
  onToggleTaskNotNeeded,
  onBatchSetNotNeeded,
  onOpenDocDrawer,
  trackingFilter = 'all', // 'all' | 'pending' | 'cleared' | 'not_needed'
  setTrackingFilter,
}) {
  // Phân loại đếm số lượng cho từng tab phụ
  const counts = useMemo(() => {
    let pending = 0
    let cleared = 0
    let notNeeded = 0

    for (const t of currentScopeTasks) {
      const hasClear = (taskToClearDocMap.get(t.key) || []).length > 0
      const isNot = taskStatuses[t.key]?.status === 'not_needed'
      if (hasClear) cleared++
      else if (isNot) notNeeded++
      else pending++
    }

    return { all: currentScopeTasks.length, pending, cleared, notNeeded }
  }, [currentScopeTasks, taskToClearDocMap, taskStatuses])

  // Lọc danh sách theo tab phụ
  const displayedTasks = useMemo(() => {
    return currentScopeTasks.filter((t) => {
      const hasClear = (taskToClearDocMap.get(t.key) || []).length > 0
      const isNot = taskStatuses[t.key]?.status === 'not_needed'

      if (trackingFilter === 'pending') return !hasClear && !isNot
      if (trackingFilter === 'cleared') return hasClear
      if (trackingFilter === 'not_needed') return isNot
      return true
    })
  }, [currentScopeTasks, trackingFilter, taskToClearDocMap, taskStatuses])

  const isAllSelected =
    displayedTasks.length > 0 &&
    displayedTasks.every((t) => selectedTaskKeys.includes(t.key))

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      const currentKeys = new Set(selectedTaskKeys)
      displayedTasks.forEach((t) => currentKeys.add(t.key))
      setSelectedTaskKeys([...currentKeys])
    } else {
      const displayedSet = new Set(displayedTasks.map((t) => t.key))
      setSelectedTaskKeys(selectedTaskKeys.filter((k) => !displayedSet.has(k)))
    }
  }

  return (
    <div className="space-y-3">
      {/* ─── THANH TAB BỘ LỌC TRẠNG THÁI TASK ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTrackingFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              trackingFilter === 'all'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            Tất cả ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setTrackingFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              trackingFilter === 'pending'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 shadow-2xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
            }`}
          >
            <CircleAlert size={13} />
            <span>Chưa có Clear Doc ({counts.pending})</span>
          </button>

          <button
            type="button"
            onClick={() => setTrackingFilter('cleared')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              trackingFilter === 'cleared'
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-2xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Đã có ({counts.cleared})</span>
          </button>

          <button
            type="button"
            onClick={() => setTrackingFilter('not_needed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              trackingFilter === 'not_needed'
                ? 'bg-gray-200 text-gray-900 dark:bg-neutral-700 dark:text-gray-100 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            <CheckSquare size={13} />
            <span>Không cần Clear ({counts.notNeeded})</span>
          </button>
        </div>

        <div className="text-[11px] text-gray-500 dark:text-gray-400 pr-1">
          Đã loại trừ Regression Task tự động
        </div>
      </div>

      {/* ─── BẢNG QUẢN LÝ TIẾN ĐỘ TASK ─── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-xs overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50/90 dark:bg-neutral-800 text-xs text-gray-700 dark:text-gray-200 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-28">Mã Task</th>
                <th className="py-3 px-4">Tên công việc (Summary)</th>
                <th className="py-3 px-3 w-24 text-center">Loại</th>
                <th className="py-3 px-3 w-32 text-center">Trạng thái Jira</th>
                <th className="py-3 px-4 w-60">Trạng thái Clear Doc</th>
                <th className="py-3 px-3 w-40 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                    Không có task nào trong tab lọc này.
                  </td>
                </tr>
              ) : (
                displayedTasks.map((t) => {
                  const linkedDocs = taskToClearDocMap.get(t.key) || []
                  const hasClear = linkedDocs.length > 0
                  const isNotNeeded = taskStatuses[t.key]?.status === 'not_needed'
                  const isSelected = selectedTaskKeys.includes(t.key)

                  return (
                    <tr
                      key={t.key}
                      className={`hover:bg-blue-50/20 dark:hover:bg-neutral-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTaskKeys((prev) => [...prev, t.key])
                            } else {
                              setSelectedTaskKeys((prev) => prev.filter((k) => k !== t.key))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Mã Task */}
                      <td className="py-3 px-3 font-bold whitespace-nowrap">
                        <a
                          href={jiraUrl(t.key)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono font-bold"
                        >
                          <span>{t.key}</span>
                          <ExternalLink size={11} className="opacity-70" />
                        </a>
                      </td>

                      {/* Summary */}
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                        <span className="font-medium line-clamp-2" title={t.summary}>
                          {t.summary}
                        </span>
                      </td>

                      {/* Loại */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <TaskTypeBadge type={t.type} />
                      </td>

                      {/* Status Jira */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <JiraStatusBadge status={t.status} />
                      </td>

                      {/* Trạng thái Clear Doc */}
                      <td className="py-3 px-4">
                        {hasClear ? (
                          <div className="space-y-1">
                            {linkedDocs.map((ld) => (
                              <button
                                key={ld.id}
                                type="button"
                                onClick={() => onOpenDocDrawer(ld)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/30 max-w-[230px] hover:bg-emerald-100 transition-colors text-left"
                                title={`Mở xem chi tiết: ${ld.threadTitle}`}
                              >
                                <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                                <span className="truncate">{ld.threadTitle}</span>
                              </button>
                            ))}
                          </div>
                        ) : isNotNeeded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 border border-gray-200 dark:border-neutral-700">
                            <CheckSquare size={13} className="text-gray-500" />
                            <span>Không cần clear</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30">
                            <CircleAlert size={13} className="text-amber-500" />
                            <span>Chưa có clear doc</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenAddModalWithTasks([t.key])}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-800/80 transition-all shadow-2xs"
                            title="Tạo hoặc gộp Clear doc cho task này"
                          >
                            <Plus size={13} />
                            <span>Clear doc</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleTaskNotNeeded(t.key)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-all ${
                              isNotNeeded
                                ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-gray-300 dark:border-neutral-700'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-dashed border-gray-300 dark:border-neutral-700'
                            }`}
                            title={isNotNeeded ? 'Bỏ đánh dấu (cần clear doc)' : 'Đánh dấu không cần clear'}
                          >
                            {isNotNeeded ? (
                              <>
                                <CheckSquare size={13} className="text-emerald-500" />
                                <span>Bỏ K.Cần</span>
                              </>
                            ) : (
                              <>
                                <Square size={13} />
                                <span>K.Cần doc</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── FLOATING BATCH ACTION BAR KHI CHỌN >= 1 TASK ─── */}
      {selectedTaskKeys.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 dark:bg-neutral-900/95 backdrop-blur-md text-white rounded-2xl px-5 py-3 shadow-2xl border border-gray-700/80 flex items-center gap-4 animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>
              Đã chọn <strong>{selectedTaskKeys.length}</strong> task
            </span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAddModalWithTasks(selectedTaskKeys)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <Plus size={13} />
              <span>Gộp vào Clear Doc mới</span>
            </button>

            {onBatchSetNotNeeded && (
              <button
                type="button"
                onClick={() => onBatchSetNotNeeded(selectedTaskKeys)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 transition-all"
              >
                <CheckSquare size={13} />
                <span>Đánh dấu Không cần Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedTaskKeys([])}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Bỏ chọn tất cả"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
