/**
 * BIOME — die Anzeigebausteine, die jede Ansicht teilt.
 *
 * Karte, Liste und Bericht zeigen dieselben Werte. Solange jede Ansicht ihre
 * eigenen Bausteine hatte, war „jede Zahl führt in zwei Klicks zu ihrer
 * Herkunft" eine Eigenschaft einzelner Stellen — und wich an der nächsten
 * Stelle ab. Hier steht sie einmal, als Eigenschaft des Bauteils.
 *
 * Bis 2026-08-10 lagen diese Bausteine in `src/pages/BiomeBaeumePage.jsx`.
 */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED, CARD, WARN } from '../../lib/theme.js'
import { FEHLT } from '../format.js'


export const MONO = "'Space Mono', monospace"
export const SANS = "'Space Grotesk', sans-serif"

export const LABEL = {
  fontFamily: MONO, fontSize: 9, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: MUTED,
}

/** Mindestgröße für Tippziele nach WCAG 2.1 AA. */
export const TIPPZIEL = 44

export function Karte({ children, ...rest }) {
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
export function Wert({ text, fehlt = false, onOeffnen, beschriftung, monospace = true }) {
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
export function HerkunftsTafel({ eintrag, onSchliessen }) {
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

/** Beschriftete Zeile in einer Detailansicht. */
export function Zeile({ k, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <div style={{ ...LABEL, minWidth: 150 }}>{k}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
