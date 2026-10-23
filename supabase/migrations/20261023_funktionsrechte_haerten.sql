-- ════════════════════════════════════════════════════════════════════════════
-- Funktionsrechte härten (Supabase-Advisors vom 2026-10-23)
--
-- 1. Trigger-Funktionen sind über /rest/v1/rpc/<name> aufrufbar, auch für anon.
--    Ein Trigger feuert unabhängig vom EXECUTE-Recht der aufrufenden Rolle —
--    das Recht wird nur beim CREATE TRIGGER geprüft. Es kann also entzogen
--    werden, ohne dass sich am Verhalten der Tabellen etwas ändert.
--    Bei den vier SECURITY-DEFINER-Funktionen ist das ein echtes Risiko: sie
--    laufen mit den Rechten des Eigentümers.
--
-- 2. Die biome_*-Funktionen haben keinen festen search_path. Ohne ihn kann eine
--    Rolle, die ein eigenes Schema vorn in den Suchpfad legt, Tabellen- oder
--    Funktionsnamen umlenken.
--
-- 3. Die beiden DDL-Helfer (biome_als_nachweis, biome_rls_intern) und die
--    Übernahmefunktion werden nur von Migrationen aufgerufen, nie von der App.
--
-- Nicht angefasst: is_admin/is_internal/is_kunde/user_org (die RLS-Policies
-- rufen sie im Namen der angemeldeten Rolle auf und brauchen EXECUTE) und die
-- admin_*-Funktionen (prüfen selbst is_admin()).
--
-- Rücknahme: supabase/migrations/down/20261023_funktionsrechte_haerten.down.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Trigger-Funktionen ───────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kunde_wunsch_aufgabe()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_gang_aufgabenkarte()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pflege_gang_status()  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.biome_baci_pruefen()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_index_moeglich_pruefen()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_korrektur_einfrieren()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_nachweis_methode_pruefen()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_nur_anfuegen()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_updated_at()                   FROM PUBLIC, anon, authenticated;

-- biome_splatfeld gibt es erst ab 20260815_biome_splatfeld (Branch, in der
-- Produktion bereits angewendet). Auf einer Umgebung ohne sie überspringen.
DO $$
BEGIN
  IF to_regprocedure('public.biome_splatfeld_produktart_pruefen()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.biome_splatfeld_produktart_pruefen() FROM PUBLIC, anon, authenticated';
    EXECUTE 'ALTER FUNCTION public.biome_splatfeld_produktart_pruefen() SET search_path = public, pg_temp';
  END IF;
END $$;

-- ── 3. Nur für Migrationen ──────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.biome_als_nachweis(text)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_rls_intern(text)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.biome_altbestand_uebernehmen()  FROM PUBLIC, anon, authenticated;

-- ── 2. Fester Suchpfad ──────────────────────────────────────────────────────
ALTER FUNCTION public.biome_baci_pruefen()              SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_index_moeglich_pruefen()    SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_korrektur_einfrieren()      SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_nachweis_methode_pruefen()  SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_nur_anfuegen()              SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_updated_at()                SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_als_nachweis(text)          SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_rls_intern(text)            SET search_path = public, pg_temp;
ALTER FUNCTION public.biome_altbestand_uebernehmen()    SET search_path = public, pg_temp;

-- contact_requests: RLS an, keine Policy — beabsichtigt. Geschrieben wird
-- ausschließlich über die Edge Function contact-submit (service_role), gelesen
-- nur im Dashboard. Der Advisor-Hinweis „RLS Enabled No Policy" ist hier der
-- gewollte Zustand.
DO $$
BEGIN
  IF to_regclass('public.contact_requests') IS NOT NULL THEN
    EXECUTE $c$COMMENT ON TABLE public.contact_requests IS
      'Kontaktanfragen der Website. RLS ohne Policy ist gewollt: Schreiben nur über die Edge Function contact-submit (service_role), Lesen nur im Dashboard.'$c$;
  END IF;
END $$;
