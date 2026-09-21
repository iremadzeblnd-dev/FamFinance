import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { Maximize2, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { ReceiptAttachment } from '../types/app'
import { translate } from '../i18n/translations'
import { useFinance } from '../state/FinanceContext'

interface ReceiptViewerModalProps {
  receipt?: ReceiptAttachment
  onClose: () => void
}

const clampZoom = (value: number) => Math.min(4, Math.max(0.5, Math.round(value * 10) / 10))

export function ReceiptViewerModal({ receipt, onClose }: ReceiptViewerModalProps) {
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchStart = useRef<{ distance: number; zoom: number } | undefined>(undefined)

  useEffect(() => {
    if (!receipt) return
    setZoom(1)
    setRotation(0)
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [receipt, onClose])

  if (!receipt) return null

  const resetView = () => { setZoom(1); setRotation(0) }
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => clampZoom(current + (event.deltaY < 0 ? 0.2 : -0.2)))
  }
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()]
      pinchStart.current = { distance: Math.hypot(second.x - first.x, second.y - first.y), zoom }
    }
  }
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2 && pinchStart.current) {
      const [first, second] = [...pointers.current.values()]
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      setZoom(clampZoom(pinchStart.current.zoom * distance / pinchStart.current.distance))
    }
  }
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinchStart.current = undefined
  }
  const controlClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 disabled:opacity-40'

  return (
    <div className={`theme-${preferences.theme} fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="flex h-[96dvh] max-h-[900px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:h-[92dvh] sm:rounded-3xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="receipt-viewer-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><h3 id="receipt-viewer-title" className="text-lg font-semibold text-slate-900">{t('receipt.view')}</h3><p className="truncate text-sm text-slate-500">{receipt.fileName}</p></div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 flex max-w-full items-center gap-2 overflow-x-auto pb-1" role="toolbar" aria-label={t('receipt.viewerControls')}>
          <button type="button" onClick={() => setZoom((value) => clampZoom(value + 0.2))} disabled={zoom >= 4} className={controlClass} aria-label={t('receipt.zoomIn')} title={t('receipt.zoomIn')}><ZoomIn className="h-5 w-5" /></button>
          <button type="button" onClick={() => setZoom((value) => clampZoom(value - 0.2))} disabled={zoom <= 0.5} className={controlClass} aria-label={t('receipt.zoomOut')} title={t('receipt.zoomOut')}><ZoomOut className="h-5 w-5" /></button>
          <button type="button" onClick={resetView} className={controlClass} aria-label={t('receipt.resetZoom')} title={t('receipt.resetZoom')}><Maximize2 className="h-5 w-5" /></button>
          <span className="min-w-12 text-center text-sm font-medium text-slate-500">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setRotation((value) => value - 90)} className={controlClass} aria-label={t('receipt.rotateLeft')} title={t('receipt.rotateLeft')}><RotateCcw className="h-5 w-5" /></button>
          <button type="button" onClick={() => setRotation((value) => value + 90)} className={controlClass} aria-label={t('receipt.rotateRight')} title={t('receipt.rotateRight')}><RotateCw className="h-5 w-5" /></button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto rounded-2xl bg-slate-100" onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} style={{ touchAction: 'none' }}>
          <div className="flex min-h-full min-w-full items-center justify-center p-3 sm:p-6">
            <img src={receipt.url} alt={t('receipt.previewAlt')} draggable={false} className="max-h-[68dvh] max-w-full select-none object-contain transition-transform duration-150" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} />
          </div>
        </div>
        <button type="button" onClick={onClose} className="mt-3 min-h-12 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500">{t('common.close')}</button>
      </div>
    </div>
  )
}
