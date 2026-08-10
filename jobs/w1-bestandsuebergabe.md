# w1-bestandsuebergabe — Den Baumbestand herausgeben

**Persona:** Facility-Seite, BEW (`facility`)

## Die Situation

Der Objektbetreuer bei der Wohnungsbaugesellschaft braucht den Baumbestand des
Standorts als Anlage für die Hausakte. Er ist kein Fachmann. Was er bekommt,
legt er ab und reicht es bei Bedarf an Dritte weiter — an einen Gutachter, an
eine Versicherung, an das Amt.

Genau deshalb entscheidet sich hier, ob die Plattform ehrlich ist: eine Liste,
die weitergereicht wird, muss von allein sagen, was sie ist und was sie nicht
ist.

## Die Aufgabe

Den Baumbestand des Standorts als Datei herausgeben.

## Was richtig sein muss

Gegen `fixtures/ground_truth.sql`, Standort *Marzahner Promenade Nord*:

- **12 Bäume** in der Ausgabe, Nummern `B-001` bis `B-012`.
- Artenverteilung: 4 × *Tilia cordata*, 3 × *Acer platanoides*,
  2 × *Quercus robur*, 1 × *Betula pendula*, 1 × *Platanus × hispanica*,
  1 × unbestimmt (`B-009`).
- `B-003` hat **keinen** Stammumfang. In der Ausgabe steht dort keine 0 und
  keine leere Zelle ohne Erklärung, sondern eine erkennbare Angabe, dass der
  Wert fehlt.
- `B-009` ist als *Art unbestimmt* ausgewiesen, nicht weggelassen und nicht
  geraten.
- Jede Messgröße trägt in der Ausgabe ihre Einheit und die Messhöhe, wo eine
  gehört.
- Die Datei trägt im Kopf: Standort, Stichdatum, wer sie erzeugt hat, aus
  welchem Datenbestand, und den Hinweis, dass es sich um eine Bestandsliste
  handelt und nicht um eine Baumkontrolle oder eine Aussage zur
  Verkehrssicherheit.

## Budget

Höchstens **6 Klicks** und **90 Sekunden**.

## Bars

Methode, Recht und Aufgabe. Bar 2 gegen QGIS lokal (Attributtabelle eines
Punktlayers exportieren) — das ist der ehrliche Vergleich für „Bestand
herausgeben". Ist QGIS in der Prüfumgebung nicht verfügbar, wird das in
`BLOCKED.md` vermerkt und Bar 2 für diesen Job ausgesetzt, nicht ersetzt.

```json
{
  "id": "w1-bestandsuebergabe",
  "welle": 1,
  "persona": "facility",
  "veto": false,
  "aufgabe": "Den Baumbestand des Standorts als weiterreichbare Datei herausgeben.",
  "antwort": {
    "art": "datei",
    "wert": 12,
    "pruefung": [
      "12 Zeilen, B-001 bis B-012",
      "Artenverteilung 4 Tilia cordata, 3 Acer platanoides, 2 Quercus robur, 1 Betula pendula, 1 Platanus x hispanica, 1 unbestimmt",
      "fehlender Stammumfang bei B-003 ist als fehlend erkennbar, nicht als 0",
      "B-009 ist als Art unbestimmt ausgewiesen",
      "Einheiten und Messhöhen stehen dabei",
      "Kopf nennt Standort, Stichdatum, Ersteller, Datenbestand und die Abgrenzung zur Baumkontrolle"
    ]
  },
  "budget": { "klicks": 6, "sekunden": 90, "je": "aufgabe", "n": 1 },
  "bars": ["methode", "recht", "aufgabe", "produkt"],
  "incumbent": "qgis",
  "incumbent_aufgabe": "In QGIS lokal einen Punktlayer mit denselben zwölf Bäumen laden und die Attributtabelle als CSV exportieren. Klicks und Zeit gleich messen.",
  "geraet": "desktop"
}
```
