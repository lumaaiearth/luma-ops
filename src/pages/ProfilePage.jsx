import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, A06, A14, A20 } from '../lib/theme.js'
import { UserCog, Plus, X, Mail } from 'lucide-react'

const INPUT_STYLE = {
  background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', width: '100%',
  boxSizing: 'border-box',
}
const LABEL = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
}

export default function ProfilePage() {
  const { user, profile, displayName, updateProfile } = useAuth()
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?'

  const [name, setName] = useState(profile?.name || '')
  const [bioRolle, setBioRolle] = useState(profile?.bio_rolle || '')
  const [skills, setSkills] = useState(profile?.skills || [])
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await updateProfile({ name, bio_rolle: bioRolle, skills })
    setSaving(false)
    if (res.ok) {
      window.__lumaToast?.('Profil gespeichert')
    } else {
      window.__lumaToast?.(`Fehler: ${res.error}`)
    }
  }

  function addSkill() {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
  }

  function removeSkill(s) {
    setSkills(prev => prev.filter(x => x !== s))
  }

  function handleSkillKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addSkill() }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, color: FG, margin: 0 }}>Profil</h1>
        <Link to="/einstellungen"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none', fontFamily: "'Space Grotesk', sans-serif", padding: '6px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = FG; e.currentTarget.style.background = A06 }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent' }}>
          <UserCog size={14} /> Konto &amp; Sicherheit
        </Link>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, padding: '20px 24px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: '#001219', fontWeight: 700 }}>{initials}</span>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: FG, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{displayName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, padding: '2px 8px', borderRadius: 10, background: A14, color: A, border: `1px solid ${A20}` }}>
              {profile?.rolle?.toUpperCase() || '—'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: MUTED, fontFamily: "'Space Grotesk', sans-serif" }}>
              <Mail size={11} /> {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={LABEL}>Anzeigename</label>
          <input style={INPUT_STYLE} value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" />
        </div>

        <div>
          <label style={LABEL}>Bio / Funktion</label>
          <textarea
            style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80, lineHeight: 1.5 }}
            value={bioRolle}
            onChange={e => setBioRolle(e.target.value)}
            placeholder="Kurze Beschreibung deiner Rolle oder Tätigkeit …"
          />
        </div>

        <div>
          <label style={LABEL}>Skills</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {skills.map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: A14, border: `1px solid ${A20}`, borderRadius: 20, fontSize: 12, color: A, fontFamily: "'Space Grotesk', sans-serif" }}>
                {s}
                <button onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: A, display: 'flex', lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...INPUT_STYLE, flex: 1 }}
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder="Skill hinzufügen …"
            />
            <button onClick={addSkill}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: A14, border: `1px solid ${A20}`, borderRadius: 6, cursor: 'pointer', color: A, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div style={{ paddingTop: 8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 24px', background: A, border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', color: '#001219', fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Speichern …' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
