import { useMemo, useState } from 'react'
import { Paperclip, Search, SlidersHorizontal } from 'lucide-react'
import type { Transaction } from '../types/app'
import { useFinance } from '../state/FinanceContext'
import { TransactionAttachmentsModal } from '../components/TransactionAttachmentsModal'
import { translate } from '../i18n/translations'
import { transactionAttachments } from '../utils/attachments'
import { formatCurrency } from '../utils/formatters'
import { localeMap } from '../i18n/translations'

interface TransactionsPageProps { onEdit: (transaction: Transaction) => void }

export function TransactionsPage({ onEdit }: TransactionsPageProps) {
  const { validTransactions: transactions, accounts, familyMembers, deleteTransaction, preferences } = useFinance()
  const activeFamilyMembers = familyMembers.filter((member) => !member.archived)
  const t = (key: string) => translate(preferences.language, key)
  const [attachmentTransaction, setAttachmentTransaction] = useState<Transaction>()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [familyMemberId, setFamilyMemberId] = useState('all')

  const categories = Array.from(new Set(transactions.map((item) => item.category)))
  const filteredTransactions = useMemo(() => transactions.filter((item) => {
    const account = accounts.find((entry) => entry.id === item.accountId)?.name ?? item.accountId
    const member = familyMembers.find((entry) => entry.id === item.familyMemberId)?.name ?? item.familyMemberId ?? ''
    const query = search.trim().toLocaleLowerCase('ka-GE')
    const matchesSearch = !query || [item.description, item.category, account, member].some((value) => value?.toLocaleLowerCase('ka-GE').includes(query))
    return matchesSearch && (type === 'all' || item.type === type) && (category === 'all' || item.category === category) && (accountId === 'all' || item.accountId === accountId) && (familyMemberId === 'all' || item.familyMemberId === familyMemberId)
  }).sort((a, b) => b.date.localeCompare(a.date)), [transactions, accounts, familyMembers, search, type, category, accountId, familyMemberId])

  const clearFilters = () => { setSearch(''); setType('all'); setCategory('all'); setAccountId('all'); setFamilyMemberId('all') }
  const handleDelete = (id: string) => { if (window.confirm('ნამდვილად გსურთ ამ ტრანზაქციის წაშლა?')) deleteTransaction(id) }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">ტრანზაქციები</p><h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">ყველა მოძრაობა</h1></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative block sm:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500" placeholder="ძებნა" /></label>
          <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"><option value="all">ყველა ტიპი</option><option value="income">შემოსავალი</option><option value="expense">ხარჯი</option></select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"><option value="all">ყველა კატეგორია</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"><option value="all">ყველა ანგარიში</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={familyMemberId} onChange={(event) => setFamilyMemberId(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"><option value="all">ოჯახის ყველა წევრი</option>{activeFamilyMembers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </div>
        <button type="button" onClick={clearFilters} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><SlidersHorizontal className="h-4 w-4" /> ფილტრების გასუფთავება</button>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {filteredTransactions.length === 0 ? <div className="py-12 text-center text-slate-500">{transactions.length ? 'ტრანზაქცია ვერ მოიძებნა' : 'ტრანზაქციები ჯერ არ არის'}</div> : <div className="space-y-3">{filteredTransactions.map((item) => { const attachmentCount = transactionAttachments(item).length; return <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{item.description || item.category}</p><div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500"><span>{item.category}</span><span>•</span><span>{item.date}</span></div>{item.type === 'expense' && attachmentCount > 0 ? <button type="button" onClick={() => setAttachmentTransaction(item)} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100" aria-label={t('attachments.viewAll')}><Paperclip className="h-4 w-4" />{attachmentCount} {t(attachmentCount === 1 ? 'attachments.file' : 'attachments.files')}</button> : null}</div><div className="flex flex-wrap items-center gap-2 sm:gap-3"><span className={`font-semibold ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount, localeMap[preferences.language])}</span><button type="button" onClick={() => onEdit(item)} className="min-h-10 px-1 text-sm text-slate-500 hover:text-slate-700">რედაქტირება</button><button type="button" onClick={() => handleDelete(item.id)} className="min-h-10 px-1 text-sm text-rose-600 hover:text-rose-700">წაშლა</button></div></div> })}</div>}
      </div>
      <TransactionAttachmentsModal transaction={attachmentTransaction} onClose={() => setAttachmentTransaction(undefined)} />
    </div>
  )
}
