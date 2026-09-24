import type { Account, FamilyMember } from '../types/app'

export interface TransactionFormOptions {
  accounts: Account[]
  familyMembers: FamilyMember[]
}

export function mergeTransactionFormOptions(local: TransactionFormOptions, remote: TransactionFormOptions): TransactionFormOptions {
  const mergeById = <T extends { id: string }>(primary: T[], fallback: T[]) => {
    const items = new Map(primary.map((item) => [item.id, item]))
    fallback.forEach((item) => { if (!items.has(item.id)) items.set(item.id, item) })
    return Array.from(items.values())
  }

  return {
    accounts: mergeById(remote.accounts, local.accounts),
    familyMembers: mergeById(remote.familyMembers, local.familyMembers).filter((member) => !member.archived),
  }
}

export function resolveTransactionSelectionIds(
  current: { accountId: string; familyMemberId: string },
  options: TransactionFormOptions,
) {
  return {
    accountId: options.accounts.some((account) => account.id === current.accountId) ? current.accountId : (options.accounts[0]?.id ?? ''),
    familyMemberId: options.familyMembers.some((member) => member.id === current.familyMemberId) ? current.familyMemberId : (options.familyMembers[0]?.id ?? ''),
  }
}
