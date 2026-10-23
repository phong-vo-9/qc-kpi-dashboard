import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ChevronLeft, ChevronRight, Download, ExternalLink,
  Copy, Check, Maximize2, Minimize2, ZoomIn, ZoomOut
} from 'lucide-react'

export default function IssueImageViewer({
  images = [],
  initialIndex = 0,
  title = '',
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [copied, setCopied] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const normalizedImages = Array.isArray(images)
    ? images.map((img) => (typeof img === 'string' ? { url: img, name: 'Hình ảnh' } : img)).filter(img => img && img.url)
    : []

  const total = normalizedImages.length
  const currentImg = normalizedImages[currentIndex] || normalizedImages[0]

  const handlePrev = useCallback(() => {
    setIsZoomed(false)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1))
  }, [total])

  const handleNext = useCallback(() => {
    setIsZoomed(false)
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0))
  }, [total])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext, onClose])

  if (!currentImg) return null

  // Copy link
  const handleCopy = () => {
    if (!currentImg.url) return
    navigator.clipboard.writeText(currentImg.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download image
  const handleDownload = () => {
    if (!currentImg.url) return
    const a = document.createElement('a')
    a.href = currentImg.url
    a.download = currentImg.name || `image_${currentIndex + 1}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Open in new tab
  const handleOpenNewTab = () => {
    if (!currentImg.url) return
    const win = window.open()
    if (win) {
      win.document.write(`<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${currentImg.url}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body>`)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md text-white select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40 backdrop-blur-sm z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Info */}
        <div className="flex items-center gap-3 min-w-0">
          {total > 1 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 border border-white/10 shrink-0">
              {currentIndex + 1} / {total}
            </span>
          )}
          <div className="truncate">
            <h3 className="text-sm font-semibold text-white/95 truncate">
              {currentImg.name || 'Hình ảnh minh chứng'}
            </h3>
            {title && (
              <p className="text-xs text-white/60 truncate max-w-lg">
                {title}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom toggle */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? 'Thu nhỏ về vừa màn hình' : 'Phóng to kích thước gốc'}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isZoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Copy image / URL */}
          <button
            onClick={handleCopy}
            title="Sao chép đường dẫn / dữ liệu ảnh"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>

          {/* Open in new tab */}
          <button
            onClick={handleOpenNewTab}
            title="Mở ảnh trong tab mới"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={16} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            title="Tải ảnh về máy"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download size={16} />
          </button>

          <div className="h-5 w-px bg-white/15 mx-1" />

          {/* Close button */}
          <button
            onClick={onClose}
            title="Đóng (Esc)"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-rose-500/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Display Area */}
      <div
        className="relative flex-1 flex items-center justify-center p-4 overflow-auto min-h-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {/* Prev Arrow */}
        {total > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            title="Ảnh trước (Mũi tên Trái)"
            className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Center Image */}
        <div
          className={`flex items-center justify-center transition-transform duration-200 ${
            isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setIsZoomed(!isZoomed)
          }}
        >
          <img
            src={currentImg.url}
            alt={currentImg.name || 'Hình ảnh vấn đề'}
            className={`rounded-lg shadow-2xl transition-all duration-200 select-none ${
              isZoomed
                ? 'max-w-none max-h-none'
                : 'max-h-[80vh] max-w-[90vw] object-contain'
            }`}
          />
        </div>

        {/* Next Arrow */}
        {total > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            title="Ảnh tiếp theo (Mũi tên Phải)"
            className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) */}
      {total > 1 && (
        <div
          className="px-6 py-3 border-t border-white/10 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-2 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {normalizedImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsZoomed(false)
                setCurrentIndex(idx)
              }}
              className={`relative rounded-md overflow-hidden border-2 transition-all shrink-0 w-12 h-10 ${
                idx === currentIndex
                  ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30'
                  : 'border-white/20 opacity-55 hover:opacity-100 hover:border-white/50'
              }`}
            >
              <img
                src={img.url}
                alt={img.name || `Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
