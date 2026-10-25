// Regressionstest für die Rechenteile von src/lib/orthoKacheln.js
//
//   node scripts/test-ortho-kacheln.mjs
import { zuPixel, ausPixel, aufloesung, zoomFuerAufloesung, kachelBereich, schaetzung, abtasten, verschachtelt } from '../src/lib/orthoKacheln.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }
const nahe = (a, b, tol) => Math.abs(a - b) <= tol

// Kachelrechnung gegen bekannte Werte: Nullpunkt in der Weltmitte, Berlin-Mitte liegt in OSM-Kachel 10/550/335
const [mx, my] = zuPixel(0, 0, 0)
pruefe(nahe(mx, 128, 1e-9) && nahe(my, 128, 1e-9), 'Länge 0 / Breite 0 = Mitte der Weltkachel')
const [bx, by] = zuPixel(13.4050, 52.5200, 10)
pruefe(Math.floor(bx / 256) === 550 && Math.floor(by / 256) === 335, `Berlin-Mitte z10 = 550/335 (${Math.floor(bx / 256)}/${Math.floor(by / 256)})`)
const [px, py] = zuPixel(13.377704, 52.516275, 18)
const [lng, lat] = ausPixel(px, py, 18)
pruefe(nahe(lng, 13.377704, 1e-9) && nahe(lat, 52.516275, 1e-9), 'Pixel → Position ist die genaue Umkehrung')
pruefe(nahe(aufloesung(22, 52.5), 0.0227, 0.0005), `Zoom 22 in Berlin ≈ 2,3 cm/px (${(aufloesung(22, 52.5) * 100).toFixed(2)} cm)`)
pruefe(zoomFuerAufloesung(0.025, 52.5) === 22, 'Drohne 2,5 cm/px → Zoom 22')
pruefe(zoomFuerAufloesung(0.2, 52.5) === 19, 'DOP 20 cm/px → Zoom 19')
pruefe(zoomFuerAufloesung(0.005, 52.5) === 22, 'feiner als Zoom 22 → auf 22 begrenzt')
pruefe(zoomFuerAufloesung(0, 52) === null, 'ohne Auflösung → null')

// 300 m × 200 m bei der Testfläche
const ecken = [[13.3760, 52.5175], [13.3804, 52.5175], [13.3804, 52.5157], [13.3760, 52.5157]]
const b = kachelBereich(ecken, 20)
const breiteKacheln = b.x1 - b.x0 + 1
// 300 m / (256 px × 9,1 cm) ≈ 13 Kacheln
pruefe(breiteKacheln >= 12 && breiteKacheln <= 15, `300 m auf Zoom 20 ≈ 13 Kacheln breit (${breiteKacheln})`)
const s = schaetzung(ecken, 16, 20)
pruefe(s.kacheln > 150 && s.kacheln < 400, `Schätzung Zoom 16–20: ${s.kacheln} Kacheln, ≈ ${s.mb} MB`)
pruefe(schaetzung(ecken, 16, 22).kacheln > 4 * schaetzung(ecken, 16, 20).kacheln, 'zwei Stufen feiner ≈ 16× so viele Kacheln an der feinsten Stufe')

// Abtasten: 4×4-Quelle (RGB), Ausschnitt genau deckungsgleich → 1:1
const daten = []
for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) daten.push(x * 60, y * 60, 7)
const quelle = { daten, breite: 4, hoehe: 4, kanaele: 3 }
const a = abtasten(quelle, [[0, 0], [4, 0], [4, 4], [0, 4]], 4, 4)
pruefe(!a.leer && a.rgba[0] === 0 && a.rgba[(1 * 4 + 3) * 4] === 180 && a.rgba[(1 * 4 + 3) * 4 + 1] === 60 && a.rgba[3] === 255, 'deckungsgleich: Pixel 1:1 übernommen, deckend')
// Ausschnitt halb außerhalb → rechte Hälfte durchsichtig
const h = abtasten(quelle, [[2, 0], [6, 0], [6, 4], [2, 4]], 4, 4)
pruefe(h.rgba[3] === 255 && h.rgba[(0 * 4 + 3) * 4 + 3] === 0, 'außerhalb der Quelle durchsichtig')
pruefe(abtasten(quelle, [[10, 10], [14, 10], [14, 14], [10, 14]], 4, 4).leer, 'ganz außerhalb → leer (wird nicht hochgeladen)')
// Schwarzer Rand ohne Alpha als durchsichtig
const schwarz = { daten: [0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9], breite: 2, hoehe: 2, kanaele: 3 }
const sw = abtasten(schwarz, [[0, 0], [2, 0], [2, 2], [0, 2]], 2, 2, { schwarzTransparent: true })
pruefe(sw.rgba[3] === 0 && sw.rgba[(2) * 4 + 3] === 255, 'schwarzer Nodata-Rand wird durchsichtig, Bildinhalt nicht')
// Alpha-Kanal der Quelle wird beachtet
const mitAlpha = { daten: [5, 5, 5, 0, 5, 5, 5, 255], breite: 2, hoehe: 1, kanaele: 4 }
const al = abtasten(mitAlpha, [[0, 0], [2, 0], [2, 1], [0, 1]], 2, 1)
pruefe(al.rgba[3] === 0 && al.rgba[7] === 255, 'Alpha 0 in der Quelle bleibt durchsichtig')
// Gedrehter Ausschnitt (90°): erste Zeile der Ausgabe = erste Spalte der Quelle
const d = abtasten(quelle, [[0, 4], [0, 0], [4, 0], [4, 4]], 4, 4)
pruefe(d.rgba[0] === 0 && d.rgba[1] === 180 && d.rgba[3 * 4 + 1] === 0, 'gedrehte Ecken werden richtig abgebildet')

pruefe(verschachtelt([[1, 2], [3, 4], [5, 6]], 2, 4).join() === '1,3,5,255,2,4,6,255', 'je Kanal getrennt → verschachtelt, fehlendes Alpha deckend')
const schon = new Uint8Array([1, 2, 3])
pruefe(verschachtelt(schon, 1, 3) === schon, 'schon verschachtelt → unverändert')

console.log(`\n═══ Ortho-Kacheln: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
