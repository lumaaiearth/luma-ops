// Regressionstest für src/lib/projektAusLage.js
//
//   node scripts/test-projekt-aus-lage.mjs
import { projektAusLage } from '../src/lib/projektAusLage.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

const quadrat = (w, s, e, n) => ({ type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] })
const features = [
  { id: 'gross', project_id: 'nord', feature_type: 'area', geometry: quadrat(13.3760, 52.5150, 13.3800, 52.5175) },
  { id: 'klein', project_id: 'innen', feature_type: 'area', geometry: quadrat(13.3775, 52.5160, 13.3780, 52.5165) },
  { id: 'beet',  project_id: 'fremd', feature_type: 'bed',  geometry: quadrat(13.3700, 52.5100, 13.3900, 52.5200) },
]
const projects = [
  { id: 'nord', lat: 52.5163, lng: 13.3777 },
  { id: 'sued', lat: 52.4875, lng: 13.4245 },
  { id: 'ohne-pin' },
]
const punkt = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] })

const a = projektAusLage(punkt(13.3770, 52.5155), features, projects)
pruefe(a?.projectId === 'nord' && a.grund === 'flaeche', 'Punkt in Projektfläche → deren Projekt')

const b = projektAusLage(punkt(13.37775, 52.51625), features, projects)
pruefe(b?.projectId === 'innen', 'überlappende Flächen → die kleinere gewinnt')

const c = projektAusLage(quadrat(13.3765, 52.5152, 13.3770, 52.5156), features, projects)
pruefe(c?.projectId === 'nord', 'Beet-Polygon: Schwerpunkt entscheidet')

const d = projektAusLage(punkt(13.4250, 52.4877), features, projects)
pruefe(d?.projectId === 'sued' && d.grund === 'naehe' && d.abstandM < 100, `keine Fläche, Projekt-Pin in der Nähe → Projekt (${d?.abstandM} m)`)

const e = projektAusLage(punkt(13.30, 52.45), features, projects)
pruefe(e === null, 'weit weg von allem → kein Vorschlag statt Raten')

pruefe(projektAusLage(punkt(13.3710, 52.5110), features, projects) === null, 'Beete zählen nicht als Projektfläche')
pruefe(projektAusLage(null, features, projects) === null, 'ohne Geometrie → null')

console.log(`\n═══ Projekt aus Lage: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
