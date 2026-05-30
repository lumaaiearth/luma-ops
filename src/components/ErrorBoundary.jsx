import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, textAlign: 'center', color: 'rgba(232,240,245,0.5)', fontFamily: "'Space Mono', monospace" }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Fehler beim Laden</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 24 }}>{this.state.error.message}</div>
          <button
            onClick={() => this.setState({ error: null })}
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
