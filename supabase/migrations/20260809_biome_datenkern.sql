-- ═══════════════════════════════════════════════════════════════════════════
-- BIOME 2.0 — Datenkern über alle elf Domänen
--
-- Standort · Bäume · Vegetationsflächen · Boden · Fauna und Habitat · Klima ·
-- Sensorik · Fernerkundung · Maßnahmen · Wirkung · Bericht
--
-- Zweck: Alle späteren Wellen docken an dieses Schema an, ohne es zu brechen.
-- Alles hängt am Standortobjekt (biome_standort).
--
-- ── Zwei getrennte Welten ──────────────────────────────────────────────────
--
--   NACHWEISKERN   Tabellen ohne Präfix-Zusatz, z. B. biome_baum_messung.
--                  Append-only: UPDATE und DELETE sind durch Trigger gesperrt.
--                  Jede Zeile trägt Zeitstempel, Person und — bei Korrekturen —
--                  den vollständigen Vorzustand. Kein modellierter,
--                  interpolierter oder abgeleiteter Wert darf hier stehen;
--                  das erzwingt biome_nachweis_methode_pruefen() über die
--                  Erfassungsart der verwendeten Methode.
--
--   ANALYSESCHICHT Tabellen mit Präfix biome_analyse_.
--                  Darf rechnen, ableiten, schätzen. Jede Zeile trägt eine
--                  Kennzeichnung (modelliert/geschätzt/interpoliert/berechnet)
--                  und die Eingangsdaten. Es gibt bewusst KEINEN
--                  Fremdschlüssel aus dem Nachweiskern in die Analyseschicht —
--                  Ergebnisse fließen nie zurück.
--
-- ── Warum so viele NOT NULL ────────────────────────────────────────────────
--
-- Die harten Regeln des Projekts sind hier als Constraint formuliert, nicht als
-- Absicht in der Oberfläche. Eine Artenliste ohne Erfassungsmethode, ein
-- Bodenwert ohne Entnahmetiefe, eine Maßnahme ohne Artenschutzprüfung oder eine
-- Zustandsstufe ohne belegte Quelle lassen sich in diesem Schema nicht
-- speichern. Was die Datenbank nicht annimmt, kann die Oberfläche nicht zeigen.
--
-- Rücknahme: supabase/migrations/down/20260809_biome_datenkern.down.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 0 · Werkzeug: Append-only, Korrekturkette, Herkunftsprüfung
-- ───────────────────────────────────────────────────────────────────────────

-- Sperrt UPDATE und DELETE auf Nachweistabellen.
CREATE OR REPLACE FUNCTION biome_nur_anfuegen() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'Nachweiskern: % ist unveränderlich. Eine Korrektur wird als neuer Datensatz mit ersetzt_id und korrektur_grund angelegt.',
    TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;

-- Beim Anlegen einer Korrektur: Grund verlangen und den Vorzustand des
-- ersetzten Datensatzes vollständig einfrieren.
CREATE OR REPLACE FUNCTION biome_korrektur_einfrieren() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  alt jsonb;
BEGIN
  IF NEW.ersetzt_id IS NULL THEN
    IF NEW.korrektur_grund IS NOT NULL THEN
      RAISE EXCEPTION 'korrektur_grund ohne ersetzt_id ist in % nicht zulässig.', TG_TABLE_NAME
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.vorzustand := NULL;
    RETURN NEW;
  END IF;

  IF NEW.korrektur_grund IS NULL OR btrim(NEW.korrektur_grund) = '' THEN
    RAISE EXCEPTION 'Korrektur in % braucht einen korrektur_grund.', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  EXECUTE format('SELECT to_jsonb(t) FROM %I.%I t WHERE t.id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
    INTO alt USING NEW.ersetzt_id;

  IF alt IS NULL THEN
    RAISE EXCEPTION 'ersetzt_id % existiert nicht in %.', NEW.ersetzt_id, TG_TABLE_NAME
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.vorzustand := alt;
  RETURN NEW;
END;
$$;

-- Nachweiskern: nur Erfassungsarten, die eine Person oder ein Labor
-- verantwortet. Sensor, Fernerkundung und Modell sind hier gesperrt.
CREATE OR REPLACE FUNCTION biome_nachweis_methode_pruefen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  art text;
BEGIN
  IF NEW.methode_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT erfassungsart INTO art FROM biome_methode WHERE id = NEW.methode_id;
  IF art IS NULL THEN
    RAISE EXCEPTION 'Methode % ist nicht im Methodenverzeichnis.', NEW.methode_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF art NOT IN ('person_vor_ort', 'labor', 'fremddaten') THEN
    RAISE EXCEPTION
      'Methode % hat die Erfassungsart "%" und gehört damit nicht in den Nachweiskern (Tabelle %). Sensor-, Fernerkundungs- und Modellwerte gehören in die Analyseschicht.',
      NEW.methode_id, art, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION biome_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Hängt das komplette Nachweiskern-Verhalten an eine Tabelle.
CREATE OR REPLACE FUNCTION biome_als_nachweis(p_tabelle text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', p_tabelle || '_unveraenderlich', p_tabelle);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION biome_nur_anfuegen()',
    p_tabelle || '_unveraenderlich', p_tabelle);

  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', p_tabelle || '_korrektur', p_tabelle);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION biome_korrektur_einfrieren()',
    p_tabelle || '_korrektur', p_tabelle);

  -- Eine Zeile darf nur einmal ersetzt werden, sonst gäbe es zwei
  -- konkurrierende Wahrheiten.
  EXECUTE format(
    'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (ersetzt_id) WHERE ersetzt_id IS NOT NULL',
    'uq_' || p_tabelle || '_ersetzt', p_tabelle);

  -- Methodenprüfung nur, wenn die Tabelle eine methode_id führt.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_tabelle AND column_name = 'methode_id'
  ) THEN
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', p_tabelle || '_methode', p_tabelle);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION biome_nachweis_methode_pruefen()',
      p_tabelle || '_methode', p_tabelle);
  END IF;
END;
$$;

-- Interner Vollzugriff, wie im übrigen Schema.
CREATE OR REPLACE FUNCTION biome_rls_intern(p_tabelle text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_tabelle);
  EXECUTE format('DROP POLICY IF EXISTS internal_all ON %I', p_tabelle);
  EXECUTE format(
    'CREATE POLICY internal_all ON %I FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal())',
    p_tabelle);
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 1 · Register: Standards, Skalen, Methoden, Personen
--
-- Das Standards-Register aus refs/standards/ liegt hier gespiegelt in der
-- Datenbank. Der Zweck ist nicht Dokumentation, sondern Durchsetzung: eine
-- Zustandsstufe, die keinen Registereintrag mit wörtlichem Zitat hat, lässt
-- sich nicht anlegen und damit auch nicht erheben.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_standard (
  id               TEXT PRIMARY KEY,               -- z. B. 'S-BAUM-03'
  domaene          TEXT NOT NULL CHECK (domaene IN (
                     'standort','baum','vegetation','boden','fauna','klima',
                     'sensorik','fernerkundung','massnahme','wirkung','bericht')),
  kurzname         TEXT NOT NULL,
  herausgeber      TEXT NOT NULL,
  quelle_url       TEXT NOT NULL,
  abgerufen_am     DATE NOT NULL,
  -- Ohne wörtliches Zitat kein Eintrag. Die Längenprüfung verhindert, dass
  -- ein Platzhalter durchrutscht.
  zitat            TEXT NOT NULL CHECK (length(btrim(zitat)) >= 40),
  deckt            TEXT NOT NULL,
  registerdatei    TEXT NOT NULL,                  -- Pfad unter refs/standards/
  frei_zugaenglich BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE biome_standard IS
  'Spiegel von refs/standards/. Jede Skala, jede Methode, jede Kennzahl in BIOME verweist hierauf. Kein Zitat, kein Eintrag.';

CREATE TABLE IF NOT EXISTS biome_skala (
  id          TEXT PRIMARY KEY,
  standard_id TEXT NOT NULL REFERENCES biome_standard(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  domaene     TEXT NOT NULL,
  bezug       TEXT NOT NULL,     -- worauf sich die Skala bezieht
  einheit     TEXT               -- NULL bei reinen Stufenskalen
);

CREATE TABLE IF NOT EXISTS biome_skala_stufe (
  skala_id         TEXT NOT NULL REFERENCES biome_skala(id) ON DELETE CASCADE,
  stufe            TEXT NOT NULL,
  reihenfolge      INT  NOT NULL,
  bezeichnung      TEXT NOT NULL,
  -- Der Wortlaut der Stufendefinition aus der Quelle. Ohne ihn ist die Stufe
  -- erfunden.
  definition_zitat TEXT NOT NULL CHECK (length(btrim(definition_zitat)) >= 20),
  PRIMARY KEY (skala_id, stufe)
);

CREATE TABLE IF NOT EXISTS biome_methode (
  id            TEXT PRIMARY KEY,
  domaene       TEXT NOT NULL,
  name          TEXT NOT NULL,
  beschreibung  TEXT NOT NULL,
  standard_id   TEXT REFERENCES biome_standard(id) ON DELETE RESTRICT,
  einheit       TEXT,
  bezugsflaeche TEXT,            -- z. B. 'je m²', 'je Baum', 'je Aufnahmefläche'
  zeitbezug     TEXT,            -- z. B. 'Zeitpunkt', 'Vegetationsperiode'
  erfassungsart TEXT NOT NULL CHECK (erfassungsart IN (
                  'person_vor_ort','labor','fremddaten',
                  'sensor','fernerkundung','modell')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN biome_methode.erfassungsart IS
  'Entscheidet, ob eine Methode im Nachweiskern zulässig ist. person_vor_ort, labor und fremddaten ja; sensor, fernerkundung und modell nur in der Analyseschicht.';

-- Personen: nicht jede erfassende Person hat ein Konto (Labore, Bestimmer,
-- Gutachter, Fremdfirmen).
CREATE TABLE IF NOT EXISTS biome_person (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  organisation TEXT,
  rolle        TEXT,
  qualifikation TEXT,            -- z. B. 'Fachagrarwirt Baumpflege', 'SKT-A'
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aktiv        BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_biome_person_user ON biome_person(user_id) WHERE user_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 2 · Domäne Standort — das Objekt, an dem alles hängt
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_standort (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     TEXT REFERENCES projects(id) ON DELETE SET NULL,
  client_id      TEXT REFERENCES clients(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  kuerzel        TEXT,
  adresse        TEXT,
  gemarkung      TEXT,
  flurstueck     TEXT,
  -- Umgrenzung als GeoJSON-Geometry. Das maßgebliche, versionierte Polygon
  -- liegt in biome_geometrie; dieses Feld ist die aktuelle Arbeitsfassung
  -- für die Karte.
  geometrie      JSONB,
  crs            TEXT NOT NULL DEFAULT 'EPSG:4326',
  flaeche_m2     NUMERIC CHECK (flaeche_m2 IS NULL OR flaeche_m2 >= 0),
  notiz          TEXT,
  aktiv          BOOLEAN NOT NULL DEFAULT true,
  angelegt_von   UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_biome_standort_projekt ON biome_standort(project_id);
DROP TRIGGER IF EXISTS biome_standort_touch ON biome_standort;
CREATE TRIGGER biome_standort_touch BEFORE UPDATE ON biome_standort
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();

-- Versionierte Geometrien: Kronen- und Flächenpolygone werden einmal
-- abgegrenzt und danach versioniert. Jede Zonalstatistik rechnet gegen genau
-- eine Version — sonst vergleicht man Flächen, nicht Zustände.
CREATE TABLE IF NOT EXISTS biome_geometrie (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id     UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  bezug_typ       TEXT NOT NULL CHECK (bezug_typ IN (
                    'standort','baumkrone','vegetationsflaeche','aufnahmeflaeche',
                    'bodenpunkt','referenzflaeche','behandelte_flaeche','sonstiges')),
  bezug_id        UUID,
  version         INT  NOT NULL CHECK (version >= 1),
  geometrie       JSONB NOT NULL,
  crs             TEXT NOT NULL DEFAULT 'EPSG:4326',
  flaeche_m2      NUMERIC CHECK (flaeche_m2 IS NULL OR flaeche_m2 >= 0),
  quelle          TEXT NOT NULL,          -- woher die Abgrenzung stammt
  lagegenauigkeit_m NUMERIC CHECK (lagegenauigkeit_m IS NULL OR lagegenauigkeit_m >= 0),
  methode_id      TEXT REFERENCES biome_methode(id) ON DELETE RESTRICT,
  gueltig_ab      DATE NOT NULL,
  erfasst_von     UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id      UUID REFERENCES biome_geometrie(id) ON DELETE RESTRICT,
  korrektur_grund TEXT,
  vorzustand      JSONB,
  UNIQUE (bezug_typ, bezug_id, version)
);
CREATE INDEX IF NOT EXISTS idx_biome_geometrie_bezug ON biome_geometrie(bezug_typ, bezug_id);
-- Kein gueltig_bis: die Tabelle ist append-only, ein nachträglich gesetztes
-- Enddatum wäre ein UPDATE. Die Gültigkeit ergibt sich aus der nächsthöheren
-- Version — siehe v_biome_geometrie_aktuell.
CREATE OR REPLACE VIEW v_biome_geometrie_aktuell WITH (security_invoker = on) AS
SELECT DISTINCT ON (g.bezug_typ, g.bezug_id) g.*
FROM biome_geometrie g
WHERE NOT EXISTS (SELECT 1 FROM biome_geometrie n WHERE n.ersetzt_id = g.id)
ORDER BY g.bezug_typ, g.bezug_id, g.version DESC;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 3 · Domäne Bäume
--
-- Getrennt in drei Ebenen:
--   biome_baum            Identität des Baums (bleibt, solange der Baum steht)
--   biome_baum_messung    gemessene Größen — append-only
--   biome_baum_bewertung  eingestufte Größen — append-only, Stufe nur aus
--                         einer registrierten Skala
--   biome_kontrolle       die Regelkontrolle als eigener Vorgang
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_baum (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id          UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  baumnummer           TEXT NOT NULL,
  -- Taxonomie mit Herkunft, damit ein Name überprüfbar bleibt.
  art_wissenschaftlich TEXT,
  art_deutsch          TEXT,
  taxon_quelle         TEXT,             -- z. B. 'GBIF Backbone Taxonomy'
  taxon_id             TEXT,             -- Schlüssel in der Quelle
  gepflanzt_jahr       INT CHECK (gepflanzt_jahr IS NULL OR gepflanzt_jahr BETWEEN 1000 AND 2200),
  gepflanzt_jahr_geschaetzt BOOLEAN NOT NULL DEFAULT false,
  position             JSONB NOT NULL,   -- GeoJSON Point
  crs                  TEXT NOT NULL DEFAULT 'EPSG:4326',
  lagegenauigkeit_m    NUMERIC CHECK (lagegenauigkeit_m IS NULL OR lagegenauigkeit_m >= 0),
  standorttyp          TEXT,
  entfernt_am          DATE,
  entfernt_grund       TEXT,
  angelegt_von         UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (standort_id, baumnummer)
);
CREATE INDEX IF NOT EXISTS idx_biome_baum_standort ON biome_baum(standort_id);
DROP TRIGGER IF EXISTS biome_baum_touch ON biome_baum;
CREATE TRIGGER biome_baum_touch BEFORE UPDATE ON biome_baum
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();
COMMENT ON COLUMN biome_baum.gepflanzt_jahr_geschaetzt IS
  'true = das Pflanzjahr ist geschätzt, nicht belegt. Die Oberfläche muss das am Anzeigeort kennzeichnen.';

-- Gemessene Größen. Bewusst je Merkmal eine Zeile: dann trägt jeder einzelne
-- Wert seine eigene Methode, Messhöhe, Person und sein eigenes Datum, und die
-- Rückverfolgung braucht keine Interpretation.
CREATE TABLE IF NOT EXISTS biome_baum_messung (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baum_id         UUID NOT NULL REFERENCES biome_baum(id) ON DELETE CASCADE,
  kontrolle_id    UUID,                        -- gesetzt, wenn im Rahmen einer Kontrolle
  merkmal         TEXT NOT NULL CHECK (merkmal IN (
                    'stammumfang','stammdurchmesser','baumhoehe',
                    'kronendurchmesser','kronenansatz','baumscheibe_flaeche')),
  wert            NUMERIC NOT NULL,
  einheit         TEXT NOT NULL,
  -- Ein Stammumfang ohne Messhöhe ist keine Zahl, sondern eine Behauptung.
  messhoehe_cm    NUMERIC CHECK (messhoehe_cm IS NULL OR messhoehe_cm >= 0),
  messgeraet      TEXT,
  methode_id      TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  erfasst_von     UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am      TIMESTAMPTZ NOT NULL DEFAULT now(),
  datum           DATE NOT NULL,
  bemerkung       TEXT,
  ersetzt_id      UUID REFERENCES biome_baum_messung(id) ON DELETE RESTRICT,
  korrektur_grund TEXT,
  vorzustand      JSONB,
  CONSTRAINT biome_baum_messung_messhoehe CHECK (
    merkmal NOT IN ('stammumfang','stammdurchmesser') OR messhoehe_cm IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_biome_baum_messung_baum ON biome_baum_messung(baum_id, datum DESC);

-- Eingestufte Größen. Der Fremdschlüssel auf biome_skala_stufe ist der
-- eigentliche Riegel: eine Stufe, die nicht mit Zitat registriert ist,
-- existiert nicht.
CREATE TABLE IF NOT EXISTS biome_baum_bewertung (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baum_id         UUID NOT NULL REFERENCES biome_baum(id) ON DELETE CASCADE,
  kontrolle_id    UUID,
  skala_id        TEXT NOT NULL,
  stufe           TEXT NOT NULL,
  begruendung     TEXT,
  methode_id      TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  erfasst_von     UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am      TIMESTAMPTZ NOT NULL DEFAULT now(),
  datum           DATE NOT NULL,
  ersetzt_id      UUID REFERENCES biome_baum_bewertung(id) ON DELETE RESTRICT,
  korrektur_grund TEXT,
  vorzustand      JSONB,
  FOREIGN KEY (skala_id, stufe) REFERENCES biome_skala_stufe(skala_id, stufe) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_biome_baum_bewertung_baum ON biome_baum_bewertung(baum_id, datum DESC);

-- Die Regelkontrolle. Erfassungsart ist auf 'person_vor_ort' festgenagelt:
-- weder Sensorik noch Fernerkundung noch ein Modell können hier einen Vorgang
-- anlegen, und kein Intervall lässt sich durch Analytik verlängern.
CREATE TABLE IF NOT EXISTS biome_kontrolle (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id         UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  baum_id             UUID REFERENCES biome_baum(id) ON DELETE CASCADE,
  art                 TEXT NOT NULL CHECK (art IN ('regelkontrolle','eingehende_untersuchung','anlasskontrolle')),
  erhebungsart        TEXT NOT NULL DEFAULT 'person_vor_ort'
                      CHECK (erhebungsart = 'person_vor_ort'),
  datum               DATE NOT NULL,
  durchgefuehrt_von   UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  qualifikation       TEXT NOT NULL,
  belaubungszustand   TEXT CHECK (belaubungszustand IS NULL OR belaubungszustand IN ('belaubt','unbelaubt')),
  witterung           TEXT,
  ergebnis_text       TEXT,
  massnahme_empfohlen BOOLEAN NOT NULL DEFAULT false,
  methode_id          TEXT REFERENCES biome_methode(id) ON DELETE RESTRICT,
  erfasst_von         UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id          UUID REFERENCES biome_kontrolle(id) ON DELETE RESTRICT,
  korrektur_grund     TEXT,
  vorzustand          JSONB
);
CREATE INDEX IF NOT EXISTS idx_biome_kontrolle_baum ON biome_kontrolle(baum_id, datum DESC);
COMMENT ON COLUMN biome_kontrolle.erhebungsart IS
  'Bewusst auf person_vor_ort festgeschrieben. Die Regelkontrolle ist eine visuelle Inaugenscheinnahme durch eine qualifizierte Person; Analytik priorisiert und informiert, sie ersetzt nichts.';

ALTER TABLE biome_baum_messung
  DROP CONSTRAINT IF EXISTS biome_baum_messung_kontrolle_fk,
  ADD CONSTRAINT biome_baum_messung_kontrolle_fk
  FOREIGN KEY (kontrolle_id) REFERENCES biome_kontrolle(id) ON DELETE SET NULL;
ALTER TABLE biome_baum_bewertung
  DROP CONSTRAINT IF EXISTS biome_baum_bewertung_kontrolle_fk,
  ADD CONSTRAINT biome_baum_bewertung_kontrolle_fk
  FOREIGN KEY (kontrolle_id) REFERENCES biome_kontrolle(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 4 · Domäne Vegetationsflächen
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_vegetationsflaeche (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id    UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  -- Biotoptyp nur mit Angabe, aus welchem Schlüssel der Code stammt.
  biotoptyp_code TEXT,
  biotoptyp_schluessel_id TEXT REFERENCES biome_standard(id) ON DELETE RESTRICT,
  nutzung        TEXT,
  geometrie      JSONB,
  crs            TEXT NOT NULL DEFAULT 'EPSG:4326',
  flaeche_m2     NUMERIC CHECK (flaeche_m2 IS NULL OR flaeche_m2 >= 0),
  angelegt_von   UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT biome_vegetationsflaeche_biotoptyp CHECK (
    biotoptyp_code IS NULL OR biotoptyp_schluessel_id IS NOT NULL
  )
);
DROP TRIGGER IF EXISTS biome_vegetationsflaeche_touch ON biome_vegetationsflaeche;
CREATE TRIGGER biome_vegetationsflaeche_touch BEFORE UPDATE ON biome_vegetationsflaeche
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();

-- Eine Vegetationsaufnahme ist ein Ereignis mit Fläche, Datum und Methode.
CREATE TABLE IF NOT EXISTS biome_vegetationsaufnahme (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flaeche_id        UUID NOT NULL REFERENCES biome_vegetationsflaeche(id) ON DELETE CASCADE,
  datum             DATE NOT NULL,
  aufnahmeflaeche_m2 NUMERIC NOT NULL CHECK (aufnahmeflaeche_m2 > 0),
  geometrie_id      UUID REFERENCES biome_geometrie(id) ON DELETE SET NULL,
  methode_id        TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  deckung_skala_id  TEXT REFERENCES biome_skala(id) ON DELETE RESTRICT,
  erfasst_von       UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am        TIMESTAMPTZ NOT NULL DEFAULT now(),
  bemerkung         TEXT,
  ersetzt_id        UUID REFERENCES biome_vegetationsaufnahme(id) ON DELETE RESTRICT,
  korrektur_grund   TEXT,
  vorzustand        JSONB
);
CREATE INDEX IF NOT EXISTS idx_biome_vegetationsaufnahme_flaeche
  ON biome_vegetationsaufnahme(flaeche_id, datum DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 5 · Domäne Boden und Bodenleben
--
-- Entnahmetiefe, Datum, Verfahren und Labor sind NOT NULL. Ein Bodenwert ohne
-- diese vier Angaben lässt sich nicht speichern.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_bodenprobe (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id       UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  bezug_typ         TEXT CHECK (bezug_typ IS NULL OR bezug_typ IN ('baum','vegetationsflaeche','punkt')),
  bezug_id          UUID,
  probennummer      TEXT NOT NULL,
  position          JSONB,
  crs               TEXT NOT NULL DEFAULT 'EPSG:4326',
  entnahme_datum    DATE NOT NULL,
  tiefe_von_cm      NUMERIC NOT NULL CHECK (tiefe_von_cm >= 0),
  tiefe_bis_cm      NUMERIC NOT NULL CHECK (tiefe_bis_cm > 0),
  probenart         TEXT NOT NULL CHECK (probenart IN ('mischprobe','einzelprobe','stechzylinder')),
  einzelproben_anzahl INT CHECK (einzelproben_anzahl IS NULL OR einzelproben_anzahl > 0),
  methode_id        TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  entnommen_von     UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  labor             TEXT NOT NULL,
  labor_auftragsnr  TEXT,
  labor_eingang     DATE,
  bemerkung         TEXT,
  erfasst_von       UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id        UUID REFERENCES biome_bodenprobe(id) ON DELETE RESTRICT,
  korrektur_grund   TEXT,
  vorzustand        JSONB,
  CONSTRAINT biome_bodenprobe_tiefe CHECK (tiefe_bis_cm > tiefe_von_cm),
  CONSTRAINT biome_bodenprobe_mischprobe CHECK (
    probenart <> 'mischprobe' OR einzelproben_anzahl IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_biome_bodenprobe_standort ON biome_bodenprobe(standort_id, entnahme_datum DESC);

CREATE TABLE IF NOT EXISTS biome_bodenwert (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_id          UUID NOT NULL REFERENCES biome_bodenprobe(id) ON DELETE CASCADE,
  parameter         TEXT NOT NULL,
  wert              NUMERIC,
  wert_text         TEXT,
  einheit           TEXT NOT NULL,
  unter_bestimmungsgrenze BOOLEAN NOT NULL DEFAULT false,
  bestimmungsgrenze NUMERIC,
  methode_id        TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  labor_bericht     TEXT,
  analyse_datum     DATE,
  erfasst_von       UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id        UUID REFERENCES biome_bodenwert(id) ON DELETE RESTRICT,
  korrektur_grund   TEXT,
  vorzustand        JSONB,
  -- Ein Wert unter der Bestimmungsgrenze ist nicht 0. Er ist "kleiner als".
  CONSTRAINT biome_bodenwert_bg CHECK (
    NOT unter_bestimmungsgrenze OR bestimmungsgrenze IS NOT NULL
  ),
  CONSTRAINT biome_bodenwert_inhalt CHECK (
    wert IS NOT NULL OR wert_text IS NOT NULL OR unter_bestimmungsgrenze
  )
);
CREATE INDEX IF NOT EXISTS idx_biome_bodenwert_probe ON biome_bodenwert(probe_id);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 6 · Domäne Fauna und Habitat
--
-- Ein Artnachweis hängt zwingend an einem Erfassungsereignis. Dieses trägt
-- Methode, Aufwand, Datum und Erfasser. Damit ist "eine Artenliste ohne
-- Erfassungsmethode ist keine Artenliste" nicht Vorsatz, sondern Constraint.
-- Feldbenennung angelehnt an Darwin Core (siehe refs/standards/04-*).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_erfassungsereignis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id     UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  flaeche_id      UUID REFERENCES biome_vegetationsflaeche(id) ON DELETE SET NULL,
  artengruppe     TEXT NOT NULL,          -- z. B. 'Brutvögel', 'Wildbienen', 'Fledermäuse'
  datum_von       DATE NOT NULL,
  datum_bis       DATE,
  uhrzeit_von     TIME,
  uhrzeit_bis     TIME,
  -- samplingProtocol
  methode_id      TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  -- samplingEffort: ohne Aufwand ist eine Nullmeldung wertlos
  aufwand_text    TEXT NOT NULL,
  aufwand_menge   NUMERIC,
  aufwand_einheit TEXT,
  begehungen      INT CHECK (begehungen IS NULL OR begehungen > 0),
  witterung       TEXT,
  erfasst_von     UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id      UUID REFERENCES biome_erfassungsereignis(id) ON DELETE RESTRICT,
  korrektur_grund TEXT,
  vorzustand      JSONB,
  CONSTRAINT biome_erfassungsereignis_zeitraum CHECK (datum_bis IS NULL OR datum_bis >= datum_von)
);
CREATE INDEX IF NOT EXISTS idx_biome_erfassungsereignis_standort
  ON biome_erfassungsereignis(standort_id, datum_von DESC);

CREATE TABLE IF NOT EXISTS biome_artnachweis (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ereignis_id          UUID NOT NULL REFERENCES biome_erfassungsereignis(id) ON DELETE CASCADE,
  art_wissenschaftlich TEXT NOT NULL,
  art_deutsch          TEXT,
  taxon_quelle         TEXT NOT NULL,
  taxon_id             TEXT,
  -- basisOfRecord
  nachweistyp          TEXT NOT NULL CHECK (nachweistyp IN (
                         'sichtbeobachtung','rufnachweis','fang','totfund','spur',
                         'nest_oder_bau','bildnachweis','beleg_sammlung')),
  anzahl               NUMERIC,
  anzahl_einheit       TEXT,
  -- Nullmeldung ist eine Aussage, kein fehlender Wert.
  nicht_nachgewiesen   BOOLEAN NOT NULL DEFAULT false,
  bestimmt_von         UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  bestimmung_sicher    BOOLEAN NOT NULL DEFAULT true,
  bestimmung_bemerkung TEXT,
  position             JSONB,
  crs                  TEXT NOT NULL DEFAULT 'EPSG:4326',
  lagegenauigkeit_m    NUMERIC CHECK (lagegenauigkeit_m IS NULL OR lagegenauigkeit_m >= 0),
  beleg_url            TEXT,
  erfasst_von          UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am           TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id           UUID REFERENCES biome_artnachweis(id) ON DELETE RESTRICT,
  korrektur_grund      TEXT,
  vorzustand           JSONB,
  CONSTRAINT biome_artnachweis_anzahl CHECK (
    NOT nicht_nachgewiesen OR anzahl IS NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_biome_artnachweis_ereignis ON biome_artnachweis(ereignis_id);
CREATE INDEX IF NOT EXISTS idx_biome_artnachweis_art ON biome_artnachweis(art_wissenschaftlich);

-- Habitatstrukturen (Baumhöhlen, Totholz, Rindentaschen, Lesesteinhaufen …).
-- Der Typ kommt aus einer registrierten Typologie — sonst ist er erfunden.
CREATE TABLE IF NOT EXISTS biome_habitattyp (
  id          TEXT PRIMARY KEY,
  standard_id TEXT NOT NULL REFERENCES biome_standard(id) ON DELETE RESTRICT,
  gruppe      TEXT NOT NULL,
  bezeichnung TEXT NOT NULL,
  definition_zitat TEXT NOT NULL CHECK (length(btrim(definition_zitat)) >= 20)
);

CREATE TABLE IF NOT EXISTS biome_habitatstruktur (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id     UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  baum_id         UUID REFERENCES biome_baum(id) ON DELETE CASCADE,
  flaeche_id      UUID REFERENCES biome_vegetationsflaeche(id) ON DELETE CASCADE,
  habitattyp_id   TEXT NOT NULL REFERENCES biome_habitattyp(id) ON DELETE RESTRICT,
  anzahl          INT CHECK (anzahl IS NULL OR anzahl > 0),
  hoehe_m         NUMERIC CHECK (hoehe_m IS NULL OR hoehe_m >= 0),
  exposition      TEXT,
  bemerkung       TEXT,
  datum           DATE NOT NULL,
  methode_id      TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  erfasst_von     UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id      UUID REFERENCES biome_habitatstruktur(id) ON DELETE RESTRICT,
  korrektur_grund TEXT,
  vorzustand      JSONB
);
CREATE INDEX IF NOT EXISTS idx_biome_habitatstruktur_baum ON biome_habitatstruktur(baum_id);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 7 · Domäne Klima
--
-- Klimawerte sind fast immer Fremddaten. Sie tragen deshalb zwingend eine
-- Herkunftsangabe (Messung, Modell, Reanalyse) — die Oberfläche kennzeichnet
-- danach.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_klimabezug (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id      UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  quelle           TEXT NOT NULL,        -- z. B. 'DWD Climate Data Center'
  station_id       TEXT,
  station_name     TEXT,
  entfernung_m     NUMERIC CHECK (entfernung_m IS NULL OR entfernung_m >= 0),
  referenzperiode  TEXT,
  datenquelle_url  TEXT NOT NULL,
  bemerkung        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biome_klimawert (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezug_id        UUID NOT NULL REFERENCES biome_klimabezug(id) ON DELETE CASCADE,
  parameter       TEXT NOT NULL,
  zeitraum_von    DATE NOT NULL,
  zeitraum_bis    DATE NOT NULL,
  wert            NUMERIC NOT NULL,
  einheit         TEXT NOT NULL,
  herkunft        TEXT NOT NULL CHECK (herkunft IN ('messung','modell','reanalyse','interpoliert')),
  methode_id      TEXT REFERENCES biome_methode(id) ON DELETE RESTRICT,
  abgerufen_am    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT biome_klimawert_zeitraum CHECK (zeitraum_bis >= zeitraum_von)
);
CREATE INDEX IF NOT EXISTS idx_biome_klimawert_bezug ON biome_klimawert(bezug_id, zeitraum_von);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 8 · Domäne Sensorik (Messschicht — nicht Nachweiskern)
--
-- Begriffe angelehnt an OGC SensorThings: Gerät → Messreihe → Messwert.
-- Kein Fremdschlüssel aus dem Nachweiskern hierher.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_sensorgeraet (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id           UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  bezug_typ             TEXT CHECK (bezug_typ IS NULL OR bezug_typ IN ('baum','vegetationsflaeche','punkt')),
  bezug_id              UUID,
  bezeichnung           TEXT NOT NULL,
  hersteller            TEXT,
  modell                TEXT,
  seriennummer          TEXT,
  externe_id            TEXT,     -- Verknüpfung zur bestehenden Tabelle sensors(id)
  position              JSONB,
  crs                   TEXT NOT NULL DEFAULT 'EPSG:4326',
  einbautiefe_cm        NUMERIC,
  einbauhoehe_m         NUMERIC,
  installiert_am        DATE,
  ausgebaut_am          DATE,
  kalibriert_am         DATE,
  kalibrier_verfahren   TEXT,
  kalibrierung_gueltig_bis DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS biome_sensorgeraet_touch ON biome_sensorgeraet;
CREATE TRIGGER biome_sensorgeraet_touch BEFORE UPDATE ON biome_sensorgeraet
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();

CREATE TABLE IF NOT EXISTS biome_messreihe (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geraet_id        UUID NOT NULL REFERENCES biome_sensorgeraet(id) ON DELETE CASCADE,
  groesse          TEXT NOT NULL,        -- ObservedProperty
  einheit          TEXT NOT NULL,        -- unitOfMeasurement
  methode_id       TEXT REFERENCES biome_methode(id) ON DELETE RESTRICT,
  intervall_s      INT CHECK (intervall_s IS NULL OR intervall_s > 0),
  aggregation      TEXT CHECK (aggregation IS NULL OR aggregation IN ('momentan','mittel','summe','min','max')),
  -- Ein Rohsignal ist kein physikalischer Wert. Ohne bodenart- bzw.
  -- medienspezifische Kalibrierung darf die Oberfläche nicht so tun als ob.
  kalibriert       BOOLEAN NOT NULL DEFAULT false,
  kalibrier_hinweis TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biome_messwert (
  id             BIGSERIAL PRIMARY KEY,
  messreihe_id   UUID NOT NULL REFERENCES biome_messreihe(id) ON DELETE CASCADE,
  zeitpunkt      TIMESTAMPTZ NOT NULL,     -- phenomenonTime
  eingang        TIMESTAMPTZ NOT NULL DEFAULT now(),  -- resultTime
  wert           NUMERIC,
  qualitaet      TEXT NOT NULL DEFAULT 'roh'
                 CHECK (qualitaet IN ('roh','geprueft','korrigiert','verworfen')),
  bemerkung      TEXT,
  UNIQUE (messreihe_id, zeitpunkt)
);
CREATE INDEX IF NOT EXISTS idx_biome_messwert_reihe ON biome_messwert(messreihe_id, zeitpunkt DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 9 · Domäne Fernerkundung
--
-- Ingest-Objekt ist ein Flug, keine Datei. Gespeichert wird Reflektanz, nie
-- nur der Index. Ein Index, den die Bandbelegung nicht hergibt, lässt sich
-- nicht berechnen — das erzwingt biome_index_moeglich_pruefen().
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_fernerkundungssensor (
  id            TEXT PRIMARY KEY,
  hersteller    TEXT,
  modell        TEXT NOT NULL,
  sensorfamilie TEXT NOT NULL,      -- Gate-Kriterium beim Flugvergleich
  quelle_url    TEXT,
  bemerkung     TEXT
);

CREATE TABLE IF NOT EXISTS biome_sensorband (
  sensor_id   TEXT NOT NULL REFERENCES biome_fernerkundungssensor(id) ON DELETE CASCADE,
  band_name   TEXT NOT NULL,
  funktion    TEXT NOT NULL CHECK (funktion IN (
                'blau','gruen','rot','red_edge','nir','swir','thermal','panchromatisch')),
  zentrum_nm  NUMERIC,
  breite_nm   NUMERIC,
  PRIMARY KEY (sensor_id, band_name)
);

CREATE TABLE IF NOT EXISTS biome_flug (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id            UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  sensor_id              TEXT NOT NULL REFERENCES biome_fernerkundungssensor(id) ON DELETE RESTRICT,
  plattform              TEXT,
  datum                  DATE NOT NULL,
  uhrzeit_start          TIME NOT NULL,
  uhrzeit_ende           TIME,
  zeitzone               TEXT NOT NULL DEFAULT 'Europe/Berlin',
  flughoehe_m            NUMERIC,
  gsd_cm                 NUMERIC NOT NULL CHECK (gsd_cm > 0),
  sonnenzenit_grad       NUMERIC NOT NULL CHECK (sonnenzenit_grad BETWEEN 0 AND 90),
  sonnenazimut_grad      NUMERIC CHECK (sonnenazimut_grad IS NULL OR sonnenazimut_grad BETWEEN 0 AND 360),
  bewoelkung_achtel      INT CHECK (bewoelkung_achtel IS NULL OR bewoelkung_achtel BETWEEN 0 AND 8),
  wind_ms                NUMERIC,
  lufttemperatur_c       NUMERIC,
  -- Ohne Kalibrierziel keine vergleichbare Reflektanz.
  kalibrierziel          TEXT NOT NULL,
  kalibrierziel_reflektanz JSONB,
  passpunkte_anzahl      INT CHECK (passpunkte_anzahl IS NULL OR passpunkte_anzahl >= 0),
  passpunkte_rmse_cm     NUMERIC CHECK (passpunkte_rmse_cm IS NULL OR passpunkte_rmse_cm >= 0),
  crs                    TEXT NOT NULL,
  verarbeitungssoftware  TEXT,
  verarbeitungsversion   TEXT NOT NULL,
  phaenologisches_fenster TEXT,
  bemerkung              TEXT,
  erfasst_von            UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  erfasst_am             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_biome_flug_standort ON biome_flug(standort_id, datum DESC);

-- Was pro Flug tatsächlich vorliegt. Ein Index allein ist kein Datenbestand.
CREATE TABLE IF NOT EXISTS biome_flugprodukt (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flug_id     UUID NOT NULL REFERENCES biome_flug(id) ON DELETE CASCADE,
  band_name   TEXT,
  art         TEXT NOT NULL CHECK (art IN ('reflektanz','radianz','digitalwert','orthomosaik','hoehenmodell','maske')),
  datei_url   TEXT,
  aufloesung_cm NUMERIC,
  bemerkung   TEXT
);
CREATE INDEX IF NOT EXISTS idx_biome_flugprodukt_flug ON biome_flugprodukt(flug_id);

CREATE TABLE IF NOT EXISTS biome_flugmaske (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flug_id     UUID NOT NULL REFERENCES biome_flug(id) ON DELETE CASCADE,
  typ         TEXT NOT NULL CHECK (typ IN ('schatten','nichtvegetation','wolke','wasser')),
  verfahren   TEXT NOT NULL,
  schwellenwert TEXT,
  datei_url   TEXT,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flug_id, typ)
);

CREATE TABLE IF NOT EXISTS biome_indexdefinition (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  formel              TEXT NOT NULL,
  benoetigte_funktionen TEXT[] NOT NULL,
  standard_id         TEXT NOT NULL REFERENCES biome_standard(id) ON DELETE RESTRICT,
  interpretationshinweis TEXT
);
COMMENT ON COLUMN biome_indexdefinition.interpretationshinweis IS
  'Wird an jedem Anzeigeort mitgeführt, an dem der Index interpretiert wird (z. B. NDVI-Sättigung).';

-- ── Analyseschicht Fernerkundung ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_analyse_zonalstatistik (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flug_id          UUID NOT NULL REFERENCES biome_flug(id) ON DELETE CASCADE,
  -- Immer gegen dasselbe, versionierte Polygon.
  geometrie_id     UUID NOT NULL REFERENCES biome_geometrie(id) ON DELETE RESTRICT,
  index_id         TEXT NOT NULL REFERENCES biome_indexdefinition(id) ON DELETE RESTRICT,
  masken           UUID[] NOT NULL DEFAULT '{}',
  n_pixel          INT NOT NULL CHECK (n_pixel >= 0),
  n_pixel_maskiert INT NOT NULL DEFAULT 0 CHECK (n_pixel_maskiert >= 0),
  mittel           NUMERIC,
  median           NUMERIC,
  p10              NUMERIC,
  p90              NUMERIC,
  stdabw           NUMERIC,
  kennzeichnung    TEXT NOT NULL DEFAULT 'berechnet'
                   CHECK (kennzeichnung IN ('berechnet','modelliert','geschaetzt','interpoliert')),
  verfahren        TEXT NOT NULL,
  verfahren_version TEXT NOT NULL,
  berechnet_am     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flug_id, geometrie_id, index_id)
);

-- Riegel: kein Index, den die Bandbelegung nicht hergibt.
CREATE OR REPLACE FUNCTION biome_index_moeglich_pruefen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  s_id       text;
  gebraucht  text[];
  fehlt      text[];
BEGIN
  SELECT f.sensor_id INTO s_id FROM biome_flug f WHERE f.id = NEW.flug_id;
  SELECT i.benoetigte_funktionen INTO gebraucht FROM biome_indexdefinition i WHERE i.id = NEW.index_id;

  SELECT array_agg(g) INTO fehlt
  FROM unnest(gebraucht) AS g
  WHERE NOT EXISTS (
    SELECT 1 FROM biome_sensorband b WHERE b.sensor_id = s_id AND b.funktion = g
  );

  IF fehlt IS NOT NULL AND array_length(fehlt, 1) > 0 THEN
    RAISE EXCEPTION
      'Index % ist mit Sensor % nicht berechenbar: es fehlen die Bänder %.',
      NEW.index_id, s_id, array_to_string(fehlt, ', ')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS biome_zonalstatistik_index ON biome_analyse_zonalstatistik;
CREATE TRIGGER biome_zonalstatistik_index BEFORE INSERT ON biome_analyse_zonalstatistik
  FOR EACH ROW EXECUTE FUNCTION biome_index_moeglich_pruefen();

-- Vergleichbarkeits-Gate zwischen zwei Flügen. Die Prüfkriterien stehen
-- einzeln in gate_details, damit die Oberfläche nicht "nicht vergleichbar"
-- sagen muss, ohne den Grund zu nennen.
CREATE TABLE IF NOT EXISTS biome_flugvergleich (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flug_a         UUID NOT NULL REFERENCES biome_flug(id) ON DELETE CASCADE,
  flug_b         UUID NOT NULL REFERENCES biome_flug(id) ON DELETE CASCADE,
  gate_bestanden BOOLEAN NOT NULL,
  gate_details   JSONB NOT NULL,
  grund          TEXT,
  koreg_rmse_cm  NUMERIC,
  geprueft_am    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verfahren_version TEXT NOT NULL,
  UNIQUE (flug_a, flug_b),
  CONSTRAINT biome_flugvergleich_verschieden CHECK (flug_a <> flug_b),
  -- Nicht bestanden ohne Grund wäre eine Sackgasse für die Oberfläche.
  CONSTRAINT biome_flugvergleich_grund CHECK (gate_bestanden OR (grund IS NOT NULL AND btrim(grund) <> ''))
);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 10 · Domäne Maßnahmen
--
-- Keine durchgeführte Maßnahme ohne dokumentierte Artenschutzprüfung.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_artenschutzpruefung (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id       UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  datum             DATE NOT NULL,
  geprueft_von      UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  qualifikation     TEXT NOT NULL,
  rechtsgrundlage   TEXT NOT NULL DEFAULT '§ 44 BNatSchG',
  zeitraum_geprueft BOOLEAN NOT NULL,      -- Schnittzeitraum nach § 39 BNatSchG
  betroffene_arten  JSONB NOT NULL DEFAULT '[]'::jsonb,
  ergebnis          TEXT NOT NULL CHECK (ergebnis IN (
                      'keine_betroffenheit','vermeidungsmassnahmen',
                      'cef_erforderlich','ausnahme_erforderlich','nicht_zulaessig')),
  begruendung       TEXT NOT NULL CHECK (length(btrim(begruendung)) >= 10),
  vermeidungsmassnahmen TEXT,
  dokument_url      TEXT,
  erfasst_von       UUID NOT NULL REFERENCES biome_person(id) ON DELETE RESTRICT,
  erfasst_am        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ersetzt_id        UUID REFERENCES biome_artenschutzpruefung(id) ON DELETE RESTRICT,
  korrektur_grund   TEXT,
  vorzustand        JSONB
);

CREATE TABLE IF NOT EXISTS biome_massnahme (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id       UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  bezug_typ         TEXT CHECK (bezug_typ IS NULL OR bezug_typ IN ('baum','vegetationsflaeche','standort')),
  bezug_id          UUID,
  titel             TEXT NOT NULL,
  typ               TEXT NOT NULL,
  beschreibung      TEXT,
  ziel              TEXT,
  geplant_von       DATE,
  geplant_bis       DATE,
  durchgefuehrt_am  DATE,
  durchgefuehrt_von UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  job_id            TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'geplant'
                    CHECK (status IN ('geplant','freigegeben','durchgefuehrt','abgebrochen')),
  artenschutz_pruefung_id UUID REFERENCES biome_artenschutzpruefung(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Die harte Regel als Constraint.
  CONSTRAINT biome_massnahme_artenschutz CHECK (
    status NOT IN ('freigegeben','durchgefuehrt') OR artenschutz_pruefung_id IS NOT NULL
  ),
  CONSTRAINT biome_massnahme_durchgefuehrt CHECK (
    status <> 'durchgefuehrt' OR durchgefuehrt_am IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_biome_massnahme_standort ON biome_massnahme(standort_id);
DROP TRIGGER IF EXISTS biome_massnahme_touch ON biome_massnahme;
CREATE TRIGGER biome_massnahme_touch BEFORE UPDATE ON biome_massnahme
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 11 · Domäne Wirkung (BACI)
--
-- Eine Wirkungsfrage benennt die vier Bausteine: behandelte Fläche,
-- Referenzfläche, Baseline-Zeitraum, Wirkungszeitraum. Die Auswertung liegt in
-- der Analyseschicht und führt mit, was fehlt. Die Sicht
-- v_biome_wirkung_darstellbar gibt nur vollständige Fälle heraus — die
-- Oberfläche liest ausschließlich diese Sicht.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_wirkungsfrage (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id          UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  titel                TEXT NOT NULL,
  massnahme_id         UUID NOT NULL REFERENCES biome_massnahme(id) ON DELETE CASCADE,
  kennzahl_methode_id  TEXT NOT NULL REFERENCES biome_methode(id) ON DELETE RESTRICT,
  behandelte_flaeche_id UUID REFERENCES biome_geometrie(id) ON DELETE RESTRICT,
  referenzflaeche_id   UUID REFERENCES biome_geometrie(id) ON DELETE RESTRICT,
  referenz_begruendung TEXT,     -- warum ist die Referenz vergleichbar
  baseline_von         DATE,
  baseline_bis         DATE,
  wirkung_von          DATE,
  wirkung_bis          DATE,
  angelegt_von         UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT biome_wirkungsfrage_baseline CHECK (baseline_bis IS NULL OR baseline_von IS NULL OR baseline_bis >= baseline_von),
  CONSTRAINT biome_wirkungsfrage_wirkung  CHECK (wirkung_bis  IS NULL OR wirkung_von  IS NULL OR wirkung_bis  >= wirkung_von),
  -- Zeitbezug: die Baseline liegt vor dem Wirkungszeitraum.
  CONSTRAINT biome_wirkungsfrage_reihenfolge CHECK (
    baseline_bis IS NULL OR wirkung_von IS NULL OR baseline_bis <= wirkung_von
  ),
  CONSTRAINT biome_wirkungsfrage_referenz CHECK (
    referenzflaeche_id IS NULL OR (referenz_begruendung IS NOT NULL AND btrim(referenz_begruendung) <> '')
  )
);
DROP TRIGGER IF EXISTS biome_wirkungsfrage_touch ON biome_wirkungsfrage;
CREATE TRIGGER biome_wirkungsfrage_touch BEFORE UPDATE ON biome_wirkungsfrage
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();

CREATE TABLE IF NOT EXISTS biome_analyse_wirkung (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wirkungsfrage_id   UUID NOT NULL REFERENCES biome_wirkungsfrage(id) ON DELETE CASCADE,
  baci_vollstaendig  BOOLEAN NOT NULL,
  fehlende_bausteine TEXT[] NOT NULL DEFAULT '{}',
  n_baseline         INT,
  n_wirkung          INT,
  effekt_wert        NUMERIC,
  effekt_einheit     TEXT,
  unsicherheit       TEXT,
  kennzeichnung      TEXT NOT NULL DEFAULT 'berechnet'
                     CHECK (kennzeichnung IN ('berechnet','modelliert','geschaetzt','interpoliert')),
  verfahren          TEXT NOT NULL,
  verfahren_version  TEXT NOT NULL,
  berechnet_am       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Unvollständig und trotzdem ein Effektwert: das wäre genau die Zahl, die
  -- niemand aussprechen darf.
  CONSTRAINT biome_analyse_wirkung_kein_effekt_ohne_baci CHECK (
    baci_vollstaendig OR effekt_wert IS NULL
  ),
  CONSTRAINT biome_analyse_wirkung_luecken CHECK (
    baci_vollstaendig OR array_length(fehlende_bausteine, 1) > 0
  )
);

-- Prüft die vier BACI-Bausteine an der Wirkungsfrage und setzt
-- baci_vollstaendig sowie fehlende_bausteine selbst — die Analyseschicht darf
-- sich das nicht selbst attestieren.
CREATE OR REPLACE FUNCTION biome_baci_pruefen() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  f  biome_wirkungsfrage%ROWTYPE;
  l  text[] := '{}';
BEGIN
  SELECT * INTO f FROM biome_wirkungsfrage WHERE id = NEW.wirkungsfrage_id;

  -- array_append statt ||: ein untypisiertes Literal würde Postgres als Array
  -- lesen und mit „malformed array literal" abbrechen.
  IF f.id IS NULL THEN
    RAISE EXCEPTION 'Wirkungsfrage % existiert nicht.', NEW.wirkungsfrage_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF f.behandelte_flaeche_id IS NULL THEN l := array_append(l, 'behandelte_flaeche'); END IF;
  IF f.referenzflaeche_id    IS NULL THEN l := array_append(l, 'referenzflaeche');    END IF;
  IF f.baseline_von IS NULL OR f.baseline_bis IS NULL THEN l := array_append(l, 'baseline'); END IF;
  IF f.wirkung_von  IS NULL OR f.wirkung_bis  IS NULL THEN l := array_append(l, 'wirkungszeitraum'); END IF;
  IF f.baseline_bis IS NOT NULL AND f.wirkung_von IS NOT NULL AND f.baseline_bis > f.wirkung_von THEN
    l := array_append(l, 'zeitbezug');
  END IF;

  NEW.fehlende_bausteine := l;
  NEW.baci_vollstaendig  := (array_length(l, 1) IS NULL);
  IF NOT NEW.baci_vollstaendig THEN
    NEW.effekt_wert := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS biome_analyse_wirkung_baci ON biome_analyse_wirkung;
CREATE TRIGGER biome_analyse_wirkung_baci BEFORE INSERT ON biome_analyse_wirkung
  FOR EACH ROW EXECUTE FUNCTION biome_baci_pruefen();

CREATE OR REPLACE VIEW v_biome_wirkung_darstellbar WITH (security_invoker = on) AS
SELECT a.*, f.titel, f.standort_id, f.massnahme_id
FROM biome_analyse_wirkung a
JOIN biome_wirkungsfrage f ON f.id = a.wirkungsfrage_id
WHERE a.baci_vollstaendig;
COMMENT ON VIEW v_biome_wirkung_darstellbar IS
  'Einzige Quelle für Wirkungsaussagen in der Oberfläche. Unvollständige Fälle erscheinen hier nicht — dort zeigt die Oberfläche, was fehlt.';

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 12 · Domäne Bericht
--
-- Jede Position trägt ihre Herkunft. Analysepositionen tragen zusätzlich die
-- Kennzeichnung.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biome_bericht (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id   UUID NOT NULL REFERENCES biome_standort(id) ON DELETE CASCADE,
  titel         TEXT NOT NULL,
  zweck         TEXT,
  zeitraum_von  DATE,
  zeitraum_bis  DATE,
  empfaenger    TEXT,
  status        TEXT NOT NULL DEFAULT 'entwurf'
                CHECK (status IN ('entwurf','freigegeben','versendet','zurueckgezogen')),
  erstellt_von  UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  erstellt_am   TIMESTAMPTZ NOT NULL DEFAULT now(),
  freigegeben_von UUID REFERENCES biome_person(id) ON DELETE SET NULL,
  freigegeben_am  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT biome_bericht_freigabe CHECK (
    status = 'entwurf' OR (freigegeben_von IS NOT NULL AND freigegeben_am IS NOT NULL)
  )
);
DROP TRIGGER IF EXISTS biome_bericht_touch ON biome_bericht;
CREATE TRIGGER biome_bericht_touch BEFORE UPDATE ON biome_bericht
  FOR EACH ROW EXECUTE FUNCTION biome_updated_at();

CREATE TABLE IF NOT EXISTS biome_berichtposition (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bericht_id    UUID NOT NULL REFERENCES biome_bericht(id) ON DELETE CASCADE,
  reihenfolge   INT NOT NULL,
  art           TEXT NOT NULL CHECK (art IN ('nachweis','analyse','text')),
  ueberschrift  TEXT,
  text          TEXT,
  wert          NUMERIC,
  einheit       TEXT,
  -- Herkunftskette: Tabelle + Schlüssel, damit jede Zahl in zwei Klicks auf
  -- Quelle, Datum, Erfassungsmethode und Person zurückführbar bleibt.
  herkunft      JSONB,
  kennzeichnung TEXT CHECK (kennzeichnung IS NULL OR kennzeichnung IN (
                  'berechnet','modelliert','geschaetzt','interpoliert')),
  UNIQUE (bericht_id, reihenfolge),
  CONSTRAINT biome_berichtposition_herkunft CHECK (
    art = 'text' OR herkunft IS NOT NULL
  ),
  CONSTRAINT biome_berichtposition_kennzeichnung CHECK (
    (art = 'analyse') = (kennzeichnung IS NOT NULL)
  )
);

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 13 · Nachweiskern scharf schalten und RLS setzen
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  t text;
  nachweis text[] := ARRAY[
    'biome_geometrie',
    'biome_baum_messung',
    'biome_baum_bewertung',
    'biome_kontrolle',
    'biome_vegetationsaufnahme',
    'biome_bodenprobe',
    'biome_bodenwert',
    'biome_erfassungsereignis',
    'biome_artnachweis',
    'biome_habitatstruktur',
    'biome_artenschutzpruefung'
  ];
  alle text[] := ARRAY[
    'biome_standard','biome_skala','biome_skala_stufe','biome_methode','biome_person',
    'biome_standort','biome_geometrie',
    'biome_baum','biome_baum_messung','biome_baum_bewertung','biome_kontrolle',
    'biome_vegetationsflaeche','biome_vegetationsaufnahme',
    'biome_bodenprobe','biome_bodenwert',
    'biome_erfassungsereignis','biome_artnachweis','biome_habitattyp','biome_habitatstruktur',
    'biome_klimabezug','biome_klimawert',
    'biome_sensorgeraet','biome_messreihe','biome_messwert',
    'biome_fernerkundungssensor','biome_sensorband','biome_flug','biome_flugprodukt',
    'biome_flugmaske','biome_indexdefinition','biome_analyse_zonalstatistik','biome_flugvergleich',
    'biome_artenschutzpruefung','biome_massnahme',
    'biome_wirkungsfrage','biome_analyse_wirkung',
    'biome_bericht','biome_berichtposition'
  ];
BEGIN
  FOREACH t IN ARRAY nachweis LOOP
    PERFORM biome_als_nachweis(t);
  END LOOP;
  FOREACH t IN ARRAY alle LOOP
    PERFORM biome_rls_intern(t);
  END LOOP;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- TEIL 14 · Herkunftssicht
--
-- Eine Sicht über alle Nachweiszeilen: was, wann, mit welcher Methode, durch
-- wen. Sie ist die technische Grundlage für die Zwei-Klick-Rückverfolgung.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_biome_herkunft WITH (security_invoker = on) AS
  SELECT 'biome_baum_messung'::text AS tabelle, m.id, m.baum_id AS bezug_id, m.datum,
         m.methode_id, m.erfasst_von, m.erfasst_am, m.ersetzt_id
  FROM biome_baum_messung m
UNION ALL
  SELECT 'biome_baum_bewertung', b.id, b.baum_id, b.datum,
         b.methode_id, b.erfasst_von, b.erfasst_am, b.ersetzt_id
  FROM biome_baum_bewertung b
UNION ALL
  SELECT 'biome_kontrolle', k.id, k.baum_id, k.datum,
         k.methode_id, k.erfasst_von, k.erfasst_am, k.ersetzt_id
  FROM biome_kontrolle k
UNION ALL
  SELECT 'biome_bodenwert', w.id, w.probe_id, p.entnahme_datum,
         w.methode_id, w.erfasst_von, w.erfasst_am, w.ersetzt_id
  FROM biome_bodenwert w JOIN biome_bodenprobe p ON p.id = w.probe_id
UNION ALL
  SELECT 'biome_artnachweis', a.id, a.ereignis_id, e.datum_von,
         e.methode_id, a.erfasst_von, a.erfasst_am, a.ersetzt_id
  FROM biome_artnachweis a JOIN biome_erfassungsereignis e ON e.id = a.ereignis_id
UNION ALL
  SELECT 'biome_habitatstruktur', h.id, COALESCE(h.baum_id, h.flaeche_id), h.datum,
         h.methode_id, h.erfasst_von, h.erfasst_am, h.ersetzt_id
  FROM biome_habitatstruktur h;

-- Nur gültige (nicht ersetzte) Nachweise.
CREATE OR REPLACE VIEW v_biome_baum_messung_gueltig WITH (security_invoker = on) AS
SELECT m.* FROM biome_baum_messung m
WHERE NOT EXISTS (SELECT 1 FROM biome_baum_messung n WHERE n.ersetzt_id = m.id);

CREATE OR REPLACE VIEW v_biome_baum_bewertung_gueltig WITH (security_invoker = on) AS
SELECT b.* FROM biome_baum_bewertung b
WHERE NOT EXISTS (SELECT 1 FROM biome_baum_bewertung n WHERE n.ersetzt_id = b.id);

CREATE OR REPLACE VIEW v_biome_kontrolle_gueltig WITH (security_invoker = on) AS
SELECT k.* FROM biome_kontrolle k
WHERE NOT EXISTS (SELECT 1 FROM biome_kontrolle n WHERE n.ersetzt_id = k.id);
