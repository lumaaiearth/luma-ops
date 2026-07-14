// Supabase Edge Function: generate-image
// Generiert Bilder über die Black Forest Labs (FLUX) API.
//
// Der BFL-Key liegt als Secret `BFL_API_KEY` (Dashboard → Edge Functions → Secrets)
// und verlässt niemals den Server – das Frontend ruft nur diese Function auf.
//
// Aufruf (POST, JSON):
//   { "prompt": "...", "model"?: "flux-pro-1.1", "width"?, "height"?,
//     "aspect_ratio"?, "seed"?, "prompt_upsampling"?, "safety_tolerance"?,
//     "output_format"? ("jpeg"|"png"), "persist"?: boolean }
//
// Antwort:
//   { imageUrl, bflUrl, persisted, prompt, model, seed, width, height }
//   - imageUrl: dauerhafte URL (bei persist=true aus Supabase Storage), sonst = bflUrl
//   - bflUrl:   temporäre BFL-URL (läuft nach ~10 Minuten ab)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BFL_BASE = 'https://api.bfl.ai'
const DEFAULT_MODEL = 'flux-pro-1.1'
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 90_000

// Parameter, die (falls gesetzt) unverändert an BFL durchgereicht werden.
const PASSTHROUGH = [
  'width', 'height', 'aspect_ratio', 'prompt_upsampling', 'seed',
  'safety_tolerance', 'output_format', 'raw', 'image_prompt', 'input_image',
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Nur POST erlaubt.' }, 405)

  const apiKey = Deno.env.get('BFL_API_KEY')
  if (!apiKey) {
    return json({ error: 'BFL_API_KEY ist nicht gesetzt (Edge Function → Secrets).' }, 500)
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Ungültiger JSON-Body.' }, 400)
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return json({ error: 'Feld "prompt" fehlt oder ist leer.' }, 400)

  const model = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL

  // Nutzlast für BFL zusammenbauen
  const payload: Record<string, unknown> = { prompt }
  for (const key of PASSTHROUGH) {
    if (body[key] !== undefined) payload[key] = body[key]
  }
  // Deterministisches Format (für Storage-Endung), falls nicht vorgegeben
  if (payload.output_format === undefined) payload.output_format = 'jpeg'
  // Sinnvolle Standardgröße für größenbasierte Modelle (ultra/kontext nutzen aspect_ratio)
  const sizeBased = !model.includes('ultra') && !model.includes('kontext')
  if (sizeBased && payload.width === undefined && payload.height === undefined && payload.aspect_ratio === undefined) {
    payload.width = 1024
    payload.height = 1024
  }

  // 1) Generierung anstoßen
  let createRes: Response
  try {
    createRes = await fetch(`${BFL_BASE}/v1/${model}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'x-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    return json({ error: `BFL nicht erreichbar: ${String(e)}` }, 502)
  }

  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => '')
    return json({ error: `BFL-Fehler (${createRes.status}): ${detail || createRes.statusText}` }, 502)
  }

  const created = await createRes.json().catch(() => ({}))
  const pollingUrl: string | undefined = created.polling_url
  const requestId: string | undefined = created.id
  if (!pollingUrl && !requestId) {
    return json({ error: 'BFL lieferte keine polling_url / id zurück.' }, 502)
  }
  const pollUrl = pollingUrl || `${BFL_BASE}/v1/get_result?id=${requestId}`

  // 2) Auf Ergebnis pollen
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let sampleUrl: string | undefined
  let seed: number | undefined
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    let pollRes: Response
    try {
      pollRes = await fetch(pollUrl, { headers: { accept: 'application/json', 'x-key': apiKey } })
    } catch {
      continue // transienter Netzwerkfehler → weiter versuchen
    }
    if (!pollRes.ok) continue

    const data = await pollRes.json().catch(() => ({}))
    const status = data.status

    if (status === 'Ready') {
      sampleUrl = data.result?.sample
      seed = data.result?.seed
      break
    }
    if (status === 'Pending' || status === 'Queued' || status === 'Processing') continue
    // Moderation / Fehler / nicht gefunden → abbrechen
    return json({ error: `BFL-Status: ${status ?? 'unbekannt'}` }, 422)
  }

  if (!sampleUrl) return json({ error: 'Zeitüberschreitung beim Generieren des Bildes.' }, 504)

  // 3) Optional dauerhaft in Supabase Storage sichern (BFL-URL läuft nach ~10 Min ab)
  let imageUrl = sampleUrl
  let persisted = false
  if (body.persist === true) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const admin = createClient(supabaseUrl, serviceKey)

      const imgRes = await fetch(sampleUrl)
      const bytes = new Uint8Array(await imgRes.arrayBuffer())
      const ext = payload.output_format === 'png' ? 'png' : 'jpeg'
      const path = `generated/${requestId ?? crypto.randomUUID()}.${ext}`

      const { error: upErr } = await admin.storage
        .from('job-photos')
        .upload(path, bytes, { contentType: `image/${ext}`, upsert: true })
      if (upErr) throw upErr

      const { data: pub } = admin.storage.from('job-photos').getPublicUrl(path)
      imageUrl = pub.publicUrl
      persisted = true
    } catch (e) {
      // Persistieren fehlgeschlagen → wenigstens die temporäre BFL-URL zurückgeben
      console.error('persist failed:', e)
    }
  }

  return json({
    imageUrl,
    bflUrl: sampleUrl,
    persisted,
    prompt,
    model,
    seed,
    width: payload.width,
    height: payload.height,
  })
})
