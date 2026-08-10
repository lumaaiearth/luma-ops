-- ═══════════════════════════════════════════════════════════════════════════
-- Zwei Befunde des Methoden-Critics, Runde 3, strukturell abgestellt.
--
-- (1) LAGEGENAUIGKEIT OHNE BEZUGSEBENE
--     `lagegenauigkeit_m` war eine nackte Zahl. Die Oberfläche schrieb sie als
--     „± 3 m" hinter die Koordinate. Das Register sagt zu dieser Angabe
--     (00-standort-geodaten.md, QUAL-LAGE, wörtlich aus der INSPIRE Technical
--     Guideline): Lagegenauigkeit ist der „mean value of the positional
--     uncertainties for a set of positions", und die Bezugsebene ist wahlweise
--     „spatial object", „spatial object type" oder „data set". Daraus folgt der
--     Registersatz: „BIOME muss die Bezugsebene mitführen, sonst ist die Zahl
--     nicht interpretierbar."
--
--     Eine Zahl ohne Bezugsebene ist damit kein ungenauer Wert, sondern gar
--     keiner. Nach dieser Migration ist sie nicht mehr speicherbar.
--
-- (2) MEHRSTÄMMIGKEIT FEHLTE VOLLSTÄNDIG
--     BAUM-BE-06 wörtlich: „Mehrstämmige Bäume sind geschützt, wenn mindestens
--     einer der Stämme einen Mindestumfang von 50 cm aufweist." Der Datenkern
--     kannte weder das Merkmal noch die Einzelstämme. `schutzschwelleErreicht()`
--     nahm deshalb stillschweigend Einstämmigkeit an und rechnete gegen 80 cm —
--     bei einem mehrstämmigen Baum die falsche Schwelle, ohne dass irgendwo
--     stand, dass geraten wurde.
--
-- Beide Spalten sind bewusst NULL-fähig und haben keinen Vorgabewert.
-- `mehrstaemmig = false` als Default wäre eine erfundene Erhebung: niemand hat
-- nachgesehen. NULL heißt „nicht erhoben", und die Oberfläche sagt das.
--
-- Vorwärts und rückwärts lauffähig, wiederholbar.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── (1) Bezugsebene der Lagegenauigkeit ───────────────────────────────────
-- Drei Tabellen führen die Angabe: Geometrien, Bäume, Artnachweise.

ALTER TABLE biome_geometrie
  ADD COLUMN IF NOT EXISTS lagegenauigkeit_bezug TEXT;
ALTER TABLE biome_baum
  ADD COLUMN IF NOT EXISTS lagegenauigkeit_bezug TEXT;
ALTER TABLE biome_artnachweis
  ADD COLUMN IF NOT EXISTS lagegenauigkeit_bezug TEXT;

-- Die drei Ausprägungen sind die wörtlich belegten Reporting scopes der
-- Quelle, nicht mehr und nicht weniger:
--   einzelobjekt = „spatial object"
--   objektart    = „spatial object type"
--   datensatz    = „data set"
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['biome_geometrie','biome_baum','biome_artnachweis'] LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_lagegenauigkeit_bezug');
    EXECUTE format($f$
      ALTER TABLE %I ADD CONSTRAINT %I CHECK (
        lagegenauigkeit_bezug IS NULL
        OR lagegenauigkeit_bezug IN ('einzelobjekt','objektart','datensatz')
      )$f$, t, t || '_lagegenauigkeit_bezug');

    -- Der eigentliche Riegel: keine Meterangabe ohne Bezugsebene.
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_lagegenauigkeit_vollstaendig');
    EXECUTE format($f$
      ALTER TABLE %I ADD CONSTRAINT %I CHECK (
        lagegenauigkeit_m IS NULL OR lagegenauigkeit_bezug IS NOT NULL
      )$f$, t, t || '_lagegenauigkeit_vollstaendig');
  END LOOP;
END $$;

COMMENT ON COLUMN biome_baum.lagegenauigkeit_bezug IS
  'Bezugsebene der Lagegenauigkeit nach QUAL-LAGE: einzelobjekt | objektart | datensatz. '
  'Ohne sie ist die Meterangabe nicht interpretierbar und deshalb nicht speicherbar.';

-- ── (2) Mehrstämmigkeit und Einzelstämme ──────────────────────────────────

ALTER TABLE biome_baum
  ADD COLUMN IF NOT EXISTS mehrstaemmig BOOLEAN;

COMMENT ON COLUMN biome_baum.mehrstaemmig IS
  'NULL = nicht erhoben. Kein Vorgabewert: false hieße, jemand habe nachgesehen. '
  'Bestimmt nach BAUM-BE-06, welche Schutzschwelle gilt: 80 cm einstämmig, sonst 50 cm am stärksten Stamm.';

-- Welchem Stamm ein Umfang gilt. NULL = dem Baum als Ganzem.
ALTER TABLE biome_baum_messung
  ADD COLUMN IF NOT EXISTS stamm_nr INT;

ALTER TABLE biome_baum_messung
  DROP CONSTRAINT IF EXISTS biome_baum_messung_stamm_nr;
ALTER TABLE biome_baum_messung
  ADD CONSTRAINT biome_baum_messung_stamm_nr CHECK (
    stamm_nr IS NULL
    OR (stamm_nr >= 1 AND merkmal IN ('stammumfang','stammdurchmesser'))
  );

COMMENT ON COLUMN biome_baum_messung.stamm_nr IS
  'Laufende Nummer des Einzelstamms bei mehrstämmigen Bäumen. NULL = Gesamtbaum. '
  'BAUM-BE-06 knüpft den Schutz an den Umfang eines einzelnen Stamms, nicht an eine Summe.';

-- Sicht auf den maßgeblichen Stamm: der stärkste je Baum. Die Verordnung
-- fragt nach „mindestens einer der Stämme", also entscheidet das Maximum.
-- Bewusst nur die gültigen Messungen — eine ersetzte Fehleingabe darf keinen
-- Schutzstatus tragen.
DROP VIEW IF EXISTS v_biome_baum_staerkster_stamm;
CREATE VIEW v_biome_baum_staerkster_stamm
WITH (security_invoker = on) AS
SELECT DISTINCT ON (m.baum_id)
  m.baum_id,
  m.stamm_nr,
  m.wert          AS umfang_cm,
  m.messhoehe_cm,
  m.datum,
  m.id            AS messung_id,
  (SELECT count(DISTINCT g.stamm_nr)
     FROM biome_baum_messung g
    WHERE g.baum_id = m.baum_id
      AND g.merkmal = 'stammumfang'
      AND g.stamm_nr IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM biome_baum_messung n WHERE n.ersetzt_id = g.id)
  )               AS staemme_erfasst
FROM biome_baum_messung m
WHERE m.merkmal = 'stammumfang'
  AND m.stamm_nr IS NOT NULL
  AND m.einheit = 'cm'
  AND NOT EXISTS (SELECT 1 FROM biome_baum_messung n WHERE n.ersetzt_id = m.id)
ORDER BY m.baum_id, m.wert DESC, m.datum DESC;

COMMENT ON VIEW v_biome_baum_staerkster_stamm IS
  'Stärkster gültiger Einzelstamm je Baum, plus Anzahl erfasster Stämme. '
  'Grundlage der Schutzschwelle 50 cm nach BAUM-BE-06 bei Mehrstämmigkeit.';

COMMIT;
