#!/usr/bin/env node
// Lädt die amtlichen Berliner Verwaltungsgrenzen (Bezirke + Ortsteile) als
// vereinfachtes GeoJSON nach public/geo/ — Grundlage für die Scope-Auswahl
// im Kundenportal („mein Gebiet: Pankow" bzw. „Ortsteil Blankenburg").
//   node scripts/berlin-gebiete.mjs
// Quelle: GDI Berlin / ALKIS, Lizenz dl-de/by-2-0

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'geo')
const CRS = 'urn:ogc:def:crs:EPSG::4326'

// Douglas-Peucker auf Lon/Lat (Toleranz in Grad ≈ 11 m bei 1e-4)
function simplify(pts, tol) {
  if (pts.length < 3) return pts
  let maxD = 0, idx = 0
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]]
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)]
}

const round = pts => pts.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)])

function simplifyGeom(geom, tol) {
  const ring = r => {
    const s = round(simplify(r, tol))
    if (s.length < 4) return null
    const [f, l] = [s[0], s[s.length - 1]]
    if (f[0] !== l[0] || f[1] !== l[1]) s.push(f)
    return s
  }
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates.map(ring).filter(Boolean)
    return rings.length ? { type: 'Polygon', coordinates: rings } : null
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates.map(p => p.map(ring).filter(Boolean)).filter(p => p.length)
    return polys.length ? { type: 'MultiPolygon', coordinates: polys } : null
  }
  return null
}

function bboxOf(geom) {
  let s = 90, w = 180, n = -90, e = -180
  const walk = c => Array.isArray(c[0]) ? c.forEach(walk) : (
    w = Math.min(w, c[0]), e = Math.max(e, c[0]), s = Math.min(s, c[1]), n = Math.max(n, c[1])
  )
  walk(geom.coordinates)
  return [+s.toFixed(5), +w.toFixed(5), +n.toFixed(5), +e.toFixed(5)]
}

async function load(service, typename, nameKeys, tol) {
  const url = `https://gdi.berlin.de/services/wfs/${service}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${typename}&SRSNAME=${CRS}&outputFormat=application/json&COUNT=500`
  const json = await (await fetch(url)).json()
  const out = []
  for (const f of json.features || []) {
    const p = f.properties || {}
    const name = nameKeys.map(k => p[k]).find(v => v) || 'Unbenannt'
    const geom = simplifyGeom(f.geometry, tol)
    if (!geom) continue
    out.push({
      type: 'Feature',
      properties: { name, bezirk: p.bezirk || p.bez_name || null, bbox: bboxOf(geom) },
      geometry: geom,
    })
  }
  out.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'de'))
  return { type: 'FeatureCollection', features: out }
}

mkdirSync(OUT, { recursive: true })
for (const [file, service, typename, keys, tol] of [
  ['bezirke.json', 'alkis_bezirke', 'alkis_bezirke:bezirksgrenzen', ['namgem', 'nam', 'name', 'bezname', 'bezirk'], 0.0006],
  ['ortsteile.json', 'alkis_ortsteile', 'alkis_ortsteile:ortsteile', ['nam', 'namgem', 'name', 'ortsteil'], 0.0004],
]) {
  const fc = await load(service, typename, keys, tol)
  writeFileSync(join(OUT, file), JSON.stringify(fc))
  const kb = Math.round(JSON.stringify(fc).length / 1024)
  console.log(`  ${file}: ${fc.features.length} Gebiete, ${kb} KB — z.B. ${fc.features.slice(0, 3).map(f => f.properties.name).join(', ')}`)
}
console.log('fertig.')
