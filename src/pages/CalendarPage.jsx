import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useGCal } from '../context/GCalContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, A06, A0a, A0d, A14, A40 } from '../lib/theme.js'
import JobModal from '../components/JobModal.jsx'
import { JOB_TYPES, TEAM, VEHICLES } from '../data/seed.js'
import { isoToday, weekStart, getWeekDays, addDays } from '../lib/storage.js'

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOUR_START = 2
const HOUR_END = 23
const PX_PER_HOUR = 72
const TOTAL_H = (HOUR_END - HOUR_START) * PX_PER_HOUR
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const GUTTER = 52  // width of time-label column in px

function timeToMin(t) {
  if (!t) return 480
  const [h, m] = (t + ':00').split(':').map(Number)
  return h * 60 + (m || 0)
}

function minToTime(min) {
  const h = Math.floor(min / 60), m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function layoutJobs(dayJobs) {
  if (!dayJobs.length) return []
  const items = dayJobs.map(j => ({
    ...j,
    sm: timeToMin(j.start_time),
    em: Math.max(timeToMin(j.start_time) + 30, timeToMin(j.end_time)),
    col: 0, numCols: 1,
  })).sort((a, b) => a.sm - b.sm)

  const colEnds = []
  for (const it of items) {
    let placed = false
    for (let i = 0; i < colEnds.length; i++) {
      if (colEnds[i] <= it.sm) { it.col = i; colEnds[i] = it.em; placed = true; break }
    }
    if (!placed) { it.col = colEnds.length; colEnds.push(it.em) }
  }
  for (const a of items) {
    let maxC = a.col
    for (const b of items) {
      if (b !== a && b.sm < a.em && b.em > a.sm) maxC = Math.max(maxC, b.col)
    }
    a.numCols = maxC + 1
  }
  return items
}

function getClientColor(job, projects, clients) {
  const proj = projects.find(p => p.id === job.project_id)
  if (!proj) return '#6B7280'
  const cl = clients.find(c => c.id === proj.client_id)
  return cl?.color || '#6B7280'
}

function EventBlock({ job, projects, clients, onOpen, onDragStart, onDragEnd }) {
  const type = JOB_TYPES.find(t => t.id === job.job_type)
  const clientColor = getClientColor(job, projects, clients)
  const bgColor = job.color || clientColor
  const typeColor = type?.color || '#08AA56'
  const assignees = TEAM.filter(u => (job.assigned_users || []).includes(u.id))

  const top = (job.sm / 60 - HOUR_START) * PX_PER_HOUR
  const height = Math.max(26, ((job.em - job.sm) / 60) * PX_PER_HOUR - 2)
  const colW = 100 / job.numCols
  const compact = height < 46

  return (
    <div
      draggable
      onClick={e => { e.stopPropagation(); onOpen(job) }}
      onDragStart={e => { e.stopPropagation(); onDragStart(e, job) }}
      onDragEnd={onDragEnd}
      title={`${job.title} · ${job.start_time}–${job.end_time}`}
      style={{
        position: 'absolute',
        top, height,
        left: `calc(${job.col * colW}% + 2px)`,
        width: `calc(${colW}% - 4px)`,
        background: bgColor,
        border: '1px solid rgba(0,0,0,0.18)',
        borderLeft: `3px solid rgba(0,0,0,0.28)`,
        borderRadius: 4,
        padding: compact ? '2px 6px' : '4px 8px',
        overflow: 'hidden',
        cursor: 'grab',
        zIndex: 1,
        boxSizing: 'border-box',
        transition: 'filter 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {job.title}
      </div>
      {!compact && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 1 }}>
          {job.start_time}–{job.end_time}
        </div>
      )}
      {!compact && assignees.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
          {assignees.slice(0, 4).map(u => (
            <div key={u.id} style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6, color: '#fff', fontWeight: 700 }}>{u.initials}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AllDayStrip({ jobs, projects, clients, onOpen, date }) {
  const dayJobs = jobs.filter(j => {
    if (j.start_time && j.end_time) return false  // timed events in time grid
    if (j.date_end && j.date_end > j.date) return j.date <= date && j.date_end >= date
    return j.date === date
  })
  if (!dayJobs.length) return <div style={{ height: 4 }} />
  return (
    <div style={{ padding: '2px 2px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {dayJobs.slice(0, 3).map(job => {
        const type = JOB_TYPES.find(t => t.id === job.job_type)
        const clientColor = getClientColor(job, projects, clients)
        return (
          <div key={job.id} onClick={() => onOpen(job)}
            style={{ fontSize: 12, color: FG, background: `${clientColor}22`, borderLeft: `2px solid ${type?.color || '#08AA56'}`, borderRadius: 2, padding: '2px 5px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.title}
          </div>
        )
      })}
      {dayJobs.length > 3 && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, paddingLeft: 4 }}>+{dayJobs.length - 3}</div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  const { jobs, projects, clients, createJob, updateJob, deleteJob, createRecurring } = useOps()
  const { connected: gcalConnected, events: gcalEvents, fetchForRange, syncing: gcalSyncing } = useGCal()
  const today = isoToday()
  const [currentWeek, setCurrentWeek] = useState(() => weekStart(today))
  const [modal, setModal] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [view, setView] = useState('week')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const scrollRef = useRef(null)
  const dragJob = useRef(null)
  const dragOffsetMin = useRef(0)
  const [dragOverDate, setDragOverDate] = useState(null)
  const [dragPreview, setDragPreview] = useState(null) // { date, startMin, endMin, color }

  const weekDays = getWeekDays(currentWeek)

  // Scroll to current time on mount
  useEffect(() => {
    if (view !== 'week' || !scrollRef.current) return
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const top = Math.max(0, (nowMin / 60 - HOUR_START) * PX_PER_HOUR - 120)
    scrollRef.current.scrollTop = top
  }, [view])

  useEffect(() => {
    if (!gcalConnected) return
    if (view === 'week') {
      fetchForRange(new Date(weekDays[0] + 'T00:00:00'), new Date(addDays(weekDays[6], 1) + 'T00:00:00'))
    } else {
      const [y, m] = currentMonth.split('-').map(Number)
      fetchForRange(new Date(y, m - 1, 1), new Date(y, m, 1))
    }
  }, [gcalConnected, view, currentWeek, currentMonth])

  function timedJobsForDate(date) {
    return jobs.filter(j => j.start_time && j.end_time && j.date === date)
  }

  function prevWeek() { setCurrentWeek(w => addDays(w, -7)) }
  function nextWeek() { setCurrentWeek(w => addDays(w, 7)) }
  function goToday() {
    setCurrentWeek(weekStart(today))
    const d = new Date()
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function calcDropTime(e) {
    if (!scrollRef.current) return null
    const rect = scrollRef.current.getBoundingClientRect()
    const relY = e.clientY - rect.top + scrollRef.current.scrollTop
    const rawMin = (relY / PX_PER_HOUR) * 60 + HOUR_START * 60 - dragOffsetMin.current
    return Math.round(rawMin / 15) * 15
  }

  function handleDragStart(e, job) {
    dragJob.current = job
    e.dataTransfer.effectAllowed = 'move'
    if (job.start_time && job.end_time) {
      const rect = e.currentTarget.getBoundingClientRect()
      const yInEvent = e.clientY - rect.top
      dragOffsetMin.current = Math.max(0, Math.round((yInEvent / PX_PER_HOUR) * 60 / 15) * 15)
    } else {
      dragOffsetMin.current = 0
    }
  }

  function handleDragEnd() {
    dragJob.current = null
    dragOffsetMin.current = 0
    setDragOverDate(null)
    setDragPreview(null)
  }

  function handleDragOver(e, date) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)
    const job = dragJob.current
    if (!job?.start_time || !job?.end_time) return
    const snappedStart = calcDropTime(e)
    if (snappedStart === null) return
    const clampedStart = Math.max(HOUR_START * 60, Math.min(snappedStart, HOUR_END * 60 - 30))
    const duration = timeToMin(job.end_time) - timeToMin(job.start_time)
    const endMin = Math.min(clampedStart + duration, HOUR_END * 60)
    setDragPreview({ date, startMin: clampedStart, endMin, color: job.color || '#6B7280' })
  }

  function handleDrop(e, targetDate) {
    e.preventDefault()
    setDragOverDate(null)
    setDragPreview(null)
    const job = dragJob.current
    dragJob.current = null
    dragOffsetMin.current = 0
    if (!job) return
    const changes = { date: targetDate }
    if (job.start_time && job.end_time) {
      const snappedStart = calcDropTime(e)
      if (snappedStart !== null) {
        const clampedStart = Math.max(HOUR_START * 60, Math.min(snappedStart, HOUR_END * 60 - 30))
        const duration = timeToMin(job.end_time) - timeToMin(job.start_time)
        changes.start_time = minToTime(clampedStart)
        changes.end_time = minToTime(Math.min(clampedStart + duration, HOUR_END * 60))
      }
    }
    if (job.date_end && job.date_end > job.date) {
      const span = Math.round((new Date(job.date_end + 'T00:00:00') - new Date(job.date + 'T00:00:00')) / 86400000)
      changes.date_end = addDays(targetDate, span)
    }
    if (job.date === targetDate && changes.start_time === job.start_time && !changes.date_end) return
    updateJob(job.id, changes)
  }

  function handleColumnClick(e, date) {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const rawMin = (y / PX_PER_HOUR) * 60 + HOUR_START * 60
    const snapped = Math.round(rawMin / 15) * 15
    const start_time = minToTime(Math.max(HOUR_START * 60, Math.min(snapped, (HOUR_END - 1) * 60)))
    const end_time = minToTime(Math.min(timeToMin(start_time) + 60, HOUR_END * 60))
    setModal({ date, start_time, end_time })
  }

  function handleSave(result) {
    if (result.type === 'job') {
      if (selectedJob) updateJob(selectedJob.id, result.data)
      else createJob(result.data)
      if (result.data.start_time && scrollRef.current) {
        const sm = timeToMin(result.data.start_time)
        const top = Math.max(0, (sm / 60 - HOUR_START) * PX_PER_HOUR - 100)
        setTimeout(() => scrollRef.current?.scrollTo({ top, behavior: 'smooth' }), 150)
      }
    } else if (result.type === 'recurring') {
      createRecurring(result.data)
    }
    setModal(null); setSelectedJob(null)
  }

  function openJob(job) { setSelectedJob(job); setModal({ job, date: job.date }) }

  // Current time
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowTop = (nowMin / 60 - HOUR_START) * PX_PER_HOUR

  // Week label
  const weekLabel = (() => {
    const d1 = new Date(weekDays[0] + 'T00:00:00')
    const d2 = new Date(weekDays[6] + 'T00:00:00')
    return `${d1.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}${d1.getMonth() === d2.getMonth() ? '' : ` – ${d2.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}`} ${d2.getFullYear()}`
  })()

  // ── Month helpers ──
  function getMonthDays() {
    const [y, m] = currentMonth.split('-').map(Number)
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const pad = (first.getDay() + 6) % 7
    const days = Array.from({ length: pad }, () => null)
    for (let d = 1; d <= last.getDate(); d++)
      days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    return days
  }

  function jobsForDate(date) {
    return jobs.filter(j => {
      if (j.date_end && j.date_end > j.date) return j.date <= date && j.date_end >= date
      return j.date === date
    })
  }

  const hasAllDay = weekDays.some(d => jobs.some(j => !j.start_time && j.date === d))

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: BG }}>
      {/* ── Topbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={goToday} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>Heute</button>
          <button onClick={view === 'week' ? prevWeek : () => setCurrentMonth(m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })}
            style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={15} />
          </button>
          <button onClick={view === 'week' ? nextWeek : () => setCurrentMonth(m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })}
            style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={15} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 500, color: FG }}>
            {view === 'week' ? weekLabel : new Date(currentMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </span>
          {gcalConnected && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: gcalSyncing ? A : MUTED }}>
              <CalendarDays size={10} /> {gcalSyncing ? 'sync…' : 'GCal'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: SURFACE, borderRadius: 6, padding: 2, border: `1px solid ${BORDER}` }}>
            {['week', 'month'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: view === v ? A : 'transparent', color: view === v ? '#001219' : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fontWeight: view === v ? 500 : 400 }}>
                {v === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
          <button onClick={() => setModal({ date: today })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Plus size={13} /> Einsatz
          </button>
        </div>
      </div>

      {/* ── Week time-grid view ── */}
      {view === 'week' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Day-header row (sticky) */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: SURFACE }}>
            {/* Corner — timezone label */}
            <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 5, paddingRight: 6 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.05em' }}>GMT+2</span>
            </div>
            {/* Day headers */}
            {weekDays.map((date, i) => {
              const isToday = date === today
              const d = new Date(date + 'T00:00:00')
              return (
                <div key={date} onClick={() => setModal({ date })}
                  style={{ flex: 1, borderRight: i < 6 ? `1px solid ${BORDER}` : 'none', padding: '8px 6px', cursor: 'pointer', background: isToday ? A0a : 'transparent', textAlign: 'center', userSelect: 'none' }}
                  onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = A06 }}
                  onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: isToday ? A : MUTED, letterSpacing: '0.1em' }}>{DAY_NAMES[i]}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: isToday ? A : 'transparent', fontSize: 18, fontWeight: isToday ? 700 : 400, color: isToday ? '#001219' : FG, marginTop: 2 }}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day strip */}
          {hasAllDay && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: SURFACE }}>
              <div style={{ width: GUTTER, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '2px 6px 2px 0' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED }}>ganztags</span>
              </div>
              {weekDays.map((date, i) => (
                <div key={date} style={{ flex: 1, borderRight: i < 6 ? `1px solid ${BORDER}` : 'none', minHeight: 24 }}>
                  <AllDayStrip jobs={jobs} projects={projects} clients={clients} date={date} onOpen={openJob} />
                </div>
              ))}
            </div>
          )}

          {/* Scrollable time grid */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: 600, position: 'relative', height: TOTAL_H }}>

              {/* Time labels column */}
              <div style={{ width: GUTTER, flexShrink: 0, position: 'relative', borderRight: `1px solid ${BORDER}` }}>
                {HOURS.map(h => (
                  <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * PX_PER_HOUR - 8, right: 8, fontFamily: "'Space Mono', monospace", fontSize: 12, color: MUTED, userSelect: 'none' }}>
                    {String(h).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((date, i) => {
                const isToday = date === today
                const isDragOver = dragOverDate === date
                const timedJobs = layoutJobs(timedJobsForDate(date))

                return (
                  <div key={date}
                    style={{ flex: 1, position: 'relative', borderRight: i < 6 ? `1px solid ${BORDER}` : 'none', background: isDragOver ? A0d : isToday ? `${A}06` : 'transparent', transition: 'background 0.1s', cursor: 'crosshair' }}
                    onClick={e => handleColumnClick(e, date)}
                    onDragOver={e => handleDragOver(e, date)}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setDragOverDate(null); setDragPreview(null) } }}
                    onDrop={e => handleDrop(e, date)}>

                    {/* Hour grid lines — subtle, within day column only */}
                    {HOURS.map(h => (
                      <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * PX_PER_HOUR, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
                    ))}
                    {/* Half-hour lines */}
                    {HOURS.map(h => (
                      <div key={`h-${h}`} style={{ position: 'absolute', top: (h - HOUR_START) * PX_PER_HOUR + PX_PER_HOUR / 2, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.035)', pointerEvents: 'none' }} />
                    ))}

                    {/* Current time indicator */}
                    {isToday && nowTop > 0 && nowTop < TOTAL_H && (
                      <div style={{ position: 'absolute', top: nowTop, left: -1, right: 0, height: 2, background: A, pointerEvents: 'none', zIndex: 2 }}>
                        <div style={{ position: 'absolute', left: -3, top: -3, width: 8, height: 8, borderRadius: '50%', background: A }} />
                      </div>
                    )}

                    {/* Drag ghost preview */}
                    {dragPreview && dragPreview.date === date && (
                      <div style={{
                        position: 'absolute',
                        top: (dragPreview.startMin / 60 - HOUR_START) * PX_PER_HOUR,
                        height: Math.max(26, ((dragPreview.endMin - dragPreview.startMin) / 60) * PX_PER_HOUR - 2),
                        left: 2, right: 2,
                        background: dragPreview.color,
                        opacity: 0.45,
                        borderRadius: 4,
                        border: '2px dashed rgba(255,255,255,0.6)',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        zIndex: 3,
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '3px 6px',
                      }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#fff', fontWeight: 700 }}>
                          {minToTime(dragPreview.startMin)}–{minToTime(dragPreview.endMin)}
                        </span>
                      </div>
                    )}

                    {/* Event blocks */}
                    {timedJobs.map(job => (
                      <EventBlock key={job.id} job={job} projects={projects} clients={clients}
                        onOpen={openJob} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Month view ── */}
      {view === 'month' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {getMonthDays().map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />
              const isToday = date === today
              const isDragOver = dragOverDate === date
              const dayJobs = jobsForDate(date)
              const d = new Date(date + 'T00:00:00')
              return (
                <div key={date}
                  onClick={() => setModal({ date })}
                  onDragOver={e => handleDragOver(e, date)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={e => handleDrop(e, date)}
                  style={{ minHeight: 80, padding: 8, borderRadius: 6, border: `1px solid ${isDragOver ? A + '80' : isToday ? A + '60' : BORDER}`, background: isDragOver ? A14 : isToday ? A0a : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = isToday ? A14 : A06 }}
                  onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = isToday ? A0a : 'transparent' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isToday ? 24 : 'auto', height: isToday ? 24 : 'auto', borderRadius: isToday ? '50%' : 0, background: isToday ? A : 'transparent', fontSize: 13, fontWeight: isToday ? 600 : 400, color: isToday ? '#001219' : FG, marginBottom: 4 }}>{d.getDate()}</div>
                  {dayJobs.slice(0, 3).map(job => {
                    const type = JOB_TYPES.find(t => t.id === job.job_type)
                    const clientColor = getClientColor(job, projects, clients)
                    return (
                      <div key={job.id} draggable
                        onDragStart={e => { e.stopPropagation(); handleDragStart(e, job) }}
                        onDragEnd={handleDragEnd}
                        onClick={e => { e.stopPropagation(); openJob(job) }}
                        style={{ fontSize: 11, color: FG, background: `${clientColor}20`, borderLeft: `2px solid ${type?.color || A}`, borderRadius: 2, padding: '1px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'grab' }}>
                        {job.start_time && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginRight: 4 }}>{job.start_time}</span>}
                        {job.title}
                      </div>
                    )
                  })}
                  {dayJobs.length > 3 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>+{dayJobs.length - 3}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modal && (
        <JobModal
          initialDate={modal.date}
          initialStartTime={modal.start_time}
          initialEndTime={modal.end_time}
          initialJob={selectedJob}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelectedJob(null) }}
        />
      )}
    </div>
  )
}
