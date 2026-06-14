-- Migration: drive_folders table + description column (2026-06-14)
-- Fixes: "Could not find the 'description' column of 'drive_folders' in the schema cache"

CREATE TABLE IF NOT EXISTS drive_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT,
  description TEXT,
  files       JSONB DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Add description column if table already existed without it
ALTER TABLE drive_folders ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed default folder if table is empty
INSERT INTO drive_folders (id, name, url, description)
VALUES (
  'main-luma',
  'LUMA Hauptordner',
  'https://drive.google.com/drive/folders/1wBwCP2TXxjHitRmH_NZQZMEhrOfxcHSp',
  'Assets, Remote-Sensing, Projektfotos'
)
ON CONFLICT (id) DO NOTHING;
