// ─────────────────────────────────────────────────────────────────────────────
// Leistungsnachweis — „Was haben wir für Sie getan?“
//
// Kern der Kundentransparenz: aus den real erfassten Zeiteinträgen und dem
// Pflegeplan wird ein nachvollziehbarer Nachweis je Objekt und Zeitraum.
//
// Hintergrund (docs/PFLEGEPLANUNG_KONZEPT.md, Kap. 2.3): Die 2025er
// Nachfakturierung von 134 h im Dezember war aus Kundensicht eine
// unangekündigte Nachforderung — daraus entstand das „zu teuer“-Feedback.
// Ein laufend sichtbarer Leistungsnachweis ist die dokumentierte Gegenmaßnahme.
//
// Alle Funktionen sind rein (keine DB-, keine DOM-Zugriffe) und werden von
// zwei Seiten genutzt:
//   · Kundenportal  → Zeilen aus der View `v_kunde_leistungen`
//   · Interne Sicht → Roh-`time_entries` via normalisiereZeiteintraege()
// ─────────────────────────────────────────────────────────────────────────────

export const MONATE = ['Januar','Februar','März','April','Mai','Juni',
                       'Juli','August','September','Oktober','November','Dezember']
export const MONATE_KURZ = ['Jan','Feb','Mär','Apr','Mai','Jun',
                            'Jul','Aug','Sep','Okt','Nov','Dez']

// ── Kleine Helfer ────────────────────────────────────────────────────────────

/** Stunden deutsch formatieren: 47.1 → „47,1 h“ (ohne unnötige Nachkommastellen) */
export function formatStunden(h, mitEinheit = true) {
  const n = Number(h) || 0
  const s = (Math.round(n * 100) / 100)
    .toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return mitEinheit ? `${s} h` : s
}

/**
 * Erfüllungsgrad als ganze Prozent: 94.87 → „95 %“.
 * Bewusst ohne Nachkommastellen — auf einem Kundenbeleg wirken „40,09 %“
 * neben „94,9 %“ uneinheitlich und suggerieren eine Scheingenauigkeit.
 */
export function formatProzent(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `${Math.round(Number(n))} %`
}

/** ISO-Datum (YYYY-MM-DD) → „16.07.2026“. Robust gegen null/Zeitstempel. */
export function formatDatum(iso) {
  if (!iso) return ''
  const d = String(iso).slice(0, 10).split('-')
  if (d.length !== 3) return String(iso)
  return `${d[2]}.${d[1]}.${d[0]}`
}

/** Jahr aus einem ISO-Datum, ohne Date-Objekt (keine Zeitzonen-Fallen). */
export function jahrVon(iso) {
  const y = parseInt(String(iso || '').slice(0, 4), 10)
  return Number.isFinite(y) ? y : null
}

/** Monatsindex 0–11 aus ISO-Datum. */
export function monatVon(iso) {
  const m = parseInt(String(iso || '').slice(5, 7), 10)
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m - 1 : null
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// ── Normalisierung ───────────────────────────────────────────────────────────

/**
 * Roh-`time_entries` auf das Format der View `v_kunde_leistungen` bringen:
 * je (project_id, date) eine Zeile mit summierten Stunden und den
 * zusammengefassten Tätigkeiten. Personenbezug (user_id) fällt bewusst weg.
 */
export function normalisiereZeiteintraege(eintraege = []) {
  const map = new Map()
  for (const e of eintraege) {
    if (!e || !e.project_id || !e.date) continue
    const datum = String(e.date).slice(0, 10)
    const key = `${e.project_id}|${datum}`
    let row = map.get(key)
    if (!row) {
      row = { project_id: e.project_id, date: datum, stunden: 0, _texte: new Set(), eintraege: 0 }
      map.set(key, row)
    }
    row.stunden += Number(e.hours) || 0
    row.eintraege += 1
    const txt = (e.description || '').trim()
    if (txt) row._texte.add(txt)
  }
  return [...map.values()].map(r => ({
    project_id: r.project_id,
    date: r.date,
    stunden: round2(r.stunden),
    leistungen: [...r._texte].join(' · '),
    eintraege: r.eintraege,
  }))
}

// ── Hauptaggregation ─────────────────────────────────────────────────────────

/**
 * Baut den Leistungsnachweis.
 *
 * @param {object}   opts
 * @param {Array}    opts.leistungen  Zeilen { project_id, date, stunden, leistungen }
 * @param {Array}    opts.projekte    Zeilen { id, name, location? }
 * @param {Array}   [opts.plaene]     Zeilen { project_id, jahr, soll_stunden, gaenge_gesamt, gaenge_erledigt }
 * @param {Array}   [opts.fotos]      Zeilen { project_id, url, einsatz_datum? , created_at? }
 * @param {number}  [opts.jahr]       Nur dieses Jahr (Default: alle)
 * @param {string}  [opts.projectId]  Nur diese Fläche (Default: alle)
 * @param {string}  [opts.von]        ISO-Datum, inklusive
 * @param {string}  [opts.bis]        ISO-Datum, inklusive
 * @returns {{objekte: Array, summe: object, monate: Array, zeitraum: object}}
 */
export function buildLeistungsnachweis({
  leistungen = [], projekte = [], plaene = [], fotos = [],
  jahr = null, projectId = null, von = null, bis = null,
} = {}) {
  const projektName = new Map(projekte.map(p => [p.id, p.name || p.id]))
  const projektOrt  = new Map(projekte.map(p => [p.id, p.location || '']))

  // Welche Planjahre gehören zum ausgewerteten Zeitraum? Ohne diese Prüfung
  // würden bei einem reinen von/bis-Filter die Soll-Stunden ALLER Jahre
  // aufaddiert und einem Ist aus einem einzigen Zeitraum gegenübergestellt.
  const planJahrPasst = (y) => {
    const n = Number(y)
    if (jahr) return n === jahr
    if (von && n < jahrVon(von)) return false
    if (bis && n > jahrVon(bis)) return false
    return true
  }

  // 1) Filtern
  const gefiltert = leistungen.filter(l => {
    if (!l || !l.project_id || !l.date) return false
    const d = String(l.date).slice(0, 10)
    if (projectId && l.project_id !== projectId) return false
    if (jahr && jahrVon(d) !== jahr) return false
    if (von && d < von) return false
    if (bis && d > bis) return false
    return true
  })

  // 2) Je Objekt gruppieren
  const objMap = new Map()
  const neuesObjekt = (id) => ({
    projectId: id,
    name: projektName.get(id) || id,
    ort: projektOrt.get(id) || '',
    stunden: 0,
    einsatztage: 0,
    termine: [],
    fotos: [],
    sollStunden: 0,
    gaengeGesamt: 0,
    gaengeErledigt: 0,
  })

  for (const l of gefiltert) {
    let o = objMap.get(l.project_id)
    if (!o) { o = neuesObjekt(l.project_id); objMap.set(l.project_id, o) }
    o.stunden += Number(l.stunden) || 0
    o.einsatztage += 1
    o.termine.push({
      datum: String(l.date).slice(0, 10),
      stunden: round2(l.stunden),
      leistungen: l.leistungen || '',
    })
  }

  // 3) Planwerte (Soll) anreichern.
  // Eine geplante Fläche, auf der noch nicht gearbeitet wurde, MUSS im
  // Jahresnachweis ebenfalls erscheinen: sonst fehlt ihr Soll im Nenner und
  // der Erfüllungsgrad fällt zu optimistisch aus („52 % erbracht“ statt
  // korrekt „46 %“). Bei einem Teilzeitraum (von/bis) wird dagegen nichts
  // ergänzt — ein Monatsauszug soll keine Fläche mit Jahres-Soll und null
  // Stunden zeigen.
  const planObjekteErgaenzen = !von && !bis
  for (const p of plaene) {
    if (!p || !p.project_id) continue
    if (!planJahrPasst(p.jahr)) continue
    if (projectId && p.project_id !== projectId) continue
    let o = objMap.get(p.project_id)
    if (!o && !planObjekteErgaenzen) continue
    if (!o) { o = neuesObjekt(p.project_id); objMap.set(p.project_id, o) }
    o.sollStunden   += Number(p.soll_stunden) || 0
    o.gaengeGesamt  += Number(p.gaenge_gesamt) || 0
    o.gaengeErledigt += Number(p.gaenge_erledigt) || 0
  }

  // 4) Fotos zuordnen (nach Zeitraum gefiltert wie die Leistungen)
  const zeitfilterAktiv = Boolean(jahr || von || bis)
  for (const f of fotos) {
    if (!f || !f.project_id) continue
    const o = objMap.get(f.project_id)
    if (!o) continue
    const d = String(f.einsatz_datum || f.created_at || '').slice(0, 10)
    // Undatierte Fotos gehören in keinen datierten Nachweis — sonst tauchte
    // dasselbe Bild als Beleg in jedem Jahr auf.
    if (zeitfilterAktiv && !d) continue
    if (jahr && jahrVon(d) !== jahr) continue
    if (von && d < von) continue
    if (bis && d > bis) continue
    o.fotos.push({ url: f.url, datum: d, titel: f.einsatz_titel || '' })
  }

  // 5) Aufräumen und sortieren
  const objekte = [...objMap.values()].map(o => ({
    ...o,
    stunden: round2(o.stunden),
    sollStunden: round2(o.sollStunden),
    // Erfüllungsgrad: geleistet ÷ geplant (null wenn kein Plan hinterlegt)
    erfuellung: o.sollStunden > 0 ? round2((o.stunden / o.sollStunden) * 100) : null,
    termine: o.termine.sort((a, b) => b.datum.localeCompare(a.datum)),
  })).sort((a, b) => b.stunden - a.stunden)

  // 6) Summen.
  // `einsatztage` zählt KALENDERTAGE, nicht Fläche/Tag-Zeilen: Werden an
  // einem Tag zwei Flächen desselben Auftraggebers betreut, war LUMA an
  // einem Tag vor Ort, nicht an zweien.
  const summe = {
    stunden: round2(objekte.reduce((s, o) => s + o.stunden, 0)),
    sollStunden: round2(objekte.reduce((s, o) => s + o.sollStunden, 0)),
    einsatztage: new Set(gefiltert.map(l => String(l.date).slice(0, 10))).size,
    objekte: objekte.length,
    fotos: objekte.reduce((s, o) => s + o.fotos.length, 0),
  }
  summe.erfuellung = summe.sollStunden > 0
    ? round2((summe.stunden / summe.sollStunden) * 100) : null

  // 7) Monatsverlauf (nur sinnvoll bei Jahresfilter, sonst über alle Jahre)
  const monate = MONATE_KURZ.map((label, i) => ({ monat: i, label, stunden: 0 }))
  for (const l of gefiltert) {
    const mi = monatVon(l.date)
    if (mi != null) monate[mi].stunden += Number(l.stunden) || 0
  }
  for (const m of monate) m.stunden = round2(m.stunden)

  // 8) Tatsächlicher Zeitraum der Daten
  const daten = gefiltert.map(l => String(l.date).slice(0, 10)).sort()
  const zeitraum = {
    von: von || daten[0] || null,
    bis: bis || daten[daten.length - 1] || null,
    jahr,
  }

  return { objekte, summe, monate, zeitraum }
}

// ── Textausgabe (Zwischenablage / E-Mail-Text) ───────────────────────────────

/**
 * Klartext-Leistungsnachweis — für Zwischenablage, E-Mail oder als Beleg.
 * Bewusst schlicht gehalten, damit er überall einfügbar bleibt.
 */
export function nachweisAlsText(nachweis, { kundeName = '', titel = 'Leistungsnachweis' } = {}) {
  if (!nachweis) return ''
  const { objekte, summe, zeitraum } = nachweis
  const zeilen = []

  zeilen.push(titel.toUpperCase())
  if (kundeName) zeilen.push(kundeName)
  if (zeitraum.von && zeitraum.bis) {
    zeilen.push(`Zeitraum: ${formatDatum(zeitraum.von)} – ${formatDatum(zeitraum.bis)}`)
  }
  zeilen.push('')
  zeilen.push(`Erbrachte Leistung gesamt: ${formatStunden(summe.stunden)} an ${summe.einsatztage} Einsatztagen auf ${summe.objekte} Fläche(n).`)
  if (summe.sollStunden > 0) {
    zeilen.push(`Jahresplanung: ${formatStunden(summe.sollStunden)} — davon erbracht: ${summe.erfuellung} %.`)
  }
  zeilen.push('')

  for (const o of objekte) {
    zeilen.push('─'.repeat(52))
    const kopf = o.sollStunden > 0
      ? `${o.name} — ${formatStunden(o.stunden)} von ${formatStunden(o.sollStunden)} geplant`
      : `${o.name} — ${formatStunden(o.stunden)}`
    zeilen.push(kopf)
    if (o.ort) zeilen.push(o.ort)
    zeilen.push('')
    for (const t of o.termine) {
      zeilen.push(`  ${formatDatum(t.datum)}   ${formatStunden(t.stunden).padStart(8)}   ${t.leistungen || '—'}`)
    }
    zeilen.push('')
  }

  zeilen.push('─'.repeat(52))
  zeilen.push(`Summe: ${formatStunden(summe.stunden)}`)
  zeilen.push('')
  zeilen.push('Erstellt mit LUMA Ops · luma-biome.de')
  return zeilen.join('\n')
}

// ── Plan/Ist-Ampel ───────────────────────────────────────────────────────────

/**
 * Bewertet den Erfüllungsgrad: Liegt die Fläche im Plan?
 *
 * @param {object} objekt        Objekt aus buildLeistungsnachweis()
 * @param {number} [anteilJahr]  Fallback: linearer Jahresanteil (0–1)
 * @param {number} [erwartet]    Saisonal korrektes Soll bis heute (bevorzugt)
 *
 * WICHTIG: Pflege ist saisonal, nicht linear — die Gänge liegen zwischen
 * KW 12 und KW 45 mit Schwerpunkten im Frühjahr und Herbst. Ein linear
 * hochgerechnetes Soll meldet im Frühjahr systematisch „Rückstand“ und im
 * Spätherbst „Mehraufwand“, obwohl exakt nach Plan gearbeitet wurde.
 * Deshalb sollte `erwartet` aus den tatsächlich fälligen Gängen kommen
 * (siehe sollBisKW) — der Jahresanteil ist nur der Notnagel, wenn keine
 * Gangdaten vorliegen.
 *
 * Gibt `null` zurück, wenn kein Plan hinterlegt ist.
 */
export function planAmpel(objekt, anteilJahr = null, erwartet = null) {
  if (!objekt || !(objekt.sollStunden > 0)) return null
  const soll = erwartet != null
    ? Number(erwartet)
    : objekt.sollStunden * (anteilJahr == null ? anteilJahrBisHeute() : anteilJahr)
  const ist = objekt.stunden
  if (!(soll > 0)) return { status: 'offen', text: 'Saison beginnt', abweichung: round2(ist) }
  const faktor = ist / soll
  const abweichung = round2(ist - soll)
  if (faktor >= 0.85 && faktor <= 1.15) return { status: 'im_plan', text: 'Im Plan', abweichung }
  if (faktor > 1.15) return { status: 'ueber', text: 'Mehraufwand', abweichung }
  return { status: 'unter', text: 'Rückstand', abweichung }
}

/** ISO-Kalenderwoche (1–53). */
export function isoKW(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const tag = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - tag)
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - start) / 86400000 + 1) / 7)
}

/**
 * Saisonal korrektes Soll bis heute: Summe der Soll-Stunden aller Pflegegänge
 * einer Fläche, die im gewählten Jahr bis zur aktuellen KW fällig waren.
 * Bei einem abgeschlossenen Jahr zählen alle Gänge, bei einem künftigen keiner.
 * Entfallene Gänge bleiben außen vor — gleiche Definition wie intern.
 *
 * Gibt `null` zurück, wenn für die Fläche keine Gänge vorliegen (dann greift
 * in planAmpel der lineare Notnagel).
 */
export function sollBisKW(gaenge, projectId, jahr, heute = new Date()) {
  const relevant = (gaenge || []).filter(g =>
    g && g.project_id === projectId && Number(g.jahr) === Number(jahr) && g.status !== 'entfallen')
  if (!relevant.length) return null
  const aktuellesJahr = heute.getFullYear()
  const grenzKW = jahr < aktuellesJahr ? 53 : jahr > aktuellesJahr ? 0 : isoKW(heute)
  return round2(relevant
    .filter(g => Number(g.kw) <= grenzKW)
    .reduce((s, g) => s + (Number(g.soll_stunden) || 0), 0))
}

/** Anteil des laufenden Jahres, der bereits vergangen ist (0–1). */
export function anteilJahrBisHeute(heute = new Date()) {
  const jahrStart = new Date(heute.getFullYear(), 0, 1)
  const jahrEnde  = new Date(heute.getFullYear() + 1, 0, 1)
  return Math.min(1, Math.max(0, (heute - jahrStart) / (jahrEnde - jahrStart)))
}

/**
 * Anteil eines BESTIMMTEN Jahres, der vergangen ist.
 * Wichtig für die Ampel: Ein abgeschlossenes Jahr ist zu 100 % vorbei —
 * sonst würde ein Rückblick auf 2025 im Juli 2026 fälschlich „Rückstand“ zeigen.
 */
export function anteilVonJahr(jahr, heute = new Date()) {
  if (!jahr) return anteilJahrBisHeute(heute)
  const aktuell = heute.getFullYear()
  if (jahr < aktuell) return 1
  if (jahr > aktuell) return 0
  return anteilJahrBisHeute(heute)
}
