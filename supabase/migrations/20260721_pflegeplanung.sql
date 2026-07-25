-- ════════════════════════════════════════════════════════════════════
-- Pflegeplanung (Phase 1) — siehe docs/PFLEGEPLANUNG_KONZEPT.md
--
-- 1) pflege_plaene: Jahres-Pflegeplan je Projekt(-Objekt). Bewusst OHNE
--    €-Felder (Stundensatz kommt aus billing_rates, admin-only) —
--    dadurch intern lesbar, die Pflegekräfte sehen ihre Pläne.
-- 2) pflege_aufgaben: Aufgaben eines Plans. `fenster` = Saisonfenster
--    [{von_monat, bis_monat, turnus, stunden_pro_gang}], turnus:
--    einmalig | monatlich | 2x_monat | quartal | nach_bedarf.
--    `wochen` = Import-Rohdaten aus den Excel-Plänen ({"14": 3, ...},
--    KW→h), bleibt als Referenz erhalten.
-- 3) pflege_gaenge: konkrete Pflegegänge (Planungseinheit je KW).
--    Beim Terminieren entsteht ein jobs-Eintrag (job_id gesetzt).
--    fahrt_stunden macht Anfahrt/Rüsten erstmals explizit (Kap. 2.2/8.4).
-- 4) angebote: persistente Angebote (€) — admin-only wie billing_rates.
--    typ 'spezial' = Zusatzaufträge außerhalb des LV (Kap. 4.2).
-- 5) jobs.planned_hours: Soll-Stunden je Einsatz (Plan/Ist je Einsatz).
-- ════════════════════════════════════════════════════════════════════

-- Jahres-Pflegeplan je Projekt-Objekt
CREATE TABLE IF NOT EXISTS pflege_plaene (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objekt       TEXT NOT NULL DEFAULT '',   -- Teilobjekt (z. B. ALLCURA: 'Seebadstr. 37'), sonst ''
  jahr         INT  NOT NULL,
  status       TEXT NOT NULL DEFAULT 'entwurf'
               CHECK (status IN ('entwurf','aktiv','abgeschlossen')),
  kalib_faktor NUMERIC NOT NULL DEFAULT 1.0,  -- Ist/Plan-Faktor aus Vorjahr (Kap. 4)
  notizen      TEXT,                          -- Zielbild/Objektbeschreibung (NOTES aus Excel)
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, objekt, jahr)
);
ALTER TABLE pflege_plaene ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON pflege_plaene;
CREATE POLICY internal_all ON pflege_plaene
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Aufgaben eines Pflegeplans
CREATE TABLE IF NOT EXISTS pflege_aufgaben (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES pflege_plaene(id) ON DELETE CASCADE,
  katalog_key   TEXT,                        -- Schlüssel aus src/data/pflegeKatalog.js, NULL = freie Position
  titel         TEXT NOT NULL,
  beschreibung  TEXT,
  kategorie     TEXT NOT NULL DEFAULT 'pflanzen'
                CHECK (kategorie IN ('pflanzen','bewaesserung','spezial')),
  fenster       JSONB NOT NULL DEFAULT '[]'::jsonb,
  wochen        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Import-Rohdaten KW→h
  jahres_stunden NUMERIC NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pflege_aufgaben_plan ON pflege_aufgaben(plan_id);
ALTER TABLE pflege_aufgaben ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON pflege_aufgaben;
CREATE POLICY internal_all ON pflege_aufgaben
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Pflegegänge: geplante Einsätze je KW (werden beim Terminieren zu jobs)
CREATE TABLE IF NOT EXISTS pflege_gaenge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES pflege_plaene(id) ON DELETE CASCADE,
  jahr          INT  NOT NULL,
  kw            INT  NOT NULL CHECK (kw BETWEEN 1 AND 53),
  titel         TEXT,
  aufgaben      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{aufgabe_id, stunden}]
  soll_stunden  NUMERIC NOT NULL,                    -- Vor-Ort-Stunden (Team gesamt)
  fahrt_stunden NUMERIC NOT NULL DEFAULT 1.5,        -- Anfahrt/Rüsten je Gang
  crew_size     INT NOT NULL DEFAULT 2,
  job_id        TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'geplant'
                CHECK (status IN ('geplant','terminiert','erledigt','entfallen'))
);
CREATE INDEX IF NOT EXISTS idx_pflege_gaenge_plan ON pflege_gaenge(plan_id);
CREATE INDEX IF NOT EXISTS idx_pflege_gaenge_kw ON pflege_gaenge(jahr, kw);
ALTER TABLE pflege_gaenge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON pflege_gaenge;
CREATE POLICY internal_all ON pflege_gaenge
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Angebote (€-Beträge) — admin-only wie billing_rates/invoices
CREATE TABLE IF NOT EXISTS angebote (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      TEXT REFERENCES clients(id) ON DELETE SET NULL,
  typ            TEXT NOT NULL DEFAULT 'pflege'
                 CHECK (typ IN ('pflege','spezial')),
  titel          TEXT,
  angebotsnummer TEXT,
  zeitraum_von   DATE,
  zeitraum_bis   DATE,
  stundensatz    NUMERIC,
  positionen     JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{project_id, beschreibung, stunden, betrag}]
  summe_netto    NUMERIC,
  abrechnung     TEXT NOT NULL DEFAULT 'monatlich'
                 CHECK (abrechnung IN ('monatlich','drittel','quartal','einmalig')),
  status         TEXT NOT NULL DEFAULT 'entwurf'
                 CHECK (status IN ('entwurf','versendet','angenommen','abgelehnt')),
  quelle_plan_ids UUID[] DEFAULT '{}',
  notizen        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE angebote ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all ON angebote;
CREATE POLICY admin_all ON angebote
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Soll-Stunden je Einsatz (Plan/Ist auf Einsatz-Ebene)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS planned_hours NUMERIC;
