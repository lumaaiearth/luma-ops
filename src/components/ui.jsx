// ────────────────────────────────────────────────────────────────
// LUMA Ops — geteilter UI-Baukasten
// Eine Quelle für Buttons, Karten, Badges, Labels & Empty-States,
// damit alle Seiten dieselbe Sprache sprechen.
// Hover-/Fokus-Feedback kommt aus src/styles/ui.css (lu-* Klassen).
// ────────────────────────────────────────────────────────────────
import { A, SURFACE, BORDER, FG, MUTED, DANGER } from '../lib/theme.js'

export const MONO = "'Space Mono', monospace"
export const SANS = "'Space Grotesk', sans-serif"

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

/** Einheitlicher Seitenkopf: Titel links, Aktionen rechts */
export function PageHeader({ title, sub, actions, isMobile = false, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16, ...style }}>
      <div>
        <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
        {sub && <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginTop: 3 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
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
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${BORDER}`,
        borderRadius: 8,
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
    primary: { background: A, color: '#001219', border: '1px solid transparent', fontWeight: 600 },
    ghost:   { background: 'transparent', color: MUTED, border: `1px solid ${BORDER}` },
    danger:  { background: `color-mix(in srgb, ${DANGER} 12%, transparent)`, color: DANGER, border: `1px solid color-mix(in srgb, ${DANGER} 35%, transparent)` },
  }
  return (
    <button
      className={`lu-btn-${variant}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 7, cursor: props.disabled ? 'not-allowed' : 'pointer',
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
    <div style={{ padding: '36px 24px', textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: 8, ...style }}>
      {Icon && <Icon size={22} color={MUTED} style={{ marginBottom: 10, opacity: 0.7 }} />}
      <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED, letterSpacing: '0.05em' }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: MUTED, marginTop: 6, opacity: 0.8 }}>{hint}</div>}
      {action && <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  )
}

/** Initialen-Avatar (Team-Mitglieder) */
export function Avatar({ initials, color = A, size = 22, title }) {
  return (
    <div title={title} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: MONO, fontSize: Math.max(7, Math.round(size * 0.36)), color: '#001219', fontWeight: 700 }}>{initials}</span>
    </div>
  )
}

/** Unterstrich-Tabs */
export function Tabs({ tabs, active, onChange, isMobile = false, style }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 16, overflowX: 'auto', ...style }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} className="lu-tab"
          style={{
            padding: isMobile ? '9px 14px' : '10px 20px', border: 'none', background: 'transparent',
            color: active === id ? A : MUTED, fontFamily: SANS, fontSize: isMobile ? 12 : 13,
            cursor: 'pointer', borderBottom: `2px solid ${active === id ? A : 'transparent'}`,
            marginBottom: -1, whiteSpace: 'nowrap',
          }}>
          {label}
        </button>
      ))}
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
