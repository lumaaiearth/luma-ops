import { createContext, useContext, useState, useEffect } from 'react'

// ────────────────────────────────────────────────────────────────
// Vier gepflegte Themes statt zehn halbgepflegter.
// Jedes Theme definiert drei Flächenebenen, damit Inhalte eine
// Tiefenordnung bekommen (vorher waren surface und card identisch —
// Karten hoben sich nur durch eine 1px-Linie vom Hintergrund ab):
//
//   bg         Seitenhintergrund (liegt hinten)
//   surface    Karten & Panels (angehoben)
//   surface-2  eingelassen: Tabellenkopf, Hover-Zeile, Inset-Blöcke
//   card       Overlays & Modals (ganz vorn)
// ────────────────────────────────────────────────────────────────

// Semantische Statusfarben: dunkle Themes teilen sich einen Satz,
// das helle Theme braucht kräftigere Töne für ausreichend Kontrast.
const SEMANTIC_DARK = {
  '--luma-ok':     '#22EAA7',
  '--luma-warn':   '#F5A623',
  '--luma-danger': '#F87171',
  '--luma-info':   '#6EA8C0',
  '--luma-on-a':   '#001219',   // Textfarbe auf Akzentflächen (helles Grün → dunkler Text)
}
const SEMANTIC_LIGHT = {
  '--luma-ok':     '#0C8A50',
  '--luma-warn':   '#B45309',
  '--luma-danger': '#DC2626',
  '--luma-info':   '#33678A',
  '--luma-on-a':   '#ffffff',   // dunkles Grün → weißer Text
}

// Elevation pro Schema: auf dunklem Grund trägt Schatten wenig, dort
// macht die hellere Fläche die Tiefe; auf hellem Grund umgekehrt.
const ELEV_DARK = {
  '--lu-elev-1': '0 1px 2px rgba(0,0,0,0.30)',
  '--lu-elev-2': '0 4px 14px rgba(0,0,0,0.40)',
  '--lu-elev-3': '0 24px 64px rgba(0,0,0,0.60)',
}
const ELEV_LIGHT = {
  '--lu-elev-1': '0 1px 2px rgba(16,24,40,0.06)',
  '--lu-elev-2': '0 4px 14px rgba(16,24,40,0.10)',
  '--lu-elev-3': '0 24px 60px rgba(16,24,40,0.18)',
}

export const THEMES = [
  {
    id: 'forest',
    name: 'Waldgrün',
    hint: 'Dunkel · Markenfarbe',
    preview: ['#070d12', '#09BE60'],
    scheme: 'dark',
    vars: {
      '--luma-a':             '#09BE60',
      '--luma-bg':            '#070d12',
      '--luma-surface':       '#0e1c26',
      '--luma-surface-2':     '#162a37',
      '--luma-card':          '#12222e',
      '--luma-border':        'rgba(255,255,255,0.11)',
      '--luma-border-strong': 'rgba(255,255,255,0.20)',
      '--luma-fg':            '#f0f7fc',
      '--luma-muted':         'rgba(240,247,252,0.60)',
      '--luma-faint':         'rgba(240,247,252,0.38)',
      ...SEMANTIC_DARK,
      ...ELEV_DARK,
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    hint: 'Dunkel · maximaler Kontrast',
    preview: ['#000000', '#00FF88'],
    scheme: 'dark',
    vars: {
      '--luma-a':             '#00FF88',
      '--luma-bg':            '#000000',
      '--luma-surface':       '#0c0c0c',
      '--luma-surface-2':     '#171717',
      '--luma-card':          '#111111',
      '--luma-border':        'rgba(255,255,255,0.14)',
      '--luma-border-strong': 'rgba(255,255,255,0.26)',
      '--luma-fg':            '#ffffff',
      '--luma-muted':         'rgba(255,255,255,0.62)',
      '--luma-faint':         'rgba(255,255,255,0.40)',
      ...SEMANTIC_DARK,
      ...ELEV_DARK,
    },
  },
  {
    id: 'light',
    name: 'Hell',
    hint: 'Hell · Standard',
    preview: ['#f4f5f6', '#047A3C'],
    scheme: 'light',
    vars: {
      '--luma-a':             '#047A3C',
      '--luma-bg':            '#f4f5f6',
      '--luma-surface':       '#ffffff',
      '--luma-surface-2':     '#f6f7f8',
      '--luma-card':          '#ffffff',
      '--luma-border':        'rgba(16,24,32,0.11)',
      '--luma-border-strong': 'rgba(16,24,32,0.20)',
      '--luma-fg':            '#15181b',
      '--luma-muted':         'rgba(21,24,27,0.62)',  // 4,9:1 auf Weiß — 0.56 ergab nur 4,07:1
      '--luma-faint':         'rgba(21,24,27,0.38)',
      ...SEMANTIC_LIGHT,
      ...ELEV_LIGHT,
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    hint: 'Hell · warm',
    preview: ['#f8f5f0', '#B4531F'],
    scheme: 'light',
    vars: {
      '--luma-a':             '#B4531F',
      '--luma-bg':            '#f8f5f0',
      '--luma-surface':       '#fffdfa',
      '--luma-surface-2':     '#f5f0e8',
      '--luma-card':          '#fffdfa',
      '--luma-border':        'rgba(60,40,20,0.13)',
      '--luma-border-strong': 'rgba(60,40,20,0.24)',
      '--luma-fg':            '#241c14',
      '--luma-muted':         'rgba(36,28,20,0.63)',  // dito für das warme helle Thema
      '--luma-faint':         'rgba(36,28,20,0.38)',
      ...SEMANTIC_LIGHT,
      ...ELEV_LIGHT,
    },
  },
]

// Entfallene Themes auf das nächstliegende verbliebene abbilden —
// sonst landen bestehende Nutzer stumm auf dem Standard.
const RETIRED = {
  navy: 'forest', ocean: 'forest', violet: 'forest',
  graphite: 'forest', sunset: 'forest', sky: 'light',
}

const DEFAULT_THEME = 'light'

function readStoredTheme() {
  let stored = null
  try { stored = localStorage.getItem('luma-theme') } catch { /* Storage gesperrt */ }
  if (!stored) return DEFAULT_THEME
  if (THEMES.some(t => t.id === stored)) return stored
  return RETIRED[stored] || DEFAULT_THEME
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(readStoredTheme)

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    // native Controls (Selects, Scrollbars, Date-Picker) folgen dem Theme
    root.style.colorScheme = theme.scheme || 'dark'
    try { localStorage.setItem('luma-theme', theme.id) } catch { /* Storage gesperrt */ }
  }, [themeId, theme])

  function setTheme(id) { setThemeId(id) }

  // isLight kommt aus dem Schema, nicht aus einem Vergleich mit 'light' —
  // sonst gilt „Sand" fälschlich als dunkles Theme.
  const isLight = theme.scheme === 'light'

  return (
    <ThemeContext.Provider value={{ themeId: theme.id, theme, setTheme, themes: THEMES, isLight }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
