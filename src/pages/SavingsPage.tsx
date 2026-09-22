import { useState } from 'react'
import { Pencil, Plus, Trash2, Target } from 'lucide-react'
import { SimpleFormModal } from '../components/SimpleFormModal'
import { useFinance } from '../state/FinanceContext'
import { formatSavingsDuration, getAverageMonthlySurplus, getCurrentHouseholdSavings, getGoalProgress } from '../utils/savings'
import { formatCurrency } from '../utils/formatters'
import { localeMap } from '../i18n/translations'

const goalFields = [
  { key: 'name', label: 'მიზნის დასახელება', placeholder: 'მაგ: ჩემი სახლი, მანქანა, ბიზნესი...' },
  { key: 'targetAmount', label: 'საჭირო თანხა', type: 'number' as const },
]

const formatMonths = (months: number) => {
  const rounded = Math.ceil(months)
  if (rounded < 12) return `${rounded} თვე`
  const years = Math.floor(rounded / 12)
  const remainder = rounded % 12
  return remainder ? `${years} წელი და ${remainder} თვე` : `${years} წელი`
}

const estimateLabel = (remaining: number, surplus: number | null) => {
  if (remaining <= 0) return 'მიზანი შესრულებულია 🎉'
  if (surplus === null) return 'სავარაუდო ვადის გამოსათვლელად საჭიროა მეტი ფინანსური ისტორია.'
  if (surplus <= 0) return 'ამჟამინდელი მონაცემებით მიზნის ვადის გამოთვლა ვერ ხერხდება.'
  return `დაახლოებით ${formatSavingsDuration(remaining / surplus)}`
}

export function SavingsPage() {
  const { savingsGoals, validTransactions: transactions, accounts, preferences, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = useFinance()
  const money = (value: number) => formatCurrency(value, localeMap[preferences.language])
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<typeof savingsGoals[number]>()
  const [plannerGoalId, setPlannerGoalId] = useState<string>()
  const [plannerAmount, setPlannerAmount] = useState('')
  const currentSavings = Math.max(0, getCurrentHouseholdSavings(accounts, transactions))
  const averageSurplus = getAverageMonthlySurplus(transactions)
  const openCreate = () => { setEditingGoal(undefined); setFormOpen(true) }
  const saveGoal = (values: Record<string, string>) => {
    const name = values.name.trim()
    const targetAmount = Number(values.targetAmount)
    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) return
    if (editingGoal) updateSavingsGoal(editingGoal.id, { name, targetAmount })
    else addSavingsGoal({ name, targetAmount })
    setFormOpen(false)
    setEditingGoal(undefined)
  }

  return <><div className="space-y-6"><div className="flex items-center justify-between gap-3"><div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">დანაზოგები</p><h1 className="mt-2 text-3xl font-bold text-slate-900">ჩვენი მიზანი</h1></div><button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white"><Plus className="h-4 w-4" />ახალი მიზანი</button></div>{savingsGoals.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">დანაზოგის მიზნები ჯერ არ გაქვთ</div> : <div className="grid gap-4 md:grid-cols-2">{savingsGoals.map((goal) => { const { remaining, progress } = getGoalProgress(goal, currentSavings); const estimate = estimateLabel(remaining, averageSurplus); const plannerValue = Number(plannerAmount); const plannerEstimate = plannerValue > 0 && remaining > 0 ? formatMonths(remaining / plannerValue) : ''; const detailsOpen = plannerGoalId === goal.id; return <div key={goal.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-2"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-semibold text-slate-900">{goal.name}</h2></div><div className="flex items-center gap-1"><span className="text-sm font-medium text-emerald-700">{Math.round(progress)}%</span><button type="button" onClick={() => { setEditingGoal(goal); setFormOpen(true) }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="მიზნის რედაქტირება"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => { if (window.confirm('ნამდვილად გსურთ მიზნის წაშლა?')) deleteSavingsGoal(goal.id) }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="მიზნის წაშლა"><Trash2 className="h-4 w-4" /></button></div></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">საჭირო თანხა</p><p className="mt-1 text-lg font-bold text-slate-900">{money(goal.targetAmount)}</p></div><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">უკვე დაგროვილია</p><p className="mt-1 text-lg font-bold text-slate-900">{money(currentSavings)}</p></div><div className="rounded-2xl bg-sky-50 p-3"><p className="text-xs text-sky-700">დარჩენილია</p><p className="mt-1 text-lg font-bold text-slate-900">{money(remaining)}</p></div></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-sm text-slate-500">ამჟამინდელი ტემპით: <span className="font-medium text-slate-700">{estimate}</span></p><button type="button" onClick={() => { setPlannerGoalId(detailsOpen ? undefined : goal.id); setPlannerAmount('') }} className="mt-4 min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{detailsOpen ? 'დეტალების დამალვა' : 'დეტალურად'}</button>{detailsOpen ? <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="font-medium text-slate-900">თუ მეტს დავზოგავთ?</p><label className="mt-3 block text-sm text-slate-600">თვეში:<input type="number" min="1" inputMode="decimal" value={plannerAmount} onChange={(event) => setPlannerAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500" placeholder="3000" /></label>{plannerEstimate ? <p className="mt-3 text-sm text-slate-600">თუ თვეში {money(plannerValue)}-ს დაზოგავთ, მიზნის მიღწევას დაახლოებით <span className="font-semibold text-slate-900">{plannerEstimate}</span> დასჭირდება.</p> : null}</div> : null}</div> })}</div>}</div><SimpleFormModal isOpen={formOpen} title={editingGoal ? 'მიზნის რედაქტირება' : 'მიზნის შექმნა'} fields={goalFields} initialValues={{ name: editingGoal?.name ?? '', targetAmount: String(editingGoal?.targetAmount ?? '') }} onClose={() => setFormOpen(false)} onSubmit={saveGoal} /></>
}
