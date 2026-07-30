// Prüfung der Messwert-Logik hinter den Sensor-Kacheln (Karte).
// Reine Rechenfunktionen — kein DB-Zugriff, läuft offline.
import { downsample, seriesStats, seriesSpan, STALE_TAGE, MAX_POINTS } from '../src/lib/sensorSeries.js'

let pass = 0, fail = 0
const eq = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      erwartet: ${JSON.stringify(expected)}\n      erhalten: ${JSON.stringify(actual)}`) }
}
const ok = (name, cond) => eq(name, !!cond, true)

const reihe = n => Array.from({ length: n }, (_, i) => ({ ts: 1000 + i, value: i }))

console.log('\n── downsample ──────────────────────────────────────────────')
eq('kurze Reihe bleibt unangetastet', downsample(reihe(5), 48), reihe(5))
eq('leere Reihe → leer', downsample([], 48), [])
eq('null → leer', downsample(null, 48), [])
eq('genau am Limit bleibt vollständig', downsample(reihe(48), 48).length, 48)

const dünn = downsample(reihe(1000), 48)
eq('lange Reihe wird auf das Limit gekürzt', dünn.length, 48)
// Der aktuelle Wert steht auf der Kachel — er darf beim Ausdünnen nicht wegfallen
eq('letzter Punkt bleibt erhalten', dünn[dünn.length - 1], { ts: 1999, value: 999 })
eq('erster Punkt bleibt erhalten', dünn[0], { ts: 1000, value: 0 })
ok('Reihenfolge bleibt aufsteigend', dünn.every((p, i) => i === 0 || p.ts > dünn[i - 1].ts))
eq('max = 1 liefert den jüngsten Punkt', downsample(reihe(100), 1), [{ ts: 1099, value: 99 }])
eq('Standard-Limit greift ohne Argument', downsample(reihe(500)).length, MAX_POINTS)

console.log('\n── seriesStats ─────────────────────────────────────────────')
eq('leere Reihe → null', seriesStats([]), null)
eq('null → null', seriesStats(null), null)

const s = seriesStats([{ value: 10 }, { value: 20 }, { value: 30 }])
eq('min', s.min, 10)
eq('max', s.max, 30)
eq('avg', s.avg, 20)
eq('delta = letzter − erster', s.delta, 20)
eq('points', s.points, 3)

// Fallende Bodenfeuchte: negatives Delta, damit die Kachel ▼ zeigt
eq('fallende Reihe → negatives Delta', seriesStats([{ value: 42 }, { value: 31.5 }]).delta, -10.5)

// Lücken in der DB dürfen Min/Ø nicht auf 0 ziehen
const mitLücken = seriesStats([{ value: 20 }, { value: null }, { value: 'kaputt' }, { value: 24 }])
eq('null/NaN werden verworfen: points', mitLücken.points, 2)
eq('null/NaN werden verworfen: min', mitLücken.min, 20)
eq('null/NaN werden verworfen: avg', mitLücken.avg, 22)

// Reihe nur aus Lücken zählt als „kein Verlauf", nicht als 0
eq('nur ungültige Werte → null', seriesStats([{ value: null }, { value: undefined }]), null)

// Niederschlag steht oft konstant auf 0 — Kennzahlen müssen trotzdem stimmen
const flach = seriesStats([{ value: 0 }, { value: 0 }, { value: 0 }])
eq('flache Reihe: min = max', [flach.min, flach.max], [0, 0])
eq('flache Reihe: Delta 0', flach.delta, 0)

eq('nackte Zahlen werden akzeptiert', seriesStats([1, 2, 3]).avg, 2)
eq('einzelner Punkt: points 1', seriesStats([{ value: 7 }]).points, 1)

console.log('\n── seriesSpan ──────────────────────────────────────────────')
const TAG = 24 * 3600 * 1000
const JETZT = Date.UTC(2026, 6, 30, 12)   // 30.07.2026, fest statt Date.now()

eq('leere Reihe → null', seriesSpan([], JETZT), null)
eq('Reihe ohne ts → null', seriesSpan([{ value: 5 }], JETZT), null)

// Genau die Lage in der Produktion: Messwerte vom 4.–11.7., Stand 30.7.
const alt = [
  { ts: Date.UTC(2026, 6, 4), value: 30 },
  { ts: Date.UTC(2026, 6, 11), value: 22 },
]
const sAlt = seriesSpan(alt, JETZT)
eq('Zeitraum wird aus den Daten beschriftet', sAlt.label, '4.7.–11.7.')
eq('Spanne in Tagen', sAlt.tage, 7)
ok('drei Wochen alte Reihe gilt als veraltet', sAlt.veraltet)
// 11.7. 00:00 → 30.7. 12:00 UTC sind 19,5 Tage
eq('Alter in Tagen', sAlt.alterTage, 19.5)

// Frische Reihe darf nicht als veraltet markiert werden
const frisch = [
  { ts: JETZT - 2 * TAG, value: 40 },
  { ts: JETZT - 1 * TAG, value: 41 },
  { ts: JETZT - 3600 * 1000, value: 42 },
]
const sFrisch = seriesSpan(frisch, JETZT)
ok('frische Reihe ist nicht veraltet', !sFrisch.veraltet)
eq('frische Reihe: Label mit Zeitraum', sFrisch.label, '28.7.–30.7.')

// Genau an der Schwelle
ok(`genau ${STALE_TAGE} Tage alt → veraltet`, seriesSpan([{ ts: JETZT - STALE_TAGE * TAG, value: 1 }], JETZT).veraltet)
ok('knapp darunter → nicht veraltet', !seriesSpan([{ ts: JETZT - (STALE_TAGE * TAG - 1000), value: 1 }], JETZT).veraltet)

// Ein einzelner Punkt: kein Bereich, nur das Datum
eq('einzelner Punkt → ein Datum', seriesSpan([{ ts: Date.UTC(2026, 6, 11), value: 5 }], JETZT).label, '11.7.')

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} bestanden, ${fail} fehlgeschlagen\n`)
process.exit(fail === 0 ? 0 : 1)
