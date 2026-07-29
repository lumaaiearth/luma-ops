// Gebäude aus OpenStreetMap (Overpass API) — Grundrisse + Höhen für die
// Sonnen-/Schattenanalyse. Höhe: height-Tag > building:levels × 3,2 m + Dach,
// sonst 12 m Standardannahme (Berliner Blockrand ≈ 20–22 m hat fast immer Tags).

import { fetchT } from './fetchTimeout.js'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const cache = new Map() // key → Promise<buildings[]>

function estimateHeight(tags = {}) {
  const h = parseFloat(String(tags.height || '').replace(',', '.'))
  if (h > 0) return Math.min(h, 200)
  const levels = parseFloat(tags['building:levels'])
  if (levels > 0) return Math.min(levels * 3.2 + 2, 200)
  return 12
}

function parseBuildings(json) {
  const out = []
  for (const el of json.elements || []) {
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 3) continue
    const ring = el.geometry.map(g => [g.lon, g.lat])
    out.push({
      id: el.id,
      height: estimateHeight(el.tags),
      levels: el.tags?.['building:levels'] || null,
      hasHeightTag: !!(el.tags?.height || el.tags?.['building:levels']),
      ring, // [[lng,lat], …] (offener Ring)
    })
  }
  return out
}

async function query(bbox) {
  const [s, w, n, e] = bbox
  const q = `[out:json][timeout:25];way["building"](${s},${w},${n},${e});out geom;`
  // Overpass ist der langsamste Dienst → großzügigeres, aber endliches Limit
  const resp = await fetchT(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 25000 })
  if (!resp.ok) throw new Error(`Overpass ${resp.status}`)
  return parseBuildings(await resp.json())
}

// Gebäude im Umkreis (Meter) um einen Punkt — für die Punkt-Analyse
export async function fetchBuildingsAround(lat, lng, radiusM = 160) {
  const dLat = radiusM / 111320
  const dLng = radiusM / (111320 * Math.cos(lat * Math.PI / 180))
  return fetchBuildingsBbox(lat - dLat, lng - dLng, lat + dLat, lng + dLng)
}

// Gebäude in einer BBox — für die 3D-Ansicht (Kantenlänge clientseitig begrenzen!)
export async function fetchBuildingsBbox(south, west, north, east) {
  const key = [south, west, north, east].map(v => v.toFixed(4)).join(',')
  if (!cache.has(key)) {
    cache.set(key, query([south, west, north, east]).catch(err => { cache.delete(key); throw err }))
  }
  return cache.get(key)
}
