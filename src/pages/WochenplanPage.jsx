import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarRange, Pencil, X } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { TEAM } from '../data/seed.js'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A08, A14, WARN } from '../lib/theme.js'
import { Avatar, INPUT_STYLE, LABEL_STYLE, Modal, ModalActions } from '../components/ui.jsx'
import JobModal from '../components/JobModal.jsx'
import { isoToday, addDays, weekStart, getWeekDays, genId } from '../lib/storage.js'

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
const WEEKDAY_NAMES = { mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag' }

function fmtShort(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

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

export default function WochenplanPage() {
  const { jobs, projects, vehicles, createJob, updateJob, createRecurring } = useOps()
  const { isMitarbeiter } = useAuth()
  // "Heute" als State: die Capacitor-App lebt oft tagelang im Speicher — ohne
  // Refresh zeigt ein stehen gebliebenes `today` sonst auf ein altes Datum.
  const [today, setToday] = useState(isoToday())
  const [ws, setWs] = useState(weekStart(today))
  const matrixRef = useRef(null)

  useEffect(() => {
    const refresh = () => setToday(isoToday())
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  // Springt zur aktuellen Woche UND scrollt die Heute-Spalte in Sicht —
  // auf schmalen Screens ist die Matrix horizontal gescrollt, dort wirkte
  // der Button sonst wie „ohne Funktion".
  function goToday() {
    const t = isoToday()
    setToday(t)
    setWs(weekStart(t))
    setTimeout(() => {
      matrixRef.current?.querySelector('[data-today]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }, 60)
  }
  const [modal, setModal] = useState(null)        // { date, uid } | { job }
  const [selectedJob, setSelectedJob] = useState(null)
  const [absenceModal, setAbsenceModal] = useState(null) // teamId
  const [availability, setAvailability] = useState({})   // { teamId: { weekdays, note } }
  const [absences, setAbsences] = useState([])

  const days = getWeekDays(ws)
  const kw = isoWeekOf(days[3]) // Donnerstag bestimmt die ISO-Woche

  useEffect(() => {
    sb.from('user_availability').select('*').then(({ data }) =>
      setAvailability(Object.fromEntries((data || []).map(r => [r.team_id, r]))))
    sb.from('user_absences').select('*').then(({ data }) => setAbsences(data || []))
  }, [])

  const projName = id => projects.find(p => p.id === id)
  const vehName = id => vehicles.find(v => v.id === id)?.name

  function cellJobs(uid, day) {
    return jobs.filter(j => jobOnDay(j, day) && (uid ? (j.assigned_users || []).includes(uid) : !(j.assigned_users || []).length))
  }

  function isAvailable(uid, dayIdx) {
    const wd = availability[uid]?.weekdays
    if (!wd || !Object.values(wd).some(Boolean)) return false
    return !!wd[WEEKDAY_KEYS[dayIdx]]
  }

  function absenceFor(uid, day) {
    return absences.find(a => a.team_id === uid && a.date_from <= day && day <= a.date_to)
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

  const weekAbsences = useMemo(() =>
    absences.filter(a => a.date_from <= days[6] && days[0] <= a.date_to), [absences, ws])

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarRange size={20} color={A} /> Wochenplan
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWs(addDays(ws, -7))} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} /></button>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: A, fontWeight: 700, minWidth: 190, textAlign: 'center' }}>
            KW {kw} · {fmtShort(days[0])} – {fmtShort(days[6])}{days[0].slice(0, 4)}
          </div>
          <button onClick={() => setWs(addDays(ws, 7))} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={14} /></button>
          <button onClick={goToday} className="lu-btn-ghost" style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12 }}>Heute</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, alignItems: 'center', flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, boxShadow: `inset 0 0 0 1.5px ${A}`, verticalAlign: -1, marginRight: 4 }} />verfügbar</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, verticalAlign: -1, marginRight: 4, background: `repeating-linear-gradient(45deg, transparent, transparent 2px, color-mix(in srgb, ${MUTED} 35%, transparent) 2px, color-mix(in srgb, ${MUTED} 35%, transparent) 4px)` }} />abwesend</span>
          <span>Zelle anklicken = Einsatz anlegen</span>
        </div>
      </div>

      {/* Matrix */}
      <div ref={matrixRef} style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(7, minmax(120px, 1fr))`, gap: 4, minWidth: 1050 }}>
          {/* Kopfzeile */}
          <div />
          {days.map((d, i) => (
            <div key={d} {...(d === today ? { 'data-today': true } : {})} style={{ padding: '4px 8px', textAlign: 'center' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: d === today ? A : MUTED, fontWeight: d === today ? 700 : 400 }}>
                {DAY_LABELS[i]} {fmtShort(d)}
              </span>
            </div>
          ))}

          {/* Zeilen: Team + "Ohne Zuweisung" */}
          {[...TEAM, { id: null, name: 'Ohne Zuweisung', color: MUTED, initials: '?' }].map(person => (
            <RowFragment key={person.id ?? 'none'} person={person} days={days} today={today}
              cellJobs={cellJobs} isAvailable={isAvailable} absenceFor={absenceFor}
              availability={availability} projName={projName} vehName={vehName}
              onCellClick={(day, uid) => { setSelectedJob(null); setModal({ date: day, uid }) }}
              onJobClick={job => { setSelectedJob(job); setModal({ job, date: job.date }) }}
              onAddAbsence={isMitarbeiter ? (uid => setAbsenceModal(uid)) : null}
            />
          ))}
        </div>
      </div>

      {/* Abwesenheiten dieser Woche */}
      {weekAbsences.length > 0 && (
        <div style={{ marginTop: 18, padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Abwesenheiten in KW {kw}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {weekAbsences.map(a => {
              const u = TEAM.find(t => t.id === a.team_id)
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: MUTED }}>
                  <span style={{ color: FG, fontWeight: 500, minWidth: 70 }}>{u?.name || a.team_id}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{fmtShort(a.date_from)} – {fmtShort(a.date_to)}</span>
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

function RowFragment({ person, days, today, cellJobs, isAvailable, absenceFor, availability, projName, vehName, onCellClick, onJobClick, onAddAbsence }) {
  const avail = person.id ? availability[person.id] : null
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', minHeight: 52 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: person.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{person.initials}</span>
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
        return (
          <div key={day}
            onClick={() => onCellClick(day, person.id)}
            style={{
              background: absence
                ? `repeating-linear-gradient(45deg, transparent, transparent 4px, color-mix(in srgb, ${MUTED} 12%, transparent) 4px, color-mix(in srgb, ${MUTED} 12%, transparent) 7px)`
                : day === today ? A08 : CARD,
              border: `1px solid ${BORDER}`,
              boxShadow: available ? `inset 0 0 0 1.5px color-mix(in srgb, ${A} 55%, transparent)` : 'none',
              borderRadius: 8, minHeight: 52, padding: 3, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}
            title={absence ? `Abwesend: ${absence.reason || ''}` : undefined}
          >
            {dayJobs.map(job => {
              const p = projName(job.project_id)
              const vehicles = (job.vehicle_ids || []).map(vehName).filter(Boolean)
              return (
                <div key={job.id}
                  onClick={e => { e.stopPropagation(); onJobClick(job) }}
                  style={{
                    background: A14, borderLeft: `3px solid ${job.color || A}`,
                    borderRadius: 5, padding: '3px 6px', fontSize: 10, lineHeight: 1.35, color: FG,
                  }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p?.flaeche_code || p?.name || job.title}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[job.start_time, vehicles.length ? `🚐 ${vehicles.join(', ')}` : null].filter(Boolean).join(' · ') || job.title}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
