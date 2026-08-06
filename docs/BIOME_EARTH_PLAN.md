# BIOME™ Earth — Plan: eigenständige App auf Google-Earth-Niveau

Stand: 2026-07-29 (Umsetzungsstand nachgeführt) · Zielbild, Architektur und Phasenplan, um BIOME von einem
Karten-Tab in eine eigenständige Geo-Plattform für Klimaanpassung zu entwickeln
— „Google Earth für Verwaltungen und Grünflächen-Profis", mit echten
Klimadaten statt nur Globus.

## 1 · Zielbild

Eine App, eigenes Fenster/eigene URL (`earth.luma-biome.de` bzw. installierbare
PWA), die drei Dinge auf Earth-Niveau kann und vier Dinge, die Earth nicht kann:

**Earth-Niveau (nachbauen):**
- Ein nahtloser 2D↔3D-Canvas (kein Moduswechsel-Bruch), kinoreifes Fly-to
- Projektordner-Baum mit Features, Suche als Omnibox, Import/Export (KML/GeoJSON)
- Zeitachse (Datum + Uhrzeit) als durchgängiges Bedienelement unten

**Darüber hinaus (unser Vorsprung — existiert in Grundform schon):**
- Amtliche Klimadaten als Live-Layer (Wärmeinseln, PET, Starkregen, Radar …)
- Eigene Simulationen: Sonnenstunden/Heatmaps aus LoD2 + Baumkataster
- Sensorik live (Bodenfeuchte etc.) mit Verlauf und Alarmen am Ort
- Betriebsdaten: Flächen, Pflanzpläne (Florales™), Einsätze, Fotos, Aufgaben

## 2 · Inventar (steht schon, wird übernommen)

| Baustein | Status |
|---|---|
| Feature-Erfassung (Baum/Beet/Fläche/Punkt/Linie), Panel, Fotos | ✅ produktiv |
| Klima-/Regen-/Vegetations-Layer (verifizierte WMS) | ✅ produktiv |
| Sonnenanalyse (LoD2 + Baumkataster + kWh) | ✅ produktiv |
| Sonnen-Heatmaps (4-m-Raster je Projektgebiet, vorberechnet) | ✅ produktiv |
| 3D-Schatten (deck.gl, LoD2-Dachformen, Bäume) | ✅ Beta |
| Sensoren mit GPS + Verlauf | ✅ produktiv (Hardware folgt) |
| Suche (Adresse/Projekt/Feature) | ✅ produktiv |
| LoD2-/Heatmap-Pipeline als Skripte | ✅ produktiv |
| `/earth`-Route (Vollbild ohne Ops-Chrome) | ✅ produktiv |
| Klima-Steckbrief mit Kartenausschnitt (druckbar) | ✅ produktiv |
| Kunden-Klimadashboard `/klima` (Scope, Punktwolke, IDW-Fläche, CSV) | ✅ produktiv |
| Alarmregeln je Sensor (Schwellen ↑↓, Telegram, Aufgabe) | ✅ produktiv |
| Sonnenanalyse als Mehrpunkt-Stichprobe über die Fläche | ✅ produktiv |

## 3 · Architektur-Entscheidungen

### 3.1 Rendering: ein Canvas statt zwei Welten (Kern der Earth-Anmutung)
Heute: Leaflet (2D) + deck.gl (3D) als getrennte Ansichten. Earth-Gefühl
entsteht durch **einen** WebGL-Canvas:
- **MapLibre GL JS** als Basis (Vektorkarten, Neigen/Rotieren, Terrain,
  fill-extrusion) + **deck.gl interleaved** (`@deck.gl/mapbox`) für unsere
  Layer (LoD2-Meshes, Bäume, Schatten, Heatmaps, Sensoren).
- Basemap-Stile: Satellit (Raster), „Clean"-Vektorstil (hell/dunkel, eigene
  LUMA-Optik — Vektorkacheln z.B. OpenFreeMap/Protomaps, kostenlos).
- Leaflet bleibt bis zum Abschluss der Migration parallel lauffähig
  (Feature-Flag), damit nie ein kaputter Stand deployt wird.

### 3.1a Evaluation MapLibre (Juli 2026) — Ergebnis: noch nicht migrieren

Der Umstieg wurde bewertet, bevor Code entsteht. Die Zahlen aus dem heutigen
Stand:

| Punkt | Befund |
|---|---|
| Leaflet-Oberfläche | 4 Dateien mit `react-leaflet`, ~37 Komponenten-Instanzen (Marker, TileLayer/WMSTileLayer, GeoJSON, ImageOverlay, Popup/Tooltip), 4 Stellen mit `useMap`/`useMapEvents` |
| Zeichnen | `@geoman-io/leaflet-geoman-free`, 6 Aufrufe inkl. `Draw[shape]._removeLastVertex()` für „letzten Punkt zurück" |
| WMS | `WMSTileLayer` deckt heute 12 amtliche Dienste ab; MapLibre hat kein WMS-Primitiv (Raster-Source mit selbst gebauter GetMap-URL nötig, inkl. BBOX-Achsenreihenfolge EPSG:4326) |
| Layerdefinitionen | `biomeLayers.js` ist bereits renderer-neutral — migriert sich mit |
| deck.gl | schon in Benutzung (3D), `@deck.gl/mapbox` wäre der Klebstoff |

**Bewertung.** Der Gewinn (ein Canvas, Neigen/Rotieren, Terrain) betrifft das
Erlebnis, nicht die Aussagekraft. Der Preis ist konkret: Zeichnen komplett neu
(Geoman hat kein Gegenstück gleicher Reife — Kandidaten wären terra-draw oder
mapbox-gl-draw), WMS-Anbindung von Hand, alle Popups/Tooltips neu, und das
Ganze an der Stelle, an der die App produktiv genutzt wird.

**Entscheidung.** Migration bleibt P1, aber nach den Verwaltungs-Modulen. Bis
dahin gilt: (a) keine neue Leaflet-spezifische Logik in Komponenten, die
später wandern — Geometrie- und Datenlogik gehört in `src/lib/*` (so gebaut:
`geo.js`, `idw.js`, `mapSnapshot.js`, `solar.js`, `sensorAlarm.js` sind
renderer-frei und laufen im Node-Test); (b) der Prototyp startet als eigene
Route neben `/map`, nicht als Umbau — damit ist jederzeit vergleichbar, ob das
Ergebnis wirklich besser ist.

### 3.2 Eigene App
- **Stufe 1 (sofort, 0 Aufwand-Risiko):** eigene Route `/earth` als
  Vollbild-App ohne Ops-Chrome + „In neuem Fenster öffnen" (window.open,
  PWA-Manifest mit `display: standalone` — eigenes Fenster wie eine
  Desktop-App, auch installierbar).
- **Stufe 2:** eigene Subdomain + eigenes Manifest/Icon („BIOME Earth"),
  gleiche Codebasis (Vite Multi-Entry), gleiche Supabase.
- **Stufe 3 (bei Bedarf):** getrenntes Produkt-Repo mit Auth-Mandanten für
  externe Verwaltungen (RLS-Rollen existieren schon: kunde_viewer/gast).

### 3.3 Daten-Pipeline
- LoD2-Patches + Heatmaps: heute Skripte → **GitHub Action**, die bei neuem
  Projekt (oder monatlich) Patches/Heatmaps automatisch nachrechnet.
- Ab ~20 Gebieten: Ablage nach Cloudflare R2/Supabase statt Repo.
- Stadtweite LoD2 (3D-Tiles-Hosting) erst, wenn Analysen regelmäßig
  außerhalb der Projektgebiete gebraucht werden.

## 4 · UI-Konzept (Earth-Vorbild, LUMA-DNA)

```
┌────────────────────────────────────────────────────────────┐
│ ⌕ Omnibox (Adresse/Projekt/Feature/Layer)      ◔ Profil    │
│┌──────┐                                                    │
││ Rail │   ← Karte/3D, ein Canvas, frei neig-/drehbar       │
││ 🗂 📚 │                                                    │
││ ☀ 📡 │                        ┌─ Kontextpanel (rechts) ─┐  │
││ 🌧 ⚙ │                        │ Feature/Sensor/Analyse  │  │
│└──────┘                        └─────────────────────────┘  │
│ ── Zeitleiste: ◂ 21.3. ─ 21.6. ─ 23.9. ─ 21.12. ▸  🕒 14:30 │
└────────────────────────────────────────────────────────────┘
```
- **Rail links** (wie Earth): Projekte, Ebenen-Bibliothek, Sonne/Klima,
  Sensoren, Regen, Einstellungen — je ein aufschiebbares Panel.
- **Ebenen-Bibliothek** statt Schalterliste: Karten mit Vorschau, Legende,
  Datenstand, Quelle (wie Earth „Data layers", aber mit unseren Klimadaten).
- **Zeitleiste unten** als globales Element: steuert 3D-Schatten, Radar,
  (später) Sensor-Verlauf und Heatmap-Jahreszeit gemeinsam.
- **Kontextpanel rechts** bleibt (heutiges Feature-Panel), bekommt Tabs:
  Info · Sonne · Sensorik · Fotos · Florales.
- Fly-to-Animationen (MapLibre `flyTo` mit Kurve) für Suche & Projektwechsel.

## 5 · Verwaltungs-Module (der eigentliche Mehrwert)

1. **Klima-Report je Fläche** ✅ umgesetzt (`ClimateReport.jsx`): druckbarer
   Steckbrief mit Sonnenstunden, Hitze/PET, Versiegelung, Grünvolumen,
   Starkregen, Empfehlungen, Quellenangabe — inklusive Luftbild der Fläche
   mit Umriss und Übersichtskarte, damit der Ausdruck ohne App verständlich
   ist. Offen: PDF-Versand/Link statt Browser-Druck.
2. **Starkregen-Check** ✅ umgesetzt (`starkregen.js`): Ampel je Fläche gegen
   die Starkregengefahrenkarte, Ergebnis am Objekt gespeichert; Ausfall des
   Dienstes wird als „unbekannt" gezeigt statt fälschlich als grün.
   Offen: Maßnahmenvorschlag (Mulde/Versickerung) und Sturmschaden-Doku.
3. **Sensor-Live-Kacheln** ✅ umgesetzt: Panel „📡 Sensoren" in der Karten-
   Toolbar zeigt je Sensor aktuellen Wert, Sparkline, Tendenz und min/ø/max;
   dieselbe Kurve steckt im Marker-Popup. Alarme stehen oben und der Toolbar-
   Button trägt die Anzahl als Badge. Technik: `sensorSeries.js` (reine
   Rechenlogik, per `npm test` geprüft), `sensorHistory.js` (lädt alle
   Sensoren in EINER Abfrage, 5-Minuten-Cache, erst beim Öffnen des Panels),
   `Sparkline.jsx` (reines SVG, absichtlich ohne Recharts — auf der Karte
   liegen viele Kacheln gleichzeitig).
   Beschriftet wird mit dem echten Zeitraum der Messwerte statt mit einer
   festen Angabe; liegt der jüngste Wert über 3 Tage zurück, sagt die Kachel
   „seit N Tagen kein Wert". Grund: Die Messwerte kommen schubweise — aktuell
   liegen 1348 Werte für s1–s4 vom 4.–11.7. in der DB, ein 7-Tage-Fenster
   hätte jede Kachel leer aussehen lassen.
   Alarmteil ✅ umgesetzt (`sensorAlarm.js`): Warn-/Kritisch-Schwellen nach
   oben und unten je Sensor, Hysterese, Ruhezeit, Flatterschutz, Ziel-Gruppe
   in Telegram, Aufgabe im wählbaren Bereich.
   Offen: Die Tabelle `sensors` ist in der DB leer — die Sensorliste kommt aus
   `SEED_SENSORS` (ohne GPS, daher keine Marker). Sobald echte Hardware Sensoren
   mit Koordinaten anlegt, erscheinen sie ohne weitere Änderung auch als Marker.
4. **Hitze-Monitoring** (P2): DWD-Vorhersage + Wärmeinsel-Layer → „Gieß-
   Prioritätenliste" der eigenen Flächen an Hitzetagen.
5. **Mandanten-Ansicht** (P3): Verwaltung sieht nur ihre Flächen/Reports
   (RLS-Rollen vorhanden), White-Label-Header.

## 6 · Solar-Roadmap (Heatmap ist da — Ausbau)

- ✅ Sommer-Heatmap (21.6., 4-m-Raster, LoD2 + Bäume, Gebäude maskiert)
- ✅ alle 4 Stichtage vorgerechnet + Jahreszeit-Umschalter, Legende im
  Layer-Panel
- ✅ Heatmap in der 3D-Ansicht auf den Boden projiziert
- ✅ Sonnenanalyse als Mehrpunkt-Stichprobe über große Flächen (min/Median/max
  je Jahreszeit) statt nur am Schwerpunkt
- P2: kWh/m²-Variante + GeoTIFF-Export (für GIS-Abteilungen der Ämter)
- P2: „Was-wäre-wenn": Baum pflanzen/fällen → Heatmap-Delta live

## 7 · 3D-Qualität (bekannte Punkte)

- Bäume: ✅ Stamm + angehobene Krone als zwei Meshes, Kugel-/Kegelform nach
  `art_gruppe` (Laub/Nadel); Kronenansatz aus einer gemeinsamen Quelle
  (`crownBase` in `solar.js`), damit Schattenrechnung und Darstellung
  dasselbe Modell benutzen
- LoD2-Nahtstelle: Prisma/Dachmodell-Dopplung an der Patch-Grenze ✅ behoben
- Dachüberstände/Gauben: LoD2 bildet sie ab, Innenring-Flächen (Löcher)
  werden noch als eigene Fläche gerendert → Ring-Zuordnung im Patch-Generator
- Terrain: heute „Berlin ist flach"-Annahme (Gebäude einzeln genullt);
  bei MapLibre-Migration echtes DGM-Terrain (Berlin DGM1 ist Open Data)
- Performance: Patch-Meshes als binäre Buffer (statt JSON) laden

## 8 · Phasen & grobe Aufwände

| Phase | Inhalt | Aufwand |
|---|---|---|
| **P0 — sofort** ✅ | `/earth`-Route als Standalone-PWA (eigenes Fenster), Heatmap-Layer, 3D-Fixes | erledigt |
| **P1 — Earth-Gerüst** | Klima-Report ✅, Starkregen-Check ✅, 4-Jahreszeiten-Heatmaps ✅ · offen: MapLibre-Canvas + deck.gl interleaved, Rail-UI, Omnibox, Zeitleiste | 2–3 Wochen |
| **P2 — Tiefe** | Sensor-Live-Kacheln, Hitze-Monitoring, kWh/GeoTIFF, Was-wäre-wenn-Bäume, 3D-Baumformen, Terrain | 3–4 Wochen |
| **P3 — Produkt** | Subdomain/Branding „BIOME Earth", Mandanten für Ämter, Automations-Pipeline (GitHub Action) | 2–3 Wochen |

## 9 · Kosten & Risiken

- Laufende Kosten bleiben ~0 €: alle Datenquellen offen (GDI Berlin dl-de,
  DWD GeoNutzV, LoD2 dl-de/zero, OpenFreeMap/Protomaps frei); Rechenlast
  liegt in Vorverarbeitung (Skripte/Action), nicht zur Laufzeit.
- Größtes technisches Risiko: die Leaflet→MapLibre-Migration (P1). Deshalb
  Feature-Flag-Strategie und Layerdefinitionen, die schon heute
  renderer-neutral sind (`biomeLayers.js`).
- Google-Earth-Feature „fotorealistische 3D-Meshes" ist lizenzrechtlich
  nicht nachbaubar (Google-eigene Daten) — unser Gegenangebot ist das
  amtliche LoD2 + echte Analysen darauf, was Earth wiederum nicht kann.
