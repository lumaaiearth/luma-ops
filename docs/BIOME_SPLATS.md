# BIOME™ — 3D-Aufnahmen mit KHR_gaussian_splatting

Stand: 2026-08-15 · Belegstelle: `refs/standards/06-fernerkundung.md`, Eintrag
**FE-GS-23** (Khronos-Spezifikation, abgerufen 2026-08-15)

Aus den Bildern einer Befliegung lässt sich ein Feld aus Gaußfunktionen
trainieren, das sich frei umfliegen lässt und photorealistisch aussieht. Seit
Februar 2026 gibt es dafür ein Khronos-Format: `KHR_gaussian_splatting`, eine
Erweiterung von glTF 2.0. BIOME liest dieses Format.

---

## Der Weg einer Aufnahme in BIOME

```
Drohne → Bilder → Training (z. B. Brush) → GLB mit KHR_gaussian_splatting
       → Ablage → Flugprodukt der Art „splat" → biome_splatfeld → Ebene „3D-Aufnahmen"
```

### Schritt 1 — Befliegung als Flug erfassen

Eine Splat-Aufnahme hängt an einem Flug (`biome_flug`) und **nicht** frei in
der Datenbank. Ohne Flug hätte sie kein Datum, keine Kamera, keinen Sonnenstand
und keine verantwortliche Person — sie wäre ein hübsches Bild, kein Nachweis.

### Schritt 2 — Trainieren und als GLB exportieren

Das Trainingsprogramm muss nach `KHR_gaussian_splatting` exportieren. BIOME
prüft die Datei beim Einlesen gegen die Pflichtangaben der Spezifikation und
weist sie zurück, wenn etwas fehlt — statt sie halb darzustellen.

**Pflicht in der Datei** (alles wörtlich belegt, FE-GS-23):

| Was | Wert |
|---|---|
| `mode` des Primitivs | `POINTS` (0) |
| `kernel` | `ellipse` |
| `colorSpace` | `srgb_rec709_display` oder `lin_rec709_display` |
| Attribute | `POSITION`, `…:ROTATION`, `…:SCALE`, `…:OPACITY`, `…:SH_DEGREE_0_COEF_0` |
| Kugelflächenfunktionen | nur vollständige Grade, keine Lücke nach unten |
| Deckkraft | zwischen 0,0 und 1,0 |
| Skalen | nicht negativ |

Optional und mit belegten Vorgabewerten: `projection` (`perspective`),
`sortingMethod` (`cameraDistance`).

Nicht gelesen werden: komprimierte Varianten (eigene, hier nicht belegte
Erweiterungen), dünn besetzte Akzessoren, externe Pufferdateien. BIOME liest
**eine** Datei: ein GLB mit eingebettetem Binärteil.

### Schritt 3 — Ablegen

Die Datei kommt in den Objektspeicher. `datei_url` hält entweder eine
vollständige Adresse, einen Pfad `eimer/pfad/datei.glb` (dann baut der Client
die öffentliche Adresse) oder einen Pfad mit führendem Schrägstrich für eine
Datei neben der Anwendung.

### Schritt 4 — In der Datenbank anlegen

```sql
INSERT INTO biome_flugprodukt (flug_id, art, datei_url)
VALUES ('<flug-id>', 'splat', 'drone-splats/mpn/2026-08-12.glb')
RETURNING id;

INSERT INTO biome_splatfeld (
  flugprodukt_id, kernel, farbraum, splat_anzahl, sh_grad,
  datei_url, datei_bytes, software, software_version, erfasst_von
) VALUES (
  '<flugprodukt-id>', 'ellipse', 'srgb_rec709_display', 1243907, 1,
  'drone-splats/mpn/2026-08-12.glb', 88014848, 'Brush', '3.1', '<person-id>'
);
```

Danach steht die Aufnahme in der Ebene **Fernerkundung → 3D-Aufnahmen**.

### Schritt 5 — Verorten (getrennter Vorgang, darf fehlen)

Das ist der Punkt, an dem dieses Format anders ist als alles andere in BIOME:

> **Weder `KHR_gaussian_splatting` noch glTF 2.0 kennen ein Bezugssystem.**
> Geprüft am Volltext beider Dokumente am 2026-08-15: null Treffer für CRS,
> EPSG, Datum, Georeferenzierung und WGS 84.

Eine Splat-Datei ist ein **lagefreies lokales Modell in Metern**. Wo sie im
Gelände liegt, ist eine eigene Erhebung mit eigener Herkunft:

```sql
UPDATE biome_splatfeld SET
  anker_lat = 52.54612, anker_lng = 13.54410, anker_crs = 'EPSG:4326',
  anker_hoehe_m = 34.2, drehung_grad = 12.5,
  verortung_methode_id = 'M-FE-SPLAT-VERORTUNG',
  verortet_von = '<person-id>', verortet_am = DATE '2026-08-12'
WHERE id = '<splatfeld-id>';
```

Ganz oder gar nicht: die Datenbank weist eine Koordinate ohne Bezugssystem,
Verfahren, Person und Datum ab (`biome_splatfeld_verortung_vollstaendig`). Eine
Koordinate ohne diese vier ist eine Behauptung, keine Angabe. Ist nichts
gesetzt, sagt die Oberfläche an jeder Aufnahme: „Nicht verortet — die Aufnahme
hat keinen Ort im Gelände."

---

## Was BIOME mit einer Aufnahme **nicht** macht

Drei harte Grenzen, alle aus der Quelle, keine davon Vorsicht um ihrer selbst
willen:

**Kein Vegetationsindex.** Die Farbwerte sind wörtlich *display-referred* —
durch eine Aufbereitung für die Anzeige gegangen, ausdrücklich nicht die
Strahldichte der Szene. Reflektanz im Sinne von FE-S2-03/04 ist das nicht. Ein
NDVI aus Splat-Farben trüge denselben Namen wie ein NDVI aus Reflektanz und
wäre eine andere physikalische Größe.

**Keine Messung.** Die Spezifikation nennt keine Lagegenauigkeit. Die Ansicht
bietet deshalb kein Messwerkzeug an: ein Stammumfang aus einer Punktwolke wäre
eine Zahl ohne Verfahren. Die Passpunkt-Kennzahlen am Flug gelten für die
Passpunkte, nicht für die rekonstruierten Gaußfunktionen.

**Keine Auflösungsaussage.** Ein Splat-Feld hat keine Bodenauflösung (GSD). Aus
der Zahl der Gaußfunktionen folgt nichts über Detailtreue oder erkennbare
Objektgröße.

---

## Wie die Darstellung von der Datei abweicht

Die Statuszeile unter der Ansicht sagt es bei jeder Aufnahme:

- **Grad 0.** Trägt die Aufnahme höhere Kugelflächenfunktionen, bleiben deren
  blickwinkelabhängige Glanzanteile ungenutzt. Die Spezifikation lässt das
  ausdrücklich zu („Implementations MAY ignore higher-degree coefficients").
- **Zwischenpuffer.** Gezeichnet wird in einen RGBA16F-Puffer und erst danach
  für die Anzeige aufgelöst — so wie es die Spezifikation empfiehlt und weil
  alle Zwischenschritte vor jeder Übertragungsfunktion laufen müssen. Fehlt
  `EXT_color_buffer_float`, geht es ohne, und die Zeile sagt das.
- **Farbraum.** Bei `lin_rec709_display` wird nach dem Zusammensetzen nach sRGB
  umgesetzt, bei `srgb_rec709_display` nicht.

Umsetzungsentscheidungen, die **nicht** aus der Quelle stammen (sie hält
ausdrücklich fest, dass sie die Matrizen W und J nicht definiert): die Form der
Jacobi-Matrix, ein Tiefpass von 0,3 px² auf der 2D-Kovarianz, die Begrenzung
der Halbachsen auf 1024 px, und die Sortierung als Zählsortierung über
16-Bit-Tiefenklassen. Sie stehen im Kopf von `src/biome/splatRenderer.js`.

---

## Warum die Aufnahme nicht von selbst lädt

Weil sie zwischen zwanzig und mehreren hundert Megabyte groß ist und diese
Anwendung im Feld über Mobilfunk läuft. Die Ansicht nennt die Größe und wartet
auf einen Klick.

---

## Wo was liegt

| Datei | Wofür |
|---|---|
| `src/biome/splat.js` | Format lesen, gegen FE-GS-23 prüfen, dekodieren. Ohne React, ohne WebGL. |
| `src/biome/splatRenderer.js` | WebGL2-Renderer: Kovarianzprojektion, 3σ, Sortierung, Blending. |
| `src/biome/ui/SplatAnsicht.jsx` | Ansicht samt Bedienung, Statuszeile und Prüfbericht. |
| `src/biome/herkunft.js` | Herkunftstafel einer Aufnahme (`h.splat`). |
| `src/biome/ebenen.js` | Die Ebene `e-splat` in der Fernerkundungsgruppe. |
| `supabase/migrations/20260815_biome_splatfeld.sql` | Tabelle, Riegel, Lesesicht, Registereintrag. |
| `fixtures/splat-beispiel.mjs` | Erzeugte GLB-Dateien für die Prüfstände. |

## Prüfstände

| Aufruf | Prüft |
|---|---|
| `npm test` | Format und Annahmeprüfung in Node (45 Prüfungen) |
| `npm run test:splat-gl` | Shader im echten Browser: übersetzen sie, stimmt die Farbformel, greift die 3σ-Abschneidung |
| `npm run migration:test` | Schema vorwärts/rückwärts, Regeltests in `fixtures/regeltests-splat.sql` |
| `npm run abnahme` | Ebene, Inspector, Herkunft und das Ladeverhalten in der Oberfläche |

## Offen

Drei Fragen stehen unter „Offene Fragen an Malte" in
`refs/standards/06-fernerkundung.md`: wie verortet wird, ob in Aufnahmen
gemessen werden darf, und ob BIOME beim Release-Candidate-Stand bleibt, bis die
Erweiterung ratifiziert ist. Bis dahin liest BIOME solche Dateien und schreibt
sie nicht.
