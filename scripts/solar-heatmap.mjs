#!/usr/bin/env node
// Solar-Heatmap-Generator: rechnet für ein LoD2-Patch-Gebiet die direkten
// Sommer-Sonnenstunden (21.6.) auf einem 4-m-Raster und schreibt sie als
// PNG-Overlay nach public/lod2/<name>-sonne.png (+ Bounds im Index).
//
//   node scripts/solar-heatmap.mjs --name r95            (ein Gebiet, alle Jahreszeiten)
//   node scripts/solar-heatmap.mjs --all                 (alle Patches, alle Jahreszeiten)
//   … --season sommer                                    (nur ein Stichtag)
//
// Verfahren: Schatten-Mapping — pro 10-Minuten-Sonnenstand werden alle
// LoD2-Dach-/Wandflächen und Baumkronen (Baumkataster) entlang der Sonnen-
// richtung auf den Boden projiziert und ins Raster gestempelt. Sonnenstunden
// je Zelle = unbeschattete Schritte × 10 min. Läuft in Sekunden statt Stunden,
// weil pro Zeitschritt Polygone gerastert werden statt pro Zelle Strahlen.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import * as suncalcNs from 'suncalc'
const SunCalc = suncalcNs.default || suncalcNs

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'lod2')
const CELL = 4          // Rasterzelle (m)
const STEP_MIN = 10
const OBSERVER_H = 0.5

// Stichtage + Laub-Durchlässigkeit der Baumkronen (wie src/lib/solar.js)
const SEASONS = [
  { key: 'fruehling', month: 2, day: 21, treeTransparency: 0.55 },
  { key: 'sommer', month: 5, day: 21, treeTransparency: 0.0 },
  { key: 'herbst', month: 8, day: 23, treeTransparency: 0.15 },
  { key: 'winter', month: 11, day: 21, treeTransparency: 0.6 },
]

const args = {}
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a === '--all') args.all = true
  else if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1]; i++ }
}

/* ── Bäume (Baumkataster, wie in der App) ── */
async function fetchTrees(south, west, north, east) {
  const CRS = 'urn:ogc:def:crs:EPSG::4326'
  const layers = ['strassenbaeume', 'anlagenbaeume']
  const all = []
  for (const layer of layers) {
    const url = `https://gdi.berlin.de/services/wfs/baumbestand?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=baumbestand:${layer}&BBOX=${south},${west},${north},${east},${CRS}&SRSNAME=${CRS}&outputFormat=application/json&COUNT=5000`
    const json = await (await fetch(url)).json()
    for (const f of json.features || []) {
      const p = f.properties || {}
      const [lng, lat] = f.geometry?.coordinates || []
      if (lat == null) continue
      const height = parseFloat(p.baumhoehe) > 0 ? Math.min(parseFloat(p.baumhoehe), 45) : 12
      const crown = parseFloat(p.kronedurch) > 0 ? Math.min(parseFloat(p.kronedurch), 30) : 6
      const nadel = /nadel/i.test(p.art_gruppe || '')
      all.push({ lat, lng, height, crown, nadel })
    }
  }
  return all
}

/* ── Polygon-Rasterung (Scanline, markiert Zellen im Shade-Puffer) ── */
function stampPolygon(buf, W, H, originX, originY, pts, value) {
  // pts: [[x,y],…] in Metern relativ Rastermitte; Zellenindex = (x-originX)/CELL
  let minY = Infinity, maxY = -Infinity
  for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y }
  const j0 = Math.max(0, Math.floor((minY - originY) / CELL))
  const j1 = Math.min(H - 1, Math.ceil((maxY - originY) / CELL))
  for (let j = j0; j <= j1; j++) {
    const y = originY + (j + 0.5) * CELL
    // Schnittpunkte der Scanline mit den Kanten
    const xs = []
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [xa, ya] = pts[a], [xb, yb] = pts[b]
      if ((ya > y) !== (yb > y)) xs.push(xa + ((y - ya) / (yb - ya)) * (xb - xa))
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.round((xs[k] - originX) / CELL - 0.5))
      const i1 = Math.min(W - 1, Math.round((xs[k + 1] - originX) / CELL - 0.5))
      for (let i = i0; i <= i1; i++) buf[j * W + i] |= value
    }
  }
}

function stampCircle(buf, W, H, originX, originY, cx, cy, r, value) {
  const j0 = Math.max(0, Math.floor((cy - r - originY) / CELL))
  const j1 = Math.min(H - 1, Math.ceil((cy + r - originY) / CELL))
  for (let j = j0; j <= j1; j++) {
    const y = originY + (j + 0.5) * CELL
    const dy = y - cy
    if (Math.abs(dy) > r) continue
    const half = Math.sqrt(r * r - dy * dy)
    const i0 = Math.max(0, Math.round((cx - half - originX) / CELL - 0.5))
    const i1 = Math.min(W - 1, Math.round((cx + half - originX) / CELL - 0.5))
    for (let i = i0; i <= i1; i++) buf[j * W + i] |= value
  }
}

/* ── Minimaler PNG-Writer (RGBA, Filter 0) ── */
function writePng(path, W, H, rgba) {
  const chunks = []
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crcTable = writePng._t || (writePng._t = (() => {
      const t = new Uint32Array(256)
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
      return t
    })())
    let crc = 0xffffffff
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
    chunks.push(len, body, crcBuf)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 6; // 8 bit, RGBA
  chunk('IHDR', ihdr)
  const raw = Buffer.alloc(H * (W * 4 + 1))
  for (let j = 0; j < H; j++) rgba.copy(raw, j * (W * 4 + 1) + 1, j * W * 4, (j + 1) * W * 4)
  chunk('IDAT', deflateSync(raw, { level: 9 }))
  chunk('IEND', Buffer.alloc(0))
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]))
}

/* ── Farbskala: 0 h dunkelblau → max leuchtgelb ── */
function colorFor(hours, maxH) {
  const t = Math.max(0, Math.min(1, hours / maxH))
  const stops = [
    [0.0, [23, 42, 84]], [0.25, [43, 92, 138]], [0.45, [56, 140, 118]],
    [0.65, [124, 179, 66]], [0.82, [222, 200, 49]], [1.0, [255, 236, 120]],
  ]
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i]
      const f = (t - t0) / (t1 - t0)
      return c0.map((c, k) => Math.round(c + (c1[k] - c) * f))
    }
  }
  return stops[stops.length - 1][1]
}

/* ── Ein Patch rechnen ── */
async function heatmapFor(name) {
  const patch = JSON.parse(readFileSync(join(OUT_DIR, `${name}.json`), 'utf-8'))
  const { lat: clat, lng: clng } = patch.center
  const R = (patch.radius || 350) - 10
  const kx = 111320 * Math.cos(clat * Math.PI / 180), ky = 111320
  const toXY = (lo, la) => [(lo - clng) * kx, (la - clat) * ky]

  // Flächen + Gebäudegrundrisse in lokale Meter
  const faces = [], grounds = []
  for (const b of patch.buildings) for (const f of b.faces) {
    const pts = f.pts.map(([lo, la, z]) => { const [x, y] = toXY(lo, la); return [x, y, z] })
    if (f.t === 'g') grounds.push(pts)
    else faces.push(pts)
  }
  const dLat = (R + 60) / ky, dLng = (R + 60) / kx
  const trees = (await fetchTrees(clat - dLat, clng - dLng, clat + dLat, clng + dLng))
    // Kronenansatz identisch zu src/lib/solar.js crownBase()
    .map(t => { const [x, y] = toXY(t.lng, t.lat); return { x, y, r: Math.max(t.crown / 2, 1.2), top: t.height, base: Math.max(1.5, t.height * (t.nadel ? 0.22 : 0.38)) } })

  const W = Math.ceil((2 * R) / CELL), H = W
  const originX = -R, originY = -R
  const stampB = new Uint8Array(W * H)
  const stampT = new Uint8Array(W * H)

  // Gebäudezellen maskieren (transparent — dort steht das Haus)
  const mask = new Uint8Array(W * H)
  for (const g of grounds) stampPolygon(mask, W, H, originX, originY, g.map(([x, y]) => [x, y]), 1)

  const year = new Date().getFullYear()
  const seasonList = args.season ? SEASONS.filter(s => s.key === args.season) : SEASONS
  const written = {}, maxima = {}

  for (const season of seasonList) {
    const day = new Date(year, season.month, season.day, 12)
    const times = SunCalc.getTimes(day, clat, clng)
    const steps = []
    for (let ts = times.sunrise.getTime(); ts <= times.sunset.getTime(); ts += STEP_MIN * 60_000) {
      const pos = SunCalc.getPosition(new Date(ts), clat, clng)
      if (pos.altitude > 0.005) steps.push(pos)
    }

    // Beschattung akkumulieren: Gebäude voll, Bäume mit Laub-Durchlässigkeit
    const shade = new Float32Array(W * H)
    for (const pos of steps) {
      stampB.fill(0); stampT.fill(0)
      const bearing = pos.azimuth + Math.PI
      const bx = Math.sin(bearing), by = Math.cos(bearing)
      const perH = 1 / Math.tan(pos.altitude)        // Schattenlänge pro Meter Höhe
      // Gebäudeflächen: Vertices entlang der Sonnenrichtung auf Beobachterhöhe projizieren
      for (const pts of faces) {
        const proj = pts.map(([x, y, z]) => {
          const d = Math.max(0, z - OBSERVER_H) * perH
          return [x - bx * d, y - by * d]
        })
        stampPolygon(stampB, W, H, originX, originY, [...pts.map(([x, y]) => [x, y]), ...proj.reverse()], 1)
      }
      // Baumkronen: projizierte Kreise über die Kronenhöhe
      for (const t of trees) {
        const zMid = (t.top + t.base) / 2
        const d = Math.max(0, zMid - OBSERVER_H) * perH
        const stretch = (t.top - t.base) / 2 * perH
        stampCircle(stampT, W, H, originX, originY, t.x - bx * d, t.y - by * d, t.r + stretch * 0.5, 1)
        stampCircle(stampT, W, H, originX, originY, t.x - bx * (d - stretch), t.y - by * (d - stretch), t.r, 1)
        stampCircle(stampT, W, H, originX, originY, t.x - bx * (d + stretch), t.y - by * (d + stretch), t.r, 1)
      }
      const treeShade = 1 - season.treeTransparency
      for (let i = 0; i < shade.length; i++) {
        if (stampB[i]) shade[i] += 1
        else if (stampT[i]) shade[i] += treeShade
      }
    }

    const maxHours = steps.length * STEP_MIN / 60
    const rgba = Buffer.alloc(W * H * 4)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const idx = j * W + i
      const src = (H - 1 - j) * W + i // PNG: Zeile 0 = Norden
      const px = idx * 4
      if (mask[src]) { rgba[px + 3] = 0; continue }
      const hours = (steps.length - shade[src]) * STEP_MIN / 60
      const [r, g, b] = colorFor(hours, maxHours)
      rgba[px] = r; rgba[px + 1] = g; rgba[px + 2] = b; rgba[px + 3] = 205
    }
    const file = `${name}-sonne-${season.key}.png`
    writePng(join(OUT_DIR, file), W, H, rgba)
    written[season.key] = file
    maxima[season.key] = Math.round(maxHours * 10) / 10
  }

  // Index um Heatmap-Infos ergänzen
  const idxFile = join(OUT_DIR, 'index.json')
  const idx = JSON.parse(readFileSync(idxFile, 'utf-8'))
  const e = idx.find(x => x.name === name)
  if (e) {
    e.heatmaps = { ...(e.heatmaps || {}), ...written }
    e.heatmap_max = { ...(e.heatmap_max || {}), ...maxima }
    e.heatmap = e.heatmaps.sommer || e.heatmap // Abwärtskompatibilität
    e.bounds = [clat - R / ky, clng - R / kx, clat + R / ky, clng + R / kx] // [S,W,N,E]
  }
  writeFileSync(idxFile, JSON.stringify(idx, null, 1))
  console.log(`  ${name}: ${W}×${H} Zellen · ${Object.keys(written).join('/')} · ${faces.length} Flächen · ${trees.length} Bäume ✓`)
}

const idx = JSON.parse(readFileSync(join(OUT_DIR, 'index.json'), 'utf-8'))
const names = args.all ? idx.map(e => e.name) : [args.name]
if (!names[0]) { console.error('Nutzung: --name <patch> oder --all'); process.exit(1) }
console.log(`Solar-Heatmap (21.6., ${CELL}-m-Raster) für: ${names.join(', ')}`)
for (const n of names) await heatmapFor(n)
console.log('fertig.')
