import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash2, Check, Clock, TrendingUp, FileText, ChevronDown, ChevronUp, Download, Printer, ListOrdered, FileBarChart } from 'lucide-react'
import { useTime } from '../context/TimeContext.jsx'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A08, A18, A20, OK, WARN } from '../lib/theme.js'
import { Modal, ModalActions, EmptyState } from '../components/ui.jsx'
import { TEAM, TASK_TYPES } from '../data/seed.js'
import { genId, isoToday, addDays, weekStart, getWeekDays } from '../lib/storage.js'
import { normalizeRule, hasKonto, kontostand, kontoMonthData, yearTargetTotal as ruleYearTarget, hoursFromTimes } from '../lib/hourAccounts.js'
import { useIsMobile } from '../lib/useBreakpoint.js'

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

// SOLL-Regeln kommen aus Supabase (hour_rules) mit seed.js-Fallback —
// die Rechenlogik liegt in ../lib/hourAccounts.js.
function ruleFor(hourRules, uid) {
  return normalizeRule(hourRules?.[uid], uid)
}

// ── Log Form ──────────────────────────────────────────────────────────────────
function LogForm({ onSave, prefill, onClose }) {
  const { jobs, projects, chips } = useOps()
  const isMobile = useIsMobile(560)
  const [form, setForm] = useState({
    user_id: prefill?.user_id || 'malte',
    project_id: prefill?.project_id || '',
    job_id: prefill?.job_id || '',
    date: prefill?.date || isoToday(),
    start_time: prefill?.start_time || '',
    end_time: prefill?.end_time || '',
    hours: prefill?.hours || '',
    description: prefill?.description || '',
  })

  const projectJobs = jobs.filter(j => j.project_id === form.project_id && j.status !== 'cancelled')
  const selectedProject = projects.find(p => p.id === form.project_id)

  // Start/Ende gesetzt → Stunden automatisch berechnen (bleiben überschreibbar)
  function setTime(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value }
      const auto = hoursFromTimes(next.start_time, next.end_time)
      if (auto !== null) next.hours = String(auto)
      return next
    })
  }

  function submit(e) {
    e.preventDefault()
    if (!form.user_id || !form.project_id || !form.hours) return
    onSave({ ...form, hours: Number(form.hours), job_id: form.job_id || null, start_time: form.start_time || null, end_time: form.end_time || null })
    if (onClose) onClose()
    else setForm(f => ({ ...f, description: '', hours: '', start_time: '', end_time: '', job_id: '' }))
  }

  function appendChip(chip) {
    setForm(f => ({ ...f, description: f.description ? `${f.description}, ${chip}` : chip }))
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
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
        <input type="number" min="0" max="24" step="0.01" style={INPUT} value={form.hours}
          onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="z.B. 4.5" required />
      </div>
      <div>
        <label style={LABEL}>Einsatzstart</label>
        <input type="time" style={INPUT} value={form.start_time} onChange={e => setTime('start_time', e.target.value)} />
      </div>
      <div>
        <label style={LABEL}>Einsatzende
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: MUTED, fontSize: 9 }}>— Stunden werden automatisch berechnet</span>
        </label>
        <input type="time" style={INPUT} value={form.end_time} onChange={e => setTime('end_time', e.target.value)} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={LABEL}>
          Kalender-Einsatz
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: MUTED, fontSize: 9 }}>
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
            <button key={chip} type="button" onClick={() => appendChip(chip)} className="lu-chip"
              style={{ padding: '3px 9px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
              {chip}
            </button>
          ))}
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onClose && <button type="button" onClick={onClose} className="lu-btn-ghost" style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>}
        <button type="submit" className="lu-btn-primary" style={{ padding: '8px 20px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          Eintragen
        </button>
      </div>
    </form>
  )
}

// ── Tab 1: Erfassen — nur das Formular, responsiv über die volle Breite ──────
function TabErfassen({ onSaved }) {
  const { logTime } = useTime()
  const [savedMsg, setSavedMsg] = useState(false)

  function save(data) {
    logTime(data)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3500)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ padding: '20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
          Stunden eintragen
        </div>
        <LogForm onSave={save} />
      </div>
      {savedMsg && (
        <div className="lu-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: `color-mix(in srgb, ${OK} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${OK} 30%, transparent)`, borderRadius: 10, color: OK, fontSize: 13 }}>
          <Check size={14} /> Eintrag gespeichert
          <button onClick={onSaved} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: OK, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: "'Space Grotesk', sans-serif" }}>
            Zu den Einträgen →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Einträge — sortier- und filterbare Gesamttabelle ──────────────────
const ENTRY_COLS = [
  { id: 'date', label: 'Datum' },
  { id: 'user', label: 'Person' },
  { id: 'project', label: 'Projekt' },
  { id: 'start_time', label: 'Start' },
  { id: 'end_time', label: 'Ende' },
  { id: 'hours', label: 'Std.' },
  { id: 'description', label: 'Tätigkeit' },
]

function TabEintraege() {
  const { entries, invoices, deleteEntry } = useTime()
  const { projects } = useOps()
  const isMobile = useIsMobile(700)
  const [fUser, setFUser] = useState('')
  const [fProject, setFProject] = useState('')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fText, setFText] = useState('')
  const [sort, setSort] = useState({ col: 'date', dir: 'desc' })

  const projName = id => projects.find(p => p.id === id)?.name || ''
  const userName = id => TEAM.find(u => u.id === id)?.name || id

  const filtered = useMemo(() => {
    const txt = fText.trim().toLowerCase()
    const rows = entries.filter(e =>
      (!fUser || e.user_id === fUser) &&
      (!fProject || e.project_id === fProject) &&
      (!fFrom || e.date >= fFrom) &&
      (!fTo || e.date <= fTo) &&
      (!txt || (e.description || '').toLowerCase().includes(txt) || projName(e.project_id).toLowerCase().includes(txt))
    )
    const dir = sort.dir === 'asc' ? 1 : -1
    const val = e => {
      if (sort.col === 'user') return userName(e.user_id)
      if (sort.col === 'project') return projName(e.project_id)
      if (sort.col === 'hours') return Number(e.hours)
      return e[sort.col] || ''
    }
    return [...rows].sort((a, b) => {
      const va = val(a), vb = val(b)
      if (typeof va === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir || a.date.localeCompare(b.date) * dir
    })
  }, [entries, fUser, fProject, fFrom, fTo, fText, sort, projects])

  const totalH = filtered.reduce((s, e) => s + Number(e.hours), 0)

  function toggleSort(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'date' ? 'desc' : 'asc' })
  }

  return (
    <div>
      {/* Filter */}
      <div style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr 1.4fr', gap: 8 }}>
          <select style={INPUT} value={fUser} onChange={e => setFUser(e.target.value)}>
            <option value="">Alle Personen</option>
            {TEAM.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select style={INPUT} value={fProject} onChange={e => setFProject(e.target.value)}>
            <option value="">Alle Projekte</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" style={INPUT} value={fFrom} onChange={e => setFFrom(e.target.value)} title="Von" />
          <input type="date" style={INPUT} value={fTo} onChange={e => setFTo(e.target.value)} title="Bis" />
          <input style={{ ...INPUT, gridColumn: isMobile ? '1 / -1' : 'auto' }} value={fText} onChange={e => setFText(e.target.value)} placeholder="Suche in Tätigkeit/Projekt…" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, flex: 1 }}>
            {filtered.length} Einträge · {Math.round(totalH * 100) / 100}h
          </span>
          <button onClick={() => exportCSV(filtered, invoices, projects)} disabled={!filtered.length}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: filtered.length ? A18 : 'transparent', border: `1px solid ${filtered.length ? `color-mix(in srgb, ${A} 31%, transparent)` : BORDER}`, color: filtered.length ? A : MUTED, cursor: filtered.length ? 'pointer' : 'default', fontSize: 12 }}>
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      {/* Tabelle */}
      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title="Keine Einträge" hint="Passe die Filter an oder erfasse neue Stunden." />
      ) : (
        <div style={{ overflowX: 'auto', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
            <thead>
              <tr>
                {ENTRY_COLS.map(c => (
                  <th key={c.id} onClick={() => toggleSort(c.id)}
                    style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: sort.col === c.id ? A : MUTED, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {c.label}{sort.col === c.id && (sort.dir === 'asc' ? <ChevronUp size={10} style={{ verticalAlign: -1 }} /> : <ChevronDown size={10} style={{ verticalAlign: -1 }} />)}
                  </th>
                ))}
                <th style={{ borderBottom: `1px solid ${BORDER}` }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const u = TEAM.find(t => t.id === e.user_id)
                return (
                  <tr key={e.id} className="lu-row">
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontSize: 12, color: FG, whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: u?.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6, color: '#001219', fontWeight: 700 }}>{u?.initials}</span>
                        </span>
                        {u?.name || e.user_id}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, whiteSpace: 'nowrap' }}>{projName(e.project_id) || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>{e.start_time || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>{e.end_time || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontSize: 12, color: FG, fontWeight: 600 }}>{e.hours}h</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontSize: 12, color: MUTED, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.description}>
                      {e.description || '—'}
                      {e.invoice_id && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: OK, marginLeft: 6 }}>abgerechnet</span>}
                    </td>
                    <td style={{ padding: '8px 8px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)` }}>
                      {!e.invoice_id && (
                        <button onClick={() => deleteEntry(e.id)} className="lu-btn-ghost" title="Löschen"
                          style={{ width: 24, height: 24, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={10} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── PersonCard ────────────────────────────────────────────────────────────────
function PersonCard({ uid, entries, projects, range, rule }) {
  const u = TEAM.find(t => t.id === uid)
  const t = rule
  const { from, to } = getRangeBounds(range)
  const year = new Date().getFullYear().toString()

  const rangeH = hoursInRange(entries, uid, from, to)
  const yearH = hoursThisYear(entries, uid)
  const weekDays = getWeekDays(weekStart(isoToday()))
  const weekH = hoursThisWeek(entries, uid, weekDays)

  const konto = hasKonto(t) ? kontostand(t, entries, uid) : null
  const annualTarget = ruleYearTarget(t, new Date().getFullYear())
  const kColor = konto === null ? MUTED : konto > 0 ? OK : konto < 0 ? WARN : MUTED

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
        {konto !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: kColor, lineHeight: 1 }}>
              {konto > 0 ? '+' : ''}{konto}h
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
        <div style={{ background: `color-mix(in srgb, ${FG} 3%, transparent)`, borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: u.color }}>{rangeH}h</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>
            {range === 'woche' ? 'Diese Woche' : range === 'monat' ? 'Dieser Monat' : range === 'quartal' ? 'Dieses Quartal' : 'Dieses Jahr'}
          </div>
        </div>
        <div style={{ background: `color-mix(in srgb, ${FG} 3%, transparent)`, borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: FG }}>{weekH}h</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: MUTED, marginTop: 2 }}>
            {t?.type === 'weekly' ? `Ziel: ${t.weekly}h/Wo` : t?.type === 'monthly' ? `Soll: ${t.monthly}h/bez. Monat` : 'Diese Woche'}
          </div>
        </div>
        <div style={{ background: `color-mix(in srgb, ${FG} 3%, transparent)`, borderRadius: 6, padding: '8px 10px' }}>
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
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: annualPct >= 100 ? OK : u.color }}>{annualPct.toFixed(0)}%</span>
          </div>
          <div style={{ background: `color-mix(in srgb, ${FG} 6%, transparent)`, borderRadius: 4, height: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${annualPct}%`, background: annualPct >= 100 ? OK : u.color, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          {konto !== null && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: kColor, marginTop: 4 }}>
              {konto === 0 ? '✓ Ausgeglichen' : konto > 0 ? `+${konto}h Guthaben` : `${konto}h Rückstand`}
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
                <div style={{ background: `color-mix(in srgb, ${FG} 6%, transparent)`, borderRadius: 2, height: 3 }}>
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
function KontostandCard({ uid, entries, rule }) {
  const u = TEAM.find(t => t.id === uid)
  const year = new Date().getFullYear()
  const nowMonth = new Date().getMonth() + 1

  const monthDataWithCum = kontoMonthData(rule, entries, uid)
  const konto = monthDataWithCum[nowMonth - 1]?.kum ?? 0
  const kColor = konto > 0 ? OK : konto < 0 ? WARN : MUTED
  const carryover = rule?.carryover || 0

  const ROWSTYLE = { fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, paddingRight: 12, textTransform: 'uppercase', whiteSpace: 'nowrap', verticalAlign: 'middle', paddingBottom: 3 }
  const CELLSTYLE = (i) => ({ fontFamily: "'Space Mono', monospace", fontSize: 10, textAlign: 'center', padding: '2px 5px', background: i + 1 === nowMonth ? `color-mix(in srgb, ${A} 7%, transparent)` : 'transparent', verticalAlign: 'middle' })

  return (
    <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{u.name}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>
            Jahres-Kontostand {year}
            {rule?.type === 'monthly' && ` · Soll ${rule.monthly}h je bezahltem Monat (${rule.paid_months.length} Monate)`}
            {carryover !== 0 && ` · Übertrag ${new Date().getFullYear() - 1}: −${carryover}h`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: kColor, lineHeight: 1 }}>
            {konto > 0 ? '+' : ''}{konto}h
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 2 }}>{konto >= 0 ? 'Guthaben' : 'Rückstand'}</div>
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
                <td key={i} style={{ ...CELLSTYLE(i), color: d.ist !== null ? FG : `color-mix(in srgb, ${FG} 20%, transparent)` }}>
                  {d.ist !== null ? `${d.ist}h` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td style={ROWSTYLE}>Saldo</td>
              {monthDataWithCum.map((d, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), color: d.saldo === null ? `color-mix(in srgb, ${FG} 20%, transparent)` : d.saldo >= 0 ? OK : WARN, fontWeight: d.saldo !== null ? 500 : 400 }}>
                  {d.saldo === null ? '—' : (d.saldo >= 0 ? `+${d.saldo}` : `${d.saldo}`)}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ ...ROWSTYLE, paddingTop: 6, borderTop: `1px solid ${BORDER}` }}>Konto</td>
              {monthDataWithCum.map((d, i) => (
                <td key={i} style={{ ...CELLSTYLE(i), color: d.kum === null ? `color-mix(in srgb, ${FG} 20%, transparent)` : d.kum > 0 ? OK : d.kum < 0 ? WARN : MUTED, borderTop: `1px solid ${BORDER}` }}>
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

function PersonenStats() {
  const { entries, hourRules } = useTime()
  const { projects } = useOps()
  const { profile, isAdmin } = useAuth()
  const today = isoToday()
  const [range, setRange] = useState('jahr')

  // Sichtbare Personen: Admins sehen alle, andere sich selbst (über die
  // Profil-Verknüpfung team_id — user.id ist die Auth-UUID, keine TEAM-id)
  const myTeamId = profile?.team_id
  const visibleUids = isAdmin ? TEAM.map(t => t.id) : [myTeamId].filter(Boolean)
  const visibleTeam = TEAM.filter(t => visibleUids.includes(t.id))

  // GF balance (admins only)
  const maltH = hoursThisYear(entries, 'malte')
  const lukasH = hoursThisYear(entries, 'lukas')
  const balanceDiff = maltH - lukasH

  // Kontostand-Detailkarten: alle mit weekly/monthly-Regel (Jona, Anselm, Felix)
  const fieldUids = TEAM.map(t => t.id)
    .filter(uid => hasKonto(ruleFor(hourRules, uid)))
    .filter(uid => isAdmin || myTeamId === uid)

  // Verlaufs-Chart (aus dem früheren Statistiken-Tab): Buckets je Zeitraum
  const chartBuckets = useMemo(() => {
    if (range === 'woche') {
      const ws = weekStart(today)
      const days = getWeekDays(ws)
      const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
      return days.map((d, i) => {
        const hours = {}
        visibleTeam.forEach(p => {
          hours[p.id] = entries.filter(e => e.user_id === p.id && e.date === d).reduce((s, e) => s + Number(e.hours), 0)
        })
        return { label: DAY_LABELS[i], hours }
      })
    }
    if (range === 'monat' || range === 'quartal') {
      const n = range === 'monat' ? 4 : 8
      return Array.from({ length: n }, (_, i) => {
        const ws = weekStart(addDays(today, -(n - 1 - i) * 7))
        const days = getWeekDays(ws)
        const kw = getISOWeek(new Date(ws + 'T00:00:00'))
        const hours = {}
        visibleTeam.forEach(p => {
          hours[p.id] = entries.filter(e => e.user_id === p.id && days.includes(e.date)).reduce((s, e) => s + Number(e.hours), 0)
        })
        return { label: `KW${kw}`, hours }
      })
    }
    const year = new Date().getFullYear()
    return MONTHS.map((label, mi) => {
      const prefix = `${year}-${String(mi + 1).padStart(2, '0')}`
      const hours = {}
      visibleTeam.forEach(p => {
        hours[p.id] = entries.filter(e => e.user_id === p.id && e.date?.startsWith(prefix)).reduce((s, e) => s + Number(e.hours), 0)
      })
      return { label, hours }
    })
  }, [range, entries, visibleUids.join(',')])

  const RANGE_CHART_LABELS = { woche: 'Diese Woche', monat: 'Letzte 4 Wochen', quartal: 'Letzte 8 Wochen', jahr: `Monatlich ${new Date().getFullYear()}` }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Zeitraum:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTS.map(opt => (
            <button key={opt.id} onClick={() => setRange(opt.id)} className={range === opt.id ? undefined : 'lu-chip'}
              style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${range === opt.id ? A : BORDER}`, background: range === opt.id ? A : 'transparent', color: range === opt.id ? 'var(--luma-on-a)' : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: range === opt.id ? 500 : 400, fontFamily: "'Space Grotesk', sans-serif" }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* GF balance — admin only */}
      {isAdmin && (
        <div style={{ padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
          <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 11, color: Math.abs(balanceDiff) < 5 ? OK : WARN }}>
            {Math.abs(balanceDiff) < 2 ? '✓ Ausgeglichen' : balanceDiff > 0 ? `Malte +${balanceDiff.toFixed(1)}h` : `Lukas +${Math.abs(balanceDiff).toFixed(1)}h`}
          </div>
        </div>
      )}

      {/* Person cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {visibleUids.map(uid => (
          <PersonCard key={uid} uid={uid} entries={entries} projects={projects} range={range} rule={ruleFor(hourRules, uid)} />
        ))}
      </div>

      {/* Verlaufs-Chart */}
      {visibleTeam.length > 0 && (
        <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
            {RANGE_CHART_LABELS[range]}
          </div>
          <StackedBarChart weeks={chartBuckets} persons={visibleTeam} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {visibleTeam.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, opacity: 0.85 }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kontostand monthly detail tables for field workers */}
      {fieldUids.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Monatliche Soll / Ist / Saldo</div>
          {fieldUids.map(uid => <KontostandCard key={uid} uid={uid} entries={entries} rule={ruleFor(hourRules, uid)} />)}
        </div>
      )}
    </div>
  )
}

// ── Kundenreport: Tätigkeiten aus Freitext-Beschreibungen ableiten ───────────
// Stichwort-Mapping auf die TASK_TYPES-Kategorien; ein Eintrag kann mehrere
// Tätigkeiten nennen → Stunden werden anteilig verteilt (im Report als „ca.").
const ACTIVITY_KEYWORDS = [
  { id: 'maehen',       words: ['mäh', 'maeh', 'rasen'] },
  { id: 'beikraut',     words: ['beikraut', 'beikräut', 'unkraut', 'jäten', 'jaeten', 'wildkraut'] },
  { id: 'giessen',      words: ['gieß', 'giess', 'wässer', 'waesser', 'bewässer', 'bewaesser'] },
  { id: 'pflanzung',    words: ['pflanzung', 'gepflanzt', 'pflanzen', 'stauden', 'gehölz', 'gehoelz'] },
  { id: 'reinigung',    words: ['reinig', 'müll', 'muell', 'laub', 'sauber'] },
  { id: 'monitoring',   words: ['monitoring', 'kontrolle', 'rundgang', 'bonitur', 'doku'] },
  { id: 'installation', words: ['install', 'montage', 'aufbau', 'einbau'] },
  { id: 'beratung',     words: ['beratung', 'meeting', 'termin', 'abstimmung', 'besprechung'] },
  { id: 'pflege',       words: ['pflege', 'schnitt', 'rückschnitt', 'rueckschnitt', 'hecke', 'baum'] },
  { id: 'bestellung',   words: ['bestell', 'einkauf', 'besorg'] },
]

function activityBreakdown(entries) {
  const byType = {}
  for (const e of entries) {
    const text = (e.description || '').toLowerCase()
    const matched = ACTIVITY_KEYWORDS.filter(k => k.words.some(w => text.includes(w))).map(k => k.id)
    const ids = matched.length ? matched : ['sonstiges']
    const share = Number(e.hours) / ids.length
    ids.forEach(id => { byType[id] = (byType[id] || 0) + share })
  }
  return Object.entries(byType)
    .map(([id, h]) => ({ id, label: TASK_TYPES.find(t => t.id === id)?.label || 'Sonstiges', hours: Math.round(h * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours)
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Druckbarer, kundentauglicher Standort-Report (ersetzt den Rechnungsfokus):
// alle Einsätze des Zeitraums, Jahresverlauf, Stunden nach Tätigkeit,
// optional Drive-Fotolink. €-Beträge nur bei explizitem Opt-in (Admin).
function exportKundenReport({ project, entries, costs, rate, from, to, showAmounts, photoLink }) {
  const fmtDe = iso => new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const totalHours = Math.round(entries.reduce((s, e) => s + Number(e.hours), 0) * 10) / 10
  const visitDates = [...new Set(entries.map(e => e.date))].sort()
  const acts = activityBreakdown(entries)
  const maxAct = Math.max(...acts.map(a => a.hours), 1)

  // Jahresverlauf: Stunden je Monat über den gewählten Zeitraum
  const months = []
  {
    let cur = from.slice(0, 7)
    const last = to.slice(0, 7)
    while (cur <= last && months.length < 24) {
      months.push(cur)
      const [y, m] = cur.split('-').map(Number)
      cur = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    }
  }
  const monthHours = months.map(m => ({
    m,
    label: new Date(m + '-01T00:00:00').toLocaleDateString('de-DE', { month: 'short' }) + (m.endsWith('-01') || m === months[0] ? ` ${m.slice(2, 4)}` : ''),
    h: Math.round(entries.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + Number(e.hours), 0) * 10) / 10,
  }))
  const maxMonth = Math.max(...monthHours.map(x => x.h), 1)

  // Einsatz-Liste: nach Datum gruppiert, Beschreibungen zusammengeführt
  const byDate = visitDates.map(d => {
    const dayEntries = entries.filter(e => e.date === d)
    const h = Math.round(dayEntries.reduce((s, e) => s + Number(e.hours), 0) * 10) / 10
    const descs = [...new Set(dayEntries.map(e => (e.description || '').trim()).filter(Boolean))]
    return { d, h, desc: descs.join(' · ') || 'Pflegeeinsatz' }
  })

  const materialSale = (costs || []).filter(c => c.billable !== false && c.date >= from && c.date <= to)
    .reduce((s, c) => s + Number(c.amount_net) * Number(c.markup), 0)
  const workValue = totalHours * rate
  const fmtEur = n => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
    <title>LUMA — Pflegereport ${esc(project.name)}</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 36px; }
      h1 { font-size: 20px; font-weight: 600; margin: 0 0 2px; }
      h2 { font-size: 13px; font-weight: 600; margin: 26px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #047A3C; }
      .brand { color: #047A3C; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 14px; }
      .meta { color: #6b7280; font-size: 11px; margin-bottom: 4px; }
      .kpis { display: flex; gap: 28px; margin: 16px 0 4px; }
      .kpi b { display: block; font-size: 20px; font-weight: 600; }
      .kpi span { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 5px 8px; border-bottom: 2px solid #e5e7eb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
      td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
      .bars { display: flex; align-items: flex-end; gap: 6px; height: 110px; margin-top: 8px; }
      .bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
      .bar i { display: block; width: 100%; background: #08AA56; border-radius: 3px 3px 0 0; min-height: 2px; }
      .bar em { font-style: normal; font-size: 8.5px; color: #6b7280; margin-top: 3px; white-space: nowrap; }
      .bar b { font-size: 9px; font-weight: 600; color: #047A3C; margin-bottom: 2px; }
      .act { margin-bottom: 6px; }
      .act .lbl { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 2px; }
      .act .track { background: #eef2ee; border-radius: 3px; height: 7px; }
      .act .fill { background: #08AA56; height: 100%; border-radius: 3px; }
      .note { color: #6b7280; font-size: 10px; margin-top: 6px; }
      .photo { margin-top: 8px; padding: 10px 12px; background: #f0faf4; border: 1px solid #bfe8cf; border-radius: 6px; font-size: 11px; }
      a { color: #047A3C; }
      @media print { body { margin: 18px; } }
    </style></head><body>
    <div class="brand">LUMA</div>
    <h1>Pflegereport — ${esc(project.name)}</h1>
    <div class="meta">${esc(project.location || '')}${project.client ? ` · ${esc(project.client)}` : ''}</div>
    <div class="meta">Zeitraum: ${fmtDe(from)} – ${fmtDe(to)} · Erstellt am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>

    <div class="kpis">
      <div class="kpi"><b>${visitDates.length}</b><span>Einsatztage</span></div>
      <div class="kpi"><b>${totalHours} h</b><span>Arbeitsstunden</span></div>
      ${showAmounts ? `<div class="kpi"><b>${fmtEur(workValue + materialSale)}</b><span>Leistungswert</span></div>` : ''}
    </div>

    ${photoLink ? `<div class="photo">📷 Foto-Dokumentation der Fläche: <a href="${esc(photoLink)}">${esc(photoLink)}</a></div>` : ''}

    <h2>Stunden nach Tätigkeit (ca.)</h2>
    ${acts.map(a => `
      <div class="act">
        <div class="lbl"><span>${esc(a.label)}</span><span>ca. ${a.hours} h</span></div>
        <div class="track"><div class="fill" style="width:${Math.round((a.hours / maxAct) * 100)}%"></div></div>
      </div>`).join('')}
    <div class="note">Zuordnung automatisch aus den Einsatzbeschreibungen abgeleitet; Einsätze mit mehreren Tätigkeiten anteilig verteilt.</div>

    <h2>Verlauf — Stunden je Monat</h2>
    <div class="bars">
      ${monthHours.map(x => `<div class="bar">${x.h ? `<b>${x.h}</b>` : ''}<i style="height:${Math.round((x.h / maxMonth) * 82)}px"></i><em>${esc(x.label)}</em></div>`).join('')}
    </div>

    <h2>Alle Arbeitseinsätze</h2>
    <table>
      <thead><tr><th style="width:90px">Datum</th><th>Tätigkeit</th><th style="width:60px;text-align:right">Std.</th></tr></thead>
      <tbody>
        ${byDate.map(r => `<tr><td>${fmtDe(r.d)}</td><td>${esc(r.desc)}</td><td style="text-align:right">${r.h} h</td></tr>`).join('')}
      </tbody>
    </table>

    ${showAmounts ? `
    <h2>Beträge</h2>
    <table>
      <tbody>
        <tr><td>Arbeitsleistung (${totalHours} h × ${fmtEur(rate)})</td><td style="text-align:right">${fmtEur(workValue)}</td></tr>
        ${materialSale > 0 ? `<tr><td>Material (Weitergabe)</td><td style="text-align:right">${fmtEur(materialSale)}</td></tr>` : ''}
        <tr><td><b>Summe netto</b></td><td style="text-align:right"><b>${fmtEur(workValue + materialSale)}</b></td></tr>
      </tbody>
    </table>` : ''}

    <div class="note" style="margin-top:22px">LUMA — naturnahe Grünflächen · luma-biome.de</div>
    <script>window.onload = () => window.print()</script>
  </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

// ── Tab 3: Abrechnung ─────────────────────────────────────────────────────────
function TabAbrechnung() {
  const { entries, invoices, costs, rates, createInvoice, markPaid, deleteInvoice, addCost, deleteCost, markCostsBilled, setRate } = useTime()
  const { projects, clients } = useOps()
  const [filterProject, setFilterProject] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [newInvoice, setNewInvoice] = useState(null) // { project_id, entry_ids, cost_ids }
  const [invForm, setInvForm] = useState({ invoice_number: '', date_issued: isoToday(), amount: '', notes: '' })
  const [costForm, setCostForm] = useState({ project_id: '', date: isoToday(), description: '', amount_net: '', markup: '1.5' })
  // Kundenreport pro Standort/Projekt
  const [repForm, setRepForm] = useState({ project_id: '', from: `${new Date().getFullYear()}-01-01`, to: isoToday(), amounts: false, photos: true })

  const fmtEur = n => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  const rateFor = p => rates[p?.client_id] ?? 50
  const saleValue = c => Number(c.amount_net) * Number(c.markup)

  function submitCost(e) {
    e.preventDefault()
    if (!costForm.amount_net) return
    addCost({
      project_id: costForm.project_id || null,
      date: costForm.date,
      description: costForm.description,
      amount_net: Number(costForm.amount_net),
      markup: Number(costForm.markup) || 1.5,
    })
    setCostForm(f => ({ ...f, description: '', amount_net: '' }))
  }

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

  // Group unbilled entries + material costs by project
  const unbilled = entries.filter(e => !e.invoice_id)
  const unbilledCosts = costs.filter(c => !c.invoice_id && c.billable !== false)
  const unbilledByProject = projects.map(p => {
    const pEntries = unbilled.filter(e => e.project_id === p.id && (!filterUser || e.user_id === filterUser))
    const pCosts = unbilledCosts.filter(c => c.project_id === p.id)
    if (!pEntries.length && !pCosts.length) return null
    const totalHours = pEntries.reduce((s, e) => s + Number(e.hours), 0)
    const materialSum = pCosts.reduce((s, c) => s + saleValue(c), 0)
    const suggestion = Math.round((totalHours * rateFor(p) + materialSum) * 100) / 100
    return { project: p, entries: pEntries, costs: pCosts, totalHours, materialSum, suggestion }
  }).filter(Boolean)

  // Einträge/Kosten ohne Projektzuordnung sichtbar machen (fallen sonst durchs Raster)
  const orphanEntries = unbilled.filter(e => !e.project_id)
  const orphanCosts = unbilledCosts.filter(c => !c.project_id)

  function openInvoiceForm(projectId, entryIds, costIds, suggestion) {
    setNewInvoice({ project_id: projectId, entry_ids: entryIds, cost_ids: costIds })
    setInvForm({ invoice_number: '', date_issued: isoToday(), amount: suggestion ? String(suggestion) : '', notes: '' })
  }

  function submitInvoice(e) {
    e.preventDefault()
    const project = projects.find(p => p.id === newInvoice.project_id)
    const inv = createInvoice({
      project_id: newInvoice.project_id,
      entry_ids: newInvoice.entry_ids,
      client: project?.client || '',
      invoice_number: invForm.invoice_number,
      date_issued: invForm.date_issued,
      amount: Number(invForm.amount),
      notes: invForm.notes,
      total_hours: entries.filter(e => newInvoice.entry_ids.includes(e.id)).reduce((s, e) => s + Number(e.hours), 0),
    })
    if (newInvoice.cost_ids?.length && inv?.id) markCostsBilled(newInvoice.cost_ids, inv.id)
    setNewInvoice(null)
  }

  const filteredInvoices = invoices.filter(inv => !filterProject || inv.project_id === filterProject)

  return (
    <div>
      {/* Filters + Export */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 20 }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: filteredForExport.length ? A18 : 'transparent', border: `1px solid ${filteredForExport.length ? `color-mix(in srgb, ${A} 31%, transparent)` : BORDER}`, color: filteredForExport.length ? A : MUTED, cursor: filteredForExport.length ? 'pointer' : 'default', fontSize: 12 }}>
            <Download size={12} /> CSV
          </button>
          <button
            onClick={() => exportPDF(filteredForExport, invoices, exportLabel, projects)}
            disabled={!filteredForExport.length}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: filteredForExport.length ? `color-mix(in srgb, ${FG} 5%, transparent)` : 'transparent', border: `1px solid ${BORDER}`, color: filteredForExport.length ? FG : MUTED, cursor: filteredForExport.length ? 'pointer' : 'default', fontSize: 12 }}>
            <Printer size={12} /> PDF / Drucken
          </button>
        </div>
      </div>

      {/* Kundenreport pro Standort */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileBarChart size={14} color={A} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Kundenreport pro Standort</span>
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
          Druckbarer Report für Kund:innen: alle Einsätze, Jahresverlauf, Stunden nach Tätigkeit — ohne interne €-Sätze (außer explizit aktiviert).
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.6fr) 1fr 1fr auto', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={LABEL}>Standort / Projekt *</label>
            <select style={INPUT} value={repForm.project_id} onChange={e => setRepForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">— wählen —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` · ${p.client}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>Von</label>
            <input type="date" style={INPUT} value={repForm.from} onChange={e => setRepForm(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label style={LABEL}>Bis</label>
            <input type="date" style={INPUT} value={repForm.to} onChange={e => setRepForm(f => ({ ...f, to: e.target.value }))} />
          </div>
          <button
            onClick={() => {
              const project = projects.find(p => p.id === repForm.project_id)
              if (!project) return
              const repEntries = entries.filter(e => e.project_id === project.id && e.date >= repForm.from && e.date <= repForm.to)
              exportKundenReport({
                project,
                entries: repEntries,
                costs: costs.filter(c => c.project_id === project.id),
                rate: rates[project.client_id] ?? 50,
                from: repForm.from, to: repForm.to,
                showAmounts: repForm.amounts,
                photoLink: repForm.photos ? (project.bilder_link || null) : null,
              })
            }}
            disabled={!repForm.project_id}
            className="lu-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 6, background: repForm.project_id ? A : 'transparent', border: repForm.project_id ? 'none' : `1px solid ${BORDER}`, color: repForm.project_id ? 'var(--luma-on-a)' : MUTED, cursor: repForm.project_id ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
            <Printer size={13} /> Report erzeugen
          </button>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: MUTED, cursor: 'pointer' }}>
            <input type="checkbox" checked={repForm.amounts} onChange={e => setRepForm(f => ({ ...f, amounts: e.target.checked }))} />
            Beträge ausweisen (€)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: MUTED, cursor: 'pointer' }}>
            <input type="checkbox" checked={repForm.photos} onChange={e => setRepForm(f => ({ ...f, photos: e.target.checked }))} />
            Foto-Doku-Link mit ausgeben (falls hinterlegt)
          </label>
        </div>
      </div>

      {/* Unbilled hours */}
      {unbilledByProject.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Nicht abgerechnet</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unbilledByProject.filter(g => !filterProject || g.project.id === filterProject).map(({ project, entries: pEntries, costs: pCosts, totalHours, materialSum, suggestion }) => (
              <div key={project.id} style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{project.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                      {project.client} · {rateFor(project)} €/h
                      {materialSum > 0 && ` · Material ${fmtEur(materialSum)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: WARN }}>{fmtEur(suggestion)}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{totalHours}h × {rateFor(project)} € {materialSum > 0 ? '+ Material' : ''}</div>
                    </div>
                    <button
                      onClick={() => openInvoiceForm(project.id, pEntries.map(e => e.id), pCosts.map(c => c.id), suggestion)}
                      className="lu-btn-primary" style={{ padding: '6px 12px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      Rechnung erstellen
                    </button>
                  </div>
                </div>
                {pCosts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                    {pCosts.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: MUTED }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, minWidth: 80 }}>{c.date}</span>
                        <span style={{ color: FG }}>🧾 {fmtEur(saleValue(c))}</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10 }}>({fmtEur(c.amount_net)} × {c.markup})</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</span>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Ohne Projektzuordnung — nichts darf durchs Raster fallen */}
      {(orphanEntries.length > 0 || orphanCosts.length > 0) && (
        <div style={{ marginBottom: 28, padding: '14px 16px', background: `color-mix(in srgb, ${WARN} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${WARN} 30%, transparent)`, borderRadius: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: WARN, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            ⚠ Ohne Projektzuordnung — bitte Projekt nachtragen
          </div>
          {orphanEntries.map(e => {
            const user = TEAM.find(u => u.id === e.user_id)
            return (
              <div key={e.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: MUTED, marginBottom: 3 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, minWidth: 80 }}>{e.date}</span>
                <span style={{ color: FG, fontWeight: 500 }}>{user?.name} · {e.hours}h</span>
                <span style={{ flex: 1 }}>{e.description}</span>
              </div>
            )
          })}
          {orphanCosts.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: MUTED, marginBottom: 3 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, minWidth: 80 }}>{c.date}</span>
              <span style={{ color: FG, fontWeight: 500 }}>🧾 {fmtEur(saleValue(c))}</span>
              <span style={{ flex: 1 }}>{c.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Materialkosten erfassen (nur Admin sichtbar — RLS) */}
      <div style={{ marginBottom: 28, padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          Materialkosten (Einkauf netto × Faktor = Weitergabe an Kunde)
        </div>
        <form onSubmit={submitCost} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.6fr 0.9fr 0.6fr auto', gap: 8, alignItems: 'end', marginBottom: 12 }}>
          <div>
            <label style={LABEL}>Projekt</label>
            <select style={INPUT} value={costForm.project_id} onChange={e => setCostForm(f => ({ ...f, project_id: e.target.value }))}>
              <option value="">— wählen —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>Datum</label>
            <input type="date" style={INPUT} value={costForm.date} onChange={e => setCostForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label style={LABEL}>Beschreibung</label>
            <input style={INPUT} value={costForm.description} onChange={e => setCostForm(f => ({ ...f, description: e.target.value }))} placeholder="z.B. Microdripsystem" />
          </div>
          <div>
            <label style={LABEL}>Netto €</label>
            <input type="number" min="0" step="0.01" style={INPUT} value={costForm.amount_net} onChange={e => setCostForm(f => ({ ...f, amount_net: e.target.value }))} placeholder="0.00" required />
          </div>
          <div>
            <label style={LABEL}>Faktor</label>
            <input type="number" min="1" step="0.1" style={INPUT} value={costForm.markup} onChange={e => setCostForm(f => ({ ...f, markup: e.target.value }))} />
          </div>
          <button type="submit" className="lu-btn-primary" style={{ padding: '9px 14px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <Plus size={13} />
          </button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {costs.slice(0, 12).map(c => {
            const project = projects.find(p => p.id === c.project_id)
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: MUTED, padding: '5px 0', borderBottom: `1px dashed ${BORDER}` }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, minWidth: 80 }}>{c.date}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, minWidth: 90 }}>{project?.name || '— kein Projekt'}</span>
                <span style={{ color: FG, fontWeight: 500, minWidth: 90 }}>{fmtEur(saleValue(c))}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10 }}>({fmtEur(c.amount_net)} × {c.markup})</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</span>
                {c.invoice_id
                  ? <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: OK }}>abgerechnet</span>
                  : (
                    <button onClick={() => deleteCost(c.id)} className="lu-btn-ghost" style={{ width: 24, height: 24, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={10} />
                    </button>
                  )}
              </div>
            )
          })}
          {costs.length === 0 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>Noch keine Materialkosten erfasst.</div>}
        </div>
      </div>

      {/* Stundensätze je Kunde */}
      <div style={{ marginBottom: 28, padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          Stundensätze je Kunde (Standard 50 €/h) — nur für Admins sichtbar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {clients.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: FG, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <input
                type="number" min="0" step="1" defaultValue={rates[c.id] ?? 50}
                onBlur={e => { const v = Number(e.target.value); if (v && v !== (rates[c.id] ?? 50)) setRate(c.id, v) }}
                style={{ ...INPUT, width: 70, padding: '5px 8px', textAlign: 'right' }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>€/h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice form modal */}
      {newInvoice && (
        <Modal eyebrow="Rechnung erstellen" onClose={() => setNewInvoice(null)} maxWidth={460}>
            <form onSubmit={submitInvoice} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <ModalActions onCancel={() => setNewInvoice(null)} submitLabel="Rechnung anlegen" />
            </form>
        </Modal>
      )}

      {/* Existing invoices */}
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Rechnungen</div>
        {filteredInvoices.length === 0 && (
          <EmptyState icon={FileText} title="Noch keine Rechnungen" hint="Erstelle eine Rechnung aus den nicht abgerechneten Stunden oben." />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...filteredInvoices].sort((a, b) => b.date_issued.localeCompare(a.date_issued)).map(inv => {
            const project = projects.find(p => p.id === inv.project_id)
            const paid = !!inv.date_paid
            return (
              <div key={inv.id} style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${paid ? `color-mix(in srgb, ${OK} 20%, transparent)` : BORDER}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: FG, fontWeight: 500 }}>{inv.invoice_number}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 10, background: paid ? `color-mix(in srgb, ${OK} 12%, transparent)` : `color-mix(in srgb, ${WARN} 12%, transparent)`, color: paid ? OK : WARN, border: `1px solid ${paid ? `color-mix(in srgb, ${OK} 25%, transparent)` : `color-mix(in srgb, ${WARN} 25%, transparent)`}` }}>
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
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, background: `color-mix(in srgb, ${OK} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${OK} 25%, transparent)`, color: OK, cursor: 'pointer', fontSize: 12 }}>
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
                fontSize={8} style={{ fill: MUTED }} fontFamily="'Space Mono', monospace">
                {totals[wi]}h
              </text>
            )}
            <text x={x + barW / 2} y={svgH - 4} textAnchor="middle"
              fontSize={8} style={{ fill: MUTED, opacity: 0.7 }} fontFamily="'Space Mono', monospace">
              {week.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Statistiken · Teil „Projekte" (nur Admin): Umsatz & Gewinn je Projekt ────
// Umsatz  = Stunden × Kundensatz (billing_rates) + Materialkosten-Verkaufswert
// Gewinn  = Umsatz − Materialeinkauf (netto) − Personalkosten
// Personalkosten = Σ Stunden je Person × interner Kostensatz (person_cost_rates)
function TabProjekte() {
  const { entries, costs, rates, costRates, setCostRate } = useTime()
  const { projects } = useOps()
  const isMobile = useIsMobile(700)
  const [range, setRange] = useState('jahr')
  const { from, to } = getRangeBounds(range)

  const fmtEur = n => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
  const rateFor = p => rates[p?.client_id] ?? 50
  const costRateFor = uid => Number(costRates[uid] ?? 0)

  const rows = projects.map(p => {
    const pEntries = entries.filter(e => e.project_id === p.id && e.date >= from && e.date <= to)
    const pCosts = costs.filter(c => c.project_id === p.id && c.date >= from && c.date <= to)
    const hours = pEntries.reduce((s, e) => s + Number(e.hours), 0)
    if (!hours && !pCosts.length) return null
    const materialBuy = pCosts.reduce((s, c) => s + Number(c.amount_net), 0)
    const materialSale = pCosts.filter(c => c.billable !== false).reduce((s, c) => s + Number(c.amount_net) * Number(c.markup), 0)
    const umsatz = hours * rateFor(p) + materialSale
    const personal = pEntries.reduce((s, e) => s + Number(e.hours) * costRateFor(e.user_id), 0)
    const gewinn = umsatz - materialBuy - personal
    return { p, hours: Math.round(hours * 10) / 10, umsatz, materialBuy, materialSale, personal, gewinn }
  }).filter(Boolean).sort((a, b) => b.umsatz - a.umsatz)

  const sum = rows.reduce((acc, r) => ({
    umsatz: acc.umsatz + r.umsatz, materialBuy: acc.materialBuy + r.materialBuy,
    personal: acc.personal + r.personal, gewinn: acc.gewinn + r.gewinn, hours: acc.hours + r.hours,
  }), { umsatz: 0, materialBuy: 0, personal: 0, gewinn: 0, hours: 0 })

  const missingRates = TEAM.filter(u => !costRates[u.id] && entries.some(e => e.user_id === u.id && e.date >= from && e.date <= to))

  const TH = { textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, whiteSpace: 'nowrap' }
  const TD = { textAlign: 'right', padding: '9px 12px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 11, whiteSpace: 'nowrap' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Zeitraum:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTS.map(opt => (
            <button key={opt.id} onClick={() => setRange(opt.id)} className={range === opt.id ? undefined : 'lu-chip'}
              style={{ padding: '5px 13px', borderRadius: 20, border: `1px solid ${range === opt.id ? A : BORDER}`, background: range === opt.id ? A : 'transparent', color: range === opt.id ? 'var(--luma-on-a)' : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: range === opt.id ? 500 : 400, fontFamily: "'Space Grotesk', sans-serif" }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {missingRates.length > 0 && (
        <div style={{ padding: '10px 14px', background: `color-mix(in srgb, ${WARN} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${WARN} 30%, transparent)`, borderRadius: 10, fontSize: 12, color: WARN }}>
          Ohne internen Stundenkostensatz (Personalkosten = 0 €): {missingRates.map(u => u.name).join(', ')} — unten pflegen.
        </div>
      )}

      {/* Projekt-Tabelle */}
      {rows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Keine Daten im Zeitraum" hint="Es gibt weder Stunden noch Materialkosten in diesem Zeitraum." />
      ) : (
        <div style={{ overflowX: 'auto', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left' }}>Projekt</th>
                <th style={TH}>Std.</th>
                <th style={TH}>Umsatz</th>
                <th style={TH}>Material (EK)</th>
                <th style={TH}>Personal</th>
                <th style={TH}>Gewinn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.p.id}>
                  <td style={{ ...TD, textAlign: 'left', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12.5, color: FG }}>
                    {r.p.name}
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{r.p.client} · {rateFor(r.p)} €/h</div>
                  </td>
                  <td style={{ ...TD, color: MUTED }}>{r.hours}h</td>
                  <td style={{ ...TD, color: FG, fontWeight: 600 }}>{fmtEur(r.umsatz)}</td>
                  <td style={{ ...TD, color: MUTED }}>−{fmtEur(r.materialBuy)}</td>
                  <td style={{ ...TD, color: MUTED }}>−{fmtEur(r.personal)}</td>
                  <td style={{ ...TD, color: r.gewinn >= 0 ? OK : WARN, fontWeight: 700 }}>{fmtEur(r.gewinn)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...TD, textAlign: 'left', borderBottom: 'none', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12.5, color: FG, fontWeight: 600, borderTop: `1px solid ${BORDER}` }}>Gesamt</td>
                <td style={{ ...TD, borderBottom: 'none', color: MUTED, borderTop: `1px solid ${BORDER}` }}>{Math.round(sum.hours * 10) / 10}h</td>
                <td style={{ ...TD, borderBottom: 'none', color: FG, fontWeight: 700, borderTop: `1px solid ${BORDER}` }}>{fmtEur(sum.umsatz)}</td>
                <td style={{ ...TD, borderBottom: 'none', color: MUTED, borderTop: `1px solid ${BORDER}` }}>−{fmtEur(sum.materialBuy)}</td>
                <td style={{ ...TD, borderBottom: 'none', color: MUTED, borderTop: `1px solid ${BORDER}` }}>−{fmtEur(sum.personal)}</td>
                <td style={{ ...TD, borderBottom: 'none', color: sum.gewinn >= 0 ? OK : WARN, fontWeight: 700, borderTop: `1px solid ${BORDER}` }}>{fmtEur(sum.gewinn)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>
        Umsatz = Stunden × Kundensatz + Material-Verkaufswert · Gewinn = Umsatz − Materialeinkauf − Personalkosten. Einträge ohne Projekt fließen nicht ein.
      </div>

      {/* Interne Stundenkosten je Person (Admin-Einstellung, admin-only RLS) */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
          Interne Stundenkosten je Person
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
          Vollkosten je Arbeitsstunde (Lohn + Nebenkosten). Nur für Admins sichtbar; Basis der Personalkosten oben.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {TEAM.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
              </span>
              <span style={{ fontSize: 12, color: FG, flex: 1 }}>{u.name}</span>
              <input type="number" min="0" step="0.5" defaultValue={costRates[u.id] ?? ''}
                placeholder="0"
                onBlur={e => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== Number(costRates[u.id] ?? 0)) setCostRate(u.id, v) }}
                style={{ ...INPUT, width: 74, padding: '5px 8px', textAlign: 'right' }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>€/h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tab 3: Statistiken = Personen (alle) + Projekte (nur Admin) ──────────────
function TabStatistiken() {
  const { isAdmin } = useAuth()
  const [seg, setSeg] = useState('personen')
  const activeSeg = seg === 'projekte' && !isAdmin ? 'personen' : seg
  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 3, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, padding: 4, marginBottom: 18, width: 'fit-content' }}>
          {[['personen', 'Personen'], ['projekte', 'Projekte (€)']].map(([id, label]) => (
            <button key={id} onClick={() => setSeg(id)} className={activeSeg === id ? undefined : 'lu-tab'}
              style={{ padding: '7px 16px', border: 'none', borderRadius: 999, background: activeSeg === id ? A : 'transparent', color: activeSeg === id ? 'var(--luma-on-a)' : MUTED, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: activeSeg === id ? 600 : 400, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}
      {activeSeg === 'personen' ? <PersonenStats /> : <TabProjekte />}
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'erfassen', label: 'Erfassen', icon: Clock },
  { id: 'eintraege', label: 'Einträge', icon: ListOrdered },
  { id: 'statistiken', label: 'Statistiken', icon: TrendingUp },
  { id: 'abrechnung', label: 'Abrechnung', icon: FileText },
]

// Statistiken ist für alle sichtbar (Teil „Projekte" darin bleibt admin-only)
const ADMIN_TABS = new Set(['abrechnung'])

export default function TimePage() {
  const [tab, setTab] = useState('erfassen')
  const { entries } = useTime()
  const { isAdmin } = useAuth()
  const isMobile = useIsMobile(700)
  const unbilledCount = entries.filter(e => !e.invoice_id).length

  const visibleTabs = TABS.filter(t => !ADMIN_TABS.has(t.id) || isAdmin)

  // If current tab is no longer accessible (e.g. after role change), reset
  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : 'erfassen'

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 14 : 24 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0 }}>Zeiterfassung</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: A06, borderRadius: 8, padding: 4, marginBottom: isMobile ? 16 : 24, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={activeTab === id ? undefined : 'lu-tab'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: isMobile ? '8px 11px' : '8px 16px', borderRadius: 6, border: 'none',
              background: activeTab === id ? A : 'transparent',
              color: activeTab === id ? 'var(--luma-on-a)' : MUTED,
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === id ? 500 : 400,
              fontFamily: "'Space Grotesk', sans-serif",
              position: 'relative', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            <Icon size={13} />
            {label}
            {id === 'abrechnung' && unbilledCount > 0 && activeTab !== 'abrechnung' && (
              <span style={{ position: 'absolute', top: 4, right: 6, width: 16, height: 16, borderRadius: '50%', background: WARN, color: 'var(--luma-on-a)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unbilledCount > 9 ? '9+' : unbilledCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'erfassen' && <TabErfassen onSaved={() => setTab('eintraege')} />}
      {activeTab === 'eintraege' && <TabEintraege />}
      {activeTab === 'statistiken' && <TabStatistiken />}
      {activeTab === 'abrechnung' && <TabAbrechnung />}
    </div>
  )
}
