# BIOME™ — Bild-Upload & Medien-Speicherstrategie

Stand: 2026-07-21

## Wie der Upload jetzt funktioniert

- **Feature-Fotos** (Baum, Beet, Fläche, Punkt, Linie): Detailpanel → „Foto".
  - Client-seitige Kompression auf max. 1200 px / JPEG 82 % (`src/lib/images.js`)
    → typisch **150–350 KB pro Foto** statt 4–12 MB Handy-Original.
  - Ablage: Bucket `job-photos`, Pfad `feature-<featureId>/<photoId>.jpg`
    (Bäume historisch `tree-<featureId>/…`).
  - Referenz: `map_features.properties.photos = [{id, url}]` — kein extra Join nötig.
- **Drohnenbilder** (einzelnes georeferenziertes Bild): Bucket `drone-images`,
  wird als `ImageOverlay` über die Karte gelegt.
- **Orthomosaike** (große Befliegungen): NICHT als ein Riesenbild hochladen,
  sondern als XYZ-Kacheln (`npm run tiles`, siehe `DRONE_ORTHO.md`) in den
  Bucket `drone-tiles`. Die Karte lädt dann nur die sichtbaren Kacheln.

> **Voraussetzung:** Migration `supabase/migrations/20260721_biome_sensors_gps_storage.sql`
> im Supabase SQL Editor ausführen. Sie legt die drei Buckets an (public read)
> und erlaubt Schreiben nur für admin/mitarbeiter. Ohne die Buckets schlägt
> der Upload mit „Bucket not found" fehl — die Fehlermeldung wird jetzt im
> Panel angezeigt.

## Mengengerüst (Supabase-Preise, Stand 2026)

| Stufe | Umfang | Kosten |
|---|---|---|
| Free | 1 GB Storage, 5 GB Egress | 0 € |
| Pro | 100 GB Storage inkl., 250 GB Egress inkl. | ~25 $/Monat |
| darüber | je +1 GB Storage | ~0,021 $/GB |

Mit Kompression: 1 GB ≈ **3.000–6.000 Fotos**. 100 GB ≈ 300.000+ Fotos —
für Feature-Dokumentation reicht Supabase sehr lange.
Der Treiber sind **Orthomosaike** (5–20 GB pro Befliegung als Kacheln).

## Strategie in drei Stufen

**Stufe 1 — jetzt (umgesetzt):**
Kompression vor Upload, ein Bucket pro Medientyp, Kacheln statt Riesen-TIFF,
Public-URLs direkt im Feature gespeichert, `loading="lazy"` in allen Grids.

**Stufe 2 — beim Live-Gang (empfohlen, geringer Aufwand):**
- **Thumbnails on-the-fly** über Supabase Image Transformations:
  `…/storage/v1/render/image/public/job-photos/<pfad>?width=300&quality=75`
  für Gitteransichten; Original nur im Lightbox-Klick. Spart ~80 % Egress.
- Upload-Limit pro Datei im Bucket setzen (z. B. 10 MB) — verhindert
  versehentliche RAW/TIFF-Uploads in den Foto-Bucket.
- Wöchentliches Storage-Backup aktivieren (Supabase → Backups) bzw.
  `rclone`-Sync in ein zweites Ziel.

**Stufe 3 — Skalierung (viele Befliegungen / >100 GB):**
- Orthomosaik-Kacheln zu **Cloudflare R2** (kein Egress-Entgelt) oder
  **Hetzner Object Storage** (EU, günstig) auslagern; in BIOME ändert sich nur
  die `tiles_url` der Kachel-Ebene — das Datenmodell kann das heute schon.
- Alte Befliegungen nach 24 Monaten in „cold storage" verschieben
  (Lifecycle-Regel), in BIOME bleibt der Eintrag mit Hinweis.
- Optional: EXIF-GPS beim Foto-Upload auslesen und Foto automatisch dem
  nächstgelegenen Feature zuordnen.

## Faustregeln

1. **Nie unkomprimierte Originale in Public-Buckets** — Kompression ist Pflichtweg.
2. **Ein Bucket pro Medientyp**, Pfad immer `<kontext-id>/<datei-id>` — so kann
   später pro Projekt migriert/archiviert werden.
3. **Karten-Rohdaten (GeoTIFF) gehören nicht in die App**, sondern ins Archiv
   (Drive/NAS); die App bekommt nur Kacheln.
