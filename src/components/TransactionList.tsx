import { useState } from 'react'
import type { Transaction } from '../types/app'
import { ArrowDownLeft, ArrowUpRight, Paperclip } from 'lucide-react'
import { useFinance } from '../state/FinanceContext'
import { translate } from '../i18n/translations'
import { TransactionAttachmentsModal } from './TransactionAttachmentsModal'
import { transactionAttachments } from '../utils/attachments'
import { formatCurrency } from '../utils/formatters'
import { localeMap } from '../i18n/translations'

interface TransactionListProps {
  transactions: Transaction[]
  limit?: number
}

export function TransactionList({ transactions, limit }: TransactionListProps) {
  const { preferences } = useFinance()
  const t = (key: string) => translate(preferences.language, key)
  const [attachmentTransaction, setAttachmentTransaction] = useState<Transaction>()
  const items = typeof limit === 'number' ? transactions.slice(0, limit) : transactions

  return (
    <>
    <div className="space-y-3">
      {items.map((item) => {
        const isIncome = item.type === 'income'
        const attachmentCount = transactionAttachments(item).length

        return (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>

              <div>
                <p className="font-medium text-slate-800">{item.description || item.category}</p>
                <p className="text-sm text-slate-500">{item.category}</p>
                <p className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })}</p>
                {item.type === 'expense' && attachmentCount > 0 ? <button type="button" onClick={() => setAttachmentTransaction(item)} className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-600" aria-label={t('attachments.viewAll')}><Paperclip className="h-3.5 w-3.5" />{attachmentCount} {t(attachmentCount === 1 ? 'attachments.file' : 'attachments.files')}</button> : null}
              </div>
            </div>

            <div className="text-right">
              <p className={`font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount, preferences.currency, localeMap[preferences.language])}
              </p>
            </div>
          </div>
        )
      })}
    </div>
    <TransactionAttachmentsModal transaction={attachmentTransaction} onClose={() => setAttachmentTransaction(undefined)} />
    </>
  )
}
