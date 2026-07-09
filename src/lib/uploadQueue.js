// Offline-Upload-Queue für Fotos/Dateien.
// Bilder/Dateien werden als Blob in IndexedDB zwischengelagert und bei Reconnect
// automatisch in den Supabase-Storage hochgeladen + der DB-Datensatz angelegt.

import { sb } from './supabase.js'
import { isNetworkError } from './outbox.js'

const DB_NAME = 'luma_uploads'
const STORE = 'queue'

function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }) }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function emit(n) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('luma-uploadqueue', { detail: n }))
}

export async function queueUpload(item) {
  // item: { id, bucket, path, contentType, blob, table, row }
  const db = await openDb()
  await new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readwrite')
    t.objectStore(STORE).put(item)
    t.oncomplete = res
    t.onerror = () => rej(t.error)
  })
  emit(await uploadQueueCount())
}

export async function allUploads() {
  const db = await openDb()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readonly')
    const rq = t.objectStore(STORE).getAll()
    rq.onsuccess = () => res(rq.result || [])
    rq.onerror = () => rej(rq.error)
  })
}

async function removeUpload(id) {
  const db = await openDb()
  await new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readwrite')
    t.objectStore(STORE).delete(id)
    t.oncomplete = res
    t.onerror = () => rej(t.error)
  })
  emit(await uploadQueueCount())
}

export async function uploadQueueCount() {
  try { return (await allUploads()).length } catch { return 0 }
}

let processing = false
export async function processUploadQueue() {
  if (processing || (typeof navigator !== 'undefined' && !navigator.onLine)) return
  processing = true
  try {
    const items = await allUploads()
    for (const item of items) {
      try {
        const { error: upErr } = await sb.storage.from(item.bucket).upload(item.path, item.blob, {
          contentType: item.contentType || 'application/octet-stream',
          upsert: true,
        })
        if (upErr && !String(upErr.message || '').toLowerCase().includes('exists')) throw upErr
        const { data } = sb.storage.from(item.bucket).getPublicUrl(item.path)
        const row = { ...item.row, url: data.publicUrl }
        const { error: insErr } = await sb.from(item.table).upsert(row, { onConflict: 'id' })
        if (insErr) throw insErr
        await removeUpload(item.id)
      } catch (err) {
        if (isNetworkError(err)) break   // weiterhin offline → später erneut
        console.error('[uploadQueue] Upload verworfen:', item.id, err)
        await removeUpload(item.id)
      }
    }
  } finally {
    processing = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processUploadQueue())
  setInterval(() => { if (navigator.onLine) processUploadQueue() }, 30000)
  setTimeout(() => { if (navigator.onLine) processUploadQueue() }, 4000)
}
