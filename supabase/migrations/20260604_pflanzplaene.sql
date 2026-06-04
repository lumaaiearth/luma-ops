-- Migration: Pflanzplaene (2026-06-04)
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pflanzplaene (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id  TEXT,
  projekt_id   TEXT,
  titel        TEXT NOT NULL DEFAULT 'Unbenannter Plan',
  status       TEXT NOT NULL DEFAULT 'planung' CHECK(status IN (
                 'planung',
                 'pdf_erstellt',
                 'bestellung',
                 'bestellung_bestaetigt',
                 'pflanzung_laufend',
                 'wachstum',
                 'maintenance'
               )),
  flaeche_m2   REAL,
  beet_w       REAL,
  beet_h       REAL,
  beet_form    TEXT DEFAULT 'rechteck',
  positionen   JSONB NOT NULL DEFAULT '[]',
  notizen      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Optional: Index für schnelle Abfragen nach Projekt
CREATE INDEX IF NOT EXISTS idx_pflanzplaene_projekt ON pflanzplaene(projekt_id);
CREATE INDEX IF NOT EXISTS idx_pflanzplaene_status ON pflanzplaene(status);
