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

export default function JobPhotos({ jobId, uploadedBy }) {
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileRef = useRef()

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
      const row = { id: photoId, job_id: jobId, photo_id: photoId, uploaded_by: uploadedBy, created_at: new Date().toISOString() }
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: uploading ? MUTED : A, cursor: uploading ? 'default' : 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {uploading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} />}
          {uploading ? 'Hochladen…' : 'Foto hinzufügen'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>
      {uploadError && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#ef4444', marginTop: 4, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4, border: '1px solid rgba(239,68,68,0.25)' }}>
          {uploadError}
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
          {photos.map(photo => (
            <div
              key={photo.id}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', background: SURFACE, border: `1px solid ${BORDER}`, cursor: 'pointer', group: true }}
              onClick={() => setLightbox(photo)}
            >
              <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
              >
                <ZoomIn size={14} color="#fff" style={{ opacity: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.parentElement.style.background = 'rgba(0,0,0,0.45)' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: `1px dashed ${BORDER}`, borderRadius: 6, padding: '20px', textAlign: 'center', cursor: 'pointer', color: MUTED, fontSize: 12, fontFamily: "'Space Mono', monospace" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = A + '60'}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          Fotos tippen oder ablegen
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
