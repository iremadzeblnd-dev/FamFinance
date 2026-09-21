const DATABASE_NAME = 'finance-app-attachments'
const STORE_NAME = 'files'
const DATABASE_VERSION = 1

let databasePromise: Promise<IDBDatabase> | undefined

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'))
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Unable to open attachment storage'))
      request.onblocked = () => reject(new Error('Attachment storage is blocked'))
    }).catch((error) => {
      databasePromise = undefined
      throw error
    })
  }
  return databasePromise
}

async function requestStore(mode: IDBTransactionMode) {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, mode)
  return { transaction, store: transaction.objectStore(STORE_NAME) }
}

export async function saveAttachmentBlob(id: string, blob: Blob) {
  return saveAttachmentBlobs([{ id, blob }])
}

export async function saveAttachmentBlobs(entries: { id: string; blob: Blob }[]) {
  if (entries.length === 0) return
  const { transaction, store } = await requestStore('readwrite')
  await new Promise<void>((resolve, reject) => {
    for (const entry of entries) store.put(entry.blob, entry.id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save attachments'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Attachment save aborted'))
  })
}

export async function getAttachmentBlob(id: string) {
  const { store } = await requestStore('readonly')
  return new Promise<Blob | undefined>((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined)
    request.onerror = () => reject(request.error ?? new Error('Unable to read attachment'))
  })
}

export async function deleteAttachmentBlobs(ids: string[]) {
  if (ids.length === 0) return
  const { transaction, store } = await requestStore('readwrite')
  for (const id of ids) store.delete(id)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to remove attachments'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Attachment removal aborted'))
  })
}
