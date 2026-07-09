// CSS custom properties — all values come from ThemeContext via :root vars
export const A       = 'var(--luma-a)'
export const BG      = 'var(--luma-bg)'
export const SURFACE = 'var(--luma-surface)'
export const BORDER  = 'var(--luma-border)'
export const FG      = 'var(--luma-fg)'
export const MUTED   = 'var(--luma-muted)'
export const CARD    = 'var(--luma-card)'    // modal / overlay backgrounds

// Semantische Statusfarben — pro Theme definiert (helles Theme = dunklere Töne).
// Statt verstreuter Hex-Werte (#ef4444 …) überall diese Tokens verwenden.
export const OK      = 'var(--luma-ok)'
export const WARN    = 'var(--luma-warn)'
export const DANGER  = 'var(--luma-danger)'
export const INFO    = 'var(--luma-info)'

// Alpha variants of accent color via color-mix() — auto-adapt to any theme
const mix = (pct) => `color-mix(in srgb, var(--luma-a) ${pct}%, transparent)`
export const A06 = mix(2.4)
export const A08 = mix(3.1)
export const A0a = mix(3.9)
export const A0d = mix(5.1)
export const A10 = mix(6.3)
export const A14 = mix(7.8)
export const A18 = mix(9.4)
export const A20 = mix(12.5)
export const A30 = mix(18.8)
export const A40 = mix(25.1)
export const A50 = mix(31.4)
export const A60 = mix(37.6)
export const A80 = mix(50.2)
