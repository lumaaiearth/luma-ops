import { ExternalLink, Crosshair } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED, WARN, TEXT, SPACE, RADIUS, tint } from '../lib/theme.js'
import { SANS } from './ui.jsx'
import { SENSOR_TYPE_LABELS, SENSOR_TYPE_ICONS } from '../data/sensorTypes.js'
import { seriesStats, seriesSpan } from '../lib/sensorSeries.js'
import Sparkline from './Sparkline.jsx'

// Farben wie die Sensor-Marker auf der Karte: Panel und Marker sollen bei
// einem Alarm dieselbe Farbe zeigen, sonst sucht man den roten Punkt.
// Hier bewusst feste Hex-Werte statt Semantik-Tokens — die Leaflet-Marker sind
// SVG-Icons, in denen `var(--luma-…)` nicht auflöst; beide Seiten müssen aber
// exakt dieselbe Farbe treffen.
export const SENSOR_COLORS = { ok: '#38bdf8', warning: '#f59e0b', critical: '#ef4444' }
export const sensorColor = s => SENSOR_COLORS[s?.status] || SENSOR_COLORS.ok

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
//
// Zahlen laufen über .lu-num (Mono mit Tabellenziffern), damit die
// min/ø/max-Spalten beim Aktualisieren nicht springen. Beschriftungen bleiben
// in der Sans — Mono-Versalien sind nach dem UI-Fundament nur für echte Daten da.
export default function SensorTile({ sensor, series, loading, onLocate, onOpen, compact = false }) {
  const c = sensorColor(sensor)
  const st = seriesStats(series)
  const span = seriesSpan(series)
  const unit = sensor.unit || ''
  const hasValue = sensor.value != null && Number.isFinite(Number(sensor.value))

  // Tendenz nur zeigen, wenn sie auf mehr als zwei Punkten beruht — sonst ist
  // „+0,3" bloß Rauschen zwischen zwei Messungen
  const trend = st && st.points > 2 ? st.delta : null
  const trendColor = trend == null || Math.abs(trend) < 1e-9 ? MUTED : trend > 0 ? 'var(--luma-ok)' : WARN

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${sensor.status === 'ok' ? BORDER : tint(c, 45)}`,
      borderRadius: RADIUS.md,
      padding: compact ? `${SPACE[2]} ${SPACE[3]}` : SPACE[3],
      display: 'flex', flexDirection: 'column', gap: SPACE[2],
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE[2] }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontSize: TEXT.xs, color: c, display: 'flex', alignItems: 'center', gap: SPACE[1] }}>
            <span>{SENSOR_TYPE_ICONS[sensor.type] || '📡'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {SENSOR_TYPE_LABELS[sensor.type] || sensor.type}
            </span>
          </div>
          <div style={{ fontFamily: SANS, fontSize: TEXT.sm, fontWeight: 600, color: FG, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sensor.name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {onLocate && sensor.lat != null && sensor.lng != null && (
            <button onClick={() => onLocate(sensor)} title="Auf der Karte zeigen" className="lu-chip"
              style={{ display: 'flex', padding: SPACE[1], borderRadius: RADIUS.sm, border: '1px solid transparent', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <Crosshair size={12} />
            </button>
          )}
          {onOpen && (
            <button onClick={() => onOpen(sensor)} title="Sensorseite öffnen" className="lu-chip"
              style={{ display: 'flex', padding: SPACE[1], borderRadius: RADIUS.sm, border: '1px solid transparent', background: 'transparent', color: MUTED, cursor: 'pointer' }}>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[1] }}>
        {hasValue ? (
          <>
            <span className="lu-num" style={{ fontSize: compact ? TEXT.xl : TEXT['2xl'], fontWeight: 600, color: c, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {de(Number(sensor.value))}
            </span>
            <span style={{ fontFamily: SANS, fontSize: TEXT.xs, color: MUTED }}>{unit}</span>
          </>
        ) : (
          <span style={{ fontFamily: SANS, fontSize: TEXT.sm, color: MUTED }}>noch keine Messung</span>
        )}
        {trend != null && (
          <span className="lu-num" style={{ marginLeft: 'auto', fontSize: TEXT['2xs'], color: trendColor }}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '±'}{de(Math.abs(trend))}{unit}
          </span>
        )}
      </div>

      {/* Verlauf: erst die Kurve, sonst der Grund für deren Fehlen */}
      {st && st.points > 1 ? (
        <div>
          <Sparkline data={series} color={c} height={compact ? 22 : 28} />
          <div className="lu-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: TEXT['2xs'], color: MUTED, marginTop: SPACE[1] }}>
            <span>min {de(st.min)}{unit}</span>
            <span>ø {de(st.avg)}{unit}</span>
            <span>max {de(st.max)}{unit}</span>
          </div>
          {/* Zeitraum aus den Daten, nicht behauptet — und deutlich sagen, wenn
              die Reihe alt ist, sonst liest man sie als aktuellen Stand */}
          {span && (
            <div style={{ fontFamily: SANS, fontSize: TEXT['2xs'], marginTop: 1, color: span.veraltet ? WARN : MUTED }}>
              <span className="lu-num">{span.label}</span>
              {span.veraltet && ` · seit ${Math.round(span.alterTage)} Tagen kein Wert`}
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontFamily: SANS, fontSize: TEXT['2xs'], color: MUTED, height: compact ? 22 : 28, display: 'flex', alignItems: 'center' }}>
          {loading ? 'Verlauf wird geladen…' : st ? 'nur eine Messung — kein Verlauf' : 'keine Messwerte hinterlegt'}
        </div>
      )}

      {sensor.last_updated && (
        <div className="lu-num" style={{ fontSize: TEXT['2xs'], color: MUTED }}>
          {new Date(sensor.last_updated).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}

// Kompakte Variante für das Marker-Popup: Wert + Kurve, ohne Kopf und Buttons
// (die stellt das Popup selbst, damit es sein bestehendes Layout behält).
//
// Größen und die feste hellgraue Schrift folgen hier absichtlich dem
// Leaflet-Popup statt den Panel-Skalen: Popups liegen immer auf dunklem Grund
// und ihre übrigen Zeilen sind kleiner. Eine Zeile in Panel-Größe fiele heraus.
export function SensorSparkRow({ sensor, series, loading }) {
  const c = sensorColor(sensor)
  const st = seriesStats(series)
  const span = seriesSpan(series)
  const unit = sensor.unit || ''
  const POP_MUTED = 'rgba(232,240,245,0.45)'
  if (loading && !st) return <div style={{ fontFamily: SANS, fontSize: 9, color: POP_MUTED, padding: '2px 0' }}>Verlauf wird geladen…</div>
  if (!st || st.points < 2) return null
  return (
    <div style={{ margin: '4px 0 2px' }}>
      <Sparkline data={series} color={c} height={24} />
      <div className="lu-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: POP_MUTED, marginTop: 1 }}>
        <span style={{ color: span?.veraltet ? WARN : undefined }}>{span?.label || ''}</span>
        <span>min {de(st.min)}{unit} · max {de(st.max)}{unit}</span>
      </div>
    </div>
  )
}
