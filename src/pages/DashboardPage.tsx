import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Wallet, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { StatCard } from '../components/StatCard'
import { TransactionList } from '../components/TransactionList'
import { useFinance } from '../state/FinanceContext'
import { calculateCategoryExpenses, calculateExpenses, calculateIncome, calculateNetBalance, calculateBudgetUsage } from '../utils/calculations'
import { formatSavingsDuration, getAverageMonthlySurplus, getCurrentHouseholdSavings, getGoalProgress } from '../utils/savings'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/formatters'
import { localeMap } from '../i18n/translations'
import { MonthCalendarSelector } from '../components/MonthCalendarSelector'

const chartColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#a855f7', '#64748b']

interface DashboardPageProps { onOpenTransaction: (type: 'income' | 'expense') => void }

export function DashboardPage({ onOpenTransaction }: DashboardPageProps) {
  const { validTransactions: transactions, budgets, savingsGoals, accounts, preferences } = useFinance()
  const locale = localeMap[preferences.language]
  const money = (value: number) => formatCurrency(value, preferences.currency, locale)
  const [month, setMonth] = useState('2026-09')
  const income = calculateIncome(transactions, month)
  const expense = calculateExpenses(transactions, month)
  const remaining = calculateNetBalance(transactions, month)
  const savings = getCurrentHouseholdSavings(accounts, transactions)
  const primaryGoal = savingsGoals[savingsGoals.length - 1]
  const goalProgress = primaryGoal ? getGoalProgress(primaryGoal, savings) : null
  const averageSurplus = getAverageMonthlySurplus(transactions)
  const goalMonths = primaryGoal && goalProgress && averageSurplus && averageSurplus > 0 ? goalProgress.remaining / averageSurplus : null
  const recentTransactions = transactions.filter((item) => item.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
  const expenseBreakdown = calculateCategoryExpenses(transactions, month)
  const monthBudgets = budgets.filter((budget) => budget.month === month)
  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">მოგესალმებით 👋</p>
        <div className="mt-2"><MonthCalendarSelector month={month} locale={locale} onMonthChange={setMonth} variant="hero" /></div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">დარჩენილი თანხა</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">{money(remaining)}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="შემოსავალი" amount={income} comparison="არჩეული თვე" icon={ArrowDownCircle} accent="income" />
        <StatCard title="ხარჯი" amount={expense} comparison="არჩეული თვე" icon={ArrowUpCircle} accent="expense" />
        <StatCard title="დანაზოგი" amount={savings} comparison="ყველა მიზანი" icon={PiggyBank} accent="savings" />
        <StatCard title="ბალანსი" amount={remaining} comparison="მიმდინარე" icon={Wallet} accent="neutral" />
      </div>

      {primaryGoal && goalProgress ? <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">🎯 ჩვენი მიზანი</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{primaryGoal.name}</h2></div><span className="text-sm font-semibold text-emerald-700">{Math.round(goalProgress.progress)}%</span></div><div className="mt-3 flex items-center justify-between text-sm text-slate-500"><span>{money(savings)} / {money(primaryGoal.targetAmount)}</span><span>{goalMonths ? `≈ ${formatSavingsDuration(goalMonths)}` : 'ვადა უცნობია'}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${goalProgress.progress}%` }} /></div></div> : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">ბოლო ტრანზაქციები</h2>
            <Link to="/transactions" className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">ყველას ნახვა</Link>
          </div>
          <TransactionList transactions={recentTransactions} limit={5} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 sm:text-xl">სად იხარჯება თანხა?</h2>
          <div className="h-56 w-full sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" nameKey="name" innerRadius={42} outerRadius={76} paddingAngle={3}>
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [money(Number(value ?? 0)), 'ძალა']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2">
            {expenseBreakdown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-800">{money(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">მთვიური ბიუჯეტი</h2>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="space-y-4">
            {monthBudgets.slice(0, 3).map((item) => {
              const spent = calculateBudgetUsage(item, transactions)
              return (
              <div key={item.category}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>{item.category}</span>
                  <span>{money(spent)} / {money(item.limit)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((spent / item.limit) * 100, 100)}%` }} />
                </div>
              </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">სწრაფი ქმედებები</h2>
          <div className="mt-4 space-y-3">
            <button onClick={() => onOpenTransaction('income')} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-left font-medium text-white transition hover:bg-emerald-500 active:scale-[0.99]">+ შემოსავლის დამატება</button>
            <button onClick={() => onOpenTransaction('expense')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]">+ ხარჯის დამატება</button>
          </div>
        </div>
      </div>
    </div>
  )
}
