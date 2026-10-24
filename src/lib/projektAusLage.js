// ─────────────────────────────────────────────────────────────────────────────
// Projekt aus der Lage ableiten
//
// Beim Erfassen musste das Projekt vorher in der Werkzeugleiste gewählt werden
// — wer es vergaß, bekam nur den Hinweis „erst Projekt wählen“. Jetzt wird es
// aus der Lage des gezeichneten Objekts vorgeschlagen:
//   1. Liegt der Schwerpunkt in einer Projektfläche (feature_type 'area'),
//      gilt deren Projekt — bei Überschneidung die kleinste Fläche.
//   2. Sonst das nächstgelegene Projekt mit Pin, wenn es nah genug ist.
//   3. Sonst kein Vorschlag — dann wird gefragt, nicht geraten.
// Geprüft mit scripts/test-projekt-aus-lage.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { geometryCentroid, haversineMeters, geomMeasures } from './geo.js'
import { outerRing, pointInPolygon } from './shapeMeta.js'

export const MAX_ABSTAND_M = 250

/**
 * @param {object} geometry  GeoJSON des neuen Objekts
 * @param {object[]} features  map_features (für Projektflächen)
 * @param {object[]} projects  Projekte mit lat/lng
 * @returns {{ projectId: string, grund: 'flaeche'|'naehe', abstandM?: number } | null}
 */
export function projektAusLage(geometry, features = [], projects = [], { maxAbstandM = MAX_ABSTAND_M } = {}) {
  const c = geometry?.type === 'Point'
    ? { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }
    : geometryCentroid(geometry)
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return null

  const treffer = features
    .filter(f => f.feature_type === 'area' && f.project_id)
    .map(f => ({ f, ring: outerRing(f.geometry) }))
    .filter(({ ring }) => ring && pointInPolygon([c.lng, c.lat], ring))
    .map(({ f }) => ({ projectId: f.project_id, flaeche: geomMeasures(f.geometry)?.area_m2 ?? Infinity }))
    .sort((a, b) => a.flaeche - b.flaeche)
  if (treffer.length) return { projectId: treffer[0].projectId, grund: 'flaeche' }

  let best = null
  for (const p of projects) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
    const d = haversineMeters({ lat: c.lat, lng: c.lng }, { lat: p.lat, lng: p.lng })
    if (d <= maxAbstandM && (!best || d < best.abstandM)) best = { projectId: p.id, grund: 'naehe', abstandM: Math.round(d) }
  }
  return best
}
