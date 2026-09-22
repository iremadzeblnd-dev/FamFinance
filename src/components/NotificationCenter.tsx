import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bell, CalendarClock, Check, PiggyBank, WalletCards } from 'lucide-react'
import { useFinance } from '../state/FinanceContext'
import { localeMap, translate } from '../i18n/translations'
import { calculateBudgetUsage } from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'
import { getCurrentHouseholdSavings } from '../utils/savings'

type NotificationKind = 'debt' | 'budget' | 'achievement' | 'reminder'

interface FinancialNotification {
  id: string
  kind: NotificationKind
  message: string
  priority: number
}

const fillTemplate = (template: string, values: Record<string, string>) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function NotificationCenter() {
  const { debts, budgets, savingsGoals, accounts, validTransactions, preferences, markNotificationsRead } = useFinance()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const locale = localeMap[preferences.language]
  const t = (key: string) => translate(preferences.language, key)

  const notifications = useMemo<FinancialNotification[]>(() => {
    const items: FinancialNotification[] = []
    if (!preferences.notifications.enabled) return items
    const notificationText = (key: string) => translate(preferences.language, key)
    const formatMoney = (value: number) => preferences.hideNotificationAmounts ? '••••' : formatCurrency(value, locale)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })

    if (preferences.notifications.debts) debts.filter((debt) => debt.remaining > 0).forEach((debt) => {
      const dueDate = parseLocalDate(debt.nextPayment)
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000)
      const overdue = daysUntilDue < 0
      items.push({
        id: `debt-${debt.id}-${debt.nextPayment}-${overdue ? 'overdue' : 'due'}`,
        kind: 'debt',
        priority: overdue ? 0 : 1,
        message: fillTemplate(notificationText(overdue ? 'notifications.debtOverdue' : 'notifications.debtDue'), { name: debt.title, amount: formatMoney(debt.monthlyPayment), date: dateFormatter.format(dueDate) }),
      })
    })

    if (preferences.notifications.budgets) budgets.forEach((budget) => {
      const spent = calculateBudgetUsage(budget, validTransactions)
      const usage = budget.limit > 0 ? spent / budget.limit : 0
      if (usage < 0.8) return
      const exceeded = usage > 1
      items.push({
        id: `budget-${budget.id ?? budget.category}-${budget.month ?? 'all'}-${exceeded ? 'exceeded' : 'warning'}`,
        kind: 'budget',
        priority: exceeded ? 0 : 2,
        message: fillTemplate(notificationText(exceeded ? 'notifications.budgetExceeded' : 'notifications.budgetWarning'), { category: budget.category, spent: formatMoney(spent), limit: formatMoney(budget.limit) }),
      })
    })

    const currentSavings = Math.max(0, getCurrentHouseholdSavings(accounts, validTransactions))
    savingsGoals.forEach((goal) => {
      if (currentSavings >= goal.targetAmount && preferences.notifications.savings) {
        items.push({ id: `savings-achieved-${goal.id}`, kind: 'achievement', priority: 3, message: fillTemplate(notificationText('notifications.savingsAchieved'), { name: goal.name }) })
      } else if (goal.targetDate && preferences.notifications.reminders) {
        items.push({ id: `reminder-${goal.id}-${goal.targetDate}`, kind: 'reminder', priority: 4, message: fillTemplate(notificationText('notifications.reminder'), { name: goal.name, date: dateFormatter.format(parseLocalDate(goal.targetDate)) }) })
      }
    })

    return items.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
  }, [accounts, budgets, debts, locale, preferences, savingsGoals, validTransactions])

  const readIds = new Set(preferences.readNotificationIds)
  const unread = notifications.filter((notification) => !readIds.has(notification.id))

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const iconFor = (kind: NotificationKind) => {
    if (kind === 'debt') return <CalendarClock className="h-4 w-4" />
    if (kind === 'budget') return <AlertTriangle className="h-4 w-4" />
    if (kind === 'achievement') return <PiggyBank className="h-4 w-4" />
    return <WalletCards className="h-4 w-4" />
  }

  return <div ref={containerRef} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label={t('common.notifications')} aria-haspopup="dialog" aria-expanded={open}>
      <Bell className="h-4 w-4" />
      {unread.length ? <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unread.length > 99 ? '99+' : unread.length}</span> : null}
    </button>
    {open ? <div role="dialog" aria-label={t('notifications.title')} className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div><p className="font-semibold text-slate-900">{t('notifications.title')}</p>{unread.length ? <p className="text-xs text-slate-500">{unread.length}</p> : null}</div>
        {unread.length ? <button type="button" onClick={() => markNotificationsRead(unread.map((item) => item.id))} className="min-h-9 text-xs font-medium text-emerald-700 hover:text-emerald-600">{t('notifications.markAll')}</button> : null}
      </div>
      <div className="max-h-96 overflow-y-auto p-2">
        {notifications.length === 0 ? <p className="px-3 py-8 text-center text-sm text-slate-500">{t('notifications.empty')}</p> : notifications.map((notification) => {
          const isUnread = !readIds.has(notification.id)
          return <button key={notification.id} type="button" onClick={() => isUnread && markNotificationsRead([notification.id])} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${isUnread ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'}`} aria-label={isUnread ? t('notifications.markRead') : notification.message}>
            <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${notification.kind === 'budget' || notification.priority === 0 ? 'bg-amber-100 text-amber-700' : notification.kind === 'achievement' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{iconFor(notification.kind)}</span>
            <span className="min-w-0 flex-1 text-sm leading-5 text-slate-700">{notification.message}</span>
            {isUnread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> : <Check className="mt-1 h-4 w-4 shrink-0 text-slate-400" />}
          </button>
        })}
      </div>
    </div> : null}
  </div>
}
