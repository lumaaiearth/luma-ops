-- ════════════════════════════════════════════════════════════════════════════
-- map_features: wer hat das Objekt angelegt?
--
-- Für K7 (Arbeitsplan Karte): Mitarbeitende dürfen die Geometrie ihrer eigenen
-- Objekte der letzten 24 Stunden korrigieren — vorher konnte nur ein Admin
-- verschieben, und ein falsch gesetzter Baum blieb falsch, bis jemand mit
-- Adminrechten kam. Dafür muss die Tabelle wissen, wer angelegt hat.
--
-- · Neue Spalte created_by, Vorgabe auth.uid(): jede neue Zeile bekommt das
--   anlegende Konto, auch wenn der Client das Feld nicht mitschickt.
-- · Bestehende Zeilen bleiben NULL — für sie gilt weiter: nur Admin.
-- · Keine Änderung an den Policies. Die Grenze „eigene, 24 h“ zieht die
--   Oberfläche (src/lib/geometrieRecht.js); schreibend ist die Tabelle wie
--   bisher für alle internen Konten offen (Policy internal_all).
--
-- Rücknahme: supabase/migrations/down/20261024_map_features_created_by.down.sql
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.map_features
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.map_features.created_by IS
  'Anlegendes Konto (auth.uid() beim Einfügen). NULL bei Altbestand vor 2026-10-24.';
