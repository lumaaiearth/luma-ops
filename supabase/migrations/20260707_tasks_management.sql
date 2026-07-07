-- ════════════════════════════════════════════════════════════════════════════
-- Aufgaben / Task Management — Notion-artiges Taskboard, vernetzt mit
-- clients (Kunde), projects (Projekt), jobs (Einsatz) und Team (assigned_users)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tasks (
  id             text PRIMARY KEY,
  title          text NOT NULL DEFAULT 'Neue Aufgabe',
  description    text DEFAULT '',
  status         text NOT NULL DEFAULT 'not_started'
                   CHECK (status IN ('not_started','in_progress','waiting','decision','done','archive')),
  priority       text DEFAULT 'medium'
                   CHECK (priority IN ('low','medium','high','extreme')),
  effort         text CHECK (effort IS NULL OR effort IN ('small','medium','large','complicated')),
  client_id      text REFERENCES public.clients(id)  ON DELETE SET NULL,
  project_id     text REFERENCES public.projects(id) ON DELETE SET NULL,
  job_id         text REFERENCES public.jobs(id)     ON DELETE SET NULL,
  assigned_users text[]  DEFAULT '{}',
  task_type      text,
  due_date       date,
  material       text[]  DEFAULT '{}',
  tools          text[]  DEFAULT '{}',
  summary        text    DEFAULT '',
  sort_order     integer DEFAULT 0,
  created_by     text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_client_id_idx  ON public.tasks (client_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx      ON public.tasks (status);

-- RLS: gleiche Policy wie alle internen Tabellen (nur internes Team)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_all ON public.tasks;
CREATE POLICY internal_all ON public.tasks
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

-- Realtime aktivieren (Publication ist nicht FOR ALL TABLES)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
