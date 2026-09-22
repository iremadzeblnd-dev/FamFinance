import type { LucideIcon } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { useFinance } from '../state/FinanceContext'
import { localeMap } from '../i18n/translations'

interface StatCardProps {
  title: string
  amount: number
  comparison?: string
  icon: LucideIcon
  accent?: 'income' | 'expense' | 'neutral' | 'savings'
}

const accentStyles = {
  income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expense: 'bg-rose-50 text-rose-700 border-rose-200',
  savings: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function StatCard({ title, amount, comparison, icon: Icon, accent = 'neutral' }: StatCardProps) {
  const { preferences } = useFinance()
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-slate-900">{formatCurrency(amount, localeMap[preferences.language])}</p>
      </div>

      {comparison ? <p className="mt-3 text-xs text-slate-500">{comparison}</p> : null}
    </div>
  )
}
