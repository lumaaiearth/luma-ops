-- #6 Papierkorb (Soft-Delete) für Aufgaben
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS tasks_deleted_at_idx ON public.tasks (deleted_at);

-- #2 Datei-Anhänge an Aufgaben (nutzt Storage-Bucket 'job-photos' mit taskfile-Präfix)
CREATE TABLE IF NOT EXISTS public.task_files (
  id          text PRIMARY KEY,
  task_id     text NOT NULL,
  name        text NOT NULL,
  url         text NOT NULL,
  file_type   text,
  size        bigint,
  uploaded_by text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_files_task_id_idx ON public.task_files (task_id);
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON public.task_files;
CREATE POLICY internal_all ON public.task_files FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());
