// Erzeugt eine Beispiel-Splat-Aufnahme als GLB.
//
//   node scripts/gen-splat-beispiel.mjs [zielpfad]
//
// Wofür: der Fixture-Datenstand führt zwei 3D-Aufnahmen. Ohne eine wirklich
// vorhandene Datei zeigt die Abnahme zwar die Liste, die Herkunft und das
// Ladeverhalten — aber wer in der Abnahme auf „Aufnahme laden" klickt, bekäme
// einen 404. Eine Fixture, die auf eine Datei zeigt, die es nicht gibt, ist
// eine halbe Fixture.
//
// Die Datei wird beim Abnahme-Build nach dist-abnahme/ geschrieben und **nicht**
// mit ausgeliefert: in der Produktionsfassung hätte sie nichts zu suchen.
//
// Deterministisch: derselbe Aufruf erzeugt Byte für Byte dieselbe Datei. Nur
// deshalb kann in fixtures/ground_truth.sql eine echte Dateigröße stehen.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bauGlb } from '../fixtures/splat-beispiel.mjs'
import { ATTRIBUT } from '../src/biome/splat.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ZIEL = process.argv[2] || join(ROOT, 'dist-abnahme', 'beispiel-splat.glb')

/** Zufallszahlen mit festem Startwert — sonst wäre die Datei jedes Mal anders. */
function zufall(startwert) {
  let z = startwert >>> 0
  return () => {
    z ^= z << 13; z >>>= 0
    z ^= z >> 17
    z ^= z << 5; z >>>= 0
    return z / 4294967296
  }
}

const r = zufall(20260815)
/** Gleichverteilt zwischen a und b. */
const zw = (a, b) => a + (b - a) * r()

const pos = []
const rot = []
const skala = []
const deck = []
const sh0 = []

/**
 * Legt eine Gaußfunktion ab.
 * @param {number[]} p  Mittelpunkt
 * @param {number[]} s  Halbachsen
 * @param {number[]} f  Diffusfarbe 0..1
 * @param {number} a    Deckkraft
 */
function splat(p, s, f, a) {
  pos.push(p)
  // Zufällige, aber normierte Ausrichtung.
  const q = [zw(-1, 1), zw(-1, 1), zw(-1, 1), zw(-1, 1)]
  const l = Math.hypot(...q) || 1
  rot.push(q.map(w => w / l))
  skala.push(s)
  deck.push(a)
  // Rückrechnung der Spezifikationsformel: SH0 = (Farbe − 0,5) / 0,2820947917738781
  sh0.push(f.map(w => (w - 0.5) / 0.2820947917738781))
}

// Ein Stück Rasen.
for (let i = 0; i < 2600; i++) {
  const x = zw(-4, 4)
  const z = zw(-4, 4)
  const gruen = zw(0.32, 0.55)
  splat([x, zw(-0.02, 0.03), z], [zw(0.05, 0.12), zw(0.01, 0.03), zw(0.05, 0.12)],
    [gruen * 0.45, gruen, gruen * 0.3], zw(0.55, 0.95))
}

// Ein Stamm.
for (let i = 0; i < 500; i++) {
  const h = zw(0, 1.9)
  const w = zw(0, Math.PI * 2)
  const rad = 0.13 * (1 - h / 6)
  const braun = zw(0.25, 0.42)
  splat([Math.cos(w) * rad, h, Math.sin(w) * rad], [zw(0.02, 0.05), zw(0.04, 0.09), zw(0.02, 0.05)],
    [braun, braun * 0.72, braun * 0.5], zw(0.7, 1))
}

// Eine Krone.
for (let i = 0; i < 2400; i++) {
  // Punkte in einer Kugel, zur Mitte hin dichter.
  const u = r(), v = r(), w = Math.cbrt(zw(0.15, 1))
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const rad = 1.35 * w
  const gruen = zw(0.3, 0.62)
  splat(
    [rad * Math.sin(phi) * Math.cos(theta), 2.5 + rad * Math.cos(phi) * 0.8, rad * Math.sin(phi) * Math.sin(theta)],
    [zw(0.06, 0.16), zw(0.06, 0.16), zw(0.06, 0.16)],
    [gruen * 0.4, gruen, gruen * 0.28],
    zw(0.35, 0.8),
  )
}

const glb = bauGlb([
  { name: ATTRIBUT.position, werte: pos, typ: 'VEC3' },
  { name: ATTRIBUT.rotation, werte: rot, typ: 'VEC4' },
  { name: ATTRIBUT.skala, werte: skala, typ: 'VEC3' },
  { name: ATTRIBUT.deckkraft, werte: deck, typ: 'SCALAR' },
  { name: ATTRIBUT.sh0, werte: sh0, typ: 'VEC3' },
])

mkdirSync(dirname(ZIEL), { recursive: true })
writeFileSync(ZIEL, Buffer.from(glb))
console.log(`${ZIEL} geschrieben — ${pos.length} Gaußfunktionen, ${glb.byteLength} Byte`)
