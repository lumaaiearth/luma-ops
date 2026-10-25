import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BFL_BASE = 'https://api.bfl.ai'
const DEFAULT_MODEL = 'flux-pro-1.1'
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 90000

const PASSTHROUGH = ['width','height','aspect_ratio','prompt_upsampling','seed','safety_tolerance','output_format','raw','image_prompt','input_image']

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Nur POST erlaubt.' }, 405)

  const apiKey = Deno.env.get('BFL_API_KEY')
  if (!apiKey) return json({ error: 'BFL_API_KEY ist nicht gesetzt (Edge Function -> Secrets).' }, 500)

  let body
  try { body = await req.json() } catch { return json({ error: 'Ungueltiger JSON-Body.' }, 400) }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return json({ error: 'Feld prompt fehlt oder ist leer.' }, 400)

  const model = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL

  const payload = { prompt }
  for (const key of PASSTHROUGH) { if (body[key] !== undefined) payload[key] = body[key] }
  if (payload.output_format === undefined) payload.output_format = 'jpeg'
  const sizeBased = !model.includes('ultra') && !model.includes('kontext')
  if (sizeBased && payload.width === undefined && payload.height === undefined && payload.aspect_ratio === undefined) { payload.width = 1024; payload.height = 1024 }

  let createRes
  try {
    createRes = await fetch(`${BFL_BASE}/v1/${model}`, { method: 'POST', headers: { accept: 'application/json', 'x-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  } catch (e) { return json({ error: `BFL nicht erreichbar: ${String(e)}` }, 502) }

  if (!createRes.ok) { const detail = await createRes.text().catch(() => ''); return json({ error: `BFL-Fehler (${createRes.status}): ${detail || createRes.statusText}` }, 502) }

  const created = await createRes.json().catch(() => ({}))
  const pollingUrl = created.polling_url
  const requestId = created.id
  if (!pollingUrl && !requestId) return json({ error: 'BFL lieferte keine polling_url / id zurueck.' }, 502)
  const pollUrl = pollingUrl || `${BFL_BASE}/v1/get_result?id=${requestId}`

  const deadline = Date.now() + POLL_TIMEOUT_MS
  let sampleUrl
  let seed
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    let pollRes
    try { pollRes = await fetch(pollUrl, { headers: { accept: 'application/json', 'x-key': apiKey } }) } catch { continue }
    if (!pollRes.ok) continue
    const data = await pollRes.json().catch(() => ({}))
    const status = data.status
    if (status === 'Ready') { sampleUrl = data.result?.sample; seed = data.result?.seed; break }
    if (status === 'Pending' || status === 'Queued' || status === 'Processing') continue
    return json({ error: `BFL-Status: ${status ?? 'unbekannt'}` }, 422)
  }

  if (!sampleUrl) return json({ error: 'Zeitueberschreitung beim Generieren des Bildes.' }, 504)

  let imageUrl = sampleUrl
  let persisted = false
  if (body.persist === true) {
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
      const imgRes = await fetch(sampleUrl)
      const bytes = new Uint8Array(await imgRes.arrayBuffer())
      const ext = payload.output_format === 'png' ? 'png' : 'jpeg'
      const path = `generated/${requestId ?? crypto.randomUUID()}.${ext}`
      const { error: upErr } = await admin.storage.from('job-photos').upload(path, bytes, { contentType: `image/${ext}`, upsert: true })
      if (upErr) throw upErr
      const { data: pub } = admin.storage.from('job-photos').getPublicUrl(path)
      imageUrl = pub.publicUrl
      persisted = true
    } catch (e) { console.error('persist failed:', e) }
  }

  return json({ imageUrl, bflUrl: sampleUrl, persisted, prompt, model, seed, width: payload.width, height: payload.height })
})
