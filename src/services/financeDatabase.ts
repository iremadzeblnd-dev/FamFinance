import type { Account, AppPreferences, Budget, Debt, FamilyMember, SavingsGoal, ShoppingItem, Transaction } from '../types/app'
import type { FinanceStateData } from './storage'

type Row = Record<string, unknown>
type TableName = 'family_members' | 'transactions' | 'accounts' | 'budgets' | 'debts' | 'savings_goals' | 'shopping_items'

const number = (value: unknown) => Number(value ?? 0)
const optionalString = (value: unknown) => typeof value === 'string' && value ? value : undefined

const accountRows = (userId: string, items: Account[]) => items.map((item) => ({ user_id: userId, id: item.id, name: item.name, icon: item.icon, type: item.type ?? null, opening_balance: item.openingBalance ?? null, legacy_balance: item.balance ?? null, description: item.description ?? null }))
const memberRows = (userId: string, items: FamilyMember[]) => items.map((item) => ({ user_id: userId, id: item.id, name: item.name, role: item.role ?? null, archived: item.archived ?? false, income: item.income ?? null, expense: item.expense ?? null, member_since: item.createdAt?.slice(0, 10) ?? null }))
const transactionRows = (userId: string, items: Transaction[]) => items.map((item) => ({ user_id: userId, id: item.id, type: item.type, amount: item.amount, category: item.category, description: item.description, occurred_on: item.date, account_id: item.accountId, family_member_id: item.familyMemberId ?? null, expense_scope: item.expenseScope ?? null, attachments: item.attachments ?? [], receipt_attachment: item.receiptAttachment ?? null, source_created_at: item.createdAt ?? null, source_updated_at: item.updatedAt ?? null }))
const budgetRows = (userId: string, items: Budget[]) => items.map((item) => ({ user_id: userId, id: item.id!, category: item.category, amount_limit: item.limit, month: item.month ?? null }))
const debtRows = (userId: string, items: Debt[]) => items.map((item) => ({ user_id: userId, id: item.id, title: item.title, total_amount: item.totalAmount, monthly_payment: item.monthlyPayment, remaining: item.remaining, next_payment: item.nextPayment, type: item.type, status: item.status, notes: item.notes ?? null }))
const savingsRows = (userId: string, items: SavingsGoal[]) => items.map((item) => ({ user_id: userId, id: item.id, name: item.name, target_amount: item.targetAmount, current_saved: item.currentSaved ?? null, target_date: item.targetDate ?? null, linked_account_id: item.linkedAccountId ?? null }))
const shoppingRows = (userId: string, items: ShoppingItem[]) => items.map((item) => ({ user_id: userId, id: item.id, name: item.name, quantity: item.quantity, category: item.category, estimated_unit_price: item.estimatedUnitPrice ?? null, note: item.note ?? null, added_by_family_member_id: item.addedByFamilyMemberId, status: item.status, purchased_by_family_member_id: item.purchasedByFamilyMemberId ?? null, purchased_at: item.purchasedAt ?? null, actual_total_price: item.actualTotalPrice ?? null, expense_transaction_id: item.expenseTransactionId ?? null, source_created_at: item.createdAt, source_updated_at: item.updatedAt }))

const rowsForState = (userId: string, state: FinanceStateData): Record<TableName, Row[]> => ({
  family_members: memberRows(userId, state.familyMembers),
  accounts: accountRows(userId, state.accounts),
  transactions: transactionRows(userId, state.transactions),
  budgets: budgetRows(userId, state.budgets.filter((item): item is Budget & { id: string } => Boolean(item.id))),
  debts: debtRows(userId, state.debts),
  savings_goals: savingsRows(userId, state.savingsGoals),
  shopping_items: shoppingRows(userId, state.shoppingItems),
})

const throwIfError = (error: { message: string } | null) => { if (error) throw new Error(error.message) }

async function insertMissing(table: TableName, rows: Row[]) {
  if (!rows.length) return
  const { supabase } = await import('./supabaseClient')
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true })
  throwIfError(error)
}

async function reconcile(table: TableName, userId: string, rows: Row[]) {
  const { supabase } = await import('./supabaseClient')
  const { data: existing, error: selectError } = await supabase.from(table).select('id').eq('user_id', userId)
  throwIfError(selectError)
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' })
    throwIfError(error)
  }
  const wanted = new Set(rows.map((row) => String(row.id)))
  const removed = (existing ?? []).map((row) => String(row.id)).filter((id) => !wanted.has(id))
  if (removed.length) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', removed)
    throwIfError(error)
  }
}

export async function importLocalFinanceState(userId: string, state: FinanceStateData, overwrite = false) {
  const rows = rowsForState(userId, state)
  if (overwrite) {
    await replaceFinanceState(userId, state)
    return
  }
  await insertMissing('family_members', rows.family_members)
  await insertMissing('accounts', rows.accounts)
  await insertMissing('transactions', rows.transactions)
  await insertMissing('budgets', rows.budgets)
  await insertMissing('debts', rows.debts)
  await insertMissing('savings_goals', rows.savings_goals)
  await insertMissing('shopping_items', rows.shopping_items)
  const { supabase } = await import('./supabaseClient')
  const { error } = await supabase.from('user_settings').upsert({ user_id: userId, preferences: state.preferences }, { onConflict: 'user_id', ignoreDuplicates: true })
  throwIfError(error)
}

export async function replaceFinanceState(userId: string, state: FinanceStateData) {
  const rows = rowsForState(userId, state)
  await reconcile('family_members', userId, rows.family_members)
  await reconcile('accounts', userId, rows.accounts)
  await reconcile('transactions', userId, rows.transactions)
  await reconcile('budgets', userId, rows.budgets)
  await reconcile('debts', userId, rows.debts)
  await reconcile('savings_goals', userId, rows.savings_goals)
  await reconcile('shopping_items', userId, rows.shopping_items)
  const { supabase } = await import('./supabaseClient')
  const { error } = await supabase.from('user_settings').upsert({ user_id: userId, preferences: state.preferences }, { onConflict: 'user_id' })
  throwIfError(error)
}

export async function fetchFinanceState(userId: string, fallbackPreferences: AppPreferences): Promise<FinanceStateData> {
  const { supabase } = await import('./supabaseClient')
  const tables = ['transactions', 'accounts', 'budgets', 'family_members', 'debts', 'savings_goals', 'shopping_items'] as const
  const [transactionsResult, accountsResult, budgetsResult, membersResult, debtsResult, savingsResult, shoppingResult, settingsResult] = await Promise.all([
    ...tables.map((table) => supabase.from(table).select('*').eq('user_id', userId)),
    supabase.from('user_settings').select('preferences').eq('user_id', userId).maybeSingle(),
  ])
  for (const result of [transactionsResult, accountsResult, budgetsResult, membersResult, debtsResult, savingsResult, shoppingResult, settingsResult]) throwIfError(result.error)
  const transactions = (transactionsResult.data ?? []) as Row[]
  const accounts = (accountsResult.data ?? []) as Row[]
  const budgets = (budgetsResult.data ?? []) as Row[]
  const members = (membersResult.data ?? []) as Row[]
  const debts = (debtsResult.data ?? []) as Row[]
  const savings = (savingsResult.data ?? []) as Row[]
  const shopping = (shoppingResult.data ?? []) as Row[]
  const preferences = ((settingsResult.data as Row | null)?.preferences as AppPreferences | undefined) ?? fallbackPreferences
  return {
    transactions: transactions.map((row): Transaction => ({ id: String(row.id), type: row.type as Transaction['type'], amount: number(row.amount), category: String(row.category), description: String(row.description), date: String(row.occurred_on), accountId: String(row.account_id), familyMemberId: optionalString(row.family_member_id), expenseScope: optionalString(row.expense_scope) as Transaction['expenseScope'], attachments: Array.isArray(row.attachments) ? (row.attachments as Transaction['attachments']) : [], receiptAttachment: row.receipt_attachment as Transaction['receiptAttachment'], createdAt: optionalString(row.source_created_at) ?? optionalString(row.created_at), updatedAt: optionalString(row.source_updated_at) ?? optionalString(row.updated_at) })),
    accounts: accounts.map((row): Account => ({ id: String(row.id), name: String(row.name), icon: String(row.icon), type: optionalString(row.type), openingBalance: row.opening_balance === null ? undefined : number(row.opening_balance), balance: row.legacy_balance === null ? undefined : number(row.legacy_balance), description: optionalString(row.description) })),
    budgets: budgets.map((row): Budget => ({ id: String(row.id), category: String(row.category), limit: number(row.amount_limit), month: optionalString(row.month) })),
    familyMembers: members.map((row): FamilyMember => ({ id: String(row.id), name: String(row.name), role: optionalString(row.role), archived: Boolean(row.archived), income: row.income === null ? undefined : number(row.income), expense: row.expense === null ? undefined : number(row.expense), createdAt: optionalString(row.member_since) })),
    debts: debts.map((row): Debt => ({ id: String(row.id), title: String(row.title), totalAmount: number(row.total_amount), monthlyPayment: number(row.monthly_payment), remaining: number(row.remaining), nextPayment: String(row.next_payment), type: row.type as Debt['type'], status: row.status as Debt['status'], notes: optionalString(row.notes) })),
    savingsGoals: savings.map((row): SavingsGoal => ({ id: String(row.id), name: String(row.name), targetAmount: number(row.target_amount), currentSaved: row.current_saved === null ? undefined : number(row.current_saved), targetDate: optionalString(row.target_date), linkedAccountId: optionalString(row.linked_account_id) })),
    shoppingItems: shopping.map((row): ShoppingItem => ({ id: String(row.id), name: String(row.name), quantity: number(row.quantity), category: String(row.category), estimatedUnitPrice: row.estimated_unit_price === null ? undefined : number(row.estimated_unit_price), note: optionalString(row.note), addedByFamilyMemberId: String(row.added_by_family_member_id), status: row.status as ShoppingItem['status'], purchasedByFamilyMemberId: optionalString(row.purchased_by_family_member_id), purchasedAt: optionalString(row.purchased_at), actualTotalPrice: row.actual_total_price === null ? undefined : number(row.actual_total_price), expenseTransactionId: optionalString(row.expense_transaction_id), createdAt: optionalString(row.source_created_at) ?? String(row.created_at), updatedAt: optionalString(row.source_updated_at) ?? String(row.updated_at) })),
    preferences,
  }
}
