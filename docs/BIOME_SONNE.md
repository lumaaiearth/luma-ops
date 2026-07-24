# BIOME™ — Sonnenanalyse & 3D-Schatten

Stand: 2026-07-24

## Warum simulieren statt Karte laden?

Fertige Karten passen für diese Frage nicht:
- **Berliner Solaratlas / Solare Flächenpotenziale**: Dach-PV-Potenzial, keine
  bodennahe Verschattung durch Nachbargebäude.
- **DWD-Globalstrahlung**: 1-km-Raster — ohne Gebäude, für Beet-Niveau zu grob.

Für „Wie viel Sonne bekommt genau diese Fläche im März/Juni/September/Dezember?"
braucht es Sonnenstand + Schattenwurf der realen Umgebung. Genau das rechnet
BIOME jetzt selbst — clientseitig, ohne Kosten, ohne API-Key.

## Feature 1: Sonnenstunden-Analyse (Feature-Panel)

Feature anklicken → Panel → **„☀️ Sonne & Licht → Sonnenstunden berechnen"**.

Methode (`src/lib/solar.js`, `src/lib/overpass.js`):
1. Gebäude im Umkreis von 180 m aus OpenStreetMap laden (Overpass API).
   Höhen: `height`-Tag > `building:levels` × 3,2 m + 2 m Dach > 12 m Annahme.
2. Für vier Stichtage (21.3. / 21.6. / 23.9. / 21.12.) den Tag in
   10-Minuten-Schritten durchgehen: Sonnenposition (SunCalc, NOAA-Algorithmus),
   Strahl Richtung Sonne gegen alle Gebäudekanten schneiden → verschattet ja/nein.
3. Ergebnis: **direkte Sonnenstunden je Jahreszeit** (+ maximal mögliche Stunden)
   und eine **Licht-Klasse**:
   - ≥ 6 h Sommersonne → vollsonnig (1)
   - 3–6 h → halbschattig (2)
   - < 3 h → schattig (3)

Das Ergebnis wird am Feature gespeichert (`properties.sonnenanalyse`) und beim
Sprung **„In Florales planen"** als Lichtfilter vorbelegt → die Pflanzenauswahl
passt automatisch zum Standort.

### Grenzen (ehrlich bleiben)
- **Vegetation fehlt**: Große Bestandsbäume verschatten real zusätzlich —
  vor Ort gegenprüfen bzw. gedanklich abziehen.
- OSM-Höhen sind in Berlin gut gepflegt, aber nicht überall; ohne Angabe wird
  12 m angenommen (Hinweis „geschätzt" im 3D-Tooltip).
- Reflexion/Diffusstrahlung wird nicht modelliert — es zählt direkte Sonne
  (für Pflanzenwahl die relevante Größe).
- Liegt der Punkt in einem Gebäudegrundriss (z.B. Dachfläche), wird dieses
  Gebäude nicht als Verschatter gewertet und das Ergebnis markiert.

## Feature 2: 3D-Schatten-Ansicht (Beta)

Toolbar → **„☀️ 3D-Schatten"**: Der aktuelle Kartenausschnitt (~900 × 900 m)
wird als 3D-Modell aufgebaut (deck.gl, OSM-Gebäude extrudiert) mit **echtem
Schattenwurf** nach Sonnenstand:
- Jahreszeiten-Stichtage (21.3. / 21.6. / 23.9. / 21.12. / Heute)
- Uhrzeit-Schieberegler (04:00–22:00), Auf-/Untergangszeiten, Sonnenhöhe
- Eigene BIOME-Flächen werden farbig auf dem Boden markiert
- Rechte Maustaste/2 Finger: Ansicht drehen & neigen

## Ausbaustufen (wenn mehr Genauigkeit gebraucht wird)

1. **Berlin LoD2-Gebäudemodell** (amtlich, mit Dachformen, Open Data) statt
   OSM-Höhen — genauere Schatten, aber Vorverarbeitung nötig (CityGML → Tiles).
2. **Vegetation**: Berliner Baumkataster (Kronendurchmesser/Höhe je Baum liegt
   als WFS vor) als zylindrische Verschatter in die Simulation aufnehmen.
3. **Strahlungssumme in kWh/m²** statt Stunden (Integration über das Jahr) —
   interessant für Verdunstungs-/Bewässerungsmodelle zusammen mit den Sensoren.
