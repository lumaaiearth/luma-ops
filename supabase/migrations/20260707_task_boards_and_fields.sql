-- ════════════════════════════════════════════════════════════════════════════
-- Bereiche (boards) = Projektmanagement-Ebene über den Aufgaben
-- + neue Aufgaben-Felder (Verantwortlich, Zeitraum, Ort) + Aufgaben-Fotos
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.boards (
  id          text PRIMARY KEY,
  name        text NOT NULL DEFAULT 'Neuer Bereich',
  emoji       text DEFAULT '📋',
  color       text DEFAULT '#08AA56',
  members     text[] DEFAULT '{}',
  client_id   text REFERENCES public.clients(id) ON DELETE SET NULL,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON public.boards;
CREATE POLICY internal_all ON public.boards
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Neue Aufgaben-Felder
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS board_id   text REFERENCES public.boards(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS owner_id   text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS location   text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS lat        double precision;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS lng        double precision;

CREATE INDEX IF NOT EXISTS tasks_board_id_idx ON public.tasks (board_id);

-- Aufgaben-Fotos (spiegelt job_photos; nutzt denselben Storage-Bucket 'job-photos')
CREATE TABLE IF NOT EXISTS public.task_photos (
  id          text PRIMARY KEY,
  task_id     text NOT NULL,
  photo_id    text NOT NULL,
  url         text NOT NULL,
  uploaded_by text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_photos_task_id_idx ON public.task_photos (task_id);

ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS internal_all ON public.task_photos;
CREATE POLICY internal_all ON public.task_photos
  FOR ALL TO authenticated USING (is_internal()) WITH CHECK (is_internal());

-- Realtime für boards aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
