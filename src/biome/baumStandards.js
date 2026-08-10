/**
 * BIOME — belegte Skalen und Messvorschriften für Bäume.
 *
 * Alles hier hat einen Eintrag in `refs/standards/01-baeume.md` mit wörtlichem
 * Zitat. Was dort nicht steht, steht hier nicht und darf die Oberfläche nicht
 * anbieten.
 *
 * Die `quelle`-Angaben sind nicht Zierrat: die Oberfläche zeigt sie am
 * Anzeigeort, damit jede Einstufung überprüfbar bleibt.
 *
 * ── Was hier bewusst FEHLT und warum ──────────────────────────────────────
 *
 * · Eine Vitalitätsskala 0–4. Die Oberfläche führte bis 2026-08-09 eine
 *   fünfstufige Skala unter der Beschriftung „Roloff". Roloff kennt vier
 *   reguläre Stufen (VS 0–3) plus die Sonderausprägungen S und K. Die
 *   fünfstufige Fassung entspricht keiner belegten Quelle und ist entfernt.
 *
 * · Eine Auswahlliste „Verkehrssicherheit" mit den Stufen sicher /
 *   eingeschränkt / gefährdet / Fällung empfohlen. Für diese Einteilung gibt
 *   es kein frei zugängliches Dokument. Vor allem aber stellt eine Plattform
 *   damit Verkehrssicherheit fest — das darf sie nicht. Belegt ist stattdessen
 *   der Befund der Regelkontrolle im Freitext und die Angabe, ob die
 *   kontrollierende Person eine Maßnahme empfiehlt.
 *
 * · Eine Befallsstärke für den Eichenprozessionsspinner (kein/gering/mittel/
 *   stark). Keine belegte Quelle. Eine Beobachtung gehört in den Befundtext.
 *
 * · Zustandsstufen „nach FLL". Die FLL-Baumkontrollrichtlinien sind
 *   kostenpflichtig; frei ist eine neunseitige Leseprobe ohne Stufenkatalog.
 *   Siehe BLOCKED.md.
 */

/**
 * @typedef {object} Quelle
 * @property {string} id        Registereintrag, z. B. 'BAUM-DE-10'
 * @property {string} kurzname
 * @property {string} herausgeber
 * @property {string} url
 * @property {string} abgerufen ISO-Datum
 */

/** @type {Record<string, Quelle>} */
export const QUELLEN = {
  'BAUM-BE-06': {
    id: 'BAUM-BE-06',
    kurzname: 'Baumschutzverordnung Berlin, § 2 Abs. 1',
    herausgeber: 'Land Berlin (Wiedergabe FAOLEX)',
    url: 'https://faolex.fao.org/docs/pdf/ger74205.pdf',
    abgerufen: '2026-08-09',
  },
  'BAUM-DE-10': {
    id: 'BAUM-DE-10',
    kurzname: 'Vitalitätsbeurteilung nach Roloff',
    herausgeber: 'A. Roloff, TU Dresden / Deutsche Dendrologische Gesellschaft',
    url: 'https://ddg-web.de/files/DDG-Championtrees/ChT-Downloads/Vitalitaetsbeurteilung%20von%20Champion%20Trees.pdf',
    abgerufen: '2026-08-09',
  },
  'BAUM-DE-11': {
    id: 'BAUM-DE-11',
    kurzname: 'Musterdienstanweisung für Baumkontrollen 2021',
    herausgeber: 'BADK und GALK-Arbeitskreis Stadtbäume',
    url: 'https://galk.de/arbeitskreise/stadtbaeume/themenuebersicht/musterdienstanweisung-fuer-regelkontrollen-von-baeumen/',
    abgerufen: '2026-08-09',
  },
  'BAUM-INT-14': {
    id: 'BAUM-INT-14',
    kurzname: 'GBIF Backbone Taxonomy',
    herausgeber: 'GBIF Secretariat',
    url: 'https://api.gbif.org/v1/species/match',
    abgerufen: '2026-08-09',
  },
}

/**
 * Stammumfang: Messhöhe nach Berliner Baumschutzverordnung.
 * Die Verordnung nennt 1,30 m und eine Sonderregel für tiefe Kronenansätze.
 */
export const STAMMUMFANG = {
  messhoeheCm: 130,
  einheit: 'cm',
  quelle: QUELLEN['BAUM-BE-06'],
  hinweis: 'Gemessen in 1,30 m Höhe über dem Erdboden. Liegt der Kronenansatz darunter, wird unmittelbar unter dem Kronenansatz gemessen.',
  /** Schutzschwellen aus § 2 Abs. 1 — einstämmig und je Stamm bei Mehrstämmigkeit. */
  schwelleEinstaemmigCm: 80,
  schwelleMehrstaemmigCm: 50,
}

/**
 * Vitalitätsstufen nach Roloff. Vier reguläre Stufen und zwei
 * Sonderausprägungen, die keine Rangstufen sind.
 */
export const ROLOFF_VS = {
  id: 'SK-ROLOFF-VS',
  name: 'Vitalitätsstufe nach Roloff',
  quelle: QUELLEN['BAUM-DE-10'],
  bezug: 'Beurteilt wird die Oberkrone an Verzweigungsentwicklung und Kronenstruktur.',
  abgrenzung: 'Misst das längerfristige Wuchspotenzial, nicht den Laubverlust. Nicht in Kronenverlichtung umrechenbar.',
  stufen: [
    { stufe: '0', kurz: 'VS 0', bezeichnung: 'vollkommen vital', rang: 0 },
    { stufe: '1', kurz: 'VS 1', bezeichnung: 'geringfügig verminderte Vitalität', rang: 1 },
    { stufe: '2', kurz: 'VS 2', bezeichnung: 'deutlich verminderte Vitalität', rang: 2 },
    { stufe: '3', kurz: 'VS 3', bezeichnung: 'stark verminderte Vitalität, absterbende Hauptachsen', rang: 3 },
    { stufe: 'S', kurz: 'S', bezeichnung: 'bis 5 Jahre nach größeren Schnittmaßnahmen — nicht regulär beurteilbar', rang: null },
    { stufe: 'K', kurz: 'K', bezeichnung: 'gekappter Stamm — mindestens 10 Jahre nicht beurteilbar', rang: null },
  ],
}

/** Belaubungszustand — die zwei belegten Ausprägungen. */
export const BELAUBUNG = [
  { wert: 'belaubt', bezeichnung: 'belaubt' },
  { wert: 'unbelaubt', bezeichnung: 'unbelaubt' },
]

/** Kontrollarten aus der Musterdienstanweisung. */
export const KONTROLLARTEN = [
  { wert: 'regelkontrolle', bezeichnung: 'Regelkontrolle (Sichtkontrolle vom Boden)' },
  { wert: 'anlasskontrolle', bezeichnung: 'Zusatzkontrolle aus besonderem Anlass' },
  { wert: 'eingehende_untersuchung', bezeichnung: 'Eingehende Untersuchung' },
]

/**
 * Der eine Satz, der an jeder Stelle steht, an der Analytik neben einer
 * Kontrolle auftaucht. Bewusst zentral, damit er nicht an einer Stelle fehlt.
 */
export const KONTROLLE_HINWEIS =
  'Die Regelkontrolle ist eine visuelle Inaugenscheinnahme durch eine fachlich qualifizierte Person vom Boden aus. Auswertungen, Sensorwerte und Fernerkundung können sie weder ersetzen noch ein Kontrollintervall verlängern.'

/**
 * Ableitung des Schutzstatus nach Berliner Baumschutzverordnung.
 *
 * Ausdrücklich eine **Berechnung**, keine Rechtsauskunft: die Verordnung
 * knüpft den Schutz zusätzlich an die Baumart (alle Laubbäume, Waldkiefer,
 * Walnuss, Türkischer Baumhasel) und nimmt unter anderem Obstbäume,
 * Container- und Baumschulbäume aus. Ohne belegte Artzuordnung liefert die
 * Funktion deshalb `null` statt einer Behauptung.
 *
 * @param {{ stammumfangCm?: number|null, mehrstaemmig?: boolean, artBekannt?: boolean }} baum
 * @returns {{ status: 'erreicht'|'nicht_erreicht', schwelleCm: number, quelle: Quelle }|null}
 */
export function schutzschwelleErreicht(baum) {
  const umfang = baum.stammumfangCm
  if (umfang == null || !Number.isFinite(umfang)) return null
  if (baum.artBekannt === false) return null
  const schwelle = baum.mehrstaemmig
    ? STAMMUMFANG.schwelleMehrstaemmigCm
    : STAMMUMFANG.schwelleEinstaemmigCm
  return {
    status: umfang >= schwelle ? 'erreicht' : 'nicht_erreicht',
    schwelleCm: schwelle,
    quelle: STAMMUMFANG.quelle,
  }
}
