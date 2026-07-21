#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// MANA™ CHANCEN — wöchentlicher Recherche-Agent
//
// Claude Opus 4.8 recherchiert mit Web-Suche (Anthropic-Server-Tool) Chancen
// jenseits förmlicher Ausschreibungen: Förderprogramme, kommunale Vorhaben,
// private Projekte mit Grünbezug. Neue Leads → mana_leads, Digest → Telegram.
//
// Aufruf:  node scripts/mana-chancen.mjs [--dry-run] [--focus="…"]
// Env:     ANTHROPIC_API_KEY (Pflicht), SUPABASE_SERVICE_KEY (Pflicht, außer --dry-run),
//          TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (optional)
// Abhängigkeit (nicht committen): npm i --no-save @anthropic-ai/sdk
// ════════════════════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eqwoyfsfyohtcibithak.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const MODEL = process.env.MANA_MODEL || 'claude-opus-4-8'

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/)
  return m ? [m[1], m[2] ?? true] : [a, true]
}))
const DRY = !!args['dry-run']

const log = (...m) => console.log(...m)
function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }
if (!process.env.ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY fehlt')
if (!DRY && !SERVICE_KEY) fail('SUPABASE_SERVICE_KEY fehlt (oder --dry-run nutzen)')

async function sbRest(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function loadProfil() {
  const fallback = { firmenprofil: 'LUMA: ökologischer Garten- und Landschaftsbau, Pflanzungen, Miyawaki-Wälder, Grünpflege.', min_score: 60, aktiv: true }
  if (!SERVICE_KEY) return fallback
  try { return (await sbRest('mana_profil?id=eq.1'))?.[0] || fallback }
  catch { return fallback }
}

const leadId = (l) => createHash('sha1').update(String(l.url || l.titel)).digest('hex').slice(0, 24)

function buildPrompt(profil) {
  const focus = typeof args.focus === 'string' ? `\nZusätzlicher Fokus diese Woche: ${args.focus}` : ''
  return `Recherchiere im Web AKTUELLE Geschäftschancen für LUMA in Deutschland (Schwerpunkt: letzte 4-6 Wochen). Drei Kategorien:

1. FÖRDERPROGRAMME (typ "foerderung"): neue oder wieder geöffnete Förderungen für Stadtbegrünung, Klimaanpassung, Entsiegelung, Baumpflanzung (Bund, Länder, Stiftungen) — relevant, weil LUMA-Kunden sie nutzen können oder LUMA-Projekte damit finanzierbar werden.
2. KOMMUNALE VORHABEN (typ "vorhaben"): Beschlüsse, Klimaanpassungskonzepte, Begrünungs-/Schwammstadt-Programme einzelner Städte, bevor daraus Ausschreibungen werden.
3. PRIVATE CHANCEN (typ "privat"): Wohnungswirtschaft, Unternehmen, Projekte mit Begrünungspflichten oder -plänen.
${focus}
Nutze die Web-Suche gründlich (mehrere Suchanfragen pro Kategorie). Nimm NUR Treffer mit konkreter, funktionierender Quell-URL auf. Keine Duplikate, keine erfundenen Inhalte.

Antworte am Ende AUSSCHLIESSLICH mit einem \`\`\`json-Block: ein Array aus maximal 12 Objekten
{"titel": "...", "typ": "foerderung|vorhaben|privat", "region": "Bundesland/Stadt oder bundesweit", "zusammenfassung": "2-3 Sätze", "url": "https://...", "score": 0-100, "begruendung": "1 Satz, warum das für LUMA lukrativ ist"}`
}

async function research(profil) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const anthropic = new Anthropic()
  const system = `Du bist MANA, der Akquise-Recherche-Agent von LUMA.\n\nFIRMENPROFIL:\n${profil.firmenprofil}\n\nDu bewertest Chancen danach, wie lukrativ und passend sie für LUMA sind (Score 0-100).`
  const messages = [{ role: 'user', content: buildPrompt(profil) }]
  let res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system,
    messages,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 14 }],
  })
  // Server-Tool-Schleife kann pausieren → Assistant-Turn anhängen und fortsetzen
  let guard = 0
  while (res.stop_reason === 'pause_turn' && guard++ < 5) {
    messages.push({ role: 'assistant', content: res.content })
    res = await anthropic.messages.create({
      model: MODEL, max_tokens: 8000, thinking: { type: 'adaptive' }, system, messages,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 14 }],
    })
  }
  if (res.stop_reason === 'refusal') throw new Error('Claude refusal')
  const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('')
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/)
  if (!m) throw new Error(`Kein JSON in der Antwort gefunden:\n${text.slice(0, 400)}`)
  const leads = JSON.parse(m[1])
  if (!Array.isArray(leads)) throw new Error('Antwort ist kein Array')
  return leads.filter(l => l?.titel && l?.url)
}

async function telegram(leads) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat || leads.length === 0) return false
  const TYP = { foerderung: '💶 Förderung', vorhaben: '🏛 Vorhaben', privat: '🏢 Privat', sonstiges: '✳️' }
  const lines = leads.slice(0, 10).map(l =>
    `▪️ [${l.score}] ${TYP[l.typ] || l.typ} · ${l.titel}\n   ${l.region || ''}\n   ${l.url}`)
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: `🔭 MANA CHANCEN · ${leads.length} neue Leads\n\n${lines.join('\n\n')}`, disable_web_page_preview: true }),
  })
  if (!res.ok) log(`⚠ Telegram: ${res.status} ${await res.text()}`)
  return res.ok
}

async function main() {
  const profil = await loadProfil()
  if (!profil.aktiv) { log('Profil inaktiv — Recherche übersprungen.'); return }
  log(`MANA CHANCEN · Modell ${MODEL}${DRY ? ' · DRY-RUN' : ''}`)

  const found = await research(profil)
  log(`  ${found.length} Leads recherchiert`)

  const rows = found.map(l => ({
    id: leadId(l),
    typ: ['foerderung', 'vorhaben', 'privat'].includes(l.typ) ? l.typ : 'sonstiges',
    titel: l.titel, zusammenfassung: l.zusammenfassung || null,
    region: l.region || null, url: l.url, score: Number(l.score) || null,
    begruendung: l.begruendung || null,
  }))
  for (const r of rows) log(`  ${String(r.score ?? '–').padStart(3)} · ${r.typ.padEnd(10)} · ${r.titel}`)

  if (DRY) { log(`DRY-RUN — nichts geschrieben (${rows.length} Leads)`); return }

  // ignore-duplicates: bestehende Leads (inkl. Status/Notizen) bleiben unangetastet
  const before = new Set((await sbRest(`mana_leads?select=id&id=in.(${rows.map(r => `"${r.id}"`).join(',')})`)).map(r => r.id))
  const fresh = rows.filter(r => !before.has(r.id))
  if (fresh.length > 0) {
    await sbRest('mana_leads', {
      method: 'POST', body: fresh,
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    })
  }
  log(`✓ ${fresh.length} neue Leads gespeichert (${rows.length - fresh.length} bereits bekannt)`)
  const hits = fresh.filter(r => (r.score ?? 0) >= (profil.min_score ?? 60)).sort((a, b) => b.score - a.score)
  if (await telegram(hits)) log(`✓ Telegram-Digest gesendet (${hits.length} Leads)`)
}

main().catch(e => fail(e.stack || e.message))
