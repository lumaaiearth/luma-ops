// Offline-Schreib-Warteschlange ("Outbox").
// Schreiboperationen, die offline (oder bei Netzwerkfehler) nicht durchgehen,
// werden lokal gepuffert und bei Reconnect automatisch abgearbeitet.

const KEY = 'luma_outbox_v1'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}
function write(q) {
  try { localStorage.setItem(KEY, JSON.stringify(q)) } catch { /* Quota o.ä. */ }
  emit()
}

const subs = new Set()
export function onOutboxChange(fn) { subs.add(fn); return () => subs.delete(fn) }
function emit() {
  const n = read().length
  subs.forEach(f => { try { f(n) } catch { /* ignore */ } })
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('luma-outbox', { detail: n }))
}

export function outboxCount() { return read().length }

export function enqueue(entry) {
  const q = read()
  const _id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random()
  q.push({ ...entry, _id, ts: Date.now() })
  write(q)
}

// Netzwerkfehler (offline) von logischen DB-Fehlern (RLS/Constraint) unterscheiden
export function isNetworkError(err) {
  if (!err) return false
  if (err.name === 'TypeError') return true
  const m = String(err.message || '').toLowerCase()
  return m.includes('failed to fetch') || m.includes('networkerror') ||
         m.includes('load failed') || m.includes('network request failed') ||
         m.includes('fetch failed')
}

// Auth-/RLS-Fehler erkennen. Diese sind transient wie ein Netzwerkfehler:
// Sobald eine gültige Session mit passenden Rechten besteht (nach Login oder
// Token-Refresh), geht der Schreibvorgang durch. Deshalb Eintrag behalten und
// später erneut versuchen, statt ihn zu verwerfen (= Datenverlust).
export function isAuthOrRlsError(err) {
  if (!err) return false
  const code = String(err.code || '')
  if (code === '42501') return true                            // Postgres: RLS-Verletzung (insufficient_privilege)
  if (code === 'PGRST301' || code === 'PGRST302') return true  // PostgREST: JWT expired / anon nicht erlaubt
  const status = Number(err.status ?? err.statusCode ?? 0)
  if (status === 401 || status === 403) return true
  const m = String(err.message || '').toLowerCase()
  return m.includes('row-level security') || m.includes('row level security') ||
         m.includes('jwt') || m.includes('not authenticated') ||
         m.includes('permission denied')
}

let flushing = false
// runOp(entry) führt eine Operation gegen die DB aus (wirft bei Fehler).
export async function flushOutbox(runOp) {
  if (flushing || typeof navigator !== 'undefined' && !navigator.onLine) return
  flushing = true
  try {
    while (true) {
      const q = read()
      if (!q.length) break
      const e = q[0]
      try {
        await runOp(e)
      } catch (err) {
        // Offline oder Session/Rechte noch nicht bereit → Eintrag behalten und
        // später erneut versuchen (nicht verwerfen, sonst Datenverlust).
        if (isNetworkError(err) || isAuthOrRlsError(err)) break
        console.error('[outbox] Operation verworfen (logischer Fehler):', e, err)
        // echter logischer Fehler (Constraint/Schema) → entfernen, damit die
        // Queue nicht dauerhaft blockiert
      }
      const q2 = read(); q2.shift(); write(q2)
    }
  } finally {
    flushing = false
  }
}
