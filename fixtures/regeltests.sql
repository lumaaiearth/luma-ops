-- ═══════════════════════════════════════════════════════════════════════════
-- Regeltests: sind die harten Regeln wirklich durchgesetzt?
--
-- Jeder Test versucht, eine Regel zu verletzen. Gelingt es, schlägt der Test
-- fehl und das Merge-Gate ist rot. Das ist der Unterschied zwischen einer
-- Regel und einem guten Vorsatz.
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
\echo 'Regeltests BIOME-Datenkern'
\echo ''

-- ── Nachweiskern ist append-only ──────────────────────────────────────────

SELECT pg_temp.muss_scheitern(
  $q$ UPDATE biome_baum_messung SET wert = 999 WHERE id = 'c0000000-0000-4000-8000-000000000001' $q$,
  'Nachweis lässt sich nicht ändern');

SELECT pg_temp.muss_scheitern(
  $q$ DELETE FROM biome_kontrolle WHERE id = 'd0000000-0000-4000-8000-000000000001' $q$,
  'Kontrolle lässt sich nicht löschen');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_baum_messung (baum_id, merkmal, wert, einheit, messhoehe_cm, methode_id, erfasst_von, datum, ersetzt_id)
      VALUES ('b0000000-0000-4000-8000-000000000001','stammumfang',93,'cm',130,'M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-05-01',
              'c0000000-0000-4000-8000-000000000001') $q$,
  'Korrektur ohne Grund wird abgewiesen');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_baum_messung (baum_id, merkmal, wert, einheit, messhoehe_cm, methode_id, erfasst_von, datum, ersetzt_id, korrektur_grund)
      VALUES ('b0000000-0000-4000-8000-000000000007','stammumfang',86,'cm',130,'M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-05-01',
              'c0000000-0000-4000-8000-000000000007','zweite Korrektur derselben Zeile') $q$,
  'Eine Zeile lässt sich nur einmal ersetzen');

-- Der Vorzustand wurde beim Anlegen der Korrektur eingefroren.
SELECT pg_temp.muss_gelten(
  (SELECT (vorzustand->>'wert')::numeric = 850
   FROM biome_baum_messung WHERE id = 'c0000000-0000-4000-8000-000000000077'),
  'Korrektur trägt den vollständigen Vorzustand (850 cm)');

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 1 FROM biome_baum_messung WHERE id = 'c0000000-0000-4000-8000-000000000007'),
  'Der ersetzte Datensatz ist nicht verschwunden');

SELECT pg_temp.muss_gelten(
  (SELECT wert = 85 FROM v_biome_baum_messung_gueltig
   WHERE baum_id = 'b0000000-0000-4000-8000-000000000007' AND merkmal = 'stammumfang'),
  'Die gültige Sicht zeigt 85 cm, nicht 850 cm');

-- ── Nachweiskern nimmt keine abgeleiteten Werte ───────────────────────────

INSERT INTO biome_methode (id, domaene, name, beschreibung, erfassungsart)
VALUES ('M-TEST-MODELL','baum','Modellschätzung','Nur für den Regeltest.','modell');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_baum_messung (baum_id, merkmal, wert, einheit, messhoehe_cm, methode_id, erfasst_von, datum)
      VALUES ('b0000000-0000-4000-8000-000000000001','baumhoehe',18,'m',NULL,'M-TEST-MODELL','a0000000-0000-4000-8000-000000000003', DATE '2026-05-01') $q$,
  'Modellwert kommt nicht in den Nachweiskern');

-- ── Messwerte tragen ihre Messhöhe ────────────────────────────────────────

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_baum_messung (baum_id, merkmal, wert, einheit, methode_id, erfasst_von, datum)
      VALUES ('b0000000-0000-4000-8000-000000000001','stammumfang',93,'cm','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-05-01') $q$,
  'Stammumfang ohne Messhöhe wird abgewiesen');

-- ── Zustandsstufen nur aus belegten Skalen ────────────────────────────────

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_baum_bewertung (baum_id, skala_id, stufe, methode_id, erfasst_von, datum)
      VALUES ('b0000000-0000-4000-8000-000000000001','SK-ROLOFF-VS','4','M-BAUM-VITALITAET','a0000000-0000-4000-8000-000000000002', DATE '2026-05-12') $q$,
  'Roloff-Stufe 4 gibt es nicht und lässt sich nicht speichern');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_baum_bewertung (baum_id, skala_id, stufe, methode_id, erfasst_von, datum)
      VALUES ('b0000000-0000-4000-8000-000000000001','SK-FLL-ZUSTAND','2','M-BAUM-VITALITAET','a0000000-0000-4000-8000-000000000002', DATE '2026-05-12') $q$,
  'Eine nicht registrierte Skala lässt sich nicht verwenden');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_skala_stufe (skala_id, stufe, reihenfolge, bezeichnung, definition_zitat)
      VALUES ('SK-ROLOFF-VS','X',9,'Ausgedacht','kurz') $q$,
  'Eine Stufe ohne belastbares Definitionszitat wird abgewiesen');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_standard (id, domaene, kurzname, herausgeber, quelle_url, abgerufen_am, zitat, deckt, registerdatei)
      VALUES ('S-ERFUNDEN','baum','Erfunden','Niemand','https://example.invalid', DATE '2026-08-09','zu kurz','irgendwas','x.md') $q$,
  'Ein Registereintrag ohne wörtliches Zitat wird abgewiesen');

-- ── Boden: Tiefe, Datum, Verfahren, Labor ─────────────────────────────────

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_bodenprobe (standort_id, probennummer, entnahme_datum, tiefe_bis_cm, probenart, methode_id, entnommen_von, labor, erfasst_von)
      VALUES ('50000000-0000-4000-8000-000000000001','P-1', DATE '2026-05-01', 30,'einzelprobe','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003','Labor X','a0000000-0000-4000-8000-000000000003') $q$,
  'Bodenprobe ohne Entnahmetiefe von wird abgewiesen');

-- ── Fauna: keine Artenliste ohne Erfassungsereignis ───────────────────────

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_artnachweis (art_wissenschaftlich, taxon_quelle, nachweistyp, bestimmt_von, erfasst_von)
      VALUES ('Passer domesticus','GBIF','sichtbeobachtung','a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002') $q$,
  'Artnachweis ohne Erfassungsereignis wird abgewiesen');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_erfassungsereignis (standort_id, artengruppe, datum_von, methode_id, erfasst_von)
      VALUES ('50000000-0000-4000-8000-000000000001','Brutvögel', DATE '2026-05-01','M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002') $q$,
  'Erfassungsereignis ohne Aufwandsangabe wird abgewiesen');

-- ── Maßnahmen: keine Freigabe ohne Artenschutzprüfung ─────────────────────

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_massnahme (standort_id, titel, typ, status, durchgefuehrt_am)
      VALUES ('50000000-0000-4000-8000-000000000001','Kroneneinkürzung Robinie','schnitt','durchgefuehrt', DATE '2026-06-01') $q$,
  'Durchgeführte Maßnahme ohne Artenschutzprüfung wird abgewiesen');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_massnahme (standort_id, titel, typ, status)
      VALUES ('50000000-0000-4000-8000-000000000001','Kroneneinkürzung Robinie','schnitt','freigegeben') $q$,
  'Freigegebene Maßnahme ohne Artenschutzprüfung wird abgewiesen');

-- ── Fernerkundung ─────────────────────────────────────────────────────────

INSERT INTO biome_standard (id, domaene, kurzname, herausgeber, quelle_url, abgerufen_am, zitat, deckt, registerdatei)
VALUES ('S-TEST-INDEX','fernerkundung','Testindex','Regeltest','https://example.invalid', DATE '2026-08-09',
        'Platzhalter für den Regeltest, lang genug um die Zitatpruefung zu erfuellen und nicht als Inhalt gemeint.',
        'nur Regeltest','fixtures/regeltests.sql');

INSERT INTO biome_fernerkundungssensor (id, modell, sensorfamilie) VALUES ('SENS-RGN','Test-RGN-Kamera','rgn');
INSERT INTO biome_sensorband (sensor_id, band_name, funktion) VALUES
  ('SENS-RGN','R','rot'), ('SENS-RGN','G','gruen'), ('SENS-RGN','N','nir');

INSERT INTO biome_indexdefinition (id, name, formel, benoetigte_funktionen, standard_id) VALUES
  ('NDVI','NDVI','(NIR - Rot) / (NIR + Rot)', ARRAY['nir','rot'], 'S-TEST-INDEX'),
  ('NDRE','NDRE','(NIR - RedEdge) / (NIR + RedEdge)', ARRAY['nir','red_edge'], 'S-TEST-INDEX');

INSERT INTO biome_flug (id, standort_id, sensor_id, datum, uhrzeit_start, gsd_cm, sonnenzenit_grad, kalibrierziel, crs, verarbeitungsversion)
VALUES ('f0000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','SENS-RGN', DATE '2026-06-10','11:20',2.5,32,'Referenzpanel 50 % vor und nach dem Flug','EPSG:25833','v1.0');

INSERT INTO biome_geometrie (id, standort_id, bezug_typ, bezug_id, version, geometrie, quelle, gueltig_ab, erfasst_von)
VALUES ('90000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','baumkrone','b0000000-0000-4000-8000-000000000001',1,
        '{"type":"Polygon","coordinates":[[[13.5431,52.5456],[13.5433,52.5456],[13.5433,52.5458],[13.5431,52.5458],[13.5431,52.5456]]]}'::jsonb,
        'Handabgrenzung im Orthomosaik', DATE '2026-06-10','a0000000-0000-4000-8000-000000000001');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_analyse_zonalstatistik (flug_id, geometrie_id, index_id, n_pixel, mittel, verfahren, verfahren_version)
      VALUES ('f0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','NDRE',1200,0.42,'Zonalstatistik','v1') $q$,
  'NDRE auf einer RGN-Kamera wird abgewiesen');

INSERT INTO biome_analyse_zonalstatistik (flug_id, geometrie_id, index_id, n_pixel, mittel, verfahren, verfahren_version)
VALUES ('f0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','NDVI',1200,0.62,'Zonalstatistik','v1');
SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 1 FROM biome_analyse_zonalstatistik WHERE index_id = 'NDVI'),
  'NDVI auf derselben Kamera ist zulässig');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_flugvergleich (flug_a, flug_b, gate_bestanden, gate_details, verfahren_version)
      VALUES ('f0000000-0000-4000-8000-000000000001', gen_random_uuid(), false, '{}'::jsonb, 'v1') $q$,
  'Nicht bestandenes Vergleichbarkeits-Gate ohne Grund wird abgewiesen');

-- ── Wirkung: BACI ─────────────────────────────────────────────────────────

INSERT INTO biome_artenschutzpruefung (id, standort_id, datum, geprueft_von, qualifikation, zeitraum_geprueft, ergebnis, begruendung, erfasst_von)
VALUES ('a1000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001', DATE '2026-03-01',
        'a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege', true,'keine_betroffenheit',
        'Kontrolle auf Höhlen und Nester am 2026-03-01, keine Besiedlung festgestellt.','a0000000-0000-4000-8000-000000000002');

INSERT INTO biome_massnahme (id, standort_id, titel, typ, status, durchgefuehrt_am, artenschutz_pruefung_id)
VALUES ('a2000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Extensivierung Wiesenfläche','pflege','durchgefuehrt', DATE '2026-03-15','a1000000-0000-4000-8000-000000000001');

-- Wirkungsfrage ohne Referenzfläche: die Analyse darf keinen Effektwert tragen.
INSERT INTO biome_wirkungsfrage (id, standort_id, titel, massnahme_id, kennzahl_methode_id, behandelte_flaeche_id, baseline_von, baseline_bis, wirkung_von, wirkung_bis)
VALUES ('a3000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Wirkt die Extensivierung?','a2000000-0000-4000-8000-000000000001','M-BAUM-UMFANG',
        '90000000-0000-4000-8000-000000000001', DATE '2025-05-01', DATE '2025-09-30', DATE '2026-05-01', DATE '2026-09-30');

INSERT INTO biome_analyse_wirkung (id, wirkungsfrage_id, baci_vollstaendig, effekt_wert, effekt_einheit, verfahren, verfahren_version)
VALUES ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001', true, 23.5,'%','Differenz der Differenzen','v1');

SELECT pg_temp.muss_gelten(
  (SELECT NOT baci_vollstaendig AND effekt_wert IS NULL AND 'referenzflaeche' = ANY(fehlende_bausteine)
   FROM biome_analyse_wirkung WHERE id = 'a4000000-0000-4000-8000-000000000001'),
  'Ohne Referenzfläche: BACI unvollständig, Effektwert genullt, Lücke benannt');

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 0 FROM v_biome_wirkung_darstellbar WHERE wirkungsfrage_id = 'a3000000-0000-4000-8000-000000000001'),
  'Der unvollständige Fall erscheint nicht in der darstellbaren Sicht');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_wirkungsfrage (standort_id, titel, massnahme_id, kennzahl_methode_id, referenzflaeche_id)
      VALUES ('50000000-0000-4000-8000-000000000001','Ohne Begründung','a2000000-0000-4000-8000-000000000001','M-BAUM-UMFANG',
              '90000000-0000-4000-8000-000000000001') $q$,
  'Referenzfläche ohne Vergleichbarkeitsbegründung wird abgewiesen');

-- ── Bericht: Herkunft und Kennzeichnung ───────────────────────────────────

INSERT INTO biome_bericht (id, standort_id, titel) VALUES
  ('a5000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Testbericht');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_berichtposition (bericht_id, reihenfolge, art, wert, einheit)
      VALUES ('a5000000-0000-4000-8000-000000000001',1,'nachweis',12,'Bäume') $q$,
  'Berichtsposition ohne Herkunft wird abgewiesen');

SELECT pg_temp.muss_scheitern(
  $q$ INSERT INTO biome_berichtposition (bericht_id, reihenfolge, art, wert, einheit, herkunft)
      VALUES ('a5000000-0000-4000-8000-000000000001',2,'analyse',0.62,'NDVI','{"tabelle":"biome_analyse_zonalstatistik"}'::jsonb) $q$,
  'Analyseposition ohne Kennzeichnung wird abgewiesen');

-- ── Ground Truth stimmt mit den Jobdateien überein ────────────────────────

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 12 FROM biome_baum WHERE standort_id = '50000000-0000-4000-8000-000000000001'),
  'Ground Truth: 12 Bäume am Standort');

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 1 FROM biome_baum
   WHERE standort_id = '50000000-0000-4000-8000-000000000001' AND art_wissenschaftlich IS NULL),
  'Ground Truth: genau ein Baum mit unbestimmter Art');

SELECT pg_temp.muss_gelten(
  (SELECT array_agg(baumnummer ORDER BY baumnummer) = ARRAY['B-002','B-005','B-008','B-011','B-012']
   FROM biome_baum b
   WHERE b.standort_id = '50000000-0000-4000-8000-000000000001'
     AND NOT EXISTS (
       SELECT 1 FROM v_biome_kontrolle_gueltig k
       WHERE k.baum_id = b.id AND extract(year FROM k.datum) = 2026)),
  'Ground Truth: fünf Bäume ohne Kontrolle 2026, genau die erwarteten');

SELECT pg_temp.muss_gelten(
  (SELECT array_agg(baumnummer) = ARRAY['B-012'] FROM biome_baum b
   WHERE b.standort_id = '50000000-0000-4000-8000-000000000001'
     AND NOT EXISTS (SELECT 1 FROM v_biome_kontrolle_gueltig k WHERE k.baum_id = b.id)),
  'Ground Truth: genau ein Baum wurde noch nie kontrolliert (B-012)');

-- B-011 misst je Stamm, hat also keinen Gesamtumfang — aber sehr wohl eine
-- Messung. Deshalb der Zusatz auf stamm_nr: sonst zählte die Sandbirke als
-- „ohne Stammumfang", und die Oberfläche zeigte „keine Angabe" für einen Baum,
-- an dem dreimal gemessen wurde.
SELECT pg_temp.muss_gelten(
  (SELECT array_agg(baumnummer) = ARRAY['B-003'] FROM biome_baum b
   WHERE b.standort_id = '50000000-0000-4000-8000-000000000001'
     AND NOT EXISTS (SELECT 1 FROM v_biome_baum_messung_gueltig m
                     WHERE m.baum_id = b.id AND m.merkmal = 'stammumfang')),
  'Ground Truth: genau ein Baum ohne jede Umfangsmessung (B-003)');

-- ── Lagegenauigkeit: keine Zahl ohne Bezugsebene ──────────────────────────

SELECT pg_temp.muss_scheitern($$
  UPDATE biome_baum SET lagegenauigkeit_m = 3
   WHERE baumnummer = 'B-001'
$$, 'Lagegenauigkeit ohne Bezugsebene wird abgewiesen');

SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 0 FROM biome_baum WHERE lagegenauigkeit_m IS NOT NULL),
  'Ground Truth: zu keinem Baum ist eine Lagegenauigkeit erfunden');

SELECT pg_temp.muss_scheitern($$
  UPDATE biome_baum SET lagegenauigkeit_m = 3, lagegenauigkeit_bezug = 'ungefaehr'
   WHERE baumnummer = 'B-001'
$$, 'Erfundene Bezugsebene wird abgewiesen');

-- Der belegte Fall muss durchgehen, sonst ist der Riegel zu eng.
UPDATE biome_baum SET lagegenauigkeit_m = 3, lagegenauigkeit_bezug = 'einzelobjekt'
 WHERE baumnummer = 'B-001';
SELECT pg_temp.muss_gelten(
  (SELECT lagegenauigkeit_m = 3 AND lagegenauigkeit_bezug = 'einzelobjekt'
     FROM biome_baum WHERE baumnummer = 'B-001'),
  'Lagegenauigkeit mit belegter Bezugsebene wird angenommen');
UPDATE biome_baum SET lagegenauigkeit_m = NULL, lagegenauigkeit_bezug = NULL
 WHERE baumnummer = 'B-001';

-- ── Mehrstämmigkeit ───────────────────────────────────────────────────────

SELECT pg_temp.muss_gelten(
  (SELECT mehrstaemmig IS NULL FROM biome_baum WHERE baumnummer = 'B-012'),
  'Ground Truth: B-012 ist nie kontrolliert, die Stammform also nicht erhoben');

SELECT pg_temp.muss_gelten(
  (SELECT array_agg(baumnummer) = ARRAY['B-011'] FROM biome_baum
   WHERE standort_id = '50000000-0000-4000-8000-000000000001' AND mehrstaemmig),
  'Ground Truth: genau ein mehrstämmiger Baum (B-011)');

SELECT pg_temp.muss_gelten(
  (SELECT umfang_cm = 58 AND staemme_erfasst = 3
   FROM v_biome_baum_staerkster_stamm s
   JOIN biome_baum b ON b.id = s.baum_id
   WHERE b.baumnummer = 'B-011'),
  'Ground Truth: stärkster Stamm von B-011 misst 58 cm bei drei erfassten Stämmen');

-- Die Schwelle entscheidet sich am stärksten Stamm, nicht an der Summe.
-- Summe wäre 110 cm und damit über 80 — die Sicht darf das nicht liefern.
SELECT pg_temp.muss_gelten(
  (SELECT umfang_cm >= 50 FROM v_biome_baum_staerkster_stamm s
   JOIN biome_baum b ON b.id = s.baum_id WHERE b.baumnummer = 'B-011'),
  'B-011 erreicht die 50-cm-Schwelle am stärksten Stamm');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_baum_messung (baum_id, merkmal, wert, einheit, messhoehe_cm, stamm_nr, methode_id, erfasst_von, datum)
  SELECT id, 'baumhoehe', 12, 'm', NULL, 1, 'M-BAUM-UMFANG', 'a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'
    FROM biome_baum WHERE baumnummer = 'B-011'
$$, 'Stammnummer an einem Merkmal ohne Stämme wird abgewiesen');

SELECT pg_temp.muss_scheitern($$
  INSERT INTO biome_baum_messung (baum_id, merkmal, wert, einheit, messhoehe_cm, stamm_nr, methode_id, erfasst_von, datum)
  SELECT id, 'stammumfang', 30, 'cm', 130, 0, 'M-BAUM-UMFANG', 'a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'
    FROM biome_baum WHERE baumnummer = 'B-011'
$$, 'Stammnummer 0 wird abgewiesen');

-- ── Korrekturkette B-007: Datum und Person müssen zusammenpassen ──────────

SELECT pg_temp.muss_gelten(
  (SELECT datum = DATE '2026-04-22' AND erfasst_von = 'a0000000-0000-4000-8000-000000000002'
   FROM biome_baum_messung
   WHERE id = 'c0000000-0000-4000-8000-000000000077'),
  'Ground Truth: die Korrektur an B-007 trägt den Tag der Nachmessung und die nachmessende Person');

-- ── Taxonschlüssel ohne Nachweis ihrer Auflösung ─────────────────────────

SELECT pg_temp.muss_scheitern($$
  UPDATE biome_baum SET taxon_confidence = NULL WHERE baumnummer = 'B-001'
$$, 'Taxonschlüssel ohne Trefferqualität wird abgewiesen');

SELECT pg_temp.muss_scheitern($$
  UPDATE biome_baum SET taxon_matchtype = NULL WHERE baumnummer = 'B-001'
$$, 'Taxonschlüssel ohne Trefferart wird abgewiesen');

SELECT pg_temp.muss_scheitern($$
  UPDATE biome_baum SET taxon_abgerufen_am = NULL WHERE baumnummer = 'B-001'
$$, 'Taxonschlüssel ohne Auflösungsdatum wird abgewiesen');

SELECT pg_temp.muss_scheitern($$
  UPDATE biome_baum SET taxon_confidence = 101 WHERE baumnummer = 'B-001'
$$, 'Trefferqualität über 100 wird abgewiesen');

-- Der unbestimmte Baum darf gar keinen Nachweis brauchen: kein Schlüssel,
-- keine Pflicht. Sonst zwingt die Regel dazu, etwas zu erfinden.
SELECT pg_temp.muss_gelten(
  (SELECT taxon_id IS NULL AND taxon_confidence IS NULL
     FROM biome_baum WHERE baumnummer = 'B-009'),
  'B-009 ist unbestimmt und trägt deshalb keinen Taxonnachweis');

-- Die drei Schlüssel, die bis 2026-08-10 auf eine andere Art zeigten.
SELECT pg_temp.muss_gelten(
  (SELECT count(*) = 0 FROM biome_baum
    WHERE taxon_id IN ('3189866','5332048','5361896')),
  'Keiner der drei widerlegten Taxonschlüssel steht mehr im Bestand');

SELECT pg_temp.muss_gelten(
  (SELECT taxon_id = '3189846' FROM biome_baum WHERE baumnummer = 'B-005'),
  'Acer platanoides traegt den aufgeloesten Schluessel 3189846');

SELECT pg_temp.muss_gelten(
  (SELECT taxon_id = '5331916' FROM biome_baum WHERE baumnummer = 'B-011'),
  'Betula pendula traegt den aufgeloesten Schluessel 5331916');

SELECT pg_temp.muss_gelten(
  (SELECT taxon_id = '7400250' FROM biome_baum WHERE baumnummer = 'B-012'),
  'Platanus x hispanica traegt den aufgeloesten Schluessel 7400250');

SELECT pg_temp.muss_gelten(
  (SELECT bool_and(taxon_confidence = 100 AND taxon_matchtype = 'EXACT'
                   AND taxon_status = 'ACCEPTED' AND taxon_abgerufen_am = DATE '2026-08-10')
     FROM biome_baum WHERE taxon_id IS NOT NULL
       AND standort_id = '50000000-0000-4000-8000-000000000001'),
  'Jeder Schluessel im Bestand traegt seinen vollstaendigen Auflösungsnachweis');

\echo ''
\echo 'Alle Regeltests grün.'
\echo ''

ROLLBACK;
