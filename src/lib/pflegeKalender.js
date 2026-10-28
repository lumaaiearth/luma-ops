// ─────────────────────────────────────────────────────────────────────────────
// Pflegekalender-Bot: Google-Termine ↔ Pflegegänge
//
// Ordnet jeden Kalendertermin den Standorten und Pflegegängen zu, die er
// betrifft, und findet Pflegegänge, für die noch kein Termin im Kalender
// steht. Ein Termin kann mehrere Standorte betreffen („Schnittgut-Tour
// (R95, S3, X13)“) — dann gibt es je Standort eine Zuordnung.
//
// Erkennung je Standort (Pflegeplan = Projekt + ggf. Objekt):
//   · eigener Termin aus LUMA (UID luma-gang-<id>@…)            → sicher
//   · Flächenkürzel (BL, H14 …) als eigenes Wort, Projektname,
//     Objektstraße                                              → stark
//   · Straße aus der Projektadresse                             → mittel
// Dann der Pflegegang dieses Standorts in derselben (oder nächsten)
// Kalenderwoche. Nichts wird automatisch übernommen: der Bot schlägt vor,
// ein Mensch bestätigt.
// Geprüft mit scripts/test-pflege-kalender.mjs
// ─────────────────────────────────────────────────────────────────────────────

export const UID_PRAEFIX = 'luma-gang-'

const norm = s => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/str(asse|\.)/g, 'str').replace(/[^a-z0-9]+/g, ' ').trim()
const woerter = s => norm(s).split(' ').filter(Boolean)
const FUELL = new Set(['berlin', 'pflege', 'tiny', 'forest', 'garten', 'projekt', 'flaeche', 'str', 'weg', 'platz'])

/** ISO-Kalenderwoche und ihr Jahr zu einem Datum 'YYYY-MM-DD'. */
export function isoWoche(iso) {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)))
  const tag = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - tag + 3)
  const jahr = d.getUTCFullYear()
  const erster = new Date(Date.UTC(jahr, 0, 4))
  return { jahr, kw: 1 + Math.round(((d - erster) / 864e5 - 3 + ((erster.getUTCDay() + 6) % 7)) / 7) }
}

/**
 * Erkennungsmerkmale je Pflegeplan.
 * @returns {{planId, projectId, objekt, label, codes: string[], namen: string[][], strassen: string[][]}[]}
 */
export function standortMerkmale(plaene, projects) {
  const proj = new Map(projects.map(p => [p.id, p]))
  return plaene.map(pl => {
    const p = proj.get(pl.project_id) || {}
    const code = (p.flaeche_code || '').trim()
    const nameWoerter = woerter(p.name).filter(w => w !== norm(code) && !FUELL.has(w) && w.length >= 4)
    // Straße aus der Adresse: alles vor der Hausnummer bzw. dem Komma
    const strasse = String(p.location || '').split(',')[0].replace(/\s*\d.*$/, '')
    const strassenWoerter = woerter(strasse).filter(w => !FUELL.has(w) && w.length >= 4)
    const objektWoerter = woerter(String(pl.objekt || '').replace(/\s*\d.*$/, '')).filter(w => !FUELL.has(w) && w.length >= 4)
    return {
      planId: pl.id, projectId: pl.project_id, objekt: pl.objekt || '', jahr: pl.jahr,
      label: `${p.name || pl.project_id}${pl.objekt ? ` · ${pl.objekt}` : ''}`,
      codes: code ? [code] : [],
      namen: nameWoerter.length ? [nameWoerter] : [],
      objektWoerter,
      strassen: strassenWoerter.length ? [strassenWoerter] : [],
    }
  })
}

/** Welche Standorte nennt ein Termin? → [{ planId, staerke, grund }] */
export function standorteImTermin(termin, merkmale) {
  const roh = `${termin.titel || ''} ${termin.ort || ''} ${termin.beschreibung || ''}`
  const text = ` ${norm(roh)} `
  const enthaelt = ws => ws.every(w => text.includes(` ${w} `) || text.includes(` ${w}`))
  const treffer = []
  for (const m of merkmale) {
    let staerke = 0, grund = ''
    for (const c of m.codes) {
      // Kurze Kürzel (BL, SH …) nur großgeschrieben als eigenes Wort — sonst
      // träfe „sh“ in jedem zweiten Text
      const re = c.length <= 2 ? new RegExp(`(^|[^A-Za-z0-9])${c}([^A-Za-z0-9]|$)`) : new RegExp(`(^|[^a-z0-9])${norm(c)}([^a-z0-9]|$)`)
      if (re.test(c.length <= 2 ? roh : norm(roh))) { staerke = 3; grund = `Kürzel ${c}` }
    }
    if (!staerke) for (const ws of m.namen) if (enthaelt(ws)) { staerke = 3; grund = `Name „${ws.join(' ')}“` }
    if (!staerke) for (const ws of m.strassen) if (enthaelt(ws)) { staerke = 2; grund = `Adresse „${ws.join(' ')}“` }
    // Objekt (z. B. zwei Allcura-Häuser): die Straße entscheidet zwischen Plänen desselben Projekts
    const objektTreffer = m.objektWoerter.length && enthaelt(m.objektWoerter)
    if (objektTreffer) { staerke = Math.max(staerke, 3); grund = grund ? `${grund}, Objekt ${m.objekt}` : `Objekt ${m.objekt}` }
    if (staerke) treffer.push({ planId: m.planId, projectId: m.projectId, staerke, grund, objektTreffer: !!objektTreffer })
  }
  // Mehrere Pläne desselben Projekts: nennt der Termin ein Objekt, nur dieses
  const proProjekt = new Map()
  for (const t of treffer) proProjekt.set(t.projectId, [...(proProjekt.get(t.projectId) || []), t])
  return [...proProjekt.values()].flatMap(liste => liste.some(t => t.objektTreffer) ? liste.filter(t => t.objektTreffer) : liste)
}

/**
 * Zuordnungsvorschläge für alle Termine.
 * @param {object} p
 * @param {Array} p.termine   kalender_termine (start_datum, titel, ort, beschreibung, uid, abgesagt, id)
 * @param {Array} p.plaene    pflege_plaene
 * @param {Array} p.gaenge    pflege_gaenge
 * @param {Array} p.projects  projects
 * @param {Array} [p.bestaetigt] schon gespeicherte Zuordnungen { termin_id, gang_id, status }
 * @returns {{ zuordnungen: Array, ohneStandort: Array }}
 *   zuordnung: { terminId, planId, projectId, gangId|null, sicherheit, grund, kwAbstand }
 */
export function termineZuordnen({ termine = [], plaene = [], gaenge = [], projects = [], bestaetigt = [] }) {
  const merkmale = standortMerkmale(plaene, projects)
  const merkmalVon = new Map(merkmale.map(m => [m.planId, m]))
  const gaengeJePlan = new Map()
  for (const g of gaenge) gaengeJePlan.set(g.plan_id, [...(gaengeJePlan.get(g.plan_id) || []), g])
  const gangVon = new Map(gaenge.map(g => [g.id, g]))
  const vergeben = new Set(bestaetigt.filter(b => b.status === 'bestaetigt' && b.gang_id).map(b => b.gang_id))

  const kandidaten = []
  const ohneStandort = []
  for (const t of termine) {
    if (t.abgesagt) continue
    // Eigener Termin aus der Jahresplanung: UID nennt den Gang
    const uidGang = String(t.uid || '').startsWith(UID_PRAEFIX) ? String(t.uid).slice(UID_PRAEFIX.length).split('@')[0] : null
    if (uidGang && gangVon.has(uidGang)) {
      const g = gangVon.get(uidGang)
      kandidaten.push({ terminId: t.id, planId: g.plan_id, projectId: merkmalVon.get(g.plan_id)?.projectId, gangId: g.id, sicherheit: 'sicher', grund: 'Termin aus der LUMA-Jahresplanung', kwAbstand: 0, punkte: 100 })
      continue
    }
    const { jahr, kw } = isoWoche(t.start_datum)
    const orte = standorteImTermin(t, merkmale.filter(m => m.jahr == null || m.jahr === jahr))
    if (!orte.length) { ohneStandort.push(t); continue }
    for (const o of orte) {
      const liste = (gaengeJePlan.get(o.planId) || []).filter(g => (g.jahr ?? jahr) === jahr && g.status !== 'entfallen')
      const naechste = liste.map(g => ({ g, abstand: Math.abs(g.kw - kw) })).sort((a, b) => a.abstand - b.abstand)
      const best = naechste[0]
      if (!best || best.abstand > 3) {
        kandidaten.push({ terminId: t.id, planId: o.planId, projectId: o.projectId, gangId: null, sicherheit: 'zusatz', grund: `${o.grund} — kein geplanter Gang in KW ${kw}±3 (Zusatztermin?)`, kwAbstand: null, punkte: o.staerke })
        continue
      }
      for (const { g, abstand } of naechste.filter(x => x.abstand <= 3)) {
        const sicherheit = abstand === 0 && o.staerke >= 3 ? 'sicher' : abstand <= 1 ? 'wahrscheinlich' : 'unklar'
        kandidaten.push({
          terminId: t.id, planId: o.planId, projectId: o.projectId, gangId: g.id, sicherheit,
          grund: `${o.grund}${abstand ? `, Gang geplant für KW ${g.kw} (Termin KW ${kw})` : `, KW ${kw}`}`,
          kwAbstand: abstand, punkte: o.staerke * 10 - abstand * 4,
        })
      }
    }
  }

  // Jeder Gang höchstens einmal, jeder (Termin, Plan) höchstens einmal — beste zuerst
  const zuordnungen = []
  const genommen = new Set(), terminPlan = new Set()
  for (const k of kandidaten.sort((a, b) => b.punkte - a.punkte)) {
    const tp = `${k.terminId}|${k.planId}`
    if (terminPlan.has(tp)) continue
    if (k.gangId && (genommen.has(k.gangId) || vergeben.has(k.gangId))) {
      // Gang schon belegt: nur behalten, wenn der Termin sonst nichts hat
      continue
    }
    terminPlan.add(tp)
    if (k.gangId) genommen.add(k.gangId)
    const { punkte, ...rest } = k
    zuordnungen.push(rest)
  }
  // Termine, deren Gänge alle belegt waren: als Zusatztermin des Standorts zeigen
  for (const k of kandidaten) {
    const tp = `${k.terminId}|${k.planId}`
    if (terminPlan.has(tp)) continue
    terminPlan.add(tp)
    zuordnungen.push({ terminId: k.terminId, planId: k.planId, projectId: k.projectId, gangId: null, sicherheit: 'zusatz', grund: `${k.grund.split(',')[0]} — Gang schon einem anderen Termin zugeordnet`, kwAbstand: null })
  }
  return { zuordnungen, ohneStandort }
}

/**
 * Pflegegänge ohne Termin.
 * @param {object} p
 * @param {Array} p.gaenge
 * @param {Array} p.zuordnungen  Vorschläge + bestätigte (gangId), ignorierte zählen nicht
 * @param {string} p.heute       'YYYY-MM-DD'
 * @returns {{ kommend: Array, ueberfaellig: Array }}  je { gang, kw, jahr }
 */
export function fehlendeTermine({ gaenge = [], zuordnungen = [], heute }) {
  const mitTermin = new Set(zuordnungen.filter(z => z.gangId && z.status !== 'ignoriert').map(z => z.gangId))
  const jetzt = isoWoche(heute)
  const kommend = [], ueberfaellig = []
  for (const g of gaenge) {
    if (g.status === 'entfallen' || g.status === 'erledigt' || mitTermin.has(g.id)) continue
    const spaeter = g.jahr > jetzt.jahr || (g.jahr === jetzt.jahr && g.kw >= jetzt.kw)
    ;(spaeter ? kommend : ueberfaellig).push(g)
  }
  const ordnung = (a, b) => a.jahr - b.jahr || a.kw - b.kw
  return { kommend: kommend.sort(ordnung), ueberfaellig: ueberfaellig.sort(ordnung) }
}

/** Link „Termin in Google Kalender anlegen“ (öffnet das vorausgefüllte Formular). */
export function googleTerminLink({ titel, datum, start = '08:00', ende = '12:00', ort = '', beschreibung = '' }) {
  const k = d => d.replace(/-/g, '')
  const z = t => t.replace(':', '') + '00'
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: titel, dates: `${k(datum)}T${z(start)}/${k(datum)}T${z(ende)}`,
    ctz: 'Europe/Berlin', location: ort, details: beschreibung,
  })
  return `https://calendar.google.com/calendar/render?${q}`
}
