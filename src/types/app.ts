export type TransactionType = 'income' | 'expense'

export interface AppPreferences {
  theme: 'light' | 'dark'
  language: 'ka' | 'en' | 'ru' | 'tr'
  currency: Currency
  readNotificationIds: string[]
  notifications: {
    enabled: boolean
    debts: boolean
    budgets: boolean
    savings: boolean
    reminders: boolean
  }
  financialPeriodStartDay: number
  incomeCategories: string[]
  expenseCategories: string[]
  hideNotificationAmounts: boolean
}

export type Currency = 'GEL' | 'USD' | 'EUR'

export interface FamilyMember {
  id: string
  authUserId?: string
  name: string
  createdAt?: string
  role?: string
  archived?: boolean
  income?: number
  expense?: number
}

export interface Account {
  id: string
  name: string
  icon: string
  type?: string
  openingBalance?: number
  balance?: number
  description?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  accountId: string
  familyMemberId?: string
  expenseScope?: 'personal' | 'shared'
  attachments?: AttachmentMetadata[]
  /** Legacy single-image field; read for backward compatibility and migrated on edit. */
  receiptAttachment?: ReceiptAttachment
  createdAt?: string
  updatedAt?: string
}

export interface ReceiptAttachment {
  /** Local data URL today; can become a remote URL without changing Transaction. */
  url: string
  fileName: string
  mimeType: string
  size: number
  width: number
  height: number
}

export type AttachmentCategory = 'image' | 'pdf' | 'excel' | 'word'

export interface AttachmentMetadata {
  id: string
  name: string
  type: string
  size: number
  category: AttachmentCategory
  lastModified: number
}

export type ShoppingItemStatus = 'pending' | 'purchased'

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  category: string
  estimatedUnitPrice?: number
  note?: string
  addedByFamilyMemberId: string
  status: ShoppingItemStatus
  purchasedByFamilyMemberId?: string
  purchasedAt?: string
  actualTotalPrice?: number
  expenseTransactionId?: string
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id?: string
  category: string
  limit: number
  month?: string
  spent?: number
}

export interface Debt {
  id: string
  title: string
  totalAmount: number
  monthlyPayment: number
  remaining: number
  nextPayment: string
  type: 'installment' | 'personal'
  status: 'owed' | 'owed_to_me'
  notes?: string
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentSaved?: number
  targetDate?: string
  linkedAccountId?: string
}

export interface MonthlySummary {
  month: string
  income: number
  expense: number
  savings: number
}
