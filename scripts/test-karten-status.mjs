// Regressionstest für src/lib/kartenStatus.js
//
//   node scripts/test-karten-status.mjs
import { kartenStatusLesen, kartenStatusAbo, kartenStatusSetzen, massstab, koordinateKurz } from '../src/lib/kartenStatus.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

pruefe(kartenStatusLesen().aktiv === false, 'ohne Karte: nicht aktiv')
let meldungen = 0
const ab = kartenStatusAbo(() => meldungen++)
kartenStatusSetzen({ grundkarte: 'osm', zoom: 17 })
pruefe(kartenStatusLesen().aktiv && kartenStatusLesen().grundkarte === 'osm' && meldungen === 1, 'Setzen aktiviert und meldet')
const vorher = kartenStatusLesen()
kartenStatusSetzen({ zoom: 17 })
pruefe(meldungen === 1 && kartenStatusLesen() === vorher, 'unveränderter Wert: keine Meldung, gleiches Objekt (kein Neuzeichnen)')
kartenStatusSetzen({ cursor: { lat: 52.5, lng: 13.4 } })
pruefe(kartenStatusLesen().grundkarte === 'osm' && kartenStatusLesen().cursor.lat === 52.5 && meldungen === 2, 'Teilupdate behält den Rest')
kartenStatusSetzen(null)
pruefe(kartenStatusLesen().aktiv === false && kartenStatusLesen().grundkarte === null && meldungen === 3, 'Abbau setzt zurück')
ab()
kartenStatusSetzen({ zoom: 3 })
pruefe(meldungen === 3, 'nach Abmelden keine Meldung mehr')

// Zoom 17 in Berlin ≈ 1:2.600 → gerundet 1:2.500
pruefe(massstab(17, 52.5) === '1:2.500', `Maßstab Zoom 17 Berlin (${massstab(17, 52.5)})`)
pruefe(massstab(10, 52.5) === '1:350.000', `Maßstab Zoom 10 Berlin (${massstab(10, 52.5)})`)
pruefe(massstab(null, 52) === null, 'ohne Zoom kein Maßstab')
pruefe(koordinateKurz({ lat: 52.516312, lng: 13.378144 }) === '52.51631, 13.37814', 'Koordinate auf ~1 m')

console.log(`\n═══ Kartenstatus: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
