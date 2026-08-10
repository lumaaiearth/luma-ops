-- ═══════════════════════════════════════════════════════════════════════════
-- BIOME — Übernahme des Altbestands aus map_features in den Datenkern
--
-- Bis heute lebt ein Baum in BIOME als Zeile in `map_features` mit
-- `feature_type = 'tree'`; alle Fachangaben stehen als freies JSON in
-- `properties`. Diese Migration überführt die Identität dieser Bäume in
-- `biome_baum` und legt alles Übrige nachvollziehbar ab, ohne es zu
-- beschönigen.
--
-- ── Die entscheidende Frage: was darf mit? ─────────────────────────────────
--
-- Der Nachweiskern verlangt zu jedem Messwert Methode, Messhöhe und Person,
-- und zu jeder Zustandsstufe eine registrierte Skala mit Wortlaut. Die
-- Altdaten haben nichts davon:
--
--   stammumfang_cm      Zahl ohne Messhöhe, ohne Datum, ohne Verfahren
--   vitalitaet          Stufe aus der entfernten Skala 0–4
--   verkehrssicherheit  Stufe aus einer Einteilung, die kein Dokument deckt
--   eps_befall          Befallsstärke ohne Quelle
--   schutzstatus        von Hand gesetzt, unabhängig vom gemessenen Umfang
--
-- Es gäbe zwei Wege. Der bequeme wäre, die fehlenden Angaben zu ergänzen —
-- „wird schon in 1,30 m gemessen worden sein". Das wäre eine erfundene
-- Messung in einer Tabelle, deren einziger Zweck es ist, keine erfundenen
-- Messungen zu enthalten.
--
-- Deshalb der andere Weg: **die Identität wandert in den Nachweiskern, die
-- Werte nicht.** Sie kommen vollständig und wörtlich nach
-- `biome_altbestand_baum` — sichtbar, auffindbar, mit Herkunft auf die
-- ursprüngliche Zeile, aber außerhalb des Nachweiskerns und ausdrücklich als
-- unbelegt gekennzeichnet.
--
-- Nichts geht verloren. Insbesondere nicht Angaben mit betrieblicher
-- Bedeutung: steht bei einem Baum „Fällung empfohlen", bleibt das lesbar —
-- nur eben als Altangabe ohne Verfahren und ohne Person, und nicht als
-- Feststellung der Plattform.
--
-- Sobald eine Person den Baum das erste Mal richtig aufnimmt, entsteht daneben
-- ein echter Nachweis. Die Altangabe bleibt als das stehen, was sie ist.
--
-- Offen und in BLOCKED.md vermerkt: ob übernommene Katasterwerte später als
-- „in 1,30 m gemessen" gelten sollen. Diese Migration nimmt das nicht vorweg.
--
-- Rücknahme: supabase/migrations/down/20260810_biome_altbestand_uebernahme.down.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Ablage für die Altangaben ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_altbestand_baum (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baum_id           UUID NOT NULL REFERENCES biome_baum(id) ON DELETE CASCADE,
  -- Herkunft: die Zeile, aus der das stammt. Damit bleibt jede Altangabe bis
  -- auf ihren Ursprung zurückverfolgbar.
  quelle_tabelle    TEXT NOT NULL DEFAULT 'map_features',
  quelle_id         TEXT NOT NULL,
  quelle_erstellt   TIMESTAMPTZ,
  -- Die Rohangaben, unverändert. Nicht interpretiert, nicht ergänzt.
  properties        JSONB NOT NULL,
  uebernommen_am    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quelle_tabelle, quelle_id)
);
COMMENT ON TABLE biome_altbestand_baum IS
  'Fachangaben aus der Zeit vor dem Datenkern, wörtlich übernommen. Kein Nachweis: ohne Methode, ohne Messhöhe, ohne Person, teils aus Skalen, die sich gegen kein Dokument verteidigen lassen. Die Oberfläche muss sie als Altangabe kennzeichnen.';

CREATE INDEX IF NOT EXISTS idx_biome_altbestand_baum ON biome_altbestand_baum(baum_id);

SELECT biome_rls_intern('biome_altbestand_baum');

-- ── Methode für die Übernahme ─────────────────────────────────────────────
-- Erfassungsart 'fremddaten': die Angaben stammen aus einem anderen System,
-- nicht aus eigener Beobachtung.

INSERT INTO biome_standard (id, domaene, kurzname, herausgeber, quelle_url, abgerufen_am, zitat, deckt, registerdatei, frei_zugaenglich)
VALUES ('BIOME-ALT-01', 'baum', 'Übernahme des BIOME-Altbestands',
        'LUMA (eigene Festlegung, keine externe Norm)',
        'docs/BIOME_UMSTELLUNG.md', CURRENT_DATE,
        'Die Identität eines Altbaums wird in den Datenkern übernommen, seine Fachangaben nicht. Sie bleiben als Altangabe ohne Methode, Messhöhe und Person erhalten und werden als solche gekennzeichnet, weil sie die Anforderungen des Nachweiskerns nicht erfüllen und nicht nachträglich erfüllt werden können.',
        'Herkunft übernommener Baumidentitäten. Deckt ausdrücklich keine Messwerte und keine Zustandsstufen.',
        'docs/BIOME_UMSTELLUNG.md', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO biome_methode (id, domaene, name, beschreibung, standard_id, einheit, bezugsflaeche, zeitbezug, erfassungsart)
VALUES ('M-IMPORT-ALTBESTAND', 'baum', 'Übernahme aus dem BIOME-Altbestand',
        'Maschinelle Übernahme aus map_features. Erfasst wurde die Identität des Baums (Nummer, Art, Lage). Die Fachangaben der Altdaten sind nicht übernommen, weil ihnen Methode, Messhöhe und Person fehlen.',
        'BIOME-ALT-01', NULL, 'je Baum', 'Zeitpunkt der Übernahme', 'fremddaten')
ON CONFLICT (id) DO NOTHING;

-- ── Die Übernahme selbst ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION biome_altbestand_uebernehmen()
RETURNS TABLE (standorte_neu INT, baeume_neu INT, altangaben_neu INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_standorte INT := 0;
  v_baeume    INT := 0;
  v_alt       INT := 0;
  v_person    UUID;
BEGIN
  -- Eine Person für die maschinelle Übernahme. Sie ist kein Mensch und heißt
  -- auch nicht so — sonst stünde später ein Name an einem Wert, den niemand
  -- erhoben hat.
  SELECT id INTO v_person FROM biome_person WHERE name = 'Systemübernahme';
  IF v_person IS NULL THEN
    INSERT INTO biome_person (name, organisation, rolle, qualifikation)
    VALUES ('Systemübernahme', 'LUMA', 'system',
            'Maschinelle Übernahme, keine Person vor Ort')
    RETURNING id INTO v_person;
  END IF;

  -- Je Projekt mit Altbäumen ein Standort. Der Name kommt aus dem Projekt;
  -- eine Geometrie wird nicht erfunden, wenn das Projekt keine hat.
  WITH projekte AS (
    SELECT DISTINCT f.project_id
    FROM map_features f
    WHERE f.feature_type = 'tree'
  ), neu AS (
    INSERT INTO biome_standort (project_id, name, geometrie, crs, angelegt_von)
    SELECT p.project_id,
           COALESCE(pr.name, 'Standort ' || p.project_id),
           pr.geojson,
           'EPSG:4326',
           v_person
    FROM projekte p
    LEFT JOIN projects pr ON pr.id = p.project_id
    WHERE NOT EXISTS (
      SELECT 1 FROM biome_standort s WHERE s.project_id = p.project_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_standorte FROM neu;

  -- Die Bäume. Nur Identität: Nummer, Art, Lage.
  --
  -- Kein Pflanzjahr aus dem Alter geschätzt, keine Lagegenauigkeit erfunden,
  -- keine Taxonomiequelle behauptet — im Altbestand steht nur ein Name, nicht
  -- woher er kommt.
  WITH baeume AS (
    SELECT
      f.id                                        AS quelle_id,
      s.id                                        AS standort_id,
      COALESCE(
        NULLIF(btrim(f.properties->>'baumnummer'), ''),
        'ALT-' || f.id
      )                                           AS baumnummer,
      NULLIF(btrim(f.properties->>'baumart_latein'), '')  AS art_lat,
      NULLIF(btrim(f.properties->>'baumart_deutsch'), '') AS art_de,
      f.geometry                                  AS position,
      f.created_at                                AS erstellt,
      f.properties                                AS props
    FROM map_features f
    JOIN biome_standort s ON s.project_id = f.project_id
    WHERE f.feature_type = 'tree'
      AND f.geometry->>'type' = 'Point'
  ), eingefuegt AS (
    INSERT INTO biome_baum (
      standort_id, baumnummer, art_wissenschaftlich, art_deutsch,
      taxon_quelle, position, crs, standorttyp, angelegt_von
    )
    SELECT b.standort_id, b.baumnummer, b.art_lat, b.art_de,
           NULL,                       -- Herkunft des Namens ist nicht bekannt
           b.position, 'EPSG:4326',
           NULL,
           v_person
    FROM baeume b
    WHERE NOT EXISTS (
      SELECT 1 FROM biome_altbestand_baum a
      WHERE a.quelle_tabelle = 'map_features' AND a.quelle_id = b.quelle_id
    )
      AND NOT EXISTS (
      SELECT 1 FROM biome_baum x
      WHERE x.standort_id = b.standort_id AND x.baumnummer = b.baumnummer
    )
    RETURNING id, standort_id, baumnummer
  )
  SELECT count(*) INTO v_baeume FROM eingefuegt;

  -- Die Altangaben, wörtlich, mit Verweis auf die Ursprungszeile.
  WITH zuordnung AS (
    SELECT f.id AS quelle_id, f.created_at, f.properties, bb.id AS baum_id
    FROM map_features f
    JOIN biome_standort s ON s.project_id = f.project_id
    JOIN biome_baum bb
      ON bb.standort_id = s.id
     AND bb.baumnummer = COALESCE(NULLIF(btrim(f.properties->>'baumnummer'), ''), 'ALT-' || f.id)
    WHERE f.feature_type = 'tree'
      AND f.geometry->>'type' = 'Point'
      AND f.properties <> '{}'::jsonb
  ), eingefuegt AS (
    INSERT INTO biome_altbestand_baum (baum_id, quelle_id, quelle_erstellt, properties)
    SELECT z.baum_id, z.quelle_id, z.created_at, z.properties
    FROM zuordnung z
    ON CONFLICT (quelle_tabelle, quelle_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_alt FROM eingefuegt;

  RETURN QUERY SELECT v_standorte, v_baeume, v_alt;
END;
$$;

COMMENT ON FUNCTION biome_altbestand_uebernehmen() IS
  'Übernimmt Bäume aus map_features in den Datenkern. Wiederholbar: bereits übernommene Zeilen werden übersprungen. Legt keine Messwerte und keine Zustandsstufen an.';

-- ── Sicht für die Oberfläche ──────────────────────────────────────────────
-- Zeigt je Baum, welche Altangaben vorliegen und dass sie unbelegt sind.

CREATE OR REPLACE VIEW v_biome_baum_altangaben WITH (security_invoker = on) AS
SELECT
  a.baum_id,
  b.baumnummer,
  a.quelle_id,
  a.quelle_erstellt,
  a.properties,
  -- Die Schlüssel, für die es im Register nachweislich keine Deckung gibt.
  ARRAY(
    SELECT k FROM jsonb_object_keys(a.properties) k
    WHERE k IN ('vitalitaet', 'verkehrssicherheit', 'eps_befall', 'schutzstatus')
  ) AS unbelegte_felder,
  -- Zahlenangaben ohne Messhöhe und ohne Verfahren.
  ARRAY(
    SELECT k FROM jsonb_object_keys(a.properties) k
    WHERE k IN ('stammumfang_cm', 'bhd_cm', 'baumhoehe_m', 'kronendurchmesser_m', 'kronenansatz_m')
  ) AS werte_ohne_verfahren
FROM biome_altbestand_baum a
JOIN biome_baum b ON b.id = a.baum_id;

COMMENT ON VIEW v_biome_baum_altangaben IS
  'Altangaben je Baum, getrennt nach unbelegten Stufen und Zahlen ohne Verfahren. Die Oberfläche zeigt beides als Altangabe, nie als Nachweis.';

-- ── Ausführen ─────────────────────────────────────────────────────────────
-- Die Migration führt die Übernahme gleich aus. Sie ist wiederholbar: ein
-- zweiter Lauf legt nichts doppelt an.

DO $$
DECLARE
  e RECORD;
BEGIN
  SELECT * INTO e FROM biome_altbestand_uebernehmen();
  RAISE NOTICE 'Altbestand übernommen: % Standort(e), % Baum/Bäume, % Altangaben-Datensätze',
    e.standorte_neu, e.baeume_neu, e.altangaben_neu;
END;
$$;
