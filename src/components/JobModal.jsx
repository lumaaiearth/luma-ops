import { useState } from 'react'
import { X, Repeat, MapPin } from 'lucide-react'
import { TEAM, JOB_TYPES } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import JobPhotos from './JobPhotos.jsx'

import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A08 } from '../lib/theme.js'
import { isoToday } from '../lib/storage.js'

const INPUT_STYLE = {
  width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '10px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none',
}

const LABEL_STYLE = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
}

function QuickProjectModal({ clients, onSave, onClose }) {
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [location, setLocation] = useState('')
  const { createProject } = useOps()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const selectedClient = clients.find(c => c.id === clientId)
    const project = await createProject({
      name: name.trim(),
      location: location.trim(),
      client_id: clientId || null,
      client: selectedClient?.name || '',
      status: 'active',
    })
    onSave(project)
  }

  const INPUT = {
    width: '100%', background: A06, border: `1px solid ${BORDER}`,
    borderRadius: 6, padding: '9px 12px', color: '#e8f0f5',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.7)', padding: 20 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Neues Projekt</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Projektname *" required autoFocus />
          <select style={INPUT} value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Kein Auftraggeber</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input style={INPUT} value={location} onChange={e => setLocation(e.target.value)} placeholder="Standort / Adresse" />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: 'rgba(232,240,245,0.4)', cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>Abbrechen</button>
            <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>Anlegen</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function JobModal({ initialDate, initialJob, initialStartTime, initialEndTime, onSave, onClose, isRecurring = false }) {
  const { projects, clients, vehicles: VEHICLES } = useOps()
  const { user } = useAuth()
  const editing = !!initialJob
  const [showQuickProject, setShowQuickProject] = useState(false)
  const [toolInput, setToolInput] = useState('')
  const [toolsHistory, setToolsHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luma_tools_history') || '[]') } catch { return [] }
  })

  const [form, setForm] = useState({
    project_id: initialJob?.project_id || '',
    title: initialJob?.title || '',
    job_type: initialJob?.job_type || 'pflege',
    date: initialJob?.date || initialDate || isoToday(),
    date_end: initialJob?.date_end || '',
    start_time: initialJob?.start_time || initialStartTime || '',
    end_time: initialJob?.end_time || initialEndTime || '',
    assigned_users: initialJob?.assigned_users || [],
    vehicle_ids: initialJob?.vehicle_ids || (initialJob?.vehicle_id ? [initialJob.vehicle_id] : []),
    location: initialJob?.location || '',
    color: initialJob?.color || '',
    tools: initialJob?.tools || [],
    notes: initialJob?.notes || '',
    interval_days: 14,
    make_recurring: false,
  })

  const typeColor = JOB_TYPES.find(t => t.id === form.job_type)?.color || A

  function toggleUser(id) {
    setForm(f => ({
      ...f,
      assigned_users: f.assigned_users.includes(id)
        ? f.assigned_users.filter(u => u !== id)
        : [...f.assigned_users, id],
    }))
  }

  function toggleVehicle(id) {
    setForm(f => ({
      ...f,
      vehicle_ids: f.vehicle_ids.includes(id)
        ? f.vehicle_ids.filter(v => v !== id)
        : [...f.vehicle_ids, id],
    }))
  }

  function addTool(val) {
    const t = val.trim()
    if (!t || form.tools.includes(t)) { setToolInput(''); return }
    setForm(f => ({ ...f, tools: [...f.tools, t] }))
    const next = [t, ...toolsHistory.filter(x => x !== t)].slice(0, 60)
    setToolsHistory(next)
    localStorage.setItem('luma_tools_history', JSON.stringify(next))
    setToolInput('')
  }

  function handleToolChange(e) {
    const val = e.target.value
    if (val.includes(',')) {
      val.split(',').forEach(part => { if (part.trim()) addTool(part.trim()) })
    } else {
      setToolInput(val)
    }
  }

  function handleToolKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTool(toolInput)
    } else if (e.key === 'Backspace' && !toolInput && form.tools.length) {
      setForm(f => ({ ...f, tools: f.tools.slice(0, -1) }))
    }
  }

  function removeTool(i) {
    setForm(f => ({ ...f, tools: f.tools.filter((_, j) => j !== i) }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.project_id || !form.title || !form.date) return
    if (toolInput.trim()) addTool(toolInput)
    const jobData = {
      project_id: form.project_id,
      title: form.title,
      job_type: form.job_type,
      date: form.date,
      date_end: form.date_end && form.date_end > form.date ? form.date_end : null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      assigned_users: form.assigned_users,
      vehicle_ids: form.vehicle_ids,
      vehicle_id: form.vehicle_ids[0] || null,
      location: form.location || null,
      color: form.color || null,
      tools: form.tools,
      notes: form.notes,
      status: 'planned',
    }
    if (form.make_recurring) {
      onSave({ type: 'recurring', data: { ...jobData, interval_days: Number(form.interval_days), next_date: form.date, active: true } })
    } else {
      onSave({ type: 'job', data: jobData })
    }
  }

  const proj = projects.find(p => p.id === form.project_id)
  const clientOfProj = proj?.client_id ? clients.find(c => c.id === proj.client_id) : null
  const clientName = clientOfProj?.name || proj?.client

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: CARD,
          border: `1px solid ${BORDER}`, borderRadius: 8,
          width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD, zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: typeColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
              {editing ? 'Einsatz bearbeiten' : 'Neuer Einsatz'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: FG }}>{form.title || 'Titel eingeben…'}</div>
          </div>
          <button onClick={onClose} style={{ background: A06, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={LABEL_STYLE}>Titel *</label>
            <input style={INPUT_STYLE} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Wochenpflege Tiny Forest" required autoFocus={!editing} />
          </div>

          {/* Project + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Projekt *</label>
              <select style={INPUT_STYLE} value={form.project_id}
                onChange={e => {
                  if (e.target.value === '__new__') { setShowQuickProject(true); return }
                  setForm(f => ({ ...f, project_id: e.target.value }))
                }} required>
                <option value="">Projekt wählen</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__new__">+ Neues Projekt anlegen</option>
              </select>
              {clientName && (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: `${typeColor}99`, marginTop: 4, paddingLeft: 2 }}>
                  {clientName}
                </div>
              )}
            </div>
            <div>
              <label style={LABEL_STYLE}>Typ &amp; Farbe</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <select style={{ ...INPUT_STYLE, flex: 1, borderColor: typeColor + '60', color: typeColor }} value={form.job_type} onChange={e => setForm(f => ({ ...f, job_type: e.target.value }))}>
                  {JOB_TYPES.map(t => <option key={t.id} value={t.id} style={{ color: FG }}>{t.label}</option>)}
                </select>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <input
                    type="color"
                    value={form.color || '#08AA56'}
                    title={form.color ? 'Benutzerdefinierte Farbe — Doppelklick zum Zurücksetzen' : 'Klick für eigene Eventfarbe (überschreibt Projektfarbe)'}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    onDoubleClick={() => setForm(f => ({ ...f, color: '' }))}
                    style={{ width: 42, height: '100%', minHeight: 42, padding: 3, borderRadius: 6, border: `1px solid ${form.color ? form.color + '80' : BORDER}`, background: SURFACE, cursor: 'pointer', display: 'block' }}
                  />
                  {form.color && (
                    <div style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, borderRadius: '50%', background: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9, color: '#fff', lineHeight: 1 }}
                      onClick={() => setForm(f => ({ ...f, color: '' }))}>×</div>
                  )}
                </div>
              </div>
              {form.color && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 4 }}>Doppelklick auf Swatch → Projektfarbe</div>}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Datum *</label>
              <input type="date" style={INPUT_STYLE} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value, date_end: f.date_end && f.date_end < e.target.value ? '' : f.date_end }))}
                required />
            </div>
            <div>
              <label style={LABEL_STYLE}>Ende <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>(mehrtägig)</span></label>
              <input type="date" style={{ ...INPUT_STYLE, opacity: form.date_end ? 1 : 0.5 }} value={form.date_end} min={form.date}
                onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))} />
            </div>
          </div>

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Von</label>
              <input type="time" style={INPUT_STYLE} value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Bis</label>
              <input type="time" style={INPUT_STYLE} value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={LABEL_STYLE}>Standort / Adresse</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
              <input style={{ ...INPUT_STYLE, paddingLeft: 34 }} value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Adresse oder Beschreibung" />
            </div>
          </div>

          {/* Team */}
          <div>
            <label style={LABEL_STYLE}>Team</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TEAM.map(u => {
                const active = form.assigned_users.includes(u.id)
                return (
                  <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: active ? `${u.color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? u.color + '80' : BORDER}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                    </div>
                    <span style={{ fontSize: 13, color: active ? u.color : MUTED }}>{u.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vehicles — multi-select pills */}
          {VEHICLES.length > 0 && (
            <div>
              <label style={LABEL_STYLE}>Fahrzeuge</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {VEHICLES.map(v => {
                  const active = form.vehicle_ids.includes(v.id)
                  return (
                    <button key={v.id} type="button" onClick={() => toggleVehicle(v.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: active ? `${A}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? A + '70' : BORDER}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 13, color: active ? A : MUTED }}>{v.name}</span>
                      {v.plate && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: active ? `${A}99` : MUTED + '80' }}>{v.plate}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tools — tag input with autocomplete */}
          <div>
            <label style={LABEL_STYLE}>Werkzeug / Material</label>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '7px 10px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'text', minHeight: 42 }}
              onClick={() => document.getElementById('luma-tool-input').focus()}
            >
              {form.tools.map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: A08, border: `1px solid ${A}30`, fontSize: 12, color: FG, flexShrink: 0 }}>
                  {t}
                  <button type="button" onClick={e => { e.stopPropagation(); removeTool(i) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 0, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="luma-tool-input"
                list="luma-tools-history"
                value={toolInput}
                onChange={handleToolChange}
                onKeyDown={handleToolKey}
                onBlur={() => { if (toolInput.trim()) addTool(toolInput) }}
                placeholder={form.tools.length === 0 ? 'Sense, Schubkarre, Mulch…' : ''}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, flexGrow: 1, minWidth: 100, padding: '2px 2px' }}
              />
              <datalist id="luma-tools-history">
                {toolsHistory.filter(t => !form.tools.includes(t)).map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>Enter oder Komma → Tag hinzufügen · Backspace → letztes entfernen</div>
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL_STYLE}>Notizen</label>
            <textarea style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 72 }} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="…" />
          </div>

          {/* Recurring toggle (new jobs only) */}
          {!editing && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div onClick={() => setForm(f => ({ ...f, make_recurring: !f.make_recurring }))}
                  style={{ width: 36, height: 20, borderRadius: 10, background: form.make_recurring ? A : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, left: form.make_recurring ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 13, color: form.make_recurring ? FG : MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Repeat size={13} /> Wiederkehrender Einsatz
                </span>
              </label>
              {form.make_recurring && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: MUTED }}>Alle</span>
                  <input type="number" min="1" max="365"
                    style={{ ...INPUT_STYLE, width: 72 }}
                    value={form.interval_days}
                    onChange={e => setForm(f => ({ ...f, interval_days: e.target.value }))} />
                  <span style={{ fontSize: 13, color: MUTED }}>Tage</span>
                </div>
              )}
            </div>
          )}

          {/* Photos (edit only) */}
          {editing && initialJob?.id && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <JobPhotos jobId={initialJob.id} uploadedBy={user?.id || 'unknown'} />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>
              Abbrechen
            </button>
            <button type="submit"
              style={{ padding: '10px 24px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {editing ? 'Speichern' : form.make_recurring ? 'Vorlage erstellen' : 'Einsatz anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showQuickProject && (
      <QuickProjectModal
        clients={clients}
        onSave={project => {
          setForm(f => ({ ...f, project_id: project.id }))
          setShowQuickProject(false)
        }}
        onClose={() => setShowQuickProject(false)}
      />
    )}
    </>
  )
}
