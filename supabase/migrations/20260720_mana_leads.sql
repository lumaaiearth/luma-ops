-- ════════════════════════════════════════════════════════════════════════════
-- MANA™ — Modul CHANCEN (Recherche-Agent)
-- Leads jenseits förmlicher Ausschreibungen: Förderprogramme, kommunale
-- Vorhaben, private Projekte. Gefüllt vom wöchentlichen Claude-Agenten
-- mit Web-Suche (scripts/mana-chancen.mjs).
-- Run in Supabase SQL Editor (oder via MCP apply_migration).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mana_leads (
  id              text PRIMARY KEY,          -- Hash aus URL/Titel (Dedupe)
  typ             text NOT NULL DEFAULT 'vorhaben'
                    CHECK (typ IN ('foerderung','vorhaben','privat','sonstiges')),
  titel           text NOT NULL,
  zusammenfassung text,
  region          text,
  url             text,
  score           integer,
  begruendung     text,
  quelle          text DEFAULT 'claude-websearch',
  status          text NOT NULL DEFAULT 'neu'
                    CHECK (status IN ('neu','interessant','verworfen')),
  notizen         text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mana_leads_score_idx  ON public.mana_leads (score DESC);
CREATE INDEX IF NOT EXISTS mana_leads_status_idx ON public.mana_leads (status);

ALTER TABLE public.mana_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_all ON public.mana_leads;
CREATE POLICY internal_all ON public.mana_leads
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

ALTER PUBLICATION supabase_realtime ADD TABLE public.mana_leads;
