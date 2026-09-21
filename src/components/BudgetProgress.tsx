import { formatCurrency } from '../utils/formatters'
import { useFinance } from '../state/FinanceContext'
import { localeMap } from '../i18n/translations'

interface BudgetProgressProps {
  category: string
  spent: number
  limit: number
}

export function BudgetProgress({ category, spent, limit }: BudgetProgressProps) {
  const { preferences } = useFinance()
  const money = (value: number) => formatCurrency(value, preferences.currency, localeMap[preferences.language])
  const percent = Math.min((spent / limit) * 100, 100)
  const percentText = `${Math.round((spent / limit) * 100)}%`
  const isWarning = percent >= 80

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-slate-800">{category}</p>
        <span className={`text-xs font-medium ${isWarning ? 'text-amber-600' : 'text-slate-500'}`}>
          {money(spent)} / {money(limit)}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">{isWarning ? 'საკმაოდ ახლოსაა ლიმიტთან' : 'მიღვაწია'}</p>
        <span className="text-xs font-semibold text-slate-700">{percentText} გამოყენებულია</span>
      </div>
    </div>
  )
}
