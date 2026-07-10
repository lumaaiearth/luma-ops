-- Migration: Profil-Felder (2026-07-10)
-- Erweitert user_profile um Avatar, Kontaktdaten und die Brücke zum
-- Seed-TEAM (team_id = 'malte' | 'lukas' | …), damit Login-Accounts
-- und Team-Mitglieder zusammenfinden.

ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS avatar_url    TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS phone         TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS bio           TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS team_id       TEXT;

-- RLS: eigenes Profil bearbeiten/anlegen (Lesen existiert bereits via
-- user_profile_own_read: eigene Zeile ODER is_internal()).
DROP POLICY IF EXISTS user_profile_own_update ON user_profile;
CREATE POLICY user_profile_own_update ON user_profile FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS user_profile_own_insert ON user_profile;
CREATE POLICY user_profile_own_insert ON user_profile FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Rollen-/Org-Eskalation verhindern: rolle & org_id sind nicht selbst änderbar
REVOKE INSERT, UPDATE ON user_profile FROM authenticated;
GRANT INSERT (id, name, avatar_url, phone, contact_email, bio, team_id) ON user_profile TO authenticated;
GRANT UPDATE (name, avatar_url, phone, contact_email, bio, team_id) ON user_profile TO authenticated;
GRANT SELECT ON user_profile TO authenticated;
