/**
 * BIOME — was ein Wert über sich preisgibt.
 *
 * Hier steht an einer Stelle, welche Herkunftsangaben zu welchem Werttyp
 * gehören: Datum, Messhöhe, Verfahren, Quelle, Person, Korrekturkette.
 *
 * Bis 2026-08-10 lagen diese Funktionen als Closures im Rumpf von
 * `BiomeBaeumePage`. Damit war die Zwei-Klick-Regel an eine einzelne Seite
 * gebunden — die Karte hätte sie nachbauen müssen, und ein Nachbau weicht ab.
 * Jetzt gibt es einen Bauer, den jede Ansicht benutzt.
 *
 * Die Regel, die alle Funktionen hier teilen: **Wo eine Angabe im Datenbestand
 * fehlt, steht das als `FEHLT` und nicht als weggelassene Zeile.** Eine
 * fehlende Herkunftsangabe ist selbst eine Information.
 *
 * @typedef {object} HerkunftZeile
 * @property {string} k        Beschriftung
 * @property {string} v        Wert, oder FEHLT
 * @property {string} [hinweis] Erklärung unter dem Wert
 * @property {string} [url]     Weiterführender Link
 *
 * @typedef {object} Herkunft
 * @property {string} titel
 * @property {string} wert
 * @property {HerkunftZeile[]} zeilen
 * @property {{vorher: string, grund: string|null}|null} [korrektur]
 */
import { FEHLT, datum as fmtDatum, mitEinheit, koordinate, crsUri, CRS_ENSEMBLE_HINWEIS, LAGE_BEZUG, zahl } from './format.js'
import { ROLOFF_VS, GEHOELZSCHNITT_HINWEIS, KONTROLLART_NAME as KONTROLLART } from './baumStandards.js'
import { messung, ersetzteMessung, letzteKontrolle, vitalitaet, splatVerortet } from './daten.js'
import { FARBRAUM, SPLAT_HINWEIS } from './splat.js'

/**
 * Baut die Herkunftsfunktionen für einen geladenen Datenstand.
 *
 * @param {ReturnType<typeof import('./daten.js').nachschlagen>} nachschlag
 */
export function herkunftBauer(nachschlag) {
  /* ── Herkunft je Werttyp ───────────────────────────────────────────────
     Eine Stelle, an der entschieden wird, was ein Wert über sich preisgibt.
     Wo eine Angabe im Datenbestand fehlt, steht das hier als FEHLT und nicht
     als weggelassene Zeile — eine fehlende Herkunftsangabe ist selbst eine
     Information. */

  function personZeile(id) {
    const p = nachschlag.person(id)
    return {
      k: 'Person', v: p ? p.name : FEHLT,
      hinweis: p?.qualifikation
        ? `Angegebene Qualifikation: ${p.qualifikation}. Selbstauskunft der Person, von BIOME nicht geprüft.`
        : undefined,
    }
  }

  function methodeZeilen(methodeId) {
    const m = nachschlag.methode(methodeId)
    const s = nachschlag.standardZuMethode(methodeId)
    const zeilen = [{ k: 'Verfahren', v: m ? m.name : FEHLT, hinweis: m?.beschreibung }]
    zeilen.push(
      s
        ? {
            k: 'Quelle',
            v: s.kurzname,
            hinweis: `${s.herausgeber} · abgerufen ${fmtDatum(s.abgerufen_am)}`,
            url: s.quelle_url,
          }
        : { k: 'Quelle', v: FEHLT, hinweis: 'Für dieses Verfahren ist im Standards-Register keine Quelle hinterlegt.' },
    )
    return zeilen
  }

  function herkunftStammumfang(baum) {
    const m = messung(baum, 'stammumfang')
    if (!m) return null
    const alt = ersetzteMessung(baum, m)
    const altPerson = alt ? nachschlag.person(alt.erfasst_von) : null
    return {
      titel: `Stammumfang ${baum.baumnummer}`,
      wert: mitEinheit(m.wert, m.einheit),
      zeilen: [
        { k: 'Datum', v: fmtDatum(m.datum) },
        {
          k: 'Messhöhe',
          v: m.messhoehe_cm != null ? mitEinheit(m.messhoehe_cm, 'cm') : FEHLT,
          hinweis: m.messhoehe_cm === 130
            ? 'Entspricht der Höhe, in der die Berliner Baumschutzverordnung den Stammumfang für den Schutzstatus bemisst. Die Verordnung schreibt keine Katastererfassung vor — die Übereinstimmung ist eine Festlegung von LUMA, damit beide Werte vergleichbar bleiben.'
            : undefined,
        },
        ...methodeZeilen(m.methode_id),
        { k: 'Messgerät', v: m.messgeraet || FEHLT },
        personZeile(m.erfasst_von),
        { k: 'Erfasst am', v: fmtDatum(m.erfasst_am) },
      ],
      korrektur: alt
        ? {
            vorher: `Vorher: ${mitEinheit(alt.wert, alt.einheit)} · erfasst am ${fmtDatum(alt.datum)}${altPerson ? ` von ${altPerson.name}` : ''}`,
            grund: m.korrektur_grund,
          }
        : null,
    }
  }

  /**
   * Herkunft eines Einzelstamm-Umfangs. Eigene Tafel, weil hier eine Angabe
   * mehr zu machen ist als beim Gesamtbaum: welcher Stamm gemeint ist und wie
   * viele überhaupt erfasst wurden. Ohne die zweite Zahl ist nicht zu
   * erkennen, ob am stärksten Stamm gemessen oder nur einer erwischt wurde.
   */
  function herkunftStamm(baum, s) {
    const m = s.messung
    return {
      titel: `Stärkster Stamm ${baum.baumnummer}`,
      wert: mitEinheit(m.wert, m.einheit),
      zeilen: [
        { k: 'Stamm', v: `Nr. ${m.stamm_nr} von ${s.anzahlStaemme} erfassten` },
        { k: 'Datum', v: fmtDatum(m.datum) },
        { k: 'Messhöhe', v: m.messhoehe_cm != null ? mitEinheit(m.messhoehe_cm, 'cm') : FEHLT },
        ...methodeZeilen(m.methode_id),
        { k: 'Messgerät', v: m.messgeraet || FEHLT },
        personZeile(m.erfasst_von),
        {
          k: 'Maßgeblich', v: 'stärkster Einzelstamm',
          hinweis: 'Die Baumschutzverordnung schützt mehrstämmige Bäume, „wenn mindestens einer der Stämme einen Mindestumfang von 50 cm aufweist". Maßgeblich ist deshalb der stärkste Stamm — nicht die Summe und nicht der Mittelwert.',
        },
      ],
    }
  }

  function herkunftVitalitaet(baum) {
    const b = vitalitaet(baum)
    if (!b) return null
    const stufe = ROLOFF_VS.stufen.find(s => s.stufe === b.stufe)
    return {
      titel: `Vitalität ${baum.baumnummer}`,
      wert: stufe ? `${stufe.kurz} · ${stufe.bezeichnung}` : b.stufe,
      zeilen: [
        { k: 'Skala', v: ROLOFF_VS.name, hinweis: ROLOFF_VS.bezug },
        { k: 'Abgrenzung', v: ROLOFF_VS.abgrenzung },
        // Die Stufe stand bis 2026-08-10 verbindlicher da als ihre Quelle sie
        // trägt: das Dokument heißt „Vitalitätsbeurteilung von Champion Trees
        // (Vorschlag)" und ist laut Register „eine Kurzbeschreibung des
        // Verfahrens durch den Urheber, nicht um eine Norm".
        { k: 'Rang der Quelle', v: ROLOFF_VS.quellenstatus },
        { k: 'Datum', v: fmtDatum(b.datum) },
        ...methodeZeilen(b.methode_id),
        personZeile(b.erfasst_von),
        { k: 'Begründung', v: b.begruendung || FEHLT },
        // Eine Einstufung ohne Kalibrierhilfe ist eine Schätzung. Das gehört
        // an den Wert und nicht ins Kleingedruckte: die Bildreihen zu VS 0–3
        // stehen in Roloffs Buchveröffentlichungen und liegen BIOME nicht vor
        // (refs/standards/01-baeume.md, Abschnitt „Nicht zugänglich").
        {
          k: 'Kalibrierung', v: FEHLT,
          hinweis: 'BIOME zeigt keine Vergleichsbilder zu den Stufen. Die Abbildungen zu VS 0–3 stammen aus Roloffs Buchveröffentlichungen und sind nicht frei verfügbar. Die Einstufung beruht damit allein auf der Erfahrung der beurteilenden Person; zwischen zwei Personen ist sie nicht abgeglichen.',
        },
      ],
    }
  }

  function herkunftKontrolle(baum) {
    const k = letzteKontrolle(baum)
    if (!k) return null
    return {
      titel: `Letzte Kontrolle ${baum.baumnummer}`,
      wert: fmtDatum(k.datum),
      zeilen: [
        { k: 'Art', v: KONTROLLART[k.art] || k.art },
        ...methodeZeilen(k.methode_id),
        { k: 'Belaubung', v: k.belaubungszustand || FEHLT },
        personZeile(k.durchgefuehrt_von),
        { k: 'Befund', v: k.ergebnis_text || FEHLT },
        {
          // Bis 2026-08-10 stand hier „Vor der Durchführung ist die
          // Artenschutzprüfung nach § 44 BNatSchG erforderlich". Das Wort
          // „Artenschutzprüfung" kommt im gesamten Standards-Register nicht
          // vor; § 44 enthält Verbote, keinen Verfahrensschritt, und das
          // Register hält ausdrücklich fest, BIOME dürfe „zu Ausnahmen,
          // Befreiungen und Verfahrensschritten nichts aussagen".
          //
          // Belegt und einschlägig ist stattdessen § 39 Abs. 5 Satz 1 Nr. 2
          // BNatSchG (BNAT-03) — wörtlich zitiert, samt der Ausnahme, unter
          // die eine Verkehrssicherungsmaßnahme fallen kann.
          k: 'Maßnahme', v: k.massnahme_empfohlen ? 'von der kontrollierenden Person empfohlen' : 'keine empfohlen',
          hinweis: k.massnahme_empfohlen ? GEHOELZSCHNITT_HINWEIS : undefined,
        },
      ],
    }
  }

  function herkunftStammdatum(baum, feld) {
    const p = nachschlag.person(baum.angelegt_von)
    const gemeinsam = [
      { k: 'Datensatz', v: `Baum ${baum.baumnummer}, Stammdaten` },
      { k: 'Angelegt am', v: fmtDatum(baum.created_at) },
      { k: 'Person', v: p ? p.name : FEHLT },
      {
        k: 'Verfahren', v: FEHLT,
        hinweis: 'Für Stammdaten ist im Datenbestand keine Erfassungsmethode hinterlegt. Sie stammen aus der Eigenerfassung im Feld; woher der einzelne Wert kommt, ist nicht festgehalten.',
      },
    ]
    if (feld === 'pflanzjahr') {
      return {
        titel: `Pflanzjahr ${baum.baumnummer}`,
        wert: baum.gepflanzt_jahr != null ? String(baum.gepflanzt_jahr) : FEHLT,
        zeilen: gemeinsam,
      }
    }
    if (feld === 'position') {
      return {
        titel: `Standort ${baum.baumnummer}`,
        wert: koordinate(
          baum.position ? { lat: baum.position.coordinates[1], lng: baum.position.coordinates[0] } : null,
          { crs: baum.crs, genauigkeitM: baum.lagegenauigkeit_m, bezug: baum.lagegenauigkeit_bezug },
        ),
        zeilen: [
          {
            k: 'Bezugssystem', v: baum.crs,
            hinweis: `Vorgeschriebene Schreibweise nach außen: ${crsUri(baum.crs)}`,
            url: crsUri(baum.crs),
          },
          { k: 'Grenze der Genauigkeit', v: CRS_ENSEMBLE_HINWEIS },
          {
            k: 'Lagegenauigkeit',
            v: baum.lagegenauigkeit_m != null && baum.lagegenauigkeit_bezug
              ? `${mitEinheit(baum.lagegenauigkeit_m, 'm')} · ${LAGE_BEZUG[baum.lagegenauigkeit_bezug] || baum.lagegenauigkeit_bezug}`
              : FEHLT,
            hinweis: baum.lagegenauigkeit_m != null && baum.lagegenauigkeit_bezug
              ? 'Mittlerer Abstand zwischen gemessener und als wahr angenommener Position. Die Bezugsebene sagt, über welche Menge von Positionen gemittelt wurde.'
              : 'Für diesen Baum ist keine Lagegenauigkeit erhoben. Eine Meterangabe ohne Bezugsebene wird nicht angezeigt: aus ihr geht nicht hervor, ob sie für diesen Baum, für alle Bäume oder für den ganzen Datensatz gilt.',
          },
          ...gemeinsam,
        ],
      }
    }
    // Taxonomie
    const gbif = baum.taxon_quelle === 'GBIF Backbone Taxonomy' && baum.taxon_abgerufen_am
    return {
      titel: `Artname ${baum.baumnummer}`,
      wert: baum.art_wissenschaftlich || 'Art unbestimmt',
      zeilen: [
        { k: 'Referenz', v: baum.taxon_quelle || FEHLT },
        { k: 'Kennung', v: baum.taxon_id || FEHLT },
        {
          k: 'Zitat', v: gbif
            // Wörtlich die von der API vorgeschlagene Zitierweise, samt
            // Abrufdatum. Ohne das Datum ist der Treffer nicht einzuordnen:
            // der Backbone hat pubDate 2023-08-28 und ist keine tagesaktuelle
            // Nomenklaturquelle.
            ? `GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei accessed via GBIF.org on ${baum.taxon_abgerufen_am}`
            : FEHLT,
          url: gbif ? 'https://doi.org/10.15468/39omei' : undefined,
        },
        {
          // Bis 2026-08-10 stand hier fest „keine Angabe" — und weil niemand
          // die Auflösung nachprüfen konnte, zeigten drei von fünf Kennungen
          // auf eine andere Art.
          k: 'Trefferqualität',
          v: baum.taxon_confidence != null && baum.taxon_matchtype
            ? `${baum.taxon_confidence} von 100 · ${baum.taxon_matchtype}`
            : FEHLT,
          hinweis: baum.taxon_confidence != null
            ? 'confidence und matchType stammen aus der Namensauflösung. Ohne beide ist ein Treffer nicht überprüfbar; die Kennung ist dann keine Referenz, sondern nur eine Zahl.'
            : 'confidence und matchType aus der Namensauflösung sind im Datenbestand nicht gespeichert. Ohne sie ist der Treffer nicht überprüfbar.',
        },
        {
          k: 'Namensstatus', v: baum.taxon_status || FEHLT,
          hinweis: baum.taxon_status === 'SYNONYM'
            ? 'Der Name ist in der Referenz ein Synonym, kein akzeptierter Name. Für Auswertungen ist der akzeptierte Name maßgeblich.'
            : undefined,
        },
        { k: 'Aufgelöst am', v: baum.taxon_abgerufen_am ? fmtDatum(baum.taxon_abgerufen_am) : FEHLT },
        {
          k: 'Deutscher Name', v: baum.art_deutsch || FEHLT,
          hinweis: 'Deutsche Trivialnamen sind nicht normiert. Die Referenz liefert keine; dieser Name ist eine Eingabe ohne Quelle.',
        },
        ...gemeinsam,
      ],
    }
  }
  /**
   * Herkunft einer 3D-Aufnahme (Gaussian Splats).
   *
   * Die Tafel ist bewusst länger als die anderen, weil bei diesem Datentyp
   * mehr auseinanderzuhalten ist als sonst. Drei Blöcke, in dieser Reihenfolge:
   *
   *   1. **Der Flug.** Datum, Uhrzeit, Sensor, Bodenauflösung. Ohne ihn ist
   *      eine Aufnahme ein Bild ohne Zeit und ohne Kamera.
   *   2. **Die Datei.** Kernel, Farbraum, Kugelflächenfunktionen, Reifegrad
   *      der Spezifikation — alles, was nach FE-GS-23 wörtlich belegt ist.
   *   3. **Die Verortung.** Und zwar getrennt, weil sie eben *nicht* aus der
   *      Datei stammt. Fehlt sie, steht das als FEHLT da, mit dem Grund.
   *
   * @param {import('./daten.js').SplatAufnahme} a
   */
  function herkunftSplat(a) {
    const verortet = splatVerortet(a)
    const farbraum = FARBRAUM[/** @type {keyof typeof FARBRAUM} */ (a.farbraum)]
    const befunde = Array.isArray(a.pruefbericht?.befunde) ? a.pruefbericht.befunde : null

    return {
      titel: `3D-Aufnahme vom ${fmtDatum(a.flug_datum)}`,
      wert: `${zahl(a.splat_anzahl)} Gaußfunktionen`,
      zeilen: [
        /* ── Der Flug ──────────────────────────────────────────────────── */
        {
          k: 'Aufnahme',
          v: a.flug_uhrzeit
            ? `${fmtDatum(a.flug_datum)}, ${String(a.flug_uhrzeit).slice(0, 5)} Uhr${a.flug_zeitzone ? ` (${a.flug_zeitzone})` : ''}`
            : fmtDatum(a.flug_datum),
        },
        { k: 'Sensor', v: a.sensor_id || FEHLT, hinweis: a.plattform ? `Plattform: ${a.plattform}` : undefined },
        { k: 'Flughöhe', v: a.flughoehe_m != null ? mitEinheit(a.flughoehe_m, 'm') : FEHLT },
        {
          k: 'Bodenauflösung',
          v: a.gsd_cm != null ? mitEinheit(a.gsd_cm, 'cm', { nachkomma: 1 }) : FEHLT,
          hinweis: 'Bodenauflösung (GSD) des Flugs, aus dem die Aufnahme gerechnet wurde. Sie ist keine Auflösungsangabe für das Splat-Feld: eine Gaußfunktion hat keine Pixelgröße.',
        },

        /* ── Das Verfahren ─────────────────────────────────────────────── */
        ...methodeZeilen(a.methode_id),
        {
          k: 'Kennzeichnung', v: a.kennzeichnung,
          hinweis: SPLAT_HINWEIS.messung,
        },
        {
          k: 'Software',
          v: a.software ? `${a.software}${a.software_version ? ` ${a.software_version}` : ''}` : FEHLT,
          hinweis: a.software && !a.software_version
            ? 'Ohne Version ist das Ergebnis nicht reproduzierbar — dieselbe Software rechnet in zwei Fassungen zwei verschiedene Felder.'
            : undefined,
        },

        /* ── Die Datei ─────────────────────────────────────────────────── */
        {
          k: 'Format', v: `KHR_gaussian_splatting · Kernel ${a.kernel}`,
          hinweis: `Projektion ${a.projektion}, Sortierung ${a.sortierung}. Stand der Spezifikation: ${a.spezifikationsstand}.`,
        },
        {
          k: 'Reifegrad', v: a.spezifikationsstand,
          hinweis: a.spezifikationsstand === 'Release Candidate'
            ? 'Die Erweiterung ist noch nicht ratifiziert. Attributnamen und Wertelisten können sich bis zur Ratifizierung ändern. BIOME liest solche Dateien und schreibt sie nicht.'
            : undefined,
        },
        {
          k: 'Farbraum', v: farbraum ? farbraum.name : a.farbraum,
          hinweis: SPLAT_HINWEIS.farbe,
        },
        {
          k: 'Kugelflächenfunktionen',
          v: a.sh_grad > 0 ? `Grad 0 bis ${a.sh_grad}` : 'nur Grad 0',
          hinweis: a.sh_grad > 0
            ? 'Dargestellt wird der nullte Grad, also die Diffusfarbe. Die blickwinkelabhängigen Anteile der höheren Grade bleiben ungenutzt; die Spezifikation lässt das ausdrücklich zu.'
            : 'Die Aufnahme trägt nur den nullten Grad. Blickwinkelabhängige Glanzanteile sind darin nicht enthalten.',
        },
        {
          k: 'Datei',
          v: a.datei_bytes != null ? mitEinheit(Math.round(a.datei_bytes / 1048576), 'MB') : FEHLT,
          hinweis: a.datei_url,
        },
        {
          k: 'Annahmeprüfung',
          v: befunde
            ? (befunde.length ? `${zahl(befunde.length)} Befund${befunde.length === 1 ? '' : 'e'}` : 'ohne Befund')
            : FEHLT,
          hinweis: befunde
            ? `Geprüft ${a.geprueft_am ? fmtDatum(a.geprueft_am) : FEHLT} gegen die Pflichtangaben der Spezifikation.`
            : 'Für diese Aufnahme ist kein Prüfergebnis gespeichert. Ob die Datei die Pflichtangaben erfüllt, ist damit nicht festgehalten.',
        },

        /* ── Die Verortung: eigener Block, weil eigene Herkunft ─────────── */
        {
          k: 'Verortung',
          v: verortet
            ? koordinate({ lat: /** @type {number} */ (a.anker_lat), lng: /** @type {number} */ (a.anker_lng) }, { crs: a.anker_crs || undefined })
            : FEHLT,
          hinweis: verortet ? CRS_ENSEMBLE_HINWEIS : SPLAT_HINWEIS.verortung,
        },
        {
          k: 'Drehung gegen Nord',
          v: a.drehung_grad != null ? mitEinheit(a.drehung_grad, '°', { nachkomma: 1 }) : FEHLT,
          hinweis: verortet && a.drehung_grad == null
            ? 'Ohne Drehung steht die Aufnahme an der richtigen Stelle, aber in unbekannter Ausrichtung.'
            : undefined,
        },
        {
          k: 'Höhe des Ankers',
          v: a.anker_hoehe_m != null ? mitEinheit(a.anker_hoehe_m, 'm', { nachkomma: 1 }) : FEHLT,
        },
        ...(verortet
          ? [
              ...methodeZeilen(a.verortung_methode_id),
              personZeile(a.verortet_von),
              { k: 'Verortet am', v: fmtDatum(a.verortet_am) },
            ]
          : []),
        {
          k: 'Passpunkte am Flug',
          v: a.passpunkte_anzahl != null
            ? `${zahl(a.passpunkte_anzahl)}${a.passpunkte_rmse_cm != null ? ` · RMSE ${mitEinheit(a.passpunkte_rmse_cm, 'cm', { nachkomma: 1 })}` : ''}`
            : FEHLT,
          hinweis: 'Angabe des Flugs, nicht der Aufnahme. Sie sagt, wie genau die Passpunkte lagen — nicht, wie genau die rekonstruierten Gaußfunktionen liegen.',
        },

        /* ── Wer und wann ──────────────────────────────────────────────── */
        personZeile(a.erfasst_von),
        { k: 'Erfasst am', v: fmtDatum(a.erfasst_am) },
      ],
    }
  }

  return {
    personZeile, methodeZeilen,
    stammumfang: herkunftStammumfang,
    stamm: herkunftStamm,
    vitalitaet: herkunftVitalitaet,
    kontrolle: herkunftKontrolle,
    stammdatum: herkunftStammdatum,
    splat: herkunftSplat,
  }
}
