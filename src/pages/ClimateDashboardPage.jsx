// BIOME™ Klima-Dashboard für Kunden (Verwaltungen, Wohnungsbau, Betriebe):
// Der Kunde definiert seinen Scope (Bezirk / Ortsteil / eigene Projektflächen),
// sieht darin seine Sensorik als Punktwolke mit Verteilungen, wählt frei den
// Zeithorizont und bekommt die Klima-Kennwerte des Gebiets aus amtlichen Daten.
import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip as LTooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from 'recharts'
import { Layers, Thermometer, Droplets, Activity, MapPin, Radio, ChevronDown, Loader, Download, Printer } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, BG, SURFACE, BORDER, FG, MUTED, CARD, OK, WARN, DANGER, A14, A20 } from '../lib/theme.js'
import { SENSOR_TYPE_LABELS, SENSOR_TYPE_ICONS } from '../data/sensorTypes.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { geometryCentroid } from '../lib/geo.js'
import { sampleScopePoints, fetchGebietsProfil, fetchSensorCluster, CLUSTER } from '../lib/klimaProfil.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const RANGES = [
  { id: '24h', label: '24 Stunden', hours: 24, bucketMin: 60 },
  { id: '7d', label: '7 Tage', hours: 24 * 7, bucketMin: 180 },
  { id: '30d', label: '30 Tage', hours: 24 * 30, bucketMin: 720 },
  { id: '365d', label: '12 Monate', hours: 24 * 365, bucketMin: 1440 * 7 },
]

// Messgrößen, die als Punktwolke/Verlauf dargestellt werden können
const METRICS = [
  { type: 'soil_moisture', label: 'Bodenfeuchte', unit: '%', icon: '💧', color: '#38bdf8', low: 25, high: 60 },
  { type: 'soil_temp', label: 'Bodentemperatur', unit: '°C', icon: '🌡', color: '#f97316', low: 5, high: 28 },
  { type: 'air_temp', label: 'Lufttemperatur', unit: '°C', icon: '🌤', color: '#ef4444', low: 0, high: 30 },
  { type: 'rainfall', label: 'Niederschlag', unit: 'mm', icon: '🌧', color: '#0ea5e9', low: 0, high: 20 },
]

// Farbverlauf einer Messgröße (niedrig → hoch)
function valueColor(metric, v) {
  if (v == null) return '#6b7280'
  const t = Math.max(0, Math.min(1, (v - metric.low) / (metric.high - metric.low || 1)))
  const stops = metric.type === 'soil_moisture'
    ? [[194, 120, 60], [214, 190, 90], [110, 190, 160], [56, 140, 220]]   // trocken → nass
    : [[59, 130, 246], [110, 200, 180], [250, 204, 21], [239, 68, 68]]    // kalt → heiß
  const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)))
  const f = t * (stops.length - 1) - seg
  const c = stops[seg].map((x, i) => Math.round(x + (stops[seg + 1][i] - x) * f))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

function pointInRing(pt, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function inGeometry(lng, lat, geom) {
  if (!geom) return true
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []
  return polys.some(rings => pointInRing([lng, lat], rings[0]) && !rings.slice(1).some(h => pointInRing([lng, lat], h)))
}

function FitBounds({ bbox }) {
  const map = useMap()
  useEffect(() => {
    if (bbox) map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: [24, 24], animate: true })
  }, [bbox, map])
  return null
}

function Card({ children, style, pad = '16px 18px' }) {
  return <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: pad, ...style }}>{children}</div>
}

function Kpi({ label, value, unit, sub, color, icon }) {
  return (
    <Card pad="14px 16px">
      <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 27, fontWeight: 300, color: color || FG, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}{unit && <span style={{ fontSize: 13, color: MUTED, marginLeft: 2 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED, marginTop: 5 }}>{sub}</div>}
    </Card>
  )
}

export default function ClimateDashboardPage() {
  const isMobile = useIsMobile()
  const { sensors = [], projects = [], mapFeatures = [] } = useOps()

  const [gebiete, setGebiete] = useState({ bezirke: null, ortsteile: null })
  const [scopeKind, setScopeKind] = useState('alle')        // alle | bezirk | ortsteil | projekt
  const [scopeName, setScopeName] = useState('')
  const [metricType, setMetricType] = useState('soil_moisture')
  const [range, setRange] = useState('7d')
  const [readings, setReadings] = useState({})              // sensorId → [{ts, value}]
  const [loading, setLoading] = useState(false)
  const [gebietsProfil, setGebietsProfil] = useState(null)  // Klimakennwerte des Scopes
  const [profilLaeuft, setProfilLaeuft] = useState(false)
  const [cluster, setCluster] = useState({})                // sensorId → {vg_pct, cluster}
  const [clusterAn, setClusterAn] = useState(false)

  const metric = METRICS.find(m => m.type === metricType) || METRICS[0]
  const rangeDef = RANGES.find(r => r.id === range)

  // Verwaltungsgrenzen einmalig laden
  useEffect(() => {
    Promise.all([
      fetch('/geo/bezirke.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/geo/ortsteile.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([bezirke, ortsteile]) => setGebiete({ bezirke, ortsteile }))
  }, [])

  // Aktiver Scope → Geometrie + BBox
  const scope = useMemo(() => {
    if (scopeKind === 'bezirk' || scopeKind === 'ortsteil') {
      const fc = scopeKind === 'bezirk' ? gebiete.bezirke : gebiete.ortsteile
      const f = fc?.features?.find(x => x.properties.name === scopeName)
      return f ? { label: f.properties.name, geometry: f.geometry, bbox: f.properties.bbox } : null
    }
    if (scopeKind === 'projekt') {
      const p = projects.find(x => x.id === scopeName)
      if (!p?.lat) return null
      const d = 0.012
      return { label: p.name, geometry: null, bbox: [p.lat - d, p.lng - d * 1.6, p.lat + d, p.lng + d * 1.6], projectId: p.id }
    }
    return { label: 'Gesamtes Gebiet', geometry: null, bbox: null }
  }, [scopeKind, scopeName, gebiete, projects])

  // Sensoren im Scope
  const scopeSensors = useMemo(() => {
    const withPos = sensors.filter(s => s.lat && s.lng)
    if (!scope) return []
    if (scope.projectId) return withPos.filter(s => s.project_id === scope.projectId)
    if (scope.geometry) return withPos.filter(s => inGeometry(s.lng, s.lat, scope.geometry))
    return withPos
  }, [sensors, scope])

  const metricSensors = useMemo(() => scopeSensors.filter(s => s.type === metricType), [scopeSensors, metricType])

  // Messwerte für den Zeithorizont laden
  useEffect(() => {
    if (!metricSensors.length) { setReadings({}); return }
    let cancelled = false
    setLoading(true)
    const since = new Date(Date.now() - rangeDef.hours * 3600_000).toISOString()
    sb.from('sensor_readings')
      .select('sensor_id, value, ts')
      .in('sensor_id', metricSensors.map(s => s.id))
      .gte('ts', since)
      .order('ts', { ascending: true })
      .limit(8000)
      .then(({ data }) => {
        if (cancelled) return
        const byId = {}
        for (const r of data || []) {
          (byId[r.sensor_id] ||= []).push({ ts: new Date(r.ts).getTime(), value: Number(r.value) })
        }
        setReadings(byId)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [metricSensors.map(s => s.id).join(','), range]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gebiets-Klimaprofil (amtliche Fachdaten als Stichprobe über den Scope)
  useEffect(() => {
    if (!scope?.bbox) { setGebietsProfil(null); return }
    const ctrl = new AbortController()
    setProfilLaeuft(true)
    setGebietsProfil(null)
    const pts = sampleScopePoints(scope.bbox, scope.geometry, 9)
    fetchGebietsProfil(pts, { signal: ctrl.signal })
      .then(p => { if (!ctrl.signal.aborted) setGebietsProfil(p) })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setProfilLaeuft(false) })
    return () => ctrl.abort()
  }, [scope?.label, scope?.bbox?.join?.(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Standortcharakter der Messstellen (Blockversiegelung) — nur auf Wunsch
  useEffect(() => {
    if (!clusterAn || !metricSensors.length) return
    const offen = metricSensors.filter(s => !cluster[s.id])
    if (!offen.length) return
    const ctrl = new AbortController()
    fetchSensorCluster(offen, { signal: ctrl.signal })
      .then(m => { if (!ctrl.signal.aborted) setCluster(prev => ({ ...prev, ...m })) })
      .catch(() => {})
    return () => ctrl.abort()
  }, [clusterAn, metricSensors.map(s => s.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Verlauf: Mittelwert + Bandbreite (min/max) je Zeitfenster über alle Sensoren
  const series = useMemo(() => {
    const bucketMs = rangeDef.bucketMin * 60_000
    const buckets = new Map()
    for (const list of Object.values(readings)) {
      for (const r of list) {
        const k = Math.floor(r.ts / bucketMs) * bucketMs
        const b = buckets.get(k) || { ts: k, sum: 0, n: 0, min: Infinity, max: -Infinity }
        b.sum += r.value; b.n++
        b.min = Math.min(b.min, r.value); b.max = Math.max(b.max, r.value)
        buckets.set(k, b)
      }
    }
    return [...buckets.values()].sort((a, b) => a.ts - b.ts).map(b => ({
      ts: b.ts,
      avg: Math.round((b.sum / b.n) * 10) / 10,
      min: Math.round(b.min * 10) / 10,
      max: Math.round(b.max * 10) / 10,
      band: [Math.round(b.min * 10) / 10, Math.round(b.max * 10) / 10],
    }))
  }, [readings, rangeDef])

  // Verlauf je Standortcluster (versiegelt / gemischt / Grünlage)
  const clusterSeries = useMemo(() => {
    if (!clusterAn) return null
    const bucketMs = rangeDef.bucketMin * 60_000
    const gruppen = {}
    for (const s of metricSensors) {
      const key = cluster[s.id]?.cluster || 'unbekannt'
      for (const r of readings[s.id] || []) {
        const t = Math.floor(r.ts / bucketMs) * bucketMs
        const g = (gruppen[key] ||= new Map())
        const b = g.get(t) || { sum: 0, n: 0 }
        b.sum += r.value; b.n++
        g.set(t, b)
      }
    }
    const aktive = Object.keys(gruppen)
    if (aktive.length < 2) return null   // Vergleich lohnt erst ab zwei Gruppen
    const alleTs = [...new Set(aktive.flatMap(k => [...gruppen[k].keys()]))].sort((a, b) => a - b)
    return {
      keys: aktive,
      data: alleTs.map(ts => {
        const row = { ts }
        for (const k of aktive) {
          const b = gruppen[k].get(ts)
          row[k] = b ? Math.round((b.sum / b.n) * 10) / 10 : null
        }
        return row
      }),
    }
  }, [clusterAn, cluster, readings, metricSensors, rangeDef])

  // Aktueller Wert je Sensor (letzter Messwert im Zeitraum, sonst Live-Wert)
  const latest = useMemo(() => {
    const out = {}
    for (const s of metricSensors) {
      const list = readings[s.id]
      out[s.id] = list?.length ? list[list.length - 1].value : Number(s.value)
    }
    return out
  }, [metricSensors, readings])

  const values = Object.values(latest).filter(v => Number.isFinite(v))
  const avg = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null
  const vmin = values.length ? Math.min(...values) : null
  const vmax = values.length ? Math.max(...values) : null
  const kritisch = metricSensors.filter(s => s.status === 'critical').length
  const warnend = metricSensors.filter(s => s.status === 'warning').length

  // Verteilung (Histogramm) der aktuellen Werte
  const verteilung = useMemo(() => {
    if (!values.length) return []
    const lo = Math.min(metric.low, vmin), hi = Math.max(metric.high, vmax)
    const n = 8, w = (hi - lo) / n || 1
    const bins = Array.from({ length: n }, (_, i) => ({
      von: Math.round(lo + i * w), bis: Math.round(lo + (i + 1) * w), anzahl: 0,
    }))
    for (const v of values) bins[Math.min(n - 1, Math.max(0, Math.floor((v - lo) / w)))].anzahl++
    return bins.map(b => ({ ...b, bereich: `${b.von}–${b.bis}` }))
  }, [values.join(','), metric, vmin, vmax]) // eslint-disable-line react-hooks/exhaustive-deps

  // CSV-Export der Rohmesswerte (für GIS-/Fachabteilungen)
  function exportCsv() {
    const rows = [['messstelle', 'sensor_id', 'projekt', 'lat', 'lng', 'standortcharakter', 'zeitpunkt', 'wert', 'einheit']]
    for (const s of metricSensors) {
      const proj = projects.find(p => p.id === s.project_id)?.name || ''
      const cl = CLUSTER.find(c => c.key === cluster[s.id]?.cluster)?.label || ''
      for (const r of readings[s.id] || []) {
        rows.push([s.name, s.id, proj, s.lat, s.lng, cl, new Date(r.ts).toISOString(), r.value, metric.unit])
      }
    }
    const csv = '﻿' + rows.map(r => r.map(v => {
      const t = String(v ?? '')
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
    }).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    const slug = (scope?.label || 'gebiet').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    a.href = url
    a.download = `biome_${slug}_${metricType}_${range}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const messwerteGesamt = Object.values(readings).reduce((s, l) => s + l.length, 0)

  const fmtTs = ts => {
    const d = new Date(ts)
    return rangeDef.hours <= 24 ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : rangeDef.hours <= 24 * 30 ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
      : d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
  }

  const scopeOptions = scopeKind === 'bezirk' ? (gebiete.bezirke?.features || []).map(f => f.properties.name)
    : scopeKind === 'ortsteil' ? (gebiete.ortsteile?.features || []).map(f => f.properties.name)
    : scopeKind === 'projekt' ? projects.filter(p => p.lat).map(p => p.id)
    : []

  const selectStyle = {
    padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE,
    color: FG, fontSize: 12, fontFamily: SANS, outline: 'none', cursor: 'pointer', maxWidth: 220,
  }
  const chip = active => ({
    padding: '6px 12px', borderRadius: 999, fontSize: 12, fontFamily: SANS, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${active ? A20 : BORDER}`, background: active ? A14 : 'transparent', color: active ? A : MUTED,
  })

  return (
    <div style={{ padding: isMobile ? 14 : 24, maxWidth: 1360, margin: '0 auto', background: BG }}>
      {/* Kopf + Scope */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: A, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          BIOME™ · Klima-Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontSize: isMobile ? 21 : 26, fontWeight: 400, color: FG, letterSpacing: '-0.02em', margin: 0 }}>
            {scope?.label || 'Gebiet wählen'}
          </h1>
          <div className="lu-noprint" style={{ display: 'flex', gap: 6 }}>
            <button onClick={exportCsv} disabled={!messwerteGesamt} title="Rohmesswerte als CSV herunterladen"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: messwerteGesamt ? FG : MUTED, cursor: messwerteGesamt ? 'pointer' : 'default', fontSize: 12, fontFamily: SANS }}>
              <Download size={13} /> CSV
            </button>
            <button onClick={() => window.print()} title="Dashboard drucken oder als PDF sichern"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, cursor: 'pointer', fontSize: 12, fontFamily: SANS }}>
              <Printer size={13} /> Bericht
            </button>
          </div>
        </div>
        <div className="lu-noprint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[['alle', 'Alles'], ['bezirk', 'Bezirk'], ['ortsteil', 'Ortsteil'], ['projekt', 'Projektfläche']].map(([k, l]) => (
              <button key={k} onClick={() => { setScopeKind(k); setScopeName('') }} style={chip(scopeKind === k)}>{l}</button>
            ))}
          </div>
          {scopeKind !== 'alle' && (
            <select value={scopeName} onChange={e => setScopeName(e.target.value)} style={selectStyle}>
              <option value="">— {scopeKind === 'projekt' ? 'Projekt' : 'Gebiet'} wählen —</option>
              {scopeOptions.map(o => (
                <option key={o} value={o}>{scopeKind === 'projekt' ? projects.find(p => p.id === o)?.name : o}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Messgröße + Zeithorizont */}
      <div className="lu-noprint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {METRICS.map(m => {
          const n = scopeSensors.filter(s => s.type === m.type).length
          return (
            <button key={m.type} onClick={() => setMetricType(m.type)} disabled={n === 0}
              style={{ ...chip(metricType === m.type), opacity: n === 0 ? 0.4 : 1, cursor: n === 0 ? 'default' : 'pointer' }}>
              {m.icon} {m.label} <span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7 }}>{n}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'inline-flex', gap: 3, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, padding: 3 }}>
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)}
              style={{ padding: '5px 12px', borderRadius: 999, border: 'none', background: range === r.id ? A : 'transparent', color: range === r.id ? 'var(--luma-on-a)' : MUTED, cursor: 'pointer', fontSize: 11.5, fontWeight: range === r.id ? 600 : 400, fontFamily: SANS }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kennzahlen */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 140 : 168}px, 1fr))`, gap: 10, marginBottom: 16 }}>
        <Kpi label="Sensoren im Gebiet" value={metricSensors.length} icon={<Radio size={11} />}
          sub={`${scopeSensors.length} gesamt · ${metric.label}`} />
        <Kpi label={`Ø ${metric.label}`} value={avg ?? '—'} unit={avg != null ? metric.unit : ''} icon={metric.icon}
          color={avg != null ? valueColor(metric, avg) : null}
          sub={vmin != null ? `Spanne ${vmin}–${vmax} ${metric.unit}` : 'keine Messwerte'} />
        <Kpi label="Kritisch" value={kritisch} icon={<Activity size={11} />} color={kritisch ? DANGER : FG}
          sub={kritisch ? 'Schwellwert unterschritten' : 'keine Grenzwertverletzung'} />
        <Kpi label="Warnungen" value={warnend} icon={<Activity size={11} />} color={warnend ? WARN : FG}
          sub={warnend ? 'beobachten' : 'alles im Normbereich'} />
        <Kpi label="Messpunkte" value={Object.values(readings).reduce((s, l) => s + l.length, 0)} icon={<Layers size={11} />}
          sub={`im Zeitraum ${rangeDef.label}`} />
      </div>

      {/* Gebiets-Klimaprofil aus amtlichen Fachdaten */}
      {(profilLaeuft || gebietsProfil) && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Klimaprofil des Gebiets · Umweltatlas Berlin
            </div>
            {gebietsProfil && (
              <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>
                Stichprobe aus {gebietsProfil.treffer} Punkten im Gebiet
              </div>
            )}
          </div>
          {profilLaeuft ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontFamily: MONO, fontSize: 12, padding: '10px 0' }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> frage amtliche Fachdaten ab…
            </div>
          ) : gebietsProfil ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 150 : 200}px, 1fr))`, gap: 10 }}>
              {gebietsProfil.pet && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🌡 Wärmebelastung (PET)</div>
                  <div style={{ fontSize: 20, fontWeight: 300, color: gebietsProfil.pet.stufe?.color }}>
                    Ø {gebietsProfil.pet.mitte}<span style={{ fontSize: 12, color: MUTED }}> °C</span>
                  </div>
                  <div style={{ fontSize: 11, color: FG, marginTop: 2 }}>{gebietsProfil.pet.stufe?.label}</div>
                  {gebietsProfil.pet.belastet_pct != null && (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 3 }}>
                      {gebietsProfil.pet.belastet} von {gebietsProfil.treffer} Punkten stark belastet (≥ 35 °C)
                    </div>
                  )}
                </div>
              )}
              {gebietsProfil.versiegelung && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🏢 Versiegelung</div>
                  <div style={{ fontSize: 20, fontWeight: 300, color: gebietsProfil.versiegelung.stufe?.color }}>
                    Ø {gebietsProfil.versiegelung.pct}<span style={{ fontSize: 12, color: MUTED }}> %</span>
                  </div>
                  <div style={{ fontSize: 11, color: FG, marginTop: 2 }}>{gebietsProfil.versiegelung.stufe?.label}</div>
                  {gebietsProfil.versiegelung.spanne && (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 3 }}>
                      Spanne {gebietsProfil.versiegelung.spanne[0].toFixed(0)}–{gebietsProfil.versiegelung.spanne[1].toFixed(0)} %
                      {gebietsProfil.versiegelung.trend_pct != null && ` · Trend ${gebietsProfil.versiegelung.trend_pct > 0 ? '+' : ''}${gebietsProfil.versiegelung.trend_pct.toFixed(1)} Pp. seit 2016`}
                    </div>
                  )}
                </div>
              )}
              {gebietsProfil.gruen && (
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🌿 Grünvolumen</div>
                  <div style={{ fontSize: 20, fontWeight: 300, color: OK }}>
                    Ø {gebietsProfil.gruen.gvz}<span style={{ fontSize: 12, color: MUTED }}> m³/m²</span>
                  </div>
                  <div style={{ fontSize: 11, color: FG, marginTop: 2 }}>Vegetationsvolumen je m² Blockfläche</div>
                  {gebietsProfil.gruen.trend_gvz != null && (
                    <div style={{ fontFamily: MONO, fontSize: 9, color: gebietsProfil.gruen.trend_gvz < -0.3 ? WARN : MUTED, marginTop: 3 }}>
                      Trend {gebietsProfil.gruen.trend_gvz > 0 ? '+' : ''}{gebietsProfil.gruen.trend_gvz.toFixed(2)} seit 2010
                      {gebietsProfil.gruen.trend_gvz < -0.3 ? ' — Gehölzvolumen verloren' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </Card>
      )}

      {/* Karte + Verteilung */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card pad={0} style={{ overflow: 'hidden', minHeight: 340 }}>
          <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Sensor-Punktwolke · {metric.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{metric.low}{metric.unit}</span>
              <div style={{ width: 90, height: 7, borderRadius: 4, background: `linear-gradient(to right, ${valueColor(metric, metric.low)}, ${valueColor(metric, (metric.low + metric.high) / 2)}, ${valueColor(metric, metric.high)})` }} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{metric.high}{metric.unit}</span>
            </div>
          </div>
          <div style={{ height: 320 }}>
            <MapContainer center={[52.515, 13.405]} zoom={10} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO' maxZoom={19} />
              {scope?.geometry && (
                <GeoJSON key={scope.label} data={{ type: 'Feature', geometry: scope.geometry }}
                  style={{ color: A, weight: 2, fillColor: A, fillOpacity: 0.06 }} />
              )}
              {scope?.bbox && <FitBounds bbox={scope.bbox} />}
              {metricSensors.map(s => {
                const v = latest[s.id]
                return (
                  <CircleMarker key={s.id} center={[s.lat, s.lng]}
                    radius={Number.isFinite(v) ? 7 + Math.min(7, Math.abs(v - metric.low) / ((metric.high - metric.low) || 1) * 7) : 6}
                    pathOptions={{ color: 'rgba(255,255,255,0.7)', weight: 1.2, fillColor: valueColor(metric, v), fillOpacity: 0.9 }}>
                    <LTooltip direction="top" offset={[0, -6]}>
                      <div style={{ fontFamily: SANS, fontSize: 12 }}>
                        <b>{s.name}</b><br />
                        {Number.isFinite(v) ? `${v} ${metric.unit}` : 'kein Messwert'}
                        {s.status !== 'ok' && <><br /><span style={{ color: s.status === 'critical' ? '#ef4444' : '#f59e0b' }}>{s.status === 'critical' ? 'kritisch' : 'Warnung'}</span></>}
                      </div>
                    </LTooltip>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Verteilung im Gebiet
          </div>
          {verteilung.length ? (
            <ResponsiveContainer width="100%" height={252}>
              <BarChart data={verteilung} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="bereich" tick={{ fill: MUTED, fontSize: 9, fontFamily: MONO }} stroke={BORDER} interval={0} angle={-30} textAnchor="end" height={44} />
                <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} stroke={BORDER} width={34} />
                <Tooltip contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: SANS, fontSize: 12 }}
                  formatter={v => [`${v} Sensoren`, 'Anzahl']} labelFormatter={l => `${l} ${metric.unit}`} />
                <Bar dataKey="anzahl" radius={[4, 4, 0, 0]} fill={metric.color} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 252, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 12, textAlign: 'center', padding: 16 }}>
              Noch keine Sensoren mit dieser Messgröße im gewählten Gebiet.
            </div>
          )}
        </Card>
      </div>

      {/* Verlauf */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Verlauf · {metric.label} · {rangeDef.label}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>
            Fläche = Spanne zwischen kleinstem und größtem Sensorwert · Linie = Mittelwert
          </div>
        </div>
        {loading ? (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: MUTED, fontFamily: MONO, fontSize: 12 }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> lädt Messreihen…
          </div>
        ) : series.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metric.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={metric.color} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="ts" tickFormatter={fmtTs} tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} stroke={BORDER} minTickGap={44} />
              <YAxis tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} stroke={BORDER} width={42} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: SANS, fontSize: 12 }}
                labelFormatter={ts => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                formatter={(v, n) => [Array.isArray(v) ? `${v[0]}–${v[1]} ${metric.unit}` : `${v} ${metric.unit}`, n === 'band' ? 'Spanne' : 'Mittelwert']} />
              <Area type="monotone" dataKey="band" stroke="none" fill="url(#bandFill)" />
              <Line type="monotone" dataKey="avg" stroke={metric.color} strokeWidth={2.2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 12, textAlign: 'center', padding: 20, lineHeight: 1.6 }}>
            Für diesen Zeitraum liegen noch keine Messreihen vor.<br />
            <span style={{ fontFamily: MONO, fontSize: 10 }}>Sensoren werden in BIOME auf der Karte angelegt und liefern ab dann Verlaufsdaten.</span>
          </div>
        )}
      </Card>

      {/* Standort-Cluster-Vergleich */}
      {metricSensors.length >= 2 && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Vergleich nach Standortcharakter
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED, fontFamily: SANS, cursor: 'pointer' }}>
              <input type="checkbox" checked={clusterAn} onChange={e => setClusterAn(e.target.checked)} style={{ accentColor: A }} />
              Messstellen nach Blockversiegelung gruppieren
            </label>
          </div>
          {!clusterAn ? (
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
              Ordnet jeder Messstelle die amtliche Versiegelung ihres Blocks zu und vergleicht die
              Gruppen im Verlauf — so wird sichtbar, ob Standorte in versiegelter Umgebung
              tatsächlich schneller austrocknen als Grünlagen.
            </div>
          ) : clusterSeries ? (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                {CLUSTER.filter(c => clusterSeries.keys.includes(c.key)).map(c => {
                  const n = metricSensors.filter(s => (cluster[s.id]?.cluster || 'unbekannt') === c.key).length
                  return (
                    <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: FG, fontFamily: SANS }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} /> {c.label}
                      <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>{n}</span>
                    </span>
                  )
                })}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={clusterSeries.data} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={fmtTs} tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} stroke={BORDER} minTickGap={44} />
                  <YAxis tick={{ fill: MUTED, fontSize: 10, fontFamily: MONO }} stroke={BORDER} width={42} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: SANS, fontSize: 12 }}
                    labelFormatter={ts => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    formatter={(v, k) => [`${v} ${metric.unit}`, CLUSTER.find(c => c.key === k)?.label || k]} />
                  {clusterSeries.keys.map(k => {
                    const c = CLUSTER.find(x => x.key === k)
                    return <Line key={k} type="monotone" dataKey={k} stroke={c?.color || MUTED} strokeWidth={2} dot={false} connectNulls />
                  })}
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div style={{ fontSize: 12, color: MUTED, padding: '8px 0' }}>
              {Object.keys(cluster).length < metricSensors.length
                ? 'Ordne Messstellen zu…'
                : 'Alle Messstellen liegen im selben Standorttyp — für einen Vergleich braucht es Sensoren in unterschiedlichen Lagen.'}
            </div>
          )}
        </Card>
      )}

      {/* Sensorliste */}
      {metricSensors.length > 0 && (
        <Card>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Messstellen im Gebiet
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 150 : 210}px, 1fr))`, gap: 8 }}>
            {metricSensors.map(s => {
              const v = latest[s.id]
              const proj = projects.find(p => p.id === s.project_id)
              return (
                <div key={s.id} style={{ background: 'color-mix(in srgb, var(--luma-fg) 3%, transparent)', borderRadius: 10, padding: '10px 12px', borderLeft: `3px solid ${valueColor(metric, v)}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginBottom: 5 }}>{proj?.name || '—'}</div>
                  <div style={{ fontSize: 19, fontWeight: 300, color: valueColor(metric, v) }}>
                    {Number.isFinite(v) ? v : '—'}<span style={{ fontSize: 11, color: MUTED }}>{metric.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 14, lineHeight: 1.7 }}>
        Gebietsgrenzen: GDI Berlin / ALKIS (dl-de/by-2-0) · Messwerte: LUMA-Sensorik.
        Der Gebietszuschnitt bestimmt, welche Messstellen und Auswertungen angezeigt werden.
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media print {
          /* Bericht: nur der Dashboard-Inhalt, auf hellem Grund, ohne Bedienelemente */
          .lu-noprint, .desktop-sidebar, .mobile-topbar, .mobile-bottom-nav { display: none !important; }
          .main-content { overflow: visible !important; padding: 0 !important; }
          @page { margin: 12mm; size: A4 portrait; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  )
}
