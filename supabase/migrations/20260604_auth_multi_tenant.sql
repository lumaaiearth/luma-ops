-- Migration: Auth + Multi-Tenant (2026-06-04)
-- Run in Supabase SQL Editor AFTER creating users via Auth > Users

-- ── Organisation ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisation (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,  -- 'luma', 'bew', 'jope'
  name       TEXT NOT NULL,
  typ        TEXT DEFAULT 'intern' CHECK(typ IN ('intern','kunde','partner')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Luma as default org
INSERT INTO organisation (slug, name, typ) VALUES ('luma', 'LUMA Biome', 'intern')
ON CONFLICT (slug) DO NOTHING;

-- ── User Profile ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profile (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id    UUID REFERENCES organisation(id),
  name      TEXT,
  rolle     TEXT DEFAULT 'mitarbeiter' CHECK(rolle IN ('admin','mitarbeiter','kunde_viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Add org_id to pflanzplaene ─────────────────────────────────────────────────
ALTER TABLE pflanzplaene ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisation(id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- (Enable after testing — start without RLS, add it when Kunden-Portal goes live)

-- ALTER TABLE pflanzplaene ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY pflanzplaene_org ON pflanzplaene USING (
--   org_id IN (SELECT org_id FROM user_profile WHERE id = auth.uid())
--   OR EXISTS (SELECT 1 FROM user_profile WHERE id = auth.uid() AND rolle = 'admin')
-- );

-- ── HOW TO CREATE TEAM ACCOUNTS ──────────────────────────────────────────────
-- 1. Supabase Dashboard → Authentication → Users → Invite user
-- 2. After user signs up, insert into user_profile:
--
-- INSERT INTO user_profile (id, org_id, name, rolle)
-- VALUES (
--   '<user-uuid-from-auth>',
--   (SELECT id FROM organisation WHERE slug = 'luma'),
--   'Malte',
--   'admin'
-- );
--
-- For a customer:
-- INSERT INTO organisation (slug, name, typ) VALUES ('bew', 'BEW Wohnungsbaugesellschaft', 'kunde');
-- INSERT INTO user_profile (id, org_id, name, rolle)
-- VALUES ('<kunde-uuid>', (SELECT id FROM organisation WHERE slug = 'bew'), 'Max Mustermann', 'kunde_viewer');
