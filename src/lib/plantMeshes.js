// Prozedurale Low-Poly-Pflanzenmodelle (echte 3D-Polygone) für die Beet-Ansicht.
// Jede Art bekommt zur Laufzeit ein Habitus-Modell aus ihren Datenfeldern:
// Archetyp (Blütenstandsform), Höhe, Ausbreitung, Blütenfarbe. Maße in Metern,
// damit Höhen-/Breitenverhältnisse im Beet real stimmen. Deterministisch
// (seeded) und pro (Art × Saison-Zustand) gecacht — Erzeugung dauert
// Millisekunden, gerendert wird per InstancedMesh.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { hashStr, deriveArchetype } from './beetLayout.js'

function mulberry(seed) {
  let a = seed >>> 0
  return () => { a += 0x6D2B79F5; let r = Math.imul(a ^ (a >>> 15), a | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
}

// Vertexfarbe uniform auf eine Teilgeometrie malen (+ leichte Tonvarianz).
// Wandelt indexed → non-indexed (fürs Mergen müssen alle Teile denselben
// Index-Status haben) und entfernt UVs.
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

// Getapertes Blatt/Blütenblatt: schmale Lanzette (3 Dreiecke), Fuß bei y=0,
// Spitze bei y=len. Non-indexed, mit Normalen.
function blade(len, wBase, curve = 0) {
  const wm = wBase * 0.42
  const p = new Float32Array([
    -wBase / 2, 0, 0, wBase / 2, 0, 0, -wm, len * 0.5, curve,
    wBase / 2, 0, 0, wm, len * 0.5, curve, -wm, len * 0.5, curve,
    -wm, len * 0.5, curve, wm, len * 0.5, curve, 0, len, curve * 1.7,
  ])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(p, 3))
  g.computeVertexNormals()
  return g
}

const LEAF = { green: '#4d7c3f', bloom: '#4d7c3f', seed: '#8a8a52' }
const LEAF2 = { green: '#65953f', bloom: '#65953f', seed: '#a39a5e' }
const SEED_COL = '#b09256'

const cache = new Map()
const MAX_CACHE = 400

// Haupteinstieg: fertige BufferGeometry (mit Vertexfarben) für Art + Zustand.
export function speciesGeometry(sp, state) {
  const key = sp.id + '|' + state
  const hit = cache.get(key)
  if (hit) return hit

  const arche = deriveArchetype(sp)
  const rnd = mulberry(hashStr(key))
  const H = Math.max(0.06, (sp.hoehe?.[1] ?? 50) / 100)          // Meter
  const spread = Math.max(0.12, (sp.ausbreitung || sp.pflanzabstand || 40) / 100)
  const bloom = state === 'bloom'
  const flowerCol = state === 'seed' ? SEED_COL : (bloom ? (sp.bluete_farbe || '#c47ad6') : LEAF2[state])
  const leaf = LEAF[state], leaf2 = LEAF2[state]
  const parts = []
  const add = g => parts.push(g)

  // Ein Stängel (dünner Kegelstumpf); Rückgabe: Spitzenposition.
  function stem(x, z, h, r = 0.011) {
    const g = new THREE.CylinderGeometry(r * 0.4, r, h, 5)
    g.translate(0, h / 2, 0)
    const az = (rnd() - 0.5) * 0.3, ax = (rnd() - 0.5) * 0.3
    g.rotateZ(az); g.rotateX(ax); g.translate(x, 0, z)
    add(paint(g, rnd() < 0.5 ? leaf : leaf2, rnd()))
    const sy = h * Math.cos(az), tx = -h * Math.sin(az)
    return [x + tx, sy * Math.cos(ax), z + sy * Math.sin(ax)]
  }
  function ball(x, y, z, r, col, squashY = 1) {
    const g = new THREE.IcosahedronGeometry(r, 0)
    g.scale(1, squashY, 1); g.translate(x, y, z)
    add(paint(g, col, rnd()))
  }
  // Ein Blatt am Boden platzieren (nach außen gekippt, zufällig gedreht).
  function groundLeaf(len, w, col) {
    const b = blade(len, w, len * 0.18)
    b.rotateX(-1.0 - rnd() * 0.5)
    b.rotateY(rnd() * Math.PI * 2)
    add(paint(b, col, rnd()))
  }
  // Blattschopf: flacher Dom + getaperte Blattspreiten.
  function baseTuft(r, hFac = 0.34) {
    const dome = new THREE.IcosahedronGeometry(Math.max(0.05, r), 0)
    dome.scale(1, hFac, 1); dome.translate(0, 0.02, 0)
    add(paint(dome, leaf, rnd()))
    const nb = 6 + Math.floor(rnd() * 3)
    for (let i = 0; i < nb; i++) groundLeaf(Math.max(0.08, r * (0.9 + rnd() * 0.6)), Math.max(0.02, r * 0.28), rnd() < 0.5 ? leaf : leaf2)
  }
  // Blütenkopf mit echten Blütenblättern (Körbchen/Strahlenblüte).
  function corolla(x, y, z, r, petalCol, centerCol) {
    const nP = 7 + Math.floor(rnd() * 3)
    for (let i = 0; i < nP; i++) {
      const pet = blade(r * 1.9, r * 0.7, 0)
      pet.rotateX(-Math.PI / 2 + 0.35)                 // fast flach, leicht angehoben
      pet.rotateY((i / nP) * Math.PI * 2 + rnd() * 0.1)
      pet.translate(x, y, z)
      add(paint(pet, petalCol, rnd() * 0.6))
    }
    ball(x, y + r * 0.12, z, r * 0.5, centerCol || '#9a6a10', 0.6)
  }

  if (arche === 'baum' || arche === 'strauch') {
    const trunkH = arche === 'baum' ? H * 0.35 : H * 0.18
    const t = new THREE.CylinderGeometry(arche === 'baum' ? 0.05 : 0.02, arche === 'baum' ? 0.08 : 0.035, trunkH, 6)
    t.translate(0, trunkH / 2, 0)
    add(paint(t, '#6b4e2e'))
    const crownR = Math.max(0.2, spread * (arche === 'baum' ? 0.45 : 0.4))
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * crownR * 0.4
      ball(Math.cos(a) * d, trunkH + crownR * (0.55 + rnd() * 0.5), Math.sin(a) * d, crownR * (0.65 + rnd() * 0.25), rnd() < 0.5 ? leaf : leaf2, 0.85)
    }
    if (bloom) for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2, d = crownR * (0.5 + rnd() * 0.45)
      ball(Math.cos(a) * d, trunkH + crownR + (rnd() - 0.5) * crownR, Math.sin(a) * d, 0.035, flowerCol)
    }
  } else if (arche === 'decker') {
    const r = spread * 0.5
    const dome = new THREE.IcosahedronGeometry(r, 1)
    dome.scale(1, Math.max(0.12, H / r) * 0.5, 1)
    add(paint(dome, leaf, rnd()))
    for (let i = 0; i < 8; i++) groundLeaf(Math.max(0.05, H * 0.7), 0.03, leaf2)
    const nf = bloom ? 16 : (state === 'seed' ? 6 : 0)
    for (let i = 0; i < nf; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.85
      ball(Math.cos(a) * d, H * 0.75 + 0.015, Math.sin(a) * d, 0.02, flowerCol, 0.7)
    }
  } else if (arche === 'gras') {
    const n = 12 + Math.floor(rnd() * 6)
    for (let i = 0; i < n; i++) {
      const bh = H * (0.65 + rnd() * 0.4)
      const b = blade(bh, 0.016, bh * 0.12)
      b.rotateZ((rnd() - 0.5) * 0.8); b.rotateY(rnd() * Math.PI * 2)
      const a = rnd() * Math.PI * 2, d = rnd() * spread * 0.2
      b.translate(Math.cos(a) * d, 0, Math.sin(a) * d)
      add(paint(b, rnd() < 0.35 ? '#8a9a5b' : leaf, rnd()))
      if ((bloom || state === 'seed') && rnd() < 0.45) {
        const g = new THREE.CylinderGeometry(0.004, 0.012, bh * 0.22, 4)
        g.translate(Math.cos(a) * d, bh * 0.98, Math.sin(a) * d)
        add(paint(g, bloom && sp.bluete_farbe ? sp.bluete_farbe : SEED_COL, rnd()))
      }
    }
  } else {
    baseTuft(spread * 0.42)
    const nStems = arche === 'geophyt' ? 3 + Math.floor(rnd() * 2) : 5 + Math.floor(rnd() * 4)
    for (let i = 0; i < nStems; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * spread * 0.3
      const sx = Math.cos(a) * d, sz = Math.sin(a) * d
      if (arche === 'aehre') {
        const stemH = H * (0.55 + rnd() * 0.18)
        const [tx, ty, tz] = stem(sx, sz, stemH)
        const spikeLen = Math.max(0.05, H * 0.32)
        const s = new THREE.CylinderGeometry(0.006, 0.02, spikeLen, 5)
        s.translate(tx, ty + spikeLen / 2, tz)
        add(paint(s, flowerCol, rnd()))
        if (bloom) { // seitliche Einzelblütchen an der Ähre
          const nf = 5 + Math.floor(rnd() * 3)
          for (let k = 0; k < nf; k++) ball(tx + (rnd() - 0.5) * 0.05, ty + spikeLen * (0.2 + 0.7 * k / nf), tz + (rnd() - 0.5) * 0.05, 0.016, flowerCol, 0.9)
        }
      } else if (arche === 'dolde') {
        const [tx, ty, tz] = stem(sx, sz, H * (0.8 + rnd() * 0.18))
        const r = Math.max(0.03, H * 0.08)
        if (bloom) for (let k = 0; k < 11; k++) { // Einzelblüten der Dolde
          const ang = rnd() * Math.PI * 2, dd = Math.sqrt(rnd()) * r
          ball(tx + Math.cos(ang) * dd, ty + 0.01 + (rnd() - 0.5) * 0.01, tz + Math.sin(ang) * dd, 0.012, flowerCol, 0.7)
        } else ball(tx, ty + 0.008, tz, r * 0.7, flowerCol, 0.45)
      } else if (arche === 'glocke') {
        const [tx, ty, tz] = stem(sx, sz, H * (0.72 + rnd() * 0.22))
        const nb = 2 + Math.floor(rnd() * 2)
        for (let k = 0; k < nb; k++) ball(tx + (rnd() - 0.5) * 0.04, ty - k * Math.max(0.03, H * 0.07), tz + (rnd() - 0.5) * 0.04, 0.022, flowerCol, 1.25)
      } else { // korb, geophyt & Standard → Strahlenblüte mit Blütenblättern
        const [tx, ty, tz] = stem(sx, sz, H * (0.7 + rnd() * 0.25))
        if (bloom && arche !== 'geophyt') corolla(tx, ty + 0.012, tz, Math.max(0.02, H * 0.05), flowerCol, '#9a6a10')
        else ball(tx, ty + 0.012, tz, Math.max(0.022, H * 0.05), flowerCol, 0.6)
      }
    }
  }

  const merged = mergeGeometries(parts, false)
  parts.forEach(p => p.dispose())
  merged.computeVertexNormals()
  merged.computeBoundingSphere()
  if (cache.size >= MAX_CACHE) { for (const g of cache.values()) g.dispose(); cache.clear() }
  cache.set(key, merged)
  return merged
}

export function disposePlantGeometryCache() {
  for (const g of cache.values()) g.dispose()
  cache.clear()
}

// Wind-fähiges Lambert-Material: injiziert eine höhenabhängige Schwingung in den
// Vertex-Shader (onBeforeCompile). uTime/uWind sind geteilte Uniforms, damit ein
// rAF-Loop alle Instanzen gemeinsam animiert. Phase je Instanz aus ihrer
// Weltposition → jede Pflanze wiegt sich leicht versetzt.
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
