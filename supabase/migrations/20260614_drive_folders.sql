-- Migration: drive_folders table + all columns (2026-06-14)
-- Fixes: schema cache errors for url, description, files columns

CREATE TABLE IF NOT EXISTS drive_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT,
  description TEXT,
  files       JSONB DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Add all columns in case the table already existed with only id/name/created_at
ALTER TABLE drive_folders ADD COLUMN IF NOT EXISTS url         TEXT;
ALTER TABLE drive_folders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE drive_folders ADD COLUMN IF NOT EXISTS files       JSONB DEFAULT '[]'::jsonb;
ALTER TABLE drive_folders ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Seed default folder if table is empty
INSERT INTO drive_folders (id, name, url, description)
VALUES (
  'main-luma',
  'LUMA Hauptordner',
  'https://drive.google.com/drive/folders/1wBwCP2TXxjHitRmH_NZQZMEhrOfxcHSp',
  'Assets, Remote-Sensing, Projektfotos'
)
ON CONFLICT (id) DO NOTHING;
