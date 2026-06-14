import { useState, useEffect } from 'react'
import { FolderOpen, Plus, X, ExternalLink, Pencil } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED, CARD, A06, A14 } from '../lib/theme.js'
import { sb, sbUpsert, sbDelete } from '../lib/supabase.js'

const LOCAL_KEY = 'luma_drive_folders'
function saveLocal(folders) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(folders)) } catch {}
}

const LABEL_STYLE = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
}
const INPUT_STYLE = {
  width: '100%', background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const DEFAULT_FOLDERS = [
  {
    id: 'main-luma',
    name: 'LUMA Hauptordner',
    url: 'https://drive.google.com/drive/folders/1wBwCP2TXxjHitRmH_NZQZMEhrOfxcHSp',
    description: 'Assets, Remote-Sensing, Projektfotos',
  },
]

function dbErr(msg) {
  return (err) => {
    console.error('[Drive]', msg, err?.message || err)
    if (window.__lumaToast) window.__lumaToast(`⚠️ Drive-Fehler: ${err?.message || msg}`)
  }
}

function DriveCardHeader() {
  return (
    <div style={{
      height: 72,
      background: 'linear-gradient(135deg, #1a73e8 0%, #0ea5e9 45%, #34a853 100%)',
      borderRadius: '6px 6px 0 0',
      margin: '-16px -16px 12px -16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Drive logo approximation */}
      <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 2L35 32H3L19 2Z" fill="none"/>
        <path d="M3 32L11 18H27L19 32H3Z" fill="rgba(255,255,255,0.55)"/>
        <path d="M27 18L35 32H19L27 18Z" fill="rgba(255,255,255,0.35)"/>
        <path d="M11 18L19 2L27 18H11Z" fill="rgba(255,255,255,0.75)"/>
      </svg>
    </div>
  )
}

export default function DrivePage() {
  const [folders, setFolders] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [modal, setModal] = useState(null) // null | { id: null=add | 'id'=edit }
  const [form, setForm] = useState({ name: '', url: '', description: '' })

  // Load from Supabase, fall back to localStorage, then defaults
  useEffect(() => {
    sb.from('drive_folders').select('*').order('created_at').then(({ data, error }) => {
      if (data?.length) {
        setFolders(data)
        saveLocal(data)
      } else {
        const local = (() => {
          try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null') } catch { return null }
        })()
        const seed = local || DEFAULT_FOLDERS
        setFolders(seed)
        if (!error) {
          sbUpsert('drive_folders', seed.map(f => ({ ...f, files: f.files || [], updated_at: new Date().toISOString() }))).catch(dbErr('seed'))
        }
      }
      setLoaded(true)
    })
  }, [])

  function openAdd() {
    setForm({ name: '', url: '', description: '' })
    setModal({ id: null })
  }

  function openEdit(folder) {
    setForm({ name: folder.name, url: folder.url || '', description: folder.description || '' })
    setModal({ id: folder.id })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (modal.id) {
      const updated = { name: form.name.trim(), url: form.url.trim(), description: form.description.trim(), updated_at: new Date().toISOString() }
      const next = folders.map(f => f.id === modal.id ? { ...f, ...updated } : f)
      setFolders(next)
      saveLocal(next)
      // Supabase resolves (never rejects) — must check error in .then()
      sb.from('drive_folders').update(updated).eq('id', modal.id)
        .then(({ error }) => { if (error) dbErr('update')(error) })
      if (window.__lumaToast) window.__lumaToast('Ordner gespeichert')
    } else {
      const folder = { id: Date.now().toString(), name: form.name.trim(), url: form.url.trim(), description: form.description.trim(), files: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      const next = [...folders, folder]
      setFolders(next)
      saveLocal(next)
      sbUpsert('drive_folders', [folder]).catch(dbErr('insert'))
      if (window.__lumaToast) window.__lumaToast('Ordner hinzugefügt')
    }
    setModal(null)
  }

  function handleDelete(id) {
    const next = folders.filter(f => f.id !== id)
    setFolders(next)
    saveLocal(next)
    sbDelete('drive_folders', id).catch(dbErr('delete'))
  }

  const isEditing = modal?.id != null

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Google Drive</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: FG, letterSpacing: '-0.02em' }}>Projektordner</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, marginTop: 4 }}>{folders.length} Ordner gespeichert</div>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
          <Plus size={14} /> Ordner hinzufügen
        </button>
      </div>

      {/* Folder grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {folders.map(folder => (
          <div key={folder.id}
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', transition: 'border-color 0.15s', overflow: 'hidden' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${A}55`}
            onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>

            <DriveCardHeader />

            {/* Action buttons */}
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); openEdit(folder) }}
                style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', padding: 4, display: 'flex', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}>
                <Pencil size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(folder.id) }}
                style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', padding: 4, display: 'flex', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.5)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}>
                <X size={13} />
              </button>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
              {folder.description && (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.description}</div>
              )}
            </div>

            <a href={folder.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', borderRadius: 6, border: `1px solid ${A}45`, background: A06, color: A, textDecoration: 'none', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = A14}
              onMouseLeave={e => e.currentTarget.style.background = A06}>
              <ExternalLink size={12} /> In Drive öffnen
            </a>
          </div>
        ))}

        {/* Add placeholder card */}
        {!modal && (
          <div onClick={openAdd}
            style={{ border: `1px dashed ${BORDER}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 180, color: MUTED, transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${A}60`; e.currentTarget.style.color = A }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED }}>
            <Plus size={22} />
            <span style={{ fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>Ordner hinzufügen</span>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', cursor: 'pointer' }} onClick={() => setModal(null)} />
          <form onSubmit={handleSubmit}
            style={{ position: 'relative', zIndex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
              {isEditing ? 'Ordner bearbeiten' : 'Ordner hinzufügen'}
            </div>
            <div>
              <label style={LABEL_STYLE}>Name *</label>
              <input style={INPUT_STYLE} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. BEW Marzahn Fotos" required autoFocus />
            </div>
            <div>
              <label style={LABEL_STYLE}>Google Drive URL *</label>
              <input style={INPUT_STYLE} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://drive.google.com/drive/folders/…" required />
            </div>
            <div>
              <label style={LABEL_STYLE}>Beschreibung <span style={{ fontWeight: 400, color: MUTED }}>(optional)</span></label>
              <input style={INPUT_STYLE} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kurzbeschreibung" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setModal(null)}
                style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
                Abbrechen
              </button>
              <button type="submit"
                style={{ padding: '8px 16px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif" }}>
                {isEditing ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
