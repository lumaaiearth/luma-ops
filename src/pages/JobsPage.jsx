import { useState } from 'react'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
import { JOB_TYPES, TEAM, VEHICLES } from '../data/seed.js'
import { formatDate, isoToday } from '../lib/storage.js'
import JobModal from '../components/JobModal.jsx'
import { Plus, Repeat, Trash2, CheckCircle2, Circle, ChevronDown } from 'lucide-react'

const STATUS_COLORS = { planned: '#6EA8C0', in_progress: A, done: '#22EAA7', cancelled: '#6B7280' }
const STATUS_LABELS = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }
const DURATION_LABEL = { full: 'Ganztags', half_am: 'VM', half_pm: 'NM' }

export default function JobsPage() {
  const { jobs, recurring, projects, createJob, updateJob, deleteJob, setJobStatus, createRecurring, deleteRecurring } = useOps()
  const [modal, setModal] = useState(null)
  const [editJob, setEditJob] = useState(null)
  const [tab, setTab] = useState('jobs') // 'jobs' | 'recurring'
  const [filter, setFilter] = useState('all') // 'all' | 'planned' | 'in_progress' | 'done'
  const today = isoToday()

  function handleSave(result) {
    if (result.type === 'job') {
      if (editJob) updateJob(editJob.id, result.data)
      else createJob(result.data)
    } else {
      createRecurring(result.data)
    }
    setModal(null)
    setEditJob(null)
  }

  const filteredJobs = jobs
    .filter(j => filter === 'all' || j.status === filter)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em' }}>Einsätze</h1>
        <button
          onClick={() => { setEditJob(null); setModal({ date: today }) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <Plus size={14} /> Neuer Einsatz
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        {[['jobs', 'Einsätze'], ['recurring', 'Wiederkehrend']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: tab === id ? A : MUTED, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, cursor: 'pointer', borderBottom: `2px solid ${tab === id ? A : 'transparent'}`, marginBottom: -1 }}>
            {label} {id === 'jobs' ? `(${jobs.length})` : `(${recurring.length})`}
          </button>
        ))}
      </div>

      {tab === 'jobs' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all', 'planned', 'in_progress', 'done', 'cancelled'].map(f => {
              const labels = { all: 'Alle', planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }
              return (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f ? (STATUS_COLORS[f] || A) : BORDER}`, background: filter === f ? `${STATUS_COLORS[f] || A}18` : 'transparent', color: filter === f ? (STATUS_COLORS[f] || A) : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {labels[f]}
                </button>
              )
            })}
          </div>

          {/* Jobs table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredJobs.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Keine Einsätze</div>
            )}
            {filteredJobs.map(job => {
              const type = JOB_TYPES.find(t => t.id === job.job_type)
              const project = projects.find(p => p.id === job.project_id)
              const assignees = TEAM.filter(t => (job.assigned_users || []).includes(t.id))
              const vehicle = VEHICLES.find(v => v.id === job.vehicle_id)
              const isToday = job.date === today
              return (
                <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, borderLeft: `3px solid ${type?.color || A}` }}>
                  {/* Status toggle */}
                  <button
                    onClick={() => setJobStatus(job.id, job.status === 'done' ? 'planned' : job.status === 'planned' ? 'in_progress' : 'done')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: STATUS_COLORS[job.status], flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {job.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>

                  {/* Date */}
                  <div style={{ minWidth: 72, fontFamily: "'Space Mono', monospace", fontSize: 11, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>
                    {isToday ? 'Heute' : formatDate(job.date)}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: job.status === 'done' ? MUTED : FG, textDecoration: job.status === 'done' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      {project && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color }}>{project.name}</span>}
                      {vehicle && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>· {vehicle.name}</span>}
                      {job.duration && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>· {DURATION_LABEL[job.duration]}</span>}
                    </div>
                  </div>

                  {/* Assignees */}
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {assignees.map(u => (
                      <div key={u.id} title={u.name} style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status badge */}
                  <div style={{ padding: '3px 8px', borderRadius: 4, background: `${STATUS_COLORS[job.status]}18`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: STATUS_COLORS[job.status], flexShrink: 0 }}>
                    {STATUS_LABELS[job.status]}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { setEditJob(job); setModal({ job }) }} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✎</button>
                    <button onClick={() => deleteJob(job.id)} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'recurring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recurring.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Keine Vorlagen</div>
          )}
          {recurring.map(r => {
            const type = JOB_TYPES.find(t => t.id === r.job_type)
            const project = projects.find(p => p.id === r.project_id)
            const assignees = TEAM.filter(t => (r.assigned_users || []).includes(t.id))
            const today2 = isoToday()
            const daysUntil = Math.ceil((new Date(r.next_date + 'T00:00:00') - new Date(today2 + 'T00:00:00')) / 86400000)
            return (
              <div key={r.id} style={{ padding: '16px 18px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, borderLeft: `3px solid ${type?.color || A}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Repeat size={13} color={type?.color || A} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: FG }}>{r.title}</span>
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color, marginBottom: 4 }}>{project?.name} · alle {r.interval_days} Tage</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: daysUntil < 0 ? '#ef4444' : daysUntil === 0 ? A : MUTED }}>
                      Nächster: {formatDate(r.next_date)} {daysUntil < 0 ? `(${Math.abs(daysUntil)}d überfällig)` : daysUntil === 0 ? '(heute)' : `(in ${daysUntil}d)`}
                    </div>
                  </div>
                  <button onClick={() => deleteRecurring(r.id)} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {assignees.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: `${u.color}18`, border: `1px solid ${u.color}30` }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                      </div>
                      <span style={{ fontSize: 11, color: u.color }}>{u.name}</span>
                    </div>
                  ))}
                  {(r.tools || []).length > 0 && (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>· {(r.tools || []).join(', ')}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <JobModal
          initialDate={modal.date}
          initialJob={editJob}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditJob(null) }}
        />
      )}
    </div>
  )
}
