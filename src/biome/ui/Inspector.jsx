/**
 * BIOME — der Inspector.
 *
 * Die rechte Fläche der Dreiteilung aus GE-02. Sie ist **auswahlgetrieben**,
 * nicht navigationsgetrieben: sie zeigt, was gerade ausgewählt ist — ein Objekt
 * auf der Karte oder eine Ebene in der Liste — und sonst nichts.
 *
 * Belegt in `refs/design/google-earth.md`:
 *
 * · GE-02  „Wählen Sie in der Kartenansicht eine Funktion einer Ebene aus …
 *          Rechts wird der Inspector geöffnet, in dem Details zu dieser
 *          Funktion aus der Datenebene angezeigt werden."
 *          (Googles deutsche Fassung übersetzt „feature" durchgehend falsch als
 *          „Funktion". Gemeint ist das Geoobjekt. BIOME sagt „Objekt".)
 * · GE-02  Derselbe Bereich dient beiden Fällen — Ebene ausgewählt und Objekt
 *          ausgewählt. Deshalb **eine** Fläche, nicht zwei konkurrierende.
 * · MD-06  Side Sheet, angedockt: `m3_comp_sheet_side_docked_container_width`
 *          256 dp, `colorSurface`, Ecken „Corner.None", Elevation Level 0.
 *          BIOME nimmt 300 px statt 256 — die Herkunftszeilen sind zweispaltig
 *          und brechen bei 256 unschön um. Die Abweichung steht hier, damit
 *          niemand 256 im Register sucht.
 * · MD-08  Karte im Inspector: `colorSurface`, 1 dp Umriss, Elevation 0.
 *
 * ── Was der Inspector nicht tut ───────────────────────────────────────────
 *
 * Er stellt nichts fest. Er zeigt, was im Datenbestand steht, und wo nichts
 * steht, sagt er das. Jeder Wert darin ist eine Schaltfläche zu seiner
 * Herkunft — dieselbe Regel wie in der Liste, weil es dieselben Bauteile sind.
 */
import { useState } from 'react'
import { X, Box } from 'lucide-react'
import { BORDER, FG, MUTED } from '../../lib/theme.js'
import { MONO, SANS, LABEL, TIPPZIEL, Wert, Zeile } from './bausteine.jsx'
import { FEHLT, datum as fmtDatum, mitEinheit, koordinate, zahl } from '../format.js'
import { ROLOFF_VS } from '../baumStandards.js'
import { messung, letzteKontrolle, vitalitaet, staerksterStamm, kontrollstand, splatVerortet } from '../daten.js'
import { SPLAT_HINWEIS } from '../splat.js'
import { SplatTafel } from './SplatAnsicht.jsx'

/** Kopfzeile mit Schließknopf. */
function Kopf({ art, titel, aufSchliessen }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 12px 10px', borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={LABEL}>{art}</div>
        <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: FG, lineHeight: 1.3 }}>
          {titel}
        </div>
      </div>
      <button type="button" onClick={aufSchliessen} aria-label="Inspector schließen"
        style={{
          width: TIPPZIEL, height: TIPPZIEL, marginTop: -8, marginRight: -8,
          borderRadius: 8, border: 'none', background: 'transparent',
          color: FG, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
        <X size={16} />
      </button>
    </div>
  )
}

/**
 * Die Splat-Aufnahmen einer Ebene, jede mit ihrer Herkunft.
 *
 * Zwei Angaben stehen bewusst an jeder Zeile, noch bevor irgendetwas geladen
 * wird: die Zahl der Gaußfunktionen und **ob die Aufnahme verortet ist**. Die
 * zweite ist die, deren Fehlen sonst niemandem auffällt — sie steht nicht im
 * Dateiformat und wird deshalb gern vergessen (FE-GS-23).
 */
function SplatListe({ aufnahmen, h, aufHerkunft, aufOeffnen }) {
  return (
    <div data-test="splat-liste" style={{ display: 'grid', gap: 10 }}>
      {aufnahmen.map(a => {
        const verortet = splatVerortet(a)
        return (
          <div key={a.id} style={{
            border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10,
            display: 'grid', gap: 6,
          }}>
            <div style={LABEL}>Aufnahme</div>
            <Wert
              text={fmtDatum(a.flug_datum)}
              beschriftung={`Herkunft der 3D-Aufnahme vom ${a.flug_datum} anzeigen`}
              onOeffnen={ev => aufHerkunft(h.splat(a), ev)} />

            <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
              {zahl(a.splat_anzahl)} Gaußfunktionen · {a.sensor_id}
            </div>

            {/* Der Satz, den diese Anwendung ohne Nachfrage sagen muss. */}
            <div style={{ fontSize: 12, color: verortet ? FG : MUTED, lineHeight: 1.45 }}>
              {verortet ? (
                <>Verortet · {koordinate(
                  { lat: /** @type {number} */ (a.anker_lat), lng: /** @type {number} */ (a.anker_lng) },
                  { crs: a.anker_crs || undefined },
                )}</>
              ) : (
                <em data-test="splat-unverortet">
                  Nicht verortet — die Aufnahme hat keinen Ort im Gelände.
                </em>
              )}
            </div>

            <button
              type="button"
              onClick={() => aufOeffnen(a)}
              data-test={`splat-oeffnen-${a.id}`}
              style={{
                minHeight: TIPPZIEL, borderRadius: 8, border: `1px solid ${BORDER}`,
                background: 'transparent', color: FG, cursor: 'pointer',
                fontFamily: SANS, fontSize: 13,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}>
              <Box size={14} aria-hidden /> Ansehen
            </button>
          </div>
        )
      })}
      <p style={{ margin: 0, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
        {SPLAT_HINWEIS.verortung}
      </p>
    </div>
  )
}

/** Was der Inspector zeigt, wenn eine Ebene ausgewählt ist. */
function EbenenInspector({ ebene, h, aufHerkunft, aufSchliessen }) {
  const [offen, setOffen] = useState(/** @type {any} */ (null))
  const aufnahmen = ebene.inhalt === 'splat' ? (ebene.objekte || []) : []

  return (
    <>
      <Kopf art="Ebene" titel={ebene.name} aufSchliessen={aufSchliessen} />
      <div style={{ padding: 12, display: 'grid', gap: 10, fontSize: 13 }}>
        <Zeile k="Domäne"><span style={{ color: FG }}>{ebene.domaene}</span></Zeile>
        <Zeile k="Stand"><span style={{ fontFamily: MONO, color: FG }}>{ebene.zweitzeile}</span></Zeile>
        {!ebene.bespielt && (
          // Eine leere Ebene sagt, warum sie leer ist. „Keine Daten" allein
          // lässt offen, ob nichts erfasst wurde oder etwas kaputt ist.
          <div data-test="ebene-leer" style={{
            marginTop: 2, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${BORDER}`, color: MUTED, lineHeight: 1.5,
          }}>
            <div style={{ ...LABEL, marginBottom: 5 }}>Nichts erfasst</div>
            {ebene.warum_leer}
          </div>
        )}
        {aufnahmen.length > 0 && h && (
          <SplatListe
            aufnahmen={aufnahmen}
            h={h}
            aufHerkunft={aufHerkunft}
            aufOeffnen={setOffen}
          />
        )}
      </div>
      <SplatTafel aufnahme={offen} onSchliessen={() => setOffen(null)} />
    </>
  )
}

/**
 * Was der Inspector zeigt, wenn ein Baum ausgewählt ist.
 *
 * Bewusst dieselben Herkunftsfunktionen wie die Liste (`herkunftBauer`) und
 * dieselbe `Wert`-Komponente. Ein Nachbau würde abweichen, und die
 * Zwei-Klick-Regel gilt für jede Ansicht, nicht für eine.
 */
function BaumInspector({ baum, stichjahr, h, aufHerkunft, aufSchliessen }) {
  const u = messung(baum, 'stammumfang')
  const stamm = staerksterStamm(baum)
  const k = letzteKontrolle(baum)
  const stufe = vitalitaet(baum)
  const stufeInfo = stufe ? ROLOFF_VS.stufen.find(s => s.stufe === stufe.stufe) : null
  const zustand = kontrollstand(baum, stichjahr)

  return (
    <>
      <Kopf
        art="Objekt · Baum"
        titel={baum.art_wissenschaftlich || 'Art unbestimmt'}
        aufSchliessen={aufSchliessen}
      />
      <div style={{ padding: 12, display: 'grid', gap: 10, fontSize: 13 }}>
        <Zeile k="Baumnummer">
          <span style={{ fontFamily: MONO, fontWeight: 700, color: FG }}>{baum.baumnummer}</span>
        </Zeile>

        <Zeile k={!u && stamm ? 'Stärkster Stamm' : 'Stammumfang'}>
          {!u && stamm ? (
            <Wert
              text={`${mitEinheit(stamm.messung.wert, 'cm')} @ ${stamm.messung.messhoehe_cm} cm`}
              beschriftung={`Herkunft des stärksten Stamms von ${baum.baumnummer} anzeigen`}
              onOeffnen={ev => aufHerkunft(h.stamm(baum, stamm), ev)} />
          ) : (
            <Wert
              fehlt={!u}
              text={u ? `${mitEinheit(u.wert, u.einheit)}${u.messhoehe_cm != null ? ` @ ${u.messhoehe_cm} cm` : ''}` : ''}
              beschriftung={`Herkunft des Stammumfangs von ${baum.baumnummer} anzeigen`}
              onOeffnen={ev => aufHerkunft(h.stammumfang(baum), ev)} />
          )}
        </Zeile>

        <Zeile k="Vitalität">
          <Wert monospace={false}
            fehlt={!stufeInfo}
            text={stufeInfo ? `${stufeInfo.kurz} · ${stufeInfo.bezeichnung}` : ''}
            beschriftung={`Herkunft der Vitalitätsstufe von ${baum.baumnummer} anzeigen`}
            onOeffnen={ev => aufHerkunft(h.vitalitaet(baum), ev)} />
          {stufe && (
            <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
              beurteilt {fmtDatum(stufe.datum)}
            </div>
          )}
        </Zeile>

        <Zeile k="Letzte Kontrolle">
          {zustand === 'nie_kontrolliert' ? (
            <span style={{ color: FG }}>noch nie kontrolliert</span>
          ) : (
            <Wert
              text={fmtDatum(k?.datum)}
              beschriftung={`Herkunft der letzten Kontrolle von ${baum.baumnummer} anzeigen`}
              onOeffnen={ev => aufHerkunft(h.kontrolle(baum), ev)} />
          )}
        </Zeile>

        <Zeile k="Standort">
          <Wert
            fehlt={!baum.position}
            text={koordinate(
              baum.position ? { lat: baum.position.coordinates[1], lng: baum.position.coordinates[0] } : null,
              { crs: baum.crs, genauigkeitM: baum.lagegenauigkeit_m, bezug: baum.lagegenauigkeit_bezug },
            )}
            beschriftung={`Herkunft des Standorts von ${baum.baumnummer} anzeigen`}
            onOeffnen={ev => aufHerkunft(h.stammdatum(baum, 'position'), ev)} />
        </Zeile>

        <Zeile k="Stammform">
          {baum.mehrstaemmig == null ? (
            <span style={{ color: MUTED, fontStyle: 'italic' }}>nicht erhoben</span>
          ) : (
            <span style={{ color: FG }}>{baum.mehrstaemmig ? 'mehrstämmig' : 'einstämmig'}</span>
          )}
        </Zeile>
      </div>
    </>
  )
}

/**
 * @param {{
 *   auswahl: {art: 'ebene'|'baum', ebene?: any, baum?: any}|null,
 *   stichjahr: number,
 *   h: ReturnType<typeof import('../herkunft.js').herkunftBauer>,
 *   aufHerkunft: (eintrag: any, ev: any) => void,
 *   aufSchliessen: () => void,
 * }} p
 */
export default function Inspector({ auswahl, stichjahr, h, aufHerkunft, aufSchliessen }) {
  return (
    <aside
      aria-label="Inspector"
      data-test="inspector"
      style={{
        width: 300, flexShrink: 0, borderLeft: `1px solid ${BORDER}`,
        overflowY: 'auto', fontFamily: SANS,
        background: 'var(--luma-surface, transparent)',
      }}
    >
      {!auswahl ? (
        <div data-test="inspector-leer" style={{ padding: 14, color: MUTED, fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ ...LABEL, marginBottom: 6 }}>Nichts ausgewählt</div>
          Wählen Sie links eine Ebene oder in der Liste einen Baum. Was Sie
          auswählen, steht hier — mit Herkunft zu jedem Wert.
        </div>
      ) : auswahl.art === 'ebene' ? (
        <EbenenInspector
          ebene={auswahl.ebene} h={h}
          aufHerkunft={aufHerkunft} aufSchliessen={aufSchliessen} />
      ) : (
        <BaumInspector
          baum={auswahl.baum} stichjahr={stichjahr} h={h}
          aufHerkunft={aufHerkunft} aufSchliessen={aufSchliessen} />
      )}
    </aside>
  )
}

export { FEHLT }
