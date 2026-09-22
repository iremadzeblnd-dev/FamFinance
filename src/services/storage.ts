import type { Account, AppPreferences, Budget, Debt, FamilyMember, SavingsGoal, ShoppingItem, Transaction } from '../types/app'
import { defaultExpenseCategories, defaultIncomeCategories } from '../data/categories'

export interface FinanceStateData {
  transactions: Transaction[]
  accounts: Account[]
  budgets: Budget[]
  familyMembers: FamilyMember[]
  debts: Debt[]
  savingsGoals: SavingsGoal[]
  shoppingItems: ShoppingItem[]
  preferences: AppPreferences
}

const STORAGE_KEY = 'finance-app-data'
const STORAGE_VERSION = 1
const LEGACY_IMPORT_OWNER_KEY = 'finance-app-data-imported-by'
const storageKey = (userId?: string) => userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY

interface StoredData {
  version: number
  data: FinanceStateData
  ownerId?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isArray = (value: unknown): value is unknown[] => Array.isArray(value)

const memberFallbackDate = (memberId: string, transactions: Transaction[]) => {
  const memberDates = transactions.filter((item) => item.familyMemberId === memberId).map((item) => item.date).sort()
  const allDates = transactions.map((item) => item.date).sort()
  return memberDates[0] ?? allDates[0] ?? '1970-01-01'
}

export function loadFinanceState(seed: FinanceStateData, userId?: string): FinanceStateData {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return seed
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !isRecord(parsed.data)) return seed
    const data = parsed.data
    if (![data.transactions, data.accounts, data.budgets, data.familyMembers, data.debts, data.savingsGoals].every(isArray)) return seed
    const preferences = isRecord(data.preferences) ? data.preferences as Partial<AppPreferences> : {}
    const notifications: Record<string, unknown> = isRecord(preferences.notifications) ? preferences.notifications : {}
    const cleanCategories = (value: unknown, fallback: string[]) => isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : fallback
    const state = { ...data, shoppingItems: isArray(data.shoppingItems) ? data.shoppingItems : [], preferences: { theme: preferences.theme === 'dark' ? 'dark' : 'light', language: preferences.language === 'en' || preferences.language === 'ru' || preferences.language === 'tr' ? preferences.language : 'ka', currency: preferences.currency === 'USD' || preferences.currency === 'EUR' ? preferences.currency : 'GEL', readNotificationIds: isArray(preferences.readNotificationIds) ? preferences.readNotificationIds.filter((id): id is string => typeof id === 'string') : [], notifications: { enabled: notifications.enabled !== false, debts: notifications.debts !== false, budgets: notifications.budgets !== false, savings: notifications.savings !== false, reminders: notifications.reminders !== false }, financialPeriodStartDay: typeof preferences.financialPeriodStartDay === 'number' && preferences.financialPeriodStartDay >= 1 && preferences.financialPeriodStartDay <= 28 ? Math.floor(preferences.financialPeriodStartDay) : 1, incomeCategories: cleanCategories(preferences.incomeCategories, defaultIncomeCategories), expenseCategories: cleanCategories(preferences.expenseCategories, defaultExpenseCategories), hideNotificationAmounts: preferences.hideNotificationAmounts === true } } as unknown as FinanceStateData
    state.familyMembers = state.familyMembers.map((member) => ({ ...member, createdAt: typeof member.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(member.createdAt) ? member.createdAt.slice(0, 10) : memberFallbackDate(member.id, state.transactions) }))
    state.savingsGoals = state.savingsGoals.map(({ id, name, targetAmount, targetDate, linkedAccountId }) => ({ id, name, targetAmount, targetDate, linkedAccountId }))
    return state
  } catch {
    return seed
  }
}

export function getFinanceStorageInfo(userId?: string) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { exists: false, ownerId: undefined }
    const parsed: unknown = JSON.parse(raw)
    return { exists: true, ownerId: isRecord(parsed) && typeof parsed.ownerId === 'string' ? parsed.ownerId : undefined }
  } catch {
    return { exists: true, ownerId: undefined }
  }
}

export function saveFinanceState(data: FinanceStateData, ownerId?: string) {
  localStorage.setItem(storageKey(ownerId), JSON.stringify({ version: STORAGE_VERSION, data, ownerId } satisfies StoredData))
}

export function clearFinanceState(userId: string) {
  localStorage.removeItem(storageKey(userId))
}

const pendingKey = (userId: string) => `finance-sync-pending:${userId}`
export const hasPendingFinanceSync = (userId: string) => localStorage.getItem(pendingKey(userId)) === 'true'
export const markPendingFinanceSync = (userId: string) => localStorage.setItem(pendingKey(userId), 'true')
export const clearPendingFinanceSync = (userId: string) => localStorage.removeItem(pendingKey(userId))
export const getLegacyImportOwner = () => localStorage.getItem(LEGACY_IMPORT_OWNER_KEY)
export const markLegacyFinanceImported = (userId: string) => localStorage.setItem(LEGACY_IMPORT_OWNER_KEY, userId)

export function parseFinanceBackup(value: unknown, seed: FinanceStateData): FinanceStateData | null {
  try {
    const candidate = isRecord(value) && isRecord(value.data) ? value.data : value
    if (!isRecord(candidate)) return null
    const temporaryKey = `${STORAGE_KEY}-restore-check`
    localStorage.setItem(temporaryKey, JSON.stringify({ version: STORAGE_VERSION, data: candidate }))
    const original = localStorage.getItem(STORAGE_KEY)
    localStorage.setItem(STORAGE_KEY, localStorage.getItem(temporaryKey)!)
    const parsed = loadFinanceState(seed)
    if (original === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, original)
    localStorage.removeItem(temporaryKey)
    if (![candidate.transactions, candidate.accounts, candidate.budgets, candidate.familyMembers, candidate.debts, candidate.savingsGoals].every(isArray)) return null
    return parsed
  } catch {
    return null
  }
}
