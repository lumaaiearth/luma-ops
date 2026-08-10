/**
 * BIOME — die untere Statusleiste.
 *
 * Belegt in `refs/design/google-earth.md`, GE-03: Google Earth führt unten eine
 * Leiste, die **Herkunftsangaben zum Bild unter dem Cursor** zeigt — nicht den
 * Programmzustand:
 *
 *   „Bewegen Sie den Cursor auf einen beliebigen Ort auf der Karte, um das
 *    Datum oder den Zeitraum der Aufnahme der Bilder in der unteren
 *    Statusleiste zu sehen."
 *
 * Das ist für ein Nachweisprodukt der übernehmenswerteste Zug des Vorbilds:
 * **Datenherkunft ist immer sichtbar und kostet keinen Platz im Layout.** In
 * BIOME steht hier, worauf sich alles bezieht, was gerade auf dem Schirm ist —
 * Standort, Stichtag, Bezugssystem, Datenstand.
 *
 * Die Quelle sagt ausdrücklich, dass eine Angabe fehlen kann („may not be
 * available in all locations or at all zoom levels"). Ein leerer Zustand ist
 * dokumentiert vorgesehen — und wird hier als „keine Angabe" gezeigt, nicht
 * weggelassen.
 *
 * Das Koordinatenformat ist laut GE-03 eine **Nutzereinstellung** (DMS oder
 * dezimal), keine Produktentscheidung. BIOME bietet sie noch nicht an; deshalb
 * steht hier nur das, was tatsächlich gilt.
 */
import { BORDER, FG, MUTED } from '../../lib/theme.js'
import { MONO, LABEL } from './bausteine.jsx'
import { FEHLT, datum as fmtDatum, crsUri } from '../format.js'

/**
 * @param {{ k: string, v: string, titel?: string }} p
 */
function Feld({ k, v, titel }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, minWidth: 0 }} title={titel}>
      <span style={{ ...LABEL, fontSize: 9 }}>{k}</span>
      <span style={{
        fontFamily: MONO, fontSize: 11,
        color: v === FEHLT ? MUTED : FG,
        fontStyle: v === FEHLT ? 'italic' : 'normal',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{v}</span>
    </span>
  )
}

/**
 * @param {{
 *   standort: {name?: string, crs?: string}|null,
 *   stichdatum: string|null,
 *   ebenenBilanz: {gesamt: number, bespielt: number},
 * }} p
 */
export default function Statusleiste({ standort, stichdatum, ebenenBilanz }) {
  const crs = standort?.crs || 'EPSG:4326'
  return (
    <footer
      data-test="statusleiste"
      style={{
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        padding: '7px 14px', borderTop: `1px solid ${BORDER}`,
        minHeight: 34, boxSizing: 'border-box',
      }}
    >
      <Feld k="Standort" v={standort?.name || FEHLT} />
      <Feld k="Stichtag" v={stichdatum ? fmtDatum(stichdatum) : FEHLT} />
      <Feld
        k="Bezugssystem"
        v={crs}
        titel={`Vorgeschriebene Schreibweise nach außen: ${crsUri(crs)}`}
      />
      {/* Die Bilanz sagt, wie viel vom Datenkern überhaupt bespielt ist. Ohne
          sie wirkt eine Oberfläche mit einer gefüllten Ebene vollständiger,
          als sie ist. */}
      <Feld
        k="Ebenen mit Daten"
        v={`${ebenenBilanz.bespielt} von ${ebenenBilanz.gesamt}`}
        titel="Die übrigen Domänen sind im Datenkern modelliert, aber noch nicht erfasst."
      />
    </footer>
  )
}
