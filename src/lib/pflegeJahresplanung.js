// ─────────────────────────────────────────────────────────────────────────────
// Pflege fürs nächste Jahr: Termine einplanen und Kosten je Standort
//
// Die Pflegegänge des Folgejahres stehen als Kalenderwoche im Plan (Übernahme
// aus dem Vorjahr). Hier bekommt jeder Gang ein konkretes Datum:
//   · Montag–Freitag, ohne gesetzliche Feiertage in Berlin,
//   · bevorzugt der Wochentag, an dem der Standort im Vorjahr gepflegt wurde,
//   · Standorte desselben Auftraggebers in derselben Woche möglichst am selben
//     Tag (Tour), solange die Tageskapazität des Teams reicht.
// Kosten je Standort wie im Angebotsgenerator: Pflegestunden (ggf. kalibriert)
// + Anfahrt je Gang × Stundensatz des Auftraggebers.
// Geprüft mit scripts/test-pflege-jahresplanung.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { plusTage, wochentag } from './kalenderIcs.js'
import { UID_PRAEFIX } from './pflegeKalender.js'

const r2 = v => Math.round(v * 100) / 100
const pad = n => String(n).padStart(2, '0')

/** Montag der ISO-Kalenderwoche. */
export function montagDerKW(jahr, kw) {
  const vierter = new Date(Date.UTC(jahr, 0, 4))
  const montag1 = new Date(vierter); montag1.setUTCDate(4 - ((vierter.getUTCDay() + 6) % 7))
  const d = new Date(montag1); d.setUTCDate(montag1.getUTCDate() + (kw - 1) * 7)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Ostersonntag (Gauß/Meeus). */
function ostern(j) {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1
  return `${j}-${pad(monat)}-${pad(tag)}`
}

/** Gesetzliche Feiertage in Berlin. */
export function feiertageBerlin(jahr) {
  const o = ostern(jahr)
  return new Map([
    [`${jahr}-01-01`, 'Neujahr'], [`${jahr}-03-08`, 'Frauentag'],
    [plusTage(o, -2), 'Karfreitag'], [plusTage(o, 1), 'Ostermontag'],
    [`${jahr}-05-01`, 'Tag der Arbeit'], [plusTage(o, 39), 'Christi Himmelfahrt'], [plusTage(o, 50), 'Pfingstmontag'],
    [`${jahr}-10-03`, 'Tag der Deutschen Einheit'], [`${jahr}-12-25`, '1. Weihnachtstag'], [`${jahr}-12-26`, '2. Weihnachtstag'],
  ])
}

const zeitPlus = (start, stunden) => {
  const [h, m] = start.split(':').map(Number)
  const min = Math.min(h * 60 + m + Math.round(stunden * 60), 20 * 60)
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

/** Dauer vor Ort für den Kalender: Teamstunden ÷ Teamgröße, auf ½ h, 1–10 h. */
export function terminDauer(gang) {
  const crew = Math.max(1, Number(gang.crew_size) || 2)
  const h = (Number(gang.soll_stunden || 0) + Number(gang.fahrt_stunden || 0)) / crew
  return Math.min(10, Math.max(1, Math.round(h * 2) / 2))
}

/**
 * Bevorzugter Wochentag je Pflegeplan aus Vorjahresterminen.
 * @param {{planId, datum}[]} vorjahr  bestätigte Termine/erledigte Einsätze
 * @returns {Map<planId, wochentag 1–5>}
 */
export function bevorzugteWochentage(vorjahr) {
  const zaehl = new Map()
  for (const { planId, datum } of vorjahr) {
    const t = wochentag(datum)
    if (t < 1 || t > 5) continue
    const m = zaehl.get(planId) || new Map()
    m.set(t, (m.get(t) || 0) + 1)
    zaehl.set(planId, m)
  }
  return new Map([...zaehl].map(([p, m]) => [p, [...m].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]]))
}

/**
 * Datum für jeden Gang des Jahres vorschlagen.
 * @param {object} p
 * @param {number} p.jahr
 * @param {Array}  p.gaenge         pflege_gaenge des Jahres (kw, soll_stunden, fahrt_stunden, crew_size, plan_id, termin?)
 * @param {Map}    [p.planInfo]     planId → { clientId, label }
 * @param {Map}    [p.wochentage]   planId → 1–5 (Vorjahr)
 * @param {number} [p.tagesKapazitaet]  Teamstunden je Tag (Standard 16 = 2 Personen × 8 h)
 * @param {number} [p.standardTag]  Wochentag ohne Vorjahresangabe (2 = Dienstag)
 * @param {boolean}[p.vorhandeneBehalten]  schon gesetzte Termine nicht verschieben
 * @returns {{ gangId, datum, wochentag, start, ende, grund, voll }[]}
 */
export function termineVorschlagen({ jahr, gaenge = [], planInfo = new Map(), wochentage = new Map(), tagesKapazitaet = 16, standardTag = 2, startZeit = '08:00', vorhandeneBehalten = true }) {
  const feiertage = feiertageBerlin(jahr)
  const last = new Map()        // datum → Teamstunden
  const kunden = new Map()      // datum → Set(clientId)
  const out = []
  const aktiv = gaenge.filter(g => g.status !== 'entfallen' && g.status !== 'erledigt')
  const buche = (datum, g) => {
    last.set(datum, (last.get(datum) || 0) + Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0))
    const c = planInfo.get(g.plan_id)?.clientId
    if (c) kunden.set(datum, new Set([...(kunden.get(datum) || []), c]))
  }
  // Fest stehende Termine zuerst belegen
  if (vorhandeneBehalten) for (const g of aktiv.filter(g => g.termin)) { buche(g.termin, g); out.push(vorschlag(g, g.termin, 'schon geplant', false)) }

  function vorschlag(g, datum, grund, voll) {
    const dauer = terminDauer(g)
    return { gangId: g.id, planId: g.plan_id, datum, wochentag: wochentag(datum), start: startZeit, ende: zeitPlus(startZeit, dauer), dauer, grund, voll }
  }

  const offen = aktiv.filter(g => !(vorhandeneBehalten && g.termin))
    // große Gänge zuerst, damit sie einen freien Tag bekommen
    .sort((a, b) => a.kw - b.kw || (Number(b.soll_stunden) + Number(b.fahrt_stunden || 0)) - (Number(a.soll_stunden) + Number(a.fahrt_stunden || 0)))
  for (const g of offen) {
    const montag = montagDerKW(jahr, g.kw)
    const tage = [0, 1, 2, 3, 4].map(i => plusTage(montag, i)).filter(d => !feiertage.has(d) && d.startsWith(String(jahr)))
    if (!tage.length) { out.push({ ...vorschlag(g, montag, `KW ${g.kw} hat keinen Arbeitstag`, true), datum: null }); continue }
    const wunsch = wochentage.get(g.plan_id) || standardTag
    const stunden = Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0)
    const client = planInfo.get(g.plan_id)?.clientId
    const bewertet = tage.map(d => {
      const belegt = last.get(d) || 0
      const passt = belegt + stunden <= tagesKapazitaet || belegt === 0
      let punkte = passt ? 0 : 100 + belegt
      if (wochentag(d) === wunsch) punkte -= 3
      if (client && kunden.get(d)?.has(client) && passt) punkte -= 2   // Tour mit demselben Auftraggeber
      punkte += Math.abs(wochentag(d) - wunsch) * 0.5 + belegt / tagesKapazitaet
      return { d, punkte, passt }
    }).sort((a, b) => a.punkte - b.punkte)
    const best = bewertet[0]
    const gruende = []
    if (wochentag(best.d) === wunsch) gruende.push(wochentage.has(g.plan_id) ? 'Wochentag wie im Vorjahr' : 'Standard-Wochentag')
    else if (feiertage.has(plusTage(montag, wunsch - 1))) gruende.push(`${feiertage.get(plusTage(montag, wunsch - 1))} ausgewichen`)
    else gruende.push('Wunschtag ausgelastet')
    if (client && kunden.get(best.d)?.has(client)) gruende.push('Tour mit anderem Standort des Auftraggebers')
    if (!best.passt) gruende.push('Tageskapazität überschritten')
    buche(best.d, g)
    out.push(vorschlag(g, best.d, gruende.join(', '), !best.passt))
  }
  return out.sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
}

/** Kalibrierfaktor nur, wenn plausibel (0,5–2) — Teilwerte aus dem laufenden Jahr verzerren sonst alles. */
export const kalibPlausibel = f => Number.isFinite(Number(f)) && Number(f) >= 0.5 && Number(f) <= 2

/**
 * Kosten je Standort (Pflegeplan) eines Jahres.
 * @returns {{ zeilen: Array, summe: {netto, brutto, stunden, gaenge} }}
 */
export function kostenJeStandort({ plaene = [], gaenge = [], planInfo = new Map(), saetze = {}, mitFahrt = true, kalibrieren = true, ust = 0.19, standardSatz = 50 }) {
  const zeilen = plaene.map(p => {
    const gs = gaenge.filter(g => g.plan_id === p.id && g.status !== 'entfallen')
    const vorOrtRoh = gs.reduce((s, g) => s + Number(g.soll_stunden || 0), 0)
    const k = Number(p.kalib_faktor)
    const kalibAngewandt = kalibrieren && kalibPlausibel(k) && k !== 1
    const hinweis = kalibrieren && p.kalib_faktor != null && !kalibPlausibel(k) ? `Kalibrierfaktor ${String(p.kalib_faktor).replace('.', ',')} unplausibel — nicht angewandt` : null
    const vorOrt = vorOrtRoh * (kalibAngewandt ? k : 1)
    const fahrt = mitFahrt ? gs.reduce((s, g) => s + Number(g.fahrt_stunden || 0), 0) : 0
    const stunden = Math.round((vorOrt + fahrt) * 4) / 4
    const info = planInfo.get(p.id) || {}
    const satz = Number(saetze[info.clientId]) || standardSatz
    const netto = r2(stunden * satz)
    return {
      planId: p.id, label: info.label || p.project_id, kunde: info.kunde || '', gaenge: gs.length,
      stundenVorOrt: r2(vorOrt), stundenFahrt: r2(fahrt), stunden, satz, netto, brutto: r2(netto * (1 + ust)),
      kalib: kalibAngewandt ? k : null, hinweis,
    }
  }).sort((a, b) => a.kunde.localeCompare(b.kunde, 'de') || a.label.localeCompare(b.label, 'de'))
  const summe = {
    netto: r2(zeilen.reduce((s, z) => s + z.netto, 0)),
    brutto: r2(zeilen.reduce((s, z) => s + z.brutto, 0)),
    stunden: r2(zeilen.reduce((s, z) => s + z.stunden, 0)),
    gaenge: zeilen.reduce((s, z) => s + z.gaenge, 0),
  }
  return { zeilen, summe }
}

/** Geplante Termine als Einträge für icsSchreiben — UID erlaubt dem Bot die sichere Wiedererkennung. */
export function termineAlsKalender(vorschlaege, { gaenge = [], planInfo = new Map() }) {
  const gang = new Map(gaenge.map(g => [g.id, g]))
  return vorschlaege.filter(v => v.datum).map(v => {
    const g = gang.get(v.gangId) || {}
    const info = planInfo.get(v.planId) || {}
    const aufgaben = (g.aufgaben || []).map(a => `• ${a.titel}${a.stunden ? ` (${String(a.stunden).replace('.', ',')} h)` : ''}`).join('\n')
    return {
      uid: `${UID_PRAEFIX}${v.gangId}@luma-biome.de`,
      datum: v.datum, start: v.start, ende: v.ende,
      titel: `Pflege ${info.label || ''} – ${g.titel || `KW ${g.kw}`}`.trim(),
      ort: info.ort || '',
      beschreibung: [`Pflegegang KW ${g.kw}, ${String(Number(g.soll_stunden || 0)).replace('.', ',')} h Soll`, aufgaben, 'Angelegt aus der LUMA-Jahresplanung.'].filter(Boolean).join('\n'),
    }
  })
}
