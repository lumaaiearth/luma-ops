-- Zeiterfassung an Aufgaben koppeln
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS task_id text;
CREATE INDEX IF NOT EXISTS time_entries_task_id_idx ON public.time_entries (task_id);
