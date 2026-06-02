import { createContext, useContext, useState, useEffect } from 'react'

export const THEMES = [
  {
    id: 'forest',
    name: 'Waldgrün',
    preview: ['#070d12', '#09BE60'],
    vars: {
      '--luma-a':       '#09BE60',
      '--luma-bg':      '#070d12',
      '--luma-surface': '#0e1c26',
      '--luma-card':    '#0e1c26',
      '--luma-border':  'rgba(255,255,255,0.12)',
      '--luma-fg':      '#f0f7fc',
      '--luma-muted':   'rgba(240,247,252,0.58)',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    preview: ['#000000', '#00FF88'],
    vars: {
      '--luma-a':       '#00FF88',
      '--luma-bg':      '#000000',
      '--luma-surface': '#0c0c0c',
      '--luma-card':    '#0c0c0c',
      '--luma-border':  'rgba(255,255,255,0.16)',
      '--luma-fg':      '#ffffff',
      '--luma-muted':   'rgba(255,255,255,0.62)',
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    preview: ['#060c18', '#22EAA7'],
    vars: {
      '--luma-a':       '#22EAA7',
      '--luma-bg':      '#060c18',
      '--luma-surface': '#0e1c30',
      '--luma-card':    '#0e1c30',
      '--luma-border':  'rgba(255,255,255,0.13)',
      '--luma-fg':      '#eaf3ff',
      '--luma-muted':   'rgba(234,243,255,0.58)',
    },
  },
  {
    id: 'light',
    name: 'Hell',
    preview: ['#f0f2ee', '#047A3C'],
    vars: {
      '--luma-a':       '#047A3C',
      '--luma-bg':      '#eef0ec',
      '--luma-surface': '#ffffff',
      '--luma-card':    '#ffffff',
      '--luma-border':  'rgba(0,0,0,0.14)',
      '--luma-fg':      '#0a1409',
      '--luma-muted':   'rgba(10,20,9,0.54)',
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
