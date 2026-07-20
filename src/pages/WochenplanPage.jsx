import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarRange, X } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useWeather } from '../context/WeatherContext.jsx'
import { sb } from '../lib/supabase.js'
import { TEAM } from '../data/seed.js'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A08, A14 } from '../lib/theme.js'
import { INPUT_STYLE, LABEL_STYLE, Modal, ModalActions, MONO, SANS } from '../components/ui.jsx'
import JobModal from '../components/JobModal.jsx'
import WeatherIcon from '../components/WeatherIcon.jsx'
import { getWeatherForDate, STATUS_COLOR } from '../lib/weather.js'
import { isoToday, addDays, weekStart, getWeekDays, genId } from '../lib/storage.js'
import { useIsMobile } from '../lib/useBreakpoint.js'

// ── ISO-Kalenderwoche (automatisch berechnet — keine manuellen KW-Nummern mehr) ──
function isoWeekOf(dateIso) {
  const date = new Date(dateIso + 'T00:00:00')
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function fmtShort(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

function dayDiff(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)
}

// Stabile Referenz (Modulebene): wird während eines aktiven Drags als
// non-passive Listener registriert, um das Scrollen zu unterbinden.
const preventTouch = e => e.preventDefault()

// Läuft der Einsatz an diesem Tag? (mehrtägige Einsätze via date_end)
function jobOnDay(job, day) {
  const end = job.date_end || job.date
  return job.date <= day && day <= end && job.status !== 'cancelled'
}

function AbsenceModal({ teamId, onSave, onClose }) {
  const u = TEAM.find(t => t.id === teamId)
  const [form, setForm] = useState({ date_from: isoToday(), date_to: isoToday(), reason: '' })
  return (
    <Modal eyebrow={`Abwesenheit · ${u?.name}`} onClose={onClose} maxWidth={380}>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={LABEL_STYLE}>Von *</label>
            <input type="date" style={INPUT_STYLE} value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} required />
          </div>
          <div>
            <label style={LABEL_STYLE}>Bis *</label>
            <input type="date" style={INPUT_STYLE} value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} required />
          </div>
        </div>
        <div>
          <label style={LABEL_STYLE}>Grund</label>
          <input style={INPUT_STYLE} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="z.B. Urlaub, flexibel frei" />
        </div>
        <ModalActions onCancel={onClose} submitLabel="Eintragen" />
      </form>
    </Modal>
  )
}

// Kompakte Wetterzeile für einen Tag (Temperatur, Regen, UV) — Farben je Status
function WeatherLine({ wfc, size = 'sm' }) {
  if (!wfc) return null
  const sc = STATUS_COLOR[wfc.status]
  const warn = wfc.status === 'warn' || wfc.status === 'danger'
  const rainWarn = (wfc.precipProb ?? 0) >= 60 || wfc.precip >= 10
  const uvHigh = (wfc.uvMax ?? 0) >= 6
  const big = size === 'lg'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: big ? 8 : 4, justifyContent: 'center', flexWrap: 'wrap' }}
      title={`${wfc.label} · ${wfc.tempMax}°/${wfc.tempMin}°${wfc.precipProb != null ? ` · Regen ${wfc.precipProb}%` : ''} · UV ${wfc.uvMax}${wfc.warnings.length ? ' · ' + wfc.warnings.join(', ') : ''}`}>
      <WeatherIcon code={wfc.wmoCode} size={big ? 16 : 11} color={warn ? sc : MUTED} />
      <span style={{ fontFamily: MONO, fontSize: big ? 12 : 9, color: FG, fontWeight: big ? 700 : 400 }}>
        {wfc.tempMax}°<span style={{ color: MUTED, fontWeight: 400 }}>/{wfc.tempMin}°</span>
      </span>
      {wfc.precipProb != null && wfc.precipProb >= (big ? 20 : 40) && (
        <span style={{ fontFamily: MONO, fontSize: big ? 11 : 8.5, color: rainWarn ? '#3B82F6' : MUTED, fontWeight: rainWarn ? 700 : 400 }}>☂{wfc.precipProb}%</span>
      )}
      {uvHigh && (
        <span style={{ fontFamily: MONO, fontSize: big ? 10 : 8, fontWeight: 700, color: '#1a1200', background: '#FFD600', borderRadius: 4, padding: big ? '1px 5px' : '0px 3px' }}>UV{Math.round(wfc.uvMax)}</span>
      )}
    </div>
  )
}

export default function WochenplanPage({ embedded = false }) {
  const { jobs, projects, vehicles, createJob, updateJob, createRecurring } = useOps()
  const { isMitarbeiter } = useAuth()
  const weatherForecast = useWeather()
  const isMobile = useIsMobile(700)
  // "Heute" als State: die Capacitor-App lebt oft tagelang im Speicher — ohne
  // Refresh zeigt ein stehen gebliebenes `today` sonst auf ein altes Datum.
  const [today, setToday] = useState(isoToday())
  const [ws, setWs] = useState(weekStart(today))
  const [day, setDay] = useState(today)              // Mobile: sichtbarer Tag
  const [modal, setModal] = useState(null)           // { date, uid } | { job }
  const [selectedJob, setSelectedJob] = useState(null)
  const [absenceModal, setAbsenceModal] = useState(null) // teamId
  const [availability, setAvailability] = useState({})   // { teamId: { weekdays, note } }
  const [absences, setAbsences] = useState([])
  const matrixRef = useRef(null)

  useEffect(() => {
    const refresh = () => setToday(isoToday())
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  const days = getWeekDays(ws)
  const kw = isoWeekOf(days[3]) // Donnerstag bestimmt die ISO-Woche

  useEffect(() => {
    sb.from('user_availability').select('*').then(({ data }) =>
      setAvailability(Object.fromEntries((data || []).map(r => [r.team_id, r]))))
    sb.from('user_absences').select('*').then(({ data }) => setAbsences(data || []))
  }, [])

  const projName = id => projects.find(p => p.id === id)
  const vehName = id => vehicles.find(v => v.id === id)?.name

  const cellJobs = useCallback((uid, d) =>
    jobs.filter(j => jobOnDay(j, d) && (uid ? (j.assigned_users || []).includes(uid) : !(j.assigned_users || []).length)),
    [jobs])

  function isAvailable(uid, dayIdx) {
    const wd = availability[uid]?.weekdays
    if (!wd || !Object.values(wd).some(Boolean)) return false
    return !!wd[WEEKDAY_KEYS[dayIdx]]
  }

  function absenceFor(uid, d) {
    return absences.find(a => a.team_id === uid && a.date_from <= d && d <= a.date_to)
  }

  function addAbsence(teamId, form) {
    const row = { id: genId(), team_id: teamId, ...form, created_at: new Date().toISOString() }
    setAbsences(prev => [...prev, row])
    sb.from('user_absences').insert(row).then(({ error }) => { if (error) console.error(error) })
    setAbsenceModal(null)
  }

  function removeAbsence(id) {
    setAbsences(prev => prev.filter(a => a.id !== id))
    sb.from('user_absences').delete().eq('id', id).then(({ error }) => { if (error) console.error(error) })
  }

  function handleSave(result) {
    if (result.type === 'job') {
      if (selectedJob) updateJob(selectedJob.id, result.data)
      else createJob(result.data)
    } else if (result.type === 'recurring') {
      createRecurring(result.data)
    }
    setModal(null); setSelectedJob(null)
  }

  // Springt zur aktuellen Woche / heutigem Tag und scrollt die Heute-Spalte
  // in Sicht (auf schmalen Screens ist die Matrix horizontal gescrollt).
  function goToday() {
    const t = isoToday()
    setToday(t)
    setWs(weekStart(t))
    setDay(t)
    setTimeout(() => {
      matrixRef.current?.querySelector('[data-today]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }, 60)
  }

  function shiftDay(n) {
    const next = addDays(day, n)
    setDay(next)
    setWs(weekStart(next))
  }

  // ── Drag & Drop: Einsatz-Chip auf andere Zelle ziehen ─────────────────────
  // Desktop: Maus zieht sofort (ab 8px Bewegung). Touch: Long-Press (350ms)
  // nimmt den Chip auf, sonst bleibt Wischen = Tag wechseln / Scrollen.
  const dragRef = useRef(null) // { job, fromUid, startX, startY, active, timer, pointerType }
  const [dragging, setDragging] = useState(null) // { job, x, y }
  const [dropTarget, setDropTarget] = useState(null) // { day, uid } | null
  // Nach einem Drop feuert der Browser noch ein click-Event auf der Zielzelle —
  // kurz unterdrücken, sonst öffnet sich ungewollt das Anlegen/Bearbeiten-Modal.
  const suppressClick = useRef(false)

  const cancelLongPress = () => { if (dragRef.current?.timer) { clearTimeout(dragRef.current.timer); dragRef.current.timer = null } }

  function chipPointerDown(e, job, fromUid) {
    if (e.button != null && e.button !== 0) return
    const base = { job, fromUid, startX: e.clientX, startY: e.clientY, active: false, timer: null, pointerType: e.pointerType }
    dragRef.current = base
    if (e.pointerType === 'touch') {
      base.timer = setTimeout(() => {
        if (dragRef.current === base) activateDrag(base.startX, base.startY)
      }, 350)
    }
  }

  function activateDrag(x, y) {
    const ds = dragRef.current
    if (!ds || ds.active) return
    ds.active = true
    setDragging({ job: ds.job, x, y })
    if (navigator.vibrate) { try { navigator.vibrate(10) } catch {} }
    // Scrollen während des Drags unterbinden (non-passive, nur solange aktiv)
    window.addEventListener('touchmove', preventTouch, { passive: false })
  }

  function targetFromPoint(x, y) {
    const el = document.elementFromPoint(x, y)
    const cell = el?.closest?.('[data-cell-day]')
    if (!cell) return null
    const uidAttr = cell.getAttribute('data-cell-uid')
    return { day: cell.getAttribute('data-cell-day'), uid: uidAttr === '' ? null : uidAttr, dayOnly: cell.hasAttribute('data-day-only') }
  }

  useEffect(() => {
    function onMove(e) {
      const ds = dragRef.current
      if (!ds) return
      const dx = e.clientX - ds.startX, dy = e.clientY - ds.startY
      if (!ds.active) {
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          if (ds.pointerType === 'touch') { cancelLongPress(); dragRef.current = null } // Touch: Bewegung vor Long-Press = Scroll/Swipe
          else activateDrag(e.clientX, e.clientY)
        }
        return
      }
      setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : d)
      setDropTarget(targetFromPoint(e.clientX, e.clientY))
    }
    function onUp(e) {
      const ds = dragRef.current
      cancelLongPress()
      dragRef.current = null
      window.removeEventListener('touchmove', preventTouch)
      if (!ds) return
      if (!ds.active) return // war ein Klick — onClick des Chips übernimmt
      setDragging(null)
      setDropTarget(null)
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 350)
      const target = targetFromPoint(e.clientX, e.clientY)
      if (!target) return
      const { job, fromUid } = ds
      const changes = {}
      // Datum verschieben (mehrtägige Einsätze behalten ihre Länge)
      if (target.day && target.day !== job.date) {
        const delta = dayDiff(job.date, target.day)
        changes.date = target.day
        if (job.date_end) changes.date_end = addDays(job.date_end, delta)
      }
      // Person wechseln (nicht bei Ablage auf Tages-Chips der Mobilansicht)
      if (!target.dayOnly && target.uid !== fromUid) {
        const users = [...(job.assigned_users || [])]
        const without = users.filter(u => u !== fromUid)
        changes.assigned_users = target.uid
          ? (without.includes(target.uid) ? without : [...without, target.uid])
          : without
      }
      if (Object.keys(changes).length) updateJob(job.id, changes)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('touchmove', preventTouch)
    }
  }, [updateJob])

  // ── Mobile: Swipe links/rechts = Tag vor/zurück ───────────────────────────
  const swipeRef = useRef(null)
  function swipeStart(e) {
    if (dragRef.current) return
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function swipeEnd(e) {
    const s = swipeRef.current
    swipeRef.current = null
    if (!s || dragging) return
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) shiftDay(dx < 0 ? 1 : -1)
  }

  const weekAbsences = useMemo(() =>
    absences.filter(a => a.date_from <= days[6] && days[0] <= a.date_to), [absences, ws])

  const persons = [...TEAM, { id: null, name: 'Ohne Zuweisung', color: MUTED, initials: '?' }]

  function openCell(d, uid) {
    if (suppressClick.current) return
    setSelectedJob(null); setModal({ date: d, uid })
  }
  function openJob(job) {
    if (suppressClick.current) return
    setSelectedJob(job); setModal({ job, date: job.date })
  }

  // ── Chip (Einsatz) — geteilt zwischen Matrix & Tagesansicht ───────────────
  function JobChip({ job, uid, big = false }) {
    const p = projName(job.project_id)
    const vNames = (job.vehicle_ids || []).map(vehName).filter(Boolean)
    const isDragged = dragging?.job?.id === job.id
    return (
      <div
        onPointerDown={e => chipPointerDown(e, job, uid)}
        onClick={e => { e.stopPropagation(); openJob(job) }}
        style={{
          background: A14, borderLeft: `3px solid ${job.color || A}`,
          borderRadius: 5, padding: big ? '6px 9px' : '3px 6px', fontSize: big ? 12 : 10,
          lineHeight: 1.35, color: FG, cursor: 'grab', userSelect: 'none',
          opacity: isDragged ? 0.35 : 1, touchAction: 'pan-y',
        }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p?.flaeche_code || p?.name || job.title}
        </div>
        <div style={{ fontFamily: MONO, fontSize: big ? 10 : 8.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[job.start_time, vNames.length ? `🚐 ${vNames.join(', ')}` : null].filter(Boolean).join(' · ') || job.title}
        </div>
      </div>
    )
  }

  // ─────────────────────────── MOBILE: Tagesansicht ─────────────────────────
  if (isMobile) {
    const dayIdx = (new Date(day + 'T00:00:00').getDay() + 6) % 7
    const dLabel = new Date(day + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    const isToday = day === today
    const wfc = getWeatherForDate(weatherForecast, day)
    return (
      <div style={{ padding: '12px 12px 24px', maxWidth: 640, margin: '0 auto' }}>
        {!embedded && (
          <h1 style={{ fontSize: 18, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarRange size={16} color={A} /> Wochenplan
          </h1>
        )}
        {/* Kopf: Tag-Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button onClick={() => shiftDay(-1)} className="lu-btn-ghost" style={{ width: 34, height: 34, borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ChevronLeft size={16} /></button>
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: isToday ? A : FG, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isToday && <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, background: A, color: 'var(--luma-on-a)', borderRadius: 5, padding: '1px 6px', marginRight: 7, verticalAlign: 2 }}>HEUTE</span>}
              {dLabel}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>KW {kw}</div>
          </div>
          <button onClick={() => shiftDay(1)} className="lu-btn-ghost" style={{ width: 34, height: 34, borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ChevronRight size={16} /></button>
          <button onClick={goToday} className="lu-btn-ghost" style={{ padding: '7px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>Heute</button>
        </div>

        {/* Wochen-Strip: 7 Tages-Chips (auch Drop-Ziel für Datumswechsel) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 10 }}>
          {days.map((d, i) => {
            const isT = d === today
            const isSel = d === day
            const isDrop = dropTarget?.dayOnly && dropTarget?.day === d
            return (
              <button key={d} onClick={() => setDay(d)} data-cell-day={d} data-cell-uid="" data-day-only
                style={{
                  padding: '5px 0 4px', borderRadius: 8, cursor: 'pointer',
                  border: isDrop ? `2px dashed ${A}` : isSel ? `1px solid ${A}` : `1px solid ${BORDER}`,
                  background: isT ? A : isSel ? A14 : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                <span style={{ fontFamily: MONO, fontSize: 8, textTransform: 'uppercase', color: isT ? 'var(--luma-on-a)' : isSel ? A : MUTED }}>{DAY_LABELS[i]}</span>
                <span style={{ fontSize: 12, fontWeight: isT || isSel ? 700 : 400, color: isT ? 'var(--luma-on-a)' : isSel ? A : FG }}>{d.slice(8).replace(/^0/, '')}</span>
              </button>
            )
          })}
        </div>

        {/* Wetterzeile für den Tag */}
        {wfc && (
          <div style={{ padding: '8px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <WeatherLine wfc={wfc} size="lg" />
            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{wfc.label}</span>
          </div>
        )}

        {/* Personen-Zeilen des Tages (Swipe-Fläche) */}
        <div onTouchStart={swipeStart} onTouchEnd={swipeEnd} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {persons.map(person => {
            const dayJobs = cellJobs(person.id, day)
            const absence = person.id ? absenceFor(person.id, day) : null
            const available = person.id ? isAvailable(person.id, dayIdx) : false
            const isDrop = dropTarget && !dropTarget.dayOnly && dropTarget.day === day && dropTarget.uid === person.id
            if (!person.id && dayJobs.length === 0) return null
            return (
              <div key={person.id ?? 'none'}
                data-cell-day={day} data-cell-uid={person.id ?? ''}
                onClick={() => openCell(day, person.id)}
                style={{
                  display: 'flex', gap: 10, padding: '9px 11px', borderRadius: 12, cursor: 'pointer',
                  background: absence
                    ? `repeating-linear-gradient(45deg, ${SURFACE}, ${SURFACE} 5px, color-mix(in srgb, ${MUTED} 10%, ${SURFACE}) 5px, color-mix(in srgb, ${MUTED} 10%, ${SURFACE}) 9px)`
                    : SURFACE,
                  border: isDrop ? `2px dashed ${A}` : `1px solid ${BORDER}`,
                  boxShadow: available ? `inset 3px 0 0 ${A}` : 'none',
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 52, flexShrink: 0 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: person.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, color: '#001219', fontWeight: 700 }}>{person.initials}</span>
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: FG, textAlign: 'center', lineHeight: 1.1 }}>{person.name.split(' ')[0]}</span>
                  {absence && <span style={{ fontFamily: MONO, fontSize: 7.5, color: MUTED }}>abwesend</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                  {dayJobs.map(job => <JobChip key={job.id} job={job} uid={person.id} big />)}
                  {dayJobs.length === 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 9, color: `color-mix(in srgb, ${MUTED} 55%, transparent)` }}>
                      {absence ? (absence.reason || 'Abwesend') : '+ Einsatz'}
                    </span>
                  )}
                </div>
                {person.id && isMitarbeiter && (
                  <button onClick={e => { e.stopPropagation(); setAbsenceModal(person.id) }} title="Abwesenheit eintragen" className="lu-btn-ghost"
                    style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, alignSelf: 'center', flexShrink: 0, fontSize: 11 }}>
                    ✈
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ fontFamily: MONO, fontSize: 8.5, color: MUTED, textAlign: 'center', marginTop: 12 }}>
          Wischen = Tag wechseln · Chip gedrückt halten = verschieben
        </div>

        {/* Abwesenheiten dieser Woche */}
        {weekAbsences.length > 0 && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Abwesenheiten in KW {kw}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {weekAbsences.map(a => {
                const u = TEAM.find(t => t.id === a.team_id)
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: MUTED }}>
                    <span style={{ color: FG, fontWeight: 500, minWidth: 60 }}>{u?.name || a.team_id}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10 }}>{fmtShort(a.date_from)} – {fmtShort(a.date_to)}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</span>
                    {isMitarbeiter && (
                      <button onClick={() => removeAbsence(a.id)} className="lu-btn-ghost" style={{ width: 22, height: 22, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <X size={10} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <FloatingDragChip dragging={dragging} projName={projName} />
        {modal && (
          <JobModal initialDate={modal.date} initialJob={selectedJob}
            initialAssignedUsers={modal.uid ? [modal.uid] : undefined}
            onSave={handleSave} onClose={() => { setModal(null); setSelectedJob(null) }} />
        )}
        {absenceModal && (
          <AbsenceModal teamId={absenceModal} onSave={form => addAbsence(absenceModal, form)} onClose={() => setAbsenceModal(null)} />
        )}
      </div>
    )
  }

  // ─────────────────────────── DESKTOP: Wochen-Matrix ───────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {!embedded && (
          <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarRange size={20} color={A} /> Wochenplan
          </h1>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWs(addDays(ws, -7))} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} /></button>
          <div style={{ fontFamily: MONO, fontSize: 13, color: A, fontWeight: 700, minWidth: 190, textAlign: 'center' }}>
            KW {kw} · {fmtShort(days[0])} – {fmtShort(days[6])}{days[0].slice(0, 4)}
          </div>
          <button onClick={() => setWs(addDays(ws, 7))} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={14} /></button>
          <button onClick={goToday} className="lu-btn-ghost" style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12 }}>Heute</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontFamily: MONO, fontSize: 9, color: MUTED, alignItems: 'center', flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, boxShadow: `inset 0 0 0 1.5px ${A}`, verticalAlign: -1, marginRight: 4 }} />verfügbar</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, verticalAlign: -1, marginRight: 4, background: `repeating-linear-gradient(45deg, transparent, transparent 2px, color-mix(in srgb, ${MUTED} 35%, transparent) 2px, color-mix(in srgb, ${MUTED} 35%, transparent) 4px)` }} />abwesend</span>
          <span>Zelle anklicken = anlegen · Chip ziehen = verschieben</span>
        </div>
      </div>

      {/* Matrix */}
      <div ref={matrixRef} style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(7, minmax(120px, 1fr))`, gap: 4, minWidth: 1050 }}>
          {/* Kopfzeile */}
          <div />
          {days.map((d, i) => {
            const isT = d === today
            const wfc = getWeatherForDate(weatherForecast, d)
            return (
              <div key={d} {...(isT ? { 'data-today': true } : {})}
                style={{ padding: '4px 8px', textAlign: 'center' }}>
                <span style={{
                  fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: isT ? 'var(--luma-on-a)' : MUTED, fontWeight: isT ? 700 : 400,
                  background: isT ? A : 'transparent', borderRadius: 6, padding: isT ? '2px 8px' : 0,
                  display: 'inline-block',
                }}>
                  {DAY_LABELS[i]} {fmtShort(d)}{isT ? ' · Heute' : ''}
                </span>
                {wfc && <div style={{ marginTop: 3 }}><WeatherLine wfc={wfc} /></div>}
              </div>
            )
          })}

          {/* Zeilen: Team + "Ohne Zuweisung" */}
          {persons.map(person => (
            <RowFragment key={person.id ?? 'none'} person={person} days={days} today={today}
              cellJobs={cellJobs} isAvailable={isAvailable} absenceFor={absenceFor}
              availability={availability} JobChip={JobChip} dropTarget={dropTarget}
              onCellClick={openCell}
              onAddAbsence={isMitarbeiter ? (uid => setAbsenceModal(uid)) : null}
            />
          ))}
        </div>
      </div>

      {/* Abwesenheiten dieser Woche */}
      {weekAbsences.length > 0 && (
        <div style={{ marginTop: 18, padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Abwesenheiten in KW {kw}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {weekAbsences.map(a => {
              const u = TEAM.find(t => t.id === a.team_id)
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: MUTED }}>
                  <span style={{ color: FG, fontWeight: 500, minWidth: 70 }}>{u?.name || a.team_id}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10 }}>{fmtShort(a.date_from)} – {fmtShort(a.date_to)}</span>
                  <span style={{ flex: 1 }}>{a.reason}</span>
                  {isMitarbeiter && (
                    <button onClick={() => removeAbsence(a.id)} className="lu-btn-ghost" style={{ width: 22, height: 22, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <FloatingDragChip dragging={dragging} projName={projName} />
      {modal && (
        <JobModal
          initialDate={modal.date}
          initialJob={selectedJob}
          initialAssignedUsers={modal.uid ? [modal.uid] : undefined}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelectedJob(null) }}
        />
      )}
      {absenceModal && (
        <AbsenceModal teamId={absenceModal} onSave={form => addAbsence(absenceModal, form)} onClose={() => setAbsenceModal(null)} />
      )}
    </div>
  )
}

// Schwebender Chip am Finger/Cursor während des Drags
function FloatingDragChip({ dragging, projName }) {
  if (!dragging) return null
  const p = projName(dragging.job.project_id)
  return (
    <div style={{
      position: 'fixed', left: dragging.x + 10, top: dragging.y - 44,
      background: CARD, border: `2px solid ${dragging.job.color || A}`,
      borderRadius: 8, padding: '6px 12px', zIndex: 9999, pointerEvents: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)', maxWidth: 200,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: FG, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p?.flaeche_code || p?.name || dragging.job.title}
      </div>
      {dragging.job.start_time && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{dragging.job.start_time}</div>
      )}
    </div>
  )
}

function RowFragment({ person, days, today, cellJobs, isAvailable, absenceFor, availability, JobChip, dropTarget, onCellClick, onAddAbsence }) {
  const avail = person.id ? availability[person.id] : null
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', minHeight: 52 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: person.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 7, color: '#001219', fontWeight: 700 }}>{person.initials}</span>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: FG, whiteSpace: 'nowrap' }}>{person.name}</div>
          {avail?.note && <div style={{ fontSize: 9, color: MUTED, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={avail.note}>{avail.note}</div>}
        </div>
        {person.id && onAddAbsence && (
          <button onClick={() => onAddAbsence(person.id)} title="Abwesenheit eintragen" className="lu-btn-ghost"
            style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10 }}>
            ✈
          </button>
        )}
      </div>
      {days.map((day, i) => {
        const dayJobs = cellJobs(person.id, day)
        const absence = person.id ? absenceFor(person.id, day) : null
        const available = person.id ? isAvailable(person.id, i) : false
        const isDrop = dropTarget && !dropTarget.dayOnly && dropTarget.day === day && dropTarget.uid === person.id
        return (
          <div key={day}
            data-cell-day={day} data-cell-uid={person.id ?? ''}
            onClick={() => onCellClick(day, person.id)}
            style={{
              background: absence
                ? `repeating-linear-gradient(45deg, transparent, transparent 4px, color-mix(in srgb, ${MUTED} 12%, transparent) 4px, color-mix(in srgb, ${MUTED} 12%, transparent) 7px)`
                : day === today ? A08 : CARD,
              border: isDrop ? `2px dashed ${A}` : `1px solid ${BORDER}`,
              boxShadow: available ? `inset 0 0 0 1.5px color-mix(in srgb, ${A} 55%, transparent)` : 'none',
              borderRadius: 8, minHeight: 52, padding: 3, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}
            title={absence ? `Abwesend: ${absence.reason || ''}` : undefined}
          >
            {dayJobs.map(job => <JobChip key={job.id} job={job} uid={person.id} />)}
          </div>
        )
      })}
    </>
  )
}
