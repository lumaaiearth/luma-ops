// Regressionstest für src/lib/jahresbericht.js
//
//   node scripts/test-jahresbericht.mjs [--html pfad.html]   (schreibt optional eine Vorschau)
import { writeFileSync } from 'node:fs'
import { baueJahresbericht, jahresberichtHtml } from '../src/lib/jahresbericht.js'
import { buildLeistungsnachweis } from '../src/lib/leistungsnachweis.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

const quadrat = (w, s, e, n) => ({ type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] })
const projekt = { id: 'nord', name: 'Testfläche Nord', location: 'Berlin-Mitte' }
const objekte = [
  { id: 'f', project_id: 'nord', feature_type: 'area', geometry: quadrat(13.3768, 52.5158, 13.3786, 52.5168) },
  { id: 'b1', project_id: 'nord', feature_type: 'bed', geometry: quadrat(13.3772, 52.5161, 13.3777, 52.5164) },
  { id: 'b2', project_id: 'nord', feature_type: 'bed', geometry: quadrat(13.3790, 52.5161, 13.3792, 52.5162) },   // außerhalb
  { id: 't1', project_id: 'nord', feature_type: 'tree', geometry: { type: 'Point', coordinates: [13.378, 52.5163] }, properties: { baumart_deutsch: 'Winter-Linde', letzte_kontrolle: '2026-05-04' } },
  { id: 't2', project_id: 'nord', feature_type: 'tree', geometry: { type: 'Point', coordinates: [13.379, 52.5163] }, properties: { baumart_deutsch: 'Spitz-Ahorn', letzte_kontrolle: '2025-05-04' } },
  { id: 'x', project_id: 'sued', feature_type: 'tree', geometry: { type: 'Point', coordinates: [13.4, 52.5] }, properties: {} },
]
const nachweis = buildLeistungsnachweis({
  leistungen: [
    { project_id: 'nord', date: '2026-04-10', stunden: 6, leistungen: 'Frühjahrsschnitt' },
    { project_id: 'nord', date: '2026-06-02', stunden: 4.5, leistungen: 'Jäten' },
    { project_id: 'nord', date: '2025-06-02', stunden: 9, leistungen: 'Vorjahr' },
  ],
  projekte: [projekt], plaene: [{ project_id: 'nord', jahr: 2026, soll_stunden: 20 }],
  fotos: [{ project_id: 'nord', url: 'https://x/a.jpg', einsatz_datum: '2026-04-10' }],
  jahr: 2026,
})
const gaenge = [{ status: 'erledigt' }, { status: 'erledigt' }, { status: 'geplant' }, { status: 'entfallen' }]
const einsaetze = [
  { project_id: 'nord', date: '2026-04-10', job_type: 'pflege', status: 'done' },
  { project_id: 'nord', date: '2026-08-01', job_type: 'giessen', status: 'planned' },
  { project_id: 'nord', date: '2025-08-01', job_type: 'giessen', status: 'done' },
  { project_id: 'sued', date: '2026-08-01', job_type: 'pflege', status: 'done' },
]
const plaene = [{ projekt_id: 'nord', titel: 'Staudenbeet <Süd>', flaeche_m2: 112, positionen: [
  { count: 10, heimisch: true, bluete_monate: [4, 5] }, { count: 30, heimisch: false, bluete_monate: [7, 8, 9] }, { count: 0, heimisch: true, bluete_monate: [1] },
], habitate: [{ count: 2 }, {}] }]

const b = baueJahresbericht({ projekt, kunde: { name: 'Hausverwaltung A' }, jahr: 2026, objekte, nachweis, gaenge, einsaetze, plaene, heute: new Date('2026-12-15') })

pruefe(b.flaeche.projektflaecheM2 > 13000 && b.flaeche.projektflaecheM2 < 14000, `Projektfläche aus der Geometrie, ~122 m × 111 m (${b.flaeche.projektflaecheM2} m²)`)
pruefe(b.flaeche.beete === 2 && b.flaeche.beeteAusserhalb === 1, 'Beete gezählt, eins außerhalb der Projektfläche erkannt')
pruefe(b.flaeche.baeume === 2, 'Bäume nur dieses Projekts')
pruefe(b.pflege.gaengeGesamt === 3 && b.pflege.gaengeErledigt === 2 && b.pflege.gaengeOffen === 1 && b.pflege.gaengeEntfallen === 1, 'Pflegegänge: entfallene zählen nicht als geplant')
pruefe(b.pflege.stundenIst === 10.5 && b.pflege.stundenSoll === 20 && Math.round(b.pflege.erfuellung) === 53, 'Stunden nur 2026, Soll aus dem Plan, Erfüllung 53 %')
pruefe(b.pflege.monate[3].stunden === 6 && b.pflege.monate[5].stunden === 4.5, 'Monatsverlauf aus dem Leistungsnachweis')
pruefe(b.einsaetze.gesamt === 2 && b.einsaetze.erledigt === 1 && b.einsaetze.nachArt.map(a => a.art).join() === 'Pflege,Gießen', 'Einsätze nur dieses Projekts und Jahres, nach Art')
pruefe(b.baeume.kontrolliert === 1 && b.baeume.ohneKontrolle === 1 && b.baeume.arten.join() === 'Spitz-Ahorn,Winter-Linde', 'Baumkontrollen im Jahr gezählt, Arten sortiert')
const pl = b.pflanzung[0]
pruefe(pl.pflanzen === 40 && pl.arten === 2 && pl.heimischPct === 25 && pl.bluehMonate.join() === 'Apr,Mai,Jul,Aug,Sep' && pl.habitate === 3, 'Pflanzplan: Pflanzen, heimisch-Anteil, Blühmonate, Habitate (Positionen mit 0 zählen nicht)')
pruefe(b.fotos.length === 1 && b.fotosGesamt === 1, 'Fotos aus dem Leistungsnachweis')

const html = jahresberichtHtml(b, { autoPrint: false })
pruefe(html.includes('Jahresbericht 2026') && html.includes('Hausverwaltung A') && html.includes('2 von 3 erledigt'), 'HTML: Kopf und Pflegegänge')
pruefe(html.includes('Staudenbeet &lt;Süd&gt;') && !html.includes('<Süd>'), 'Freitext wird maskiert')
pruefe(html.includes('keine Aussage darüber, ob eine Kontrolle fällig war'), 'Baumteil sagt, was die Zahl nicht bedeutet')
pruefe(!html.includes('window.print'), 'ohne autoPrint kein Druckdialog')

// Leere Fläche: nichts erfunden
const leer = baueJahresbericht({ projekt: { id: 'neu', name: 'Neu' }, jahr: 2026 })
const leerHtml = jahresberichtHtml(leer, { autoPrint: false })
pruefe(leer.flaeche === null && leer.baeume === null && leer.pflanzung.length === 0 && leer.pflege.stundenIst === 0, 'leere Fläche: keine erfundenen Werte')
pruefe(leerHtml.includes('nicht erfasst') && leerHtml.includes('Kein Pflanzplan hinterlegt'), 'leere Fläche: „nicht erfasst“ statt Lücke')

const i = process.argv.indexOf('--html')
if (i > 0) writeFileSync(process.argv[i + 1], jahresberichtHtml(b, { autoPrint: false }))

console.log(`\n═══ Jahresbericht: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
