import { useId } from 'react'
import { toValue } from '../lib/sensorSeries.js'

// Winzige Verlaufskurve als reines SVG.
//
// Absichtlich ohne Recharts: Auf der Karte liegen schnell ein Dutzend Kacheln
// gleichzeitig im DOM, und ein vollwertiges Chart pro Kachel kostet dort
// deutlich mehr als es zeigt. Die Detailseite (SensorPage) bleibt bei Recharts
// — dort geht es um Achsen, Tooltips und Zoom, hier nur um die Tendenz.
//
// `data`: Zahlen oder Objekte mit `value`. Nicht endliche Werte (null aus der
// DB, NaN) werden verworfen, damit eine Lücke die Kurve nicht auf 0 zieht.
export default function Sparkline({
  data,
  color = '#38bdf8',
  width = 132,
  height = 30,
  strokeWidth = 1.5,
  fill = true,
  dot = true,
  style,
}) {
  const gradId = useId()

  const values = (data || []).map(toValue).filter(v => Number.isFinite(v))

  if (values.length === 0) return null

  // Innenabstand, sonst schneidet die Viewbox Linienstärke und Punkt oben/unten ab
  const pad = Math.max(strokeWidth, dot ? 2.5 : strokeWidth)
  const innerH = Math.max(1, height - pad * 2)

  const min = Math.min(...values)
  const max = Math.max(...values)
  // Flache Reihe (alle Werte gleich, häufig bei Niederschlag = 0): Mittellinie
  // statt Division durch 0
  const span = max - min || 1
  const flat = max === min

  const x = i => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * width)
  const y = v => (flat ? height / 2 : pad + innerH - ((v - min) / span) * innerH)

  const pts = values.map((v, i) => [x(i), y(v)])
  const at = ([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`
  const line = pts.map(at).join(' ')
  const area = [
    `M ${pts[0][0].toFixed(1)},${height}`,
    ...pts.map(p => `L ${at(p)}`),
    `L ${pts[pts.length - 1][0].toFixed(1)},${height}`,
    'Z',
  ].join(' ')

  const [lastX, lastY] = pts[pts.length - 1]
  const r = strokeWidth + 1

  // Der Punkt am aktuellen Wert wird bewusst als DIV gesetzt, nicht als
  // <circle>: die Viewbox wird per preserveAspectRatio="none" in die Breite
  // gezogen (Kachel ~250 px, Viewbox 132), ein Kreis darin würde zur Ellipse.
  // Die Linie ist über vector-effect geschützt, ein Kreis lässt sich so nicht
  // schützen. Er sitzt immer am rechten Rand, also genügt die Höhe in Prozent.
  const dotTop = `${((values.length === 1 ? height / 2 : lastY) / height) * 100}%`

  return (
    <div style={{ position: 'relative', height, ...style }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        {fill && values.length > 1 && (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} stroke="none" />
          </>
        )}
        {values.length > 1
          ? <polyline points={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          : null}
      </svg>
      {dot && (
        <span aria-hidden="true" style={{
          position: 'absolute',
          left: values.length === 1 ? '50%' : '100%',
          top: dotTop,
          width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r,
          borderRadius: '50%', background: color, pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
