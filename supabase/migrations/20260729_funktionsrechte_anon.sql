-- ════════════════════════════════════════════════════════════════════
-- Funktionsrechte: EXECUTE für `anon` entziehen (2026-07-29)
--
-- Befund aus dem Supabase-Security-Advisor
-- (0028_anon_security_definer_function_executable): Postgres vergibt
-- EXECUTE auf neue Funktionen automatisch an PUBLIC. Dadurch waren die
-- SECURITY-DEFINER-Funktionen der Plattform auch ohne Anmeldung über
-- /rest/v1/rpc/… aufrufbar.
--
-- Ausnutzbar war das nicht — jede admin_*-Funktion prüft intern is_admin()
-- und hätte einen anonymen Aufruf mit „Nicht berechtigt“ abgewiesen. Aber
-- eine Funktion, die niemand ohne Anmeldung aufrufen können soll, gehört
-- auch nicht für `anon` freigegeben.
--
-- ── Warum nur diese Funktionen? ──────────────────────────────────────
-- Ein EXECUTE-Entzug ist NICHT harmlos, wenn die Funktion in einer
-- RLS-Policy vorkommt, die `anon` auswertet: Aus einem leeren Ergebnis
-- würde dann ein Fehler (42501 permission denied for function …).
--
-- Geprüft: is_internal() steht in 33 Policies, is_admin() in 5,
-- user_org() in 2 — aber ALLE diese Policies sind auf `authenticated`
-- eingeschränkt, `anon` wertet sie also nie aus. Deshalb ist der Entzug
-- hier gefahrlos.
--
-- Bewusst NICHT angefasst: die Trigger-Funktionen handle_new_user() und
-- sync_pflege_gang_status(). Ein Direktaufruf ohne Trigger-Kontext läuft
-- ohnehin sofort auf einen Fehler, und handle_new_user() hängt am
-- Registrierungs-Pfad (Google-OAuth) — dort ist jedes Risiko unnötig.
--
-- Verifiziert in einer Transaktion mit ROLLBACK: interner Zugriff auf
-- projects/time_entries unverändert, `anon` erhält auf projects und
-- invoices weiterhin 0 Zeilen statt eines Fehlers, v_public_projects
-- bleibt für die öffentliche BIOME-Ansicht lesbar.
-- ════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.admin_create_org(text, text, text)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_orgs()                            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users()                           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_profile(uuid, text, uuid, boolean)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_internal()                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_org()                                   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_create_org(text, text, text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_orgs()                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users()                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile(uuid, text, uuid, boolean)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal()                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org()                                    TO authenticated;
