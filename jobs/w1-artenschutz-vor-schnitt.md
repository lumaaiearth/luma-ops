# w1-artenschutz-vor-schnitt — Ist das artenschutzrechtlich geprüft?

**Persona:** SKT-Kontrolleur (`skt`) — Vetopersona

## Die Situation

Die Säge liegt im Auto. Der Kontrolleur soll an einer Robinie eine
Kroneneinkürzung machen, beauftragt vom Facility-Dienstleister. Bevor er
ansetzt, will er wissen, ob jemand geprüft hat, ob in diesem Baum etwas lebt,
das geschützt ist — und ob der Zeitpunkt zulässig ist.

Er will das in der Hand haben, bevor er anfängt, nicht danach im Bericht.

## Die Aufgabe

Vor der Maßnahme sehen, ob eine Artenschutzprüfung vorliegt, von wem, mit
welchem Ergebnis — und wenn keine vorliegt, dass keine vorliegt.

## Was richtig sein muss

- Liegt keine Prüfung vor, sagt die Oberfläche das deutlich. Sie sagt nicht
  nichts, und sie sagt nicht „keine Auffälligkeiten".
- Liegt eine vor, sind Datum, prüfende Person, Qualifikation, Ergebnis und
  Begründung sichtbar; bei Vermeidungsmaßnahmen auch diese.
- Der Zeitraum nach § 39 BNatSchG ist ausgewiesen: fällt das Datum in den
  gesetzlichen Zeitraum, in dem Gehölze nicht abgeschnitten werden dürfen,
  steht das dort — mit Verweis auf die Vorschrift, nicht als Hausmeinung.
- Nichts an der Darstellung darf eine Maßnahme als artenschutzrechtlich
  geprüft erscheinen lassen, ohne dass sie es ist. Kein grünes Häkchen, das
  nur bedeutet „Formular ausgefüllt".
- Der Datenbestand lässt eine Maßnahme ohne Prüfung gar nicht erst auf
  *freigegeben* oder *durchgeführt* setzen.

## Budget

Höchstens **4 Klicks** und **45 Sekunden** ab Öffnen der Maßnahme.

## Bars

Methode, Recht und Aufgabe. Für die artenschutzrechtliche Vorprüfung an einer
konkreten Maßnahme gibt es kein frei zugängliches Vergleichsprodukt.

```json
{
  "id": "w1-artenschutz-vor-schnitt",
  "welle": 1,
  "persona": "skt",
  "veto": true,
  "aufgabe": "Vor einer Schnittmaßnahme sehen, ob eine Artenschutzprüfung vorliegt und was sie ergeben hat.",
  "antwort": {
    "art": "darstellung_und_datenbestand",
    "pruefung": [
      "fehlende Prüfung wird ausdrücklich als fehlend gezeigt",
      "vorhandene Prüfung zeigt Datum, Person, Qualifikation, Ergebnis, Begründung",
      "Zeitraum nach § 39 BNatSchG ist mit Fundstelle ausgewiesen",
      "kein Zeichen, das ungeprüfte Maßnahmen als geprüft erscheinen lässt",
      "Status freigegeben oder durchgeführt ist ohne Prüfung nicht speicherbar"
    ]
  },
  "budget": { "klicks": 4, "sekunden": 45, "je": "aufgabe", "n": 1 },
  "bars": ["methode", "recht", "aufgabe"],
  "incumbent": null,
  "kein_incumbent": "Kein frei zugängliches Produkt löst die artenschutzrechtliche Vorprüfung an einer konkreten Einzelmaßnahme.",
  "geraet": "mobil"
}
```
