-- ════════════════════════════════════════════════════════════════════
-- E-Mail-Versand: Protokoll (2026-07-29)
--
-- Bis jetzt gab es in der Plattform keinerlei E-Mail-Infrastruktur. Mit der
-- Edge Function `email` kommt sie dazu — und damit die Grundlage für den
-- monatlichen Leistungsnachweis und die Saison-Benachrichtigungen aus
-- CUSTOMER_STRATEGY.md.
--
-- Diese Tabelle protokolliert jeden Versand. Zweck:
--   · Nachvollziehbarkeit („wurde der Nachweis für Juli schon geschickt?“)
--   · Doppelversand vermeiden
--   · Fehler sichtbar machen, statt sie still zu verschlucken
--
-- Geschrieben wird ausschließlich serverseitig von der Edge Function
-- (service_role). Für das Team ist die Tabelle nur lesbar.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_versand (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  typ          text NOT NULL,                    -- 'leistungsnachweis' | 'test' | …
  client_id    text REFERENCES clients(id),
  empfaenger   text NOT NULL,
  betreff      text NOT NULL,
  zeitraum     text,                             -- z. B. '2026' oder '2026-07'
  status       text NOT NULL DEFAULT 'gesendet'
                 CHECK (status IN ('gesendet', 'fehler')),
  fehler       text,
  provider     text,
  gesendet_von uuid REFERENCES auth.users(id),
  gesendet_am  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_versand_client_idx ON email_versand(client_id, gesendet_am DESC);

ALTER TABLE email_versand ENABLE ROW LEVEL SECURITY;

-- Nur lesen; geschrieben wird über die Edge Function mit service_role,
-- die RLS ohnehin umgeht.
DROP POLICY IF EXISTS email_versand_read ON email_versand;
CREATE POLICY email_versand_read ON email_versand FOR SELECT TO authenticated
  USING (is_internal());

REVOKE INSERT, UPDATE, DELETE ON email_versand FROM authenticated;
GRANT SELECT ON email_versand TO authenticated;
