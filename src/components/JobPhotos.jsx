import { useState, useEffect, useRef } from 'react'
import { Camera, X, Loader, Trash2, ZoomIn } from 'lucide-react'
import { A, BORDER, FG, MUTED, SURFACE } from '../lib/theme.js'
import { sbUploadPhoto, sbDeletePhoto, sbGetJobPhotos, sbInsert, sbDelete, sb } from '../lib/supabase.js'
import { genId } from '../lib/storage.js'
import { queueUpload } from '../lib/uploadQueue.js'
import { isNetworkError } from '../lib/outbox.js'

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob) }, 'image/jpeg', 0.82)
    }
    img.onerror = reject
    img.src = url
  })
}

export default function JobPhotos({ jobId, uploadedBy, kompakt = false }) {
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileRef = useRef()
  const phaseRef = useRef(null)   // 'vorher' | 'nachher' | null

  useEffect(() => {
    if (!jobId) return
    sbGetJobPhotos(jobId)
      .then(setPhotos)
      .catch(async () => {
        // DB table missing → fall back to listing from Storage directly
        try {
          const { data: files } = await sb.storage.from('job-photos').list(jobId, { limit: 100, sortBy: { column: 'created_at', order: 'asc' } })
          const rows = (files || []).filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({
            id: f.name.replace(/\.jpg$/, ''),
            job_id: jobId,
            url: sb.storage.from('job-photos').getPublicUrl(`${jobId}/${f.name}`).data.publicUrl,
            uploaded_by: 'unknown',
            created_at: f.created_at || '',
          }))
          setPhotos(rows)
        } catch { /* storage also not set up yet */ }
      })
  }, [jobId])

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true)
    setUploadError(null)
    let anyFailed = false
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const photoId = genId()
      let blob
      try { blob = await compressImage(file) } catch { blob = file }
      const path = `${jobId}/${photoId}.jpg`
      const row = { id: photoId, job_id: jobId, photo_id: photoId, uploaded_by: uploadedBy, phase: phaseRef.current, created_at: new Date().toISOString() }
      try {
        const url = await sbUploadPhoto(jobId, photoId, blob)
        const full = { ...row, url }
        setPhotos(prev => [...prev, full])
        sbInsert('job_photos', full).catch(console.error)
      } catch (e) {
        if (isNetworkError(e) || !navigator.onLine) {
          await queueUpload({ id: photoId, bucket: 'job-photos', path, contentType: 'image/jpeg', blob, table: 'job_photos', row })
          setPhotos(prev => [...prev, { ...row, url: URL.createObjectURL(blob), _pending: true }])
        } else { console.error('Upload failed:', e); anyFailed = true }
      }
    }
    if (anyFailed) setUploadError('Upload fehlgeschlagen — Supabase Bucket "job-photos" prüfen')
    setUploading(false)
  }

  // Kamera/Dateiwahl für eine bestimmte Phase öffnen
  function waehle(phase) {
    phaseRef.current = phase
    fileRef.current?.click()
  }

  const gruppen = [
    { key: 'vorher',  label: 'Vorher'  },
    { key: 'nachher', label: 'Nachher' },
  ]
  const ohnePhase = photos.filter((p) => !p.phase)


  const Kachel = ({ photo }) => (
    <div key={photo.id}
      style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', background: SURFACE, border: `1px solid ${BORDER}`, cursor: 'pointer' }}
      onClick={() => setLightbox(photo)}>
      <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
      {photo._pending && (
        <span style={{ position: 'absolute', bottom: 3, right: 3, fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: 3 }}>wartet</span>
      )}
    </div>
  )

  async function handleDelete(photo) {
    try {
      await sbDeletePhoto(photo.job_id, photo.id)
      await sbDelete('job_photos', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      if (lightbox?.id === photo.id) setLightbox(null)
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Fotos {photos.length > 0 && `(${photos.length})`}
        </span>
        {uploading && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: MUTED }}>
            <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />Hochladen…
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
      </div>
      {uploadError && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#ef4444', marginTop: 4, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4, border: '1px solid rgba(239,68,68,0.25)' }}>
          {uploadError}
        </div>
      )}

      {/* Vorher und Nachher getrennt — das ist die Dokumentation, die der
          Kunde im Portal gegenübergestellt sieht. */}
      <div style={{ display: 'grid', gridTemplateColumns: kompakt ? '1fr' : '1fr 1fr', gap: 10 }}>
        {gruppen.map((g) => {
          const bilder = photos.filter((p) => p.phase === g.key)
          return (
            <div key={g.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {g.label} {bilder.length > 0 && `(${bilder.length})`}
                </span>
                <button type="button" onClick={() => waehle(g.key)} disabled={uploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: uploading ? MUTED : A, cursor: uploading ? 'default' : 'pointer', fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Camera size={11} />{g.label}
                </button>
              </div>
              {bilder.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 5 }}>
                  {bilder.map((photo) => <Kachel key={photo.id} photo={photo} />)}
                </div>
              ) : (
                <div onClick={() => waehle(g.key)}
                  style={{ border: `1px dashed ${BORDER}`, borderRadius: 6, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', color: MUTED, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
                  {g.label}-Foto
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fotos ohne Zuordnung (älter oder ohne Phase hochgeladen) */}
      {ohnePhase.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Ohne Zuordnung ({ohnePhase.length})
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 5, marginTop: 5 }}>
            {ohnePhase.map((photo) => <Kachel key={photo.id} photo={photo} />)}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
            style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <Trash2 size={14} /> Löschen
          </button>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: FG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
          <img
            src={lightbox.url}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  )
}
