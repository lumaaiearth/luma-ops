-- Rücknahme von 20260815_biome_splatfeld.sql
--
-- Danach kennt BIOME keine Splat-Aufnahmen mehr. Die Ebene „3D-Aufnahmen"
-- steht dann wieder auf „nichts erfasst" — die Oberfläche bricht nicht, weil
-- sie eine leere Ebene ohnehin benannt anzeigt.
--
-- Der Registereintrag FE-GS-23 und die beiden Methoden bleiben stehen: ein
-- Beleg wird nicht dadurch falsch, dass gerade keine Aufnahme daran hängt.
-- Wer sie wirklich loswerden will, muss sie einzeln löschen — sie sind über
-- ON DELETE RESTRICT gegen versehentliches Mitreißen gesichert.

BEGIN;

DROP VIEW IF EXISTS v_biome_splatfeld;

DROP TRIGGER IF EXISTS biome_splatfeld_produktart ON biome_splatfeld;
DROP FUNCTION IF EXISTS biome_splatfeld_produktart_pruefen();

DROP TABLE IF EXISTS biome_splatfeld;

-- Produktart zurücknehmen. Schlägt fehl, solange noch ein Flugprodukt der Art
-- 'splat' existiert — das ist Absicht: erst die Daten klären, dann das Schema.
ALTER TABLE biome_flugprodukt DROP CONSTRAINT IF EXISTS biome_flugprodukt_art_check;
ALTER TABLE biome_flugprodukt ADD CONSTRAINT biome_flugprodukt_art_check
  CHECK (art IN ('reflektanz','radianz','digitalwert','orthomosaik','hoehenmodell','maske'));

COMMIT;
