-- Migration: Sensor-Messwert-Historie (2026-07-10)
-- Ab jetzt wird jeder Sensor-Wert aufgezeichnet (gedrosselt, ~5-Min-Raster),
-- damit die künftige Sensor-Detailseite Verläufe zeigen kann.

CREATE TABLE IF NOT EXISTS sensor_readings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id  TEXT NOT NULL,
  value      NUMERIC NOT NULL,
  ts         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sensor_readings_sensor_ts
  ON sensor_readings (sensor_id, ts DESC);
