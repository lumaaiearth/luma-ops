// Sonnenstunden-Analyse: Sonnenstand (SunCalc/NOAA) + Schattenwurf umliegender
// Gebäude (OSM-Grundrisse + Höhen). Berechnet direkte Sonnenstunden für die
// vier Jahreszeiten-Stichtage und leitet die Licht-Klasse für Florales™ ab
// (1 = vollsonnig, 2 = halbschattig, 3 = schattig).
//
// Methode: Für jeden 10-Minuten-Schritt zwischen Auf- und Untergang wird ein
// Strahl vom Punkt Richtung Sonne gegen alle Gebäudekanten geschnitten;
// verdeckt ein Gebäude mit Höhe h in Distanz d die Sonne (atan(h/d) > Sonnen-
// höhe), zählt der Schritt als beschattet. Vegetation ist NICHT enthalten —
// große Bäume vor Ort also gedanklich dazurechnen.

// suncalc ist CommonJS ohne Default-Export → Namespace-Import
import * as suncalcNs from 'suncalc'
const SunCalc = suncalcNs.default || suncalcNs

const OBSERVER_H = 0.5      // Beet-/Pflanzhöhe über Boden (m)
const MAX_DIST = 220        // Gebäude weiter weg werfen praktisch keinen Schatten mehr
const STEP_MIN = 10

export const SEASONS = [
  { key: 'fruehling', label: 'Frühling', emoji: '🌱', month: 2, day: 21 },
  { key: 'sommer',    label: 'Sommer',   emoji: '☀️', month: 5, day: 21 },
  { key: 'herbst',    label: 'Herbst',   emoji: '🍂', month: 8, day: 23 },
  { key: 'winter',    label: 'Winter',   emoji: '❄️', month: 11, day: 21 },
]

export const LICHT_KLASSEN = {
  1: { label: 'Vollsonnig', color: '#f59e0b', hint: '≥ 6 h Sommersonne — trockenheitsverträgliche, magere Auswahl fahren' },
  2: { label: 'Halbschattig', color: '#a3e635', hint: '3–6 h Sommersonne — breiteste Pflanzenauswahl' },
  3: { label: 'Schattig', color: '#60a5fa', hint: '< 3 h Sommersonne — Schattenstauden, Waldrand-Charakter' },
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
  const t = (a[0] * ey - a[1] * ex) / den          // Distanz entlang des Strahls
  const u = (a[0] * dy - a[1] * dx) / den          // Position auf der Strecke
  return t > 0.01 && u >= 0 && u <= 1 ? t : null
}

// Gebäude für einen Punkt vorbereiten (lokale Koordinaten, Filter auf MAX_DIST)
function prepare(lat, lng, buildings) {
  const proj = toLocal(lat, lng)
  const prepped = []
  let onBuilding = false
  for (const b of buildings) {
    const ring = b.ring.map(proj)
    if (pointInRing([0, 0], ring)) { onBuilding = true; continue } // Punkt liegt im Grundriss → nicht als Verschatter werten
    const near = ring.some(([x, y]) => Math.hypot(x, y) < MAX_DIST + 50)
    if (!near) continue
    prepped.push({ ring, h: b.height })
  }
  return { prepped, onBuilding }
}

// Ist die Sonne (Höhe alt, Peilung bearing ab Nord) von Gebäuden verdeckt?
function isShaded(prepped, bearing, altitude) {
  const dx = Math.sin(bearing), dy = Math.cos(bearing)
  const tanAlt = Math.tan(altitude)
  for (const b of prepped) {
    const relevant = (b.h - OBSERVER_H) / tanAlt   // bis zu dieser Distanz verschattet Höhe h
    if (relevant <= 0) continue
    for (let i = 0; i < b.ring.length; i++) {
      const t = raySegment(dx, dy, b.ring[i], b.ring[(i + 1) % b.ring.length])
      if (t !== null && t < Math.min(relevant, MAX_DIST)) return true
    }
  }
  return false
}

// Direkte Sonnenstunden an einem Datum (Schrittweite 10 min)
export function sunHoursForDate(lat, lng, prepped, date) {
  const times = SunCalc.getTimes(date, lat, lng)
  const from = times.sunrise?.getTime(), to = times.sunset?.getTime()
  if (!from || !to || !(to > from)) return { sun: 0, possible: 0 }
  let sun = 0, possible = 0
  for (let ts = from; ts <= to; ts += STEP_MIN * 60_000) {
    const pos = SunCalc.getPosition(new Date(ts), lat, lng)
    if (pos.altitude <= 0.005) continue
    possible++
    // SunCalc-Azimut: 0 = Süd, +West → Peilung ab Nord = az + π
    if (!isShaded(prepped, pos.azimuth + Math.PI, pos.altitude)) sun++
  }
  const f = STEP_MIN / 60
  return { sun: Math.round(sun * f * 10) / 10, possible: Math.round(possible * f * 10) / 10 }
}

// Komplette Analyse: 4 Stichtage + Licht-Klasse (Florales: 1/2/3)
export function analyzeSun(lat, lng, buildings) {
  const { prepped, onBuilding } = prepare(lat, lng, buildings)
  const year = new Date().getFullYear()
  const seasons = {}
  for (const s of SEASONS) {
    seasons[s.key] = sunHoursForDate(lat, lng, prepped, new Date(year, s.month, s.day, 12))
  }
  const sommer = seasons.sommer.sun
  const licht = sommer >= 6 ? 1 : sommer >= 3 ? 2 : 3
  return {
    seasons,
    licht,
    on_building: onBuilding,
    buildings_n: prepped.length,
    computed_at: new Date().toISOString(),
  }
}
