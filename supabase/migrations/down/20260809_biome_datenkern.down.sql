-- ═══════════════════════════════════════════════════════════════════════════
-- Rücknahme von 20260809_biome_datenkern.sql
--
-- Entfernt den kompletten BIOME-Datenkern wieder. Reihenfolge: Sichten,
-- Tabellen (abhängige zuerst), dann Funktionen.
--
-- Die Append-only-Trigger sperren UPDATE und DELETE, nicht DROP — DDL löst
-- keine Zeilentrigger aus. Die Tabellen lassen sich also regulär entfernen.
--
-- Achtung: Das ist ein echter Rückbau, keine Archivierung. Alle Nachweisdaten
-- in diesen Tabellen sind danach fort.
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_biome_kontrolle_gueltig;
DROP VIEW IF EXISTS v_biome_baum_bewertung_gueltig;
DROP VIEW IF EXISTS v_biome_baum_messung_gueltig;
DROP VIEW IF EXISTS v_biome_herkunft;
DROP VIEW IF EXISTS v_biome_wirkung_darstellbar;
DROP VIEW IF EXISTS v_biome_geometrie_aktuell;

-- Bericht
DROP TABLE IF EXISTS biome_berichtposition;
DROP TABLE IF EXISTS biome_bericht;

-- Wirkung
DROP TABLE IF EXISTS biome_analyse_wirkung;
DROP TABLE IF EXISTS biome_wirkungsfrage;

-- Maßnahmen
DROP TABLE IF EXISTS biome_massnahme;
DROP TABLE IF EXISTS biome_artenschutzpruefung;

-- Fernerkundung
DROP TABLE IF EXISTS biome_flugvergleich;
DROP TABLE IF EXISTS biome_analyse_zonalstatistik;
DROP TABLE IF EXISTS biome_indexdefinition;
DROP TABLE IF EXISTS biome_flugmaske;
DROP TABLE IF EXISTS biome_flugprodukt;
DROP TABLE IF EXISTS biome_flug;
DROP TABLE IF EXISTS biome_sensorband;
DROP TABLE IF EXISTS biome_fernerkundungssensor;

-- Sensorik
DROP TABLE IF EXISTS biome_messwert;
DROP TABLE IF EXISTS biome_messreihe;
DROP TABLE IF EXISTS biome_sensorgeraet;

-- Klima
DROP TABLE IF EXISTS biome_klimawert;
DROP TABLE IF EXISTS biome_klimabezug;

-- Fauna und Habitat
DROP TABLE IF EXISTS biome_habitatstruktur;
DROP TABLE IF EXISTS biome_habitattyp;
DROP TABLE IF EXISTS biome_artnachweis;
DROP TABLE IF EXISTS biome_erfassungsereignis;

-- Boden
DROP TABLE IF EXISTS biome_bodenwert;
DROP TABLE IF EXISTS biome_bodenprobe;

-- Vegetation
DROP TABLE IF EXISTS biome_vegetationsaufnahme;
DROP TABLE IF EXISTS biome_vegetationsflaeche;

-- Bäume
DROP TABLE IF EXISTS biome_baum_bewertung;
DROP TABLE IF EXISTS biome_baum_messung;
DROP TABLE IF EXISTS biome_kontrolle;
DROP TABLE IF EXISTS biome_baum;

-- Standort
DROP TABLE IF EXISTS biome_geometrie;
DROP TABLE IF EXISTS biome_standort;

-- Register
DROP TABLE IF EXISTS biome_skala_stufe;
DROP TABLE IF EXISTS biome_skala;
DROP TABLE IF EXISTS biome_methode;
DROP TABLE IF EXISTS biome_standard;
DROP TABLE IF EXISTS biome_person;

-- Werkzeug
DROP FUNCTION IF EXISTS biome_baci_pruefen();
DROP FUNCTION IF EXISTS biome_index_moeglich_pruefen();
DROP FUNCTION IF EXISTS biome_rls_intern(text);
DROP FUNCTION IF EXISTS biome_als_nachweis(text);
DROP FUNCTION IF EXISTS biome_updated_at();
DROP FUNCTION IF EXISTS biome_nachweis_methode_pruefen();
DROP FUNCTION IF EXISTS biome_korrektur_einfrieren();
DROP FUNCTION IF EXISTS biome_nur_anfuegen();
