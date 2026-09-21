import type { AttachmentCategory, AttachmentMetadata, Transaction } from '../types/app'

export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf'
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

const extensionCategory: Record<string, AttachmentCategory> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image',
  pdf: 'pdf', xls: 'excel', xlsx: 'excel', doc: 'word', docx: 'word',
}

export function attachmentCategory(fileName: string) {
  return extensionCategory[fileName.split('.').pop()?.toLocaleLowerCase() ?? '']
}

export function attachmentFingerprint(value: Pick<AttachmentMetadata, 'name' | 'size' | 'type' | 'lastModified'>) {
  return `${value.name.toLocaleLowerCase()}|${value.size}|${value.type}`
}

export function makeAttachmentId() {
  return `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface AttachmentReference extends AttachmentMetadata {
  legacyUrl?: string
}

export function transactionAttachments(transaction: Transaction): AttachmentReference[] {
  const current = transaction.attachments ?? []
  if (!transaction.receiptAttachment || current.length > 0) return current
  const receipt = transaction.receiptAttachment
  return [{
    id: `legacy-receipt-${transaction.id}`,
    name: receipt.fileName,
    type: receipt.mimeType,
    size: receipt.size,
    category: 'image',
    lastModified: new Date(transaction.updatedAt ?? transaction.createdAt ?? 0).getTime() || 0,
    legacyUrl: receipt.url,
  }]
}

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
