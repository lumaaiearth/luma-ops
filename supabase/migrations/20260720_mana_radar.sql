-- ════════════════════════════════════════════════════════════════════════════
-- MANA™ — Modul RADAR (Vergabe-Scanner)
-- Ausschreibungen aus dem Bekanntmachungsservice (oeffentlichevergabe.de),
-- bewertet von Claude gegen das LUMA-Firmenprofil.
-- Run in Supabase SQL Editor (oder via MCP apply_migration).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mana_ausschreibungen (
  id                 text PRIMARY KEY,           -- Notice-ID aus BKMS (Dedupe)
  quelle             text NOT NULL DEFAULT 'bkms',
  ocid               text,
  titel              text,
  auftraggeber       text,
  ort                text,
  bundesland         text,
  cpv_codes          text[] DEFAULT '{}',
  verfahren_art      text,
  veroeffentlicht_am date,
  frist_angebot      timestamptz,
  url                text,
  score              integer,
  score_begruendung  text,
  zusammenfassung    text,
  eckdaten           jsonb,                      -- volle strukturierte Claude-Extraktion
  raw                jsonb,                      -- getrimmte OCDS-Rohdaten
  status             text NOT NULL DEFAULT 'neu'
                       CHECK (status IN ('neu','interessant','in_bearbeitung',
                                         'abgegeben','gewonnen','verloren','verworfen')),
  notizen            text DEFAULT '',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mana_ausschr_score_idx  ON public.mana_ausschreibungen (score DESC);
CREATE INDEX IF NOT EXISTS mana_ausschr_status_idx ON public.mana_ausschreibungen (status);
CREATE INDEX IF NOT EXISTS mana_ausschr_frist_idx  ON public.mana_ausschreibungen (frist_angebot);

-- Suchprofil (1 Zeile), konfigurierbar in der App; geht in den Claude-Prompt
CREATE TABLE IF NOT EXISTS public.mana_profil (
  id            integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  firmenprofil  text NOT NULL DEFAULT '',
  cpv_prefixes  text[] NOT NULL DEFAULT '{773,4511}',
  regionen      text[] NOT NULL DEFAULT '{}',   -- leer = bundesweit; sonst NUTS-Präfixe z.B. {DE9,DE6}
  min_score     integer NOT NULL DEFAULT 60,     -- Telegram-Schwelle
  aktiv         boolean NOT NULL DEFAULT true,
  updated_at    timestamptz DEFAULT now()
);

INSERT INTO public.mana_profil (id, firmenprofil)
VALUES (1,
  'LUMA ist ein Unternehmen für ökologische Grünflächen- und Landschaftsgestaltung. '
  || 'Leistungsspektrum: Pflanzungen (Bäume, Stauden, Beete), Miyawaki-/Tiny-Forest-Anlagen, '
  || 'naturnahe Grünanlagen und Habitate, Grünpflege und Fertigstellungs-/Entwicklungspflege, '
  || 'Baumpflanzung und -pflege, Entsiegelung und Regenwasser-/Schwammstadt-nahe Begrünung. '
  || 'Zielkunden: Kommunen, öffentliche Träger, Wohnungswirtschaft, Unternehmen. '
  || 'Projektgrößen: klein bis mittel (ca. 5.000–500.000 EUR). Kein klassischer Tief-/Straßenbau, '
  || 'kein reiner Winterdienst, keine reinen Baumfällungen ohne Pflanzanteil.')
ON CONFLICT (id) DO NOTHING;

-- RLS: gleiche Policy wie alle internen Tabellen (nur internes Team)
ALTER TABLE public.mana_ausschreibungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mana_profil          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_all ON public.mana_ausschreibungen;
CREATE POLICY internal_all ON public.mana_ausschreibungen
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

DROP POLICY IF EXISTS internal_all ON public.mana_profil;
CREATE POLICY internal_all ON public.mana_profil
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

-- Realtime: neue Treffer erscheinen live in der App
ALTER PUBLICATION supabase_realtime ADD TABLE public.mana_ausschreibungen;
