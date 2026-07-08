import { useState, useEffect, useRef } from 'react'
import { Paperclip, X, Loader, Trash2, Download, FileText } from 'lucide-react'
import { A, BORDER, FG, MUTED, SURFACE } from '../lib/theme.js'
import { sbUploadTaskFile, sbDeleteTaskFile, sbGetTaskFiles, sbInsert, sbDelete } from '../lib/supabase.js'
import { genId } from '../lib/storage.js'

function fmtSize(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export default function TaskFiles({ taskId, uploadedBy }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  useEffect(() => {
    if (!taskId) return
    sbGetTaskFiles(taskId).then(setFiles).catch(() => {})
  }, [taskId])

  async function handleFiles(fileList) {
    if (!fileList?.length) return
    setUploading(true); setError(null)
    let failed = false
    for (const file of Array.from(fileList)) {
      try {
        const fileId = genId()
        const url = await sbUploadTaskFile(taskId, fileId, file)
        const row = { id: fileId, task_id: taskId, name: file.name, url, file_type: file.type || '', size: file.size || null, uploaded_by: uploadedBy, created_at: new Date().toISOString() }
        setFiles(prev => [...prev, row])
        sbInsert('task_files', row).catch(console.error)
      } catch (e) { console.error('Upload failed:', e); failed = true }
    }
    if (failed) setError('Upload fehlgeschlagen — Supabase Bucket "job-photos" prüfen')
    setUploading(false)
  }

  async function handleDelete(file) {
    try {
      await sbDeleteTaskFile(file.task_id, file.id)
      await sbDelete('task_files', file.id)
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (e) { console.error('Delete failed:', e) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Dateien {files.length > 0 && `(${files.length})`}
        </span>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: uploading ? MUTED : A, cursor: uploading ? 'default' : 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
          {uploading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={13} />}
          {uploading ? 'Hochladen…' : 'Datei anhängen'}
        </button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>
      {error && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#ef4444', marginBottom: 6, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4, border: '1px solid rgba(239,68,68,0.25)' }}>{error}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {files.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6 }}>
            <FileText size={14} color={A} style={{ flexShrink: 0 }} />
            <a href={f.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, fontSize: 13, color: FG, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</a>
            {f.size ? <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, flexShrink: 0 }}>{fmtSize(f.size)}</span> : null}
            <a href={f.url} target="_blank" rel="noreferrer" download style={{ color: MUTED, display: 'flex', flexShrink: 0 }}><Download size={13} /></a>
            <button type="button" onClick={() => handleDelete(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', flexShrink: 0, padding: 0 }}><Trash2 size={12} /></button>
          </div>
        ))}
        {files.length === 0 && !uploading && (
          <div onClick={() => inputRef.current?.click()}
            style={{ border: `1px dashed ${BORDER}`, borderRadius: 6, padding: '14px', textAlign: 'center', cursor: 'pointer', color: MUTED, fontSize: 12, fontFamily: "'Space Mono', monospace" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = A + '60'}
            onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
            PDF, Angebote, Lieferscheine… anhängen
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
