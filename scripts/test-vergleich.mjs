// Regressionstest für src/lib/vergleich.js
//
//   node scripts/test-vergleich.mjs
import { clipPolygone, vergleichsKandidaten } from '../src/lib/vergleich.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

const c = clipPolygone({ x: -100, y: 20 }, { x: 800, y: 600 }, 0.5)
pruefe(c.links === 'polygon(-100px 20px, 300px 20px, 300px 620px, -100px 620px)', 'linke Hälfte bis zur Schiebermitte (Layer-Koordinaten)')
pruefe(c.rechts === 'polygon(300px 20px, 700px 20px, 700px 620px, 300px 620px)', 'rechte Hälfte ab der Schiebermitte')
const g = clipPolygone({ x: 0, y: 0 }, { x: 800, y: 600 }, 1.7)
pruefe(g.links.includes('800px 0px') && g.rechts.startsWith('polygon(800px'), 'Anteil über 1 wird begrenzt')
pruefe(clipPolygone({ x: 0, y: 0 }, { x: 800, y: 600 }, NaN).links.includes('400px'), 'ungültiger Anteil → Mitte')

const f = (id, projekt, datum, typ = 'drone_image') => ({ id, project_id: projekt, feature_type: typ, created_at: datum, geometry: {}, properties: typ === 'drone_image' ? { image_url: 'x' } : { tiles_url: 'y' } })
const { liste, vorschlag } = vergleichsKandidaten([
  f('n1', 'nord', '2024-05-01'),
  f('s2', 'sued', '2026-07-01', 'ortho_tiles'),
  f('s1', 'sued', '2025-06-01'),
  f('s0', 'sued', '2023-06-01'),
  { id: 'baum', project_id: 'sued', feature_type: 'tree', geometry: {}, properties: {} },
  { ...f('ohne', 'sued', '2026-01-01'), properties: {} },
])
pruefe(liste.map(x => x.id).join() === 's0,n1,s1,s2', 'nur Luftbilder mit Bild/Kacheln, älteste zuerst')
pruefe(vorschlag?.a === 's1' && vorschlag?.b === 's2', 'Vorschlag: die zwei jüngsten Aufnahmen des Projekts mit den meisten Bildern')
pruefe(vergleichsKandidaten([f('a', 'p', '2026-01-01')]).vorschlag === null, 'nur ein Bild → kein Vorschlag')
const mitDatum = vergleichsKandidaten([{ ...f('x', 'p', '2026-09-01'), properties: { image_url: 'u', aufnahme_datum: '2020-01-01' } }, f('y', 'p', '2021-01-01')])
pruefe(mitDatum.liste[0].id === 'x', 'Aufnahmedatum geht vor dem Anlagedatum')

console.log(`\n═══ Zeitvergleich: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
