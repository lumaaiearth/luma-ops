# w1-serienerfassung — Eine Baumreihe am Stück aufnehmen

**Persona:** LUMA-Crew im Feld (`crew`)

## Die Situation

Zwei Leute, ein Vormittag, eine Allee mit 40 Bäumen. Handschuhe an, Sonne auf
dem Display, das Telefon in einer Hand. Die Reihe wird von vorn nach hinten
durchgegangen: hinstellen, Art, Umfang, weiter. Netz ist unzuverlässig.

Was die Crew dabei nicht tut: nachdenken, welches Feld jetzt dran ist, oder
zwischen Ansichten wechseln. Der Rhythmus ist die Aufgabe.

## Die Aufgabe

Vierzig Bäume nacheinander erfassen — Position, Baumnummer, Art, Stammumfang —
ohne die Ansicht zu verlassen und ohne dass die Nummerierung von Hand
weitergezählt werden muss.

## Was richtig sein muss

- Alle vierzig Bäume liegen hinterher am Standort, jeder mit fortlaufender
  Nummer, ohne Lücke und ohne Doppelung.
- Der Stammumfang trägt seine Messhöhe. Ein Umfang ohne Messhöhe ist kein
  gültiger Wert und darf nicht speicherbar sein.
- Ein Baum, dessen Art die Crew nicht sicher bestimmt, wird als *unbestimmt*
  gespeichert und ist hinterher als solcher auffindbar. Er wird nicht mit einer
  wahrscheinlichen Art vorbelegt.
- Ohne Netz geht nichts verloren. Nach dem Wiederverbinden sind alle vierzig
  Bäume da.

## Budget

Je Baum höchstens **6 Interaktionen** und **25 Sekunden** ab dem Moment, in dem
die Person vor dem Baum steht. Gemessen über die vollen vierzig Bäume, nicht am
besten Einzelfall.

## Bars

Methode und Aufgabe gelten. Für die mobile Serienerfassung eines Baumkatasters
gibt es kein frei zugängliches Vergleichsprodukt — ARCHIKART und pit sind nicht
öffentlich. Bar 2 läuft deshalb als Funktionslücken-Bar gegen deren
öffentliche Funktions- und Prozessbeschreibungen.

```json
{
  "id": "w1-serienerfassung",
  "welle": 1,
  "persona": "crew",
  "veto": false,
  "aufgabe": "Vierzig Bäume einer Allee nacheinander aufnehmen, ohne die Ansicht zu verlassen.",
  "antwort": {
    "art": "datenbestand",
    "pruefung": [
      "40 Bäume am Standort, Nummern lückenlos fortlaufend",
      "jeder Stammumfang mit Messhöhe",
      "unbestimmte Art ist als unbestimmt gespeichert, nicht geraten",
      "offline erfasste Bäume sind nach Wiederverbindung vollständig da"
    ]
  },
  "budget": { "klicks": 6, "sekunden": 25, "je": "baum", "n": 40 },
  "bars": ["methode", "aufgabe", "funktionsluecke"],
  "incumbent": null,
  "kein_incumbent": "Kommunale Baumkatastersysteme (ARCHIKART, pit) sind nicht frei zugänglich. Kein Screenshot, nur Funktionslückenvergleich gegen die öffentlichen Beschreibungen.",
  "geraet": "mobil"
}
```
