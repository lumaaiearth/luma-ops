// Detailpanel für alle kartierten Features (Baum, Beet, Fläche, Punkt, Linie):
// Kopf mit Typ+Projekt, Maße aus der Geometrie, FLL-Daten (Bäume), Notizen,
// Fotos (Upload + Beispielbilder), Florales™-Verknüpfung, Aktionen.
// Desktop: rechte Seite · Mobil: Bottom-Sheet.
import { useState, useRef } from 'react'
import { X, Pencil, Trash2, ExternalLink, Camera, Loader, Sprout, Sun, RefreshCw } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER, A14, A20 } from '../lib/theme.js'
import { sb } from '../lib/supabase.js'
import { genId } from '../lib/storage.js'
import { compressImage } from '../lib/images.js'
import { geomMeasures, fmtArea, fmtLen, fmtLatLng } from '../lib/geo.js'
import { examplePhotos } from '../lib/placeholderImages.js'
import { fetchBuildingsAround } from '../lib/overpass.js'
import { analyzeSun, SEASONS, LICHT_KLASSEN } from '../lib/solar.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const TYPE_INFO = {
  tree:  { icon: '🌳', label: 'Baum' },
  area:  { icon: '📐', label: 'Projektfläche' },
  bed:   { icon: '🌿', label: 'Beet / Fläche' },
  point: { icon: '📍', label: 'Punkt' },
  line:  { icon: '〰️', label: 'Linie' },
}

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
const PLAN_STATUS_LABELS = {
  planung: 'Planung', pdf_erstellt: 'PDF erstellt', bestellung: 'Bestellung',
  bestellung_bestaetigt: 'Bestellt', pflanzung_laufend: 'Pflanzung', wachstum: 'Wachstum', maintenance: 'Pflege',
}

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

/* ── Fotos: gespeichert in feature.properties.photos = [{id, url}] ──
   Ohne eigene Fotos werden generierte Beispielbilder angezeigt. */
function FeaturePhotos({ feature, isAdmin, onUpdateProperties }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef()
  const photos = feature.properties?.photos || []
  const shown = photos.length > 0 ? photos : examplePhotos(feature)
  const usingExamples = photos.length === 0

  // Bestehende Baum-Fotos liegen unter tree-<id>/ — dabei bleiben; alles andere unter feature-<id>/
  const storagePrefix = feature.feature_type === 'tree' ? `tree-${feature.id}` : `feature-${feature.id}`

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true); setError(null)
    const added = []
    let lastErr = null
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const photoId = genId()
      let blob
      try { blob = await compressImage(file) } catch { blob = file }
      const path = `${storagePrefix}/${photoId}.jpg`
      try {
        const { error: upErr } = await sb.storage.from('job-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (upErr) throw upErr
        const { data } = sb.storage.from('job-photos').getPublicUrl(path)
        added.push({ id: photoId, url: data.publicUrl })
      } catch (e) {
        lastErr = e
      }
    }
    if (lastErr) {
      setError(navigator.onLine
        ? `Upload fehlgeschlagen: ${lastErr.message || lastErr.error || 'unbekannter Fehler'}`
        : 'Offline — bitte später erneut versuchen')
    }
    if (added.length) onUpdateProperties({ ...feature.properties, photos: [...photos, ...added] })
    setUploading(false)
  }

  async function handleDelete(photo) {
    if (photo.example) { setLightbox(null); return }
    try { await sb.storage.from('job-photos').remove([`${storagePrefix}/${photo.id}.jpg`]) } catch { /* Storage-Rest ist unkritisch */ }
    onUpdateProperties({ ...feature.properties, photos: photos.filter(p => p.id !== photo.id) })
    setLightbox(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Fotos {photos.length > 0 && `(${photos.length})`}
        </span>
        {isAdmin && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="lu-btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: uploading ? MUTED : A, cursor: uploading ? 'default' : 'pointer', fontSize: 11, fontFamily: SANS }}>
            {uploading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
            {uploading ? 'Lädt…' : 'Foto'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>
      {error && <div style={{ fontFamily: MONO, fontSize: 10, color: DANGER, marginBottom: 6, wordBreak: 'break-word' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 5 }}>
        {shown.map(p => (
          <div key={p.id} onClick={() => setLightbox(p)}
            style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
            <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            {p.example && (
              <span style={{ position: 'absolute', bottom: 3, left: 3, fontFamily: MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: '1px 5px' }}>BEISPIEL</span>
            )}
          </div>
        ))}
      </div>
      {usingExamples && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
          Noch keine eigenen Fotos — Beispielbilder werden angezeigt.{isAdmin ? ' Über „Foto" eigene Bilder hochladen.' : ''}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setLightbox(null)}>
          {isAdmin && !lightbox.example && (
            <button type="button" onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
              style={{ position: 'absolute', top: 16, left: 16, background: `color-mix(in srgb, ${DANGER} 20%, transparent)`, border: `1px solid color-mix(in srgb, ${DANGER} 40%, transparent)`, borderRadius: 6, color: DANGER, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Trash2 size={13} /> Löschen
            </button>
          )}
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

/* ── Sonnenanalyse: direkte Sonnenstunden je Jahreszeit am Feature-Standort.
   Gebäude aus OSM (Overpass), Sonnenstand via SunCalc — Ergebnis wird in
   properties.sonnenanalyse gespeichert und befüllt den Florales™-Lichtfilter. */
function SunAnalysis({ feature, centroid, isAdmin, onUpdateProperties }) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [localResult, setLocalResult] = useState(null)
  const result = localResult || feature.properties?.sonnenanalyse || null

  async function run() {
    if (!centroid) return
    setRunning(true); setError(null)
    try {
      const buildings = await fetchBuildingsAround(centroid.lat, centroid.lng, 180)
      const analysis = analyzeSun(centroid.lat, centroid.lng, buildings)
      setLocalResult(analysis)
      if (isAdmin) onUpdateProperties({ ...feature.properties, sonnenanalyse: analysis })
    } catch (e) {
      setError(navigator.onLine ? 'Gebäudedaten (OSM) gerade nicht erreichbar — später erneut versuchen.' : 'Offline — Analyse braucht Internet.')
    } finally {
      setRunning(false)
    }
  }

  if (!centroid) return null
  const klasse = result ? LICHT_KLASSEN[result.licht] : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>☀️ Sonne & Licht</span>
        {result && (
          <button type="button" onClick={run} disabled={running} title="Neu berechnen" className="lu-btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: running ? 'default' : 'pointer', fontSize: 10, fontFamily: SANS }}>
            <RefreshCw size={10} style={running ? { animation: 'spin 1s linear infinite' } : undefined} /> {running ? 'rechnet…' : 'neu'}
          </button>
        )}
      </div>

      {!result && (
        <button type="button" onClick={run} disabled={running}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 10px', borderRadius: 8, background: '#f59e0b15', border: '1px solid #f59e0b40', color: running ? MUTED : '#f59e0b', cursor: running ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: SANS }}>
          {running ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sun size={13} />}
          {running ? 'Berechne Sonnenstunden…' : 'Sonnenstunden berechnen'}
        </button>
      )}

      {error && <div style={{ fontFamily: MONO, fontSize: 10, color: DANGER, marginTop: 6, lineHeight: 1.5 }}>{error}</div>}

      {result && (
        <>
          {klasse && (
            <div style={{ marginBottom: 8 }}>
              <Badge color={klasse.color}>{klasse.label}</Badge>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{klasse.hint}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {SEASONS.map(s => {
              const v = result.seasons?.[s.key]
              if (!v) return null
              const pct = v.possible > 0 ? Math.round((v.sun / v.possible) * 100) : 0
              return (
                <div key={s.key} style={{ background: 'color-mix(in srgb, var(--luma-fg) 3%, transparent)', borderRadius: 6, padding: '7px 9px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{s.emoji} {s.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: FG }}>
                    {v.sun} h<span style={{ fontSize: 9, color: MUTED, fontWeight: 400 }}> / {v.possible} h möglich</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--luma-fg) 8%, transparent)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
            {result.buildings_n} Gebäude (OSM) berücksichtigt · Bäume/Vegetation nicht enthalten
            {result.on_building ? ' · Punkt liegt auf einem Gebäude (Dach?)' : ''}
          </div>
        </>
      )}
    </div>
  )
}

// Bekannte Keys, die bereits strukturiert dargestellt werden
const KNOWN_KEYS = new Set([
  'photos', 'notizen', 'baumnummer', 'baummarke', 'baumart_deutsch', 'baumart_latein',
  'stammumfang_cm', 'bhd_cm', 'baumhoehe_m', 'kronendurchmesser_m', 'kronenansatz_m',
  'pflanzjahr', 'vitalitaet', 'verkehrssicherheit', 'eps_befall', 'schutzstatus',
  'schaedlinge', 'standorttyp', 'letzte_kontrolle', 'opacity', 'image_url', 'filename',
  'tiles_url', 'slug', 'minZoom', 'maxZoom', 'tms', 'sonnenanalyse',
])

export default function FeaturePanel({
  feature, project, isMobile, isAdmin,
  onClose, onEdit, onDelete, onUpdateProperties, onGoProject,
  linkedPlans = [], onOpenPlan, onPlanInFlorales,
}) {
  if (!feature) return null
  const p = feature.properties || {}
  const isTree = feature.feature_type === 'tree'
  const info = TYPE_INFO[feature.feature_type] || { icon: '●', label: feature.feature_type }
  const vital = isTree && p.vitalitaet !== undefined && p.vitalitaet !== '' ? VITAL_INFO[p.vitalitaet] : null
  const safety = isTree && p.verkehrssicherheit ? SAFETY_INFO[p.verkehrssicherheit] : null
  const m = geomMeasures(feature.geometry)
  const canFloralis = (feature.feature_type === 'bed' || feature.feature_type === 'area') && m?.area_m2 > 0

  const extraProps = Object.entries(p).filter(([k, v]) => !KNOWN_KEYS.has(k) && v != null && v !== '' && typeof v !== 'object')

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
        <span style={{ fontSize: 18 }}>{info.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {feature.label || (isTree ? p.baumart_deutsch || 'Baum' : info.label)}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, display: 'flex', gap: 6, alignItems: 'center', overflow: 'hidden' }}>
            <span>{info.label}</span>
            {p.baumnummer && <span>#{p.baumnummer}</span>}
            {p.baumart_latein && <span style={{ fontStyle: 'italic' }}>{p.baumart_latein}</span>}
            {project && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {project.name}</span>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Schließen" className="lu-btn-ghost"
          style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Status-Badges (Baum) */}
        {(vital || safety || (isTree && p.eps_befall)) && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {vital && <Badge color={vital.color}>Vitalität {vital.label}</Badge>}
            {safety && <Badge color={safety.color}>{safety.label}</Badge>}
            {isTree && p.eps_befall && p.eps_befall !== 'kein' && <Badge color={WARN}>EPS: {EPS_LABELS[p.eps_befall] || p.eps_befall}</Badge>}
            {isTree && p.schutzstatus === 'geschuetzt' && <Badge color={A}>Geschützt (BSchVO)</Badge>}
          </div>
        )}

        {/* Maße aus der Geometrie */}
        {m && (m.area_m2 > 0 || m.length_m > 0 || m.centroid) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {m.area_m2 > 0 && <Stat label="Fläche" value={fmtArea(m.area_m2)} />}
            {m.perimeter_m > 0 && <Stat label="Umfang" value={fmtLen(m.perimeter_m)} />}
            {m.length_m > 0 && <Stat label="Länge" value={fmtLen(m.length_m)} />}
            {m.centroid && <Stat label="GPS" value={fmtLatLng(m.centroid)} />}
          </div>
        )}

        {/* FLL-Maße (Baum) */}
        {isTree && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <Stat label="Umfang" value={p.stammumfang_cm} unit="cm" />
            <Stat label="BHD" value={p.bhd_cm} unit="cm" />
            <Stat label="Höhe" value={p.baumhoehe_m} unit="m" />
            <Stat label="Krone Ø" value={p.kronendurchmesser_m} unit="m" />
            <Stat label="Kronenansatz" value={p.kronenansatz_m} unit="m" />
            <Stat label="Pflanzjahr" value={p.pflanzjahr} />
          </div>
        )}

        {/* Notizen & weitere Angaben */}
        {(p.standorttyp || p.baummarke || p.schaedlinge || p.letzte_kontrolle || p.notizen || extraProps.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {p.notizen && <Row k="Notizen" v={p.notizen} />}
            {p.standorttyp && <Row k="Standort" v={STANDORT_LABELS[p.standorttyp] || p.standorttyp} />}
            {p.baummarke && <Row k="Baummarke" v={p.baummarke} />}
            {p.schaedlinge && <Row k="Schädlinge" v={p.schaedlinge} />}
            {p.letzte_kontrolle && <Row k="Letzte Kontrolle" v={p.letzte_kontrolle} />}
            {extraProps.map(([k, v]) => <Row key={k} k={k.replace(/_/g, ' ')} v={String(v)} />)}
          </div>
        )}

        {/* Sonnenstunden-Analyse (Gebäudeschatten, 4 Jahreszeiten) */}
        <SunAnalysis feature={feature} centroid={m?.centroid} isAdmin={isAdmin} onUpdateProperties={onUpdateProperties} />

        {/* Florales™: verknüpfte Pflanzpläne + Planung starten */}
        {(canFloralis || linkedPlans.length > 0) && (
          <div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Florales™ {linkedPlans.length > 0 && `(${linkedPlans.length})`}
            </div>
            {linkedPlans.map(pp => (
              <button key={pp.id} onClick={() => onOpenPlan?.(pp)} className="lu-clickable"
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `1px solid ${A20}`, background: A14, cursor: 'pointer', marginBottom: 5 }}>
                <Sprout size={14} color={A} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: FG, fontFamily: SANS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pp.titel}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: A }}>{PLAN_STATUS_LABELS[pp.status] || pp.status} · {pp.positionen?.length || 0} Arten</span>
              </button>
            ))}
            {canFloralis && isAdmin && (
              <button onClick={onPlanInFlorales}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 10px', borderRadius: 8, background: '#22c55e18', border: '1px solid #22c55e40', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: SANS }}>
                🌿 {linkedPlans.length > 0 ? 'Neu in Florales planen' : 'In Florales planen'} →
              </button>
            )}
          </div>
        )}

        {/* Fotos */}
        <FeaturePhotos feature={feature} isAdmin={isAdmin} onUpdateProperties={onUpdateProperties} />
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
          <button onClick={onDelete} title={`${info.label} löschen`} className="lu-btn-danger"
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
      <span style={{ color: FG, flex: 1, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{v}</span>
    </div>
  )
}
