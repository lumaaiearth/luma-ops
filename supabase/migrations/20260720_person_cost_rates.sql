-- ════════════════════════════════════════════════════════════════════
-- Interne Stundenkostensätze je Person (für Gewinnrechnung je Projekt).
-- Bewusst NICHT in hour_rules (die ist intern lesbar, weil jede:r das
-- eigene Stundenkonto sehen soll) — Kostensätze sind Gehaltsnähe und
-- daher strikt admin-only (is_admin() aus 20260718_stundenkonto_kosten).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS person_cost_rates (
  team_id     TEXT PRIMARY KEY,        -- seed-TEAM-id ('malte', 'jona', …)
  hourly_cost NUMERIC NOT NULL DEFAULT 0,  -- interne Kosten je Stunde (€)
  note        TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE person_cost_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all ON person_cost_rates;
CREATE POLICY admin_all ON person_cost_rates
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
