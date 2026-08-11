-- Korrektur zu 20260808_gang_aufgabenkarten: Es gab bereits einen Bereich
-- „Pflege" (b_pflege) mit echten Aufgaben. Die Migration hatte ein zweites
-- Board angelegt, sodass „Pflege" doppelt in der Seitenleiste stand.
-- Die LV-Karten wandern auf das bestehende Board, das doppelte wird entfernt,
-- und der Trigger sucht den Bereich künftig über den Namen statt fester ID.

-- Zielbereich sicherstellen: b_pflege stammt aus dem App-Seed und fehlt in
-- einer nur aus Migrationen aufgebauten Umgebung — ohne ihn bricht das
-- UPDATE am Fremdschlüssel ab und das doppelte Board bliebe stehen.
INSERT INTO boards (id, name, emoji, color, sort_order)
VALUES ('b_pflege', 'Pflege', '🌿', '#08AA56', 0)
ON CONFLICT (id) DO NOTHING;

UPDATE tasks SET board_id = 'b_pflege' WHERE board_id = 'board_pflege';
DELETE FROM boards WHERE id = 'board_pflege';

CREATE OR REPLACE FUNCTION public.sync_gang_aufgabenkarte()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plan    pflege_plaene%ROWTYPE;
  v_proj    projects%ROWTYPE;
  v_flaeche text;
  v_base    text;
  v_title   text;
  v_desc    text;
  v_status  text;
  v_start   date;
  v_due     date;
  v_crew    text[] := '{}';
  v_board   text;
BEGIN
  SELECT * INTO v_plan FROM pflege_plaene WHERE id = NEW.plan_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO v_proj FROM projects WHERE id = v_plan.project_id;

  SELECT id INTO v_board FROM boards WHERE lower(name) = 'pflege' ORDER BY created_at NULLS FIRST LIMIT 1;
  IF v_board IS NULL THEN
    -- Kein Bereich „Pflege" vorhanden (frische Umgebung, umbenannt): einen
    -- anlegen. Ohne board_id landen die Karten sonst im Nirgendwo.
    v_board := 'b_pflege';
    INSERT INTO boards (id, name, emoji, color, sort_order)
    VALUES (v_board, 'Pflege', '🌿', '#08AA56', 0)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  v_start := to_date(NEW.jahr::text || '-' || lpad(NEW.kw::text, 2, '0'), 'IYYY-IW');
  v_due   := v_start + 4;

  v_flaeche := coalesce(v_proj.flaeche_code, v_proj.name, v_plan.project_id);

  -- "Frühjahrspflege H14 (KW 12)" → "Frühjahrspflege"
  v_base := coalesce(nullif(NEW.titel, ''), 'Pflegegang');
  v_base := regexp_replace(v_base, '\s*\(KW\s*\d+\)\s*$', '');
  -- Flächenkürzel am Ende abschneiden, ohne es als Muster zu behandeln:
  -- ein Kürzel mit Sonderzeichen (z. B. „P15+") würde als Regex danebengreifen
  -- oder den Trigger abbrechen lassen.
  v_base := btrim(v_base);
  IF right(v_base, length(v_flaeche) + 1) = ' ' || v_flaeche THEN
    v_base := btrim(left(v_base, length(v_base) - length(v_flaeche) - 1));
  END IF;
  IF v_base = '' THEN v_base := 'Pflegegang'; END IF;

  v_title := v_base || ' · ' || v_flaeche || ' · KW ' || NEW.kw;

  SELECT string_agg('– ' || (a->>'titel') || ' (' || (a->>'stunden') || ' h)', E'\n')
    INTO v_desc
    FROM jsonb_array_elements(coalesce(NEW.aufgaben, '[]'::jsonb)) a;

  v_status := CASE NEW.status
                WHEN 'geplant'    THEN 'not_started'
                WHEN 'terminiert' THEN 'in_progress'
                WHEN 'erledigt'   THEN 'done'
                WHEN 'entfallen'  THEN 'archive'
                ELSE 'not_started'
              END;

  IF NEW.job_id IS NOT NULL THEN
    SELECT coalesce(assigned_users, '{}') INTO v_crew FROM jobs WHERE id = NEW.job_id;
  END IF;

  INSERT INTO public.tasks (
    id, gang_id, board_id, title, description, summary, status, priority, task_type,
    project_id, client_id, job_id, assigned_users, start_date, due_date,
    created_by, created_at, updated_at
  ) VALUES (
    gen_random_uuid()::text, NEW.id, v_board, v_title, coalesce(v_desc, ''),
    round(coalesce(NEW.soll_stunden, 0) + coalesce(NEW.fahrt_stunden, 0), 2)::text || ' h · '
      || coalesce(NEW.crew_size, 2) || ' Personen',
    v_status, 'medium', 'pflege',
    v_plan.project_id, v_proj.client_id, NEW.job_id, coalesce(v_crew, '{}'), v_start, v_due,
    'lv-sync', now(), now()
  )
  ON CONFLICT (gang_id) DO UPDATE SET
    title          = EXCLUDED.title,
    description    = EXCLUDED.description,
    summary        = EXCLUDED.summary,
    status         = EXCLUDED.status,
    board_id       = coalesce(public.tasks.board_id, EXCLUDED.board_id),
    project_id     = EXCLUDED.project_id,
    client_id      = EXCLUDED.client_id,
    job_id         = EXCLUDED.job_id,
    start_date     = EXCLUDED.start_date,
    due_date       = EXCLUDED.due_date,
    assigned_users = CASE WHEN EXCLUDED.assigned_users = '{}'
                          THEN public.tasks.assigned_users
                          ELSE EXCLUDED.assigned_users END,
    updated_at     = now();

  RETURN NEW;
END $$;

