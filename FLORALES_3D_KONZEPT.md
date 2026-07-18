# Florales™ — Konzept: 3D-Pflanzbild & Pathmaker-Umbau

> Vorschlag (noch keine Implementierung). Referenz: Pollinator Pathmaker
> (pollinator.art, A. D. Ginsberg / Eden Project) — Screenshots im Drive-Ordner
> `1UNfDN6v-N4k_H0rYr9vinv7euGNWdcXr`. Nordstern aus dem Habitat-Handoff:
> „wie Pathmaker, aber wissenschaftlicher/professioneller".

## Was der Pathmaker macht (aus den Screenshots)

1. **Wizard**: Standort & Größe (0,5-m-Raster, Quadrate abwählbar) → Boden
   (Konsistenz + pH) → Licht & Exposition → „Empathie"-Regler (Pflanzenarten
   wenig↔mehr, Anlage klar↔komplex, Flugrouten) → „Erstelle mein Kunstwerk".
2. **3D-Ansicht**: isometrischer Blick aufs Beet, malerische Pflanzen-Sprites,
   drehbar/zoombar, Bodenraster.
3. **Saison-Stepper + Play**: Frühling→Herbst, Blühaspekte wechseln, Play
   animiert das Gartenjahr.
4. **Art-Bestimmung**: Tippen auf eine Pflanze → Karte mit lat./dt. Namen,
   Einzelpflanzen-Porträt, „Weitere Infos".
5. **Bestäuber-Ansicht**: Insekten-Icon (Flugrouten-Visualisierung).
6. **Export**: Pflanzanleitung als PDF mit Rasterplan (Zellcodes je Art),
   Share-Link mit Garten-ID.

## Was Florales heute schon hat (Vorsprung nutzen)

- **Artdaten sind 3D-tauglich**: `plants.js` führt je Art `hoehe`, `ausbreitung`,
  `pflanzabstand`, `wuchsform`, `bluete_monate`, `bluete_farbe`, `type` — mehr
  Parameter, als der Pathmaker anzeigt (Nektar/Pollen 1–5, Raupenfutter-Arten,
  pH, Drainage, heimisch-Flag, naturaDB-Quelle).
- **Platzierung existiert**: `BeetPlaner.plantsWithPlacement`
  (`PlanningPage.jsx:1132`) berechnet deterministisch (seeded) Einzelpositionen
  mit Drift-Clusterung, Höhenstaffelung und Kollisionsvermeidung — exakt die
  Datengrundlage einer 3D-Szene.
- **Generator + Regler** existieren (`Generator`, `GenSlider`): Zielgruppen,
  Artenvielfalt, heimisch-Anteil. Wissenschaftlicher als Pathmakers 3 Regler.
- **BloomCalendar**, Habitatkatalog, PDF/PNG-Export, Offline-Outbox.

**Fazit: Es fehlt nur die dritte Dimension der Darstellung — nicht die Daten
und nicht der Algorithmus.**

## Wie die 3D-Modelle entstehen (Kern des Vorschlags)

Keine handmodellierten 3D-Assets, keine Foto-Scans. Stattdessen **prozedurale
Pflanzenporträts aus den vorhandenen Datenfeldern** — derselbe Trick, der den
Pathmaker-Look erzeugt (dort handgemalte Sprites, bei uns generierte):

1. **Archetyp je Art** (ein neues Feld `archetyp` in `plants.js`):
   `aehre` (Salbei, Natternkopf) · `dolde` (Schafgarbe, Engelwurz) · `korb`
   (Kamille, Flockenblume) · `glocke` · `lippe` · `gras` · `bodendecker` ·
   `rosette` · `strauch` · `baum`. Für ~440 Arten per Gattungs-Mapping
   automatisch ableitbar, Rest manuell.
2. **Sprite-Fabrik** (Offscreen-Canvas, ~200 Zeilen): malt aus
   `archetyp + hoehe + ausbreitung + bluete_farbe + wuchsform` ein
   Pflanzenporträt — Stängelbündel als gebogene Striche, Blattwerk als
   Punktwolken, Blütenstände je Archetyp. Seeded → deterministisch, 2–3
   Varianten je Art. Drei Zustände je Monat: **vor der Blüte** (grün),
   **Blüte** (`bluete_farbe`), **Samenstand** (braun/beige), plus
   Wuchsfaktor (März klein → Juli voll).
3. **Szene**: `plantsWithPlacement` liefert (x, y, Art) je Individuum →
   Projektion ins Isometrische, Tiefensortierung (Painter's Algorithm),
   Sprites von hinten nach vorne zeichnen. Drehen = Rotationswinkel ändern
   und neu zeichnen; Zoom = Skalierung. 500–1000 Individuen sind mit
   gecachten Sprites auf jedem Handy flüssig.

**Beweis**: klickbarer Prototyp (Artefakt „Florales 3D-Prototyp", Session vom
18.07.2026) — 6 echte Arten aus `plants.js`, 480 Individuen, Saison-Stepper
März–Oktober, Play-Animation, Tap-Bestimmung mit Nektar-/Pollenwerten.
**0 neue Dependencies**, reines Canvas 2D, Bundle-Kosten ≈ 15 kB.

### Warum Canvas-Isometrie statt three.js (Stufe 1)

| | Canvas-Isometrie | three.js / react-three-fiber |
|---|---|---|
| Dependencies | keine | ~600 kB (lazy-loadbar) |
| Look | exakt der malerische Pathmaker-Look | eher „Spiel-Engine", Sprites nötig |
| Kamera | Drehen + Zoom + Neigung (fest) | freier Orbit, Kamerafahrten |
| Capacitor/alte Geräte | unkritisch | WebGL-Kontextverluste möglich |
| Insekten-Flugrouten | machbar (2D-Pfade) | schöner (3D-Partikel) |

Empfehlung: **Stufe 1 Canvas** (sofort, risikolos, gleicher Look). three.js
erst, wenn freie Kamera oder Insektenflug-Animationen gewünscht sind — die
Sprite-Fabrik bleibt dabei 1:1 wiederverwendbar (Sprites werden dann
Billboard-Texturen).

## Umbauplan

### Phase 1 — 3D-Vorschau (der „Wow"-Moment)
- `src/lib/planting.js`: `plantsWithPlacement` aus `BeetPlaner` extrahieren
  (2D-Canvas und 3D nutzen dieselbe Platzierung → Plan = Vorschau).
- `src/lib/plantSprites.js`: Sprite-Fabrik (Archetypen, Zustände, Wuchsfaktor).
- `src/components/Beet3D.jsx`: Iso-Renderer mit Drehen/Zoom/Tap,
  Saison-Stepper + Play (ersetzt/ergänzt den Blühfolge-Regler), Umschalter
  **2D-Plan | 3D-Ansicht** im Beet-Tab.
- `plants.js`: Feld `archetyp` ergänzen (Gattungs-Mapping + Review).
- Habitatelemente als einfache Objekte (Totholz, Steinhaufen, Wasserstelle,
  Nisthilfe) in der Szene — hat der Pathmaker nicht.

### Phase 2 — Wissenschaft sichtbar machen (unser USP)
- **Art-Bestimmung per Tap**: Karte mit Foto (`wiki_img`), Nektar/Pollen,
  Raupenfutter-Arten, heimisch-Badge, naturaDB-Link → seriöser als Pathmakers
  Kunstkarte.
- **Bestäuber-Ansicht**: Filter „Was blüht für Wildbienen/Tagfalter/… im
  Monat X?" — nicht blühende Pflanzen abdimmen (Daten vorhanden:
  `bienen/tagfalter/nachtfalter/kaefer/voegel`). Blühlücken-Warnung aus
  BloomCalendar direkt in der 3D-Ansicht („im April blüht hier nichts").
- **Kennzahlen-Leiste** über der Szene: Arten, Individuen, heimisch-%,
  blühend im Monat, Nektarangebot-Verlauf.
- 3D-Snapshot (PNG) in den bestehenden PDF-Export.

### Phase 3 — Erlebnis & Public-Tool
- Play-Animation über mehrere Jahre (Jahr 1 lückig → Jahr 3 geschlossen,
  aus `ausbreitung` ableitbar) — wissenschaftlich ehrlicher als Pathmaker.
- Insekten-Flugrouten-Animation (Partikel folgen Blühschwerpunkten des Monats).
- Wizard-Modus fürs Public-Tool (Boden/pH/Licht-Schritte wie Pathmaker,
  gespeist aus den vorhandenen Filtern + Generator), von OpsContext entkoppelt
  (steht so schon im Habitat-Handoff), Share-Link mit Plan-ID.

## Aufwand (grob)

| Schritt | Umfang |
|---|---|
| Platzierung extrahieren + Sprite-Fabrik + Beet3D | 1–2 Sessions |
| `archetyp` für ~440 Arten | ½ Session (Mapping + Stichproben) |
| Saison/Play/Tap/Kennzahlen | 1 Session |
| Bestäuber-Ansicht + PDF-Snapshot | 1 Session |
| Wizard/Public + Flugrouten | separat planen |

## Risiken / Gotchas

- Habitate weiterhin **nicht** in `plantsWithPlacement` einspeisen
  (NaN-Gefahr, s. Handoff) — eigene Platzierungsliste für Habitatobjekte.
- Sprite-Cache begrenzen (Arten × Zustände × Wuchsstufen), sonst
  Speicher auf alten iPhones.
- `bluete_monate` muss für alle neuen Arten gepflegt sein (ist ohnehin
  Pflichtfeld laut Handoff Schritt 4).
- Kein Eingriff in `positionen`/Biodiversitäts-Score — 3D ist reine
  Darstellungsschicht über dem bestehenden Plan.
