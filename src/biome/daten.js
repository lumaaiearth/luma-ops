/**
 * BIOME — Zugriff auf den Datenkern und die Ableitungen darauf.
 *
 * Zwei Betriebsarten:
 *   · normal        liest aus Supabase
 *   · Fixture-Modus liest fixtures/ground_truth.json
 *
 * Der Fixture-Modus ist an `VITE_BIOME_FIXTURE` gebunden. Vite ersetzt die
 * Variable beim Bauen durch eine Konstante, der Zweig fällt im
 * Produktionsbündel also weg. Er existiert, damit die Abnahme weder gegen die
 * Produktionsdatenbank läuft noch Testdaten dorthin schreibt — und damit
 * Oberfläche und Daten-Critic garantiert dieselben Zahlen sehen.
 *
 * Die Ableitungen unten sind bewusst reine Funktionen ohne React und ohne
 * Netzwerk: sie sind der Ort, an dem „fünf Bäume ohne Kontrolle" entsteht, und
 * müssen einzeln prüfbar sein.
 */
import { sb } from '../lib/supabase.js'

export const FIXTURE_MODUS = !!import.meta.env.VITE_BIOME_FIXTURE

/**
 * @typedef {object} Messung
 * @property {string} id
 * @property {string} merkmal
 * @property {number} wert
 * @property {string} einheit
 * @property {number|null} messhoehe_cm
 * @property {number|null} [stamm_nr]  Einzelstamm bei Mehrstämmigkeit; NULL = Gesamtbaum
 * @property {string|null} messgeraet
 * @property {string} methode_id
 * @property {string} datum
 * @property {string} erfasst_von
 * @property {string} erfasst_am
 * @property {string|null} ersetzt_id
 * @property {string|null} korrektur_grund
 * @property {Record<string, any>|null} vorzustand
 */

/**
 * @typedef {object} Kontrolle
 * @property {string} id
 * @property {string} art
 * @property {string} datum
 * @property {string} durchgefuehrt_von
 * @property {string} qualifikation
 * @property {string|null} belaubungszustand
 * @property {string|null} ergebnis_text
 * @property {boolean} massnahme_empfohlen
 * @property {string|null} methode_id
 * @property {string|null} ersetzt_id
 */

/**
 * @typedef {object} Baum
 * @property {string} id
 * @property {string} standort_id
 * @property {string} baumnummer
 * @property {string|null} art_wissenschaftlich
 * @property {string|null} art_deutsch
 * @property {string|null} taxon_quelle
 * @property {string|null} taxon_id
 * @property {number|null} gepflanzt_jahr
 * @property {{type:string, coordinates:number[]}|null} position
 * @property {string} crs
 * @property {number|null} lagegenauigkeit_m
 * @property {string|null} [lagegenauigkeit_bezug]  einzelobjekt | objektart | datensatz
 * @property {boolean|null} [mehrstaemmig]  NULL = nicht erhoben
 * @property {string|null} standorttyp
 * @property {Messung[]} messungen
 * @property {Array<{id:string, skala_id:string, stufe:string, begruendung:string|null, methode_id:string, datum:string, erfasst_von:string, ersetzt_id:string|null}>} bewertungen
 * @property {Kontrolle[]} kontrollen
 */

/**
 * Eine 3D-Gaussian-Splat-Aufnahme, wie sie `v_biome_splatfeld` liefert:
 * das Splat-Feld zusammen mit dem Flug, aus dem es stammt.
 *
 * Zwei Blöcke mit verschiedener Herkunft, bewusst nicht vermischt:
 *
 *   · `kernel` bis `sh_grad` stehen in der Datei und sind durch FE-GS-23
 *     wörtlich belegt.
 *   · `anker_*` und `drehung_grad` stehen **nicht** in der Datei. Weder
 *     KHR_gaussian_splatting noch glTF 2.0 kennen ein Bezugssystem; die
 *     Verortung ist ein eigener erhobener Wert und darf fehlen.
 *
 * @typedef {object} SplatAufnahme
 * @property {string} id
 * @property {string} flugprodukt_id
 * @property {string} flug_id
 * @property {string} standort_id
 * @property {string} flug_datum
 * @property {string|null} flug_uhrzeit
 * @property {string|null} flug_zeitzone
 * @property {string} sensor_id
 * @property {string|null} plattform
 * @property {number|null} flughoehe_m
 * @property {number|null} gsd_cm
 * @property {string|null} flug_crs
 * @property {number|null} passpunkte_anzahl
 * @property {number|null} passpunkte_rmse_cm
 * @property {string|null} flug_erfasst_von
 * @property {string} kernel
 * @property {string} farbraum
 * @property {string} projektion
 * @property {string} sortierung
 * @property {number} splat_anzahl
 * @property {number} sh_grad
 * @property {string} spezifikationsstand
 * @property {string} standard_id
 * @property {string} datei_url
 * @property {number|null} datei_bytes
 * @property {any} pruefbericht
 * @property {string|null} geprueft_am
 * @property {number|null} anker_lat
 * @property {number|null} anker_lng
 * @property {string|null} anker_crs
 * @property {number|null} anker_hoehe_m
 * @property {number|null} drehung_grad
 * @property {string|null} verortung_methode_id
 * @property {string|null} verortet_von
 * @property {string|null} verortet_am
 * @property {string} methode_id
 * @property {string|null} software
 * @property {string|null} software_version
 * @property {string} kennzeichnung
 * @property {string|null} bemerkung
 * @property {string|null} erfasst_von
 * @property {string} erfasst_am
 */

/**
 * @typedef {object} Datenstand
 * @property {string} stichdatum
 * @property {Array<{id:string,name:string,kuerzel:string|null,adresse:string|null,crs:string,flaeche_m2:number|null,geometrie:any}>} standorte
 * @property {Array<{id:string,name:string,organisation:string|null,qualifikation:string|null}>} personen
 * @property {Array<{id:string,name:string,beschreibung:string,einheit:string|null,erfassungsart:string,standard_id:string|null}>} methoden
 * @property {Array<{id:string,kurzname:string,herausgeber:string,quelle_url:string,abgerufen_am:string,zitat:string}>} standards
 * @property {Baum[]} baeume
 * @property {SplatAufnahme[]} splatAufnahmen
 */

/** @type {Datenstand|null} */
let zwischenspeicher = null

/**
 * Lädt den kompletten Datenstand eines Standorts.
 * @returns {Promise<Datenstand>}
 */
export async function ladeDatenstand() {
  if (zwischenspeicher) return zwischenspeicher

  if (FIXTURE_MODUS) {
    const modul = await import('../../fixtures/ground_truth.json')
    const roh = /** @type {any} */ (modul.default ?? modul)
    // Ältere Fixtures kennen die Splat-Aufnahmen noch nicht. Eine fehlende
    // Liste heißt hier „keine Aufnahmen", nicht „unbekannt": die Fixture ist
    // per Definition der vollständige Stand.
    zwischenspeicher = /** @type {Datenstand} */ ({ splatAufnahmen: [], ...roh })
    return zwischenspeicher
  }

  const [standorte, personen, methoden, standards, baeume, messungen, bewertungen, kontrollen, splats] =
    await Promise.all([
      sb.from('biome_standort').select('id,name,kuerzel,adresse,crs,flaeche_m2,geometrie').order('name'),
      sb.from('biome_person').select('id,name,organisation,qualifikation'),
      sb.from('biome_methode').select('id,name,beschreibung,einheit,erfassungsart,standard_id'),
      sb.from('biome_standard').select('id,kurzname,herausgeber,quelle_url,abgerufen_am,zitat'),
      sb.from('biome_baum').select('*').order('baumnummer'),
      sb.from('biome_baum_messung').select('*'),
      sb.from('biome_baum_bewertung').select('*'),
      sb.from('biome_kontrolle').select('*'),
      // Die Sicht liefert das Splat-Feld zusammen mit seinem Flug. Ohne Datum,
      // Sensor und Bodenauflösung ist eine Aufnahme nicht einzuordnen.
      sb.from('v_biome_splatfeld').select('*').order('flug_datum', { ascending: false }),
    ])

  // Fehler nicht verschlucken. Ohne das wird aus „Tabelle gibt es nicht"
  // stillschweigend eine leere Liste, und die Oberfläche meldet „0 Bäume" —
  // genau die Verwechslung von fehlend und null, die BIOME nicht machen darf.
  const antworten = { standorte, personen, methoden, standards, baeume, messungen, bewertungen, kontrollen, splats }
  const kaputt = Object.entries(antworten).filter(([, a]) => a.error)
  if (kaputt.length) {
    const [name, a] = kaputt[0]
    const err = new Error(
      `Der BIOME-Datenkern ist auf dieser Umgebung nicht erreichbar (${name}: ${a.error?.message ?? 'unbekannter Fehler'}). `
      + 'Das ist kein leerer Bestand — es liegen keine Daten vor.',
    )
    err.name = 'DatenkernNichtErreichbar'
    throw err
  }

  const nach = (rows, schluessel) => {
    /** @type {Record<string, any[]>} */
    const k = {}
    for (const r of rows || []) (k[r[schluessel]] ||= []).push(r)
    return k
  }
  const mBaum = nach(messungen.data, 'baum_id')
  const wBaum = nach(bewertungen.data, 'baum_id')
  const kBaum = nach(kontrollen.data, 'baum_id')

  zwischenspeicher = {
    // Ohne Fixture ist das Stichdatum der heutige Tag — dann ist es eine
    // Momentaufnahme und wird als solche angezeigt.
    stichdatum: new Date().toISOString().slice(0, 10),
    standorte: standorte.data || [],
    personen: personen.data || [],
    methoden: methoden.data || [],
    standards: standards.data || [],
    baeume: (baeume.data || []).map(b => ({
      ...b,
      messungen: mBaum[b.id] || [],
      bewertungen: wBaum[b.id] || [],
      kontrollen: (kBaum[b.id] || []).sort((a, c) => (a.datum < c.datum ? 1 : -1)),
    })),
    splatAufnahmen: splats.data || [],
  }
  return zwischenspeicher
}

/** Nur für Tests: Zwischenspeicher leeren. */
export function zwischenspeicherLeeren() { zwischenspeicher = null }

/* ── Ableitungen ─────────────────────────────────────────────────────────
   Der Nachweiskern ist append-only: eine Korrektur ist ein neuer Datensatz,
   der einen alten über `ersetzt_id` ablöst. Gültig ist, was von niemandem
   abgelöst wurde. Wer das vergisst, zeigt 850 cm statt 85 cm.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * @template {{id: string, ersetzt_id?: string|null}} T
 * @param {T[]} zeilen
 * @returns {T[]}
 */
export function nurGueltige(zeilen) {
  const abgeloest = new Set((zeilen || []).map(z => z.ersetzt_id).filter(Boolean))
  return (zeilen || []).filter(z => !abgeloest.has(z.id))
}

/**
 * Die gültige Messung eines Merkmals — die jüngste, die nicht ersetzt wurde.
 * @param {Baum} baum
 * @param {string} merkmal
 * @returns {Messung|null}
 */
export function messung(baum, merkmal) {
  // Einzelstammwerte sind ausdrücklich keine Baumwerte. Ohne diesen Filter
  // würde bei einem mehrstämmigen Baum der zuletzt erfasste Stamm als „der"
  // Stammumfang durchgehen — und das ist eine andere Größe.
  const passend = nurGueltige(baum.messungen || [])
    .filter(m => m.merkmal === merkmal && m.stamm_nr == null)
  if (!passend.length) return null
  return passend.reduce((a, b) => (a.datum >= b.datum ? a : b))
}

/**
 * Der stärkste gültige Einzelstamm eines mehrstämmigen Baums.
 *
 * BAUM-BE-06 wörtlich: geschützt, „wenn mindestens einer der Stämme einen
 * Mindestumfang von 50 cm aufweist". Maßgeblich ist damit das Maximum, nicht
 * die Summe und nicht der Mittelwert.
 *
 * @param {Baum} baum
 * @returns {{ messung: Messung, anzahlStaemme: number }|null}
 */
export function staerksterStamm(baum) {
  const staemme = nurGueltige(baum.messungen || [])
    .filter(m => m.merkmal === 'stammumfang' && m.stamm_nr != null && m.einheit === 'cm')
  if (!staemme.length) return null
  return {
    messung: staemme.reduce((a, b) => (a.wert >= b.wert ? a : b)),
    anzahlStaemme: new Set(staemme.map(m => m.stamm_nr)).size,
  }
}

/**
 * Die abgelöste Vorgängerzeile zu einer Messung, falls es eine gibt.
 * @param {Baum} baum
 * @param {Messung} m
 * @returns {Messung|null}
 */
export function ersetzteMessung(baum, m) {
  if (!m?.ersetzt_id) return null
  return (baum.messungen || []).find(x => x.id === m.ersetzt_id) || null
}

/**
 * @param {Baum} baum
 * @returns {Kontrolle|null}
 */
export function letzteKontrolle(baum) {
  const gueltig = nurGueltige(baum.kontrollen || [])
  if (!gueltig.length) return null
  return gueltig.reduce((a, b) => (a.datum >= b.datum ? a : b))
}

/**
 * @param {Baum} baum
 * @param {number} jahr
 * @returns {boolean}
 */
export function imJahrKontrolliert(baum, jahr) {
  return nurGueltige(baum.kontrollen || []).some(k => Number(k.datum.slice(0, 4)) === jahr)
}

/**
 * Der Kontrollstand eines Baums zum Stichjahr.
 *
 * Drei Zustände, bewusst getrennt: „noch nie kontrolliert" ist ein anderer
 * Sachverhalt als „dieses Jahr keine". Wer beides zusammenwirft, meldet dem
 * Amt eine falsche Zahl.
 *
 * Der Zustand heißt bewusst nicht „offen": ob eine Kontrolle fällig ist,
 * richtet sich nach Entwicklungsphase, Sicherheitserwartung und Zustand des
 * Baums, nicht nach dem Kalenderjahr. Hier steht nur, ob in diesem Jahr eine
 * dokumentiert ist.
 *
 * @param {Baum} baum
 * @param {number} jahr
 * @returns {'kontrolliert'|'jahr_ohne'|'nie_kontrolliert'}
 */
export function kontrollstand(baum, jahr) {
  if (!nurGueltige(baum.kontrollen || []).length) return 'nie_kontrolliert'
  return imJahrKontrolliert(baum, jahr) ? 'kontrolliert' : 'jahr_ohne'
}

/**
 * Die gültige Vitalitätsbeurteilung.
 * @param {Baum} baum
 */
export function vitalitaet(baum) {
  const gueltig = nurGueltige(baum.bewertungen || [])
  if (!gueltig.length) return null
  return gueltig.reduce((a, b) => (a.datum >= b.datum ? a : b))
}

/**
 * Artenverteilung eines Bestands. Bäume ohne bestimmte Art werden als eigene
 * Gruppe geführt, nicht weggelassen und nicht geraten.
 *
 * @param {Baum[]} baeume
 * @returns {Array<{art: string|null, anzahl: number}>}
 */
export function artenverteilung(baeume) {
  /** @type {Map<string|null, number>} */
  const zaehler = new Map()
  for (const b of baeume) {
    const art = b.art_wissenschaftlich || null
    zaehler.set(art, (zaehler.get(art) || 0) + 1)
  }
  return [...zaehler.entries()]
    .map(([art, anzahl]) => ({ art, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || String(a.art).localeCompare(String(b.art)))
}

/**
 * Ist diese Splat-Aufnahme im Gelände verortet?
 *
 * Bewusst eine eigene Funktion und kein `!!a.anker_lat` an vierzig Stellen:
 * die Verortung ist bei diesem Datentyp die Angabe, deren Fehlen am leichtesten
 * übersehen wird. Sie steht nicht im Dateiformat (FE-GS-23), und eine Aufnahme
 * ohne sie ist ein Modell ohne Ort — hübsch anzusehen und für jede Auswertung
 * am Standort unbrauchbar.
 *
 * Die Datenbank lässt eine Teilverortung gar nicht erst zu; diese Prüfung
 * fängt Fremdquellen und Altbestand ab.
 *
 * @param {SplatAufnahme} aufnahme
 * @returns {boolean}
 */
export function splatVerortet(aufnahme) {
  return aufnahme.anker_lat != null && aufnahme.anker_lng != null
    && !!aufnahme.anker_crs && !!aufnahme.verortung_methode_id && !!aufnahme.verortet_am
}

/**
 * Die abrufbare Adresse der Splat-Datei.
 *
 * Drei zulässige Schreibweisen in `datei_url`:
 *
 *   · `https://…`            wird unverändert übernommen
 *   · `eimer/pfad/datei.glb` Ablagepfad — der Normalfall. Die Datei liegt im
 *                            selben Speicher wie Fotos und Kacheln, und die
 *                            öffentliche Adresse baut der Client.
 *   · `/datei.glb`           eine Datei neben der Anwendung, gleiche Herkunft.
 *                            Führender Schrägstrich, also kein Eimername davor.
 *
 * @param {SplatAufnahme} aufnahme
 * @returns {string}
 */
export function splatDateiUrl(aufnahme) {
  const pfad = aufnahme.datei_url || ''
  if (/^https?:\/\//i.test(pfad)) return pfad
  const schnitt = pfad.indexOf('/')
  if (schnitt <= 0) return pfad
  const eimer = pfad.slice(0, schnitt)
  const rest = pfad.slice(schnitt + 1)
  return sb.storage.from(eimer).getPublicUrl(rest).data.publicUrl
}

/**
 * Die Splat-Aufnahmen eines Standorts, jüngste zuerst.
 *
 * @param {Datenstand} stand
 * @param {string|null} standortId
 * @returns {SplatAufnahme[]}
 */
export function splatAufnahmen(stand, standortId) {
  const alle = stand.splatAufnahmen || []
  const gefiltert = standortId ? alle.filter(a => a.standort_id === standortId) : alle
  return [...gefiltert].sort((a, b) => (a.flug_datum < b.flug_datum ? 1 : -1))
}

/**
 * Nachschlagehilfen über den Datenstand.
 * @param {Datenstand} stand
 */
export function nachschlagen(stand) {
  const personen = new Map(stand.personen.map(p => [p.id, p]))
  const methoden = new Map(stand.methoden.map(m => [m.id, m]))
  const standards = new Map(stand.standards.map(s => [s.id, s]))
  return {
    person: (/** @type {string|null} */ id) => (id ? personen.get(id) || null : null),
    methode: (/** @type {string|null} */ id) => (id ? methoden.get(id) || null : null),
    /** Die Quelle hinter einer Methode — der zweite Klick der Rückverfolgung. */
    standardZuMethode: (/** @type {string|null} */ id) => {
      const m = id ? methoden.get(id) : null
      return m?.standard_id ? standards.get(m.standard_id) || null : null
    },
  }
}
