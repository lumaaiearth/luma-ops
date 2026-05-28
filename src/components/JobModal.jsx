import { useState } from 'react'
import { X, Repeat } from 'lucide-react'
import { TEAM, VEHICLES as VEHICLES_DEFAULT, JOB_TYPES, PROJECTS_OPS } from '../data/seed.js'

const VEHICLES = (() => { try { return JSON.parse(localStorage.getItem('luma_vehicles')) || VEHICLES_DEFAULT } catch { return VEHICLES_DEFAULT } })()
import { A, SURFACE, BORDER, FG, MUTED } from './Layout.jsx'
import { isoToday, addDays } from '../lib/storage.js'

const INPUT_STYLE = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '10px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none',
}

const LABEL_STYLE = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
}

export default function JobModal({ initialDate, initialJob, onSave, onClose, isRecurring = false }) {
  const editing = !!initialJob
  const [form, setForm] = useState({
    project_id: initialJob?.project_id || '',
    title: initialJob?.title || '',
    job_type: initialJob?.job_type || 'pflege',
    date: initialJob?.date || initialDate || isoToday(),
    duration: initialJob?.duration || 'full',
    assigned_users: initialJob?.assigned_users || [],
    vehicle_id: initialJob?.vehicle_id || '',
    tools: initialJob?.tools?.join(', ') || '',
    notes: initialJob?.notes || '',
    status: initialJob?.status || 'planned',
    date_end: initialJob?.date_end || '',
    // Recurring fields
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

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.project_id || !form.title || !form.date) return
    const tools = form.tools.split(',').map(t => t.trim()).filter(Boolean)
    const jobData = {
      project_id: form.project_id,
      title: form.title,
      job_type: form.job_type,
      date: form.date,
      duration: form.duration,
      assigned_users: form.assigned_users,
      vehicle_id: form.vehicle_id || null,
      tools,
      notes: form.notes,
      status: form.status,
      date_end: form.date_end && form.date_end > form.date ? form.date_end : null,
    }
    if (form.make_recurring) {
      onSave({
        type: 'recurring',
        data: { ...jobData, interval_days: Number(form.interval_days), next_date: form.date, active: true }
      })
    } else {
      onSave({ type: 'job', data: jobData })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: '#0d1a23',
          border: `1px solid ${BORDER}`, borderRadius: 8,
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: typeColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
              {editing ? 'Einsatz bearbeiten' : 'Neuer Einsatz'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: FG }}>{form.title || 'Titel eingeben...'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Title */}
          <div>
            <label style={LABEL_STYLE}>Titel *</label>
            <input style={INPUT_STYLE} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Wochenpflege Tiny Forest" required />
          </div>

          {/* Project + Type row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Projekt *</label>
              <select style={INPUT_STYLE} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} required>
                <option value="">Projekt wählen</option>
                {PROJECTS_OPS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Typ</label>
              <select style={{ ...INPUT_STYLE, borderColor: typeColor + '60', color: typeColor }} value={form.job_type} onChange={e => setForm(f => ({ ...f, job_type: e.target.value }))}>
                {JOB_TYPES.map(t => <option key={t.id} value={t.id} style={{ color: FG }}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Datum *</label>
              <input type="date" style={INPUT_STYLE} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value, date_end: f.date_end && f.date_end < e.target.value ? '' : f.date_end }))} required />
            </div>
            <div>
              <label style={LABEL_STYLE}>Ende <span style={{ color: MUTED, fontWeight: 400 }}>(mehrtägig)</span></label>
              <input type="date" style={{ ...INPUT_STYLE, opacity: form.date_end ? 1 : 0.5 }} value={form.date_end} min={form.date} onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Umfang</label>
              <select style={INPUT_STYLE} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                <option value="full">Ganztags</option>
                <option value="half_am">Halbtags Vormittag</option>
                <option value="half_pm">Halbtags Nachmittag</option>
              </select>
            </div>
          </div>

          {/* Team */}
          <div>
            <label style={LABEL_STYLE}>Team</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TEAM.map(u => {
                const active = form.assigned_users.includes(u.id)
                return (
                  <button
                    key={u.id} type="button"
                    onClick={() => toggleUser(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 20,
                      background: active ? `${u.color}22` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? u.color + '80' : BORDER}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                    </div>
                    <span style={{ fontSize: 13, color: active ? u.color : MUTED }}>{u.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <label style={LABEL_STYLE}>Fahrzeug</label>
            <select style={INPUT_STYLE} value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Kein Fahrzeug</option>
              {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {/* Tools */}
          <div>
            <label style={LABEL_STYLE}>Werkzeug / Material</label>
            <input style={INPUT_STYLE} value={form.tools} onChange={e => setForm(f => ({ ...f, tools: e.target.value }))} placeholder="Sense, Schubkarre, Mulch (kommagetrennt)" />
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL_STYLE}>Notizen</label>
            <textarea style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 72 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
          </div>

          {/* Recurring toggle (only for new jobs) */}
          {!editing && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div
                  onClick={() => setForm(f => ({ ...f, make_recurring: !f.make_recurring }))}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: form.make_recurring ? A : 'rgba(255,255,255,0.1)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{ position: 'absolute', top: 2, left: form.make_recurring ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 13, color: form.make_recurring ? FG : MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Repeat size={13} /> Wiederkehrender Einsatz
                </span>
              </label>
              {form.make_recurring && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: MUTED }}>Alle</span>
                  <input
                    type="number" min="1" max="365"
                    style={{ ...INPUT_STYLE, width: 72 }}
                    value={form.interval_days}
                    onChange={e => setForm(f => ({ ...f, interval_days: e.target.value }))}
                  />
                  <span style={{ fontSize: 13, color: MUTED }}>Tage</span>
                </div>
              )}
            </div>
          )}

          {/* Status (edit only) */}
          {editing && (
            <div>
              <label style={LABEL_STYLE}>Status</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['planned', 'in_progress', 'done', 'cancelled'].map(s => {
                  const colors = { planned: '#6EA8C0', in_progress: A, done: '#22EAA7', cancelled: '#6B7280' }
                  const labels = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }
                  const active = form.status === s
                  return (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                      style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${active ? colors[s] : BORDER}`, background: active ? `${colors[s]}22` : 'transparent', color: active ? colors[s] : MUTED, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {labels[s]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>
              Abbrechen
            </button>
            <button type="submit" style={{ padding: '10px 24px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {editing ? 'Speichern' : form.make_recurring ? 'Vorlage erstellen' : 'Einsatz anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
