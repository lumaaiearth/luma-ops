-- ════════════════════════════════════════════════════════════════════════════
-- Regeltests Mandantentrennung — Kundenportal und öffentliche Ansicht
--
-- Frage: Kann ein Kundenkonto irgendetwas sehen, das nicht seiner Organisation
-- gehört? Und sieht ein Gast oder ein anonymer Aufruf Kundendaten?
--
-- Läuft gegen eine Datenbank mit echtem Schema und Bestand (die Produktion
-- oder einen Abzug davon), vollständig in EINER Transaktion, die am Ende
-- zurückgerollt wird. Testorganisationen, Testkonten und die Zuordnung der
-- Auftraggeber bleiben nicht zurück.
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f fixtures/regeltests-mandanten.sql
--
-- Ein Verstoß bricht mit RAISE EXCEPTION ab (und rollt damit ebenfalls zurück).
-- Voraussetzung: Auftraggeber 'jope' und 'bew' existieren und haben Projekte.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Aufbau (als Eigentümer) ───────────────────────────────────────────────
INSERT INTO organisation (id, slug, name, typ) VALUES
  ('00000000-0000-4000-8000-00000000a000', 'regeltest-a', 'Regeltest A', 'kunde'),
  ('00000000-0000-4000-8000-00000000b000', 'regeltest-b', 'Regeltest B', 'kunde');

UPDATE clients SET org_id = '00000000-0000-4000-8000-00000000a000' WHERE id = 'jope';
UPDATE clients SET org_id = '00000000-0000-4000-8000-00000000b000' WHERE id = 'bew';

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'kunde-a@regeltest.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b1', 'kunde-b@regeltest.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c1', 'gast@regeltest.invalid',    'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d1', 'ohne-org@regeltest.invalid','authenticated', 'authenticated');

-- handle_new_user legt Profile an; Rolle und Organisation hier festlegen.
INSERT INTO user_profile (id, org_id, rolle, name) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000a000', 'kunde_viewer', 'Regeltest Kunde A'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000b000', 'kunde_viewer', 'Regeltest Kunde B'),
  ('00000000-0000-4000-8000-0000000000c1', NULL,                                   'gast',         'Regeltest Gast'),
  ('00000000-0000-4000-8000-0000000000d1', NULL,                                   'kunde_viewer', 'Regeltest ohne Org')
ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, rolle = EXCLUDED.rolle, name = EXCLUDED.name;

-- Erwartungswerte, als Eigentümer berechnet (sieht alles).
CREATE TEMP TABLE _soll AS
SELECT
  (SELECT array_agg(id ORDER BY id) FROM projects WHERE client_id = 'jope') AS projekte_a,
  (SELECT array_agg(id ORDER BY id) FROM projects WHERE client_id = 'bew')  AS projekte_b;
GRANT SELECT ON _soll TO authenticated, anon;

DO $$ BEGIN
  IF (SELECT cardinality(projekte_a) FROM _soll) IS NULL OR (SELECT cardinality(projekte_b) FROM _soll) IS NULL THEN
    RAISE EXCEPTION 'Voraussetzung fehlt: jope und bew brauchen je mindestens ein Projekt';
  END IF;
END $$;

-- Prüfhelfer
CREATE FUNCTION pg_temp.gilt(bedingung boolean, text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF bedingung IS NOT TRUE THEN RAISE EXCEPTION 'MANDANTENTRENNUNG VERLETZT: %', $2; END IF;
  RAISE NOTICE '  ok  %', $2;
END $$;

-- Rolle wechseln: angemeldet als <uid>
CREATE FUNCTION pg_temp.als(uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  SELECT set_config('request.jwt.claim.sub', uid::text, true);
$$;
-- Für anon: eine Sicht ist sicher, wenn sie leer ist ODER gar nicht lesbar.
CREATE FUNCTION pg_temp.leer_oder_verweigert(rel text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM %s', rel) INTO n;
  RETURN n = 0;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.gilt(boolean, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.als(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION pg_temp.leer_oder_verweigert(text) TO authenticated, anon;

-- ════════════════════════════════════════════════════════════════════════════
-- Kunde A (JOPE)
-- ════════════════════════════════════════════════════════════════════════════
SELECT pg_temp.als('00000000-0000-4000-8000-0000000000a1');
SET LOCAL ROLE authenticated;
\echo '── Kunde A'

SELECT pg_temp.gilt(is_kunde(), 'Kunde A wird als Kunde erkannt');
SELECT pg_temp.gilt(NOT is_internal(), 'Kunde A gilt nicht als intern');

SELECT pg_temp.gilt(
  (SELECT array_agg(id ORDER BY id) FROM v_kunde_projekte) = (SELECT projekte_a FROM _soll),
  'v_kunde_projekte zeigt genau die Projekte von A');
SELECT pg_temp.gilt(
  NOT EXISTS (SELECT 1 FROM v_kunde_auftraggeber WHERE id <> 'jope'),
  'v_kunde_auftraggeber zeigt nur den eigenen Auftraggeber');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_leistungen  WHERE project_id <> ALL ((SELECT projekte_a FROM _soll)::text[])), 'v_kunde_leistungen nur eigene Flächen');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_pflegeplan  WHERE project_id <> ALL ((SELECT projekte_a FROM _soll)::text[])), 'v_kunde_pflegeplan nur eigene Flächen');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_gaenge      WHERE project_id <> ALL ((SELECT projekte_a FROM _soll)::text[])), 'v_kunde_gaenge nur eigene Flächen');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_einsaetze   WHERE project_id <> ALL ((SELECT projekte_a FROM _soll)::text[])), 'v_kunde_einsaetze nur eigene Flächen');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_fotos       WHERE project_id <> ALL ((SELECT projekte_a FROM _soll)::text[])), 'v_kunde_fotos nur eigene Flächen');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_ausgleich   WHERE project_id <> ALL ((SELECT projekte_a FROM _soll)::text[])), 'v_kunde_ausgleich nur eigene Flächen');
SELECT pg_temp.gilt((SELECT count(*) FROM v_kunde_leistungen) > 0, 'Kunde A sieht seine Leistungen (der Test prüft nicht ins Leere)');

-- Interne Tabellen direkt: ein Kunde darf keine einzige Zeile sehen.
SELECT pg_temp.gilt((SELECT count(*) FROM clients)        = 0, 'clients direkt: nichts (Kontaktdaten, Notizen)');
SELECT pg_temp.gilt((SELECT count(*) FROM projects)       = 0, 'projects direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM jobs)           = 0, 'jobs direkt: nichts (Crew, Fahrzeuge, Notizen)');
SELECT pg_temp.gilt((SELECT count(*) FROM time_entries)   = 0, 'time_entries direkt: nichts (Personen, Freitexte)');
SELECT pg_temp.gilt((SELECT count(*) FROM pflege_plaene)  = 0, 'pflege_plaene direkt: nichts (Kalibrierung, Sätze)');
SELECT pg_temp.gilt((SELECT count(*) FROM pflege_gaenge)  = 0, 'pflege_gaenge direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM tasks)          = 0, 'tasks direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM user_profile WHERE id <> '00000000-0000-4000-8000-0000000000a1') = 0, 'user_profile: nur das eigene Profil');
SELECT pg_temp.gilt((SELECT count(*) FROM hour_rules)     = 0, 'hour_rules direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM billing_rates)  = 0, 'billing_rates direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM person_cost_rates) = 0, 'person_cost_rates direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM map_features)   = 0, 'map_features direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM mana_ausschreibungen) = 0, 'mana_ausschreibungen direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM email_versand)  = 0, 'email_versand direkt: nichts');
SELECT pg_temp.gilt((SELECT count(*) FROM biome_baum)     = 0, 'biome_baum direkt: nichts');

RESET ROLE;

-- ════════════════════════════════════════════════════════════════════════════
-- Kunde B (BEW) — Gegenprobe: sieht nichts von A
-- ════════════════════════════════════════════════════════════════════════════
SELECT pg_temp.als('00000000-0000-4000-8000-0000000000b1');
SET LOCAL ROLE authenticated;
\echo '── Kunde B'

SELECT pg_temp.gilt(
  (SELECT array_agg(id ORDER BY id) FROM v_kunde_projekte) = (SELECT projekte_b FROM _soll),
  'v_kunde_projekte zeigt genau die Projekte von B');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_leistungen WHERE project_id = ANY ((SELECT projekte_a FROM _soll)::text[])), 'B sieht keine Leistungen von A');
SELECT pg_temp.gilt(NOT EXISTS (SELECT 1 FROM v_kunde_auftraggeber WHERE id = 'jope'), 'B sieht den Auftraggeber von A nicht');

RESET ROLE;

-- ════════════════════════════════════════════════════════════════════════════
-- Kundenkonto ohne Organisation, Gast, anonym
-- ════════════════════════════════════════════════════════════════════════════
SELECT pg_temp.als('00000000-0000-4000-8000-0000000000d1');
SET LOCAL ROLE authenticated;
\echo '── Kunde ohne Organisation'
SELECT pg_temp.gilt((SELECT count(*) FROM v_kunde_projekte) = 0,    'ohne Organisation: keine Projekte');
SELECT pg_temp.gilt((SELECT count(*) FROM v_kunde_leistungen) = 0,  'ohne Organisation: keine Leistungen');
RESET ROLE;

SELECT pg_temp.als('00000000-0000-4000-8000-0000000000c1');
SET LOCAL ROLE authenticated;
\echo '── Gast'
SELECT pg_temp.gilt(NOT is_kunde(), 'Gast ist kein Kunde');
SELECT pg_temp.gilt((SELECT count(*) FROM v_kunde_projekte)   = 0, 'Gast: v_kunde_projekte leer');
SELECT pg_temp.gilt((SELECT count(*) FROM v_kunde_leistungen) = 0, 'Gast: v_kunde_leistungen leer');
SELECT pg_temp.gilt((SELECT count(*) FROM v_kunde_fotos)      = 0, 'Gast: v_kunde_fotos leer');
SELECT pg_temp.gilt((SELECT count(*) FROM projects)           = 0, 'Gast: projects direkt leer');
SELECT pg_temp.gilt((SELECT count(*) FROM v_public_projects) >= 0, 'Gast: öffentliche Ansicht ist lesbar');
RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE anon;
\echo '── anonym'
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('v_kunde_projekte'),   'anon: v_kunde_projekte leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('v_kunde_leistungen'), 'anon: v_kunde_leistungen leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('v_kunde_fotos'),      'anon: v_kunde_fotos leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('clients'),            'anon: clients leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('time_entries'),       'anon: time_entries leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('projects'),           'anon: projects leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('biome_baum'),         'anon: biome_baum leer oder gesperrt');
SELECT pg_temp.gilt(pg_temp.leer_oder_verweigert('v_biome_herkunft'),   'anon: v_biome_herkunft leer oder gesperrt');
RESET ROLE;

-- Öffentliche Ansicht: nur Projekte mit is_public (als Eigentümer gegengeprüft)
SELECT pg_temp.gilt(
  (SELECT count(*) FROM v_public_projects) = (SELECT count(*) FROM projects WHERE is_public = true),
  'v_public_projects enthält genau die als öffentlich markierten Projekte');

\echo 'Alle Regeltests zur Mandantentrennung grün.'
ROLLBACK;
