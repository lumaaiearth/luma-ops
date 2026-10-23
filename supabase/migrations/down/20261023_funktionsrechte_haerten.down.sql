-- Rücknahme von 20261023_funktionsrechte_haerten.sql: stellt die vorherigen
-- Funktionsrechte und den offenen Suchpfad wieder her.

GRANT EXECUTE ON FUNCTION public.handle_new_user()          TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kunde_wunsch_aufgabe()     TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_gang_aufgabenkarte()  TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pflege_gang_status()  TO PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.biome_baci_pruefen()              TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_index_moeglich_pruefen()    TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_korrektur_einfrieren()      TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_nachweis_methode_pruefen()  TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_nur_anfuegen()              TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_updated_at()                TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_als_nachweis(text)          TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_rls_intern(text)            TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.biome_altbestand_uebernehmen()    TO PUBLIC, anon, authenticated;

ALTER FUNCTION public.biome_baci_pruefen()              RESET search_path;
ALTER FUNCTION public.biome_index_moeglich_pruefen()    RESET search_path;
ALTER FUNCTION public.biome_korrektur_einfrieren()      RESET search_path;
ALTER FUNCTION public.biome_nachweis_methode_pruefen()  RESET search_path;
ALTER FUNCTION public.biome_nur_anfuegen()              RESET search_path;
ALTER FUNCTION public.biome_updated_at()                RESET search_path;
ALTER FUNCTION public.biome_als_nachweis(text)          RESET search_path;
ALTER FUNCTION public.biome_rls_intern(text)            RESET search_path;
ALTER FUNCTION public.biome_altbestand_uebernehmen()    RESET search_path;

DO $$
BEGIN
  IF to_regprocedure('public.biome_splatfeld_produktart_pruefen()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.biome_splatfeld_produktart_pruefen() TO PUBLIC, anon, authenticated';
    EXECUTE 'ALTER FUNCTION public.biome_splatfeld_produktart_pruefen() RESET search_path';
  END IF;
  IF to_regclass('public.contact_requests') IS NOT NULL THEN
    EXECUTE 'COMMENT ON TABLE public.contact_requests IS NULL';
  END IF;
END $$;
