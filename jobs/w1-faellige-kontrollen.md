# w1-faellige-kontrollen — Welche Bäume sind dieses Jahr noch nicht kontrolliert?

**Persona:** Bezirksamt Grünflächen (`amt`)

## Die Situation

Anruf aus dem Amt, Donnerstagnachmittag. Der Sachbearbeiter braucht für einen
Vorgang die Liste der Bäume in diesem Bestand, für die im laufenden Jahr noch
keine Kontrolle dokumentiert ist. Er hat kein Interesse an einer Karte, er
braucht eine Liste, die er weiterreichen kann.

## Die Aufgabe

Diese Liste sehen, ohne Detailseiten einzeln zu öffnen.

## Was richtig sein muss

Gegen `fixtures/ground_truth.sql`, Standort *Marzahner Promenade Nord*, Stand
2026-08-09:

- **5 Bäume ohne dokumentierte Kontrolle im Jahr 2026:**
  `B-002`, `B-005`, `B-008`, `B-011`, `B-012`
- Von diesen fünf hat `B-012` überhaupt noch nie eine Kontrolle. Das muss von
  „im laufenden Jahr noch nicht" unterscheidbar sein — nie kontrolliert ist ein
  anderer Sachverhalt als überfällig.
- Ein Baum ohne Kontrolldatum wird als *ohne Angabe* geführt, nicht als „vor
  langer Zeit" und nicht mit einem Datum aus dem Anlagedatum des Datensatzes.
- Die Zahl 5 ist an Ort und Stelle nachvollziehbar: aus welchem Bestand,
  welcher Zeitraum, welches Stichdatum.

Was die Oberfläche **nicht** tun darf: aus dem Fehlen einer Kontrolle einen
Zustand ableiten, ein Kontrollintervall vorschlagen, das sich nicht auf ein
belegtes Dokument stützt, oder die fünf Bäume farblich als „gefährlich"
markieren.

## Budget

Höchstens **3 Klicks** und **30 Sekunden** ab Öffnen des Standorts.

## Bars

Methode und Aufgabe. Bar 2 als Funktionslücken-Bar.

```json
{
  "id": "w1-faellige-kontrollen",
  "welle": 1,
  "persona": "amt",
  "veto": false,
  "aufgabe": "Die Bäume dieses Bestands sehen, für die im laufenden Jahr keine Kontrolle dokumentiert ist.",
  "antwort": {
    "art": "zahl_und_liste",
    "wert": 5,
    "liste": ["B-002", "B-005", "B-008", "B-011", "B-012"],
    "pruefung": [
      "nie kontrolliert (B-012) ist von im laufenden Jahr nicht kontrolliert unterscheidbar",
      "fehlendes Kontrolldatum wird als ohne Angabe gezeigt, nie als Datum ersetzt",
      "Bestand, Zeitraum und Stichdatum stehen an der Zahl",
      "keine abgeleitete Zustands- oder Gefahrenaussage"
    ]
  },
  "budget": { "klicks": 3, "sekunden": 30, "je": "aufgabe", "n": 1 },
  "bars": ["methode", "aufgabe", "funktionsluecke"],
  "incumbent": null,
  "kein_incumbent": "ARCHIKART und pit sind nicht frei zugänglich.",
  "geraet": "desktop"
}
```
