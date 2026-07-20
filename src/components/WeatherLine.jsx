// Kompakte Wetterzeile für einen Tag: Icon, Max/Min-Temperatur, Regen-
// wahrscheinlichkeit und UV-Badge — farbcodiert (Warnton bei Regen ≥60 %,
// Sonnen-Badge bei UV ≥6). Genutzt in Kalender- und Wochenplan-Ansichten.
import WeatherIcon from './WeatherIcon.jsx'
import { STATUS_COLOR } from '../lib/weather.js'
import { FG, MUTED } from '../lib/theme.js'
import { MONO } from './ui.jsx'

export default function WeatherLine({ wfc, size = 'sm' }) {
  if (!wfc) return null
  const sc = STATUS_COLOR[wfc.status]
  const warn = wfc.status === 'warn' || wfc.status === 'danger'
  const rainWarn = (wfc.precipProb ?? 0) >= 60 || wfc.precip >= 10
  const uvHigh = (wfc.uvMax ?? 0) >= 6
  const big = size === 'lg'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: big ? 8 : 4, justifyContent: 'center', flexWrap: 'wrap' }}
      title={`${wfc.label} · ${wfc.tempMax}°/${wfc.tempMin}°${wfc.precipProb != null ? ` · Regen ${wfc.precipProb}%` : ''} · UV ${wfc.uvMax}${wfc.warnings.length ? ' · ' + wfc.warnings.join(', ') : ''}`}>
      <WeatherIcon code={wfc.wmoCode} size={big ? 16 : 11} color={warn ? sc : MUTED} />
      <span style={{ fontFamily: MONO, fontSize: big ? 12 : 9, color: FG, fontWeight: big ? 700 : 400 }}>
        {wfc.tempMax}°<span style={{ color: MUTED, fontWeight: 400 }}>/{wfc.tempMin}°</span>
      </span>
      {wfc.precipProb != null && wfc.precipProb >= (big ? 20 : 40) && (
        <span style={{ fontFamily: MONO, fontSize: big ? 11 : 8.5, color: rainWarn ? '#3B82F6' : MUTED, fontWeight: rainWarn ? 700 : 400 }}>☂{wfc.precipProb}%</span>
      )}
      {uvHigh && (
        <span style={{ fontFamily: MONO, fontSize: big ? 10 : 8, fontWeight: 700, color: '#1a1200', background: '#FFD600', borderRadius: 4, padding: big ? '1px 5px' : '0px 3px' }}>UV{Math.round(wfc.uvMax)}</span>
      )}
    </div>
  )
}
