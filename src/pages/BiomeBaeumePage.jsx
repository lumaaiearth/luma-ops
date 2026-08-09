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
 *                           Budget: 2 Klicks. Deshalb ist hier jede Zahl
 *                           selbst die Schaltfläche.
 *
 * Gestaltungsregeln, die hier durchgehalten werden:
 *   · Fehlendes wird als fehlend gezeigt, nie als 0 und nie als leere Zelle.
 *   · „Noch nie kontrolliert" ist ein anderer Zustand als „dieses Jahr offen".
 *   · Keine Farbe trägt allein Bedeutung; jede Markierung hat auch Text.
 *   · LUMA-Mint nur als Fläche und Marker, nie als Textfarbe.
 */
import { useEffect, useMemo, useState } from 'react'
import { TreeDeciduous, Download, X, ChevronRight } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED, CARD, WARN } from '../lib/theme.js'
import {
  ladeDatenstand, messung, ersetzteMessung, letzteKontrolle, kontrollstand,
  vitalitaet, artenverteilung, nachschlagen,
} from '../biome/daten.js'
import { FEHLT, datum as fmtDatum, mitEinheit, koordinate, zahl } from '../biome/format.js'
import { ROLOFF_VS, STAMMUMFANG, KONTROLLE_HINWEIS } from '../biome/baumStandards.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const LABEL = {
  fontFamily: MONO, fontSize: 9, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: MUTED,
}

/** Mindestgröße für Tippziele nach WCAG 2.1 AA. */
const TIPPZIEL = 44

function Karte({ children, ...rest }) {
  return (
    <div {...rest} style={{
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 14, ...(rest.style || {}),
    }}>{children}</div>
  )
}

/**
 * Eine Zahl, die ihre Herkunft kennt. Der Kern der Zwei-Klick-Regel: was
 * angezeigt wird, ist zugleich der Weg zur Quelle.
 */
function HerkunftsZahl({ text, fehlt, onOeffnen, beschriftung }) {
  if (fehlt) {
    return (
      <span style={{ color: MUTED, fontStyle: 'italic', fontFamily: SANS, fontSize: 13 }}>
        {FEHLT}
      </span>
    )
  }
  return (
    <button type="button" onClick={onOeffnen} aria-label={beschriftung}
      style={{
        font: 'inherit', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: FG,
        background: 'transparent', border: 'none', borderBottom: `1px dashed ${MUTED}`,
        padding: '2px 0', cursor: 'pointer', textAlign: 'left', minHeight: 24,
      }}>
      {text}
    </button>
  )
}

/** Der zweite Klick: alles, was die Zahl zu einer überprüfbaren Zahl macht. */
function HerkunftsTafel({ eintrag, onSchliessen }) {
  if (!eintrag) return null
  const { titel, wert, m, person, methode, standard, ersetzt, ersetztPerson } = eintrag
  return (
    <div role="dialog" aria-modal="true" aria-label={`Herkunft: ${titel}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.45)',
      }}
      onClick={onSchliessen}>
      <div onClick={e => e.stopPropagation()} style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px 14px 0 0',
        width: 'min(560px, 100%)', maxHeight: '86vh', overflowY: 'auto',
        padding: 18, paddingBottom: 'calc(18px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={LABEL}>Herkunft</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: FG, fontFamily: SANS }}>{titel}</div>
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

        <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: FG, marginBottom: 14 }}>
          {wert}
        </div>

        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '8px 14px', fontSize: 13 }}>
          <dt style={LABEL}>Datum</dt>
          <dd style={{ margin: 0, color: FG }}>{fmtDatum(m.datum)}</dd>

          <dt style={LABEL}>Messhöhe</dt>
          <dd style={{ margin: 0, color: FG }}>
            {m.messhoehe_cm != null ? mitEinheit(m.messhoehe_cm, 'cm') : FEHLT}
          </dd>

          <dt style={LABEL}>Verfahren</dt>
          <dd style={{ margin: 0, color: FG }}>
            {methode ? methode.name : FEHLT}
            {methode?.beschreibung && (
              <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{methode.beschreibung}</div>
            )}
          </dd>

          <dt style={LABEL}>Messgerät</dt>
          <dd style={{ margin: 0, color: FG }}>{m.messgeraet || FEHLT}</dd>

          <dt style={LABEL}>Person</dt>
          <dd style={{ margin: 0, color: FG }}>
            {person ? person.name : FEHLT}
            {person?.qualifikation && (
              <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{person.qualifikation}</div>
            )}
          </dd>

          <dt style={LABEL}>Erfasst am</dt>
          <dd style={{ margin: 0, color: FG }}>{fmtDatum(m.erfasst_am)}</dd>

          <dt style={LABEL}>Quelle</dt>
          <dd style={{ margin: 0, color: FG }}>
            {standard ? (
              <>
                {standard.kurzname}
                <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                  {standard.herausgeber} · abgerufen {fmtDatum(standard.abgerufen_am)}
                </div>
                <a href={standard.quelle_url} target="_blank" rel="noreferrer"
                  style={{ color: FG, fontSize: 12, wordBreak: 'break-all' }}>
                  {standard.quelle_url}
                </a>
              </>
            ) : FEHLT}
          </dd>
        </dl>

        {ersetzt && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${BORDER}`, background: 'color-mix(in srgb, var(--luma-fg) 4%, transparent)',
          }}>
            <div style={{ ...LABEL, color: WARN, marginBottom: 6 }}>Dieser Wert wurde korrigiert</div>
            <div style={{ fontSize: 13, color: FG }}>
              Vorher: <strong style={{ fontFamily: MONO }}>{mitEinheit(ersetzt.wert, ersetzt.einheit)}</strong>
              {' '}· erfasst am {fmtDatum(ersetzt.datum)}
              {ersetztPerson ? ` von ${ersetztPerson.name}` : ''}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
              {m.korrektur_grund}
            </div>
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
  const [offen, setOffen] = useState(null)

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
      jahr_offen: b.filter(x => kontrollstand(x, stichjahr) !== 'kontrolliert'),
      nie: b.filter(x => kontrollstand(x, stichjahr) === 'nie_kontrolliert'),
      ohne_umfang: b.filter(x => !messung(x, 'stammumfang')),
      unbestimmt: b.filter(x => !x.art_wissenschaftlich),
    }
  }, [stand, stichjahr])

  if (fehler) {
    return (
      <div style={{ padding: 20, maxWidth: 1080, margin: '0 auto' }}>
        <Karte><div style={{ color: FG }}>{fehler}</div></Karte>
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
    { id: 'jahr_offen', text: `Kontrolle ${stichjahr} offen`, n: gruppen.jahr_offen.length },
    { id: 'nie', text: 'Noch nie kontrolliert', n: gruppen.nie.length },
    { id: 'ohne_umfang', text: 'Ohne Stammumfang', n: gruppen.ohne_umfang.length },
    { id: 'unbestimmt', text: 'Art unbestimmt', n: gruppen.unbestimmt.length },
  ]

  function herkunftOeffnen(baum, m, titel) {
    const ersetzt = ersetzteMessung(baum, m)
    setHerkunft({
      titel,
      wert: mitEinheit(m.wert, m.einheit),
      m,
      person: nachschlag.person(m.erfasst_von),
      methode: nachschlag.methode(m.methode_id),
      standard: nachschlag.standardZuMethode(m.methode_id),
      ersetzt,
      ersetztPerson: ersetzt ? nachschlag.person(ersetzt.erfasst_von) : null,
    })
  }

  return (
    <div style={{ padding: '18px 16px 60px', maxWidth: 1080, margin: '0 auto', fontFamily: SANS }}>
      {/* Kopf: was für ein Bestand, welcher Stand, wie groß */}
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
          ihren Bezug bei sich: welcher Bestand, welcher Zeitraum, welcher Stand. */}
      <Karte style={{ marginBottom: 12 }}>
        <div style={LABEL}>Kontrollstand {stichjahr}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, marginTop: 8 }}>
          <div>
            <div data-test="anzahl-offen" style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: FG, lineHeight: 1.1 }}>
              {zahl(gruppen.jahr_offen.length)}
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
          {fmtDatum(stand.stichdatum)}. Gezählt wird das Fehlen einer dokumentierten
          Kontrolle. Daraus folgt keine Aussage über den Zustand eines Baums.
        </p>
      </Karte>

      {/* Filter: ein Klick je Frage */}
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
              {/* Die Zahl in Vordergrundfarbe: auf dem mint getönten Grund des
                  aktiven Chips erreicht gedämpfter Text die 4,5:1 nicht. */}
              {c.text} <span style={{ fontFamily: MONO, fontSize: 11, color: FG }}>{c.n}</span>
            </button>
          )
        })}
        <button type="button" onClick={() => exportCsv(stand, nachschlag)} data-test="export"
          style={{
            minHeight: 36, padding: '7px 12px', borderRadius: 18, cursor: 'pointer',
            fontFamily: SANS, fontSize: 13, color: FG, border: `1px solid ${BORDER}`,
            background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 6,
            marginLeft: 'auto',
          }}>
          <Download size={13} aria-hidden /> Bestandsliste
        </button>
      </div>

      {/* Der Bestand */}
      <div data-test="liste" style={{ display: 'grid', gap: 6 }}>
        {sichtbar.length === 0 && (
          <Karte><div style={{ color: MUTED, fontStyle: 'italic' }}>
            Kein Baum in dieser Auswahl.
          </div></Karte>
        )}
        {sichtbar.map(b => {
          const u = messung(b, 'stammumfang')
          const k = letzteKontrolle(b)
          const stufe = vitalitaet(b)
          const stand_ = kontrollstand(b, stichjahr)
          const stufeInfo = stufe ? ROLOFF_VS.stufen.find(s => s.stufe === stufe.stufe) : null
          return (
            <Karte key={b.id} data-test={`baum-${b.baumnummer}`} style={{ padding: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
                <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: FG, minWidth: 62 }}>
                  {b.baumnummer}
                </div>
                <div style={{ flex: '1 1 190px', minWidth: 0 }}>
                  {b.art_wissenschaftlich ? (
                    <>
                      <em style={{ color: FG, fontSize: 14 }}>{b.art_wissenschaftlich}</em>
                      {b.art_deutsch && <span style={{ color: MUTED, fontSize: 13 }}> · {b.art_deutsch}</span>}
                    </>
                  ) : (
                    <span data-test="art-unbestimmt" style={{ color: MUTED, fontStyle: 'italic', fontSize: 14 }}>
                      Art unbestimmt
                    </span>
                  )}
                </div>

                <div style={{ minWidth: 150 }}>
                  <div style={LABEL}>Umfang ({STAMMUMFANG.messhoeheCm} cm Höhe)</div>
                  <HerkunftsZahl
                    fehlt={!u}
                    text={u ? mitEinheit(u.wert, u.einheit) : ''}
                    beschriftung={`Herkunft des Stammumfangs von ${b.baumnummer} anzeigen`}
                    onOeffnen={() => herkunftOeffnen(b, u, `Stammumfang ${b.baumnummer}`)}
                  />
                </div>

                <div style={{ minWidth: 150 }}>
                  <div style={LABEL}>Letzte Kontrolle</div>
                  {stand_ === 'nie_kontrolliert' ? (
                    <span data-test="nie-kontrolliert" style={{ color: FG, fontSize: 13 }}>
                      noch nie kontrolliert
                    </span>
                  ) : (
                    <span style={{ fontFamily: MONO, fontSize: 13, color: FG }}>
                      {fmtDatum(k?.datum)}
                      {stand_ === 'jahr_offen' && (
                        <span style={{ color: MUTED, fontFamily: SANS, fontSize: 12 }}>
                          {' '}· {stichjahr} offen
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div style={{ minWidth: 130 }}>
                  <div style={LABEL}>Vitalität</div>
                  <span style={{ fontSize: 13, color: stufeInfo ? FG : MUTED, fontStyle: stufeInfo ? 'normal' : 'italic' }}>
                    {stufeInfo ? `${stufeInfo.kurz} · ${stufeInfo.bezeichnung}` : FEHLT}
                  </span>
                </div>

                <button type="button" onClick={() => setOffen(offen === b.id ? null : b.id)}
                  aria-expanded={offen === b.id} aria-label={`Details zu ${b.baumnummer}`}
                  style={{
                    width: TIPPZIEL, height: TIPPZIEL, borderRadius: 8, border: `1px solid ${BORDER}`,
                    background: 'transparent', color: FG, cursor: 'pointer', marginLeft: 'auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ChevronRight size={16} style={{ transform: offen === b.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                </button>
              </div>

              {offen === b.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, display: 'grid', gap: 8, fontSize: 13 }}>
                  <Zeile k="Standort in Koordinaten" v={koordinate(
                    b.position ? { lat: b.position.coordinates[1], lng: b.position.coordinates[0] } : null,
                    { crs: b.crs, genauigkeitM: b.lagegenauigkeit_m },
                  )} />
                  <Zeile k="Pflanzjahr" v={b.gepflanzt_jahr != null ? String(b.gepflanzt_jahr) : FEHLT} />
                  <Zeile k="Taxonomie" v={b.taxon_quelle ? `${b.taxon_quelle} · ${b.taxon_id}` : FEHLT} />
                  {k && (
                    <>
                      <Zeile k="Kontrolliert von" v={`${nachschlag.person(k.durchgefuehrt_von)?.name || FEHLT} · ${k.qualifikation}`} />
                      <Zeile k="Belaubungszustand" v={k.belaubungszustand || FEHLT} />
                      <Zeile k="Befund" v={k.ergebnis_text || FEHLT} />
                      <Zeile k="Maßnahme empfohlen" v={k.massnahme_empfohlen ? 'ja, durch die kontrollierende Person' : 'nein'} />
                    </>
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

      <HerkunftsTafel eintrag={herkunft} onSchliessen={() => setHerkunft(null)} />
    </div>
  )
}

function Zeile({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ ...LABEL, minWidth: 150 }}>{k}</span>
      <span style={{ color: FG, flex: 1, minWidth: 180 }}>{v}</span>
    </div>
  )
}

/**
 * Bestandsliste als CSV. Der Kopf sagt, was die Datei ist und was sie nicht
 * ist — sie wird weitergereicht und muss ohne Begleitung verständlich sein.
 *
 * @param {import('../biome/daten.js').Datenstand} stand
 * @param {ReturnType<typeof nachschlagen>} nachschlag
 */
function exportCsv(stand, nachschlag) {
  const standort = stand.standorte[0]
  const verteilung = artenverteilung(stand.baeume)
    .map(v => `${v.art || 'unbestimmt'}: ${v.anzahl}`)
    .join('; ')

  const kopf = [
    `# Bestandsliste Bäume`,
    `# Standort: ${standort?.name || FEHLT}${standort?.adresse ? ', ' + standort.adresse : ''}`,
    `# Stichtag: ${fmtDatum(stand.stichdatum)}`,
    `# Anzahl Bäume: ${stand.baeume.length}`,
    `# Artenverteilung: ${verteilung}`,
    `# Datenbestand: BIOME Nachweiskern, Tabellen biome_baum und biome_baum_messung`,
    `# Erzeugt: ${fmtDatum(new Date())} aus LUMA BIOME`,
    `# Hinweis: Dies ist eine Bestandsliste, keine Baumkontrolle und keine Aussage`,
    `# zur Verkehrssicherheit. Die Regelkontrolle ist eine visuelle Inaugenscheinnahme`,
    `# durch eine fachlich qualifizierte Person und wird gesondert dokumentiert.`,
    `# Leere Felder bedeuten: kein Wert erfasst. Sie bedeuten nicht null.`,
  ].join('\n')

  const spalten = [
    'Baumnummer', 'Art wissenschaftlich', 'Art deutsch', 'Taxonomie-Quelle',
    'Stammumfang cm', 'Messhöhe cm', 'Pflanzjahr', 'Letzte Kontrolle', 'Kontrollstand',
    'Breitengrad', 'Längengrad', 'CRS',
  ]
  const stichjahr = Number(stand.stichdatum.slice(0, 4))

  const zeilen = stand.baeume.map(b => {
    const u = messung(b, 'stammumfang')
    const k = letzteKontrolle(b)
    const s = kontrollstand(b, stichjahr)
    return [
      b.baumnummer,
      b.art_wissenschaftlich || 'unbestimmt',
      b.art_deutsch || '',
      b.taxon_quelle || '',
      u ? String(u.wert) : 'kein Wert erfasst',
      u?.messhoehe_cm != null ? String(u.messhoehe_cm) : 'kein Wert erfasst',
      b.gepflanzt_jahr != null ? String(b.gepflanzt_jahr) : 'kein Wert erfasst',
      s === 'nie_kontrolliert' ? 'noch nie kontrolliert' : (k?.datum || 'kein Wert erfasst'),
      s === 'kontrolliert' ? `${stichjahr} kontrolliert` : s === 'jahr_offen' ? `${stichjahr} offen` : 'noch nie kontrolliert',
      b.position ? String(b.position.coordinates[1]) : '',
      b.position ? String(b.position.coordinates[0]) : '',
      b.crs,
    ]
  })

  const csv = [
    kopf,
    spalten.join(';'),
    ...zeilen.map(z => z.map(feld => (/[;"\n]/.test(feld) ? `"${feld.replace(/"/g, '""')}"` : feld)).join(';')),
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
  // nachschlag wird hier (noch) nicht gebraucht, bleibt aber Teil der
  // Signatur: die nächste Runde soll Person und Verfahren mit ausgeben.
  void nachschlag
}
