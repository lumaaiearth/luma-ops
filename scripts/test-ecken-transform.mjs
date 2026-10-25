// Regressionstest für src/lib/eckenTransform.js
//
//   node scripts/test-ecken-transform.mjs
import { homographie, abbilden, matrix3d, bildEcken } from '../src/lib/eckenTransform.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }
const nahe = (p, q, tol = 1e-6) => Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol

// Leicht gedrehtes, verzerrtes Viereck (wie ein UTM-Bild in Web-Mercator)
const ziel = [[100, 50], [503, 58], [497, 352], [94, 344]]
const H = homographie(400, 300, ziel)
pruefe(!!H, 'Homographie lösbar')
pruefe(nahe(abbilden(H, 0, 0), ziel[0]) && nahe(abbilden(H, 400, 0), ziel[1]) && nahe(abbilden(H, 400, 300), ziel[2]) && nahe(abbilden(H, 0, 300), ziel[3]),
  'alle vier Bildecken landen genau auf ihren Eckpunkten')

// Achsparallel: reine Skalierung + Verschiebung
const H2 = homographie(100, 50, [[10, 20], [210, 20], [210, 120], [10, 120]])
pruefe(Math.abs(H2[0] - 2) < 1e-9 && Math.abs(H2[4] - 2) < 1e-9 && Math.abs(H2[6]) < 1e-12 && Math.abs(H2[7]) < 1e-12, 'Rechteck → Rechteck ist eine reine Skalierung (keine Perspektive)')
pruefe(nahe(abbilden(H2, 50, 25), [110, 70]), 'Bildmitte landet in der Zielmitte')

const css = matrix3d(400, 300, ziel)
pruefe(typeof css === 'string' && css.startsWith('matrix3d(') && css.split(',').length === 16, 'CSS matrix3d mit 16 Werten')
pruefe(homographie(400, 300, [[0, 0], [0, 0], [0, 0], [0, 0]]) === null, 'entartete Ecken (alle gleich) → null statt NaN')
pruefe(homographie(0, 300, ziel) === null, 'Bild ohne Breite → null')

// Ecken aus gespeicherter Geometrie
const neu = { properties: { eckgenau: true }, geometry: { type: 'Polygon', coordinates: [[[13.1, 52.6], [13.3, 52.61], [13.31, 52.5], [13.11, 52.49], [13.1, 52.6]]] } }
pruefe(JSON.stringify(bildEcken(neu)) === JSON.stringify([[13.1, 52.6], [13.3, 52.61], [13.31, 52.5], [13.11, 52.49]]), 'eckgenaues Bild: Ring = ol, or, ur, ul')
const alt = { properties: {}, geometry: { type: 'Polygon', coordinates: [[[13.1, 52.5], [13.3, 52.5], [13.3, 52.6], [13.1, 52.6], [13.1, 52.5]]] } }
pruefe(JSON.stringify(bildEcken(alt)) === JSON.stringify([[13.1, 52.6], [13.3, 52.6], [13.3, 52.5], [13.1, 52.5]]), 'altes Bild (Kasten s/w-Start): Ecken richtig abgeleitet')
pruefe(bildEcken({ geometry: null }) === null, 'ohne Geometrie → null')

console.log(`\n═══ Ecken-Transform: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
