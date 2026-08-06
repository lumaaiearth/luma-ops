// Fetch mit Zeitlimit für externe Geodienste (GDI Berlin, Overpass, DWD …).
// Ohne Limit kann ein hängender Dienst eine Analyse endlos „laden" lassen —
// im Feld sieht das aus wie ein Absturz. Bricht ab und wirft einen Fehler,
// den die Aufrufer als „Dienst nicht erreichbar" behandeln.

export class TimeoutError extends Error {
  constructor(ms) {
    super(`Zeitüberschreitung nach ${Math.round(ms / 1000)} s`)
    this.name = 'TimeoutError'
    this.isTimeout = true
  }
}

// options.signal wird respektiert (z.B. Panel geschlossen → Abbruch)
export async function fetchT(url, { timeout = 15000, signal, ...init } = {}) {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (err) {
    // Vom Timer abgebrochen (und nicht vom Aufrufer) → als Timeout melden
    if (err?.name === 'AbortError' && !signal?.aborted) throw new TimeoutError(timeout)
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener?.('abort', onAbort)
  }
}

// Begrenzt gleichzeitige Anfragen (Fachdienste mögen keine 50 parallelen Calls)
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const worker = async () => {
    while (i < items.length) {
      const idx = i++
      try { out[idx] = await fn(items[idx], idx) } catch { out[idx] = null }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}
