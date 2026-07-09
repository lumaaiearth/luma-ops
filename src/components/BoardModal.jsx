import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { TEAM, BOARD_EMOJIS, BOARD_COLORS } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
import { BORDER, FG, MUTED } from '../lib/theme.js'
import { Modal, ModalActions, Button, INPUT_STYLE, LABEL_STYLE } from './ui.jsx'

export default function BoardModal({ initialBoard, onSave, onClose, onDelete }) {
  const { clients } = useOps()
  const editing = !!initialBoard
  const [form, setForm] = useState({
    name:      initialBoard?.name || '',
    emoji:     initialBoard?.emoji || '📋',
    color:     initialBoard?.color || BOARD_COLORS[0],
    members:   initialBoard?.members || [],
    client_id: initialBoard?.client_id || '',
  })

  function toggleMember(id) {
    setForm(f => ({ ...f, members: f.members.includes(id) ? f.members.filter(m => m !== id) : [...f.members, id] }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({ name: form.name.trim(), emoji: form.emoji, color: form.color, members: form.members, client_id: form.client_id || null })
  }

  return (
    <Modal
      eyebrow={editing ? 'Bereich bearbeiten' : 'Neuer Bereich'}
      eyebrowColor={form.color}
      onClose={onClose}
      maxWidth={460}
      zIndex={1100}
    >
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Emoji + Name */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={LABEL_STYLE}>Symbol</label>
              <div style={{ width: 52, height: 44, borderRadius: 8, background: `${form.color}22`, border: `1px solid ${form.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{form.emoji}</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>Name *</label>
              <input style={INPUT_STYLE} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Pflege, LUMA Office, Stromnetz Berlin" required autoFocus />
            </div>
          </div>

          {/* Emoji picker */}
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BOARD_EMOJIS.map(em => (
                <button key={em} type="button" onClick={() => setForm(f => ({ ...f, emoji: em }))}
                  style={{ width: 34, height: 34, borderRadius: 6, fontSize: 18, cursor: 'pointer', background: form.emoji === em ? `${form.color}22` : 'transparent', border: `1px solid ${form.emoji === em ? form.color : BORDER}` }}>{em}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={LABEL_STYLE}>Farbe</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {BOARD_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? `2px solid ${FG}` : `2px solid transparent`, outline: form.color === c ? `1px solid ${c}` : 'none' }} />
              ))}
            </div>
          </div>

          {/* Default client */}
          <div>
            <label style={LABEL_STYLE}>Standard-Kunde <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>(optional)</span></label>
            <select style={INPUT_STYLE} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">— kein fester Kunde —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>Neue Aufgaben in diesem Bereich bekommen diesen Kunden voreingestellt.</div>
          </div>

          {/* Members */}
          <div>
            <label style={LABEL_STYLE}>Mitglieder <span style={{ color: MUTED, fontWeight: 400, fontSize: 9 }}>(wen betrifft dieser Bereich)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TEAM.map(u => {
                const active = form.members.includes(u.id)
                return (
                  <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: active ? `${u.color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? u.color + '80' : BORDER}`, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                    </div>
                    <span style={{ fontSize: 13, color: active ? u.color : MUTED }}>{u.name}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>Leer = betrifft alle.</div>
          </div>

          <ModalActions
            onCancel={onClose}
            submitLabel={editing ? 'Speichern' : 'Bereich anlegen'}
            left={editing && onDelete ? (
              <Button variant="danger" type="button" icon={Trash2} onClick={onDelete} style={{ background: 'transparent' }}>
                Löschen
              </Button>
            ) : <span />}
          />
        </form>
    </Modal>
  )
}
