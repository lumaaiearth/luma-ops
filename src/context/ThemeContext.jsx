import { createContext, useContext, useState, useEffect } from 'react'

// Semantische Statusfarben: dunkle Themes teilen sich einen Satz,
// das helle Theme braucht kräftigere Töne für ausreichend Kontrast.
const SEMANTIC_DARK = {
  '--luma-ok':     '#22EAA7',
  '--luma-warn':   '#F5A623',
  '--luma-danger': '#F87171',
  '--luma-info':   '#6EA8C0',
}
const SEMANTIC_LIGHT = {
  '--luma-ok':     '#0C8A50',
  '--luma-warn':   '#B45309',
  '--luma-danger': '#DC2626',
  '--luma-info':   '#33678A',
}

export const THEMES = [
  {
    id: 'forest',
    name: 'Waldgrün',
    preview: ['#070d12', '#09BE60'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#09BE60',
      '--luma-bg':      '#070d12',
      '--luma-surface': '#0e1c26',
      '--luma-card':    '#0e1c26',
      '--luma-border':  'rgba(255,255,255,0.12)',
      '--luma-fg':      '#f0f7fc',
      '--luma-muted':   'rgba(240,247,252,0.58)',
      ...SEMANTIC_DARK,
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    preview: ['#000000', '#00FF88'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#00FF88',
      '--luma-bg':      '#000000',
      '--luma-surface': '#0c0c0c',
      '--luma-card':    '#0c0c0c',
      '--luma-border':  'rgba(255,255,255,0.16)',
      '--luma-fg':      '#ffffff',
      '--luma-muted':   'rgba(255,255,255,0.62)',
      ...SEMANTIC_DARK,
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    preview: ['#060c18', '#22EAA7'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#22EAA7',
      '--luma-bg':      '#060c18',
      '--luma-surface': '#0e1c30',
      '--luma-card':    '#0e1c30',
      '--luma-border':  'rgba(255,255,255,0.13)',
      '--luma-fg':      '#eaf3ff',
      '--luma-muted':   'rgba(234,243,255,0.58)',
      ...SEMANTIC_DARK,
    },
  },
  {
    id: 'light',
    name: 'Hell',
    preview: ['#f0f2ee', '#047A3C'],
    scheme: 'light',
    vars: {
      '--luma-a':       '#047A3C',
      '--luma-bg':      '#eef0ec',
      '--luma-surface': '#ffffff',
      '--luma-card':    '#ffffff',
      '--luma-border':  'rgba(0,0,0,0.14)',
      '--luma-fg':      '#0a1409',
      '--luma-muted':   'rgba(10,20,9,0.54)',
      '--lu-shadow':    '0 1px 3px rgba(10,20,9,0.07), 0 6px 16px rgba(10,20,9,0.05)',
      ...SEMANTIC_LIGHT,
    },
  },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('luma-theme') || 'forest')

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    // native Controls (Selects, Scrollbars, Date-Picker) folgen dem Theme
    root.style.colorScheme = theme.scheme || 'dark'
    localStorage.setItem('luma-theme', themeId)
  }, [themeId, theme])

  function setTheme(id) { setThemeId(id) }

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
