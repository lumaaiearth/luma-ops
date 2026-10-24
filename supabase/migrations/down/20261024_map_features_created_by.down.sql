-- Rücknahme von 20261024_map_features_created_by.sql
ALTER TABLE public.map_features DROP COLUMN IF EXISTS created_by;
