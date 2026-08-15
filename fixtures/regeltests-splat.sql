-- ═══════════════════════════════════════════════════════════════════════════
-- Regeltests: Splat-Felder (KHR_gaussian_splatting, FE-GS-23)
--
-- Jeder Test versucht, eine Regel zu verletzen. Gelingt es, ist das Merge-Gate
-- rot. Geprüft werden genau die Regeln, die eine hübsch aussehende Datei von
-- einem belastbaren Datensatz unterscheiden:
--
--   · kein Splat-Feld ohne Flug (sonst: Aufnahme ohne Datum, Kamera, Person)
--   · kein Splat-Feld an einem Orthomosaik (zwei Aussagen über einen Flug)
--   · keine Koordinate ohne Verfahren und Person (Behauptung statt Angabe)
--   · keine Werte außerhalb der belegten Listen aus FE-GS-23
--
-- Läuft nach fixtures/ground_truth.sql. Alles in einer Transaktion, die am
-- Ende zurückgerollt wird — der Datenstand bleibt unberührt.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.muss_scheitern(p_sql text, p_regel text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  meldung text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS meldung = MESSAGE_TEXT;
    RAISE NOTICE '  ok        %  (abgewiesen: %)', p_regel, left(meldung, 90);
    RETURN;
  END;
  RAISE EXCEPTION 'REGEL NICHT DURCHGESETZT: %', p_regel;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.muss_gelten(p_bedingung boolean, p_regel text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_bedingung IS NOT TRUE THEN
    RAISE EXCEPTION 'ERWARTUNG NICHT ERFÜLLT: %', p_regel;
  END IF;
  RAISE NOTICE '  ok        %', p_regel;
END;
$$;

\echo ''
\echo 'Regeltests Splat-Felder'
\echo ''

-- ── Vorbereitung: ein Flug mit zwei Produkten ─────────────────────────────

INSERT INTO biome_fernerkundungssensor (id, hersteller, modell, sensorfamilie)
VALUES ('S-TEST-RGB', 'Prüfstand', 'Testkamera RGB', 'rgb_drohne');

INSERT INTO biome_flug (
  id, standort_id, sensor_id, plattform, datum, uhrzeit_start,
  gsd_cm, sonnenzenit_grad, kalibrierziel, crs, verarbeitungsversion, erfasst_von
) VALUES (
  '60000000-0000-4000-8000-0000000000f1',
  '50000000-0000-4000-8000-000000000001',
  'S-TEST-RGB', 'Multikopter', DATE '2026-08-14', TIME '10:20',
  1.2, 42.0, 'kalibriertes Referenzpanel', 'EPSG:4326', '1.0',
  'a0000000-0000-4000-8000-000000000002'
);

INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
VALUES
  ('60000000-0000-4000-8000-0000000000a1', '60000000-0000-4000-8000-0000000000f1', 'splat', 'splat/mpn-2026-08-14.glb'),
  ('60000000-0000-4000-8000-0000000000a2', '60000000-0000-4000-8000-0000000000f1', 'orthomosaik', 'ortho/mpn-2026-08-14.tif');

SELECT pg_temp.muss_gelten(
  EXISTS (SELECT 1 FROM biome_flugprodukt WHERE art = 'splat'),
  'splat ist eine zulaessige Produktart eines Flugs');

-- ── Der Normalfall: ein unverortetes Feld ist zulaessig ───────────────────

INSERT INTO biome_splatfeld (
  flugprodukt_id, kernel, farbraum, splat_anzahl, sh_grad,
  datei_url, datei_bytes, software, software_version, erfasst_von
) VALUES (
  '60000000-0000-4000-8000-0000000000a1', 'ellipse', 'srgb_rec709_display', 1250000, 1,
  'splat/mpn-2026-08-14.glb', 84000000, 'Prüfstand-Trainer', '0.9',
  'a0000000-0000-4000-8000-000000000002'
);

SELECT pg_temp.muss_gelten(
  (SELECT anker_lat IS NULL AND kennzeichnung = 'modelliert'
     FROM biome_splatfeld WHERE flugprodukt_id = '60000000-0000-4000-8000-0000000000a1'),
  'Ein unverortetes Feld ist speicherbar und traegt die Kennzeichnung modelliert');

SELECT pg_temp.muss_gelten(
  (SELECT methode_id = 'M-FE-SPLAT-REKONSTRUKTION' AND standard_id = 'FE-GS-23'
     FROM biome_splatfeld WHERE flugprodukt_id = '60000000-0000-4000-8000-0000000000a1'),
  'Ein Feld haengt ohne Zutun an Methode und Registereintrag');

SELECT pg_temp.muss_gelten(
  (SELECT erfassungsart = 'modell' FROM biome_methode WHERE id = 'M-FE-SPLAT-REKONSTRUKTION'),
  'Die Rekonstruktionsmethode ist ein Modell und damit im Nachweiskern gesperrt');

-- ── Ein Splat-Feld an einem Orthomosaik ist keins ─────────────────────────

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a2', 'ellipse', 'srgb_rec709_display', 10, 'x.glb')
$$, 'Ein Splat-Feld laesst sich nicht an ein Orthomosaik haengen');

-- ── Ohne Flugprodukt kein Feld ────────────────────────────────────────────

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000ff', 'ellipse', 'srgb_rec709_display', 10, 'x.glb')
$$, 'Ein Feld ohne zugehoeriges Flugprodukt wird abgewiesen');

-- ── Nur ein Feld je Produkt ───────────────────────────────────────────────

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a1', 'ellipse', 'lin_rec709_display', 5, 'y.glb')
$$, 'Zwei Splat-Felder an einem Produkt werden abgewiesen');

-- ── Die abgeschlossenen Wertelisten aus FE-GS-23 ──────────────────────────

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a3', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a3', 'customShape', 'srgb_rec709_display', 10, 'z.glb')
$$, 'Ein Kernel aus einer Fremderweiterung ist nicht speicherbar');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a4', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a4', 'ellipse', 'acescg', 10, 'z.glb')
$$, 'Ein nicht belegter Farbraum ist nicht speicherbar');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a5', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, sh_grad, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a5', 'ellipse', 'srgb_rec709_display', 10, 4, 'z.glb')
$$, 'Ein Grad 4 der Kugelflaechenfunktionen ist nicht speicherbar');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a6', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000a6', 'ellipse', 'srgb_rec709_display', -1, 'z.glb')
$$, 'Eine negative Zahl von Gaussfunktionen ist nicht speicherbar');

-- ── Verortung: ganz oder gar nicht ────────────────────────────────────────

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000b1', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url, anker_lat, anker_lng)
  VALUES ('60000000-0000-4000-8000-0000000000b1', 'ellipse', 'srgb_rec709_display', 10, 'z.glb', 52.5461, 13.5441)
$$, 'Eine Koordinate ohne Bezugssystem, Verfahren und Person wird abgewiesen');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000b2', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (
    flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url,
    anker_lat, anker_lng, anker_crs, verortung_methode_id
  ) VALUES (
    '60000000-0000-4000-8000-0000000000b2', 'ellipse', 'srgb_rec709_display', 10, 'z.glb',
    52.5461, 13.5441, 'EPSG:4326', 'M-FE-SPLAT-VERORTUNG'
  )
$$, 'Eine Verortung ohne Person und Datum wird abgewiesen');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
  VALUES ('60000000-0000-4000-8000-0000000000b3', '60000000-0000-4000-8000-0000000000f1', 'splat', 'z.glb');
  INSERT INTO biome_splatfeld (
    flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url,
    anker_lat, anker_lng, anker_crs, drehung_grad,
    verortung_methode_id, verortet_von, verortet_am
  ) VALUES (
    '60000000-0000-4000-8000-0000000000b3', 'ellipse', 'srgb_rec709_display', 10, 'z.glb',
    52.5461, 13.5441, 'EPSG:4326', 361,
    'M-FE-SPLAT-VERORTUNG', 'a0000000-0000-4000-8000-000000000002', DATE '2026-08-14'
  )
$$, 'Eine Drehung von 361 Grad wird abgewiesen');

-- Der vollstaendige Fall geht durch.
INSERT INTO biome_flugprodukt (id, flug_id, art, datei_url)
VALUES ('60000000-0000-4000-8000-0000000000b4', '60000000-0000-4000-8000-0000000000f1', 'splat', 'v.glb');
INSERT INTO biome_splatfeld (
  flugprodukt_id, kernel, farbraum, splat_anzahl, datei_url,
  anker_lat, anker_lng, anker_crs, anker_hoehe_m, drehung_grad,
  verortung_methode_id, verortet_von, verortet_am
) VALUES (
  '60000000-0000-4000-8000-0000000000b4', 'ellipse', 'lin_rec709_display', 900000, 'v.glb',
  52.5461, 13.5441, 'EPSG:4326', 34.2, 12.5,
  'M-FE-SPLAT-VERORTUNG', 'a0000000-0000-4000-8000-000000000002', DATE '2026-08-14'
);

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 1 FROM v_biome_splatfeld
     WHERE flug_id = '60000000-0000-4000-8000-0000000000f1' AND anker_lat IS NOT NULL),
  'Eine vollstaendige Verortung mit Verfahren, Person und Datum ist speicherbar');

-- ── Die Lesesicht liefert den Flug mit ────────────────────────────────────

SELECT pg_temp.muss_gelten(
  (SELECT bool_and(flug_datum = DATE '2026-08-14' AND gsd_cm = 1.2 AND sensor_id = 'S-TEST-RGB')
     FROM v_biome_splatfeld WHERE flug_id = '60000000-0000-4000-8000-0000000000f1'),
  'v_biome_splatfeld traegt Datum, Bodenaufloesung und Sensor des Flugs');

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 2 FROM v_biome_splatfeld
     WHERE flug_id = '60000000-0000-4000-8000-0000000000f1'),
  'Die Lesesicht zeigt beide angelegten Felder');

\echo ''
\echo 'Regeltests Splat-Felder grün.'
\echo ''

ROLLBACK;
