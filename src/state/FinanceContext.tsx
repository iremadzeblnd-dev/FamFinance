import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clearPendingFinanceSync, getFinanceStorageInfo, getLegacyImportOwner, hasPendingFinanceSync, loadFinanceState, markLegacyFinanceImported, markPendingFinanceSync, parseFinanceBackup, saveFinanceState, type FinanceStateData } from '../services/storage'
import type { Account, AppPreferences, Budget, Debt, FamilyMember, SavingsGoal, ShoppingItem, Transaction, TransactionType } from '../types/app'
import type { Language, Theme } from '../i18n/translations'
import { deleteAttachmentBlobs } from '../services/attachmentStorage'
import { defaultExpenseCategories, defaultIncomeCategories } from '../data/categories'
import { fetchFinanceState, importLocalFinanceState, replaceFinanceState } from '../services/financeDatabase'
import { useAuth } from './AuthContext'

const now = () => new Date().toISOString()
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const emptyState: FinanceStateData = {
  transactions: [],
  accounts: [],
  budgets: [],
  familyMembers: [],
  debts: [],
  savingsGoals: [],
  shoppingItems: [],
  preferences: { theme: 'light', language: 'ka', readNotificationIds: [], notifications: { enabled: true, debts: true, budgets: true, savings: true, reminders: true }, incomeCategories: defaultIncomeCategories, expenseCategories: defaultExpenseCategories, hideNotificationAmounts: false },
}

interface FinanceContextValue extends FinanceStateData {
  dataLoading: boolean
  dataLoadFailed: boolean
  syncError: string
  legacyImportAvailable: boolean
  importLegacyData: () => Promise<boolean>
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
  markNotificationsRead: (ids: string[]) => void
  updatePreferences: (input: Partial<AppPreferences>) => void
  restoreFinanceData: (input: unknown) => boolean
  clearAllData: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, checking: authChecking } = useAuth()
  const userId = user?.id
  const [state, setState] = useState<FinanceStateData>(emptyState)
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null)
  const [dataLoadFailed, setDataLoadFailed] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [legacyImportAvailable, setLegacyImportAvailable] = useState(() => {
    if (!userId || getLegacyImportOwner()) return false
    const legacyStorage = getFinanceStorageInfo()
    return legacyStorage.exists && (!legacyStorage.ownerId || legacyStorage.ownerId === userId)
  })
  const lastSyncedSnapshot = useRef('')
  const latestSnapshot = useRef('')
  const syncQueue = useRef<Promise<void>>(Promise.resolve())
  const dataLoading = authChecking || Boolean(userId && hydratedUserId !== userId && !dataLoadFailed)

  useEffect(() => {
    document.documentElement.dataset.theme = state.preferences.theme
    document.documentElement.lang = state.preferences.language === 'ka' ? 'ka' : state.preferences.language
  }, [state.preferences])

  useEffect(() => {
    if (authChecking) return
    if (!userId) {
      setHydratedUserId(null)
      return
    }
    let active = true
    const hydrate = async () => {
      setSyncError('')
      setDataLoadFailed(false)
      const scopedStorage = getFinanceStorageInfo(userId)
      const hasOwnedCache = scopedStorage.exists && scopedStorage.ownerId === userId
      const localState = hasOwnedCache ? loadFinanceState(emptyState, userId) : emptyState
      try {
        if (hasOwnedCache && hasPendingFinanceSync(userId)) await importLocalFinanceState(userId, localState, true)
        const remoteState = await fetchFinanceState(userId, hasOwnedCache ? localState.preferences : emptyState.preferences)
        if (!active) return
        const snapshot = JSON.stringify(remoteState)
        lastSyncedSnapshot.current = snapshot
        latestSnapshot.current = snapshot
        setState(remoteState)
        saveFinanceState(remoteState, userId)
        clearPendingFinanceSync(userId)
        setHydratedUserId(userId)
      } catch (error) {
        if (!active) return
        const fallback = hasOwnedCache ? localState : emptyState
        const fallbackSnapshot = JSON.stringify(fallback)
        lastSyncedSnapshot.current = fallbackSnapshot
        latestSnapshot.current = fallbackSnapshot
        setState(fallback)
        if (hasOwnedCache) {
          setHydratedUserId(userId)
          setSyncError('Supabase-თან დაკავშირება ვერ მოხერხდა. ნაჩვენებია მხოლოდ ამ ანგარიშის ლოკალურად შენახული მონაცემები.')
        } else {
          setDataLoadFailed(true)
          setSyncError('Supabase-დან მონაცემების უსაფრთხოდ ჩატვირთვა ვერ მოხერხდა. სხვა ანგარიშის ან ცარიელი მონაცემები არ ჩატვირთულა.')
        }
        console.error('Unable to hydrate finance data', error)
      }
    }
    void hydrate()
    return () => { active = false }
  }, [authChecking, userId])

  useEffect(() => {
    if (!userId || hydratedUserId !== userId) return
    const snapshot = JSON.stringify(state)
    latestSnapshot.current = snapshot
    if (snapshot === lastSyncedSnapshot.current) return
    saveFinanceState(state, userId)
    markPendingFinanceSync(userId)
    const timeout = window.setTimeout(() => {
      syncQueue.current = syncQueue.current.catch(() => undefined).then(async () => {
        try {
          await replaceFinanceState(userId, state)
          lastSyncedSnapshot.current = snapshot
          if (latestSnapshot.current === snapshot) clearPendingFinanceSync(userId)
          setSyncError('')
        } catch (error) {
          setSyncError('ცვლილებები შენახულია ამ მოწყობილობაზე, მაგრამ Supabase-თან სინქრონიზაცია ვერ მოხერხდა.')
          console.error('Unable to sync finance data', error)
        }
      })
    }, 500)
    return () => window.clearTimeout(timeout)
  }, [hydratedUserId, state, userId])

  const importLegacyData = useCallback(async () => {
    if (!userId || !legacyImportAvailable || getLegacyImportOwner()) return false
    const legacyStorage = getFinanceStorageInfo()
    if (!legacyStorage.exists || (legacyStorage.ownerId && legacyStorage.ownerId !== userId)) return false
    try {
      const legacyState = loadFinanceState(emptyState)
      await importLocalFinanceState(userId, legacyState)
      markLegacyFinanceImported(userId)
      const remoteState = await fetchFinanceState(userId, state.preferences)
      const snapshot = JSON.stringify(remoteState)
      lastSyncedSnapshot.current = snapshot
      latestSnapshot.current = snapshot
      setState(remoteState)
      saveFinanceState(remoteState, userId)
      clearPendingFinanceSync(userId)
      setLegacyImportAvailable(false)
      setSyncError('')
      return true
    } catch (error) {
      setSyncError('ძველი ლოკალური მონაცემების იმპორტი ვერ მოხერხდა. მონაცემები არ წაშლილა.')
      console.error('Unable to import legacy finance data', error)
      return false
    }
  }, [legacyImportAvailable, state.preferences, userId])

  const value = useMemo<FinanceContextValue>(() => {
    const update = (next: FinanceStateData) => setState(next)
    const membersById = new Map(state.familyMembers.map((member) => [member.id, member]))
    const validTransactions = state.transactions.filter((transaction) => {
      if (!transaction.familyMemberId) return false
      const member = membersById.get(transaction.familyMemberId)
      if (!member) return true
      return !member.archived && (!member.createdAt || transaction.date >= member.createdAt)
    })
    return {
      ...state,
      dataLoading,
      dataLoadFailed,
      syncError,
      legacyImportAvailable,
      importLegacyData,
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
      markNotificationsRead: (ids) => update({ ...state, preferences: { ...state.preferences, readNotificationIds: Array.from(new Set([...state.preferences.readNotificationIds, ...ids])) } }),
      updatePreferences: (input) => update({ ...state, preferences: { ...state.preferences, ...input } }),
      restoreFinanceData: (input) => { const restored = parseFinanceBackup(input, emptyState); if (!restored) return false; setState(restored); return true },
      clearAllData: () => {
        const attachmentIds = state.transactions.flatMap((item) => item.attachments?.map((attachment) => attachment.id) ?? [])
        void deleteAttachmentBlobs(attachmentIds).catch((error) => console.error('Unable to clean up attachments', error))
        update({ transactions: [], accounts: [], budgets: [], familyMembers: [], debts: [], savingsGoals: [], shoppingItems: [], preferences: { ...state.preferences, readNotificationIds: [] } })
      },
    }
  }, [dataLoadFailed, dataLoading, importLegacyData, legacyImportAvailable, state, syncError])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used inside FinanceProvider')
  return context
}

export type TransactionDraft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
export type { TransactionType }
