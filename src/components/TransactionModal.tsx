import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { Account, FamilyMember, Transaction, TransactionType } from '../types/app'
import { translate } from '../i18n/translations'
import { useFinance } from '../state/FinanceContext'
import { prepareReceiptImageForOcr, readReceiptAmount } from '../services/receiptOcr'
import { AttachmentField, resolveAttachmentBlob, type AttachmentDraft } from './AttachmentField'
import { transactionAttachments } from '../utils/attachments'
import { formatCurrency } from '../utils/formatters'
import { localeMap } from '../i18n/translations'
import { defaultIncomeCategories } from '../data/categories'
import { useAuth } from '../state/AuthContext'
import { fetchTransactionFormOptions } from '../services/financeDatabase'
import { mergeTransactionFormOptions, resolveTransactionSelectionIds } from '../utils/transactionForm'

interface TransactionModalProps {
  isOpen: boolean
  type: TransactionType
  accounts: Account[]
  familyMembers: FamilyMember[]
  initialValue?: Transaction
  onClose: () => void
  onSave: (payload: TransactionFormValues) => void | Promise<void>
}

export interface TransactionFormValues {
  amount: number
  category: string
  description: string
  date: string
  accountId: string
  familyMemberId: string
  expenseScope?: 'personal' | 'shared'
  attachments: AttachmentDraft[]
}

type OcrStatus = 'idle' | 'processing' | 'detected' | 'failed'

export function TransactionModal({ isOpen, type, accounts, familyMembers, initialValue, onClose, onSave }: TransactionModalProps) {
  const { preferences } = useFinance()
  const { user } = useAuth()
  const t = (key: string) => translate(preferences.language, key)
  const ocrRequestRef = useRef(0)
  const [form, setForm] = useState<TransactionFormValues>({ amount: 0, category: defaultIncomeCategories[0], description: '', date: new Date().toISOString().slice(0, 10), accountId: accounts[0]?.id ?? '', familyMemberId: familyMembers[0]?.id ?? '', expenseScope: 'personal', attachments: [] })
  const [availableAccounts, setAvailableAccounts] = useState(accounts)
  const [availableFamilyMembers, setAvailableFamilyMembers] = useState(familyMembers.filter((member) => !member.archived))
  const [error, setError] = useState('')
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrAttachmentId, setOcrAttachmentId] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    ocrRequestRef.current += 1
    if (!isOpen) return
    const localOptions = mergeTransactionFormOptions({ accounts, familyMembers }, { accounts: [], familyMembers: [] })
    setAvailableAccounts(localOptions.accounts)
    setAvailableFamilyMembers(localOptions.familyMembers)
    setForm(initialValue ? {
      amount: initialValue.amount, category: initialValue.category, description: initialValue.description,
      date: initialValue.date, accountId: initialValue.accountId, familyMemberId: initialValue.familyMemberId ?? '',
      expenseScope: initialValue.expenseScope ?? 'personal', attachments: transactionAttachments(initialValue),
    } : {
      amount: 0, category: (type === 'income' ? preferences.incomeCategories[0] : preferences.expenseCategories[0]) ?? '', description: '',
      date: new Date().toISOString().slice(0, 10), accountId: accounts[0]?.id ?? '', familyMemberId: familyMembers[0]?.id ?? '', expenseScope: 'personal', attachments: [],
    })
    setError('')
    setIsProcessingImage(false)
    setOcrStatus('idle')
    setOcrProgress(0)
    setOcrAttachmentId(undefined)
    setIsSaving(false)
  }, [isOpen, type, accounts, familyMembers, initialValue, preferences.incomeCategories, preferences.expenseCategories])

  useEffect(() => {
    if (!isOpen || !user?.id) return
    let active = true
    void fetchTransactionFormOptions(user.id).then((remoteOptions) => {
      if (!active) return
      const options = mergeTransactionFormOptions({ accounts, familyMembers }, remoteOptions)
      setAvailableAccounts(options.accounts)
      setAvailableFamilyMembers(options.familyMembers)
      setForm((current) => ({ ...current, ...resolveTransactionSelectionIds(current, options) }))
    }).catch((loadError) => {
      console.error('Unable to refresh transaction form options', loadError)
    })
    return () => { active = false }
  }, [accounts, familyMembers, isOpen, user?.id])

  if (!isOpen) return null

  const runOcr = async (imageUrl: string, requestId: number, attachmentId: string) => {
    setIsProcessingImage(true)
    setOcrAttachmentId(attachmentId)
    setOcrStatus('processing')
    setOcrProgress(0)
    try {
      const result = await readReceiptAmount(imageUrl, (progress) => {
        if (requestId === ocrRequestRef.current) setOcrProgress(Math.round(progress * 100))
      })
      if (requestId !== ocrRequestRef.current) return
      if (result.amount === undefined) {
        setOcrStatus('failed')
        return
      }
      setForm((current) => ({ ...current, amount: result.amount! }))
      setOcrStatus('detected')
    } catch {
      if (requestId === ocrRequestRef.current) setOcrStatus('failed')
    } finally {
      if (requestId === ocrRequestRef.current) { setIsProcessingImage(false); setOcrAttachmentId(undefined) }
    }
  }

  const readAmountFromAttachment = async (attachment: AttachmentDraft) => {
    if (attachment.category !== 'image' || isProcessingImage) return
    const requestId = ++ocrRequestRef.current
    setError('')
    try {
      setIsProcessingImage(true)
      setOcrAttachmentId(attachment.id)
      setOcrStatus('processing')
      const blob = await resolveAttachmentBlob(attachment)
      if (!blob) throw new Error('Attachment data is missing')
      const file = blob instanceof File ? blob : new File([blob], attachment.name, { type: attachment.type, lastModified: attachment.lastModified })
      const imageUrl = await prepareReceiptImageForOcr(file)
      if (requestId !== ocrRequestRef.current) return
      await runOcr(imageUrl, requestId, attachment.id)
    } catch (preprocessingError) {
      console.error('[receipt-ocr] Unable to prepare selected attachment', preprocessingError)
      if (requestId === ocrRequestRef.current) { setOcrStatus('failed'); setIsProcessingImage(false); setOcrAttachmentId(undefined) }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.amount || form.amount <= 0) return setError(t('transaction.error.amount'))
    if (!form.category) return setError(t('transaction.category'))
    if (type === 'income' && !form.description.trim()) return setError(t('transaction.error.description'))
    if (!form.accountId || !form.familyMemberId) return setError(t('transaction.error.people'))
    setIsSaving(true)
    try {
      await onSave({ ...form, description: type === 'expense' ? (form.description.trim() || form.category) : form.description.trim(), attachments: type === 'expense' ? form.attachments : [] })
      onClose()
    } catch {
      setError(t('attachments.error.save'))
      setIsSaving(false)
    }
  }

  const configuredCategories = type === 'income' ? preferences.incomeCategories : preferences.expenseCategories
  const categories = form.category && !configuredCategories.includes(form.category) ? [form.category, ...configuredCategories] : configuredCategories
  const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white'
  const updateCategory = (category: string) => setForm((current) => ({ ...current, category }))
  const updateDescription = (description: string) => setForm((current) => ({ ...current, description }))

  return (
    <div className={`theme-${preferences.theme} fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4`} role="presentation">
      <div className="max-h-[94dvh] w-full overflow-x-hidden overflow-y-auto rounded-t-[28px] bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <h3 id="transaction-modal-title" className="text-xl font-semibold text-slate-900">{type === 'income' ? t('common.addIncome') : t('common.addExpense')}</h3>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.amount')}</label>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={form.amount || ''} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className={`${inputClass} text-xl font-semibold`} placeholder="0" />
            {type === 'expense' && ocrStatus === 'processing' ? <p className="mt-2 flex items-center gap-2 text-sm text-slate-500" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />{t('receipt.ocrReading')}{ocrProgress > 0 ? ` ${ocrProgress}%` : ''}</p> : null}
            {type === 'expense' && ocrStatus === 'detected' ? <p className="mt-2 text-sm font-medium text-emerald-700" role="status">{t('receipt.detectedBadge')}: {formatCurrency(form.amount, localeMap[preferences.language])}</p> : null}
            {type === 'expense' && ocrStatus === 'failed' ? <p className="mt-2 text-sm font-medium text-amber-700" role="status">{t('receipt.ocrFailed')}</p> : null}
          </div>
          {type === 'expense' ? <div><label className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.expenseType')}</label><select value={form.expenseScope} onChange={(event) => setForm((current) => ({ ...current, expenseScope: event.target.value as 'personal' | 'shared' }))} className={inputClass}><option value="personal">{t('transaction.personal')}</option><option value="shared">{t('transaction.shared')}</option></select></div> : null}
          <div><label className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.category')}</label><select value={form.category} onChange={(event) => updateCategory(event.target.value)} className={inputClass}>{categories.length === 0 ? <option value="">{t('transaction.category')}</option> : null}{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>

          <div><label htmlFor="transaction-description" className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.description')}</label><input id="transaction-description" name="description" type="text" value={form.description} onChange={(event) => updateDescription(event.target.value)} className={inputClass} placeholder={t(type === 'income' ? 'transaction.incomePlaceholder' : 'transaction.expensePlaceholder')} autoComplete="off" /></div>
          {type === 'expense' ? <AttachmentField attachments={form.attachments} onChange={(attachments) => setForm((current) => ({ ...current, attachments }))} onError={setError} onReadAmount={(attachment) => void readAmountFromAttachment(attachment)} ocrAttachmentId={ocrAttachmentId} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.date')}</label><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={inputClass} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.account')}</label><select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} className={inputClass}>{availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">{t('transaction.familyMember')}</label><select value={form.familyMemberId} onChange={(event) => setForm({ ...form, familyMemberId: event.target.value })} className={inputClass}>{availableFamilyMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
          {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50">{t('common.cancel')}</button>
            <button type="submit" disabled={isProcessingImage || isSaving} className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? t('attachments.saving') : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
