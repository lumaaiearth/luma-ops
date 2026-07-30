// ────────────────────────────────────────────────────────────────
// LUMA Ops — geteilter UI-Baukasten
// Eine Quelle für Buttons, Karten, Badges, Labels & Empty-States,
// damit alle Seiten dieselbe Sprache sprechen.
// Hover-/Fokus-Feedback kommt aus src/styles/ui.css (lu-* Klassen).
// ────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { X, CalendarDays } from 'lucide-react'
import {
  A, SURFACE, SURFACE_2, BORDER, BORDER_STRONG, FG, MUTED, CARD, DANGER,
  RADIUS, TEXT, SPACE, ELEV, tint,
} from '../lib/theme.js'

export const MONO = "'Space Mono', monospace"
export const SANS = "'Space Grotesk', sans-serif"

/** Einheitlicher Formular-Input-Stil (vorher in jedem Modal dupliziert) */
export const INPUT_STYLE = {
  width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: RADIUS.md, padding: '9px 12px', color: FG,
  fontFamily: SANS, fontSize: TEXT.md, outline: 'none',
}

/** Einheitlicher Formular-Label-Stil.
 *  Sans statt Mono-Versalien: Feldbeschriftungen sind Text, keine Messwerte —
 *  in Versalien-Mono bei 10px waren sie schwer zu lesen und optisch laut. */
export const LABEL_STYLE = {
  fontFamily: SANS, fontSize: TEXT.xs, fontWeight: 500, color: MUTED,
  marginBottom: SPACE[2], display: 'block',
}

/* ─── Datumsfeld im deutschen Format ──────────────────────────────────────────
   Native <input type="date"> zeigt das Datum je nach Plattform/Systemsprache
   unterschiedlich an (z.B. MM/DD/YYYY). Diese Komponente zeigt IMMER
   TT.MM.JJJJ an, egal auf welchem Gerät. value/onChange arbeiten weiterhin
   mit ISO (JJJJ-MM-TT) — Drop-in-Ersatz für <input type="date">.
   Der Kalender-Button rechts öffnet den nativen Datums-Picker. */

export function isoToGerman(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

export function germanToIso(str) {
  const s = (str || '').trim()
  if (!s) return ''
  let m = s.match(/^(\d{1,2})[./\- ](\d{1,2})[./\- ](\d{2}|\d{4})$/)
  if (!m) {
    // Auch reine Ziffernfolge akzeptieren: TTMMJJJJ
    const digits = s.replace(/\D/g, '')
    if (digits.length === 8) m = [null, digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    else return null
  }
  const d = Number(m[1]), mo = Number(m[2])
  let y = Number(m[3])
  if (y < 100) y += 2000
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function DateInput({ value, onChange, min, max, required, disabled, placeholder = 'TT.MM.JJJJ', style, title }) {
  const [text, setText] = useState(() => isoToGerman(value))
  const [focused, setFocused] = useState(false)
  const nativeRef = useRef(null)

  // Externe Änderungen (z.B. Formular-Reset, Picker) ins Textfeld spiegeln —
  // aber nie, während getippt wird (sonst kämpft die Formatierung gegen die Eingabe)
  useEffect(() => { if (!focused) setText(isoToGerman(value)) }, [value, focused])

  function handleText(e) {
    const v = e.target.value
    setText(v)
    const t = v.trim()
    if (t === '') { onChange(''); return }
    // Während des Tippens nur vollständige Daten übernehmen (Jahr 4-stellig),
    // damit „12.07.20…" nicht vorzeitig als 2020 interpretiert wird
    if (/\d{4}$/.test(t)) {
      const iso = germanToIso(t)
      if (iso) onChange(iso)
    }
  }

  function handleBlur() {
    setFocused(false)
    const t = text.trim()
    if (t === '') { onChange(''); setText(''); return }
    const iso = germanToIso(t)  // beim Verlassen auch Kurzformen (12.7.26) akzeptieren
    if (iso) { onChange(iso); setText(isoToGerman(iso)) }
    else setText(isoToGerman(value))  // ungültige Eingabe → zurücksetzen
  }

  function openPicker() {
    const el = nativeRef.current
    if (!el) return
    try { el.showPicker() } catch { el.focus(); el.click() }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text" inputMode="numeric" value={text} disabled={disabled}
        onChange={handleText} onBlur={handleBlur} onFocus={() => setFocused(true)}
        placeholder={placeholder} required={required} title={title}
        pattern="\d{1,2}[./\- ]\d{1,2}[./\- ](\d{2}|\d{4})"
        style={{ ...INPUT_STYLE, paddingRight: 38, ...style }}
      />
      {/* Verstecktes natives Datumsfeld nur für den Picker */}
      <input
        ref={nativeRef} type="date" tabIndex={-1} aria-hidden="true"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : ''}
        min={min} max={max} disabled={disabled}
        onChange={e => { onChange(e.target.value); setText(isoToGerman(e.target.value)) }}
        style={{ position: 'absolute', right: 8, bottom: 0, width: 24, height: 1, opacity: 0, pointerEvents: 'none', border: 'none', padding: 0 }}
      />
      <button type="button" onClick={openPicker} disabled={disabled} tabIndex={-1} title="Kalender öffnen"
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: MUTED, cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
        <CalendarDays size={15} />
      </button>
    </div>
  )
}

/**
 * Geteilte Modal-Shell: Overlay mit Blur, Panel mit sticky Header,
 * Schließen per X, Klick aufs Overlay oder Escape.
 */
export function Modal({ eyebrow, eyebrowColor = A, title, onClose, maxWidth = 580, zIndex = 1100, children }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    // zIndex 1100 liegt über der mobilen Bottom-Nav (1000), sonst verschwinden
    // die Aktions-Buttons dahinter. Safe-Area-Padding hält das Panel frei von
    // Notch und Home-Indicator.
    <div style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className="lu-fade-in"
        style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS.xl, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: ELEV[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE[3], padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD, zIndex: 2 }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div style={{ fontFamily: SANS, fontSize: TEXT.xs, fontWeight: 500, color: eyebrowColor, marginBottom: title ? 1 : 0 }}>{eyebrow}</div>}
            {title && <div style={{ fontSize: TEXT.lg, fontWeight: 600, color: FG, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="lu-btn-ghost"
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: RADIUS.md, width: 30, height: 30, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Einheitliche Aktionszeile am Modal-Ende: optional Extra-Aktion links, Abbrechen/Speichern rechts */
export function ModalActions({ left, onCancel, submitLabel = 'Speichern', cancelLabel = 'Abbrechen' }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: left ? 'space-between' : 'flex-end', alignItems: 'center', paddingTop: 4, flexWrap: 'wrap' }}>
      {left || null}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" type="button" onClick={onCancel} style={{ padding: '10px 20px', fontSize: 14 }}>{cancelLabel}</Button>
        <Button type="submit" style={{ padding: '10px 24px', fontSize: 14 }}>{submitLabel}</Button>
      </div>
    </div>
  )
}

/** Abschnittslabel — optional mit Aktion rechts (z.B. „alle →") */
export function SectionLabel({ children, action, style }) {
  const label = (
    <div className="lu-section-label" style={!action ? style : undefined}>
      {children}
    </div>
  )
  if (!action) return label
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>
      {label}
      {action}
    </div>
  )
}

/** Einheitlicher Seitenkopf: optionale Eyebrow-Zeile über großem Titel, Aktionen rechts */
export function PageHeader({ title, sub, eyebrow, actions, isMobile = false, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACE[3], marginBottom: SPACE[5], ...style }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ fontFamily: SANS, fontSize: TEXT.xs, fontWeight: 500, color: MUTED, marginBottom: 2 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: isMobile ? TEXT.xl : TEXT['2xl'], fontWeight: 600, color: FG, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>{title}</h1>
        {sub && <div style={{ fontSize: TEXT.sm, color: MUTED, marginTop: SPACE[1] }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>{actions}</div>}
    </div>
  )
}

/** Basis-Karte; `accent` färbt die linke Kante, `onClick` aktiviert Hover-Feedback */
export function Card({ children, onClick, accent, padding = '12px 16px', style }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'lu-card lu-clickable' : 'lu-card'}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderLeft: accent ? `2px solid ${accent}` : `1px solid ${BORDER}`,
        padding,
        ...style,
      }}>
      {children}
    </div>
  )
}

/** Kennzahl-Kachel fürs Dashboard.
 *  Wert in Tabellenziffern und kräftiger Schnittstärke — dünne 32px-Zahlen
 *  wirkten dekorativ; hier soll die Zahl der Anker sein.
 *  `delta` zeigt eine Veränderung ({ value, dir: 'up'|'down'|'flat' }). */
export function StatCard({ label, value, sub, color, onClick, icon: Icon, delta }) {
  return (
    <Card onClick={onClick} padding="12px 14px">
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], marginBottom: SPACE[2] }}>
        {Icon && <Icon size={13} color={MUTED} style={{ flexShrink: 0 }} />}
        <div style={{ fontSize: TEXT.xs, fontWeight: 500, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[2] }}>
        {/* Proportionale Ziffern: Tabellenziffern geben jeder Ziffer die Breite
            einer Null — bei großen Einzelzahlen wirkt „121" dadurch zerfasert.
            Tabellenziffern gehören in Spalten, nicht auf eine Kennzahl. */}
        <div style={{ fontSize: TEXT['3xl'], fontWeight: 600, color: color || FG, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
        {delta && (
          <span className="lu-num" style={{ fontSize: TEXT.xs, color: delta.dir === 'up' ? 'var(--luma-ok)' : delta.dir === 'down' ? 'var(--luma-warn)' : MUTED }}>
            {delta.dir === 'up' ? '↑' : delta.dir === 'down' ? '↓' : '±'}{delta.value}
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: TEXT.xs, color: MUTED, marginTop: SPACE[2] }}>{sub}</div>}
    </Card>
  )
}

/** Status-Pill: einheitliche Größe/Radius für alle Badges.
 *  Sans statt Mono-Versalien — Statuswörter sind Text, keine Messwerte. */
export function Badge({ color = A, children, icon: Icon, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: SPACE[1],
      fontFamily: SANS, fontSize: TEXT.xs, fontWeight: 500, lineHeight: 1.5,
      color, background: tint(color, 12),
      border: `1px solid ${tint(color, 26)}`,
      padding: '1px 7px', borderRadius: RADIUS.sm, whiteSpace: 'nowrap', flexShrink: 0,
      ...style,
    }}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  )
}

/** Button-Varianten: primary (Akzent), ghost (Rahmen), subtle (Fläche), danger (rot).
 *  `size` steuert die Höhe: sm für Toolbars, md als Standard. */
export function Button({ variant = 'primary', size = 'md', icon: Icon, children, style, ...props }) {
  const variants = {
    primary: { background: A, color: 'var(--luma-on-a)', border: '1px solid transparent', fontWeight: 600 },
    ghost:   { background: 'transparent', color: MUTED, border: `1px solid ${BORDER}` },
    subtle:  { background: SURFACE_2, color: FG, border: `1px solid ${BORDER}` },
    danger:  { background: tint(DANGER, 12), color: DANGER, border: `1px solid ${tint(DANGER, 35)}` },
  }
  const sizes = {
    sm: { padding: '5px 10px', fontSize: TEXT.sm },
    md: { padding: '7px 14px', fontSize: TEXT.base },
  }
  return (
    <button
      className={`lu-btn-${variant === 'subtle' ? 'ghost' : variant}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: SPACE[2],
        borderRadius: RADIUS.md, cursor: props.disabled ? 'not-allowed' : 'pointer',
        fontFamily: SANS, fontWeight: 500, opacity: props.disabled ? 0.5 : 1, whiteSpace: 'nowrap',
        ...sizes[size] || sizes.md, ...variants[variant], ...style,
      }}
      {...props}>
      {Icon && <Icon size={size === 'sm' ? 13 : 14} />}
      {children}
    </button>
  )
}

/** Leerer Zustand mit Icon & optionalem Hinweis statt nacktem Text */
export function EmptyState({ icon: Icon, title, hint, action, style }) {
  return (
    <div style={{ padding: '32px 24px', textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: RADIUS.md, ...style }}>
      {Icon && <Icon size={20} color={MUTED} style={{ marginBottom: SPACE[2], opacity: 0.7 }} />}
      <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG }}>{title}</div>
      {hint && <div style={{ fontSize: TEXT.sm, color: MUTED, marginTop: SPACE[1] }}>{hint}</div>}
      {action && <div style={{ marginTop: SPACE[4], display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  )
}

/** Initialen-Avatar; zeigt ein Profilfoto (src), sonst Initialen auf Farbe.
 *  style überschreibt die Hülle (z.B. Ring/negative Margins in Stapel-Reihen). */
export function Avatar({ initials, color = A, size = 22, title, src, style }) {
  if (src) {
    return (
      <div title={title} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${BORDER}`, background: SURFACE, ...style }}>
        <img src={src} alt={title || initials || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
      </div>
    )
  }
  const textColor = color === A ? 'var(--luma-on-a)' : '#001219'
  return (
    <div title={title} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      <span style={{ fontFamily: MONO, fontSize: Math.max(7, Math.round(size * 0.36)), color: textColor, fontWeight: 700 }}>{initials}</span>
    </div>
  )
}

/** Segmentierter Umschalter.
 *  Der aktive Reiter wird angehoben (helle Fläche + Schatten) statt in
 *  Akzentfarbe geflutet — der Akzent bleibt so Aktionen vorbehalten. */
export function Tabs({ tabs, active, onChange, isMobile = false, style }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: RADIUS.md, padding: 3, marginBottom: SPACE[4], overflowX: 'auto', maxWidth: '100%', ...style }}>
      {tabs.map(([id, label]) => {
        const on = active === id
        return (
          <button key={id} onClick={() => onChange(id)} className={on ? undefined : 'lu-tab'}
            style={{
              padding: isMobile ? '6px 12px' : '6px 16px', border: 'none', borderRadius: RADIUS.sm,
              background: on ? SURFACE : 'transparent',
              boxShadow: on ? ELEV[1] : 'none',
              color: on ? FG : MUTED, fontFamily: SANS, fontSize: isMobile ? TEXT.sm : TEXT.base,
              fontWeight: on ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** Filter-Chips (Pill-Reihe), optional farbig pro Option */
export function Chips({ options, value, onChange, colors = {}, style }) {
  return (
    <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap', ...style }}>
      {options.map(([id, label]) => {
        const c = colors[id] || A
        const on = value === id
        return (
          <button key={id} onClick={() => onChange(id)} className="lu-chip"
            style={{
              padding: '4px 11px', borderRadius: RADIUS.sm,
              border: `1px solid ${on ? tint(c, 45) : BORDER}`,
              background: on ? tint(c, 12) : 'transparent',
              color: on ? c : MUTED, cursor: 'pointer', fontSize: TEXT.sm, fontWeight: on ? 600 : 500,
              fontFamily: SANS, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Panel, Tabelle, Zeile ────────────────────────────────────────────────
   Die App besteht überwiegend aus Listen (Aufgaben, Einsätze, Zeiten,
   Stammdaten). Bisher baute jede Seite ihre Zeilen selbst — mit je eigener
   Höhe, Ausrichtung und Trennung. Diese drei Bausteine geben allen Listen
   dieselbe Rasterung. */

/** Umrahmter Block mit Kopfzeile; Inhalt läuft randlos bis an die Kante,
 *  damit Tabellen und Listen bündig sitzen. */
export function Panel({ title, action, children, style, bodyStyle }) {
  return (
    <section className="lu-panel" style={style}>
      {(title || action) && (
        <header className="lu-panel-head">
          <span className="lu-panel-title">{title}</span>
          {action}
        </header>
      )}
      <div style={bodyStyle}>{children}</div>
    </section>
  )
}

/**
 * Dichte Datentabelle.
 *   columns: [{ key, label, width, align, mono, muted, render(row) }]
 *   rows:    Datensätze mit stabiler `id`
 *   accent(row) → Farbe für die Statuskante links (optional)
 */
export function DataTable({ columns, rows, onRowClick, accent, empty, maxHeight }) {
  if (!rows?.length && empty) return empty
  return (
    <div style={{ overflowX: 'auto', maxHeight, overflowY: maxHeight ? 'auto' : undefined }}>
      <table className="lu-table">
        <thead>
          <tr>
            {accent && <th style={{ width: 2, padding: 0 }} aria-hidden="true" />}
            {columns.map(c => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align === 'right' ? 'right' : 'left' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className={onRowClick ? 'lu-row-click' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {accent && <td style={{ width: 2, padding: 0, background: accent(row) || 'transparent' }} />}
              {columns.map(c => (
                <td key={c.key}
                  className={[c.align === 'right' || c.mono ? 'lu-cell-num' : '', c.muted ? 'lu-cell-mute' : ''].filter(Boolean).join(' ')}
                  style={{ width: c.width }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Einzelne Listenzeile — für mobile Ansichten und Fälle, in denen eine
 *  Tabelle zu breit würde. Gleiche Rasterung wie DataTable. */
export function ListRow({ accent, onClick, children, style }) {
  return (
    <div className={`lu-row${onClick ? ' lu-row-click' : ''}`} onClick={onClick}
      style={{ borderLeft: accent ? `2px solid ${accent}` : undefined, ...style }}>
      {children}
    </div>
  )
}

/** Werkzeugleiste über Listen: Filter links, Aktionen rechts */
export function Toolbar({ children, right, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], flexWrap: 'wrap', marginBottom: SPACE[3], ...style }}>
      {children}
      {right && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: SPACE[2] }}>{right}</div>}
    </div>
  )
}

/** Ladeplatzhalter — statt leerer Fläche oder springendem Layout */
export function Skeleton({ width = '100%', height = 12, radius, style }) {
  return <div className="lu-skeleton" style={{ width, height, borderRadius: RADIUS.sm, ...style }} />
}

/**
 * Aufklappmenü mit vorangestelltem Label.
 *
 * Bewusst ein natives <select>: Tastaturbedienung, Suche durch Tippen und der
 * Rad-Picker auf dem Handy kommen damit gratis — ein nachgebautes Menü müsste
 * das alles selbst leisten und tut es meist schlechter.
 *
 *   options: [[wert, beschriftung], …]
 */
export function Select({ label, value, onChange, options, style }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: SPACE[2],
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS.md,
      padding: '4px 4px 4px 10px', cursor: 'pointer', maxWidth: '100%', ...style,
    }}>
      {label && <span style={{ fontSize: TEXT.xs, color: MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer',
          color: FG, fontFamily: SANS, fontSize: TEXT.base, fontWeight: 500,
          padding: '3px 2px', maxWidth: 200, textOverflow: 'ellipsis',
        }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
