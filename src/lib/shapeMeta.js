// Shape-Metadaten für Florales — leitet aus einem BIOME-Polygon (GeoJSON,
// lng/lat) die planungsrelevanten Kennzahlen ab und projiziert die Form in
// lokale Meter-Koordinaten für die Beet-Rasterung. Alles lokal, ohne API.

const R = 6371000 // Erdradius m

// Äußeren Ring aus einer GeoJSON-Geometry holen ([[lng,lat], …]).
export function outerRing(geometry) {
  if (!geometry) return null
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0] || null
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.[0]?.[0] || null
  return null
}

// Flächen-Schwerpunkt (lng/lat) über die Polygon-Zentroid-Formel.
export function centroidLngLat(ring) {
  if (!ring || ring.length < 3) return null
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1]
    const f = x0 * y1 - x1 * y0
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
  }
  if (Math.abs(a) < 1e-12) { // entartet → Mittel der Punkte
    const n = ring.length
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]
  }
  a *= 0.5
  return [cx / (6 * a), cy / (6 * a)]
}

function haversine(a, b) {
  const [lng1, lat1] = a, [lng2, lat2] = b
  const dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const la1 = lat1 * Math.PI / 180, la2 = lat2 * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Umfang in Metern.
export function perimeterM(ring) {
  if (!ring || ring.length < 2) return 0
  let p = 0
  for (let i = 0; i < ring.length - 1; i++) p += haversine(ring[i], ring[i + 1])
  return p
}

// Fläche in m² (äquirektangulär projiziert, Shoelace).
export function areaM2(ring) {
  const loc = toLocalMeters(ring)
  if (!loc) return 0
  const pts = loc.points
  let a = 0
  for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
  return Math.abs(a) / 2
}

// Polygon (lng/lat) → lokale Meter-Koordinaten, Ursprung an der Bounding-Box-
// Ecke. Rückgabe: { points:[[x,y]…], w, h } (x,y in Metern, 0..w / 0..h).
export function toLocalMeters(ring) {
  if (!ring || ring.length < 3) return null
  const c = centroidLngLat(ring)
  const lat0 = c[1] * Math.PI / 180
  const mPerLng = R * Math.cos(lat0) * Math.PI / 180
  const mPerLat = R * Math.PI / 180
  const raw = ring.map(([lng, lat]) => [lng * mPerLng, lat * mPerLat])
  const xs = raw.map(p => p[0]), ys = raw.map(p => p[1])
  const minx = Math.min(...xs), miny = Math.min(...ys)
  const points = raw.map(([x, y]) => [x - minx, y - miny])
  return { points, w: Math.max(...xs) - minx, h: Math.max(...ys) - miny }
}

// Point-in-Polygon (Ray-Casting), ring = [[x,y]…] in beliebigen Koordinaten.
export function pointInPolygon(pt, ring) {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}

// Komplettes Meta-Paket aus einer GeoJSON-Geometry.
export function shapeMetaFromGeometry(geometry) {
  const ring = outerRing(geometry)
  if (!ring) return null
  const c = centroidLngLat(ring)
  const local = toLocalMeters(ring)
  return {
    ring,
    centroid: c ? { lng: c[0], lat: c[1] } : null,
    perimeter_m: Math.round(perimeterM(ring) * 10) / 10,
    area_m2: Math.round(areaM2(ring) * 10) / 10,
    local,               // { points (Meter), w, h }
    bbox_w_m: local ? Math.round(local.w * 100) / 100 : 0,
    bbox_h_m: local ? Math.round(local.h * 100) / 100 : 0,
  }
}
