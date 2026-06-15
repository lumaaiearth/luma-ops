import { useState, useEffect } from 'react'
import { X, Plus, Check, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A14 } from '../lib/theme.js'

const BIO_ROLLEN = [
  'Founder',
  'Biodiversity Project Manager',
  'Biodiversity Site-Steward & Care Manager',
]

const PREDEFINED_SKILLS = [
  'GIS',
  'Drohnen-Erkundung',
  'Fotodokumentation',
  'Pflanzmanagement',
  'Bodenexpertise',
  'Kompostierung',
  'Biodiversitätsmonitoring',
  'Wasserinfrastruktur',
  'Baumkontrolle',
  'Stadtökologie',
  'Insektenmonitoring',
  'Sensorinstallation',
]

export default function UserProfileModal({ open, onClose }) {
  const { profile, user, updateProfile, updatePassword } = useAuth()

  const [name, setName] = useState('')
  const [bioRolle, setBioRolle] = useState('')
  const [skills, setSkills] = useState([])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [customSkill, setCustomSkill] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (open) {
      setName(profile?.name || '')
      setBioRolle(profile?.bio_rolle || '')
      setSkills(profile?.skills || [])
      setNewPassword('')
      setConfirmPassword('')
      setShowPw(false)
      setMsg(null)
    }
  }, [open, profile])

  if (!open) return null

  function toggleSkill(skill) {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  function addCustomSkill() {
    const s = customSkill.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setCustomSkill('')
  }

  async function handleSave() {
    setSaving(true)
    setMsg(null)

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setMsg({ ok: false, text: 'Passwörter stimmen nicht überein.' })
        setSaving(false)
        return
      }
      if (newPassword.length < 6) {
        setMsg({ ok: false, text: 'Passwort muss mindestens 6 Zeichen haben.' })
        setSaving(false)
        return
      }
      const pwResult = await updatePassword(newPassword)
      if (!pwResult.ok) {
        setMsg({ ok: false, text: pwResult.error })
        setSaving(false)
        return
      }
    }

    const { ok, error } = await updateProfile({
      name: name.trim() || profile?.name || '',
      bio_rolle: bioRolle,
      skills,
    })

    setMsg(ok
      ? { ok: true, text: 'Profil gespeichert.' }
      : { ok: false, text: error || 'Fehler beim Speichern.' }
    )
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '9px 12px',
    color: FG,
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    color: MUTED,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 6,
  }

  const customSkills = skills.filter(s => !PREDEFINED_SKILLS.includes(s))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: 12, width: '100%', maxWidth: 420,
        maxHeight: '90vh', overflowY: 'auto',
        margin: '0 16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 500, color: FG }}>Profil bearbeiten</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 2, letterSpacing: '0.06em' }}>{user?.email}</div>
          </div>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, padding: 4, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = FG}
            onMouseLeave={e => e.currentTarget.style.color = MUTED}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Anzeigename</label>
            <input
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Dein Name"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
            <label style={labelStyle}>Passwort ändern</label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                style={{ ...inputStyle, paddingRight: 40 }}
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Neues Passwort"
                autoComplete="new-password"
              />
              <button onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <input
              style={inputStyle}
              type={showPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Passwort bestätigen"
              autoComplete="new-password"
            />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 6 }}>
              Nur ausfüllen um das Passwort zu ändern.
            </div>
          </div>

          {/* Bio Rolle */}
          <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
            <label style={labelStyle}>Rolle</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BIO_ROLLEN.map(r => {
                const active = bioRolle === r
                return (
                  <button key={r} onClick={() => setBioRolle(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 6,
                      border: `1px solid ${active ? A : BORDER}`,
                      background: active ? A14 : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: `2px solid ${active ? A : BORDER}`,
                      background: active ? A : 'transparent',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: active ? FG : MUTED }}>
                      {r}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: customSkills.length ? 8 : 10 }}>
              {PREDEFINED_SKILLS.map(s => {
                const active = skills.includes(s)
                return (
                  <button key={s} onClick={() => toggleSkill(s)}
                    style={{
                      padding: '5px 10px', borderRadius: 20,
                      border: `1px solid ${active ? A : BORDER}`,
                      background: active ? A14 : 'transparent',
                      color: active ? A : MUTED,
                      fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
                      cursor: 'pointer',
                    }}>
                    #{s}
                  </button>
                )
              })}
            </div>

            {/* Custom skills */}
            {customSkills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {customSkills.map(s => (
                  <div key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20, border: `1px solid ${A}`, background: A14, color: A, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
                    #{s}
                    <button onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: A, padding: 0, display: 'flex', alignItems: 'center', marginLeft: 2 }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom skill input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={customSkill}
                onChange={e => setCustomSkill(e.target.value)}
                placeholder="Eigener Skill hinzufügen…"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
              />
              <button onClick={addCustomSkill}
                style={{ padding: '9px 14px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = A; e.currentTarget.style.color = A }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}>
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Status message */}
          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 6, marginBottom: 14,
              background: msg.ok ? A14 : 'rgba(220,38,38,0.12)',
              border: `1px solid ${msg.ok ? A : '#dc2626'}`,
              color: msg.ok ? A : '#fca5a5',
              fontSize: 13, fontFamily: "'Space Grotesk', sans-serif",
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {msg.ok && <Check size={14} />}
              {msg.text}
            </div>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: 11, borderRadius: 6,
              background: A, border: 'none',
              color: '#001219', fontSize: 14,
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
