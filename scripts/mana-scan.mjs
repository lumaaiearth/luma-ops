#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// MANA™ RADAR — täglicher Vergabe-Scan (v2)
//
// Quellen:
//   • Bekanntmachungsservice (oeffentlichevergabe.de) — Tagesexporte, alle
//     Größen, auch Unterschwelle (Vergabeplattform Berlin, Vergabemarktplatz
//     Brandenburg melden dorthin)
//   • TED (ted.europa.eu) — EU-weite Ausschreibungen oberhalb der Schwelle
//
// Pipeline:
//   1. Die letzten N Tage laden (Standard 7). Der Bekanntmachungsservice
//      liefert manche Tage leer oder verspätet — durch das Rückfenster werden
//      sie beim nächsten Lauf nachgeholt; Bekanntes fällt per Dedupe raus.
//   2. Vorfilter: nur Ausschreibungen (keine Zuschläge), Region aus dem
//      Suchprofil (NUTS-Präfixe), CPV-Präfix ODER Stichwort im Titel,
//      harte Ausschlüsse (Winterdienst, Reinigung …)
//   3. Dedupe gegen die DB — per ID und quellenübergreifend per Titel+Auftraggeber
//   4. Claude bewertet Passung und Lukrativität gegen das Firmenprofil
//   5. Upsert nach Supabase; optional Telegram-Digest
//
// Aufruf:
//   node scripts/mana-scan.mjs [--days=7] [--day=YYYY-MM-DD] [--dry-run] [--no-ai] [--limit=N] [--no-ted] [--no-bkms]
//
// Env:
//   SUPABASE_SERVICE_KEY   service_role Key (Pflicht, außer --dry-run)
//   ANTHROPIC_API_KEY      Anthropic API Key (Pflicht, außer --no-ai)
//   MANA_MODEL             optional, Standard claude-sonnet-5-5
//   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID  optional
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
const TED = 'https://api.ted.europa.eu/v3/notices/search'
const MODEL = process.env.MANA_MODEL || 'claude-sonnet-5-5'

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/)
  return m ? [m[1], m[2] ?? true] : [a, true]
}))
const DRY = !!args['dry-run']
const NO_AI = !!args['no-ai']
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity
const DAYS = args.days ? parseInt(args.days, 10) : 7

if (!DRY && !SERVICE_KEY) fail('SUPABASE_SERVICE_KEY fehlt (oder --dry-run nutzen)')
if (!NO_AI && !process.env.ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY fehlt (oder --no-ai nutzen)')

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }
const log = (...m) => console.log(...m)
const trunc = (s, n) => (typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s ?? null)

// NUTS-1-Präfix → Bundesland
const NUTS = { DE1: 'Baden-Württemberg', DE2: 'Bayern', DE3: 'Berlin', DE4: 'Brandenburg', DE5: 'Bremen', DE6: 'Hamburg', DE7: 'Hessen', DE8: 'Mecklenburg-Vorpommern', DE9: 'Niedersachsen', DEA: 'Nordrhein-Westfalen', DEB: 'Rheinland-Pfalz', DEC: 'Saarland', DED: 'Sachsen', DEE: 'Sachsen-Anhalt', DEF: 'Schleswig-Holstein', DEG: 'Thüringen' }

// Stichworte, die auch ohne passenden CPV-Code in die Bewertung führen
const KEYWORDS = /baum|bäume|gehölz|entsiegel|biodivers|klimaanpass|schwammstadt|begrünung|pflanzung|pflanzarbeit|wildblumen|blühwiese|artenschutz|habitat|stadtnatur|stadtgrün|regenwasserbewirtschaftung|versickerung|insekten|naturnah/i
// Harte Ausschlüsse (Titel) — spart Bewertungen für Leistungen, die LUMA nicht anbietet
const EXCLUDE = /winterdienst|reinigung|hausmeister|schneeräum|glätte|facility|gebäudemanagement|kanal|abwasser/i

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

const DEFAULT_PROFIL = {
  firmenprofil: 'LUMA (Berlin): urbane Biodiversität, Klimaanpassung, Baumpflege und Baumkontrolle.',
  cpv_prefixes: ['7721', '7723', '773', '451127', '9071', '9072'],
  regionen: ['DE3', 'DE4'],
  min_score: 60,
  aktiv: true,
}

async function loadProfil() {
  if (!SERVICE_KEY) return DEFAULT_PROFIL
  try {
    const rows = await sbRest('mana_profil?id=eq.1')
    return rows?.[0] || DEFAULT_PROFIL
  } catch (e) {
    log(`⚠ Profil nicht ladbar (${e.message}) — nutze Defaults`)
    return DEFAULT_PROFIL
  }
}

// Schlüssel für quellenübergreifendes Dedupe (TED und Bekanntmachungsservice
// führen dieselbe Ausschreibung unter verschiedenen IDs)
const norm = s => (s || '').toLowerCase().replace(/deutschland\s*–\s*[^–]*–\s*/, '').replace(/[^a-z0-9äöüß]+/g, '')
const dedupeKey = n => `${norm(n.titel).slice(0, 50)}|${norm(n.auftraggeber).slice(0, 20)}`

async function knownRows() {
  if (!SERVICE_KEY) return { ids: new Set(), keys: new Set(), ohneFrist: new Set() }
  const since = new Date(Date.now() - 120 * 86400e3).toISOString()
  const rows = await sbRest(`mana_ausschreibungen?select=id,titel,auftraggeber,frist_angebot&created_at=gte.${since}&limit=5000`)
  return { ids: new Set(rows.map(r => r.id)), keys: new Set(rows.map(dedupeKey)), ohneFrist: new Set(rows.filter(r => !r.frist_angebot).map(r => r.id)) }
}

// ── Quelle 1: Bekanntmachungsservice (OCDS-Tagesexport) ──────────────────────
// Der OCDS-Export enthält keine Angebotsfrist — die steht nur im eForms-XML.
// Deshalb zusätzlich den eForms-Export laden: Notice-ID → früheste Frist.
async function fetchBkmsDeadlines(day) {
  const res = await fetch(`${BKMS}?pubDay=${day}&format=eforms.zip`)
  const map = new Map()
  if (!res.ok) return map
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 200) return map
  const dir = mkdtempSync(join(tmpdir(), 'mana-ef-'))
  try {
    writeFileSync(join(dir, 'e.zip'), buf)
    execSync(`unzip -q -o "${join(dir, 'e.zip')}" -d "${dir}/x"`)
    for (const f of readdirSync(`${dir}/x`)) {
      if (!f.endsWith('.xml')) continue
      const xml = readFileSync(`${dir}/x/${f}`, 'utf8')
      const id = xml.match(/<cbc:ID schemeName="notice-id">([^<]+)</)?.[1]
      const ends = [...xml.matchAll(/<cac:TenderSubmissionDeadlinePeriod>\s*<cbc:EndDate>(\d{4}-\d{2}-\d{2})[^<]*<\/cbc:EndDate>(?:\s*<cbc:EndTime>(\d{2}:\d{2}))?/g)]
        .map(m => `${m[1]}T${m[2] || '23:59'}:00+01:00`).sort()
      if (id && ends.length) map.set(id, ends[0])
    }
  } catch { /* ohne Fristen weiter */ } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return map
}

async function fetchBkmsDay(day) {
  const url = `${BKMS}?pubDay=${day}&format=ocds.zip`
  const res = await fetch(url)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Bekanntmachungsservice ${day}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 200) return [] // leerer Export — wird beim nächsten Lauf nachgeholt
  const dir = mkdtempSync(join(tmpdir(), 'mana-'))
  try {
    const zipPath = join(dir, 'day.zip')
    writeFileSync(zipPath, buf)
    execSync(`unzip -q -o "${zipPath}" -d "${dir}/x"`)
    const notices = []
    for (const f of readdirSync(`${dir}/x`)) {
      if (!f.endsWith('.json')) continue
      try { notices.push(JSON.parse(readFileSync(`${dir}/x/${f}`, 'utf8'))) } catch { /* defektes File überspringen */ }
    }
    return notices
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function extractBkms(doc) {
  const rel = doc?.releases?.[0]
  if (!rel) return null
  if (!(rel.tag || []).includes('tender')) return null // nur Ausschreibungen, keine Zuschläge
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
    quelle: 'bkms',
    ocid: rel.ocid || null,
    titel: t.title || '(ohne Titel)',
    beschreibung: trunc(t.description, 1500),
    auftraggeber: rel.buyer?.name || null,
    ort: delivery.locality || buyerAddr.locality || null,
    regionen: [region].filter(Boolean),
    cpv_codes: [...cpvs].sort(),
    verfahren_art: t.procurementMethodDetails || t.procurementMethod || null,
    veroeffentlicht_am: (doc.publishedDate || rel.date || '').slice(0, 10) || null,
    frist_angebot: frist,
    wert: t.value || null,
    url: (t.documents || []).map(d => d.url).find(Boolean) || null,
    lose: lots.slice(0, 6),
  }
}

async function loadBkms(days) {
  const out = []
  for (const day of days) {
    try {
      const docs = await fetchBkmsDay(day)
      const ext = docs.map(extractBkms).filter(Boolean)
      if (ext.length) {
        const fristen = await fetchBkmsDeadlines(day)
        for (const n of ext) if (!n.frist_angebot && fristen.has(n.id)) n.frist_angebot = fristen.get(n.id)
      }
      log(`  Bekanntmachungsservice ${day}: ${docs.length} Bekanntmachungen${docs.length ? '' : ' (leer — wird nachgeholt)'}`)
      out.push(...ext)
    } catch (e) { log(`⚠ ${e.message}`) }
  }
  return out
}

// ── Quelle 2: TED (EU) ───────────────────────────────────────────────────────
const TED_FIELDS = ['publication-number', 'notice-type', 'notice-title', 'title-lot', 'description-lot', 'buyer-name', 'buyer-city',
  'place-of-performance', 'classification-cpv', 'deadline-receipt-tender-date-lot', 'estimated-value-lot', 'estimated-value-cur-lot',
  'publication-date', 'document-url-lot', 'procedure-type']

const deu = v => {
  if (!v) return null
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v[0] ?? null
  const x = v.deu ?? v.DEU ?? Object.values(v)[0]
  return Array.isArray(x) ? x.join(' / ') : x
}

async function loadTed(fromDay, regionen) {
  const places = (regionen.length ? regionen : ['DEU']).join(' ')
  const query = `place-of-performance IN (${places}) AND notice-type IN (cn-standard cn-social cn-desg pin-cfc-standard pin-cfc-social) AND publication-date>=${fromDay.replaceAll('-', '')}`
  const out = []
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(TED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, fields: TED_FIELDS, limit: 250, page, scope: 'ALL' }),
    })
    if (!res.ok) { log(`⚠ TED: HTTP ${res.status} ${trunc(await res.text(), 300)}`); break }
    const data = await res.json()
    const notices = data.notices || []
    for (const n of notices) {
      const titleLots = n['title-lot'] ? [].concat(deu(n['title-lot']) || []) : []
      const dl = (n['deadline-receipt-tender-date-lot'] || [])[0]
      const val = (n['estimated-value-lot'] || [])[0]
      out.push({
        id: `ted:${n['publication-number']}`,
        quelle: 'ted',
        ocid: null,
        titel: (deu(n['notice-title']) || '(ohne Titel)').replace(/^Deutschland\s*–\s*[^–]*–\s*/, ''),
        beschreibung: trunc(deu(n['description-lot']), 1500),
        auftraggeber: deu(n['buyer-name']),
        ort: deu(n['buyer-city']),
        regionen: (n['place-of-performance'] || []).filter(p => p.startsWith('DE') && p.length > 2),
        cpv_codes: [...new Set(n['classification-cpv'] || [])].sort(),
        verfahren_art: n['procedure-type'] || n['notice-type'] || null,
        veroeffentlicht_am: (n['publication-date'] || '').slice(0, 10) || null,
        frist_angebot: dl ? dl.slice(0, 10) + 'T23:59:59+01:00' : null,
        wert: val ? { amount: Number(val), currency: (n['estimated-value-cur-lot'] || [])[0] || 'EUR' } : null,
        url: n.links?.html?.DEU || `https://ted.europa.eu/de/notice/-/detail/${n['publication-number']}`,
        unterlagen: (n['document-url-lot'] || [])[0] || null,
        lose: titleLots.slice(0, 6),
      })
    }
    if (notices.length < 250) break
  }
  log(`  TED ab ${fromDay}: ${out.length} Ausschreibungen in der Region`)
  return out
}

// ── Vorfilter ────────────────────────────────────────────────────────────────
function prefilter(list, profil) {
  const stats = { region: 0, fach: 0, ausschluss: 0 }
  const res = list.filter(n => {
    if (profil.regionen.length && !n.regionen.some(r => profil.regionen.some(p => r.startsWith(p)))) { stats.region++; return false }
    const cpvHit = n.cpv_codes.some(c => profil.cpv_prefixes.some(p => c.startsWith(p)))
    const kwHit = KEYWORDS.test(n.titel) || KEYWORDS.test((n.lose || []).map(l => l.title || l).join(' '))
    if (!cpvHit && !kwHit) { stats.fach++; return false }
    if (EXCLUDE.test(n.titel)) { stats.ausschluss++; return false }
    return true
  })
  return { res, stats }
}

// ── Claude-Bewertung ─────────────────────────────────────────────────────────
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'passung', 'lukrativitaet', 'empfehlung', 'score_begruendung', 'zusammenfassung', 'frist_angebot',
    'volumen_geschaetzt', 'aufwand_angebot', 'leistungen', 'eignungsnachweise'],
  properties: {
    score: { type: 'integer', description: 'Gesamtwert 0-100 für die Rangfolge: wie lohnend ist es für LUMA, hier anzubieten' },
    passung: { type: 'integer', description: 'Fachliche Passung zum Portfolio 0-100' },
    lukrativitaet: { type: 'integer', description: 'Wirtschaftliche Attraktivität 0-100 (Volumen, Laufzeit, Konkurrenz, Marge)' },
    empfehlung: { type: 'string', enum: ['bieten', 'prüfen', 'ignorieren'] },
    score_begruendung: { type: 'string', description: 'Ein Satz, max. 25 Wörter: warum lohnend oder nicht' },
    zusammenfassung: { type: 'string', description: '2-3 Sätze: Was wird ausgeschrieben?' },
    frist_angebot: { type: ['string', 'null'], description: 'Angebotsfrist als YYYY-MM-DD, falls erkennbar' },
    volumen_geschaetzt: { type: ['string', 'null'], description: 'Auftragsvolumen kurz, z.B. "ca. 120.000 € / 2 Jahre", null wenn unbekannt' },
    aufwand_angebot: { type: 'string', enum: ['gering', 'mittel', 'hoch'], description: 'Aufwand für Angebot und Nachweise' },
    leistungen: { type: 'array', items: { type: 'string' }, description: 'Kernleistungen, max 6 Stichworte' },
    eignungsnachweise: { type: 'array', items: { type: 'string' }, description: 'Geforderte Nachweise/Eignung, falls genannt' },
  },
}

function buildSystem(profil) {
  return `Du bist MANA, der Akquise-Agent von LUMA. Du bewertest öffentliche Ausschreibungen danach, ob es sich für LUMA lohnt anzubieten.

FIRMENPROFIL:
${profil.firmenprofil}

BEWERTUNG:
- passung (0-100): Wie gut passt die Leistung zum Portfolio? Leistungen, die LUMA ausdrücklich nicht will, liegen unter 25 — auch wenn sie grün klingen.
- lukrativitaet (0-100): Volumen und Laufzeit im Verhältnis zur Firmengröße (Lose bis ca. 500.000 € sind ideal, mehrjährige Rahmenverträge wertvoll), voraussichtliche Konkurrenz (Spezialleistungen wie Baumkontrolle, Gutachten, ökologische Pflanzungen = weniger Wettbewerb als Standardpflege), Aufwand für Angebot und Nachweise, Erreichbarkeit vom Standort Berlin.
- score: Gesamtwert für die Rangfolge. Passung ist Voraussetzung: bei passung < 40 ist score höchstens 30.
- empfehlung: "bieten" ab ca. score 70, "prüfen" 45-69, sonst "ignorieren".

Bewerte nüchtern. Extrahiere Eckdaten nur aus den gegebenen Daten, erfinde nichts; unbekannte Felder sind null.`
}

async function scoreNotice(anthropic, profil, n) {
  const payload = { ...n }
  delete payload.id
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: buildSystem(profil),
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Bewerte diese Ausschreibung:\n\n${JSON.stringify(payload, null, 1)}` }],
  })
  if (res.stop_reason === 'refusal') throw new Error('Claude refusal')
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('')
  return JSON.parse(text)
}

// ── Telegram (optional) ──────────────────────────────────────────────────────
async function telegramDigest(hits) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat || hits.length === 0) return false
  const lines = hits.slice(0, 10).map(h => `▪️ [${h.score}] ${trunc(h.titel, 90)}\n   ${[h.ort, h.bundesland].filter(Boolean).join(', ')}${h.frist_angebot ? ` · Frist ${String(h.frist_angebot).slice(0, 10)}` : ''}`)
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: `🌿 MANA · ${hits.length} neue relevante Ausschreibungen\n\n${lines.join('\n\n')}`, disable_web_page_preview: true }),
  })
  return res.ok
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const profil = await loadProfil()
  if (!profil.aktiv) { log('Profil inaktiv — Scan übersprungen.'); return }

  const days = typeof args.day === 'string' ? [args.day]
    : Array.from({ length: DAYS }, (_, i) => new Date(Date.now() - (i + 1) * 86400e3).toISOString().slice(0, 10))
  const fromDay = days[days.length - 1]
  log(`MANA RADAR v2 · ${fromDay} … ${days[0]} · Regionen ${profil.regionen.join(',') || 'bundesweit'} · Modell ${MODEL}${DRY ? ' · DRY-RUN' : ''}`)

  const all = []
  if (!args['no-bkms']) all.push(...await loadBkms(days))
  if (!args['no-ted']) {
    try { all.push(...await loadTed(fromDay, profil.regionen)) } catch (e) { log(`⚠ TED: ${e.message}`) }
  }

  const { res: candidates, stats } = prefilter(all, profil)
  log(`  Vorfilter: ${all.length} geladen → ${candidates.length} Kandidaten (außerhalb Region ${stats.region}, fachfremd ${stats.fach}, ausgeschlossen ${stats.ausschluss})`)

  const known = await knownRows()
  // Fristen für bereits gespeicherte Einträge nachtragen
  const nachtrag = candidates.filter(n => known.ohneFrist.has(n.id) && n.frist_angebot)
  if (!DRY) for (const n of nachtrag) {
    await sbRest(`mana_ausschreibungen?id=eq.${encodeURIComponent(n.id)}`, { method: 'PATCH', body: { frist_angebot: n.frist_angebot, updated_at: new Date().toISOString() } })
    known.ohneFrist.delete(n.id)
  }
  if (nachtrag.length) log(`  Frist nachgetragen: ${nachtrag.length}`)
  const batchKeys = new Set()
  const fresh = []
  for (const n of candidates) {
    const key = dedupeKey(n)
    if (known.ids.has(n.id) || known.keys.has(key) || batchKeys.has(key)) continue
    batchKeys.add(key)
    fresh.push(n)
  }
  const todo = fresh.slice(0, LIMIT)
  log(`  ${todo.length} neu zu bewerten (${candidates.length - fresh.length} schon bekannt)`)
  if (todo.length === 0) { log('Fertig — nichts Neues.'); return }

  let anthropic = null
  if (!NO_AI) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    anthropic = new Anthropic()
  }

  const rows = []
  let failed = 0
  for (const n of todo) {
    let ai = null
    if (anthropic) {
      try { ai = await scoreNotice(anthropic, profil, n) }
      catch (e) { failed++; log(`⚠ Bewertung fehlgeschlagen für ${n.id}: ${e.message}`) }
      if (!ai) continue // ohne Bewertung nicht speichern — nächster Lauf versucht es erneut
    }
    const region = n.regionen.find(r => profil.regionen.some(p => r.startsWith(p))) || n.regionen[0] || ''
    rows.push({
      id: n.id, quelle: n.quelle, ocid: n.ocid,
      titel: n.titel, auftraggeber: n.auftraggeber,
      ort: n.ort, bundesland: NUTS[region.slice(0, 3)] || null,
      cpv_codes: n.cpv_codes, verfahren_art: n.verfahren_art,
      veroeffentlicht_am: n.veroeffentlicht_am,
      frist_angebot: n.frist_angebot || (ai?.frist_angebot ? `${ai.frist_angebot}T23:59:59+01:00` : null),
      url: n.url, raw: n,
      score: ai?.score ?? null,
      score_begruendung: ai?.score_begruendung ?? null,
      zusammenfassung: ai?.zusammenfassung ?? null,
      eckdaten: ai, updated_at: new Date().toISOString(),
    })
    log(`  ${String(ai?.score ?? "–").padStart(3)} ${n.quelle.padEnd(4)} · ${(n.frist_angebot || "Frist ?").slice(0, 10)} · ${trunc(n.titel, 70)}`)
  }

  if (!DRY && rows.length) {
    for (let i = 0; i < rows.length; i += 50) {
      await sbRest('mana_ausschreibungen', {
        method: 'POST',
        body: rows.slice(i, i + 50),
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      })
    }
    log(`✓ ${rows.length} Ausschreibungen gespeichert`)
    const hits = rows.filter(r => (r.score ?? 0) >= (profil.min_score ?? 60)).sort((a, b) => b.score - a.score)
    if (await telegramDigest(hits)) log('✓ Telegram gesendet')
  } else if (DRY) {
    log(`DRY-RUN — nichts geschrieben (${rows.length} Zeilen vorbereitet)`)
  }
  if (failed && failed === todo.length) fail(`Alle ${failed} Bewertungen fehlgeschlagen`)
}

main().catch(e => fail(e.stack || e.message))
