import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, A08, A20 } from '../lib/theme.js'
import { TEAM, JOB_TYPES } from '../data/seed.js'
import { isoToday, addDays, formatDate } from '../lib/storage.js'

const TG_GROUPS = [
  { name: 'LUMA Pflege', members: ['jona', 'anselm', 'malte'], color: '#08AA56', desc: 'Laufende Pflegeeinsätze' },
  { name: 'LUMA Projektmanagement', members: ['malte', 'lukas', 'robert'], color: '#3B82F6', desc: 'Planung & Koordination' },
  { name: 'LUMA Inter', members: ['lukas', 'malte'], color: '#8B5CF6', desc: 'Interne Abstimmung' },
]

export default function TeamPage() {
  const { jobs, projects } = useOps()
  const today = isoToday()
  const next7 = addDays(today, 7)

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 24 }}>Team</h1>

      {/* Team grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 32 }}>
        {TEAM.map(u => {
          const myJobs = jobs.filter(j => j.assigned_users.includes(u.id) && j.date >= today && j.date <= next7 && j.status !== 'cancelled')
          const todayJob = myJobs.find(j => j.date === today)
          return (
            <div key={u.id} style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, borderTop: `3px solid ${u.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: FG }}>{u.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{u.role}</div>
                </div>
              </div>

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
