-- LUMA Ops Platform — Datenmodell v1
-- Architektur: Kunde → Projekt → Standort → Einsatz → Kosten/Erlös

CREATE TABLE IF NOT EXISTS kunde (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kuerzel   TEXT NOT NULL UNIQUE,  -- 'BEW', 'JOPE', 'STROMNETZ', ...
  name      TEXT NOT NULL,
  notizen   TEXT
);

CREATE TABLE IF NOT EXISTS standort (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kunde_id    INTEGER NOT NULL REFERENCES kunde(id),
  kuerzel     TEXT NOT NULL,         -- 'MV', 'BL', 'SH', 'AG', 'LE', 'P15', ...
  name        TEXT NOT NULL,         -- Langname
  geojson     TEXT,                  -- GeoJSON Feature als JSON-String
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projekt (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kunde_id    INTEGER NOT NULL REFERENCES kunde(id),
  titel       TEXT NOT NULL,
  status      TEXT DEFAULT 'aktiv' CHECK(status IN ('aktiv','pausiert','abgeschlossen')),
  beginn      TEXT,
  ende        TEXT,
  notizen     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS einsatz (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  projekt_id    INTEGER NOT NULL REFERENCES projekt(id),
  standort_id   INTEGER REFERENCES standort(id),
  datum         TEXT NOT NULL,
  typ           TEXT NOT NULL,  -- 'pflege', 'pflanzung', 'bewaesserung', 'kontrolle', ...
  stunden       REAL,
  mitarbeiter   TEXT,           -- JSON-Array ["Malte","Lukas"]
  beschreibung  TEXT,
  meta          TEXT,           -- JSON für volatile Zusatzfelder
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kosten (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  einsatz_id  INTEGER NOT NULL REFERENCES einsatz(id),
  kategorie   TEXT NOT NULL,   -- 'lohn', 'material', 'maschine', 'transport', 'subunternehmer'
  betrag_eur  REAL NOT NULL,
  beschreibung TEXT,
  beleg_nr    TEXT,
  datum       TEXT,
  meta        TEXT             -- JSON für volatile Zusatzfelder (z.B. CO2-Zertifikat-Typ)
);

CREATE TABLE IF NOT EXISTS erloes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  einsatz_id   INTEGER NOT NULL REFERENCES einsatz(id),
  rechnung_nr  TEXT,
  betrag_eur   REAL NOT NULL,
  mwst_pct     REAL DEFAULT 19.0,
  zahlungsdatum TEXT,
  status       TEXT DEFAULT 'offen' CHECK(status IN ('offen','bezahlt','storniert')),
  meta         TEXT
);

-- Views für Reporting
CREATE VIEW IF NOT EXISTS v_deckungsbeitrag AS
SELECT
  e.id        AS einsatz_id,
  e.datum,
  e.typ,
  p.titel     AS projekt,
  k.kuerzel   AS kunde,
  s.kuerzel   AS standort,
  COALESCE((SELECT SUM(betrag_eur) FROM erloes WHERE einsatz_id=e.id),0) AS erloes_eur,
  COALESCE((SELECT SUM(betrag_eur) FROM kosten WHERE einsatz_id=e.id),0) AS kosten_eur,
  COALESCE((SELECT SUM(betrag_eur) FROM erloes WHERE einsatz_id=e.id),0)
    - COALESCE((SELECT SUM(betrag_eur) FROM kosten WHERE einsatz_id=e.id),0) AS db_eur
FROM einsatz e
JOIN projekt p ON p.id = e.projekt_id
JOIN kunde k   ON k.id = p.kunde_id
LEFT JOIN standort s ON s.id = e.standort_id;

-- Seed: bekannte Kunden aus KML
INSERT OR IGNORE INTO kunde (kuerzel, name) VALUES
  ('BEW',       'BEW Wohnungsbaugesellschaft — Standorte: MV/BL/SH/AG/LE/HKW Marzahn+Mitte+Wilmersdorf/Trassensanierung'),
  ('JOPE',      'JOPE Immobilien — externer Bestandskunde, Projekte: S3/P15/H14/R95/X13/F7'),
  ('STROMNETZ', 'Stromnetz Berlin'),
  ('STADT',     'Stadt Berlin'),
  ('LUMA',      'LUMA Homebase / Intern');


-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA v2 — Pflanzplanung (2026-06-04)
-- ════════════════════════════════════════════════════════════════════════════

-- Pflanzpläne
CREATE TABLE IF NOT EXISTS pflanzplaene (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id  TEXT,
  projekt_id   TEXT,
  titel        TEXT NOT NULL DEFAULT 'Unbenannter Plan',
  status       TEXT NOT NULL DEFAULT 'planung' CHECK(status IN (
                 'planung',
                 'pdf_erstellt',
                 'bestellung',
                 'bestellung_bestaetigt',
                 'pflanzung_laufend',
                 'wachstum',
                 'maintenance'
               )),
  flaeche_m2   REAL,
  beet_w       REAL,
  beet_h       REAL,
  beet_form    TEXT DEFAULT 'rechteck',
  positionen   JSONB NOT NULL DEFAULT '[]',
  habitate     JSONB NOT NULL DEFAULT '[]',
  notizen      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Status-Verlauf
CREATE TABLE IF NOT EXISTS pflanzplan_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pflanzplan_id UUID NOT NULL REFERENCES pflanzplaene(id) ON DELETE CASCADE,
  von_status    TEXT,
  zu_status     TEXT NOT NULL,
  notiz         TEXT,
  geaendert_am  TIMESTAMPTZ DEFAULT now()
);
