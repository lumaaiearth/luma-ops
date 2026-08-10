-- ═══════════════════════════════════════════════════════════════════════════
-- Alt-Fixture: bildet den echten Produktionsstand von map_features nach.
--
-- Beide Zeilen sind Abbilder der tatsächlich vorhandenen Bäume (Projekt
-- „MV Tiny Forest", Stand 2026-08-09). Sie sind absichtlich unverändert
-- übernommen, samt der Werte aus den entfernten Skalen — genau an ihnen muss
-- sich die Übernahme bewähren.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO clients (id, name) VALUES ('bew-alt', 'BEW (Altbestand)')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO projects (id, name, client_id, geojson)
VALUES ('mv-bew', 'MV Tiny Forest', 'bew-alt', NULL)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO map_features (id, project_id, feature_type, geometry, properties, label, created_at) VALUES
  ('w6jdyxc0', 'mv-bew', 'tree',
   '{"type":"Point","coordinates":[13.5601,52.5462]}'::jsonb,
   '{"photos":[{"id":"hd73nu6z","url":"https://example.invalid/tree-w6jdyxc0/hd73nu6z.jpg"}],
     "baumnummer":"B-0001","eps_befall":"kein","vitalitaet":"2",
     "schutzstatus":"nicht_geschuetzt","baumart_latein":"Liquidambar styraciflua",
     "stammumfang_cm":"105","baumart_deutsch":"Amberbaum",
     "verkehrssicherheit":"gefaellung"}'::jsonb,
   'Amberbaum', TIMESTAMPTZ '2026-07-12 10:46:05.11+00'),
  ('q87nqnvr', 'mv-bew', 'tree',
   '{"type":"Point","coordinates":[13.5603,52.5463]}'::jsonb,
   '{"baumnummer":"B-0002","baumart_latein":"Malus spec.","baumart_deutsch":"Apfel (Zierapfel)"}'::jsonb,
   'Apfel (Zierapfel)', TIMESTAMPTZ '2026-07-12 10:46:15.596+00')
ON CONFLICT (id) DO NOTHING;
