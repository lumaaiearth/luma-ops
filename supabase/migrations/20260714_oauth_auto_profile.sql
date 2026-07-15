-- Migration: Auto-Profil für OAuth-Anmeldungen (Google) + Escalation-Fix (2026-07-14)
--
-- Kontext: Mit aktiviertem Google-Login kann sich jede:r mit Google-Konto
-- authentifizieren. Zwei Absicherungen:
--
-- 1) Sichere Default-Rolle: user_profile.rolle war DEFAULT 'mitarbeiter'
--    (= intern, voller Datenzugriff via is_internal()). Zusammen mit dem
--    INSERT-Grant auf (id, name, …) hätte sich ein:e authentifizierte:r Nutzer:in
--    per Self-Insert selbst zum Mitarbeiter machen können → Default 'kunde_viewer'.
--
-- 2) handle_new_user(): legt bei OAuth-Erstanmeldung automatisch ein "wartendes"
--    Profil an (rolle 'kunde_viewer', org_id NULL). Die App zeigt solchen
--    Nutzer:innen einen Freischalt-Hinweis; ein:e Admin vergibt danach Rolle + Org.
--    E-Mail-Einladungen bleiben unberührt (provider = 'email' wird übersprungen).

ALTER TABLE user_profile ALTER COLUMN rolle SET DEFAULT 'kunde_viewer';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nur OAuth-Erstanmeldungen (z. B. Google) automatisch anlegen.
  IF coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email' THEN
    INSERT INTO public.user_profile (id, name, avatar_url, rolle, org_id)
    VALUES (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(new.raw_user_meta_data->>'name', ''),
        split_part(new.email, '@', 1)
      ),
      coalesce(
        nullif(new.raw_user_meta_data->>'avatar_url', ''),
        nullif(new.raw_user_meta_data->>'picture', '')
      ),
      'kunde_viewer',  -- sichere, nicht-interne Rolle; Freischaltung durch Admin
      NULL             -- keine Org → App zeigt "wartet auf Freischaltung"
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Freischalten eines wartenden Kontos (manuell durch Admin) ──────────────────
-- UPDATE user_profile
--   SET rolle = 'mitarbeiter',
--       org_id = (SELECT id FROM organisation WHERE slug = 'luma')
--   WHERE id = '<user-uuid>';
