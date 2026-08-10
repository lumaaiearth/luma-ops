-- ═══════════════════════════════════════════════════════════════════════════
-- Ground Truth für die Abnahme.
--
-- Ein kleiner, vollständig durchdachter Datenstand. Jede Zahl in den
-- Jobdateien unter jobs/ ist gegen genau diese Daten geprüft. Der
-- Daten-Critic liest Werte vom Bildschirm und vergleicht sie hiermit.
--
-- Deshalb: dieser Datenstand wird nicht „mal eben" geändert. Wer ihn ändert,
-- ändert die richtigen Antworten in jobs/ mit.
--
-- Bewusst eingebaute Härtefälle:
--   B-003  hat keinen Stammumfang            → darf nie als 0 erscheinen
--   B-007  Stammumfang korrigiert 850 → 85   → Korrekturkette sichtbar
--   B-009  Art unbestimmt                    → darf nicht geraten werden
--   B-011  mehrstämmig, drei Einzelstämme     → Schwelle 50 cm am stärksten Stamm
--   B-012  noch nie kontrolliert             → anderer Sachverhalt als überfällig
--   B-012  Stammform nicht erhoben           → Schutzschwelle nicht bestimmbar
--
-- Alle Registereinträge unten sind wörtliche Zitate aus refs/standards/.
-- Nichts hier ist erfunden.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Voraussetzungen aus dem übrigen Schema ────────────────────────────────
INSERT INTO clients (id, name) VALUES ('bew', 'BEW Wohnungsbaugesellschaft')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO projects (id, name, client_id) VALUES ('bew-mv', 'BEW Marzahn-Vorstadt', 'bew')
  ON CONFLICT (id) DO NOTHING;

-- ── Personen ──────────────────────────────────────────────────────────────
INSERT INTO biome_person (id, name, organisation, rolle, qualifikation) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Malte Larsen',  'LUMA', 'admin',        'Geschäftsführung'),
  ('a0000000-0000-4000-8000-000000000002', 'Jonas Feldmann','LUMA', 'kontrolleur',  'Fachagrarwirt Baumpflege, SKT-A'),
  ('a0000000-0000-4000-8000-000000000003', 'Rieke Sander',  'LUMA', 'crew',         'Landschaftsgärtnerin')
ON CONFLICT (id) DO NOTHING;

-- ── Standards-Register (Spiegel von refs/standards/01-baeume.md) ──────────
INSERT INTO biome_standard (id, domaene, kurzname, herausgeber, quelle_url, abgerufen_am, zitat, deckt, registerdatei, frei_zugaenglich) VALUES
  ('BAUM-BE-06', 'baum', 'Stammumfang — Messhöhe 1,30 m',
   'Land Berlin, Baumschutzverordnung (BaumSchVO) vom 11. Januar 1982, Wiedergabe in FAOLEX',
   'https://faolex.fao.org/docs/pdf/ger74205.pdf', DATE '2026-08-09',
   'Geschützt sind: 1. alle Laubbäume, 2. die Nadelgehölzart Waldkiefer sowie 3. die Obstbaumarten Walnuss und Türkischer Baumhasel, jeweils mit einem Stammumfang ab 80 cm, gemessen in einer Höhe von 1,30 m über dem Erdboden. Liegt der Kronenansatz unter dieser Höhe, ist der Stammumfang unmittelbar unter dem Kronenansatz maßgebend.',
   'Messhöhe für den Stammumfang: 1,30 m über dem Erdboden; Sonderregel bei tiefem Kronenansatz. Schutzschwelle 80 cm einstämmig; bei Mehrstämmigkeit genügt ein einzelner Stamm mit mindestens 50 cm. Einheit cm.',
   'refs/standards/01-baeume.md', true),

  ('BAUM-DE-10', 'baum', 'Roloff-Vitalitätsstufen VS 0–3 plus S und K',
   'Andreas Roloff, TU Dresden; veröffentlicht von der Deutschen Dendrologischen Gesellschaft',
   'https://ddg-web.de/files/DDG-Championtrees/ChT-Downloads/Vitalitaetsbeurteilung%20von%20Champion%20Trees.pdf',
   DATE '2026-08-09',
   'Folgende Vitalitätsstufen (VS) werden unterschieden (Beurteilung der Oberkrone). Damit wird das längerfristige Wuchspotenzial beurteilt, im Unterschied zur Bewertung der Kronentransparenz („Laubverlust"), die kurzfristige Veränderungen der Blattfläche/Kronendichte erfasst.',
   'Vitalitätsbeurteilung am Einzelbaum, Wertebereich 0, 1, 2, 3 sowie die Sonderausprägungen S und K. Beurteilt wird die Oberkrone anhand von Verzweigungsentwicklung und Kronenstruktur.',
   'refs/standards/01-baeume.md', true),

  ('BAUM-DE-11', 'baum', 'Regelkontrolle als fachlich qualifizierte Inaugenscheinnahme',
   'BADK und GALK-Arbeitskreis Stadtbäume, Musterdienstanweisung für Baumkontrollen 2021',
   'https://galk.de/arbeitskreise/stadtbaeume/themenuebersicht/musterdienstanweisung-fuer-regelkontrollen-von-baeumen/',
   DATE '2026-08-09',
   'Die Regelkontrolle erfolgt als Sichtkontrolle in Form der „fachlich qualifizierten Inaugenscheinnahme" vom Boden aus. Dabei ist jeder Baum einzeln und von allen Seiten im Kronen-, Stamm- und Wurzelbereich visuell zu kontrollieren.',
   'Erfassungsmethode Regelkontrolle: visuelle Sichtkontrolle vom Boden aus durch eine fachkundige Person, Bereiche Krone, Stamm, Wurzel. Pflichtfeld Belaubungszustand mit den Ausprägungen belaubt und unbelaubt.',
   'refs/standards/01-baeume.md', true),

  ('BAUM-INT-14', 'baum', 'GBIF Backbone Taxonomy als Namensreferenz',
   'GBIF Secretariat (Global Biodiversity Information Facility)',
   'https://api.gbif.org/v1/species/match', DATE '2026-08-09',
   'The GBIF Backbone Taxonomy is a single, synthetic management classification with the goal of covering all names GBIF is dealing with. Lizenz CC BY 4.0, DOI 10.15468/39omei, pubDate 2023-08-28.',
   'Referenzsystem für wissenschaftliche Baumartennamen inklusive Autorenkürzel. Pflichtfelder bei Übernahme: usageKey, scientificName, confidence, matchType.',
   'refs/standards/01-baeume.md', true)
ON CONFLICT (id) DO NOTHING;

-- ── Skalen: nur belegte Stufen, jede mit Wortlaut ─────────────────────────
INSERT INTO biome_skala (id, standard_id, name, domaene, bezug, einheit) VALUES
  ('SK-ROLOFF-VS', 'BAUM-DE-10', 'Vitalitätsstufe nach Roloff', 'baum',
   'Oberkrone des Einzelbaums, beurteilt an Verzweigungsentwicklung und Kronenstruktur', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO biome_skala_stufe (skala_id, stufe, reihenfolge, bezeichnung, definition_zitat) VALUES
  ('SK-ROLOFF-VS', '0', 0, 'vollkommen vital',
   'Die Verzweigung ist netzartig und gleichmäßig + dicht, Langtriebe dominieren auch an Seitenachsen, meist gleichmäßige Belaubung ohne größer Kronenlücken.'),
  ('SK-ROLOFF-VS', '1', 1, 'geringfügig verminderte Vitalität',
   'Aus der Oberkrone ragen spießartige bis längliche Zweigstrukturen heraus, die durch vermindertes Längenwachstum der Hauptachsen mit seitlich (fast) nur noch Kurztrieben bzw. Kurztriebketten zustande kommen. Die Krone wirkt dadurch außen zerfranst.'),
  ('SK-ROLOFF-VS', '2', 2, 'deutlich verminderte Vitalität',
   'Infolge von Kurztriebbildung nun auch an den Hauptachsen bilden sich im Winter krallenartige äußere Zweigstrukturen mit pinselartiger/büscheliger Belaubung und inneren Kronenlücken. Dieser Zustand kann altersbedingt eintreten und lange anhalten, ohne dass der Baum deshalb absterben muss.'),
  ('SK-ROLOFF-VS', '3', 3, 'stark verminderte Vitalität, absterbende Hauptachsen',
   'Verzweigung wie VS 2, jedoch zusätzlich als deutliches Warnsignal mit abtsterbenden Hauptachsen, die Krone zerfällt in Teilkronen. Diese Bäume sind hinsichtlich der Verkehrssicherheit und Lebenserwartung als problematisch einzustufen.'),
  ('SK-ROLOFF-VS', 'S', 4, 'Sonderfall: bis 5 Jahre nach größeren Schnittmaßnahmen',
   'Bei Bäumen nach umfangreichen Schnittmaßnahmen (z.B. Kronen(teil)einkürzung) innerhalb der letzten 5 Jahre ist eine normale Vitalitätsbeurteilung nach VS 0-3 nicht möglich/sinnvoll, da die Verzweigung nach der Schnittmaßnahme gestört und zunächst nicht mehr sinnvoll nutzbar für den Zustand des Gesamtbaumes ist.'),
  ('SK-ROLOFF-VS', 'K', 5, 'Sonderfall: gekappter Stamm oder gekappte Stämmlinge',
   'Eine Vitalitätsbeurteilung ist mindestens 10 Jahre nach der Maßnahme nicht mehr sinnvoll, da die Verzweigung vollkommen gestört bzw. beseitigt worden ist und erst wieder neu aufgebaut werden muss.')
ON CONFLICT (skala_id, stufe) DO NOTHING;

-- ── Methodenverzeichnis ───────────────────────────────────────────────────
INSERT INTO biome_methode (id, domaene, name, beschreibung, standard_id, einheit, bezugsflaeche, zeitbezug, erfassungsart) VALUES
  ('M-BAUM-UMFANG', 'baum', 'Stammumfang mit Maßband in 1,30 m Höhe',
   'Messung des Stammumfangs mit dem Umfangmaßband in 1,30 m Höhe über dem Erdboden. Liegt der Kronenansatz darunter, wird unmittelbar unter dem Kronenansatz gemessen und dies vermerkt.',
   'BAUM-BE-06', 'cm', 'je Baum', 'Zeitpunkt', 'person_vor_ort'),
  ('M-BAUM-REGELKONTROLLE', 'baum', 'Regelkontrolle, Sichtkontrolle vom Boden',
   'Fachlich qualifizierte Inaugenscheinnahme vom Boden aus, jeder Baum einzeln und von allen Seiten, Bereiche Krone, Stamm und Wurzel.',
   'BAUM-DE-11', NULL, 'je Baum', 'Zeitpunkt', 'person_vor_ort'),
  ('M-BAUM-VITALITAET', 'baum', 'Vitalitätsbeurteilung nach Roloff',
   'Beurteilung der Oberkrone anhand von Verzweigungsentwicklung und Kronenstruktur, Einstufung nach VS 0 bis VS 3 beziehungsweise S oder K.',
   'BAUM-DE-10', NULL, 'je Baum', 'Zeitpunkt', 'person_vor_ort'),
  ('M-TAXON-GBIF', 'baum', 'Artbestimmung mit Abgleich gegen GBIF Backbone',
   'Bestimmung im Feld, anschließend Abgleich des wissenschaftlichen Namens gegen die GBIF Backbone Taxonomy; usageKey, scientificName, confidence und matchType werden übernommen.',
   'BAUM-INT-14', NULL, 'je Baum', 'Zeitpunkt', 'person_vor_ort')
ON CONFLICT (id) DO NOTHING;

-- ── Standort ──────────────────────────────────────────────────────────────
INSERT INTO biome_standort (id, project_id, client_id, name, kuerzel, adresse, geometrie, crs, flaeche_m2, angelegt_von) VALUES
  ('50000000-0000-4000-8000-000000000001', 'bew-mv', 'bew',
   'Marzahner Promenade Nord', 'MPN', 'Marzahner Promenade, 12679 Berlin',
   '{"type":"Polygon","coordinates":[[[13.5430,52.5455],[13.5452,52.5455],[13.5452,52.5468],[13.5430,52.5468],[13.5430,52.5455]]]}'::jsonb,
   'EPSG:4326', 2140, 'a0000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Zwölf Bäume ───────────────────────────────────────────────────────────
-- B-009 bleibt bewusst ohne Art: unbestimmt ist ein Ergebnis, kein Fehlwert.
-- `lagegenauigkeit_m` stand hier auf 3 und erschien als „± 3 m" hinter jeder
-- Koordinate. Die Zahl war frei erfunden: das Register hält unter DATUM-ETRS89
-- ausdrücklich fest, „eine konkrete Meterangabe ist aus dieser Quelle nicht
-- belegbar", und QUAL-LAGE verlangt zusätzlich die Bezugsebene. Beides fehlte.
-- Die Spalte ist jetzt leer, und die Bezugsebene ist Pflicht, sobald sie es
-- nicht mehr ist.
--
-- `mehrstaemmig` ist dreiwertig: NULL heißt „niemand hat nachgesehen". Bei
-- B-012 — dem nie kontrollierten Baum — ist das der zutreffende Zustand.
--
-- Die Taxonschlüssel sind am 2026-08-10 gegen den in BAUM-INT-14 belegten
-- Endpunkt aufgelöst worden, nicht gesetzt. Drei standen bis dahin falsch:
-- 3189866 ist *Acer negundo*, 5332048 eine Betula-Unterart mit Status SYNONYM,
-- 5361896 *Ficus trigonata*. Sie sahen aus wie Referenzwerte und waren keine.
-- Deshalb stehen jetzt Trefferqualität, Trefferart und Abrufdatum daneben —
-- ohne die drei ist ein Schlüssel seit der Migration nicht mehr speicherbar.
INSERT INTO biome_baum (id, standort_id, baumnummer, art_wissenschaftlich, art_deutsch, taxon_quelle, taxon_id, taxon_confidence, taxon_matchtype, taxon_status, taxon_abgerufen_am, gepflanzt_jahr, position, crs, lagegenauigkeit_m, lagegenauigkeit_bezug, mehrstaemmig, standorttyp, angelegt_von) VALUES
  ('b0000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','B-001','Tilia cordata Mill.','Winterlinde','GBIF Backbone Taxonomy','3152047',100,'EXACT','ACCEPTED',DATE '2026-08-10',1998,'{"type":"Point","coordinates":[13.5432,52.5457]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','B-002','Tilia cordata Mill.','Winterlinde','GBIF Backbone Taxonomy','3152047',100,'EXACT','ACCEPTED',DATE '2026-08-10',1998,'{"type":"Point","coordinates":[13.5434,52.5458]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001','B-003','Tilia cordata Mill.','Winterlinde','GBIF Backbone Taxonomy','3152047',100,'EXACT','ACCEPTED',DATE '2026-08-10',1998,'{"type":"Point","coordinates":[13.5436,52.5459]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000001','B-004','Tilia cordata Mill.','Winterlinde','GBIF Backbone Taxonomy','3152047',100,'EXACT','ACCEPTED',DATE '2026-08-10',1998,'{"type":"Point","coordinates":[13.5438,52.5460]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000001','B-005','Acer platanoides L.','Spitzahorn','GBIF Backbone Taxonomy','3189846',100,'EXACT','ACCEPTED',DATE '2026-08-10',2004,'{"type":"Point","coordinates":[13.5440,52.5461]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000001','B-006','Acer platanoides L.','Spitzahorn','GBIF Backbone Taxonomy','3189846',100,'EXACT','ACCEPTED',DATE '2026-08-10',2004,'{"type":"Point","coordinates":[13.5442,52.5462]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000001','B-007','Acer platanoides L.','Spitzahorn','GBIF Backbone Taxonomy','3189846',100,'EXACT','ACCEPTED',DATE '2026-08-10',2004,'{"type":"Point","coordinates":[13.5444,52.5463]}'::jsonb,'EPSG:4326',NULL,NULL,false,'strasse','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000008','50000000-0000-4000-8000-000000000001','B-008','Quercus robur L.','Stieleiche','GBIF Backbone Taxonomy','2878688',100,'EXACT','ACCEPTED',DATE '2026-08-10',1972,'{"type":"Point","coordinates":[13.5446,52.5464]}'::jsonb,'EPSG:4326',NULL,NULL,false,'park','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000009','50000000-0000-4000-8000-000000000001','B-009',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'{"type":"Point","coordinates":[13.5448,52.5465]}'::jsonb,'EPSG:4326',NULL,NULL,false,'park','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000010','50000000-0000-4000-8000-000000000001','B-010','Quercus robur L.','Stieleiche','GBIF Backbone Taxonomy','2878688',100,'EXACT','ACCEPTED',DATE '2026-08-10',1972,'{"type":"Point","coordinates":[13.5450,52.5466]}'::jsonb,'EPSG:4326',NULL,NULL,false,'park','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000011','50000000-0000-4000-8000-000000000001','B-011','Betula pendula Roth','Sandbirke','GBIF Backbone Taxonomy','5331916',100,'EXACT','ACCEPTED',DATE '2026-08-10',2011,'{"type":"Point","coordinates":[13.5449,52.5467]}'::jsonb,'EPSG:4326',NULL,NULL,true,'park','a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000012','50000000-0000-4000-8000-000000000001','B-012','Platanus × hispanica Mill. ex Münchh.','Platane','GBIF Backbone Taxonomy','7400250',100,'EXACT','ACCEPTED',DATE '2026-08-10',1965,'{"type":"Point","coordinates":[13.5447,52.5467]}'::jsonb,'EPSG:4326',NULL,NULL,NULL,'park','a0000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ── Stammumfänge ──────────────────────────────────────────────────────────
-- B-003 fehlt bewusst. B-007 kommt weiter unten als Korrekturkette.
INSERT INTO biome_baum_messung (id, baum_id, merkmal, wert, einheit, messhoehe_cm, messgeraet, methode_id, erfasst_von, datum) VALUES
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','stammumfang', 92,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-14'),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','stammumfang', 88,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-14'),
  ('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004','stammumfang', 95,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-14'),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000005','stammumfang', 61,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-14'),
  ('c0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000006','stammumfang', 58,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-14'),
  ('c0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000008','stammumfang',214,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'),
  ('c0000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000009','stammumfang', 47,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'),
  ('c0000000-0000-4000-8000-000000000010','b0000000-0000-4000-8000-000000000010','stammumfang',236,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'),
  ('c0000000-0000-4000-8000-000000000012','b0000000-0000-4000-8000-000000000012','stammumfang',298,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15')
ON CONFLICT (id) DO NOTHING;

-- B-007: erst der Zahlendreher, dann die Korrektur. Der Vorzustand wird vom
-- Trigger eingefroren; der ursprüngliche Datensatz bleibt bestehen.
INSERT INTO biome_baum_messung (id, baum_id, merkmal, wert, einheit, messhoehe_cm, messgeraet, methode_id, erfasst_von, datum) VALUES
  ('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000007','stammumfang',850,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-14')
ON CONFLICT (id) DO NOTHING;

-- Das `datum` ist der Tag der Messung, nicht der Tag der Eingabe. Bis
-- 2026-08-10 stand hier 2026-04-14 — das Datum der Ersterfassung durch
-- R. Sander —, während der Korrekturgrund von einer Nachmessung am 2026-04-22
-- durch J. Feldmann sprach. Die Herkunftstafel zeigte daraufhin „14.04.2026"
-- neben „Jonas Feldmann": eine Paarung aus Datum und Person, die es so nie
-- gegeben hat. Der Methoden-Critic hat das zu Recht als erfunden gewertet.
-- Jetzt steht am Datensatz der Tag, an dem gemessen wurde.
INSERT INTO biome_baum_messung (id, baum_id, merkmal, wert, einheit, messhoehe_cm, messgeraet, methode_id, erfasst_von, datum, ersetzt_id, korrektur_grund) VALUES
  ('c0000000-0000-4000-8000-000000000077','b0000000-0000-4000-8000-000000000007','stammumfang', 85,'cm',130,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000002', DATE '2026-04-22',
   'c0000000-0000-4000-8000-000000000007','Zahlendreher bei der Eingabe am 14.04.2026: 850 cm statt 85 cm. Am 22.04.2026 nachgemessen, Wert bestätigt.')
ON CONFLICT (id) DO NOTHING;

-- ── Einzelstämme B-011 ────────────────────────────────────────────────────
-- Der fünfte Härtefall, seit 2026-08-10: eine mehrstämmige Sandbirke.
--
-- B-011 hatte bis dahin einen Gesamtumfang von 74 cm. Den gibt es bei diesem
-- Baum nicht: die Stämme trennen sich unterhalb von 1,30 m, dort ist kein
-- einzelner Umfang zu messen. Der Wert ist ersatzlos entfernt und durch die
-- drei Einzelstämme ersetzt.
--
-- Der Fall ist scharf gewählt: der stärkste Stamm misst 58 cm und liegt damit
-- ÜBER der Schwelle von 50 cm — der Baum ist geschützt. Die alte Rechnung
-- hätte 74 cm gegen 80 cm gehalten und „nicht geschützt" ausgegeben. Zwei
-- verschiedene Antworten, und die alte war die falsche.
INSERT INTO biome_baum_messung (id, baum_id, merkmal, wert, einheit, messhoehe_cm, stamm_nr, messgeraet, methode_id, erfasst_von, datum) VALUES
  ('c0000000-0000-4000-8000-000000000111','b0000000-0000-4000-8000-000000000011','stammumfang',58,'cm',130,1,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'),
  ('c0000000-0000-4000-8000-000000000112','b0000000-0000-4000-8000-000000000011','stammumfang',31,'cm',130,2,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15'),
  ('c0000000-0000-4000-8000-000000000113','b0000000-0000-4000-8000-000000000011','stammumfang',21,'cm',130,3,'Umfangmaßband','M-BAUM-UMFANG','a0000000-0000-4000-8000-000000000003', DATE '2026-04-15')
ON CONFLICT (id) DO NOTHING;

-- ── Kontrollen ────────────────────────────────────────────────────────────
-- 2026 kontrolliert: B-001, B-003, B-004, B-006, B-007, B-009, B-010  (7)
-- 2026 nicht kontrolliert: B-002, B-005, B-008, B-011, B-012          (5)
-- davon B-012 überhaupt noch nie.
INSERT INTO biome_kontrolle (id, standort_id, baum_id, art, datum, durchgefuehrt_von, qualifikation, belaubungszustand, ergebnis_text, massnahme_empfohlen, methode_id, erfasst_von) VALUES
  ('d0000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','regelkontrolle', DATE '2026-05-12','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Krone, Stamm und Wurzelbereich ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','regelkontrolle', DATE '2026-05-12','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Trockenäste im oberen Kronendrittel.', true,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004','regelkontrolle', DATE '2026-05-12','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000006','regelkontrolle', DATE '2026-05-13','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Rindenverletzung am Stammfuß, überwallt.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000007','regelkontrolle', DATE '2026-05-13','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000009','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000009','regelkontrolle', DATE '2026-05-13','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Ohne Befund. Art im Feld nicht sicher bestimmbar.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000010','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000010','regelkontrolle', DATE '2026-05-13','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Höhlung im Starkast, weiter beobachten.', true,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  -- Vorjahr: diese vier sind 2026 offen, aber nicht ohne Historie.
  ('d0000000-0000-4000-8000-000000000102','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','regelkontrolle', DATE '2025-06-03','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000105','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','regelkontrolle', DATE '2025-06-03','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','belaubt','Ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000108','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000008','regelkontrolle', DATE '2025-11-18','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','unbelaubt','Ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000111','50000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000011','regelkontrolle', DATE '2025-11-18','a0000000-0000-4000-8000-000000000002','Fachagrarwirt Baumpflege, SKT-A','unbelaubt','Ohne Befund.', false,'M-BAUM-REGELKONTROLLE','a0000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ── Vitalitätsbeurteilungen (nur wo tatsächlich beurteilt) ────────────────
INSERT INTO biome_baum_bewertung (id, baum_id, kontrolle_id, skala_id, stufe, begruendung, methode_id, erfasst_von, datum) VALUES
  ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','SK-ROLOFF-VS','0','Oberkrone netzartig verzweigt, Langtriebe dominieren.','M-BAUM-VITALITAET','a0000000-0000-4000-8000-000000000002', DATE '2026-05-12'),
  ('e0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000003','SK-ROLOFF-VS','1','Außen zerfranste Krone, spießartige Zweigstrukturen.','M-BAUM-VITALITAET','a0000000-0000-4000-8000-000000000002', DATE '2026-05-12'),
  ('e0000000-0000-4000-8000-000000000010','b0000000-0000-4000-8000-000000000010','d0000000-0000-4000-8000-000000000010','SK-ROLOFF-VS','2','Innere Kronenlücken, büschelige Belaubung.','M-BAUM-VITALITAET','a0000000-0000-4000-8000-000000000002', DATE '2026-05-13')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── Erwartete Antworten, gegen die die Jobs geprüft werden ────────────────
--
--   Bäume gesamt am Standort                          12
--   Arten: Tilia cordata 4, Acer platanoides 3,
--          Quercus robur 2, Betula pendula 1,
--          Platanus × hispanica 1, unbestimmt 1
--   Ohne Kontrolle im Jahr 2026                        5  (B-002, B-005, B-008, B-011, B-012)
--   Davon noch nie kontrolliert                        1  (B-012)
--   Ohne Stammumfang                                   1  (B-003)
--     B-011 zählt NICHT dazu: gemessen wurde je Stamm, nicht am Gesamtbaum.
--   Gültiger Stammumfang B-007                        85 cm, gemessen in 130 cm Höhe
--   Ersetzter Stammumfang B-007                      850 cm, mit Korrekturgrund
--   Vitalität beurteilt bei                            3 Bäumen (B-001 VS 0, B-003 VS 1, B-010 VS 2)
--   Mehrstämmig                                        1  (B-011: 58, 31, 21 cm)
--     stärkster Stamm 58 cm ≥ 50 cm → Schwelle erreicht
--   Stammform nicht erhoben                            1  (B-012)
--     → Schutzschwelle nicht bestimmbar, keine Zahl
--   Lagegenauigkeit                                    bei keinem Baum erhoben
--   Korrektur B-007                                    Messung 22.04.2026, J. Feldmann
