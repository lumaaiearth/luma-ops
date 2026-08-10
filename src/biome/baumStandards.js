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
  /**
   * Schutzschwellen aus § 2 Abs. 1.
   *
   * Einstämmig: 80 cm. Mehrstämmig: 50 cm — und zwar wörtlich „wenn mindestens
   * einer der Stämme einen Mindestumfang von 50 cm aufweist". Also nicht 50 cm
   * je Stamm und erst recht keine Summe: es entscheidet der stärkste Stamm.
   */
  schwelleEinstaemmigCm: 80,
  schwelleStaerksterStammCm: 50,
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
  /**
   * Der Rang der Quelle gehört an die Stufe. Das Dokument heißt wörtlich
   * „Vitalitätsbeurteilung von Champion Trees (Vorschlag)" und ist laut
   * Register „eine Kurzbeschreibung des Verfahrens durch den Urheber, nicht um
   * eine Norm". Ohne diesen Hinweis steht die Einstufung verbindlicher da, als
   * ihre Quelle sie trägt.
   */
  quellenstatus: 'Verfahrensvorschlag des Urhebers („Vitalitätsbeurteilung von Champion Trees (Vorschlag)"), keine Norm und kein Regelwerk.',
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

/** Anzeigenamen der Kontrollarten, für Tabellen und Tafeln. */
export const KONTROLLART_NAME = {
  regelkontrolle: 'Regelkontrolle',
  anlasskontrolle: 'Zusatzkontrolle',
  eingehende_untersuchung: 'Eingehende Untersuchung',
}

/** Kontrollarten aus der Musterdienstanweisung. */
export const KONTROLLARTEN = [
  { wert: 'regelkontrolle', bezeichnung: 'Regelkontrolle (Sichtkontrolle vom Boden)' },
  { wert: 'anlasskontrolle', bezeichnung: 'Zusatzkontrolle aus besonderem Anlass' },
  { wert: 'eingehende_untersuchung', bezeichnung: 'Eingehende Untersuchung' },
]

/**
 * Der eine Satz, der an jeder Stelle steht, an der Analytik neben einer
 * Kontrolle auftaucht. Bewusst zentral, damit er nicht an einer Stelle fehlt.
 *
 * Bis 2026-08-10 endete er auf „… weder ersetzen noch ein Kontrollintervall
 * verlängern". Die zweite Hälfte war falsch. BAUM-DE-12 sagt wörtlich: „In
 * begründeten und zu dokumentierenden Fällen können jedoch sowohl längere als
 * auch kürzere Kontrollintervalle möglich sein." Ein Verlängerungsverbot gibt
 * es nicht — es gibt eine Begründungs- und Dokumentationspflicht. Der Satz
 * sagt jetzt das, was in der Quelle steht.
 *
 * In Runde 4 fiel dann auch der Rest des Satzes — „Auswertungen, Sensorwerte
 * und Fernerkundung können sie nicht ersetzen". Er stand hier mit
 * Quellenanspruch, und den hatte er nicht: BAUM-DE-11 sagt, was **genügt**,
 * nicht was nicht genügt. Er steht jetzt als `KONTROLLE_FESTLEGUNG` weiter
 * unten, beschriftet als das, was er ist.
 */
export const KONTROLLE_HINWEIS =
  'Die Regelkontrolle ist eine visuelle Inaugenscheinnahme durch eine fachlich qualifizierte Person vom Boden aus. Das Kontrollintervall richtet sich nach Sicherheitserwartung, Baumzustand und Entwicklungsphase; längere wie kürzere Intervalle sind in begründeten und zu dokumentierenden Fällen zulässig.'

/**
 * Was BIOME selbst festlegt — ausdrücklich getrennt vom Belegten.
 *
 * Bis 2026-08-10 stand mitten im Quellensatz oben: „Auswertungen, Sensorwerte
 * und Fernerkundung können sie nicht ersetzen." Der Methoden-Critic hat das zu
 * Recht beanstandet: Beide zugänglichen Quellen sagen, was **genügt** („Hierfür
 * genügen Regelkontrollen in Form von Sichtkontrollen …"), keine sagt, was
 * nicht genügt. Fernerkundung und Sensorik kommen in keiner davon vor. Der Satz
 * stand also mit Quellenanspruch da und hatte keine.
 *
 * Gelöscht ist er trotzdem nicht, sondern umgezogen — denn er ist als Aussage
 * über BIOME wahr: Wir bieten so etwas nicht an. Das ist eine Produkt-
 * entscheidung, keine fachliche Feststellung, und steht deshalb hier, mit
 * genau dieser Beschriftung. Dieselbe Trennung wie bei der Messhöhe 1,30 m,
 * die ebenfalls als „Festlegung von LUMA" ausgewiesen ist.
 */
export const KONTROLLE_FESTLEGUNG =
  'Festlegung von LUMA, nicht aus einer Quelle: BIOME bietet weder Auswertung noch Sensorwert noch Fernerkundung als Ersatz für diese Kontrolle an. Ob eine solche Angabe fachlich an ihre Stelle treten könnte, sagt keines der geprüften Dokumente — deshalb sagt BIOME es auch nicht.'

/**
 * Gehölzarbeiten und Sperrfrist — § 39 Abs. 5 Satz 1 Nr. 2 BNatSchG (BNAT-03).
 *
 * Steht an jeder Maßnahmenempfehlung. Wörtlich aus dem Gesetzestext, samt der
 * Ausnahme, unter die eine Verkehrssicherungsmaßnahme fallen **kann** — ob sie
 * es tut, entscheidet BIOME nicht.
 *
 * Der Zusatz zu Berlin ist keine Vorsicht, sondern Registerlage: § 39 Abs. 5
 * Satz 3 ermächtigt die Länder, den Zeitraum zu erweitern oder zu verschieben.
 * Ob Berlin davon Gebrauch gemacht hat, ist nicht geprüft — BIOME darf den
 * Bundesfall deshalb nur als Bundesfall zeigen.
 */
export const GEHOELZSCHNITT_HINWEIS =
  'Eine Empfehlung ist noch keine geplante Maßnahme. Für Gehölzarbeiten gilt § 39 Abs. 5 BNatSchG: Bäume außerhalb des Waldes „in der Zeit vom 1. März bis zum 30. September abzuschneiden, auf den Stock zu setzen oder zu beseitigen" ist verboten; „zulässig sind schonende Form- und Pflegeschnitte zur Beseitigung des Zuwachses der Pflanzen oder zur Gesunderhaltung von Bäumen". Das Verbot gilt nicht für Maßnahmen, „die im öffentlichen Interesse nicht auf andere Weise oder zu anderer Zeit durchgeführt werden können", wenn sie unter anderem „der Gewährleistung der Verkehrssicherheit dienen". Ob dieser Fall hier vorliegt, entscheidet BIOME nicht. Angezeigt ist der bundesrechtliche Grundfall: die Länder dürfen den Zeitraum erweitern oder verschieben, ob Berlin das getan hat, ist hier nicht geprüft.'

/**
 * Ableitung des Schutzstatus nach Berliner Baumschutzverordnung.
 *
 * Ausdrücklich eine **Berechnung**, keine Rechtsauskunft: die Verordnung
 * knüpft den Schutz zusätzlich an die Baumart (alle Laubbäume, Waldkiefer,
 * Walnuss, Türkischer Baumhasel) und nimmt unter anderem Obstbäume,
 * Container- und Baumschulbäume aus. Ohne belegte Artzuordnung liefert die
 * Funktion deshalb kein Ergebnis statt einer Behauptung.
 *
 * ── Warum `mehrstaemmig` dreiwertig ist ───────────────────────────────────
 *
 * Bis 2026-08-10 stand hier `baum.mehrstaemmig ? 50 : 80`. Das behandelte
 * „nicht erhoben" wie „einstämmig" und rechnete gegen 80 cm — bei einem
 * mehrstämmigen Baum die falsche Schwelle, ohne dass irgendwo stand, dass
 * geraten wurde. Ein 62-cm-Baum ist dann „nicht geschützt", obwohl er es bei
 * Mehrstämmigkeit wäre.
 *
 * Deshalb: `false` rechnet gegen 80, `true` gegen 50 am **stärksten Stamm**,
 * und `null`/`undefined` liefert `unbestimmbar` samt Grund. Die Oberfläche
 * zeigt den Grund an, statt eine Zahl zu erfinden.
 *
 * @typedef {object} Schutzschwelle
 * @property {'erreicht'|'nicht_erreicht'|'unbestimmbar'} status
 * @property {number|null} schwelleCm
 * @property {number|null} verglichenCm  Der Wert, gegen den geprüft wurde
 * @property {string|null} grund         Nur bei `unbestimmbar`
 * @property {Quelle} quelle
 *
 * @param {{
 *   stammumfangCm?: number|null,
 *   mehrstaemmig?: boolean|null,
 *   staerksterStammCm?: number|null,
 *   artBekannt?: boolean
 * }} baum
 * @returns {Schutzschwelle|null}
 */
export function schutzschwelleErreicht(baum) {
  const unbestimmbar = (/** @type {string} */ grund) => ({
    status: /** @type {const} */ ('unbestimmbar'),
    schwelleCm: null,
    verglichenCm: null,
    grund,
    quelle: STAMMUMFANG.quelle,
  })

  const umfang = baum.stammumfangCm
  const hatUmfang = umfang != null && Number.isFinite(umfang)

  // Gar kein Umfang: dazu ist nichts zu sagen, auch nicht „unbestimmbar".
  if (!hatUmfang && baum.staerksterStammCm == null) return null

  if (baum.artBekannt === false) {
    return unbestimmbar(
      'Die Verordnung schützt nur bestimmte Arten. Solange die Art unbestimmt ist, ist nicht entscheidbar, ob die Schwelle überhaupt gilt.',
    )
  }

  if (baum.mehrstaemmig == null) {
    return unbestimmbar(
      'Ob der Baum ein- oder mehrstämmig ist, ist nicht erhoben. Davon hängt ab, ob 80 cm oder 50 cm am stärksten Stamm gelten.',
    )
  }

  if (baum.mehrstaemmig === true) {
    const staerkster = baum.staerksterStammCm
    if (staerkster == null || !Number.isFinite(staerkster)) {
      return unbestimmbar(
        'Der Baum ist mehrstämmig, aber kein Umfang ist einem einzelnen Stamm zugeordnet. Die Verordnung stellt auf den stärksten Stamm ab, nicht auf einen Gesamtwert.',
      )
    }
    const schwelle = STAMMUMFANG.schwelleStaerksterStammCm
    return {
      status: staerkster >= schwelle ? 'erreicht' : 'nicht_erreicht',
      schwelleCm: schwelle,
      verglichenCm: staerkster,
      grund: null,
      quelle: STAMMUMFANG.quelle,
    }
  }

  if (!hatUmfang) {
    return unbestimmbar('Für den Gesamtstamm liegt kein Umfang vor.')
  }
  const schwelle = STAMMUMFANG.schwelleEinstaemmigCm
  return {
    status: /** @type {number} */ (umfang) >= schwelle ? 'erreicht' : 'nicht_erreicht',
    schwelleCm: schwelle,
    verglichenCm: /** @type {number} */ (umfang),
    grund: null,
    quelle: STAMMUMFANG.quelle,
  }
}
