import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { accounts as seedAccounts, budgetData, familyMembers as seedMembers, installmentData, savingsGoals as seedGoals, transactions as seedTransactions } from '../data/mockData'
import { loadFinanceState, saveFinanceState, clearFinanceState, parseFinanceBackup, type FinanceStateData } from '../services/storage'
import type { Account, AppPreferences, Budget, Currency, Debt, FamilyMember, SavingsGoal, ShoppingItem, Transaction, TransactionType } from '../types/app'
import type { Language, Theme } from '../i18n/translations'
import { deleteAttachmentBlobs } from '../services/attachmentStorage'
import { defaultExpenseCategories, defaultIncomeCategories } from '../data/categories'

const now = () => new Date().toISOString()
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const earliestMemberDate = (memberId: string) => seedTransactions.filter((item) => item.familyMemberId === memberId).map((item) => item.date).sort()[0] ?? '1970-01-01'

const seedState: FinanceStateData = {
  transactions: seedTransactions.map((item) => ({ ...item, createdAt: now(), updatedAt: now() })),
  accounts: seedAccounts.map((item) => ({ ...item, openingBalance: (item.balance ?? 0) - seedTransactions.filter((transaction) => transaction.accountId === item.id).reduce((sum, transaction) => sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount), 0) })),
  budgets: budgetData.map((item, index) => ({ id: `budget-${index + 1}`, category: item.category, limit: item.limit, month: '2026-09' })),
  familyMembers: seedMembers.map(({ id, name }) => ({ id, name, createdAt: earliestMemberDate(id) })),
  debts: installmentData,
  savingsGoals: seedGoals.map(({ id, name, targetAmount, targetDate, linkedAccountId }) => ({ id, name, targetAmount, targetDate, linkedAccountId })),
  shoppingItems: [],
  preferences: { theme: 'light', language: 'ka', currency: 'GEL', readNotificationIds: [], notifications: { enabled: true, debts: true, budgets: true, savings: true, reminders: true }, financialPeriodStartDay: 1, incomeCategories: defaultIncomeCategories, expenseCategories: defaultExpenseCategories, hideNotificationAmounts: false },
}

interface FinanceContextValue extends FinanceStateData {
  validTransactions: Transaction[]
  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Transaction
  updateTransaction: (id: string, input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void
  deleteTransaction: (id: string) => void
  addAccount: (input: Omit<Account, 'id'>) => void
  updateAccount: (id: string, input: Omit<Account, 'id'>) => void
  deleteAccount: (id: string) => boolean
  addBudget: (input: Omit<Budget, 'id'>) => void
  updateBudget: (id: string, input: Omit<Budget, 'id'>) => void
  deleteBudget: (id: string) => void
  addFamilyMember: (input: Omit<FamilyMember, 'id' | 'createdAt'>) => void
  updateFamilyMember: (id: string, input: Omit<FamilyMember, 'id'>) => void
  deleteFamilyMember: (id: string) => boolean
  archiveFamilyMember: (id: string) => void
  addSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'currentSaved'>) => void
  updateSavingsGoal: (id: string, input: Omit<SavingsGoal, 'id' | 'currentSaved'>) => void
  deleteSavingsGoal: (id: string) => void
  addDebt: (input: Omit<Debt, 'id'>) => void
  updateDebt: (id: string, input: Omit<Debt, 'id'>) => void
  deleteDebt: (id: string) => void
  recordDebtPayment: (id: string, amount: number) => boolean
  addShoppingItem: (input: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt'>) => ShoppingItem
  updateShoppingItem: (id: string, input: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  deleteShoppingItem: (id: string) => void
  purchaseShoppingItem: (id: string, input: { purchasedByFamilyMemberId: string; actualTotalPrice?: number; addExpense: boolean; accountId: string }) => boolean
  undoShoppingPurchase: (id: string) => void
  clearPurchasedShoppingItems: () => void
  preferences: AppPreferences
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
  markNotificationsRead: (ids: string[]) => void
  updatePreferences: (input: Partial<AppPreferences>) => void
  restoreFinanceData: (input: unknown) => boolean
  clearAllData: () => void
  resetDemoData: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceStateData>(() => loadFinanceState(seedState))

  useEffect(() => saveFinanceState(state), [state])
  useEffect(() => {
    document.documentElement.dataset.theme = state.preferences.theme
    document.documentElement.lang = state.preferences.language === 'ka' ? 'ka' : state.preferences.language
  }, [state.preferences])

  const value = useMemo<FinanceContextValue>(() => {
    const update = (next: FinanceStateData) => setState(next)
    const activeMembersById = new Map(state.familyMembers.filter((member) => !member.archived).map((member) => [member.id, member]))
    const validTransactions = state.transactions.filter((transaction) => {
      const member = transaction.familyMemberId ? activeMembersById.get(transaction.familyMemberId) : undefined
      return Boolean(member && (!member.createdAt || transaction.date >= member.createdAt))
    })
    return {
      ...state,
      validTransactions,
      addTransaction: (input) => { const item: Transaction = { ...input, id: makeId('transaction'), createdAt: now(), updatedAt: now() }; update({ ...state, transactions: [item, ...state.transactions] }); return item },
      updateTransaction: (id, input) => update({ ...state, transactions: state.transactions.map((item) => item.id === id ? { ...input, id, createdAt: item.createdAt, updatedAt: now() } : item) }),
      deleteTransaction: (id) => {
        const attachmentIds = state.transactions.find((item) => item.id === id)?.attachments?.map((attachment) => attachment.id) ?? []
        void deleteAttachmentBlobs(attachmentIds).catch((error) => console.error('Unable to clean up transaction attachments', error))
        update({ ...state, transactions: state.transactions.filter((item) => item.id !== id) })
      },
      addAccount: (input) => update({ ...state, accounts: [...state.accounts, { ...input, id: makeId('account') }] }),
      updateAccount: (id, input) => update({ ...state, accounts: state.accounts.map((item) => item.id === id ? { ...input, id } : item) }),
      deleteAccount: (id) => { if (state.transactions.some((item) => item.accountId === id)) return false; update({ ...state, accounts: state.accounts.filter((item) => item.id !== id) }); return true },
      addBudget: (input) => update({ ...state, budgets: [...state.budgets, { ...input, id: makeId('budget') }] }),
      updateBudget: (id, input) => update({ ...state, budgets: state.budgets.map((item) => item.id === id ? { ...input, id } : item) }),
      deleteBudget: (id) => update({ ...state, budgets: state.budgets.filter((item) => item.id !== id) }),
      addFamilyMember: (input) => update({ ...state, familyMembers: [...state.familyMembers, { ...input, id: makeId('member'), createdAt: now().slice(0, 10) }] }),
      updateFamilyMember: (id, input) => update({ ...state, familyMembers: state.familyMembers.map((item) => item.id === id ? { ...input, id } : item) }),
      deleteFamilyMember: (id) => { if (state.transactions.some((item) => item.familyMemberId === id)) return false; update({ ...state, familyMembers: state.familyMembers.filter((item) => item.id !== id) }); return true },
      archiveFamilyMember: (id) => update({ ...state, familyMembers: state.familyMembers.map((item) => item.id === id ? { ...item, archived: true } : item) }),
      addSavingsGoal: (input) => update({ ...state, savingsGoals: [...state.savingsGoals, { ...input, id: makeId('goal') }] }),
      updateSavingsGoal: (id, input) => update({ ...state, savingsGoals: state.savingsGoals.map((item) => item.id === id ? { ...input, id } : item) }),
      deleteSavingsGoal: (id) => update({ ...state, savingsGoals: state.savingsGoals.filter((item) => item.id !== id) }),
      addDebt: (input) => update({ ...state, debts: [...state.debts, { ...input, id: makeId('debt') }] }),
      updateDebt: (id, input) => update({ ...state, debts: state.debts.map((item) => item.id === id ? { ...input, id } : item) }),
      deleteDebt: (id) => update({ ...state, debts: state.debts.filter((item) => item.id !== id) }),
      recordDebtPayment: (id, amount) => { const debt = state.debts.find((item) => item.id === id); if (!debt || amount <= 0 || amount > debt.remaining) return false; update({ ...state, debts: state.debts.map((item) => item.id === id ? { ...item, remaining: item.remaining - amount } : item) }); return true },
      addShoppingItem: (input) => { const item: ShoppingItem = { ...input, id: makeId('shopping'), createdAt: now(), updatedAt: now() }; update({ ...state, shoppingItems: [item, ...state.shoppingItems] }); return item },
      updateShoppingItem: (id, input) => update({ ...state, shoppingItems: state.shoppingItems.map((item) => item.id === id ? { ...input, id, createdAt: item.createdAt, updatedAt: now() } : item) }),
      deleteShoppingItem: (id) => update({ ...state, shoppingItems: state.shoppingItems.filter((item) => item.id !== id) }),
      purchaseShoppingItem: (id, input) => {
        const item = state.shoppingItems.find((entry) => entry.id === id)
        if (!item || item.status === 'purchased') return false
        const purchasedAt = now()
        let expenseTransactionId = item.expenseTransactionId
        const actualTotalPrice = input.actualTotalPrice && input.actualTotalPrice > 0 ? input.actualTotalPrice : undefined
        let transactions = state.transactions
        if (input.addExpense && actualTotalPrice && !expenseTransactionId) {
          const expense: Transaction = { id: makeId('transaction'), type: 'expense', amount: actualTotalPrice, category: item.category, description: item.name, date: purchasedAt.slice(0, 10), accountId: input.accountId, familyMemberId: input.purchasedByFamilyMemberId, expenseScope: 'shared', createdAt: purchasedAt, updatedAt: purchasedAt }
          transactions = [expense, ...transactions]
          expenseTransactionId = expense.id
        }
        update({ ...state, transactions, shoppingItems: state.shoppingItems.map((entry) => entry.id === id ? { ...entry, status: 'purchased', purchasedAt, purchasedByFamilyMemberId: input.purchasedByFamilyMemberId, actualTotalPrice, expenseTransactionId, updatedAt: purchasedAt } : entry) })
        return true
      },
      undoShoppingPurchase: (id) => update({ ...state, shoppingItems: state.shoppingItems.map((item) => item.id === id ? { ...item, status: 'pending', purchasedByFamilyMemberId: undefined, purchasedAt: undefined, actualTotalPrice: undefined, updatedAt: now() } : item) }),
      clearPurchasedShoppingItems: () => update({ ...state, shoppingItems: state.shoppingItems.filter((item) => item.status !== 'purchased') }),
      setTheme: (theme) => update({ ...state, preferences: { ...state.preferences, theme } }),
      setLanguage: (language) => update({ ...state, preferences: { ...state.preferences, language } }),
      setCurrency: (currency) => update({ ...state, preferences: { ...state.preferences, currency } }),
      markNotificationsRead: (ids) => update({ ...state, preferences: { ...state.preferences, readNotificationIds: Array.from(new Set([...state.preferences.readNotificationIds, ...ids])) } }),
      updatePreferences: (input) => update({ ...state, preferences: { ...state.preferences, ...input } }),
      restoreFinanceData: (input) => { const restored = parseFinanceBackup(input, seedState); if (!restored) return false; setState(restored); return true },
      clearAllData: () => {
        const attachmentIds = state.transactions.flatMap((item) => item.attachments?.map((attachment) => attachment.id) ?? [])
        void deleteAttachmentBlobs(attachmentIds).catch((error) => console.error('Unable to clean up attachments', error))
        update({ transactions: [], accounts: [], budgets: [], familyMembers: [], debts: [], savingsGoals: [], shoppingItems: [], preferences: { ...state.preferences, readNotificationIds: [] } })
      },
      resetDemoData: () => { clearFinanceState(); setState(seedState) },
    }
  }, [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used inside FinanceProvider')
  return context
}

export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
export type { TransactionType }
