-- ════════════════════════════════════════════════════════════════════
-- Vorher/Nachher-Dokumentation je Einsatz
--
-- Einsatzfotos bekommen eine Phase. NULL bleibt zulässig — die bereits
-- vorhandenen Fotos sind weder als vorher noch als nachher gekennzeichnet
-- und sollen nicht nachträglich falsch einsortiert werden.
-- Die Kundenansicht gibt die Phase mit aus, damit das Portal Paare
-- gegenüberstellen kann.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.job_photos
  ADD COLUMN IF NOT EXISTS phase text
  CHECK (phase IS NULL OR phase IN ('vorher', 'nachher'));

CREATE INDEX IF NOT EXISTS job_photos_job_phase_idx ON public.job_photos (job_id, phase);

-- Kundenansicht um die Phase erweitern (weiterhin ohne uploaded_by).
-- Die neue Spalte kommt ans Ende: CREATE OR REPLACE VIEW kann bestehende
-- Spalten nicht umbenennen, und ein DROP würde die Rechte mitnehmen.
CREATE OR REPLACE VIEW v_kunde_fotos
WITH (security_invoker = false, security_barrier = true) AS
  SELECT ph.id, ph.url, ph.created_at,
         j.project_id, j.title AS einsatz_titel, j.date AS einsatz_datum,
         ph.phase
  FROM job_photos ph
  JOIN jobs j     ON j.id = ph.job_id
  JOIN projects p ON p.id = j.project_id
  JOIN clients  c ON c.id = p.client_id
  WHERE is_kunde() AND c.org_id IS NOT NULL AND c.org_id = user_org();
