-- Checkliste (Teilaufgaben) + Herkunfts-Referenz (z.B. für Sensor-Automatik)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist  jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_ref text;
CREATE INDEX IF NOT EXISTS tasks_source_ref_idx ON public.tasks (source_ref);
