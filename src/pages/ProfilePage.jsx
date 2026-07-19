// Mein Profil: Avatar-Foto, Anzeigename & Kontaktdaten (fürs Team sichtbar)
// plus Konto-Sicherheit (Login-E-Mail & Passwort über Supabase Auth).
import { useState, useRef } from 'react'
import { Camera, Loader, Save, KeyRound, Mail, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { compressImage } from '../lib/images.js'
import { A, SURFACE, BORDER, FG, MUTED, OK, DANGER } from '../lib/theme.js'
import { PageHeader, Card, Button, Badge, Avatar, INPUT_STYLE, LABEL_STYLE, MONO, SANS } from '../components/ui.jsx'
import NotificationSettings from '../components/NotificationSettings.jsx'
import { TEAM } from '../data/seed.js'
import { useIsMobile } from '../lib/useIsMobile.js'

const ROLE_LABELS = { admin: 'Admin', mitarbeiter: 'Mitarbeiter', kunde_viewer: 'Kunde' }

function Feedback({ state }) {
  if (!state) return null
  return (
    <div className="lu-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: state.ok ? OK : DANGER, marginTop: 8 }}>
      {state.ok && <Check size={13} />}{state.msg}
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, displayName, updateProfile, changePassword, changeEmail } = useAuth()
  const isMobile = useIsMobile()
  const fileRef = useRef()

  const [form, setForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    contact_email: profile?.contact_email || '',
    bio: profile?.bio || '',
    team_id: profile?.team_id || '',
  })
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState(null)

  const teamMember = TEAM.find(t => t.id === form.team_id)
  const initials = (form.name || displayName || '?').slice(0, 2).toUpperCase()

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true); setProfileMsg(null)
    const res = await updateProfile({
      name: form.name.trim() || null,
      phone: form.phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      bio: form.bio.trim() || null,
      team_id: form.team_id || null,
    })
    setSaving(false)
    setProfileMsg(res.ok ? { ok: true, msg: 'Profil gespeichert' } : { ok: false, msg: res.error })
  }

  async function handleAvatar(file) {
    if (!file || !user) return
    setUploading(true); setProfileMsg(null)
    try {
      let blob
      try { blob = await compressImage(file, 512, 0.85) } catch { blob = file }
      const path = `avatars/${user.id}.jpg`
      const { error } = await sb.storage.from('job-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = sb.storage.from('job-photos').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`  // Cache-Buster: gleicher Pfad, neues Bild
      const res = await updateProfile({ avatar_url: url })
      setProfileMsg(res.ok ? { ok: true, msg: 'Foto aktualisiert' } : { ok: false, msg: res.error })
    } catch (err) {
      setProfileMsg({ ok: false, msg: `Upload fehlgeschlagen: ${err.message || err}` })
    }
    setUploading(false)
  }

  async function submitEmail(e) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailMsg(null)
    const res = await changeEmail(newEmail.trim())
    setEmailMsg(res.ok
      ? { ok: true, msg: `Bestätigungslink an ${newEmail.trim()} gesendet — die Änderung gilt nach Bestätigung.` }
      : { ok: false, msg: res.error })
    if (res.ok) setNewEmail('')
  }

  async function submitPassword(e) {
    e.preventDefault()
    if (pw1.length < 8) { setPwMsg({ ok: false, msg: 'Mindestens 8 Zeichen' }); return }
    if (pw1 !== pw2) { setPwMsg({ ok: false, msg: 'Passwörter stimmen nicht überein' }); return }
    const res = await changePassword(pw1)
    setPwMsg(res.ok ? { ok: true, msg: 'Passwort geändert' } : { ok: false, msg: res.error })
    if (res.ok) { setPw1(''); setPw2('') }
  }

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 760, margin: '0 auto' }}>
      <PageHeader eyebrow="Mein Account" title="Profil" isMobile={isMobile} />

      {/* ── Profil & Kontakt ── */}
      <Card padding={isMobile ? '18px 16px' : '22px 24px'} style={{ marginBottom: 16 }}>
        <form onSubmit={saveProfile}>
          {/* Avatar + Identität */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => fileRef.current?.click()} title="Foto ändern" className="lu-tip" data-tip="Foto ändern"
              style={{ position: 'relative', border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: '50%' }}>
              <Avatar initials={initials} color={teamMember?.color || A} size={72} src={profile?.avatar_url || null} />
              <span style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${SURFACE}` }}>
                {uploading ? <Loader size={13} color="var(--luma-on-a)" style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} color="var(--luma-on-a)" />}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatar(e.target.files?.[0])} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: FG }}>{form.name || displayName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Badge color={A}>{ROLE_LABELS[profile?.rolle] || profile?.rolle || '—'}</Badge>
                <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{user?.email}</span>
              </div>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Anzeigename</label>
              <input style={INPUT_STYLE} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Malte" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Team-Mitglied</label>
              <select style={INPUT_STYLE} value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
                <option value="">— nicht verknüpft —</option>
                {TEAM.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 4 }}>Verknüpft dein Konto mit Zuweisungen & Avataren in der App</div>
            </div>
            <div>
              <label style={LABEL_STYLE}>Telefon</label>
              <input style={INPUT_STYLE} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+49 …" autoComplete="tel" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Kontakt-E-Mail <span style={{ textTransform: 'none', letterSpacing: 0 }}>(fürs Team)</span></label>
              <input style={INPUT_STYLE} type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder={user?.email || ''} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>Über mich / Notiz</label>
              <textarea style={{ ...INPUT_STYLE, minHeight: 64, resize: 'vertical' }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="z.B. Schwerpunkt Baumpflege, erreichbar Mo–Do" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Button type="submit" icon={Save} disabled={saving}>{saving ? 'Speichert…' : 'Profil speichern'}</Button>
            <Feedback state={profileMsg} />
          </div>
        </form>
      </Card>

      {/* ── Benachrichtigungen ── */}
      <NotificationSettings />

      {/* ── Konto-Sicherheit ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        <Card padding="20px 22px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Mail size={15} color={A} />
            <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>Login-E-Mail ändern</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginBottom: 12 }}>Aktuell: {user?.email}</div>
          <form onSubmit={submitEmail}>
            <input style={INPUT_STYLE} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="neue@adresse.de" required />
            <Button type="submit" variant="ghost" style={{ marginTop: 10 }}>Bestätigungslink senden</Button>
            <Feedback state={emailMsg} />
          </form>
        </Card>

        <Card padding="20px 22px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <KeyRound size={15} color={A} />
            <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>Passwort ändern</div>
          </div>
          <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input style={INPUT_STYLE} type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Neues Passwort (min. 8 Zeichen)" autoComplete="new-password" required />
            <input style={INPUT_STYLE} type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Neues Passwort wiederholen" autoComplete="new-password" required />
            <div>
              <Button type="submit" variant="ghost">Passwort ändern</Button>
              <Feedback state={pwMsg} />
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
