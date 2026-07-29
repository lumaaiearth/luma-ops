-- Alarmvorlage je Projekt: dieselbe Regelstruktur wie sensors.alarm_config.
-- Sensoren mit alarm_config.modus = 'projekt' (oder leerer Konfiguration)
-- folgen dieser Vorlage; wer eine eigene Regel gesetzt hat, behält sie.
alter table public.projects
  add column if not exists alarm_defaults jsonb not null default '{}'::jsonb;

comment on column public.projects.alarm_defaults is
  'Alarmvorlage für die Sensoren des Projekts — gleiche Felder wie sensors.alarm_config. Auflösung in src/lib/sensorAlarm.js (alarmRegel/regelHerkunft).';
