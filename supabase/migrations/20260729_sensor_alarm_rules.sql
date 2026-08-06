-- Alarmregeln je Sensor: konfigurierbare Warn-/Kritisch-Schwellen nach unten
-- UND oben, Hysterese, Ruhezeit, Ziel-Telegram-Gruppe, Aufgaben-Board.
-- Leeres alarm_config = bisheriges Verhalten (abgeleitet aus threshold_low/high).
alter table public.sensors
  add column if not exists alarm_config jsonb not null default '{}'::jsonb,
  add column if not exists alarm_state  jsonb not null default '{}'::jsonb;

comment on column public.sensors.alarm_config is
  'Alarmregel: {aktiv, warn_low, krit_low, warn_high, krit_high, hysterese, ruhe_min, telegram, aufgabe, board_id, entwarnung}. Fehlende Felder werden in src/lib/sensorAlarm.js aus threshold_low/threshold_high abgeleitet.';
comment on column public.sensors.alarm_state is
  'Laufender Alarmzustand: {stufe, richtung, seit, gemeldet_ts, gemeldet_stufe} — steuert Hysterese, Ruhezeit und Entwarnung.';
