import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import { SimpleFormModal } from '../components/SimpleFormModal'
import { TransactionModal, type TransactionFormValues } from '../components/TransactionModal'
import { useFinance } from '../state/FinanceContext'
import { calculateMemberTotals, monthKey } from '../utils/calculations'
import type { AttachmentMetadata, FamilyMember, Transaction, TransactionType } from '../types/app'
import { deleteAttachmentBlobs, saveAttachmentBlobs } from '../services/attachmentStorage'
import { localeMap } from '../i18n/translations'
import { formatCurrency } from '../utils/formatters'
import { MonthCalendarSelector } from '../components/MonthCalendarSelector'

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })

export function FamilyPage() {
  const { familyMembers, transactions, validTransactions, accounts, preferences, addFamilyMember, updateFamilyMember, deleteFamilyMember, archiveFamilyMember, addTransaction, updateTransaction, deleteTransaction } = useFinance()
  const [month, setMonth] = useState('2026-09')
  const [selectedMemberId, setSelectedMemberId] = useState<string>()
  const [memberFormOpen, setMemberFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember>()
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [transactionOpen, setTransactionOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction>()

  const activeMembers = familyMembers.filter((member) => !member.archived)
  const selectedMember = familyMembers.find((member) => member.id === selectedMemberId)
  const visibleTransactions = useMemo(() => validTransactions.filter((item) => monthKey(item.date) === month).sort((a, b) => b.date.localeCompare(a.date)), [validTransactions, month])
  const householdIncome = visibleTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const householdExpense = visibleTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const locale = localeMap[preferences.language]
  const money = (value: number) => formatCurrency(value, preferences.currency, locale)

  const openCreateTransaction = (type: TransactionType) => { setTransactionType(type); setEditingTransaction(undefined); setTransactionOpen(true) }
  const openEditTransaction = (transaction: Transaction) => { setTransactionType(transaction.type); setEditingTransaction(transaction); setTransactionOpen(true) }
  const saveTransaction = async (value: TransactionFormValues) => {
    const attachments: AttachmentMetadata[] = []
    const blobs: { id: string; blob: Blob }[] = []
    for (const attachment of value.attachments) {
      if (attachment.blob) blobs.push({ id: attachment.id, blob: attachment.blob })
      else if (attachment.legacyUrl) blobs.push({ id: attachment.id, blob: await fetch(attachment.legacyUrl).then((response) => response.blob()) })
      attachments.push({ id: attachment.id, name: attachment.name, type: attachment.type, size: attachment.size, category: attachment.category, lastModified: attachment.lastModified })
    }
    await saveAttachmentBlobs(blobs)
    const input = { type: editingTransaction?.type ?? transactionType, amount: value.amount, category: value.category, description: value.description, date: value.date, accountId: value.accountId, familyMemberId: selectedMember?.id ?? value.familyMemberId, expenseScope: value.expenseScope, attachments, receiptAttachment: undefined }
    if (editingTransaction) updateTransaction(editingTransaction.id, input); else addTransaction(input)
    const retainedIds = new Set(attachments.map((attachment) => attachment.id))
    const removedIds = editingTransaction?.attachments?.filter((attachment) => !retainedIds.has(attachment.id)).map((attachment) => attachment.id) ?? []
    void deleteAttachmentBlobs(removedIds).catch((error) => console.error('Unable to remove replaced attachments', error))
    setTransactionOpen(false)
  }
  const removeTransaction = (id: string) => { if (window.confirm('ნამდვილად გსურთ ამ ტრანზაქციის წაშლა?')) deleteTransaction(id) }
  const saveMember = (values: Record<string, string>) => { const input = { name: values.name.trim(), role: values.role.trim() || undefined }; if (editingMember) updateFamilyMember(editingMember.id, { ...editingMember, ...input }); else addFamilyMember(input); setMemberFormOpen(false); setEditingMember(undefined) }
  const removeMember = (member: FamilyMember) => {
    if (transactions.some((item) => item.familyMemberId === member.id)) { if (window.confirm('ამ ოჯახის წევრს აქვს ფინანსური ისტორია. არქივში გადატანა?')) archiveFamilyMember(member.id); return }
    if (window.confirm('ნამდვილად გსურთ ოჯახის წევრის წაშლა?')) deleteFamilyMember(member.id)
  }
  const toggleMember = (member: FamilyMember) => {
    if (selectedMemberId === member.id) return setSelectedMemberId(undefined)
    setSelectedMemberId(member.id)
    const firstMonth = member.createdAt?.slice(0, 7)
    if (firstMonth && month < firstMonth) setMonth(firstMonth)
  }

  return <div className="space-y-4 sm:space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">ოჯახი</p><h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">ოჯახის ფინანსები</h1></div><button type="button" onClick={() => { setEditingMember(undefined); setMemberFormOpen(true) }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white"><Plus className="h-4 w-4" />წევრის დამატება</button></div>
    <MonthCalendarSelector month={month} locale={locale} onMonthChange={setMonth} minDate={selectedMember?.createdAt} />
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-xl font-semibold text-slate-900">ოჯახის საერთო</h2><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm text-emerald-700">საერთო შემოსავალი</p><p className="mt-1 text-2xl font-bold text-slate-900">{money(householdIncome)}</p></div><div className="rounded-2xl bg-rose-50 p-4"><p className="text-sm text-rose-700">საერთო ხარჯი</p><p className="mt-1 text-2xl font-bold text-slate-900">{money(householdExpense)}</p></div><div className="rounded-2xl bg-sky-50 p-4"><p className="text-sm text-sky-700">დარჩენილი</p><p className="mt-1 text-2xl font-bold text-slate-900">{money(householdIncome - householdExpense)}</p></div></div></div>
    <div className="grid gap-4 lg:grid-cols-2">{activeMembers.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">ოჯახის წევრები ჯერ არ არის დამატებული</div> : activeMembers.map((member) => { const totals = calculateMemberTotals(member, validTransactions, month); const isSelected = selectedMemberId === member.id; return <div key={member.id} className={`rounded-3xl border bg-white p-4 shadow-sm transition sm:p-5 ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'}`}><button type="button" onClick={() => toggleMember(member)} className="block w-full text-left"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">{member.name}</h2>{member.role ? <p className="mt-1 text-sm text-slate-500">{member.role}</p> : null}</div><span className="text-sm font-medium text-emerald-700">{isSelected ? 'დახურვა' : 'დეტალები'}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs uppercase tracking-[0.12em] text-emerald-700">შემოსავალი</p><p className="mt-1 text-xl font-bold text-slate-900">{money(totals.income)}</p></div><div className="rounded-2xl bg-rose-50 p-3"><p className="text-xs uppercase tracking-[0.12em] text-rose-700">ხარჯი</p><p className="mt-1 text-xl font-bold text-slate-900">{money(totals.expense)}</p></div><div className="rounded-2xl bg-sky-50 p-3"><p className="text-xs uppercase tracking-[0.12em] text-sky-700">დარჩენილი</p><p className="mt-1 text-xl font-bold text-slate-900">{money(totals.income - totals.expense)}</p></div></div></button><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setEditingMember(member); setMemberFormOpen(true) }} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"><Pencil className="h-4 w-4" />რედაქტირება</button><button type="button" onClick={() => removeMember(member)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-rose-600" aria-label="წევრის წაშლა"><Trash2 className="h-4 w-4" /></button></div>{isSelected ? <MemberDetails member={member} transactions={visibleTransactions.filter((item) => item.familyMemberId === member.id)} onIncome={() => openCreateTransaction('income')} onExpense={() => openCreateTransaction('expense')} onEdit={openEditTransaction} onDelete={removeTransaction} /> : null}</div> })}</div>
    <SimpleFormModal isOpen={memberFormOpen} title={editingMember ? 'წევრის რედაქტირება' : 'ოჯახის წევრის დამატება'} fields={[{ key: 'name', label: 'სახელი' }, { key: 'role', label: 'როლი', placeholder: 'ოჯახის წევრი' }]} initialValues={{ name: editingMember?.name ?? '', role: editingMember?.role ?? '' }} onClose={() => setMemberFormOpen(false)} onSubmit={saveMember} />
    <TransactionModal isOpen={transactionOpen} type={transactionType} accounts={accounts} familyMembers={selectedMember ? [selectedMember] : activeMembers} initialValue={editingTransaction} onClose={() => setTransactionOpen(false)} onSave={saveTransaction} />
  </div>
}

function MemberDetails({ member, transactions, onIncome, onExpense, onEdit, onDelete }: { member: FamilyMember; transactions: Transaction[]; onIncome: () => void; onExpense: () => void; onEdit: (transaction: Transaction) => void; onDelete: (id: string) => void }) {
  const { preferences } = useFinance()
  const money = (value: number) => formatCurrency(value, preferences.currency, localeMap[preferences.language])
  return <div className="mt-4 border-t border-slate-200 pt-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">{member.name} — ტრანზაქციები</h3><button type="button" onClick={() => document.activeElement instanceof HTMLElement && document.activeElement.blur()} className="text-slate-400" aria-label="დეტალები"><X className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={onIncome} className="min-h-11 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white">+ შემოსავალი</button><button type="button" onClick={onExpense} className="min-h-11 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white">+ ხარჯი</button></div><div className="mt-4 space-y-2">{transactions.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">ამ თვეში ტრანზაქციები არ არის</p> : transactions.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3"><div className="flex min-w-0 items-center gap-2">{item.type === 'income' ? <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-600" />}<div className="min-w-0"><p className="truncate font-medium text-slate-800">{item.description || item.category}</p><p className="text-xs text-slate-500">{item.category} · {formatDate(item.date)}</p></div></div><div className="flex items-center gap-2"><span className={`font-semibold ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</span><button type="button" onClick={() => onEdit(item)} className="text-xs text-slate-500">რედაქტირება</button><button type="button" onClick={() => onDelete(item.id)} className="text-xs text-rose-600">წაშლა</button></div></div>)}</div></div>
}
