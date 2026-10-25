// Regressionstest für die Rechenteile von src/lib/offlineKacheln.js
//
//   node scripts/test-offline-kacheln.mjs
import { projektGebiet, kachelListe, xyzUrl, feinsteStufe, OFFLINE_ERLAUBT } from '../src/lib/offlineKacheln.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

const p = { id: 'nord', lat: 52.5163, lng: 13.3777 }
const features = [
  { project_id: 'nord', geometry: { type: 'Polygon', coordinates: [[[13.3768, 52.5158], [13.3786, 52.5158], [13.3786, 52.5168], [13.3768, 52.5168], [13.3768, 52.5158]]] } },
  { project_id: 'nord', geometry: { type: 'Point', coordinates: [13.3790, 52.5163] } },
  { project_id: 'fremd', geometry: { type: 'Point', coordinates: [13.50, 52.40] } },
]
const g = projektGebiet(p, features)
pruefe(g && g[0] < 13.3768 && g[2] > 13.3790 && g[1] < 52.5158 && g[3] > 52.5168, 'Gebiet umfasst alle Objekte des Projekts (mit Rand)')
pruefe(g[2] < 13.40, 'Objekte anderer Projekte zählen nicht')
const randM = (52.5158 - g[1]) * 111320
pruefe(Math.abs(randM - 60) < 1, `Rand 60 m (${randM.toFixed(1)} m)`)
const nurPin = projektGebiet(p, [])
pruefe(nurPin && Math.abs((nurPin[3] - 52.5163) * 111320 - 250) < 1, 'ohne Objekte: 250 m um den Pin')
pruefe(projektGebiet({ id: 'leer' }, []) === null, 'ohne Objekte und Pin → null')

const kacheln = kachelListe(g, 14, 18)
const z14 = kacheln.filter(k => k.z === 14)
pruefe(z14.length >= 1 && z14.length <= 4, `Zoom 14: wenige Kacheln (${z14.length})`)
const z18 = kacheln.filter(k => k.z === 18).length
pruefe(z18 > z14.length && kacheln.every(k => Number.isInteger(k.x) && Number.isInteger(k.y)), `Zoom 18: mehr Kacheln (${z18}), ganzzahlig`)
pruefe(kachelListe(g, 14, 20).length < 1000, `Projektgebiet Zoom 14–20 bleibt handlich (${kachelListe(g, 14, 20).length} Kacheln)`)

pruefe(xyzUrl('https://x/{z}/{y}/{x}.png', { z: 16, x: 1, y: 2 }) === 'https://x/16/2/1.png', 'XYZ-Vorlage ({z}/{y}/{x} wie basemap.de)')
pruefe(xyzUrl('https://{s}.t/{z}/{x}/{y}', { z: 1, x: 0, y: 0 }) === 'https://a.t/1/0/0', 'Unterdomäne {s} → a')
pruefe(feinsteStufe({ maxNativeZoom: 21 }) === 20 && feinsteStufe({}) === 19, 'feinste Stufe: höchstens 20, sonst 19')
pruefe(!OFFLINE_ERLAUBT.has('osm') && !OFFLINE_ERLAUBT.has('satellite') && OFFLINE_ERLAUBT.has('luftbild_berlin'), 'OSM/Esri nicht vorab, amtliches Luftbild ja')

console.log(`\n═══ Offline-Kacheln: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
