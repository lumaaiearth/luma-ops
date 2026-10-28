// Regressionstest für src/lib/pflegeKalender.js und src/lib/pflegeJahresplanung.js
//
//   node scripts/test-pflege-kalender.mjs
import { isoWoche, standortMerkmale, standorteImTermin, termineZuordnen, fehlendeTermine, googleTerminLink } from '../src/lib/pflegeKalender.js'
import { montagDerKW, feiertageBerlin, termineVorschlagen, kostenJeStandort, bevorzugteWochentage, terminDauer, termineAlsKalender, kalibPlausibel } from '../src/lib/pflegeJahresplanung.js'
import { icsSchreiben, icsLesen } from '../src/lib/kalenderIcs.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }

// Standorte wie in LUMA Ops (Namen, Kürzel, Adressen)
const projects = [
  { id: 'blankenburg', name: 'BL Blankenburg', flaeche_code: 'BL', location: 'Blankenburger Str. 129, Berlin', client_id: 'bew' },
  { id: 'h14', name: 'H14 Hermannstraße', flaeche_code: 'H14', location: 'Berlin-Neukölln', client_id: 'jope' },
  { id: 'r95', name: 'R95', flaeche_code: 'R95', location: 'Berlin', client_id: 'jope' },
  { id: 's3', name: 'S3', flaeche_code: 'S3', location: 'Berlin', client_id: 'jope' },
  { id: 'x13', name: 'X13', flaeche_code: 'X13', location: '', client_id: 'jope' },
  { id: 'sh', name: 'SH Scharnhorststraße', flaeche_code: 'SH', location: 'Scharnhorststraße 3A, Berlin', client_id: 'bew' },
  { id: 'allcura-pflege', name: 'Allcura Pflege', flaeche_code: 'AL', location: 'Berlin', client_id: 'allcura' },
  { id: 'mv-bew', name: 'MV Tiny Forest', flaeche_code: 'MV', location: 'Schlitzer Str. 45, Berlin-Märkisches Viertel', client_id: 'bew' },
]
const plaene = [
  { id: 'p-bl', project_id: 'blankenburg', jahr: 2027, objekt: '' },
  { id: 'p-h14', project_id: 'h14', jahr: 2027, objekt: '' },
  { id: 'p-r95', project_id: 'r95', jahr: 2027, objekt: '' },
  { id: 'p-s3', project_id: 's3', jahr: 2027, objekt: '' },
  { id: 'p-x13', project_id: 'x13', jahr: 2027, objekt: '' },
  { id: 'p-sh', project_id: 'sh', jahr: 2027, objekt: '' },
  { id: 'p-al1', project_id: 'allcura-pflege', jahr: 2027, objekt: 'Seebadstr. 37' },
  { id: 'p-al2', project_id: 'allcura-pflege', jahr: 2027, objekt: 'Roedernstr. 17/19' },
  { id: 'p-mv', project_id: 'mv-bew', jahr: 2027, objekt: '' },
]
const g = (id, plan_id, kw, soll = 6, fahrt = 1.5, status = 'geplant') => ({ id, plan_id, jahr: 2027, kw, soll_stunden: soll, fahrt_stunden: fahrt, crew_size: 2, status, titel: `Pflege KW ${kw}`, aufgaben: [{ titel: 'Jäten', stunden: soll }] })
const gaenge = [
  g('bl12', 'p-bl', 12), g('bl14', 'p-bl', 14), g('h14-12', 'p-h14', 12),
  g('r95-15', 'p-r95', 15, 22), g('s3-15', 'p-s3', 15, 22), g('x13-15', 'p-x13', 15, 11),
  g('sh15', 'p-sh', 15, 3.5), g('al1-26', 'p-al1', 26, 3.7), g('al2-26', 'p-al2', 26, 7.4), g('mv14', 'p-mv', 14, 11, 1.5, 'entfallen'),
]

pruefe(isoWoche('2027-03-16').kw === 11 && isoWoche('2027-01-01').jahr === 2026 && isoWoche('2027-01-01').kw === 53, 'ISO-Woche (auch Jahreswechsel: 1.1.2027 = KW 53/2026)')
pruefe(montagDerKW(2027, 12) === '2027-03-22' && montagDerKW(2027, 1) === '2027-01-04', 'Montag der KW')

const merkmale = standortMerkmale(plaene, projects)
const nennt = (titel, ort = '') => standorteImTermin({ titel, ort }, merkmale).map(t => t.planId).sort().join()
pruefe(nennt('Schnittgut-Tour + Rasen mähen (R95, S3, X13)') === 'p-r95,p-s3,p-x13', 'ein Termin, drei Standorte (Tour)')
pruefe(nennt('Pflege BL') === 'p-bl', 'Kürzel BL als eigenes Wort')
pruefe(nennt('Blumen holen, sh. Liste') === '', 'kleingeschriebenes „sh.“ ist kein Standort')
pruefe(nennt('Termin Hermannstraße') === 'p-h14', 'Projektname ohne Kürzel')
pruefe(nennt('Pflege', 'Schlitzer Straße 45') === 'p-mv', 'Adresse aus dem Ort-Feld (Straße/Str. gleich behandelt)')
pruefe(nennt('Allcura Roedernstraße') === 'p-al2', 'zwei Objekte eines Projekts: die Straße entscheidet')
pruefe(nennt('Allcura Pflege') === 'p-al1,p-al2', 'ohne Straße: beide Objekte als Kandidaten')
pruefe(nennt('Zahnarzt') === '', 'privater Termin ohne Standort')

const termine = [
  { id: 't1', uid: 'a@google', start_datum: '2027-03-23', titel: 'Pflege BL Blankenburg' },                  // KW 12
  { id: 't2', uid: 'b@google', start_datum: '2027-04-13', titel: 'Schnittgut-Tour (R95, S3, X13)' },         // KW 15
  { id: 't3', uid: 'c@google', start_datum: '2027-04-06', titel: 'BL Nachpflanzung' },                       // KW 14 (Gang bl14)
  { id: 't4', uid: 'd@google', start_datum: '2027-03-30', titel: 'H14 Pflege' },                             // KW 13, Gang KW 12 → verschoben
  { id: 't5', uid: 'e@google', start_datum: '2027-08-03', titel: 'SH Sonderpflege' },                        // KW 31: kein Gang
  { id: 't6', uid: 'f@google', start_datum: '2027-04-14', titel: 'Zahnarzt' },
  { id: 't7', uid: 'g@google', start_datum: '2027-03-24', titel: 'BL zweiter Termin', abgesagt: true },
  { id: 't8', uid: 'luma-gang-al2-26@luma-biome.de', start_datum: '2027-06-29', titel: 'irgendwas' },
]
const { zuordnungen, ohneStandort } = termineZuordnen({ termine, plaene, gaenge, projects })
const von = (t, p) => zuordnungen.find(z => z.terminId === t && z.planId === p)
pruefe(von('t1', 'p-bl')?.gangId === 'bl12' && von('t1', 'p-bl').sicherheit === 'sicher', 'BL KW 12 → Gang KW 12, sicher')
pruefe(['p-r95', 'p-s3', 'p-x13'].every(p => von('t2', p)?.sicherheit === 'sicher') && von('t2', 'p-r95').gangId === 'r95-15', 'Tour: je Standort der Gang KW 15')
pruefe(von('t3', 'p-bl')?.gangId === 'bl14', 'zweiter BL-Termin nimmt den nächsten freien Gang (KW 14)')
pruefe(von('t4', 'p-h14')?.gangId === 'h14-12' && von('t4', 'p-h14').sicherheit === 'wahrscheinlich' && /KW 12/.test(von('t4', 'p-h14').grund), 'eine Woche verschoben → wahrscheinlich, mit Hinweis')
pruefe(von('t5', 'p-sh')?.sicherheit === 'zusatz' && von('t5', 'p-sh').gangId === null, 'kein Gang in der Nähe → Zusatztermin')
pruefe(ohneStandort.map(t => t.id).join() === 't6', 'privater Termin bleibt ohne Standort')
pruefe(!zuordnungen.some(z => z.terminId === 't7'), 'abgesagte Termine werden nicht zugeordnet')
pruefe(von('t8', 'p-al2')?.gangId === 'al2-26' && von('t8', 'p-al2').sicherheit === 'sicher', 'eigener Termin aus der Jahresplanung: per UID sicher')

const fehlt = fehlendeTermine({ gaenge, zuordnungen, heute: '2027-04-01' })
pruefe(fehlt.kommend.map(x => x.id).join() === 'sh15,al1-26', `Gänge ohne Termin: SH KW 15 und Allcura Seebadstr. (${fehlt.kommend.map(x => x.id).join(', ')})`)
pruefe(!fehlt.kommend.some(x => x.id === 'mv14'), 'entfallene Gänge brauchen keinen Termin')
const ignoriert = fehlendeTermine({ gaenge, zuordnungen: zuordnungen.map(z => z.gangId === 'bl12' ? { ...z, status: 'ignoriert' } : z), heute: '2027-04-01' })
pruefe(ignoriert.ueberfaellig.some(x => x.id === 'bl12'), 'ignorierte Zuordnung: Gang gilt wieder als ohne Termin (hier überfällig)')
const link = googleTerminLink({ titel: 'Pflege SH', datum: '2027-04-13', start: '08:00', ende: '10:30', ort: 'Scharnhorststraße 3A' })
pruefe(link.includes('action=TEMPLATE') && link.includes('dates=20270413T080000%2F20270413T103000') && link.includes('ctz=Europe%2FBerlin'), 'Google-Link mit Datum, Uhrzeit und Zeitzone')

// ── Jahresplanung ────────────────────────────────────────────────────────────
const ft = feiertageBerlin(2027)
pruefe(ft.get('2027-03-26') === 'Karfreitag' && ft.get('2027-03-29') === 'Ostermontag' && ft.get('2027-05-06') === 'Christi Himmelfahrt' && ft.get('2027-05-17') === 'Pfingstmontag' && ft.get('2027-03-08') === 'Frauentag', 'Feiertage Berlin 2027 (Ostern 28.3.)')
pruefe(terminDauer({ soll_stunden: 22, fahrt_stunden: 1.5, crew_size: 2 }) === 10 && terminDauer({ soll_stunden: 3.5, fahrt_stunden: 1.5, crew_size: 2 }) === 2.5, 'Dauer: Teamstunden ÷ Teamgröße, höchstens 10 h')

const planInfo = new Map(plaene.map(p => { const pr = projects.find(x => x.id === p.project_id); return [p.id, { clientId: pr.client_id, label: `${pr.name}${p.objekt ? ` · ${p.objekt}` : ''}`, kunde: pr.client_id, ort: pr.location }] }))
const wochentage = bevorzugteWochentage([{ planId: 'p-bl', datum: '2026-03-17' }, { planId: 'p-bl', datum: '2026-04-07' }, { planId: 'p-bl', datum: '2026-05-08' }])
pruefe(wochentage.get('p-bl') === 2, 'Vorjahr: BL meist dienstags')
const v = termineVorschlagen({ jahr: 2027, gaenge, planInfo, wochentage, tagesKapazitaet: 16 })
const am = id => v.find(x => x.gangId === id)
pruefe(am('bl12').datum === '2027-03-23' && am('bl12').grund.includes('Vorjahr'), 'BL KW 12 → Dienstag wie im Vorjahr')
pruefe(!v.some(x => x.datum && ft.has(x.datum)), 'kein Termin auf einem Feiertag')
pruefe(v.every(x => !x.datum || (x.wochentag >= 1 && x.wochentag <= 5)), 'nur Montag–Freitag')
const kw15 = ['r95-15', 's3-15', 'x13-15'].map(am)
pruefe(new Set(kw15.map(x => x.datum)).size === 3, 'Tour R95/S3/X13 (je >11 h) passt nicht an einen Tag → auf drei Tage verteilt')
pruefe(am('sh15').datum && am('h14-12').datum !== am('bl12').datum || am('h14-12').grund, 'jeder Gang bekommt ein Datum')
pruefe(!am('mv14'), 'entfallener Gang bekommt keinen Termin')
const last = new Map()
for (const x of v) { const gg = gaenge.find(y => y.id === x.gangId); last.set(x.datum, (last.get(x.datum) || 0) + gg.soll_stunden + gg.fahrt_stunden) }
pruefe([...v].every(x => x.voll || last.get(x.datum) <= 16 || gaenge.find(y => y.id === x.gangId).soll_stunden + 1.5 > 16), 'Tageskapazität eingehalten oder als „voll“ gekennzeichnet')
const fest = termineVorschlagen({ jahr: 2027, gaenge: gaenge.map(x => x.id === 'bl12' ? { ...x, termin: '2027-03-25' } : x), planInfo })
pruefe(fest.find(x => x.gangId === 'bl12').datum === '2027-03-25', 'schon gesetzte Termine bleiben')
const kleine = termineVorschlagen({ jahr: 2027, gaenge: [g('a', 'p-sh', 15, 2, 0.5), g('b', 'p-bl', 15, 2, 0.5)], planInfo: new Map([['p-sh', { clientId: 'bew' }], ['p-bl', { clientId: 'bew' }]]), tagesKapazitaet: 16 })
pruefe(kleine[0].datum === kleine[1].datum && kleine.some(x => /Tour/.test(x.grund)), 'kleine Gänge desselben Auftraggebers: gleicher Tag (Tour)')

// Kosten
const kosten = kostenJeStandort({
  plaene: [{ id: 'p-bl', kalib_faktor: 0.07 }, { id: 'p-h14', kalib_faktor: 1.2 }, { id: 'p-mv', kalib_faktor: 1 }],
  gaenge, planInfo, saetze: { bew: 50, jope: 55 },
})
const k = id => kosten.zeilen.find(z => z.planId === id)
pruefe(k('p-bl').stunden === 15 && k('p-bl').netto === 750 && /unplausibel/.test(k('p-bl').hinweis), 'BL: Faktor 0,07 nicht angewandt, 2 × (6 + 1,5) h × 50 € = 750 €')
pruefe(k('p-h14').stunden === 8.75 && k('p-h14').satz === 55 && k('p-h14').netto === 481.25 && k('p-h14').kalib === 1.2, 'H14: kalibriert 6 × 1,2 + 1,5 = 8,7 → ¼ h gerundet 8,75 h × 55 €')
pruefe(k('p-mv').gaenge === 0 && k('p-mv').netto === 0, 'entfallene Gänge kosten nichts')
pruefe(kosten.summe.netto === 1231.25 && kosten.summe.brutto === Math.round(1231.25 * 1.19 * 100) / 100, 'Summen netto und brutto (19 %)')
pruefe(!kalibPlausibel(0) && !kalibPlausibel(0.07) && kalibPlausibel(1.3), 'Plausibilität Kalibrierfaktor')

// Kalenderdatei: Bot erkennt eigene Termine wieder
const eintraege = termineAlsKalender(v, { gaenge, planInfo })
const datei = icsSchreiben(eintraege)
const wieder = icsLesen(datei).map((t, i) => ({ ...t, id: `x${i}` }))
const erneut = termineZuordnen({ termine: wieder, plaene, gaenge, projects })
pruefe(erneut.zuordnungen.filter(z => z.sicherheit === 'sicher' && z.gangId).length === v.filter(x => x.datum).length, `alle ${v.filter(x => x.datum).length} geplanten Termine nach Import sicher wiedererkannt`)
pruefe(eintraege[0].titel.startsWith('Pflege ') && eintraege[0].beschreibung.includes('LUMA-Jahresplanung'), 'Titel und Beschreibung der Kalendereinträge')

console.log(`\n═══ Pflegekalender: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
