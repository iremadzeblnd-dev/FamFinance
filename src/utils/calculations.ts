import type { Account, Budget, FamilyMember, SavingsGoal, Transaction } from '../types/app'

export const monthKey = (date: string) => date.slice(0, 7)

export const sumTransactions = (transactions: Transaction[], type?: Transaction['type']) =>
  transactions.filter((item) => !type || item.type === type).reduce((sum, item) => sum + item.amount, 0)

export const monthlyTransactions = (transactions: Transaction[], month: string) => transactions.filter((item) => monthKey(item.date) === month)

export const calculateIncome = (transactions: Transaction[], month?: string) => sumTransactions(month ? monthlyTransactions(transactions, month) : transactions, 'income')

export const calculateExpenses = (transactions: Transaction[], month?: string) => sumTransactions(month ? monthlyTransactions(transactions, month) : transactions, 'expense')

export const calculateNetBalance = (transactions: Transaction[], month?: string) => calculateIncome(transactions, month) - calculateExpenses(transactions, month)

export const calculateCategoryExpenses = (transactions: Transaction[], month?: string) => {
  const totals = new Map<string, number>()
  monthlyTransactions(transactions, month ?? '').filter((item) => item.type === 'expense').forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount))
  return Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export const calculateAccountBalance = (account: Account, transactions: Transaction[]) => (account.openingBalance ?? account.balance ?? 0) + transactions.filter((item) => item.accountId === account.id).reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)

export const calculateBudgetUsage = (budget: Budget, transactions: Transaction[]) => transactions.filter((item) => item.type === 'expense' && item.category === budget.category && monthKey(item.date) === (budget.month ?? '')).reduce((sum, item) => sum + item.amount, 0)

export const calculateMemberTotals = (member: FamilyMember, transactions: Transaction[], month?: string) => {
  const memberTransactions = transactions.filter((item) => item.familyMemberId === member.id && (!month || monthKey(item.date) === month))
  return { income: sumTransactions(memberTransactions, 'income'), expense: sumTransactions(memberTransactions, 'expense') }
}

export const calculateSavings = (goals: SavingsGoal[]) => goals.reduce((sum, goal) => sum + (goal.currentSaved ?? 0), 0)