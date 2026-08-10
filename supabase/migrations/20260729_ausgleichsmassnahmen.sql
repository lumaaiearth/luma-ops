-- ════════════════════════════════════════════════════════════════════════════
-- Ausgleichs- und Ersatzmaßnahmen nach der naturschutzrechtlichen
-- Eingriffsregelung.
--
-- NACHGEZOGEN AM 2026-08-09.
-- Diese Migration war am 2026-07-29 auf der Produktionsdatenbank angewendet
-- (Version 20260729180108, „ausgleichsmassnahmen"), aber nie als Datei im
-- Repository abgelegt. Datenbank und Repository waren dadurch auseinander:
-- ein Neuaufbau der Umgebung hätte ein anderes Schema ergeben als das
-- laufende. Der Inhalt hier ist aus der laufenden Datenbank rekonstruiert
-- (Spalten, Constraints, Indizes, RLS-Policy, Tabellenkommentar) und stimmt
-- mit ihr überein.
--
-- Die Migration ist idempotent geschrieben, damit sie auf der bestehenden
-- Datenbank folgenlos erneut laufen kann und auf einer frischen Datenbank das
-- gleiche Ergebnis erzeugt.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ausgleichsmassnahme (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        TEXT REFERENCES projects(id),
  client_id         TEXT REFERENCES clients(id),
  bezeichnung       TEXT NOT NULL,
  eingriffsvorhaben TEXT,
  kis_id            TEXT,                 -- Nummer im Kompensationsflächen-Informationssystem
  art               TEXT NOT NULL DEFAULT 'ausgleich'
                    CHECK (art IN ('ausgleich','ersatz','oekokonto')),
  behoerde          TEXT,
  bescheid_az       TEXT,
  bescheid_datum    DATE,
  ziel_biotoptyp    TEXT,
  ziel_beschreibung TEXT,
  flaeche_m2        NUMERIC,
  entsiegelt_m2     NUMERIC,
  wertpunkte_soll   NUMERIC,
  soll_stunden_jahr NUMERIC,
  herstellung_bis   DATE,
  unterhaltung_von  DATE,
  unterhaltung_bis  DATE,
  pflegestufe       TEXT NOT NULL DEFAULT 'fertigstellung'
                    CHECK (pflegestufe IN ('fertigstellung','entwicklung','unterhaltung')),
  status            TEXT NOT NULL DEFAULT 'geplant'
                    CHECK (status IN ('geplant','hergestellt','in_entwicklung','abgenommen','abgeschlossen')),
  ausfallquote_pct  NUMERIC,
  letzte_kontrolle  DATE,
  notizen           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ausgleich_project_idx ON ausgleichsmassnahme (project_id);
CREATE INDEX IF NOT EXISTS ausgleich_client_idx  ON ausgleichsmassnahme (client_id);

COMMENT ON TABLE ausgleichsmassnahme IS
  'Ausgleichs-/Ersatzmaßnahmen nach der naturschutzrechtlichen Eingriffsregelung. Siehe docs/AUSGLEICHSMASSNAHMEN.md.';

ALTER TABLE ausgleichsmassnahme ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ausgleich_internal ON ausgleichsmassnahme;
CREATE POLICY ausgleich_internal ON ausgleichsmassnahme
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());
