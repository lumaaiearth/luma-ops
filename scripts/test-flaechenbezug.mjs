// Regressionstest für src/lib/flaechenBezug.js
//
//   node scripts/test-flaechenbezug.mjs
import { bezugDesBeets, beeteInFlaeche } from '../src/lib/flaechenBezug.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }
const q = (w, s, e, n) => ({ type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] })

const flaeche = { id: 'f', project_id: 'p', feature_type: 'area', geometry: q(13.3760, 52.5150, 13.3800, 52.5175) }
const innen   = { id: 'b1', project_id: 'p', feature_type: 'bed', geometry: q(13.3770, 52.5160, 13.3775, 52.5163) }
const halb    = { id: 'b2', project_id: 'p', feature_type: 'bed', geometry: q(13.3795, 52.5160, 13.3805, 52.5163) }
const aussen  = { id: 'b3', project_id: 'p', feature_type: 'bed', geometry: q(13.3900, 52.5160, 13.3905, 52.5163) }
const fremd   = { id: 'b4', project_id: 'x', feature_type: 'bed', geometry: q(13.3770, 52.5165, 13.3775, 52.5168) }
const alle = [flaeche, innen, halb, aussen, fremd]

pruefe(bezugDesBeets(innen, alle).status === 'innen', 'Beet ganz in der Projektfläche')
pruefe(bezugDesBeets(halb, alle).status === 'teilweise', 'Beet ragt über den Rand → teilweise')
pruefe(bezugDesBeets(aussen, alle).status === 'aussen', 'Beet außerhalb → aussen')
pruefe(bezugDesBeets(fremd, alle).status === 'keine_projektflaeche', 'Projekt ohne Projektfläche → keine_projektflaeche')
pruefe(bezugDesBeets(flaeche, alle) === null, 'eine Projektfläche ist kein Beet → null')

const s = beeteInFlaeche(flaeche, alle)
pruefe(s.beete.length === 2 && s.teilweise === 1, 'Fläche zählt Beete innen + teilweise, nicht außen, nicht fremdes Projekt')
pruefe(s.beetM2 > 0 && s.flaecheM2 > s.beetM2 && s.anteil > 0 && s.anteil < 1, `bepflanzter Anteil plausibel (${(s.anteil * 100).toFixed(1)} %)`)
pruefe(beeteInFlaeche(innen, alle) === null, 'ein Beet ist keine Projektfläche → null')

console.log(`\n═══ Flächenbezug: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
