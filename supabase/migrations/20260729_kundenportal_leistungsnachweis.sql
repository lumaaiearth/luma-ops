-- ════════════════════════════════════════════════════════════════════
-- Kundenportal auf echte Leistungsdaten (2026-07-29)
--
-- Problem: Das Kundenportal lag auf einem eigenen, von der operativen
-- Realität abgekoppelten Datenmodell (`pflanzplaene`). Alles, was LUMA
-- tatsächlich leistet — Einsätze, Stunden, Pflegegänge, Fotos — liegt in
-- `projects / jobs / time_entries / pflege_*` und war für Kunden per RLS
-- (`is_internal()`) vollständig gesperrt. Ein Auftraggeber konnte also
-- nicht sehen, was für ihn getan wurde.
--
-- Genau das ist die Ursache des dokumentierten „zu teuer“-Feedbacks
-- (docs/PFLEGEPLANUNG_KONZEPT.md, Kap. 2.3): Der Kunde sieht keinen
-- Leistungsnachweis, sondern nur am Jahresende eine große Rechnung.
--
-- Diese Migration schließt die Lücke in zwei Schritten:
--   1) Das fehlende Bindeglied `clients.org_id` (Auftraggeber-Organisation
--      ↔ Kundendatensatz). Damit wird aus einem Login ein Auftraggeber.
--   2) Bereinigte `v_kunde_*`-Views nach dem bewährten `v_public_*`-Muster.
--
-- Sicherheit (gleiche Logik wie 20260715_guest_role_public_biome.sql):
--   · Die Roh-Tabellen bleiben unverändert per RLS = is_internal() gesperrt.
--   · Die Views laufen mit Rechten des Owners (security_invoker = false) und
--     umgehen damit RLS; das WHERE erzwingt die Mandantentrennung über
--     `c.org_id = user_org()`. Für Gäste/anon ist user_org() NULL → 0 Zeilen.
--   · Die Views enthalten bewusst KEINE Personendaten (kein time_entries.user_id,
--     kein jobs.assigned_users, kein job_photos.uploaded_by) und KEINE internen
--     Felder (keine notes/notizen, kein kalib_faktor, keine fahrt_stunden,
--     keine Fahrzeuge/Werkzeuge, keine Kontakte/Lagerhinweise).
--
-- Additiv und reversibel: eine nullable Spalte, eine SELECT-Policy, sechs Views.
-- Bestehendes Verhalten ändert sich nicht (ohne gesetzte org_id: 0 Zeilen).
-- ════════════════════════════════════════════════════════════════════

-- ── 1) Fehlendes Bindeglied: Organisation ↔ Auftraggeber ────────────────
-- Ein Kundenkonto hängt an einer `organisation` (user_profile.org_id).
-- Erst diese Spalte verbindet die Organisation mit den echten Aufträgen.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisation(id);
CREATE INDEX IF NOT EXISTS clients_org_id_idx ON clients(org_id);

COMMENT ON COLUMN clients.org_id IS
  'Auftraggeber-Organisation für den Portalzugang. NULL = kein Kundenzugang.';

-- Kunde darf den eigenen Auftraggeber-Datensatz lesen (Name fürs Portal).
-- Die bestehende Policy `internal_all` (is_internal) bleibt unberührt;
-- permissive Policies werden ODER-verknüpft.
DROP POLICY IF EXISTS clients_kunde_read ON clients;
CREATE POLICY clients_kunde_read ON clients FOR SELECT
  USING (org_id IS NOT NULL AND org_id = user_org());

-- ── 2) Bereinigte Kunden-Views ─────────────────────────────────────────

-- Die betreuten Flächen/Projekte des Auftraggebers.
-- Ohne interne Felder (notes, contacts, lager, ausruestung, hinweise, plant_plan).
CREATE OR REPLACE VIEW v_kunde_projekte
WITH (security_invoker = false) AS
  SELECT p.id, p.name, p.location, p.lat, p.lng, p.geojson, p.status,
         p.flaeche_code, p.color,
         c.id AS client_id, c.name AS client_name
  FROM projects p
  JOIN clients  c ON c.id = p.client_id
  WHERE c.org_id IS NOT NULL AND c.org_id = user_org();

-- Der eigentliche Leistungsnachweis: Was wurde wann auf welcher Fläche getan.
-- Aggregiert je Fläche und Tag — bewusst OHNE user_id (Personendatum) und
-- ohne Bezug zu Rechnungen; Stunden bleiben sichtbar, denn genau diese
-- Transparenz verhindert die Jahresend-Überraschung.
CREATE OR REPLACE VIEW v_kunde_leistungen
WITH (security_invoker = false) AS
  SELECT t.project_id,
         t.date,
         round(sum(t.hours)::numeric, 2)                                 AS stunden,
         string_agg(DISTINCT nullif(btrim(t.description), ''), ' · ')    AS leistungen,
         count(*)::int                                                    AS eintraege
  FROM time_entries t
  JOIN projects p ON p.id = t.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE c.org_id IS NOT NULL AND c.org_id = user_org()
  GROUP BY t.project_id, t.date;

-- Jahres-Pflegeplan je Objekt: geplanter Umfang und Fortschritt.
-- Ohne kalib_faktor und ohne interne Notizen.
CREATE OR REPLACE VIEW v_kunde_pflegeplan
WITH (security_invoker = false) AS
  SELECT pp.id, pp.project_id, pp.objekt, pp.jahr, pp.status,
         coalesce((SELECT sum(g.soll_stunden) FROM pflege_gaenge g
                    WHERE g.plan_id = pp.id), 0)::numeric               AS soll_stunden,
         (SELECT count(*) FROM pflege_gaenge g
           WHERE g.plan_id = pp.id)::int                                AS gaenge_gesamt,
         (SELECT count(*) FROM pflege_gaenge g
           WHERE g.plan_id = pp.id AND g.status = 'erledigt')::int      AS gaenge_erledigt
  FROM pflege_plaene pp
  JOIN projects p ON p.id = pp.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE c.org_id IS NOT NULL AND c.org_id = user_org();

-- Die einzelnen Pflegegänge (geplante Besuche) — Kunde sieht, was wann ansteht.
-- Ohne fahrt_stunden und crew_size (interne Kalkulation).
CREATE OR REPLACE VIEW v_kunde_gaenge
WITH (security_invoker = false) AS
  SELECT g.id, g.plan_id, pp.project_id, g.jahr, g.kw, g.titel,
         g.aufgaben, g.soll_stunden, g.status
  FROM pflege_gaenge g
  JOIN pflege_plaene pp ON pp.id = g.plan_id
  JOIN projects p ON p.id = pp.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE c.org_id IS NOT NULL AND c.org_id = user_org();

-- Termine/Einsätze — Transparenz „wann sind wir da / wann waren wir da“.
-- Ohne assigned_users (Personendaten), notes, Fahrzeuge und Werkzeuge.
CREATE OR REPLACE VIEW v_kunde_einsaetze
WITH (security_invoker = false) AS
  SELECT j.id, j.project_id, j.title, j.job_type, j.date, j.date_end,
         j.status, j.planned_hours
  FROM jobs j
  JOIN projects p ON p.id = j.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE c.org_id IS NOT NULL AND c.org_id = user_org();

-- Fotodokumentation je Einsatz. Ohne uploaded_by (Personendatum).
CREATE OR REPLACE VIEW v_kunde_fotos
WITH (security_invoker = false) AS
  SELECT ph.id, ph.url, ph.created_at,
         j.project_id, j.title AS einsatz_titel, j.date AS einsatz_datum
  FROM job_photos ph
  JOIN jobs j     ON j.id = ph.job_id
  JOIN projects p ON p.id = j.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE c.org_id IS NOT NULL AND c.org_id = user_org();

-- ── 3) Rechte: nur angemeldete Nutzer, nur lesend ──────────────────────
-- Defense in depth: anon kann über user_org() = NULL ohnehin nichts sehen,
-- bekommt aber zusätzlich gar keine Rechte auf die Views.
REVOKE ALL ON v_kunde_projekte, v_kunde_leistungen, v_kunde_pflegeplan,
              v_kunde_gaenge, v_kunde_einsaetze, v_kunde_fotos
  FROM PUBLIC, anon;

GRANT SELECT ON v_kunde_projekte, v_kunde_leistungen, v_kunde_pflegeplan,
                v_kunde_gaenge, v_kunde_einsaetze, v_kunde_fotos
  TO authenticated;

-- ── 4) Zuordnung Auftraggeber → Organisation (Admin) ───────────────────
-- `clients` ist per RLS für is_internal() voll beschreibbar, ein eigener
-- Schreibpfad ist also nicht nötig. Diese Hilfsfunktion liefert dem
-- Admin-UI nur die Liste „welcher Auftraggeber hängt an welcher Org“.
CREATE OR REPLACE FUNCTION public.admin_list_client_orgs()
RETURNS TABLE (client_id text, client_name text, org_id uuid, org_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.name, c.org_id, o.name
  FROM public.clients c
  LEFT JOIN public.organisation o ON o.id = c.org_id
  WHERE public.is_admin()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_client_orgs() TO authenticated;
