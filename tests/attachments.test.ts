import assert from 'node:assert/strict'
import test from 'node:test'
import type { Transaction } from '../src/types/app'
import { attachmentCategory, attachmentFingerprint, transactionAttachments } from '../src/utils/attachments'

const baseTransaction: Transaction = { id: 'transaction-1', type: 'expense', amount: 10, category: 'საკვები', description: 'საკვები', date: '2026-09-20', accountId: 'account-1' }

test('maps supported extensions to attachment categories', () => {
  assert.equal(attachmentCategory('receipt.JPEG'), 'image')
  assert.equal(attachmentCategory('invoice.pdf'), 'pdf')
  assert.equal(attachmentCategory('budget.xlsx'), 'excel')
  assert.equal(attachmentCategory('notes.docx'), 'word')
  assert.equal(attachmentCategory('script.exe'), undefined)
})

test('detects practical duplicates by name, size, and type', () => {
  const first = { name: 'receipt.jpg', size: 123, type: 'image/jpeg', lastModified: 1 }
  const sameFileReselected = { ...first, lastModified: 2 }
  assert.equal(attachmentFingerprint(first), attachmentFingerprint(sameFileReselected))
})

test('exposes a legacy receipt as an attachment without changing the transaction', () => {
  const transaction: Transaction = { ...baseTransaction, receiptAttachment: { url: 'data:image/jpeg;base64,AA==', fileName: 'old-receipt.jpg', mimeType: 'image/jpeg', size: 1, width: 1, height: 1 } }
  const attachments = transactionAttachments(transaction)
  assert.equal(attachments.length, 1)
  assert.equal(attachments[0].name, 'old-receipt.jpg')
  assert.equal(attachments[0].category, 'image')
  assert.equal(transaction.attachments, undefined)
})

test('prefers the new attachments array when both formats exist', () => {
  const current = { id: 'attachment-1', name: 'invoice.pdf', type: 'application/pdf', size: 20, category: 'pdf' as const, lastModified: 1 }
  const transaction: Transaction = { ...baseTransaction, attachments: [current], receiptAttachment: { url: 'data:image/jpeg;base64,AA==', fileName: 'old.jpg', mimeType: 'image/jpeg', size: 1, width: 1, height: 1 } }
  assert.deepEqual(transactionAttachments(transaction), [current])
})
