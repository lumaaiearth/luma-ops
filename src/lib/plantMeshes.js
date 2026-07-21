// Prozedurale Low-Poly-Pflanzenmodelle (echte 3D-Polygone) für die Beet-Ansicht.
// Jede Art bekommt zur Laufzeit ein Habitus-Modell aus ihren Merkmalen
// (plantMorphology.js): Blütenstand, Blattform, Blattstellung, Blatt-/Blütenfarbe
// — alles über den Jahresverlauf (Wachstum, Blüte→Samen, Frühlings-/Herbstlaub).
// Maße in Metern → reale Höhen-/Breitenverhältnisse. Deterministisch (seeded)
// und pro (Art × Monat) gecacht; gerendert per InstancedMesh.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { hashStr, stateForMonth } from './beetLayout.js'
import { getMorphology } from './plantMorphology.js'

function mulberry(seed) {
  let a = seed >>> 0
  return () => { a += 0x6D2B79F5; let r = Math.imul(a ^ (a >>> 15), a | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
}
const SEED_COL = '#b09256'

function noUV(g) { g.deleteAttribute('uv'); return g }
// Vertexfarbe auf eine Teilgeometrie (+ leichte Tonvarianz); non-indexed machen.
function paint(geoIn, hex, vary = 0) {
  const geo = geoIn.index ? geoIn.toNonIndexed() : geoIn
  if (geo !== geoIn) geoIn.dispose()
  const c = new THREE.Color(hex)
  if (vary) c.offsetHSL(0, 0, (vary - 0.5) * 0.09)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  geo.deleteAttribute('uv')
  return geo
}
// Verlaufsfärbung entlang der lokalen y-Achse (Basis→Spitze), z. B. hellere
// Blütenblatt-Ränder. Vor Rotation/Translation auf das rohe Teil anwenden.
function paintGrad(geoIn, hexBase, hexTip) {
  const geo = geoIn.index ? geoIn.toNonIndexed() : geoIn
  if (geo !== geoIn) geoIn.dispose()
  const cA = new THREE.Color(hexBase), cB = new THREE.Color(hexTip), c = new THREE.Color()
  const p = geo.attributes.position, n = p.count
  let ymin = Infinity, ymax = -Infinity
  for (let i = 0; i < n; i++) { const y = p.getY(i); if (y < ymin) ymin = y; if (y > ymax) ymax = y }
  const span = (ymax - ymin) || 1
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    c.copy(cA).lerp(cB, (p.getY(i) - ymin) / span)
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  geo.deleteAttribute('uv')
  return geo
}

// ── Blatt-Primitive: Basis bei y=0, Spitze +y, flach in XY, Normalen gesetzt ──
// Low-Poly-Blatt mit natürlicherem Umriss: schmale Basis, breiteste Stelle bei
// ~35 %, fein auslaufende Spitze; sanfte Krümmung über die Länge (z).
const BLADE_SECS = [[0.0, 0.16], [0.35, 0.5], [0.7, 0.34], [1.0, 0.0]]
function bladeGeo(len, wBase, curve = 0) {
  const pos = []
  const zAt = t => curve * t * t * 1.6
  for (let i = 0; i < BLADE_SECS.length - 1; i++) {
    const [t0, hw0] = BLADE_SECS[i], [t1, hw1] = BLADE_SECS[i + 1]
    const y0 = len * t0, y1 = len * t1, z0 = zAt(t0), z1 = zAt(t1)
    const l0 = -wBase * hw0, r0 = wBase * hw0, l1 = -wBase * hw1, r1 = wBase * hw1
    if (hw1 === 0) { // auslaufende Spitze → ein Dreieck
      pos.push(l0, y0, z0, r0, y0, z0, 0, y1, z1)
    } else {
      pos.push(l0, y0, z0, r0, y0, z0, r1, y1, z1)
      pos.push(l0, y0, z0, r1, y1, z1, l1, y1, z1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.computeVertexNormals()
  return g
}
function ovalGeo(len, w, seg = 7) {
  const g = new THREE.CircleGeometry(0.5, seg)
  g.scale(w, len, 1); g.translate(0, len / 2, 0)
  return noUV(g)
}
function needleGeo(len) {
  const g = new THREE.CylinderGeometry(0.004, 0.006, len, 4)
  g.translate(0, len / 2, 0)
  return noUV(g)
}
// Zusammengesetzte Blätter aus Teilstücken zu einem Blatt mergen.
// Alle Teile auf non-indexed + nur position/normal normalisieren (mergeGeometries
// verlangt einheitliche Attribute und einheitlichen Index-Status).
function compound(pieces) {
  const norm = pieces.map(p => {
    const g = p.index ? p.toNonIndexed() : p
    if (g !== p) p.dispose()
    g.deleteAttribute('uv')
    if (!g.attributes.normal) g.computeVertexNormals()
    return g
  })
  const m = mergeGeometries(norm, false)
  norm.forEach(p => p.dispose())
  return m
}
function pinnateGeo(len, w) { // gefiedert: Rachis + Fiederblättchen
  const parts = []
  const rachis = new THREE.CylinderGeometry(0.004, 0.005, len, 4); rachis.translate(0, len / 2, 0); parts.push(noUV(rachis))
  const n = 3 + (len > 0.18 ? 1 : 0)
  for (let i = 1; i <= n; i++) {
    const y = len * (i / (n + 1)), ll = w * (1.1 - i * 0.12)
    for (const s of [-1, 1]) {
      const lf = bladeGeo(ll, w * 0.5, 0); lf.rotateZ(s * 1.15); lf.translate(0, y, 0); parts.push(lf)
    }
  }
  return compound(parts)
}
function featheryGeo(len, w) { // fein gefiedert (Achillea/Artemisia)
  const parts = []
  const rachis = new THREE.CylinderGeometry(0.003, 0.004, len, 4); rachis.translate(0, len / 2, 0); parts.push(noUV(rachis))
  const n = 5
  for (let i = 1; i <= n; i++) {
    const y = len * (i / (n + 1))
    for (const s of [-1, 1]) { const lf = bladeGeo(w * 0.7, 0.012, 0); lf.rotateZ(s * 1.3); lf.translate(0, y, 0); parts.push(lf) }
  }
  return compound(parts)
}
function cloverGeo(len, w) { // klee/dreizählig
  const parts = []
  const stalk = new THREE.CylinderGeometry(0.004, 0.005, len * 0.6, 4); stalk.translate(0, len * 0.3, 0); parts.push(noUV(stalk))
  for (const a of [-0.7, 0, 0.7]) { const lf = ovalGeo(len * 0.5, w * 0.6, 6); lf.rotateZ(a); lf.translate(0, len * 0.6, 0); parts.push(lf) }
  return compound(parts)
}
// Ein Blatt der gewünschten Form erzeugen (Basis y=0, +y).
function makeLeaf(form, len, w) {
  switch (form) {
    case 'grasartig': return bladeGeo(len, w * 0.5, len * 0.14)
    case 'schmal': return bladeGeo(len, w * 0.55, len * 0.08)
    case 'schwert': return bladeGeo(len, w * 0.8, 0)
    case 'lanzettlich': return bladeGeo(len, w, len * 0.08)
    case 'oval': return ovalGeo(len, w * 0.95, 7)
    case 'rund': return ovalGeo(len, len * 0.95, 8)
    case 'herz': return ovalGeo(len, w * 1.1, 6)
    case 'gelappt': return ovalGeo(len, w * 1.05, 5)
    case 'nadel': return needleGeo(len)
    case 'gefiedert': return pinnateGeo(len, w)
    case 'fein': return featheryGeo(len, w)
    case 'klee': return cloverGeo(len, w)
    default: return bladeGeo(len, w, len * 0.08)
  }
}

// ── Jahreszeitliche Blattfarbe ────────────────────────────────────────────
function seasonalLeaf(morph, month) {
  const base = new THREE.Color(morph.leafCol)
  if (month <= 4) { const c = base.clone(); c.offsetHSL(0, -0.02, 0.06); return c } // Frühling: frisch
  if (month <= 8 || morph.evergreen) return base                                     // Sommer / wintergrün
  const autumn = new THREE.Color(morph.autumn || (morph.leaf === 'grasartig' ? '#c9b37c' : '#b0894f'))
  return month === 9 ? base.clone().lerp(autumn, 0.45) : autumn                      // Sept anteilig, Okt voll
}

const cache = new Map()
const MAX_CACHE = 400

export function speciesGeometry(sp, month) {
  const key = sp.id + '|' + month
  const hit = cache.get(key)
  if (hit) return hit

  const M = getMorphology(sp)
  const state = stateForMonth(sp, month)
  const rnd = mulberry(hashStr(key))
  const H = Math.max(0.06, (sp.hoehe?.[1] ?? 50) / 100)
  const spread = Math.max(0.12, (sp.ausbreitung || sp.pflanzabstand || 40) / 100)
  const bloom = state === 'bloom', seed = state === 'seed'
  const leafC = seasonalLeaf(M, month)
  const leaf = '#' + leafC.getHexString()
  const leafD = '#' + leafC.clone().offsetHSL(0, 0, -0.06).getHexString()
  const flowerCol = seed ? SEED_COL : (bloom ? (sp.bluete_farbe || '#c47ad6') : leafD)
  // Vorblüte-Knospen: gedämpfte, ins Grüne gemischte Blütenfarbe (statt dunkler
  // Klekse) — nach der Blüte Samenton. Blütenspitze: aufgehellte Blütenfarbe.
  const budCol = seed ? SEED_COL : (bloom ? flowerCol
    : '#' + new THREE.Color(leaf).lerp(new THREE.Color(sp.bluete_farbe || '#c47ad6'), 0.16).getHexString())
  const flowerTip = bloom ? '#' + new THREE.Color(flowerCol).offsetHSL(0, -0.04, 0.13).getHexString() : flowerCol
  const parts = []
  const add = g => parts.push(g)

  function stem(x, z, h, r = 0.011) {
    const g = new THREE.CylinderGeometry(r * 0.4, r, h, 5); g.translate(0, h / 2, 0)
    const az = (rnd() - 0.5) * 0.28, ax = (rnd() - 0.5) * 0.28
    g.rotateZ(az); g.rotateX(ax); g.translate(x, 0, z)
    add(paint(noUV(g), rnd() < 0.5 ? leaf : leafD, rnd()))
    const sy = h * Math.cos(az), tx = -h * Math.sin(az)
    return { x: x + tx, y: sy * Math.cos(ax), z: z + sy * Math.sin(ax), ax, az }
  }
  function ball(x, y, z, r, col, squashY = 1) {
    const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, squashY, 1); g.translate(x, y, z)
    add(paint(g, col, rnd()))
  }
  function leafAt(x, y, z, form, len, w, tilt, col) {
    const g = makeLeaf(form, len, w)
    g.rotateX(tilt); g.rotateY(rnd() * Math.PI * 2); g.translate(x, y, z)
    add(paint(g, col, rnd()))
  }
  // Blattschopf am Boden (Rosette / Grundblätter)
  function basalLeaves(n, len, w, form, tiltBase) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5, d = rnd() * spread * 0.14
      const g = makeLeaf(form, len * (0.85 + rnd() * 0.3), w)
      g.rotateX(tiltBase + rnd() * 0.25); g.rotateY(a); g.translate(Math.cos(a) * d, 0.01, Math.sin(a) * d)
      add(paint(g, rnd() < 0.5 ? leaf : leafD, rnd()))
    }
  }
  // Stängelblätter je Blattstellung
  function caulineLeaves(base, tip, h) {
    if (M.leaf === 'grasartig' || M.leaf === 'schwert') return
    const nodes = h > 0.6 ? 3 : 2
    const llen = Math.min(0.16, Math.max(0.05, spread * 0.35))
    for (let k = 1; k <= nodes; k++) {
      const f = k / (nodes + 1)
      const nx = base.x + (tip.x - base.x) * f, ny = (tip.y) * f, nz = base.z + (tip.z - base.z) * f
      const size = llen * (1 - f * 0.5)
      if (M.arrange === 'gegenstaendig') for (const s of [0, Math.PI]) leafAt2(nx, ny, nz, size, s)
      else if (M.arrange === 'quirlig') for (const s of [0, 2.1, 4.2]) leafAt2(nx, ny, nz, size, s)
      else leafAt2(nx, ny, nz, size, rnd() * Math.PI * 2) // wechselständig
    }
  }
  function leafAt2(x, y, z, size, az) {
    const g = makeLeaf(M.leaf === 'fein' || M.leaf === 'gefiedert' || M.leaf === 'klee' ? M.leaf : (M.leaf === 'oval' || M.leaf === 'herz' || M.leaf === 'rund' || M.leaf === 'gelappt' ? M.leaf : 'lanzettlich'), size, size * 0.5)
    g.rotateX(-1.15); g.rotateY(az); g.translate(x, y, z)
    add(paint(g, rnd() < 0.5 ? leaf : leafD, rnd()))
  }

  // ── Blütenstände ──
  function inflorescence(tip, h) {
    const t = tip
    switch (M.infl) {
      case 'aehre': case 'lippe': {
        const big = M.infl === 'lippe'
        const spikeLen = Math.max(0.05, H * 0.34)
        // Dünne grüne Achse statt fetter Blütenkegel
        const axis = new THREE.CylinderGeometry(0.004, 0.007, spikeLen, 5); axis.translate(t.x, t.y + spikeLen / 2, t.z)
        add(paint(noUV(axis), leafD, rnd()))
        // Blüten in Scheinquirlen den Ähre hinauf — unten dichter, nach oben schmaler
        const nW = big ? 5 : 6, col = bloom ? flowerCol : budCol
        const rr = (bloom ? (big ? 0.019 : 0.013) : (big ? 0.013 : 0.009))
        for (let w = 0; w < nW; w++) {
          const f = w / nW, yy = t.y + spikeLen * (0.1 + 0.85 * f)
          const ringR = (big ? 0.05 : 0.034) * (1 - f * 0.55)
          const perW = bloom ? (big ? 4 : 6) : 3
          for (let k = 0; k < perW; k++) {
            const a = (k / perW) * Math.PI * 2 + w * 0.6
            ball(t.x + Math.cos(a) * ringR, yy + (rnd() - 0.5) * 0.008, t.z + Math.sin(a) * ringR, rr * (0.85 + rnd() * 0.3), col, big ? 1.25 : 0.95)
          }
        }
        break
      }
      case 'traube': {
        const rlen = Math.max(0.06, H * 0.35), n = bloom ? 6 : 5, col = bloom ? flowerCol : budCol
        for (let k = 0; k < n; k++) { const yy = t.y + rlen * (k / n); ball(t.x + (rnd() - 0.5) * 0.05, yy, t.z + (rnd() - 0.5) * 0.03, bloom ? 0.016 : 0.011, col, 1.1) }
        break
      }
      case 'rispe': {
        const rlen = Math.max(0.05, H * 0.3), n = 9, col = bloom ? flowerCol : budCol
        for (let k = 0; k < n; k++) { const yy = t.y + rlen * rnd(), rr = (1 - yy / (t.y + rlen)) * 0.06; ball(t.x + (rnd() - 0.5) * 0.09, yy, t.z + (rnd() - 0.5) * 0.09, seed || !bloom ? 0.008 : 0.012, col, 0.8) }
        break
      }
      case 'dolde': {
        const r = Math.max(0.03, H * 0.09)
        if (bloom) { // Doppeldolde: mehrere kleine Döldchen aus je ~4 Röschen
          const nU = 7
          for (let k = 0; k < nU; k++) {
            const a = (k / nU) * Math.PI * 2 + rnd() * 0.3, dd = k === 0 ? 0 : r * (0.55 + rnd() * 0.4)
            const cx = t.x + Math.cos(a) * dd, cz = t.z + Math.sin(a) * dd, cy = t.y + 0.01 + (rnd() - 0.5) * 0.01
            for (let j = 0; j < 4; j++) { const b = rnd() * Math.PI * 2, e = rnd() * 0.014; ball(cx + Math.cos(b) * e, cy + (rnd() - 0.5) * 0.006, cz + Math.sin(b) * e, 0.007, flowerCol, 0.7) }
          }
        } else ball(t.x, t.y + 0.006, t.z, r * 0.7, budCol, 0.4)
        break
      }
      case 'korb': {
        if (bloom) corolla(t.x, t.y + 0.012, t.z, Math.max(0.02, H * 0.05))
        else ball(t.x, t.y + 0.012, t.z, Math.max(0.02, H * 0.045), budCol, 0.6)
        break
      }
      case 'koepfchen': {
        const r = Math.max(0.02, H * 0.05)
        ball(t.x, t.y + r * 0.6, t.z, r, bloom ? flowerCol : budCol, 1)
        if (bloom) for (let k = 0; k < 8; k++) { const a = rnd() * Math.PI * 2; ball(t.x + Math.cos(a) * r, t.y + r * 0.6 + (rnd() - 0.5) * r, t.z + Math.sin(a) * r, r * 0.35, flowerTip) }
        break
      }
      case 'glocke': {
        const nb = 2 + Math.floor(rnd() * 2)
        for (let k = 0; k < nb; k++) ball(t.x + (rnd() - 0.5) * 0.04, t.y - k * Math.max(0.03, H * 0.07), t.z + (rnd() - 0.5) * 0.04, 0.022, flowerCol, 1.3)
        break
      }
      case 'kugel': { // Allium
        const r = Math.max(0.03, H * 0.08)
        for (let k = 0; k < 26; k++) { const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1); ball(t.x + Math.sin(v) * Math.cos(u) * r, t.y + r + Math.cos(v) * r, t.z + Math.sin(v) * Math.sin(u) * r, 0.009, flowerCol) }
        break
      }
      case 'kolben': {
        const cl = Math.max(0.05, H * 0.2)
        const s = new THREE.CylinderGeometry(0.012, 0.016, cl, 6); s.translate(t.x, t.y + cl / 2, t.z)
        add(paint(noUV(s), seed ? SEED_COL : (bloom ? flowerCol : leafD), rnd()))
        break
      }
      default: { // einzeln
        if (bloom && (M.leaf !== 'nadel')) corolla(t.x, t.y + 0.012, t.z, Math.max(0.024, H * 0.06))
        else ball(t.x, t.y + 0.012, t.z, Math.max(0.022, H * 0.05), budCol, 0.6)
      }
    }
  }
  function corolla(x, y, z, r) {
    // Äußerer Strahlenkranz
    const nP = 9 + Math.floor(rnd() * 4)
    for (let i = 0; i < nP; i++) {
      const pet = bladeGeo(r * 2.0, r * 0.62, r * 0.45)
      pet.rotateX(-Math.PI / 2 + 0.32); pet.rotateY((i / nP) * Math.PI * 2 + rnd() * 0.08); pet.translate(x, y, z)
      add(paintGrad(pet, flowerCol, flowerTip)) // dunklerer Grund, aufgehellte Spitze
    }
    // Innerer, kleinerer & steilerer Kranz — leicht versetzt für Fülle
    const nI = Math.ceil(nP * 0.6)
    for (let i = 0; i < nI; i++) {
      const pet = bladeGeo(r * 1.2, r * 0.5, r * 0.4)
      pet.rotateX(-Math.PI / 2 + 0.72); pet.rotateY((i / nI) * Math.PI * 2 + 0.4 + rnd() * 0.12); pet.translate(x, y + r * 0.05, z)
      add(paintGrad(pet, flowerCol, flowerTip))
    }
    // Blütenscheibe: Zentrum + Kranz kleiner Röschen statt glatter Kugel
    const discCol = seed ? '#7a5a20' : '#9a6a10'
    ball(x, y + r * 0.14, z, r * 0.42, discCol, 0.6)
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + rnd() * 0.4; ball(x + Math.cos(a) * r * 0.26, y + r * 0.16, z + Math.sin(a) * r * 0.26, r * 0.11, discCol, 0.7) }
  }

  // ── Aufbau nach Habitus ──
  if (M.woody) {
    const trunkH = sp.type === 'baum' ? H * 0.35 : H * 0.18
    const t = new THREE.CylinderGeometry(sp.type === 'baum' ? 0.05 : 0.02, sp.type === 'baum' ? 0.08 : 0.035, trunkH, 6); t.translate(0, trunkH / 2, 0)
    add(paint(noUV(t), '#6b4e2e'))
    const crownR = Math.max(0.2, spread * 0.45)
    const winterBare = month >= 11 || month <= 2
    for (let i = 0; i < 3; i++) { const a = rnd() * Math.PI * 2, d = rnd() * crownR * 0.4; ball(Math.cos(a) * d, trunkH + crownR * (0.55 + rnd() * 0.5), Math.sin(a) * d, crownR * (0.65 + rnd() * 0.25), (winterBare && !M.evergreen) ? '#7a6242' : (rnd() < 0.5 ? leaf : leafD), 0.85) }
    if (bloom) for (let i = 0; i < 8; i++) { const a = rnd() * Math.PI * 2, d = crownR * (0.5 + rnd() * 0.45); ball(Math.cos(a) * d, trunkH + crownR + (rnd() - 0.5) * crownR, Math.sin(a) * d, 0.035, flowerCol) }
  } else if (M.leaf === 'grasartig') {
    const n = 12 + Math.floor(rnd() * 6)
    for (let i = 0; i < n; i++) {
      const bh = H * (0.6 + rnd() * 0.5)
      const a = rnd() * Math.PI * 2, d = rnd() * spread * 0.22
      // Überhängender Bogen: kräftige Krümmung + nach außen geneigt (Fontänen-Habitus)
      const b = bladeGeo(bh, 0.017, bh * (0.24 + rnd() * 0.2))
      b.rotateX(0.15 + rnd() * 0.5); b.rotateY(a + (rnd() - 0.5) * 0.6)
      b.translate(Math.cos(a) * d, 0, Math.sin(a) * d)
      add(paint(b, rnd() < 0.35 ? '#8a9a5b' : leaf, rnd()))
      if ((bloom || seed) && rnd() < 0.4) { const g = new THREE.CylinderGeometry(0.004, 0.012, bh * 0.22, 4); g.translate(Math.cos(a) * d, bh * 0.98, Math.sin(a) * d); add(paint(noUV(g), bloom && sp.bluete_farbe ? sp.bluete_farbe : SEED_COL, rnd())) }
    }
  } else if (sp.wuchsform === 'kriechend' || sp.wuchsform === 'polster' || (sp.hoehe?.[1] ?? 50) < 18) {
    const r = spread * 0.5
    const dome = new THREE.IcosahedronGeometry(r, 1); dome.scale(1, Math.max(0.12, H / r) * 0.5, 1)
    add(paint(dome, leaf, rnd()))
    for (let i = 0; i < 10; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.9; leafAt(Math.cos(a) * d, H * 0.4, Math.sin(a) * d, M.leaf === 'fein' || M.leaf === 'gefiedert' ? M.leaf : 'schmal', H * 0.7, 0.03, -1.3, rnd() < 0.5 ? leaf : leafD) }
    const nf = bloom ? 16 : (seed ? 6 : 0)
    for (let i = 0; i < nf; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.85; ball(Math.cos(a) * d, H * 0.75 + 0.015, Math.sin(a) * d, 0.02, flowerCol, 0.7) }
  } else {
    // Krautige mit Stängeln
    const rosette = M.arrange === 'rosette'
    const basalN = rosette ? 7 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 2)
    const basalLen = Math.min(0.28, Math.max(0.08, H * 0.4))
    basalLeaves(basalN, basalLen, Math.max(0.03, spread * 0.32), M.leaf, rosette ? -0.7 : -1.0)
    const nStems = M.infl === 'kugel' || sp.funktion === 'Zw' ? 2 + Math.floor(rnd() * 2) : 5 + Math.floor(rnd() * 4)
    for (let i = 0; i < nStems; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * spread * 0.3
      const sx = Math.cos(a) * d, sz = Math.sin(a) * d
      const stemH = H * (M.infl === 'kugel' ? 0.9 : 0.7 + rnd() * 0.22)
      const base = { x: sx, y: 0, z: sz }
      const tip = stem(sx, sz, stemH)
      if (!rosette) caulineLeaves(base, tip, stemH)
      inflorescence(tip, stemH)
    }
  }

  const merged = parts.length ? mergeGeometries(parts, false) : null
  parts.forEach(p => p.dispose())
  // Fallback (sollte nie eintreten): winziger Platzhalter statt Absturz.
  const geo = merged || new THREE.IcosahedronGeometry(0.03, 0)
  if (!merged) paint(geo, '#4d7c3f')
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  if (cache.size >= MAX_CACHE) { for (const g of cache.values()) g.dispose(); cache.clear() }
  cache.set(key, geo)
  return geo
}

export function disposePlantGeometryCache() {
  for (const g of cache.values()) g.dispose()
  cache.clear()
}

// Wind-fähiges Lambert-Material: höhenabhängige Schwingung im Vertex-Shader.
export function makePlantMaterial(uTime, uWind) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide })
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uTime
    shader.uniforms.uWind = uWind
    shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iPos = instanceMatrix[3].xyz;
      #else
        vec3 iPos = vec3(0.0);
      #endif
      float phase = iPos.x * 0.9 + iPos.z * 1.3;
      float hf = max(transformed.y, 0.0);
      float sway = (sin(uTime * 1.1 + phase) + 0.35 * sin(uTime * 2.7 + phase * 1.7)) * uWind;
      transformed.x += sway * hf * hf * 0.06;
      transformed.z += cos(uTime * 0.9 + phase) * uWind * hf * hf * 0.035;`
    )
    mat.userData.shader = shader
  }
  return mat
}
