// ────────────────────────────────────────────────────────────────
// LUMA Ops — E-Mail-Versand (Edge Function)
// Hält den Provider-Schlüssel serverseitig und verschickt Nachrichten an
// Auftraggeber (Leistungsnachweis, später Saison-Hinweise).
// Zugriff nur für angemeldete interne Nutzer (admin/mitarbeiter).
//
// Kein offenes Relay: Der Empfänger wird NICHT vom Client bestimmt, sondern
// serverseitig aus clients.contact_email aufgelöst. Ein abweichendes `to`
// ist nur erlaubt, wenn es die eigene Adresse der/des Absendenden ist
// (Testversand). Sonst wäre die Funktion mit dem öffentlichen anon-Key ein
// Werkzeug zum Spam-Versand unter eurer Domain.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   EMAIL_FROM        Pflicht, z. B. "LUMA Biome <nachweis@luma.earth>"
//   BREVO_API_KEY     Provider Brevo (EU/Frankreich) — empfohlen, s. docs
//   RESEND_API_KEY    Alternativ Provider Resend
//   EMAIL_PROVIDER    optional 'brevo' | 'resend' (sonst automatisch)
// ────────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** "LUMA Biome <nachweis@luma.earth>" → { name, email } */
function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/)
  if (m) return { name: m[1].replace(/^"|"$/g, ''), email: m[2] }
  return { name: 'LUMA', email: raw.trim() }
}

const istEmail = (s: unknown) =>
  typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

type Versand = { to: string; betreff: string; html: string; text?: string; replyTo?: string }

async function sendeBrevo(key: string, from: { name: string; email: string }, v: Versand) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: from,
      to: [{ email: v.to }],
      subject: v.betreff,
      htmlContent: v.html,
      ...(v.text ? { textContent: v.text } : {}),
      ...(v.replyTo ? { replyTo: { email: v.replyTo } } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return 'brevo'
}

async function sendeResend(key: string, from: { name: string; email: string }, v: Versand) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${from.name} <${from.email}>`,
      to: [v.to],
      subject: v.betreff,
      html: v.html,
      ...(v.text ? { text: v.text } : {}),
      ...(v.replyTo ? { reply_to: v.replyTo } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return 'resend'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let userId: string | null = null
  let clientId: string | null = null
  let empfaenger = ''
  let betreff = ''
  let typ = 'leistungsnachweis'
  let zeitraum: string | null = null

  try {
    // Wer fragt? (JWT der/des eingeloggten Nutzenden)
    const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return json({ error: 'Nicht angemeldet.' }, 401)
    userId = user.id

    const { data: prof } = await admin.from('user_profile').select('rolle').eq('id', user.id).single()
    if (!prof || !['admin', 'mitarbeiter'].includes(prof.rolle)) {
      return json({ error: 'Keine Berechtigung.' }, 403)
    }

    const fromRaw = Deno.env.get('EMAIL_FROM')
    const brevo = Deno.env.get('BREVO_API_KEY')
    const resend = Deno.env.get('RESEND_API_KEY')
    if (!fromRaw) {
      return json({ error: 'EMAIL_FROM ist noch nicht hinterlegt (Supabase Dashboard → Edge Functions → Secrets).' }, 503)
    }
    if (!brevo && !resend) {
      return json({ error: 'Kein E-Mail-Provider hinterlegt. BREVO_API_KEY oder RESEND_API_KEY als Secret setzen.' }, 503)
    }

    const body = await req.json()
    betreff = String(body.betreff ?? '').trim()
    typ = String(body.typ ?? 'leistungsnachweis')
    zeitraum = body.zeitraum ? String(body.zeitraum) : null
    clientId = body.client_id ? String(body.client_id) : null
    const html = String(body.html ?? '')
    const text = body.text ? String(body.text) : undefined

    if (!betreff) return json({ error: 'Betreff fehlt.' }, 400)
    if (!html) return json({ error: 'Inhalt fehlt.' }, 400)

    // ── Empfänger serverseitig bestimmen ──────────────────────────────
    let kundenAdresse: string | null = null
    if (clientId) {
      const { data: c } = await admin.from('clients')
        .select('contact_email, name').eq('id', clientId).single()
      if (!c) return json({ error: 'Auftraggeber nicht gefunden.' }, 404)
      kundenAdresse = istEmail(c.contact_email) ? String(c.contact_email).trim() : null
    }

    const gewuenscht = istEmail(body.to) ? String(body.to).trim() : null
    if (gewuenscht) {
      // Abweichende Adresse nur als Testversand an sich selbst.
      const erlaubt = gewuenscht.toLowerCase() === String(user.email ?? '').toLowerCase()
        || (kundenAdresse && gewuenscht.toLowerCase() === kundenAdresse.toLowerCase())
      if (!erlaubt) {
        return json({
          error: 'Empfänger nicht zulässig. Es kann nur an die hinterlegte Adresse des Auftraggebers oder zum Test an die eigene Adresse gesendet werden.',
        }, 403)
      }
      empfaenger = gewuenscht
    } else if (kundenAdresse) {
      empfaenger = kundenAdresse
    } else {
      return json({
        error: 'Für diesen Auftraggeber ist keine Kontakt-E-Mail hinterlegt (Stammdaten → Kunde bearbeiten).',
      }, 400)
    }

    // ── Senden ────────────────────────────────────────────────────────
    const from = parseFrom(fromRaw)
    const wunsch = (Deno.env.get('EMAIL_PROVIDER') || '').toLowerCase()
    const nutzeBrevo = wunsch === 'brevo' ? true : wunsch === 'resend' ? false : Boolean(brevo)
    const versand: Versand = {
      to: empfaenger, betreff, html, text,
      replyTo: istEmail(user.email) ? String(user.email) : undefined,
    }
    const provider = nutzeBrevo && brevo
      ? await sendeBrevo(brevo, from, versand)
      : await sendeResend(resend!, from, versand)

    await admin.from('email_versand').insert({
      typ, client_id: clientId, empfaenger, betreff, zeitraum,
      status: 'gesendet', provider, gesendet_von: userId,
    })

    return json({ ok: true, empfaenger, provider })
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    // Fehlschläge ebenfalls protokollieren — sonst bleibt unklar, ob eine
    // Nachricht rausging. Der Log-Schreibfehler darf die Antwort nicht kippen.
    try {
      if (empfaenger) {
        await admin.from('email_versand').insert({
          typ, client_id: clientId, empfaenger, betreff, zeitraum,
          status: 'fehler', fehler: msg.slice(0, 800), gesendet_von: userId,
        })
      }
    } catch { /* ignorieren */ }
    return json({ error: msg }, 500)
  }
})
