// Detailpanel für kartierte Bäume (statt Mini-Popup): alle FLL-Daten,
// Fotos direkt am Baum, Aktionen. Desktop: rechte Seite · Mobil: Bottom-Sheet.
import { useState, useRef } from 'react'
import { X, Pencil, Trash2, ExternalLink, Camera, Loader, MapPin } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER } from '../lib/theme.js'
import { sb } from '../lib/supabase.js'
import { genId } from '../lib/storage.js'
import { compressImage } from '../lib/images.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const VITAL_INFO = {
  0: { label: '0 · Keine Einschränkung', color: OK },
  1: { label: '1 · Leichte Einschränkung', color: OK },
  2: { label: '2 · Mäßige Einschränkung', color: WARN },
  3: { label: '3 · Starke Einschränkung', color: DANGER },
  4: { label: '4 · Abgestorben', color: DANGER },
}
const SAFETY_INFO = {
  sicher: { label: 'Sicher', color: OK },
  eingeschraenkt: { label: 'Eingeschränkt', color: WARN },
  gefaehrdet: { label: 'Gefährdet — Maßnahme nötig', color: DANGER },
  gefaellung: { label: 'Fällung empfohlen', color: DANGER },
}
const STANDORT_LABELS = { park: 'Park / Grünanlage', strasse: 'Straßenbaum', hof: 'Innenhof / Garten', wald: 'Waldrand / Gehölz', dach: 'Dachbegrünung' }
const EPS_LABELS = { kein: 'Kein', gering: 'Gering', mittel: 'Mittel', stark: 'Stark' }

function Badge({ color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 9, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Stat({ label, value, unit }) {
  if (value == null || value === '') return null
  return (
    <div style={{ background: 'color-mix(in srgb, var(--luma-fg) 3%, transparent)', borderRadius: 6, padding: '7px 9px' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: FG }}>{value}{unit ? <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}> {unit}</span> : null}</div>
    </div>
  )
}

/* ── Fotos: gespeichert in feature.properties.photos = [{id, url}] ── */
function FeaturePhotos({ feature, onUpdateProperties }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef()
  const photos = feature.properties?.photos || []

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true); setError(null)
    const added = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const photoId = genId()
      let blob
      try { blob = await compressImage(file) } catch { blob = file }
      const path = `tree-${feature.id}/${photoId}.jpg`
      try {
        const { error: upErr } = await sb.storage.from('job-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (upErr) throw upErr
        const { data } = sb.storage.from('job-photos').getPublicUrl(path)
        added.push({ id: photoId, url: data.publicUrl })
      } catch (e) {
        setError(navigator.onLine ? 'Upload fehlgeschlagen' : 'Offline — bitte später erneut versuchen')
      }
    }
    if (added.length) onUpdateProperties({ ...feature.properties, photos: [...photos, ...added] })
    setUploading(false)
  }

  async function handleDelete(photo) {
    try { await sb.storage.from('job-photos').remove([`tree-${feature.id}/${photo.id}.jpg`]) } catch { /* Storage-Rest ist unkritisch */ }
    onUpdateProperties({ ...feature.properties, photos: photos.filter(p => p.id !== photo.id) })
    setLightbox(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Fotos {photos.length > 0 && `(${photos.length})`}</span>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="lu-btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: uploading ? MUTED : A, cursor: uploading ? 'default' : 'pointer', fontSize: 11, fontFamily: SANS }}>
          {uploading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
          {uploading ? 'Lädt…' : 'Foto'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>
      {error && <div style={{ fontFamily: MONO, fontSize: 10, color: DANGER, marginBottom: 6 }}>{error}</div>}
      {photos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 5 }}>
          {photos.map(p => (
            <div key={p.id} onClick={() => setLightbox(p)}
              style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
              <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            </div>
          ))}
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()}
          style={{ border: `1px dashed ${BORDER}`, borderRadius: 6, padding: 14, textAlign: 'center', cursor: 'pointer', color: MUTED, fontSize: 11, fontFamily: MONO }}>
          Foto aufnehmen oder auswählen
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setLightbox(null)}>
          <button type="button" onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
            style={{ position: 'absolute', top: 16, left: 16, background: `color-mix(in srgb, ${DANGER} 20%, transparent)`, border: `1px solid color-mix(in srgb, ${DANGER} 40%, transparent)`, borderRadius: 6, color: DANGER, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Trash2 size={13} /> Löschen
          </button>
          <button type="button" onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} />
          </button>
          <img src={lightbox.url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}

export default function FeaturePanel({ feature, project, isMobile, isAdmin, onClose, onEdit, onDelete, onUpdateProperties, onGoProject }) {
  if (!feature) return null
  const p = feature.properties || {}
  const vital = p.vitalitaet !== undefined && p.vitalitaet !== '' ? VITAL_INFO[p.vitalitaet] : null
  const safety = p.verkehrssicherheit ? SAFETY_INFO[p.verkehrssicherheit] : null

  return (
    <div className="lu-fade-in" style={{
      position: 'absolute', zIndex: 1200,
      ...(isMobile
        ? { left: 0, right: 0, bottom: 0, maxHeight: '62%', borderRadius: '14px 14px 0 0' }
        : { top: 12, right: 12, bottom: 12, width: 330, borderRadius: 12 }),
      background: SURFACE, border: `1px solid ${BORDER}`,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Kopf */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>🌳</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {feature.label || p.baumart_deutsch || 'Baum'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, display: 'flex', gap: 6, alignItems: 'center' }}>
            {p.baumnummer && <span>#{p.baumnummer}</span>}
            {p.baumart_latein && <span style={{ fontStyle: 'italic' }}>{p.baumart_latein}</span>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Schließen" className="lu-btn-ghost"
          style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Status-Badges */}
        {(vital || safety || p.eps_befall) && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {vital && <Badge color={vital.color}>Vitalität {vital.label}</Badge>}
            {safety && <Badge color={safety.color}>{safety.label}</Badge>}
            {p.eps_befall && p.eps_befall !== 'kein' && <Badge color={WARN}>EPS: {EPS_LABELS[p.eps_befall] || p.eps_befall}</Badge>}
            {p.schutzstatus === 'geschuetzt' && <Badge color={A}>Geschützt (BSchVO)</Badge>}
          </div>
        )}

        {/* Maße */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <Stat label="Umfang" value={p.stammumfang_cm} unit="cm" />
          <Stat label="BHD" value={p.bhd_cm} unit="cm" />
          <Stat label="Höhe" value={p.baumhoehe_m} unit="m" />
          <Stat label="Krone Ø" value={p.kronendurchmesser_m} unit="m" />
          <Stat label="Kronenansatz" value={p.kronenansatz_m} unit="m" />
          <Stat label="Pflanzjahr" value={p.pflanzjahr} />
        </div>

        {/* Weitere Angaben */}
        {(p.standorttyp || p.baummarke || p.schaedlinge || p.letzte_kontrolle || p.notizen) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {p.standorttyp && <Row k="Standort" v={STANDORT_LABELS[p.standorttyp] || p.standorttyp} />}
            {p.baummarke && <Row k="Baummarke" v={p.baummarke} />}
            {p.schaedlinge && <Row k="Schädlinge" v={p.schaedlinge} />}
            {p.letzte_kontrolle && <Row k="Letzte Kontrolle" v={p.letzte_kontrolle} />}
            {p.notizen && <Row k="Notizen" v={p.notizen} />}
          </div>
        )}

        {/* Fotos */}
        <FeaturePhotos feature={feature} onUpdateProperties={onUpdateProperties} />
      </div>

      {/* Aktionen */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom))' : 10 }}>
        {isAdmin && (
          <button onClick={onEdit} className="lu-btn-ghost"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, cursor: 'pointer', fontSize: 12, fontFamily: SANS }}>
            <Pencil size={12} /> Bearbeiten
          </button>
        )}
        {project && (
          <button onClick={onGoProject} className="lu-btn-ghost"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: SANS }}>
            <ExternalLink size={12} /> Projekt
          </button>
        )}
        {isAdmin && (
          <button onClick={onDelete} title="Baum löschen" className="lu-btn-danger"
            style={{ width: 36, borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 90, paddingTop: 2 }}>{k}</span>
      <span style={{ color: FG, flex: 1, wordBreak: 'break-word' }}>{v}</span>
    </div>
  )
}
