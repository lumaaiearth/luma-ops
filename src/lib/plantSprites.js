// Prozedurale Pflanzenporträts für die isometrische 3D-Ansicht.
// Malt aus (Archetyp, Höhe, Ausbreitung, Blütenfarbe, Saison-Zustand,
// Wuchsstufe) ein Offscreen-Canvas-Sprite. Deterministisch (seeded) und pro
// Kombination gecacht → 500–1000 Pflanzen bleiben auf dem Handy flüssig.
import { hashStr, deriveArchetype } from './beetLayout.js'

function mulberry(seed) {
  let a = seed >>> 0
  return () => { a += 0x6D2B79F5; let r = Math.imul(a ^ (a >>> 15), a | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
}

const cache = new Map()
const MAX_CACHE = 900

// Basisbreite eines Sprites in px; Höhe wächst mit der realen Pflanzenhöhe.
const SPR_W = 90
// px pro Meter Pflanzenhöhe im Sprite (Renderskalierung gleicht die Beetgröße an).
const PX_PER_M = 210

// key: art + zustand + wuchsstufe + variante
export function plantSprite(plant, state, growth, bucket, variant) {
  const arche = plant._arche || (plant._arche = deriveArchetype(plant))
  const key = plant.id + '|' + state + '|' + bucket + '|' + variant
  const hit = cache.get(key)
  if (hit) return hit

  const hM = ((plant.hoehe?.[1] ?? 50) / 100) * growth
  const H = Math.max(20, hM * PX_PER_M)
  const wPx = SPR_W, hPx = Math.ceil(H + 30)
  const cv = document.createElement('canvas')
  cv.width = wPx; cv.height = hPx
  const g = cv.getContext('2d')
  const rnd = mulberry(hashStr(key))
  const baseX = wPx / 2, baseY = hPx - 4
  const bloom = state === 'bloom', seed = state === 'seed'
  const leaf = seed ? '#8a8a52' : '#4d7c3f'
  const leaf2 = seed ? '#a39a5e' : '#65953f'
  const flower = seed ? '#b09256' : (plant.bluete_farbe || '#c47ad6')

  function tuft(x, y, r, col, n, alpha) {
    g.fillStyle = col; g.globalAlpha = alpha
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.5) * r, s = 1 + rnd() * 2.2
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, s, 0, 7); g.fill()
    }
    g.globalAlpha = 1
  }
  function stem(x0, lean, len, w) {
    g.strokeStyle = rnd() < 0.5 ? leaf : leaf2; g.lineWidth = w
    g.beginPath(); g.moveTo(x0, baseY)
    g.quadraticCurveTo(x0 + lean * 0.4, baseY - len * 0.6, x0 + lean, baseY - len); g.stroke()
    return [x0 + lean, baseY - len]
  }

  const spreadPx = Math.max(8, (plant.ausbreitung || plant.pflanzabstand || 40) / 100 * PX_PER_M * 0.5 * growth)

  if (arche === 'baum' || arche === 'strauch') {
    const trunkH = arche === 'baum' ? H * 0.42 : H * 0.16
    g.strokeStyle = '#6b4e2e'; g.lineWidth = arche === 'baum' ? 6 : 3
    g.beginPath(); g.moveTo(baseX, baseY); g.lineTo(baseX, baseY - trunkH); g.stroke()
    const crownR = Math.min(wPx * 0.48, spreadPx)
    const cy = baseY - trunkH - crownR * 0.55
    tuft(baseX, cy, crownR, leaf, 90, 0.9)
    tuft(baseX, cy, crownR * 0.8, leaf2, 60, 0.7)
    if (bloom) tuft(baseX, cy, crownR * 0.9, flower, 40, 0.55)
    else if (seed) tuft(baseX, cy, crownR * 0.85, flower, 22, 0.4)
  } else {
    // Blattfuß für alle Krautigen
    tuft(baseX, baseY - 5, spreadPx * 0.9, leaf, 26, 0.85)
    tuft(baseX, baseY - 9, spreadPx * 0.7, leaf2, 16, 0.7)
  }

  if (arche === 'aehre') {
    const n = 5 + Math.floor(rnd() * 4)
    for (let i = 0; i < n; i++) {
      const [tx, ty] = stem(baseX + (rnd() - 0.5) * spreadPx, (rnd() - 0.5) * 16, H * (0.75 + rnd() * 0.3), 1.4)
      const spikeLen = H * 0.32
      for (let s = 0; s < 10; s++) {
        const yy = ty + s * spikeLen / 10
        if (bloom) tuft(tx + (rnd() - 0.5) * 3, yy, 3.2, flower, 4, 0.9)
        else tuft(tx + (rnd() - 0.5) * 2, yy, 2, seed ? flower : leaf2, 2, 0.8)
      }
    }
  } else if (arche === 'dolde') {
    const n = 4 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) {
      const [tx, ty] = stem(baseX + (rnd() - 0.5) * spreadPx, (rnd() - 0.5) * 14, H * (0.8 + rnd() * 0.25), 1.6)
      const r = 8 + rnd() * 5
      if (bloom) for (let k = 0; k < 14; k++) { const a = Math.PI * (1 + rnd()); tuft(tx + Math.cos(a) * r, ty + Math.sin(a) * r * 0.45, 2.6, flower, 3, 0.95) }
      else tuft(tx, ty, 4, seed ? flower : leaf2, 6, 0.8)
    }
  } else if (arche === 'korb') {
    const n = 5 + Math.floor(rnd() * 4)
    for (let i = 0; i < n; i++) {
      const [tx, ty] = stem(baseX + (rnd() - 0.5) * spreadPx, (rnd() - 0.5) * 13, H * (0.7 + rnd() * 0.35), 1.4)
      if (bloom) { tuft(tx, ty, 5.5, flower, 12, 0.95); g.fillStyle = '#9a6a10'; g.beginPath(); g.arc(tx, ty, 2, 0, 7); g.fill() }
      else tuft(tx, ty, 3, seed ? flower : leaf2, 4, 0.85)
    }
  } else if (arche === 'glocke') {
    const n = 4 + Math.floor(rnd() * 4)
    for (let i = 0; i < n; i++) {
      const [tx, ty] = stem(baseX + (rnd() - 0.5) * spreadPx, (rnd() - 0.5) * 18, H * (0.7 + rnd() * 0.3), 1.3)
      if (bloom) for (let k = 0; k < 3; k++) tuft(tx + (rnd() - 0.5) * 6, ty + k * 5, 3.4, flower, 5, 0.9)
      else tuft(tx, ty, 3, seed ? flower : leaf2, 3, 0.8)
    }
  } else if (arche === 'geophyt') {
    const n = 3 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) {
      const [tx, ty] = stem(baseX + (rnd() - 0.5) * spreadPx * 0.6, (rnd() - 0.5) * 6, H * (0.8 + rnd() * 0.2), 1.6)
      if (bloom) tuft(tx, ty, 4, flower, 7, 0.95)
      else tuft(tx, ty, 3, leaf2, 4, 0.8)
    }
  } else if (arche === 'decker') {
    for (let i = 0; i < 28; i++) {
      const x = baseX + (rnd() - 0.5) * wPx * 0.85, y = baseY - 2 - rnd() * Math.max(6, H * 0.6)
      tuft(x, y, 4, leaf, 4, 0.8)
      if (bloom && rnd() < 0.75) tuft(x, y - 2, 3, flower, 4, 0.95)
      else if (seed && rnd() < 0.3) tuft(x, y - 2, 2, flower, 2, 0.6)
    }
  } else if (arche === 'gras') {
    const n = 12 + Math.floor(rnd() * 6)
    for (let i = 0; i < n; i++) {
      const lean = (rnd() - 0.5) * 26
      g.strokeStyle = rnd() < 0.4 ? '#8a9a5b' : leaf; g.lineWidth = 1
      g.beginPath(); g.moveTo(baseX + (rnd() - 0.5) * 10, baseY)
      g.quadraticCurveTo(baseX + lean * 0.4, baseY - H * 0.7, baseX + lean, baseY - H * (0.8 + rnd() * 0.3)); g.stroke()
      if ((bloom || seed) && rnd() < 0.5) tuft(baseX + lean, baseY - H * (0.85 + rnd() * 0.2), 2.2, flower, 3, 0.8)
    }
  }

  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(key, cv)
  return cv
}

export const SPRITE_PX_PER_M = PX_PER_M
export function clearSpriteCache() { cache.clear() }
