// LoD2-Patches: amtliche Berliner Dachmodelle als kompakte JSON-Ausschnitte
// (public/lod2/*.json, erzeugt mit scripts/lod2-patch.mjs, Lizenz dl-de/zero).
// Die Sonnenanalyse rechnet damit gegen echte Dach-/Wandflächen; die 3D-Ansicht
// rendert sie. Kein Patch vorhanden → Aufrufer fällt auf ALKIS/OSM zurück.

import { fetchT } from './fetchTimeout.js'

let indexPromise = null
const patchCache = new Map()

function distM(lat1, lng1, lat2, lng2) {
  const kx = 111320 * Math.cos(lat1 * Math.PI / 180)
  return Math.hypot((lng2 - lng1) * kx, (lat2 - lat1) * 111320)
}

export function loadLod2Index() {
  if (!indexPromise) {
    indexPromise = fetchT('/lod2/index.json', { timeout: 10000 })
      .then(r => (r.ok ? r.json() : []))
      .catch(() => [])
  }
  return indexPromise
}

// Index-Eintrag des Gebiets, das den Punkt abdeckt (enthält u.a. die
// vorberechneten Sonnen-Heatmaps + deren Bounds) — ohne den Patch zu laden.
export async function findLod2Entry(lat, lng, marginM = 0) {
  const idx = await loadLod2Index()
  return (idx || []).find(e => distM(lat, lng, e.lat, e.lng) < (e.radius || 350) - marginM) || null
}

// Deckt ein Patch den Punkt ab (mit Rand-Puffer, damit MAX_DIST-Verschatter
// noch enthalten sind)? → Patch-JSON, sonst null.
export async function findLod2Patch(lat, lng, marginM = 120) {
  const hit = await findLod2Entry(lat, lng, marginM)
  if (!hit) return null
  if (!patchCache.has(hit.file)) {
    patchCache.set(hit.file, fetchT(`/lod2/${hit.file}`, { timeout: 25000 })
      .then(r => { if (!r.ok) throw new Error(`lod2 ${r.status}`); return r.json() })
      .catch(err => { patchCache.delete(hit.file); throw err }))
  }
  return patchCache.get(hit.file)
}
