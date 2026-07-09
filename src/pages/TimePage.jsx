import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash2, Check, Clock, TrendingUp, FileText, ChevronLeft, ChevronRight, X, Download, Printer, BarChart2 } from 'lucide-react'
import { useTime } from '../context/TimeContext.jsx'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A08, A18, A20 } from '../lib/theme.js'
import { TEAM, HOUR_TARGETS } from '../data/seed.js'
import { genId, isoToday, addDays, weekStart, getWeekDays } from '../lib/storage.js'

const INPUT = {
  background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', width: '100%',
}
const LABEL = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5, display: 'block',
}

function hoursThisWeek(entries, userId, weekDays) {
  return entries.filter(e => e.user_id === userId && weekDays.includes(e.date))
    .reduce((s, e) => s + Number(e.hours), 0)
}

function hoursThisYear(entries, userId) {
  const year = new Date().getFullYear().toString()
  return entries.filter(e => e.user_id === userId && e.date?.startsWith(year))
    .reduce((s, e) => s + Number(e.hours), 0)
}

function hoursForProject(entries, userId, projectId) {
  return entries.filter(e => e.user_id === userId && e.project_id === projectId)
    .reduce((s, e) => s + Number(e.hours), 0)
}

const MONTHS = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

const RANGE_OPTS = [
  { id: 'woche', label: 'Woche' },
  { id: 'monat', label: 'Monat' },
  { id: 'quartal', label: 'Quartal' },
  { id: 'jahr', label: 'Jahr' },
]

function getRangeBounds(range) {
  const today = isoToday()
  const now = new Date(today + 'T00:00:00')
  if (range === 'woche') {
    const ws = weekStart(today)
    return { from: ws, to: addDays(ws, 6) }
  }
  if (range === 'monat') {
    const y = now.getFullYear(), m = now.getMonth() + 1
    return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: today }
  }
  if (range === 'quartal') {
    const y = now.getFullYear(), q = Math.floor(now.getMonth() / 3)
    const qStart = new Date(y, q * 3, 1)
    return { from: qStart.toISOString().slice(0, 10), to: today }
  }
  return { from: `${now.getFullYear()}-01-01`, to: today }
}

function hoursInRange(entries, userId, from, to) {
  return entries.filter(e => e.user_id === userId && e.date >= from && e.date <= to)
    .reduce((s, e) => s + Number(e.hours), 0)
}

function projectHoursInRange(entries, projectId, from, to) {
  return entries.filter(e => e.project_id === projectId && e.date >= from && e.date <= to)
    .reduce((s, e) => s + Number(e.hours), 0)
}

function yearTargetTotal(uid) {
  const t = HOUR_TARGETS[uid]
  if (!t || t.type !== 'weekly') return null
  const year = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) => monthlyTarget(uid, year, i + 1)).reduce((s, v) => s + v, 0)
}

function personKontostand(uid, entries) {
  const t = HOUR_TARGETS[uid]
  if (!t || t.type !== 'weekly') return null
  const year = new Date().getFullYear()
  const nowMonth = new Date().getMonth() + 1
  let cumulative = 0
  for (let m = 1; m <= nowMonth; m++) {
    cumulative += monthlyActual(entries, uid, year, m) - monthlyTarget(uid, year, m)
  }
  return Math.round(cumulative * 10) / 10
}

function monthlyTarget(userId, year, month) {
  const t = HOUR_TARGETS[userId]
  if (!t || t.type !== 'weekly') return 0
  let mondays = 0
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 1) mondays++
    d.setDate(d.getDate() + 1)
  }
  return t.weekly * mondays
}

function monthlyActual(entries, userId, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return entries.filter(e => e.user_id === userId && e.date?.startsWith(prefix))
    .reduce((s, e) => s + Number(e.hours), 0)
}

// ── Log Form ──────────────────────────────────────────────────────────────────
function LogForm({ onSave, prefill, onClose }) {
  const { jobs, projects, chips } = useOps()
  const [form, setForm] = useState({
    user_id: prefill?.user_id || 'malte',
    project_id: prefill?.project_id || '',
    job_id: prefill?.job_id || '',
    date: prefill?.date || isoToday(),
    hours: prefill?.hours || '',
    description: prefill?.description || '',
  })

  const projectJobs = jobs.filter(j => j.project_id === form.project_id && j.status !== 'cancelled')
  const selectedProject = projects.find(p => p.id === form.project_id)

  function submit(e) {
    e.preventDefault()
    if (!form.user_id || !form.project_id || !form.hours) return
    onSave({ ...form, hours: Number(form.hours), job_id: form.job_id || null })
    if (onClose) onClose()
    else setForm(f => ({ ...f, description: '', hours: '', job_id: '' }))
  }

  function appendChip(chip) {
    setForm(f => ({ ...f, description: f.description ? `${f.description}, ${chip}` : chip }))
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <label style={LABEL}>Person *</label>
        <select style={INPUT} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
          {TEAM.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label style={LABEL}>Projekt / Auftraggeber *</label>
        <select style={INPUT} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, job_id: '' }))} required>
          <option value="">Projekt wählen</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` · ${p.client}` : ''}</option>)}
        </select>
        {selectedProject?.client && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 4 }}>
            Auftraggeber: {selectedProject.client}
          </div>
        )}
      </div>
      <div>
        <label style={LABEL}>Datum *</label>
        <input type="date" style={INPUT} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
      </div>
      <div>
        <label style={LABEL}>Stunden *</label>
        <input type="number" min="0.25" max="24" step="0.25" style={INPUT} value={form.hours}
          onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="z.B. 4.5" required />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={LABEL}>
          Kalender-Einsatz
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: 'rgba(232,240,245,0.3)', fontSize: 9 }}>
            — optional, verknüpft Stunden mit einem Job aus dem Kalender
          </span>
        </label>
        <select style={INPUT} value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
          disabled={!form.project_id}>
          <option value="">Kein konkreter Einsatz</option>
          {projectJobs.map(j => <option key={j.id} value={j.id}>{j.title} — {j.date}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={LABEL}>Tätigkeit</label>
        <textarea
          style={{ ...INPUT, height: 72, resize: 'vertical', lineHeight: 1.5 }}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Was wurde gemacht?"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {chips.map(chip => (
            <button key={chip} type="button" onClick={() => appendChip(chip)}
              style={{ padding: '3px 9px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.target.style.borderColor = A; e.target.style.color = A }}
              onMouseLeave={e => { e.target.style.borderColor = BORDER; e.target.style.color = MUTED }}>
              {chip}
            </button>
          ))}
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onClose && <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>}
        <button type="submit" className="lu-btn-primary" style={{ padding: '8px 20px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          Eintragen
        </button>
      </div>
    </form>
  )
}

// ── Tab 1: Erfassen ───────────────────────────────────────────────────────────
function TabErfassen() {
  const { entries, logTime, deleteEntry } = useTime()
  const { projects } = useOps()
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
      {/* Form */}
      <div style={{ padding: '20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
          Stunden eintragen
        </div>
        <LogForm onSave={logTime} />
      </div>

      {/* Recent entries */}
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          Letzte Einträge
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {recent.map(entry => {
            const user = TEAM.find(u => u.id === entry.user_id)
            const project = projects.find(p => p.id === entry.project_id)
            return (
              <div key={entry.id} style={{ padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: user?.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{user?.initials}</span>
                  </div>
                  <span style={{ fontSize: 12, color: FG, fontWeight: 500, minWidth: 42 }}>{user?.name}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1 }}>
                    <span style={{ fontSize: 13, color: FG, fontWeight: 600 }}>{entry.hours}h</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A }}>{project?.name}</span>
                    {project?.client && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>· {project.client}</span>}
                    {entry.invoice_id && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#22EAA7', background: '#22EAA720', padding: '1px 5px', borderRadius: 3 }}>abgerechnet</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.date} · {entry.description || '—'}
                  </div>
                </div>
                {!entry.invoice_id && (
                  <button onClick={() => deleteEntry(entry.id)}
                    className="lu-btn-ghost" style={{ width: 26, height: 26, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            )
          })}
          {recent.length === 0 && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, padding: '12px 0' }}>Noch keine Einträge</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PersonCard ────────────────────────────────────────────────────────────────
function PersonCard({ uid, entries, projects, range }) {
  const u = TEAM.find(t => t.id === uid)
  const t = HOUR_TARGETS[uid]
  const { from, to } = getRangeBounds(range)
  const year = new Date().getFullYear().toString()

  const rangeH = hoursInRange(entries, uid, from, to)
  const yearH = hoursThisYear(entries, uid)
  const weekDays = getWeekDays(weekStart(isoToday()))
  const weekH = hoursThisWeek(entries, uid, weekDays)

  const kontostand = t?.type === 'weekly' ? personKontostand(uid, entries) : null
  const annualTarget = yearTargetTotal(uid)
  const kColor = kontostand === null ? MUTED : kontostand > 0 ? '#22EAA7' : kontostand < 0 ? '#F59E0B' : MUTED

  // Top projects in selected range
  const topProjects = projects
    .map(p => ({ ...p, h: projectHoursInRange(entries, p.id, from, to) }))
    .filter(p => {
      const pEntries = entries.filter(e => e.project_id === p.id && e.user_id === uid && e.date >= from && e.date <= to)
      return pEntries.reduce((s, e) => s + Number(e.hours), 0) > 0
    })
    .map(p => ({
      ...p,
      h: entries.filter(e => e.project_id === p.id && e.user_id === uid && e.date >= from && e.date <= to).reduce((s, e) => s + Number(e.hours), 0)
    }))
    .filter(p => p.h > 0)
    .sort((a, b) => b.h - a.h)
    .slice(0, 5)

  const maxPH = Math.max(...topProjects.map(p => p.h), 1)
  const annualPct = annualTarget ? Math.min(100, (yearH / annualTarget) * 100) : null

  const ROLE_LABELS = { admin: 'Geschäftsführung', manager: 'Management', field: 'Mitarbeiter' }

  return (
    <div style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: FG }}>{u.name}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{ROLE_LABELS[u.role] || u.role}</div>
        </div>
        {kontostand !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: kColor, lineHeight: 1 }}>
              {kontostand > 0 ? '+' : ''}{kontostand}h
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>Kontostand {new Date().getFullYear()}</div>
          </div>
        )}
        {t?.type === 'balance' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: u.color, lineHeight: 1 }}>{yearH}h</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>Jahrestotal</div>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: u.color }}>{rangeH}h</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>
            {range === 'woche' ? 'Diese Woche' : range === 'monat' ? 'Dieser Monat' : range === 'quartal' ? 'Dieses Quartal' : 'Dieses Jahr'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: FG }}>{weekH}h</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>
            {t?.type === 'weekly' ? `Ziel: ${t.weekly}h/Wo` : 'Diese Woche'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: FG }}>{yearH}h</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>
            {annualTarget ? `Soll: ${annualTarget}h` : 'Jahrestotal'}
          </div>
        </div>
      </div>

      {/* Annual progress bar */}
      {annualPct !== null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>Jahresfortschritt</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: annualPct >= 100 ? '#22EAA7' : u.color }}>{annualPct.toFixed(0)}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${annualPct}%`, background: annualPct >= 100 ? '#22EAA7' : u.color, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          {kontostand !== null && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: kColor, marginTop: 4 }}>
              {kontostand === 0 ? '✓ Ausgeglichen' : kontostand > 0 ? `+${kontostand}h Überstunden` : `${kontostand}h Minusstunden`}
            </div>
          )}
        </div>
      )}

      {/* Top projects */}
      {topProjects.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Top Projekte</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topProjects.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.name}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: u.color, flexShrink: 0 }}>{p.h}h</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 2, height: 3 }}>
                  <div style={{ width: `${(p.h / maxPH) * 100}%`, height: '100%', background: u.color, borderRadius: 2, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {topProjects.length === 0 && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>Keine Einträge im gewählten Zeitraum</div>
      )}
    </div>
  )
}

// ── Tab 2: Übersicht ──────────────────────────────────────────────────────────
function KontostandCard({ uid, entries }) {
  const u = TEAM.find(t => t.id === uid)
  const year = new Date().getFullYear()
  const nowMonth = new Date().getMonth() + 1

  const monthData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const soll = monthlyTarget(uid, year, m)
    const ist = m <= nowMonth ? monthlyActual(entries, uid, year, m) : null
    const saldo = ist !== null ? ist - soll : null
    return { m, soll, ist, saldo }
  })

  let cumulative = 0
  const monthDataWithCum = monthData.map(d => {
    if (d.saldo !== null) cumulative += d.saldo
    return { ...d, kum: d.saldo !== null ? cumulative : null }
  })

  const kontostand = monthDataWithCum[nowMonth - 1]?.kum ?? 0
  const kColor = kontostand > 0 ? '#22EAA7' : kontostand < 0 ? '#F59E0B' : MUTED

  const ROWSTYLE = { fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, paddingRight: 12, textTransform: 'uppercase', whiteSpace: 'nowrap', verticalAlign: 'middle', paddingBottom: 3 }
  const CELLSTYLE = (i) => ({ fontFamily: "'Space Mono', monospace", fontSize: 10, textAlign: 'center', padding: '2px 5px', background: i + 1 === nowMonth ? 'rgba(8,170,86,0.07)' : 'transparent', verticalAlign: 'middle' })

  return (
    <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{u.name}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>Jahres-Kontostand {year}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: kColor, lineHeight: 1 }}>
            {kontostand > 0 ? '+' : ''}{kontostand}h
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 2 }}>Kontostand</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr>
              <td style={ROWSTYLE}></td>
              {MONTHS.map((label, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), fontFamily: "'Space Mono', monospace", fontSize: 9, color: i + 1 === nowMonth ? A : MUTED, fontWeight: i + 1 === nowMonth ? 700 : 400, paddingBottom: 6 }}>{label}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={ROWSTYLE}>Soll</td>
              {monthDataWithCum.map((d, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), color: MUTED }}>{d.soll}h</td>
              ))}
            </tr>
            <tr>
              <td style={ROWSTYLE}>Ist</td>
              {monthDataWithCum.map((d, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), color: d.ist !== null ? FG : 'rgba(232,240,245,0.2)' }}>
                  {d.ist !== null ? `${d.ist}h` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td style={ROWSTYLE}>Saldo</td>
              {monthDataWithCum.map((d, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), color: d.saldo === null ? 'rgba(232,240,245,0.2)' : d.saldo >= 0 ? '#22EAA7' : '#F59E0B', fontWeight: d.saldo !== null ? 500 : 400 }}>
                  {d.saldo === null ? '—' : (d.saldo >= 0 ? `+${d.saldo}` : `${d.saldo}`)}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ ...ROWSTYLE, paddingTop: 6, borderTop: `1px solid ${BORDER}` }}>Konto</td>
              {monthDataWithCum.map((d, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), color: d.kum === null ? 'rgba(232,240,245,0.2)' : d.kum > 0 ? '#22EAA7' : d.kum < 0 ? '#F59E0B' : MUTED, borderTop: `1px solid ${BORDER}` }}>
                  {d.kum === null ? '—' : (d.kum > 0 ? `+${d.kum}` : `${d.kum}`)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabUebersicht() {
  const { entries } = useTime()
  const { projects } = useOps()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const today = isoToday()
  const [range, setRange] = useState('jahr')

  // Visible persons: admins see everyone, others see themselves + field workers under them
  const visibleUids = isAdmin
    ? ['malte', 'lukas', 'jona', 'anselm', 'robert']
    : [user?.id].filter(Boolean)

  // GF balance (admins only)
  const maltH = hoursThisYear(entries, 'malte')
  const lukasH = hoursThisYear(entries, 'lukas')
  const balanceDiff = maltH - lukasH

  // Field worker Kontostand cards (monthly detail table)
  const fieldUids = ['jona', 'anselm'].filter(uid => isAdmin || user?.id === uid)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Zeitraum:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTS.map(opt => (
            <button key={opt.id} onClick={() => setRange(opt.id)}
              style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${range === opt.id ? A : BORDER}`, background: range === opt.id ? A : 'transparent', color: range === opt.id ? '#001219' : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: range === opt.id ? 500 : 400, fontFamily: "'Space Grotesk', sans-serif", transition: 'all 0.15s' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* GF balance — admin only */}
      {isAdmin && (
        <div style={{ padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>GF Balance {new Date().getFullYear()}</div>
          {['malte', 'lukas'].map(uid => {
            const u = TEAM.find(t => t.id === uid)
            const h = uid === 'malte' ? maltH : lukasH
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                </div>
                <span style={{ fontSize: 13, color: FG }}>{u.name}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: u.color }}>{h}h</span>
              </div>
            )
          })}
          <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 11, color: Math.abs(balanceDiff) < 5 ? '#22EAA7' : '#F59E0B' }}>
            {Math.abs(balanceDiff) < 2 ? '✓ Ausgeglichen' : balanceDiff > 0 ? `Malte +${balanceDiff.toFixed(1)}h` : `Lukas +${Math.abs(balanceDiff).toFixed(1)}h`}
          </div>
        </div>
      )}

      {/* Person cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {visibleUids.map(uid => (
          <PersonCard key={uid} uid={uid} entries={entries} projects={projects} range={range} />
        ))}
      </div>

      {/* Kontostand monthly detail tables for field workers */}
      {fieldUids.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Monatliche Soll / Ist / Saldo</div>
          {fieldUids.map(uid => <KontostandCard key={uid} uid={uid} entries={entries} />)}
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Abrechnung ─────────────────────────────────────────────────────────
function TabAbrechnung() {
  const { entries, invoices, createInvoice, markPaid, deleteInvoice } = useTime()
  const { projects } = useOps()
  const [filterProject, setFilterProject] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [newInvoice, setNewInvoice] = useState(null) // { project_id, entry_ids }
  const [invForm, setInvForm] = useState({ invoice_number: '', date_issued: isoToday(), amount: '', notes: '' })

  const filteredForExport = entries.filter(e =>
    (!filterProject || e.project_id === filterProject) &&
    (!filterUser || e.user_id === filterUser) &&
    (!filterFrom || e.date >= filterFrom) &&
    (!filterTo || e.date <= filterTo)
  ).sort((a, b) => a.date.localeCompare(b.date))

  const exportLabel = [
    filterProject ? projects.find(p => p.id === filterProject)?.name : 'Alle Projekte',
    filterUser ? TEAM.find(u => u.id === filterUser)?.name : 'Alle Personen',
    filterFrom || filterTo ? `${filterFrom || '…'} – ${filterTo || '…'}` : null,
  ].filter(Boolean).join(' · ')

  // Group unbilled entries by project
  const unbilled = entries.filter(e => !e.invoice_id)
  const unbilledByProject = projects.map(p => {
    const pEntries = unbilled.filter(e => e.project_id === p.id && (!filterUser || e.user_id === filterUser))
    if (!pEntries.length) return null
    return { project: p, entries: pEntries, totalHours: pEntries.reduce((s, e) => s + Number(e.hours), 0) }
  }).filter(Boolean)

  function openInvoiceForm(projectId, entryIds) {
    setNewInvoice({ project_id: projectId, entry_ids: entryIds })
    setInvForm({ invoice_number: '', date_issued: isoToday(), amount: '', notes: '' })
  }

  function submitInvoice(e) {
    e.preventDefault()
    const project = projects.find(p => p.id === newInvoice.project_id)
    createInvoice({
      ...newInvoice,
      client: project?.client || '',
      invoice_number: invForm.invoice_number,
      date_issued: invForm.date_issued,
      amount: Number(invForm.amount),
      notes: invForm.notes,
      total_hours: entries.filter(e => newInvoice.entry_ids.includes(e.id)).reduce((s, e) => s + Number(e.hours), 0),
    })
    setNewInvoice(null)
  }

  const filteredInvoices = invoices.filter(inv => !filterProject || inv.project_id === filterProject)

  return (
    <div>
      {/* Filters + Export */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Filter &amp; Export</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <select style={INPUT} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">Alle Projekte</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={INPUT} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">Alle Personen</option>
            {TEAM.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" style={INPUT} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="Von" title="Von Datum" />
          <input type="date" style={INPUT} value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="Bis" title="Bis Datum" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, flex: 1 }}>
            {filteredForExport.length} Einträge · {filteredForExport.reduce((s, e) => s + Number(e.hours), 0)}h
          </span>
          <button
            onClick={() => exportCSV(filteredForExport, invoices, projects)}
            disabled={!filteredForExport.length}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: filteredForExport.length ? A18 : 'transparent', border: `1px solid ${filteredForExport.length ? A + '50' : BORDER}`, color: filteredForExport.length ? A : MUTED, cursor: filteredForExport.length ? 'pointer' : 'default', fontSize: 12 }}>
            <Download size={12} /> CSV
          </button>
          <button
            onClick={() => exportPDF(filteredForExport, invoices, exportLabel, projects)}
            disabled={!filteredForExport.length}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: filteredForExport.length ? 'rgba(255,255,255,0.05)' : 'transparent', border: `1px solid ${BORDER}`, color: filteredForExport.length ? FG : MUTED, cursor: filteredForExport.length ? 'pointer' : 'default', fontSize: 12 }}>
            <Printer size={12} /> PDF / Drucken
          </button>
        </div>
      </div>

      {/* Unbilled hours */}
      {unbilledByProject.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Nicht abgerechnet</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unbilledByProject.filter(g => !filterProject || g.project.id === filterProject).map(({ project, entries: pEntries, totalHours }) => (
              <div key={project.id} style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{project.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{project.client}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>{totalHours}h</span>
                    <button
                      onClick={() => openInvoiceForm(project.id, pEntries.map(e => e.id))}
                      className="lu-btn-primary" style={{ padding: '6px 12px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      Rechnung erstellen
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {pEntries.map(entry => {
                    const user = TEAM.find(u => u.id === entry.user_id)
                    return (
                      <div key={entry.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: MUTED }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, minWidth: 80 }}>{entry.date}</span>
                        <span style={{ width: 24, height: 18, borderRadius: '50%', background: user?.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{user?.initials}</span>
                        </span>
                        <span style={{ color: FG, fontWeight: 500 }}>{entry.hours}h</span>
                        <span style={{ flex: 1 }}>{entry.description}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice form modal */}
      {newInvoice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={() => setNewInvoice(null)} />
          <div style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Rechnung erstellen</div>
              <button onClick={() => setNewInvoice(null)} style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={submitInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>Rechnungsnummer *</label>
                  <input style={INPUT} value={invForm.invoice_number} onChange={e => setInvForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="RE-2026-004" required />
                </div>
                <div>
                  <label style={LABEL}>Datum *</label>
                  <input type="date" style={INPUT} value={invForm.date_issued} onChange={e => setInvForm(f => ({ ...f, date_issued: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label style={LABEL}>Betrag (€)</label>
                <input type="number" min="0" step="0.01" style={INPUT} value={invForm.amount} onChange={e => setInvForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label style={LABEL}>Notizen</label>
                <input style={INPUT} value={invForm.notes} onChange={e => setInvForm(f => ({ ...f, notes: e.target.value }))} placeholder="z.B. Pflege KW 22" />
              </div>
              <div style={{ padding: '10px 14px', background: A08, border: `1px solid ${A20}`, borderRadius: 6, fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>
                {entries.filter(e => newInvoice.entry_ids.includes(e.id)).reduce((s, e) => s + Number(e.hours), 0)}h werden als abgerechnet markiert
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setNewInvoice(null)} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
                <button type="submit" className="lu-btn-primary" style={{ padding: '8px 20px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Rechnung anlegen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing invoices */}
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Rechnungen</div>
        {filteredInvoices.length === 0 && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, padding: '8px 0' }}>Noch keine Rechnungen</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...filteredInvoices].sort((a, b) => b.date_issued.localeCompare(a.date_issued)).map(inv => {
            const project = projects.find(p => p.id === inv.project_id)
            const paid = !!inv.date_paid
            return (
              <div key={inv.id} style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${paid ? '#22EAA730' : BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: FG, fontWeight: 500 }}>{inv.invoice_number}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 10, background: paid ? '#22EAA720' : '#F59E0B20', color: paid ? '#22EAA7' : '#F59E0B', border: `1px solid ${paid ? '#22EAA740' : '#F59E0B40'}` }}>
                      {paid ? `bezahlt ${inv.date_paid}` : 'offen'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED }}>
                    {project?.name} · {inv.client} · {inv.total_hours}h · {inv.date_issued}
                    {inv.amount ? ` · ${inv.amount.toLocaleString('de-DE')} €` : ''}
                  </div>
                  {inv.notes && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{inv.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!paid && (
                    <button onClick={() => markPaid(inv.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, background: '#22EAA718', border: '1px solid #22EAA740', color: '#22EAA7', cursor: 'pointer', fontSize: 12 }}>
                      <Check size={11} /> Als bezahlt
                    </button>
                  )}
                  <button onClick={() => deleteInvoice(inv.id)}
                    className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────────────────
function exportCSV(filteredEntries, allInvoices, projects) {
  const invMap = Object.fromEntries(allInvoices.map(inv => [inv.id, inv.invoice_number]))
  const rows = [
    ['Datum', 'Person', 'Projekt', 'Kunde', 'Stunden', 'Tätigkeit', 'Abgerechnet', 'Rechnung-Nr', 'Bezahlt'],
    ...filteredEntries.map(e => {
      const user = TEAM.find(u => u.id === e.user_id)
      const project = projects.find(p => p.id === e.project_id)
      const inv = e.invoice_id ? allInvoices.find(i => i.id === e.invoice_id) : null
      return [
        e.date, user?.name || e.user_id, project?.name || e.project_id,
        project?.client || '', e.hours, e.description || '',
        e.invoice_id ? 'Ja' : 'Nein',
        inv?.invoice_number || '',
        inv?.date_paid ? inv.date_paid : (e.invoice_id ? 'Offen' : ''),
      ]
    })
  ]
  const csv = '﻿' + rows.map(r =>
    r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
  ).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `luma-zeiten-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(filteredEntries, allInvoices, filterLabel, projects) {
  const invMap = Object.fromEntries(allInvoices.map(inv => [inv.id, inv]))
  const totalHours = filteredEntries.reduce((s, e) => s + Number(e.hours), 0)
  const rows = filteredEntries.map(e => {
    const user = TEAM.find(u => u.id === e.user_id)
    const project = projects.find(p => p.id === e.project_id)
    const inv = e.invoice_id ? invMap[e.invoice_id] : null
    return `<tr>
      <td>${e.date}</td>
      <td>${user?.name || e.user_id}</td>
      <td>${project?.name || e.project_id}</td>
      <td>${e.hours}h</td>
      <td>${e.description || '—'}</td>
      <td>${inv?.invoice_number || (e.invoice_id ? '…' : '—')}</td>
      <td style="color:${inv?.date_paid ? '#16a34a' : (e.invoice_id ? '#d97706' : '#6b7280')}">${inv?.date_paid ? `Bezahlt ${inv.date_paid}` : (e.invoice_id ? 'Offen' : '—')}</td>
    </tr>`
  }).join('')
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
    <title>LUMA Stundennachweis</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 32px; }
      h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
      .meta { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 6px 10px; border-bottom: 2px solid #e5e7eb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
      td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      tr:last-child td { border-bottom: none; }
      .total { margin-top: 16px; font-weight: 600; font-size: 13px; }
      @media print { body { margin: 16px; } }
    </style></head><body>
    <h1>LUMA Ops — Stundennachweis</h1>
    <div class="meta">${filterLabel} · Erstellt: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    <table>
      <thead><tr><th>Datum</th><th>Person</th><th>Projekt</th><th>Std.</th><th>Tätigkeit</th><th>Rechnung</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">Gesamt: ${totalHours}h</div>
    <script>window.onload = () => window.print()</script>
  </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

// ── ISO week helper ───────────────────────────────────────────────────────────
function getISOWeek(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7)
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}

// ── Tab 4: Statistiken ────────────────────────────────────────────────────────
function StackedBarChart({ weeks, persons }) {
  const totals = weeks.map(w => persons.reduce((s, p) => s + (w.hours[p.id] || 0), 0))
  const maxH = Math.max(...totals, 1)
  const svgH = 160
  const labelH = 22
  const chartH = svgH - labelH
  const barCount = weeks.length
  const barW = 36
  const gap = 10
  const totalW = barCount * (barW + gap) - gap

  return (
    <svg viewBox={`0 0 ${totalW} ${svgH}`} style={{ width: '100%', height: svgH, overflow: 'visible' }}>
      {weeks.map((week, wi) => {
        const x = wi * (barW + gap)
        let yBottom = chartH
        return (
          <g key={wi}>
            {persons.map(p => {
              const h = week.hours[p.id] || 0
              if (!h) return null
              const barH = Math.max(2, (h / maxH) * chartH)
              yBottom -= barH
              return (
                <rect key={p.id} x={x} y={yBottom} width={barW} height={barH}
                  fill={p.color} opacity={0.85} rx={2} />
              )
            })}
            {totals[wi] > 0 && (
              <text x={x + barW / 2} y={yBottom - 4} textAnchor="middle"
                fontSize={8} fill="rgba(232,240,245,0.5)" fontFamily="'Space Mono', monospace">
                {totals[wi]}h
              </text>
            )}
            <text x={x + barW / 2} y={svgH - 4} textAnchor="middle"
              fontSize={8} fill="rgba(232,240,245,0.35)" fontFamily="'Space Mono', monospace">
              {week.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function TabStatistiken() {
  const { entries } = useTime()
  const { projects } = useOps()
  const today = isoToday()
  const [range, setRange] = useState('jahr')

  const persons = TEAM.filter(t => ['malte', 'lukas', 'jona', 'anselm'].includes(t.id))
  const { from, to } = getRangeBounds(range)

  // Build chart buckets depending on range
  const chartBuckets = useMemo(() => {
    if (range === 'woche') {
      const ws = weekStart(today)
      const days = getWeekDays(ws)
      const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
      return days.map((d, i) => {
        const hours = {}
        persons.forEach(p => {
          hours[p.id] = entries.filter(e => e.user_id === p.id && e.date === d).reduce((s, e) => s + Number(e.hours), 0)
        })
        return { label: DAY_LABELS[i], hours }
      })
    }
    if (range === 'monat') {
      // Last 4 weeks
      return Array.from({ length: 4 }, (_, i) => {
        const ws = weekStart(addDays(today, -(3 - i) * 7))
        const days = getWeekDays(ws)
        const kw = getISOWeek(new Date(ws + 'T00:00:00'))
        const hours = {}
        persons.forEach(p => {
          hours[p.id] = entries.filter(e => e.user_id === p.id && days.includes(e.date)).reduce((s, e) => s + Number(e.hours), 0)
        })
        return { label: `KW${kw}`, hours }
      })
    }
    if (range === 'quartal') {
      // Last 8 weeks
      return Array.from({ length: 8 }, (_, i) => {
        const ws = weekStart(addDays(today, -(7 - i) * 7))
        const days = getWeekDays(ws)
        const kw = getISOWeek(new Date(ws + 'T00:00:00'))
        const hours = {}
        persons.forEach(p => {
          hours[p.id] = entries.filter(e => e.user_id === p.id && days.includes(e.date)).reduce((s, e) => s + Number(e.hours), 0)
        })
        return { label: `KW${kw}`, hours }
      })
    }
    // 'jahr' — 12 months
    const year = new Date().getFullYear()
    return MONTHS.map((label, mi) => {
      const prefix = `${year}-${String(mi + 1).padStart(2, '0')}`
      const hours = {}
      persons.forEach(p => {
        hours[p.id] = entries.filter(e => e.user_id === p.id && e.date?.startsWith(prefix)).reduce((s, e) => s + Number(e.hours), 0)
      })
      return { label, hours }
    })
  }, [range, entries])

  // KPI: hours in selected range per person
  const personRangeH = persons.map(p => ({
    ...p,
    h: hoursInRange(entries, p.id, from, to),
  }))

  // Hours by project in selected range
  const projectHours = projects
    .map(p => ({ ...p, hours: projectHoursInRange(entries, p.id, from, to) }))
    .filter(p => p.hours > 0)
    .sort((a, b) => b.hours - a.hours)

  const maxProjectH = Math.max(...projectHours.map(p => p.hours), 1)
  const totalRange = entries.filter(e => e.date >= from && e.date <= to).reduce((s, e) => s + Number(e.hours), 0)

  const RANGE_CHART_LABELS = { woche: 'Diese Woche', monat: 'Letzte 4 Wochen', quartal: 'Letzte 8 Wochen', jahr: `Monatlich ${new Date().getFullYear()}` }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Zeitraum:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTS.map(opt => (
            <button key={opt.id} onClick={() => setRange(opt.id)}
              style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${range === opt.id ? A : BORDER}`, background: range === opt.id ? A : 'transparent', color: range === opt.id ? '#001219' : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: range === opt.id ? 500 : 400, fontFamily: "'Space Grotesk', sans-serif", transition: 'all 0.15s' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {personRangeH.map(p => {
          const kontostand = personKontostand(p.id, entries)
          return (
            <div key={p.id} style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{p.initials}</span>
                </div>
                <span style={{ fontSize: 12, color: FG }}>{p.name}</span>
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: p.color, marginBottom: 4, lineHeight: 1 }}>{p.h}h</div>
              {kontostand !== null && (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: kontostand > 0 ? '#22EAA7' : kontostand < 0 ? '#F59E0B' : MUTED }}>
                  {kontostand > 0 ? `+${kontostand}h` : `${kontostand}h`} Konto
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
          {RANGE_CHART_LABELS[range]}
        </div>
        <StackedBarChart weeks={chartBuckets} persons={persons} />
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {persons.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, opacity: 0.85 }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hours by project */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Stunden nach Projekt</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, marginLeft: 'auto' }}>{totalRange}h gesamt</div>
        </div>
        {projectHours.length === 0 ? (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>Keine Einträge im Zeitraum</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projectHours.map(p => {
              const perPerson = persons.map(per => ({
                ...per,
                h: entries.filter(e => e.project_id === p.id && e.user_id === per.id && e.date >= from && e.date <= to).reduce((s, e) => s + Number(e.hours), 0),
              })).filter(per => per.h > 0)
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: FG }}>{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {perPerson.map(per => (
                        <span key={per.id} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: per.color }}>{per.initials} {per.h}h</span>
                      ))}
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A }}>{p.hours}h</span>
                    </div>
                  </div>
                  <div style={{ background: A06, borderRadius: 3, height: 6, overflow: 'hidden', display: 'flex' }}>
                    {perPerson.map((per, i) => (
                      <div key={per.id} style={{ width: `${(per.h / maxProjectH) * 100}%`, height: '100%', background: per.color, opacity: 0.8, borderRadius: i === 0 ? '3px 0 0 3px' : i === perPerson.length - 1 ? '0 3px 3px 0' : 0, transition: 'width 0.4s' }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'erfassen', label: 'Erfassen', icon: Clock },
  { id: 'uebersicht', label: 'Übersicht', icon: TrendingUp },
  { id: 'statistiken', label: 'Statistiken', icon: BarChart2 },
  { id: 'abrechnung', label: 'Abrechnung', icon: FileText },
]

const ADMIN_TABS = new Set(['statistiken', 'abrechnung'])

export default function TimePage() {
  const [tab, setTab] = useState('erfassen')
  const { entries } = useTime()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const unbilledCount = entries.filter(e => !e.invoice_id).length

  const visibleTabs = TABS.filter(t => !ADMIN_TABS.has(t.id) || isAdmin)

  // If current tab is no longer accessible (e.g. after role change), reset
  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : 'erfassen'

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0 }}>Zeiterfassung</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: A06, borderRadius: 8, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 6, border: 'none',
              background: activeTab === id ? A : 'transparent',
              color: activeTab === id ? '#001219' : MUTED,
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === id ? 500 : 400,
              fontFamily: "'Space Grotesk', sans-serif",
              position: 'relative',
            }}>
            <Icon size={13} />
            {label}
            {id === 'abrechnung' && unbilledCount > 0 && activeTab !== 'abrechnung' && (
              <span style={{ position: 'absolute', top: 4, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#F59E0B', color: '#001219', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unbilledCount > 9 ? '9+' : unbilledCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'erfassen' && <TabErfassen />}
      {activeTab === 'uebersicht' && <TabUebersicht />}
      {activeTab === 'statistiken' && <TabStatistiken />}
      {activeTab === 'abrechnung' && <TabAbrechnung />}
    </div>
  )
}
