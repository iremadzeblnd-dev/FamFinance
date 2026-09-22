import { Landmark, PiggyBank, Wallet, Plus, Pencil, Trash2 } from 'lucide-react'
import { useFinance } from '../state/FinanceContext'
import { calculateAccountBalance } from '../utils/calculations'
import { SimpleFormModal } from '../components/SimpleFormModal'
import { useState } from 'react'
import { formatCurrency } from '../utils/formatters'
import { localeMap } from '../i18n/translations'

const icons = { wallet: Wallet, bank: Landmark, 'piggy-bank': PiggyBank }

export function AccountsPage() {
  const { accounts, validTransactions: transactions, preferences, addAccount, updateAccount, deleteAccount } = useFinance()
  const money = (value: number) => formatCurrency(value, localeMap[preferences.language])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<typeof accounts[number]>()
  const saveAccount = (values: Record<string, string>) => { const input = { name: values.name.trim(), icon: editing?.icon ?? 'wallet', openingBalance: Number(values.openingBalance), type: 'სხვა' }; if (!Number.isFinite(input.openingBalance) || input.openingBalance < 0) return; if (editing) updateAccount(editing.id, { ...editing, ...input }); else addAccount(input); setFormOpen(false); setEditing(undefined) }
  const removeAccount = (id: string) => { if (window.confirm('ნამდვილად გსურთ ანგარიშის წაშლა?')) deleteAccount(id) }
  return <><div className="space-y-6"><div className="flex items-center justify-between gap-3"><div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">ანგარიშები</p><h1 className="mt-2 text-3xl font-bold text-slate-900">ბალანსები</h1></div><button type="button" onClick={() => { setEditing(undefined); setFormOpen(true) }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white"><Plus className="h-4 w-4" />ანგარიშის დამატება</button></div><div className="grid gap-4 md:grid-cols-3">{accounts.map((account) => { const Icon = icons[account.icon as keyof typeof icons] || Wallet; return <div key={account.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></div><div className="flex gap-1"><button type="button" onClick={() => { setEditing(account); setFormOpen(true) }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="ანგარიშის რედაქტირება"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => removeAccount(account.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="ანგარიშის წაშლა"><Trash2 className="h-4 w-4" /></button></div></div><p className="text-lg font-semibold text-slate-900">{account.name}</p><p className="mt-3 text-3xl font-bold text-slate-900">{money(calculateAccountBalance(account, transactions))}</p></div> })}</div></div><SimpleFormModal isOpen={formOpen} title={editing ? 'ანგარიშის რედაქტირება' : 'ანგარიშის დამატება'} fields={[{ key: 'name', label: 'სახელი' }, { key: 'openingBalance', label: 'საწყისი ბალანსი', type: 'number' }]} initialValues={{ name: editing?.name ?? '', openingBalance: String(editing?.openingBalance ?? editing?.balance ?? 0) }} onClose={() => setFormOpen(false)} onSubmit={saveAccount} /></>
}
