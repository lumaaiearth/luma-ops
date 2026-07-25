#!/usr/bin/env node
// Generiert aus supabase/seed/pflegeplaene_2026.json (validierter Export der
// drei Excel-Pflegepläne BEW/JOPE/ALLCURA) das Import-SQL für die Tabellen
// pflege_plaene / pflege_aufgaben / pflege_gaenge (Phase 1, siehe
// docs/PFLEGEPLANUNG_KONZEPT.md Kap. 5/7).
//
//   node scripts/gen-pflege-import.mjs
//   → supabase/seed/pflegeplaene_2026_import.sql
//
// Der Import ist idempotent: vorhandene 2026-Pläne werden ersetzt.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(join(root, 'supabase/seed/pflegeplaene_2026.json'), 'utf8'))

// Titel → katalog_key (src/data/pflegeKatalog.js); null = freie Position
const KEY_RULES = [
  [/Entfernung alter Pflanzenteile/i, 'stauden_beikraut'],
  [/Rückschnitt \/ Trimmen/i, 'gehoelzschnitt'],
  [/^Düngen/i, 'duengen'],
  [/Reinigung der Wegefl/i, 'wege_reinigung'],
  [/Mahd & Trimmen/i, 'mahd'],
  [/Neupflanzungen\/Nachpflanzungen/i, 'nachpflanzung'],
  [/Nach-Mulchen/i, 'mulchen'],
  [/^Bewässerung \(Per Hand/i, 'bewaesserung'],
  [/Abbau von Schläuchen/i, 'bew_winterfest'],
  [/Anschließen\/Kontrolle Bewässerung/i, 'bew_anschluss'],
  [/Auffüllen von Bewässerungseinheiten/i, 'ibc_auffuellen'],
  [/Reinigung IBC/i, 'ibc_reinigung'],
  [/Extra-Wässerung/i, 'extra_waesserung'],
  [/Kletterhilfen/i, 'kletterhilfen'],
  [/Dachgarten|Dachgar/i, 'dachgarten'],
  [/Bioreaktor|Fermenter/i, 'bioreaktor'],
  [/Bienenweide/i, 'bienenweide'],
]
const keyFor = (titel) => (KEY_RULES.find(([re]) => re.test(titel)) || [null, null])[1]

// Kategorie aus dem Excel-Label ("7 Bewässerung") oder dem Katalog-Key
const KEY_KAT = {
  bewaesserung: 'bewaesserung', bew_winterfest: 'bewaesserung', bew_anschluss: 'bewaesserung',
  ibc_auffuellen: 'bewaesserung', ibc_reinigung: 'bewaesserung', extra_waesserung: 'bewaesserung',
  kletterhilfen: 'spezial', dachgarten: 'spezial', bioreaktor: 'spezial', bienenweide: 'spezial',
}
function katFor(label, key) {
  if (/Bewässerung/i.test(label)) return 'bewaesserung'
  if (/Spezial/i.test(label)) return 'spezial'
  if (/Pflanzen/i.test(label)) return 'pflanzen'
  return KEY_KAT[key] || 'pflanzen'
}

// KW → Monat (Gruppierung wie in den Excel-Plänen)
const MONTH_KWS = [[1,5],[6,9],[10,13],[14,18],[19,22],[23,26],[27,31],[32,35],[36,40],[41,44],[45,48],[49,53]]
const monthOf = (kw) => MONTH_KWS.findIndex(([a,b]) => kw >= a && kw <= b) + 1

// Saisonfenster aus den KW-Rohdaten ableiten: Monatssummen, dann
// zusammenhängende Monate mit gleicher Stundenzahl → ein Fenster.
function fensterFrom(weeks) {
  const perMonth = {}
  for (const [kw, h] of Object.entries(weeks)) {
    const m = monthOf(Number(kw))
    perMonth[m] = (perMonth[m] || 0) + h
  }
  const months = Object.keys(perMonth).map(Number).sort((a, b) => a - b)
  const win = []
  for (const m of months) {
    const last = win[win.length - 1]
    if (last && m === last.bis_monat + 1 && Math.abs(perMonth[m] - last.stunden_pro_gang) < 0.01) {
      last.bis_monat = m
    } else {
      win.push({ von_monat: m, bis_monat: m, turnus: 'einmalig', stunden_pro_gang: perMonth[m] })
    }
  }
  for (const w of win) if (w.bis_monat > w.von_monat) w.turnus = 'monatlich'
  return win
}

const season = (kw) => (kw >= 10 && kw <= 18 ? 'Frühjahrspflege' : kw <= 39 ? 'Sommerpflege' : kw <= 49 ? 'Herbstpflege' : 'Winter')
const q = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`
const jq = (o) => `${q(JSON.stringify(o))}::jsonb`

let sql = `-- GENERIERT von scripts/gen-pflege-import.mjs — nicht von Hand editieren.
-- Import der Excel-Pflegepläne 2026 (BEW/JOPE/ALLCURA) in die Pflegeplanung.
-- Idempotent: ersetzt vorhandene Pläne für 2026.

delete from pflege_plaene where jahr = 2026;
`

for (const s of data.sites) {
  const aufgaben = s.tasks.map((t, i) => {
    const key = keyFor(t.titel)
    const kurz = t.titel.length > 60 ? t.titel.slice(0, 57).trimEnd() + '…' : t.titel
    const jahres = Object.values(t.weeks).reduce((a, b) => a + b, 0)
    return `(${q(key)}, ${q(kurz)}, ${q(t.titel)}, ${q(katFor(t.label, key))}, ${jq(fensterFrom(t.weeks))}, ${jq(t.weeks)}, ${jahres}, ${i})`
  })
  // Wochensummen aus den Aufgaben selbst berechnen statt aus der SUMME-Zeile des
  // Sheets — die ist bei SH nachweislich fehlerhaft (SUM-Bereich endet vor Zeile 18).
  const weekly = {}
  for (const t of s.tasks) for (const [kw, h] of Object.entries(t.weeks)) weekly[kw] = (weekly[kw] || 0) + h
  const gaenge = Object.entries(weekly)
    .map(([kw, h]) => [Number(kw), Math.round(h * 100) / 100])
    .sort((a, b) => a[0] - b[0])
    .map(([kw, h]) => {
      const inWeek = s.tasks
        .filter((t) => t.weeks[kw] != null)
        .map((t) => ({ titel: t.titel.slice(0, 60), stunden: t.weeks[kw] }))
      return `(${kw}, ${q(`${season(kw)} ${s.key} (KW ${kw})`)}, ${jq(inWeek)}, ${h})`
    })

  sql += `
-- ── ${s.key} · ${s.name} · ${s.year_total} h ─────────────────────────
with p as (
  insert into pflege_plaene (project_id, objekt, jahr, status, notizen)
  values (${q(s.project_id)}, ${q(s.objekt)}, 2026, 'aktiv', ${q(s.notes)})
  returning id
), a as (
  insert into pflege_aufgaben (plan_id, katalog_key, titel, beschreibung, kategorie, fenster, wochen, jahres_stunden, sort_order)
  select p.id, x.* from p cross join (values
    ${aufgaben.join(',\n    ')}
  ) as x(katalog_key, titel, beschreibung, kategorie, fenster, wochen, jahres_stunden, sort_order)
  returning 1
)
insert into pflege_gaenge (plan_id, jahr, kw, titel, aufgaben, soll_stunden)
select p.id, 2026, g.* from p cross join (values
  ${gaenge.join(',\n  ')}
) as g(kw, titel, aufgaben, soll_stunden);
`
}

const out = join(root, 'supabase/seed/pflegeplaene_2026_import.sql')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, sql)
const nA = data.sites.reduce((a, s) => a + s.tasks.length, 0)
const nG = data.sites.reduce((a, s) => a + Object.keys(s.weekly_totals).length, 0)
console.log(`✓ ${out}`)
console.log(`  ${data.sites.length} Pläne, ${nA} Aufgaben, ${nG} Pflegegänge, ${data.sites.reduce((a, s) => a + s.year_total, 0)} h`)
