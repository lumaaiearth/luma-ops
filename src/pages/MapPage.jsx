import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMap, GeoJSON, ImageOverlay } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A06, A10, A14, A18 } from '../lib/theme.js'
import { TEAM, JOB_TYPES } from '../data/seed.js'
import { isoToday, addDays, genId } from '../lib/storage.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { Layers, Satellite, Map as MapIcon, Pencil, Save, X, ExternalLink, ChevronRight, ChevronDown, FolderOpen, Folder, Eye, EyeOff, Search, MapPin, Plus, Trash2, Upload, Image, SlidersHorizontal } from 'lucide-react'

/* ─── GEO HELPERS ───────────────────────────────────────────────────────── */
function geodesicArea(latLngs) {
  const R = 6371000
  const pts = Array.isArray(latLngs[0]) ? latLngs.flat(Infinity) : latLngs
  const n = pts.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lat1 = (pts[i].lat ?? pts[i][0]) * Math.PI / 180
    const lat2 = (pts[j].lat ?? pts[j][0]) * Math.PI / 180
    const dLng = ((pts[j].lng ?? pts[j][1]) - (pts[i].lng ?? pts[i][1])) * Math.PI / 180
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  return Math.abs(area * R * R / 2)
}

function perimeterMeters(latLngs) {
  const pts = Array.isArray(latLngs[0]) ? latLngs.flat(Infinity) : latLngs
  let d = 0
  for (let i = 0; i < pts.length; i++) {
    const a = L.latLng(pts[i].lat ?? pts[i][0], pts[i].lng ?? pts[i][1])
    const b = L.latLng(pts[(i + 1) % pts.length].lat ?? pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length].lng ?? pts[(i + 1) % pts.length][1])
    d += a.distanceTo(b)
  }
  return d
}

function fmtArea(m2) { return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²` }
function fmtLen(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m` }

const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
}

const PROJECT_COLORS = [
  '#08AA56', '#22EAA7', '#6EA8C0', '#F59E0B', '#A78BFA', '#F472B6', '#34D399', '#60A5FA',
]

const FEATURE_MODES = [
  { id: 'tree',  label: 'Baum',          icon: '🌳', color: '#22c55e', desc: 'Einzelbaum mit FLL-Daten' },
  { id: 'area',  label: 'Projektfläche', icon: '📐', color: '#60a5fa', desc: 'Gesamte Projektfläche' },
  { id: 'bed',   label: 'Beet / Fläche', icon: '🌿', color: '#a3e635', desc: 'Beet, Stauden, Gehölze' },
  { id: 'point', label: 'Punkt',         icon: '📍', color: '#f59e0b', desc: 'Freier Standortpunkt' },
  { id: 'line',  label: 'Linie',         icon: '〰️', color: '#c084fc', desc: 'Weg, Grenze, Achse' },
]

const VITALITAET_OPTIONS = [
  { value: '0', label: '0 — Keine Einschränkung' },
  { value: '1', label: '1 — Leichte Einschränkung' },
  { value: '2', label: '2 — Mäßige Einschränkung' },
  { value: '3', label: '3 — Starke Einschränkung' },
  { value: '4', label: '4 — Abgestorben' },
]

function makePin(color, size = 14) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  })
}

function makeTreeIcon(color, size = 18) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid rgba(255,255,255,0.95);box-shadow:0 2px 10px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.55)}px">🌳</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  })
}

function FlyTo({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 17, { duration: 1.2 })
  }, [center, map])
  return null
}

/* ─── DRAW CONTROL ──────────────────────────────────────────────────────── */
function DrawControl({ mode, onFeatureDrawn, onCancel }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !mode) return

    const isPoint = mode === 'tree' || mode === 'point'
    const isLine = mode === 'line'

    if (isPoint) {
      map.pm.enableDraw('Marker', { snappable: false })
    } else if (isLine) {
      map.pm.enableDraw('Line', { snappable: true })
    } else {
      map.pm.enableDraw('Polygon', { snappable: true })
    }

    function onDrawEnd(e) {
      const geojson = e.layer.toGeoJSON()
      map.removeLayer(e.layer)
      map.pm.disableDraw()
      onFeatureDrawn(geojson.geometry)
    }

    map.on('pm:create', onDrawEnd)
    return () => {
      map.off('pm:create', onDrawEnd)
      map.pm.disableDraw()
    }
  }, [map, mode])

  return (
    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
      <button onClick={onCancel}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        <X size={14} /> Abbrechen
      </button>
    </div>
  )
}

/* ─── FEATURE FORM MODAL ────────────────────────────────────────────────── */
function FeatureForm({ mode, project, color, existingFeature, onSave, onCancel, areaM2 }) {
  const isTree = mode === 'tree'
  const modeInfo = FEATURE_MODES.find(m => m.id === mode) || {}

  const [form, setForm] = useState(existingFeature?.properties || {})
  const [label, setLabel] = useState(existingFeature?.label || '')

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  function handleSave() {
    const props = isTree ? form : { ...form }
    onSave({
      label: label || (isTree ? form.baumart_deutsch || form.baumart_latein : '') || modeInfo.label,
      properties: props,
    })
  }

  const inputStyle = {
    width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`,
    background: 'rgba(255,255,255,0.04)', color: FG, fontSize: 12,
    fontFamily: "'Space Grotesk', sans-serif", outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: 10, color: MUTED, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, width: 420, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: (modeInfo.color || A) + '20', border: `1px solid ${modeInfo.color || A}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {modeInfo.icon}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>{existingFeature ? 'Bearbeiten' : modeInfo.label + ' erfassen'}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{project?.name}</div>
          </div>
          <button onClick={onCancel} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Name/Label */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Bezeichnung</label>
          <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)}
            placeholder={isTree ? 'z.B. Eiche #47 oder leer lassen' : modeInfo.label} />
        </div>

        {isTree ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Baumnummer / ID *</label>
              <input style={inputStyle} value={form.baumnummer || ''} onChange={e => set('baumnummer', e.target.value)} placeholder="z.B. B-0047" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Baummarke (Schild am Baum)</label>
              <input style={inputStyle} value={form.baummarke || ''} onChange={e => set('baummarke', e.target.value)} placeholder="Physische Tag-Nummer" />
            </div>
            <div>
              <label style={labelStyle}>Baumart (deutsch)</label>
              <input style={inputStyle} value={form.baumart_deutsch || ''} onChange={e => set('baumart_deutsch', e.target.value)} placeholder="Stieleiche" />
            </div>
            <div>
              <label style={labelStyle}>Baumart (latein)</label>
              <input style={inputStyle} value={form.baumart_latein || ''} onChange={e => set('baumart_latein', e.target.value)} placeholder="Quercus robur" />
            </div>
            <div>
              <label style={labelStyle}>Stammumfang (cm, 1m Höhe)</label>
              <input style={inputStyle} type="number" value={form.stammumfang_cm || ''} onChange={e => set('stammumfang_cm', e.target.value)} placeholder="z.B. 85" />
            </div>
            <div>
              <label style={labelStyle}>BHD (cm, 1,3m Höhe)</label>
              <input style={inputStyle} type="number" value={form.bhd_cm || ''} onChange={e => set('bhd_cm', e.target.value)} placeholder="z.B. 27" />
            </div>
            <div>
              <label style={labelStyle}>Baumhöhe (m)</label>
              <input style={inputStyle} type="number" value={form.baumhoehe_m || ''} onChange={e => set('baumhoehe_m', e.target.value)} placeholder="z.B. 12" />
            </div>
            <div>
              <label style={labelStyle}>Kronendurchmesser (m)</label>
              <input style={inputStyle} type="number" value={form.kronendurchmesser_m || ''} onChange={e => set('kronendurchmesser_m', e.target.value)} placeholder="z.B. 8" />
            </div>
            <div>
              <label style={labelStyle}>Kronenansatz (m)</label>
              <input style={inputStyle} type="number" value={form.kronenansatz_m || ''} onChange={e => set('kronenansatz_m', e.target.value)} placeholder="z.B. 3.5" />
            </div>
            <div>
              <label style={labelStyle}>Pflanzjahr</label>
              <input style={inputStyle} type="number" value={form.pflanzjahr || ''} onChange={e => set('pflanzjahr', e.target.value)} placeholder="z.B. 1985" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Vitalität (Roloff-Skala)</label>
              <select style={{ ...inputStyle }} value={form.vitalitaet || ''} onChange={e => set('vitalitaet', e.target.value)}>
                <option value="">— wählen —</option>
                {VITALITAET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Verkehrssicherheit</label>
              <select style={{ ...inputStyle }} value={form.verkehrssicherheit || ''} onChange={e => set('verkehrssicherheit', e.target.value)}>
                <option value="">— wählen —</option>
                <option value="sicher">Sicher</option>
                <option value="eingeschraenkt">Eingeschränkt</option>
                <option value="gefaehrdet">Gefährdet — Maßnahme nötig</option>
                <option value="gefaellung">Fällung empfohlen</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>EPS-Befall</label>
              <select style={{ ...inputStyle }} value={form.eps_befall || ''} onChange={e => set('eps_befall', e.target.value)}>
                <option value="">—</option>
                <option value="kein">Kein</option>
                <option value="gering">Gering</option>
                <option value="mittel">Mittel</option>
                <option value="stark">Stark</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Schutzstatus (BSchVO)</label>
              <select style={{ ...inputStyle }} value={form.schutzstatus || ''} onChange={e => set('schutzstatus', e.target.value)}>
                <option value="">—</option>
                <option value="geschuetzt">Geschützt</option>
                <option value="nicht_geschuetzt">Nicht geschützt</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Schädlinge / Krankheiten</label>
              <input style={inputStyle} value={form.schaedlinge || ''} onChange={e => set('schaedlinge', e.target.value)} placeholder="Freitext, z.B. Schleimfluss, Rußtau" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Standorttyp</label>
              <select style={{ ...inputStyle }} value={form.standorttyp || ''} onChange={e => set('standorttyp', e.target.value)}>
                <option value="">—</option>
                <option value="park">Park / Grünanlage</option>
                <option value="strasse">Straßenbaum</option>
                <option value="hof">Innenhof / Privatgarten</option>
                <option value="wald">Waldrand / Gehölz</option>
                <option value="dach">Dachbegrünung</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Letzte Kontrolle</label>
              <input style={inputStyle} type="date" value={form.letzte_kontrolle || ''} onChange={e => set('letzte_kontrolle', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Notizen / Maßnahmen</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notizen || ''} onChange={e => set('notizen', e.target.value)} placeholder="Freitext" />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle}>Notizen</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notizen || ''} onChange={e => set('notizen', e.target.value)} placeholder="Beschreibung, Pflegemaßnahmen, etc." />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={handleSave}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Save size={13} /> Speichern
          </button>
          {(mode === 'bed' || mode === 'area') && areaM2 > 0 && (
            <button onClick={() => { onSave({ label: label || modeInfo.label, properties: form }, true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 8, background: '#22c55e20', border: '1px solid #22c55e40', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap' }}>
              🌿 Floralis →
            </button>
          )}
          <button onClick={onCancel}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── DRONE IMAGE UPLOAD ────────────────────────────────────────────────── */
async function extractGeoTiffBounds(file) {
  try {
    const { fromArrayBuffer } = await import('geotiff')
    const buf = await file.arrayBuffer()
    const tiff = await fromArrayBuffer(buf)
    const image = await tiff.getImage()
    const bbox = image.getBoundingBox() // [west, south, east, north] in CRS units
    const origin = image.getOrigin()
    const res = image.getResolution()
    // GeoTIFFs from drones are usually in WGS84 (EPSG:4326) or UTM
    // Try raw bbox first; if values look like degrees use them directly
    const [west, south, east, north] = bbox
    if (Math.abs(west) <= 180 && Math.abs(east) <= 180 && Math.abs(south) <= 90 && Math.abs(north) <= 90) {
      return { south, west, north, east }
    }
    return null
  } catch {
    return null
  }
}

async function uploadDroneImage(projectId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const mimeMap = { tif: 'image/tiff', tiff: 'image/tiff', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  const contentType = file.type || mimeMap[ext] || 'application/octet-stream'
  const path = `${projectId}/${genId()}.${ext}`
  const { error } = await sb.storage.from('drone-images').upload(path, file, { contentType, upsert: false })
  if (error) throw error
  const { data } = sb.storage.from('drone-images').getPublicUrl(path)
  return data.publicUrl
}

function DroneImageModal({ project, color, onSave, onCancel }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [bounds, setBounds] = useState({ south: '', west: '', north: '', east: '' })
  const [autoDetected, setAutoDetected] = useState(false)
  const [label, setLabel] = useState('')
  const [opacity, setOpacity] = useState(0.8)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const dropRef = useRef(null)

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setError(null)
    setLabel(f.name.replace(/\.[^.]+$/, ''))

    // Preview
    if (f.type !== 'image/tiff' && f.type !== 'image/geo+tiff') {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }

    // Try auto bounds
    if (f.name.match(/\.(tif|tiff)$/i)) {
      const detected = await extractGeoTiffBounds(f)
      if (detected) {
        setBounds({ south: detected.south.toFixed(7), west: detected.west.toFixed(7), north: detected.north.toFixed(7), east: detected.east.toFixed(7) })
        setAutoDetected(true)
      }
    }
  }

  async function handleSave() {
    if (!file) return setError('Bitte Bild auswählen')
    const { south, west, north, east } = bounds
    if (!south || !west || !north || !east) return setError('Koordinaten unvollständig')
    setUploading(true)
    setError(null)
    try {
      const url = await uploadDroneImage(project.id, file)
      const bbox = {
        type: 'Polygon',
        coordinates: [[[+west,+south],[+east,+south],[+east,+north],[+west,+north],[+west,+south]]],
      }
      onSave({
        feature_type: 'drone_image',
        geometry: bbox,
        label: label || file.name,
        properties: { image_url: url, opacity: +opacity, filename: file.name },
      })
    } catch (e) {
      setError(e.message || 'Upload fehlgeschlagen')
      setUploading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', color: FG, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 10, color: MUTED, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, width: 420, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#8b5cf620', border: '1px solid #8b5cf640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚁</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>Drohnenbild hinzufügen</div>
            <div style={{ fontSize: 11, color: MUTED }}>{project?.name}</div>
          </div>
          <button onClick={onCancel} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#8b5cf6' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = BORDER }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = BORDER; handleFile(e.dataTransfer.files[0]) }}
          onClick={() => document.getElementById('drone-file-input').click()}
          style={{ border: `2px dashed ${file ? '#8b5cf6' : BORDER}`, borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: 'border-color .15s', background: file ? '#8b5cf608' : 'transparent' }}>
          <input id="drone-file-input" type="file" accept="image/*,.tif,.tiff" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {preview ? (
            <img src={preview} alt="" style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' }} />
          ) : (
            <div style={{ color: MUTED, fontSize: 12 }}>
              <Upload size={20} style={{ marginBottom: 6, opacity: 0.5 }} />
              <div>{file ? `📄 ${file.name}` : 'GeoTIFF, JPEG oder PNG hierher ziehen'}</div>
              <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>GeoTIFF: Koordinaten werden automatisch erkannt</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Bezeichnung</label>
          <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} placeholder="z.B. Orthomosaik Frühjahr 2026" />
        </div>

        {/* Bounding box */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Bounding Box (WGS84)</label>
            {autoDetected && <span style={{ fontSize: 9, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 4, padding: '1px 6px', fontFamily: "'Space Mono', monospace" }}>AUTO</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[['north','Nord (max lat)'],['south','Süd (min lat)'],['west','West (min lng)'],['east','Ost (max lng)']].map(([k, ph]) => (
              <div key={k}>
                <div style={{ fontSize: 9, color: MUTED, fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>{k.toUpperCase()}</div>
                <input style={inputStyle} type="number" step="0.0000001" value={bounds[k]} onChange={e => setBounds(prev => ({ ...prev, [k]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 5, fontStyle: 'italic' }}>
            Tipp: DJI Pilot / DroneDeploy zeigt die Bounding Box des Orthomosaiks an.
          </div>
        </div>

        {/* Opacity */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Transparenz: {Math.round((1 - opacity) * 100)}%</label>
          <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={e => setOpacity(e.target.value)}
            style={{ width: '100%', accentColor: '#8b5cf6' }} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10, padding: '6px 10px', background: '#f8717110', borderRadius: 6 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={uploading}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: uploading ? BORDER : '#8b5cf6', border: 'none', color: '#fff', cursor: uploading ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
            {uploading ? '⏳ Wird hochgeladen...' : <><Upload size={13} /> Hochladen & speichern</>}
          </button>
          <button onClick={onCancel}
            style={{ padding: '9px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── OPEN DATA LAYERS ──────────────────────────────────────────────────── */
const OPEN_LAYERS = [
  { id: 'heatisland', label: 'Wärmeinseln', color: '#ef4444',
    wms: { url: 'https://fbinter.stadt-berlin.de/fb/wms/senstadt/k07_06stadtklima2015', layers: 'fb:k07_06stadtklima2015', format: 'image/png', transparent: true, opacity: 0.55 } },
  { id: 'biotop', label: 'Biotopkataster', color: '#22EAA7',
    wms: { url: 'https://fbinter.stadt-berlin.de/fb/wms/senstadt/biotopkataster', layers: 'fb:biotopkataster', format: 'image/png', transparent: true, opacity: 0.6 } },
  { id: 'gruenflaechen', label: 'Grünflächen', color: '#4ade80',
    wms: { url: 'https://fbinter.stadt-berlin.de/fb/wms/senstadt/k_gruenanlagenbestand2020_wms', layers: 'fb:gruenanlagenbestand2020', format: 'image/png', transparent: true, opacity: 0.55 } },
]

/* ─── MAIN COMPONENT ────────────────────────────────────────────────────── */
export default function MapPage() {
  const { projects, jobs, clients, mapFeatures, createMapFeature, updateMapFeature, deleteMapFeature, updateProject } = useOps()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const today = isoToday()
  const isMobile = useIsMobile()

  const [activeProject, setActiveProject] = useState(null)
  const [showJobs, setShowJobs] = useState(true)
  const [flyTarget, setFlyTarget] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tileLayer, setTileLayer] = useState('satellite')
  const [activeLayers, setActiveLayers] = useState(new Set())
  const [expandedClients, setExpandedClients] = useState(new Set(['all']))
  const [hiddenProjects, setHiddenProjects] = useState(new Set())
  const [hiddenFeatures, setHiddenFeatures] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState(null)

  // Drawing state
  const [drawMode, setDrawMode] = useState(null)
  const [drawingProject, setDrawingProject] = useState(null)
  const [pendingGeometry, setPendingGeometry] = useState(null)
  const [editingFeature, setEditingFeature] = useState(null)
  const [droneModal, setDroneModal] = useState(null) // project | null
  const [droneOpacity, setDroneOpacity] = useState({}) // { featureId: opacity }

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  function toggleClientFolder(clientId) {
    setExpandedClients(prev => { const next = new Set(prev); next.has(clientId) ? next.delete(clientId) : next.add(clientId); return next })
  }
  function toggleProjectVisibility(projectId) {
    setHiddenProjects(prev => { const next = new Set(prev); next.has(projectId) ? next.delete(projectId) : next.add(projectId); return next })
  }
  function toggleFeature(id) {
    setHiddenFeatures(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleLayer(id) {
    setActiveLayers(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const upcomingJobs = useMemo(() => {
    const limit = addDays(today, 14)
    return jobs.filter(j => j.date >= today && j.date <= limit && j.status !== 'cancelled')
  }, [jobs, today])

  const jobsByProject = useMemo(() => {
    const map = {}
    upcomingJobs.forEach(j => {
      if (!map[j.project_id]) map[j.project_id] = []
      map[j.project_id].push(j)
    })
    return map
  }, [upcomingJobs])

  const mappableProjects = projects.filter(p => p.lat && p.lng)

  const projectColor = (p, i) => p.color || PROJECT_COLORS[i % PROJECT_COLORS.length]

  const projectColorById = useMemo(() => {
    const map = {}
    mappableProjects.forEach((p, i) => { map[p.id] = projectColor(p, i) })
    return map
  }, [mappableProjects])

  const clientGroups = useMemo(() => {
    const groups = {}
    mappableProjects.forEach((p, i) => {
      const cid = p.client_id || 'other'
      const cl = (clients || []).find(c => c.id === cid)
      const cname = cl?.name || p.client || 'Sonstige'
      if (!groups[cid]) groups[cid] = { id: cid, name: cname, color: cl?.color || '#6B7280', projects: [] }
      groups[cid].projects.push({ ...p, _idx: i })
    })
    return Object.values(groups)
  }, [mappableProjects, clients])

  // Features grouped by project, with search/filter
  const featuresByProject = useMemo(() => {
    const map = {}
    mapFeatures.forEach(f => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || (f.label || '').toLowerCase().includes(q) ||
        JSON.stringify(f.properties || {}).toLowerCase().includes(q)
      const matchesType = !typeFilter || f.feature_type === typeFilter || f.feature_type === 'drone_image'
      if (!matchesSearch || !matchesType) return
      if (!map[f.project_id]) map[f.project_id] = []
      map[f.project_id].push(f)
    })
    return map
  }, [mapFeatures, searchQuery, typeFilter])

  useEffect(() => {
    const focusId = location.state?.focusProjectId
    if (!focusId || projects.length === 0) return
    const p = projects.find(pr => pr.id === focusId)
    if (p?.lat && p?.lng) {
      setActiveProject(p.id)
      setFlyTarget([p.lat, p.lng])
    }
  }, [location.state, projects])

  useEffect(() => {
    window._mapNav = (id) => navigate(`/projects/${id}`)
    return () => { delete window._mapNav }
  }, [navigate])

  function focusProject(p) {
    setActiveProject(p.id === activeProject ? null : p.id)
    if (p.lat && p.lng) setFlyTarget([p.lat, p.lng])
    if (isMobile) setSidebarOpen(false)
  }

  function startDraw(project, mode) {
    setDrawingProject(project)
    setDrawMode(mode)
    setPendingGeometry(null)
    if (isMobile) setSidebarOpen(false)
  }

  function cancelDraw() {
    setDrawMode(null)
    setDrawingProject(null)
    setPendingGeometry(null)
    setEditingFeature(null)
  }

  function onFeatureDrawn(geometry) {
    setPendingGeometry(geometry)
  }

  function calcPendingArea() {
    if (!pendingGeometry) return 0
    try {
      const tmpLayer = L.geoJSON({ type: 'Feature', geometry: pendingGeometry })
      let area = 0
      tmpLayer.eachLayer(l => { if (l.getLatLngs) { area = geodesicArea(l.getLatLngs()) } })
      return area
    } catch { return 0 }
  }

  function onFormSave({ label, properties }, goToFloralis = false) {
    let featureId = genId()
    if (editingFeature) {
      updateMapFeature(editingFeature.id, { label, properties })
      featureId = editingFeature.id
      setEditingFeature(null)
    } else {
      createMapFeature({
        id: featureId,
        project_id: drawingProject.id,
        feature_type: drawMode,
        geometry: pendingGeometry,
        label,
        properties,
      })
    }
    if (goToFloralis) {
      const area = calcPendingArea()
      navigate('/planning', { state: { fromMapFeature: { feature_id: featureId, label: label || drawMode, area_m2: area } } })
    }
    cancelDraw()
  }

  function deleteFeature(id) {
    if (confirm('Feature löschen?')) deleteMapFeature(id)
  }

  function onDroneSave(data) {
    createMapFeature({ id: genId(), project_id: droneModal.id, ...data })
    setDroneModal(null)
  }

  function openEditForm(feat) {
    setEditingFeature(feat)
    setDrawMode(feat.feature_type)
    const proj = projects.find(p => p.id === feat.project_id)
    setDrawingProject(proj)
  }

  const tile = TILES[tileLayer]

  // ── Popup HTML helpers ─────────────────────────────────────────────────────
  function buildPopupHtml(feat, color) {
    const props = feat.properties || {}
    const isTree = feat.feature_type === 'tree'
    const label = feat.label || feat.feature_type
    const relevantKeys = isTree
      ? ['baumnummer','baummarke','baumart_deutsch','baumart_latein','stammumfang_cm','bhd_cm','baumhoehe_m','kronendurchmesser_m','vitalitaet','verkehrssicherheit','eps_befall','schutzstatus','schaedlinge','pflanzjahr','letzte_kontrolle','notizen']
      : Object.keys(props)
    const rows = relevantKeys
      .filter(k => props[k] != null && props[k] !== '')
      .map(k => `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:9px;color:rgba(232,240,245,0.4);font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0;min-width:60px;padding-top:1px">${k.replace(/_/g,' ')}</span>
        <span style="font-size:11px;color:#e8f0f5;flex:1;word-break:break-word">${props[k]}</span>
      </div>`).join('')
    const proj = projects.find(p => p.id === feat.project_id)
    return `
      <div style="font-family:'Space Grotesk',sans-serif;min-width:180px;max-width:240px">
        <div style="font-weight:700;font-size:13px;color:#e8f0f5;margin-bottom:3px;border-left:3px solid ${color};padding-left:8px">${label}</div>
        <div style="font-size:10px;color:${color};font-family:'Space Mono',monospace;margin-bottom:8px;padding-left:11px">${proj?.name || ''}</div>
        ${rows ? `<div style="margin-bottom:10px">${rows}</div>` : ''}
        <a href="/projects/${proj?.id}" onclick="event.preventDefault();window._mapNav&&window._mapNav('${proj?.id}')" style="display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border-radius:6px;background:${color}22;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:600;text-decoration:none;cursor:pointer">↗ Projektseite</a>
      </div>`
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarContent = (
    <div style={{ width: isMobile ? '100%' : 268, background: SURFACE, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Karte</div>

        {/* Tile toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {[['satellite', Satellite, 'Satellit'], ['dark', MapIcon, 'Dunkel'], ['light', Layers, 'Hell']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTileLayer(id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', borderRadius: 6, border: `1px solid ${tileLayer === id ? A + '60' : BORDER}`, background: tileLayer === id ? A14 : 'transparent', color: tileLayer === id ? A : MUTED, cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowJobs(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${showJobs ? A + '50' : BORDER}`, background: showJobs ? A14 : 'transparent', color: showJobs ? A : MUTED, cursor: 'pointer', fontSize: 12, width: '100%' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B' }} />
          Einsätze (14 Tage)
          <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{upcomingJobs.length}</span>
        </button>
      </div>

      {/* Search + type filter */}
      <div style={{ padding: '10px 10px 6px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)', marginBottom: 7 }}>
          <Search size={12} color={MUTED} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suche in Features..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: FG, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={11} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setTypeFilter(null)}
            style={{ padding: '3px 8px', borderRadius: 10, border: `1px solid ${!typeFilter ? A+'60' : BORDER}`, background: !typeFilter ? A14 : 'transparent', color: !typeFilter ? A : MUTED, cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
            Alle
          </button>
          {FEATURE_MODES.map(m => (
            <button key={m.id} onClick={() => setTypeFilter(typeFilter === m.id ? null : m.id)}
              style={{ padding: '3px 8px', borderRadius: 10, border: `1px solid ${typeFilter === m.id ? m.color+'60' : BORDER}`, background: typeFilter === m.id ? m.color+'15' : 'transparent', color: typeFilter === m.id ? m.color : MUTED, cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {/* Open data layers */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 6px' }}>Open Data</div>
        {OPEN_LAYERS.map(layer => {
          const on = activeLayers.has(layer.id)
          return (
            <button key={layer.id} onClick={() => toggleLayer(layer.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${on ? layer.color + '60' : BORDER}`, background: on ? layer.color + '15' : 'transparent', color: on ? layer.color : MUTED, cursor: 'pointer', fontSize: 12, width: '100%', marginBottom: 3, textAlign: 'left' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: layer.color, flexShrink: 0 }} />
              {layer.label}
              <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 9 }}>{on ? 'AN' : 'AUS'}</span>
            </button>
          )
        })}

        {/* Project folders */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 8px 6px' }}>Projekte</div>
        {clientGroups.map(group => {
          const isExpanded = expandedClients.has(group.id)
          return (
            <div key={group.id} style={{ marginBottom: 2 }}>
              <button onClick={() => toggleClientFolder(group.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                {isExpanded ? <ChevronDown size={12} color={MUTED} /> : <ChevronRight size={12} color={MUTED} />}
                {isExpanded ? <FolderOpen size={13} color={group.color} /> : <Folder size={13} color={group.color} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: FG, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{group.projects.length}</span>
              </button>

              {isExpanded && group.projects.map(p => {
                const pJobs = jobsByProject[p.id] || []
                const isActive = activeProject === p.id
                const color = projectColor(p, p._idx)
                const hidden = hiddenProjects.has(p.id)
                const pFeatures = featuresByProject[p.id] || []
                const allFeatures = mapFeatures.filter(f => f.project_id === p.id)
                return (
                  <div key={p.id} style={{ paddingLeft: 16 }}>
                    {/* Project row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button onClick={() => focusProject(p)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 6,
                        border: `1px solid ${isActive ? color + '55' : 'transparent'}`,
                        background: isActive ? color + '18' : 'transparent', cursor: 'pointer', textAlign: 'left', minWidth: 0,
                      }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, opacity: hidden ? 0.3 : 1 }} />
                        <span style={{ fontSize: 12, color: hidden ? MUTED : FG, fontWeight: isActive ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {pJobs.length > 0 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#F6BF26', background: '#F6BF2618', padding: '1px 4px', borderRadius: 6, flexShrink: 0 }}>{pJobs.length}</span>}
                        {allFeatures.length > 0 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color, background: color+'18', padding: '1px 4px', borderRadius: 6, flexShrink: 0 }}>{allFeatures.length}</span>}
                      </button>
                      <button onClick={() => toggleProjectVisibility(p.id)}
                        style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </div>

                    {/* Feature list under project */}
                    {isActive && (
                      <div style={{ paddingLeft: 16 }}>
                        {pFeatures.map(feat => {
                          const isDrone = feat.feature_type === 'drone_image'
                          const modeInfo = FEATURE_MODES.find(m => m.id === feat.feature_type) || {}
                          const featHidden = hiddenFeatures.has(feat.id)
                          const currentOpacity = droneOpacity[feat.id] ?? feat.properties?.opacity ?? 0.8
                          return (
                            <div key={feat.id} style={{ marginBottom: isDrone ? 6 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 4px', borderRadius: 4, fontSize: 11, color: featHidden ? MUTED : FG, opacity: featHidden ? 0.45 : 1 }}>
                                  <span style={{ fontSize: 10, flexShrink: 0 }}>{isDrone ? '🚁' : (modeInfo.icon || '●')}</span>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {feat.label || modeInfo.label || feat.feature_type}
                                    {feat.properties?.baumnummer ? <span style={{ color: MUTED, marginLeft: 4, fontFamily: "'Space Mono', monospace", fontSize: 9 }}>#{feat.properties.baumnummer}</span> : null}
                                  </span>
                                </div>
                                <button onClick={() => toggleFeature(feat.id)} title={featHidden ? 'Einblenden' : 'Ausblenden'}
                                  style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {featHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                                </button>
                                {isAdmin && !isDrone && (
                                  <button onClick={() => openEditForm(feat)} title="Bearbeiten"
                                    style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Pencil size={9} />
                                  </button>
                                )}
                                {isAdmin && isDrone && (
                                  <button onClick={() => deleteFeature(feat.id)} title="Löschen"
                                    style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={9} />
                                  </button>
                                )}
                              </div>
                              {/* Opacity slider for drone images */}
                              {isDrone && !featHidden && (
                                <div style={{ paddingLeft: 20, paddingRight: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <SlidersHorizontal size={9} color={MUTED} />
                                  <input type="range" min="0.05" max="1" step="0.05"
                                    value={currentOpacity}
                                    onChange={e => setDroneOpacity(prev => ({ ...prev, [feat.id]: +e.target.value }))}
                                    style={{ flex: 1, accentColor: '#8b5cf6', height: 3 }} />
                                  <span style={{ fontSize: 9, color: MUTED, fontFamily: "'Space Mono', monospace", minWidth: 24 }}>{Math.round(currentOpacity * 100)}%</span>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Draw mode selector */}
                        {isAdmin && !drawMode && (
                          <div style={{ marginTop: 4, marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: MUTED, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Erfassen</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {FEATURE_MODES.map(m => (
                                <button key={m.id} onClick={() => startDraw(p, m.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 5, border: `1px solid ${m.color}40`, background: m.color+'12', color: m.color, cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap' }}>
                                  {m.icon} {m.label}
                                </button>
                              ))}
                              <button onClick={() => setDroneModal(p)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 5, border: '1px solid #8b5cf640', background: '#8b5cf612', color: '#8b5cf6', cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap' }}>
                                🚁 Drohnenbild
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Upcoming jobs */}
                        {pJobs.length > 0 && (
                          <div style={{ marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {pJobs.map(j => {
                              const jtype = JOB_TYPES.find(t => t.id === j.job_type)
                              return (
                                <div key={j.id} style={{ fontSize: 10, color: MUTED, display: 'flex', gap: 5, alignItems: 'center' }}>
                                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: jtype?.color || MUTED, flexShrink: 0 }}>{j.date.slice(5)}</span>
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {!isMobile && sidebarContent}

      <div style={{ flex: 1, position: 'relative' }}>
        <style>{`
          .leaflet-popup-content-wrapper { background: #0d1a23 !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 8px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important; color: #e8f0f5 !important; }
          .leaflet-popup-tip { background: #0d1a23 !important; }
          .leaflet-popup-content { margin: 10px 14px !important; }
          .leaflet-container { background: #080f14; }
          .leaflet-control-attribution { background: rgba(0,0,0,0.6) !important; color: rgba(255,255,255,0.3) !important; font-size: 9px !important; }
          .leaflet-control-attribution a { color: rgba(8,170,86,0.7) !important; }
          .leaflet-control-zoom a { background: #0d1a23 !important; border-color: rgba(255,255,255,0.12) !important; color: #e8f0f5 !important; }
          .leaflet-control-zoom a:hover { background: rgba(8,170,86,0.2) !important; }
          .leaflet-pm-toolbar .leaflet-pm-icon { filter: invert(1) brightness(0.75); }
          .leaflet-pm-toolbar { background: #0d1a23 !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 8px !important; overflow: hidden; }
          .leaflet-pm-toolbar .leaflet-pm-actions a, .button-container .leaflet-pm-action { background: #0d1a23 !important; border-color: rgba(255,255,255,0.1) !important; color: #e8f0f5 !important; }
          .button-container { background: #0d1a23 !important; border-color: rgba(255,255,255,0.12) !important; }
          .button-container button { background: #0d1a23 !important; border-color: rgba(255,255,255,0.12) !important; color: #e8f0f5 !important; }
          .button-container button:hover { background: rgba(9,190,96,0.18) !important; }
          .button-container button.active { background: rgba(9,190,96,0.22) !important; border-color: rgba(9,190,96,0.5) !important; }
        `}</style>

        <MapContainer center={[52.515, 13.405]} zoom={11} maxZoom={22} style={{ width: '100%', height: '100%' }} zoomControl={true}>
          <TileLayer key={tileLayer} url={tile.url} attribution={tile.attribution} maxNativeZoom={tile.maxNativeZoom} maxZoom={tile.maxZoom} />

          {/* Open data WMS layers */}
          {OPEN_LAYERS.filter(l => activeLayers.has(l.id)).map(layer => (
            <WMSTileLayer key={layer.id} url={layer.wms.url} layers={layer.wms.layers}
              format={layer.wms.format} transparent={layer.wms.transparent} opacity={layer.wms.opacity}
              version="1.3.0" attribution="© Senatsverwaltung Berlin" />
          ))}

          {flyTarget && <FlyTo center={flyTarget} />}

          {/* Drone image overlays */}
          {mapFeatures.filter(f => f.feature_type === 'drone_image' && !hiddenProjects.has(f.project_id) && !hiddenFeatures.has(f.id) && f.properties?.image_url && f.geometry).map(feat => {
            const coords = feat.geometry.coordinates[0]
            const lngs = coords.map(c => c[0])
            const lats = coords.map(c => c[1])
            const south = Math.min(...lats), north = Math.max(...lats)
            const west = Math.min(...lngs), east = Math.max(...lngs)
            const opacity = droneOpacity[feat.id] ?? feat.properties?.opacity ?? 0.8
            return (
              <ImageOverlay key={feat.id} url={feat.properties.image_url} bounds={[[south, west], [north, east]]} opacity={opacity} />
            )
          })}

          {/* map_features rendering */}
          {mapFeatures.map(feat => {
            if (feat.feature_type === 'drone_image') return null
            if (hiddenProjects.has(feat.project_id) || hiddenFeatures.has(feat.id)) return null
            if (typeFilter && feat.feature_type !== typeFilter) return null
            const q = searchQuery.toLowerCase()
            if (q && !(feat.label || '').toLowerCase().includes(q) && !JSON.stringify(feat.properties || {}).toLowerCase().includes(q)) return null

            const color = projectColorById[feat.project_id] || A
            const geom = feat.geometry
            if (!geom) return null

            if (geom.type === 'Point') {
              const [lng, lat] = geom.coordinates
              const icon = feat.feature_type === 'tree' ? makeTreeIcon(color) : makePin(color, 14)
              return (
                <Marker key={feat.id} position={[lat, lng]} icon={icon}>
                  <Popup>
                    <div dangerouslySetInnerHTML={{ __html: buildPopupHtml(feat, color) }} />
                  </Popup>
                </Marker>
              )
            }

            // Polygon / LineString / etc.
            const isLine = geom.type === 'LineString' || geom.type === 'MultiLineString'
            return (
              <GeoJSON key={feat.id} data={{ type: 'Feature', geometry: geom }}
                style={{ color, weight: 2.5, fillColor: color, fillOpacity: isLine ? 0 : 0.18 }}
                onEachFeature={(_, layer) => {
                  layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e)
                    let area = 0, perimeter = 0
                    try {
                      const ll = layer.getLatLngs ? layer.getLatLngs() : []
                      if (!isLine) area = geodesicArea(ll)
                      perimeter = perimeterMeters(ll)
                    } catch {}
                    const measureHtml = (area > 0 || perimeter > 0) ? `
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
                        ${area > 0 ? `<div style="background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px"><div style="font-size:9px;color:rgba(232,240,245,0.45);margin-bottom:2px;font-family:'Space Mono',monospace;text-transform:uppercase">Fläche</div><div style="font-size:13px;font-weight:700;color:#e8f0f5">${fmtArea(area)}</div></div>` : ''}
                        ${perimeter > 0 ? `<div style="background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px"><div style="font-size:9px;color:rgba(232,240,245,0.45);margin-bottom:2px;font-family:'Space Mono',monospace;text-transform:uppercase">${isLine ? 'Länge' : 'Umfang'}</div><div style="font-size:13px;font-weight:700;color:#e8f0f5">${fmtLen(perimeter)}</div></div>` : ''}
                      </div>` : ''
                    const fullHtml = buildPopupHtml(feat, color).replace('</div>', `${measureHtml}</div>`)
                    L.popup({ maxWidth: 260 }).setLatLng(e.latlng).setContent(fullHtml).openOn(layer._map)
                  })
                  layer.on('mouseover', () => layer.setStyle({ weight: 3.5, fillOpacity: isLine ? 0 : 0.28 }))
                  layer.on('mouseout', () => layer.setStyle({ weight: 2.5, fillOpacity: isLine ? 0 : 0.18 }))
                }}
              />
            )
          })}

          {/* Project location markers */}
          {mappableProjects.map((p, i) => {
            if (hiddenProjects.has(p.id)) return null
            const color = projectColor(p, i)
            const isActive = activeProject === p.id
            return (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={makePin(color, isActive ? 20 : 14)}>
                <Popup>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e8f0f5', marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color, marginBottom: 4 }}>{p.client}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,240,245,0.5)', marginBottom: 4 }}>{p.location}</div>
                    {mapFeatures.filter(f => f.project_id === p.id).length > 0 && (
                      <div style={{ fontSize: 10, color, fontFamily: "'Space Mono', monospace" }}>
                        {mapFeatures.filter(f => f.project_id === p.id).length} Features kartiert
                      </div>
                    )}
                    {(jobsByProject[p.id] || []).length > 0 && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: '#F59E0B' }}>
                        {jobsByProject[p.id].length} Einsatz{jobsByProject[p.id].length > 1 ? 'e' : ''} (14 Tage)
                      </div>
                    )}
                    <button onClick={() => navigate(`/projects/${p.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '5px 10px', borderRadius: 5, background: color + '20', border: `1px solid ${color}50`, color, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", width: '100%', justifyContent: 'center' }}>
                      <ExternalLink size={11} /> Projektseite
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Job markers */}
          {showJobs && upcomingJobs.map(j => {
            const proj = projects.find(p => p.id === j.project_id)
            if (!proj?.lat) return null
            const jtype = JOB_TYPES.find(t => t.id === j.job_type)
            const color = jtype?.color || '#F59E0B'
            const offset = 0.0006
            return (
              <Marker key={j.id} position={[proj.lat + offset, proj.lng + offset]} icon={makePin(color, 10)}>
                <Popup>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <div style={{ fontWeight: 500, fontSize: 12, color: '#e8f0f5', marginBottom: 2 }}>{j.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color, marginBottom: 3 }}>{j.date} · {jtype?.label || j.job_type}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,240,245,0.5)' }}>{proj.name}</div>
                    {(j.assigned_users || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                        {(j.assigned_users || []).map(uid => {
                          const u = TEAM.find(t => t.id === uid)
                          return u ? (
                            <div key={uid} style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Active draw mode */}
          {drawMode && !pendingGeometry && (
            <DrawControl mode={drawMode} onFeatureDrawn={onFeatureDrawn} onCancel={cancelDraw} />
          )}
        </MapContainer>

        {/* Draw mode indicator banner */}
        {drawMode && !pendingGeometry && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: SURFACE, border: `1px solid ${FEATURE_MODES.find(m => m.id === drawMode)?.color || A}60`, borderRadius: 8, padding: '8px 16px', fontSize: 12, color: FG, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{FEATURE_MODES.find(m => m.id === drawMode)?.icon}</span>
            <span>{drawMode === 'tree' || drawMode === 'point' ? 'Auf Karte klicken um zu platzieren' : 'Fläche zeichnen, dann Doppelklick zum Abschließen'}</span>
          </div>
        )}

        {/* Mobile toggle */}
        {isMobile && (
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 14px', color: FG, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {sidebarOpen ? '✕ Schließen' : '☰ Projekte'}
          </button>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 999 }} onClick={() => setSidebarOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80%', maxWidth: 300 }} onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Feature form modal — opens after geometry is drawn or when editing */}
      {(pendingGeometry || editingFeature) && drawMode && (
        <FeatureForm
          mode={drawMode}
          project={drawingProject}
          color={drawingProject ? projectColorById[drawingProject.id] : A}
          existingFeature={editingFeature}
          areaM2={calcPendingArea()}
          onSave={onFormSave}
          onCancel={cancelDraw}
        />
      )}

      {/* Drone image upload modal */}
      {droneModal && (
        <DroneImageModal
          project={droneModal}
          color={projectColorById[droneModal.id] || A}
          onSave={onDroneSave}
          onCancel={() => setDroneModal(null)}
        />
      )}
    </div>
  )
}
