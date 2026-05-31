import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useOps } from '../context/OpsContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, A10, A14 } from '../lib/theme.js'
import { TEAM, JOB_TYPES } from '../data/seed.js'
import { isoToday, addDays } from '../lib/storage.js'

// Custom DivIcon markers — avoids Vite/Leaflet asset bundling issues
function makePin(color, size = 14) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  })
}

function FlyTo({ center }) {
  const map = useMap()
  if (center) map.flyTo(center, 14, { duration: 0.8 })
  return null
}

export default function MapPage() {
  const { projects, jobs } = useOps()
  const today = isoToday()
  const [activeProject, setActiveProject] = useState(null)
  const [showJobs, setShowJobs] = useState(true)
  const [flyTarget, setFlyTarget] = useState(null)

  // Upcoming jobs (next 14 days)
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

  function focusProject(p) {
    setActiveProject(p.id === activeProject ? null : p.id)
    if (p.lat && p.lng) setFlyTarget([p.lat, p.lng])
  }

  const POPUP = {
    background: CARD,
    border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: "'Space Grotesk', sans-serif",
    minWidth: 180,
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 16px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Karte</div>
          <button
            onClick={() => setShowJobs(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 6, border: `1px solid ${showJobs ? A + '50' : BORDER}`, background: showJobs ? A14 : 'transparent', color: showJobs ? A : MUTED, cursor: 'pointer', fontSize: 12, width: '100%' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B' }} />
            Einsätze (nächste 14 Tage)
            <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{upcomingJobs.length}</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>Projekte</div>
          {mappableProjects.map(p => {
            const pJobs = jobsByProject[p.id] || []
            const isActive = activeProject === p.id
            return (
              <button key={p.id} onClick={() => focusProject(p)}
                style={{ display: 'block', width: '100%', padding: '10px 10px', borderRadius: 6, border: `1px solid ${isActive ? A + '40' : 'transparent'}`, background: isActive ? A10 : 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: A, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: FG, fontWeight: isActive ? 500 : 400 }}>{p.name}</span>
                  {pJobs.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#F59E0B', background: '#F59E0B18', padding: '1px 5px', borderRadius: 8 }}>{pJobs.length}</span>
                  )}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, paddingLeft: 18 }}>{p.location}</div>
                {isActive && pJobs.length > 0 && (
                  <div style={{ paddingLeft: 18, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {pJobs.map(j => {
                      const jtype = JOB_TYPES.find(t => t.id === j.type)
                      const workers = (j.assigned_users || []).map(id => TEAM.find(t => t.id === id)).filter(Boolean)
                      return (
                        <div key={j.id} style={{ fontSize: 11, color: MUTED, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: jtype?.color || MUTED }}>{j.date}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {workers.map(w => (
                              <div key={w.id} style={{ width: 16, height: 16, borderRadius: '50%', background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6, color: '#001219', fontWeight: 700 }}>{w.initials}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <style>{`
          .leaflet-popup-content-wrapper { background: #0d1a23 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; color: #e8f0f5 !important; }
          .leaflet-popup-tip { background: #0d1a23 !important; }
          .leaflet-popup-content { margin: 10px 14px !important; }
          .leaflet-container { background: #080f14; }
          .leaflet-control-attribution { background: rgba(8,15,20,0.8) !important; color: rgba(232,240,245,0.3) !important; font-size: 9px !important; }
          .leaflet-control-attribution a { color: rgba(8,170,86,0.6) !important; }
          .leaflet-control-zoom a { background: #0d1a23 !important; border-color: rgba(255,255,255,0.1) !important; color: #e8f0f5 !important; }
          .leaflet-control-zoom a:hover { background: rgba(8,170,86,0.15) !important; }
        `}</style>
        <MapContainer
          center={[52.515, 13.405]}
          zoom={11}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
          />
          {flyTarget && <FlyTo center={flyTarget} />}

          {/* Project markers */}
          {mappableProjects.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={makePin(A, activeProject === p.id ? 18 : 14)}>
              <Popup>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: '#e8f0f5', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(8,170,86,0.8)', marginBottom: 4 }}>{p.client}</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,240,245,0.5)' }}>{p.location}</div>
                  {(jobsByProject[p.id] || []).length > 0 && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: '#F59E0B' }}>
                      {jobsByProject[p.id].length} Einsatz{jobsByProject[p.id].length > 1 ? 'e' : ''} (14 Tage)
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Job markers */}
          {showJobs && upcomingJobs.map(j => {
            const proj = projects.find(p => p.id === j.project_id)
            if (!proj?.lat) return null
            const jtype = JOB_TYPES.find(t => t.id === j.type)
            const color = jtype?.color || '#F59E0B'
            // Slight offset so job pins don't stack exactly on project pin
            const offset = 0.0008
            return (
              <Marker key={j.id} position={[proj.lat + offset, proj.lng + offset]} icon={makePin(color, 11)}>
                <Popup>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <div style={{ fontWeight: 500, fontSize: 12, color: '#e8f0f5', marginBottom: 2 }}>{j.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: color, marginBottom: 3 }}>{j.date} · {jtype?.label}</div>
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
        </MapContainer>
      </div>
    </div>
  )
}
