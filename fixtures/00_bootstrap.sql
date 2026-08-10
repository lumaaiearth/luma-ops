-- ═══════════════════════════════════════════════════════════════════════════
-- Prüfstand-Bootstrap: das Minimum an Supabase-Umgebung, das die
-- BIOME-Migrationen voraussetzen.
--
-- Zweck: Migrationen auf einer frischen, leeren PostgreSQL-Instanz vorwärts
-- und rückwärts fahren zu können, ohne die Produktionsdatenbank anzufassen.
-- Verwendet von scripts/test-migration.sh.
--
-- Das hier ist kein Abbild der Produktion. Es sind nur die Objekte, auf die
-- der Datenkern per Fremdschlüssel oder Funktionsaufruf zeigt.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Rollen, die Supabase mitbringt ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END;
$$;

-- ── auth-Schema ────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT
);

-- Im Prüfstand gibt es keine JWT-Sitzung. auth.uid() liefert den Wert aus der
-- Sitzungsvariablen request.jwt.claim.sub, sonst NULL — damit lassen sich
-- RLS-Pfade gezielt durchspielen.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- ── Tabellen, auf die der Datenkern zeigt ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id   TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS public.projects (
  id        TEXT PRIMARY KEY,
  name      TEXT,
  client_id TEXT REFERENCES public.clients(id),
  geojson   JSONB
);

-- Der Altbestand von BIOME: Bäume liegen bis zur Umstellung als JSON in
-- properties. Wird für den Test der Übernahme-Migration gebraucht.
CREATE TABLE IF NOT EXISTS public.map_features (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL,
  feature_type TEXT NOT NULL DEFAULT 'area',
  geometry     JSONB NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  label        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id         TEXT PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id)
);

CREATE TABLE IF NOT EXISTS public.user_profile (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT,
  rolle TEXT NOT NULL DEFAULT 'gast'
);

-- ── Rollenprüfungen, wortgleich zur Produktion ─────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profile WHERE id = auth.uid() AND rolle = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_internal() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profile WHERE id = auth.uid() AND rolle IN ('admin','mitarbeiter')
  );
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth   TO anon, authenticated, service_role;
