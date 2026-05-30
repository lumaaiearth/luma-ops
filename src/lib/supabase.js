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
  const { data, error } = await sb.from(table).insert(row).select().single()
  if (error) throw error
  return data
}

export async function sbUpdate(table, id, changes) {
  const { error } = await sb.from(table).update(changes).eq('id', id)
  if (error) throw error
}
