// Regressionstest für src/lib/einsatzAbschluss.js
//
//   node scripts/test-einsatz-abschluss.mjs
import { dauerStunden, vorschlagStunden } from '../src/lib/einsatzAbschluss.js'

let ok = 0, fehler = 0
function pruefe(bedingung, text) {
  if (bedingung) { ok++; console.log(`  ok  ${text}`) }
  else { fehler++; console.log(`  FEHLER  ${text}`) }
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)

pruefe(dauerStunden('08:00', '14:30') === 6.5, 'Dauer 08:00–14:30 = 6,5 h')
pruefe(dauerStunden('08:00:00', '09:10:00') === 1.25, 'Sekunden-Format, auf Viertelstunden gerundet')
pruefe(dauerStunden('14:00', '08:00') === null, 'Ende vor Beginn → nicht bestimmbar')
pruefe(dauerStunden('08:00', null) === null, 'fehlendes Ende → nicht bestimmbar')

const job = { assigned_users: ['jona', 'anselm'], start_time: '08:00', end_time: '14:00', planned_hours: 20 }
pruefe(gleich(vorschlagStunden(job), { jona: 6, anselm: 6 }), 'Uhrzeiten vorhanden → Dauer je Person (Soll wird ignoriert)')

const ohneZeit = { assigned_users: ['jona', 'anselm'], start_time: '08:00', end_time: null, planned_hours: 9 }
pruefe(gleich(vorschlagStunden(ohneZeit), { jona: 4.5, anselm: 4.5 }), 'ohne Ende → Soll gleich verteilt')

const nichts = { assigned_users: ['jona'], start_time: null, end_time: null, planned_hours: null }
pruefe(gleich(vorschlagStunden(nichts), { jona: '' }), 'ohne Zeit und Soll → leer statt geraten')

const gebucht = [{ user_id: 'jona', hours: 4 }, { user_id: 'anselm', hours: 6 }]
pruefe(gleich(vorschlagStunden(job, gebucht), { jona: 2, anselm: '' }), 'bereits Gebuchtes wird abgezogen, nichts doppelt')

pruefe(gleich(vorschlagStunden({ assigned_users: [] }), {}), 'niemand eingeteilt → kein Vorschlag')
pruefe(gleich(vorschlagStunden(null), {}), 'kein Einsatz → kein Vorschlag')

console.log(`\n═══ Einsatz-Abschluss: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
