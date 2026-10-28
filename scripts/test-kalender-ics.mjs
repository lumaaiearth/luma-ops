// Regressionstest für src/lib/kalenderIcs.js
//
//   node scripts/test-kalender-ics.mjs
import { readFileSync } from 'node:fs'
import { icsLesen, icsSchreiben, wiederholungen, datumLesen, entfalten } from '../src/lib/kalenderIcs.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

// So exportiert Google (gekürzt): Zeitzone, UTC, ganztags, Serie mit Ausnahme, verschobener Einzeltermin, Absage
const ics = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Berlin:20270316T080000', 'DTEND;TZID=Europe/Berlin:20270316T140000',
  'UID:abc123@google.com', 'SUMMARY:Pflege BL Blankenburg', 'LOCATION:Blankenburger Pflasterweg 12\\, 13129 Berlin',
  'DESCRIPTION:Frühjahrsschnitt\\nMulchen', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20270707T060000Z', 'DTEND:20270707T100000Z', 'UID:utc@google.com', 'SUMMARY:H14 Gießen', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20270501', 'DTEND;VALUE=DATE:20270502', 'UID:ganz@google.com', 'SUMMARY:Feiertag', 'END:VEVENT',
  // Serie: jeden 2. Dienstag, 4 mal, zweiter Termin ausgelassen, dritter verschoben
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Berlin:20270406T090000', 'DTEND;TZID=Europe/Berlin:20270406T120000',
  'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=4', 'EXDATE;TZID=Europe/Berlin:20270420T090000',
  'UID:serie@google.com', 'SUMMARY:Pflege R95', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Berlin:20270505T100000', 'DTEND;TZID=Europe/Berlin:20270505T130000',
  'RECURRENCE-ID;TZID=Europe/Berlin:20270504T090000', 'UID:serie@google.com', 'SUMMARY:Pflege R95 (verschoben)', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Berlin:20270610T080000', 'UID:abgesagt@google.com', 'SUMMARY:Pflege S3', 'STATUS:CANCELLED', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Berlin:20270915T080000', 'DTEND;TZID=Europe/Berlin:20270915T120000', 'UID:lang@google.co',
  'SUMMARY:Ein sehr langer Titel der über mehrere Zeilen gefaltet wird weil Google Zeilen nach 75 Zei',
  ' chen umbricht', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

const t = icsLesen(ics)
const nach = uid => t.filter(x => x.uid === uid)
const bl = nach('abc123@google.com')[0]
pruefe(bl && bl.start_datum === '2027-03-16' && bl.start_zeit === '08:00' && bl.ende_zeit === '14:00', 'Zeit mit TZID Europe/Berlin bleibt Ortszeit')
pruefe(bl.ort === 'Blankenburger Pflasterweg 12, 13129 Berlin' && bl.beschreibung === 'Frühjahrsschnitt\nMulchen', 'Escapes (\\, und \\n) aufgelöst')
const utc = nach('utc@google.com')[0]
pruefe(utc.start_zeit === '08:00' && utc.ende_zeit === '12:00', 'UTC (Z) → Berliner Sommerzeit (+2 h)')
const ganz = nach('ganz@google.com')[0]
pruefe(ganz.ganztags && ganz.start_datum === '2027-05-01' && ganz.ende_datum === '2027-05-01', 'ganztägig: Ende exklusiv → gleicher Tag')
const serie = nach('serie@google.com').map(x => x.start_datum)
pruefe(serie.join() === '2027-04-06,2027-05-05,2027-05-18', `Serie: 4 Termine, einer ausgelassen, einer verschoben (${serie.join(', ')})`)
pruefe(nach('serie@google.com').find(x => x.start_datum === '2027-05-05').titel.includes('verschoben'), 'verschobener Einzeltermin übernimmt seine eigenen Angaben')
pruefe(nach('abgesagt@google.com')[0]?.abgesagt === true, 'Absage markiert')
pruefe(nach('lang@google.co')[0]?.titel.endsWith('Zeichen umbricht'), 'gefaltete Zeile wieder zusammengesetzt')
pruefe(icsLesen(ics, { von: '2027-05-01', bis: '2027-06-30' }).every(x => x.start_datum >= '2027-05-01' && x.start_datum <= '2027-06-30'), 'Zeitfenster wird beachtet')

// Wiederholungsregeln
pruefe(wiederholungen('2027-01-31', 'FREQ=MONTHLY;COUNT=3').join() === '2027-01-31,2027-03-31,2027-05-31', 'monatlich am 31.: Monate ohne 31. fallen aus (RFC)')
pruefe(wiederholungen('2027-01-12', 'FREQ=MONTHLY;BYDAY=2TU;COUNT=3').join() === '2027-01-12,2027-02-09,2027-03-09', 'monatlich am 2. Dienstag')
pruefe(wiederholungen('2027-03-01', 'FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20270311T000000Z', { startZeit: '08:00' }).join() === '2027-03-01,2027-03-04,2027-03-08', 'wöchentlich Mo+Do bis UNTIL')
pruefe(wiederholungen('2020-01-01', 'FREQ=DAILY', { von: '2027-01-01', bis: '2027-01-03' }).join() === '2027-01-01,2027-01-02,2027-01-03', 'unendliche Serie: nur das Fenster')
pruefe(wiederholungen('2024-02-29', 'FREQ=YEARLY;COUNT=2').join() === '2024-02-29,2025-02-28', 'jährlich am 29.2.')
pruefe(datumLesen('20271031T013000Z').zeit === '02:30' && datumLesen('20271031T013000Z').datum === '2027-10-31', 'Zeitumstellung (31.10.2027, 1:30 UTC → 2:30 MEZ)')
pruefe(datumLesen('kaputt') === null, 'kaputtes Datum → null')

// Schreiben und wieder lesen
const raus = icsSchreiben([
  { uid: 'luma-gang-1@luma-biome.de', datum: '2027-03-16', start: '08:00', ende: '13:30', titel: 'Pflege BL; Frühjahr, KW 11', ort: 'Weg 1, Berlin', beschreibung: 'Zeile 1\nZeile 2' },
  { uid: 'luma-gang-2@luma-biome.de', datum: '2027-12-31', titel: 'Ganztags' },
])
const zurueck = icsLesen(raus)
pruefe(raus.startsWith('BEGIN:VCALENDAR\r\n') && raus.includes('X-WR-TIMEZONE:Europe/Berlin') && raus.split('\r\n').every(z => z.length <= 75), 'geschrieben mit CRLF, Zeitzone, Zeilen ≤ 75 Zeichen')
pruefe(zurueck.length === 2 && zurueck[0].titel === 'Pflege BL; Frühjahr, KW 11' && zurueck[0].start_zeit === '08:00' && zurueck[0].ende_zeit === '13:30' && zurueck[0].beschreibung === 'Zeile 1\nZeile 2', 'Rundweg Schreiben → Lesen verlustfrei')
pruefe(zurueck[1].ganztags && zurueck[1].ende_datum === '2027-12-31', 'ganztägig geschrieben (Ende 1.1. exklusiv)')
pruefe(entfalten('A\r\n B') === 'AB', 'Entfalten')

// Die Edge Function enthält eine Kopie — sie muss gleich sein
const kopie = readFileSync(new URL('../supabase/functions/kalender-sync/kalenderIcs.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const quelle = readFileSync(new URL('../src/lib/kalenderIcs.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
pruefe(kopie === quelle, 'Kopie in der Edge Function ist identisch mit src/lib/kalenderIcs.js')

console.log(`\n═══ Kalender-ICS: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
