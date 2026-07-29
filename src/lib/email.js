// ────────────────────────────────────────────────────────────────
// LUMA Ops — E-Mail-Versand (via Supabase Edge Function `email`)
// Der Provider-Schlüssel liegt NUR serverseitig in den Edge-Function-
// Secrets; die Funktion prüft Login + Rolle (admin/mitarbeiter) und löst
// den Empfänger selbst aus clients.contact_email auf.
// ────────────────────────────────────────────────────────────────
import { sb } from './supabase.js'

/**
 * Verschickt eine E-Mail an einen Auftraggeber.
 *
 * @param {object} opts
 * @param {string} opts.clientId    Auftraggeber (bestimmt den Empfänger)
 * @param {string} opts.betreff
 * @param {string} opts.html
 * @param {string} [opts.text]      Nur-Text-Fassung
 * @param {string} [opts.typ]       'leistungsnachweis' (Default) | 'test' | …
 * @param {string} [opts.zeitraum]  z. B. '2026' oder '2026-07' (fürs Protokoll)
 * @param {string} [opts.to]        Abweichende Adresse — serverseitig nur
 *                                  erlaubt für die eigene Adresse (Testversand)
 * @returns {Promise<{ok: true, empfaenger: string, provider: string}>}
 */
export async function sendeEmail({ clientId, betreff, html, text, typ = 'leistungsnachweis', zeitraum, to } = {}) {
  const { data, error } = await sb.functions.invoke('email', {
    body: { client_id: clientId, betreff, html, text, typ, zeitraum, to },
  })
  if (error) {
    // FunctionsHttpError: die eigentliche Meldung steckt im Response-Body
    let msg = error.message
    try {
      const j = await error.context?.json?.()
      if (j?.error) msg = j.error
    } catch { /* Body nicht lesbar → generische Meldung behalten */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/** Bisherige Versände eines Auftraggebers (neueste zuerst). */
export async function versandProtokoll(clientId, limit = 12) {
  let q = sb.from('email_versand').select('*').order('gesendet_am', { ascending: false }).limit(limit)
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) return []
  return data || []
}
