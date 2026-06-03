import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A14, A18, A30 } from '../lib/theme.js'
import { genId } from '../lib/storage.js'
import { Plus, Pencil, Trash2, X, Check, MapPin, User, Building2, Phone, Mail, ExternalLink } from 'lucide-react'

const INPUT = {
  background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', width: '100%',
}
const LABEL = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
}

const STATUS_COLORS = { active: A, paused: '#F59E0B', completed: '#6B7280' }
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
                  style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${form.status === k ? STATUS_COLORS[k] : BORDER}`, background: form.status === k ? `${STATUS_COLORS[k]}18` : 'transparent', color: form.status === k ? STATUS_COLORS[k] : MUTED, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
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
            <button type="submit" style={{ padding: '9px 22px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
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
            <button type="submit" style={{ padding: '9px 22px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
              {client ? 'Speichern' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StammdatenPage() {
  const { projects, clients, createProject, updateProject, deleteProject, createClient, updateClient, deleteClient } = useOps()
  const navigate = useNavigate()
  const [tab, setTab] = useState('projects')
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

  function confirmDelete(type, id, name) {
    setDeleteConfirm({ type, id, name })
  }

  function doDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'project') deleteProject(deleteConfirm.id)
    else deleteClient(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em' }}>Stammdaten</h1>
        <button
          onClick={() => tab === 'projects' ? setProjectModal('new') : setClientModal('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <Plus size={14} /> {tab === 'projects' ? 'Neues Projekt' : 'Neuer Kunde'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        {[['projects', `Projekte (${projects.length})`], ['clients', `Kunden (${clients.length})`]].map(([id, label]) => (
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
            <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Keine Projekte</div>
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
                  <button onClick={() => setProjectModal(p)} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => confirmDelete('project', p.id, p.name)} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Keine Kunden</div>
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
                      <button onClick={() => navigate(`/clients/${c.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: A, textAlign: 'left', textDecoration: 'underline', textDecorationColor: `${A}40` }}>{c.name}</button>
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
                    <button onClick={() => setClientModal(c)} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => confirmDelete('client', c.id, c.name)} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: CARD, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 8, padding: '24px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 14, color: FG, marginBottom: 8 }}>
              <strong style={{ color: '#ef4444' }}>{deleteConfirm.name}</strong> löschen?
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Diese Aktion kann nicht rückgängig gemacht werden.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 18px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>Abbrechen</button>
              <button onClick={doDelete} style={{ padding: '8px 18px', borderRadius: 6, background: '#ef444420', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
