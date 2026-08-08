# Vergleichsprodukte (Referenz-Screenshots)

Messlatte für den Gauntlet-Loop: Für jede Aufgabe, die LUMA Ops übernimmt,
liegt hier das beste Produkt der Welt für genau diese eine Aufgabe. Der
Kritiker-Agent vergleicht unsere Screens blind gegen diese Bilder.

## Was hier hineingehört

Pro Ordner **3–5 Screenshots** der Ansicht, die unserer entspricht.
Quellen: Marketing-Seiten, Doku, Demo-Videos (Standbild), eigene Testkonten.

| Ordner                 | Baustein bei uns             | Worauf es ankommt                        |
|------------------------|------------------------------|------------------------------------------|
| `monday`               | Aufgaben, Jahresplanung      | Board, Gantt/Timeline, Gruppierung        |
| `linear`               | Aufgaben                     | Craft, Dichte, Tastaturführung            |
| `jobber`               | Einsätze, Crew               | Terminplan, Einsatzkarte, Nachweis        |
| `aspire`               | Pflege, LV, Angebote         | Leistungsverzeichnis, Kalkulation         |
| `felt`                 | BIOME™                       | Moderne Web-Karte, Ebenen, Zeichnen       |
| `arcgis`               | BIOME™, Analysen             | GIS-Tiefe, Layer-Symbolik                 |
| `restor`               | Analysen, Klima              | Ökosystem-Daten kundentauglich erzählt    |
| `overstory`            | Analysen, Vegetation         | Vegetations-KI, Flächenauswertung         |
| `planet`               | Analysen, Monitoring         | Satelliten-Zeitreihen                     |
| `vectorworks-landmark` | Florales™                    | Pflanzplan, Pflanzenlisten                |
| `grafana`              | Sensoren                     | Zeitreihen, Schwellwerte, Alarme          |
| `measurabl`            | Kundenportal                 | Nachweis/ESG-Reporting für Kunden         |

## Regeln

1. **Logos und Fensterrahmen wegschneiden.** Sonst erkennt der Kritiker das
   Produkt am blauen Header und der Blindvergleich ist keiner mehr.
2. Dateiname sagt, was zu sehen ist: `board-gruppiert.png`, `gantt-jahr.png`.
3. PNG oder JPG, Breite ~1400–2000 px. Keine Videos.
4. Nur interne Referenz — dieser Ordner wird nicht mitgebaut und nicht
   veröffentlicht (nur `dist/` geht auf die Website).

## Hinweise für den Kritiker-Agenten (in dieser Umgebung geprüft, 2026-08-08)

- **Unsere App aufnehmen funktioniert.** Chromium liegt unter
  `/opt/pw-browsers/chromium` (Playwright, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`,
  kein `playwright install` nötig). Start mit
  `--no-sandbox --disable-dev-shm-usage`, dann `npm run build` und
  `npx serve -s dist -l 4173` oder `npm run dev`, und `http://127.0.0.1:4173/`
  aufrufen. Verifiziert: Seite rendert, Screenshot wird geschrieben.
- **Der Browser kommt nicht ins Internet.** Ausgehende Verbindungen laufen über
  einen Proxy, den Chromium nicht durchdringt (`ERR_CONNECTION_RESET`); `curl`
  dagegen schon. Vergleichs-Screenshots können deshalb nicht live vom
  Konkurrenzprodukt geholt werden — sie müssen als Dateien hier liegen.
  Automatisches Sammeln scheitert zusätzlich daran, dass Support- und
  Marketing-Seiten `curl` mit 403 abweisen oder ihre Bilder per JavaScript
  nachladen.
- **Login nötig.** Hinter `/` liegt die Anmeldung; für Screenshots der echten
  Ansichten braucht der Agent Testzugangsdaten oder einen Seed-Datenstand.
