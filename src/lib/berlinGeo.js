// Amtliche Berliner Geodaten (GDI Berlin, WFS → GeoJSON, CORS offen):
//  · ALKIS-Gebäude: offizielle Grundrisse + Geschosszahl (aog) / Höhe (hoh)
//  · Baumkataster: Straßen- & Anlagenbäume mit Kronendurchmesser + Baumhöhe
// Beide für die Sonnen-/Schattenanalyse; außerhalb Berlins → null (Fallback OSM).

import { fetchT } from './fetchTimeout.js'

const WFS = 'https://gdi.berlin.de/services/wfs'
const CRS = 'urn:ogc:def:crs:EPSG::4326'
const cache = new Map()

// Grobe Berlin-Ausdehnung — nur hier liefern die Dienste Daten
export function isInBerlin(lat, lng) {
  return lat > 52.32 && lat < 52.69 && lng > 13.07 && lng < 13.78
}

async function getJson(url, signal) {
  const resp = await fetchT(url, { timeout: 15000, signal })
  if (!resp.ok) throw new Error(`WFS ${resp.status}`)
  return resp.json()
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn().catch(err => { cache.delete(key); throw err }))
  return cache.get(key)
}

const bboxParam = (s, w, n, e) => `${s},${w},${n},${e},${CRS}`

/* ── ALKIS-Gebäude ────────────────────────────────────────────────────────
   Höhe: hoh-Attribut (m) > Geschosse × 3,3 m + 2 m Dach > 12 m Annahme.
   MultiPolygone werden in ihre Außenringe zerlegt (Löcher fürs Schattenmodell
   vernachlässigbar). Rückgabeformat identisch zu lib/overpass.js. */
export async function fetchAlkisBuildings(south, west, north, east) {
  const key = 'geb:' + [south, west, north, east].map(v => v.toFixed(4)).join(',')
  return cached(key, async () => {
    const url = `${WFS}/alkis_gebaeude?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=alkis_gebaeude:gebaeude&BBOX=${bboxParam(south, west, north, east)}&SRSNAME=${CRS}&outputFormat=application/json&COUNT=6000`
    const json = await getJson(url)
    const out = []
    for (const f of json.features || []) {
      const p = f.properties || {}
      const hoh = parseFloat(String(p.hoh ?? '').replace(',', '.'))
      const aog = parseFloat(p.aog)
      const height = hoh > 0 ? Math.min(hoh, 200)
        : aog > 0 ? Math.min(aog * 3.3 + 2, 200)
        : 12
      const geom = f.geometry
      if (!geom) continue
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []
      polys.forEach((poly, i) => {
        const ring = poly?.[0]
        if (!ring || ring.length < 4) return
        out.push({
          id: `${p.uuid || f.id || key}-${i}`,
          height,
          hasHeightTag: hoh > 0 || aog > 0,
          funktion: p.bezgfk || null,
          ring: ring.slice(0, ring.length - 1), // offener Ring wie bei OSM
        })
      })
    }
    return out
  })
}

/* ── Baumkataster ─────────────────────────────────────────────────────────
   kronedurch = Kronendurchmesser (m), baumhoehe (m) — fehlende Werte werden
   konservativ geschätzt (Höhe 12 m, Krone 6 m). */
async function fetchTreeLayer(layer, south, west, north, east) {
  const url = `${WFS}/baumbestand?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=baumbestand:${layer}&BBOX=${bboxParam(south, west, north, east)}&SRSNAME=${CRS}&outputFormat=application/json&COUNT=5000`
  const json = await getJson(url)
  return (json.features || []).map(f => {
    const p = f.properties || {}
    const [lng, lat] = f.geometry?.coordinates || []
    const height = parseFloat(p.baumhoehe) > 0 ? Math.min(parseFloat(p.baumhoehe), 45) : 12
    const crown = parseFloat(p.kronedurch) > 0 ? Math.min(parseFloat(p.kronedurch), 30) : 6
    // Nadelbäume behalten auch im Winter ihren Schatten und haben schmalere Kronen
    const nadel = /nadel/i.test(p.art_gruppe || '')
    return lat != null ? {
      lat, lng, height, crown, nadel,
      art: p.art_dtsch || p.gattung_deutsch || 'Baum',
      gruppe: p.art_gruppe || null,
      pflanzjahr: p.pflanzjahr || null,
    } : null
  }).filter(Boolean)
}

export async function fetchBerlinTrees(south, west, north, east) {
  const key = 'baum:' + [south, west, north, east].map(v => v.toFixed(4)).join(',')
  return cached(key, async () => {
    const [a, b] = await Promise.all([
      fetchTreeLayer('strassenbaeume', south, west, north, east),
      fetchTreeLayer('anlagenbaeume', south, west, north, east),
    ])
    return [...a, ...b]
  })
}

// Bequemer Radius-Helfer (Meter um einen Punkt)
export function radiusBbox(lat, lng, radiusM) {
  const dLat = radiusM / 111320
  const dLng = radiusM / (111320 * Math.cos(lat * Math.PI / 180))
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng]
}
