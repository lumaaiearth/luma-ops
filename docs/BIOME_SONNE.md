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

Methode (`src/lib/solar.js`, `src/lib/berlinGeo.js`, `src/lib/overpass.js`):
1. **Verschatter laden** (Umkreis 180 m):
   - In Berlin: **amtliche ALKIS-Gebäude** (offizielle Grundrisse; Höhe aus
     `hoh` bzw. Geschosszahl × 3,3 m + 2 m) **+ Baumkataster** (jeder Baum als
     Kronenzylinder mit echtem Kronendurchmesser und Baumhöhe).
   - Außerhalb Berlins / GDI-Ausfall: OpenStreetMap-Fallback (ohne Bäume).
2. Für vier Stichtage (21.3. / 21.6. / 23.9. / 21.12.) den Tag in
   10-Minuten-Schritten durchgehen: Sonnenposition (SunCalc, NOAA-Algorithmus),
   Strahl Richtung Sonne gegen Gebäudekanten und Baumkronen schneiden.
   **Laub-Faktor**: Baumschatten zählt saisonal durchlässig
   (21.3. ≈ 55 % Licht, 21.6. 0 %, 23.9. 15 %, 21.12. 60 %).
3. Ergebnis je Jahreszeit:
   - **direkte Sonnenstunden** (+ maximal mögliche Stunden)
   - **≈ kWh/m² am klaren Tag** (Meinel-Klarhimmelmodell, Direktstrahlung auf
     die Horizontale — Potenzialwert, keine Wetterstatistik)
   - **Licht-Klasse**: ≥ 6 h Sommersonne → vollsonnig (1) · 3–6 h →
     halbschattig (2) · < 3 h → schattig (3)

Das Ergebnis wird am Feature gespeichert (`properties.sonnenanalyse`) und beim
Sprung **„In Florales planen"** als Lichtfilter vorbelegt → die Pflanzenauswahl
passt automatisch zum Standort.

### Grenzen (ehrlich bleiben)
- **Bäume**: nur amtlich erfasste Straßen- & Anlagenbäume — Privatgärten und
  Wald fehlen. Krone wird als Zylinder modelliert (real: unregelmäßig).
- Gebäude ohne Höhen-/Geschossangabe: 12 m Annahme („geschätzt" im 3D-Tooltip);
  Dachformen (LoD2) sind nicht modelliert — Traufhöhe zählt.
- kWh/m² = **Klarhimmel-Potenzial** (Direktstrahlung, horizontal). Reale
  Jahressummen liegen wegen Bewölkung bei grob 50–60 % davon; Diffusstrahlung
  (auch im Schatten vorhanden) ist nicht enthalten.
- Liegt der Punkt in einem Gebäudegrundriss (z.B. Dachfläche) oder direkt
  unter einer Kronenkarte, wird dieser Verschatter ausgenommen und markiert.

## Feature 2: 3D-Schatten-Ansicht (Beta)

Toolbar → **„☀️ 3D-Schatten"**: Der aktuelle Kartenausschnitt (~900 × 900 m)
wird als 3D-Modell aufgebaut (deck.gl) mit **echtem Schattenwurf** nach
Sonnenstand:
- In Berlin: **ALKIS-Gebäude** (amtliche Grundrisse + Geschosshöhen) und
  **Baumkataster-Bäume** als grüne Kronenzylinder (zuschaltbar), sonst OSM
- Jahreszeiten-Stichtage (21.3. / 21.6. / 23.9. / 21.12. / Heute)
- Uhrzeit-Schieberegler (04:00–22:00), Auf-/Untergangszeiten, Sonnenhöhe
- Eigene BIOME-Flächen werden farbig auf dem Boden markiert
- Tooltips: Gebäudehöhe bzw. Baumart/Höhe/Krone
- Rechte Maustaste/2 Finger: Ansicht drehen & neigen

## LoD2-Dachformen (amtliches 3D-Stadtmodell)

Für die Projektgebiete liegen **echte Dachgeometrien** aus dem Berliner
LoD2-Stadtmodell bei (Lizenz dl-de/zero): `public/lod2/<gebiet>.json`,
erzeugt mit `node scripts/lod2-patch.mjs --name <slug> --lat … --lng …`
(lädt die CityGML-Kacheln vom offiziellen ATOM-Feed, filtert auf 350 m
Umkreis, konvertiert UTM33→WGS84 — Genauigkeit < 1 mm, gegen pyproj
verifiziert).

Wo ein Patch existiert, gilt automatisch:
- **Sonnenanalyse** rechnet den Sonnenstrahl gegen die echten Dach- und
  Wandflächen (3D-Ray-Casting) statt gegen Höhen-Prismen. Effekt real
  messbar: Schrägdächer verschatten zur Traufe hin weniger — am
  R95-Testpunkt z.B. 6,0 statt 5,7 h Sommersonne (kippte die Licht-Klasse).
- **3D-Ansicht** rendert die Dachformen (Dächer terrakotta, Wände hell)
  mit echtem Schattenwurf; außerhalb des Patches weiterhin Prismen.

Neues Projektgebiet? Einfach den Generator mit den Projektkoordinaten
laufen lassen und committen — die App findet den Patch über
`public/lod2/index.json` von selbst.

## Weitere Ausbaustufen (bei Bedarf)

1. **Wetterkorrigierte Jahressummen**: Klarhimmel-Potenzial × DWD-Bewölkungs-
   statistik → reale kWh/m²/Jahr, kombinierbar mit Bodenfeuchte-Sensoren für
   Bewässerungsprognosen.
2. **LoD2 stadtweit** statt Projekt-Patches (CityGML → 3D-Tiles-Pipeline +
   eigenes Hosting) — nur nötig, wenn Analysen regelmäßig außerhalb der
   Projektgebiete gebraucht werden.
