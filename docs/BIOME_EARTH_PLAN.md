# BIOME™ Earth — Plan: eigenständige App auf Google-Earth-Niveau

Stand: 2026-07-29 · Zielbild, Architektur und Phasenplan, um BIOME von einem
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

1. **Klima-Report je Fläche** (P1): ein Klick → PDF/Link mit Sonnenstunden,
   Heatmap-Ausschnitt, Starkregen-Betroffenheit, Versiegelung, Baumbestand,
   Empfehlungen (Florales-Auswahl). Zielgruppe: Bezirksämter, WoBauGes.
2. **Starkregen-Check** (P1): Flächen automatisch gegen die
   Starkregengefahrenkarte prüfen → Ampel je Feature + Maßnahmenvorschlag
   (Mulde, Versickerung); Sturmschaden-Doku: Foto + Pin + Kategorie in 10 s
   (Offline-Queue existiert).
3. **Sensor-Live-Kacheln** (P2): Sensorwerte als Karten-Badges mit
   Sparkline, Schwellwert-Alarme → Aufgabe (existiert) + Telegram (existiert).
4. **Hitze-Monitoring** (P2): DWD-Vorhersage + Wärmeinsel-Layer → „Gieß-
   Prioritätenliste" der eigenen Flächen an Hitzetagen.
5. **Mandanten-Ansicht** (P3): Verwaltung sieht nur ihre Flächen/Reports
   (RLS-Rollen vorhanden), White-Label-Header.

## 6 · Solar-Roadmap (Heatmap ist da — Ausbau)

- ✅ Sommer-Heatmap (21.6., 4-m-Raster, LoD2 + Bäume, Gebäude maskiert)
- P1: alle 4 Stichtage vorrechnen + Umschalter in der Zeitleiste; Legende
  (Farbskala → Stunden) im Layer-Panel
- P1: Heatmap in der 3D-Ansicht auf den Boden projizieren
- P2: kWh/m²-Variante + GeoTIFF-Export (für GIS-Abteilungen der Ämter)
- P2: „Was-wäre-wenn": Baum pflanzen/fällen → Heatmap-Delta live

## 7 · 3D-Qualität (bekannte Punkte)

- Bäume: aktuell volle Kronenzylinder ab Boden → Stamm + angehobene Krone
  (zwei Meshes), Kugel-/Kegelkronen nach `art_gruppe` (Laub/Nadel)
- LoD2-Nahtstelle: Prisma/Dachmodell-Dopplung an der Patch-Grenze ✅ behoben
- Dachüberstände/Gauben: LoD2 bildet sie ab, Innenring-Flächen (Löcher)
  werden noch als eigene Fläche gerendert → Ring-Zuordnung im Patch-Generator
- Terrain: heute „Berlin ist flach"-Annahme (Gebäude einzeln genullt);
  bei MapLibre-Migration echtes DGM-Terrain (Berlin DGM1 ist Open Data)
- Performance: Patch-Meshes als binäre Buffer (statt JSON) laden

## 8 · Phasen & grobe Aufwände

| Phase | Inhalt | Aufwand |
|---|---|---|
| **P0 — sofort** | `/earth`-Route als Standalone-PWA (eigenes Fenster), Heatmap-Layer ✅, 3D-Fixes | 1–2 Tage |
| **P1 — Earth-Gerüst** | MapLibre-Canvas + deck.gl interleaved, Rail-UI, Omnibox, Zeitleiste, Klima-Report, Starkregen-Check, 4-Jahreszeiten-Heatmaps | 2–3 Wochen |
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
