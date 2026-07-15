-- Migration: Habitatelemente in Pflanzplaenen (2026-07-14)
-- Run once in Supabase SQL Editor.
-- Additiv & non-breaking: bestehende Zeilen erhalten '[]', kein Read-Path bricht.
-- Habitatelemente werden bewusst NICHT in `positionen` gemischt, damit der
-- Biodiversitäts-Score im Kundenportal (heimisch-Anteil der Pflanzen) korrekt bleibt.

ALTER TABLE pflanzplaene ADD COLUMN IF NOT EXISTS habitate JSONB NOT NULL DEFAULT '[]';

-- Realtime: pflanzplaene in die Supabase-Publication aufnehmen, damit mehrere
-- Geräte/Personen Änderungen an Plänen live sehen (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pflanzplaene'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pflanzplaene;
  END IF;
END $$;
