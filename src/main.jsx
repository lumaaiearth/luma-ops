import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/ui.css'
import App from './App.jsx'
import { initNative } from './lib/native.js'

// Übernimmt ein neuer Service Worker die Seite (Deploy, während die App offen ist),
// einmal neu laden — sonst fordert die alte App-Shell Chunks an, die es nicht mehr gibt.
if ('serviceWorker' in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return } // Erstinstallation: kein Reload nötig
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// After React's first paint: snap bar to 100% then fade the loader out
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const loader = document.getElementById('luma-loader')
    if (!loader) return
    const fill = document.getElementById('ll-fill')
    if (fill) fill.style.width = '100%'
    setTimeout(() => {
      loader.style.opacity = '0'
      // Während des Ausblendens nichts mehr abfangen — sonst gehen die
      // ersten 450 ms an Klicks ins Leere.
      loader.style.pointerEvents = 'none'
      setTimeout(() => loader.remove(), 450)
    }, 280)
  })
})

// Native App-Feinschliff (Statusleiste, Splash) — im Web ein No-op.
initNative()
