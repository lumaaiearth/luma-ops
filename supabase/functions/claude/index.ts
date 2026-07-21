// ────────────────────────────────────────────────────────────────
// LUMA Ops — Claude-Proxy (Edge Function)
// Hält den ANTHROPIC_API_KEY serverseitig und macht Claude für die
// gesamte Plattform nutzbar (MANA-Entwürfe, künftige KI-Features).
// Zugriff nur für angemeldete interne Nutzer (admin/mitarbeiter).
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   Pflicht
//   CLAUDE_MODEL        optional, Default claude-opus-4-8
// ────────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Wer fragt? (JWT des eingeloggten Users)
    const authed = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await authed.auth.getUser()
    if (!user) return json({ error: 'Nicht angemeldet.' }, 401)

    // Rolle prüfen — nur internes Team darf Claude nutzen
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: prof } = await admin.from('user_profile').select('rolle').eq('id', user.id).single()
    if (!prof || !['admin', 'mitarbeiter'].includes(prof.rolle)) return json({ error: 'Keine Berechtigung.' }, 403)

    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return json({ error: 'ANTHROPIC_API_KEY ist noch nicht hinterlegt (Supabase Dashboard → Edge Functions → Secrets).' }, 503)
    }

    const { system, messages, max_tokens = 2000, schema } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'messages fehlt.' }, 400)

    const anthropic = new Anthropic()
    const params: Record<string, unknown> = {
      model: Deno.env.get('CLAUDE_MODEL') || 'claude-opus-4-8',
      max_tokens: Math.min(Number(max_tokens) || 2000, 8000),
      system,
      messages,
      thinking: { type: 'adaptive' },
    }
    if (schema) params.output_config = { format: { type: 'json_schema', schema } }

    // deno-lint-ignore no-explicit-any
    const res = await anthropic.messages.create(params as any)
    if (res.stop_reason === 'refusal') return json({ error: 'Anfrage wurde aus Sicherheitsgründen abgelehnt.' }, 422)
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    return json({ text, usage: res.usage, model: res.model })
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? e.message : String((e as Error)?.message ?? e)
    return json({ error: msg }, 500)
  }
})
