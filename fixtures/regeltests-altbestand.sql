-- ═══════════════════════════════════════════════════════════════════════════
-- Regeltests für die Übernahme des Altbestands.
--
-- Die Frage, die hier beantwortet wird: hat die Übernahme irgendwo etwas
-- erfunden oder etwas verloren? Beides wäre schlimmer als gar nicht zu
-- übernehmen.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.gilt(p_bedingung boolean, p_regel text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_bedingung IS NOT TRUE THEN
    RAISE EXCEPTION 'ÜBERNAHME VERLETZT REGEL: %', p_regel;
  END IF;
  RAISE NOTICE '  ok        %', p_regel;
END;
$$;

\echo ''
\echo 'Regeltests Altbestands-Übernahme'
\echo ''

-- ── Vollständig übernommen ────────────────────────────────────────────────

SELECT pg_temp.gilt(
  (SELECT count(*) = 2 FROM biome_altbestand_baum),
  'Beide Altbäume sind übernommen');

SELECT pg_temp.gilt(
  (SELECT count(*) = 2 FROM biome_baum b
   JOIN biome_altbestand_baum a ON a.baum_id = b.id),
  'Für jeden Altbaum gibt es eine Identität im Datenkern');

SELECT pg_temp.gilt(
  (SELECT array_agg(baumnummer ORDER BY baumnummer) = ARRAY['B-0001','B-0002']
   FROM biome_baum b JOIN biome_altbestand_baum a ON a.baum_id = b.id),
  'Die Baumnummern stimmen mit dem Altbestand überein');

SELECT pg_temp.gilt(
  (SELECT art_wissenschaftlich = 'Liquidambar styraciflua'
   FROM biome_baum WHERE baumnummer = 'B-0001'),
  'Der wissenschaftliche Name ist übernommen');

-- ── Nichts verloren ───────────────────────────────────────────────────────

SELECT pg_temp.gilt(
  (SELECT a.properties = f.properties
   FROM biome_altbestand_baum a JOIN map_features f ON f.id = a.quelle_id
   WHERE a.quelle_id = 'w6jdyxc0'),
  'Die Altangaben sind wörtlich und unverändert erhalten');

SELECT pg_temp.gilt(
  (SELECT properties->>'verkehrssicherheit' = 'gefaellung'
   FROM biome_altbestand_baum WHERE quelle_id = 'w6jdyxc0'),
  'Auch betrieblich wichtige Altangaben bleiben lesbar (Fällung empfohlen)');

SELECT pg_temp.gilt(
  (SELECT count(*) = 2 FROM map_features WHERE feature_type = 'tree'),
  'Der Ursprung in map_features ist unangetastet');

-- ── Nichts erfunden ───────────────────────────────────────────────────────

SELECT pg_temp.gilt(
  (SELECT count(*) = 0 FROM biome_baum_messung m
   JOIN biome_altbestand_baum a ON a.baum_id = m.baum_id),
  'Aus 105 cm ohne Messhöhe ist keine Messung im Nachweiskern geworden');

SELECT pg_temp.gilt(
  (SELECT count(*) = 0 FROM biome_baum_bewertung w
   JOIN biome_altbestand_baum a ON a.baum_id = w.baum_id),
  'Aus der entfernten Skala ist keine Bewertung im Nachweiskern geworden');

SELECT pg_temp.gilt(
  (SELECT count(*) = 0 FROM biome_kontrolle k
   JOIN biome_altbestand_baum a ON a.baum_id = k.baum_id),
  'Es ist keine Kontrolle erfunden worden');

SELECT pg_temp.gilt(
  (SELECT bool_and(taxon_quelle IS NULL) FROM biome_baum b
   JOIN biome_altbestand_baum a ON a.baum_id = b.id),
  'Es ist keine Taxonomiequelle behauptet, die es nicht gibt');

SELECT pg_temp.gilt(
  (SELECT bool_and(gepflanzt_jahr IS NULL AND lagegenauigkeit_m IS NULL)
   FROM biome_baum b JOIN biome_altbestand_baum a ON a.baum_id = b.id),
  'Weder Pflanzjahr noch Lagegenauigkeit sind geschätzt');

-- ── Als unbelegt erkennbar ────────────────────────────────────────────────

SELECT pg_temp.gilt(
  (SELECT unbelegte_felder @> ARRAY['vitalitaet','verkehrssicherheit','eps_befall','schutzstatus']
   FROM v_biome_baum_altangaben WHERE baumnummer = 'B-0001'),
  'Die Sicht weist alle vier unbelegten Felder aus');

SELECT pg_temp.gilt(
  (SELECT werte_ohne_verfahren = ARRAY['stammumfang_cm']
   FROM v_biome_baum_altangaben WHERE baumnummer = 'B-0001'),
  'Die Sicht weist den Stammumfang als Wert ohne Verfahren aus');

SELECT pg_temp.gilt(
  (SELECT unbelegte_felder = '{}' AND werte_ohne_verfahren = '{}'
   FROM v_biome_baum_altangaben WHERE baumnummer = 'B-0002'),
  'Ein Altbaum ohne Fachangaben wird nicht als unbelegt gemeldet');

-- ── Die Person ist als Maschine erkennbar ─────────────────────────────────

SELECT pg_temp.gilt(
  (SELECT p.name = 'Systemübernahme'
   FROM biome_baum b JOIN biome_person p ON p.id = b.angelegt_von
   WHERE b.baumnummer = 'B-0001'),
  'Der Datensatz nennt die Übernahme, nicht einen Menschen');

-- ── Wiederholbar ──────────────────────────────────────────────────────────

SELECT biome_altbestand_uebernehmen();
SELECT pg_temp.gilt(
  (SELECT count(*) = 2 FROM biome_altbestand_baum),
  'Ein zweiter Lauf legt nichts doppelt an');
SELECT pg_temp.gilt(
  (SELECT count(*) = 2 FROM biome_baum b JOIN biome_altbestand_baum a ON a.baum_id = b.id),
  'Ein zweiter Lauf legt keinen Baum doppelt an');

\echo ''
\echo 'Alle Regeltests zur Übernahme grün.'
\echo ''

ROLLBACK;
