-- ════════════════════════════════════════════════════════════════════════════
-- Rücknahme von 20260810_biome_altbestand_uebernahme.sql
--
-- Entfernt die übernommenen Bäume wieder und mit ihnen die Altangaben. Der
-- Ursprung in map_features bleibt unberührt — er wurde nie verändert. Die
-- Übernahme ist deshalb ohne Datenverlust rücknehmbar.
-- ════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_biome_baum_altangaben;

-- Nur was die Übernahme angelegt hat: Bäume mit einem Altbestandseintrag.
DELETE FROM biome_baum b
WHERE EXISTS (SELECT 1 FROM biome_altbestand_baum a WHERE a.baum_id = b.id);

DROP TABLE IF EXISTS biome_altbestand_baum;
DROP FUNCTION IF EXISTS biome_altbestand_uebernehmen();

-- Standorte, die allein für die Übernahme entstanden sind und jetzt leer sind.
DELETE FROM biome_standort s
WHERE s.angelegt_von IN (SELECT id FROM biome_person WHERE name = 'Systemübernahme')
  AND NOT EXISTS (SELECT 1 FROM biome_baum b WHERE b.standort_id = s.id);

DELETE FROM biome_methode WHERE id = 'M-IMPORT-ALTBESTAND';
DELETE FROM biome_standard WHERE id = 'BIOME-ALT-01';
DELETE FROM biome_person
WHERE name = 'Systemübernahme'
  AND NOT EXISTS (SELECT 1 FROM biome_standort s WHERE s.angelegt_von = biome_person.id);
