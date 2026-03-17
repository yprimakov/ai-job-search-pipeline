'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// Use CDN worker to avoid bundling complexity
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PdfModalProps {
  url: string
  onClose: () => void
}

export function PdfModal({ url, onClose }: PdfModalProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
  }, [])

  const onLoadError = useCallback((err: Error) => {
    setError(err.message)
    setLoading(false)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] mx-4 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <button
              onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              title="Zoom out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-mono text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              title="Zoom in"
            >
              <ZoomIn size={15} />
            </button>

            {/* Page navigation */}
            {numPages > 1 && (
              <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-3">
                <button
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-muted-foreground">
                  {pageNumber} / {numPages}
                </span>
                <button
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 overflow-auto flex items-start justify-center py-6 px-4">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-20">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading PDF...</span>
            </div>
          )}
          {error && (
            <div className="text-red-400 text-sm py-20 text-center">
              Failed to load PDF: {error}
            </div>
          )}
          <Document
            file={url}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading=""
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-2xl"
            />
          </Document>
        </div>
      </div>
    </div>
  )
}
