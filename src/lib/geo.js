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
        const rings = geometry.coordinates.map(r => r.map(ll))
        const outer = rings[0]
        // Innenringe (Löcher) von Fläche abziehen und im Umfang mitzählen
        const holes = rings.slice(1)
        const area = ringArea(outer) - holes.reduce((s, h) => s + ringArea(h), 0)
        const perim = pathLength(outer, true) + holes.reduce((s, h) => s + pathLength(h, true), 0)
        return { area_m2: Math.max(area, 0), perimeter_m: perim, centroid: polygonCentroid(outer) }
      }
      case 'MultiPolygon': {
        const parts = geometry.coordinates.map(poly => poly.map(r => r.map(ll)))
        let area = 0, perim = 0, best = null, bestA = -1
        for (const rings of parts) {
          const outer = rings[0]
          const holes = rings.slice(1)
          const a = ringArea(outer) - holes.reduce((s, h) => s + ringArea(h), 0)
          area += Math.max(a, 0)
          perim += pathLength(outer, true) + holes.reduce((s, h) => s + pathLength(h, true), 0)
          if (a > bestA) { bestA = a; best = polygonCentroid(outer) }  // Anker = größtes Teilstück
        }
        return { area_m2: area, perimeter_m: perim, centroid: best }
      }
      default: return null
    }
  } catch { return null }
}

// Mittel der Stützpunkte — nur für Linien/Punktmengen sinnvoll
export function centroidOf(pts) {
  if (!pts?.length) return null
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
  return { lat, lng }
}

// Echter Flächenschwerpunkt eines Rings (gewichtet nach Fläche). Das Mittel der
// Eckpunkte liegt bei ungleichmäßiger Stützpunktdichte deutlich daneben — und
// genau dieser Punkt ist der Anker für Sonnen- und Starkregen-Analyse.
function polygonCentroid(pts) {
  if (!pts || pts.length < 3) return centroidOf(pts)
  const lat0 = pts[0].lat
  const kx = Math.cos(lat0 * Math.PI / 180)
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % pts.length]
    const x1 = p1.lng * kx, y1 = p1.lat
    const x2 = p2.lng * kx, y2 = p2.lat
    const f = x1 * y2 - x2 * y1
    a += f
    cx += (x1 + x2) * f
    cy += (y1 + y2) * f
  }
  if (Math.abs(a) < 1e-12) return centroidOf(pts)   // entartetes Polygon
  a *= 0.5
  return { lat: cy / (6 * a), lng: cx / (6 * a) / kx }
}

// Schwerpunkt einer beliebigen GeoJSON-Geometrie (für „Projekt-Pin nachziehen")
export function geometryCentroid(geometry) {
  return geomMeasures(geometry)?.centroid || null
}

export function fmtArea(m2) { return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²` }
export function fmtLen(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m` }
export function fmtLatLng(c) { return c ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : '—' }
