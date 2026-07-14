import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, DANGER, OK, A06, A10, A14 } from '../lib/theme.js'
import { useIsMobile } from '../lib/useIsMobile.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

// Mehrfarbiges Google-„G" (offizielle Markenfarben) für den Social-Button
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function LoginPage() {
  const { login, loginWithGoogle, resetPassword } = useAuth()
  const navigate = useNavigate()
  const isNarrow = useIsMobile(920)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const lastMethod = (() => {
    try { return localStorage.getItem('luma_last_login_method') } catch { return null }
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(''); setInfo('')
    const result = await login(email.trim(), password)
    setLoading(false)
    if (result.ok) {
      try { localStorage.setItem('luma_last_login_method', 'email') } catch {}
      navigate('/dashboard')
    } else {
      setError(result.error || 'Anmeldung fehlgeschlagen')
      setTimeout(() => setError(''), 4000)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true); setError(''); setInfo('')
    try { localStorage.setItem('luma_last_login_method', 'google') } catch {}
    const result = await loginWithGoogle()
    // Erfolg = Redirect zu Google → diese Seite wird verlassen.
    if (!result.ok) {
      setGoogleLoading(false)
      setError(result.error || 'Google-Anmeldung ist momentan nicht verfügbar')
      setTimeout(() => setError(''), 5000)
    }
  }

  async function handleForgot() {
    setError(''); setInfo('')
    if (!email.trim()) {
      setError('Bitte zuerst deine E-Mail eingeben')
      setTimeout(() => setError(''), 4000)
      return
    }
    const result = await resetPassword(email.trim())
    if (result.ok) {
      setInfo('Falls ein Konto existiert, ist eine E-Mail zum Zurücksetzen unterwegs.')
      setTimeout(() => setInfo(''), 6000)
    } else {
      setError(result.error || 'Konnte keine E-Mail senden')
      setTimeout(() => setError(''), 4000)
    }
  }

  const labelStyle = { fontFamily: SANS, fontSize: 13, fontWeight: 500, color: FG, display: 'block', marginBottom: 7 }
  const inputStyle = {
    width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8,
    padding: '11px 13px', color: FG, fontFamily: SANS, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const focusOn = (e) => { e.target.style.borderColor = A; e.target.style.boxShadow = `0 0 0 3px ${A14}` }
  const focusOff = (e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: CARD }}>
      {/* ── Linke Seite: Formular ─────────────────────────────────────────── */}
      <div style={{
        flex: isNarrow ? '1' : '0 0 46%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: isNarrow ? '32px 22px' : '40px 56px',
        background: CARD, position: 'relative',
      }}>
        {/* Wortmarke oben links */}
        <div style={{ position: 'absolute', top: 28, left: isNarrow ? 22 : 40, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: A, letterSpacing: '0.24em', textTransform: 'uppercase' }}>LUMA</span>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, color: MUTED, letterSpacing: '-0.01em' }}>Operations</span>
        </div>

        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontFamily: SANS, fontSize: 30, fontWeight: 500, color: FG, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Willkommen zurück
          </h1>
          <p style={{ fontFamily: SANS, fontSize: 14, color: MUTED, margin: '0 0 26px' }}>
            Melde dich an deinem Konto an
          </p>

          {/* Social-Login */}
          <button type="button" onClick={handleGoogle} disabled={googleLoading}
            style={{
              position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '11px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: FG,
              fontFamily: SANS, fontSize: 14, fontWeight: 500, cursor: googleLoading ? 'wait' : 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = A06; e.currentTarget.style.borderColor = A }}
            onMouseLeave={e => { e.currentTarget.style.background = SURFACE; e.currentTarget.style.borderColor = BORDER }}>
            <GoogleIcon />
            {googleLoading ? 'Weiterleitung…' : 'Weiter mit Google'}
            {lastMethod === 'google' && (
              <span style={{
                position: 'absolute', top: -8, right: 10, fontFamily: MONO, fontSize: 8, fontWeight: 700,
                letterSpacing: '0.1em', color: A, background: CARD, border: `1px solid ${A}`,
                borderRadius: 10, padding: '2px 7px', textTransform: 'uppercase',
              }}>Zuletzt</span>
            )}
          </button>

          {/* Trenner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: SANS, fontSize: 12, color: MUTED }}>oder</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Formular */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={labelStyle}>E-Mail</label>
              <input
                id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@luma.earth" autoComplete="email" required
                onFocus={focusOn} onBlur={focusOff}
                style={{ ...inputStyle, borderColor: error ? DANGER : BORDER }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>Passwort</label>
                <button type="button" onClick={handleForgot}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SANS, fontSize: 12.5, color: A }}>
                  Passwort vergessen?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required
                  onFocus={focusOn} onBlur={focusOff}
                  style={{ ...inputStyle, paddingRight: 42, borderColor: error ? DANGER : BORDER }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: MUTED, display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: '9px 12px', background: `color-mix(in srgb, ${DANGER} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${DANGER} 30%, transparent)`, borderRadius: 8, color: DANGER, fontSize: 13, fontFamily: SANS }}>
                {error}
              </div>
            )}
            {info && (
              <div style={{ marginBottom: 16, padding: '9px 12px', background: `color-mix(in srgb, ${OK} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${OK} 30%, transparent)`, borderRadius: 8, color: OK, fontSize: 13, fontFamily: SANS }}>
                {info}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="lu-btn-primary"
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: '1px solid transparent',
                background: A, color: 'var(--luma-on-a)', fontFamily: SANS, fontSize: 14, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
              }}>
              {loading ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>

          {/* Kontohinweis (Zugang ist eingeladen, keine Selbstregistrierung) */}
          <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, fontFamily: SANS, marginTop: 22 }}>
            Noch kein Zugang? Dein LUMA-Admin legt dein Konto an.
          </p>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 11.5, color: MUTED, fontFamily: SANS, marginTop: 26, lineHeight: 1.6, opacity: 0.85 }}>
            Mit der Anmeldung stimmst du den Nutzungsbedingungen und der
            Datenschutzerklärung von LUMA Biome zu.
          </p>
        </div>
      </div>

      {/* ── Rechte Seite: Marken-Panel (statt Supabase-Testimonial) ─────────── */}
      {!isNarrow && (
        <div style={{
          flex: '1', position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '64px 72px', borderLeft: `1px solid ${BORDER}`,
          background: `linear-gradient(150deg, ${A14} 0%, ${A06} 42%, ${BG} 100%)`,
        }}>
          {/* dezenter Rasterschimmer */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
            backgroundImage: `radial-gradient(${A10} 1px, transparent 1px)`, backgroundSize: '26px 26px',
          }} />
          <div style={{ position: 'relative', maxWidth: 520 }}>
            <div style={{ fontFamily: MONO, fontSize: 64, lineHeight: 0.4, color: A, opacity: 0.5, marginBottom: 8 }}>&ldquo;</div>
            <blockquote style={{ fontFamily: SANS, fontSize: 30, fontWeight: 400, color: FG, letterSpacing: '-0.02em', lineHeight: 1.32, margin: 0 }}>
              Wir machen Städte messbar grün — jeder Baum, jeder Sensor und jedes
              Projekt an einem Ort, in Echtzeit.
            </blockquote>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 34 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: 'var(--luma-on-a)' }}>L</span>
              </div>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: FG }}>LUMA Biome</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, letterSpacing: '0.05em' }}>Operations-Plattform</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
