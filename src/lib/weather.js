// Open-Meteo API — free, no API key required
// Default: Berlin. Adjust LAT/LON for other locations.
export const WEATHER_LAT = 52.52
export const WEATHER_LON = 13.405
export const WEATHER_CITY = 'Berlin'

// WMO weather interpretation code → display info
const WMO = {
  0:  { label: 'Klarer Himmel',         icon: 'sun',     baseStatus: 'good' },
  1:  { label: 'Meist klar',            icon: 'sun',     baseStatus: 'good' },
  2:  { label: 'Teils bewölkt',         icon: 'cloudsun',baseStatus: 'good' },
  3:  { label: 'Bedeckt',               icon: 'cloud',   baseStatus: 'mixed' },
  45: { label: 'Nebel',                 icon: 'cloud',   baseStatus: 'mixed' },
  48: { label: 'Reifnebel',             icon: 'cloud',   baseStatus: 'warn' },
  51: { label: 'Leichter Nieselregen',  icon: 'drizzle', baseStatus: 'mixed' },
  53: { label: 'Nieselregen',           icon: 'drizzle', baseStatus: 'mixed' },
  55: { label: 'Starker Nieselregen',   icon: 'rain',    baseStatus: 'warn' },
  61: { label: 'Leichter Regen',        icon: 'rain',    baseStatus: 'mixed' },
  63: { label: 'Regen',                 icon: 'rain',    baseStatus: 'warn' },
  65: { label: 'Starker Regen',         icon: 'rain',    baseStatus: 'warn' },
  71: { label: 'Leichter Schneefall',   icon: 'snow',    baseStatus: 'warn' },
  73: { label: 'Schneefall',            icon: 'snow',    baseStatus: 'warn' },
  75: { label: 'Starker Schneefall',    icon: 'snow',    baseStatus: 'danger' },
  80: { label: 'Leichte Schauer',       icon: 'drizzle', baseStatus: 'mixed' },
  81: { label: 'Regenschauer',          icon: 'rain',    baseStatus: 'warn' },
  82: { label: 'Starke Regenschauer',   icon: 'storm',   baseStatus: 'danger' },
  85: { label: 'Schneeschauer',         icon: 'snow',    baseStatus: 'warn' },
  86: { label: 'Starke Schneeschauer',  icon: 'snow',    baseStatus: 'danger' },
  95: { label: 'Gewitter',              icon: 'storm',   baseStatus: 'danger' },
  96: { label: 'Gewitter m. Hagel',     icon: 'storm',   baseStatus: 'danger' },
  99: { label: 'Starkes Gewitter',      icon: 'storm',   baseStatus: 'danger' },
}

const STATUS_RANK = { good: 0, mixed: 1, warn: 2, danger: 3 }

function elevate(current, next) {
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current
}

function deriveStatus(wmoCode, tempMax, uvMax, precipSum) {
  const base = (WMO[wmoCode] || WMO[0]).baseStatus
  let status = base
  const warnings = []

  if (tempMax >= 37) {
    status = elevate(status, 'danger')
    warnings.push(`Extreme Hitze ${tempMax}°C`)
  } else if (tempMax >= 33) {
    status = elevate(status, 'warn')
    warnings.push(`Hitze ${tempMax}°C`)
  }

  if (uvMax >= 9) {
    status = elevate(status, 'warn')
    warnings.push(`UV-Index ${Math.round(uvMax)} (sehr hoch)`)
  } else if (uvMax >= 7) {
    warnings.push(`UV-Index ${Math.round(uvMax)}`)
  }

  if (precipSum >= 20) {
    status = elevate(status, 'danger')
    warnings.push(`Starkregen ${precipSum} mm`)
  } else if (precipSum >= 10) {
    status = elevate(status, 'warn')
    warnings.push(`Regen ${precipSum} mm`)
  }

  return { status, warnings }
}

let _memCache = null
let _memCacheTime = 0
const CACHE_MS = 30 * 60 * 1000

export async function fetchWeather() {
  const now = Date.now()

  if (_memCache && now - _memCacheTime < CACHE_MS) return _memCache

  try {
    const stored = sessionStorage.getItem('luma-weather-v2')
    if (stored) {
      const { data, ts } = JSON.parse(stored)
      if (now - ts < CACHE_MS) {
        _memCache = data
        _memCacheTime = ts
        return data
      }
    }
  } catch {}

  const qs = new URLSearchParams({
    latitude: WEATHER_LAT,
    longitude: WEATHER_LON,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,uv_index_max',
    hourly: 'relative_humidity_2m',
    timezone: 'Europe/Berlin',
    forecast_days: 14,
  })

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const { daily, hourly } = json
    const days = daily.time.map((date, i) => {
      const wmoCode = daily.weathercode[i]
      const wmo = WMO[wmoCode] || WMO[0]
      const tempMax = Math.round(daily.temperature_2m_max[i])
      const tempMin = Math.round(daily.temperature_2m_min[i])
      const precipSum = Math.round(daily.precipitation_sum[i] * 10) / 10
      const uvMax = Math.round((daily.uv_index_max[i] || 0) * 10) / 10

      // Noon humidity for the day
      const humidity = Math.round(hourly.relative_humidity_2m[i * 24 + 12] ?? 60)

      const { status, warnings } = deriveStatus(wmoCode, tempMax, uvMax, precipSum)

      return { date, tempMax, tempMin, humidity, precip: precipSum, uvMax, wmoCode, label: wmo.label, icon: wmo.icon, status, warnings }
    })

    _memCache = days
    _memCacheTime = now
    try { sessionStorage.setItem('luma-weather-v2', JSON.stringify({ data: days, ts: now })) } catch {}
    return days
  } catch (err) {
    console.warn('[Weather]', err.message)
    return _memCache || []
  }
}

export function getWeatherForDate(forecast, date) {
  return forecast.find(d => d.date === date) ?? null
}

// status → hex color (works independent of CSS vars)
export const STATUS_COLOR = {
  good:   '#09BE60',
  mixed:  '#F59E0B',
  warn:   '#F59E0B',
  danger: '#ef4444',
}
