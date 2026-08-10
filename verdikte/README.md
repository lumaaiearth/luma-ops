# Verdikte

Eine Zeile je Runde und Job, angehängt, nie überschrieben. Die Datei ist der
Verlauf des Loops: was geprüft wurde, wer geurteilt hat, was das Urteil war,
und welche eine Lücke als nächstes zu schließen ist.

## Datei

`verdikte/verdikte.jsonl` — eine JSON-Zeile je Eintrag, UTF-8, angehängt.

```json
{
  "job": "w1-faellige-kontrollen",
  "welle": 1,
  "runde": 1,
  "bar": "aufgabe",
  "critic": "persona",
  "verdikt": "incumbent",
  "luecke": "Die Flächenübersicht zeigt nicht, welche Wiesen dieses Jahr schon gemäht wurden, ich musste 14 Detailseiten öffnen.",
  "screenshot": ["screenshots/w1-r1-unser.png", "screenshots/w1-r1-incumbent.png"],
  "budget_soll": { "klicks": 3, "sekunden": 30 },
  "budget_ist": { "klicks": 14, "sekunden": 96 },
  "zeit": "2026-08-09T17:12:00+02:00",
  "tokens_geschaetzt": 48000
}
```

## Felder

| Feld | Bedeutung |
|---|---|
| `job` | ID aus `jobs/` |
| `welle` | 1..6 |
| `runde` | fortlaufend je Job, beginnt bei 1 |
| `bar` | `methode`, `produkt`, `funktionsluecke`, `aufgabe`, `recht`, `daten`, `wirkung`, `fernerkundung`, `zugaenglichkeit` |
| `critic` | welcher Critic geurteilt hat |
| `verdikt` | `unser`, `incumbent`, `unentschieden`, `blockiert` — Standard ist `incumbent` |
| `luecke` | **genau eine** größte verbleibende Lücke, konkret und verortet |
| `screenshot` | Pfade, bei Blindvergleich beide, Reihenfolge wie vorgelegt |
| `budget_soll` / `budget_ist` | Klicks und Sekunden, gemessen |
| `tokens_geschaetzt` | grobe Schätzung des Verbrauchs dieser Runde |

## Was als Lücke durchgeht

Gut: „Die Flächenübersicht zeigt nicht, welche Wiesen dieses Jahr schon gemäht
wurden, ich musste 14 Detailseiten öffnen."

Abgelehnt: „Visuelle Hierarchie verbessern." Abgelehntes wird neu geschrieben,
nicht abgelegt.

## Wann ein Job einfriert

- Dreimal in Folge gegen **alle** für ihn geltenden Bars gewonnen, oder
- drei Runden in Folge ohne messbar geschlossene Lücke — dann wird
  `"verdikt": "diminishing_returns"` abgelegt und der Job ruht.

## Fortschrittsseite

`npm run fortschritt` baut daraus `fortschritt/index.html`. Die Seite liegt
bewusst **nicht** unter `public/`: `dist/` geht auf luma-biome.de, und der
Stand des Gauntlet-Loops gehört nicht auf die öffentliche Website.
