// Edge Function: contact-submit
// Nimmt Kontaktanfragen von luma.earth entgegen, validiert und speichert sie
// in public.contact_requests (Service-Role). Optional: E-Mail-Benachrichtigung
// an info@luma.earth, wenn das Secret RESEND_API_KEY gesetzt ist.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Nur POST erlaubt.' }, 405)

  let body
  try { body = await req.json() } catch { return json({ error: 'Ungueltiger JSON-Body.' }, 400) }

  // Honeypot: unsichtbares Feld — wenn gefuellt, war es ein Bot. Still "ok" antworten.
  if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const locale = typeof body.locale === 'string' ? body.locale.slice(0, 8) : null

  if (!name || name.length > 200) return json({ error: 'Bitte einen Namen angeben.' }, 400)
  if (!EMAIL_RE.test(email) || email.length > 320) return json({ error: 'Bitte eine gueltige E-Mail-Adresse angeben.' }, 400)
  if (!message || message.length > 5000) return json({ error: 'Bitte eine Nachricht angeben (max. 5000 Zeichen).' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const { error } = await admin.from('contact_requests').insert({
    name, email, message, locale,
    source: 'luma.earth',
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
  })
  if (error) {
    console.error('insert failed:', error)
    return json({ error: 'Speichern fehlgeschlagen. Bitte spaeter erneut versuchen.' }, 500)
  }

  // Optionale Benachrichtigung (Resend). Fehler hier brechen die Anfrage nicht ab.
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'LUMA Website <onboarding@resend.dev>',
          to: ['info@luma.earth'],
          reply_to: email,
          subject: `Neue Kontaktanfrage von ${name}`,
          text: `Name: ${name}\nE-Mail: ${email}\nSprache: ${locale ?? '-'}\n\n${message}`,
        }),
      })
    } catch (e) { console.error('mail notify failed:', e) }
  }

  return json({ ok: true })
})
