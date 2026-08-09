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
 * @property {string|null} standorttyp
 * @property {Messung[]} messungen
 * @property {Array<{id:string, skala_id:string, stufe:string, begruendung:string|null, methode_id:string, datum:string, erfasst_von:string, ersetzt_id:string|null}>} bewertungen
 * @property {Kontrolle[]} kontrollen
 */

/**
 * @typedef {object} Datenstand
 * @property {string} stichdatum
 * @property {Array<{id:string,name:string,kuerzel:string|null,adresse:string|null,crs:string,flaeche_m2:number|null,geometrie:any}>} standorte
 * @property {Array<{id:string,name:string,organisation:string|null,qualifikation:string|null}>} personen
 * @property {Array<{id:string,name:string,beschreibung:string,einheit:string|null,erfassungsart:string,standard_id:string|null}>} methoden
 * @property {Array<{id:string,kurzname:string,herausgeber:string,quelle_url:string,abgerufen_am:string,zitat:string}>} standards
 * @property {Baum[]} baeume
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
    zwischenspeicher = /** @type {Datenstand} */ (modul.default ?? modul)
    return zwischenspeicher
  }

  const [standorte, personen, methoden, standards, baeume, messungen, bewertungen, kontrollen] =
    await Promise.all([
      sb.from('biome_standort').select('id,name,kuerzel,adresse,crs,flaeche_m2,geometrie').order('name'),
      sb.from('biome_person').select('id,name,organisation,qualifikation'),
      sb.from('biome_methode').select('id,name,beschreibung,einheit,erfassungsart,standard_id'),
      sb.from('biome_standard').select('id,kurzname,herausgeber,quelle_url,abgerufen_am,zitat'),
      sb.from('biome_baum').select('*').order('baumnummer'),
      sb.from('biome_baum_messung').select('*'),
      sb.from('biome_baum_bewertung').select('*'),
      sb.from('biome_kontrolle').select('*'),
    ])

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
  const passend = nurGueltige(baum.messungen || []).filter(m => m.merkmal === merkmal)
  if (!passend.length) return null
  return passend.reduce((a, b) => (a.datum >= b.datum ? a : b))
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
 * Sachverhalt als „dieses Jahr noch nicht". Wer beides zusammenwirft, meldet
 * dem Amt eine falsche Zahl.
 *
 * @param {Baum} baum
 * @param {number} jahr
 * @returns {'kontrolliert'|'jahr_offen'|'nie_kontrolliert'}
 */
export function kontrollstand(baum, jahr) {
  if (!nurGueltige(baum.kontrollen || []).length) return 'nie_kontrolliert'
  return imJahrKontrolliert(baum, jahr) ? 'kontrolliert' : 'jahr_offen'
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
