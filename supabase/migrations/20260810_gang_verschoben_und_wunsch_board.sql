-- ════════════════════════════════════════════════════════════════════
-- Zwei Korrekturen aus dem zweiten Debugging-Durchlauf
--
-- 1) Von Hand verschobene Pflegegänge überleben das Regenerieren.
--    Bisher löschte jede LV-Änderung alle 'geplant'-Gänge und baute sie
--    aus dem Muster neu — eine auf der Zeitachse gezogene Woche war damit
--    still wieder weg. Wer verschoben wurde, ist kein reiner Musterabdruck
--    mehr und wird behandelt wie ein terminierter Gang: er bleibt.
--
-- 2) Ein Kundenwunsch landete ohne Bereich, wenn kein Board „Pflege"
--    existiert — die Karte wäre unter „Ohne Bereich" versauert, während
--    der Kunde die Eingangsbestätigung sieht.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE pflege_gaenge
  ADD COLUMN IF NOT EXISTS verschoben boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN pflege_gaenge.verschoben IS
  'true = Woche wurde von Hand gesetzt (Zeitachse). Regenerieren aus dem LV überschreibt solche Gänge nicht.';

CREATE OR REPLACE FUNCTION public.kunde_wunsch_aufgabe()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_proj  projects%ROWTYPE;
  v_board text;
  v_titel text;
BEGIN
  SELECT * INTO v_proj FROM projects WHERE id = NEW.project_id;

  SELECT id INTO v_board FROM boards WHERE lower(name) = 'pflege' ORDER BY created_at NULLS FIRST LIMIT 1;
  IF v_board IS NULL THEN
    v_board := 'b_pflege';
    INSERT INTO boards (id, name, emoji, color, sort_order)
    VALUES (v_board, 'Pflege', '🌿', '#08AA56', 0)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  v_titel := CASE NEW.typ
               WHEN 'verschieben'    THEN 'Terminwunsch'
               WHEN 'zusatzleistung' THEN 'Zusatzwunsch'
               ELSE 'Hinweis'
             END
             || ' vom Kunden · ' || coalesce(v_proj.flaeche_code, v_proj.name, NEW.project_id)
             || CASE WHEN NEW.wunsch_kw IS NOT NULL THEN ' → KW ' || NEW.wunsch_kw ELSE '' END;

  INSERT INTO public.tasks (
    id, board_id, title, description, status, priority, task_type,
    project_id, client_id, created_by, created_at, updated_at
  ) VALUES (
    gen_random_uuid()::text, v_board, v_titel, coalesce(NEW.nachricht, ''),
    'not_started', 'high', 'orga',
    NEW.project_id, v_proj.client_id, 'kundenportal', now(), now()
  );
  RETURN NEW;
END $$;
