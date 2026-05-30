import { useState, useMemo } from 'react'
import { Plus, Trash2, Check, Clock, TrendingUp, FileText, ChevronLeft, ChevronRight, X, Download, Printer } from 'lucide-react'
import { useTime } from '../context/TimeContext.jsx'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
import { TEAM, HOUR_TARGETS } from '../data/seed.js'
import { genId, isoToday, addDays, weekStart, getWeekDays } from '../lib/storage.js'

const INPUT = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
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
  return entries.filter(e => e.user_id === userId && e.date.startsWith(year))
    .reduce((s, e) => s + Number(e.hours), 0)
}

function hoursForProject(entries, userId, projectId) {
  return entries.filter(e => e.user_id === userId && e.project_id === projectId)
    .reduce((s, e) => s + Number(e.hours), 0)
}

// ── Log Form ──────────────────────────────────────────────────────────────────
function LogForm({ onSave, prefill, onClose }) {
  const { jobs, projects } = useOps()
  const [form, setForm] = useState({
    user_id: prefill?.user_id || 'malte',
    project_id: prefill?.project_id || '',
    job_id: prefill?.job_id || '',
    date: prefill?.date || isoToday(),
    hours: prefill?.hours || '',
    description: prefill?.description || '',
  })

  const projectJobs = jobs.filter(j => j.project_id === form.project_id && j.status !== 'cancelled')

  function submit(e) {
    e.preventDefault()
    if (!form.user_id || !form.project_id || !form.hours) return
    onSave({ ...form, hours: Number(form.hours), job_id: form.job_id || null })
    if (onClose) onClose()
    else setForm(f => ({ ...f, description: '', hours: '', job_id: '' }))
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
        <label style={LABEL}>Projekt *</label>
        <select style={INPUT} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, job_id: '' }))} required>
          <option value="">Projekt wählen</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
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
      <div>
        <label style={LABEL}>Einsatz (optional)</label>
        <select style={INPUT} value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
          disabled={!form.project_id}>
          <option value="">Kein Einsatz</option>
          {projectJobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.date})</option>)}
        </select>
      </div>
      <div>
        <label style={LABEL}>Tätigkeit</label>
        <input style={INPUT} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Was wurde gemacht?" />
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onClose && <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>}
        <button type="submit" style={{ padding: '8px 20px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
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
  const [editId, setEditId] = useState(null)
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
              <div key={entry.id} style={{ padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: user?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{user?.initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 1 }}>
                    <span style={{ fontSize: 13, color: FG, fontWeight: 500 }}>{entry.hours}h</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A }}>{project?.name}</span>
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
                    style={{ width: 26, height: 26, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

// ── Tab 2: Übersicht ──────────────────────────────────────────────────────────
function TabUebersicht() {
  const { entries } = useTime()
  const today = isoToday()
  const [weekOffset, setWeekOffset] = useState(0)
  const currentWeek = weekStart(addDays(today, weekOffset * 7))
  const weekDays = getWeekDays(currentWeek)

  const weekLabel = (() => {
    const d1 = new Date(weekDays[0] + 'T00:00:00')
    const d7 = new Date(weekDays[6] + 'T00:00:00')
    return `KW ${getISOWeek(d1)} · ${d1.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – ${d7.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
  })()

  const maltH = hoursThisYear(entries, 'malte')
  const lukasH = hoursThisYear(entries, 'lukas')
  const balanceDiff = maltH - lukasH

  return (
    <div>
      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 14, color: FG, fontWeight: 500, minWidth: 220 }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} /></button>
        {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12 }}>Diese Woche</button>}
      </div>

      {/* Malte + Lukas balance */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Jahres-Balance {new Date().getFullYear()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {['malte', 'lukas'].map(uid => {
            const u = TEAM.find(t => t.id === uid)
            const h = uid === 'malte' ? maltH : lukasH
            const wh = hoursThisWeek(entries, uid, weekDays)
            return (
              <div key={uid}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{u.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{wh}h diese Woche</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: u.color }}>{h}h</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, fontFamily: "'Space Mono', monospace", fontSize: 11, color: Math.abs(balanceDiff) < 5 ? '#22EAA7' : '#F59E0B' }}>
          {Math.abs(balanceDiff) < 2
            ? '✓ Balance ausgeglichen'
            : balanceDiff > 0
              ? `Malte +${balanceDiff.toFixed(1)}h mehr als Lukas`
              : `Lukas +${Math.abs(balanceDiff).toFixed(1)}h mehr als Malte`}
        </div>
      </div>

      {/* Jona + Anselm weekly targets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {['jona', 'anselm'].map(uid => {
          const u = TEAM.find(t => t.id === uid)
          const wh = hoursThisWeek(entries, uid, weekDays)
          const target = HOUR_TARGETS[uid].weekly
          const pct = Math.min(100, (wh / target) * 100)
          return (
            <div key={uid} style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{u.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>Ziel: {target}h / Woche</div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: pct >= 100 ? '#22EAA7' : u.color }}>
                  {wh}h
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22EAA7' : u.color, borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 5 }}>
                {pct >= 100 ? `✓ Ziel erreicht (+${(wh - target).toFixed(1)}h)` : `${(target - wh).toFixed(1)}h fehlen noch`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Robert project hours */}
      <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: TEAM.find(t => t.id === 'robert').color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#001219', fontWeight: 700 }}>RB</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>Robert <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, fontWeight: 400 }}>— projektbasiert</span></div>
          <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: TEAM.find(t => t.id === 'robert').color }}>
            {hoursThisYear(entries, 'robert')}h
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {projects.map(p => {
            const h = hoursForProject(entries, 'robert', p.id)
            if (!h) return null
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span style={{ color: MUTED, flex: 1 }}>{p.name}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: FG }}>{h}h</span>
              </div>
            )
          })}
        </div>
      </div>
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: filteredForExport.length ? `${A}18` : 'transparent', border: `1px solid ${filteredForExport.length ? A + '50' : BORDER}`, color: filteredForExport.length ? A : MUTED, cursor: filteredForExport.length ? 'pointer' : 'default', fontSize: 12 }}>
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
                      style={{ padding: '6px 12px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
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
          <div style={{ position: 'relative', background: '#0d1a23', border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 460, padding: 24 }}>
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
              <div style={{ padding: '10px 14px', background: `${A}08`, border: `1px solid ${A}20`, borderRadius: 6, fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>
                {entries.filter(e => newInvoice.entry_ids.includes(e.id)).reduce((s, e) => s + Number(e.hours), 0)}h werden als abgerechnet markiert
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setNewInvoice(null)} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Rechnung anlegen</button>
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
                    style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'erfassen', label: 'Erfassen', icon: Clock },
  { id: 'uebersicht', label: 'Übersicht', icon: TrendingUp },
  { id: 'abrechnung', label: 'Abrechnung', icon: FileText },
]

export default function TimePage() {
  const [tab, setTab] = useState('erfassen')
  const { entries } = useTime()
  const unbilledCount = entries.filter(e => !e.invoice_id).length

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0 }}>Zeiterfassung</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 6, border: 'none',
              background: tab === id ? A : 'transparent',
              color: tab === id ? '#001219' : MUTED,
              cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 500 : 400,
              fontFamily: "'Space Grotesk', sans-serif",
              position: 'relative',
            }}>
            <Icon size={13} />
            {label}
            {id === 'abrechnung' && unbilledCount > 0 && tab !== 'abrechnung' && (
              <span style={{ position: 'absolute', top: 4, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#F59E0B', color: '#001219', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unbilledCount > 9 ? '9+' : unbilledCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'erfassen' && <TabErfassen />}
      {tab === 'uebersicht' && <TabUebersicht />}
      {tab === 'abrechnung' && <TabAbrechnung />}
    </div>
  )
}
