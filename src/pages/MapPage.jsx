import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A06, A10, A14, A18 } from '../lib/theme.js'
import { TEAM, JOB_TYPES } from '../data/seed.js'
import { isoToday, addDays } from '../lib/storage.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { Layers, Satellite, Map as MapIcon, Pencil, Save, X, ExternalLink, ChevronRight, ChevronDown, FolderOpen, Folder, Eye, EyeOff } from 'lucide-react'

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

function makePin(color, size = 14) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
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

function DrawControl({ project, onSave, onCancel }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!map) return
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    })

    // If project already has geojson, load it
    if (project?.geojson) {
      const layer = L.geoJSON(project.geojson, {
        style: { color: project.color || '#08AA56', weight: 2, fillOpacity: 0.15 },
      }).addTo(map)
      layer.pm.enable()
      layerRef.current = layer
    }

    return () => {
      map.pm.removeControls()
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [map, project])

  function handleSave() {
    const layers = []
    map.eachLayer(layer => {
      if (layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.Rectangle) {
        try { layers.push(layer.toGeoJSON()) } catch {}
      }
    })
    const fc = layers.length > 0
      ? { type: 'FeatureCollection', features: layers }
      : null
    onSave(fc)
  }

  return (
    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 8 }}>
      <button onClick={handleSave}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        <Save size={14} /> Fläche speichern
      </button>
      <button onClick={onCancel}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: SURFACE, border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        <X size={14} /> Abbrechen
      </button>
    </div>
  )
}

export default function MapPage() {
  const { projects, jobs, clients, updateProject } = useOps()
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
  const [drawingProject, setDrawingProject] = useState(null)
  const [activeLayers, setActiveLayers] = useState(new Set())
  const [expandedClients, setExpandedClients] = useState(new Set(['all']))
  const [hiddenProjects, setHiddenProjects] = useState(new Set())
  const [hiddenFeatures, setHiddenFeatures] = useState(new Set())
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  function toggleFeature(key) {
    setHiddenFeatures(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleClientFolder(clientId) {
    setExpandedClients(prev => {
      const next = new Set(prev)
      next.has(clientId) ? next.delete(clientId) : next.add(clientId)
      return next
    })
  }

  function toggleProjectVisibility(projectId) {
    setHiddenProjects(prev => {
      const next = new Set(prev)
      next.has(projectId) ? next.delete(projectId) : next.add(projectId)
      return next
    })
  }

  function toggleLayer(id) {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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

  // Assign colors to projects deterministically
  const projectColor = (p, i) => p.color || PROJECT_COLORS[i % PROJECT_COLORS.length]

  // Group projects by client for folder structure
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

  useEffect(() => {
    const focusId = location.state?.focusProjectId
    if (!focusId || projects.length === 0) return
    const p = projects.find(pr => pr.id === focusId)
    if (p?.lat && p?.lng) {
      setActiveProject(p.id)
      setFlyTarget([p.lat, p.lng])
    }
  }, [location.state, projects])

  // Global hook for popup "Projektseite" links (can't use react-router inside Leaflet HTML)
  useEffect(() => {
    window._mapNav = (id) => navigate(`/projects/${id}`)
    return () => { delete window._mapNav }
  }, [navigate])

  function focusProject(p) {
    setActiveProject(p.id === activeProject ? null : p.id)
    if (p.lat && p.lng) setFlyTarget([p.lat, p.lng])
    if (isMobile) setSidebarOpen(false)
  }

  async function handleSaveGeojson(geojson) {
    if (!drawingProject) return
    await updateProject(drawingProject.id, { geojson })
    setDrawingProject(null)
  }

  const tile = TILES[tileLayer]

  const OPEN_LAYERS = [
    { id: 'heatisland', label: 'Wärmeinseln', color: '#ef4444',
      wms: { url: 'https://fbinter.stadt-berlin.de/fb/wms/senstadt/k07_06stadtklima2015', layers: 'fb:k07_06stadtklima2015', format: 'image/png', transparent: true, opacity: 0.55 } },
    { id: 'biotop', label: 'Biotopkataster', color: '#22EAA7',
      wms: { url: 'https://fbinter.stadt-berlin.de/fb/wms/senstadt/biotopkataster', layers: 'fb:biotopkataster', format: 'image/png', transparent: true, opacity: 0.6 } },
    { id: 'gruenflaechen', label: 'Grünflächen', color: '#4ade80',
      wms: { url: 'https://fbinter.stadt-berlin.de/fb/wms/senstadt/k_gruenanlagenbestand2020_wms', layers: 'fb:gruenanlagenbestand2020', format: 'image/png', transparent: true, opacity: 0.55 } },
  ]

  const sidebarContent = (
    <div style={{ width: isMobile ? '100%' : 260, background: SURFACE, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Karte</div>

        {/* Tile layer toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {[['satellite', Satellite, 'Satellit'], ['dark', MapIcon, 'Dunkel'], ['light', Layers, 'Hell']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTileLayer(id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', borderRadius: 6, border: `1px solid ${tileLayer === id ? A + '60' : BORDER}`, background: tileLayer === id ? A14 : 'transparent', color: tileLayer === id ? A : MUTED, cursor: 'pointer', fontSize: 10, fontFamily: "'Space Grotesk', sans-serif' " }}>
              <Icon size={13} />
              {label}
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {/* Open data layers */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 6px' }}>Open Data Layers</div>
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
        {/* ── Projekt-Ordnerstruktur ── */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 8px 6px' }}>Projekte</div>
        {clientGroups.map(group => {
          const isExpanded = expandedClients.has(group.id)
          return (
            <div key={group.id} style={{ marginBottom: 2 }}>
              {/* Client folder header */}
              <button onClick={() => toggleClientFolder(group.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                {isExpanded ? <ChevronDown size={12} color={MUTED} /> : <ChevronRight size={12} color={MUTED} />}
                {isExpanded ? <FolderOpen size={13} color={group.color} /> : <Folder size={13} color={group.color} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: FG, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{group.projects.length}</span>
              </button>

              {/* Projects inside folder */}
              {isExpanded && group.projects.map(p => {
                const pJobs = jobsByProject[p.id] || []
                const isActive = activeProject === p.id
                const color = projectColor(p, p._idx)
                const hidden = hiddenProjects.has(p.id)
                return (
                  <div key={p.id} style={{ paddingLeft: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button onClick={() => focusProject(p)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 6,
                        border: `1px solid ${isActive ? color + '55' : 'transparent'}`,
                        background: isActive ? color + '18' : 'transparent', cursor: 'pointer', textAlign: 'left', minWidth: 0,
                      }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, opacity: hidden ? 0.3 : 1 }} />
                        <span style={{ fontSize: 12, color: hidden ? MUTED : FG, fontWeight: isActive ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {pJobs.length > 0 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#F6BF26', background: '#F6BF2618', padding: '1px 4px', borderRadius: 6, flexShrink: 0 }}>{pJobs.length}</span>}
                      </button>
                      {/* Visibility toggle */}
                      <button onClick={() => toggleProjectVisibility(p.id)} title={hidden ? 'Einblenden' : 'Ausblenden'}
                        style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </div>

                    {/* Vector layers — always visible under project */}
                    {p.geojson && (
                      <div style={{ paddingLeft: 16, marginBottom: 4 }}>
                        {(p.geojson.features || [p.geojson]).map((feat, fi) => {
                          const geomType = feat.geometry?.type || 'Feature'
                          const isLine = geomType === 'LineString' || geomType === 'MultiLineString'
                          const isPoint = geomType === 'Point' || geomType === 'MultiPoint'
                          const label = feat.properties?.name || (isLine ? `Linie ${fi + 1}` : isPoint ? `Punkt ${fi + 1}` : `Fläche ${fi + 1}`)
                          const featureKey = `${p.id}-${fi}`
                          const featHidden = hiddenFeatures.has(featureKey)
                          return (
                            <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px', borderRadius: 4, fontSize: 11, color: featHidden ? MUTED : MUTED }}>
                                <div style={{ width: isLine ? 12 : 8, height: isLine ? 2 : 8, borderRadius: isLine ? 1 : (isPoint ? '50%' : 2), background: color, opacity: featHidden ? 0.25 : 0.75, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: featHidden ? 0.35 : 1 }}>{label}</span>
                              </div>
                              <button onClick={() => toggleFeature(featureKey)} title={featHidden ? 'Einblenden' : 'Ausblenden'}
                                style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {featHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                              </button>
                            </div>
                          )
                        })}
                        {isAdmin && isActive && (
                          <button onClick={() => setDrawingProject(p)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 4px', borderRadius: 4, border: 'none', background: 'transparent', color: color, cursor: 'pointer', fontSize: 11, width: '100%', marginTop: 2 }}>
                            <Pencil size={10} /> Fläche bearbeiten
                          </button>
                        )}
                      </div>
                    )}
                    {isActive && !p.geojson && isAdmin && (
                      <button onClick={() => setDrawingProject(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 24px', borderRadius: 4, border: 'none', background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 11, width: '100%' }}>
                        <Pencil size={10} /> Fläche zeichnen
                      </button>
                    )}

                    {isActive && pJobs.length > 0 && (
                      <div style={{ paddingLeft: 16, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
      {/* Desktop sidebar */}
      {!isMobile && sidebarContent}

      {/* Map */}
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
          .leaflet-pm-toolbar .leaflet-pm-icon-polygon, .leaflet-pm-toolbar .leaflet-pm-icon-polyline,
          .leaflet-pm-toolbar .leaflet-pm-icon-rectangle, .leaflet-pm-toolbar .leaflet-pm-icon-edit,
          .leaflet-pm-toolbar .leaflet-pm-icon-delete, .leaflet-pm-toolbar .leaflet-pm-icon-drag { filter: invert(1) brightness(0.8) !important; }
        `}</style>

        <MapContainer
          center={[52.515, 13.405]}
          zoom={11}
          maxZoom={22}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}>

          <TileLayer key={tileLayer} url={tile.url} attribution={tile.attribution} maxNativeZoom={tile.maxNativeZoom} maxZoom={tile.maxZoom} />

          {/* Open data WMS layers */}
          {OPEN_LAYERS.filter(l => activeLayers.has(l.id)).map(layer => (
            <WMSTileLayer key={layer.id} url={layer.wms.url} layers={layer.wms.layers}
              format={layer.wms.format} transparent={layer.wms.transparent} opacity={layer.wms.opacity}
              version="1.3.0" attribution={`© Senatsverwaltung Berlin`} />
          ))}

          {flyTarget && <FlyTo center={flyTarget} />}

          {/* Project GeoJSON — per-feature for individual visibility + full metadata popup */}
          {mappableProjects.flatMap((p, i) => {
            if (!p.geojson || hiddenProjects.has(p.id)) return []
            const color = projectColor(p, i)
            const features = p.geojson.features || [p.geojson]
            return features.map((feat, fi) => {
              if (hiddenFeatures.has(`${p.id}-${fi}`)) return null
              const geomType = feat.geometry?.type || ''
              const isLine = geomType === 'LineString' || geomType === 'MultiLineString'
              const singleFc = { type: 'FeatureCollection', features: [feat] }
              return (
                <GeoJSON key={`${p.id}-geo-${fi}`} data={singleFc}
                  style={{ color, weight: 2.5, fillColor: color, fillOpacity: isLine ? 0 : 0.18 }}
                  onEachFeature={(feature, layer) => {
                    layer.on('click', (e) => {
                      L.DomEvent.stopPropagation(e)
                      let area = 0, perimeter = 0
                      try {
                        const ll = layer.getLatLngs ? layer.getLatLngs() : []
                        if (!isLine) area = geodesicArea(ll)
                        perimeter = perimeterMeters(ll)
                      } catch {}
                      const label = feature.properties?.name || (isLine ? `Linie ${fi + 1}` : `Fläche ${fi + 1}`)
                      const props = feature.properties || {}
                      const metaRows = Object.entries(props)
                        .filter(([k, v]) => v != null && v !== '' && k !== 'name')
                        .map(([k, v]) => `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="font-size:9px;color:rgba(232,240,245,0.4);font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0;min-width:55px;padding-top:1px">${k}</span><span style="font-size:11px;color:#e8f0f5;flex:1;word-break:break-word">${v}</span></div>`).join('')
                      const popup = L.popup({ maxWidth: 260 })
                        .setLatLng(e.latlng)
                        .setContent(`
                          <div style="font-family:'Space Grotesk',sans-serif;min-width:180px">
                            <div style="font-weight:700;font-size:13px;color:#e8f0f5;margin-bottom:4px;border-left:3px solid ${color};padding-left:8px">${label}</div>
                            <div style="font-size:10px;color:${color};font-family:'Space Mono',monospace;margin-bottom:8px;padding-left:11px">${p.name}</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:${metaRows ? 8 : 10}px">
                              ${area > 0 ? `<div style="background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px"><div style="font-size:9px;color:rgba(232,240,245,0.45);margin-bottom:2px;font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.06em">Fläche</div><div style="font-size:13px;font-weight:700;color:#e8f0f5">${fmtArea(area)}</div></div>` : ''}
                              ${perimeter > 0 ? `<div style="background:rgba(255,255,255,0.06);border-radius:6px;padding:6px 8px"><div style="font-size:9px;color:rgba(232,240,245,0.45);margin-bottom:2px;font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.06em">${isLine ? 'Länge' : 'Umfang'}</div><div style="font-size:13px;font-weight:700;color:#e8f0f5">${fmtLen(perimeter)}</div></div>` : ''}
                            </div>
                            ${metaRows ? `<div style="margin-bottom:10px">${metaRows}</div>` : ''}
                            <a href="/projects/${p.id}" onclick="event.preventDefault();window._mapNav&&window._mapNav('${p.id}')" style="display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border-radius:6px;background:${color}22;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:600;text-decoration:none;cursor:pointer">↗ Projektseite</a>
                          </div>`)
                      popup.openOn(layer._map)
                    })
                    layer.on('mouseover', () => { layer.setStyle({ weight: 3.5, fillOpacity: isLine ? 0 : 0.28 }) })
                    layer.on('mouseout', () => { layer.setStyle({ weight: 2.5, fillOpacity: isLine ? 0 : 0.18 }) })
                  }}
                />
              )
            })
          })}

          {/* Project markers */}
          {mappableProjects.map((p, i) => {
            const color = projectColor(p, i)
            const isActive = activeProject === p.id
            return (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={makePin(color, isActive ? 20 : 14)}>
                <Popup>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e8f0f5', marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color, marginBottom: 4 }}>{p.client}</div>
                    <div style={{ fontSize: 11, color: 'rgba(232,240,245,0.5)', marginBottom: p.geojson ? 4 : 0 }}>{p.location}</div>
                    {p.geojson && <div style={{ fontSize: 10, color, fontFamily: "'Space Mono', monospace" }}>● Fläche kartiert</div>}
                    {(jobsByProject[p.id] || []).length > 0 && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: '#F59E0B' }}>
                        {jobsByProject[p.id].length} Einsatz{jobsByProject[p.id].length > 1 ? 'e' : ''} (14 Tage)
                      </div>
                    )}
                    <button onClick={() => navigate(`/projects/${p.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '5px 10px', borderRadius: 5, background: color + '20', border: `1px solid ${color}50`, color, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", width: '100%', justifyContent: 'center' }}>
                      <ExternalLink size={11} /> Projektseite öffnen
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

          {/* Draw mode */}
          {drawingProject && (
            <DrawControl
              project={drawingProject}
              onSave={handleSaveGeojson}
              onCancel={() => setDrawingProject(null)}
            />
          )}
        </MapContainer>

        {/* Mobile sidebar toggle */}
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
    </div>
  )
}
