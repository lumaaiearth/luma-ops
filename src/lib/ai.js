// ────────────────────────────────────────────────────────────────
// LUMA Ops — KI-Helfer (Claude via Supabase Edge Function `claude`)
// Der API-Key liegt NUR serverseitig in den Edge-Function-Secrets;
// die Funktion prüft Login + Rolle (admin/mitarbeiter).
// ────────────────────────────────────────────────────────────────
import { sb } from './supabase.js'

/**
 * Stellt Claude eine Frage.
 * @param {object} opts
 * @param {string} [opts.system]    Systemprompt
 * @param {string} [opts.prompt]    Einfache Nutzer-Nachricht (Alternative zu messages)
 * @param {Array}  [opts.messages]  Volle Messages-Liste [{role, content}]
 * @param {number} [opts.maxTokens]
 * @param {object} [opts.schema]    JSON-Schema → Antwort ist garantiert valides JSON
 * @returns {Promise<string>} Antworttext (bei schema: JSON-String → selbst parsen)
 */
export async function askClaude({ system, prompt, messages, maxTokens = 2000, schema } = {}) {
  const body = {
    system,
    messages: messages || [{ role: 'user', content: prompt || '' }],
    max_tokens: maxTokens,
    schema,
  }
  const { data, error } = await sb.functions.invoke('claude', { body })
  if (error) {
    // FunctionsHttpError: eigentliche Fehlermeldung steckt im Response-Body
    let msg = error.message
    try {
      const j = await error.context?.json?.()
      if (j?.error) msg = j.error
    } catch { /* Body nicht lesbar → generische Meldung behalten */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data?.text ?? ''
}
