# Jobs — die Aufgaben, an denen BIOME gemessen wird

Ein Job ist keine Funktionsliste. Ein Job ist eine Person, die etwas erledigen
muss, eine richtige Antwort, und ein Budget an Klicks und Zeit.

## Regeln

- **Genau eine entscheidende Persona je Job.** Andere dürfen mitreden, aber nur
  eine entscheidet. Höchstens eine Persona im ganzen Katalog hat ein Veto.
- **Die Antwort muss stimmen.** Sie steht in der Jobdatei und ist gegen
  `fixtures/ground_truth.sql` prüfbar. Ein schöner Screen mit falscher Zahl ist
  ein verlorener Job.
- **Das Budget hält oder der Job ist verloren.** Klicks und Sekunden werden von
  der Playwright-Abnahme gemessen, nicht geschätzt.
- **Jeder gewonnene Job wandert dauerhaft in die Abnahme-Suite.** Eine
  Regression darin blockiert den Merge, auch Wellen später.

## Personas

| Kürzel | Persona | Was sie kann und was nicht |
|---|---|---|
| `crew` | LUMA-Crew im Feld | Handschuhe, Sonne auf dem Display, eine Hand frei. Mobil, oft ohne Netz. Kein Fachjargon. |
| `skt` | SKT-Kontrolleur | Seilklettertechnik, baumfachlich qualifiziert. Kennt die Regelkontrolle. Haftet persönlich für das, was er unterschreibt. **Vetorecht.** |
| `amt` | Bezirksamt Grünflächen | Verwaltet Tausende Bäume, muss Fristen und Nachweise belegen können. Desktop, wenig Zeit, hohe Prüfschärfe. |
| `esg` | ESG-Verantwortliche | Muss Zahlen weiterreichen, für die sie geradesteht. Fragt immer: woher kommt das? |
| `facility` | Facility-Seite (BEW, ALLCURA) | Bestellt Leistung, will Nachweis und Planbarkeit. Kein Fachpublikum. |
| `analyst` | LUMA-Analyst | Baut Auswertungen, kennt die Methodik, will an die Rohdaten. |

Vetorecht hat allein `skt`: wenn der Kontrolleur eine Darstellung für
rechtlich oder fachlich untragbar hält, ist der Job verloren, unabhängig vom
Ergebnis der übrigen Bars.

## Aufbau einer Jobdatei

Jede Datei hat einen Fließtext für Menschen und einen JSON-Block für die
Abnahme. Der JSON-Block ist maßgeblich.

```
id            eindeutig, z. B. w1-serienerfassung
welle         1..6
persona       Kürzel aus der Tabelle
aufgabe       ein Satz, so wie die Person es sagen würde
antwort       was am Ende richtig auf dem Schirm stehen muss
budget        { klicks, sekunden }
bars          welche Bars für diesen Job gelten
incumbent     Vergleichsprodukt oder null (dann Begründung in "kein_incumbent")
```

## Welche Bar gilt wann

- **Bar 1 Methode** gilt immer.
- **Bar 2 Produkt** gilt nur, wenn es ein Vergleichsprodukt gibt, das genau
  diese Aufgabe öffentlich zugänglich löst. Für Boden, Bodenleben,
  Habitatstrukturen und Wirkungsnachweis gibt es keinen Incumbent — das wird in
  der Jobdatei vermerkt und der Job nur gegen Bar 1 und 3 geprüft.
- **Bar 3 Aufgabe** gilt immer.

Kommunale Katastersysteme (ARCHIKART, pit) sind nicht frei zugänglich. Für sie
gibt es keine Screenshots, sondern eine Funktionslücken-Bar gegen die
öffentlichen Funktions- und Prozessbeschreibungen der Hersteller.

## Ablage der Verdikte

`verdikte/` — eine Zeile je Runde, Format siehe `verdikte/README.md`.
