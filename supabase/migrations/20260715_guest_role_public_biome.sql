-- Migration: Gast-Rolle + öffentliche BIOME-Ansicht (2026-07-15)
--
-- Neue Google-Nutzer werden automatisch „Gäste" und sehen eine öffentliche
-- Vorschau (/explore) — aber NUR Inhalte, die pro Projekt ausdrücklich
-- freigegeben wurden. Standard ist privat. Die Freigabe steuert ein Admin auf
-- der Projektseite über Public-Schalter (Beschreibung / Fotos / Sensoren).
--
-- Sicherheit: Gäste haben KEINEN Zugriff auf die Roh-Tabellen (RLS = is_internal).
-- Sie lesen ausschliesslich bereinigte Views, die als Owner (postgres) laufen
-- und damit RLS umgehen; das WHERE erzwingt is_public. Die Projekt-View
-- enthält bewusst KEINE sensiblen Spalten (kein client, keine internen notes).

-- 1) Rolle 'gast' erlauben
ALTER TABLE user_profile DROP CONSTRAINT IF EXISTS user_profile_rolle_check;
ALTER TABLE user_profile ADD CONSTRAINT user_profile_rolle_check
  CHECK (rolle IN ('admin','mitarbeiter','kunde_viewer','gast'));

-- 2) Public-Schalter an Projekten (Standard: privat)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_public          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS pub_photos         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pub_sensors        boolean NOT NULL DEFAULT false;

-- 3) Bereinigte Views (nur öffentliche Inhalte)
CREATE OR REPLACE VIEW v_public_projects AS
  SELECT id, name, location, lat, lng, geojson, status,
         public_description AS description, pub_photos, pub_sensors
  FROM projects
  WHERE is_public = true;

CREATE OR REPLACE VIEW v_public_sensors AS
  SELECT s.*
  FROM sensors s
  JOIN projects p ON p.id = s.project_id
  WHERE p.is_public = true AND p.pub_sensors = true;

CREATE OR REPLACE VIEW v_public_sensor_readings AS
  SELECT r.sensor_id, r.value, r.ts
  FROM sensor_readings r
  JOIN sensors s   ON s.id = r.sensor_id
  JOIN projects p  ON p.id = s.project_id
  WHERE p.is_public = true AND p.pub_sensors = true;

CREATE OR REPLACE VIEW v_public_photos AS
  SELECT ph.id, ph.url, ph.created_at, j.project_id
  FROM job_photos ph
  JOIN jobs j     ON j.id = ph.job_id
  JOIN projects p ON p.id = j.project_id
  WHERE p.is_public = true AND p.pub_photos = true;

GRANT SELECT ON v_public_projects, v_public_sensors, v_public_sensor_readings, v_public_photos TO authenticated;

-- 4) Neue OAuth-Nutzer werden Gäste (statt „wartend")
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email' THEN
    INSERT INTO public.user_profile (id, name, avatar_url, rolle, org_id)
    VALUES (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
      coalesce(nullif(new.raw_user_meta_data->>'avatar_url',''), nullif(new.raw_user_meta_data->>'picture','')),
      'gast',
      NULL
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;
