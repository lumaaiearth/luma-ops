import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, A06, A14, A20, BG } from '../lib/theme.js'
import { User, Mail, Lock, ShieldCheck, ShieldOff, LogOut, ChevronRight, Check, Eye, EyeOff } from 'lucide-react'

const INPUT_STYLE = {
  background: BG, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', width: '100%',
  boxSizing: 'border-box',
}
const LABEL = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
}
const SECTION = {
  background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
  padding: '20px 24px', marginBottom: 16,
}
const SECTION_TITLE = {
  fontFamily: "'Space Mono', monospace", fontSize: 11, color: A,
  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
}
const BTN_PRIMARY = {
  padding: '9px 20px', background: A, border: 'none', borderRadius: 6,
  cursor: 'pointer', color: '#001219', fontSize: 13, fontWeight: 600,
  fontFamily: "'Space Grotesk', sans-serif",
}
const BTN_SECONDARY = {
  padding: '9px 20px', background: 'transparent', border: `1px solid ${BORDER}`,
  borderRadius: 6, cursor: 'pointer', color: MUTED, fontSize: 13,
  fontFamily: "'Space Grotesk', sans-serif",
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        style={{ ...INPUT_STYLE, paddingRight: 40 }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

export default function AccountSettingsPage() {
  const { user, profile, displayName, logout, updateProfile, updateEmail, updatePassword, enrollMFA, challengeMFA, verifyMFA, unenrollMFA, listMFAFactors } = useAuth()

  // Konto
  const [name, setName] = useState(profile?.name || '')
  const [savingName, setSavingName] = useState(false)

  // E-Mail
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Passwort
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // 2FA
  const [mfaFactors, setMfaFactors] = useState([])
  const [mfaLoading, setMfaLoading] = useState(true)
  const [enrollData, setEnrollData] = useState(null)   // { factorId, qrCode, secret }
  const [totpCode, setTotpCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)

  useEffect(() => {
    loadMFA()
  }, [])

  async function loadMFA() {
    setMfaLoading(true)
    const res = await listMFAFactors()
    if (res.ok) setMfaFactors(res.factors.filter(f => f.status === 'verified'))
    setMfaLoading(false)
  }

  async function handleSaveName() {
    setSavingName(true)
    const res = await updateProfile({ name })
    setSavingName(false)
    window.__lumaToast?.(res.ok ? 'Name gespeichert' : `Fehler: ${res.error}`)
  }

  async function handleSaveEmail() {
    if (!newEmail) return
    setSavingEmail(true)
    const res = await updateEmail(newEmail)
    setSavingEmail(false)
    if (res.ok) {
      window.__lumaToast?.('Bestätigungslink wurde an die neue E-Mail-Adresse gesendet')
      setNewEmail('')
    } else {
      window.__lumaToast?.(`Fehler: ${res.error}`)
    }
  }

  async function handleSavePassword() {
    if (pw1 !== pw2) { window.__lumaToast?.('Passwörter stimmen nicht überein'); return }
    if (pw1.length < 6) { window.__lumaToast?.('Passwort muss mindestens 6 Zeichen haben'); return }
    setSavingPw(true)
    const res = await updatePassword(pw1)
    setSavingPw(false)
    if (res.ok) {
      window.__lumaToast?.('Passwort geändert')
      setPw1(''); setPw2('')
    } else {
      window.__lumaToast?.(`Fehler: ${res.error}`)
    }
  }

  async function handleEnrollStart() {
    setEnrolling(true)
    const res = await enrollMFA()
    setEnrolling(false)
    if (res.ok) {
      setEnrollData({
        factorId: res.data.id,
        qrCode: res.data.totp.qr_code,
        secret: res.data.totp.secret,
      })
      setTotpCode('')
    } else {
      window.__lumaToast?.(`Fehler: ${res.error}`)
    }
  }

  async function handleEnrollVerify() {
    if (!enrollData || !totpCode) return
    setEnrolling(true)
    const challengeRes = await challengeMFA(enrollData.factorId)
    if (!challengeRes.ok) {
      setEnrolling(false)
      window.__lumaToast?.(`Fehler: ${challengeRes.error}`)
      return
    }
    const verifyRes = await verifyMFA(enrollData.factorId, challengeRes.challengeId, totpCode)
    setEnrolling(false)
    if (verifyRes.ok) {
      window.__lumaToast?.('Zwei-Faktor-Authentifizierung aktiviert')
      setEnrollData(null)
      setTotpCode('')
      loadMFA()
    } else {
      window.__lumaToast?.(`Falscher Code: ${verifyRes.error}`)
    }
  }

  async function handleUnenroll(factorId) {
    setUnenrolling(true)
    const res = await unenrollMFA(factorId)
    setUnenrolling(false)
    if (res.ok) {
      window.__lumaToast?.('2FA deaktiviert')
      loadMFA()
    } else {
      window.__lumaToast?.(`Fehler: ${res.error}`)
    }
  }

  const activeMFA = mfaFactors.length > 0

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, color: FG, margin: 0 }}>Konto &amp; Sicherheit</h1>
        <Link to="/profil"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none', fontFamily: "'Space Grotesk', sans-serif", padding: '6px 12px', borderRadius: 6, border: `1px solid ${BORDER}` }}
          onMouseEnter={e => { e.currentTarget.style.color = FG; e.currentTarget.style.background = A06 }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent' }}>
          Profil
        </Link>
      </div>

      {/* Konto */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}><User size={14} /> Konto</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Anzeigename</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...INPUT_STYLE, flex: 1 }} value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" />
              <button onClick={handleSaveName} disabled={savingName} style={{ ...BTN_PRIMARY, opacity: savingName ? 0.7 : 1, cursor: savingName ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                {savingName ? '…' : 'Speichern'}
              </button>
            </div>
          </div>
          <div>
            <label style={LABEL}>E-Mail-Adresse ändern</label>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: MUTED, marginBottom: 8 }}>
              Aktuell: <span style={{ color: FG }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...INPUT_STYLE, flex: 1 }} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Neue E-Mail-Adresse" type="email" />
              <button onClick={handleSaveEmail} disabled={savingEmail || !newEmail} style={{ ...BTN_PRIMARY, opacity: (savingEmail || !newEmail) ? 0.7 : 1, cursor: (savingEmail || !newEmail) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                {savingEmail ? '…' : 'Ändern'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 6, fontFamily: "'Space Grotesk', sans-serif" }}>
              Du erhältst einen Bestätigungslink an die neue Adresse.
            </div>
          </div>
        </div>
      </div>

      {/* Passwort */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}><Lock size={14} /> Passwort</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LABEL}>Neues Passwort</label>
            <PasswordInput value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Mindestens 6 Zeichen" />
          </div>
          <div>
            <label style={LABEL}>Passwort bestätigen</label>
            <PasswordInput value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Passwort wiederholen" />
            {pw2 && pw1 !== pw2 && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>Passwörter stimmen nicht überein</div>
            )}
          </div>
          <div style={{ paddingTop: 4 }}>
            <button onClick={handleSavePassword} disabled={savingPw || !pw1 || pw1 !== pw2}
              style={{ ...BTN_PRIMARY, opacity: (savingPw || !pw1 || pw1 !== pw2) ? 0.7 : 1, cursor: (savingPw || !pw1 || pw1 !== pw2) ? 'not-allowed' : 'pointer' }}>
              {savingPw ? 'Wird gespeichert …' : 'Passwort ändern'}
            </button>
          </div>
        </div>
      </div>

      {/* 2FA */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}><ShieldCheck size={14} /> Zwei-Faktor-Authentifizierung</div>

        {mfaLoading ? (
          <div style={{ fontSize: 13, color: MUTED, fontFamily: "'Space Grotesk', sans-serif" }}>Lädt …</div>
        ) : activeMFA ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>2FA ist aktiv</span>
            </div>
            <div style={{ fontSize: 12, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16 }}>
              Dein Konto ist durch einen TOTP-Authenticator geschützt (z.B. Google Authenticator, Bitwarden, 1Password).
            </div>
            <button onClick={() => handleUnenroll(mfaFactors[0].id)} disabled={unenrolling}
              style={{ ...BTN_SECONDARY, display: 'flex', alignItems: 'center', gap: 6, opacity: unenrolling ? 0.7 : 1, cursor: unenrolling ? 'not-allowed' : 'pointer', color: '#ef4444', borderColor: '#ef444440' }}>
              <ShieldOff size={14} /> {unenrolling ? 'Wird deaktiviert …' : '2FA deaktivieren'}
            </button>
          </div>
        ) : enrollData ? (
          // QR-Code anzeigen + Code eingeben
          <div>
            <div style={{ fontSize: 13, color: FG, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16 }}>
              Scanne den QR-Code mit deiner Authenticator-App und gib dann den 6-stelligen Code ein.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <img src={enrollData.qrCode} alt="TOTP QR-Code" style={{ width: 180, height: 180, borderRadius: 8, background: '#fff', padding: 8 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL}>Oder manuell eingeben</label>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, background: A14, border: `1px solid ${A20}`, borderRadius: 6, padding: '8px 12px', wordBreak: 'break-all', letterSpacing: '0.1em' }}>
                {enrollData.secret}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Bestätigungscode</label>
              <input
                style={{ ...INPUT_STYLE, letterSpacing: '0.2em', fontSize: 18, textAlign: 'center' }}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleEnrollVerify} disabled={enrolling || totpCode.length !== 6}
                style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6, opacity: (enrolling || totpCode.length !== 6) ? 0.7 : 1, cursor: (enrolling || totpCode.length !== 6) ? 'not-allowed' : 'pointer' }}>
                <Check size={14} /> {enrolling ? 'Wird aktiviert …' : '2FA aktivieren'}
              </button>
              <button onClick={() => { setEnrollData(null); setTotpCode('') }} style={BTN_SECONDARY}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16 }}>
              Schütze dein Konto mit einem TOTP-Authenticator (z.B. Google Authenticator, Bitwarden, 1Password).
            </div>
            <button onClick={handleEnrollStart} disabled={enrolling}
              style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6, opacity: enrolling ? 0.7 : 1, cursor: enrolling ? 'not-allowed' : 'pointer' }}>
              <ShieldCheck size={14} /> {enrolling ? 'Wird eingerichtet …' : '2FA einrichten'}
            </button>
          </div>
        )}
      </div>

      {/* Sitzung */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}><LogOut size={14} /> Sitzung</div>
        <div style={{ fontSize: 13, color: MUTED, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 12 }}>
          Angemeldet als <span style={{ color: FG }}>{user?.email}</span>
        </div>
        <button onClick={logout}
          style={{ ...BTN_SECONDARY, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} /> Abmelden
        </button>
      </div>
    </div>
  )
}
