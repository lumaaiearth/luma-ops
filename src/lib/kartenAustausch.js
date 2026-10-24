// ─────────────────────────────────────────────────────────────────────────────
// Kartendaten austauschen: Import und Export
//
// Einlesen: GeoJSON, KML (Google Earth, QGIS) und CSV-Baumlisten (z. B. ein
// Baumkataster aus Excel). CSV-Koordinaten dürfen WGS84 (Breite/Länge) oder
// ETRS89/UTM 33 (Rechts-/Hochwert, Berlin/Brandenburg) sein.
// Ausgeben: GeoJSON (alle Geometrien) und CSV (eine Zeile je Objekt,
// Flächen mit Schwerpunkt und Fläche) — Trennzeichen „;“ für Excel.
//
// Spaltennamen werden auf die Felder der Karte abgebildet (ALIAS); unbekannte
// Spalten bleiben als eigene Eigenschaft erhalten.
// Geprüft mit scripts/test-karten-austausch.mjs
// ─────────────────────────────────────────────────────────────────────────────

import proj4 from 'proj4'
import { geometryCentroid, geomMeasures } from './geo.js'

export const MAX_OBJEKTE = 5000
const TYPEN = ['tree', 'area', 'bed', 'point', 'line']
const NICHT_EXPORTIEREN = new Set(['photos', 'sonnenanalyse', 'starkregen', 'opacity', 'image_url', 'tiles_url'])
const UTM33 = '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs'

// Spalten-/Eigenschaftsnamen → Feld der Karte (klein geschrieben, ohne Umlaute)
const ALIAS = {
  baumnummer: ['baumnummer', 'baum_nr', 'baumnr', 'nummer', 'nr', 'baumid', 'baum_id', 'kennung'],
  baumart_deutsch: ['baumart_deutsch', 'baumart', 'art', 'art_deutsch', 'art_dtsch', 'deutscher_name', 'name_deutsch'],
  baumart_latein: ['baumart_latein', 'latein', 'art_bot', 'art_botanisch', 'botanisch', 'botanischer_name', 'gattung_art'],
  stammumfang_cm: ['stammumfang_cm', 'stammumfang', 'stammumfg', 'umfang', 'umfang_cm'],
  baumhoehe_m: ['baumhoehe_m', 'baumhoehe', 'hoehe', 'hoehe_m'],
  kronendurchmesser_m: ['kronendurchmesser_m', 'kronendurchmesser', 'kronedurch', 'krone', 'krone_m'],
  pflanzjahr: ['pflanzjahr', 'pflanz_jahr'],
  notizen: ['notizen', 'notiz', 'bemerkung', 'bemerkungen', 'beschreibung', 'description'],
}
const LABEL = ['bezeichnung', 'label', 'name', 'titel', 'title']
const TYP = ['typ', 'feature_type', 'objekttyp']
const BREITE = ['breite', 'breitengrad', 'lat', 'latitude', 'wgs84_lat', 'y_wgs84']
const LAENGE = ['laenge', 'laengengrad', 'lng', 'lon', 'long', 'longitude', 'wgs84_lon', 'x_wgs84']
const RECHTS = ['rechtswert', 'ost', 'easting', 'x', 'utm_x', 'utm_e']
const HOCH = ['hochwert', 'nord', 'northing', 'y', 'utm_y', 'utm_n']
const ZAHLEN = new Set(['stammumfang_cm', 'baumhoehe_m', 'kronendurchmesser_m', 'pflanzjahr'])

const normName = k => String(k).trim().toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const ALIAS_INDEX = new Map(Object.entries(ALIAS).flatMap(([feld, namen]) => namen.map(n => [n, feld])))

function zahl(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (v == null) return null
  const s = String(v).trim().replace(/\s/g, '')
  if (!s) return null
  // „1.234,5“ und „1234,5“ (deutsch) wie „1234.5“
  const n = Number(/,\d+$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : null
}

// Eigenschaften eines Fremdobjekts → { label, typ, properties }
function abbilden(roh = {}) {
  const properties = {}
  let label = null, typ = null
  for (const [k, v] of Object.entries(roh)) {
    if (v == null || v === '' || typeof v === 'object') continue
    const n = normName(k)
    if (!label && LABEL.includes(n)) { label = String(v).trim(); continue }
    if (!typ && TYP.includes(n) && TYPEN.includes(String(v).trim())) { typ = String(v).trim(); continue }
    if (['id', 'projekt', 'project_id', ...BREITE, ...LAENGE, ...RECHTS, ...HOCH, 'flaeche_m2', 'laenge_m', 'area_m2', 'length_m', 'perimeter_m'].includes(n)) continue
    const feld = ALIAS_INDEX.get(n) || n
    if (feld in properties) continue
    properties[feld] = ZAHLEN.has(feld) ? (zahl(v) ?? v) : v
  }
  return { label, typ, properties }
}

const istBaum = p => p.baumnummer != null || p.baumart_deutsch != null || p.baumart_latein != null || p.stammumfang_cm != null

function typFuer(geometry, typ, properties, flaechenTyp) {
  const passt = {
    Point: ['tree', 'point'], LineString: ['line'], Polygon: ['area', 'bed'],
  }[geometry.type] || []
  if (typ && passt.includes(typ)) return typ
  if (geometry.type === 'Point') return istBaum(properties) ? 'tree' : 'point'
  if (geometry.type === 'LineString') return 'line'
  return flaechenTyp
}

const gueltigerPunkt = c => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
  && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90
const nur2d = c => [c[0], c[1]]

// Multi*-Geometrien in Einzelteile zerlegen; nur 2D, nur gültige Koordinaten
function zerlegen(g) {
  if (!g || !g.type) return []
  switch (g.type) {
    case 'Point': return gueltigerPunkt(g.coordinates) ? [{ type: 'Point', coordinates: nur2d(g.coordinates) }] : []
    case 'LineString': {
      const c = (g.coordinates || []).filter(gueltigerPunkt).map(nur2d)
      return c.length >= 2 ? [{ type: 'LineString', coordinates: c }] : []
    }
    case 'Polygon': {
      const ringe = (g.coordinates || []).map(r => (r || []).filter(gueltigerPunkt).map(nur2d)).filter(r => r.length >= 3)
      if (!ringe.length) return []
      for (const r of ringe) {
        const [a, b] = [r[0], r[r.length - 1]]
        if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]])
      }
      return ringe[0].length >= 4 ? [{ type: 'Polygon', coordinates: ringe }] : []
    }
    case 'MultiPoint': return (g.coordinates || []).flatMap(c => zerlegen({ type: 'Point', coordinates: c }))
    case 'MultiLineString': return (g.coordinates || []).flatMap(c => zerlegen({ type: 'LineString', coordinates: c }))
    case 'MultiPolygon': return (g.coordinates || []).flatMap(c => zerlegen({ type: 'Polygon', coordinates: c }))
    case 'GeometryCollection': return (g.geometries || []).flatMap(zerlegen)
    default: return []
  }
}

function ausGeoJSON(text) {
  const daten = JSON.parse(text)
  const liste = daten.type === 'FeatureCollection' ? daten.features || []
    : daten.type === 'Feature' ? [daten]
    : [{ type: 'Feature', geometry: daten, properties: {} }]
  const roh = [], fehler = []
  liste.forEach((f, i) => {
    const teile = zerlegen(f?.geometry)
    if (!teile.length) { fehler.push(`Objekt ${i + 1}: keine verwertbare Geometrie`); return }
    for (const geometry of teile) roh.push({ geometry, attribute: f.properties || {} })
  })
  return { roh, fehler }
}

// KML ohne DOMParser lesen — läuft so auch im Test unter Node.
const kmlText = s => s == null ? null : s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim()
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const kmlTag = (xml, tag) => { const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'i')); return m ? m[1] : null }
const kmlAlle = (xml, tag) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'gi'))].map(m => m[1])
const kmlKoordinaten = s => (s || '').trim().split(/\s+/).filter(Boolean).map(t => t.split(',').map(Number))

function ausKML(text) {
  const roh = [], fehler = []
  kmlAlle(text, 'Placemark').forEach((pm, i) => {
    const attribute = {}
    const name = kmlText(kmlTag(pm, 'name'))
    if (name) attribute.name = name
    const beschreibung = kmlText(kmlTag(pm, 'description'))
    if (beschreibung) attribute.beschreibung = beschreibung
    for (const m of pm.matchAll(/<(?:\w+:)?Data\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?Data>/gi)) attribute[m[1]] = kmlText(kmlTag(m[2], 'value'))
    for (const m of pm.matchAll(/<(?:\w+:)?SimpleData\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?SimpleData>/gi)) attribute[m[1]] = kmlText(m[2])

    const geos = [
      ...kmlAlle(pm, 'Point').map(p => ({ type: 'Point', coordinates: kmlKoordinaten(kmlTag(p, 'coordinates'))[0] })),
      ...kmlAlle(pm, 'LineString').map(l => ({ type: 'LineString', coordinates: kmlKoordinaten(kmlTag(l, 'coordinates')) })),
      ...kmlAlle(pm, 'Polygon').map(p => ({
        type: 'Polygon',
        coordinates: [
          kmlKoordinaten(kmlTag(kmlTag(p, 'outerBoundaryIs') || '', 'coordinates')),
          ...kmlAlle(p, 'innerBoundaryIs').map(r => kmlKoordinaten(kmlTag(r, 'coordinates'))),
        ],
      })),
    ].flatMap(zerlegen)
    if (!geos.length) { fehler.push(`Platzmarke ${i + 1}${name ? ` „${name}“` : ''}: keine verwertbare Geometrie`); return }
    for (const geometry of geos) roh.push({ geometry, attribute })
  })
  return { roh, fehler }
}

function csvZeilen(text) {
  const kopf = text.split(/\r?\n/, 1)[0]
  const trenner = [';', '\t', ','].map(t => [t, kopf.split(t).length]).sort((a, b) => b[1] - a[1])[0][0]
  const zeilen = []
  let feld = '', zeile = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { feld += '"'; i++ }
      else if (c === '"') inQ = false
      else feld += c
    } else if (c === '"') inQ = true
    else if (c === trenner) { zeile.push(feld); feld = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      zeile.push(feld); feld = ''
      if (zeile.some(z => z.trim())) zeilen.push(zeile)
      zeile = []
    } else feld += c
  }
  zeile.push(feld)
  if (zeile.some(z => z.trim())) zeilen.push(zeile)
  return zeilen
}

function ausCSV(text) {
  const [kopf, ...daten] = csvZeilen(text)
  if (!kopf) return { roh: [], fehler: ['Die Datei ist leer.'] }
  const namen = kopf.map(normName)
  const spalte = liste => namen.findIndex(n => liste.includes(n))
  const iB = spalte(BREITE), iL = spalte(LAENGE), iR = spalte(RECHTS), iH = spalte(HOCH)
  if ((iB < 0 || iL < 0) && (iR < 0 || iH < 0)) {
    return { roh: [], fehler: ['Keine Koordinatenspalten gefunden — erwartet „Breite“/„Länge“ (bzw. lat/lon) oder „Rechtswert“/„Hochwert“ (UTM 33).'] }
  }
  const roh = [], fehler = []
  daten.forEach((z, i) => {
    let lng = null, lat = null
    if (iB >= 0 && iL >= 0) { lat = zahl(z[iB]); lng = zahl(z[iL]) }
    // Spalten „x/y“ sind oft UTM — große Werte als Rechts-/Hochwert lesen
    if ((lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) && iR >= 0 && iH >= 0) {
      const ost = zahl(z[iR]), nord = zahl(z[iH])
      if (ost != null && nord != null && ost > 1000 && nord > 1000) {
        // Rechtswert mit Zonenvorsatz „33“ (8-stellig) abschneiden
        const e = ost >= 1e7 ? ost - 33e6 : ost
        ;[lng, lat] = proj4(UTM33, 'WGS84', [e, nord])
      } else if (ost != null && nord != null) { lng = ost; lat = nord }
    }
    const geometry = zerlegen({ type: 'Point', coordinates: [lng, lat] })[0]
    if (!geometry) { fehler.push(`Zeile ${i + 2}: keine gültigen Koordinaten`); return }
    const attribute = {}
    kopf.forEach((k, j) => { if (z[j] != null && z[j].trim() !== '') attribute[k.trim()] = z[j].trim() })
    roh.push({ geometry, attribute })
  })
  return { roh, fehler }
}

export function formatAusDatei(name = '', text = '') {
  const n = name.toLowerCase()
  if (n.endsWith('.kml')) return 'kml'
  if (n.endsWith('.geojson') || n.endsWith('.json')) return 'geojson'
  if (n.endsWith('.csv') || n.endsWith('.txt') || n.endsWith('.tsv')) return 'csv'
  const t = text.trimStart()
  if (t.startsWith('{') || t.startsWith('[')) return 'geojson'
  if (t.startsWith('<')) return 'kml'
  return 'csv'
}

/**
 * Datei einlesen. Liefert Objekte im Format der Karte (ohne id/project_id).
 * @param {string} text  Dateiinhalt
 * @param {string} name  Dateiname (für die Formaterkennung)
 * @param {{ flaechenTyp?: 'bed'|'area' }} opt  Typ für Polygone ohne Angabe
 * @returns {{ format, objekte: {feature_type, geometry, label, properties}[], fehler: string[] }}
 */
export function dateiEinlesen(text, name = '', { flaechenTyp = 'bed' } = {}) {
  const format = formatAusDatei(name, text)
  let ergebnis
  try {
    ergebnis = format === 'kml' ? ausKML(text) : format === 'geojson' ? ausGeoJSON(text) : ausCSV(text.replace(/^\uFEFF/, ''))
  } catch (e) {
    return { format, objekte: [], fehler: [`Datei nicht lesbar (${format.toUpperCase()}): ${e.message}`] }
  }
  const fehler = [...ergebnis.fehler]
  let roh = ergebnis.roh
  if (roh.length > MAX_OBJEKTE) {
    fehler.push(`Mehr als ${MAX_OBJEKTE} Objekte — nur die ersten ${MAX_OBJEKTE} werden übernommen.`)
    roh = roh.slice(0, MAX_OBJEKTE)
  }
  const objekte = roh.map(({ geometry, attribute }) => {
    const { label, typ, properties } = abbilden(attribute)
    const feature_type = typFuer(geometry, typ, properties, flaechenTyp)
    return { feature_type, geometry, label: label || (feature_type === 'tree' ? properties.baumnummer ?? null : null), properties }
  })
  return { format, objekte, fehler }
}

// ── Export ──────────────────────────────────────────────────────────────────

const exportierbar = f => TYPEN.includes(f.feature_type) && f.geometry
function eigenschaften(f) {
  const out = {}
  for (const [k, v] of Object.entries(f.properties || {})) {
    if (NICHT_EXPORTIEREN.has(k) || ['area_m2', 'perimeter_m', 'length_m', 'flaeche_m2'].includes(k)) continue
    if (v != null && v !== '' && typeof v !== 'object') out[k] = v
  }
  return out
}
function masse(f) {
  const m = geomMeasures(f.geometry) || {}
  return {
    flaeche_m2: m.area_m2 > 0 ? Math.round(m.area_m2 * 10) / 10 : null,
    laenge_m: m.length_m > 0 ? Math.round(m.length_m * 10) / 10 : null,
  }
}

export function alsGeoJSON(features, projekte = []) {
  const projName = new Map(projekte.map(p => [p.id, p.name]))
  return {
    type: 'FeatureCollection',
    features: features.filter(exportierbar).map(f => {
      const { flaeche_m2, laenge_m } = masse(f)
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          id: f.id, typ: f.feature_type, bezeichnung: f.label ?? null,
          projekt: projName.get(f.project_id) ?? f.project_id ?? null,
          ...(flaeche_m2 != null && { flaeche_m2 }), ...(laenge_m != null && { laenge_m }),
          ...eigenschaften(f),
        },
      }
    }),
  }
}

const csvFeld = v => {
  if (v == null) return ''
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function alsCSV(features, projekte = []) {
  const projName = new Map(projekte.map(p => [p.id, p.name]))
  const liste = features.filter(exportierbar)
  const extra = [...new Set(liste.flatMap(f => Object.keys(eigenschaften(f))))]
  const kopf = ['id', 'typ', 'bezeichnung', 'projekt', 'breite', 'laenge', 'flaeche_m2', 'laenge_m', ...extra]
  const zeilen = liste.map(f => {
    const c = f.geometry.type === 'Point'
      ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
      : geometryCentroid(f.geometry)
    const { flaeche_m2, laenge_m } = masse(f)
    const p = eigenschaften(f)
    return [f.id, f.feature_type, f.label, projName.get(f.project_id) ?? f.project_id,
      c ? Math.round(c.lat * 1e7) / 1e7 : null, c ? Math.round(c.lng * 1e7) / 1e7 : null,
      flaeche_m2, laenge_m, ...extra.map(k => p[k])].map(csvFeld).join(';')
  })
  // BOM, damit Excel Umlaute richtig liest
  return '\uFEFF' + [kopf.join(';'), ...zeilen].join('\r\n') + '\r\n'
}
