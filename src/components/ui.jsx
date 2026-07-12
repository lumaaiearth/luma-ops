// ────────────────────────────────────────────────────────────────
// LUMA Ops — geteilter UI-Baukasten
// Eine Quelle für Buttons, Karten, Badges, Labels & Empty-States,
// damit alle Seiten dieselbe Sprache sprechen.
// Hover-/Fokus-Feedback kommt aus src/styles/ui.css (lu-* Klassen).
// ────────────────────────────────────────────────────────────────
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED, CARD, DANGER } from '../lib/theme.js'

export const MONO = "'Space Mono', monospace"
export const SANS = "'Space Grotesk', sans-serif"

/** Einheitlicher Formular-Input-Stil (vorher in jedem Modal dupliziert) */
export const INPUT_STYLE = {
  width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '10px 12px', color: FG,
  fontFamily: SANS, fontSize: 14, outline: 'none',
}

/** Einheitlicher Formular-Label-Stil */
export const LABEL_STYLE = {
  fontFamily: MONO, fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
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
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} />
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className="lu-fade-in"
        style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD, zIndex: 2 }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div style={{ fontFamily: MONO, fontSize: 10, color: eyebrowColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: title ? 2 : 0 }}>{eyebrow}</div>}
            {title && <div style={{ fontSize: 15, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="lu-btn-ghost"
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

/** Mono-Uppercase-Abschnittslabel — optional mit Aktion rechts (z.B. „alle →") */
export function SectionLabel({ children, action, style }) {
  const label = (
    <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', ...(!action ? style : {}) }}>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18, ...style }}>
      <div>
        {eyebrow && <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 500, color: FG, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.15 }}>{title}</h1>
        {sub && <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginTop: 3 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
    </div>
  )
}

/** Basis-Karte; `accent` färbt die linke Kante, `onClick` aktiviert Hover-Feedback */
export function Card({ children, onClick, accent, padding = '14px 18px', style }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'lu-card lu-clickable' : 'lu-card'}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${BORDER}`,
        borderRadius: 14,
        padding,
        ...style,
      }}>
      {children}
    </div>
  )
}

/** Kennzahl-Kachel fürs Dashboard */
export function StatCard({ label, value, sub, color, onClick }) {
  return (
    <Card onClick={onClick} padding="20px 24px">
      <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 300, color: color || FG, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </Card>
  )
}

/** Status-Pill: einheitliche Größe/Radius für alle Badges */
export function Badge({ color = A, children, icon: Icon, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: MONO, fontSize: 9, fontWeight: 700,
      color, background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0,
      ...style,
    }}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  )
}

/** Button-Varianten: primary (Akzent), ghost (Rahmen), danger (rot) */
export function Button({ variant = 'primary', icon: Icon, children, style, ...props }) {
  const variants = {
    primary: { background: A, color: 'var(--luma-on-a)', border: '1px solid transparent', fontWeight: 600 },
    ghost:   { background: 'transparent', color: MUTED, border: `1px solid ${BORDER}` },
    danger:  { background: `color-mix(in srgb, ${DANGER} 12%, transparent)`, color: DANGER, border: `1px solid color-mix(in srgb, ${DANGER} 35%, transparent)` },
  }
  return (
    <button
      className={`lu-btn-${variant}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 10, cursor: props.disabled ? 'not-allowed' : 'pointer',
        fontFamily: SANS, fontSize: 13, opacity: props.disabled ? 0.55 : 1,
        ...variants[variant], ...style,
      }}
      {...props}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  )
}

/** Leerer Zustand mit Icon & optionalem Hinweis statt nacktem Text */
export function EmptyState({ icon: Icon, title, hint, action, style }) {
  return (
    <div style={{ padding: '36px 24px', textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: 14, ...style }}>
      {Icon && <Icon size={22} color={MUTED} style={{ marginBottom: 10, opacity: 0.7 }} />}
      <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED, letterSpacing: '0.05em' }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: MUTED, marginTop: 6, opacity: 0.8 }}>{hint}</div>}
      {action && <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  )
}

/** Initialen-Avatar; zeigt ein Profilfoto (src), sonst Initialen auf Farbe */
export function Avatar({ initials, color = A, size = 22, title, src }) {
  if (src) {
    return (
      <div title={title} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${BORDER}`, background: SURFACE }}>
        <img src={src} alt={title || initials || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
      </div>
    )
  }
  const textColor = color === A ? 'var(--luma-on-a)' : '#001219'
  return (
    <div title={title} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: Math.max(7, Math.round(size * 0.36)), color: textColor, fontWeight: 700 }}>{initials}</span>
    </div>
  )
}

/** Segmentierte Pill-Tabs (aktiver Tab als gefüllte Pille) */
export function Tabs({ tabs, active, onChange, isMobile = false, style }) {
  return (
    <div style={{ display: 'inline-flex', gap: 3, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, padding: 4, marginBottom: 16, overflowX: 'auto', maxWidth: '100%', ...style }}>
      {tabs.map(([id, label]) => {
        const on = active === id
        return (
          <button key={id} onClick={() => onChange(id)} className={on ? undefined : 'lu-tab'}
            style={{
              padding: isMobile ? '7px 13px' : '7px 18px', border: 'none', borderRadius: 999,
              background: on ? A : 'transparent',
              color: on ? 'var(--luma-on-a)' : MUTED, fontFamily: SANS, fontSize: isMobile ? 12 : 13,
              fontWeight: on ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
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
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...style }}>
      {options.map(([id, label]) => {
        const c = colors[id] || A
        const on = value === id
        return (
          <button key={id} onClick={() => onChange(id)} className="lu-chip"
            style={{
              padding: '5px 12px', borderRadius: 20,
              border: `1px solid ${on ? c : BORDER}`,
              background: on ? `color-mix(in srgb, ${c} 12%, transparent)` : 'transparent',
              color: on ? c : MUTED, cursor: 'pointer', fontSize: 12,
              fontFamily: SANS, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}
