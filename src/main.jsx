import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

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
      setTimeout(() => loader.remove(), 450)
    }, 280)
  })
})
