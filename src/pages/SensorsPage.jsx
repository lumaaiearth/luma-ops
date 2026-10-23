import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, A08, A14, A20, WARN, DANGER } from '../lib/theme.js'
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi, ChevronRight } from 'lucide-react'
import { SENSOR_TYPE_LABELS as TYPE_LABELS, SENSOR_TYPE_ICONS as TYPE_ICONS } from '../data/sensorTypes.js'
import { pruefeAlarm } from '../lib/sensorAlarm.js'

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
  const { sensors: echteSensoren, projects } = useOps()
  const navigate = useNavigate()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [simulating, setSimulating] = useState(false)
  const [simWerte, setSimWerte] = useState({})

  // Vorführ-Simulation: nur Anzeige in diesem Browser. Früher lief sie über
  // updateSensorValue — damit landeten Zufallswerte in sensors/sensor_readings
  // (und im Klima-Dashboard der Kunden), und Schwellen konnten echte
  // Telegram-Alarme und Aufgaben auslösen. Jetzt wird nichts gespeichert und
  // nichts verschickt.
  useEffect(() => {
    if (!simulating) return
    const interval = setInterval(() => {
      setSimWerte(prev => {
        const next = {}
        for (const s of echteSensoren) {
          const delta = (Math.random() - 0.48) * 3
          const basis = prev[s.id] ?? s.value ?? 45   // Sensor ohne Messung: plausibel starten
          next[s.id] = Math.max(0, Math.min(100, Math.round((basis + delta) * 10) / 10))
        }
        return next
      })
      setLastRefresh(new Date())
    }, 5000)
    return () => clearInterval(interval)
  }, [simulating, echteSensoren])

  // Stufe aus derselben reinen Alarmlogik wie im echten Pfad — nur angezeigt.
  const sensors = simulating
    ? echteSensoren.map(s => {
        const value = simWerte[s.id] ?? s.value
        if (value == null) return s
        const vorlage = projects.find(p => p.id === s.project_id)?.alarm_defaults || null
        return { ...s, value, status: pruefeAlarm({ sensor: s, value, vorlage }).stufe }
      })
    : echteSensoren

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
            {simulating && <span style={{ color: WARN }}> · Simulation, wird nicht gespeichert</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setSimWerte({}); setSimulating(s => !s) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: `1px solid ${simulating ? `color-mix(in srgb, ${A} 38%, transparent)` : BORDER}`, background: simulating ? A14 : 'transparent', color: simulating ? A : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Wifi size={14} /> {simulating ? 'Simulation beenden' : 'Simulation zeigen'}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>Sensoren gesamt</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: FG }}>{sensors.length}</div>
        </div>
        <div style={{ padding: '14px 16px', background: warningCount > 0 ? `color-mix(in srgb, ${WARN} 8%, transparent)` : SURFACE, border: `1px solid ${warningCount > 0 ? `color-mix(in srgb, ${WARN} 30%, transparent)` : BORDER}`, borderRadius: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>Warnungen</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: warningCount > 0 ? WARN : FG }}>{warningCount}</div>
        </div>
        <div style={{ padding: '14px 16px', background: criticalCount > 0 ? `color-mix(in srgb, ${DANGER} 8%, transparent)` : SURFACE, border: `1px solid ${criticalCount > 0 ? `color-mix(in srgb, ${DANGER} 30%, transparent)` : BORDER}`, borderRadius: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>Kritisch</div>
          <div style={{ fontSize: 28, fontWeight: 300, color: criticalCount > 0 ? DANGER : FG }}>{criticalCount}</div>
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
              const statusColor = s.status === 'critical' ? DANGER : s.status === 'warning' ? WARN : A
              const bgColor = s.status === 'ok' ? A08 : `color-mix(in srgb, ${statusColor} 8%, transparent)`
              const borderColor2 = s.status === 'ok' ? BORDER : `color-mix(in srgb, ${statusColor} 30%, transparent)`
              return (
                <div key={s.id} onClick={() => navigate(`/sensors/${s.id}`)} className="lu-card lu-clickable" style={{ padding: '16px 18px', background: bgColor, border: `1px solid ${borderColor2}`, borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{TYPE_ICONS[s.type]}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: FG, display: 'flex', alignItems: 'center', gap: 3 }}>{s.name} <ChevronRight size={12} color={MUTED} /></div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{TYPE_LABELS[s.type]}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 300, color: s.value == null ? MUTED : statusColor, lineHeight: 1 }}>
                        {s.value == null ? <span style={{ fontSize: 12 }}>noch keine Messung</span> : <>{s.value}<span style={{ fontSize: 12, color: MUTED }}>{s.unit}</span></>}
                      </div>
                    </div>
                  </div>
                  <GaugeBar value={s.value ?? 0} low={s.threshold_low} high={s.threshold_high} color={s.value == null ? BORDER : statusColor} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>Min: {s.threshold_low}{s.unit}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>Max: {s.threshold_high}{s.unit}</div>
                  </div>
                  {s.status !== 'ok' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 10px', background: `color-mix(in srgb, ${statusColor} 10%, transparent)`, borderRadius: 4 }}>
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
      <div style={{ marginTop: 16, padding: '16px 20px', background: A08, border: `1px solid ${A20}`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Sensor-Integration</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Noch ist keine Sensor-Hardware angebunden. Die Simulation dient nur der Vorführung: Sie läuft in diesem Browser, wird nicht gespeichert und löst keine Alarme aus. Echte Anbindung später über MQTT-Broker oder Supabase Realtime (z. B. BLE-Sensoren über ein Raspberry-Pi-Gateway).
        </div>
      </div>
    </div>
  )
}
