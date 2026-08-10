-- Rücknahme von 20260810_biome_taxon_nachweis.sql
--
-- Danach ist ein Taxonschlüssel wieder ohne Trefferqualität, Trefferart und
-- Abrufdatum speicherbar — also wieder nicht überprüfbar.

BEGIN;

ALTER TABLE biome_baum DROP CONSTRAINT IF EXISTS biome_baum_taxon_nachweis;
ALTER TABLE biome_baum DROP CONSTRAINT IF EXISTS biome_baum_taxon_confidence;

ALTER TABLE biome_baum
  DROP COLUMN IF EXISTS taxon_confidence,
  DROP COLUMN IF EXISTS taxon_matchtype,
  DROP COLUMN IF EXISTS taxon_status,
  DROP COLUMN IF EXISTS taxon_abgerufen_am;

COMMIT;
