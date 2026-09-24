import assert from 'node:assert/strict'
import test from 'node:test'
import type { Transaction } from '../src/types/app'
import { transactionRowForSupabase } from '../src/services/financeDatabase'
import { mergeTransactionFormOptions, resolveTransactionSelectionIds } from '../src/utils/transactionForm'

const accounts = [
  { id: 'cash', name: 'Cash', icon: 'wallet' },
  { id: 'bank', name: 'Bank', icon: 'bank' },
]
const familyMembers = [
  { id: 'member-1', name: 'Alex' },
  { id: 'member-2', name: 'Sam' },
]

test('transaction options include all current Supabase accounts and active family members', () => {
  const options = mergeTransactionFormOptions(
    { accounts: [accounts[0]], familyMembers: [familyMembers[0]] },
    { accounts, familyMembers: [...familyMembers, { id: 'archived', name: 'Old member', archived: true }] },
  )

  assert.deepEqual(options.accounts.map(({ id }) => id), ['cash', 'bank'])
  assert.deepEqual(options.familyMembers.map(({ id }) => id), ['member-1', 'member-2'])
  assert.deepEqual(resolveTransactionSelectionIds({ accountId: '', familyMemberId: '' }, options), { accountId: 'cash', familyMemberId: 'member-1' })
})

for (const type of ['income', 'expense'] as const) {
  test(`${type} saves the selected account and family member in the Supabase row`, () => {
    const transaction: Transaction = {
      id: `${type}-1`,
      type,
      amount: 125,
      category: type === 'income' ? 'Salary' : 'Food',
      description: type === 'income' ? 'September salary' : 'Groceries',
      date: '2026-09-24',
      accountId: 'bank',
      familyMemberId: 'member-2',
    }

    const row = transactionRowForSupabase('user-1', transaction)
    assert.equal(row.account_id, 'bank')
    assert.equal(row.family_member_id, 'member-2')
  })
}
