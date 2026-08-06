import { Sun, CloudSun, Cloud, CloudRain, CloudDrizzle, CloudSnow, Zap } from 'lucide-react'

const ICON_MAP = {
  sun:      Sun,
  cloudsun: CloudSun,
  cloud:    Cloud,
  drizzle:  CloudDrizzle,
  rain:     CloudRain,
  snow:     CloudSnow,
  storm:    Zap,
}

export default function WeatherIcon({ code, size = 16, color }) {
  // Map WMO code → icon key
  const key = wmoToIconKey(code)
  const Icon = ICON_MAP[key] || Cloud
  // Farbe über style statt über das color-Prop: lucide schreibt color in das
  // SVG-Attribut stroke, dort löst var(--luma-…) nicht auf. Per currentColor
  // funktionieren sowohl Hex-Werte als auch Theme-Tokens.
  return <Icon size={size} style={{ color }} strokeWidth={2} />
}

function wmoToIconKey(code) {
  if (code === 0 || code === 1) return 'sun'
  if (code === 2) return 'cloudsun'
  if (code === 3 || code === 45 || code === 48) return 'cloud'
  if (code === 51 || code === 53 || code === 80) return 'drizzle'
  if (code === 55 || code === 61 || code === 63 || code === 65 || code === 81) return 'rain'
  if (code === 82 || code === 95 || code === 96 || code === 99) return 'storm'
  if (code >= 71 && code <= 77) return 'snow'
  if (code === 85 || code === 86) return 'snow'
  return 'cloud'
}
