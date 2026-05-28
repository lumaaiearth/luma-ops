import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { TEAM } from '../data/seed.js'

const A = '#08AA56'
const BORDER = 'rgba(255,255,255,0.08)'
const FG = '#e8f0f5'
const MUTED = 'rgba(232,240,245,0.5)'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (login(username, password)) {
      navigate('/dashboard')
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  function quickLogin(id) {
    if (login(id, 'luma2026')) navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#080f14' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>LUMA</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 300, color: FG, letterSpacing: '-0.03em' }}>Operations</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#0d1a23', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 28, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Name
            </label>
            <select
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? '#ef4444' : BORDER}`, borderRadius: 6, padding: '10px 12px', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none' }}
            >
              <option value="">Wählen...</option>
              {TEAM.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? '#ef4444' : BORDER}`, borderRadius: 6, padding: '10px 12px', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none' }}
              placeholder="Passwort"
            />
          </div>
          {error && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#ef4444', marginBottom: 16 }}>Ungültige Anmeldedaten</div>
          )}
          <button
            type="submit"
            style={{ width: '100%', padding: '12px', background: A, border: 'none', borderRadius: 6, color: '#001219', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Anmelden →
          </button>
        </form>

        {/* Quick access — for dev/testing */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', marginBottom: 12 }}>Schnellzugang</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TEAM.map(u => (
              <button
                key={u.id}
                onClick={() => quickLogin(u.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: `${u.color}18`, border: `1px solid ${u.color}40`, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: u.color }}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                </div>
                {u.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
