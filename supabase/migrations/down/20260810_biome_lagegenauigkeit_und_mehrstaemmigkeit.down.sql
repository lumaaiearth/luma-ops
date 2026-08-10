-- Rücknahme von 20260810_biome_lagegenauigkeit_und_mehrstaemmigkeit.sql
--
-- Achtung, das ist keine folgenlose Rücknahme: mit `lagegenauigkeit_bezug`
-- fällt die Bezugsebene weg, und die verbliebenen Meterangaben sind danach
-- wieder uninterpretierbar. Ebenso gehen `mehrstaemmig` und die Zuordnung
-- einzelner Umfänge zu Stämmen verloren.

BEGIN;

DROP VIEW IF EXISTS v_biome_baum_staerkster_stamm;

ALTER TABLE biome_baum_messung DROP CONSTRAINT IF EXISTS biome_baum_messung_stamm_nr;
ALTER TABLE biome_baum_messung DROP COLUMN IF EXISTS stamm_nr;

ALTER TABLE biome_baum DROP COLUMN IF EXISTS mehrstaemmig;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['biome_geometrie','biome_baum','biome_artnachweis'] LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_lagegenauigkeit_vollstaendig');
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_lagegenauigkeit_bezug');
    EXECUTE format(
      'ALTER TABLE %I DROP COLUMN IF EXISTS lagegenauigkeit_bezug', t);
  END LOOP;
END $$;

COMMIT;
