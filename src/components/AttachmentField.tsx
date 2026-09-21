import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Download, FileSpreadsheet, FileText, Image as ImageIcon, LoaderCircle, Plus, ReceiptText, Replace, Trash2 } from 'lucide-react'
import type { AttachmentCategory, ReceiptAttachment } from '../types/app'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'
import { getAttachmentBlob } from '../services/attachmentStorage'
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, attachmentCategory, attachmentFingerprint, formatAttachmentSize, makeAttachmentId, type AttachmentReference } from '../utils/attachments'
import { ReceiptViewerModal } from './ReceiptViewerModal'

export interface AttachmentDraft extends AttachmentReference {
  blob?: File
  previewUrl?: string
}

interface AttachmentFieldProps {
  attachments: AttachmentDraft[]
  onChange: (attachments: AttachmentDraft[]) => void
  onError: (message: string) => void
  onReadAmount: (attachment: AttachmentDraft) => void
  ocrAttachmentId?: string
}

export async function resolveAttachmentBlob(attachment: AttachmentDraft) {
  if (attachment.blob) return attachment.blob
  if (attachment.legacyUrl) return fetch(attachment.legacyUrl).then((response) => response.blob())
  return getAttachmentBlob(attachment.id)
}

export function AttachmentField({ attachments, onChange, onError, onReadAmount, ocrAttachmentId }: AttachmentFieldProps) {
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  const addInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const loadingPreviews = useRef(new Set<string>())
  const generatedUrls = useRef(new Set<string>())
  const [replacingId, setReplacingId] = useState<string>()
  const [viewerReceipt, setViewerReceipt] = useState<ReceiptAttachment>()

  useEffect(() => {
    let cancelled = false
    const missing = attachments.filter((attachment) => attachment.category === 'image' && !attachment.previewUrl && !loadingPreviews.current.has(attachment.id))
    missing.forEach((attachment) => loadingPreviews.current.add(attachment.id))
    if (missing.length > 0) void Promise.all(missing.map(async (attachment) => {
      const blob = await resolveAttachmentBlob(attachment)
      if (!blob) return undefined
      const previewUrl = URL.createObjectURL(blob)
      generatedUrls.current.add(previewUrl)
      return [attachment.id, previewUrl] as const
    })).then((entries) => {
      if (cancelled) return
      const urls = new Map(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)))
      onChange(attachments.map((item) => urls.has(item.id) ? { ...item, previewUrl: urls.get(item.id) } : item))
    }).catch(() => undefined).finally(() => missing.forEach((attachment) => loadingPreviews.current.delete(attachment.id)))
    return () => { cancelled = true }
  }, [attachments, onChange])

  useEffect(() => () => {
    for (const url of generatedUrls.current) window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    generatedUrls.current.clear()
  }, [])

  const validate = (file: File): { error: string } | { category: AttachmentCategory } => {
    const category = attachmentCategory(file.name)
    if (!category || (category === 'image' && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return { error: t('attachments.error.unsupported') }
    if (file.size > MAX_ATTACHMENT_BYTES) return { error: t('attachments.error.tooLarge') }
    return { category }
  }

  const selectFiles = (event: ChangeEvent<HTMLInputElement>, replaceId?: string) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    onError('')
    const retained = replaceId ? attachments.filter((attachment) => attachment.id !== replaceId) : attachments
    const fingerprints = new Set(retained.map(attachmentFingerprint))
    const additions: AttachmentDraft[] = []
    let firstError = ''

    for (const file of files) {
      const result = validate(file)
      if ('error' in result) { firstError ||= result.error; continue }
      const fingerprint = attachmentFingerprint(file)
      if (fingerprints.has(fingerprint)) { firstError ||= t('attachments.error.duplicate'); continue }
      fingerprints.add(fingerprint)
      const id = replaceId ?? makeAttachmentId()
      const previewUrl = result.category === 'image' ? URL.createObjectURL(file) : undefined
      if (previewUrl) generatedUrls.current.add(previewUrl)
      additions.push({ id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, category: result.category, lastModified: file.lastModified, blob: file, previewUrl })
      if (replaceId) break
    }

    if (firstError) onError(firstError)
    if (additions.length > 0) onChange([...retained, ...additions])
    setReplacingId(undefined)
  }

  const remove = (attachment: AttachmentDraft) => {
    if (attachment.previewUrl && generatedUrls.current.has(attachment.previewUrl)) {
      URL.revokeObjectURL(attachment.previewUrl)
      generatedUrls.current.delete(attachment.previewUrl)
    }
    onChange(attachments.filter((item) => item.id !== attachment.id))
  }

  const viewImage = (attachment: AttachmentDraft) => {
    if (!attachment.previewUrl) return
    setViewerReceipt({ url: attachment.previewUrl, fileName: attachment.name, mimeType: attachment.type, size: attachment.size, width: 0, height: 0 })
  }

  const openDocument = async (attachment: AttachmentDraft) => {
    const pendingTab = attachment.category === 'pdf' ? window.open('', '_blank') : null
    try {
      const blob = await resolveAttachmentBlob(attachment)
      if (!blob) throw new Error('Missing attachment')
      const url = URL.createObjectURL(blob)
      if (attachment.category === 'pdf' && pendingTab) pendingTab.location.href = url
      else {
        pendingTab?.close()
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = attachment.name
        anchor.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      pendingTab?.close()
      onError(t('attachments.error.open'))
    }
  }

  const iconFor = (category: AttachmentDraft['category']) => category === 'image' ? ImageIcon : category === 'pdf' ? FileText : category === 'excel' ? FileSpreadsheet : ReceiptText

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{t('attachments.label')} <span className="font-normal text-slate-400">({t('receipt.optional')})</span></label>
      <input ref={addInputRef} id="expense-attachments-input" type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={(event) => selectFiles(event)} className="sr-only" />
      <input ref={replaceInputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={(event) => selectFiles(event, replacingId)} className="sr-only" aria-label={t('attachments.replace')} />
      <button type="button" onClick={() => addInputRef.current?.click()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50"><Plus className="h-5 w-5" />{t('attachments.add')}</button>
      <p className="mt-2 text-xs text-slate-500">{t('attachments.help')}</p>

      {attachments.length > 0 ? <div className="mt-3 space-y-2">{attachments.map((attachment) => {
        const Icon = iconFor(attachment.category)
        const isReading = ocrAttachmentId === attachment.id
        return <div key={attachment.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex min-w-0 items-center gap-3">
            {attachment.category === 'image' && attachment.previewUrl ? <button type="button" onClick={() => viewImage(attachment)} className="shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label={t('attachments.view')}><img src={attachment.previewUrl} alt={attachment.name} className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-cover" /></button> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500"><Icon className="h-6 w-6" /></div>}
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900" title={attachment.name}>{attachment.name}</p><p className="text-xs uppercase text-slate-500">{attachment.category} · {formatAttachmentSize(attachment.size)}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
            {attachment.category === 'image' ? <><button type="button" onClick={() => viewImage(attachment)} disabled={!attachment.previewUrl} className="min-h-9 text-emerald-700 disabled:opacity-40">{t('attachments.view')}</button><button type="button" onClick={() => onReadAmount(attachment)} disabled={Boolean(ocrAttachmentId)} className="inline-flex min-h-9 items-center gap-1.5 text-emerald-700 disabled:opacity-50">{isReading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{t('attachments.readAmount')}</button></> : <button type="button" onClick={() => void openDocument(attachment)} className="inline-flex min-h-9 items-center gap-1.5 text-emerald-700"><Download className="h-4 w-4" />{attachment.category === 'pdf' ? t('attachments.viewPdf') : t('attachments.open')}</button>}
            <button type="button" onClick={() => { setReplacingId(attachment.id); window.setTimeout(() => replaceInputRef.current?.click()) }} className="inline-flex min-h-9 items-center gap-1 text-slate-600"><Replace className="h-3.5 w-3.5" />{t('attachments.replace')}</button>
            <button type="button" onClick={() => remove(attachment)} className="inline-flex min-h-9 items-center gap-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" />{t('attachments.remove')}</button>
          </div>
        </div>
      })}</div> : null}
      <ReceiptViewerModal receipt={viewerReceipt} onClose={() => setViewerReceipt(undefined)} />
    </div>
  )
}
