import type { Account, SavingsGoal, Transaction } from '../types/app'
import { calculateAccountBalance, calculateExpenses, calculateIncome, monthKey } from './calculations'

export const getCurrentHouseholdSavings = (accounts: Account[], transactions: Transaction[]) => accounts.filter((account) => account.id === 'savings' || account.icon === 'piggy-bank' || account.type === 'დანაზოგი').reduce((sum, account) => sum + calculateAccountBalance(account, transactions), 0)

export const getAverageMonthlySurplus = (transactions: Transaction[]) => {
  const months = Array.from(new Set(transactions.map((item) => monthKey(item.date))))
  if (months.length === 0) return null
  const surplus = months.reduce((sum, month) => sum + calculateIncome(transactions, month) - calculateExpenses(transactions, month), 0)
  return surplus / months.length
}

export const getGoalProgress = (goal: SavingsGoal, currentSavings: number) => {
  const remaining = Math.max(goal.targetAmount - currentSavings, 0)
  const progress = goal.targetAmount > 0 ? Math.min(Math.max((currentSavings / goal.targetAmount) * 100, 0), 100) : 0
  return { remaining, progress }
}

export const formatSavingsDuration = (months: number) => {
  const rounded = Math.ceil(months)
  if (rounded < 12) return `${rounded} თვე`
  const years = Math.floor(rounded / 12)
  const remainder = rounded % 12
  return remainder ? `${years} წელი და ${remainder} თვე` : `${years} წელი`
}