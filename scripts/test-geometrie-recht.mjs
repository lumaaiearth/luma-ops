// Regressionstest für src/lib/geometrieRecht.js
//
//   node scripts/test-geometrie-recht.mjs
import { darfGeometrieAendern } from '../src/lib/geometrieRecht.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

const jetzt = Date.parse('2026-10-24T12:00:00Z')
const ich = 'u-1'
const frisch = { feature_type: 'tree', created_by: ich, created_at: '2026-10-24T08:00:00Z' }
const alt = { ...frisch, created_at: '2026-10-22T08:00:00Z' }
const fremd = { ...frisch, created_by: 'u-2' }
const altbestand = { feature_type: 'area', created_by: null, created_at: '2026-08-01T08:00:00Z' }
const ma = { isMitarbeiter: true, userId: ich, jetzt }

pruefe(darfGeometrieAendern(frisch, ma), 'Mitarbeiter: eigenes Objekt von heute → ja')
pruefe(!darfGeometrieAendern(alt, ma), 'Mitarbeiter: eigenes Objekt älter als 24 h → nein')
pruefe(darfGeometrieAendern({ ...frisch, created_at: '2026-10-23T12:00:00Z' }, ma), 'genau 24 h → noch ja')
pruefe(!darfGeometrieAendern(fremd, ma), 'Mitarbeiter: fremdes Objekt → nein')
pruefe(!darfGeometrieAendern(altbestand, ma), 'Mitarbeiter: Altbestand ohne Ersteller → nein')
pruefe(darfGeometrieAendern(altbestand, { isAdmin: true, isMitarbeiter: true, jetzt }), 'Admin: Altbestand → ja')
pruefe(!darfGeometrieAendern(frisch, { userId: ich, jetzt }), 'Kunde/Gast (kein Mitarbeiter) → nein, auch beim eigenen Objekt')
pruefe(!darfGeometrieAendern({ ...frisch, feature_type: 'drone_image' }, { isAdmin: true, jetzt }), 'Luftbilder nie, auch Admin nicht')
pruefe(!darfGeometrieAendern({ ...frisch, created_at: null }, ma), 'ohne Anlagedatum → nein')
pruefe(!darfGeometrieAendern(null, { isAdmin: true }), 'kein Objekt → nein')

console.log(`\n═══ Geometrie-Recht: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
