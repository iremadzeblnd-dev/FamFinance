import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Image as ImageIcon, Paperclip, ReceiptText, X } from 'lucide-react'
import type { ReceiptAttachment, Transaction } from '../types/app'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'
import { getAttachmentBlob } from '../services/attachmentStorage'
import { formatAttachmentSize, transactionAttachments, type AttachmentReference } from '../utils/attachments'
import { ReceiptViewerModal } from './ReceiptViewerModal'

interface TransactionAttachmentsModalProps {
  transaction?: Transaction
  onClose: () => void
}

async function referenceBlob(attachment: AttachmentReference) {
  if (attachment.legacyUrl) return fetch(attachment.legacyUrl).then((response) => response.blob())
  return getAttachmentBlob(attachment.id)
}

export function TransactionAttachmentsModal({ transaction, onClose }: TransactionAttachmentsModalProps) {
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  const attachments = useMemo(() => transaction ? transactionAttachments(transaction) : [], [transaction])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [viewerReceipt, setViewerReceipt] = useState<ReceiptAttachment>()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!transaction) return
    let cancelled = false
    const createdUrls: string[] = []
    void Promise.all(attachments.filter((attachment) => attachment.category === 'image').map(async (attachment) => {
      if (attachment.legacyUrl) return [attachment.id, attachment.legacyUrl] as const
      const blob = await referenceBlob(attachment)
      if (!blob) return undefined
      const url = URL.createObjectURL(blob)
      createdUrls.push(url)
      return [attachment.id, url] as const
    })).then((entries) => {
      if (!cancelled) setImageUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))))
    }).catch(() => { if (!cancelled) setError(translate(preferences.language, 'attachments.error.open')) })
    return () => { cancelled = true; createdUrls.forEach((url) => window.setTimeout(() => URL.revokeObjectURL(url), 60_000)) }
  }, [attachments, transaction, preferences.language])

  if (!transaction) return null

  const open = async (attachment: AttachmentReference) => {
    if (attachment.category === 'image') {
      const url = imageUrls[attachment.id]
      if (url) setViewerReceipt({ url, fileName: attachment.name, mimeType: attachment.type, size: attachment.size, width: 0, height: 0 })
      return
    }
    const pendingTab = attachment.category === 'pdf' ? window.open('', '_blank') : null
    try {
      const blob = await referenceBlob(attachment)
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
      setError(t('attachments.error.open'))
    }
  }

  const iconFor = (category: AttachmentReference['category']) => category === 'image' ? ImageIcon : category === 'pdf' ? FileText : category === 'excel' ? FileSpreadsheet : ReceiptText

  return <div className="fixed inset-0 z-[65] flex items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-4 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="attachments-modal-title">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 id="attachments-modal-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Paperclip className="h-5 w-5" />{t('attachments.title')}</h3><button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label={t('common.close')}><X className="h-5 w-5" /></button></div>
      <div className="space-y-2">{attachments.map((attachment) => { const Icon = iconFor(attachment.category); const imageUrl = imageUrls[attachment.id]; return <div key={attachment.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {attachment.category === 'image' && imageUrl ? <button type="button" onClick={() => void open(attachment)} className="shrink-0 rounded-xl"><img src={imageUrl} alt={attachment.name} className="h-14 w-14 rounded-xl object-cover" /></button> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500"><Icon className="h-6 w-6" /></div>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{attachment.name}</p><p className="text-xs uppercase text-slate-500">{attachment.category} · {formatAttachmentSize(attachment.size)}</p><button type="button" onClick={() => void open(attachment)} className="mt-1 min-h-8 text-sm font-medium text-emerald-700">{attachment.category === 'image' ? t('attachments.view') : attachment.category === 'pdf' ? t('attachments.viewPdf') : t('attachments.open')}</button></div>
      </div>})}</div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <button type="button" onClick={onClose} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white">{t('common.close')}</button>
    </div>
    <ReceiptViewerModal receipt={viewerReceipt} onClose={() => setViewerReceipt(undefined)} />
  </div>
}
