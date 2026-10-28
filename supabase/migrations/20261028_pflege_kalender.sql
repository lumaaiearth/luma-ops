-- ════════════════════════════════════════════════════════════════════════════
-- Pflegekalender: Google-Kalender abonnieren, Termine Pflegegängen zuordnen
--
-- · kalender_quellen      geheime iCal-Adresse(n) — nur Admins (die Adresse
--                         erlaubt jedem, der sie kennt, den Kalender zu lesen)
-- · kalender_termine      eingelesene Termine; schreibt nur die Edge Function
--                         kalender-sync (Service-Role), lesen alle internen
-- · kalender_zuordnungen  bestätigte/ignorierte Zuordnung Termin ↔ Pflegegang;
--                         Vorschläge rechnet die App (src/lib/pflegeKalender.js)
-- · pflege_gaenge.termin  geplantes Datum eines Gangs (Jahresplanung)
-- · kalender_status()     Stand der Quellen ohne Adresse, für interne Konten
--
-- Rücknahme: supabase/migrations/down/20261028_pflege_kalender.down.sql
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pflege_gaenge ADD COLUMN IF NOT EXISTS termin date;
COMMENT ON COLUMN public.pflege_gaenge.termin IS 'Geplantes Datum (Jahresplanung); KW bleibt maßgeblich für den Plan.';

CREATE TABLE IF NOT EXISTS public.kalender_quellen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Google-Kalender',
  ical_url text NOT NULL CHECK (ical_url ~ '^https://'),
  aktiv boolean NOT NULL DEFAULT true,
  zuletzt_sync timestamptz,
  letzter_fehler text,
  anzahl integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kalender_quellen ENABLE ROW LEVEL SECURITY;
CREATE POLICY kalender_quellen_admin ON public.kalender_quellen
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.kalender_termine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quelle_id uuid NOT NULL REFERENCES public.kalender_quellen(id) ON DELETE CASCADE,
  uid text NOT NULL,
  start_datum date NOT NULL,
  start_zeit text,
  ende_datum date,
  ende_zeit text,
  ganztags boolean NOT NULL DEFAULT false,
  titel text NOT NULL DEFAULT '',
  ort text NOT NULL DEFAULT '',
  beschreibung text NOT NULL DEFAULT '',
  abgesagt boolean NOT NULL DEFAULT false,
  aktualisiert timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quelle_id, uid, start_datum)
);
CREATE INDEX IF NOT EXISTS kalender_termine_datum ON public.kalender_termine (start_datum);
ALTER TABLE public.kalender_termine ENABLE ROW LEVEL SECURITY;
CREATE POLICY kalender_termine_lesen ON public.kalender_termine
  FOR SELECT TO authenticated USING (public.is_internal());

CREATE TABLE IF NOT EXISTS public.kalender_zuordnungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termin_id uuid NOT NULL REFERENCES public.kalender_termine(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.pflege_plaene(id) ON DELETE CASCADE,
  gang_id uuid REFERENCES public.pflege_gaenge(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('bestaetigt', 'ignoriert')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  UNIQUE (termin_id, plan_id)
);
ALTER TABLE public.kalender_zuordnungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY kalender_zuordnungen_intern ON public.kalender_zuordnungen
  FOR ALL TO authenticated USING (public.is_internal()) WITH CHECK (public.is_internal());

CREATE OR REPLACE FUNCTION public.kalender_status()
RETURNS TABLE (id uuid, name text, aktiv boolean, zuletzt_sync timestamptz, letzter_fehler text, anzahl integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.name, q.aktiv, q.zuletzt_sync, q.letzter_fehler, q.anzahl
  FROM public.kalender_quellen q WHERE public.is_internal()
$$;
REVOKE ALL ON FUNCTION public.kalender_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kalender_status() TO authenticated;
