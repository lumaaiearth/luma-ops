#!/usr/bin/env node
// LoD2-Patch-Generator: lädt die amtlichen Berliner 3D-Gebäudemodelle (LoD2,
// CityGML, dl-de/zero) für einen Umkreis um einen Punkt und schreibt ein
// kompaktes JSON nach public/lod2/<name>.json (+ Index-Eintrag).
//
//   node scripts/lod2-patch.mjs --name r95 --lat 52.5729 --lng 13.3728 [--radius 350]
//
// Die App nutzt die Patches automatisch: Sonnenanalyse rechnet dann gegen die
// echten Dach-/Wandflächen, die 3D-Ansicht rendert sie. Benötigt `unzip` im PATH.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'scripts', '.lod2-cache')
const OUT_DIR = join(ROOT, 'public', 'lod2')
const ATOM_BASE = 'https://gdi.berlin.de/data/a_lod2/atom'

/* ── Argumente ── */
const args = {}
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1]
const lat = parseFloat(args.lat), lng = parseFloat(args.lng)
const radius = parseFloat(args.radius || 350)
const name = (args.name || '').replace(/[^a-z0-9-]/gi, '').toLowerCase()
if (!name || !isFinite(lat) || !isFinite(lng)) {
  console.error('Nutzung: node scripts/lod2-patch.mjs --name <slug> --lat <lat> --lng <lng> [--radius 350]')
  process.exit(1)
}

/* ── UTM33 (EPSG:25833, GRS80) ⇄ WGS84 ──
   Transversale Mercator-Projektion, Krüger-Reihen (ausreichend genau < 1 mm). */
const A = 6378137, F = 1 / 298.257222101
const K0 = 0.9996, E2 = F * (2 - F), EP2 = E2 / (1 - E2)
const LON0 = 15 * Math.PI / 180, X0 = 500000

function utmToWgs84(E, N) {
  const M = N / K0
  const mu = M / (A * (1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 ** 3 / 256))
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2))
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu)
  const sp = Math.sin(phi1), cp = Math.cos(phi1), tp = Math.tan(phi1)
  const C1 = EP2 * cp * cp
  const T1 = tp * tp
  const N1 = A / Math.sqrt(1 - E2 * sp * sp)
  const R1 = A * (1 - E2) / Math.pow(1 - E2 * sp * sp, 1.5)
  const D = (E - X0) / (N1 * K0)
  const phi = phi1 - (N1 * tp / R1) * (
    D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6 / 720)
  const lon = LON0 + (
    D - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5 / 120) / cp
  return [lon * 180 / Math.PI, phi * 180 / Math.PI]
}

function wgs84ToUtm(latDeg, lngDeg) {
  const phi = latDeg * Math.PI / 180, lam = lngDeg * Math.PI / 180
  const sp = Math.sin(phi), cp = Math.cos(phi), tp = Math.tan(phi)
  const N = A / Math.sqrt(1 - E2 * sp * sp)
  const T = tp * tp, C = EP2 * cp * cp
  const Aa = (lam - LON0) * cp
  const M = A * ((1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 ** 3 / 256) * phi
    - (3 * E2 / 8 + 3 * E2 * E2 / 32 + 45 * E2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * E2 * E2 / 256 + 45 * E2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * E2 ** 3 / 3072) * Math.sin(6 * phi))
  const E_ = X0 + K0 * N * (Aa + (1 - T + C) * Aa ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5 / 120)
  const N_ = K0 * (M + N * tp * (Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Aa ** 4 / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6 / 720))
  return [E_, N_]
}

/* ── Kacheln bestimmen & laden ── */
const [cx, cy] = wgs84ToUtm(lat, lng)
const tiles = new Set()
for (const dx of [-radius, radius]) for (const dy of [-radius, radius]) {
  tiles.add(`${Math.floor((cx + dx) / 1000)}_${Math.floor((cy + dy) / 1000)}`)
}
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

async function fetchTile(key) {
  const zipPath = join(CACHE, `LoD2_${key}.zip`)
  if (!existsSync(zipPath)) {
    const url = `${ATOM_BASE}/LoD2_${key}.zip`
    process.stdout.write(`  lade ${url} … `)
    const resp = await fetch(url)
    if (!resp.ok) { console.log(`fehlt (${resp.status})`); return null }
    writeFileSync(zipPath, Buffer.from(await resp.arrayBuffer()))
    console.log('ok')
  }
  const list = execFileSync('unzip', ['-Z1', zipPath]).toString().trim().split('\n')
  const xml = list.find(f => f.endsWith('.xml') || f.endsWith('.gml'))
  return execFileSync('unzip', ['-p', zipPath, xml], { maxBuffer: 1024 * 1024 * 256 }).toString('utf-8')
}

/* ── CityGML parsen ── */
const SURFACE_RE = /<bldg:(RoofSurface|WallSurface|GroundSurface)[\s\S]*?<\/bldg:\1>/g
const POSLIST_RE = /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/g
const TYPE_KEY = { RoofSurface: 'r', WallSurface: 'w', GroundSurface: 'g' }

function parseBuildings(xml) {
  const out = []
  const parts = xml.split('<bldg:Building ')
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    const id = /gml:id="([^"]+)"/.exec(block)?.[1] || `b${i}`
    const rt = /<bldg:roofType>(\d+)<\/bldg:roofType>/.exec(block)?.[1] || null
    const h = parseFloat(/<bldg:measuredHeight[^>]*>([\d.]+)</.exec(block)?.[1] || '0')
    const faces = []
    let m
    SURFACE_RE.lastIndex = 0
    while ((m = SURFACE_RE.exec(block))) {
      const t = TYPE_KEY[m[1]]
      let p
      POSLIST_RE.lastIndex = 0
      while ((p = POSLIST_RE.exec(m[0]))) {
        const nums = p[1].trim().split(/\s+/).map(Number)
        if (nums.length >= 9 && nums.length % 3 === 0) {
          const pts = []
          for (let k = 0; k < nums.length; k += 3) pts.push([nums[k], nums[k + 1], nums[k + 2]])
          // GML wiederholt den Startpunkt am Ende → entfernen
          const [f0, l0] = [pts[0], pts[pts.length - 1]]
          if (f0[0] === l0[0] && f0[1] === l0[1] && f0[2] === l0[2]) pts.pop()
          if (pts.length >= 3) faces.push({ t, pts })
        }
      }
    }
    if (faces.length) out.push({ id, rt, h, faces })
  }
  return out
}

/* ── Hauptlauf ── */
console.log(`LoD2-Patch „${name}": ${lat}, ${lng} · Radius ${radius} m · Kacheln: ${[...tiles].join(', ')}`)
const buildings = []
for (const key of tiles) {
  const xml = await fetchTile(key)
  if (xml) buildings.push(...parseBuildings(xml))
}
console.log(`  ${buildings.length} Gebäude in den Kacheln`)

// Auf Radius filtern (UTM-Distanz des Gebäude-Schwerpunkts) + z relativ zum
// eigenen Bodenniveau (GroundSurface-Minimum) — Gebäude „sitzen" dann auf 0.
const kept = []
let faceCount = 0
for (const b of buildings) {
  let sx = 0, sy = 0, n = 0, groundZ = Infinity, minZ = Infinity
  for (const f of b.faces) for (const [x, y, z] of f.pts) {
    sx += x; sy += y; n++
    if (z < minZ) minZ = z
    if (f.t === 'g' && z < groundZ) groundZ = z
  }
  if (!n) continue
  const d = Math.hypot(sx / n - cx, sy / n - cy)
  if (d > radius + 40) continue
  const z0 = isFinite(groundZ) ? groundZ : minZ
  const faces = b.faces.map(f => ({
    t: f.t,
    pts: f.pts.map(([x, y, z]) => {
      const [lo, la] = utmToWgs84(x, y)
      return [+lo.toFixed(7), +la.toFixed(7), +(z - z0).toFixed(2)]
    }),
  }))
  faceCount += faces.length
  kept.push({ id: b.id, rt: b.rt, h: b.h, faces })
}

if (kept.length === 0) {
  console.log('  → keine Gebäude im Radius (außerhalb der LoD2-Abdeckung?) — kein Patch geschrieben.')
  process.exit(0)
}

const patch = { v: 1, name, center: { lat, lng }, radius, source: 'LoD2 Berlin (dl-de/zero-2.0)', buildings: kept }
const outFile = join(OUT_DIR, `${name}.json`)
writeFileSync(outFile, JSON.stringify(patch))

// Index aktualisieren
const idxFile = join(OUT_DIR, 'index.json')
let idx = []
try { idx = JSON.parse(readFileSync(idxFile, 'utf-8')) } catch { /* neu */ }
idx = idx.filter(e => e.name !== name)
idx.push({ name, lat, lng, radius, file: `${name}.json` })
writeFileSync(idxFile, JSON.stringify(idx, null, 1))

const kb = Math.round(JSON.stringify(patch).length / 1024)
console.log(`  → ${kept.length} Gebäude, ${faceCount} Flächen, ${kb} KB → public/lod2/${name}.json ✓`)
