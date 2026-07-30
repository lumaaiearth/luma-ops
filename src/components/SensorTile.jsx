import { ExternalLink, Crosshair } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
import { SENSOR_TYPE_LABELS, SENSOR_TYPE_ICONS } from '../data/sensorTypes.js'
import { seriesStats, seriesSpan } from '../lib/sensorSeries.js'
import Sparkline from './Sparkline.jsx'

// Farben wie die Sensor-Marker auf der Karte: Panel und Marker sollen bei
// einem Alarm dieselbe Farbe zeigen, sonst sucht man den roten Punkt.
export const SENSOR_COLORS = { ok: '#38bdf8', warning: '#f59e0b', critical: '#ef4444' }
export const sensorColor = s => SENSOR_COLORS[s?.status] || SENSOR_COLORS.ok

const MONO = "'Space Mono', monospace"

// Nachkommastellen nach Größenordnung: 12,4 % liest sich gut, 0,0421 mm nicht als 0 mm
const fmt = v => {
  if (!Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}
const de = v => fmt(v).replace('.', ',')

// Eine Sensor-Kachel: aktueller Wert, Verlauf, Tendenz.
//
// `series` kommt von außen (useSensorSeries lädt alle Sensoren in einer
// Abfrage) — die Kachel holt absichtlich selbst keine Daten, sonst würde jede
// sichtbare Kachel eine eigene Abfrage auslösen.
export default function SensorTile({ sensor, series, loading, onLocate, onOpen, compact = false }) {
  const c = sensorColor(sensor)
  const st = seriesStats(series)
  const span = seriesSpan(series)
  const unit = sensor.unit || ''
  const hasValue = sensor.value != null && Number.isFinite(Number(sensor.value))

  // Tendenz nur zeigen, wenn sie auf mehr als zwei Punkten beruht — sonst ist
  // „+0,3" bloß Rauschen zwischen zwei Messungen
  const trend = st && st.points > 2 ? st.delta : null
  const trendColor = trend == null || Math.abs(trend) < 1e-9 ? MUTED : trend > 0 ? '#22c55e' : '#f59e0b'

  return (
    <div style={{
      background: SURFACE, border: `1px solid ${sensor.status === 'ok' ? BORDER : `color-mix(in srgb, ${c} 45%, transparent)`}`,
      borderRadius: 10, padding: compact ? '8px 10px' : '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: c, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {SENSOR_TYPE_ICONS[sensor.type] || '📡'} {SENSOR_TYPE_LABELS[sensor.type] || sensor.type}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: FG, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sensor.name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {onLocate && sensor.lat != null && sensor.lng != null && (
            <button onClick={() => onLocate(sensor)} title="Auf der Karte zeigen" className="lu-chip"
              style={{ display: 'flex', padding: 4, borderRadius: 5, border: '1px solid transparent', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <Crosshair size={12} />
            </button>
          )}
          {onOpen && (
            <button onClick={() => onOpen(sensor)} title="Sensorseite öffnen" className="lu-chip"
              style={{ display: 'flex', padding: 4, borderRadius: 5, border: '1px solid transparent', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        {hasValue ? (
          <>
            <span style={{ fontSize: compact ? 19 : 23, fontWeight: 300, color: c, lineHeight: 1 }}>{de(Number(sensor.value))}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{unit}</span>
          </>
        ) : (
          <span style={{ fontSize: 11.5, color: MUTED }}>noch keine Messung</span>
        )}
        {trend != null && (
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9.5, color: trendColor }}>
            {trend > 0 ? '▲' : trend < 0 ? '▼' : '→'} {de(Math.abs(trend))}{unit}
          </span>
        )}
      </div>

      {/* Verlauf: erst Kurve, sonst der Grund für deren Fehlen */}
      {st && st.points > 1 ? (
        <div>
          <Sparkline data={series} color={c} height={compact ? 22 : 28} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8, color: MUTED, marginTop: 2 }}>
            <span>min {de(st.min)}{unit}</span>
            <span>ø {de(st.avg)}{unit}</span>
            <span>max {de(st.max)}{unit}</span>
          </div>
          {/* Zeitraum aus den Daten, nicht behauptet — und deutlich sagen, wenn
              die Reihe alt ist, sonst liest man sie als aktuellen Stand */}
          {span && (
            <div style={{ fontFamily: MONO, fontSize: 8, marginTop: 1, color: span.veraltet ? 'var(--luma-warn)' : MUTED }}>
              {span.label}{span.veraltet && ` · seit ${Math.round(span.alterTage)} Tagen kein Wert`}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontFamily: MONO, fontSize: 8.5, color: MUTED, height: compact ? 22 : 28, display: 'flex', alignItems: 'center' }}>
          {loading ? 'Verlauf wird geladen…' : st ? 'nur eine Messung — kein Verlauf' : 'keine Messwerte hinterlegt'}
        </div>
      )}

      {sensor.last_updated && (
        <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED }}>
          {new Date(sensor.last_updated).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}

// Kompakte Variante für das Marker-Popup: Wert + Kurve, ohne Kopf und Buttons
// (die stellt das Popup selbst, damit es sein bestehendes Layout behält).
export function SensorSparkRow({ sensor, series, loading }) {
  const c = sensorColor(sensor)
  const st = seriesStats(series)
  const span = seriesSpan(series)
  const unit = sensor.unit || ''
  if (loading && !st) return <div style={{ fontFamily: MONO, fontSize: 8.5, color: 'rgba(232,240,245,0.45)', padding: '2px 0' }}>Verlauf wird geladen…</div>
  if (!st || st.points < 2) return null
  return (
    <div style={{ margin: '4px 0 2px' }}>
      <Sparkline data={series} color={c} height={24} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8, color: 'rgba(232,240,245,0.45)', marginTop: 1 }}>
        <span style={{ color: span?.veraltet ? 'var(--luma-warn)' : undefined }}>{span?.label || ''}</span>
        <span>min {de(st.min)}{unit} · max {de(st.max)}{unit}</span>
      </div>
    </div>
  )
}
