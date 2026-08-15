# BIOME™ — Karten-Ebenen & Datenquellen

Stand: 2026-07-21 · Definitionen in `src/data/biomeLayers.js` (alle Endpunkte
verifiziert: GetCapabilities + GetMap in EPSG:3857).

## Basiskarten

| Ansicht | Quelle | Hinweis |
|---|---|---|
| Satellit | Esri World Imagery | höchste Auflösung, Stand variiert |
| Sentinel-2 | EOX s2cloudless 2024 (ESA/Copernicus) | echtes, wolkenfreies Satellitenmosaik — vorher war der Button ohne Funktion |
| Dunkel / Hell | CARTO (OSM) | Arbeits-/Präsentationskarten |

## Overlays (echte Daten)

### 🌡️ Hitze & Stadtklima — Klimamodell Berlin 2022 (Umweltatlas, 10-m-Raster)
- **Wärmeinseln (Nacht 4 Uhr)** — Lufttemperatur nachts: wo die Stadt nicht abkühlt. *Das* Heat-Island-Layer.
- **Hitze tagsüber (14 Uhr)** — Hitze-Hotspots für Pflanz- & Bewässerungsplanung.
- **Hitzestress (PET)** — gesundheitliche Belastung; Argument für Entsiegelung/Begrünung gegenüber Auftraggebern.
- **Kaltluftströme** — Flächen, die nachts kühlen; freihalten!
- **Versiegelung 2021** — Versiegelungsgrad je Block; Potenzialflächen für Entsiegelung.

### 🌧️ Regen & Überflutung
- **Regenradar (live)** — DWD, 5-Minuten-Takt, deutschlandweit. Nur sichtbar, wenn es gerade regnet.
- **Niederschlag 24h** — DWD RADOLAN-Summen: wie viel Wasser wirklich fiel (Gieß-Entscheider).
- **Starkregen 10-jährlich / Extremereignis** — Berliner Starkregengefahrenkarte:
  Wasserstände, wo die Kanalisation überläuft = **Hotspots ohne ausreichende
  Infrastruktur** → genau dort Versickerungsflächen, Mulden, Regengärten anbieten.
  ⚠️ Detailkarte 1:5.000 — der Dienst liefert erst ab Zoomstufe ~17 Inhalte
  (nah an einen Block heranzoomen).

### 🌿 Vegetation & Ökologie
- **Grünvolumen** — m³ Grün pro m² (Berlin 2020): echtes Grünvolumen statt nur Fläche.
- **Baumkataster Berlin** — amtliche Straßen- & Anlagenbäume (ab Zoom ~14):
  perfekt zum Abgleich mit eigenen BIOME-Baumkartierungen.

> **CORINE (EU) entfernt:** Der EEA-discomap-WMS liefert über Deutschland nur
> leere Kacheln — die nummerierten Layer des Dienstes sind fast ausschließlich
> Frankreich-Übersee-Gebiete. Die alten Overlays („Versiegelung", „Landnutzung",
> „Wälder & Wiesen", „Gewässer") haben deshalb nie etwas angezeigt. Ersatz sind
> die (besseren) Berliner Dienste oben; EU-weite Alternativen bei Bedarf:
> Copernicus HRL Imperviousness / Tree Cover Density über den Copernicus Data Space.

## Endpunkte

| Dienst | URL |
|---|---|
| Klimaanalyse 2022 | `https://gdi.berlin.de/services/wms/ua_klimaanalyse_2022` |
| Starkregengefahrenkarte | `https://gdi.berlin.de/services/wms/ua_srgk` |
| Versiegelung 2021 | `https://gdi.berlin.de/services/wms/ua_versiegelung_2021` |
| Grünvolumen 2020 | `https://gdi.berlin.de/services/wms/ua_gruenvolumen_2020` |
| Baumbestand | `https://gdi.berlin.de/services/wms/baumbestand` (Layer `strassenbaeume,anlagenbaeume`) |
| DWD Radar/RADOLAN | `https://maps.dwd.de/geoserver/dwd/wms` |
| Sentinel-2 cloudless | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg` |

Alle Dienste sind offene Verwaltungs-/Forschungsdaten (Berlin GDI: dl-de/by-2-0,
DWD: GeoNutzV, EOX: frei mit Attribution). Attribution wird in der Karte angezeigt.

## Was es sonst noch gibt (bei Bedarf nachrüstbar)

- **Umweltatlas Berlin** (gleiches WMS-Schema `gdi.berlin.de/services/wms/ua_*`):
  Bodenkundl. Kennwerte, Regenwasserversickerung, Vegetationshöhen, Baumbestand
  (Straßen-/Anlagenbäume als WFS!), Bodenversiegelung-Historie, Klimaanalyse 2015.
- **OSM/Overpass**: Baumkataster-Ergänzung (`natural=tree`), Grünflächen
  (`leisure=park`, `landuse=grass`), Trinkbrunnen, Hydranten. Gut für Vektor-Abfragen
  („alle Parks im Umkreis"), weniger als Raster-Overlay.
- **DWD**: Warnlagen (Gewitter/Sturm je Landkreis), Vorhersage-Layer,
  Dürre-/Bodenfeuchteindizes (SMI) über opendata.dwd.de.
- **Copernicus**: Imperviousness Density (EU-Versiegelung 10 m), Tree Cover Density,
  Urban Atlas (Landnutzung Stadtregionen, feiner als CORINE).
- **Sentinel-2 NDVI live** (Vegetationsvitalität pro Woche): über Sentinel Hub /
  Copernicus Data Space — braucht (kostenlosen) API-Key, wäre Stufe 2.

## Eigene Aufnahmen statt Fremddienste

Die Ebenen oben sind Fremddienste. Zwei Ebenen zeigen dagegen, was BIOME selbst
erhebt:

- **Orthomosaike** aus eigenen Befliegungen — als XYZ-Kacheln, siehe
  `DRONE_ORTHO.md`.
- **3D-Aufnahmen (Gaussian Splats)** nach `KHR_gaussian_splatting` — siehe
  `docs/BIOME_SPLATS.md`. Sie liegen in der Ebenengruppe *Fernerkundung* und
  werden nicht auf die Karte gelegt: eine Splat-Datei kennt kein Bezugssystem
  und ist ohne eigene Verortung ein lagefreies Modell.
