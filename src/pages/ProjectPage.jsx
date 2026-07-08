import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, MapPin, Calendar, Clock, Camera, Radio, FileText, Edit3, Save, X, ExternalLink, ListTodo, Plus, Trash2 } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A06, A14, A18 } from '../lib/theme.js'
import { JOB_TYPES, TEAM, TASK_STATUSES, TASK_PRIORITIES } from '../data/seed.js'
import { isoToday, formatDate } from '../lib/storage.js'
import TaskModal from '../components/TaskModal.jsx'

const TASK_S = Object.fromEntries(TASK_STATUSES.map(s => [s.id, s]))
const TASK_P = Object.fromEntries(TASK_PRIORITIES.map(p => [p.id, p]))

const STATUS_COLOR = { planned: '#6EA8C0', in_progress: A, done: '#22EAA7', cancelled: '#6B7280' }
const STATUS_LABEL = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }

function makePin(color) {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
    className: '', iconSize: [14, 14], iconAnchor: [7, 7],
  })
}

function MapFit({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (lat && lng) map.setView([lat, lng], 15) }, [lat, lng])
  return null
}

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

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projects, jobs, sensors, clients, tasks, updateProject, createTask, updateTask, deleteTask, setTaskStatus } = useOps()
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [photos, setPhotos] = useState([])
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')
  const [taskModal, setTaskModal] = useState(null)
  const today = isoToday()
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  const project = projects.find(p => p.id === id)

  useEffect(() => {
    if (!project) return
    setNotesVal(project.notes || '')
    // Load photos for all jobs in this project
    const projectJobIds = jobs.filter(j => j.project_id === id).map(j => j.id)
    if (projectJobIds.length === 0) return
    sb.from('job_photos')
      .select('*')
      .in('job_id', projectJobIds)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPhotos(data || []))
  }, [project, jobs, id])

  if (!project) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>
        <div style={{ marginBottom: 16 }}>Projekt nicht gefunden.</div>
        <button onClick={() => navigate('/map')} style={{ color: A, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Zurück zur Karte</button>
      </div>
    )
  }

  const projectJobs = jobs.filter(j => j.project_id === id).sort((a, b) => b.date.localeCompare(a.date))
  const projectSensors = sensors.filter(s => s.project_id === id)
  const projectTasks = (tasks || []).filter(t => t.project_id === id)
  const openTasks = projectTasks.filter(t => t.status !== 'done' && t.status !== 'archive')
  const doneJobs = projectJobs.filter(j => j.status === 'done')
  const upcomingJobs = projectJobs.filter(j => j.date >= today && j.status !== 'cancelled' && j.status !== 'done')
  const lastVisit = doneJobs[0]?.date
  const allWorkers = new Set(projectJobs.flatMap(j => j.assigned_users || []))

  async function saveNotes() {
    await updateProject(id, { notes: notesVal })
    setEditingNotes(false)
  }

  const TABS = [
    { id: 'overview', label: 'Übersicht', icon: MapPin },
    { id: 'tasks', label: `Aufgaben (${projectTasks.length})`, icon: ListTodo },
    { id: 'jobs', label: `Einsätze (${projectJobs.length})`, icon: Calendar },
    { id: 'photos', label: `Fotos (${photos.length})`, icon: Camera },
    { id: 'sensors', label: `Sensoren (${projectSensors.length})`, icon: Radio },
  ]

  const clientOfProject = clients?.find(c => c.id === project.client_id) || clients?.find(c => c.name === project.client)

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '16px 24px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
          <ArrowLeft size={14} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 6 }}>{project.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {project.client && (() => {
                const clientObj = clients?.find(c => c.id === project.client_id) || clients?.find(c => c.name === project.client)
                const dest = clientObj ? `/clients/${clientObj.id}` : null
                return dest ? (
                  <button onClick={() => navigate(dest)}
                    style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, background: A06, border: `1px solid ${A}30`, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${A}40` }}>
                    {project.client}
                  </button>
                ) : (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, background: A06, border: `1px solid ${A}30`, padding: '3px 10px', borderRadius: 20 }}>{project.client}</span>
                )
              })()}
              {project.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: MUTED }}>
                  <MapPin size={12} /> {project.location}
                </span>
              )}
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: project.status === 'active' ? '#22EAA7' : MUTED, background: project.status === 'active' ? '#22EAA718' : A06, border: `1px solid ${project.status === 'active' ? '#22EAA740' : BORDER}`, padding: '2px 8px', borderRadius: 20 }}>
                {project.status || 'aktiv'}
              </span>
            </div>
          </div>
          <button onClick={() => navigate('/map', { state: { focusProjectId: id } })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>
            <ExternalLink size={13} /> Auf Karte zeigen
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard icon={ListTodo} label="Offene Aufgaben" value={openTasks.length} color={openTasks.length > 0 ? A : undefined} />
          <StatCard icon={Calendar} label="Einsätze gesamt" value={projectJobs.length} />
          <StatCard icon={Clock} label="Davon erledigt" value={doneJobs.length} color="#22EAA7" />
          <StatCard icon={Radio} label="Aktive Sensoren" value={projectSensors.length} />
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
            {/* Mini map */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}`, height: 280 }}>
              {project.lat && project.lng ? (
                <MapContainer center={[project.lat, project.lng]} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false}>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                  {project.geojson && <GeoJSON data={project.geojson} style={{ color: A, weight: 2.5, fillColor: A, fillOpacity: 0.15 }} />}
                  <Marker position={[project.lat, project.lng]} icon={makePin(A)} />
                  <MapFit lat={project.lat} lng={project.lng} />
                </MapContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: A06, color: MUTED, flexDirection: 'column', gap: 8 }}>
                  <MapPin size={24} />
                  <span style={{ fontSize: 12 }}>Keine Koordinaten</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info */}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Projektinfo</div>
                {lastVisit && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>Letzter Besuch</span>
                    <span style={{ color: FG }}>{new Date(lastVisit + 'T00:00:00').toLocaleDateString('de-DE')}</span>
                  </div>
                )}
                {project.lat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>Koordinaten</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: FG }}>{project.lat.toFixed(4)}, {project.lng.toFixed(4)}</span>
                  </div>
                )}
                {project.geojson && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: MUTED }}>Fläche</span>
                    <span style={{ color: '#22EAA7', fontSize: 11, fontFamily: "'Space Mono', monospace" }}>● kartiert</span>
                  </div>
                )}
              </div>

              {/* Team */}
              {allWorkers.size > 0 && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Team</div>
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

              {/* Pflanzplan */}
              {project.plant_plan?.length > 0 && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pflanzplan</div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A }}>{project.plant_plan.reduce((s, p) => s + p.count, 0)} Pflanzen · {project.plant_plan.length} Arten</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {project.plant_plan.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{ color: FG }}>{p.name}</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A }}>×{p.count}</span>
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
                      style={{ width: '100%', background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 10px', color: FG, fontSize: 13, resize: 'vertical', minHeight: 80, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                      <button onClick={() => { setEditingNotes(false); setNotesVal(project.notes || '') }}
                        style={{ padding: '5px 12px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12 }}><X size={12} /></button>
                      <button onClick={saveNotes}
                        style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: A, color: '#001219', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Save size={12} /> Speichern</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: project.notes ? FG : MUTED, lineHeight: 1.6 }}>
                    {project.notes || 'Keine Notizen. Klicke auf Bearbeiten um Notizen hinzuzufügen.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Aufgaben */}
        {tab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>{openTasks.length} offen · {projectTasks.length} gesamt</div>
              <button onClick={() => setTaskModal({ defaults: { project_id: id, client_id: clientOfProject?.id || '' } })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <Plus size={14} /> Aufgabe
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projectTasks.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>Noch keine Aufgaben für dieses Projekt.</div>
              )}
              {projectTasks
                .sort((a, b) => (a.status === 'done' || a.status === 'archive' ? 1 : 0) - (b.status === 'done' || b.status === 'archive' ? 1 : 0))
                .map(t => {
                  const st = TASK_S[t.status]
                  const prio = TASK_P[t.priority]
                  const done = t.status === 'done' || t.status === 'archive'
                  const workerIds = [...new Set([t.owner_id, ...(t.assigned_users || [])].filter(Boolean))]
                  const workers = workerIds.map(uid => TEAM.find(x => x.id === uid)).filter(Boolean)
                  const overdue = t.due_date && !done && t.due_date < today
                  const zr = t.start_date && t.due_date && t.start_date !== t.due_date
                    ? `${formatDate(t.start_date)} – ${formatDate(t.due_date)}`
                    : t.due_date ? `fällig ${formatDate(t.due_date)}` : t.start_date ? `ab ${formatDate(t.start_date)}` : null
                  return (
                    <div key={t.id} onClick={() => setTaskModal({ task: t })}
                      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: done ? MUTED : FG, textDecoration: t.status === 'archive' ? 'line-through' : 'none', marginBottom: 3 }}>{t.title}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); const order = TASK_STATUSES.map(s => s.id); setTaskStatus(t.id, order[(order.indexOf(t.status) + 1) % order.length]) }}
                            style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: st?.color, background: st?.color + '18', border: `1px solid ${st?.color}40`, padding: '1px 7px', borderRadius: 10, cursor: 'pointer' }}>{st?.label}</button>
                          {zr && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: overdue ? '#ef4444' : MUTED }}>{zr}{overdue ? ' · überfällig' : ''}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {workers.map(w => (
                          <div key={w.id} style={{ width: 24, height: 24, borderRadius: '50%', background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{w.initials}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteTask(t.id) }}
                        style={{ width: 28, height: 28, borderRadius: 5, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Tab: Einsätze */}
        {tab === 'jobs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {projectJobs.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>Noch keine Einsätze für dieses Projekt.</div>
            )}
            {projectJobs.map(job => {
              const type = JOB_TYPES.find(t => t.id === job.job_type)
              const workers = (job.assigned_users || []).map(uid => TEAM.find(t => t.id === uid)).filter(Boolean)
              const isUpcoming = job.date >= today
              return (
                <div key={job.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${type?.color || A}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ minWidth: 64, textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{new Date(job.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                    <div style={{ fontSize: 16, fontWeight: 400, color: isUpcoming ? A : FG }}>{new Date(job.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FG, marginBottom: 2 }}>{job.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {type && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type.color }}>{type.label}</span>}
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: STATUS_COLOR[job.status], background: STATUS_COLOR[job.status] + '18', padding: '1px 6px', borderRadius: 10 }}>{STATUS_LABEL[job.status]}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {workers.map(w => (
                      <div key={w.id} style={{ width: 24, height: 24, borderRadius: '50%', background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{w.initials}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab: Fotos */}
        {tab === 'photos' && (
          <div>
            {photos.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>
                <Camera size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div>Noch keine Fotos. Fotos werden beim Erstellen von Einsätzen hochgeladen.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {photos.map(p => (
                  <div key={p.id} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}`, aspectRatio: '1', background: A06 }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Sensoren */}
        {tab === 'sensors' && (
          <div>
            {projectSensors.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>
                <Radio size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div>Keine Sensoren für dieses Projekt konfiguriert.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {projectSensors.map(s => {
                  const pct = s.threshold_high > 0 ? Math.min((s.value / s.threshold_high) * 100, 100) : 50
                  const statusColor = s.status === 'critical' ? '#ef4444' : s.status === 'warning' ? '#F59E0B' : '#22EAA7'
                  return (
                    <div key={s.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: FG }}>{s.name}</div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, marginTop: 4 }} />
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 300, color: statusColor, letterSpacing: '-0.03em', marginBottom: 8 }}>
                        {s.value}<span style={{ fontSize: 14, color: MUTED, marginLeft: 3 }}>{s.unit}</span>
                      </div>
                      <div style={{ background: A06, borderRadius: 4, height: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: statusColor, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 6 }}>{s.type} · {s.last_updated ? new Date(s.last_updated).toLocaleDateString('de-DE') : 'kein Update'}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {taskModal && (
        <TaskModal
          initialTask={taskModal.task}
          defaults={taskModal.defaults}
          onSave={data => {
            if (taskModal.task) updateTask(taskModal.task.id, data)
            else createTask(data)
            setTaskModal(null)
          }}
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  )
}
