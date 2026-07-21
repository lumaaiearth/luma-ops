-- Migration: BIOME™-Überarbeitung (2026-07-21)
-- 1) Sensoren bekommen GPS-Koordinaten (Anlage direkt auf der BIOME-Karte)
-- 2) Storage-Buckets für Feature-Fotos & Drohnenbilder, damit der Bild-Upload
--    zuverlässig funktioniert (inkl. Zugriffsregeln)
--
-- Ausführen im Supabase SQL Editor (Projekt „Website") — idempotent.

-- ── 1) Sensoren: GPS-Position ────────────────────────────────────────────────
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.sensors ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.sensors.lat IS 'GPS-Breitengrad — gesetzt beim Anlegen über die BIOME-Karte';
COMMENT ON COLUMN public.sensors.lng IS 'GPS-Längengrad — gesetzt beim Anlegen über die BIOME-Karte';

-- ── 2) Storage-Buckets (public read für Karten-/Panel-Anzeige) ───────────────
insert into storage.buckets (id, name, public)
values
  ('job-photos',   'job-photos',   true),  -- Feature-/Baum-/Einsatz-Fotos
  ('drone-images', 'drone-images', true),  -- einzelne Drohnenbilder (ImageOverlay)
  ('drone-tiles',  'drone-tiles',  true)   -- Orthomosaik-Kacheln (XYZ, npm run tiles)
on conflict (id) do update set public = true;

-- ── 3) Zugriffsregeln auf storage.objects ────────────────────────────────────
-- Lesen: alle (die Buckets sind public, URLs landen in der App).
-- Schreiben/Löschen: nur interne Nutzer (admin/mitarbeiter laut user_profile).
do $$ begin
  create policy "biome_media_read" on storage.objects
    for select
    using (bucket_id in ('job-photos','drone-images','drone-tiles'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "biome_media_insert" on storage.objects
    for insert to authenticated
    with check (
      bucket_id in ('job-photos','drone-images','drone-tiles')
      and exists (
        select 1 from public.user_profile up
        where up.id = auth.uid() and up.rolle in ('admin','mitarbeiter')
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "biome_media_update" on storage.objects
    for update to authenticated
    using (
      bucket_id in ('job-photos','drone-images','drone-tiles')
      and exists (
        select 1 from public.user_profile up
        where up.id = auth.uid() and up.rolle in ('admin','mitarbeiter')
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "biome_media_delete" on storage.objects
    for delete to authenticated
    using (
      bucket_id in ('job-photos','drone-images','drone-tiles')
      and exists (
        select 1 from public.user_profile up
        where up.id = auth.uid() and up.rolle in ('admin','mitarbeiter')
      )
    );
exception when duplicate_object then null; end $$;
