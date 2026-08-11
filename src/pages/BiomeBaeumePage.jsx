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
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { TreeDeciduous, Download, ChevronRight, Map as MapIcon, List } from 'lucide-react'
import { BORDER, FG, MUTED, WARN } from '../lib/theme.js'
import { MONO, SANS, LABEL, TIPPZIEL, Karte, Wert, HerkunftsTafel, Zeile } from '../biome/ui/bausteine.jsx'
import {
  ladeDatenstand, messung, ersetzteMessung, letzteKontrolle, kontrollstand,
  vitalitaet, artenverteilung, nachschlagen, staerksterStamm,
} from '../biome/daten.js'
import { FEHLT, datum as fmtDatum, mitEinheit, koordinate, zahl, LAGE_BEZUG, crsUri, CRS_ENSEMBLE_HINWEIS } from '../biome/format.js'
import { ROLOFF_VS, KONTROLLE_HINWEIS, KONTROLLE_FESTLEGUNG, KONTROLLART_NAME as KONTROLLART } from '../biome/baumStandards.js'
import { herkunftBauer } from '../biome/herkunft.js'
import { karteninhalt, ebenenBilanz } from '../biome/ebenen.js'
import Karteninhalt from '../biome/ui/Karteninhalt.jsx'
import Inspector from '../biome/ui/Inspector.jsx'
import Statusleiste from '../biome/ui/Statusleiste.jsx'

// Die Karte kommt nachgeladen: sie zieht Leaflet und die Zeichenwerkzeuge mit,
// und wer die Liste öffnet, soll das nicht mitbezahlen.
const MapPage = lazy(() => import('./MapPage.jsx'))

/**
 * BIOME — die eine Oberfläche.
 *
 * Karte und Bestand sind zwei **Ansichten auf denselben Bestand**, nicht zwei
 * Bestände. Welche zu sehen ist, entscheidet der Umschalter in der Mitte; links
 * und rechts bleiben dieselben Flächen (GE-02). Der Aufrufweg legt nur den
 * Startzustand fest:
 *
 *   /biome, /map        → Karte
 *   /biome/baeume       → Bestand
 */
export default function BiomeBaeumePage() {
  const ort = useLocation()
  const [ansicht, setAnsicht] = useState(
    ort.pathname.startsWith('/biome/baeume') ? 'liste' : 'karte',
  )
  const [stand, setStand] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [filter, setFilter] = useState('alle')
  const [herkunft, setHerkunft] = useState(null)
  const [offenId, setOffenId] = useState(null)
  // Karteninhalt links, Inspector rechts — die Rollentrennung aus GE-02.
  // `sichtbarkeit` gehört zur Ebene, `auswahl` zum Inspector; beides bewusst
  // getrennt, weil eine sichtbare Ebene nicht die ausgewählte ist.
  const [sichtbarkeit, setSichtbarkeit] = useState(/** @type {Record<string,boolean>} */ ({}))
  const [auswahl, setAuswahl] = useState(/** @type {any} */ (null))
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

  const ebenen = useMemo(() => karteninhalt(stand), [stand])
  const bilanz = useMemo(() => ebenenBilanz(ebenen), [ebenen])

  // Ausgangssichtbarkeit einmal aus dem Katalog übernehmen. Danach gehört sie
  // dem Nutzer; ein Datenstand-Neuladen darf seine Auswahl nicht überschreiben.
  const ebenenGesetzt = useRef(false)
  useEffect(() => {
    if (ebenenGesetzt.current || !stand) return
    ebenenGesetzt.current = true
    setSichtbarkeit(Object.fromEntries(ebenen.flatMap(g => g.ebenen.map(e => [e.id, e.sichtbar]))))
  }, [stand, ebenen])

  /** GE-30: der Schaltmodus der Gruppe entscheidet, was ein Klick bewirkt. */
  function sichtbarkeitSetzen(id, an, gruppe) {
    setSichtbarkeit(vorher => {
      if (gruppe.schaltmodus === 'genau_eine' && an) {
        // Genau eine: die Geschwister gehen aus. Zwei Darstellungen derselben
        // Fläche würden einander widersprechen.
        const neu = { ...vorher }
        for (const e of gruppe.ebenen) neu[e.id] = e.id === id
        return neu
      }
      if (gruppe.schaltmodus === 'nur_abwaehlbar' && an) return vorher
      return { ...vorher, [id]: an }
    })
  }

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

  /* Die Herkunftsfunktionen liegen in src/biome/herkunft.js — eine Stelle für
     alle Ansichten. Solange sie hier als Closures standen, war die
     Zwei-Klick-Regel an diese eine Seite gebunden. */
  const h = herkunftBauer(nachschlag)

  /** Die im Inspector gewählte Ebene, falls eine gewählt ist. */
  const gewaehlteEbene = auswahl?.art === 'ebene' ? auswahl.ebene.id : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateRows: '1fr auto',
      minHeight: 'calc(100dvh - 56px)',
      fontFamily: SANS,
    }}>
      {/* Die Dreiteilung aus GE-02: links Karteninhalt (was ist geladen),
          Mitte der Bestand, rechts der Inspector (was ist ausgewählt).
          Bei schmalen Fenstern klappen die Seitenflächen unter den Inhalt —
          MD-10/MD-11 belegen nur die Zweiteilung, mehr behauptet BIOME nicht. */}
      <div className="biome-flaechen" style={{ display: 'flex', minHeight: 0, alignItems: 'stretch' }}>
        {/* Sprunglink: die Ebenenleiste bringt Tabstopps mit, und ohne diesen
            Link muss sie auf jeder Seite neu durchtabbt werden. Der Mangel
            stand seit Runde 2 im Verdikt. */}
        <a href="#biome-bestand" className="biome-sprunglink"
          style={{
            position: 'absolute', left: -9999, top: 0, zIndex: 50,
            padding: '10px 14px', background: 'var(--luma-card)',
            border: `1px solid ${FG}`, borderRadius: 8, color: FG, fontSize: 13,
          }}>
          Zum Bestand springen
        </a>

        <aside
          aria-label="Karteninhalt"
          className="biome-seitenflaeche"
          style={{
            width: 260, flexShrink: 0, borderRight: `1px solid ${BORDER}`,
            overflowY: 'auto',
          }}
        >
          <div style={{ ...LABEL, padding: '12px 12px 8px' }}>Karteninhalt</div>
          <Karteninhalt
            gruppen={ebenen}
            sichtbarkeit={sichtbarkeit}
            aufSichtbarkeit={sichtbarkeitSetzen}
            gewaehlt={gewaehlteEbene}
            aufWahl={id => {
              const e = ebenen.flatMap(g => g.ebenen).find(x => x.id === id)
              setAuswahl(e ? { art: 'ebene', ebene: e } : null)
            }}
          />
        </aside>

        {/* Kein zweites <main>: Layout.jsx führt bereits die main-Landmarke.
            Ein benannter Bereich reicht und bleibt für Screenreader
            ansteuerbar. */}
        <section id="biome-bestand" aria-label="Bestand" style={{
          flex: 1, minWidth: 0, overflowY: 'auto',
          padding: '18px 16px 24px',
        }}>
      <header style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3, flexWrap: 'wrap' }}>
          <TreeDeciduous size={18} color={FG} aria-hidden />
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: FG }}>
            {ansicht === 'karte' ? 'Karte' : 'Baumkataster'}
          </h1>

          {/* Karte und Bestand sind zwei Sichten auf dieselben Daten. Der
              Umschalter steht deshalb im Kopf und nicht im Menü — ein
              Menüwechsel würde zwei Bestände suggerieren. */}
          <div role="group" aria-label="Ansicht wählen"
            style={{ display: 'inline-flex', gap: 4, marginLeft: 'auto' }}>
            {[
              { id: 'karte', text: 'Karte', Symbol: MapIcon },
              { id: 'liste', text: 'Bestand', Symbol: List },
            ].map(({ id, text, Symbol }) => {
              const aktiv = ansicht === id
              return (
                <button key={id} type="button" onClick={() => setAnsicht(id)}
                  aria-pressed={aktiv} data-test={`ansicht-${id}`}
                  style={{
                    minHeight: 36, padding: '7px 12px', borderRadius: 18, cursor: 'pointer',
                    fontFamily: SANS, fontSize: 13, color: FG,
                    border: `1px solid ${aktiv ? FG : BORDER}`,
                    background: aktiv ? 'color-mix(in srgb, var(--luma-a) 22%, transparent)' : 'transparent',
                    fontWeight: aktiv ? 600 : 400,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                  <Symbol size={14} aria-hidden />{text}
                </button>
              )
            })}
          </div>
        </div>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {standort ? standort.name : 'Kein Standort'} · Stichtag {fmtDatum(stand.stichdatum)} ·{' '}
          {zahl(gruppen.alle.length)} Bäume
        </p>
      </header>

      {ansicht === 'karte' ? (
        <>
          {/* Die Karte liest noch aus `map_features`, die Liste aus dem
              Datenkern. Das steht hier, weil es ein Nutzer sonst nicht sehen
              kann und der Unterschied erheblich ist: für Kartenbäume gilt
              keine Append-only-Historie und keine Pflichtangabe von Messhöhe,
              Methode und Person. Siehe docs/BIOME_UMSTELLUNG.md. */}
          <Karte data-test="karte-hinweis" style={{ marginBottom: 10 }}>
            <div style={{ ...LABEL, marginBottom: 5 }}>Zwei Datenquellen, noch nicht zusammengeführt</div>
            <div style={{ fontSize: 13, color: FG, lineHeight: 1.5 }}>
              Die Karte zeigt den Altbestand aus <code>map_features</code>, der
              Bestand daneben den Datenkern. Für Bäume, die hier erfasst werden,
              gilt keine Korrekturkette und keine Pflichtangabe von Messhöhe,
              Verfahren und Person.
            </div>
          </Karte>
          <div style={{ height: 'min(72vh, 720px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <Suspense fallback={<div style={{ padding: 20, color: MUTED }}>Karte wird geladen…</div>}>
              <MapPage ohneSeitenleiste />
            </Suspense>
          </div>
        </>
      ) : (
        <>

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
                      onOeffnen={ev => herkunftOeffnen(h.stammdatum(b, 'taxon'), ev)} />
                  ) : (
                    <span data-test="art-unbestimmt" style={{ color: MUTED, fontStyle: 'italic', fontSize: 14 }}>
                      Art unbestimmt
                    </span>
                  )}
                </div>

                <div style={{ minWidth: 150 }}>
                  {/* Zwei Bezugsgrößen mit zwei verschiedenen Rechtsschwellen
                      (80 cm gegen 50 cm) dürfen nicht unter derselben
                      Überschrift stehen. Die Zeile sagt, was sie zeigt. */}
                  <div style={LABEL}>{!u && stamm ? 'Stärkster Stamm' : 'Stammumfang'}</div>
                  {/* Ein mehrstämmiger Baum hat in 1,30 m keinen einen Umfang.
                      „Keine Angabe" wäre hier falsch: gemessen wurde sehr wohl,
                      nur je Stamm. */}
                  {!u && stamm ? (
                    <Wert
                      text={`${mitEinheit(stamm.messung.wert, 'cm')} @ ${stamm.messung.messhoehe_cm} cm`}
                      beschriftung={`Herkunft des stärksten Stamms von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(h.stamm(b, stamm), ev)} />
                  ) : (
                    <Wert
                      fehlt={!u}
                      text={u ? `${mitEinheit(u.wert, u.einheit)}${u.messhoehe_cm != null ? ` @ ${u.messhoehe_cm} cm` : ''}` : ''}
                      beschriftung={`Herkunft des Stammumfangs von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(h.stammumfang(b), ev)} />
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
                        onOeffnen={ev => herkunftOeffnen(h.kontrolle(b), ev)} />
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
                    onOeffnen={ev => herkunftOeffnen(h.vitalitaet(b), ev)} />
                  {/* Eine Vitalitätsstufe ohne Datum ist zeitlos — und damit
                      wertlos. VS 1 von 2019 und VS 1 von gestern sahen in
                      dieser Spalte bis 2026-08-10 gleich aus. */}
                  {stufe && (
                    <div style={{ color: MUTED, fontSize: 12 }} data-test="vitalitaet-datum">
                      beurteilt {fmtDatum(stufe.datum)}
                    </div>
                  )}
                </div>

                <button type="button"
                  onClick={() => {
                    const auf = offenId === b.id
                    setOffenId(auf ? null : b.id)
                    // Auswahl und Aufklappen gehen zusammen: der Inspector
                    // zeigt dasselbe Objekt, nur vollständiger und an einem
                    // festen Ort. Zuklappen hebt die Auswahl auf.
                    setAuswahl(auf ? null : { art: 'baum', baum: b })
                  }}
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
                      onOeffnen={ev => herkunftOeffnen(h.stammdatum(b, 'position'), ev)} />
                  </Zeile>
                  <Zeile k="Pflanzjahr">
                    <Wert
                      fehlt={b.gepflanzt_jahr == null}
                      text={String(b.gepflanzt_jahr)}
                      beschriftung={`Herkunft des Pflanzjahrs von ${b.baumnummer} anzeigen`}
                      onOeffnen={ev => herkunftOeffnen(h.stammdatum(b, 'pflanzjahr'), ev)} />
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
                  {/* Getrennter Absatz, weil es eine getrennte Art von Aussage
                      ist: oben steht, was in den Quellen steht, hier steht,
                      was LUMA entschieden hat. */}
                  <p data-test="luma-festlegung"
                    style={{ margin: '2px 0 0', fontSize: 12, color: MUTED, lineHeight: 1.5, fontStyle: 'italic' }}>
                    {KONTROLLE_FESTLEGUNG}
                  </p>
                </div>
              )}
            </Karte>
          )
        })}
      </div>

        </>
      )}
        </section>

        <Inspector
          auswahl={auswahl}
          stichjahr={stichjahr}
          h={h}
          aufHerkunft={herkunftOeffnen}
          aufSchliessen={() => setAuswahl(null)}
        />
      </div>

      {/* Provenienz permanent statt auf Anfrage — der übernehmenswerteste Zug
          des Vorbilds (GE-03). Worauf sich alles auf dem Schirm bezieht, steht
          unten und kostet keinen Platz im Layout. */}
      <Statusleiste
        standort={standort}
        stichdatum={stand.stichdatum}
        ebenenBilanz={bilanz}
      />

      <HerkunftsTafel eintrag={herkunft} onSchliessen={herkunftSchliessen} />
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
const KEIN_WERT = 'kein Wert erfasst'

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
    '# Bei mehrstämmigen Bäumen steht in "Stammumfang cm" nicht "kein Wert erfasst",',
    '# sondern "je Stamm erfasst": in 1,30 m Höhe gibt es dort keinen einzelnen',
    '# Gesamtumfang, gemessen wurde aber sehr wohl. Die Werte stehen in',
    '# "Stärkster Stamm cm" und "Erfasste Stämme". Maßgeblich für den Schutz nach',
    '# § 2 BaumSchVO ist der stärkste Einzelstamm ab 50 cm, nicht die Summe.',
    '#',
    '# Das CRS steht als HTTP-URI, nicht als Freitext "EPSG:4326". Diese',
    '# Schreibweise ist in den GDI-DE-Konventionen für Exporte vorgeschrieben.',
    '#',
    '# Taxon-Kennungen tragen Trefferqualität, Trefferart und Auflösungsdatum.',
    '# Eine Kennung ohne diese drei ist keine Referenz, sondern nur eine Zahl.',
  ].join('\n')

  const spalten = [
    'Baumnummer', 'Art wissenschaftlich', 'Art deutsch (nicht normiert)', 'Taxonomie-Referenz',
    'Taxon-Kennung', 'Trefferqualität 0-100', 'Trefferart', 'Namensstatus', 'Taxon aufgelöst am',
    'Stammumfang cm', 'Messhöhe cm', 'Pflanzjahr',
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
      // B-009 hatte hier drei leere Zellen, obwohl die Datei im Kopf ihre
      // eigene Konvention für Fehlwerte erklärt. Leere Zelle heißt jetzt
      // nirgends mehr „nicht erfasst".
      b.art_deutsch || KEIN_WERT,
      b.taxon_quelle || KEIN_WERT,
      b.taxon_id || KEIN_WERT,
      b.taxon_confidence != null ? String(b.taxon_confidence) : KEIN_WERT,
      b.taxon_matchtype || KEIN_WERT,
      b.taxon_status || KEIN_WERT,
      b.taxon_abgerufen_am ? fmtDatum(b.taxon_abgerufen_am) : KEIN_WERT,
      // „kein Wert erfasst" wäre bei einem mehrstämmigen Baum eine falsche
      // Aussage: gemessen wurde, nur nicht am Gesamtbaum.
      u ? String(u.wert) : stamm ? 'je Stamm erfasst' : KEIN_WERT,
      u?.messhoehe_cm != null ? String(u.messhoehe_cm)
        : stamm?.messung.messhoehe_cm != null ? String(stamm.messung.messhoehe_cm)
          : KEIN_WERT,
      b.gepflanzt_jahr != null ? String(b.gepflanzt_jahr) : KEIN_WERT,
      b.mehrstaemmig == null ? 'nicht erhoben' : b.mehrstaemmig ? 'mehrstämmig' : 'einstämmig',
      stamm ? String(stamm.messung.wert) : KEIN_WERT,
      stamm ? String(stamm.anzahlStaemme) : KEIN_WERT,
      z === 'nie_kontrolliert' ? 'noch nie kontrolliert' : (k?.datum || KEIN_WERT),
      k ? (KONTROLLART[k.art] || k.art) : KEIN_WERT,
      z === 'kontrolliert' ? 'dokumentiert' : z === 'nie_kontrolliert' ? 'noch nie kontrolliert' : 'nicht dokumentiert',
      b.position ? String(b.position.coordinates[1]) : KEIN_WERT,
      b.position ? String(b.position.coordinates[0]) : KEIN_WERT,
      crsUri(b.crs),
      b.lagegenauigkeit_m != null && b.lagegenauigkeit_bezug ? String(b.lagegenauigkeit_m) : KEIN_WERT,
      b.lagegenauigkeit_bezug || KEIN_WERT,
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
