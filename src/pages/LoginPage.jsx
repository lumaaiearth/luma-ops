import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { A, BG, BORDER, FG, MUTED, CARD } from '../lib/theme.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email.trim(), password)
    setLoading(false)
    if (result.ok) {
      navigate('/dashboard')
    } else {
      setError(result.error || 'Login fehlgeschlagen')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: BG }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>LUMA</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 300, color: FG, letterSpacing: '-0.03em' }}>Operations</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 28, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@luma.earth"
              autoComplete="email"
              required
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? '#ef4444' : BORDER}`, borderRadius: 6, padding: '10px 12px', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? '#ef4444' : BORDER}`, borderRadius: 6, padding: '10px 12px', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(8,170,86,0.4)' : A, border: 'none', borderRadius: 6, padding: '11px', color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: MUTED }}>
          LUMA Biome · Internes Ops-System
        </p>
      </div>
    </div>
  )
}
