import { Component } from 'react'

// Fehlgeschlagener dynamischer Import eines Seiten-Chunks (Wortlaute von Safari/Chrome/Firefox).
// Passiert nach einem Deploy, wenn eine noch offene alte App-Version Chunks anfordert,
// die es auf dem Server nicht mehr gibt.
const CHUNK_ERROR = /importing a module script failed|dynamically imported module/i
const RELOAD_KEY = 'luma-chunk-reload'

function isChunkError(error) {
  return CHUNK_ERROR.test(error?.message || '')
}

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    if (isChunkError(error)) {
      // Einmal automatisch neu laden, um die aktuelle Version zu holen —
      // höchstens alle 60 s, damit kein Reload-Loop entsteht.
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        window.location.reload()
      }
    }
  }

  handleRetry = () => {
    if (isChunkError(this.state.error)) {
      // React merkt sich den fehlgeschlagenen Import — nur ein echter Seiten-Reload hilft
      window.location.reload()
    } else {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, textAlign: 'center', color: 'rgba(232,240,245,0.5)', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Fehler beim Laden</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 24 }}>{this.state.error.message}</div>
          <button
            onClick={this.handleRetry}
            style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(232,240,245,0.7)', cursor: 'pointer', fontSize: 12 }}
          >
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
