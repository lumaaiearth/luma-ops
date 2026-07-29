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
-- Sicherheitsmodell (wie 20260715_guest_role_public_biome.sql):
--   · Die Roh-Tabellen bleiben unverändert per RLS = is_internal() gesperrt.
--     Es wird KEINE Lese-Policy auf einer Roh-Tabelle hinzugefügt — sonst
--     lägen ganze Zeilen (inkl. interner Spalten) über die REST-API offen.
--   · Kunden lesen ausschließlich bereinigte Views, die als Owner laufen
--     (security_invoker = false) und deren WHERE die Mandantentrennung
--     erzwingt: `is_kunde() AND c.org_id = user_org()`.
--   · Die Rollenprüfung ist bewusst Teil der View: Der Frontend-Redirect für
--     Gäste (App.jsx) ist reine Kosmetik — ein Konto mit org_id, das von
--     `kunde_viewer` auf `gast` zurückgestuft wird, käme sonst über die
--     REST-API weiterhin an alle Leistungsdaten.
--   · Die Views enthalten KEINE Personendaten (kein time_entries.user_id,
--     kein jobs.assigned_users, kein job_photos.uploaded_by), KEINE Zählung,
--     aus der sich die Mannschaftsstärke ableiten ließe, und KEINE internen
--     Felder (kalib_faktor, crew_size, notes/notizen, Kontakte, Lager).
--
-- Additiv und reversibel: zwei nullable Spalten, sieben Views, zwei
-- Funktionen. Ohne gesetzte `clients.org_id` ändert sich nichts (0 Zeilen).
-- ════════════════════════════════════════════════════════════════════

-- ── 1) Fehlendes Bindeglied: Organisation ↔ Auftraggeber ────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisation(id);
CREATE INDEX IF NOT EXISTS clients_org_id_idx ON clients(org_id);

COMMENT ON COLUMN clients.org_id IS
  'Auftraggeber-Organisation für den Portalzugang. NULL = kein Kundenzugang.';

-- Freigabe der Tätigkeitstexte je Auftraggeber. Standard: AUS.
-- Grund: `time_entries.description` ist ein internes Freitextfeld. In den
-- Bestandsdaten stehen dort u. a. Namen von Beschäftigten („Absprachen mit
-- … und …“) und Verweise auf ANDERE Auftraggeber („Material holen … für
-- BEW MV“). Ungeprüft ausgespielt wäre das ein Vertraulichkeitsbruch.
-- Der Schalter wird erst gesetzt, wenn die Texte dieses Auftraggebers
-- einmal durchgesehen wurden — Stunden und Termine sind davon unabhängig
-- immer sichtbar.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS leistungstexte_sichtbar boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.leistungstexte_sichtbar IS
  'Gibt die Tätigkeitstexte aus time_entries.description für das Kundenportal frei. Erst nach Sichtung setzen.';

-- ── 2) Schreibschutz für die Zugriffsschalter ──────────────────────────
-- `clients` ist per RLS für is_internal() (admin ODER mitarbeiter) voll
-- beschreibbar. org_id und leistungstexte_sichtbar entscheiden aber darüber,
-- WER WELCHE Daten sieht — das gehört auf Admin-Niveau, genau wie
-- user_profile.org_id in 20260722_admin_user_management.sql.
-- Achtung: Ein Spalten-REVOKE greift NICHT, solange das Recht auf
-- Tabellenebene vergeben ist (Supabase gewährt `authenticated` per Default
-- ALL). Deshalb erst das Tabellenrecht entziehen und dann spaltenweise
-- zurückgeben — dasselbe Muster wie bei user_profile
-- (20260710_profile_fields.sql:22-25).
REVOKE INSERT, UPDATE ON clients FROM authenticated;
GRANT INSERT (id, name, color, contact_name, contact_email, contact_phone,
              address, notes, created_at) ON clients TO authenticated;
GRANT UPDATE (name, color, contact_name, contact_email, contact_phone,
              address, notes) ON clients TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_client_org(
  p_client_id text,
  p_org_id    uuid    default null,
  p_texte     boolean default null
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if not public.is_admin() then
    raise exception 'Nicht berechtigt';
  end if;
  -- Interne Organisationen sind kein Auftraggeber-Zugang.
  if p_org_id is not null and not exists (
        select 1 from public.organisation where id = p_org_id and typ <> 'intern') then
    raise exception 'Ungültige Organisation für einen Kundenzugang';
  end if;
  update public.clients set
    org_id                  = p_org_id,
    leistungstexte_sichtbar = coalesce(p_texte, leistungstexte_sichtbar)
  where id = p_client_id;
  if not found then
    raise exception 'Auftraggeber nicht gefunden: %', p_client_id;
  end if;
end;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_client_org(text, uuid, boolean) TO authenticated;

-- ── 3) Rollenprüfung ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_kunde()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (
    select 1 from user_profile
    where id = auth.uid() and rolle = 'kunde_viewer'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_kunde() TO authenticated;

-- ── 4) Bereinigte Kunden-Views ─────────────────────────────────────────

-- Der eigene Auftraggeber — bewusst NUR id und Name. Es gibt absichtlich
-- keine Lese-Policy auf `clients`: die Tabelle enthält notes, Kontaktdaten
-- und Adresse, die über die REST-API sonst mitlesbar wären.
CREATE OR REPLACE VIEW v_kunde_auftraggeber
WITH (security_invoker = false, security_barrier = true) AS
  SELECT c.id, c.name
  FROM clients c
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();

-- Betreute Flächen. Ohne interne Felder (notes, contacts, lager,
-- ausruestung, hinweise, plant_plan).
CREATE OR REPLACE VIEW v_kunde_projekte
WITH (security_invoker = false, security_barrier = true) AS
  SELECT p.id, p.name, p.location, p.lat, p.lng, p.geojson, p.status,
         p.flaeche_code, p.color,
         c.id AS client_id, c.name AS client_name
  FROM projects p
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();

-- Der eigentliche Leistungsnachweis: Was wurde wann auf welcher Fläche
-- getan. Aggregiert je Fläche und Tag.
--   · kein user_id (Personendatum)
--   · KEINE Zeilenzahl — count(*) entspräche faktisch der Mannschaftsstärke
--   · Tätigkeitstexte nur bei ausdrücklicher Freigabe je Auftraggeber
CREATE OR REPLACE VIEW v_kunde_leistungen
WITH (security_invoker = false, security_barrier = true) AS
  SELECT t.project_id,
         t.date,
         round(sum(t.hours)::numeric, 2) AS stunden,
         CASE WHEN bool_or(c.leistungstexte_sichtbar)
              THEN string_agg(DISTINCT nullif(btrim(t.description), ''), ' · ')
              ELSE NULL END              AS leistungen
  FROM time_entries t
  JOIN projects p ON p.id = t.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org()
  GROUP BY t.project_id, t.date;

-- Jahres-Pflegeplan je Objekt.
--   · `soll_stunden` enthält die An-/Abfahrt (fahrt_stunden) MIT, weil die
--     Ist-Seite (time_entries) sie ebenfalls enthält. Ohne das wäre der
--     Erfüllungsgrad systematisch zu hoch und Fortschrittsbalken liefen
--     über 100 %, obwohl exakt nach Plan gearbeitet wurde.
--   · Entfallene Gänge zählen nicht mit — gleiche Definition wie in der
--     internen Plan/Ist-Ansicht (PflegePage.jsx).
--   · Ohne kalib_faktor und interne Notizen.
CREATE OR REPLACE VIEW v_kunde_pflegeplan
WITH (security_invoker = false, security_barrier = true) AS
  SELECT pp.id, pp.project_id, pp.objekt, pp.jahr, pp.status,
         coalesce((SELECT sum(g.soll_stunden + coalesce(g.fahrt_stunden, 0))
                     FROM pflege_gaenge g
                    WHERE g.plan_id = pp.id AND g.status <> 'entfallen'), 0)::numeric AS soll_stunden,
         (SELECT count(*) FROM pflege_gaenge g
           WHERE g.plan_id = pp.id AND g.status <> 'entfallen')::int   AS gaenge_gesamt,
         (SELECT count(*) FROM pflege_gaenge g
           WHERE g.plan_id = pp.id AND g.status = 'erledigt')::int     AS gaenge_erledigt
  FROM pflege_plaene pp
  JOIN projects p ON p.id = pp.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();

-- Die einzelnen Pflegegänge. `soll_stunden` hier ebenfalls inklusive
-- Anfahrt, damit die Summe zum Planwert oben passt. Ohne crew_size.
CREATE OR REPLACE VIEW v_kunde_gaenge
WITH (security_invoker = false, security_barrier = true) AS
  SELECT g.id, g.plan_id, pp.project_id, g.jahr, g.kw, g.titel, g.aufgaben,
         (g.soll_stunden + coalesce(g.fahrt_stunden, 0))::numeric AS soll_stunden,
         g.status
  FROM pflege_gaenge g
  JOIN pflege_plaene pp ON pp.id = g.plan_id
  JOIN projects p ON p.id = pp.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();

-- Termine. Ohne assigned_users (Personendaten), notes, Fahrzeuge, Werkzeuge.
CREATE OR REPLACE VIEW v_kunde_einsaetze
WITH (security_invoker = false, security_barrier = true) AS
  SELECT j.id, j.project_id, j.title, j.job_type, j.date, j.date_end,
         j.status, j.planned_hours
  FROM jobs j
  JOIN projects p ON p.id = j.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();

-- Fotodokumentation je Einsatz. Ohne uploaded_by (Personendatum).
CREATE OR REPLACE VIEW v_kunde_fotos
WITH (security_invoker = false, security_barrier = true) AS
  SELECT ph.id, ph.url, ph.created_at,
         j.project_id, j.title AS einsatz_titel, j.date AS einsatz_datum
  FROM job_photos ph
  JOIN jobs j     ON j.id = ph.job_id
  JOIN projects p ON p.id = j.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();

-- ── 5) Rechte: nur angemeldete Nutzer, nur lesend ──────────────────────
-- Wichtig: `authenticated` MUSS im REVOKE stehen. Supabase vergibt per
-- ALTER DEFAULT PRIVILEGES im Schema `public` automatisch ALL an anon und
-- authenticated; ein bloßes GRANT SELECT wäre wirkungslos und die Views
-- blieben (als auto-updatable Views) beschreibbar.
REVOKE ALL ON v_kunde_auftraggeber, v_kunde_projekte, v_kunde_leistungen,
              v_kunde_pflegeplan, v_kunde_gaenge, v_kunde_einsaetze, v_kunde_fotos
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON v_kunde_auftraggeber, v_kunde_projekte, v_kunde_leistungen,
                v_kunde_pflegeplan, v_kunde_gaenge, v_kunde_einsaetze, v_kunde_fotos
  TO authenticated;

-- ── 6) Übersicht fürs Admin-UI ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_client_orgs()
RETURNS TABLE (client_id text, client_name text, org_id uuid, org_name text,
               leistungstexte_sichtbar boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.name, c.org_id, o.name, c.leistungstexte_sichtbar
  FROM public.clients c
  LEFT JOIN public.organisation o ON o.id = c.org_id
  WHERE public.is_admin()
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_client_orgs() TO authenticated;
