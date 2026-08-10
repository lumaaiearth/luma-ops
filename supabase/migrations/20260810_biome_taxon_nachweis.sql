-- ═══════════════════════════════════════════════════════════════════════════
-- Ein Taxonschlüssel ohne Nachweis seiner Auflösung ist keiner.
--
-- Befund des Methoden-Critics, Runde 4: Drei von fünf `taxon_id`-Werten in der
-- Ground Truth zeigten auf eine andere Art als die danebenstehende. Nachgeprüft
-- am belegten Endpunkt (BAUM-INT-14, `GET /v1/species/match`):
--
--   3189866  stand an *Acer platanoides* L.   → ist *Acer negundo* L.
--   5332048  stand an *Betula pendula* Roth   → ist *Betula procurva*
--                                                subsp. *schugnanica*, SYNONYM
--   5361896  stand an *Platanus × hispanica*  → ist *Ficus trigonata* L.,
--                                                Familie Moraceae
--
-- Die beiden richtigen Schlüssel waren genau die, die im Register wörtlich
-- abgedruckt sind. Die drei falschen waren die, die dort fehlen. Sie sahen aus
-- wie Referenzwerte, ohne je aus einer Auflösung zu stammen.
--
-- Auffallen konnte das nicht, weil der Datensatz nichts mitführte, woran man
-- eine Auflösung erkennt. BAUM-INT-14 verlangt genau das, wörtlich:
--
--   „Qualitätsfelder, die BIOME speichern muss: `confidence` (0–100) und
--    `matchType` (im Beispiel „EXACT"). Ein Treffer ohne diese beiden Werte
--    ist nicht überprüfbar."
--   „Korrekte Zitierweise eines Namens: wissenschaftlicher Name mit Autor plus
--    Datensatzzitat in der oben wörtlich belegten Form, mit Abrufdatum."
--
-- Nach dieser Migration ist ein `taxon_id` ohne Quelle, Trefferqualität,
-- Trefferart und Abrufdatum nicht mehr speicherbar. Ein aus dem Gedächtnis
-- gesetzter Schlüssel scheitert dann an der Datenbank statt an einem Critic.
--
-- Vorwärts und rückwärts lauffähig, wiederholbar.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE biome_baum
  ADD COLUMN IF NOT EXISTS taxon_confidence   INT,
  ADD COLUMN IF NOT EXISTS taxon_matchtype    TEXT,
  ADD COLUMN IF NOT EXISTS taxon_status       TEXT,
  ADD COLUMN IF NOT EXISTS taxon_abgerufen_am DATE;

COMMENT ON COLUMN biome_baum.taxon_confidence IS
  'confidence aus der GBIF-Match-Antwort, 0–100. Ohne sie ist der Treffer nicht überprüfbar (BAUM-INT-14).';
COMMENT ON COLUMN biome_baum.taxon_matchtype IS
  'matchType aus der GBIF-Match-Antwort, im belegten Beispiel „EXACT". Freitext: die Quelle zählt die möglichen Werte nicht auf, also zählt BIOME sie auch nicht auf.';
COMMENT ON COLUMN biome_baum.taxon_status IS
  'status aus der Match-Antwort, z. B. ACCEPTED oder SYNONYM. Ein SYNONYM-Treffer ist kein Fehler, aber eine Angabe, die sichtbar sein muss.';
COMMENT ON COLUMN biome_baum.taxon_abgerufen_am IS
  'Tag der Namensauflösung. Der Backbone hat pubDate 2023-08-28 und ist keine tagesaktuelle Nomenklaturquelle — ohne Datum ist der Treffer nicht einzuordnen.';

ALTER TABLE biome_baum DROP CONSTRAINT IF EXISTS biome_baum_taxon_confidence;
ALTER TABLE biome_baum ADD CONSTRAINT biome_baum_taxon_confidence CHECK (
  taxon_confidence IS NULL OR taxon_confidence BETWEEN 0 AND 100
);

-- Der Riegel: entweder kein Schlüssel, oder ein Schlüssel mit allem, woran
-- sich seine Herkunft überprüfen lässt.
ALTER TABLE biome_baum DROP CONSTRAINT IF EXISTS biome_baum_taxon_nachweis;
ALTER TABLE biome_baum ADD CONSTRAINT biome_baum_taxon_nachweis CHECK (
  taxon_id IS NULL
  OR (taxon_quelle       IS NOT NULL
  AND taxon_confidence   IS NOT NULL
  AND taxon_matchtype    IS NOT NULL
  AND taxon_abgerufen_am IS NOT NULL)
);

COMMIT;
