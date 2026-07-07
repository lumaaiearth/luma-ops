import { useState } from 'react'
import { X } from 'lucide-react'
import { TEAM, TASK_STATUSES, TASK_PRIORITIES, TASK_EFFORTS, TASK_TYPES } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
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

/* ─── Pill selector (single choice from a coloured list) ───────────────────── */
function PillSelect({ options, value, onChange, allowNull = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const active = value === o.id
        return (
          <button key={o.id} type="button"
            onClick={() => onChange(allowNull && active ? null : o.id)}
            style={{
              padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
              fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
              background: active ? `${o.color}22` : 'transparent',
              border: `1px solid ${active ? o.color + '90' : BORDER}`,
              color: active ? o.color : MUTED,
              fontWeight: active ? 600 : 400, transition: 'all 0.15s',
            }}>
            {o.label}
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
    setHistory(next)
    localStorage.setItem(historyKey, JSON.stringify(next))
    setInput('')
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
    <div
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '7px 10px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'text', minHeight: 42 }}
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
        onBlur={() => input.trim() && add(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{ border: 'none', background: 'transparent', outline: 'none', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, flexGrow: 1, minWidth: 90, padding: '2px' }} />
      <datalist id={`${id}-history`}>
        {history.filter(t => !tags.includes(t)).map(t => <option key={t} value={t} />)}
      </datalist>
    </div>
  )
}

export default function TaskModal({ initialTask, defaults, onSave, onClose }) {
  const { projects, clients, jobs } = useOps()
  const editing = !!initialTask

  const [form, setForm] = useState({
    title:          initialTask?.title || '',
    description:    initialTask?.description || '',
    status:         initialTask?.status || defaults?.status || 'not_started',
    priority:       initialTask?.priority || 'medium',
    effort:         initialTask?.effort || null,
    task_type:      initialTask?.task_type || '',
    client_id:      initialTask?.client_id || defaults?.client_id || '',
    project_id:     initialTask?.project_id || defaults?.project_id || '',
    job_id:         initialTask?.job_id || '',
    assigned_users: initialTask?.assigned_users || [],
    due_date:       initialTask?.due_date || '',
    material:       initialTask?.material || [],
    tools:          initialTask?.tools || [],
    summary:        initialTask?.summary || '',
  })

  const typeColor = TASK_TYPES.find(t => t.id === form.task_type)?.color || A

  function toggleUser(uid) {
    setForm(f => ({ ...f, assigned_users: f.assigned_users.includes(uid) ? f.assigned_users.filter(u => u !== uid) : [...f.assigned_users, uid] }))
  }

  // Wählt man ein Projekt, wird der Kunde automatisch mitgesetzt (Vernetzung)
  function selectProject(pid) {
    const proj = projects.find(p => p.id === pid)
    const clientId = proj?.client_id || clients.find(c => c.name === proj?.client)?.id || form.client_id
    setForm(f => ({ ...f, project_id: pid, client_id: clientId || '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({
      title:          form.title.trim(),
      description:    form.description,
      status:         form.status,
      priority:       form.priority,
      effort:         form.effort || null,
      task_type:      form.task_type || null,
      client_id:      form.client_id || null,
      project_id:     form.project_id || null,
      job_id:         form.job_id || null,
      assigned_users: form.assigned_users,
      due_date:       form.due_date || null,
      material:       form.material,
      tools:          form.tools,
      summary:        form.summary,
    })
  }

  // Nur Einsätze des gewählten Projekts als verknüpfbar anbieten
  const linkableJobs = jobs.filter(j => !form.project_id || j.project_id === form.project_id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: CARD, zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: typeColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
              {editing ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
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
            <label style={LABEL_STYLE}>Aufgabe *</label>
            <input style={INPUT_STYLE} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Rankhilfen für Kletterpflanzen installieren" required autoFocus={!editing} />
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

          {/* Type + Due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Aufgabentyp</label>
              <select style={{ ...INPUT_STYLE, borderColor: form.task_type ? typeColor + '60' : BORDER, color: form.task_type ? typeColor : FG }} value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
                <option value="" style={{ color: FG }}>— Typ wählen —</option>
                {TASK_TYPES.map(t => <option key={t.id} value={t.id} style={{ color: FG }}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Fällig am</label>
              <input type="date" style={INPUT_STYLE} value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>

          {/* Team */}
          <div>
            <label style={LABEL_STYLE}>Zuständig</label>
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
            <textarea style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80 }} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details zur Aufgabe…" />
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>
              Abbrechen
            </button>
            <button type="submit"
              style={{ padding: '10px 24px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {editing ? 'Speichern' : 'Aufgabe anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
