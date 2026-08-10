# w1-kontrollgang — Eine Regelkontrolle dokumentieren

**Persona:** SKT-Kontrolleur (`skt`) — **diese Persona hat das Veto**

## Die Situation

Der Kontrolleur steht vor einer Winterlinde, belaubt, Ende Juli. Er geht sie
von unten nach oben durch: Stammfuß, Stammbereich, Kronenansatz, Krone. Was er
notiert, unterschreibt er. Wenn ein halbes Jahr später etwas herunterkommt,
wird genau dieser Datensatz gelesen — von einem Gericht.

## Die Aufgabe

Die Kontrolle an einem Baum vollständig erfassen: Datum, Person mit
Qualifikation, Belaubungszustand, Befund, und ob eine Maßnahme nötig ist.

## Was richtig sein muss

- Der Datensatz nennt die Person namentlich und ihre Qualifikation. Nicht
  „erfasst über Konto Malte", sondern wer die Inaugenscheinnahme gemacht hat.
- Der Belaubungszustand steht dabei. Eine Kontrolle im unbelaubten Zustand
  sieht anderes als eine im belaubten; ohne diese Angabe ist der Befund nicht
  einzuordnen.
- Nirgends in Oberfläche, Text oder Export steht oder suggeriert etwas, dass
  eine Analyse, ein Sensor, ein Drohnenflug oder ein Modell diese Kontrolle
  ersetzt, ein Intervall verlängert oder Verkehrssicherheit feststellt.
- Wird eine Zustandsstufe angeboten, dann nur eine, die im Standards-Register
  mit Wortlaut belegt ist — mit sichtbarer Angabe, aus welcher Quelle sie
  stammt. Gibt es keine belegte Stufenskala, bietet die Oberfläche keine an
  und nimmt stattdessen den Befund im Freitext.
- Eine empfohlene Maßnahme ist eine Empfehlung des Kontrolleurs, keine
  Feststellung der Plattform.

## Budget

Höchstens **14 Interaktionen** und **120 Sekunden** je Baum.

## Bars

Methode, Recht und Aufgabe. Bar 2 als Funktionslücken-Bar gegen die
öffentlichen Beschreibungen kommunaler Katastersysteme.

```json
{
  "id": "w1-kontrollgang",
  "welle": 1,
  "persona": "skt",
  "veto": true,
  "aufgabe": "Eine Regelkontrolle an einem Baum vollständig und gerichtsfest dokumentieren.",
  "antwort": {
    "art": "datenbestand_und_darstellung",
    "pruefung": [
      "Kontrolldatensatz nennt Person und Qualifikation",
      "Belaubungszustand ist erfasst",
      "keine Formulierung, die Analytik als Ersatz der Regelkontrolle darstellt",
      "angebotene Zustandsstufen sind im Standards-Register belegt und zeigen ihre Quelle",
      "Maßnahmenempfehlung ist als Empfehlung der Person gekennzeichnet"
    ]
  },
  "budget": { "klicks": 14, "sekunden": 120, "je": "baum", "n": 1 },
  "bars": ["methode", "recht", "aufgabe", "funktionsluecke"],
  "incumbent": null,
  "kein_incumbent": "ARCHIKART und pit sind nicht frei zugänglich.",
  "geraet": "mobil"
}
```
