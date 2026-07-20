-- ════════════════════════════════════════════════════════════════════
-- Personen / Freelancer (Selbstständige) — Ergänzung zum festen Kern-Team
-- aus src/data/seed.js. Bis zu ~20 Freelancer, die täglich für Einsätze
-- und Aufgaben ausgewählt werden (assigned_users referenziert ihre ids).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.people (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  rolle       text NOT NULL DEFAULT 'freelancer',  -- 'freelancer' = Selbstständige:r
  color       text,             -- Anzeige-Farbe (Avatar/Pills); leer = automatisch
  initials    text,             -- leer = aus dem Namen abgeleitet
  phone       text,
  email       text,
  firma       text,             -- eigenes Gewerbe / Firma
  stundensatz numeric,          -- vereinbarter Satz (€/h), optional
  notizen     text,
  active      boolean NOT NULL DEFAULT true,  -- inaktiv = nicht mehr auswählbar
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- RLS: wie alle internen Tabellen — nur internes Team
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON public.people;
CREATE POLICY internal_all ON public.people
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

-- Realtime aktivieren (Publication ist nicht FOR ALL TABLES)
ALTER PUBLICATION supabase_realtime ADD TABLE public.people;
