import { createClient } from '@supabase/supabase-js'
import { enqueue, isNetworkError, flushOutbox } from './outbox.js'

const URL  = 'https://eqwoyfsfyohtcibithak.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd295ZnNmeW9odGNpYml0aGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzU1NzUsImV4cCI6MjA5NTY1MTU3NX0.lygoUkOrF627c_FZrgigugmxp-H0Cq_Nv9Au8vFdcSU'

// Basis-URL — u.a. zum Bauen öffentlicher Storage-URLs (z.B. Orthomosaik-Kacheln)
export const SUPABASE_URL = URL

export const sb = createClient(URL, ANON)

// ── Generic helpers ────────────────────────────────────────────────────────────

export async function sbGet(table) {
  const { data, error } = await sb.from(table).select('*')
  if (error) throw error
  return data
}

// ── Rohe DB-Operationen (werfen bei Fehler) ────────────────────────────────────
async function _upsert(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw error
}
async function _delete(table, id) {
  const { error } = await sb.from(table).delete().eq('id', id)
  if (error) throw error
}
async function _insert(table, row) {
  const { data, error } = await sb.from(table).upsert(row, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}
async function _update(table, id, changes) {
  const { error } = await sb.from(table).update(changes).eq('id', id)
  if (error) throw error
}

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine

// ── Offline-fähige Helfer: puffern bei Offline/Netzwerkfehler in die Outbox ─────
export async function sbUpsert(table, rows) {
  if (isOffline()) { enqueue({ op: 'upsert', table, rows }); return }
  try { return await _upsert(table, rows) }
  catch (e) { if (isNetworkError(e)) { enqueue({ op: 'upsert', table, rows }); return } throw e }
}

export async function sbDelete(table, id) {
  if (isOffline()) { enqueue({ op: 'delete', table, id }); return }
  try { return await _delete(table, id) }
  catch (e) { if (isNetworkError(e)) { enqueue({ op: 'delete', table, id }); return } throw e }
}

export async function sbInsert(table, row) {
  // Use upsert so duplicate IDs don't crash — safer than insert for idempotent creates
  if (isOffline()) { enqueue({ op: 'insert', table, row }); return row }
  try { return await _insert(table, row) }
  catch (e) { if (isNetworkError(e)) { enqueue({ op: 'insert', table, row }); return row } throw e }
}

export async function sbUpdate(table, id, changes) {
  if (isOffline()) { enqueue({ op: 'update', table, id, changes }); return }
  try { return await _update(table, id, changes) }
  catch (e) { if (isNetworkError(e)) { enqueue({ op: 'update', table, id, changes }); return } throw e }
}

// Outbox abarbeiten
async function performOutboxOp(e) {
  if (e.op === 'upsert') return _upsert(e.table, e.rows)
  if (e.op === 'update') return _update(e.table, e.id, e.changes)
  if (e.op === 'delete') return _delete(e.table, e.id)
  if (e.op === 'insert') return _insert(e.table, e.row)
}
export function flushSbOutbox() { return flushOutbox(performOutboxOp) }

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushSbOutbox())
  setInterval(() => { if (navigator.onLine) flushSbOutbox() }, 30000)
  setTimeout(() => { if (navigator.onLine) flushSbOutbox() }, 3000)
}

// ── Storage: Job Photos ────────────────────────────────────────────────────────

export async function sbUploadPhoto(jobId, photoId, blob) {
  const path = `${jobId}/${photoId}.jpg`
  const { error } = await sb.storage.from('job-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = sb.storage.from('job-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function sbDeletePhoto(jobId, photoId) {
  const { error } = await sb.storage.from('job-photos').remove([`${jobId}/${photoId}.jpg`])
  if (error) throw error
}

export async function sbGetJobPhotos(jobId) {
  const { data, error } = await sb.from('job_photos').select('*').eq('job_id', jobId).order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Storage: Task Photos (reuse the 'job-photos' bucket with a task prefix) ─────

export async function sbUploadTaskPhoto(taskId, photoId, blob) {
  const path = `task_${taskId}/${photoId}.jpg`
  const { error } = await sb.storage.from('job-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = sb.storage.from('job-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function sbDeleteTaskPhoto(taskId, photoId) {
  const { error } = await sb.storage.from('job-photos').remove([`task_${taskId}/${photoId}.jpg`])
  if (error) throw error
}

export async function sbGetTaskPhotos(taskId) {
  const { data, error } = await sb.from('task_photos').select('*').eq('task_id', taskId).order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Storage: Task Files (beliebige Dateien, reuse 'job-photos' bucket) ──────────

export async function sbUploadTaskFile(taskId, fileId, file) {
  const path = `taskfile_${taskId}/${fileId}`
  const { error } = await sb.storage.from('job-photos').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw error
  const { data } = sb.storage.from('job-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function sbDeleteTaskFile(taskId, fileId) {
  const { error } = await sb.storage.from('job-photos').remove([`taskfile_${taskId}/${fileId}`])
  if (error) throw error
}

export async function sbGetTaskFiles(taskId) {
  const { data, error } = await sb.from('task_files').select('*').eq('task_id', taskId).order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}
