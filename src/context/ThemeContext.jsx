import { createContext, useContext, useState, useEffect } from 'react'

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
    preview: ['#f4f5f6', '#047A3C'],
    scheme: 'light',
    vars: {
      '--luma-a':       '#047A3C',
      '--luma-bg':      '#f4f5f6',
      '--luma-surface': '#ffffff',
      '--luma-card':    '#ffffff',
      '--luma-border':  'rgba(0,0,0,0.13)',
      '--luma-fg':      '#15181b',
      '--luma-muted':   'rgba(21,24,27,0.54)',
      '--lu-shadow':    '0 1px 3px rgba(15,18,20,0.07), 0 6px 16px rgba(15,18,20,0.05)',
      ...SEMANTIC_LIGHT,
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    preview: ['#f8f5f0', '#B4531F'],
    scheme: 'light',
    vars: {
      '--luma-a':       '#B4531F',
      '--luma-bg':      '#f8f5f0',
      '--luma-surface': '#fffdfa',
      '--luma-card':    '#fffdfa',
      '--luma-border':  'rgba(60,40,20,0.15)',
      '--luma-fg':      '#241c14',
      '--luma-muted':   'rgba(36,28,20,0.55)',
      '--lu-shadow':    '0 1px 3px rgba(60,40,20,0.07), 0 6px 16px rgba(60,40,20,0.05)',
      ...SEMANTIC_LIGHT,
    },
  },
  {
    id: 'sky',
    name: 'Himmel',
    preview: ['#f2f5f9', '#1D6FE0'],
    scheme: 'light',
    vars: {
      '--luma-a':       '#1D6FE0',
      '--luma-bg':      '#f2f5f9',
      '--luma-surface': '#ffffff',
      '--luma-card':    '#ffffff',
      '--luma-border':  'rgba(20,40,70,0.14)',
      '--luma-fg':      '#101820',
      '--luma-muted':   'rgba(16,24,32,0.54)',
      '--lu-shadow':    '0 1px 3px rgba(20,40,70,0.07), 0 6px 16px rgba(20,40,70,0.05)',
      ...SEMANTIC_LIGHT,
    },
  },
  {
    id: 'ocean',
    name: 'Ozean',
    preview: ['#041520', '#38BDF8'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#38BDF8',
      '--luma-bg':      '#041520',
      '--luma-surface': '#0a2434',
      '--luma-card':    '#0a2434',
      '--luma-border':  'rgba(200,235,255,0.14)',
      '--luma-fg':      '#e8f6ff',
      '--luma-muted':   'rgba(232,246,255,0.58)',
      ...SEMANTIC_DARK,
    },
  },
  {
    id: 'sunset',
    name: 'Abendrot',
    preview: ['#170f0c', '#FB923C'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#FB923C',
      '--luma-bg':      '#170f0c',
      '--luma-surface': '#251712',
      '--luma-card':    '#251712',
      '--luma-border':  'rgba(255,220,190,0.13)',
      '--luma-fg':      '#fdf1e7',
      '--luma-muted':   'rgba(253,241,231,0.56)',
      ...SEMANTIC_DARK,
    },
  },
  {
    id: 'violet',
    name: 'Flieder',
    preview: ['#0f0c1a', '#C084FC'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#C084FC',
      '--luma-bg':      '#0f0c1a',
      '--luma-surface': '#1a1530',
      '--luma-card':    '#1a1530',
      '--luma-border':  'rgba(220,205,255,0.14)',
      '--luma-fg':      '#f2eeff',
      '--luma-muted':   'rgba(242,238,255,0.58)',
      ...SEMANTIC_DARK,
    },
  },
  {
    id: 'graphite',
    name: 'Graphit',
    preview: ['#101214', '#9BE84C'],
    scheme: 'dark',
    vars: {
      '--luma-a':       '#9BE84C',
      '--luma-bg':      '#101214',
      '--luma-surface': '#1a1d20',
      '--luma-card':    '#1a1d20',
      '--luma-border':  'rgba(255,255,255,0.12)',
      '--luma-fg':      '#f2f4f5',
      '--luma-muted':   'rgba(242,244,245,0.56)',
      ...SEMANTIC_DARK,
    },
  },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('luma-theme') || 'light')

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
