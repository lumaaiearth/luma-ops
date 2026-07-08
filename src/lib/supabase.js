import { createClient } from '@supabase/supabase-js'

const URL  = 'https://eqwoyfsfyohtcibithak.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd295ZnNmeW9odGNpYml0aGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzU1NzUsImV4cCI6MjA5NTY1MTU3NX0.lygoUkOrF627c_FZrgigugmxp-H0Cq_Nv9Au8vFdcSU'

export const sb = createClient(URL, ANON)

// ── Generic helpers ────────────────────────────────────────────────────────────

export async function sbGet(table) {
  const { data, error } = await sb.from(table).select('*')
  if (error) throw error
  return data
}

export async function sbUpsert(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function sbDelete(table, id) {
  const { error } = await sb.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function sbInsert(table, row) {
  // Use upsert so duplicate IDs don't crash — safer than insert for idempotent creates
  const { data, error } = await sb.from(table).upsert(row, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data
}

export async function sbUpdate(table, id, changes) {
  const { error } = await sb.from(table).update(changes).eq('id', id)
  if (error) throw error
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
