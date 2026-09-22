import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFinance } from '../state/FinanceContext'
import type { Transaction } from '../types/app'
import { translate, localeMap } from '../i18n/translations'
import { formatCurrency } from '../utils/formatters'
import { calculateAccountBalance, calculateBudgetUsage, calculateMemberTotals } from '../utils/calculations'

interface SearchResult {
  id: string
  type: string
  name: string
  detail?: string
  route: string
  transaction?: Transaction
  searchable: unknown[]
}

const normalize = (value: unknown) => String(value ?? '').normalize('NFC').toLocaleLowerCase()

export function GlobalSearch({ onOpenTransaction }: { onOpenTransaction: (transaction: Transaction) => void }) {
  const finance = useFinance()
  const { validTransactions, accounts, familyMembers, budgets, savingsGoals, debts, shoppingItems, preferences } = finance
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const t = (key: string) => translate(preferences.language, key)
  const money = (value: number) => formatCurrency(value, localeMap[preferences.language])

  const source = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = []
    const accountNames = new Map(accounts.map((item) => [item.id, item.name]))
    const memberNames = new Map(familyMembers.map((item) => [item.id, item.name]))

    validTransactions.forEach((item) => {
      const type = item.type === 'income' ? 'შემოსავალი' : 'ხარჯი'
      const account = accountNames.get(item.accountId) ?? ''
      const member = item.familyMemberId ? memberNames.get(item.familyMemberId) ?? '' : ''
      results.push({ id: `transaction-${item.id}`, type, name: item.description || item.category, detail: `${money(item.amount)} · ${item.date}`, route: '/transactions', transaction: item, searchable: [type, item.type, item.description, item.category, item.amount, item.date, account, member] })
    })
    familyMembers.filter((item) => !item.archived).forEach((item) => {
      const totals = calculateMemberTotals(item, validTransactions)
      results.push({ id: `member-${item.id}`, type: 'ოჯახის წევრი', name: item.name, detail: `${money(totals.income)} / ${money(totals.expense)}`, route: '/family', searchable: [item.name, item.role, 'ოჯახი', 'family member'] })
    })
    accounts.forEach((item) => {
      const balance = calculateAccountBalance(item, validTransactions)
      results.push({ id: `account-${item.id}`, type: 'ანგარიში', name: item.name, detail: money(balance), route: '/accounts', searchable: [item.name, item.type, item.description, balance, 'ანგარიში', 'account'] })
    })
    budgets.forEach((item, index) => {
      results.push({ id: `budget-${item.id ?? index}`, type: 'ბიუჯეტი', name: item.category, detail: `${money(calculateBudgetUsage(item, validTransactions))} / ${money(item.limit)}${item.month ? ` · ${item.month}` : ''}`, route: '/budget', searchable: [item.category, item.limit, item.month, 'ბიუჯეტი', 'budget'] })
    })
    savingsGoals.forEach((item) => {
      results.push({ id: `saving-${item.id}`, type: 'დანაზოგის მიზანი', name: item.name, detail: `${money(item.targetAmount)}${item.targetDate ? ` · ${item.targetDate}` : ''}`, route: '/savings', searchable: [item.name, item.targetAmount, item.targetDate, 'დანაზოგი', 'მიზანი', 'savings goal'] })
    })
    debts.forEach((item) => {
      results.push({ id: `debt-${item.id}`, type: 'ვალი / განვადება', name: item.title, detail: `${money(item.remaining)} · ${item.nextPayment}`, route: '/debts', searchable: [item.title, item.notes, item.remaining, item.totalAmount, item.monthlyPayment, item.nextPayment, item.type, item.status, 'ვალი', 'განვადება', 'debt', 'installment'] })
    })
    shoppingItems.forEach((item) => {
      const amount = item.actualTotalPrice ?? (item.estimatedUnitPrice ? item.estimatedUnitPrice * item.quantity : undefined)
      results.push({ id: `shopping-${item.id}`, type: 'საყიდლების სია', name: item.name, detail: `${item.quantity}${amount !== undefined ? ` · ${money(amount)}` : ''}${item.purchasedAt ? ` · ${item.purchasedAt.slice(0, 10)}` : ''}`, route: '/shopping', searchable: [item.name, item.category, item.note, item.quantity, amount, item.status, 'საყიდლები', 'shopping'] })
    })
    const categories = new Set([...preferences.incomeCategories, ...preferences.expenseCategories, ...validTransactions.map((item) => item.category), ...budgets.map((item) => item.category), ...shoppingItems.map((item) => item.category)])
    categories.forEach((category) => results.push({ id: `category-${category}`, type: 'კატეგორია', name: category, route: '/settings', searchable: [category, 'კატეგორია', 'category'] }))
    return results
  }, [accounts, budgets, debts, familyMembers, preferences.expenseCategories, preferences.incomeCategories, preferences.language, savingsGoals, shoppingItems, validTransactions])

  const results = useMemo(() => {
    const term = normalize(query.trim())
    if (!term) return []
    return source.filter((item) => [item.type, item.name, item.detail, ...item.searchable].some((value) => normalize(value).includes(term)))
  }, [query, source])

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [])

  const select = (result: SearchResult) => {
    navigate(result.route, { state: { searchResultId: result.id } })
    if (result.transaction) onOpenTransaction(result.transaction)
    setQuery('')
    setOpen(false)
  }

  return <div ref={containerRef} className="relative hidden md:block">
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
      <Search className="h-4 w-4 text-slate-400" />
      <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onFocus={() => { if (query.trim()) setOpen(true) }} className="w-56 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" placeholder={t('common.search')} autoComplete="off" aria-expanded={open && Boolean(query.trim())} aria-controls="global-search-results" />
    </div>
    {open && query.trim() ? <div id="global-search-results" className="absolute left-1/2 top-[calc(100%+0.5rem)] z-[90] max-h-[min(32rem,70vh)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="listbox">
      {results.length ? results.map((result) => <button key={result.id} type="button" onClick={() => select(result)} className="flex w-full items-start justify-between gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50" role="option">
        <span className="min-w-0"><span className="block text-xs font-medium text-emerald-700">{result.type}</span><span className="mt-0.5 block truncate text-sm font-semibold text-slate-900">{result.name}</span></span>
        {result.detail ? <span className="shrink-0 text-right text-xs text-slate-500">{result.detail}</span> : null}
      </button>) : <p className="px-4 py-8 text-center text-sm text-slate-500">შედეგი ვერ მოიძებნა</p>}
    </div> : null}
  </div>
}
