import { useState, useEffect } from 'react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, SURFACE, BORDER, FG, MUTED, A08, A20 } from '../lib/theme.js'
import { Avatar } from '../components/ui.jsx'
import { TEAM, JOB_TYPES } from '../data/seed.js'
import { isoToday, addDays, formatDate } from '../lib/storage.js'
import { Phone, Mail } from 'lucide-react'

// Wochentags-Verfügbarkeit („kann immer mittwochs") — Tabelle user_availability
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function AvailabilityEditor({ teamId, color, availability, onChange }) {
  const row = availability[teamId] || { weekdays: {}, note: '' }
  const [editingNote, setEditingNote] = useState(false)
  const [noteVal, setNoteVal] = useState('')

  function toggleDay(key) {
    const weekdays = { ...(row.weekdays || {}), [key]: !row.weekdays?.[key] }
    onChange(teamId, { weekdays, note: row.note || '' })
  }

  function saveNote() {
    onChange(teamId, { weekdays: row.weekdays || {}, note: noteVal })
    setEditingNote(false)
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
        Verfügbarkeit
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {WEEKDAY_KEYS.map((key, i) => {
          const on = !!row.weekdays?.[key]
          return (
            <button key={key} onClick={() => toggleDay(key)} title={on ? 'verfügbar — klicken zum Entfernen' : 'klicken = verfügbar'}
              style={{
                flex: 1, padding: '3px 0', borderRadius: 5, cursor: 'pointer', fontSize: 10,
                fontFamily: "'Space Mono', monospace", fontWeight: on ? 700 : 400,
                background: on ? `${color}22` : 'transparent',
                border: `1px solid ${on ? color : BORDER}`,
                color: on ? color : MUTED,
              }}>
              {WEEKDAY_SHORT[i]}
            </button>
          )
        })}
      </div>
      {editingNote ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={noteVal} onChange={e => setNoteVal(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') setEditingNote(false) }}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 7px', color: FG, fontSize: 11, outline: 'none', fontFamily: "'Space Grotesk', sans-serif" }} />
          <button onClick={saveNote} style={{ padding: '3px 9px', borderRadius: 5, border: 'none', background: A, color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 10 }}>OK</button>
        </div>
      ) : (
        <div onClick={() => { setNoteVal(row.note || ''); setEditingNote(true) }} title="Klicken zum Bearbeiten"
          style={{ fontSize: 11, color: row.note ? MUTED : `color-mix(in srgb, ${MUTED} 55%, transparent)`, cursor: 'pointer', lineHeight: 1.4 }}>
          {row.note || '+ Notiz (z.B. „ggf. Di/Fr möglich")'}
        </div>
      )}
    </div>
  )
}

const TG_GROUPS = [
  { name: 'LUMA Pflege', members: ['jona', 'anselm', 'malte'], color: '#08AA56', desc: 'Laufende Pflegeeinsätze' },
  { name: 'LUMA Projektmanagement', members: ['malte', 'lukas', 'robert'], color: '#3B82F6', desc: 'Planung & Koordination' },
  { name: 'LUMA Inter', members: ['lukas', 'malte'], color: '#8B5CF6', desc: 'Interne Abstimmung' },
]

export default function TeamPage() {
  const { jobs, projects } = useOps()
  const { profileForTeamId, isMitarbeiter } = useAuth()
  const today = isoToday()
  const next7 = addDays(today, 7)
  const [availability, setAvailability] = useState({})

  useEffect(() => {
    sb.from('user_availability').select('*').then(({ data }) =>
      setAvailability(Object.fromEntries((data || []).map(r => [r.team_id, r]))))
  }, [])

  function saveAvailability(teamId, changes) {
    setAvailability(prev => ({ ...prev, [teamId]: { ...(prev[teamId] || { team_id: teamId }), ...changes } }))
    sb.from('user_availability')
      .upsert({ team_id: teamId, ...changes, updated_at: new Date().toISOString() }, { onConflict: 'team_id' })
      .then(({ error }) => { if (error) console.error('[DB] user_availability', error.message) })
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 24 }}>Team</h1>

      {/* Team grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 32 }}>
        {TEAM.map(u => {
          const myJobs = jobs.filter(j => j.assigned_users.includes(u.id) && j.date >= today && j.date <= next7 && j.status !== 'cancelled')
          const todayJob = myJobs.find(j => j.date === today)
          const prof = profileForTeamId(u.id)  // verknüpftes Login-Profil (Foto, Kontakt)
          return (
            <div key={u.id} style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, borderTop: `3px solid ${u.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar initials={u.initials} color={u.color} size={40} src={prof?.avatar_url || null} title={u.name} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: FG }}>{prof?.name || u.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{u.role}</div>
                </div>
              </div>

              {/* Kontakt aus dem verknüpften Profil */}
              {(prof?.phone || prof?.contact_email || prof?.bio) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  {prof.phone && (
                    <a href={`tel:${prof.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: FG, textDecoration: 'none' }}>
                      <Phone size={11} color={u.color} /> {prof.phone}
                    </a>
                  )}
                  {prof.contact_email && (
                    <a href={`mailto:${prof.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: FG, textDecoration: 'none' }}>
                      <Mail size={11} color={u.color} /> {prof.contact_email}
                    </a>
                  )}
                  {prof.bio && <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{prof.bio}</div>}
                </div>
              )}

              {isMitarbeiter && (
                <AvailabilityEditor teamId={u.id} color={u.color} availability={availability} onChange={saveAvailability} />
              )}

              {todayJob ? (
                <div style={{ padding: '8px 10px', background: `${u.color}14`, border: `1px solid ${u.color}30`, borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: u.color, marginBottom: 2 }}>HEUTE</div>
                  <div style={{ fontSize: 12, color: FG }}>{todayJob.title}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                    {projects.find(p => p.id === todayJob.project_id)?.name}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>Heute kein Einsatz</div>
                </div>
              )}

              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                {myJobs.length} Einsätze nächste 7 Tage
              </div>
            </div>
          )
        })}
      </div>

      {/* Telegram groups */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
        Telegram-Gruppen
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {TG_GROUPS.map(g => (
          <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${g.color}22`, border: `1px solid ${g.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>✈</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: FG, marginBottom: 2 }}>{g.name}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{g.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {g.members.map(id => {
                const u = TEAM.find(t => t.id === id)
                return u ? (
                  <div key={id} title={u.name} style={{ width: 24, height: 24, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                  </div>
                ) : null
              })}
            </div>
            <div style={{ padding: '4px 10px', borderRadius: 4, background: `${g.color}18`, border: `1px solid ${g.color}30`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: g.color }}>
              Verbinden →
            </div>
          </div>
        ))}
      </div>

      {/* Telegram integration note */}
      <div style={{ padding: '16px 20px', background: A08, border: `1px solid ${A20}`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Telegram-Integration</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
          Geplant: Neue Einsätze werden automatisch in die passende Gruppe gepostet — Pflege-Jobs → LUMA Pflege, Projektthemen → LUMA PM. Einsatz-Bestätigung und Status-Updates direkt per Telegram möglich.
        </div>
      </div>
    </div>
  )
}
