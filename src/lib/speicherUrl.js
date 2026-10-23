// ─────────────────────────────────────────────────────────────────────────────
// Speicher-URLs: signierte statt öffentlicher Links
//
// Fotos, Profilbilder und Anhänge liegen in Supabase Storage. Gespeichert sind
// in der Datenbank die öffentlichen URLs (…/storage/v1/object/public/<bucket>/
// <pfad>). Solange ein Bucket öffentlich ist, funktionieren sie für jeden, der
// sie kennt — auch ohne Anmeldung.
//
// Diese Hilfe macht daraus beim Anzeigen einen zeitlich begrenzten, signierten
// Link. Ob jemand ihn bekommt, entscheiden die Storage-Policies (Team, Kunde
// der eigenen Organisation, öffentliche Projekte). Klappt das Signieren nicht
// (z. B. weil der Bucket noch öffentlich ist und keine Policy greift), bleibt
// die ursprüngliche URL stehen — so läuft die App vor und nach dem Umschalten
// der Buckets.
//
// Fremde URLs (Google-Profilbild, data:, blob:) werden unverändert durchgereicht.
// ─────────────────────────────────────────────────────────────────────────────

import { sb, SUPABASE_URL } from './supabase.js'

const GUELTIG_S = 60 * 60          // signierter Link gilt eine Stunde
const PUFFER_MS = 5 * 60 * 1000    // fünf Minuten vor Ablauf neu holen

const PRAEFIX = `${SUPABASE_URL}/storage/v1/object/`

/**
 * Zerlegt eine Storage-URL in Bucket und Pfad.
 * Erkennt öffentliche (…/object/public/…) und signierte (…/object/sign/…) Links.
 * @returns {{bucket: string, pfad: string} | null}  null bei fremden URLs
 */
export function speicherOrt(url) {
  if (typeof url !== 'string' || !url.startsWith(PRAEFIX)) return null
  const rest = url.slice(PRAEFIX.length).split('?')[0]
  const m = /^(?:public|sign|authenticated)\/([^/]+)\/(.+)$/.exec(rest)
  if (!m) return null
  return { bucket: m[1], pfad: decodeURIComponent(m[2]) }
}

const cache = new Map()   // `${bucket}/${pfad}` → { url, bis }
const laufend = new Map() // dieselbe Anfrage nicht doppelt stellen

/** Signierte URL zu einer Speicher-URL; fremde URLs kommen unverändert zurück. */
export async function signiere(url, { gueltigS = GUELTIG_S } = {}) {
  const ort = speicherOrt(url)
  if (!ort) return url
  const key = `${ort.bucket}/${ort.pfad}`
  const hit = cache.get(key)
  if (hit && hit.bis - PUFFER_MS > Date.now()) return hit.url
  if (laufend.has(key)) return laufend.get(key)

  const p = sb.storage.from(ort.bucket).createSignedUrl(ort.pfad, gueltigS)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) return url    // Rückfall: ursprüngliche URL
      cache.set(key, { url: data.signedUrl, bis: Date.now() + gueltigS * 1000 })
      return data.signedUrl
    })
    .catch(() => url)
    .finally(() => laufend.delete(key))
  laufend.set(key, p)
  return p
}

/** Mehrere URLs auf einmal (z. B. vor dem Drucken eines Nachweises). */
export function signiereAlle(urls, opts) {
  return Promise.all((urls || []).map((u) => signiere(u, opts)))
}

// Anzeige in React: src/components/SpeicherBild.jsx (useSpeicherUrl, <SpeicherBild>).
