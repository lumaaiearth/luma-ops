import { useEffect, useMemo, useState } from 'react'
import { sb } from './supabase.js'
import { downsample, seriesStats, seriesSpan, toValue } from './sensorSeries.js'

// Rechenlogik liegt in sensorSeries.js (dort ohne DB-Import testbar), wird hier
// aber mit-exportiert, damit Aufrufer nur ein Modul kennen müssen.
export { downsample, seriesStats, seriesSpan }

// Messwert-Verläufe für mehrere Sensoren auf einmal.
//
// Die Sensorseite lädt den Verlauf eines einzelnen Sensors direkt. Auf der
// Karte liegen dagegen viele Sensoren gleichzeitig vor — eine Abfrage pro
// Kachel wären ein Dutzend Roundtrips beim Öffnen des Panels. Hier holt eine
// Abfrage mit `in(sensor_id, …)` alles und teilt es anschließend auf.
//
// Fallschirme: Ergebnis wird kurz gecacht (mehrfaches Auf/Zu des Panels löst
// keine neue Abfrage aus), parallele Aufrufe teilen dieselbe laufende Abfrage,
// und lange Reihen werden ausgedünnt — 30 Pixel Sparkline brauchen keine 1000
// Punkte.

const TTL_MS = 5 * 60 * 1000
const cache = new Map()   // sensor_id -> { at, series }
const inflight = new Map() // sensor_id -> Promise

// 90 Tage statt einer Woche: Die Messwerte kommen in Schüben. In der
// Produktion liegt der jüngste Wert derzeit rund drei Wochen zurück — mit einem
// 7-Tage-Fenster wäre jede Kachel leer, obwohl über 1300 Messwerte da sind.
// Das Fenster ist nur die Obergrenze; beschriftet wird mit dem echten Zeitraum.
export async function fetchSensorSeries(ids, { hours = 24 * 90 } = {}) {
  const wanted = [...new Set((ids || []).filter(Boolean))]
  if (!wanted.length || !sb) return {}

  const now = Date.now()
  const out = {}
  const missing = []
  for (const id of wanted) {
    const hit = cache.get(id)
    if (hit && now - hit.at < TTL_MS) out[id] = hit.series
    else missing.push(id)
  }
  if (!missing.length) return out

  // Bereits laufende Abfragen mitnutzen statt doppelt anfragen
  const pending = missing.filter(id => inflight.has(id))
  const toLoad = missing.filter(id => !inflight.has(id))

  let loadPromise = null
  if (toLoad.length) {
    const since = new Date(now - hours * 3600 * 1000).toISOString()
    loadPromise = sb.from('sensor_readings')
      .select('sensor_id, value, ts')
      .in('sensor_id', toLoad)
      .gte('ts', since)
      // Absteigend sortiert, damit ein greifendes `limit` die ÄLTESTEN Zeilen
      // abschneidet. Aufsteigend würden bei vielen Sensoren die jüngsten Werte
      // wegfallen und die Kachel einen veralteten Stand zeigen.
      .order('ts', { ascending: false })
      .limit(4000)
      .then(({ data, error }) => {
        if (error) throw error
        const grouped = {}
        for (const id of toLoad) grouped[id] = []
        for (const r of data || []) {
          const v = toValue(r.value)
          if (!Number.isFinite(v)) continue
          ;(grouped[r.sensor_id] ||= []).push({ ts: new Date(r.ts).getTime(), value: v })
        }
        const stamped = Date.now()
        for (const id of toLoad) {
          // zurück in Zeitrichtung: die Sparkline läuft links → rechts
          const series = downsample((grouped[id] || []).reverse())
          cache.set(id, { at: stamped, series })
          grouped[id] = series
        }
        return grouped
      })
      .finally(() => { for (const id of toLoad) inflight.delete(id) })

    for (const id of toLoad) inflight.set(id, loadPromise)
  }

  const results = await Promise.all([
    loadPromise || Promise.resolve({}),
    ...pending.map(id => inflight.get(id).catch(() => ({}))),
  ])
  for (const part of results) {
    for (const [id, series] of Object.entries(part || {})) {
      if (wanted.includes(id)) out[id] = series
    }
  }
  // Sensoren ohne Treffer als leere Reihe führen, sonst wirkt „noch nicht
  // geladen" wie „keine Messungen"
  for (const id of wanted) out[id] ||= cache.get(id)?.series || []
  return out
}

// `enabled`: erst laden, wenn der Verlauf wirklich gezeigt wird — beim reinen
// Kartenbesuch soll keine Messwert-Abfrage anfallen.
export function useSensorSeries(ids, { hours = 24 * 90, enabled = true } = {}) {
  const key = useMemo(() => [...new Set((ids || []).filter(Boolean))].sort().join(','), [ids])
  const [series, setSeries] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || !key) return
    // `current` deckt Neuladen und Unmount ab — das Cleanup läuft in beiden Fällen
    let current = true
    setLoading(true)
    setError(null)
    fetchSensorSeries(key.split(','), { hours })
      .then(res => { if (current) setSeries(res) })
      .catch(e => { if (current) setError(e) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [key, hours, enabled])

  return { series, loading, error }
}

export function clearSensorSeriesCache() {
  cache.clear()
}
