import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, CalendarPlus, ExternalLink, CheckSquare, Square, Plus } from 'lucide-react'
import { TEAM, TASK_STATUSES, TASK_PRIORITIES, TASK_EFFORTS, TASK_TYPES } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTime } from '../context/TimeContext.jsx'
import { genId, isoToday } from '../lib/storage.js'
import TaskPhotos from './TaskPhotos.jsx'
import TaskFiles from './TaskFiles.jsx'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A08 } from '../lib/theme.js'

const INPUT_STYLE = {
  width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '10px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none',
}
const LABEL_STYLE = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
}

/* ─── Pill selector (single choice from a coloured list) ───────────────────── */
function PillSelect({ options, value, onChange, allowNull = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const active = value === o.id
        return (
          <button key={o.id} type="button" onClick={() => onChange(allowNull && active ? null : o.id)}
            style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
              background: active ? `${o.color}22` : 'transparent', border: `1px solid ${active ? o.color + '90' : BORDER}`,
              color: active ? o.color : MUTED, fontWeight: active ? 600 : 400 }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Person picker (single = owner, or multi = collaborators) ─────────────── */
function PeoplePicker({ value, onChange, multi = false, exclude = [] }) {
  const list = TEAM.filter(u => !exclude.includes(u.id))
  const isActive = u => multi ? value.includes(u.id) : value === u.id
  function toggle(id) {
    if (multi) onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
    else onChange(value === id ? null : id)
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {list.map(u => {
        const active = isActive(u)
        return (
          <button key={u.id} type="button" onClick={() => toggle(u.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: active ? `${u.color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? u.color + '80' : BORDER}`, cursor: 'pointer' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
            </div>
            <span style={{ fontSize: 13, color: active ? u.color : MUTED }}>{u.name}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Tag input (material / tools) ─────────────────────────────────────────── */
function TagInput({ id, tags, onChange, placeholder, historyKey }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(historyKey) || '[]') } catch { return [] }
  })
  function add(val) {
    const t = val.trim()
    if (!t || tags.includes(t)) { setInput(''); return }
    onChange([...tags, t])
    const next = [t, ...history.filter(x => x !== t)].slice(0, 60)
    setHistory(next); localStorage.setItem(historyKey, JSON.stringify(next)); setInput('')
  }
  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); add(input) }
    else if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
  }
  function onInput(e) {
    const val = e.target.value
    if (val.includes(',')) val.split(',').forEach(p => p.trim() && add(p.trim()))
    else setInput(val)
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '7px 10px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'text', minHeight: 42 }}
      onClick={() => document.getElementById(id)?.focus()}>
      {tags.map((t, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: A08, border: `1px solid ${A}30`, fontSize: 12, color: FG, flexShrink: 0 }}>
          {t}
          <button type="button" onClick={e => { e.stopPropagation(); onChange(tags.filter((_, j) => j !== i)) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 0, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input id={id} list={`${id}-history`} value={input} onChange={onInput} onKeyDown={onKey}
        onBlur={() => input.trim() && add(input)} placeholder={tags.length === 0 ? placeholder : ''}
        style={{ border: 'none', background: 'transparent', outline: 'none', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, flexGrow: 1, minWidth: 90, padding: '2px' }} />
      <datalist id={`${id}-history`}>
        {history.filter(t => !tags.includes(t)).map(t => <option key={t} value={t} />)}
      </datalist>
    </div>
  )
}

export default function TaskModal({ initialTask, defaults, onSave, onClose }) {
  const { projects, clients, jobs, boards, createJob, updateTask } = useOps()
  const { user } = useAuth()
  const { entries, logTime } = useTime()
  const navigate = useNavigate()
  const editing = !!initialTask

  const taskEntries = editing ? (entries || []).filter(e => e.task_id === initialTask.id) : []
  const loggedHours = taskEntries.reduce((s, e) => s + Number(e.hours || 0), 0)
  const [timeForm, setTimeForm] = useState({ user_id: user?.id || 'malte', hours: '', date: isoToday(), description: '' })
  function addTime() {
    if (!timeForm.hours || Number(timeForm.hours) <= 0) return
    logTime({ user_id: timeForm.user_id, project_id: form.project_id || null, task_id: initialTask.id, date: timeForm.date, hours: Number(timeForm.hours), description: timeForm.description })
    setTimeForm(f => ({ ...f, hours: '', description: '' }))
  }

  const [form, setForm] = useState({
    title:          initialTask?.title || '',
    description:    initialTask?.description || '',
    board_id:       initialTask?.board_id || defaults?.board_id || '',
    status:         initialTask?.status || defaults?.status || 'not_started',
    priority:       initialTask?.priority || 'medium',
    effort:         initialTask?.effort || null,
    task_type:      initialTask?.task_type || '',
    client_id:      initialTask?.client_id || defaults?.client_id || '',
    project_id:     initialTask?.project_id || defaults?.project_id || '',
    job_id:         initialTask?.job_id || '',
    owner_id:       initialTask?.owner_id || defaults?.owner_id || '',
    assigned_users: initialTask?.assigned_users || [],
    start_date:     initialTask?.start_date || '',
    due_date:       initialTask?.due_date || '',
    location:       initialTask?.location || '',
    lat:            initialTask?.lat ?? null,
    lng:            initialTask?.lng ?? null,
    material:       initialTask?.material || [],
    tools:          initialTask?.tools || [],
    checklist:      initialTask?.checklist || [],
    summary:        initialTask?.summary || '',
  })
  const [checkInput, setCheckInput] = useState('')

  function addCheckItem(text) {
    const t = text.trim()
    if (!t) return
    setForm(f => ({ ...f, checklist: [...f.checklist, { id: genId(), text: t, done: false }] }))
    setCheckInput('')
  }
  function toggleCheckItem(cid) {
    setForm(f => ({ ...f, checklist: f.checklist.map(i => i.id === cid ? { ...i, done: !i.done } : i) }))
  }
  function removeCheckItem(cid) {
    setForm(f => ({ ...f, checklist: f.checklist.filter(i => i.id !== cid) }))
  }
  const checkDone = form.checklist.filter(i => i.done).length

  // Location autocomplete (Nominatim, wie bei Einsätzen)
  const [locSuggestions, setLocSuggestions] = useState([])
  const [locOpen, setLocOpen] = useState(false)
  const locRef = useRef(null)
  const locDebounce = useRef(null)
  useEffect(() => {
    if (!locOpen) return
    const h = e => { if (!locRef.current?.contains(e.target)) setLocOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [locOpen])
  function handleLocationChange(val) {
    setForm(f => ({ ...f, location: val }))
    clearTimeout(locDebounce.current)
    if (val.length < 3) { setLocSuggestions([]); setLocOpen(false); return }
    locDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&countrycodes=de`, { headers: { 'Accept-Language': 'de' } })
        const data = await res.json()
        setLocSuggestions(data); setLocOpen(data.length > 0)
      } catch { /* offline */ }
    }, 350)
  }
  function selectLocation(item) {
    setForm(f => ({ ...f, location: item.display_name, lat: parseFloat(item.lat), lng: parseFloat(item.lon) }))
    setLocSuggestions([]); setLocOpen(false)
  }

  const typeColor = TASK_TYPES.find(t => t.id === form.task_type)?.color || A
  const board = boards.find(b => b.id === form.board_id)

  // Bereich wählen → Standard-Kunde übernehmen (falls Aufgabe noch keinen hat)
  function selectBoard(bid) {
    const b = boards.find(x => x.id === bid)
    setForm(f => ({ ...f, board_id: bid, client_id: f.client_id || b?.client_id || '' }))
  }
  // Projekt wählen → Kunde + Koordinaten übernehmen
  function selectProject(pid) {
    const proj = projects.find(p => p.id === pid)
    const clientId = proj?.client_id || clients.find(c => c.name === proj?.client)?.id || form.client_id
    setForm(f => ({
      ...f, project_id: pid, client_id: clientId || '',
      location: f.location || proj?.location || '',
      lat: f.lat ?? proj?.lat ?? null,
      lng: f.lng ?? proj?.lng ?? null,
    }))
  }

  function collectData() {
    return {
      title: form.title.trim(), description: form.description,
      board_id: form.board_id || null, status: form.status, priority: form.priority,
      effort: form.effort || null, task_type: form.task_type || null,
      client_id: form.client_id || null, project_id: form.project_id || null, job_id: form.job_id || null,
      owner_id: form.owner_id || null, assigned_users: form.assigned_users,
      start_date: form.start_date || null, due_date: form.due_date || null,
      location: form.location || null, lat: form.lat ?? null, lng: form.lng ?? null,
      material: form.material, tools: form.tools, checklist: form.checklist, summary: form.summary,
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(collectData())
  }

  function showOnMap() {
    if (form.lat && form.lng) navigate('/map', { state: { focusCoords: [form.lat, form.lng], focusLabel: form.title } })
    else if (form.project_id) navigate('/map', { state: { focusProjectId: form.project_id } })
  }

  // Aus ToDo einen terminierten Einsatz erzeugen und verknüpfen
  function convertToJob() {
    const workers = [form.owner_id, ...form.assigned_users].filter(Boolean)
    const date = form.start_date || form.due_date || new Date().toISOString().slice(0, 10)
    const job = createJob({
      project_id: form.project_id || null,
      title: form.title.trim() || 'Einsatz aus Aufgabe',
      job_type: form.task_type || 'sonstiges',
      date,
      date_end: form.due_date && form.due_date > date ? form.due_date : null,
      assigned_users: [...new Set(workers)],
      vehicle_ids: [], vehicle_id: null,
      tools: form.tools || [],
      location: form.location || null,
      notes: form.description || '',
      status: 'planned',
      start_time: null, end_time: null, color: null,
    })
    if (editing) updateTask(initialTask.id, { job_id: job.id })
    onClose()
    navigate('/jobs')
  }

  const linkableJobs = jobs.filter(j => !form.project_id || j.project_id === form.project_id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD, zIndex: 2 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: board?.color || typeColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
              {board ? `${board.emoji} ${board.name}` : (editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe')}
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.title || 'Titel eingeben…'}</div>
          </div>
          <button onClick={onClose} style={{ background: A06, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={LABEL_STYLE}>Aufgabe *</label>
            <input style={INPUT_STYLE} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Rankhilfen für Kletterpflanzen installieren" required autoFocus={!editing} />
          </div>

          {/* Bereich + Aufgabentyp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Bereich</label>
              <select style={{ ...INPUT_STYLE, borderColor: board ? board.color + '60' : BORDER, color: board ? board.color : FG }} value={form.board_id} onChange={e => selectBoard(e.target.value)}>
                <option value="" style={{ color: FG }}>— kein Bereich —</option>
                {boards.map(b => <option key={b.id} value={b.id} style={{ color: FG }}>{b.emoji} {b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Aufgabentyp</label>
              <select style={{ ...INPUT_STYLE, borderColor: form.task_type ? typeColor + '60' : BORDER, color: form.task_type ? typeColor : FG }} value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
                <option value="" style={{ color: FG }}>— Typ wählen —</option>
                {TASK_TYPES.map(t => <option key={t.id} value={t.id} style={{ color: FG }}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Kunde + Projekt */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Kunde</label>
              <select style={INPUT_STYLE} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                <option value="">— kein Kunde —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Projekt</label>
              <select style={INPUT_STYLE} value={form.project_id} onChange={e => selectProject(e.target.value)}>
                <option value="">— kein Projekt —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={LABEL_STYLE}>Status</label>
            <PillSelect options={TASK_STATUSES} value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />
          </div>

          {/* Priority + Effort */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={LABEL_STYLE}>Priorität</label>
              <PillSelect options={TASK_PRIORITIES} value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Aufwand</label>
              <PillSelect options={TASK_EFFORTS} value={form.effort} onChange={v => setForm(f => ({ ...f, effort: v }))} allowNull />
            </div>
          </div>

          {/* Verantwortlich */}
          <div>
            <label style={LABEL_STYLE}>Verantwortlich</label>
            <PeoplePicker value={form.owner_id} onChange={v => setForm(f => ({ ...f, owner_id: v, assigned_users: f.assigned_users.filter(u => u !== v) }))} />
          </div>

          {/* Mitarbeitende */}
          <div>
            <label style={LABEL_STYLE}>Mitarbeitende</label>
            <PeoplePicker multi value={form.assigned_users} exclude={form.owner_id ? [form.owner_id] : []} onChange={v => setForm(f => ({ ...f, assigned_users: v }))} />
          </div>

          {/* Zeitraum */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Zeitraum von</label>
              <input type="date" style={INPUT_STYLE} value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL_STYLE}>bis / fällig</label>
              <input type="date" style={INPUT_STYLE} value={form.due_date || ''} min={form.start_date || undefined} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>

          {/* Ort + Karte */}
          <div ref={locRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={LABEL_STYLE}>Ort</label>
              {(form.lat && form.lng) || form.project_id ? (
                <button type="button" onClick={showOnMap}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>
                  <ExternalLink size={11} /> Auf Karte zeigen
                </button>
              ) : null}
            </div>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: form.lat ? A : MUTED, pointerEvents: 'none', zIndex: 1 }} />
              <input style={{ ...INPUT_STYLE, paddingLeft: 34 }} value={form.location} onChange={e => handleLocationChange(e.target.value)}
                onFocus={() => locSuggestions.length > 0 && setLocOpen(true)} placeholder="Adresse eingeben…" autoComplete="off" />
              {locOpen && locSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 500, background: '#0d1a23', border: `1px solid ${BORDER}`, borderRadius: 6, maxHeight: 220, overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,0.55)' }}>
                  {locSuggestions.map((item, i) => (
                    <div key={i} onMouseDown={e => { e.preventDefault(); selectLocation(item) }}
                      style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: i < locSuggestions.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,170,86,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontSize: 13, color: FG, lineHeight: 1.3 }}>{item.display_name.split(',').slice(0, 2).join(',')}</div>
                      <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Mono', monospace", marginTop: 2 }}>{[item.address?.city || item.address?.town, item.address?.postcode].filter(Boolean).join(' · ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Material + Werkzeug */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Material</label>
              <TagInput id="task-material" tags={form.material} onChange={v => setForm(f => ({ ...f, material: v }))} placeholder="Draht, Substrat…" historyKey="luma_material_history" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Werkzeug</label>
              <TagInput id="task-tools" tags={form.tools} onChange={v => setForm(f => ({ ...f, tools: v }))} placeholder="Leiter, Drahtschere…" historyKey="luma_tools_history" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={LABEL_STYLE}>Beschreibung</label>
            <textarea style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details zur Aufgabe…" />
          </div>

          {/* Checkliste / Teilaufgaben */}
          <div>
            <label style={LABEL_STYLE}>
              Checkliste{form.checklist.length > 0 && <span style={{ color: A, marginLeft: 6 }}>{checkDone}/{form.checklist.length}</span>}
            </label>
            {form.checklist.length > 0 && (
              <div style={{ height: 4, background: A06, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${Math.round((checkDone / form.checklist.length) * 100)}%`, height: '100%', background: A, transition: 'width 0.2s' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {form.checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
                  <button type="button" onClick={() => toggleCheckItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.done ? A : MUTED, display: 'flex', flexShrink: 0, padding: 0 }}>
                    {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: item.done ? MUTED : FG, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                  <button type="button" onClick={() => removeCheckItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', flexShrink: 0, padding: 0 }}><X size={12} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={checkInput} onChange={e => setCheckInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(checkInput) } }}
                placeholder="Teilaufgabe hinzufügen…"
                style={{ ...INPUT_STYLE, padding: '8px 10px', fontSize: 13 }} />
              <button type="button" onClick={() => addCheckItem(checkInput)}
                style={{ padding: '0 12px', borderRadius: 6, background: A06, border: `1px solid ${BORDER}`, color: A, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Plus size={16} /></button>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label style={LABEL_STYLE}>Zusammenfassung <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>(kurz)</span></label>
            <input style={INPUT_STYLE} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Einzeiler / Ergebnis" />
          </div>

          {/* Link to Einsatz */}
          <div>
            <label style={LABEL_STYLE}>Mit Einsatz verknüpfen <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>(optional)</span></label>
            <select style={INPUT_STYLE} value={form.job_id} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}>
              <option value="">— kein Einsatz —</option>
              {linkableJobs.map(j => <option key={j.id} value={j.id}>{j.title} · {j.date}</option>)}
            </select>
          </div>

          {/* Fotos (nur im Bearbeiten-Modus, braucht Task-ID) */}
          {editing && initialTask?.id && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <TaskPhotos taskId={initialTask.id} uploadedBy={user?.id || 'unknown'} />
            </div>
          )}

          {/* Datei-Anhänge (nur im Bearbeiten-Modus) */}
          {editing && initialTask?.id && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <TaskFiles taskId={initialTask.id} uploadedBy={user?.id || 'unknown'} />
            </div>
          )}

          {/* Zeiterfassung (nur im Bearbeiten-Modus) */}
          {editing && initialTask?.id && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <label style={LABEL_STYLE}>
                Zeiterfassung{loggedHours > 0 && <span style={{ color: A, marginLeft: 6 }}>{loggedHours}h erfasst</span>}
              </label>
              {taskEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {[...taskEntries].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6).map(e => {
                    const u = TEAM.find(x => x.id === e.user_id)
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MUTED }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, minWidth: 64 }}>{e.date}</span>
                        {u && <span style={{ color: u.color, minWidth: 44 }}>{u.name}</span>}
                        <span style={{ color: FG, fontWeight: 600, minWidth: 34 }}>{e.hours}h</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={timeForm.user_id} onChange={e => setTimeForm(f => ({ ...f, user_id: e.target.value }))}
                  style={{ ...INPUT_STYLE, width: 'auto', flex: '0 0 auto', padding: '8px 10px', fontSize: 13 }}>
                  {TEAM.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="number" min="0.25" step="0.25" value={timeForm.hours} onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))}
                  placeholder="Std." style={{ ...INPUT_STYLE, width: 70, flex: '0 0 auto', padding: '8px 10px', fontSize: 13 }} />
                <input type="date" value={timeForm.date} onChange={e => setTimeForm(f => ({ ...f, date: e.target.value }))}
                  style={{ ...INPUT_STYLE, width: 'auto', flex: '0 0 auto', padding: '8px 10px', fontSize: 13 }} />
                <input value={timeForm.description} onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Tätigkeit (optional)" style={{ ...INPUT_STYLE, flex: 1, minWidth: 120, padding: '8px 10px', fontSize: 13 }} />
                <button type="button" onClick={addTime}
                  style={{ padding: '8px 14px', borderRadius: 6, background: A06, border: `1px solid ${BORDER}`, color: A, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>+ Zeit</button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, flexWrap: 'wrap' }}>
            <button type="button" onClick={convertToJob} title="Aus dieser Aufgabe einen terminierten Einsatz erstellen"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 6, background: 'transparent', border: `1px solid ${A}55`, color: A, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
              <CalendarPlus size={14} /> In Einsatz umwandeln
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose}
                style={{ padding: '10px 20px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>Abbrechen</button>
              <button type="submit"
                style={{ padding: '10px 24px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
                {editing ? 'Speichern' : 'Aufgabe anlegen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
