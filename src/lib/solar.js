// Sonnenstunden-Analyse: Sonnenstand (SunCalc/NOAA) + Schattenwurf durch
// Gebäude (ALKIS/OSM-Grundrisse + Höhen) und Bäume (Berliner Baumkataster:
// Kronendurchmesser + Baumhöhe, als Zylinder modelliert). Berechnet für die
// vier Jahreszeiten-Stichtage:
//  · direkte Sonnenstunden (Bäume saisonal durchlässig — Laub-Faktor)
//  · Klarhimmel-Strahlung in kWh/m² (Meinel-Modell, horizontale Fläche)
// und leitet die Licht-Klasse für Florales™ ab (1 vollsonnig / 2 halbschattig /
// 3 schattig).

// suncalc ist CommonJS ohne Default-Export → Namespace-Import
import * as suncalcNs from 'suncalc'
const SunCalc = suncalcNs.default || suncalcNs

const OBSERVER_H = 0.5      // Beet-/Pflanzhöhe über Boden (m)
const MAX_DIST = 220        // Verschatter weiter weg sind praktisch irrelevant
const STEP_MIN = 10
const SOLAR_CONST = 1361    // W/m²

// treeTransparency: Anteil Licht durch die Krone am Stichtag (Laub-Zustand)
export const SEASONS = [
  { key: 'fruehling', label: 'Frühling', emoji: '🌱', month: 2, day: 21, treeTransparency: 0.55 },
  { key: 'sommer',    label: 'Sommer',   emoji: '☀️', month: 5, day: 21, treeTransparency: 0.0 },
  { key: 'herbst',    label: 'Herbst',   emoji: '🍂', month: 8, day: 23, treeTransparency: 0.15 },
  { key: 'winter',    label: 'Winter',   emoji: '❄️', month: 11, day: 21, treeTransparency: 0.6 },
]

export const LICHT_KLASSEN = {
  1: { label: 'Vollsonnig', color: '#f59e0b', hint: '≥ 6 h Sommersonne — trockenheitsverträgliche, magere Auswahl fahren' },
  2: { label: 'Halbschattig', color: '#a3e635', hint: '3–6 h Sommersonne — breiteste Pflanzenauswahl' },
  3: { label: 'Schattig', color: '#60a5fa', hint: '< 3 h Sommersonne — Schattenstauden, Waldrand-Charakter' },
}

// Kronenansatz eines Katasterbaums — EINE Quelle der Wahrheit für Analyse,
// 3D-Ansicht (Sun3DView) und Heatmap-Generator (scripts/solar-heatmap.mjs),
// sonst widersprechen sich die drei Darstellungen am selben Punkt.
export function crownBase(t) {
  return Math.max(1.5, (t.height || 12) * (t.nadel ? 0.22 : 0.38))
}

// Lokales Meter-Koordinatensystem um den Beobachtungspunkt
function toLocal(lat0, lng0) {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180)
  const ky = 111320
  return ([lng, lat]) => [(lng - lng0) * kx, (lat - lat0) * ky]
}

function pointInRing(pt, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Strahl (Ursprung 0/0, Richtung dx/dy) ∩ Strecke a→b: Distanz t oder null
function raySegment(dx, dy, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1]
  const den = dx * ey - dy * ex
  if (Math.abs(den) < 1e-12) return null
  const t = (a[0] * ey - a[1] * ex) / den
  const u = (a[0] * dy - a[1] * dx) / den
  return t > 0.01 && u >= 0 && u <= 1 ? t : null
}

// Verschatter für einen Punkt vorbereiten (lokale Meter-Koordinaten)
export function prepareShaders(lat, lng, buildings = [], trees = []) {
  const proj = toLocal(lat, lng)
  const preppedB = []
  let onBuilding = false
  for (const b of buildings) {
    const ring = b.ring.map(proj)
    if (pointInRing([0, 0], ring)) { onBuilding = true; continue }
    if (!ring.some(([x, y]) => Math.hypot(x, y) < MAX_DIST + 50)) continue
    preppedB.push({ ring, h: b.height })
  }
  const preppedT = []
  for (const t of trees) {
    const [x, y] = proj([t.lng, t.lat])
    const d = Math.hypot(x, y)
    if (d > MAX_DIST + 20) continue
    const r = Math.max(t.crown / 2, 1.2)
    // Bäume, unter deren Krone der Punkt liegt, verschatten ihn AM STÄRKSTEN —
    // sie dürfen nicht übersprungen werden (sonst gilt ein Beet unter einer
    // Linde als „vollsonnig").
    preppedT.push({ x, y, r, top: t.height, base: crownBase(t) })
  }
  return { buildings: preppedB, trees: preppedT, onBuilding }
}

/* ── LoD2-Mesh: echte Dach-/Wandflächen als Verschatter ───────────────────
   Patch-Format siehe scripts/lod2-patch.mjs — Flächen in [lng, lat, z_rel],
   z relativ zum Bodenniveau des jeweiligen Gebäudes (Berlin ≈ eben). */
function planeOf(pts) {
  // Newell-Normale (robust für leicht unebene Polygone)
  let nx = 0, ny = 0, nz = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1, z1] = pts[i], [x2, y2, z2] = pts[(i + 1) % pts.length]
    nx += (y1 - y2) * (z1 + z2)
    ny += (z1 - z2) * (x1 + x2)
    nz += (x1 - x2) * (y1 + y2)
  }
  const len = Math.hypot(nx, ny, nz)
  if (len < 1e-9) return null
  nx /= len; ny /= len; nz /= len
  const [x0, y0, z0] = pts[0]
  return { nx, ny, nz, pd: -(nx * x0 + ny * y0 + nz * z0) }
}

// Punkt-in-Polygon in der dominanten Projektionsebene der Flächennormale
function pipOnPlane(p, pts, plane) {
  const ax = Math.abs(plane.nx), ay = Math.abs(plane.ny), az = Math.abs(plane.nz)
  const [i, j] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [0, 2]
  let inside = false
  for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
    const pa = pts[a], pb = pts[b]
    if ((pa[j] > p[j]) !== (pb[j] > p[j]) && p[i] < ((pb[i] - pa[i]) * (p[j] - pa[j])) / (pb[j] - pa[j]) + pa[i]) inside = !inside
  }
  return inside
}

export function prepareLod2(lat, lng, patch) {
  const proj = toLocal(lat, lng)
  const faces = []
  let onBuilding = false
  for (const b of patch.buildings || []) {
    const localFaces = []
    let contains = false
    for (const f of b.faces) {
      const pts = f.pts.map(([lo, la, z]) => { const [x, y] = proj([lo, la]); return [x, y, z] })
      if (f.t === 'g') {
        // Steht der Beobachtungspunkt im Gebäudegrundriss? → Gebäude ausnehmen
        if (!contains && pointInRing([0, 0], pts.map(([x, y]) => [x, y]))) contains = true
        continue // Bodenflächen verschatten nicht
      }
      let minD = Infinity, maxZ = -Infinity
      for (const [x, y, z] of pts) { const d = Math.hypot(x, y); if (d < minD) minD = d; if (z > maxZ) maxZ = z }
      if (minD > MAX_DIST + 30 || maxZ <= OBSERVER_H) continue
      const plane = planeOf(pts)
      if (plane) localFaces.push({ pts, plane })
    }
    if (contains) { onBuilding = true; continue }
    faces.push(...localFaces)
  }
  return { faces, onBuilding }
}

// 3D-Strahl (Beobachter → Sonne) gegen die Mesh-Flächen
function meshShaded(faces, bearing, altitude) {
  const cosA = Math.cos(altitude)
  const dx = Math.sin(bearing) * cosA, dy = Math.cos(bearing) * cosA, dz = Math.sin(altitude)
  const oz = OBSERVER_H
  const tMax = (MAX_DIST + 30) / Math.max(cosA, 0.05)
  for (const f of faces) {
    const { nx, ny, nz, pd } = f.plane
    const den = nx * dx + ny * dy + nz * dz
    if (Math.abs(den) < 1e-9) continue
    const t = -(nz * oz + pd) / den
    if (t < 0.01 || t > tMax) continue
    const p = [t * dx, t * dy, oz + t * dz]
    if (pipOnPlane(p, f.pts, f.plane)) return true
  }
  return false
}

// Was verdeckt die Sonne? → null | 'building' | 'tree'
function shadeType(prep, bearing, altitude) {
  const dx = Math.sin(bearing), dy = Math.cos(bearing)
  const tanAlt = Math.tan(altitude)
  if (prep.meshFaces) {
    if (meshShaded(prep.meshFaces, bearing, altitude)) return 'building'
  } else for (const b of prep.buildings) {
    const relevant = (b.h - OBSERVER_H) / tanAlt
    if (relevant <= 0) continue
    for (let i = 0; i < b.ring.length; i++) {
      const t = raySegment(dx, dy, b.ring[i], b.ring[(i + 1) % b.ring.length])
      if (t !== null && t < Math.min(relevant, MAX_DIST)) return 'building'
    }
  }
  // Bäume: Strahl ∩ Kronenzylinder (Kreis in der Ebene + Höhenfenster).
  // Kein Vorab-Abbruch bei proj <= 0: steht der Punkt IN der Krone, liegt der
  // Fußpunkt hinter dem Beobachter, der Strahl schneidet sie trotzdem.
  for (const tr of prep.trees) {
    const proj = tr.x * dx + tr.y * dy            // Fußpunkt entlang des Strahls
    const lat2 = (tr.x - proj * dx) ** 2 + (tr.y - proj * dy) ** 2
    const r2 = tr.r * tr.r
    if (lat2 > r2) continue
    const half = Math.sqrt(r2 - lat2)
    if (proj + half <= 0.01) continue             // Krone liegt komplett hinter dem Beobachter
    const t1 = Math.max(proj - half, 0.01), t2 = Math.min(proj + half, MAX_DIST)
    if (t2 <= t1) continue
    const z1 = t1 * tanAlt + OBSERVER_H, z2 = t2 * tanAlt + OBSERVER_H
    if (z1 <= tr.top && z2 >= tr.base) return 'tree'
  }
  return null
}

// Klarhimmel-Direktstrahlung auf die Horizontale (Meinel): W/m²
function clearSkyW(altitude) {
  const sinA = Math.sin(altitude)
  if (sinA <= 0.02) return 0
  const am = Math.min(1 / sinA, 38)
  return SOLAR_CONST * Math.pow(0.7, Math.pow(am, 0.678)) * sinA
}

// Ein Stichtag: Sonnenstunden + kWh/m² (Bäume mit Laub-Durchlässigkeit)
export function sunHoursForDate(lat, lng, prep, date, treeTransparency = 0) {
  const times = SunCalc.getTimes(date, lat, lng)
  const from = times.sunrise?.getTime(), to = times.sunset?.getTime()
  if (!from || !to || !(to > from)) return { sun: 0, possible: 0, kwh: 0, kwh_possible: 0 }
  let sun = 0, possible = 0, wh = 0, whPossible = 0
  for (let ts = from; ts <= to; ts += STEP_MIN * 60_000) {
    const pos = SunCalc.getPosition(new Date(ts), lat, lng)
    if (pos.altitude <= 0.005) continue
    const w = clearSkyW(pos.altitude)
    possible++
    whPossible += w
    const type = shadeType(prep, pos.azimuth + Math.PI, pos.altitude)
    if (type === null) { sun += 1; wh += w }
    else if (type === 'tree') { sun += treeTransparency; wh += w * treeTransparency }
  }
  const f = STEP_MIN / 60
  const r1 = v => Math.round(v * 10) / 10
  const r2 = v => Math.round(v * 100) / 100
  return { sun: r1(sun * f), possible: r1(possible * f), kwh: r2(wh * f / 1000), kwh_possible: r2(whPossible * f / 1000) }
}

// Komplette Analyse: 4 Stichtage + Licht-Klasse (Florales: 1/2/3).
// Mit meta.lod2Patch rechnet die Verschattung gegen die echten LoD2-Dach-/
// Wandflächen statt gegen Höhen-Prismen (buildings wird dann ignoriert).
export function analyzeSun(lat, lng, buildings, trees = [], meta = {}) {
  const prep = prepareShaders(lat, lng, meta.lod2Patch ? [] : buildings, trees)
  let buildingsN = prep.buildings.length
  if (meta.lod2Patch) {
    const mesh = prepareLod2(lat, lng, meta.lod2Patch)
    prep.meshFaces = mesh.faces
    prep.onBuilding = prep.onBuilding || mesh.onBuilding
    buildingsN = (meta.lod2Patch.buildings || []).length
  }
  const year = new Date().getFullYear()
  const seasons = {}
  for (const s of SEASONS) {
    seasons[s.key] = sunHoursForDate(lat, lng, prep, new Date(year, s.month, s.day, 12), s.treeTransparency)
  }
  const sommer = seasons.sommer.sun
  const licht = sommer >= 6 ? 1 : sommer >= 3 ? 2 : 3
  return {
    seasons,
    licht,
    on_building: prep.onBuilding,
    buildings_n: buildingsN,
    faces_n: prep.meshFaces ? prep.meshFaces.length : undefined,
    trees_n: prep.trees.length,
    source: meta.lod2Patch ? 'lod2' : (meta.source || 'osm'),
    computed_at: new Date().toISOString(),
  }
}
