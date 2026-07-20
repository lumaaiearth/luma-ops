#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// MANA™ RADAR — täglicher Vergabe-Scan
//
// Pipeline:
//   1. Tagesexport vom Bekanntmachungsservice (oeffentlichevergabe.de) laden
//   2. Mechanischer Vorfilter: nur Bekanntmachungen (tag=tender) mit passenden
//      CPV-Codes / Regionen aus dem Suchprofil (mana_profil)
//   3. Dedupe gegen mana_ausschreibungen
//   4. Claude bewertet jede neue Ausschreibung gegen das LUMA-Firmenprofil
//   5. Upsert nach Supabase, Telegram-Digest für Treffer >= min_score
//
// Aufruf:
//   node scripts/mana-scan.mjs [--day=YYYY-MM-DD] [--dry-run] [--no-ai] [--limit=N]
//
// Env:
//   SUPABASE_SERVICE_KEY   service_role Key (Pflicht, außer --dry-run)
//   ANTHROPIC_API_KEY      Anthropic API Key (Pflicht, außer --no-ai)
//   TELEGRAM_BOT_TOKEN     optional — Digest-Nachricht
//   TELEGRAM_CHAT_ID       optional — Ziel-Chat
//
// Abhängigkeit (nicht committen): npm i --no-save @anthropic-ai/sdk
// ════════════════════════════════════════════════════════════════════════════

import { execSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eqwoyfsfyohtcibithak.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const BKMS = 'https://oeffentlichevergabe.de/api/notice-exports'
const MODEL = process.env.MANA_MODEL || 'claude-opus-4-8'

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/)
  return m ? [m[1], m[2] ?? true] : [a, true]
}))
const DRY = !!args['dry-run']
const NO_AI = !!args['no-ai']
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity

if (!DRY && !SERVICE_KEY) fail('SUPABASE_SERVICE_KEY fehlt (oder --dry-run nutzen)')
if (!NO_AI && !process.env.ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY fehlt (oder --no-ai nutzen)')

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }
const log = (...m) => console.log(...m)

// NUTS-1-Präfix → Bundesland
const NUTS = { DE1: 'Baden-Württemberg', DE2: 'Bayern', DE3: 'Berlin', DE4: 'Brandenburg', DE5: 'Bremen', DE6: 'Hamburg', DE7: 'Hessen', DE8: 'Mecklenburg-Vorpommern', DE9: 'Niedersachsen', DEA: 'Nordrhein-Westfalen', DEB: 'Rheinland-Pfalz', DEC: 'Saarland', DED: 'Sachsen', DEE: 'Sachsen-Anhalt', DEF: 'Schleswig-Holstein', DEG: 'Thüringen' }

// ── Supabase REST (service_role) ─────────────────────────────────────────────
async function sbRest(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function loadProfil() {
  const fallback = { firmenprofil: 'LUMA: ökologischer Garten- und Landschaftsbau, Pflanzungen, Miyawaki-Wälder, Grünpflege.', cpv_prefixes: ['773', '4511'], regionen: [], min_score: 60, aktiv: true }
  if (!SERVICE_KEY) return fallback
  try {
    const rows = await sbRest('mana_profil?id=eq.1')
    return rows?.[0] || fallback
  } catch (e) {
    log(`⚠ Profil nicht ladbar (${e.message}) — nutze Defaults`)
    return fallback
  }
}

async function existingIds(ids) {
  if (!SERVICE_KEY || ids.length === 0) return new Set()
  const seen = new Set()
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).map(id => `"${id}"`).join(',')
    const rows = await sbRest(`mana_ausschreibungen?select=id&id=in.(${chunk})`)
    for (const r of rows) seen.add(r.id)
  }
  return seen
}

// ── BKMS Tagesexport laden & parsen ──────────────────────────────────────────
async function fetchDay(day) {
  const url = `${BKMS}?pubDay=${day}&format=ocds.zip`
  log(`→ Lade ${url}`)
  const res = await fetch(url)
  if (res.status === 404) { log('  (kein Export für diesen Tag)'); return [] }
  if (!res.ok) throw new Error(`BKMS: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const dir = mkdtempSync(join(tmpdir(), 'mana-'))
  const zipPath = join(dir, 'day.zip')
  writeFileSync(zipPath, buf)
  execSync(`unzip -q -o "${zipPath}" -d "${dir}/x"`)
  const notices = []
  for (const f of readdirSync(`${dir}/x`)) {
    if (!f.endsWith('.json')) continue
    try { notices.push(JSON.parse(readFileSync(`${dir}/x/${f}`, 'utf8'))) } catch { /* defektes File überspringen */ }
  }
  rmSync(dir, { recursive: true, force: true })
  log(`  ${notices.length} Bekanntmachungen im Export`)
  return notices
}

function extract(doc) {
  const rel = doc?.releases?.[0]
  if (!rel) return null
  const tags = rel.tag || []
  if (!tags.includes('tender')) return null // nur Ausschreibungen, keine Zuschläge
  const t = rel.tender || {}
  const cpvs = new Set()
  for (const item of t.items || []) {
    const c = item?.classification?.id; if (c) cpvs.add(c)
    for (const ac of item?.additionalClassifications || []) if (ac?.id) cpvs.add(ac.id)
  }
  const delivery = (t.items || []).map(i => i.deliveryAddress).find(Boolean) || {}
  const buyerAddr = rel.buyer?.address || {}
  const region = delivery.region || buyerAddr.region || ''
  const lots = (t.lots || []).map(l => ({ title: l.title, description: trunc(l.description, 400), tenderPeriod: l.tenderPeriod, value: l.value }))
  const frist = t.tenderPeriod?.endDate || lots.map(l => l.tenderPeriod?.endDate).find(Boolean) || null
  return {
    id: rel.id,
    ocid: rel.ocid || null,
    titel: t.title || '(ohne Titel)',
    beschreibung: trunc(t.description, 1500),
    auftraggeber: rel.buyer?.name || null,
    ort: delivery.locality || buyerAddr.locality || null,
    region,
    bundesland: NUTS[region?.slice(0, 3)] || null,
    cpv_codes: [...cpvs].sort(),
    verfahren_art: t.procurementMethodDetails || t.procurementMethod || null,
    kategorie: t.mainProcurementCategory || null,
    veroeffentlicht_am: (doc.publishedDate || rel.date || '').slice(0, 10) || null,
    frist_angebot: frist,
    wert: t.value || null,
    url: (t.documents || []).map(d => d.url).find(Boolean) || null,
    lose: lots.slice(0, 6),
  }
}

const trunc = (s, n) => (typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s ?? null)

// ── Claude-Bewertung ─────────────────────────────────────────────────────────
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'score_begruendung', 'zusammenfassung', 'frist_angebot', 'volumen_geschaetzt', 'leistungen', 'eignungsnachweise'],
  properties: {
    score: { type: 'integer', description: 'Relevanz für LUMA, 0-100' },
    score_begruendung: { type: 'string', description: '1-2 Sätze, warum (nicht) relevant' },
    zusammenfassung: { type: 'string', description: '2-4 Sätze: Was wird ausgeschrieben?' },
    frist_angebot: { type: ['string', 'null'], description: 'Angebots-/Teilnahmefrist als ISO-Datum YYYY-MM-DD, falls erkennbar' },
    volumen_geschaetzt: { type: ['string', 'null'], description: 'Geschätztes Auftragsvolumen, falls erkennbar' },
    leistungen: { type: 'array', items: { type: 'string' }, description: 'Kernleistungen, max 6 Stichworte' },
    eignungsnachweise: { type: 'array', items: { type: 'string' }, description: 'Geforderte Nachweise/Eignung, falls genannt' },
  },
}

function buildSystem(profil) {
  return `Du bist MANA, der Akquise-Agent von LUMA. Du bewertest deutsche öffentliche Ausschreibungen danach, wie gut sie zum Unternehmen passen.

FIRMENPROFIL:
${profil.firmenprofil}

BEWERTUNGSSKALA:
- 90-100: Kerngeschäft, sehr gute Passung (z.B. Pflanzung, naturnahe Grünanlage, Miyawaki, Grünpflege)
- 70-89: gut passend, LUMA könnte anbieten (z.B. Grünflächen-Los in größerem Vorhaben)
- 40-69: teilweise passend / nur Teilleistung / Region unklar
- 0-39: unpassend (reiner Tiefbau, Hochbau, Lieferleistungen ohne Grünbezug etc.)

Bewerte nüchtern und begründe kurz. Extrahiere die Eckdaten nur aus den gegebenen Daten, erfinde nichts; unbekannte Felder sind null.`
}

async function scoreNotice(anthropic, profil, n) {
  const payload = { ...n }
  delete payload.id
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: buildSystem(profil),
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Bewerte diese Ausschreibung:\n\n${JSON.stringify(payload, null, 1)}` }],
  })
  if (res.stop_reason === 'refusal') throw new Error('Claude refusal')
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('')
  return JSON.parse(text)
}

// ── Telegram ─────────────────────────────────────────────────────────────────
async function telegramDigest(hits, day) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat || hits.length === 0) return false
  const lines = hits.slice(0, 10).map(h => {
    const frist = h.frist_angebot ? ` · Frist ${String(h.frist_angebot).slice(0, 10)}` : ''
    const ort = [h.ort, h.bundesland].filter(Boolean).join(', ')
    return `▪️ [${h.score}] ${trunc(h.titel, 90)}\n   ${ort}${frist}${h.url ? `\n   ${h.url}` : ''}`
  })
  const text = `🌿 MANA · ${hits.length} relevante Ausschreibung${hits.length === 1 ? '' : 'en'} (${day})\n\n${lines.join('\n\n')}`
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  })
  if (!res.ok) log(`⚠ Telegram: ${res.status} ${await res.text()}`)
  return res.ok
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const day = typeof args.day === 'string' ? args.day
    : new Date(Date.now() - 86400e3).toISOString().slice(0, 10) // gestern (Export vollständig)

  const profil = await loadProfil()
  if (!profil.aktiv) { log('Profil inaktiv — Scan übersprungen.'); return }
  log(`MANA RADAR · Tag ${day} · CPV ${profil.cpv_prefixes.join(',')} · Regionen ${profil.regionen.length ? profil.regionen.join(',') : 'bundesweit'}${DRY ? ' · DRY-RUN' : ''}`)

  const docs = await fetchDay(day)
  const candidates = docs.map(extract).filter(Boolean)
    .filter(n => n.cpv_codes.some(c => profil.cpv_prefixes.some(p => c.startsWith(p))))
    .filter(n => profil.regionen.length === 0 || profil.regionen.some(p => (n.region || '').startsWith(p)))
  log(`  ${candidates.length} nach CPV-/Regions-Vorfilter`)

  const seen = await existingIds(candidates.map(n => n.id))
  const fresh = candidates.filter(n => !seen.has(n.id)).slice(0, LIMIT)
  log(`  ${fresh.length} neu (Dedupe: ${candidates.length - fresh.length} bekannt)`)
  if (fresh.length === 0) { log('Fertig — nichts Neues.'); return }

  let anthropic = null
  if (!NO_AI) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    anthropic = new Anthropic()
  }

  const rows = []
  for (const n of fresh) {
    let ai = null
    if (anthropic) {
      try { ai = await scoreNotice(anthropic, profil, n) }
      catch (e) { log(`⚠ Bewertung fehlgeschlagen für ${n.id}: ${e.message}`) }
    }
    const row = {
      id: n.id, quelle: 'bkms', ocid: n.ocid,
      titel: n.titel, auftraggeber: n.auftraggeber,
      ort: n.ort, bundesland: n.bundesland,
      cpv_codes: n.cpv_codes, verfahren_art: n.verfahren_art,
      veroeffentlicht_am: n.veroeffentlicht_am,
      frist_angebot: n.frist_angebot || (ai?.frist_angebot ? `${ai.frist_angebot}T23:59:59Z` : null),
      url: n.url, raw: n,
      score: ai?.score ?? null,
      score_begruendung: ai?.score_begruendung ?? null,
      zusammenfassung: ai?.zusammenfassung ?? null,
      eckdaten: ai, updated_at: new Date().toISOString(),
    }
    rows.push(row)
    log(`  ${String(row.score ?? '–').padStart(3)} · ${trunc(n.titel, 80)}`)
  }

  if (!DRY) {
    for (let i = 0; i < rows.length; i += 50) {
      await sbRest('mana_ausschreibungen', {
        method: 'POST',
        body: rows.slice(i, i + 50),
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      })
    }
    log(`✓ ${rows.length} Zeilen nach Supabase geschrieben`)
    const hits = rows.filter(r => (r.score ?? 0) >= (profil.min_score ?? 60)).sort((a, b) => b.score - a.score)
    if (await telegramDigest(hits, day)) log(`✓ Telegram-Digest gesendet (${hits.length} Treffer)`)
  } else {
    log(`DRY-RUN — nichts geschrieben (${rows.length} Zeilen vorbereitet)`)
  }
}

main().catch(e => fail(e.stack || e.message))
