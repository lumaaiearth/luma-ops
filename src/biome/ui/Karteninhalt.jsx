/**
 * BIOME — der Bereich „Karteninhalt".
 *
 * Die linke Fläche der Dreiteilung aus GE-02: **was ist geladen, in welcher
 * Reihenfolge, und was davon ist sichtbar.** Nicht: was ist ausgewählt — das
 * gehört rechts in den Inspector.
 *
 * Belegt in `refs/design/google-earth.md`:
 *
 * · GE-02  „Suchen Sie im Bereich Karteninhalt links in Ihrem Projekt nach der
 *          Datenebene, die Sie anpassen möchten."
 * · GE-08  Genau drei Bedienungen: Sichtbarkeit, Deckkraft, Reihenfolge.
 * · GE-30  Vier Schaltmodi je Gruppe; Knotenzustände open/closed/error/fetching.
 * · GE-31  Zweite Zeile am Knoten (`Snippet`), höchstens zwei Zeilen.
 * · MD-09  Tippziele mindestens 48 dp. BIOME nimmt 44 px, weil WCAG 2.1 AA das
 *          fordert und der Rest der Anwendung darauf steht — die strengere der
 *          beiden Zahlen wäre 48, aber gemischte Zielgrößen sind schlimmer als
 *          eine durchgehende. Die Ankreuzfelder liegen in einer 44-px-Zeile.
 *
 * ── Warum leere Ebenen sichtbar bleiben ───────────────────────────────────
 *
 * Weil eine Ebene, die es im Datenmodell gibt, aber nicht in der Liste, für den
 * Nutzer eine Lücke ohne Namen ist. Dieselbe Regel wie beim einzelnen Wert:
 * Fehlendes wird als fehlend gezeigt, nicht weggelassen.
 */
import { ChevronRight, AlertCircle } from 'lucide-react'
import { BORDER, FG, MUTED } from '../../lib/theme.js'
import { MONO, SANS, LABEL, TIPPZIEL } from './bausteine.jsx'
import { SCHALTMODUS } from '../ebenen.js'

/**
 * Ein Ankreuzfeld mit 44-px-Trefferfläche und sichtbarem Zustand.
 *
 * Bewusst ein Kästchen und kein Auge-Symbol: Google Earth Web benutzt ein Auge
 * (GE-08), aber die Elternketten-Logik — eine Ebene ist nur sichtbar, wenn auch
 * alle übergeordneten es sind — trägt ein Kästchen besser. Ein durchgestrichenes
 * Auge sagt nicht, ob es an dieser Ebene oder an ihrer Gruppe liegt.
 */
function Kaestchen({ an, aus, beschriftung, gesperrt = false, grund = undefined }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      aria-label={beschriftung}
      disabled={gesperrt}
      title={gesperrt ? grund : undefined}
      onClick={aus}
      style={{
        width: 26, height: 26, minWidth: 26, borderRadius: 5,
        border: `1.5px solid ${an ? FG : BORDER}`,
        background: an ? FG : 'transparent',
        cursor: gesperrt ? 'not-allowed' : 'pointer',
        opacity: gesperrt ? 0.4 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, flexShrink: 0,
      }}
    >
      {/* Der Haken trägt die Bedeutung nicht allein — die Zeile nennt den
          Zustand auch im Beschriftungstext für Screenreader (WCAG 1.4.1). */}
      {an && (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
          <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" fill="none"
            stroke="var(--luma-bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

/** Eine Ebenenzeile: Kästchen, Name, Zweitzeile, Zustand. */
function EbenenZeile({ ebene, an, umschalten, gesperrt = false, gewaehlt = false, waehlen, ...rest }) {
  return (
    <div
      {...rest}
      data-test={`ebene-${ebene.id}`}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '9px 12px 9px 26px', minHeight: TIPPZIEL,
        background: gewaehlt ? 'color-mix(in srgb, var(--luma-fg) 6%, transparent)' : 'transparent',
      }}
    >
      <div style={{ paddingTop: 2 }}>
        <Kaestchen
          an={an}
          gesperrt={gesperrt || !ebene.bespielt || !!ebene.warum_gesperrt}
          grund={
            // Der genaueste vorhandene Grund gewinnt. Eine Ebene, die sich aus
            // eigenen Gründen nicht einblenden lässt, soll nicht mit der
            // allgemeinen Schaltmodus-Erklärung abgespeist werden.
            ebene.warum_gesperrt
            || (!ebene.bespielt ? ebene.warum_leer : SCHALTMODUS[gesperrt ? 'nur_abwaehlbar' : 'alle'].erklaerung)
          }
          beschriftung={
            ebene.warum_gesperrt
              ? `${ebene.name} — nicht auf der Karte einblendbar`
              : `${ebene.name} — ${an ? 'sichtbar' : 'ausgeblendet'}${ebene.bespielt ? '' : ', nichts erfasst'}`
          }
          aus={umschalten}
        />
      </div>
      <button
        type="button"
        onClick={waehlen}
        aria-label={`${ebene.name} im Inspector öffnen`}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent',
          border: 'none', padding: 0, cursor: 'pointer', font: 'inherit',
        }}
      >
        <div style={{
          fontFamily: SANS, fontSize: 13,
          color: ebene.bespielt ? FG : MUTED,
          fontStyle: ebene.bespielt ? 'normal' : 'italic',
        }}>
          {ebene.name}
        </div>
        {/* Zweite Zeile nach GE-31: Stand und Umfang gehören an die Zeile. */}
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 2 }}>
          {ebene.zweitzeile}
        </div>
      </button>
    </div>
  )
}

/**
 * @param {{
 *   gruppen: import('../ebenen.js').Ebenengruppe[],
 *   sichtbarkeit: Record<string, boolean>,
 *   aufSichtbarkeit: (id: string, an: boolean, gruppe: import('../ebenen.js').Ebenengruppe) => void,
 *   gewaehlt: string|null,
 *   aufWahl: (id: string) => void,
 * }} p
 */
export default function Karteninhalt({ gruppen, sichtbarkeit, aufSichtbarkeit, gewaehlt, aufWahl }) {
  return (
    <nav aria-label="Karteninhalt" data-test="karteninhalt" style={{ fontFamily: SANS }}>
      {gruppen.map(g => {
        const kinder = g.ebenen
        const anzahlAn = kinder.filter(e => sichtbarkeit[e.id]).length
        return (
          <details key={g.id} open={g.offen} data-test={`ebenengruppe-${g.id}`}
            style={{ borderBottom: `1px solid ${BORDER}` }}>
            <summary style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 12px', minHeight: TIPPZIEL, cursor: 'pointer',
              listStyle: 'none', boxSizing: 'border-box',
            }}>
              <ChevronRight size={14} color={MUTED} aria-hidden
                style={{ flexShrink: 0, transition: 'transform .15s' }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: FG }}>{g.name}</span>
              <span style={{ ...LABEL, fontSize: 9 }}>
                {anzahlAn} von {kinder.length}
              </span>
            </summary>

            {/* Der Schaltmodus steht an der Gruppe, nicht in der Hilfe. Wer
                nicht weiß, warum sich zwei Ebenen ausschließen, hält es für
                einen Fehler. */}
            {g.schaltmodus !== 'alle' && (
              <p style={{
                margin: 0, padding: '0 12px 8px 34px', fontSize: 11,
                color: MUTED, lineHeight: 1.45, display: 'flex', gap: 6,
              }}>
                <AlertCircle size={12} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{SCHALTMODUS[g.schaltmodus].erklaerung}</span>
              </p>
            )}

            {kinder.map(e => (
              <EbenenZeile
                key={e.id}
                ebene={e}
                an={!!sichtbarkeit[e.id]}
                gewaehlt={gewaehlt === e.id}
                gesperrt={g.schaltmodus === 'nur_abwaehlbar' && !sichtbarkeit[e.id]}
                umschalten={() => aufSichtbarkeit(e.id, !sichtbarkeit[e.id], g)}
                waehlen={() => aufWahl(e.id)}
              />
            ))}
          </details>
        )
      })}
    </nav>
  )
}
