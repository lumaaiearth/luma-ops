import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Clock, Radio, Edit3, Save, X, Building2, Phone, Mail, User, ExternalLink } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sbUpdate } from '../lib/supabase.js'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A06, A14 } from '../lib/theme.js'
import { TEAM } from '../data/seed.js'
import { isoToday } from '../lib/storage.js'

const STATUS_COLOR = { planned: '#6EA8C0', in_progress: A, done: '#22EAA7', cancelled: '#6B7280' }
const STATUS_LABEL = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: A06, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color || A} />
      </div>
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 300, color: color || FG, letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </div>
  )
}

export default function ClientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { clients, projects, jobs, sensors, updateClient } = useOps()
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')
  const today = isoToday()
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  const client = clients.find(c => c.id === id)

  useEffect(() => {
    if (client) setNotesVal(client.notes || '')
  }, [client])

  if (!client) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>
        <div style={{ marginBottom: 16 }}>Kunde nicht gefunden.</div>
        <button onClick={() => navigate('/data')} style={{ color: A, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Zurück zu Stammdaten</button>
      </div>
    )
  }

  const clientProjects = projects.filter(p => p.client_id === id)
  const clientJobs = jobs.filter(j => clientProjects.some(p => p.id === j.project_id))
  const clientSensors = sensors.filter(s => clientProjects.some(p => p.id === s.project_id))
  const doneJobs = clientJobs.filter(j => j.status === 'done')
  const upcomingJobs = clientJobs.filter(j => j.date >= today && j.status !== 'cancelled' && j.status !== 'done')
  const allWorkers = new Set(clientJobs.flatMap(j => j.assigned_users || []))
  const clientColor = client.color || A

  async function saveNotes() {
    setNotesVal(notesVal)
    await updateClient(id, { notes: notesVal })
    setEditingNotes(false)
  }

  const TABS = [
    { id: 'overview', label: 'Übersicht', icon: Building2 },
    { id: 'projects', label: `Projekte (${clientProjects.length})`, icon: MapPin },
    { id: 'jobs', label: `Einsätze (${clientJobs.length})`, icon: Calendar },
    { id: 'sensors', label: `Sensoren (${clientSensors.length})`, icon: Radio },
  ]

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '16px 24px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
          <ArrowLeft size={14} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Color avatar */}
            <div style={{ width: 48, height: 48, borderRadius: 10, background: `${clientColor}22`, border: `2px solid ${clientColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={22} color={clientColor} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 6 }}>{client.name}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: clientColor, background: `${clientColor}18`, border: `1px solid ${clientColor}30`, padding: '3px 10px', borderRadius: 20 }}>
                  Kunde
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>
                  {clientProjects.length} Projekt{clientProjects.length !== 1 ? 'e' : ''}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/data', { state: { tab: 'clients' } })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>
            <ExternalLink size={13} /> In Stammdaten
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard icon={MapPin} label="Projekte" value={clientProjects.length} color={clientColor} />
          <StatCard icon={Calendar} label="Einsätze gesamt" value={clientJobs.length} />
          <StatCard icon={Clock} label="Davon erledigt" value={doneJobs.length} color="#22EAA7" />
          <StatCard icon={Calendar} label="Ausstehend" value={upcomingJobs.length} color={A} />
          <StatCard icon={Radio} label="Sensoren" value={clientSensors.length} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: SURFACE, borderRadius: 8, padding: 4, border: `1px solid ${BORDER}`, marginBottom: 24, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 0 auto', padding: '8px 14px', borderRadius: 6, border: 'none', background: tab === t.id ? A : 'transparent', color: tab === t.id ? '#001219' : MUTED, cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 500 : 400, whiteSpace: 'nowrap', fontFamily: "'Space Grotesk', sans-serif" }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Übersicht */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            {/* Kontakt */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Kontakt</div>
                {[
                  { icon: User, label: 'Ansprechpartner', value: client.contact_name },
                  { icon: Mail, label: 'E-Mail', value: client.contact_email },
                  { icon: Phone, label: 'Telefon', value: client.contact_phone },
                  { icon: MapPin, label: 'Adresse', value: client.address },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, fontSize: 13 }}>
                    <Icon size={14} color={MUTED} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.08em' }}>{label}</div>
                      {label === 'E-Mail' ? (
                        <a href={`mailto:${value}`} style={{ color: A, textDecoration: 'none' }}>{value}</a>
                      ) : label === 'Telefon' ? (
                        <a href={`tel:${value}`} style={{ color: A, textDecoration: 'none' }}>{value}</a>
                      ) : (
                        <span style={{ color: FG }}>{value}</span>
                      )}
                    </div>
                  </div>
                ) : null)}
                {!client.contact_name && !client.contact_email && !client.contact_phone && !client.address && (
                  <div style={{ color: MUTED, fontSize: 13 }}>Keine Kontaktdaten hinterlegt.</div>
                )}
              </div>

              {/* Team */}
              {allWorkers.size > 0 && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Eingesetztes Team</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[...allWorkers].map(uid => {
                      const u = TEAM.find(t => t.id === uid)
                      if (!u) return null
                      return (
                        <button key={uid} onClick={() => navigate('/team', { state: { focusUser: uid } })}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: `${u.color}18`, border: `1px solid ${u.color}40`, cursor: 'pointer' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                          </div>
                          <span style={{ fontSize: 13, color: u.color }}>{u.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Letzte Projekte */}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Projekte</div>
                {clientProjects.length === 0 ? (
                  <div style={{ color: MUTED, fontSize: 13 }}>Keine Projekte zugeordnet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {clientProjects.slice(0, 5).map(p => {
                      const pJobs = jobs.filter(j => j.project_id === p.id)
                      const pDone = pJobs.filter(j => j.status === 'done').length
                      return (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 6, background: A06, border: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = `${A}55`}
                          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                          <div>
                            <div style={{ fontSize: 13, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</div>
                            {p.location && <div style={{ fontSize: 11, color: MUTED, fontFamily: "'Space Mono', monospace" }}>{p.location}</div>}
                          </div>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, flexShrink: 0 }}>{pJobs.length} Einsätze</span>
                        </button>
                      )
                    })}
                    {clientProjects.length > 5 && (
                      <button onClick={() => setTab('projects')} style={{ fontSize: 12, color: A, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
                        + {clientProjects.length - 5} weitere anzeigen
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Letzte Einsätze */}
              {clientJobs.length > 0 && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Letzte Einsätze</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[...clientJobs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(j => (
                      <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                        <div>
                          <span style={{ color: FG }}>{j.title}</span>
                          <span style={{ color: MUTED, fontSize: 11, marginLeft: 8, fontFamily: "'Space Mono', monospace" }}>
                            {clientProjects.find(p => p.id === j.project_id)?.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{new Date(j.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: STATUS_COLOR[j.status], background: `${STATUS_COLOR[j.status]}18`, padding: '2px 6px', borderRadius: 10 }}>{STATUS_LABEL[j.status]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Notizen</div>
                  {isAdmin && !editingNotes && (
                    <button onClick={() => setEditingNotes(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 2 }}><Edit3 size={13} /></button>
                  )}
                </div>
                {editingNotes ? (
                  <div>
                    <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)}
                      style={{ width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 10px', color: FG, fontSize: 13, resize: 'vertical', minHeight: 80, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                      <button onClick={() => { setEditingNotes(false); setNotesVal(client.notes || '') }}
                        style={{ padding: '5px 12px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12 }}><X size={12} /></button>
                      <button onClick={saveNotes}
                        style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: A, color: '#001219', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Save size={12} /> Speichern</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: notesVal ? FG : MUTED, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {notesVal || 'Keine Notizen.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Projekte */}
        {tab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clientProjects.length === 0 && (
              <div style={{ color: MUTED, fontSize: 13, padding: 20, textAlign: 'center' }}>Keine Projekte zugeordnet.</div>
            )}
            {clientProjects.map(p => {
              const pJobs = jobs.filter(j => j.project_id === p.id)
              const pDone = pJobs.filter(j => j.status === 'done').length
              const pSensors = sensors.filter(s => s.project_id === p.id)
              return (
                <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left', gap: 16 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${A}55`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'active' ? '#22EAA7' : MUTED, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</div>
                      {p.location && <div style={{ fontSize: 11, color: MUTED, fontFamily: "'Space Mono', monospace", marginTop: 2 }}><MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />{p.location}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                    <span style={{ color: MUTED }}>{pJobs.length} Einsätze</span>
                    <span style={{ color: '#22EAA7' }}>{pDone} erledigt</span>
                    {pSensors.length > 0 && <span style={{ color: A }}>{pSensors.length} Sensoren</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Tab: Einsätze */}
        {tab === 'jobs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clientJobs.length === 0 && (
              <div style={{ color: MUTED, fontSize: 13, padding: 20, textAlign: 'center' }}>Keine Einsätze vorhanden.</div>
            )}
            {[...clientJobs].sort((a, b) => b.date.localeCompare(a.date)).map(j => {
              const proj = clientProjects.find(p => p.id === j.project_id)
              return (
                <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[j.status], flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: FG, fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                      {proj && (
                        <button onClick={() => navigate(`/projects/${proj.id}`)}
                          style={{ fontSize: 11, color: A, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Space Mono', monospace" }}>
                          {proj.name}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                    <span style={{ color: MUTED }}>{new Date(j.date + 'T00:00:00').toLocaleDateString('de-DE')}</span>
                    <span style={{ color: STATUS_COLOR[j.status], background: `${STATUS_COLOR[j.status]}18`, padding: '2px 8px', borderRadius: 10 }}>{STATUS_LABEL[j.status]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab: Sensoren */}
        {tab === 'sensors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clientSensors.length === 0 && (
              <div style={{ color: MUTED, fontSize: 13, padding: 20, textAlign: 'center' }}>Keine Sensoren an Projekten dieses Kunden.</div>
            )}
            {clientSensors.map(s => {
              const proj = clientProjects.find(p => p.id === s.project_id)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Radio size={16} color={A} />
                    <div>
                      <div style={{ fontSize: 13, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>{s.name || s.id}</div>
                      {proj && (
                        <button onClick={() => navigate(`/projects/${proj.id}`)}
                          style={{ fontSize: 11, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Space Mono', monospace" }}>
                          {proj.name}
                        </button>
                      )}
                    </div>
                  </div>
                  {s.value != null && (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: A }}>{s.value}{s.unit || ''}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
