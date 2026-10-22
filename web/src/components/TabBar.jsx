import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TabBar({ tabs = [], activeTab, onSelectTab }) {
  const containerRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll capability
  const updateScrollState = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = containerRef.current
    if (!el) return

    window.addEventListener('resize', updateScrollState)
    return () => window.removeEventListener('resize', updateScrollState)
  }, [updateScrollState, tabs])

  // Scroll active tab into view when activeTab changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const activeEl = el.querySelector(`[data-tab-id="${activeTab}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest',
      })
    }
  }, [activeTab])

  // Mouse wheel horizontal scroll support
  const handleWheel = (e) => {
    const el = containerRef.current
    if (!el) return
    if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }

  // Smooth scroll buttons
  const handleScrollLeft = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollBy({ left: -220, behavior: 'smooth' })
  }

  const handleScrollRight = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollBy({ left: 220, behavior: 'smooth' })
  }

  return (
    <div className="relative group/tabbar max-w-full">
      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={handleScrollLeft}
          title="Cuộn sang trái"
          className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-neutral-800/95 border border-gray-200 dark:border-neutral-700 shadow-md text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
      )}

      {/* Left Gradient Fade */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-100 dark:from-neutral-900 to-transparent z-10 rounded-l-xl" />
      )}

      {/* Tabs Container */}
      <div
        ref={containerRef}
        onScroll={updateScrollState}
        onWheel={handleWheel}
        className="flex gap-1 p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl overflow-x-auto no-scrollbar scrollbar-none items-center scroll-smooth"
      >
        {tabs.map((t) => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              data-tab-id={t.id}
              onClick={() => onSelectTab(t.id)}
              title={t.fullLabel || t.label}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                active
                  ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold border border-gray-200/60 dark:border-neutral-700/60'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-neutral-800/60'
              }`}
            >
              <Icon size={14} className="shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right Gradient Fade */}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 dark:from-neutral-900 to-transparent z-10 rounded-r-xl" />
      )}

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={handleScrollRight}
          title="Cuộn sang phải"
          className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-neutral-800/95 border border-gray-200 dark:border-neutral-700 shadow-md text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all hover:scale-105 active:scale-95"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
