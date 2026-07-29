// Verifikation der Leistungsnachweis-Bibliothek gegen echte Produktionsdaten (JOPE 2026).
import {
  normalisiereZeiteintraege, buildLeistungsnachweis, nachweisAlsText,
  formatStunden, formatDatum, formatProzent, planAmpel,
  anteilJahrBisHeute, anteilVonJahr, jahrVon, monatVon, sollBisKW, isoKW,
} from '../src/lib/leistungsnachweis.js'

let pass = 0, fail = 0
const eq = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      erwartet: ${JSON.stringify(expected)}\n      erhalten: ${JSON.stringify(actual)}`) }
}

// ── Echte time_entries aus der Produktion (client_id = 'jope') ───────────────
const ROH = [
  { project_id:'h14', date:'2026-07-08', hours:3.5,  description:'Befestigungspunkte markiert, Material geprüft', user_id:'malte' },
  { project_id:'h14', date:'2026-07-09', hours:2.0,  description:'Draht vorbereitet', user_id:'lukas' },
  { project_id:'k28', date:'2026-03-06', hours:10.5, description:'Häckseln, aufräumen', user_id:'jona' },
  { project_id:'h14', date:'2026-04-14', hours:1.0,  description:'Regentonne abgeliefert', user_id:'malte' },
  { project_id:'r95', date:'2026-04-22', hours:11.75,description:'Beikräuter entfernen, Nachpflanzung Gehölze', user_id:'jona' },
  { project_id:'h14', date:'2026-04-29', hours:5.75, description:'Rasen mähen, Rückschnitt Stauden, Staudenbeete jäten, Wege reinigen', user_id:'jona' },
  { project_id:'e52ve8z3', date:'2026-04-29', hours:3.75, description:'Rasen mähen, Wege reinigen, Formschnitt Gehölze', user_id:'jona' },
  { project_id:'h14', date:'2026-04-29', hours:5.75, description:'Fahrtzeit, Rasen mähen, Rückschnitt Stauden, Staudenbeete jäten, Wege reinigen', user_id:'robert' },
  { project_id:'e52ve8z3', date:'2026-04-29', hours:3.0, description:'Rasen mähen, Wege reinigen, Formschnitt Gehölze', user_id:'robert' },
  { project_id:'r95', date:'2026-04-30', hours:2.25, description:'Fahrtzeit, Rasen mähen, Dokumentation', user_id:'robert' },
  { project_id:'p15', date:'2026-05-13', hours:5.17, description:'Anfahrt, Beikräuter und abgestorbene Pflanzenreste entfernen, Formschnitt Gehölze', user_id:'jona' },
  { project_id:'s3',  date:'2026-05-13', hours:3.83, description:'Rückschnitt Kräuter Dachgarten und Beikräuter entfernen, Abreise', user_id:'jona' },
  { project_id:'e52ve8z3', date:'2026-05-26', hours:7.0, description:'Rasen mähen, Wege reinigen, Hochdruckreiniger Treppe gereinigt, Tiny Forest Hopfen entfernt', user_id:'malte' },
  { project_id:'p15', date:'2026-05-14', hours:3.0,  description:'Entsorgung 1m3 Grünschnitt, Rückschnitt PV Anlage', user_id:'lukas' },
  { project_id:'s3',  date:'2026-05-14', hours:2.5,  description:'Entsorgung 1,5 m3 Grünschnitt, Rückschnitt Kletterpflanzen Müllhaus', user_id:'lukas' },
  { project_id:'e52ve8z3', date:'2026-04-28', hours:10.5, description:'Säuberung Regenabläufe, Entfernung Beikräuter Pflaster', user_id:'anselm' },
  { project_id:'e52ve8z3', date:'2026-06-01', hours:10.0, description:'Entfernung Beikräuter Pflaster, Entfernung Beikräuter und Robinien im Tinyforest', user_id:'anselm' },
  { project_id:'h14', date:'2026-06-03', hours:5.0,  description:'Rasenflächen gemäht, Beikrautentfernung Wege', user_id:'malte' },
  { project_id:'s3',  date:'2026-06-10', hours:11.25,description:'Beikrautentfernung Drainagen, Wärmepumpen und Beete, Wegereinigung', user_id:'jona' },
  { project_id:'h14', date:'2026-06-11', hours:10.5, description:'Beikrautentfernung in den Staudenbeeten und im Tinyforest, Anlage Fermenter', user_id:'anselm' },
  { project_id:'h14', date:'2026-06-15', hours:9.0,  description:'Beikrautentfernung in den Staudenbeeten, Reinigung der Spritzwasser-Schachte', user_id:'anselm' },
  { project_id:'s3',  date:'2026-06-16', hours:12.0, description:'Kompost und Mulch abholen & ausbringen, Dachgarten gießen, Grünschnitt abfahren', user_id:'anselm' },
  { project_id:'s3',  date:'2026-06-16', hours:1.5,  description:'Rasenmähen', user_id:'malte' },
  { project_id:'h14', date:'2026-06-17', hours:2.0,  description:'Gießen Beete', user_id:'malte' },
  { project_id:'s3',  date:'2026-06-16', hours:12.0, description:'Kompost und Mulch abholen & ausbringen, Dachgarten gießen, Grünschnitt abfahren', user_id:'jona' },
  { project_id:'h14', date:'2026-06-30', hours:2.0,  description:'Gießen Beete', user_id:'malte' },
  { project_id:'s3',  date:'2026-07-01', hours:4.0,  description:'Anschluss Hochbeete, Gießen, Anschluss Kletterpflanzen. Dokumentation,', user_id:'malte' },
  { project_id:'r95', date:'2026-07-05', hours:10.0, description:'Jauche ausbringen, bewässern, Rückschnitt Gehölze und Stauden', user_id:'jona' },
  { project_id:'r95', date:'2026-07-16', hours:10.5, description:'Beikräuter entfernen, Bewässerung, Wegereinigung', user_id:'jona' },
  { project_id:'r95', date:'2026-07-16', hours:10.5, description:'Beikräuter entfernen, Bewässerung, Wegereinigung', user_id:'anselm' },
]

const PROJEKTE = [
  { id:'h14', name:'H14 Hermannstraße', location:'Hermannstraße 14' },
  { id:'s3',  name:'S3',  location:'' },
  { id:'r95', name:'R95', location:'' },
  { id:'p15', name:'P15', location:'' },
  { id:'e52ve8z3', name:'X13', location:'' },
  { id:'k28', name:'K28', location:'' },
]

// Soll-Stunden aus pflege_plaene (Produktion, 2026)
const PLAENE = [
  { project_id:'h14', jahr:2026, soll_stunden:49.0,  gaenge_gesamt:8, gaenge_erledigt:0 },
  { project_id:'p15', jahr:2026, soll_stunden:50.5,  gaenge_gesamt:7, gaenge_erledigt:0 },
  { project_id:'r95', jahr:2026, soll_stunden:111.2, gaenge_gesamt:5, gaenge_erledigt:0 },
  { project_id:'s3',  jahr:2026, soll_stunden:111.2, gaenge_gesamt:7, gaenge_erledigt:0 },
  { project_id:'e52ve8z3', jahr:2026, soll_stunden:56.2, gaenge_gesamt:5, gaenge_erledigt:0 },
  // Plan aus einem anderen Jahr darf NICHT einfließen:
  { project_id:'h14', jahr:2025, soll_stunden:999,  gaenge_gesamt:1, gaenge_erledigt:1 },
]

console.log('\n── 1) Normalisierung (time_entries → Tageszeilen) ──')
const norm = normalisiereZeiteintraege(ROH)
// 30 Einträge → 25 Objekt/Tag-Paare (h14:9, k28:1, r95:4, X13:4, p15:2, s3:5)
eq('Anzahl Tageszeilen', norm.length, 25)

const s3_0616 = norm.find(n => n.project_id === 's3' && n.date === '2026-06-16')
eq('S3 16.06. Stunden summiert (12+12+1,5)', s3_0616.stunden, 25.5)
eq('S3 16.06. doppelte Beschreibung entfällt', s3_0616.leistungen,
   'Kompost und Mulch abholen & ausbringen, Dachgarten gießen, Grünschnitt abfahren · Rasenmähen')
eq('S3 16.06. Anzahl Einzeleinträge', s3_0616.eintraege, 3)

const h14_0429 = norm.find(n => n.project_id === 'h14' && n.date === '2026-04-29')
eq('H14 29.04. Stunden (5,75+5,75)', h14_0429.stunden, 11.5)

console.log('\n── 2) Aggregation gegen bekannte DB-Werte (JOPE 2026) ──')
const nw = buildLeistungsnachweis({ leistungen: norm, projekte: PROJEKTE, plaene: PLAENE, jahr: 2026 })
const byId = Object.fromEntries(nw.objekte.map(o => [o.projectId, o]))

eq('H14 Ist-Stunden',  byId.h14.stunden, 46.5)
eq('R95 Ist-Stunden',  byId.r95.stunden, 45)
eq('S3 Ist-Stunden',   byId.s3.stunden, 47.08)
eq('X13 Ist-Stunden',  byId.e52ve8z3.stunden, 34.25)
eq('P15 Ist-Stunden',  byId.p15.stunden, 8.17)
eq('K28 Ist-Stunden',  byId.k28.stunden, 10.5)
eq('Summe aller Objekte', nw.summe.stunden, 191.5)
eq('Anzahl Objekte', nw.summe.objekte, 6)

console.log('\n── 3) Soll-Zuordnung / Jahresfilter ──')
eq('H14 Soll (nur 2026, nicht 2025)', byId.h14.sollStunden, 49)
eq('K28 ohne Plan → Soll 0',          byId.k28.sollStunden, 0)
eq('K28 ohne Plan → Erfüllung null',  byId.k28.erfuellung, null)
eq('H14 Erfüllungsgrad %',            byId.h14.erfuellung, 94.9)
eq('Summe Soll (5 Pläne 2026)',       nw.summe.sollStunden, 378.1)

console.log('\n── 4) Sortierung, Monatsverlauf, Zeitraum ──')
eq('Objekte nach Stunden absteigend', nw.objekte.map(o => o.projectId),
   ['s3','h14','r95','e52ve8z3','k28','p15'])
eq('Termine je Objekt neueste zuerst', byId.r95.termine.map(t => t.datum),
   ['2026-07-16','2026-07-05','2026-04-30','2026-04-22'])
eq('R95 16.07. Doppelbuchung summiert', byId.r95.termine[0].stunden, 21)
eq('Monat März (Index 2)',  nw.monate[2].stunden, 10.5)
// Juni: 10 + 5 + 11,25 + 10,5 + 9 + 25,5 + 2 + 2 = 75,25
eq('Monat Juni (Index 5)',  nw.monate[5].stunden, 75.25)
eq('Monat Januar leer',     nw.monate[0].stunden, 0)
eq('Monatssumme = Gesamt',  Math.round(nw.monate.reduce((s,m)=>s+m.stunden,0)*100)/100, 191.5)
eq('Zeitraum von', nw.zeitraum.von, '2026-03-06')
eq('Zeitraum bis', nw.zeitraum.bis, '2026-07-16')

console.log('\n── 5) Filter: einzelne Fläche / Datumsbereich ──')
const nurR95 = buildLeistungsnachweis({ leistungen: norm, projekte: PROJEKTE, plaene: PLAENE, jahr: 2026, projectId: 'r95' })
eq('Nur R95 → 1 Objekt', nurR95.summe.objekte, 1)
eq('Nur R95 → Stunden',  nurR95.summe.stunden, 45)

const q3 = buildLeistungsnachweis({ leistungen: norm, projekte: PROJEKTE, von: '2026-07-01', bis: '2026-07-31' })
eq('Juli → Stunden (4+3,5+2+10+21)', q3.summe.stunden, 40.5)
eq('Juli → Objekte', q3.summe.objekte, 3)

const leeresJahr = buildLeistungsnachweis({ leistungen: norm, projekte: PROJEKTE, jahr: 2024 })
eq('Jahr ohne Daten → 0 Objekte', leeresJahr.summe.objekte, 0)
eq('Jahr ohne Daten → 0 Stunden', leeresJahr.summe.stunden, 0)
eq('Jahr ohne Daten → Erfüllung null', leeresJahr.summe.erfuellung, null)

console.log('\n── 6) Robustheit gegen unsaubere Daten ──')
const dreck = normalisiereZeiteintraege([
  { project_id:'x', date:'2026-01-05', hours:'3.5', description:'  Text mit Leerraum  ' },
  { project_id:'x', date:'2026-01-05', hours:null,  description:'' },
  { project_id:null, date:'2026-01-05', hours:5,    description:'ohne Projekt' },
  { project_id:'x', date:null,         hours:5,     description:'ohne Datum' },
  null,
  { project_id:'x', date:'2026-01-06T08:00:00Z', hours:2, description:'Zeitstempel' },
])
eq('Ungültige Zeilen verworfen', dreck.length, 2)
eq('String-Stunden addiert',     dreck[0].stunden, 3.5)
eq('Beschreibung getrimmt',      dreck[0].leistungen, 'Text mit Leerraum')
eq('Zeitstempel → Datum',        dreck[1].date, '2026-01-06')

const leer = buildLeistungsnachweis({})
eq('Leerer Aufruf stürzt nicht ab', leer.summe.stunden, 0)
eq('Leerer Aufruf: 12 Monate',      leer.monate.length, 12)

console.log('\n── 7) Fotos werden zeitraumtreu zugeordnet ──')
const mitFotos = buildLeistungsnachweis({
  leistungen: norm, projekte: PROJEKTE, jahr: 2026,
  fotos: [
    { project_id:'r95', url:'a.jpg', einsatz_datum:'2026-07-16', einsatz_titel:'Pflegegang' },
    { project_id:'r95', url:'b.jpg', created_at:'2025-05-01' },     // anderes Jahr → raus
    { project_id:'unbekannt', url:'c.jpg', einsatz_datum:'2026-07-16' }, // kein Objekt → raus
  ],
})
eq('Nur passendes Foto zugeordnet', mitFotos.objekte.find(o=>o.projectId==='r95').fotos.length, 1)
eq('Foto-Gesamtzahl', mitFotos.summe.fotos, 1)

console.log('\n── 8) Formatierung & Ampel ──')
eq('formatStunden 47.08', formatStunden(47.08), '47,08 h')
eq('formatStunden 45',    formatStunden(45), '45 h')
eq('formatStunden 0',     formatStunden(0), '0 h')
eq('formatStunden null',  formatStunden(null), '0 h')
eq('formatDatum',         formatDatum('2026-07-16'), '16.07.2026')
// Einheitliche Prozentdarstellung auf dem Kundenbeleg (keine Scheingenauigkeit)
eq('formatProzent 94.87', formatProzent(94.87), '95 %')
eq('formatProzent 40.09', formatProzent(40.09), '40 %')
eq('formatProzent null',  formatProzent(null), '—')
eq('formatDatum leer',    formatDatum(null), '')
eq('jahrVon',             jahrVon('2026-07-16'), 2026)
eq('monatVon',            monatVon('2026-07-16'), 6)

// Ampel bei 50 % Jahresfortschritt
eq('Ampel: im Plan',   planAmpel({ sollStunden:100, stunden:50 }, 0.5).status, 'im_plan')
eq('Ampel: Rückstand', planAmpel({ sollStunden:100, stunden:20 }, 0.5).status, 'unter')
eq('Ampel: Mehrauf.',  planAmpel({ sollStunden:100, stunden:80 }, 0.5).status, 'ueber')
eq('Ampel: Abweichung', planAmpel({ sollStunden:100, stunden:80 }, 0.5).abweichung, 30)
eq('Ampel ohne Plan → null', planAmpel({ sollStunden:0, stunden:10 }, 0.5), null)
const anteil = anteilJahrBisHeute(new Date(2026, 6, 2)) // 2. Juli 2026
eq('Jahresanteil Anfang Juli ~0,5', Math.round(anteil * 100) / 100, 0.5)

// Abgeschlossene Jahre zählen voll — sonst zeigt ein Rückblick „Rückstand“.
const IM_JULI_26 = new Date(2026, 6, 2)
eq('Vorjahr ist vollständig',       anteilVonJahr(2025, IM_JULI_26), 1)
eq('Zukünftiges Jahr ist bei 0',    anteilVonJahr(2027, IM_JULI_26), 0)
eq('Laufendes Jahr ~0,5', Math.round(anteilVonJahr(2026, IM_JULI_26) * 100) / 100, 0.5)
// Regression: Jahresabschluss 2025 mit 100 % Erfüllung darf NICHT „Rückstand“ sein
eq('Abgeschlossenes Jahr voll erfüllt → im Plan',
   planAmpel({ sollStunden: 100, stunden: 100 }, anteilVonJahr(2025, IM_JULI_26)).status, 'im_plan')

console.log('\n── 9) Regressionen aus der Sicherheits-/Korrektheitsprüfung ──')

// (a) Einsatztage sind KALENDERTAGE, nicht Fläche/Tag-Zeilen.
// Am 29.04. wurden h14 und X13 betreut, am 13./14.05. je p15 und s3 →
// 25 Fläche/Tag-Zeilen, aber nur 22 Tage, an denen LUMA vor Ort war.
eq('Einsatztage = Kalendertage', nw.summe.einsatztage, 22)
eq('Einsatztage je Objekt bleiben Objekt-Tage', byId.h14.einsatztage, 9)

// (b) Eine geplante Fläche ohne Buchung darf im Nenner nicht fehlen —
// sonst wäre der Erfüllungsgrad zu optimistisch.
const mitUnbearbeiteter = buildLeistungsnachweis({
  leistungen: norm, projekte: [...PROJEKTE, { id: 'neu', name: 'Neue Fläche' }],
  plaene: [...PLAENE, { project_id: 'neu', jahr: 2026, soll_stunden: 100, gaenge_gesamt: 4, gaenge_erledigt: 0 }],
  jahr: 2026,
})
const neu = mitUnbearbeiteter.objekte.find(o => o.projectId === 'neu')
eq('Fläche ohne Stunden erscheint',      Boolean(neu), true)
eq('… mit 0 Stunden',                    neu.stunden, 0)
eq('… mit vollem Soll',                  neu.sollStunden, 100)
eq('… und 0 % Erfüllung',                neu.erfuellung, 0)
eq('Soll-Summe enthält sie',             mitUnbearbeiteter.summe.sollStunden, 478.1)
eq('Erfüllung sinkt entsprechend',       mitUnbearbeiteter.summe.erfuellung, 40.05)

// (c) Teilzeitraum: keine Plan-Flächen ergänzen (sonst Jahres-Soll bei 0 h)
const juli = buildLeistungsnachweis({
  leistungen: norm, projekte: PROJEKTE, plaene: PLAENE,
  von: '2026-07-01', bis: '2026-07-31',
})
eq('Monatsauszug ergänzt keine Plan-Flächen', juli.summe.objekte, 3)

// (d) von/bis ohne jahr darf keine Pläne anderer Jahre einrechnen
const nurAlteplaene = buildLeistungsnachweis({
  leistungen: norm, projekte: PROJEKTE,
  plaene: [{ project_id: 'r95', jahr: 2024, soll_stunden: 812 }],
  von: '2026-07-01', bis: '2026-07-31',
})
eq('Plan aus 2024 fließt nicht in Juli 2026', nurAlteplaene.summe.sollStunden, 0)

// (e) Undatiertes Foto gehört in keinen datierten Nachweis
const ohneDatum = buildLeistungsnachweis({
  leistungen: norm, projekte: PROJEKTE, jahr: 2026,
  fotos: [{ project_id: 'r95', url: 'x.jpg' }],
})
eq('Foto ohne Datum wird nicht zugeordnet', ohneDatum.summe.fotos, 0)

// (f) Saisonales Soll statt linearer Hochrechnung.
// BL-Muster: 9 Gänge, Schwerpunkt Frühjahr/Herbst. Am 01.04. (KW 14) ist
// erst der Gang aus KW 12 fällig.
const GAENGE = [
  { project_id: 'bl', jahr: 2026, kw: 12, soll_stunden: 4,  status: 'geplant' },
  { project_id: 'bl', jahr: 2026, kw: 20, soll_stunden: 15, status: 'geplant' },
  { project_id: 'bl', jahr: 2026, kw: 45, soll_stunden: 74, status: 'geplant' },
  { project_id: 'bl', jahr: 2026, kw: 46, soll_stunden: 20, status: 'entfallen' },
  { project_id: 'bl', jahr: 2025, kw: 10, soll_stunden: 99, status: 'geplant' },
]
const AM_1_APRIL = new Date(2026, 3, 1)
eq('Soll bis KW 14 = nur der KW-12-Gang', sollBisKW(GAENGE, 'bl', 2026, AM_1_APRIL), 4)
eq('Entfallener Gang zählt nicht',        sollBisKW(GAENGE, 'bl', 2026, new Date(2026, 11, 31)), 93)
eq('Abgeschlossenes Jahr = alle Gänge',   sollBisKW(GAENGE, 'bl', 2025, AM_1_APRIL), 99)
eq('Ohne Gänge → null (Notnagel greift)', sollBisKW(GAENGE, 'unbekannt', 2026, AM_1_APRIL), null)

const blObjekt = { sollStunden: 93, stunden: 4 }
eq('Saisonal: planmäßig → im Plan',
   planAmpel(blObjekt, null, sollBisKW(GAENGE, 'bl', 2026, AM_1_APRIL)).status, 'im_plan')
eq('Linear wäre es fälschlich Rückstand',
   planAmpel(blObjekt, anteilVonJahr(2026, AM_1_APRIL)).status, 'unter')

console.log('\n── 10) Textausgabe ──')
const txt = nachweisAlsText(nw, { kundeName:'JOPE AG', titel:'Leistungsnachweis 2026' })
eq('Text enthält Kunde',   txt.includes('JOPE AG'), true)
eq('Text enthält Summe',   txt.includes('191,5 h'), true)
eq('Text enthält Objekt',  txt.includes('H14 Hermannstraße'), true)
eq('Text enthält Datum',   txt.includes('16.07.2026'), true)
eq('Text enthält Planbezug', txt.includes('378,1 h'), true)
eq('Text ohne Personennamen', /malte|jona|anselm|lukas|robert/i.test(txt), false)

console.log(`\n═══ ${pass} bestanden, ${fail} fehlgeschlagen ═══\n`)
process.exit(fail ? 1 : 0)
