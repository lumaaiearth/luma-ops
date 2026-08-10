/**
 * BIOME — Darstellungsregeln.
 *
 * Eine Stelle für alles, was auf dem Bildschirm zu Text wird: Zahlen,
 * Einheiten, Daten, Koordinaten, fehlende Werte und die Kennzeichnung
 * abgeleiteter Werte.
 *
 * Warum zentral: die harten Regeln des Projekts sind Darstellungsregeln.
 * „Fehlende Daten werden als fehlend angezeigt, nie als 0" lässt sich nicht an
 * vierzig Stellen einzeln einhalten. Hier lässt es sich einhalten und prüfen.
 *
 * Diese Datei enthält bewusst keine Fachlogik und keine Schwellenwerte. Was
 * ein Wert bedeutet, entscheidet die Domäne gegen refs/standards/ — hier
 * entscheidet sich nur, wie er dasteht.
 */

/** Die eine Schreibweise für „dieser Wert liegt nicht vor". */
export const FEHLT = 'keine Angabe'

/**
 * Die eine Schreibweise für „hier wurde bewusst nichts erhoben".
 * Unterschied zu FEHLT: eine Nullmeldung ist ein Ergebnis, eine Lücke nicht.
 */
export const NICHT_ERHOBEN = 'nicht erhoben'

/** Kennzeichnungen für Werte, die nicht gemessen, sondern hergeleitet sind. */
export const KENNZEICHNUNG = /** @type {const} */ ({
  berechnet: {
    kurz: 'berechnet',
    lang: 'Aus erfassten Werten berechnet, nicht selbst gemessen.',
  },
  modelliert: {
    kurz: 'modelliert',
    lang: 'Ergebnis eines Modells, keine Messung vor Ort.',
  },
  geschaetzt: {
    kurz: 'geschätzt',
    lang: 'Schätzwert, nicht gemessen.',
  },
  interpoliert: {
    kurz: 'interpoliert',
    lang: 'Zwischen benachbarten Messpunkten interpoliert, an dieser Stelle nicht gemessen.',
  },
})

/** @typedef {keyof typeof KENNZEICHNUNG} KennzeichnungArt */

const NBSP = ' '        // schützt Zahl und Einheit vor dem Zeilenumbruch
const NNBSP = ' '       // schmales geschütztes Leerzeichen

/**
 * Fehlt dieser Wert? Bewusst streng: 0 fehlt nicht, ein leerer String schon.
 * NaN gilt als fehlend — eine gescheiterte Rechnung ist keine Zahl.
 * @param {unknown} wert
 * @returns {boolean}
 */
export function istFehlend(wert) {
  if (wert === null || wert === undefined) return true
  if (typeof wert === 'string') return wert.trim() === ''
  if (typeof wert === 'number') return !Number.isFinite(wert)
  return false
}

const ZAHL_CACHE = new Map()
/**
 * @param {number} nachkomma
 * @returns {Intl.NumberFormat}
 */
function formatter(nachkomma) {
  let f = ZAHL_CACHE.get(nachkomma)
  if (!f) {
    f = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: nachkomma,
      maximumFractionDigits: nachkomma,
    })
    ZAHL_CACHE.set(nachkomma, f)
  }
  return f
}

/**
 * Zahl mit deutschem Dezimalkomma. Fehlt der Wert, kommt FEHLT zurück —
 * niemals eine 0, niemals ein leerer String.
 *
 * @param {number|string|null|undefined} wert
 * @param {{ nachkomma?: number, fehltText?: string }} [opt]
 * @returns {string}
 */
export function zahl(wert, opt = {}) {
  const { nachkomma = 0, fehltText = FEHLT } = opt
  if (istFehlend(wert)) return fehltText
  const n = typeof wert === 'string' ? Number(wert) : /** @type {number} */ (wert)
  if (!Number.isFinite(n)) return fehltText
  return formatter(nachkomma).format(n)
}

/**
 * Zahl mit Einheit. Zwischen Zahl und Einheit steht ein geschütztes
 * Leerzeichen, damit „85 cm" nicht über zwei Zeilen bricht.
 *
 * Fehlt der Wert, steht dort FEHLT — ohne Einheit. „keine Angabe cm" wäre
 * Unsinn und sieht zudem nach einem Wert aus.
 *
 * @param {number|string|null|undefined} wert
 * @param {string} einheit
 * @param {{ nachkomma?: number, fehltText?: string }} [opt]
 * @returns {string}
 */
export function mitEinheit(wert, einheit, opt = {}) {
  const text = zahl(wert, opt)
  if (text === (opt.fehltText ?? FEHLT)) return text
  return `${text}${NBSP}${einheit}`
}

/**
 * Prozentwert. Eigener Weg, weil das Prozentzeichen im Deutschen mit
 * geschütztem Leerzeichen abgesetzt wird.
 * @param {number|null|undefined} wert
 * @param {{ nachkomma?: number }} [opt]
 * @returns {string}
 */
export function prozent(wert, opt = {}) {
  return mitEinheit(wert, '%', { nachkomma: opt.nachkomma ?? 0 })
}

/**
 * Datum als TT.MM.JJJJ. Nimmt ISO-Strings und Date-Objekte.
 *
 * Ein fehlendes Datum wird nie durch ein anderes ersetzt — insbesondere nicht
 * durch das Anlagedatum des Datensatzes. Es fehlt, und das steht da.
 *
 * @param {string|Date|null|undefined} wert
 * @returns {string}
 */
export function datum(wert) {
  const d = zuDate(wert)
  if (!d) return FEHLT
  const tt = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${tt}.${mm}.${d.getFullYear()}`
}

/**
 * Datum mit Uhrzeit als TT.MM.JJJJ, HH:MM.
 * @param {string|Date|null|undefined} wert
 * @returns {string}
 */
export function datumZeit(wert) {
  const d = zuDate(wert)
  if (!d) return FEHLT
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${datum(d)}, ${hh}:${mi}${NBSP}Uhr`
}

/**
 * @param {string|Date|null|undefined} wert
 * @returns {Date|null}
 */
function zuDate(wert) {
  if (istFehlend(wert)) return null
  const d = wert instanceof Date ? wert : new Date(/** @type {string} */ (wert))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Der CRS-Identifikator in der vorgeschriebenen Schreibweise.
 *
 * CRS-ID (`refs/standards/00-standort-geodaten.md`) zitiert die GDI-DE-
 * Konventionen wörtlich: „Für beide Varianten wird analog zu den
 * INSPIRE-Vorgaben als Identifier der HTTP URI Identifier für das
 * opengis.net-Repository **vorgeschrieben**" und „… ist für den genannten
 * HTTP URI Identifier `http://www.opengis.net/def/crs/EPSG/0/[EPSG-Code]` zu
 * verwenden". Der Registereintrag zieht daraus für BIOME: „nicht ‚EPSG:25833'
 * als Freitext … **Gilt für Exporte** und für jede Metadatenausgabe."
 *
 * Bis 2026-08-10 stand in der CSV-Spalte `CRS` genau der Freitext, den die
 * Quelle ausschließt.
 *
 * @param {string|null|undefined} crs z. B. 'EPSG:25833'
 * @returns {string} der URI, oder der Eingabewert, wenn er kein EPSG-Code ist
 */
export function crsUri(crs) {
  if (istFehlend(crs)) return FEHLT
  const m = /^EPSG:(\d+)$/.exec(String(crs).trim())
  return m ? `http://www.opengis.net/def/crs/EPSG/0/${m[1]}` : String(crs)
}

/**
 * Warum BIOME zu seinen Koordinaten keine Genauigkeit behauptet.
 *
 * DATUM-ETRS89 wörtlich: ETRS89 und WGS 84 sind beide ein `"Type": "ensemble"`,
 * das mehrere Realisierungen „without distinction" zusammenfasst. Solange nur
 * „WGS 84" gespeichert ist und keine Realisierung und keine Epoche, „darf die
 * Oberfläche keine Lagegenauigkeit unterhalb der Ensemble-Unschärfe
 * behaupten" — und eine Zahl für diese Unschärfe gibt die Quelle nicht her.
 *
 * Der Satz steht an der Koordinate, weil fünf Nachkommastellen sonst für sich
 * genommen eine Genauigkeit von etwa einem Meter nahelegen.
 */
export const CRS_ENSEMBLE_HINWEIS =
  'Das Bezugssystem ist ein Datum-Ensemble: es fasst mehrere Realisierungen ohne Unterscheidung zusammen. Die Nachkommastellen geben wieder, was gespeichert ist — sie sind keine Aussage über die Genauigkeit der Position.'

/**
 * Bezugsebenen einer Lagegenauigkeit — die wörtlich belegten Reporting scopes
 * aus QUAL-LAGE (`refs/standards/00-standort-geodaten.md`).
 */
export const LAGE_BEZUG = {
  einzelobjekt: 'je Einzelobjekt',
  objektart: 'je Objektart',
  datensatz: 'für den Datensatz',
}

/**
 * Koordinate in Dezimalgrad, deutsche Schreibweise, immer mit Bezugssystem.
 * Fünf Nachkommastellen entsprechen gut einem Meter — mehr täuscht eine
 * Genauigkeit vor, die eine Handy-Ortung nicht hat.
 *
 * ── Warum die Meterangabe eine Bezugsebene braucht ────────────────────────
 *
 * Bis 2026-08-10 hängte diese Funktion jede vorhandene Zahl als „± 3 m" an die
 * Koordinate. Das war keine belegte Angabe. QUAL-LAGE definiert
 * Lagegenauigkeit wörtlich als „mean value of the positional uncertainties for
 * a set of positions" — über eine **Menge** von Positionen, mit einer
 * Bezugsebene, die „spatial object", „spatial object type" oder „data set"
 * sein kann. Ohne diese Angabe ist nicht zu erkennen, ob die Zahl für diesen
 * einen Baum, für alle Bäume oder für den ganzen Bestand gilt — und damit ist
 * sie nicht interpretierbar.
 *
 * Deshalb: eine Meterangabe ohne `bezug` wird nicht ausgegeben. Nicht
 * umformuliert, nicht relativiert — weggelassen. Der Datenkern lässt sie seit
 * `20260810_biome_lagegenauigkeit_und_mehrstaemmigkeit.sql` gar nicht mehr
 * entstehen; diese Prüfung fängt Altbestand und Fremdquellen ab.
 *
 * @param {{ lat: number, lng: number }|null|undefined} punkt
 * @param {{ crs?: string, genauigkeitM?: number|null, bezug?: string|null }} [opt]
 * @returns {string}
 */
export function koordinate(punkt, opt = {}) {
  if (!punkt || istFehlend(punkt.lat) || istFehlend(punkt.lng)) return FEHLT
  const crs = opt.crs || 'EPSG:4326'
  const nord = `${zahl(Math.abs(punkt.lat), { nachkomma: 5 })}°${NNBSP}${punkt.lat >= 0 ? 'N' : 'S'}`
  const ost = `${zahl(Math.abs(punkt.lng), { nachkomma: 5 })}°${NNBSP}${punkt.lng >= 0 ? 'O' : 'W'}`
  const bezugText = opt.bezug ? LAGE_BEZUG[/** @type {keyof typeof LAGE_BEZUG} */ (opt.bezug)] : null
  const genau = istFehlend(opt.genauigkeitM) || !bezugText
    ? ''
    : ` ±${NBSP}${mitEinheit(opt.genauigkeitM, 'm')} ${bezugText}`
  return `${nord} ${ost} (${crs})${genau}`
}

/**
 * Messwert mit Einheit und, wo eine dazugehört, der Messhöhe.
 *
 * Ein Stammumfang ohne Messhöhe ist keine Zahl, sondern eine Behauptung —
 * deshalb steht die Messhöhe am Wert und nicht im Kleingedruckten.
 *
 * @param {{ wert: number|null|undefined, einheit: string, messhoeheCm?: number|null }} m
 * @param {{ nachkomma?: number }} [opt]
 * @returns {string}
 */
export function messwert(m, opt = {}) {
  const basis = mitEinheit(m.wert, m.einheit, { nachkomma: opt.nachkomma ?? 0 })
  if (basis === FEHLT) return FEHLT
  if (istFehlend(m.messhoeheCm)) return basis
  return `${basis} (in ${mitEinheit(m.messhoeheCm, 'cm')}${NBSP}Höhe)`
}

/**
 * Beschriftung für einen abgeleiteten Wert. Wird am Anzeigeort verwendet,
 * nicht in einer Fußnote.
 *
 * @param {KennzeichnungArt} art
 * @returns {{ kurz: string, lang: string }}
 */
export function kennzeichnung(art) {
  const k = KENNZEICHNUNG[art]
  if (!k) throw new Error(`Unbekannte Kennzeichnung: ${String(art)}`)
  return k
}

/**
 * Zählt Dinge und benennt die Null ehrlich.
 *
 * „0 Bäume" ist eine Aussage, wenn wirklich gezählt wurde. Wurde nicht
 * gezählt, ist es keine — dann steht hier NICHT_ERHOBEN. Der Aufrufer muss
 * sich also entscheiden, statt eine leere Liste als Null auszugeben.
 *
 * @param {number|null|undefined} menge
 * @param {{ erhoben: boolean, einzahl: string, mehrzahl: string }} opt
 * @returns {string}
 */
export function anzahl(menge, opt) {
  if (!opt.erhoben) return NICHT_ERHOBEN
  if (istFehlend(menge)) return FEHLT
  const n = /** @type {number} */ (menge)
  return `${zahl(n)}${NBSP}${n === 1 ? opt.einzahl : opt.mehrzahl}`
}

/**
 * Zeitraum als „von – bis". Ein offenes Ende bleibt offen und wird nicht
 * stillschweigend auf heute gesetzt.
 *
 * @param {string|Date|null|undefined} von
 * @param {string|Date|null|undefined} bis
 * @returns {string}
 */
export function zeitraum(von, bis) {
  const a = datum(von)
  const b = datum(bis)
  if (a === FEHLT && b === FEHLT) return FEHLT
  if (b === FEHLT) return `seit ${a}`
  if (a === FEHLT) return `bis ${b}`
  return `${a}${NNBSP}–${NNBSP}${b}`
}
