-- Rücknahme von 20261028_pflege_kalender.sql
DROP FUNCTION IF EXISTS public.kalender_status();
DROP TABLE IF EXISTS public.kalender_zuordnungen;
DROP TABLE IF EXISTS public.kalender_termine;
DROP TABLE IF EXISTS public.kalender_quellen;
ALTER TABLE public.pflege_gaenge DROP COLUMN IF EXISTS termin;
