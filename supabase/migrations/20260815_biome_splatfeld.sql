-- ═══════════════════════════════════════════════════════════════════════════
-- BIOME — 3D-Gaussian-Splats als Flugprodukt (KHR_gaussian_splatting)
--
-- Eine Splat-Aufnahme ist kein neuer Datentyp neben der Fernerkundung, sondern
-- das, was aus einem Flug herauskommt: aus den Bildern einer Befliegung wird
-- ein Feld aus Gaußfunktionen trainiert. Sie hängt deshalb an
-- biome_flugprodukt und erbt von dort den Flug — mit Datum, Uhrzeit, Sonnen-
-- stand, Kalibrierziel, Passpunkten und verantwortlicher Person.
--
-- Ohne Flug keine Aufnahme. Das ist der Kern: eine Splat-Datei, die niemand
-- einem Flug zuordnen kann, hat kein Datum, keine Kamera und keine Person —
-- und ist damit ein hübsches Bild, kein Nachweis.
--
-- ── Warum eine eigene Tabelle und nicht ein paar Spalten ───────────────────
--
-- Weil zwei Dinge zusammenkommen, die verschiedener Herkunft sind:
--
--   1. Was in der Datei steht. Kernel, Farbraum, Projektion, Sortierung, Zahl
--      der Gaußfunktionen, Grad der Kugelflächenfunktionen. Das ist aus dem
--      Format ablesbar und durch FE-GS-23 wörtlich belegt.
--
--   2. Wo das Ding im Gelände liegt. Das steht NICHT in der Datei. Weder
--      KHR_gaussian_splatting noch glTF 2.0 kennen ein Bezugssystem — geprüft
--      am Volltext beider Dokumente am 2026-08-15, Trefferzahl null für CRS,
--      EPSG, Datum, Georeferenzierung und WGS 84 (FE-GS-23). Ein Splat-Feld
--      ist ein lagefreies lokales Modell in Metern.
--
-- Die Verortung ist damit ein eigener erhobener Wert mit eigener Herkunft, und
-- sie darf fehlen. Was sie nicht darf: ohne Verfahren und ohne Person
-- dastehen. Eine Koordinate ohne beides ist eine Behauptung. Das erzwingt der
-- Constraint biome_splatfeld_verortung_vollstaendig — dieselbe Regel wie bei
-- der Lagegenauigkeit eines Baums (20260810_biome_lagegenauigkeit_und_
-- mehrstaemmigkeit.sql).
--
-- ── Warum das kein Nachweiskern ist ───────────────────────────────────────
--
-- Ein Splat-Feld ist ein Trainingsergebnis, kein Messwert. Es trägt deshalb
-- eine Kennzeichnung ('modelliert') wie jede Zeile der Analyseschicht, und die
-- zugehörige Methode hat die Erfassungsart 'modell' — womit sie im
-- Nachweiskern gesperrt ist. Aus einem Splat-Feld wird in BIOME kein
-- Stammumfang.
--
-- Rücknahme: supabase/migrations/down/20260815_biome_splatfeld.down.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 1 · Registereintrag: ohne wörtliches Zitat kein Eintrag
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO biome_standard
  (id, domaene, kurzname, herausgeber, quelle_url, abgerufen_am, zitat, deckt, registerdatei, frei_zugaenglich)
VALUES (
  'FE-GS-23',
  'fernerkundung',
  'KHR_gaussian_splatting — 3D-Gaussian-Splats in glTF',
  'The Khronos Group Inc., 3D Formats Working Group',
  'https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md',
  DATE '2026-08-15',
  'This extension defines basic support for storing 3D Gaussian splats in glTF assets, bringing structure and conformity to the 3D Gaussian splatting space. This extension defines 3D Gaussian splats by their position, rotation, scale, opacity, and spherical harmonics, which provide both diffuse and specular color. Status: Release Candidate.',
  'Abgeschlossene Wertelisten für kernel {ellipse}, colorSpace {srgb_rec709_display, lin_rec709_display}, projection {perspective} und sortingMethod {cameraDistance}; die fünf Pflichtattribute POSITION, ROTATION, SCALE, OPACITY und SH_DEGREE_0_COEF_0; mode MUSS POINTS sein; Grade der Kugelflächenfunktionen nur vollständig; Deckkraft in [0,1]; Skalen nicht negativ; Diffusfarbe = SH0 * 0,2820947917738781 + 0,5; 3-Sigma-Abschneidung. Deckt ausdrücklich NICHT: Bezugssystem, Lagegenauigkeit und jede radiometrische Auswertung (die Farbwerte sind display-referred).',
  'refs/standards/06-fernerkundung.md',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 2 · Methoden
--
-- Zwei getrennte Vorgänge, deshalb zwei Methoden: das Feld zu rechnen ist
-- etwas anderes, als es ins Gelände zu legen. Wer beides in eine Methode
-- steckt, kann später nicht mehr sagen, welcher der beiden Schritte die
-- Lageabweichung verursacht hat.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO biome_methode
  (id, domaene, name, beschreibung, standard_id, einheit, bezugsflaeche, zeitbezug, erfassungsart)
VALUES
  (
    'M-FE-SPLAT-REKONSTRUKTION',
    'fernerkundung',
    'Rekonstruktion eines 3D-Gaussian-Splat-Felds aus Bilddaten',
    'Aus den Bildern eines Flugs wird ein Feld aus Gaußfunktionen trainiert und nach KHR_gaussian_splatting als glTF-Binärdatei abgelegt. Das Ergebnis ist ein Modell, keine Messung: Lage, Form und Farbe jeder Gaußfunktion sind Trainingsergebnisse. Die Farbwerte sind anzeigebezogen (display-referred) und ausdrücklich keine Reflektanz.',
    'FE-GS-23',
    NULL,
    'je Flug',
    'Zeitpunkt der Befliegung',
    'modell'
  ),
  (
    'M-FE-SPLAT-VERORTUNG',
    'fernerkundung',
    'Verortung eines Splat-Felds über Passpunkte',
    'Das Splat-Feld liegt in einem lagefreien lokalen System in Metern. Die Zuordnung zu einer Position im Gelände erfolgt über am Boden eingemessene Passpunkte: Ankerpunkt, Höhe und Drehung gegen Nord werden bestimmt und am Feld gespeichert. Die erreichte Lagegenauigkeit ist am Flug zu belegen, nicht hier.',
    NULL,
    'm',
    'je Splat-Feld',
    'Zeitpunkt der Einmessung',
    'person_vor_ort'
  )
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 3 · 'splat' als Produktart eines Flugs
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE biome_flugprodukt DROP CONSTRAINT IF EXISTS biome_flugprodukt_art_check;
ALTER TABLE biome_flugprodukt ADD CONSTRAINT biome_flugprodukt_art_check
  CHECK (art IN ('reflektanz','radianz','digitalwert','orthomosaik','hoehenmodell','maske','splat'));

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 4 · Das Splat-Feld
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_splatfeld (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Genau ein Splat-Feld je Flugprodukt. Zwei Felder wären zwei Produkte.
  flugprodukt_id  UUID NOT NULL UNIQUE REFERENCES biome_flugprodukt(id) ON DELETE CASCADE,

  -- ── Was in der Datei steht (FE-GS-23) ────────────────────────────────────
  -- Die Wertelisten sind hier abgeschlossen, weil die Basiserweiterung genau
  -- diese Werte definiert. Ein Kernel aus einer Fremderweiterung soll nicht
  -- speicherbar sein, solange BIOME ihn nicht belegt hat und nicht darstellen
  -- kann.
  kernel          TEXT NOT NULL CHECK (kernel IN ('ellipse')),
  farbraum        TEXT NOT NULL CHECK (farbraum IN ('srgb_rec709_display','lin_rec709_display')),
  projektion      TEXT NOT NULL DEFAULT 'perspective'    CHECK (projektion IN ('perspective')),
  sortierung      TEXT NOT NULL DEFAULT 'cameraDistance' CHECK (sortierung IN ('cameraDistance')),
  splat_anzahl    BIGINT NOT NULL CHECK (splat_anzahl >= 0),
  sh_grad         SMALLINT NOT NULL DEFAULT 0 CHECK (sh_grad BETWEEN 0 AND 3),

  -- Der Reifegrad der Spezifikation zum Zeitpunkt der Aufnahme. Am 2026-08-15
  -- führen Dokument und Register 'Release Candidate'; die für das zweite
  -- Quartal 2026 angekündigte Ratifizierung war nicht vollzogen. Bis dahin
  -- können sich Attributnamen und Wertelisten ändern, und eine Aufnahme muss
  -- sagen können, gegen welchen Stand sie geschrieben wurde.
  spezifikationsstand TEXT NOT NULL DEFAULT 'Release Candidate',
  standard_id     TEXT NOT NULL DEFAULT 'FE-GS-23' REFERENCES biome_standard(id) ON DELETE RESTRICT,

  -- ── Die Datei ────────────────────────────────────────────────────────────
  datei_url       TEXT NOT NULL,
  datei_bytes     BIGINT CHECK (datei_bytes IS NULL OR datei_bytes > 0),

  -- Das Ergebnis der Annahmeprüfung, so wie die Oberfläche es zeigt. Es steht
  -- hier, damit später nachvollziehbar ist, was beim Einlesen auffiel — ein
  -- Hinweis, der nur zur Ladezeit im Browser stand, ist kein Nachweis.
  pruefbericht    JSONB,
  geprueft_am     TIMESTAMPTZ,

  -- ── Verortung: steht nicht im Format, darf fehlen ────────────────────────
  anker_lat       NUMERIC CHECK (anker_lat IS NULL OR anker_lat BETWEEN -90 AND 90),
  anker_lng       NUMERIC CHECK (anker_lng IS NULL OR anker_lng BETWEEN -180 AND 180),
  anker_crs       TEXT,
  anker_hoehe_m   NUMERIC,
  -- Drehung des Modells gegen Nord, im Uhrzeigersinn. Ohne sie steht ein
  -- verortetes Feld zwar an der richtigen Stelle, aber schief.
  drehung_grad    NUMERIC CHECK (drehung_grad IS NULL OR drehung_grad >= 0 AND drehung_grad < 360),
  verortung_methode_id TEXT REFERENCES biome_methode(id) ON DELETE RESTRICT,
  verortet_von    UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  verortet_am     DATE,

  -- ── Herkunft der Rekonstruktion ──────────────────────────────────────────
  methode_id      TEXT NOT NULL DEFAULT 'M-FE-SPLAT-REKONSTRUKTION'
                  REFERENCES biome_methode(id) ON DELETE RESTRICT,
  software        TEXT,
  software_version TEXT,
  -- Ein Trainingsergebnis, kein Messwert — dieselbe Kennzeichnung wie in der
  -- Analyseschicht.
  kennzeichnung   TEXT NOT NULL DEFAULT 'modelliert'
                  CHECK (kennzeichnung IN ('berechnet','modelliert','geschaetzt','interpoliert')),
  bemerkung       TEXT,
  erfasst_von     UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  erfasst_am      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Entweder ist das Feld verortet — dann vollständig, mit Verfahren und
  -- Person — oder es ist es nicht. Eine Koordinate ohne Verfahren und Person
  -- ist eine Behauptung, keine Angabe; sie ließe sich nicht zurückverfolgen
  -- und stünde in der Oberfläche gleichberechtigt neben einer eingemessenen.
  CONSTRAINT biome_splatfeld_verortung_vollstaendig CHECK (
    (anker_lat IS NULL AND anker_lng IS NULL AND anker_crs IS NULL
      AND drehung_grad IS NULL AND verortung_methode_id IS NULL
      AND verortet_von IS NULL AND verortet_am IS NULL)
    OR
    (anker_lat IS NOT NULL AND anker_lng IS NOT NULL AND anker_crs IS NOT NULL
      AND verortung_methode_id IS NOT NULL AND verortet_von IS NOT NULL
      AND verortet_am IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_biome_splatfeld_flugprodukt ON biome_splatfeld(flugprodukt_id);

COMMENT ON TABLE biome_splatfeld IS
  'Ein 3D-Gaussian-Splat-Feld nach KHR_gaussian_splatting (FE-GS-23) als Produkt eines Flugs. Modelliert, nicht gemessen. Die Verortung steht nicht im Dateiformat und wird hier als eigener erhobener Wert geführt.';
COMMENT ON COLUMN biome_splatfeld.anker_crs IS
  'Bezugssystem der Verortung. Steht bewusst hier und nicht in der Datei: KHR_gaussian_splatting und glTF 2.0 kennen kein Bezugssystem.';
COMMENT ON COLUMN biome_splatfeld.sh_grad IS
  'Höchster vollständig besetzter Grad der Kugelflächenfunktionen. BIOME stellt Grad 0 dar; die Spezifikation lässt das Übergehen höherer Grade ausdrücklich zu.';
COMMENT ON COLUMN biome_splatfeld.farbraum IS
  'Beide belegten Farbräume sind anzeigebezogen (display-referred). Aus diesen Farben darf kein Vegetationsindex berechnet werden — das wäre eine andere physikalische Größe.';

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 5 · Riegel: kein Splat-Feld ohne Flugprodukt der Art 'splat'
--
-- Ohne diesen Riegel ließe sich ein Splat-Feld an ein Orthomosaik hängen, und
-- die Fernerkundungsdomäne hätte zwei widersprechende Aussagen darüber, was
-- der Flug hervorgebracht hat.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION biome_splatfeld_produktart_pruefen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  art_ist text;
BEGIN
  SELECT art INTO art_ist FROM biome_flugprodukt WHERE id = NEW.flugprodukt_id;
  IF art_ist IS DISTINCT FROM 'splat' THEN
    RAISE EXCEPTION
      'Flugprodukt % hat die Art "%" und kann kein Splat-Feld tragen. Erwartet wird "splat".',
      NEW.flugprodukt_id, COALESCE(art_ist, 'unbekannt')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS biome_splatfeld_produktart ON biome_splatfeld;
CREATE TRIGGER biome_splatfeld_produktart
  BEFORE INSERT OR UPDATE ON biome_splatfeld
  FOR EACH ROW EXECUTE FUNCTION biome_splatfeld_produktart_pruefen();

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 6 · RLS wie im übrigen Schema
-- ───────────────────────────────────────────────────────────────────────────

SELECT biome_rls_intern('biome_splatfeld');

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 7 · Lesesicht für die Oberfläche
--
-- Die Oberfläche braucht das Feld immer zusammen mit seinem Flug: ohne Datum
-- und Sensor ist eine Aufnahme nicht einzuordnen. Ein Join in der Anwendung
-- wäre dieselbe Abfrage, nur an fünf Stellen wiederholt.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_biome_splatfeld WITH (security_invoker = on) AS
SELECT
  s.id,
  s.flugprodukt_id,
  f.id                AS flug_id,
  f.standort_id,
  f.datum             AS flug_datum,
  f.uhrzeit_start     AS flug_uhrzeit,
  f.zeitzone          AS flug_zeitzone,
  f.sensor_id,
  f.plattform,
  f.flughoehe_m,
  f.gsd_cm,
  f.crs               AS flug_crs,
  f.passpunkte_anzahl,
  f.passpunkte_rmse_cm,
  f.erfasst_von       AS flug_erfasst_von,
  p.datei_url         AS produkt_datei_url,
  p.bemerkung         AS produkt_bemerkung,
  s.kernel, s.farbraum, s.projektion, s.sortierung,
  s.splat_anzahl, s.sh_grad, s.spezifikationsstand, s.standard_id,
  s.datei_url, s.datei_bytes, s.pruefbericht, s.geprueft_am,
  s.anker_lat, s.anker_lng, s.anker_crs, s.anker_hoehe_m, s.drehung_grad,
  s.verortung_methode_id, s.verortet_von, s.verortet_am,
  s.methode_id, s.software, s.software_version, s.kennzeichnung,
  s.bemerkung, s.erfasst_von, s.erfasst_am
FROM biome_splatfeld s
JOIN biome_flugprodukt p ON p.id = s.flugprodukt_id
JOIN biome_flug f        ON f.id = p.flug_id;

COMMIT;
