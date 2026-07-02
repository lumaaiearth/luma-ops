-- Migration: RLS Lockdown Phase 1 (2026-07-02)
-- Applied to production on 2026-07-02 (migrations: rls_lockdown_phase1,
-- rls_lockdown_phase1_function_grants). Kept here as the source of record.
--
-- Before this migration every table had an `all_access` policy with
-- `USING (true)` for the public role — the anon key (which ships in the JS
-- bundle) had full read/write on the entire database. This replaces that
-- with role-based access:
--   admin / mitarbeiter  → full access to all ops tables
--   kunde_viewer         → read-only on pflanzplaene of their own org,
--                          own user_profile row, own organisation row
--   anon                 → nothing

-- ── Helper functions (SECURITY DEFINER so they bypass RLS on user_profile) ──
create or replace function public.is_internal() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_profile
    where id = auth.uid() and rolle in ('admin','mitarbeiter')
  );
$$;

create or replace function public.user_org() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from user_profile where id = auth.uid();
$$;

-- Policies run with the caller's privileges, so authenticated needs EXECUTE.
-- anon never matches a policy and must not call these via RPC.
revoke execute on function public.is_internal() from public, anon;
revoke execute on function public.user_org() from public, anon;
grant execute on function public.is_internal() to authenticated;
grant execute on function public.user_org() to authenticated;

-- ── Enable RLS on the tables that had none ──
alter table public.pflanzplaene enable row level security;
alter table public.organisation enable row level security;
alter table public.user_profile enable row level security;

-- ── Drop the wide-open policies ──
drop policy if exists "all_access" on public.projects;
drop policy if exists "all_access" on public.jobs;
drop policy if exists "all_access" on public.recurring_templates;
drop policy if exists "all_access" on public.time_entries;
drop policy if exists "all_access" on public.invoices;
drop policy if exists "all_access" on public.sensors;
drop policy if exists "all_access" on public.vehicles;
drop policy if exists "all_access" on public.app_settings;
drop policy if exists "all_access" on public.project_documents;
drop policy if exists "all_access" on public.clients;
drop policy if exists "all_access" on public.drive_folders;
drop policy if exists "allow_all" on public.map_features;
drop policy if exists "allow_all" on public.plant_species;
drop policy if exists "anon read" on public.job_photos;
drop policy if exists "anon insert" on public.job_photos;
drop policy if exists "anon delete" on public.job_photos;

-- ── Internal-only tables: full access for admin/mitarbeiter ──
do $$
declare t text;
begin
  foreach t in array array[
    'projects','jobs','recurring_templates','time_entries','invoices',
    'sensors','job_photos','vehicles','app_settings','project_documents',
    'clients','drive_folders','map_features','plant_species'
  ] loop
    execute format(
      'create policy internal_all on public.%I for all to authenticated using (public.is_internal()) with check (public.is_internal())', t
    );
  end loop;
end $$;

-- ── pflanzplaene: internal full access + customers read their org's plans ──
create policy pflanzplaene_internal on public.pflanzplaene
  for all to authenticated
  using (public.is_internal()) with check (public.is_internal());

create policy pflanzplaene_kunde_read on public.pflanzplaene
  for select to authenticated
  using (org_id = public.user_org());

-- ── organisation: read own org; internal users read all. Writes via dashboard only ──
create policy organisation_read on public.organisation
  for select to authenticated
  using (public.is_internal() or id = public.user_org());

-- ── user_profile: everyone reads own row; internal users read all. Writes via dashboard only ──
create policy user_profile_own_read on public.user_profile
  for select to authenticated
  using (id = auth.uid() or public.is_internal());

-- ── Storage: buckets stay public for READ (app renders public URLs),
--    but list/upload/update/delete require an internal user.
--    Note: before this there were NO storage.objects policies at all,
--    which silently broke photo uploads for everyone. ──
create policy storage_internal_select on storage.objects
  for select to authenticated
  using (bucket_id in ('job-photos','drone-images') and public.is_internal());

create policy storage_internal_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('job-photos','drone-images') and public.is_internal());

create policy storage_internal_update on storage.objects
  for update to authenticated
  using (bucket_id in ('job-photos','drone-images') and public.is_internal())
  with check (bucket_id in ('job-photos','drone-images') and public.is_internal());

create policy storage_internal_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('job-photos','drone-images') and public.is_internal());
