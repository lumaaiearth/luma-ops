-- Migration: Habitatelemente in Pflanzplaenen (2026-07-14)
-- Run once in Supabase SQL Editor.
-- Additiv & non-breaking: bestehende Zeilen erhalten '[]', kein Read-Path bricht.
-- Habitatelemente werden bewusst NICHT in `positionen` gemischt, damit der
-- Biodiversitäts-Score im Kundenportal (heimisch-Anteil der Pflanzen) korrekt bleibt.

ALTER TABLE pflanzplaene ADD COLUMN IF NOT EXISTS habitate JSONB NOT NULL DEFAULT '[]';
