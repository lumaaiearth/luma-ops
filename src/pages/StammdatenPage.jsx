import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A14, A18, A30, WARN, DANGER } from '../lib/theme.js'
import { Button, EmptyState, Avatar } from '../components/ui.jsx'
import { genId } from '../lib/storage.js'
import { FREELANCER_COLORS, initialsFor, avatarFor } from '../lib/people.js'
import { Plus, Pencil, Trash2, X, Check, MapPin, User, Building2, Phone, Mail, ExternalLink, Users } from 'lucide-react'

const INPUT = {
  background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', width: '100%',
}
const LABEL = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
}

const STATUS_COLORS = { active: A, paused: WARN, completed: '#6B7280' }
const STATUS_LABELS = { active: 'Aktiv', paused: 'Pausiert', completed: 'Abgeschlossen' }

// ── Project Form Modal ─────────────────────────────────────────────────────────
function ProjectModal({ project, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    location: project?.location || '',
    client_id: project?.client_id || '',
    client: project?.client || '',
    lat: project?.lat || '',
    lng: project?.lng || '',
    status: project?.status || 'active',
    notes: project?.notes || '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const selectedClient = clients.find(c => c.id === form.client_id)
    onSave({
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      client: selectedClient?.name || form.client || '',
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{project ? 'Projekt bearbeiten' : 'Neues Projekt'}</span>
          <button onClick={onClose} style={{ background: A06, border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Projektname *</label>
            <input style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. MV Tiny Forest" required />
          </div>
          <div>
            <label style={LABEL}>Auftraggeber</label>
            <select style={INPUT} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value, client: clients.find(c => c.id === e.target.value)?.name || f.client }))}>
              <option value="">Kein Auftraggeber / manuell eingeben</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!form.client_id && (
              <input style={{ ...INPUT, marginTop: 6 }} value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Freitext Auftraggeber (optional)" />
            )}
          </div>
          <div>
            <label style={LABEL}>Standort / Adresse</label>
            <input style={INPUT} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="z.B. Berlin-Märkisches Viertel" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>Breitengrad (lat)</label>
              <input style={INPUT} type="number" step="any" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="52.5705" />
            </div>
            <div>
              <label style={LABEL}>Längengrad (lng)</label>
              <input style={INPUT} type="number" step="any" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="13.3530" />
            </div>
          </div>
          <div>
            <label style={LABEL}>Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setForm(f => ({ ...f, status: k }))}
                  style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${form.status === k ? STATUS_COLORS[k] : BORDER}`, background: form.status === k ? `color-mix(in srgb, ${STATUS_COLORS[k]} 10%, transparent)` : 'transparent', color: form.status === k ? STATUS_COLORS[k] : MUTED, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={LABEL}>Notizen</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>Abbrechen</button>
            <button type="submit" className="lu-btn-primary" style={{ padding: '9px 22px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {project ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Client Form Modal ──────────────────────────────────────────────────────────
function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    name: client?.name || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.contact_email || '',
    contact_phone: client?.contact_phone || '',
    address: client?.address || '',
    notes: client?.notes || '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{client ? 'Kunde bearbeiten' : 'Neuer Kunde'}</span>
          <button onClick={onClose} style={{ background: A06, border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Name / Organisation *</label>
            <input style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. BEW / Vattenfall" required />
          </div>
          <div>
            <label style={LABEL}>Ansprechpartner</label>
            <input style={INPUT} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Vor- und Nachname" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>E-Mail</label>
              <input style={INPUT} type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="kontakt@firma.de" />
            </div>
            <div>
              <label style={LABEL}>Telefon</label>
              <input style={INPUT} type="tel" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+49 30 ..." />
            </div>
          </div>
          <div>
            <label style={LABEL}>Adresse</label>
            <input style={INPUT} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Straße, PLZ Stadt" />
          </div>
          <div>
            <label style={LABEL}>Notizen</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>Abbrechen</button>
            <button type="submit" className="lu-btn-primary" style={{ padding: '9px 22px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {client ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Freelancer / Personen Form Modal ───────────────────────────────────────────
function FreelancerModal({ person, usedColors, onSave, onClose }) {
  const [form, setForm] = useState({
    name: person?.name || '',
    firma: person?.firma || '',
    phone: person?.phone || '',
    email: person?.email || '',
    stundensatz: person?.stundensatz ?? '',
    color: person?.color || FREELANCER_COLORS.find(c => !usedColors.includes(c)) || FREELANCER_COLORS[0],
    notizen: person?.notizen || '',
    active: person?.active !== false,
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      ...form,
      name: form.name.trim(),
      stundensatz: form.stundensatz === '' ? null : Number(form.stundensatz),
      initials: initialsFor(form.name),
      rolle: 'freelancer',
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{person ? 'Person bearbeiten' : 'Neue Person (Freelancer)'}</span>
          <button onClick={onClose} style={{ background: A06, border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Name *</label>
            <input style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vor- und Nachname" required autoFocus />
          </div>
          <div>
            <label style={LABEL}>Firma / Gewerbe</label>
            <input style={INPUT} value={form.firma} onChange={e => setForm(f => ({ ...f, firma: e.target.value }))} placeholder="z.B. Garten Müller GbR (optional)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>Telefon</label>
              <input style={INPUT} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+49 …" />
            </div>
            <div>
              <label style={LABEL}>E-Mail</label>
              <input style={INPUT} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@mail.de" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>Stundensatz (€/h)</label>
              <input style={INPUT} type="number" min="0" step="0.5" value={form.stundensatz} onChange={e => setForm(f => ({ ...f, stundensatz: e.target.value }))} placeholder="z.B. 45" />
            </div>
            <div>
              <label style={LABEL}>Farbe</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 4 }}>
                {FREELANCER_COLORS.slice(0, 10).map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: form.color === c ? `2px solid ${FG}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.color === c && <Check size={11} color="#001219" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label style={LABEL}>Notizen</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} placeholder="Qualifikationen, Verfügbarkeit, …" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: A, cursor: 'pointer', width: 15, height: 15 }} />
            <span style={{ fontSize: 13, color: form.active ? FG : MUTED }}>Aktiv — in Auswahlmenüs anzeigen</span>
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>Abbrechen</button>
            <button type="submit" className="lu-btn-primary" style={{ padding: '9px 22px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {person ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StammdatenPage() {
  const { projects, clients, freelancers, createProject, updateProject, deleteProject, createClient, updateClient, deleteClient, createFreelancer, updateFreelancer, deleteFreelancer } = useOps()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => ['projects', 'clients', 'people'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'projects')
  const [personModal, setPersonModal] = useState(null) // null | 'new' | person object
  const [expandedClient, setExpandedClient] = useState(null)
  const [projectModal, setProjectModal] = useState(null) // null | 'new' | project object
  const [clientModal, setClientModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function handleSaveProject(data) {
    if (projectModal === 'new') {
      await createProject({ ...data, id: genId() })
    } else {
      updateProject(projectModal.id, data)
    }
    setProjectModal(null)
  }

  async function handleSaveClient(data) {
    if (clientModal === 'new') {
      await createClient(data)
    } else {
      updateClient(clientModal.id, data)
    }
    setClientModal(null)
  }

  async function handleSavePerson(data) {
    if (personModal === 'new') {
      await createFreelancer(data)
    } else {
      updateFreelancer(personModal.id, data)
    }
    setPersonModal(null)
  }

  function confirmDelete(type, id, name) {
    setDeleteConfirm({ type, id, name })
  }

  function doDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'project') deleteProject(deleteConfirm.id)
    else if (deleteConfirm.type === 'person') deleteFreelancer(deleteConfirm.id)
    else deleteClient(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em' }}>Stammdaten</h1>
        <button
          onClick={() => tab === 'projects' ? setProjectModal('new') : tab === 'people' ? setPersonModal('new') : setClientModal('new')}
          className="lu-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <Plus size={14} /> {tab === 'projects' ? 'Neues Projekt' : tab === 'people' ? 'Neue Person' : 'Neuer Kunde'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        {[['projects', `Projekte (${projects.length})`], ['clients', `Kunden (${clients.length})`], ['people', `Personen (${freelancers.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', color: tab === id ? A : MUTED, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, cursor: 'pointer', borderBottom: `2px solid ${tab === id ? A : 'transparent'}`, marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Projects list */}
      {tab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedProjects.length === 0 && (
            <EmptyState title="Keine Projekte" hint="Lege über „Neues Projekt“ das erste an." />
          )}
          {sortedProjects.map(p => {
            const client = clients.find(c => c.id === p.client_id)
            const statusColor = STATUS_COLORS[p.status] || A
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, borderLeft: `3px solid ${statusColor}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <button onClick={() => navigate(`/projects/${p.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: FG }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                      <ExternalLink size={10} color={A} />
                    </button>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: statusColor, background: `${statusColor}14`, padding: '2px 6px', borderRadius: 4 }}>
                      {STATUS_LABELS[p.status] || 'Aktiv'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {(client?.name || p.client) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: A }}>
                        <Building2 size={10} /> {client?.name || p.client}
                      </span>
                    )}
                    {p.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                        <MapPin size={10} /> {p.location}
                      </span>
                    )}
                    {p.lat && p.lng && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>
                        {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setProjectModal(p)} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => confirmDelete('project', p.id, p.name)} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Clients list */}
      {tab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {clients.length === 0 && (
            <EmptyState title="Keine Kunden" hint="Lege über „Neuer Kunde“ den ersten an." />
          )}
          {clients.map(c => {
            const clientProjects = projects.filter(p => p.client_id === c.id).sort((a, b) => a.name.localeCompare(b.name))
            const isExpanded = expandedClient === c.id
            return (
              <div key={c.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, borderLeft: `3px solid ${A}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <button onClick={() => setExpandedClient(isExpanded ? null : c.id)} style={{ width: 36, height: 36, borderRadius: '50%', background: A18, border: `1px solid ${A30}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                    <Building2 size={16} color={A} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <button onClick={() => navigate(`/clients/${c.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: A, textAlign: 'left', textDecoration: 'underline', textDecorationColor: `color-mix(in srgb, ${A} 25%, transparent)` }}>{c.name}</button>
                      {clientProjects.length > 0 && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: A, background: A14, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }} onClick={() => setExpandedClient(isExpanded ? null : c.id)}>
                          {clientProjects.length} Projekt{clientProjects.length > 1 ? 'e' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {c.contact_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                          <User size={9} /> {c.contact_name}
                        </span>
                      )}
                      {c.contact_email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                          <Mail size={9} /> {c.contact_email}
                        </span>
                      )}
                      {c.contact_phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                          <Phone size={9} /> {c.contact_phone}
                        </span>
                      )}
                      {!c.contact_name && !c.contact_email && !c.contact_phone && c.address && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{c.address}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setClientModal(c)} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => confirmDelete('client', c.id, c.name)} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {isExpanded && clientProjects.length > 0 && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {clientProjects.map(p => {
                      const sc = STATUS_COLORS[p.status] || A
                      return (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 5, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, color: FG }}>{p.name}</span>
                          {p.location && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{p.location}</span>}
                          <ExternalLink size={10} color={A} />
                        </button>
                      )
                    })}
                  </div>
                )}
                {isExpanded && clientProjects.length === 0 && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, padding: '10px 16px', fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>Keine Projekte</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Personen / Freelancer list */}
      {tab === 'people' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.6 }}>
            Selbstständige / Freelancer, die zusätzlich zum festen Team für Einsätze und Aufgaben ausgewählt werden können (bis zu 20+ Personen). Inaktive Personen bleiben in alten Einsätzen sichtbar, tauchen aber nicht mehr in Auswahlmenüs auf.
          </div>
          {freelancers.length === 0 && (
            <EmptyState icon={Users} title="Noch keine Freelancer" hint="Lege über „Neue Person“ die erste an." />
          )}
          {freelancers.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, borderLeft: `3px solid ${p.color}`, opacity: p.active === false ? 0.55 : 1 }}>
              <Avatar initials={p.initials} color={p.color} size={34} src={avatarFor(p.id)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: FG }}>{p.name}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: A, background: A14, padding: '2px 6px', borderRadius: 4 }}>Freelancer</span>
                  {p.active === false && (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>Inaktiv</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {p.firma && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                      <Building2 size={9} /> {p.firma}
                    </span>
                  )}
                  {p.phone && (
                    <a href={`tel:${p.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, textDecoration: 'none' }}>
                      <Phone size={9} /> {p.phone}
                    </a>
                  )}
                  {p.email && (
                    <a href={`mailto:${p.email}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, textDecoration: 'none' }}>
                      <Mail size={9} /> {p.email}
                    </a>
                  )}
                  {p.stundensatz != null && p.stundensatz !== '' && (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{p.stundensatz} €/h</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => updateFreelancer(p.id, { active: p.active === false })} className="lu-btn-ghost" title={p.active === false ? 'Aktivieren' : 'Deaktivieren'}
                  style={{ padding: '5px 10px', borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {p.active === false ? 'Aktivieren' : 'Deaktivieren'}
                </button>
                <button onClick={() => setPersonModal(p)} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => confirmDelete('person', p.id, p.name)} className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {projectModal && (
        <ProjectModal
          project={projectModal === 'new' ? null : projectModal}
          clients={clients}
          onSave={handleSaveProject}
          onClose={() => setProjectModal(null)}
        />
      )}
      {clientModal && (
        <ClientModal
          client={clientModal === 'new' ? null : clientModal}
          onSave={handleSaveClient}
          onClose={() => setClientModal(null)}
        />
      )}
      {personModal && (
        <FreelancerModal
          person={personModal === 'new' ? null : personModal}
          usedColors={freelancers.map(f => f.color)}
          onSave={handleSavePerson}
          onClose={() => setPersonModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()} className="lu-fade-in" style={{ position: 'relative', background: CARD, border: `1px solid color-mix(in srgb, ${DANGER} 30%, transparent)`, borderRadius: 10, padding: '24px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 14, color: FG, marginBottom: 8 }}>
              <strong style={{ color: DANGER }}>{deleteConfirm.name}</strong> löschen?
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Diese Aktion kann nicht rückgängig gemacht werden.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Abbrechen</Button>
              <Button variant="danger" onClick={doDelete}>Löschen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
