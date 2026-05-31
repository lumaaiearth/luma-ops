import { createContext, useContext, useState, useEffect } from 'react'

export const THEMES = [
  {
    id: 'forest',
    name: 'Waldgrün',
    preview: ['#080f14', '#08AA56'],
    vars: {
      '--luma-a':       '#08AA56',
      '--luma-bg':      '#080f14',
      '--luma-surface': '#0d1a23',
      '--luma-card':    '#0d1a23',
      '--luma-border':  'rgba(255,255,255,0.07)',
      '--luma-fg':      '#e8f0f5',
      '--luma-muted':   'rgba(232,240,245,0.45)',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    preview: ['#000000', '#00FF88'],
    vars: {
      '--luma-a':       '#00FF88',
      '--luma-bg':      '#000000',
      '--luma-surface': '#0a0a0a',
      '--luma-card':    '#0d0d0d',
      '--luma-border':  'rgba(255,255,255,0.13)',
      '--luma-fg':      '#ffffff',
      '--luma-muted':   'rgba(255,255,255,0.55)',
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    preview: ['#080d16', '#22EAA7'],
    vars: {
      '--luma-a':       '#22EAA7',
      '--luma-bg':      '#080d16',
      '--luma-surface': '#0f1929',
      '--luma-card':    '#0f1929',
      '--luma-border':  'rgba(255,255,255,0.08)',
      '--luma-fg':      '#dce8f5',
      '--luma-muted':   'rgba(220,232,245,0.45)',
    },
  },
  {
    id: 'light',
    name: 'Hell',
    preview: ['#f2f4f0', '#06934A'],
    vars: {
      '--luma-a':       '#06934A',
      '--luma-bg':      '#f2f4f0',
      '--luma-surface': '#ffffff',
      '--luma-card':    '#ffffff',
      '--luma-border':  'rgba(0,0,0,0.09)',
      '--luma-fg':      '#0d1a10',
      '--luma-muted':   'rgba(13,26,16,0.5)',
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
