// CSS custom properties — all values come from ThemeContext via :root vars
export const A       = 'var(--luma-a)'
export const BG      = 'var(--luma-bg)'
export const SURFACE = 'var(--luma-surface)'
export const BORDER  = 'var(--luma-border)'
export const FG      = 'var(--luma-fg)'
export const MUTED   = 'var(--luma-muted)'
export const CARD    = 'var(--luma-card)'    // modal / overlay backgrounds

// Flächenebenen & Linien — geben Inhalten eine Tiefenordnung.
// SURFACE_2 ist die eingelassene Ebene: Tabellenkopf, Hover-Zeile, Inset.
export const SURFACE_2     = 'var(--luma-surface-2)'
export const BORDER_STRONG = 'var(--luma-border-strong)'
export const FAINT         = 'var(--luma-faint)'   // tertiärer Text, Platzhalter

// Semantische Statusfarben — pro Theme definiert (helles Theme = dunklere Töne).
// Statt verstreuter Hex-Werte (#ef4444 …) überall diese Tokens verwenden.
export const ON_A    = 'var(--luma-on-a)'   // Textfarbe auf Akzent-Hintergrund
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

/** Beliebige Farbe transparent mischen — für Status-Flächen aus Semantik-Tokens.
 *  tint(DANGER, 12) statt '#ef444418' (letzteres bricht im hellen Theme). */
export const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

// ── Skalen ───────────────────────────────────────────────────────────────
// Referenzieren die CSS-Variablen aus styles/ui.css, damit Inline-Styles
// dieselben Werte benutzen wie die Stylesheet-Schicht.

/** Abstands-Skala (4px-Raster) — SPACE[4] === 16px */
export const SPACE = {
  1: 'var(--lu-s1)', 2: 'var(--lu-s2)', 3: 'var(--lu-s3)', 4: 'var(--lu-s4)',
  5: 'var(--lu-s5)', 6: 'var(--lu-s6)', 7: 'var(--lu-s7)', 8: 'var(--lu-s8)',
}

/** Radius-Skala — vier Stufen statt frei gewählter Zahlen */
export const RADIUS = {
  sm:   'var(--lu-radius-sm)',    // Badges, Chips
  md:   'var(--lu-radius-md)',    // Karten, Buttons, Inputs
  lg:   'var(--lu-radius-lg)',    // Panels
  xl:   'var(--lu-radius-xl)',    // Modals
  pill: 'var(--lu-radius-pill)',
}

/** Typo-Skala — neun Stufen */
export const TEXT = {
  '2xs': 'var(--lu-text-2xs)',   // Mono-Mikrodaten, Badges
  xs:    'var(--lu-text-xs)',    // Metazeile, Spaltenköpfe
  sm:    'var(--lu-text-sm)',    // Sekundärtext, Labels
  base:  'var(--lu-text-base)',  // Zeilen, Fließtext
  md:    'var(--lu-text-md)',    // Formularfelder
  lg:    'var(--lu-text-lg)',    // Karten-/Panel-Titel
  xl:    'var(--lu-text-xl)',    // Seitentitel mobil
  '2xl': 'var(--lu-text-2xl)',   // Seitentitel
  '3xl': 'var(--lu-text-3xl)',   // Kennzahlen
}

/** Elevation — 1 Karte, 2 Hover/Dropdown, 3 Modal */
export const ELEV = {
  1: 'var(--lu-elev-1)',
  2: 'var(--lu-elev-2)',
  3: 'var(--lu-elev-3)',
}
