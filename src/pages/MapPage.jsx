import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMap, GeoJSON, ImageOverlay, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A06, A10, A14, A18 } from '../lib/theme.js'
import { TEAM, JOB_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '../data/seed.js'

const TASK_P = Object.fromEntries(TASK_PRIORITIES.map(p => [p.id, p]))
const TASK_S = Object.fromEntries(TASK_STATUSES.map(s => [s.id, s]))
import { isoToday, addDays, genId } from '../lib/storage.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { Layers, Satellite, Map as MapIcon, Pencil, Save, X, ExternalLink, ChevronRight, ChevronDown, FolderOpen, Folder, Eye, EyeOff, Search, MapPin, Plus, Trash2, Upload, Image, SlidersHorizontal, Ruler, Move, LocateFixed } from 'lucide-react'

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

// Offene Streckenlänge (ohne Ringschluss) — für Linien & Mess-Modus
function openPathMeters(latLngs) {
  const pts = Array.isArray(latLngs[0]) ? latLngs.flat(Infinity) : latLngs
  let d = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = L.latLng(pts[i].lat ?? pts[i][0], pts[i].lng ?? pts[i][1])
    const b = L.latLng(pts[i + 1].lat ?? pts[i + 1][0], pts[i + 1].lng ?? pts[i + 1][1])
    d += a.distanceTo(b)
  }
  return d
}

function geomLineLength(geometry) {
  const pts = (geometry?.coordinates || []).map(([lng, lat]) => L.latLng(lat, lng))
  let d = 0
  for (let i = 0; i < pts.length - 1; i++) d += pts[i].distanceTo(pts[i + 1])
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

function makeUserIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 2px rgba(59,130,246,0.35),0 2px 8px rgba(0,0,0,0.5)"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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
function DrawControl({ mode, onFeatureDrawn, onCancel, onLiveMeasure }) {
  const map = useMap()
  const workingRef = useRef(null)

  useEffect(() => {
    if (!map || !mode) return

    const isPoint = mode === 'tree' || mode === 'point'
    const isLine = mode === 'line' || mode === 'measure'
    const shapeName = isPoint ? 'Marker' : isLine ? 'Line' : 'Polygon'

    if (isPoint) {
      map.pm.enableDraw('Marker', { snappable: false })
    } else if (isLine) {
      map.pm.enableDraw('Line', { snappable: true })
    } else {
      map.pm.enableDraw('Polygon', { snappable: true })
    }

    function computeLive() {
      const wl = workingRef.current
      if (!wl?.getLatLngs) return
      try {
        const flat = (Array.isArray(wl.getLatLngs()?.[0]) ? wl.getLatLngs().flat(Infinity) : wl.getLatLngs()) || []
        if (flat.length < 2) { onLiveMeasure?.(null); return }
        onLiveMeasure?.({
          length: openPathMeters(flat),
          area: !isLine && flat.length >= 3 ? geodesicArea(flat) : 0,
        })
      } catch { /* Zwischenstand nicht messbar */ }
    }

    function onDrawStart(e) {
      workingRef.current = e.workingLayer
      e.workingLayer?.on?.('pm:vertexadded', computeLive)
    }

    function onDrawEnd(e) {
      const geojson = e.layer.toGeoJSON()
      map.removeLayer(e.layer)
      map.pm.disableDraw()
      onLiveMeasure?.(null)
      onFeatureDrawn(geojson.geometry)
    }

    // Esc = abbrechen, Backspace = letzten Eckpunkt entfernen
    function onKey(ev) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (ev.key === 'Escape') {
        ev.preventDefault()
        onCancel()
      } else if (ev.key === 'Backspace' && !isPoint) {
        ev.preventDefault()
        try { map.pm.Draw[shapeName]._removeLastVertex(); computeLive() } catch { /* noch kein Punkt gesetzt */ }
      }
    }

    map.on('pm:drawstart', onDrawStart)
    map.on('pm:create', onDrawEnd)
    document.addEventListener('keydown', onKey)
    return () => {
      map.off('pm:drawstart', onDrawStart)
      map.off('pm:create', onDrawEnd)
      document.removeEventListener('keydown', onKey)
      map.pm.disableDraw()
      onLiveMeasure?.(null)
      workingRef.current = null
    }
  }, [map, mode])

  return (
    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
      <button onClick={onCancel}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        <X size={14} /> Abbrechen <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, opacity: 0.6 }}>Esc</span>
      </button>
    </div>
  )
}

/* ─── GPS / STANDORT ────────────────────────────────────────────────────── */
function UserLocation({ userPos }) {
  if (!userPos) return null
  return (
    <>
      {userPos.accuracy > 0 && (
        <Circle center={[userPos.lat, userPos.lng]} radius={userPos.accuracy}
          pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.5, fillColor: '#3b82f6', fillOpacity: 0.08 }} />
      )}
      <Marker position={[userPos.lat, userPos.lng]} icon={makeUserIcon()} zIndexOffset={1000} />
    </>
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
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${modeInfo.color || A} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${modeInfo.color || A} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
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
            className="lu-btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Save size={13} /> Speichern
          </button>
          {(mode === 'bed' || mode === 'area') && areaM2 > 0 && (
            <button onClick={() => { onSave({ label: label || modeInfo.label, properties: form }, true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 8, background: '#22c55e20', border: '1px solid #22c55e40', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap' }}>
              🌿 Florales™ →
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
const LAYER_CATS = [
  { id: 'klima', label: '🌡️ Klima & Versiegelung', color: '#f97316' },
  { id: 'bio',   label: '🌿 Vegetation & Ökologie', color: '#22EAA7' },
]

const OPEN_LAYERS = [
  // ─ Klima & Stadtwärme ─────────────────────────────────────────────────────
  { id: 'corine_urban', label: 'Versiegelung', color: '#f97316', cat: 'klima',
    desc: 'Bebaute & versiegelte Flächen — Hitzeinsel-Risiko (Copernicus 2018)',
    wms: { url: 'https://copernicus.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer', layers: '1', format: 'image/png', transparent: true, opacity: 0.6, version: '1.1.1' } },
  { id: 'corine_landuse', label: 'Landnutzung', color: '#a78bfa', cat: 'klima',
    desc: 'Klassifizierung nach Nutzungstyp — Basis für Klimaplanung (Copernicus 2018)',
    wms: { url: 'https://copernicus.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer', layers: '2', format: 'image/png', transparent: true, opacity: 0.5, version: '1.1.1' } },

  // ─ Vegetation & Biodiversität ─────────────────────────────────────────────
  { id: 'corine_vegetation', label: 'Wälder & Wiesen', color: '#22EAA7', cat: 'bio',
    desc: 'Wälder, Wiesen, Heiden aus CORINE 2018 — Biodiversitätspotenzial',
    wms: { url: 'https://copernicus.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer', layers: '3', format: 'image/png', transparent: true, opacity: 0.6, version: '1.1.1' } },
  { id: 'corine_water', label: 'Gewässer', color: '#60a5fa', cat: 'bio',
    desc: 'Flüsse, Seen, Feuchtgebiete — Kühlkorridore im Stadtklima',
    wms: { url: 'https://copernicus.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer', layers: '4', format: 'image/png', transparent: true, opacity: 0.6, version: '1.1.1' } },
]

/* ─── MAIN COMPONENT ────────────────────────────────────────────────────── */
export default function MapPage() {
  const { projects, jobs, clients, mapFeatures, tasks, createMapFeature, updateMapFeature, deleteMapFeature, updateProject } = useOps()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const today = isoToday()
  const isMobile = useIsMobile()

  const [activeProject, setActiveProject] = useState(null)
  const [showJobs, setShowJobs] = useState(true)
  const [showTasks, setShowTasks] = useState(true)
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

  // Toolbar / Bearbeiten / GPS / Messen
  const [drawProjectId, setDrawProjectId] = useState(null)   // Zielprojekt der Toolbar
  const [projectHint, setProjectHint] = useState(false)      // "erst Projekt wählen"-Hinweis
  const [editMode, setEditMode] = useState(false)            // Geometrien verschieben/editieren
  const [gpsOn, setGpsOn] = useState(false)
  const [userPos, setUserPos] = useState(null)               // { lat, lng, accuracy }
  const [measureResult, setMeasureResult] = useState(null)   // { length }
  const [liveMeasure, setLiveMeasure] = useState(null)       // { length, area } während des Zeichnens
  const featureLayers = useRef(new Map())                    // featureId -> Leaflet-Layer (für Edit-Modus)
  const editModeRef = useRef(false)
  useEffect(() => { editModeRef.current = editMode }, [editMode])

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  // Toolbar-Projekt folgt der Sidebar-Auswahl
  useEffect(() => { if (activeProject) setDrawProjectId(activeProject) }, [activeProject])

  // GPS: Standort verfolgen, beim ersten Fix hinfliegen
  useEffect(() => {
    if (!gpsOn) { setUserPos(null); return }
    if (!navigator.geolocation) {
      window.__lumaToast?.('GPS wird von diesem Gerät nicht unterstützt')
      setGpsOn(false)
      return
    }
    let first = true
    const id = navigator.geolocation.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy || 0 }
        setUserPos(p)
        if (first) { first = false; setFlyTarget([p.lat, p.lng]) }
      },
      err => {
        window.__lumaToast?.(`Standort nicht verfügbar: ${err.message}`)
        setGpsOn(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [gpsOn])

  // Bearbeiten-Modus: Geoman-Editing auf allen Feature-Layern an/aus
  useEffect(() => {
    featureLayers.current.forEach(layer => {
      try {
        if (!layer._map) return
        if (editMode) layer.pm?.enable({ allowSelfIntersection: true })
        else layer.pm?.disable()
      } catch { /* Layer gerade entfernt */ }
    })
  }, [editMode])

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
  const mappableTasks = (tasks || []).filter(t => t.lat && t.lng && t.status !== 'done' && t.status !== 'archive')

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
    if (focusId && projects.length > 0) {
      const p = projects.find(pr => pr.id === focusId)
      if (p?.lat && p?.lng) {
        setActiveProject(p.id)
        setFlyTarget([p.lat, p.lng])
        return
      }
    }
    // Aufgaben-Ort (freie Koordinaten, z.B. aus "Auf Karte zeigen")
    const coords = location.state?.focusCoords
    if (Array.isArray(coords) && coords.length === 2) {
      setFlyTarget([coords[0], coords[1]])
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
    if (project?.id) setDrawProjectId(project.id)
    setDrawMode(mode)
    setPendingGeometry(null)
    setEditMode(false)
    setMeasureResult(null)
    if (isMobile) setSidebarOpen(false)
  }

  // Toolbar-Einstieg: Zeichnen mit dem in der Toolbar gewählten Projekt
  function startDrawFromToolbar(mode) {
    if (mode === 'measure') {
      setDrawingProject(null)
      setDrawMode('measure')
      setPendingGeometry(null)
      setEditMode(false)
      setMeasureResult(null)
      return
    }
    const proj = mappableProjects.find(p => p.id === drawProjectId)
    if (!proj) {
      setProjectHint(true)
      setTimeout(() => setProjectHint(false), 2500)
      return
    }
    startDraw(proj, mode)
  }

  // GPS-Erfassung: Baum direkt an der eigenen Position anlegen
  function captureTreeAtPosition() {
    const proj = mappableProjects.find(p => p.id === drawProjectId)
    if (!proj) {
      setProjectHint(true)
      setTimeout(() => setProjectHint(false), 2500)
      return
    }
    if (!userPos) return
    setDrawingProject(proj)
    setDrawMode('tree')
    setEditMode(false)
    setPendingGeometry({ type: 'Point', coordinates: [userPos.lng, userPos.lat] })
  }

  function cancelDraw() {
    setDrawMode(null)
    setDrawingProject(null)
    setPendingGeometry(null)
    setEditingFeature(null)
    setLiveMeasure(null)
  }

  function onFeatureDrawn(geometry) {
    if (drawMode === 'measure') {
      setMeasureResult({ length: geomLineLength(geometry) })
      cancelDraw()
      return
    }
    setPendingGeometry(geometry)
  }

  // Geometrie-Änderung aus dem Bearbeiten-Modus speichern
  function saveEditedGeometry(featId, layer) {
    try {
      const geometry = layer.toGeoJSON().geometry
      updateMapFeature(featId, { geometry })
    } catch { /* Layer nicht serialisierbar */ }
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
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>BIOME™</div>

        {/* Tile toggle */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 10, flexWrap: 'wrap' }}>
          {[['satellite', Satellite, 'Satellit'], ['sentinel', Satellite, 'Sentinel-2'], ['dark', MapIcon, 'Dunkel'], ['light', Layers, 'Hell']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTileLayer(id)}
              style={{ flex: 1, minWidth: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', borderRadius: 6, border: `1px solid ${tileLayer === id ? `color-mix(in srgb, ${A} 38%, transparent)` : BORDER}`, background: tileLayer === id ? A14 : 'transparent', color: tileLayer === id ? A : MUTED, cursor: 'pointer', fontSize: 9, fontFamily: "'Space Grotesk', sans-serif" }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowJobs(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${showJobs ? `color-mix(in srgb, ${A} 31%, transparent)` : BORDER}`, background: showJobs ? A14 : 'transparent', color: showJobs ? A : MUTED, cursor: 'pointer', fontSize: 12, width: '100%' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B' }} />
          Einsätze (14 Tage)
          <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{upcomingJobs.length}</span>
        </button>

        <button onClick={() => setShowTasks(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${showTasks ? `color-mix(in srgb, ${A} 31%, transparent)` : BORDER}`, background: showTasks ? A14 : 'transparent', color: showTasks ? A : MUTED, cursor: 'pointer', fontSize: 12, width: '100%', marginTop: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A78BFA' }} />
          Aufgaben mit Ort
          <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{mappableTasks.length}</span>
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
        {/* Open data layers - by category */}
        {LAYER_CATS.map(cat => {
          const layers = OPEN_LAYERS.filter(l => l.cat === cat.id)
          return (
            <div key={cat.id} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: cat.color, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 5px' }}>{cat.label}</div>
              {layers.map(layer => {
                const on = activeLayers.has(layer.id)
                return (
                  <div key={layer.id} style={{ marginBottom: 2 }}>
                    <button onClick={() => toggleLayer(layer.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${on ? layer.color + '60' : BORDER}`, background: on ? layer.color + '15' : 'transparent', color: on ? layer.color : MUTED, cursor: 'pointer', fontSize: 12, width: '100%', textAlign: 'left' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: layer.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{layer.label}</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9 }}>{on ? 'AN' : 'AUS'}</span>
                    </button>
                    {on && layer.desc && (
                      <div style={{ fontSize: 10, color: MUTED, padding: '3px 10px 4px 25px', lineHeight: 1.4 }}>{layer.desc}</div>
                    )}
                  </div>
                )
              })}
            </div>
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
          {tile.wms
            ? <WMSTileLayer key={tileLayer} url={tile.url} layers={tile.layers} format={tile.format} attribution={tile.attribution} maxNativeZoom={tile.maxNativeZoom} maxZoom={tile.maxZoom} />
            : <TileLayer key={tileLayer} url={tile.url} attribution={tile.attribution} maxNativeZoom={tile.maxNativeZoom} maxZoom={tile.maxZoom} />
          }

          {/* Open data WMS layers */}
          {OPEN_LAYERS.filter(l => activeLayers.has(l.id)).map(layer => (
            <WMSTileLayer key={layer.id} url={layer.wms.url} layers={layer.wms.layers}
              format={layer.wms.format} transparent={layer.wms.transparent} opacity={layer.wms.opacity}
              version={layer.wms.version || '1.3.0'} attribution={layer.wms.attribution || '© Copernicus/EEA'} />
          ))}

          {flyTarget && <FlyTo center={flyTarget} />}

          {/* Eigener Standort (GPS) */}
          <UserLocation userPos={userPos} />

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
              const canDrag = isAdmin && editMode
              return (
                <Marker key={feat.id} position={[lat, lng]} icon={icon} draggable={canDrag}
                  eventHandlers={{
                    dragend: e => {
                      const ll = e.target.getLatLng()
                      updateMapFeature(feat.id, { geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] } })
                    },
                  }}>
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
                  // Für den Bearbeiten-Modus registrieren & Änderungen speichern
                  featureLayers.current.set(feat.id, layer)
                  layer.on('pm:edit', () => saveEditedGeometry(feat.id, layer))
                  if (isAdmin && editModeRef.current) {
                    try { layer.pm?.enable({ allowSelfIntersection: true }) } catch {}
                  }
                  layer.on('click', (e) => {
                    if (editModeRef.current) return  // im Bearbeiten-Modus kein Popup
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

          {/* Task markers (Aufgaben mit Ort) */}
          {showTasks && mappableTasks.map((t, i) => {
            const color = TASK_P[t.priority]?.color || '#A78BFA'
            const st = TASK_S[t.status]
            const proj = projects.find(p => p.id === t.project_id)
            const owner = t.owner_id ? TEAM.find(u => u.id === t.owner_id) : null
            const offset = ((i % 5) - 2) * 0.0004
            return (
              <Marker key={`task-${t.id}`} position={[t.lat + offset, t.lng + offset]} icon={makePin(color, 12)}>
                <Popup>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Aufgabe{st ? ` · ${st.label}` : ''}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e8f0f5', marginBottom: 3 }}>{t.title}</div>
                    {proj && <div style={{ fontSize: 11, color: 'rgba(232,240,245,0.5)', marginBottom: 2 }}>{proj.name}</div>}
                    {t.due_date && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(232,240,245,0.6)' }}>fällig {t.due_date}</div>}
                    {owner && <div style={{ fontSize: 11, color: 'rgba(232,240,245,0.6)', marginTop: 3 }}>👤 {owner.name}</div>}
                    <button onClick={() => navigate('/tasks')}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '5px 10px', borderRadius: 5, background: color + '20', border: `1px solid ${color}50`, color, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", width: '100%', justifyContent: 'center' }}>
                      <ExternalLink size={11} /> Zu den Aufgaben
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Active draw mode */}
          {drawMode && !pendingGeometry && (
            <DrawControl mode={drawMode} onFeatureDrawn={onFeatureDrawn} onCancel={cancelDraw} onLiveMeasure={setLiveMeasure} />
          )}
        </MapContainer>

        {/* ── Zeichen-Toolbar (schwebend) ── */}
        {!drawMode && (
          <div style={{ position: 'absolute', top: isMobile ? 56 : 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, boxShadow: '0 2px 14px rgba(0,0,0,0.4)', maxWidth: 'calc(100% - 24px)', overflowX: 'auto' }}>
            {isAdmin && (
              <>
                <select value={drawProjectId || ''} onChange={e => setDrawProjectId(e.target.value || null)}
                  title="Projekt für neue Features"
                  style={{ maxWidth: 130, padding: '5px 6px', borderRadius: 6, border: `1px solid ${projectHint ? 'var(--luma-danger)' : BORDER}`, background: 'transparent', color: drawProjectId ? FG : MUTED, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <option value="">Projekt wählen…</option>
                  {mappableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {FEATURE_MODES.map(m => (
                  <button key={m.id} onClick={() => startDrawFromToolbar(m.id)} title={`${m.label} — ${m.desc}`} className="lu-chip"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <span style={{ fontSize: 13 }}>{m.icon}</span>{!isMobile && m.label}
                  </button>
                ))}
                <button onClick={() => setEditMode(v => !v)} title="Bearbeiten: Punkte verschieben, Eckpunkte ziehen"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: `1px solid ${editMode ? `color-mix(in srgb, ${A} 44%, transparent)` : 'transparent'}`, background: editMode ? A14 : 'transparent', color: editMode ? A : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <Move size={13} />{!isMobile && 'Bearbeiten'}
                </button>
                <div style={{ width: 1, alignSelf: 'stretch', background: BORDER, margin: '2px 2px', flexShrink: 0 }} />
              </>
            )}
            <button onClick={() => startDrawFromToolbar('measure')} title="Strecke messen (wird nicht gespeichert)" className="lu-chip"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Ruler size={13} />{!isMobile && 'Messen'}
            </button>
            <button onClick={() => setGpsOn(v => !v)} title="Meinen Standort anzeigen (GPS)"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: 7, border: `1px solid ${gpsOn ? 'rgba(59,130,246,0.5)' : 'transparent'}`, background: gpsOn ? 'rgba(59,130,246,0.14)' : 'transparent', color: gpsOn ? '#3b82f6' : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
              <LocateFixed size={13} />{!isMobile && 'Standort'}
            </button>
            {isAdmin && gpsOn && userPos && (
              <button onClick={captureTreeAtPosition} title="Baum an meiner aktuellen GPS-Position erfassen"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid #22c55e50', background: '#22c55e18', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600 }}>
                🌳 Baum hier
              </button>
            )}
          </div>
        )}

        {/* Projekt-Hinweis */}
        {projectHint && (
          <div className="lu-fade-in" style={{ position: 'absolute', top: isMobile ? 104 : 58, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'color-mix(in srgb, var(--luma-danger) 15%, var(--luma-card))', border: '1px solid color-mix(in srgb, var(--luma-danger) 45%, transparent)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--luma-danger)', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            Bitte zuerst links in der Toolbar ein Projekt wählen
          </div>
        )}

        {/* Bearbeiten-Modus Banner */}
        {editMode && !drawMode && (
          <div style={{ position: 'absolute', top: isMobile ? 104 : 58, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: SURFACE, border: `1px solid color-mix(in srgb, ${A} 38%, transparent)`, borderRadius: 8, padding: '7px 14px', fontSize: 12, color: FG, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Move size={13} color={A} />
            <span>Bearbeiten aktiv — Punkte verschieben, Eckpunkte ziehen. Änderungen werden automatisch gespeichert.</span>
            <button onClick={() => setEditMode(false)} className="lu-btn-primary"
              style={{ padding: '3px 10px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              Fertig
            </button>
          </div>
        )}

        {/* Draw mode indicator banner */}
        {drawMode && !pendingGeometry && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: SURFACE, border: `1px solid color-mix(in srgb, ${drawMode === 'measure' ? '#38bdf8' : FEATURE_MODES.find(m => m.id === drawMode)?.color || A} 38%, transparent)`, borderRadius: 8, padding: '8px 16px', fontSize: 12, color: FG, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.5)', maxWidth: 'calc(100% - 24px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{drawMode === 'measure' ? '📏' : FEATURE_MODES.find(m => m.id === drawMode)?.icon}</span>
              <span>
                {drawMode === 'tree' || drawMode === 'point'
                  ? 'Auf die Karte tippen, um zu platzieren'
                  : drawMode === 'measure'
                    ? 'Messpunkte setzen — letzten Punkt doppelt antippen zum Abschließen'
                    : drawMode === 'line'
                      ? 'Punkte setzen — letzten Punkt doppelt antippen zum Abschließen'
                      : 'Eckpunkte setzen — ersten Punkt antippen oder Doppelklick zum Abschließen'}
              </span>
              {liveMeasure && (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: A, fontWeight: 700, marginLeft: 6, whiteSpace: 'nowrap' }}>
                  {liveMeasure.area > 0 ? `${fmtArea(liveMeasure.area)} · ` : ''}{fmtLen(liveMeasure.length)}
                </span>
              )}
            </div>
            {drawMode !== 'tree' && drawMode !== 'point' && (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 4, letterSpacing: '0.04em' }}>
                Backspace = letzter Punkt zurück · Esc = abbrechen
              </div>
            )}
          </div>
        )}

        {/* Mess-Ergebnis */}
        {measureResult && !drawMode && (
          <div className="lu-fade-in" style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: SURFACE, border: '1px solid rgba(56,189,248,0.4)', borderRadius: 10, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ruler size={15} color="#38bdf8" />
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gemessene Strecke</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: '#38bdf8', lineHeight: 1.2 }}>{fmtLen(measureResult.length)}</div>
            </div>
            <button onClick={() => startDrawFromToolbar('measure')} className="lu-btn-ghost" title="Erneut messen"
              style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 11 }}>
              Erneut
            </button>
            <button onClick={() => setMeasureResult(null)} className="lu-btn-ghost" aria-label="Schließen"
              style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
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
