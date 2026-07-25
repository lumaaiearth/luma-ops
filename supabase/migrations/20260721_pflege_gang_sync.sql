-- ════════════════════════════════════════════════════════════════════
-- Pflegegang ↔ Einsatz-Synchronisation (Phase 2)
--
-- Ein terminierter Pflegegang trägt job_id. Der Status des Einsatzes
-- führt: wird der Einsatz erledigt, ist der Gang erledigt; wird er
-- abgesagt, fällt der Gang auf 'geplant' zurück (und löst die
-- Verknüpfung), damit er neu terminiert werden kann. Als DB-Trigger,
-- damit es unabhängig davon gilt, wo der Einsatz-Status geändert wird
-- (Einsätze-Liste, Kalender, Wochenplan, App).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_pflege_gang_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    UPDATE pflege_gaenge SET status = 'erledigt'
    WHERE job_id = NEW.id AND status <> 'entfallen';
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE pflege_gaenge SET status = 'geplant', job_id = NULL
    WHERE job_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_jobs_pflege_gang ON jobs;
CREATE TRIGGER trg_jobs_pflege_gang
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW EXECUTE FUNCTION sync_pflege_gang_status();
