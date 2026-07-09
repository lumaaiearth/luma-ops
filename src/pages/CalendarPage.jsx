import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Menu, X, ChevronDown, ChevronUp, List, AlertTriangle, CheckCircle2, CheckSquare } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useGCal } from '../context/GCalContext.jsx'
import { useWeather } from '../context/WeatherContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, A06, A0a, A0d, A14, A40 } from '../lib/theme.js'
import { EmptyState, SANS } from '../components/ui.jsx'
import JobModal from '../components/JobModal.jsx'
import { JOB_TYPES, TEAM, VEHICLES, TASK_PRIORITIES } from '../data/seed.js'

const TASK_P_CAL = Object.fromEntries(TASK_PRIORITIES.map(p => [p.id, p]))
import { isoToday, weekStart, getWeekDays, addDays } from '../lib/storage.js'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { fetchTeamBusy } from '../lib/teamBusy.js'
import WeatherIcon from '../components/WeatherIcon.jsx'
import { getWeatherForDate, STATUS_COLOR } from '../lib/weather.js'

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
  if (job.calendarColor) return job.calendarColor
  const type = JOB_TYPES.find(t => t.id === job.job_type)
  const proj = projects.find(p => p.id === job.project_id)
  if (!proj) return type?.color || '#616161'
  const cl = clients.find(c => c.id === proj.client_id)
  return cl?.color || type?.color || '#616161'
}

function EventBlock({ job, projects, clients, onOpen, onPointerDown, isGhost }) {
  const type = JOB_TYPES.find(t => t.id === job.job_type)
  const clientColor = getClientColor(job, projects, clients)
  const bgColor = job.color || clientColor
  // Border = job type color (category ring); fill = client/custom color
  const typeColor = job.isGCal ? (job.calendarColor || bgColor) : (type?.color || bgColor)
  const assignees = TEAM.filter(u => (job.assigned_users || []).includes(u.id))

  const top = (job.sm / 60 - HOUR_START) * PX_PER_HOUR
  const height = Math.max(26, ((job.em - job.sm) / 60) * PX_PER_HOUR - 2)
  const colW = 100 / job.numCols
  const compact = height < 56
  const tiny = height < 38

  return (
    <div
      onPointerDown={e => { if (e.button === 0 && !job.isGCal) onPointerDown(e, job) }}
      onClick={e => { e.stopPropagation(); if (!isGhost && !job.isGCal) onOpen(job) }}
      title={`${job.title} · ${job.start_time}–${job.end_time}`}
      style={{
        position: 'absolute',
        top, height,
        left: `calc(${job.col * colW}% + 2px)`,
        width: `calc(${colW}% - 4px)`,
        background: isGhost ? 'transparent' : bgColor,
        border: isGhost ? `2px dashed ${typeColor}` : `2px solid ${typeColor}`,
        borderRadius: 7,
        padding: compact ? '3px 7px' : '6px 9px',
        overflow: 'hidden',
        cursor: job.isGCal ? 'default' : (isGhost ? 'default' : 'grab'),
        zIndex: isGhost ? 0 : 1,
        boxSizing: 'border-box',
        opacity: isGhost ? 0.35 : 1,
        transition: 'opacity 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        userSelect: 'none',
      }}
    >
      {!isGhost && (
        <>
          <div style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
            {job.title}
          </div>
          {job.start_time && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: compact ? 11 : 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1, fontWeight: 600 }}>
              {job.start_time}{job.end_time ? `–${job.end_time}` : ''}
            </div>
          )}
          {!compact && job.location && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', lineHeight: 1 }}>
              📍 {job.location.split(',')[0]}
            </div>
          )}
          {assignees.length > 0 && !tiny && (
            <div style={{ display: 'flex', gap: 2, marginTop: compact ? 0 : 2, flexWrap: 'nowrap', overflow: 'hidden' }}>
              {assignees.slice(0, compact ? 3 : 5).map(u => (
                <div key={u.id} title={u.name} style={{ width: compact ? 16 : 20, height: compact ? 16 : 20, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', border: '1.5px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: compact ? 7 : 9, color: '#fff', fontWeight: 700, lineHeight: 1 }}>{u.initials}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AllDayStrip({ jobs, gcalEvents, projects, clients, onOpen, date, tasks = [], onTaskClick }) {
  const lumaJobs = jobs.filter(j => {
    if (j.start_time && j.end_time) return false
    if (j.date_end && j.date_end > j.date) return j.date <= date && j.date_end >= date
    return j.date === date
  })
  const gcalAllDay = (gcalEvents || []).filter(e => !e.start_time && e.date === date)
  const dayJobs = [...lumaJobs, ...gcalAllDay]
  if (!dayJobs.length && !tasks.length) return <div style={{ height: 4 }} />
  return (
    <div style={{ padding: '2px 2px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
      {dayJobs.slice(0, 3).map(job => {
        const type = JOB_TYPES.find(t => t.id === job.job_type)
        const clientColor = getClientColor(job, projects, clients)
        return (
          <div key={job.id} onClick={() => !job.isGCal && onOpen(job)}
            style={{ fontSize: 12, color: FG, background: `${clientColor}22`, borderLeft: `2px solid ${job.calendarColor || type?.color || '#08AA56'}`, borderRadius: 2, padding: '2px 5px', cursor: job.isGCal ? 'default' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.title}
          </div>
        )
      })}
      {dayJobs.length > 3 && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, paddingLeft: 4 }}>+{dayJobs.length - 3}</div>
      )}
      {/* Aufgaben mit Zeitraum als Ganztags-Chips */}
      {tasks.slice(0, 2).map(t => {
        const color = TASK_P_CAL[t.priority]?.color || '#A78BFA'
        return (
          <div key={`t-${t.id}`} onClick={() => onTaskClick?.(t)} title={t.title}
            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: FG, background: `${color}18`, borderLeft: `2px dashed ${color}`, borderRadius: 2, padding: '2px 4px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <CheckSquare size={9} color={color} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
          </div>
        )
      })}
      {tasks.length > 2 && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, paddingLeft: 4 }}>+{tasks.length - 2} Aufgaben</div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  const { jobs, projects, clients, tasks, createJob, updateJob, deleteJob, createRecurring } = useOps()
  const navigate = useNavigate()
  const { connected: gcalConnected, events: gcalEvents, calendars: gcalCalendars, enabledCalendars, toggleCalendar, fetchForRange, syncing: gcalSyncing } = useGCal()
  const weatherForecast = useWeather()
  const bp = useBreakpoint() // 'xs'|'sm'|'md'|'lg'
  const isMobile = bp === 'xs' || bp === 'sm'   // < 768px
  const isTablet = bp === 'md'                   // 768–1023px
  const isDesktop = bp === 'lg'                  // 1024px+
  const today = isoToday()
  const [currentWeek, setCurrentWeek] = useState(() => weekStart(today))
  // 3-day start / 5-day start anchor
  const [threeDayStart, setThreeDayStart] = useState(today)
  const [fiveDayStart, setFiveDayStart] = useState(() => weekStart(today))
  const [dayViewDate, setDayViewDate] = useState(today)
  const [modal, setModal] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [showTasks, setShowTasks] = useState(true)
  const [view, setView] = useState(() => {
    const w = window.innerWidth
    if (w < 768) return '3day'   // Phone → 3 Tage
    if (w < 1024) return '5day'  // Tablet → 5 Tage
    return 'week'                 // Desktop → ganze Woche
  })
  const prevBp = useRef(bp)
  useEffect(() => {
    if (bp === prevBp.current) return
    prevBp.current = bp
    // Only auto-switch for the default grid views; leave month/schedule/1day alone
    if (view === '3day' || view === '5day' || view === 'week') {
      if (bp === 'xs' || bp === 'sm') setView('3day')
      else if (bp === 'md') setView('5day')
      else setView('week')
    }
  }, [bp])
  // Re-render every minute so the current-time bar stays accurate
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const [teamBusy, setTeamBusy] = useState({})
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedMonthDate, setSelectedMonthDate] = useState(today)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [miniMonthOpen, setMiniMonthOpen] = useState(false)
  const [miniMonthDisplay, setMiniMonthDisplay] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [scheduleStart, setScheduleStart] = useState(today)
  const scrollRef = useRef(null)
  const gridContainerRef = useRef(null)
  // ── Pointer drag state ──
  const dragState = useRef(null) // { job, offsetMin, startX, startY, moved }
  const [dragLive, setDragLive] = useState(null) // { job, date, startMin, endMin, clientX, clientY }
  // legacy refs (kept for month-view HTML5 drag)
  const dragJob = useRef(null)
  const dragOffsetMin = useRef(0)
  const [dragOverDate, setDragOverDate] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)

  const weekDays = getWeekDays(currentWeek)
  const threeDays = [threeDayStart, addDays(threeDayStart, 1), addDays(threeDayStart, 2)]
  const fiveDays = Array.from({ length: 5 }, (_, i) => addDays(fiveDayStart, i))
  // Active days depending on view
  const activeDays =
    view === '1day' ? [dayViewDate] :
    view === '3day' ? threeDays :
    view === '5day' ? fiveDays :
    weekDays

  // Scroll to current time whenever a timed-grid view becomes active
  useEffect(() => {
    const timedViews = ['week', '3day', '5day', '1day']
    if (!timedViews.includes(view) || !scrollRef.current) return
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const top = Math.max(0, (nowMin / 60 - HOUR_START) * PX_PER_HOUR - 120)
    scrollRef.current.scrollTop = top
  }, [view])

  useEffect(() => {
    if (!gcalConnected) return
    if (view === 'schedule') {
      fetchForRange(new Date(scheduleStart + 'T00:00:00'), new Date(addDays(scheduleStart, 90) + 'T00:00:00'))
    } else if (view === 'week' || view === '5day' || view === '3day' || view === '1day') {
      const start = view === '1day' ? dayViewDate : view === '3day' ? threeDays[0] : view === '5day' ? fiveDays[0] : weekDays[0]
      const end = view === '1day' ? dayViewDate : view === '3day' ? threeDays[2] : view === '5day' ? fiveDays[4] : weekDays[6]
      fetchForRange(new Date(start + 'T00:00:00'), new Date(addDays(end, 1) + 'T00:00:00'))
    } else {
      const [y, m] = currentMonth.split('-').map(Number)
      fetchForRange(new Date(y, m - 1, 1), new Date(y, m, 1))
    }
  }, [gcalConnected, view, currentWeek, currentMonth, scheduleStart, dayViewDate, threeDayStart, fiveDayStart])

  // Fetch team iCal free/busy for visible days
  useEffect(() => {
    const from = activeDays[0]
    const to = activeDays[activeDays.length - 1]
    if (!from) return
    TEAM.forEach(async member => {
      const slots = await fetchTeamBusy(member.id, from, to)
      if (slots.length > 0) setTeamBusy(b => ({ ...b, [member.id]: slots }))
    })
  }, [view, dayViewDate, currentWeek, threeDayStart, fiveDayStart])

  function timedJobsForDate(date) {
    const lumaJobs = jobs.filter(j => j.start_time && j.end_time && j.date === date)
    const gcalTimed = gcalEvents.filter(e => e.start_time && e.date === date)
    return [...lumaJobs, ...gcalTimed]
  }

  function prevWeek() { setCurrentWeek(w => addDays(w, -7)) }
  function nextWeek() { setCurrentWeek(w => addDays(w, 7)) }
  function goToday() {
    setCurrentWeek(weekStart(today))
    const d = new Date()
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // ── Pointer drag helpers ──
  function calcTimeFromPointer(clientY) {
    if (!gridContainerRef.current) return null
    const rect = gridContainerRef.current.getBoundingClientRect()
    const relY = clientY - rect.top
    const rawMin = (relY / PX_PER_HOUR) * 60 + HOUR_START * 60
    return Math.round(rawMin / 15) * 15
  }

  function calcDateFromPointer(clientX) {
    if (!gridContainerRef.current) return activeDays[0]
    const rect = gridContainerRef.current.getBoundingClientRect()
    const cols = activeDays.length
    const colW = (rect.width - GUTTER) / cols
    const relX = clientX - rect.left - GUTTER
    const idx = Math.max(0, Math.min(cols - 1, Math.floor(relX / colW)))
    return activeDays[idx]
  }

  function handleEventPointerDown(e, job) {
    e.stopPropagation()
    e.preventDefault()
    if (!job.start_time || !job.end_time) return
    const rect = e.currentTarget.getBoundingClientRect()
    const yInEvent = e.clientY - rect.top
    const offsetMin = Math.max(0, Math.round((yInEvent / PX_PER_HOUR) * 60 / 15) * 15)
    dragState.current = { job, offsetMin, startX: e.clientX, startY: e.clientY, moved: false }
  }

  useEffect(() => {
    function onMove(e) {
      const ds = dragState.current
      if (!ds) return
      const dx = e.clientX - ds.startX, dy = e.clientY - ds.startY
      if (!ds.moved && Math.sqrt(dx*dx+dy*dy) < 8) return
      ds.moved = true
      const rawStart = calcTimeFromPointer(e.clientY)
      if (rawStart === null) return
      const startMin = Math.max(HOUR_START * 60, Math.min(rawStart - ds.offsetMin, HOUR_END * 60 - 30))
      const duration = timeToMin(ds.job.end_time) - timeToMin(ds.job.start_time)
      const endMin = Math.min(startMin + duration, HOUR_END * 60)
      const date = calcDateFromPointer(e.clientX)
      setDragLive({ job: ds.job, date, startMin, endMin, clientX: e.clientX, clientY: e.clientY, isTouch: e.pointerType === 'touch' })
    }
    function onUp(e) {
      const ds = dragState.current
      dragState.current = null
      if (!ds) return
      if (!ds.moved) { setDragLive(null); return }
      setDragLive(null)
      const rawStart = calcTimeFromPointer(e.clientY)
      if (rawStart === null) return
      const startMin = Math.max(HOUR_START * 60, Math.min(rawStart - ds.offsetMin, HOUR_END * 60 - 30))
      const duration = timeToMin(ds.job.end_time) - timeToMin(ds.job.start_time)
      const endMin = Math.min(startMin + duration, HOUR_END * 60)
      const date = calcDateFromPointer(e.clientX)
      updateJob(ds.job.id, {
        date,
        start_time: minToTime(startMin),
        end_time: minToTime(endMin),
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [activeDays])

  // Legacy for month-view HTML5 drag (kept)
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
    dragOffsetMin.current = 0
  }
  function handleDragEnd() { dragJob.current = null; dragOffsetMin.current = 0; setDragOverDate(null) }
  function handleDragOver(e, date) { e.preventDefault(); setDragOverDate(date) }
  function handleDrop(e, targetDate) {
    e.preventDefault(); setDragOverDate(null)
    const job = dragJob.current; dragJob.current = null
    if (!job) return
    updateJob(job.id, { date: targetDate })
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

  // Offene Aufgaben, die (per Zeitraum) auf ein Datum fallen
  const openTasks = showTasks ? (tasks || []).filter(t => t.status !== 'done' && t.status !== 'archive') : []
  function tasksForDate(date) {
    return openTasks.filter(t => {
      const s = t.start_date || t.due_date
      const e = t.due_date || t.start_date
      if (!s && !e) return false
      const lo = s < e ? s : e, hi = e > s ? e : s
      return date >= lo && date <= hi
    })
  }
  function openTaskInList() { navigate('/tasks') }

  const hasAllDay = activeDays.some(d =>
    jobs.some(j => !j.start_time && j.date === d) ||
    gcalEvents.some(e => !e.start_time && e.date === d) ||
    tasksForDate(d).length > 0
  )

  // Navigation helpers
  function prevPeriod() {
    if (view === 'schedule') setScheduleStart(d => addDays(d, -30))
    else if (view === '1day') setDayViewDate(d => addDays(d, -1))
    else if (view === 'week') prevWeek()
    else if (view === '3day') setThreeDayStart(d => addDays(d, -3))
    else if (view === '5day') setFiveDayStart(d => addDays(d, -5))
    else setCurrentMonth(m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  }
  function nextPeriod() {
    if (view === 'schedule') setScheduleStart(d => addDays(d, 30))
    else if (view === '1day') setDayViewDate(d => addDays(d, 1))
    else if (view === 'week') nextWeek()
    else if (view === '3day') setThreeDayStart(d => addDays(d, 3))
    else if (view === '5day') setFiveDayStart(d => addDays(d, 5))
    else setCurrentMonth(m => { const d = new Date(m + '-01'); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  }

  function jumpToDate(date) {
    setMiniMonthOpen(false)
    if (view === 'schedule') setScheduleStart(date)
    else if (view === '1day') setDayViewDate(date)
    else if (view === 'week') setCurrentWeek(weekStart(date))
    else if (view === '3day') setThreeDayStart(date)
    else if (view === '5day') setFiveDayStart(date)
    else { setCurrentMonth(date.slice(0, 7)); setSelectedMonthDate(date) }
  }
  function goTodayAll() {
    goToday()
    setDayViewDate(today)
    setThreeDayStart(today)
    setFiveDayStart(weekStart(today))
  }
  function scrollToNow() {
    goTodayAll()
    setTimeout(() => {
      if (!scrollRef.current) return
      const n = new Date()
      const top = Math.max(0, (n.getHours() + n.getMinutes() / 60 - HOUR_START) * PX_PER_HOUR - 120)
      scrollRef.current.scrollTo({ top, behavior: 'smooth' })
    }, 50)
  }

  const periodLabel = (() => {
    if (view === 'schedule') {
      const d = new Date(scheduleStart + 'T00:00:00')
      return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    }
    if (view === '1day') {
      const d = new Date(dayViewDate + 'T00:00:00')
      return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    }
    if (view === '3day') {
      const d1 = new Date(threeDays[0] + 'T00:00:00')
      const d3 = new Date(threeDays[2] + 'T00:00:00')
      return `${d1.toLocaleDateString('de-DE', { day:'2-digit', month:'short' })} – ${d3.toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' })}`
    }
    if (view === '5day') {
      const d1 = new Date(fiveDays[0] + 'T00:00:00')
      const d5 = new Date(fiveDays[4] + 'T00:00:00')
      return `${d1.toLocaleDateString('de-DE', { day:'2-digit', month:'short' })} – ${d5.toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' })}`
    }
    if (view === 'week') return weekLabel
    return new Date(currentMonth + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  })()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: BG }}>
      {/* ── Topbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 12px' : '12px 20px', borderBottom: miniMonthOpen ? 'none' : `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flex: 1, minWidth: 0 }}>
          {/* Hamburger */}
          <button onClick={() => setSidebarOpen(true)} title="Kalender-Optionen" className="lu-btn-ghost" style={{ width: 34, height: 34, borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Menu size={16} />
          </button>
          {!isMobile && <button onClick={goTodayAll} className="lu-btn-ghost" style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>Heute</button>}
          <button onClick={prevPeriod} title="Zurück" className="lu-btn-ghost" style={{ width: isMobile ? 32 : 30, height: isMobile ? 32 : 30, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={15} />
          </button>
          <button onClick={nextPeriod} title="Weiter" className="lu-btn-ghost" style={{ width: isMobile ? 32 : 30, height: isMobile ? 32 : 30, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronRight size={15} />
          </button>
          {/* Clickable period label → mini-month */}
          <button onClick={() => { setMiniMonthDisplay(currentMonth); setMiniMonthOpen(v => !v) }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 500, color: FG, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{periodLabel}</span>
            <span style={{ flexShrink: 0 }}>{miniMonthOpen ? <ChevronUp size={13} color={MUTED} /> : <ChevronDown size={13} color={MUTED} />}</span>
          </button>
          {gcalConnected && !isMobile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: gcalSyncing ? A : MUTED, flexShrink: 0 }}>
              <CalendarDays size={10} /> {gcalSyncing ? 'sync…' : 'GCal'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Ansichts-Umschalter — auf Desktop sichtbar statt nur im Drawer versteckt */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, background: BG, borderRadius: 7, padding: 3, border: `1px solid ${BORDER}`, marginRight: 4 }}>
              {VIEW_OPTIONS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)} className="lu-tab"
                  style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: view === v.id ? A14 : 'transparent', color: view === v.id ? A : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: view === v.id ? 600 : 400, fontFamily: SANS, whiteSpace: 'nowrap' }}>
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={scrollToNow}
            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#FFD600', color: '#1a1200', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", letterSpacing: '0.04em', boxShadow: '0 0 8px #FFD60066' }}>
            Now
          </button>
          {!isMobile && (
            <button onClick={() => setModal({ date: today })}
              className="lu-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Einsatz
            </button>
          )}
        </div>
      </div>

      {/* Mobile FAB — floating + button above bottom nav */}
      {isMobile && (
        <button onClick={() => setModal({ date: today })}
          className="lu-btn-primary" style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)', right: 16, width: 52, height: 52, borderRadius: '50%', background: A, border: 'none', color: '#001219', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.45)', zIndex: 90 }}>
          <Plus size={22} />
        </button>
      )}

      {/* ── Mini-Month Picker ── */}
      {miniMonthOpen && (
        <MiniMonth
          displayMonth={miniMonthDisplay}
          today={today}
          onMonthChange={setMiniMonthDisplay}
          onSelectDate={jumpToDate}
          BORDER={BORDER} FG={FG} MUTED={MUTED} A={A} A14={A14} SURFACE={SURFACE}
        />
      )}

      {/* ── Week / 5-Day / 3-Day / 1-Day time-grid view ── */}
      {(view === 'week' || view === '3day' || view === '5day' || view === '1day') && (
        <div style={{ flex: 1, overflow: 'hidden' }}>

          {/* Single scrollable container — header sticky inside so columns always align */}
          <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
            <div style={{ minWidth: activeDays.length === 1 ? '100%' : 600, display: 'flex', flexDirection: 'column' }}>

            {/* Sticky header block: day names + all-day strip */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: SURFACE }}>
              {/* Day-header row */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
                {/* Corner — timezone label, sticky-left */}
                <div style={{ width: GUTTER, flexShrink: 0, position: 'sticky', left: 0, zIndex: 21, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 5, paddingRight: 6 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.05em' }}>GMT+2</span>
                </div>
                {/* Day headers */}
                {activeDays.map((date, i) => {
                  const isToday = date === today
                  const d = new Date(date + 'T00:00:00')
                  const dayName = d.toLocaleDateString('de-DE', { weekday: 'short' })
                  const wfc = getWeatherForDate(weatherForecast, date)
                  const wsc = wfc ? STATUS_COLOR[wfc.status] : null
                  const wWarn = wfc && (wfc.status === 'warn' || wfc.status === 'danger')
                  const wGood = wfc && wfc.status === 'good'
                  return (
                    <div key={date} onClick={() => setModal({ date })}
                      style={{ flex: 1, borderRight: i < activeDays.length - 1 ? `1px solid ${BORDER}` : 'none', padding: isMobile ? '6px 4px' : '8px 6px', cursor: 'pointer', background: isToday ? A0a : 'transparent', textAlign: 'center', userSelect: 'none' }}
                      onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = A06 }}
                      onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: isMobile ? 10 : 11, color: isToday ? A : MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{dayName}</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 28 : 30, height: isMobile ? 28 : 30, borderRadius: '50%', background: isToday ? A : 'transparent', fontSize: isMobile ? 16 : 18, fontWeight: isToday ? 700 : 400, color: isToday ? '#001219' : FG, marginTop: 2 }}>
                        {d.getDate()}
                      </div>
                      {/* Weather strip */}
                      {wfc && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 4, height: 18 }} title={`${wfc.label} · ${wfc.tempMax}°/${wfc.tempMin}° · ${wfc.precip}mm · UV ${wfc.uvMax}${wfc.warnings.length ? ' · ' + wfc.warnings.join(', ') : ''}`}>
                          <WeatherIcon code={wfc.wmoCode} size={11} color={wWarn ? wsc : wGood ? wsc : MUTED} />
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: wWarn ? wsc : MUTED }}>{wfc.tempMax}°</span>
                          {wWarn && <AlertTriangle size={8} color={wsc} />}
                          {wGood && !isMobile && <CheckCircle2 size={8} color={wsc} />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* All-day strip */}
              {hasAllDay && (
                <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: GUTTER, flexShrink: 0, position: 'sticky', left: 0, zIndex: 21, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '2px 6px 2px 0' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED }}>ganztags</span>
                  </div>
                  {activeDays.map((date, i) => (
                    <div key={date} style={{ flex: 1, minWidth: 0, overflow: 'hidden', borderRight: i < activeDays.length - 1 ? `1px solid ${BORDER}` : 'none', minHeight: 24 }}>
                      <AllDayStrip jobs={jobs} gcalEvents={gcalEvents} projects={projects} clients={clients} date={date} onOpen={openJob} tasks={tasksForDate(date)} onTaskClick={openTaskInList} />
                    </div>
                  ))}
                </div>
              )}
            </div>{/* /sticky header */}

            {/* ── FLOATING DRAG ELEMENT ── */}
            {dragLive && (() => {
              const dl = dragLive
              const bgColor = dl.job.color || getClientColor(dl.job, projects, clients)
              const duration = dl.endMin - dl.startMin
              const h = Math.max(40, (duration / 60) * PX_PER_HOUR)
              return (
                <div style={{
                  position: 'fixed',
                  left: dl.isTouch ? dl.clientX - 90 : dl.clientX + 12,
                  top: dl.isTouch ? dl.clientY - h - 16 : dl.clientY - 20,
                  width: 180,
                  height: h,
                  background: bgColor,
                  borderRadius: 7,
                  border: '2px solid rgba(255,255,255,0.35)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  padding: '7px 10px',
                  zIndex: 9999,
                  pointerEvents: 'none',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  opacity: 0.97,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dl.job.title}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, color: '#fff', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {minToTime(dl.startMin)}–{minToTime(dl.endMin)}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                    {new Date(dl.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              )
            })()}

            <div ref={gridContainerRef} style={{ display: 'flex', position: 'relative', height: TOTAL_H }}>

              {/* Time labels column — sticky-left so it stays visible during horizontal scroll */}
              <div style={{ width: GUTTER, flexShrink: 0, position: 'sticky', left: 0, zIndex: 10, background: BG, borderRight: `1px solid ${BORDER}` }}>
                {HOURS.map(h => (
                  <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * PX_PER_HOUR - 8, right: 8, fontFamily: "'Space Mono', monospace", fontSize: 12, color: MUTED, userSelect: 'none' }}>
                    {String(h).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {activeDays.map((date, i) => {
                const isToday = date === today
                const isDragOver = dragOverDate === date
                const timedJobs = layoutJobs(timedJobsForDate(date))

                return (
                  <div key={date}
                    style={{ flex: 1, position: 'relative', borderRight: i < activeDays.length - 1 ? `1px solid ${BORDER}` : 'none', background: isDragOver ? A0d : isToday ? `color-mix(in srgb, ${A} 2%, transparent)` : 'transparent', transition: 'background 0.1s', cursor: 'crosshair' }}
                    onClick={e => handleColumnClick(e, date)}
                    onDragOver={e => handleDragOver(e, date)}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setDragOverDate(null); setDragPreview(null) } }}
                    onDrop={e => handleDrop(e, date)}>

                    {/* Hour grid lines — subtle, theme-aware, within day column only */}
                    {HOURS.map(h => (
                      <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * PX_PER_HOUR, left: 0, right: 0, borderTop: `1px solid color-mix(in srgb, ${FG} 7%, transparent)`, pointerEvents: 'none' }} />
                    ))}
                    {/* Half-hour lines */}
                    {HOURS.map(h => (
                      <div key={`h-${h}`} style={{ position: 'absolute', top: (h - HOUR_START) * PX_PER_HOUR + PX_PER_HOUR / 2, left: 0, right: 0, borderTop: `1px solid color-mix(in srgb, ${FG} 3.5%, transparent)`, pointerEvents: 'none' }} />
                    ))}

                    {/* Current time indicator */}
                    {isToday && nowTop > 0 && nowTop < TOTAL_H && (
                      <div style={{ position: 'absolute', top: nowTop, left: -1, right: 0, height: 3, background: '#FFD600', pointerEvents: 'none', zIndex: 5, boxShadow: '0 0 8px #FFD60088' }}>
                        <div style={{ position: 'absolute', left: -5, top: -4, width: 11, height: 11, borderRadius: '50%', background: '#FFD600', boxShadow: '0 0 6px #FFD600' }} />
                      </div>
                    )}

                    {/* Drop target highlight */}
                    {dragLive && dragLive.date === date && (
                      <div style={{
                        position: 'absolute',
                        top: (dragLive.startMin / 60 - HOUR_START) * PX_PER_HOUR,
                        height: Math.max(26, ((dragLive.endMin - dragLive.startMin) / 60) * PX_PER_HOUR - 2),
                        left: 2, right: 2,
                        border: `2px solid ${dragLive.job.color || A}`,
                        borderRadius: 5,
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        zIndex: 2,
                        opacity: 0.5,
                      }} />
                    )}

                    {/* Team busy overlay (iCal free/busy, anonymized) */}
                    {TEAM.map(member => {
                      const slots = (teamBusy[member.id] || []).filter(s => s.date === date && s.start_time)
                      return slots.map((slot, si) => {
                        const sm = timeToMin(slot.start_time)
                        const em = slot.end_time ? timeToMin(slot.end_time) : sm + 60
                        const top = (sm / 60 - HOUR_START) * PX_PER_HOUR
                        const height = Math.max(22, ((em - sm) / 60) * PX_PER_HOUR - 1)
                        return (
                          <div key={`busy-${member.id}-${si}`} title={`${member.name} — Belegt`} style={{
                            position: 'absolute', top, height, left: 0, right: 0,
                            background: `${member.color}1a`,
                            borderLeft: `3px solid ${member.color}60`,
                            borderRadius: 4, pointerEvents: 'none', zIndex: 0, boxSizing: 'border-box',
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: '2px 4px',
                          }}>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: member.color, opacity: 0.8, fontWeight: 700 }}>{member.initials}</span>
                          </div>
                        )
                      })
                    })}

                    {/* Event blocks — ghost for dragged, normal for rest */}
                    {timedJobs.map(job => {
                      const isBeingDragged = dragLive?.job?.id === job.id
                      return (
                        <>
                          {/* Ghost at original position while dragging */}
                          {isBeingDragged && (
                            <EventBlock key={job.id + '-ghost'} job={job} projects={projects} clients={clients}
                              onOpen={openJob} onPointerDown={() => {}} isGhost />
                          )}
                          {/* Normal block (hidden while dragging this job) */}
                          {!isBeingDragged && (
                            <EventBlock key={job.id} job={job} projects={projects} clients={clients}
                              onOpen={openJob} onPointerDown={handleEventPointerDown} isGhost={false} />
                          )}
                        </>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            </div>{/* /minWidth wrapper */}
          </div>{/* /scrollRef */}
        </div>
      )}

      {/* ── Month view ── */}
      {view === 'month' && !isMobile && (
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
              const wfc = getWeatherForDate(weatherForecast, date)
              const wsc = wfc ? STATUS_COLOR[wfc.status] : null
              const wWarn = wfc && (wfc.status === 'warn' || wfc.status === 'danger')
              return (
                <div key={date}
                  onClick={() => setModal({ date })}
                  onDragOver={e => handleDragOver(e, date)}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={e => handleDrop(e, date)}
                  style={{ minHeight: 80, padding: 8, borderRadius: 6, border: `1px solid ${isDragOver ? `color-mix(in srgb, ${A} 50%, transparent)` : isToday ? `color-mix(in srgb, ${A} 38%, transparent)` : wWarn ? wsc + '40' : BORDER}`, background: isDragOver ? A14 : isToday ? A0a : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = isToday ? A14 : A06 }}
                  onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = isToday ? A0a : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isToday ? 24 : 'auto', height: isToday ? 24 : 'auto', borderRadius: isToday ? '50%' : 0, background: isToday ? A : 'transparent', fontSize: 13, fontWeight: isToday ? 600 : 400, color: isToday ? '#001219' : FG }}>{d.getDate()}</div>
                    {wfc && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} title={`${wfc.label} ${wfc.tempMax}°/${wfc.tempMin}°${wfc.warnings.length ? ' · ' + wfc.warnings.join(', ') : ''}`}>
                        {wWarn && <AlertTriangle size={9} color={wsc} />}
                        <WeatherIcon code={wfc.wmoCode} size={11} color={wWarn ? wsc : MUTED} />
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: wWarn ? wsc : MUTED }}>{wfc.tempMax}°</span>
                      </div>
                    )}
                  </div>
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
                  {tasksForDate(date).slice(0, 2).map(t => {
                    const color = TASK_P_CAL[t.priority]?.color || '#A78BFA'
                    return (
                      <div key={`mt-${t.id}`} onClick={e => { e.stopPropagation(); openTaskInList() }} title={t.title}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: FG, background: `${color}18`, borderLeft: `2px dashed ${color}`, borderRadius: 2, padding: '1px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                        <CheckSquare size={9} color={color} style={{ flexShrink: 0 }} />{t.title}
                      </div>
                    )
                  })}
                  {tasksForDate(date).length > 2 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>+{tasksForDate(date).length - 2} Aufgaben</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Month view mobile (iOS-style) ── */}
      {view === 'month' && isMobile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Compact dot calendar */}
          <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textAlign: 'center', padding: '2px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {getMonthDays().map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />
                const isToday = date === today
                const isSelected = date === selectedMonthDate
                const dayJobs = jobsForDate(date)
                const d = new Date(date + 'T00:00:00')
                const dotColors = dayJobs.slice(0, 3).map(job => {
                  const type = JOB_TYPES.find(t => t.id === job.job_type)
                  return getClientColor(job, projects, clients) || type?.color || A
                })
                const wfc = getWeatherForDate(weatherForecast, date)
                const wWarn = wfc && (wfc.status === 'warn' || wfc.status === 'danger')
                const wsc = wfc ? STATUS_COLOR[wfc.status] : null
                return (
                  <div key={date}
                    onClick={() => setSelectedMonthDate(date)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '3px 0', cursor: 'pointer', borderRadius: 6, background: isSelected && !isToday ? A14 : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: isToday ? A : 'transparent', fontSize: 13, fontWeight: isToday || isSelected ? 600 : 400, color: isToday ? '#001219' : isSelected ? A : FG, position: 'relative' }}>
                      {d.getDate()}
                      {/* Small weather warning dot top-right of date circle */}
                      {wWarn && <div style={{ position: 'absolute', top: 1, right: 1, width: 6, height: 6, borderRadius: '50%', background: wsc, border: '1px solid rgba(0,0,0,0.3)' }} />}
                    </div>
                    <div style={{ display: 'flex', gap: 2, height: 5, alignItems: 'center' }}>
                      {dotColors.map((c, idx) => (
                        <div key={idx} style={{ width: 4, height: 4, borderRadius: '50%', background: c }} />
                      ))}
                      {dayJobs.length > 3 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: MUTED }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: BORDER, flexShrink: 0 }} />

          {/* Selected day event list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
            {(() => {
              const selJobs = jobsForDate(selectedMonthDate)
              const selTasks = tasksForDate(selectedMonthDate)
              const selD = new Date(selectedMonthDate + 'T00:00:00')
              const label = selD.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500, color: FG }}>{label}</div>
                      {(() => {
                        const selWfc = getWeatherForDate(weatherForecast, selectedMonthDate)
                        if (!selWfc) return null
                        const sc = STATUS_COLOR[selWfc.status]
                        const isWarn = selWfc.status === 'warn' || selWfc.status === 'danger'
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                            <WeatherIcon code={selWfc.wmoCode} size={11} color={isWarn ? sc : MUTED} />
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isWarn ? sc : MUTED }}>{selWfc.label} · {selWfc.tempMax}°/{selWfc.tempMin}°</span>
                            {isWarn && <AlertTriangle size={9} color={sc} />}
                          </div>
                        )
                      })()}
                    </div>
                    <button onClick={() => setModal({ date: selectedMonthDate })}
                      className="lu-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      <Plus size={12} /> Einsatz
                    </button>
                  </div>
                  {selJobs.length === 0 && selTasks.length === 0 && (
                    <EmptyState title="Nichts geplant" hint="Tippe auf „Einsatz“, um etwas anzulegen." style={{ marginTop: 24 }} />
                  )}
                  {selTasks.map(t => {
                    const color = TASK_P_CAL[t.priority]?.color || '#A78BFA'
                    return (
                      <div key={`smt-${t.id}`} onClick={openTaskInList} className="lu-card lu-clickable"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: SURFACE, border: `1px dashed ${color}55`, marginBottom: 8, cursor: 'pointer' }}>
                        <CheckSquare size={14} color={color} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 2 }}>Aufgabe{t.due_date ? ` · fällig ${t.due_date}` : ''}</div>
                        </div>
                      </div>
                    )
                  })}
                  {selJobs.map(job => {
                    const type = JOB_TYPES.find(t => t.id === job.job_type)
                    const clientColor = getClientColor(job, projects, clients)
                    return (
                      <div key={job.id}
                        onClick={() => openJob(job)} className="lu-card lu-clickable"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: type?.color || A, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                          {(job.start_time || job.location) && (
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 2 }}>
                              {job.start_time && <span>{job.start_time}{job.end_time ? ` – ${job.end_time}` : ''}</span>}
                              {job.start_time && job.location && <span style={{ margin: '0 4px' }}>·</span>}
                              {job.location && <span>{job.location}</span>}
                            </div>
                          )}
                        </div>
                        {clientColor && <div style={{ width: 8, height: 8, borderRadius: '50%', background: clientColor, flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Schedule / Terminliste view ── */}
      {view === 'schedule' && (
        <ScheduleView
          startDate={scheduleStart}
          jobs={jobs}
          gcalEvents={gcalEvents}
          projects={projects}
          clients={clients}
          today={today}
          onOpen={openJob}
          onAdd={date => setModal({ date })}
          BORDER={BORDER} FG={FG} MUTED={MUTED} A={A} A14={A14} SURFACE={SURFACE} BG={BG}
        />
      )}

      {/* ── Sidebar Drawer ── */}
      {sidebarOpen && (
        <CalendarSidebar
          view={view} setView={v => { setView(v); setSidebarOpen(false) }}
          gcalConnected={gcalConnected} gcalCalendars={gcalCalendars}
          enabledCalendars={enabledCalendars} toggleCalendar={toggleCalendar}
          onClose={() => setSidebarOpen(false)}
          goTodayAll={() => { goTodayAll(); setSidebarOpen(false) }}
          showTasks={showTasks} setShowTasks={setShowTasks}
          BORDER={BORDER} FG={FG} MUTED={MUTED} A={A} A14={A14} SURFACE={SURFACE} BG={BG}
        />
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

/* ─── MINI-MONTH PICKER ────────────────────────────────────────────────── */
const MINI_DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
function MiniMonth({ displayMonth, today, onMonthChange, onSelectDate, BORDER, FG, MUTED, A, A14, SURFACE }) {
  const [y, m] = displayMonth.split('-').map(Number)

  function getDays() {
    const first = new Date(y, m - 1, 1).getDay() // 0=Sun
    const offset = first === 0 ? 6 : first - 1   // Mo=0
    const total = new Date(y, m, 0).getDate()
    const cells = Array(offset).fill(null)
    for (let d = 1; d <= total; d++) cells.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
    return cells
  }

  const days = getDays()
  const label = new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  function prevM() {
    const d = new Date(y, m - 2, 1)
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function nextM() {
    const d = new Date(y, m, 1)
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '8px 16px 12px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={prevM} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={13} /></button>
        <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>{label}</span>
        <button onClick={nextM} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={13} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {MINI_DAY_NAMES.map(d => (
          <div key={d} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textAlign: 'center', padding: '2px 0' }}>{d}</div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const isToday = date === today
          const d = new Date(date + 'T00:00:00')
          return (
            <button key={date} onClick={() => onSelectDate(date)} className="lu-option" style={{
              width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none',
              background: isToday ? A : 'transparent',
              color: isToday ? '#001219' : FG,
              fontSize: 12, fontWeight: isToday ? 700 : 400,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{d.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── SIDEBAR DRAWER ───────────────────────────────────────────────────── */
const VIEW_OPTIONS = [
  { id: 'schedule', label: 'Terminliste' },
  { id: '1day',    label: 'Tag' },
  { id: '3day',    label: '3 Tage' },
  { id: 'week',    label: 'Woche' },
  { id: 'month',   label: 'Monat' },
]

function CalendarSidebar({ view, setView, gcalConnected, gcalCalendars, enabledCalendars, toggleCalendar, onClose, goTodayAll, showTasks, setShowTasks, BORDER, FG, MUTED, A, A14, SURFACE, BG }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 280,
        background: SURFACE, zIndex: 401, display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.25)', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>Kalender</span>
          <button onClick={onClose} className="lu-btn-ghost" style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', flex: 1 }}>
          {/* Heute Button */}
          <button onClick={goTodayAll} className="lu-btn-ghost" style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 20 }}>
            Heute
          </button>

          {/* View options */}
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Ansicht</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
            {VIEW_OPTIONS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} className={view === v.id ? 'lu-nav active' : 'lu-nav'} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 8, border: 'none', textAlign: 'left', cursor: 'pointer',
                background: view === v.id ? A14 : 'transparent',
                color: view === v.id ? A : FG,
                fontWeight: view === v.id ? 700 : 400, fontSize: 14,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {v.id === 'schedule' ? <List size={16} /> : <CalendarDays size={16} />}
                {v.label}
              </button>
            ))}
          </div>

          {/* Anzeigen */}
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Anzeigen</div>
          <button onClick={() => setShowTasks(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderRadius: 6, border: 'none',
            background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: 24,
          }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: showTasks ? '#A78BFA' : 'transparent', border: `2px solid #A78BFA`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showTasks && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: FG, display: 'flex', alignItems: 'center', gap: 6 }}><CheckSquare size={13} color={MUTED} /> Aufgaben (Zeitraum)</span>
          </button>

          {/* GCal calendar list */}
          {gcalConnected && gcalCalendars.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Kalender</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* LUMA internal always-on */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: A, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: FG }}>LUMA Einsätze</span>
                </div>
                {gcalCalendars.map(cal => {
                  const enabled = enabledCalendars.has(cal.id)
                  return (
                    <button key={cal.id} onClick={() => toggleCalendar(cal.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
                      borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        background: enabled ? cal.color : 'transparent',
                        border: `2px solid ${cal.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {enabled && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cal.name}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ─── SCHEDULE VIEW ────────────────────────────────────────────────────── */
function ScheduleView({ startDate, jobs, gcalEvents, projects, clients, today, onOpen, onAdd, BORDER, FG, MUTED, A, A14, SURFACE, BG }) {
  const days = Array.from({ length: 90 }, (_, i) => addDays(startDate, i))

  const daysWithEvents = days.filter(date => {
    const hasJobs = jobs.some(j => j.date === date || (j.date_end && j.date <= date && j.date_end >= date))
    const hasGCal = (gcalEvents || []).some(e => e.date === date)
    return hasJobs || hasGCal
  })

  function eventsForDate(date) {
    const lumaJobs = jobs.filter(j =>
      j.date === date || (j.date_end && j.date <= date && j.date_end >= date)
    )
    const gcalForDate = (gcalEvents || []).filter(e => e.date === date)
    return [...lumaJobs, ...gcalForDate].sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0
      if (!a.start_time) return -1
      if (!b.start_time) return 1
      return a.start_time.localeCompare(b.start_time)
    })
  }

  if (daysWithEvents.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <EmptyState icon={CalendarDays} title="Keine Termine in den nächsten 90 Tagen" hint="Klicke auf „Einsatz“, um einen Termin anzulegen." style={{ border: 'none' }} />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
      {daysWithEvents.map(date => {
        const d = new Date(date + 'T00:00:00')
        const isToday = date === today
        const dayEvs = eventsForDate(date)
        const dayName = d.toLocaleDateString('de-DE', { weekday: 'long' })
        const dayNum = d.getDate()
        const monthName = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

        return (
          <div key={date} style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            {/* Date sidebar */}
            <div style={{ width: 72, flexShrink: 0, padding: '16px 12px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isToday ? A : MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d.toLocaleDateString('de-DE', { weekday: 'short' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: isToday ? A : 'transparent', fontSize: 18, fontWeight: isToday ? 700 : 400, color: isToday ? '#001219' : FG }}>
                {dayNum}
              </div>
            </div>
            {/* Events */}
            <div style={{ flex: 1, padding: '12px 16px 12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayEvs.map(ev => {
                const clientColor = getClientColor(ev, projects, clients)
                const accentColor = ev.calendarColor || clientColor
                return (
                  <div key={ev.id} onClick={() => !ev.isGCal && onOpen(ev)}
                    className={ev.isGCal ? 'lu-card' : 'lu-card lu-clickable'}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, cursor: ev.isGCal ? 'default' : 'pointer' }}>
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: accentColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      {(ev.start_time || ev.location) && (
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 2 }}>
                          {ev.start_time && <span>{ev.start_time}{ev.end_time ? `–${ev.end_time}` : ''}</span>}
                          {ev.start_time && ev.location && <span style={{ margin: '0 4px' }}>·</span>}
                          {ev.location && <span>{ev.location}</span>}
                        </div>
                      )}
                    </div>
                    {ev.calendarColor && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.calendarColor, flexShrink: 0, marginTop: 3 }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
