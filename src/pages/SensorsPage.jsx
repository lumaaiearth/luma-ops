import { useState, useEffect } from 'react'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi } from 'lucide-react'

const TYPE_LABELS = { soil_moisture: 'Bodenfeuchte', soil_temp: 'Bodentemperatur', air_temp: 'Lufttemperatur', rainfall: 'Niederschlag' }
const TYPE_ICONS = { soil_moisture: '💧', soil_temp: '🌡', air_temp: '🌤', rainfall: '🌧' }

function GaugeBar({ value, low, high, color }) {
  const pct = Math.max(0, Math.min(100, (value / 100) * 100))
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden', margin: '8px 0' }}>
      {/* Low threshold marker */}
      <div style={{ position: 'absolute', left: `${low}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)', zIndex: 1 }} />
      {/* High threshold marker */}
      <div style={{ position: 'absolute', left: `${high}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)', zIndex: 1 }} />
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function SensorsPage() {
  const { sensors, projects, updateSensorValue } = useOps()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [simulating, setSimulating] = useState(false)

  // Simulate live data updates
  useEffect(() => {
    if (!simulating) return
    const interval = setInterval(() => {
      sensors.forEach(s => {
        const delta = (Math.random() - 0.48) * 3
        const newVal = Math.max(0, Math.min(100, Math.round((s.value + delta) * 10) / 10))
        updateSensorValue(s.id, newVal)
      })
      setLastRefresh(new Date())
    }, 5000)
    return () => clearInterval(interval)
  }, [simulating, sensors])

  const criticalCount = sensors.filter(s => s.status === 'critical').length
  const warningCount = sensors.filter(s => s.status === 'warning').length

  const grouped = projects.reduce((acc, p) => {
    const ps = sensors.filter(s => s.project_id === p.id)
    if (ps.length > 0) acc.push({ project: p, sensors: ps })
    return acc
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 4 }}>Sensoren</h1>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>
            Zuletzt: {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {simulating && <span style={{ color: A }}> · Live</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSimulating(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: `1px solid ${simulating ? A + '60' : BORDER}`, background: simulating ? `${A}14` : 'transparent', color: simulating ? A : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Wifi size={14} /> {simulating ? 'Live AN' : 'Simulation starten'}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>Sensoren gesamt</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: FG }}>{sensors.length}</div>
        </div>
        <div style={{ padding: '14px 16px', background: warningCount > 0 ? '#F59E0B10' : SURFACE, border: `1px solid ${warningCount > 0 ? '#F59E0B40' : BORDER}`, borderRadius: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>Warnungen</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: warningCount > 0 ? '#F59E0B' : FG }}>{warningCount}</div>
        </div>
        <div style={{ padding: '14px 16px', background: criticalCount > 0 ? '#ef444410' : SURFACE, border: `1px solid ${criticalCount > 0 ? '#ef444440' : BORDER}`, borderRadius: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>Kritisch</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: criticalCount > 0 ? '#ef4444' : FG }}>{criticalCount}</div>
        </div>
      </div>

      {/* Sensors by project */}
      {grouped.map(({ project, sensors: ps }) => (
        <div key={project.id} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            {project.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {ps.map(s => {
              const statusColor = s.status === 'critical' ? '#ef4444' : s.status === 'warning' ? '#F59E0B' : A
              const bgColor = s.status === 'critical' ? '#ef444410' : s.status === 'warning' ? '#F59E0B10' : `${A}08`
              const borderColor2 = s.status === 'critical' ? '#ef444440' : s.status === 'warning' ? '#F59E0B40' : BORDER
              return (
                <div key={s.id} style={{ padding: '16px 18px', background: bgColor, border: `1px solid ${borderColor2}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{TYPE_ICONS[s.type]}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: FG }}>{s.name}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{TYPE_LABELS[s.type]}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 300, color: statusColor, lineHeight: 1 }}>{s.value}<span style={{ fontSize: 12, color: MUTED }}>{s.unit}</span></div>
                    </div>
                  </div>
                  <GaugeBar value={s.value} low={s.threshold_low} high={s.threshold_high} color={statusColor} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>Min: {s.threshold_low}{s.unit}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>Max: {s.threshold_high}{s.unit}</div>
                  </div>
                  {s.status !== 'ok' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 10px', background: `${statusColor}18`, borderRadius: 4 }}>
                      <AlertTriangle size={11} color={statusColor} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: statusColor }}>
                        {s.status === 'critical' ? 'Gießen erforderlich' : 'Feuchtigkeit prüfen'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Integration hint */}
      <div style={{ marginTop: 16, padding: '16px 20px', background: `${A}08`, border: `1px solid ${A}20`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Sensor-Integration</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Aktuell: Demo-Daten mit Simulation. Echte Sensoranbindung via MQTT-Broker oder Supabase Realtime — Xiaomi/Govee BLE Sensoren über Raspberry Pi Gateway möglich.
        </div>
      </div>
    </div>
  )
}
