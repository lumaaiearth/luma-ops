-- ════════════════════════════════════════════════════════════════════
-- Kundenportal: Terminwünsche und Kostenübersicht
--
-- 1) Der Kunde kann zu einem geplanten Pflegegang einen Wunsch äußern
--    (verschieben, Hinweis, Zusatzleistung). Er ändert damit NICHTS an
--    der Planung — der Wunsch landet als Aufgabe bei LUMA, die Änderung
--    macht weiterhin das Team. Der Kunde sieht nur seine eigenen Wünsche.
-- 2) Kostenübersicht: der Kunde sieht ausschließlich die ihm gegenüber
--    abgegebenen Angebote (versendet/angenommen). Interne Kostensätze
--    (person_cost_rates) bleiben unsichtbar — sie sind Betriebsgeheimnis.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.kunde_wuensche (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id     uuid REFERENCES pflege_gaenge(id) ON DELETE SET NULL,
  project_id  text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  typ         text NOT NULL DEFAULT 'verschieben'
              CHECK (typ IN ('verschieben', 'hinweis', 'zusatzleistung')),
  wunsch_jahr int,
  wunsch_kw   int CHECK (wunsch_kw IS NULL OR wunsch_kw BETWEEN 1 AND 53),
  nachricht   text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'offen'
              CHECK (status IN ('offen', 'angenommen', 'abgelehnt', 'erledigt')),
  antwort     text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kunde_wuensche_project_idx ON public.kunde_wuensche (project_id);
CREATE INDEX IF NOT EXISTS kunde_wuensche_status_idx  ON public.kunde_wuensche (status);

ALTER TABLE public.kunde_wuensche ENABLE ROW LEVEL SECURITY;

-- Intern: volle Rechte
DROP POLICY IF EXISTS intern_all ON public.kunde_wuensche;
CREATE POLICY intern_all ON public.kunde_wuensche
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Kunde: nur eigene Flächen lesen …
DROP POLICY IF EXISTS kunde_select ON public.kunde_wuensche;
CREATE POLICY kunde_select ON public.kunde_wuensche
  FOR SELECT TO authenticated
  USING (is_kunde() AND project_id IN (
    SELECT p.id FROM projects p JOIN clients c ON c.id = p.client_id
    WHERE c.org_id IS NOT NULL AND c.org_id = user_org()));

-- … und anlegen, immer im Status 'offen' (keine Selbstgenehmigung)
DROP POLICY IF EXISTS kunde_insert ON public.kunde_wuensche;
CREATE POLICY kunde_insert ON public.kunde_wuensche
  FOR INSERT TO authenticated
  WITH CHECK (is_kunde() AND status = 'offen' AND antwort IS NULL AND project_id IN (
    SELECT p.id FROM projects p JOIN clients c ON c.id = p.client_id
    WHERE c.org_id IS NOT NULL AND c.org_id = user_org()));

-- Supabase vergibt per ALTER DEFAULT PRIVILEGES pauschal ALL an anon und
-- authenticated. Erst alles entziehen, dann gezielt zurückgeben — ein
-- reiner REVOKE einzelner Rechte greift sonst ins Leere.
-- Wichtig: UPDATE/DELETE müssen an authenticated gehen, sonst könnte auch
-- das interne Team keinen Wunsch beantworten (eine Policy kann ein
-- fehlendes Tabellenrecht nicht ersetzen). Begrenzt wird über RLS: der
-- Kunde hat nur SELECT- und INSERT-Policies.
REVOKE ALL ON public.kunde_wuensche FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kunde_wuensche TO authenticated;

-- Ein Wunsch erzeugt eine Aufgabenkarte bei LUMA, damit er nicht untergeht
CREATE OR REPLACE FUNCTION public.kunde_wunsch_aufgabe()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_proj  projects%ROWTYPE;
  v_board text;
  v_titel text;
BEGIN
  SELECT * INTO v_proj FROM projects WHERE id = NEW.project_id;
  SELECT id INTO v_board FROM boards WHERE lower(name) = 'pflege' ORDER BY created_at NULLS FIRST LIMIT 1;

  v_titel := CASE NEW.typ
               WHEN 'verschieben'    THEN 'Terminwunsch'
               WHEN 'zusatzleistung' THEN 'Zusatzwunsch'
               ELSE 'Hinweis'
             END
             || ' vom Kunden · ' || coalesce(v_proj.flaeche_code, v_proj.name, NEW.project_id)
             || CASE WHEN NEW.wunsch_kw IS NOT NULL THEN ' → KW ' || NEW.wunsch_kw ELSE '' END;

  INSERT INTO public.tasks (
    id, board_id, title, description, status, priority, task_type,
    project_id, client_id, created_by, created_at, updated_at
  ) VALUES (
    gen_random_uuid()::text, v_board, v_titel, coalesce(NEW.nachricht, ''),
    'not_started', 'high', 'orga',
    NEW.project_id, v_proj.client_id, 'kundenportal', now(), now()
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_kunde_wunsch_aufgabe ON public.kunde_wuensche;
CREATE TRIGGER trg_kunde_wunsch_aufgabe
  AFTER INSERT ON public.kunde_wuensche
  FOR EACH ROW EXECUTE FUNCTION kunde_wunsch_aufgabe();

-- Angebote des eigenen Auftraggebers — ohne interne Notizen und Quellpläne
CREATE OR REPLACE VIEW v_kunde_angebote
WITH (security_invoker = false, security_barrier = true) AS
  SELECT a.id, a.titel, a.angebotsnummer, a.zeitraum_von, a.zeitraum_bis,
         a.positionen, a.summe_netto, a.abrechnung, a.status, a.created_at
  FROM angebote a
  JOIN clients c ON c.id = a.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org()
    AND a.status IN ('versendet', 'angenommen');

REVOKE ALL ON v_kunde_angebote FROM PUBLIC, anon, authenticated;
GRANT SELECT ON v_kunde_angebote TO authenticated;
