-- Rücknahme von 20261023_storage_privat.sql: Buckets wieder öffentlich und die
-- frühere Lese-Policy biome_media_read (public, alle drei Buckets).

UPDATE storage.buckets SET public = true WHERE id IN ('job-photos', 'drone-images');

DROP POLICY IF EXISTS storage_kacheln_read      ON storage.objects;
DROP POLICY IF EXISTS storage_oeffentlich_read  ON storage.objects;
DROP POLICY IF EXISTS storage_kunde_read        ON storage.objects;
DROP POLICY IF EXISTS storage_team_read         ON storage.objects;

CREATE POLICY biome_media_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = ANY (ARRAY['job-photos'::text, 'drone-images'::text, 'drone-tiles'::text]));

DROP FUNCTION IF EXISTS public.storage_oeffentlich(text, text);
DROP FUNCTION IF EXISTS public.storage_kunde_darf(text, text);
