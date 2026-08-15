/**
 * BIOME — der Karteninhalt: welche Ebenen es gibt und was von ihnen da ist.
 *
 * Die elf Domänen des Datenkerns als Ebenenbaum. Bewusst **alle elf**, auch
 * die, zu denen noch nichts erfasst ist: eine Ebene, die es im Datenmodell
 * gibt, aber nicht in der Liste, ist für den Nutzer eine Lücke ohne Namen.
 * Steht sie mit „nichts erfasst" da, ist sie eine benannte Lücke — und das ist
 * dieselbe Regel, nach der jeder einzelne Wert behandelt wird.
 *
 * ── Woher die Bedienlogik stammt ──────────────────────────────────────────
 *
 * Aus `refs/design/google-earth.md`, nicht aus dem Bauch:
 *
 * · **GE-02** trennt die Rollen: links „Karteninhalt" (was ist geladen), rechts
 *   „Inspector" (was ist ausgewählt), Mitte die Karte.
 * · **GE-08** nennt genau drei Ebenenbedienungen: Sichtbarkeit, Deckkraft,
 *   Reihenfolge. Mehr bietet BIOME nicht an.
 * · **GE-30** ist der Grund für `schaltmodus`: KML kennt vier Modi, wie eine
 *   Gruppe geschaltet wird. `radioFolder` — genau ein Kind sichtbar — ist für
 *   sich ausschließende Bodenparameter das richtige, und ohne diesen Modus
 *   müsste die Oberfläche zwei widersprechende Karten gleichzeitig zeigen.
 * · **GE-31** liefert die zweite Zeile am Knoten (`Snippet`, höchstens zwei
 *   Zeilen): Stand und Objektzahl gehören an die Zeile, nicht in einen Dialog.
 * · **GE-30** liefert auch die Knotenzustände `open`, `closed`, `error`,
 *   `fetching`. Wer eine Ebene lädt, sieht das an der Zeile.
 *
 * Ausdrücklich **nicht** übernommen: Googles deutsche Übersetzung von
 * „feature" als „Funktion". Gemeint ist ein Geoobjekt; in BIOME heißt es
 * „Objekt".
 */

/**
 * @typedef {object} Ebene
 * @property {string} id
 * @property {string} name          Was in der Zeile steht
 * @property {string} domaene       Domäne des Datenkerns
 * @property {string} zweitzeile    Snippet-Zeile: Stand und Umfang, höchstens zwei Zeilen
 * @property {boolean} sichtbar     Ausgangszustand
 * @property {boolean} bespielt     Gibt es überhaupt Daten?
 * @property {string} [warum_leer]  Wenn nicht: warum, in einem Satz
 * @property {'splat'} [inhalt]     Womit der Inspector diese Ebene öffnet
 * @property {any[]} [objekte]      Die geladenen Objekte, wenn der Inspector sie braucht
 */

/**
 * @typedef {object} Ebenengruppe
 * @property {string} id
 * @property {string} name
 * @property {'alle'|'genau_eine'|'nur_abwaehlbar'} schaltmodus
 * @property {boolean} offen
 * @property {Ebene[]} ebenen
 */

/** Die Schaltmodi, wörtlich abgeleitet aus den vier `listItemType` von GE-30. */
export const SCHALTMODUS = {
  /** `check` — jedes Kind einzeln, mehrere gleichzeitig. */
  alle: {
    id: 'alle',
    erklaerung: 'Mehrere Ebenen gleichzeitig sichtbar.',
  },
  /** `radioFolder` — genau eine. Für Darstellungen, die einander widersprechen. */
  genau_eine: {
    id: 'genau_eine',
    erklaerung: 'Nur eine Ebene gleichzeitig: zwei Darstellungen derselben Fläche würden einander widersprechen.',
  },
  /** `checkOffOnly` — abwählen ja, alles anschalten nein. Für schwere Ebenen. */
  nur_abwaehlbar: {
    id: 'nur_abwaehlbar',
    erklaerung: 'Einzeln abwählbar, aber nicht alle auf einmal einschaltbar — die Ebenen sind zu groß dafür.',
  },
}

/**
 * Baut den Karteninhalt aus einem geladenen Datenstand.
 *
 * Die Zahlen in der Zweitzeile stammen aus den Daten, nicht aus einer
 * Konstanten. Eine Ebene, die „12 Bäume" sagt, obwohl elf geladen sind, wäre
 * genau die Art Zahl, gegen die dieses Produkt gebaut ist.
 *
 * @param {import('./daten.js').Datenstand|null} stand
 * @returns {Ebenengruppe[]}
 */
export function karteninhalt(stand) {
  const baeume = stand?.baeume?.length ?? 0
  const standorte = stand?.standorte?.length ?? 0
  const splats = stand?.splatAufnahmen ?? []

  /** @type {(n: number, ein: string, mehr: string) => string} */
  const zaehl = (n, ein, mehr) => `${n} ${n === 1 ? ein : mehr}`

  /** Eine Ebene ohne Daten. Sie verschwindet nicht, sie sagt warum. */
  const leer = (id, name, domaene, warum) => ({
    id, name, domaene,
    zweitzeile: 'nichts erfasst',
    sichtbar: false,
    bespielt: false,
    warum_leer: warum,
  })

  return [
    {
      id: 'g-standort',
      name: 'Standort',
      schaltmodus: 'alle',
      offen: true,
      ebenen: [
        {
          id: 'e-standort',
          name: 'Standortgrenzen',
          domaene: 'standort',
          zweitzeile: standorte ? zaehl(standorte, 'Standort', 'Standorte') : 'nichts erfasst',
          sichtbar: standorte > 0,
          bespielt: standorte > 0,
          warum_leer: standorte ? undefined : 'Kein Standort geladen.',
        },
      ],
    },
    {
      id: 'g-baeume',
      name: 'Bäume',
      schaltmodus: 'alle',
      offen: true,
      ebenen: [
        {
          id: 'e-baeume',
          name: 'Baumbestand',
          domaene: 'baum',
          zweitzeile: baeume
            ? `${zaehl(baeume, 'Baum', 'Bäume')} · Stichtag ${stand?.stichdatum ?? '—'}`
            : 'nichts erfasst',
          sichtbar: baeume > 0,
          bespielt: baeume > 0,
          warum_leer: baeume ? undefined : 'Kein Baum im Bestand.',
        },
      ],
    },
    {
      id: 'g-vegetation',
      name: 'Vegetationsflächen',
      schaltmodus: 'alle',
      offen: false,
      ebenen: [
        leer('e-vegetation', 'Vegetationsflächen', 'vegetation',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 2.'),
      ],
    },
    {
      id: 'g-boden',
      name: 'Boden und Bodenleben',
      // Zwei Bodenkennzahlen übereinander ergeben eine Karte, die zwei
      // verschiedene Dinge gleichzeitig behauptet. GE-30, `radioFolder`.
      schaltmodus: 'genau_eine',
      offen: false,
      ebenen: [
        leer('e-boden-proben', 'Bodenproben', 'boden',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 2.'),
        leer('e-versiegelung', 'Versiegelungsgrad', 'boden',
          'Belegt ist die Berliner Systematik (BOD-BE-07), erfasst ist nichts.'),
      ],
    },
    {
      id: 'g-fauna',
      name: 'Fauna und Habitatstrukturen',
      schaltmodus: 'alle',
      offen: false,
      ebenen: [
        leer('e-artnachweise', 'Artnachweise', 'fauna',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 3.'),
        leer('e-habitat', 'Habitatstrukturen', 'fauna',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 3.'),
      ],
    },
    {
      id: 'g-klima',
      name: 'Klima und Sensorik',
      schaltmodus: 'alle',
      offen: false,
      ebenen: [
        leer('e-sensoren', 'Sensoren', 'sensorik',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 4.'),
      ],
    },
    {
      id: 'g-fernerkundung',
      name: 'Fernerkundung',
      // Rasterebenen sind schwer. Alle gleichzeitig einzuschalten ist keine
      // sinnvolle Bedienung. GE-30, `checkOffOnly`.
      schaltmodus: 'nur_abwaehlbar',
      offen: false,
      ebenen: [
        leer('e-befliegung', 'Befliegungen', 'fernerkundung',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 4.'),
        {
          // 3D-Gaussian-Splats nach KHR_gaussian_splatting (FE-GS-23).
          //
          // Die Ebene steht in der Fernerkundung, weil eine Splat-Aufnahme das
          // Ergebnis eines Flugs ist und ohne ihn kein Datum, keine Kamera und
          // keine verantwortliche Person hätte.
          //
          // Sie schaltet nichts auf der Karte ein: ein Splat-Feld ist ein
          // lagefreies lokales Modell, und die Karte ist zweidimensional. Wer
          // die Zeile anwählt, bekommt die Aufnahme im Inspector — mit ihrer
          // Herkunft und, wenn eine vorliegt, ihrer Verortung.
          id: 'e-splat',
          name: '3D-Aufnahmen (Gaussian Splats)',
          domaene: 'fernerkundung',
          zweitzeile: splats.length
            ? `${zaehl(splats.length, 'Aufnahme', 'Aufnahmen')} · jüngste ${splats
              .map(a => a.flug_datum).sort().at(-1) ?? '—'}`
            : 'nichts erfasst',
          sichtbar: false,
          bespielt: splats.length > 0,
          warum_leer: splats.length
            ? undefined
            : 'Für diesen Bestand ist keine Splat-Aufnahme hinterlegt. Eine Aufnahme entsteht aus einer Befliegung und wird als Flugprodukt der Art „splat" geführt.',
          inhalt: 'splat',
          objekte: splats,
        },
      ],
    },
    {
      id: 'g-wirkung',
      name: 'Maßnahmen und Wirkung',
      schaltmodus: 'alle',
      offen: false,
      ebenen: [
        leer('e-massnahmen', 'Maßnahmen', 'massnahme',
          'Die Domäne ist im Datenkern modelliert, aber noch nicht erfasst. Welle 5.'),
        leer('e-wirkung', 'Wirkungsnachweise', 'wirkung',
          'Ein Wirkungsnachweis braucht Baseline, behandelte Fläche und Referenzfläche. Keines davon ist erfasst.'),
      ],
    },
  ]
}

/**
 * Wie viele Ebenen bespielt sind — für die Zeile über dem Baum.
 * @param {Ebenengruppe[]} gruppen
 */
export function ebenenBilanz(gruppen) {
  const alle = gruppen.flatMap(g => g.ebenen)
  return { gesamt: alle.length, bespielt: alle.filter(e => e.bespielt).length }
}
