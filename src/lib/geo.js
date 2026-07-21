// Geodätische Helfer für GeoJSON-Geometrien — ohne Leaflet-Abhängigkeit,
// damit auch Panels/Seiten außerhalb der Karte messen können.

const R = 6371000
const toRad = d => d * Math.PI / 180

export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Fläche eines Rings aus {lat,lng}-Punkten (sphärischer Exzess, wie in MapPage)
function ringArea(pts) {
  const n = pts.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lat1 = toRad(pts[i].lat)
    const lat2 = toRad(pts[j].lat)
    const dLng = toRad(pts[j].lng - pts[i].lng)
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  return Math.abs(area * R * R / 2)
}

function pathLength(pts, close = false) {
  let d = 0
  for (let i = 0; i < pts.length - 1; i++) d += haversineMeters(pts[i], pts[i + 1])
  if (close && pts.length > 2) d += haversineMeters(pts[pts.length - 1], pts[0])
  return d
}

const ll = ([lng, lat]) => ({ lat, lng })

// Misst eine GeoJSON-Geometrie: Fläche/Umfang (Polygon), Länge (Linie), Position (Punkt)
export function geomMeasures(geometry) {
  if (!geometry) return null
  try {
    switch (geometry.type) {
      case 'Point': {
        const c = ll(geometry.coordinates)
        return { centroid: c }
      }
      case 'LineString': {
        const pts = geometry.coordinates.map(ll)
        return { length_m: pathLength(pts), centroid: centroidOf(pts) }
      }
      case 'MultiLineString': {
        const parts = geometry.coordinates.map(cs => cs.map(ll))
        return { length_m: parts.reduce((s, p) => s + pathLength(p), 0), centroid: centroidOf(parts.flat()) }
      }
      case 'Polygon': {
        const outer = geometry.coordinates[0].map(ll)
        return { area_m2: ringArea(outer), perimeter_m: pathLength(outer, true), centroid: centroidOf(outer) }
      }
      case 'MultiPolygon': {
        const rings = geometry.coordinates.map(poly => poly[0].map(ll))
        return {
          area_m2: rings.reduce((s, r) => s + ringArea(r), 0),
          perimeter_m: rings.reduce((s, r) => s + pathLength(r, true), 0),
          centroid: centroidOf(rings.flat()),
        }
      }
      default: return null
    }
  } catch { return null }
}

export function centroidOf(pts) {
  if (!pts?.length) return null
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
  return { lat, lng }
}

// Schwerpunkt einer beliebigen GeoJSON-Geometrie (für „Projekt-Pin nachziehen")
export function geometryCentroid(geometry) {
  return geomMeasures(geometry)?.centroid || null
}

export function fmtArea(m2) { return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²` }
export function fmtLen(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m` }
export function fmtLatLng(c) { return c ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : '—' }
