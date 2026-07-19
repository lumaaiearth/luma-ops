-- ════════════════════════════════════════════════════════════════════
-- Stundenkonto-Regeln + Kosten/Abrechnung
--
-- 1) is_admin(): nur rolle='admin' (Geschäftsführung). Alle €-Beträge
--    (Rechnungen, Materialkosten, Stundensätze) sind admin-only —
--    Mitarbeiter und Kunden-Viewer sehen keine Arbeitskosten.
-- 2) hour_rules: SOLL-Stunden-Regel je Person, ersetzt die Konstanten
--    in seed.js. Regel "monthly": X Stunden je bezahltem Monat
--    (Vorgabe Malte 07/2026: 30,88 h) + Übertrag aus dem Vorjahr.
--    Enthält bewusst KEINE Gehaltsbeträge (nur Stunden) und ist
--    deshalb intern lesbar — das eigene Konto braucht jeder.
-- 3) project_costs: Materialkosten netto + Verkaufsfaktor (Std. 1,5).
-- 4) billing_rates: Stundensatz je Kunde (Standard 50 €/h).
-- 5) invoices: RLS von is_internal auf is_admin verschärft.
-- 6) time_entries: optionale Start-/Endzeit (wie in der Pflegetabelle).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (
    select 1 from user_profile
    where id = auth.uid() and rolle = 'admin'
  );
$$;

-- SOLL-Stunden-Regeln je Person (team_id aus seed TEAM)
CREATE TABLE IF NOT EXISTS hour_rules (
  team_id        TEXT PRIMARY KEY,
  rule_type      TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (rule_type IN ('monthly','weekly','balance','project')),
  monthly_hours  NUMERIC DEFAULT 30.88,   -- geschuldete h je bezahltem Monat
  weekly_hours   NUMERIC,                 -- für rule_type='weekly'
  paid_months    JSONB DEFAULT '[]'::jsonb, -- ["2026-01","2026-02"]
  carryover_hours NUMERIC DEFAULT 0,      -- Stundenschulden Vorjahr (+ = schuldet)
  note           TEXT,
  updated_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hour_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON hour_rules;
CREATE POLICY internal_all ON hour_rules
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Materialkosten je Projekt (Einkauf netto + Verkaufsfaktor) — admin-only
CREATE TABLE IF NOT EXISTS project_costs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  date        DATE,
  description TEXT,
  amount_net  NUMERIC NOT NULL DEFAULT 0,  -- Einkaufspreis netto
  markup      NUMERIC NOT NULL DEFAULT 1.5, -- Verkaufsfaktor (Weitergabe an Kunde)
  billable    BOOLEAN DEFAULT true,
  invoice_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all ON project_costs;
CREATE POLICY admin_all ON project_costs
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Stundensatz je Kunde — admin-only
CREATE TABLE IF NOT EXISTS billing_rates (
  client_id   TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  hourly_rate NUMERIC NOT NULL DEFAULT 50,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE billing_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all ON billing_rates;
CREATE POLICY admin_all ON billing_rates
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Rechnungen (€-Beträge) nur noch für Admins
DROP POLICY IF EXISTS internal_all ON invoices;
DROP POLICY IF EXISTS admin_all ON invoices;
CREATE POLICY admin_all ON invoices
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Zeiterfassung: optionale Start-/Endzeiten wie in der Pflegetabelle
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS end_time TEXT;
