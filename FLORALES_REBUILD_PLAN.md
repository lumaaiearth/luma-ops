# Florales — Neuaufbau (Plan)

> Beschlossen mit Malte, 2026-07. Ersetzt den bisherigen Tab-Aufbau. Ablauf in
> 3 Schritten, geführt. Entscheidungen: Standort-Daten via externe API +
> Offline-Fallback · Einstieg BIOME primär + manueller Fallback · Bau
> schrittweise (nach jeder Stufe live & prüfbar).

## Ablauf (3 Screens)

### Screen 1 — Start & Standort
- Kurzer Welcome-Text: was Florales leistet (Zusammenstellung/Planung von
  Staudenbeeten für ökologische Pflanzprojekte).
- **Fläche aus BIOME**: Button „Fläche in BIOME einzeichnen" → MapPage → Shape
  wird zurück nach Florales übernommen (exakte Polygon-Geometrie).
- Manueller Fallback: Rechteck/Oval + Maße eintippen (ohne Karte).
- Nach Shape-Definition: **leeres Beet mit Meta-Daten**
  - lokal: GPS (Schwerpunkt), Umfang, Fläche, exakte Form
  - via API (+Fallback): Höhe ü. NHN (open-elevation), Klimazone/Winterhärtezone
  - Standortfaktoren: Licht, Feuchte, Boden, pH (Eingabe)
- **Blickrichtung der Besucher** auf der Karte setzen (Pfeil) → steuert die
  Höhenschichtung (hohe Arten hinten, flache vorne).
- Keine abstrakten „Regler" (Empathie-Style) mehr.

### Screen 2 — Beet & Pflanzen
- **2D-Rasterplan als Hauptansicht**: farbige Blöcke (Farbe = Blütenfarbe) +
  Buchstaben-Code. Füllt die **exakte Beetform** (Polygon-Rasterung), nicht mehr
  nur Rechteck/Oval. 3D-Fotoansicht vorerst archiviert.
- **① Automatisch füllen**: unter Berücksichtigung aller Standortfaktoren +
  Blickrichtung (Höhenschichtung). Nutzt generatePlan/assignCounts.
- **② Selbst auswählen**: EIN konsolidierter Filter (die doppelten raus),
  Pflanzen hinzufügen; **Drag & Drop** im Rasterplan zum Umsortieren.

### Screen 3 — Übersicht & Export
- Übersicht wie bisher, angereichert um wissenschaftliche Indikatoren:
  Klimazone, Standort-Infos, **regionsspezifische Pflanz-/Pflegehinweise**
  (z. B. Berlin: erste 2 Jahre intensiver wässern).
- **Kostenkalkulation** fürs Gesamtprojekt (verbessert).
- **Exporte**: (a) Gesamt-Übersicht als PDF, (b) **simple Excel-Bestellliste**
  für die Baumschule (Art, Menge, Größe).

## Machbarkeit BIOME → Florales
- MapPage speichert bereits exakte GeoJSON-Polygone pro Fläche und navigiert zu
  `/planning` (bisher nur `area_m2`). → Erweitern: **volle Geometrie** übergeben.
- Aus dem Polygon lokal ableitbar: Schwerpunkt (GPS), Umfang (Haversine),
  Fläche, Bounding-Box, Form für die Beet-Rasterung.

## Wiederverwendung
- `beetLayout.js`: `buildGrid` (Blöcke+Buchstaben — genau die gewünschte 2D-
  Ansicht), `computePlacement` (Höhenschichtung).
- `preise.js` `calcAngebot` (Kalkulation), `exportPdf`, reiche Pflanzenfelder
  (licht/wasser/boden/ph_min/max/drainage, Nektar/Pollen, heimisch …).

## Neu zu bauen
- `shapeMeta.js`: Zentroid/Umfang/Fläche/lokale Meter-Projektion, Point-in-
  Polygon.
- Polygon-Maske in `buildGrid` (nur Zellen innerhalb des Umrisses füllen).
- Screen-1-Komponente (Welcome/Standort), Meta-Daten-Abruf.
- Konsolidierter Filter, Drag & Drop im Rasterplan.
- Excel-Export, regionale Pflegehinweise.

## Bau-Stufen
1. **Fundament + Kern-Flow**: Shape-Übergabe (volle Geometrie) · shapeMeta ·
   Polygon-Rasterung · 3-Screen-Gerüst · Auto-Füllen · manuelle Auswahl (ein
   Filter) · Drag & Drop.
2. **Meta-Daten**: Höhe/Klimazone (API+Fallback) · regionale Pflegehinweise.
3. **Export/Kalkulation**: verbesserte Kostenkalkulation · simple Excel für die
   Baumschule · angereicherter PDF-Export.

Nach jeder Stufe: `npm run build` grün, nach `main`, live auf luma-biome.de.
