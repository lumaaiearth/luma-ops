# Drohnen-Orthomosaike in die Karte bringen (hochauflösend)

Ziel: nach einer Drohnenbefliegung ein **hochauflösendes Luftbild** einer Projektfläche
in der LUMA-Ops-Karte hinterlegen — schnell, zoombar, auch auf dem Handy.

Der Trick: Das riesige Orthomosaik wird nicht als *ein* Bild geladen, sondern in
**Kacheln** zerlegt (wie bei Google Maps). Das Handy lädt immer nur die sichtbaren
Kacheln → flüssig und beliebig hochauflösend.

```
Drohne → WebODM (Orthomosaik) → gdal2tiles (Kacheln) → Supabase Storage → LUMA Ops Karte
```

---

## Einmalig: Werkzeuge

- **GDAL** (enthält `gdal2tiles.py` und `gdalinfo`) — z.B. via `brew install gdal`,
  `apt install gdal-bin`, oder als Docker-Image `ghcr.io/osgeo/gdal`.
- Node (für das Upload-Script, hast du schon).
- **Supabase service_role-Key**: Dashboard → Project Settings → API → `service_role` (secret).
  Nur lokal als Umgebungsvariable nutzen, **niemals committen**.

---

## Schritt 1 — Orthomosaik aus WebODM

In WebODM das Projekt prozessieren und das **Orthophoto** als GeoTIFF herunterladen
(`odm_orthophoto.tif`). Tipp: In den Task-Optionen `orthophoto-resolution` passend
zur gewünschten Auflösung setzen.

## Schritt 2 — In Kacheln zerlegen (XYZ)

```bash
gdal2tiles.py --xyz -z 14-22 -w none odm_orthophoto.tif tiles/
```
- `--xyz` → Standard-Kachelschema für Web/Leaflet (kein y-Flip).
- `-z 14-22` → Zoomstufen (14 grob … 22 sehr fein). Für kleinere Flächen reicht z.B. `16-22`.
- `-w none` → keine HTML-Viewer erzeugen (nur Kacheln).

> Ältere GDAL-Versionen kennen `--xyz` nicht. Dann ohne `--xyz` erzeugen und in der App
> beim Registrieren **„TMS-Schema"** ankreuzen.

## Schritt 3 — Bounds & Zoom ablesen

```bash
gdalinfo -json odm_orthophoto.tif
```
Im JSON unter `wgs84Extent` stehen die Eck-Koordinaten (Länge/Breite) → daraus
**Süd / West / Nord / Ost** ableiten. Der Zoom-Bereich ist der aus Schritt 2
(das Upload-Script gibt ihn auch nochmal aus).

## Schritt 4 — Kacheln hochladen

```bash
SUPABASE_SERVICE_KEY=<service-role-key> \
  npm run tiles -- tiles/ <projektId> <kürzel>
```
- `<projektId>` = ID des Projekts in LUMA Ops.
- `<kürzel>` = frei wählbarer Ordnername, z.B. `nordflaeche-2026-07`.

Das Script lädt alle Kacheln nach `drone-tiles/<projektId>/<kürzel>/…` und gibt am
Ende **Kachel-URL, Zoom-Bereich** und den Hinweis auf die Bounds aus.

## Schritt 5 — In der App registrieren

Karte → Projekt aufklappen → **„🗺️ Orthomosaik"** → eintragen:
- **Kürzel** (exakt wie beim Upload),
- **Bounds** (Süd/West/Nord/Ost aus Schritt 3 — oder das GeoTIFF droppen, dann werden
  Lat/Lon-Koordinaten automatisch übernommen),
- **Min/Max Zoom** (aus Schritt 2),
- Transparenz nach Geschmack.

Speichern → das Luftbild liegt auf der Projektfläche, mit Ein/Aus + Transparenz-Regler.

---

## Gut zu wissen

- **UTM-Koordinaten:** WebODM-Orthos sind oft in UTM. Die Auto-Erkennung im Formular
  liest nur Lat/Lon — dann Bounds aus `gdalinfo … wgs84Extent` manuell eintragen.
  (Die Kacheln selbst werden von `gdal2tiles` automatisch nach WebMercator umprojiziert.)
- **Öffentlich:** Der Bucket `drone-tiles` ist öffentlich lesbar (wie `drone-images`).
  Wer die URL kennt, kann die Kacheln sehen — für interne Projektflächen i.d.R. okay.
- **Speicher:** Viele kleine Kacheln pro Fläche. Für ein paar Flächen unkritisch;
  alte Befliegungen bei Bedarf im Supabase-Storage löschen.
- **Offline:** Einmal in der App angeschaute Kacheln werden vom Service-Worker
  gecacht → beim nächsten Vor-Ort-Besuch auch offline verfügbar.
