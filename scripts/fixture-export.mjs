// Exportiert den Ground-Truth-Datenstand aus dem lokalen Prüfstand als JSON
// für den Fixture-Modus der Oberfläche.
//
//   scripts/pg-local.sh start
//   npm run migration:test          # legt biome_pruefstand an und spielt ein
//   npm run fixture:export
//
// Warum überhaupt: Die Abnahme darf nicht gegen die Produktionsdatenbank
// laufen, und Testdaten dürfen nicht in die Produktion. Gleichzeitig muss die
// Oberfläche exakt die Zahlen zeigen, gegen die der Daten-Critic prüft. Also
// gibt es eine Quelle — fixtures/ground_truth.sql — und daraus wird beides
// gespeist.
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DB = process.env.DB || 'biome_pruefstand'
const ENV = {
  ...process.env,
  PGHOST: process.env.PGHOST || '/tmp',
  PGPORT: process.env.PGPORT || '5433',
  PGUSER: process.env.PGUSER || 'postgres',
}

/**
 * @param {string} sql
 * @returns {any}
 */
function frage(sql) {
  const roh = execFileSync('psql', ['-tAq', '-d', DB, '-c', sql], { env: ENV, encoding: 'utf8' })
  return JSON.parse(roh.trim() || 'null')
}

// Der Prüfstand enthält am Ende seines Laufs mehr als die Ground Truth: die
// Altbestands-Übernahme legt dort ihre eigenen Bäume an einem zweiten Standort
// ab. Ein Export „alles, was in der Datenbank steht" hing damit davon ab, an
// welcher Stelle des Prüfstands er lief — und lieferte einmal 12 und einmal 14
// Bäume. Deshalb ist der Export an den Standort aus fixtures/ground_truth.sql
// gebunden. Was der Fixture-Modus zeigt, ist damit genau das, was in der
// Ground Truth steht, und nichts sonst.
const STANDORT = '50000000-0000-4000-8000-000000000001'

// Ein einziges Dokument, damit die Oberfläche nichts zusammenfügen muss und
// der Fixture-Modus nicht heimlich eine eigene Logik bekommt.
const dokument = frage(`
select json_build_object(
  'erzeugt_aus', 'fixtures/ground_truth.sql',
  'standorte', (
    select coalesce(json_agg(json_build_object(
      'id', s.id, 'name', s.name, 'kuerzel', s.kuerzel, 'adresse', s.adresse,
      'crs', s.crs, 'flaeche_m2', s.flaeche_m2, 'geometrie', s.geometrie
    ) order by s.name), '[]'::json) from biome_standort s
    where s.id = '${STANDORT}'
  ),
  'personen', (
    select coalesce(json_agg(json_build_object(
      'id', p.id, 'name', p.name, 'organisation', p.organisation, 'qualifikation', p.qualifikation
    ) order by p.name), '[]'::json) from biome_person p
  ),
  'methoden', (
    select coalesce(json_agg(json_build_object(
      'id', m.id, 'name', m.name, 'beschreibung', m.beschreibung, 'einheit', m.einheit,
      'erfassungsart', m.erfassungsart, 'standard_id', m.standard_id
    ) order by m.id), '[]'::json) from biome_methode m
  ),
  'standards', (
    select coalesce(json_agg(json_build_object(
      'id', st.id, 'kurzname', st.kurzname, 'herausgeber', st.herausgeber,
      'quelle_url', st.quelle_url, 'abgerufen_am', st.abgerufen_am, 'zitat', st.zitat
    ) order by st.id), '[]'::json) from biome_standard st
  ),
  'baeume', (
    select coalesce(json_agg(json_build_object(
      'id', b.id, 'standort_id', b.standort_id, 'baumnummer', b.baumnummer,
      'art_wissenschaftlich', b.art_wissenschaftlich, 'art_deutsch', b.art_deutsch,
      'taxon_quelle', b.taxon_quelle, 'taxon_id', b.taxon_id,
      'taxon_confidence', b.taxon_confidence, 'taxon_matchtype', b.taxon_matchtype,
      'taxon_status', b.taxon_status, 'taxon_abgerufen_am', b.taxon_abgerufen_am,
      'gepflanzt_jahr', b.gepflanzt_jahr, 'position', b.position, 'crs', b.crs,
      'lagegenauigkeit_m', b.lagegenauigkeit_m,
      'lagegenauigkeit_bezug', b.lagegenauigkeit_bezug,
      'mehrstaemmig', b.mehrstaemmig, 'standorttyp', b.standorttyp,
      'angelegt_von', b.angelegt_von, 'created_at', b.created_at,
      'messungen', (
        select coalesce(json_agg(json_build_object(
          'id', m.id, 'merkmal', m.merkmal, 'wert', m.wert, 'einheit', m.einheit,
          'messhoehe_cm', m.messhoehe_cm, 'stamm_nr', m.stamm_nr,
          'messgeraet', m.messgeraet,
          'methode_id', m.methode_id, 'datum', m.datum,
          'erfasst_von', m.erfasst_von, 'erfasst_am', m.erfasst_am,
          'ersetzt_id', m.ersetzt_id, 'korrektur_grund', m.korrektur_grund,
          'vorzustand', m.vorzustand
        ) order by m.datum), '[]'::json)
        from biome_baum_messung m where m.baum_id = b.id
      ),
      'bewertungen', (
        select coalesce(json_agg(json_build_object(
          'id', w.id, 'skala_id', w.skala_id, 'stufe', w.stufe, 'begruendung', w.begruendung,
          'methode_id', w.methode_id, 'datum', w.datum, 'erfasst_von', w.erfasst_von,
          'ersetzt_id', w.ersetzt_id
        ) order by w.datum), '[]'::json)
        from biome_baum_bewertung w where w.baum_id = b.id
      ),
      'kontrollen', (
        select coalesce(json_agg(json_build_object(
          'id', k.id, 'art', k.art, 'datum', k.datum, 'durchgefuehrt_von', k.durchgefuehrt_von,
          'qualifikation', k.qualifikation, 'belaubungszustand', k.belaubungszustand,
          'ergebnis_text', k.ergebnis_text, 'massnahme_empfohlen', k.massnahme_empfohlen,
          'methode_id', k.methode_id, 'ersetzt_id', k.ersetzt_id
        ) order by k.datum desc), '[]'::json)
        from biome_kontrolle k where k.baum_id = b.id
      )
    ) order by b.baumnummer), '[]'::json) from biome_baum b
    where b.standort_id = '${STANDORT}'
  ),
  -- 3D-Aufnahmen (Gaussian Splats). Über die Lesesicht, damit der Fixture-Modus
  -- dieselben Felder sieht wie die Anwendung — Aufnahme und Flug zusammen.
  'splatAufnahmen', (
    select coalesce(json_agg(to_json(s) order by s.flug_datum desc), '[]'::json)
    from v_biome_splatfeld s where s.standort_id = '${STANDORT}'
  )
)
`)

if (!dokument) {
  console.error('Kein Datenstand gefunden. Läuft der Prüfstand und ist ground_truth.sql eingespielt?')
  process.exit(1)
}

// Stichdatum fest verdrahten: die richtigen Antworten in jobs/ beziehen sich
// auf den 2026-08-09. Ein wanderndes „heute" würde die Abnahme mit dem
// Jahreswechsel stillschweigend falsch machen.
dokument.stichdatum = '2026-08-09'

mkdirSync(join(ROOT, 'fixtures'), { recursive: true })
const ziel = join(ROOT, 'fixtures', 'ground_truth.json')
writeFileSync(ziel, JSON.stringify(dokument, null, 2) + '\n')

console.log(
  `fixtures/ground_truth.json geschrieben — ${dokument.standorte.length} Standort(e), ` +
  `${dokument.baeume.length} Bäume, ${dokument.standards.length} Registereinträge`,
)
