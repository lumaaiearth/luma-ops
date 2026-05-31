import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useGCal } from '../context/GCalContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, A0a, A0d, A14, A40 } from '../lib/theme.js'
import JobModal from '../components/JobModal.jsx'
import { JOB_TYPES, TEAM, VEHICLES } from '../data/seed.js'
import { isoToday, weekStart, getWeekDays, addDays, formatDate } from '../lib/storage.js'

const STATUS_DOT = { planned: '#6EA8C0', in_progress: A, done: '#22EAA7', cancelled: '#6B7280' }
const DURATION_LABEL = { full: 'Ganztags', half_am: '07–12', half_pm: '12–17' }
const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function JobCard({ job, projects, onClick, onDragStart, onDragEnd }) {
  const type = JOB_TYPES.find(t => t.id === job.job_type)
  const project = projects.find(p => p.id === job.project_id)
  const assignees = TEAM.filter(t => (job.assigned_users || []).includes(t.id))
  const vehicle = VEHICLES.find(v => v.id === job.vehicle_id)

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={e => { e.stopPropagation(); onDragStart(e, job) }}
      onDragEnd={onDragEnd}
      style={{
        background: `${type?.color || A}14`,
        border: `1px solid ${type?.color || A}30`,
        borderLeft: `3px solid ${type?.color || A}`,
        borderRadius: 4,
        padding: '8px 10px',
        cursor: 'grab',
        transition: 'background 0.15s, opacity 0.15s',
        marginBottom: 3,
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${type?.color || A}22`}
      onMouseLeave={e => e.currentTarget.style.background = `${type?.color || A}14`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 3 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: FG, lineHeight: 1.3, flex: 1 }}>{job.title}</div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[job.status], flexShrink: 0, marginTop: 3 }} />
      </div>
      {project && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color }}>{project.name}</span>
          {job.date_end && job.date_end > job.date && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>
              bis {new Date(job.date_end + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {assignees.map(u => (
            <div key={u.id} style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>
          {vehicle ? vehicle.name : ''}{vehicle && job.duration ? ' · ' : ''}{DURATION_LABEL[job.duration] || ''}
        </div>
      </div>
    </div>
  )
}

function GCalEventCard({ event, onClick }) {
  return (
    <div
      onClick={onClick}
      title="Google Kalender — klicken um Einsatz zu erstellen"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px dashed rgba(255,255,255,0.18)`,
        borderLeft: '3px dashed rgba(255,255,255,0.25)',
        borderRadius: 4,
        padding: '6px 10px',
        cursor: 'pointer',
        marginBottom: 3,
        opacity: 0.8,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = 1}
      onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <CalendarDays size={10} color={MUTED} />
        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
      </div>
      {event.date_end && event.date_end > event.date && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>
          bis {new Date(event.date_end + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
        </div>
      )}
    </div>
  )
}

function gcalEventToJob(ev) {
  return {
    title: ev.title,
    date: ev.date,
    date_end: ev.date_end && ev.date_end > ev.date ? ev.date_end : null,
    notes: ev.description || '',
    job_type: 'sonstiges',
    project_id: '',
    assigned_users: [],
    vehicle_id: '',
    tools: [],
    status: 'planned',
    duration: 'full',
  }
}

export default function CalendarPage() {
  const { jobs, projects, createJob, updateJob, deleteJob, createRecurring } = useOps()
  const { connected: gcalConnected, events: gcalEvents, fetchForRange, syncing: gcalSyncing } = useGCal()
  const today = isoToday()
  const [currentWeek, setCurrentWeek] = useState(() => weekStart(today))
  const [modal, setModal] = useState(null) // { date?, job? }
  const [selectedJob, setSelectedJob] = useState(null)
  const [view, setView] = useState('week') // 'week' | 'month'
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const weekDays = getWeekDays(currentWeek)
  // Fetch GCal events when range changes
  useEffect(() => {
    if (!gcalConnected) return
    if (view === 'week') {
      const from = new Date(weekDays[0] + 'T00:00:00')
      const to = new Date(addDays(weekDays[6], 1) + 'T00:00:00')
      fetchForRange(from, to)
    } else {
      const [y, m] = currentMonth.split('-').map(Number)
      fetchForRange(new Date(y, m - 1, 1), new Date(y, m, 1))
    }
  }, [gcalConnected, view, currentWeek, currentMonth])

  // GCal events for a specific date (excluding ones already synced as jobs)
  const jobGcalIds = new Set(jobs.map(j => j.gcal_event_id).filter(Boolean))
  function gcalForDate(date) {
    return gcalEvents.filter(ev => {
      if (jobGcalIds.has(ev.id)) return false
      const end = ev.date_end && ev.date_end >= ev.date ? ev.date_end : ev.date
      return ev.date <= date && end >= date
    })
  }

  const dragJob = useRef(null)
  const [dragOverDate, setDragOverDate] = useState(null)

  function prevWeek() { setCurrentWeek(w => addDays(w, -7)) }
  function nextWeek() { setCurrentWeek(w => addDays(w, 7)) }
  function goToday() { setCurrentWeek(weekStart(today)) }

  function handleDragStart(e, job) {
    dragJob.current = job
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, date) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
  }

  function handleDrop(e, targetDate) {
    e.preventDefault()
    setDragOverDate(null)
    const job = dragJob.current
    dragJob.current = null
    if (!job || job.date === targetDate) return
    // For multi-day jobs, shift end date by the same offset
    const changes = { date: targetDate }
    if (job.date_end && job.date_end > job.date) {
      const startMs = new Date(job.date + 'T00:00:00').getTime()
      const endMs = new Date(job.date_end + 'T00:00:00').getTime()
      const span = Math.round((endMs - startMs) / 86400000)
      changes.date_end = addDays(targetDate, span)
    }
    updateJob(job.id, changes)
  }

  function handleDragEnd() {
    dragJob.current = null
    setDragOverDate(null)
  }

  function handleSave(result) {
    if (result.type === 'job') {
      if (selectedJob) updateJob(selectedJob.id, result.data)
      else createJob(result.data)
    } else if (result.type === 'recurring') {
      createRecurring(result.data)
    }
    setModal(null)
    setSelectedJob(null)
  }

  // Month view helpers

  function getMonthDays() {
    const [y, m] = currentMonth.split('-').map(Number)
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const startPad = (first.getDay() + 6) % 7 // Mon=0
    const days = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }

  function jobsForDate(date) {
    return jobs.filter(j => {
      if (j.date_end && j.date_end > j.date) return j.date <= date && j.date_end >= date
      return j.date === date
    }).sort((a, b) => a.status.localeCompare(b.status))
  }

  const weekLabel = (() => {
    const d1 = new Date(weekDays[0] + 'T00:00:00')
    const d2 = new Date(weekDays[6] + 'T00:00:00')
    const same = d1.getMonth() === d2.getMonth()
    return `${d1.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}${same ? '' : ` – ${d2.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}`} ${d2.getFullYear()}`
  })()

  const allJobsThisWeek = new Set(weekDays.flatMap(d => jobsForDate(d)).map(j => j.id)).size

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080f14' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={goToday} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
            Heute
          </button>
          <button onClick={view === 'week' ? prevWeek : () => setCurrentMonth(m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })}
            style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={view === 'week' ? nextWeek : () => setCurrentMonth(m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })}
            style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 500, color: FG }}>
            {view === 'week' ? weekLabel : new Date(currentMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </span>
          {view === 'week' && allJobsThisWeek > 0 && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>{allJobsThisWeek} Einsätze</span>
          )}
          {gcalConnected && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: gcalSyncing ? A : MUTED }}>
              <CalendarDays size={11} /> {gcalSyncing ? 'sync…' : 'GCal'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 2 }}>
            {['week', 'month'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: view === v ? A : 'transparent', color: view === v ? '#001219' : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fontWeight: view === v ? 500 : 400 }}>
                {v === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal({ date: today })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus size={14} /> Einsatz
          </button>
        </div>
      </div>

      {/* Week view */}
      {view === 'week' && (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, minmax(150px, 1fr))`, minWidth: 700, height: '100%' }}>
            {weekDays.map((date, i) => {
              const isToday = date === today
              const isDragOver = dragOverDate === date
              const dayJobs = jobsForDate(date)
              const d = new Date(date + 'T00:00:00')
              return (
                <div
                  key={date}
                  onDragOver={e => handleDragOver(e, date)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={e => handleDrop(e, date)}
                  style={{
                    borderRight: i < 6 ? `1px solid ${BORDER}` : 'none',
                    display: 'flex', flexDirection: 'column',
                    minHeight: 200,
                    background: isDragOver ? A0d : 'transparent',
                    outline: isDragOver ? `2px solid ${A40}` : 'none',
                    outlineOffset: -2,
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Day header */}
                  <div
                    onClick={() => setModal({ date })}
                    style={{
                      padding: '12px 12px 10px',
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      background: isToday ? A0a : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => !isToday && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => !isToday && (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isToday ? A : MUTED, letterSpacing: '0.1em', marginBottom: 2 }}>
                      {DAY_NAMES[i]}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 400, color: isToday ? A : FG, lineHeight: 1 }}>
                      {d.getDate()}
                    </div>
                    {dayJobs.length > 0 && (
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 3 }}>
                        {dayJobs.length} {dayJobs.length === 1 ? 'Einsatz' : 'Einsätze'}
                      </div>
                    )}
                  </div>

                  {/* Jobs */}
                  <div style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
                    {dayJobs.map(job => (
                      <JobCard key={job.id} job={job} projects={projects}
                        onClick={() => { setSelectedJob(job); setModal({ job }) }}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                    {gcalForDate(date).map(ev => (
                      <GCalEventCard key={ev.id} event={ev} onClick={() => setModal({ date, gcalEvent: ev })} />
                    ))}
                    <div
                      onClick={() => setModal({ date })}
                      style={{ height: 28, borderRadius: 4, border: `1px dashed ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <Plus size={12} color={MUTED} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {getMonthDays().map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />
              const isToday = date === today
              const isDragOver = dragOverDate === date
              const dayJobs = jobsForDate(date)
              const d = new Date(date + 'T00:00:00')
              return (
                <div
                  key={date}
                  onClick={() => setModal({ date })}
                  onDragOver={e => handleDragOver(e, date)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={e => handleDrop(e, date)}
                  style={{
                    minHeight: 80, padding: '8px', borderRadius: 6,
                    border: `1px solid ${isDragOver ? A + '80' : isToday ? A + '60' : BORDER}`,
                    background: isDragOver ? A14 : isToday ? A0a : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer', transition: 'background 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = isToday ? A14 : 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = isToday ? A0a : 'rgba(255,255,255,0.01)' }}
                >
                  <div style={{ fontSize: 13, fontWeight: isToday ? 600 : 400, color: isToday ? A : FG, marginBottom: 4 }}>{d.getDate()}</div>
                  {dayJobs.slice(0, 2).map(job => {
                    const type = JOB_TYPES.find(t => t.id === job.job_type)
                    return (
                      <div
                        key={job.id}
                        draggable
                        onDragStart={e => { e.stopPropagation(); handleDragStart(e, job) }}
                        onDragEnd={handleDragEnd}
                        onClick={e => { e.stopPropagation(); setSelectedJob(job); setModal({ job }) }}
                        style={{ fontSize: 11, color: type?.color || A, background: `${type?.color || A}18`, borderRadius: 2, padding: '1px 4px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'grab' }}>
                        {job.title}
                      </div>
                    )
                  })}
                  {gcalForDate(date).slice(0, 1).map(ev => (
                    <div key={ev.id} onClick={e => { e.stopPropagation(); setModal({ date, gcalEvent: ev }) }}
                      style={{ fontSize: 11, color: MUTED, background: 'rgba(255,255,255,0.05)', border: `1px dashed ${BORDER}`, borderRadius: 2, padding: '1px 4px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                      📅 {ev.title}
                    </div>
                  ))}
                  {dayJobs.length > 3 && (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>+{dayJobs.length - 3} mehr</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modal && (
        <JobModal
          initialDate={modal.date}
          initialJob={selectedJob || (modal.gcalEvent ? gcalEventToJob(modal.gcalEvent) : null)}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelectedJob(null) }}
        />
      )}
    </div>
  )
}
