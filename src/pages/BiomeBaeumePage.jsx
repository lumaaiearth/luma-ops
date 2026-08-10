/**
 * BIOME — Baumkataster.
 *
 * Gebaut für zwei Aufgaben aus jobs/:
 *
 *   w1-faellige-kontrollen  Das Bezirksamt will ohne Umweg sehen, für welche
 *                           Bäume im laufenden Jahr keine Kontrolle
 *                           dokumentiert ist. Budget: 3 Klicks, 30 Sekunden.
 *
 *   w1-zahl-herkunft        Die ESG-Verantwortliche will zu einer Zahl Quelle,
 *                           Datum, Erfassungsmethode und Person sehen.
 *                           Budget: 2 Klicks.
 *
 * ── Was Runde 2 geändert hat und warum ────────────────────────────────────
 *
 * Drei Critics nannten unabhängig voneinander dieselbe größte Lücke:
 *
 * 1. Das Wort „offen". Die Oberfläche schrieb „Kontrolle 2026 offen" und
 *    „· 2026 offen". Das ist eine Fälligkeitsaussage. Das Register leitet die
 *    Fälligkeit einer Regelkontrolle aus Entwicklungsphase, berechtigter
 *    Sicherheitserwartung und Zustand ab, gerechnet ab der letzten Kontrolle —
 *    nicht aus dem Kalenderjahr. Ein Baum mit Dreijahresintervall, zuletzt
 *    kontrolliert im November 2025, ist 2026 nicht fällig. Das Wort ist
 *    ersatzlos entfernt; die Oberfläche sagt jetzt nur noch, was sie weiß:
 *    ob in diesem Jahr eine Kontrolle dokumentiert ist.
 *
 * 2. Nur eine Zahl führte zu ihrer Herkunft. Stammumfang war rückverfolgbar,
 *    Vitalität, Kontrolldatum, Pflanzjahr, Koordinate und Taxon-Kennung nicht.
 *    Die Regel gilt aber für jede Zahl. Jetzt trägt jeder angezeigte Wert
 *    dieselbe Schaltfläche zur Herkunft.
 *
 * 3. Die Messhöhe stand in der Spaltenüberschrift und galt damit für alle
 *    zwölf Bäume gleichzeitig. Sie ist eine Eigenschaft der einzelnen Messung
 *    und steht jetzt am einzelnen Wert.
 *
 * ── Gestaltungsregeln, die hier durchgehalten werden ──────────────────────
 *   · Fehlendes wird als fehlend gezeigt, nie als 0 und nie als leere Zelle.
 *   · „Noch nie kontrolliert" ist ein anderer Zustand als „dieses Jahr keine".
 *   · Keine Farbe trägt allein Bedeutung; jede Markierung hat auch Text.
 *   · LUMA-Mint nur als Fläche und Marker, nie als Textfarbe.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { TreeDeciduous, Download, X, ChevronRight } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED, CARD, WARN } from '../lib/theme.js'
import {
  ladeDatenstand, messung, ersetzteMessung, letzteKontrolle, kontrollstand,
  vitalitaet, artenverteilung, nachschlagen, staerksterStamm,
} from '../biome/daten.js'
import { FEHLT, datum as fmtDatum, mitEinheit, koordinate, zahl, LAGE_BEZUG } from '../biome/format.js'
import { ROLOFF_VS, KONTROLLE_HINWEIS } from '../biome/baumStandards.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const LABEL = {
  fontFamily: MONO, fontSize: 9, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: MUTED,
}

/** Mindestgröße für Tippziele nach WCAG 2.1 AA. */
const TIPPZIEL = 44

const KONTROLLART = {
  regelkontrolle: 'Regelkontrolle',
  anlasskontrolle: 'Zusatzkontrolle',
  eingehende_untersuchung: 'Eingehende Untersuchung',
}

function Karte({ children, ...rest }) {
  return (
    <div {...rest} style={{
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 14, ...(rest.style || {}),
    }}>{children}</div>
  )
}

/**
 * Ein angezeigter Wert, der seine Herkunft kennt.
 *
 * Jeder Wert auf dieser Seite geht durch diese Komponente. Damit ist die
 * Zwei-Klick-Regel keine Eigenschaft einzelner Stellen mehr, sondern des
 * Bauteils: wer einen Wert anzeigt, zeigt zwangsläufig auch den Weg dorthin.
 */
function Wert({ text, fehlt, onOeffnen, beschriftung, monospace = true }) {
  if (fehlt) {
    return (
      <span style={{ color: MUTED, fontStyle: 'italic', fontFamily: SANS, fontSize: 13 }}>
        {FEHLT}
      </span>
    )
  }
  return (
    <button type="button" onClick={ev => onOeffnen(ev)} aria-label={beschriftung} data-herkunft="1"
      style={{
        font: 'inherit', fontFamily: monospace ? MONO : SANS, fontSize: 13,
        fontWeight: monospace ? 700 : 400, color: FG,
        background: 'transparent', border: 'none', borderBottom: `1px dashed ${MUTED}`,
        // 44 px Trefferfläche, ohne die Zeile auseinanderzuziehen: die Polsterung
        // wächst nach oben und unten, der Text bleibt, wo er ist.
        padding: '11px 4px', margin: '-11px -4px', minHeight: TIPPZIEL,
        display: 'inline-flex', alignItems: 'center',
        cursor: 'pointer', textAlign: 'left',
      }}>
      {text}
    </button>
  )
}

/** Der zweite Klick: alles, was einen Wert überprüfbar macht. */
function HerkunftsTafel({ eintrag, onSchliessen }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!eintrag) return
    const el = ref.current
    el?.querySelector('button')?.focus()
    function taste(e) {
      if (e.key === 'Escape') { onSchliessen(); return }
      if (e.key !== 'Tab' || !el) return
      // Fokusfalle: der Dialog behält den Fokus, solange er offen ist.
      const ziele = [...el.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')]
        .filter(z => z.offsetParent !== null)
      if (!ziele.length) return
      const erste = ziele[0], letzte = ziele[ziele.length - 1]
      if (e.shiftKey && document.activeElement === erste) { e.preventDefault(); letzte.focus() }
      else if (!e.shiftKey && document.activeElement === letzte) { e.preventDefault(); erste.focus() }
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [eintrag, onSchliessen])

  if (!eintrag) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={`Herkunft: ${eintrag.titel}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.45)',
      }}
      onClick={onSchliessen}>
      <div ref={ref} onClick={e => e.stopPropagation()} data-test="herkunftstafel" style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px 14px 0 0',
        width: 'min(560px, 100%)', maxHeight: '86vh', overflowY: 'auto',
        padding: 18, paddingBottom: 'calc(18px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={LABEL}>Herkunft</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: FG, fontFamily: SANS }}>{eintrag.titel}</div>
          </div>
          <button type="button" onClick={onSchliessen} aria-label="Schließen"
            style={{
              width: TIPPZIEL, height: TIPPZIEL, borderRadius: 8, border: `1px solid ${BORDER}`,
              background: 'transparent', color: FG, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: FG, marginBottom: 14, lineHeight: 1.25 }}>
          {eintrag.wert}
        </div>

        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '8px 14px', fontSize: 13 }}>
          {eintrag.zeilen.map((z, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <dt style={LABEL}>{z.k}</dt>
              <dd style={{ margin: 0, color: z.v === FEHLT ? MUTED : FG, fontStyle: z.v === FEHLT ? 'italic' : 'normal' }}>
                {z.v}
                {z.hinweis && <div style={{ color: MUTED, fontSize: 12, marginTop: 2, fontStyle: 'normal' }}>{z.hinweis}</div>}
                {z.url && (
                  <div style={{ marginTop: 2 }}>
                    <a href={z.url} target="_blank" rel="noreferrer" style={{ color: FG, fontSize: 12, wordBreak: 'break-all' }}>{z.url}</a>
                  </div>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {eintrag.korrektur && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${BORDER}`, background: 'color-mix(in srgb, var(--luma-fg) 4%, transparent)',
          }}>
            <div style={{ ...LABEL, color: WARN, marginBottom: 6 }}>Dieser Wert wurde korrigiert</div>
            <div style={{ fontSize: 13, color: FG }}>{eintrag.korrektur.vorher}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>{eintrag.korrektur.grund}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
              Der ursprüngliche Datensatz ist nicht gelöscht. Er bleibt als ersetzt erhalten,
              mit Zeitstempel und Person.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BiomeBaeumePage() {
  const [stand, setStand] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [filter, setFilter] = useState('alle')
  const [herkunft, setHerkunft] = useState(null)
  const [offenId, setOffenId] = useState(null)
  // Merkt sich, von wo die Herkunftstafel geöffnet wurde. Ohne das landet der
  // Fokus beim Schließen auf BODY, und der Weg zurück zum Auslöser kostet
  // vierzig Tastendrücke.
  const ausloeser = useRef(null)

  function herkunftOeffnen(eintrag, ev) {
    ausloeser.current = ev?.currentTarget || null
    setHerkunft(eintrag)
  }
  function herkunftSchliessen() {
    setHerkunft(null)
    const ziel = ausloeser.current
    ausloeser.current = null
    if (ziel && document.contains(ziel)) requestAnimationFrame(() => ziel.focus())
  }

  useEffect(() => {
    let abgebrochen = false
    ladeDatenstand()
      .then(d => { if (!abgebrochen) setStand(d) })
      .catch(e => { if (!abgebrochen) setFehler(e?.message || 'Daten konnten nicht geladen werden.') })
    return () => { abgebrochen = true }
  }, [])

  const stichjahr = stand ? Number(stand.stichdatum.slice(0, 4)) : new Date().getFullYear()
  const nachschlag = useMemo(() => (stand ? nachschlagen(stand) : null), [stand])

  const gruppen = useMemo(() => {
    if (!stand) return null
    const b = stand.baeume
    return {
      alle: b,
      ohne_kontrolle: b.filter(x => kontrollstand(x, stichjahr) !== 'kontrolliert'),
      nie: b.filter(x => kontrollstand(x, stichjahr) === 'nie_kontrolliert'),
      // Ein mehrstämmiger Baum mit Einzelstammwerten ist gemessen, nur eben
      // nicht am Gesamtbaum. Er gehört nicht in „ohne Stammumfang".
      ohne_umfang: b.filter(x => !messung(x, 'stammumfang') && !staerksterStamm(x)),
      unbestimmt: b.filter(x => !x.art_wissenschaftlich),
    }
  }, [stand, stichjahr])

  if (fehler) {
    // Ein Ladefehler ist kein leerer Bestand. Die Seite sagt, was los ist,
    // statt „0 Bäume" zu zeigen.
    return (
      <div style={{ padding: '18px 16px', maxWidth: 1080, margin: '0 auto', fontFamily: SANS }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 600, color: FG }}>Baumkataster</h1>
        <Karte data-test="ladefehler">
          <div style={{ ...LABEL, marginBottom: 6 }}>Keine Daten geladen</div>
          <div style={{ color: FG, fontSize: 14, lineHeight: 1.5 }}>{fehler}</div>
          <div style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            Hier steht bewusst keine Zahl. Ein Bestand, der nicht geladen werden
            konnte, ist kein leerer Bestand.
          </div>
        </Karte>
      </div>
    )
  }
  if (!stand || !gruppen || !nachschlag) {
    return <div style={{ padding: 20, color: MUTED, fontFamily: SANS }}>Daten werden geladen…</div>
  }

  const standort = stand.standorte[0]
  const sichtbar = gruppen[filter] || gruppen.alle

  const chips = [
    { id: 'alle', text: 'Alle Bäume', n: gruppen.alle.length },
    { id: 'ohne_kontrolle', text: `Ohne Kontrolle in ${stichjahr}`, n: gruppen.ohne_kontrolle.length },
    { id: 'nie', text: 'Noch nie kontrolliert', n: gruppen.nie.length },
    { id: 'ohne_umfang', text: 'Ohne Stammumfang', n: gruppen.ohne_umfang.length },
    { id: 'unbestimmt', text: 'Art unbestimmt', n: gruppen.unbestimmt.length },
  ]

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
          k: 'Maßnahme', v: k.massnahme_empfohlen ? 'von der kontrollierenden Person empfohlen' : 'keine empfohlen',
          hinweis: k.massnahme_empfohlen
            ? 'Eine Empfehlung ist noch keine geplante Maßnahme. Vor der Durchführung ist die Artenschutzprüfung nach § 44 BNatSchG erforderlich; sie ist an dieser Kontrolle nicht dokumentiert.'
            : undefined,
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
          { k: 'Bezugssystem', v: baum.crs },
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
    return {
      titel: `Artname ${baum.baumnummer}`,
      wert: baum.art_wissenschaftlich || 'Art unbestimmt',
      zeilen: [
        { k: 'Referenz', v: baum.taxon_quelle || FEHLT },
        { k: 'Kennung', v: baum.taxon_id || FEHLT },
        {
          k: 'Zitat', v: baum.taxon_quelle === 'GBIF Backbone Taxonomy'
            ? 'GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei'
            : FEHLT,
          url: baum.taxon_quelle === 'GBIF Backbone Taxonomy' ? 'https://doi.org/10.15468/39omei' : undefined,
        },
        {
          k: 'Trefferqualität', v: FEHLT,
          hinweis: 'confidence und matchType aus der Namensauflösung sind im Datenbestand nicht gespeichert. Ohne sie ist der Treffer nicht überprüfbar.',
        },
        {
          k: 'Deutscher Name', v: baum.art_deutsch || FEHLT,
          hinweis: 'Deutsche Trivialnamen sind nicht normiert. Die Referenz liefert keine; dieser Name ist eine Eingabe ohne Quelle.',
        },
        ...gemeinsam,
      ],
    }
  }

  return (
    <div style={{ padding: '18px 16px 60px', maxWidth: 1080, margin: '0 auto', fontFamily: SANS }}>
      <header style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
          <TreeDeciduous size={18} color={FG} aria-hidden />
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: FG }}>Baumkataster</h1>
        </div>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {standort ? standort.name : 'Kein Standort'} · Stand {fmtDatum(stand.stichdatum)} ·{' '}
          {zahl(gruppen.alle.length)} Bäume
        </p>
      </header>

      {/* Die Antwort auf die Amtsfrage, ohne Klick sichtbar. Die Zahl trägt
          ihren Bezug bei sich und sagt ausdrücklich, was sie nicht bedeutet. */}
      <Karte style={{ marginBottom: 12 }}>
        <div style={LABEL}>Dokumentierte Kontrollen {stichjahr}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 8 }}>
          <div>
            <div data-test="anzahl-offen" style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: FG, lineHeight: 1.1 }}>
              {zahl(gruppen.ohne_kontrolle.length)}
            </div>
            <div style={{ fontSize: 13, color: FG }}>
              Bäume ohne dokumentierte Kontrolle in {stichjahr}
            </div>
          </div>
          <div>
            <div data-test="anzahl-nie" style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: FG, lineHeight: 1.1 }}>
              {zahl(gruppen.nie.length)}
            </div>
            <div style={{ fontSize: 13, color: FG }}>davon noch nie kontrolliert</div>
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          Bestand {standort ? standort.name : '—'} mit {gruppen.alle.length} Bäumen,
          Zeitraum 01.01.{stichjahr} bis {fmtDatum(stand.stichdatum)}, Stichtag{' '}
          {fmtDatum(stand.stichdatum)}. Gezählt werden dokumentierte Kontrollen jeder Art.
        </p>
        <p data-test="kein-faelligkeitsurteil" style={{ margin: '8px 0 0', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          Das ist <strong style={{ color: FG }}>keine Fälligkeitsaussage</strong>. Wann eine
          Regelkontrolle fällig ist, richtet sich nach Entwicklungsphase, berechtigter
          Sicherheitserwartung und Zustand des einzelnen Baums, gerechnet ab der letzten
          Kontrolle — nicht nach dem Kalenderjahr. Diese drei Größen sind im Datenbestand
          nicht erfasst; BIOME kann das Intervall deshalb nicht berechnen und tut es nicht.
        </p>
      </Karte>

      <div role="group" aria-label="Bestand filtern"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {chips.map(c => {
          const aktiv = filter === c.id
          return (
            <button key={c.id} type="button" onClick={() => setFilter(c.id)}
              aria-pressed={aktiv} data-test={`filter-${c.id}`}
              style={{
                minHeight: 36, padding: '7px 12px', borderRadius: 18, cursor: 'pointer',
                fontFamily: SANS, fontSize: 13, color: FG,
                border: `1px solid ${aktiv ? FG : BORDER}`,
                background: aktiv ? 'color-mix(in srgb, var(--luma-a) 22%, transparent)' : 'transparent',
                fontWeight: aktiv ? 600 : 400,
              }}>
              {c.text} <span style={{ fontFamily: MONO, fontSize: 11, color: FG }}>{c.n}</span>
            </button>
          )
        })}
        <button type="button" onClick={() => exportCsv(stand, sichtbar, chips.find(c => c.id === filter))}
          data-test="export"
          style={{
            minHeight: 36, padding: '7px 12px', borderRadius: 18, cursor: 'pointer',
            fontFamily: SANS, fontSize: 13, color: FG, border: `1px solid ${BORDER}`,
            background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 6,
            marginLeft: 'auto',
          }}>
          {/* Der Knopf sagt, wie viele Zeilen die Datei bekommt — sonst ist am
              Bildschirm nicht erkennbar, ob der Filter mit exportiert wird. */}
          <Download size={13} aria-hidden /> Liste herunterladen ({sichtbar.length})
        </button>
      </div>

      {/* Sagt Screenreadern, dass sich die Liste geändert hat — sonst merkt es
          nur, wer sieht, dass sie kürzer geworden ist. */}
      <p aria-live="polite" data-test="liste-status" style={{ ...LABEL, margin: '0 0 8px' }}>
        {sichtbar.length === gruppen.alle.length
          ? `${sichtbar.length} Bäume, alle`
          : `${sichtbar.length} von ${gruppen.alle.length} Bäumen — ${chips.find(c => c.id === filter)?.text}`}
      </p>

      <div data-test="liste" style={{ display: 'grid', gap: 6 }}>
        {sichtbar.length === 0 && (
          <Karte><div style={{ color: MUTED, fontStyle: 'italic' }}>Kein Baum in dieser Auswahl.</div></Karte>
        )}
        {sichtbar.map(b => {
          const u = messung(b, 'stammumfang')
          const k = letzteKontrolle(b)
          const stufe = vitalitaet(b)
          const zustand = kontrollstand(b, stichjahr)
          const stufeInfo = stufe ? ROLOFF_VS.stufen.find(s => s.stufe === stufe.stufe) : null
          const stamm = staerksterStamm(b)
          return (
            <Karte key={b.id} data-test={`baum-${b.baumnummer}`} style={{ padding: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
                <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: FG, minWidth: 62 }}>
                  {b.baumnummer}
                </div>

                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  {b.art_wissenschaftlich ? (
                    <Wert monospace={false}
                      text={<em>{b.art_wissenschaftlich}</em>}
                      beschriftung={`Herkunft des Artnamens von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(herkunftStammdatum(b, 'taxon'), ev)} />
                  ) : (
                    <span data-test="art-unbestimmt" style={{ color: MUTED, fontStyle: 'italic', fontSize: 14 }}>
                      Art unbestimmt
                    </span>
                  )}
                </div>

                <div style={{ minWidth: 150 }}>
                  <div style={LABEL}>Stammumfang</div>
                  {/* Ein mehrstämmiger Baum hat in 1,30 m keinen einen Umfang.
                      „Keine Angabe" wäre hier falsch: gemessen wurde sehr wohl,
                      nur je Stamm. */}
                  {!u && stamm ? (
                    <Wert
                      text={`${mitEinheit(stamm.messung.wert, 'cm')} @ ${stamm.messung.messhoehe_cm} cm`}
                      beschriftung={`Herkunft des stärksten Stamms von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(herkunftStamm(b, stamm), ev)} />
                  ) : (
                    <Wert
                      fehlt={!u}
                      text={u ? `${mitEinheit(u.wert, u.einheit)}${u.messhoehe_cm != null ? ` @ ${u.messhoehe_cm} cm` : ''}` : ''}
                      beschriftung={`Herkunft des Stammumfangs von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(herkunftStammumfang(b), ev)} />
                  )}
                  {!u && stamm && (
                    <div style={{ color: MUTED, fontSize: 12 }} data-test="stamm-hinweis">
                      stärkster von {stamm.anzahlStaemme} Stämmen
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 170 }}>
                  <div style={LABEL}>Letzte Kontrolle</div>
                  {zustand === 'nie_kontrolliert' ? (
                    <span data-test="nie-kontrolliert" style={{ color: FG, fontSize: 13 }}>
                      noch nie kontrolliert
                    </span>
                  ) : (
                    <>
                      <Wert
                        text={fmtDatum(k?.datum)}
                        beschriftung={`Herkunft der letzten Kontrolle von ${b.baumnummer} anzeigen`}
                        onOeffnen={ev => herkunftOeffnen(herkunftKontrolle(b), ev)} />
                      {zustand === 'jahr_ohne' && (
                        <div style={{ color: MUTED, fontSize: 12 }}>
                          keine Kontrolle in {stichjahr}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ minWidth: 150 }}>
                  <div style={LABEL}>Vitalität</div>
                  <Wert monospace={false}
                    fehlt={!stufeInfo}
                    text={stufeInfo ? `${stufeInfo.kurz} · ${stufeInfo.bezeichnung}` : ''}
                    beschriftung={`Herkunft der Vitalitätsstufe von ${b.baumnummer} anzeigen`}
                    onOeffnen={ev => herkunftOeffnen(herkunftVitalitaet(b), ev)} />
                  {/* Eine Vitalitätsstufe ohne Datum ist zeitlos — und damit
                      wertlos. VS 1 von 2019 und VS 1 von gestern sahen in
                      dieser Spalte bis 2026-08-10 gleich aus. */}
                  {stufe && (
                    <div style={{ color: MUTED, fontSize: 12 }} data-test="vitalitaet-datum">
                      beurteilt {fmtDatum(stufe.datum)}
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => setOffenId(offenId === b.id ? null : b.id)}
                  aria-expanded={offenId === b.id} aria-label={`Details zu ${b.baumnummer}`}
                  style={{
                    width: TIPPZIEL, height: TIPPZIEL, borderRadius: 8, border: `1px solid ${BORDER}`,
                    background: 'transparent', color: FG, cursor: 'pointer', marginLeft: 'auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ChevronRight size={16} style={{ transform: offenId === b.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                </button>
              </div>

              {offenId === b.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, display: 'grid', gap: 8, fontSize: 13 }}>
                  <Zeile k="Standort in Koordinaten">
                    <Wert
                      fehlt={!b.position}
                      text={koordinate(
                        b.position ? { lat: b.position.coordinates[1], lng: b.position.coordinates[0] } : null,
                        { crs: b.crs, genauigkeitM: b.lagegenauigkeit_m, bezug: b.lagegenauigkeit_bezug },
                      )}
                      beschriftung={`Herkunft des Standorts von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(herkunftStammdatum(b, 'position'), ev)} />
                  </Zeile>
                  <Zeile k="Pflanzjahr">
                    <Wert
                      fehlt={b.gepflanzt_jahr == null}
                      text={String(b.gepflanzt_jahr)}
                      beschriftung={`Herkunft des Pflanzjahrs von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(herkunftStammdatum(b, 'pflanzjahr'), ev)} />
                  </Zeile>
                  {/* Ohne die Stammform ist die Schutzschwelle nicht
                      bestimmbar: 80 cm einstämmig, 50 cm am stärksten Stamm
                      bei Mehrstämmigkeit (BAUM-BE-06). Die Zeile stand bis
                      2026-08-10 nirgends — der Sachverhalt existierte in
                      BIOME nicht. */}
                  <Zeile k="Stammform">
                    {b.mehrstaemmig == null ? (
                      <span style={{ color: MUTED, fontStyle: 'italic' }} data-test="stammform-fehlt">
                        nicht erhoben — davon hängt ab, ob 80 cm oder 50 cm als Schutzschwelle gelten
                      </span>
                    ) : b.mehrstaemmig ? (
                      <span style={{ color: FG }} data-test="stammform">
                        mehrstämmig
                        {stamm
                          ? ` · ${stamm.anzahlStaemme} Stämme erfasst, stärkster ${mitEinheit(stamm.messung.wert, 'cm')}`
                          : ' · kein Umfang einem Stamm zugeordnet'}
                      </span>
                    ) : (
                      <span style={{ color: FG }} data-test="stammform">einstämmig</span>
                    )}
                  </Zeile>
                  <Zeile k="Deutscher Name">
                    <span style={{ color: b.art_deutsch ? FG : MUTED, fontStyle: b.art_deutsch ? 'normal' : 'italic' }}>
                      {b.art_deutsch || FEHLT}
                      {b.art_deutsch && <span style={{ color: MUTED }}> · nicht normiert, ohne Quelle</span>}
                    </span>
                  </Zeile>
                  {k && (
                    <Zeile k="Art der Kontrolle">
                      <span style={{ color: FG }}>{KONTROLLART[k.art] || k.art}</span>
                    </Zeile>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                    {KONTROLLE_HINWEIS}
                  </p>
                </div>
              )}
            </Karte>
          )
        })}
      </div>

      <HerkunftsTafel eintrag={herkunft} onSchliessen={herkunftSchliessen} />
    </div>
  )
}

function Zeile({ k, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <span style={{ ...LABEL, minWidth: 150 }}>{k}</span>
      <span style={{ color: FG, flex: 1, minWidth: 180 }}>{children}</span>
    </div>
  )
}

/**
 * Liste als CSV. Der Kopf sagt, was die Datei ist, was sie nicht ist, und
 * welchen Ausschnitt sie zeigt.
 *
 * @param {import('../biome/daten.js').Datenstand} stand
 * @param {import('../biome/daten.js').Baum[]} auswahl
 * @param {{id: string, text: string}|undefined} chip
 */
function exportCsv(stand, auswahl, chip) {
  const standort = stand.standorte[0]
  const stichjahr = Number(stand.stichdatum.slice(0, 4))
  const verteilung = artenverteilung(auswahl)
    .map(v => `${v.art || 'unbestimmt'}: ${v.anzahl}`)
    .join('; ')

  const kopf = [
    '# Bestandsliste Bäume',
    `# Standort: ${standort?.name || FEHLT}${standort?.adresse ? ', ' + standort.adresse : ''}`,
    `# Auswahl: ${chip ? chip.text : 'Alle Bäume'} — ${auswahl.length} von ${stand.baeume.length} Bäumen`,
    `# Stichtag: ${fmtDatum(stand.stichdatum)}`,
    `# Artenverteilung in dieser Auswahl: ${verteilung}`,
    '# Datenbestand: BIOME Nachweiskern, Tabellen biome_baum, biome_baum_messung, biome_kontrolle',
    `# Erzeugt: ${fmtDatum(new Date())} aus LUMA BIOME`,
    '#',
    '# Dies ist eine Bestandsliste, keine Baumkontrolle und keine Aussage zur',
    '# Verkehrssicherheit. Die Regelkontrolle ist eine visuelle Inaugenscheinnahme',
    '# durch eine fachlich qualifizierte Person und wird gesondert dokumentiert.',
    '#',
    '# Die Spalte "Kontrolle im Jahr" sagt nur, ob eine Kontrolle dokumentiert ist.',
    '# Sie ist KEINE Fälligkeitsaussage: das Regelintervall richtet sich nach',
    '# Entwicklungsphase, Sicherheitserwartung und Zustand des einzelnen Baums,',
    '# nicht nach dem Kalenderjahr.',
    '#',
    '# "kein Wert erfasst" bedeutet: kein Wert vorhanden. Es bedeutet nicht null.',
    '#',
    '# Bei mehrstämmigen Bäumen bleibt "Stammumfang cm" leer: in 1,30 m Höhe gibt',
    '# es dort keinen einzelnen Umfang. Maßgeblich für den Schutz nach § 2',
    '# BaumSchVO ist der stärkste Einzelstamm ab 50 cm, nicht die Summe.',
  ].join('\n')

  const spalten = [
    'Baumnummer', 'Art wissenschaftlich', 'Art deutsch (nicht normiert)', 'Taxonomie-Referenz',
    'Taxon-Kennung', 'Stammumfang cm', 'Messhöhe cm', 'Pflanzjahr',
    'Stammform', 'Stärkster Stamm cm', 'Erfasste Stämme',
    'Letzte Kontrolle', 'Art der Kontrolle', `Kontrolle im Jahr ${stichjahr}`,
    'Breitengrad', 'Längengrad', 'CRS', 'Lagegenauigkeit m', 'Bezugsebene Lagegenauigkeit',
  ]

  const zeilen = auswahl.map(b => {
    const u = messung(b, 'stammumfang')
    const k = letzteKontrolle(b)
    const z = kontrollstand(b, stichjahr)
    const stamm = staerksterStamm(b)
    return [
      b.baumnummer,
      b.art_wissenschaftlich || 'unbestimmt',
      b.art_deutsch || '',
      b.taxon_quelle || '',
      b.taxon_id || '',
      u ? String(u.wert) : 'kein Wert erfasst',
      u?.messhoehe_cm != null ? String(u.messhoehe_cm) : 'kein Wert erfasst',
      b.gepflanzt_jahr != null ? String(b.gepflanzt_jahr) : 'kein Wert erfasst',
      b.mehrstaemmig == null ? 'nicht erhoben' : b.mehrstaemmig ? 'mehrstämmig' : 'einstämmig',
      stamm ? String(stamm.messung.wert) : 'kein Wert erfasst',
      stamm ? String(stamm.anzahlStaemme) : 'kein Wert erfasst',
      z === 'nie_kontrolliert' ? 'noch nie kontrolliert' : (k?.datum || 'kein Wert erfasst'),
      k ? (KONTROLLART[k.art] || k.art) : 'kein Wert erfasst',
      z === 'kontrolliert' ? 'dokumentiert' : z === 'nie_kontrolliert' ? 'noch nie kontrolliert' : 'nicht dokumentiert',
      b.position ? String(b.position.coordinates[1]) : '',
      b.position ? String(b.position.coordinates[0]) : '',
      b.crs,
      b.lagegenauigkeit_m != null && b.lagegenauigkeit_bezug ? String(b.lagegenauigkeit_m) : 'kein Wert erfasst',
      b.lagegenauigkeit_bezug || 'kein Wert erfasst',
    ]
  })

  const csv = [
    kopf,
    spalten.join(';'),
    ...zeilen.map(z => z.map(f => (/[;"\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f)).join(';')),
  ].join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `baumbestand-${standort?.kuerzel || 'standort'}-${stand.stichdatum}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
