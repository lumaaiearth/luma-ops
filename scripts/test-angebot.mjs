// Regressionstest für src/lib/angebot.js — Angebotstext und Druckansicht.
//
//   node scripts/test-angebot.mjs
//
// Geprüft wird vor allem, was NICHT im Angebot stehen darf: interne Stunden
// und der Stundensatz. Nach außen steht die Pauschale je Objekt.
import { offerText, baueAngebotHtml, eur } from '../src/lib/angebot.js'

let ok = 0, fehler = 0
function pruefe(bedingung, text) {
  if (bedingung) { ok++; console.log(`  ok  ${text}`) }
  else { fehler++; console.log(`  FEHLER  ${text}`) }
}

const angebot = {
  angebotsnummer: 'AN-2027-004',
  zeitraum_von: '2027-01-01', zeitraum_bis: '2027-12-31',
  stundensatz: 57.5, abrechnung: 'monatlich', summe_netto: 6612.5,
  positionen: [
    { beschreibung: 'H14 Hermannstraße', stunden: 61.25, stunden_fahrt: 12, betrag: 3521.88,
      lv: '  – Rasenmahd: monatlich Apr–Okt\n  – Wildkraut <Beete>: 3× im Jahr' },
    { beschreibung: 'S3 & Hof', stunden: 53.75, betrag: 3090.62, lv: '' },
  ],
}

const text = offerText(angebot)
pruefe(text.includes('H14 Hermannstraße — Jahrespauschale 3.521,88 € netto'), 'Text: Pauschale je Objekt im deutschen Format')
pruefe(text.includes('Gesamtsumme: 6.612,50 € netto'), 'Text: Gesamtsumme')
pruefe(text.includes('01.01.2027 – 31.12.2027'), 'Text: Leistungszeitraum als TT.MM.JJJJ')
pruefe(text.includes('monatlich in gleichen Teilbeträgen'), 'Text: Abrechnungsweise ausgeschrieben')
pruefe(!/61[,.]25|53[,.]75|57[,.]5/.test(text), 'Text: keine internen Stunden und kein Stundensatz')

const html = baueAngebotHtml(angebot, { kundeName: 'JOPE AG', autoPrint: false })
pruefe(html.includes('AN-2027-004'), 'PDF: Angebotsnummer steht im Kopf')
pruefe(html.includes('JOPE AG'), 'PDF: Auftraggeber steht im Kopf')
pruefe(html.includes('3.521,88 €') && html.includes('6.612,50 €'), 'PDF: Pauschalen und Summe')
pruefe(!/61[,.]25|53[,.]75|57[,.]5|Stundensatz/.test(html), 'PDF: keine internen Stunden und kein Stundensatz')
pruefe(html.includes('Wildkraut &lt;Beete&gt;') && !html.includes('<Beete>'), 'PDF: Freitext wird escaped')
pruefe(html.includes('<li>Rasenmahd: monatlich Apr–Okt</li>'), 'PDF: Leistungsverzeichnis als Liste')
pruefe(!html.includes('window.print'), 'PDF: autoPrint=false öffnet keinen Druckdialog')
pruefe(baueAngebotHtml(null) === null, 'PDF: ohne Angebot kein HTML')
pruefe(eur(null) === '0,00 €', 'eur(): fehlender Betrag wird 0,00 €')

console.log(`\n═══ Angebot: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
if (fehler) process.exit(1)
