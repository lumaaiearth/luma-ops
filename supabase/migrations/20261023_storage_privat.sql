-- ════════════════════════════════════════════════════════════════════════════
-- Storage: Fotos und Luftbilder nicht mehr öffentlich
--
-- Vorher: Buckets job-photos, drone-images, drone-tiles öffentlich, und die
-- Policy biome_media_read gab der Rolle public (auch anon) Lesezugriff auf alle
-- drei. Wer eine URL kannte oder erriet, sah Einsatzfotos, Profilbilder,
-- Aufgaben-Anhänge und Luftbilder von Kundenflächen ohne Anmeldung.
--
-- Nachher:
--   · job-photos, drone-images privat; gelesen wird über signierte Links
--     (src/lib/speicherUrl.js), die nur bekommt, wen eine Policy zulässt:
--       – Team (is_internal) alles
--       – Kundenkonto: Fotos von Einsätzen auf Flächen der eigenen Organisation
--       – alle: Fotos öffentlich freigegebener Projekte (is_public + pub_photos)
--   · drone-tiles bleibt vorerst öffentlich lesbar: die Karte lädt Kacheln
--     direkt per URL-Schema ({z}/{x}/{y}.png) und kann nicht jede Kachel
--     signieren. Stand 2026-10-23 liegen dort 0 Dateien. Vor der ersten
--     Kundenfläche dort eine eigene Lösung (Proxy/Edge Function).
--
-- Voraussetzung: der App-Stand mit signierten Links ist ausgeliefert. Sonst
-- verschwinden alle Bilder in der App.
--
-- Pfadschema in job-photos (src/lib/supabase.js):
--   <job_id>/<foto>.jpg          Einsatzfotos
--   task_<task_id>/…, taskfile_<task_id>/…   Aufgaben (nur Team)
--   avatars/<user_id>.jpg        Profilbilder (nur Team)
--   generated/…                  KI-Bilder (nur Team)
--
-- Rücknahme: supabase/migrations/down/20261023_storage_privat.down.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── Prüffunktionen ─────────────────────────────────────────────────────────
-- SECURITY DEFINER, weil die Policy für Kunden durch jobs/projects/clients
-- hindurch prüfen muss — Tabellen, die Kunden per RLS nicht sehen.
CREATE OR REPLACE FUNCTION public.storage_kunde_darf(p_bucket text, p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_bucket = 'job-photos'
     AND is_kunde()
     AND EXISTS (
       SELECT 1 FROM jobs j
       JOIN projects p ON p.id = j.project_id
       JOIN clients c  ON c.id = p.client_id
       WHERE j.id = (storage.foldername(p_name))[1]
         AND c.org_id IS NOT NULL
         AND c.org_id = user_org()
     );
$$;

CREATE OR REPLACE FUNCTION public.storage_oeffentlich(p_bucket text, p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_bucket = 'job-photos'
     AND EXISTS (
       SELECT 1 FROM jobs j
       JOIN projects p ON p.id = j.project_id
       WHERE j.id = (storage.foldername(p_name))[1]
         AND p.is_public = true
         AND p.pub_photos = true
     );
$$;

REVOKE EXECUTE ON FUNCTION public.storage_kunde_darf(text, text)  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.storage_oeffentlich(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.storage_kunde_darf(text, text)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.storage_oeffentlich(text, text) TO anon, authenticated;

-- ── Policies ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS biome_media_read ON storage.objects;

-- Team: Lesen in allen drei Buckets (storage_internal_select deckt drone-tiles
-- nicht ab).
DROP POLICY IF EXISTS storage_team_read ON storage.objects;
CREATE POLICY storage_team_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('job-photos', 'drone-images', 'drone-tiles') AND is_internal());

DROP POLICY IF EXISTS storage_kunde_read ON storage.objects;
CREATE POLICY storage_kunde_read ON storage.objects FOR SELECT TO authenticated
  USING (public.storage_kunde_darf(bucket_id, name));

DROP POLICY IF EXISTS storage_oeffentlich_read ON storage.objects;
CREATE POLICY storage_oeffentlich_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (public.storage_oeffentlich(bucket_id, name));

-- Kacheln: vorerst weiter öffentlich (siehe Kopf).
DROP POLICY IF EXISTS storage_kacheln_read ON storage.objects;
CREATE POLICY storage_kacheln_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'drone-tiles');

-- ── Buckets ────────────────────────────────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id IN ('job-photos', 'drone-images');
