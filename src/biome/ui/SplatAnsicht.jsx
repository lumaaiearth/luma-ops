/**
 * BIOME — die Ansicht einer 3D-Aufnahme (Gaussian Splats).
 *
 * ── Warum die Aufnahme nicht von selbst lädt ──────────────────────────────
 *
 * Weil sie zwischen zwanzig und mehreren hundert Megabyte groß ist. Diese
 * Anwendung wird auf dem Handy im Feld benutzt, oft über Mobilfunk. Eine
 * Ansicht, die beim Aufklappen ungefragt achtzig Megabyte zieht, ist ein
 * Übergriff auf ein fremdes Datenvolumen. Also steht die Größe da, und der
 * Nutzer entscheidet.
 *
 * ── Was die Statuszeile sagt und warum ────────────────────────────────────
 *
 * Sie nennt drei Dinge, die die Darstellung von der Datei unterscheiden:
 *
 *   · **Grad 0.** Trägt die Aufnahme höhere Kugelflächenfunktionen, bleiben
 *     deren blickwinkelabhängige Anteile ungenutzt. Die Spezifikation lässt
 *     das ausdrücklich zu — verschwiegen wäre es trotzdem eine Halbwahrheit.
 *   · **Zwischenpuffer.** Ohne `EXT_color_buffer_float` wird ohne
 *     Fließkommapuffer gezeichnet; die Spezifikation empfiehlt ihn.
 *   · **Farbraum.** Bei `lin_rec709_display` wird nach dem Zusammensetzen für
 *     die Anzeige umgesetzt, bei `srgb_rec709_display` nicht.
 *
 * ── Was diese Ansicht nicht anbietet ──────────────────────────────────────
 *
 * Kein Messwerkzeug. In einer Punktwolke lassen sich Strecken abgreifen, und
 * es wäre ein Dreizeiler — aber die Spezifikation nennt keine Lagegenauigkeit,
 * und die Rekonstruktionsgenauigkeit hängt an Aufnahme und Training. Ein
 * Stammumfang aus dieser Ansicht wäre eine Zahl ohne Verfahren. Siehe die
 * offene Frage in refs/standards/06-fernerkundung.md.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Download, AlertTriangle, RotateCcw, X } from 'lucide-react'
import { BORDER, CARD, FG, MUTED, SURFACE_2, WARN } from '../../lib/theme.js'
import { MONO, SANS, LABEL, TIPPZIEL } from './bausteine.jsx'
import { ladeSplatGlb, FARBRAUM, SPLAT_HINWEIS } from '../splat.js'
import { SplatRenderer } from '../splatRenderer.js'
import { splatDateiUrl } from '../daten.js'
import { zahl, mitEinheit, FEHLT } from '../format.js'

/** Wie viel Bewegung eines Fingers eine volle Umdrehung ist. */
const DREH_EMPFINDLICHKEIT = 0.008

/**
 * @param {{ aufnahme: import('../daten.js').SplatAufnahme }} p
 */
export default function SplatAnsicht({ aufnahme }) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement|null} */ (null))
  const huelleRef = useRef(/** @type {HTMLDivElement|null} */ (null))
  const rendererRef = useRef(/** @type {SplatRenderer|null} */ (null))
  const bildRef = useRef(0)
  const zeigerRef = useRef({ aktiv: false, x: 0, y: 0, schieben: false })
  const abstandRef = useRef(0)
  // Wird beim Abbauen falsch. Ohne diese Marke legt ein Ladevorgang, der
  // während des Schließens fertig wird, noch einen WebGL-Kontext an, den
  // niemand mehr freigibt — und der Browser gibt nur eine begrenzte Zahl davon.
  const lebtRef = useRef(true)

  const [zustand, setZustand] = useState(/** @type {'bereit'|'laedt'|'zeigt'|'fehler'} */ ('bereit'))
  const [fehler, setFehler] = useState('')
  const [geladen, setGeladen] = useState(0)
  const [info, setInfo] = useState(/** @type {null | {
    anzahl: number, shGrad: number, fliesskomma: boolean, nachSrgb: boolean,
    befunde: import('../splat.js').Befund[],
  }} */(null))

  /** Zeichnet ein Bild — höchstens eines je Bildschirmauffrischung. */
  const zeichneAnfordern = useCallback(() => {
    if (bildRef.current) return
    bildRef.current = requestAnimationFrame(() => {
      bildRef.current = 0
      try {
        rendererRef.current?.zeichne()
      } catch (e) {
        setZustand('fehler')
        setFehler(e instanceof Error ? e.message : String(e))
      }
    })
  }, [])

  /* Größe des Canvas an die Fläche hängen. */
  useEffect(() => {
    const huelle = huelleRef.current
    if (!huelle) return undefined
    const beobachter = new ResizeObserver(() => {
      const r = rendererRef.current
      if (!r) return
      const kasten = huelle.getBoundingClientRect()
      r.setzeGroesse(kasten.width, kasten.height, Math.min(window.devicePixelRatio || 1, 2))
      zeichneAnfordern()
    })
    beobachter.observe(huelle)
    return () => beobachter.disconnect()
  }, [zeichneAnfordern, zustand])

  /* Aufräumen: WebGL-Ressourcen geben sich nicht von selbst frei. */
  useEffect(() => () => {
    lebtRef.current = false
    if (bildRef.current) cancelAnimationFrame(bildRef.current)
    rendererRef.current?.freigeben()
    rendererRef.current = null
  }, [])

  const laden = useCallback(async () => {
    setZustand('laedt')
    setFehler('')
    setGeladen(0)
    try {
      const url = splatDateiUrl(aufnahme)
      const antwort = await fetch(url)
      if (!antwort.ok) {
        throw new Error(`Die Datei ist nicht abrufbar (HTTP ${antwort.status}). Adresse: ${url}`)
      }

      // Fortschritt anzeigen, solange der Körper strömend gelesen werden kann.
      // Ohne das steht die Ansicht bei einer 80-MB-Datei eine Minute still und
      // sieht aus wie ein Fehler.
      let puffer
      const laenge = Number(antwort.headers.get('content-length') || 0)
      if (antwort.body && laenge > 0) {
        const leser = antwort.body.getReader()
        const teile = []
        let summe = 0
        for (;;) {
          const { done, value } = await leser.read()
          if (done) break
          if (value) {
            teile.push(value)
            summe += value.byteLength
            setGeladen(summe)
          }
        }
        const alles = new Uint8Array(summe)
        let stelle = 0
        for (const t of teile) { alles.set(t, stelle); stelle += t.byteLength }
        puffer = alles.buffer
      } else {
        puffer = await antwort.arrayBuffer()
      }

      const feld = ladeSplatGlb(/** @type {ArrayBuffer} */ (puffer))
      setZustand('zeigt')

      // Das Canvas gibt es erst, wenn React den Zustandswechsel gezeichnet
      // hat. Ein einzelnes requestAnimationFrame reicht dafür nicht sicher —
      // deshalb wird über einige Bilder gewartet, statt einmal zu raten.
      /** @type {HTMLCanvasElement|null} */ let canvas = null
      /** @type {HTMLDivElement|null} */ let huelle = null
      for (let versuch = 0; versuch < 60 && !(canvas && huelle); versuch++) {
        await new Promise(fertig => requestAnimationFrame(() => fertig(null)))
        if (!lebtRef.current) return
        canvas = canvasRef.current
        huelle = huelleRef.current
      }
      if (!lebtRef.current) return
      if (!canvas || !huelle) {
        throw new Error('Die Zeichenfläche stand nicht zur Verfügung.')
      }

      const renderer = new SplatRenderer(canvas)
      rendererRef.current = renderer
      const kasten = huelle.getBoundingClientRect()
      renderer.setzeGroesse(kasten.width, kasten.height, Math.min(window.devicePixelRatio || 1, 2))
      const farbraum = FARBRAUM[/** @type {keyof typeof FARBRAUM} */ (feld.bericht.farbraum || '')]
      // Nur Linearlicht wird für die Anzeige umgesetzt. Anzeigecodierte Werte
      // ein zweites Mal durch die Kennlinie zu schicken, würde das Bild
      // aufhellen und wäre schlicht falsch.
      const nachSrgb = !!farbraum && !farbraum.srgb
      renderer.setzeFeld(feld, { nachSrgb, knotenMatrix3: feld.matrix3 })

      setInfo({
        anzahl: feld.anzahl,
        shGrad: feld.bericht.shGrad,
        fliesskomma: renderer.fliesskomma,
        nachSrgb,
        befunde: feld.bericht.befunde,
      })
      zeichneAnfordern()
    } catch (e) {
      setZustand('fehler')
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }, [aufnahme, zeichneAnfordern])

  /* ── Bedienung ────────────────────────────────────────────────────────── */

  const zeigerAn = useCallback((/** @type {import('react').PointerEvent<HTMLCanvasElement>} */ ev) => {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    zeigerRef.current = {
      aktiv: true, x: ev.clientX, y: ev.clientY,
      // Zweite Taste, Umschalt oder mittlere Taste schieben statt zu drehen.
      schieben: ev.shiftKey || ev.button === 1 || ev.button === 2,
    }
  }, [])

  const zeigerBewegt = useCallback((/** @type {import('react').PointerEvent<HTMLCanvasElement>} */ ev) => {
    const z = zeigerRef.current
    const r = rendererRef.current
    if (!z.aktiv || !r) return
    const dx = ev.clientX - z.x
    const dy = ev.clientY - z.y
    z.x = ev.clientX
    z.y = ev.clientY
    const kasten = ev.currentTarget.getBoundingClientRect()
    if (z.schieben) r.schieben(dx / kasten.width, dy / kasten.height)
    else r.drehen(dx * DREH_EMPFINDLICHKEIT, dy * DREH_EMPFINDLICHKEIT)
    zeichneAnfordern()
  }, [zeichneAnfordern])

  const zeigerAus = useCallback((/** @type {import('react').PointerEvent<HTMLCanvasElement>} */ ev) => {
    zeigerRef.current.aktiv = false
    if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
      ev.currentTarget.releasePointerCapture(ev.pointerId)
    }
  }, [])

  const rad = useCallback((/** @type {import('react').WheelEvent<HTMLCanvasElement>} */ ev) => {
    const r = rendererRef.current
    if (!r) return
    r.zoomen(ev.deltaY > 0 ? 1.12 : 1 / 1.12)
    zeichneAnfordern()
  }, [zeichneAnfordern])

  // Zwei Finger: zusammenziehen und auseinanderziehen.
  const beruehrung = useCallback((/** @type {import('react').TouchEvent<HTMLCanvasElement>} */ ev) => {
    const r = rendererRef.current
    if (!r || ev.touches.length !== 2) { abstandRef.current = 0; return }
    const d = Math.hypot(
      ev.touches[0].clientX - ev.touches[1].clientX,
      ev.touches[0].clientY - ev.touches[1].clientY,
    )
    if (abstandRef.current > 0 && d > 0) {
      r.zoomen(abstandRef.current / d)
      zeichneAnfordern()
    }
    abstandRef.current = d
  }, [zeichneAnfordern])

  /** Tastatur: ohne sie wäre die Ansicht mit der Maus allein bedienbar. */
  const taste = useCallback((/** @type {import('react').KeyboardEvent<HTMLCanvasElement>} */ ev) => {
    const r = rendererRef.current
    if (!r) return
    const schritt = 0.12
    if (ev.key === 'ArrowLeft') r.drehen(-schritt, 0)
    else if (ev.key === 'ArrowRight') r.drehen(schritt, 0)
    else if (ev.key === 'ArrowUp') r.drehen(0, -schritt)
    else if (ev.key === 'ArrowDown') r.drehen(0, schritt)
    else if (ev.key === '+' || ev.key === '=') r.zoomen(1 / 1.15)
    else if (ev.key === '-') r.zoomen(1.15)
    else return
    ev.preventDefault()
    zeichneAnfordern()
  }, [zeichneAnfordern])

  const zuruecksetzen = useCallback(() => {
    const r = rendererRef.current
    if (!r) return
    r.azimut = 0
    r.hoehe = 0.35
    r.abstand = (r.szenenradius / Math.tan(r.sichtfeld / 2)) * 1.6
    zeichneAnfordern()
  }, [zeichneAnfordern])

  /* ── Anzeige ──────────────────────────────────────────────────────────── */

  const groesse = aufnahme.datei_bytes != null
    ? mitEinheit(Math.round(aufnahme.datei_bytes / 1048576), 'MB')
    : FEHLT

  if (zustand === 'bereit' || zustand === 'laedt') {
    const laeuft = zustand === 'laedt'
    return (
      <div data-test="splat-bereit" style={{
        border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12,
        background: SURFACE_2, fontFamily: SANS,
      }}>
        <div style={{ ...LABEL, marginBottom: 6 }}>3D-Aufnahme</div>
        <div style={{ fontSize: 13, color: FG, lineHeight: 1.5, marginBottom: 4 }}>
          {zahl(aufnahme.splat_anzahl)} Gaußfunktionen · {groesse}
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          Die Aufnahme lädt erst auf Anforderung. Sie ist groß, und diese Anwendung
          läuft im Feld über Mobilfunk.
        </p>
        <button
          type="button"
          onClick={laden}
          disabled={laeuft}
          data-test="splat-laden"
          style={{
            minHeight: TIPPZIEL, padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${BORDER}`, background: 'transparent', color: FG,
            cursor: laeuft ? 'progress' : 'pointer', fontFamily: SANS, fontSize: 13,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
          {laeuft ? <Box size={14} aria-hidden /> : <Download size={14} aria-hidden />}
          {laeuft
            ? `Wird geladen… ${geladen ? mitEinheit(Math.round(geladen / 1048576), 'MB') : ''}`
            : 'Aufnahme laden und ansehen'}
        </button>
      </div>
    )
  }

  if (zustand === 'fehler') {
    return (
      <div data-test="splat-fehler" style={{
        border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontFamily: SANS,
      }}>
        <div style={{ ...LABEL, color: WARN, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={12} aria-hidden /> Aufnahme nicht darstellbar
        </div>
        <div style={{ fontSize: 13, color: FG, lineHeight: 1.5 }}>{fehler}</div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          Hier steht bewusst kein leeres Fenster. Eine Aufnahme, die nicht gelesen
          werden konnte, ist keine leere Aufnahme.
        </p>
      </div>
    )
  }

  const fehlerBefunde = info?.befunde.filter(b => b.schwere === 'fehler') || []
  const hinweisBefunde = info?.befunde.filter(b => b.schwere === 'hinweis') || []

  return (
    <div data-test="splat-ansicht" style={{ fontFamily: SANS }}>
      <div ref={huelleRef} style={{
        position: 'relative', width: '100%', aspectRatio: '4 / 3',
        borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}`,
        background: '#000', touchAction: 'none',
      }}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`3D-Aufnahme vom ${aufnahme.flug_datum} mit ${aufnahme.splat_anzahl} Gaußfunktionen. Mit den Pfeiltasten drehen, mit Plus und Minus zoomen.`}
          onPointerDown={zeigerAn}
          onPointerMove={zeigerBewegt}
          onPointerUp={zeigerAus}
          onPointerCancel={zeigerAus}
          onWheel={rad}
          onTouchMove={beruehrung}
          onTouchEnd={() => { abstandRef.current = 0 }}
          onKeyDown={taste}
          onContextMenu={ev => ev.preventDefault()}
          style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab', outlineOffset: 2 }}
        />
        <button
          type="button"
          onClick={zuruecksetzen}
          aria-label="Ansicht zurücksetzen"
          style={{
            position: 'absolute', right: 8, top: 8,
            width: TIPPZIEL, height: TIPPZIEL, borderRadius: 8,
            border: `1px solid ${BORDER}`, background: 'rgba(0,0,0,0.45)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <RotateCcw size={15} aria-hidden />
        </button>
      </div>

      {/* Die Statuszeile sagt, worin die Darstellung von der Datei abweicht. */}
      <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>
        {zahl(info?.anzahl ?? 0)} Gaußfunktionen · Ellipse-Kernel · 3σ ·{' '}
        {info?.shGrad ? `Grad ${info.shGrad} vorhanden, Grad 0 dargestellt` : 'nur Grad 0'} ·{' '}
        {info?.fliesskomma ? 'Fließkomma-Zwischenpuffer' : 'ohne Fließkomma-Zwischenpuffer'} ·{' '}
        {info?.nachSrgb ? 'Linearlicht, für die Anzeige umgesetzt' : 'anzeigecodiert, unverändert'}
      </div>

      {/* Ziehen dreht, Umschalt-Ziehen schiebt — das steht da, weil es sonst
          niemand findet. */}
      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
        Ziehen dreht · Umschalt-Ziehen oder rechte Taste schiebt · Rad oder zwei
        Finger zoomen · Pfeiltasten und +/− bedienen die Ansicht ohne Maus.
      </div>

      {(fehlerBefunde.length > 0 || hinweisBefunde.length > 0) && (
        <div data-test="splat-befunde" style={{
          marginTop: 8, padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${BORDER}`, background: SURFACE_2,
        }}>
          <div style={{ ...LABEL, marginBottom: 5 }}>
            Annahmeprüfung nach FE-GS-23
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: FG, lineHeight: 1.5 }}>
            {fehlerBefunde.map((b, i) => (
              <li key={`f${i}`} style={{ color: WARN }}>{b.text}</li>
            ))}
            {hinweisBefunde.map((b, i) => (
              <li key={`h${i}`} style={{ color: MUTED }}>{b.text}</li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
        {SPLAT_HINWEIS.messung}
      </p>
    </div>
  )
}

/**
 * Die Aufnahme im Vollbild.
 *
 * Warum nicht im Inspector selbst: der ist 300 px breit (MD-06). Eine
 * dreidimensionale Aufnahme darin wäre eine Briefmarke, an der sich nichts
 * erkennen lässt — und eine Ansicht, in der man nichts erkennt, ist keine
 * Ansicht, sondern eine Behauptung, es gäbe eine.
 *
 * @param {{ aufnahme: import('../daten.js').SplatAufnahme|null, onSchliessen: () => void }} p
 */
export function SplatTafel({ aufnahme, onSchliessen }) {
  const ref = useRef(/** @type {HTMLDivElement|null} */ (null))

  useEffect(() => {
    if (!aufnahme) return undefined
    const el = ref.current
    el?.querySelector('button')?.focus()
    /** @param {KeyboardEvent} e */
    function taste(e) {
      if (e.key === 'Escape') { onSchliessen(); return }
      if (e.key !== 'Tab' || !el) return
      // Fokusfalle, wie in der Herkunftstafel: der Dialog behält den Fokus.
      const ziele = /** @type {HTMLElement[]} */ ([...el.querySelectorAll('a[href], button, canvas, [tabindex]:not([tabindex="-1"])')])
        .filter(z => z.offsetParent !== null)
      if (!ziele.length) return
      const erste = ziele[0], letzte = ziele[ziele.length - 1]
      if (e.shiftKey && document.activeElement === erste) { e.preventDefault(); letzte.focus() }
      else if (!e.shiftKey && document.activeElement === letzte) { e.preventDefault(); erste.focus() }
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [aufnahme, onSchliessen])

  if (!aufnahme) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={`3D-Aufnahme vom ${aufnahme.flug_datum}`}
      data-test="splat-tafel"
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)',
        padding: 12,
      }}
      onClick={onSchliessen}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
        width: 'min(920px, 100%)', maxHeight: '92vh', overflowY: 'auto', padding: 16,
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={LABEL}>Fernerkundung · 3D-Aufnahme</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: FG, fontFamily: SANS }}>
              {aufnahme.flug_datum}
            </div>
          </div>
          <button type="button" onClick={onSchliessen} aria-label="Ansicht schließen"
            style={{
              width: TIPPZIEL, height: TIPPZIEL, borderRadius: 8, border: `1px solid ${BORDER}`,
              background: 'transparent', color: FG, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            <X size={16} />
          </button>
        </div>
        <SplatAnsicht aufnahme={aufnahme} />
      </div>
    </div>
  )
}
