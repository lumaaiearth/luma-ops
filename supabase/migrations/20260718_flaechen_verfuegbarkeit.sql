-- ════════════════════════════════════════════════════════════════════
-- Flächen-Infoblätter + Verfügbarkeiten
-- Quelle: LUMA_MASTER_Pflegeplan (Blätter 3_BEW / 4_JOPE / 2_Arbeitsplanung)
--
-- 1) Projekte = Projektflächen (S3, R95, …) bekommen Infoblatt-Felder:
--    Ansprechpartner, Lager, Ausrüstung, Bilderlink, Hinweise.
-- 2) Zugangsdaten (Codes, Schlüssel) liegen in project_access —
--    nur für eingeloggte interne Nutzer (is_internal), nie für
--    Kunden-Viewer/Gäste. Ersetzt die Klartext-Codes aus der Excel.
-- 3) user_availability / user_absences: wiederkehrende Verfügbarkeit
--    („kann immer mittwochs") und Abwesenheitszeiträume je team_id.
-- ════════════════════════════════════════════════════════════════════

-- Infoblatt-Felder am Projekt (Projektfläche)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS flaeche_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lager TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ausruestung TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bilder_link TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hinweise TEXT;

-- Zugangsdaten je Fläche (Codes/Schlüssel) — intern sichtbar, nie für Kunden
CREATE TABLE IF NOT EXISTS project_access (
  project_id  TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  zugang      TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON project_access;
CREATE POLICY internal_all ON project_access
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Verfügbarkeiten (wiederkehrend, je Wochentag) + Abwesenheiten
CREATE TABLE IF NOT EXISTS user_availability (
  team_id     TEXT PRIMARY KEY,
  weekdays    JSONB DEFAULT '{}'::jsonb,  -- { "mon": true, … } = verfügbar
  note        TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON user_availability;
CREATE POLICY internal_all ON user_availability
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

CREATE TABLE IF NOT EXISTS user_absences (
  id          TEXT PRIMARY KEY,
  team_id     TEXT NOT NULL,
  date_from   DATE NOT NULL,
  date_to     DATE NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_absences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON user_absences;
CREATE POLICY internal_all ON user_absences
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());
