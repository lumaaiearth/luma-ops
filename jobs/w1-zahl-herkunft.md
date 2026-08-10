# w1-zahl-herkunft — Woher kommt diese Zahl?

**Persona:** ESG-Verantwortliche (`esg`)

## Die Situation

Sie hat eine Zahl aus BIOME in eine Vorlage übernommen, die an die
Konzernmutter geht. Der Wirtschaftsprüfer fragt zurück: woher stammt das? Sie
hat keine Lust, jemanden anzurufen. Sie will es selbst nachsehen können, und
zwar sofort.

## Die Aufgabe

Zu einem angezeigten Wert — hier: dem Stammumfang von Baum `B-007` — Quelle,
Datum, Erfassungsmethode und Person sehen.

## Was richtig sein muss

Gegen `fixtures/ground_truth.sql`:

- `B-007` hat einen **korrigierten** Stammumfang. Am 14.04.2026 erfasste
  R. Sander `850 cm` (Zahlendreher); am 22.04.2026 maß J. Feldmann nach und
  berichtigte auf `85 cm`.
- Angezeigt wird **85 cm**, gemessen in **130 cm Höhe**.

  Die Messhöhe stand hier bis 2026-08-10 mit **100 cm** — ein Rest aus der Zeit
  vor der Berichtigung nach BAUM-BE-06. Die Verordnung bemisst den Stammumfang
  in 1,30 m über dem Erdboden; die Sollantwort war also selbst falsch.
- Sichtbar werden müssen: Datum der Messung, Messhöhe, Verfahren, Name der
  messenden Person — und dass es eine Korrektur gab, mit dem Vorzustand und
  dem Korrekturgrund.
- **Datum und Person gehören zusammen.** Die Tafel zeigt zum gültigen Wert den
  22.04.2026 und J. Feldmann, zum ersetzten den 14.04.2026 und R. Sander. Eine
  gemischte Paarung ist ein Fehler, kein Darstellungsdetail.
- Der ursprüngliche Wert ist nicht verschwunden. Er ist auffindbar, als
  ersetzt gekennzeichnet, mit Zeitstempel und Person.

## Budget

**Zwei Klicks.** Das ist kein Richtwert, das ist die Regel: jede Zahl ist in
zwei Klicks auf Quelle, Datum, Erfassungsmethode und Person zurückführbar.
Höchstens **20 Sekunden**.

## Bars

Methode und Aufgabe. Bar 2 gegen GBIF: dort trägt jeder einzelne Nachweis
seine Herkunft (Datensatz, Sammler, Datum, Methode, Lizenz) und ist von der
Trefferliste aus erreichbar. Das ist ein echter, öffentlich prüfbarer
Vergleich für genau diese Aufgabe.

```json
{
  "id": "w1-zahl-herkunft",
  "welle": 1,
  "persona": "esg",
  "veto": false,
  "aufgabe": "Zu einem angezeigten Messwert Quelle, Datum, Erfassungsmethode und Person sehen.",
  "antwort": {
    "art": "darstellung",
    "wert": "85 cm, gemessen in 130 cm Höhe",
    "pruefung": [
      "Datum, Messhöhe, Verfahren und Name der Person sind sichtbar",
      "der gültige Wert trägt den 22.04.2026 und J. Feldmann",
      "der ersetzte Wert trägt den 14.04.2026 und R. Sander",
      "die Korrektur ist erkennbar, mit Vorzustand 850 cm und Korrekturgrund",
      "der ersetzte Wert ist nicht gelöscht, sondern als ersetzt auffindbar"
    ]
  },
  "budget": { "klicks": 2, "sekunden": 20, "je": "aufgabe", "n": 1 },
  "bars": ["methode", "aufgabe", "produkt"],
  "incumbent": "gbif",
  "incumbent_aufgabe": "Auf gbif.org einen Artnachweis öffnen und Sammler, Datum, Methode, Datensatz und Lizenz auffinden. Klicks und Zeit gleich messen.",
  "geraet": "desktop"
}
```
