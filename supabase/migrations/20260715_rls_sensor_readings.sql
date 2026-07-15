-- Migration: RLS für sensor_readings (2026-07-15)
--
-- Bisher hatte sensor_readings kein RLS → mit dem öffentlichen anon-Key war die
-- gesamte Messwert-Historie frei les- UND schreibbar. Zugriff jetzt nur für
-- interne Nutzer (is_internal()), konsistent mit den übrigen Tabellen.
--
-- Hinweis LoRaWAN: Externe Sensoren schreiben NICHT direkt in die DB. Der
-- Network-Server (z. B. The Things Network) ruft einen HTTPS-Webhook auf, der
-- auf eine Supabase Edge Function zeigt; diese schreibt serverseitig mit dem
-- service_role-Key (umgeht RLS). Die Tabelle muss dafür NICHT öffentlich sein.

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_all ON sensor_readings;
CREATE POLICY internal_all ON sensor_readings FOR ALL TO authenticated
  USING (is_internal()) WITH CHECK (is_internal());
