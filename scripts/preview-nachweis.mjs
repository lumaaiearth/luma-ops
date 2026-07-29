// Erzeugt Vorschauen des Kunden-Leistungsnachweises als HTML-Dateien —
// zum Prüfen des Layouts ohne laufende App.
//
//   node scripts/preview-nachweis.mjs [zieldatei.html]
//
// Schreibt zusätzlich eine „…-email.html“ mit der E-Mail-Fassung.
// Die Daten sind ein realistischer Auszug (JOPE 2026); echte Kundendaten
// werden bewusst nicht eingebettet.
import { writeFileSync } from 'node:fs'
import { normalisiereZeiteintraege, buildLeistungsnachweis } from '../src/lib/leistungsnachweis.js'
import { baueNachweisHtml } from '../src/lib/printNachweis.js'
import { baueNachweisEmail } from '../src/lib/nachweisEmail.js'

const ZEITEN = [
  { project_id: 'h14', date: '2026-04-14', hours: 1.0,  description: 'Regentonne abgeliefert' },
  { project_id: 'h14', date: '2026-04-29', hours: 5.75, description: 'Rasen mähen, Rückschnitt Stauden, Staudenbeete jäten, Wege reinigen' },
  { project_id: 'h14', date: '2026-04-29', hours: 5.75, description: 'Fahrtzeit, Rasen mähen, Rückschnitt Stauden' },
  { project_id: 'h14', date: '2026-06-03', hours: 5.0,  description: 'Rasenflächen gemäht, Beikrautentfernung Wege' },
  { project_id: 'h14', date: '2026-06-11', hours: 10.5, description: 'Beikrautentfernung in den Staudenbeeten und im Tinyforest, Entfernung Gehölzaufwuchs an der Grundstücksgrenze, Anlage Fermenter, Gießen, Gehölz-Formschnitt, Umpflanzung von Stauden' },
  { project_id: 'h14', date: '2026-06-15', hours: 9.0,  description: 'Beikrautentfernung in den Staudenbeeten, Reinigung der Spritzwasser-Schächte, Nachpflanzplanung' },
  { project_id: 'h14', date: '2026-06-17', hours: 2.0,  description: 'Gießen Beete' },
  { project_id: 'h14', date: '2026-06-30', hours: 2.0,  description: 'Gießen Beete' },
  { project_id: 'h14', date: '2026-07-08', hours: 3.5,  description: 'Befestigungspunkte markiert, Material geprüft' },
  { project_id: 'h14', date: '2026-07-09', hours: 2.0,  description: 'Draht vorbereitet' },
  { project_id: 's3',  date: '2026-05-13', hours: 3.83, description: 'Rückschnitt Kräuter Dachgarten, Beikräuter entfernen' },
  { project_id: 's3',  date: '2026-06-10', hours: 11.25,description: 'Beikrautentfernung Drainagen, Wärmepumpen und Beete, Wegereinigung, Bewässerung Rankpflanzen, Formschnitt Gehölze' },
  { project_id: 's3',  date: '2026-06-16', hours: 12.0, description: 'Kompost und Mulch abholen und ausbringen, Dachgarten gießen, Grünschnitt abfahren' },
  { project_id: 's3',  date: '2026-06-16', hours: 12.0, description: 'Kompost und Mulch abholen und ausbringen, Dachgarten gießen, Grünschnitt abfahren' },
  { project_id: 's3',  date: '2026-06-16', hours: 1.5,  description: 'Rasenmähen' },
  { project_id: 's3',  date: '2026-07-01', hours: 4.0,  description: 'Anschluss Hochbeete, Gießen, Anschluss Kletterpflanzen, Dokumentation' },
  { project_id: 'r95', date: '2026-04-22', hours: 11.75,description: 'Beikräuter entfernen, Nachpflanzung Gehölze' },
  { project_id: 'r95', date: '2026-07-05', hours: 10.0, description: 'Jauche ausbringen, bewässern, Rückschnitt Gehölze und Stauden' },
  { project_id: 'r95', date: '2026-07-16', hours: 10.5, description: 'Beikräuter entfernen, Bewässerung, Wegereinigung' },
  { project_id: 'r95', date: '2026-07-16', hours: 10.5, description: 'Beikräuter entfernen, Bewässerung, Wegereinigung' },
]

const PROJEKTE = [
  { id: 'h14', name: 'H14 Hermannstraße', location: 'Hermannstraße 14, 12049 Berlin' },
  { id: 's3',  name: 'S3 Dachgarten',     location: 'Berlin' },
  { id: 'r95', name: 'R95',               location: 'Berlin' },
]

const PLAENE = [
  { project_id: 'h14', jahr: 2026, soll_stunden: 49.0,  gaenge_gesamt: 8, gaenge_erledigt: 4 },
  { project_id: 's3',  jahr: 2026, soll_stunden: 111.2, gaenge_gesamt: 7, gaenge_erledigt: 3 },
  { project_id: 'r95', jahr: 2026, soll_stunden: 111.2, gaenge_gesamt: 5, gaenge_erledigt: 2 },
]

const nachweis = buildLeistungsnachweis({
  leistungen: normalisiereZeiteintraege(ZEITEN),
  projekte: PROJEKTE,
  plaene: PLAENE,
  jahr: 2026,
})

const html = baueNachweisHtml(nachweis, {
  kundeName: 'JOPE AG (Beispiel)',
  titel: 'Leistungsnachweis 2026',
  autoPrint: false,
})

const mail = baueNachweisEmail(nachweis, {
  kundeName: 'JOPE AG (Beispiel)',
  anrede: 'Guten Tag Frau Beispiel',
  zeitraumLabel: '2026',
  absender: 'Malte · LUMA Biome',
})

const ziel = process.argv[2] || 'leistungsnachweis-vorschau.html'
const zielMail = ziel.replace(/\.html?$/i, '') + '-email.html'
writeFileSync(ziel, html)
writeFileSync(zielMail, mail.html)
console.log(`Vorschau geschrieben: ${ziel}`)
console.log(`E-Mail-Vorschau:      ${zielMail}`)
console.log(`E-Mail-Betreff:       ${mail.betreff}`)
console.log(`Summe: ${nachweis.summe.stunden} h · ${nachweis.summe.objekte} Flächen · ${nachweis.summe.einsatztage} Einsatztage`)
