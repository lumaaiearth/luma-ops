import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Repeat, MapPin } from 'lucide-react'
import { JOB_TYPES } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import JobPhotos from './JobPhotos.jsx'
import PeoplePicker from './PeoplePicker.jsx'

import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A08, A14 } from '../lib/theme.js'
import { Modal, ModalActions, INPUT_STYLE, LABEL_STYLE, DateInput } from './ui.jsx'
import { isoToday } from '../lib/storage.js'

const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4), m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current || !value) return
    const idx = TIME_SLOTS.indexOf(value)
    if (idx >= 0) listRef.current.scrollTop = Math.max(0, idx * 36 - 90)
  }, [open, value])

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        style={{ ...INPUT_STYLE, cursor: 'pointer' }}
      />
      {open && (
        <div ref={listRef} style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 400,
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
          maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
        }}>
          {TIME_SLOTS.map(slot => {
            const sel = slot === value
            return (
              <div key={slot}
                onMouseDown={e => { e.preventDefault(); onChange(slot); setOpen(false) }}
                className={sel ? undefined : 'lu-option'}
                style={{
                  padding: '8px 14px', cursor: 'pointer',
                  fontFamily: "'Space Mono', monospace", fontSize: 12,
                  color: sel ? A : FG,
                  background: sel ? A14 : 'transparent',
                  borderLeft: sel ? `2px solid ${A}` : '2px solid transparent',
                }}
              >
                {slot}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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

  return (
    <Modal eyebrow="Neues Projekt" onClose={onClose} maxWidth={380} zIndex={1200}>
      <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={INPUT_STYLE} value={name} onChange={e => setName(e.target.value)} placeholder="Projektname *" required autoFocus />
        <select style={INPUT_STYLE} value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">Kein Auftraggeber</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input style={INPUT_STYLE} value={location} onChange={e => setLocation(e.target.value)} placeholder="Standort / Adresse" />
        <ModalActions onCancel={onClose} submitLabel="Anlegen" />
      </form>
    </Modal>
  )
}

export default function JobModal({ initialDate, initialJob, initialStartTime, initialEndTime, initialAssignedUsers, onSave, onClose, isRecurring = false }) {
  const { projects, clients, vehicles: VEHICLES } = useOps()
  const { user } = useAuth()
  const editing = !!initialJob
  const [showQuickProject, setShowQuickProject] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationOpen, setLocationOpen] = useState(false)
  const locationRef = useRef(null)
  const locationDebounce = useRef(null)
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
    assigned_users: initialJob?.assigned_users || initialAssignedUsers || [],
    vehicle_ids: initialJob?.vehicle_ids || (initialJob?.vehicle_id ? [initialJob.vehicle_id] : []),
    location: initialJob?.location || '',
    color: initialJob?.color || '',
    tools: initialJob?.tools || [],
    notes: initialJob?.notes || '',
    interval_days: 14,
    make_recurring: false,
  })

  useEffect(() => {
    if (!locationOpen) return
    const handler = e => { if (!locationRef.current?.contains(e.target)) setLocationOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [locationOpen])

  function handleLocationChange(val) {
    setForm(f => ({ ...f, location: val }))
    clearTimeout(locationDebounce.current)
    if (val.length < 3) { setLocationSuggestions([]); setLocationOpen(false); return }
    locationDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&countrycodes=de`, { headers: { 'Accept-Language': 'de' } })
        const data = await res.json()
        setLocationSuggestions(data)
        setLocationOpen(data.length > 0)
      } catch { /* offline or rate limited */ }
    }, 350)
  }

  function selectLocation(item) {
    setForm(f => ({ ...f, location: item.display_name }))
    setLocationSuggestions([])
    setLocationOpen(false)
  }

  const typeColor = JOB_TYPES.find(t => t.id === form.job_type)?.color || A

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
    <Modal
      eyebrow={editing ? 'Einsatz bearbeiten' : 'Neuer Einsatz'}
      eyebrowColor={typeColor}
      title={form.title || 'Titel eingeben…'}
      onClose={onClose}
      maxWidth={580}
    >
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: `color-mix(in srgb, ${typeColor} 60%, transparent)`, marginTop: 4, paddingLeft: 2 }}>
                  {clientName}
                </div>
              )}
            </div>
            <div>
              <label style={LABEL_STYLE}>Typ &amp; Farbe</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <select style={{ ...INPUT_STYLE, flex: 1, borderColor: `color-mix(in srgb, ${typeColor} 38%, transparent)`, color: typeColor }} value={form.job_type} onChange={e => setForm(f => ({ ...f, job_type: e.target.value }))}>
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
              <DateInput value={form.date}
                onChange={v => setForm(f => ({ ...f, date: v, date_end: f.date_end && f.date_end < v ? '' : f.date_end }))}
                required />
            </div>
            <div>
              <label style={LABEL_STYLE}>Ende <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>(mehrtägig)</span></label>
              <DateInput style={{ opacity: form.date_end ? 1 : 0.5 }} value={form.date_end} min={form.date}
                onChange={v => setForm(f => ({ ...f, date_end: v }))} />
            </div>
          </div>

          {/* All-day toggle + Times */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, width: 'fit-content' }}>
              <input
                type="checkbox"
                checked={!form.start_time && !form.end_time}
                onChange={e => {
                  if (e.target.checked) setForm(f => ({ ...f, start_time: '', end_time: '' }))
                  else setForm(f => ({ ...f, start_time: '09:00', end_time: '10:00' }))
                }}
                style={{ width: 16, height: 16, accentColor: A, cursor: 'pointer' }}
              />
              <span style={{ ...LABEL_STYLE, margin: 0 }}>Ganztägig</span>
            </label>
            {(form.start_time || form.end_time) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL_STYLE}>Von</label>
                  <TimePicker value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Bis</label>
                  <TimePicker value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} />
                </div>
              </div>
            )}
          </div>

          {/* Location with Nominatim autocomplete */}
          <div ref={locationRef}>
            <label style={LABEL_STYLE}>Standort / Adresse</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none', zIndex: 1 }} />
              <input
                style={{ ...INPUT_STYLE, paddingLeft: 34 }}
                value={form.location}
                onChange={e => handleLocationChange(e.target.value)}
                onFocus={() => locationSuggestions.length > 0 && setLocationOpen(true)}
                placeholder="Adresse eingeben…"
                autoComplete="off"
              />
              {locationOpen && locationSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 500,
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6,
                  maxHeight: 220, overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
                }}>
                  {locationSuggestions.map((item, i) => (
                    <div key={i}
                      onMouseDown={e => { e.preventDefault(); selectLocation(item) }}
                      className="lu-option"
                      style={{ padding: '9px 14px', borderBottom: i < locationSuggestions.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                    >
                      <div style={{ fontSize: 13, color: FG, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>
                        {item.address?.road ? `${item.address.road}${item.address.house_number ? ' ' + item.address.house_number : ''}` : item.display_name.split(',')[0]}
                      </div>
                      <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                        {[item.address?.suburb, item.address?.city || item.address?.town, item.address?.postcode].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team + Freelancer */}
          <div>
            <label style={LABEL_STYLE}>Team &amp; Freelancer</label>
            <PeoplePicker multi value={form.assigned_users}
              onChange={ids => setForm(f => ({ ...f, assigned_users: ids }))} />
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
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: active ? `color-mix(in srgb, ${A} 9%, transparent)` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? `color-mix(in srgb, ${A} 44%, transparent)` : BORDER}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 13, color: active ? A : MUTED }}>{v.name}</span>
                      {v.plate && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: active ? `color-mix(in srgb, ${A} 60%, transparent)` : MUTED + '80' }}>{v.plate}</span>}
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
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: A08, border: `1px solid color-mix(in srgb, ${A} 19%, transparent)`, fontSize: 12, color: FG, flexShrink: 0 }}>
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

          {/* Recurring toggle */}
          {!initialJob?.recurring_template_id && (
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
          <ModalActions onCancel={onClose} submitLabel={editing ? 'Speichern' : form.make_recurring ? 'Vorlage erstellen' : 'Einsatz anlegen'} />
        </form>
    </Modal>

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
