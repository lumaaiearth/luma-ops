-- ════════════════════════════════════════════════════════════════════
-- Admin-Nutzerverwaltung (2026-07-22)
-- Ein Admin (is_admin()) verwaltet Konten, Rollen und die Zuordnung zu
-- Organisationen über die Plattform (Einstellungen → Nutzer & Zugriff).
--
-- Hintergrund: user_profile.rolle und .org_id sind für `authenticated`
-- doppelt gesperrt (Spalten-GRANT aus 20260710 + RLS-Policy „own_update“
-- = nur die eigene Zeile). Diese SECURITY-DEFINER-Funktionen sind der
-- EINZIGE Schreibpfad und prüfen bei jedem Aufruf streng auf is_admin() —
-- so bleibt die Sperre für alle anderen unverändert bestehen.
-- Additiv: legt nur Funktionen an, ändert keine bestehenden Policies/Daten.
-- ════════════════════════════════════════════════════════════════════

-- Alle Konten inkl. Login-E-Mail (aus auth.users, sonst nicht lesbar) und
-- der zugeordneten Organisation. Nur für Admins; sonst leeres Ergebnis.
create or replace function public.admin_list_users()
returns table (
  id uuid, name text, rolle text, org_id uuid,
  org_name text, org_typ text, email text,
  team_id text, avatar_url text, created_at timestamptz
)
language sql stable security definer set search_path to 'public' as $$
  select p.id, p.name, p.rolle, p.org_id,
         o.name, o.typ, u.email::text,
         p.team_id, p.avatar_url, p.created_at
  from public.user_profile p
  left join public.organisation o on o.id = p.org_id
  left join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.name nulls last;
$$;

-- Alle Organisationen für das Zuordnungs-Dropdown. Nur für Admins.
create or replace function public.admin_list_orgs()
returns table (id uuid, slug text, name text, typ text)
language sql stable security definer set search_path to 'public' as $$
  select id, slug, name, typ
  from public.organisation
  where public.is_admin()
  order by typ, name;
$$;

-- Rolle und/oder Organisation eines Profils setzen.
--  · p_rolle    gesetzt → neue Rolle (validiert gegen den CHECK-Constraint)
--  · p_org_id   gesetzt → dieser Organisation zuordnen (= freischalten)
--  · p_clear_org=true → Org entfernen (Konto landet im „wird
--    freigeschaltet“-Zustand, sieht nichts mehr → Zugang entzogen)
create or replace function public.admin_set_profile(
  p_id uuid,
  p_rolle text default null,
  p_org_id uuid default null,
  p_clear_org boolean default false
) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then
    raise exception 'Nicht berechtigt';
  end if;
  if p_rolle is not null and p_rolle not in ('admin','mitarbeiter','kunde_viewer','gast') then
    raise exception 'Ungültige Rolle: %', p_rolle;
  end if;
  -- Selbst-Aussperren verhindern: eigene Admin-Rolle nicht herabstufen
  if p_id = auth.uid() and p_rolle is not null and p_rolle <> 'admin' then
    raise exception 'Du kannst deine eigene Admin-Rolle nicht entfernen';
  end if;
  update public.user_profile set
    rolle  = coalesce(p_rolle, rolle),
    org_id = case when p_clear_org then null else coalesce(p_org_id, org_id) end
  where id = p_id;
  if not found then
    raise exception 'Profil nicht gefunden: %', p_id;
  end if;
end;
$$;

-- Neue Organisation (z. B. Kunde) anlegen; gibt die neue id zurück.
create or replace function public.admin_create_org(
  p_name text,
  p_typ  text default 'kunde',
  p_slug text default null
) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  v_id   uuid;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'Nicht berechtigt';
  end if;
  if p_typ not in ('intern','kunde','partner') then
    raise exception 'Ungültiger Typ: %', p_typ;
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Name fehlt';
  end if;
  v_slug := coalesce(
    nullif(trim(p_slug), ''),
    lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))
  );
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'kunde'; end if;
  -- Slug-Kollision vermeiden (slug ist UNIQUE)
  if exists (select 1 from public.organisation where slug = v_slug) then
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  end if;
  insert into public.organisation (slug, name, typ)
  values (v_slug, trim(p_name), p_typ)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.admin_list_users()                              to authenticated;
grant execute on function public.admin_list_orgs()                               to authenticated;
grant execute on function public.admin_set_profile(uuid, text, uuid, boolean)    to authenticated;
grant execute on function public.admin_create_org(text, text, text)              to authenticated;
