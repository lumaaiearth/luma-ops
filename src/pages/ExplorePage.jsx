import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Radio, Leaf, LogOut, Camera } from 'lucide-react'
import { sb } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, A06, OK, WARN, DANGER } from '../lib/theme.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

function pin(color) {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
    className: '', iconSize: [14, 14], iconAnchor: [7, 7],
  })
}

function SensorTile({ s }) {
  const statusColor = s.status === 'critical' ? DANGER : s.status === 'warning' ? WARN : OK
  const pct = s.threshold_high > 0 ? Math.min((s.value / s.threshold_high) * 100, 100) : 50
  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: FG }}>{s.name}</div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, marginTop: 4, flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 300, color: statusColor, letterSpacing: '-0.03em' }}>
        {s.value}<span style={{ fontSize: 12, color: MUTED, marginLeft: 3 }}>{s.unit}</span>
      </div>
      <div style={{ background: A06, borderRadius: 4, height: 4, overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: statusColor, borderRadius: 4 }} />
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const { user, displayName, logout } = useAuth()
  const [projects, setProjects] = useState([])
  const [sensorsByProj, setSensorsByProj] = useState({})
  const [photosByProj, setPhotosByProj] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [pRes, sRes, phRes] = await Promise.all([
        sb.from('v_public_projects').select('*'),
        sb.from('v_public_sensors').select('*'),
        sb.from('v_public_photos').select('*').order('created_at', { ascending: false }),
      ])
      setProjects(pRes.data || [])
      const byProj = (rows, key) => (rows || []).reduce((acc, r) => {
        (acc[r.project_id] ||= []).push(r); return acc
      }, {})
      setSensorsByProj(byProj(sRes.data))
      setPhotosByProj(byProj(phRes.data))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: BG, color: FG }}>
      {/* Kopfzeile */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: A, letterSpacing: '0.24em', textTransform: 'uppercase' }}>LUMA</span>
            <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: FG }}>BIOME</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 6 }}>Öffentliche Vorschau</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: MUTED, fontFamily: SANS }}>{displayName || user?.email}</span>
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontFamily: SANS, fontSize: 13 }}>
              <LogOut size={14} /> Abmelden
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 56px' }}>
        <h1 style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: FG, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Unsere Projekte
        </h1>
        <p style={{ fontFamily: SANS, fontSize: 14, color: MUTED, margin: '0 0 28px' }}>
          Ein Einblick in die messbar grüne Arbeit von LUMA Biome.
        </p>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>lädt…</div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', border: `1px dashed ${BORDER}`, borderRadius: 16, color: MUTED }}>
            <Leaf size={26} style={{ marginBottom: 10, opacity: 0.7 }} />
            <div style={{ fontFamily: SANS, fontSize: 15, color: FG, marginBottom: 4 }}>Noch keine öffentlichen Projekte</div>
            <div style={{ fontFamily: SANS, fontSize: 13 }}>Sobald ein Projekt freigegeben wird, erscheint es hier.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {projects.map(p => {
              const sensors = sensorsByProj[p.id] || []
              const photos = (photosByProj[p.id] || []).slice(0, 3)
              return (
                <div key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Karte */}
                  <div style={{ height: 150, background: A06 }}>
                    {p.lat && p.lng ? (
                      <MapContainer center={[p.lat, p.lng]} zoom={14} style={{ width: '100%', height: '100%' }}
                        zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false}>
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                        <Marker position={[p.lat, p.lng]} icon={pin(A)} />
                      </MapContainer>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
                        <MapPin size={22} />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 500, color: FG, letterSpacing: '-0.01em' }}>{p.name}</div>
                      {p.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: MUTED, marginTop: 3 }}>
                          <MapPin size={12} /> {p.location}
                        </div>
                      )}
                    </div>

                    {p.description && (
                      <p style={{ fontSize: 13.5, color: FG, lineHeight: 1.55, margin: 0, opacity: 0.85 }}>{p.description}</p>
                    )}

                    {photos.length > 0 && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {photos.map(ph => (
                          <div key={ph.id} style={{ flex: 1, aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}`, background: A06 }}>
                            <img src={ph.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {sensors.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          <Radio size={11} /> Live-Sensoren
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: sensors.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
                          {sensors.slice(0, 4).map(s => <SensorTile key={s.id} s={s} />)}
                        </div>
                      </div>
                    )}

                    {!p.description && sensors.length === 0 && photos.length === 0 && (
                      <div style={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>Weitere Details folgen.</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
