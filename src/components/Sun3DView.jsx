// 3D-Schatten-Ansicht (Beta): OSM-Gebäude extrudiert + echter Schattenwurf
// nach Sonnenstand (deck.gl SunLight). Tageszeit-Schieberegler + Jahreszeiten-
// Stichtage → einschätzen, wann eine Fläche Sonne bekommt.
// Wird lazy geladen (deck.gl steckt nur in diesem Chunk).
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as suncalcNs from 'suncalc'
const SunCalc = suncalcNs.default || suncalcNs
import { Deck, LightingEffect, AmbientLight, _SunLight as SunLight } from '@deck.gl/core'
import { GeoJsonLayer, SolidPolygonLayer, BitmapLayer } from '@deck.gl/layers'
import { TileLayer } from '@deck.gl/geo-layers'
import { X, Sun, Loader } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED, A, A14 } from '../lib/theme.js'
import { fetchBuildingsBbox } from '../lib/overpass.js'
import { fetchAlkisBuildings, fetchBerlinTrees, isInBerlin } from '../lib/berlinGeo.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"
const HALF_M = 450 // halbe Kantenlänge des geladenen Ausschnitts (Meter)

const DATE_PRESETS = [
  { key: 'fruehling', label: '21.3.', title: 'Frühling', month: 2, day: 21 },
  { key: 'sommer', label: '21.6.', title: 'Sommer', month: 5, day: 21 },
  { key: 'herbst', label: '23.9.', title: 'Herbst', month: 8, day: 23 },
  { key: 'winter', label: '21.12.', title: 'Winter', month: 11, day: 21 },
  { key: 'heute', label: 'Heute', title: 'Heute' },
]

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})/i.exec(hex || '')
  if (!m) return [8, 170, 86]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const fmtClock = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export default function Sun3DView({ center, mapFeatures = [], projectColorById = {}, onClose }) {
  const containerRef = useRef(null)
  const deckRef = useRef(null)
  const [buildings, setBuildings] = useState(null)
  const [trees, setTrees] = useState([])
  const [dataSource, setDataSource] = useState('osm')
  const [error, setError] = useState(null)
  const [dateKey, setDateKey] = useState('heute')
  const now = useMemo(() => new Date(), [])
  const [minutes, setMinutes] = useState(now.getHours() * 60 + Math.round(now.getMinutes() / 10) * 10)
  const [showMap, setShowMap] = useState(true)
  const [showTrees, setShowTrees] = useState(true)

  const lat = center?.lat ?? 52.515
  const lng = center?.lng ?? 13.405

  // Gewähltes Datum + Uhrzeit → Timestamp
  const preset = DATE_PRESETS.find(p => p.key === dateKey)
  const date = useMemo(() => {
    const d = new Date()
    if (preset && preset.month != null) d.setMonth(preset.month, preset.day)
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
    return d
  }, [dateKey, minutes]) // eslint-disable-line react-hooks/exhaustive-deps

  const sunPos = SunCalc.getPosition(date, lat, lng)
  const sunTimes = SunCalc.getTimes(date, lat, lng)
  const sunUp = sunPos.altitude > 0

  // Gebäude + Bäume laden: in Berlin amtlich (ALKIS + Baumkataster), sonst OSM
  const load = useCallback(async () => {
    setError(null)
    setBuildings(null)
    setTrees([])
    const dLat = HALF_M / 111320
    const dLng = HALF_M / (111320 * Math.cos(lat * Math.PI / 180))
    const bbox = [lat - dLat, lng - dLng, lat + dLat, lng + dLng]
    try {
      if (isInBerlin(lat, lng)) {
        try {
          const [b, t] = await Promise.all([fetchAlkisBuildings(...bbox), fetchBerlinTrees(...bbox)])
          setBuildings(b); setTrees(t); setDataSource('alkis')
          return
        } catch { /* GDI down → OSM-Fallback */ }
      }
      setBuildings(await fetchBuildingsBbox(...bbox))
      setDataSource('osm')
    } catch {
      setError('Gebäudedaten nicht erreichbar — kurz warten und erneut versuchen.')
    }
  }, [lat, lng])
  useEffect(() => { load() }, [load])

  const buildingGeojson = useMemo(() => buildings && ({
    type: 'FeatureCollection',
    features: buildings.map(b => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...b.ring, b.ring[0]]] },
      properties: { height: b.height, est: !b.hasHeightTag },
    })),
  }), [buildings])

  // Baumkronen als 10-Eck-Zylinder (werfen im Licht-Effekt echte Schatten)
  const treeColumns = useMemo(() => trees.map(t => {
    const r = Math.max(t.crown / 2, 1.2)
    const dLat = r / 111320
    const dLng = r / (111320 * Math.cos(t.lat * Math.PI / 180))
    const ring = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 2 * Math.PI
      ring.push([t.lng + Math.cos(a) * dLng, t.lat + Math.sin(a) * dLat])
    }
    return { polygon: ring, elevation: t.height, art: t.art, height: t.height, crown: t.crown }
  }), [trees])

  const featureGeojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: mapFeatures
      .filter(f => f.geometry && f.feature_type !== 'drone_image' && f.feature_type !== 'ortho_tiles')
      .map(f => ({ type: 'Feature', geometry: f.geometry, properties: { color: hexToRgb(projectColorById[f.project_id]), label: f.label } })),
  }), [mapFeatures, projectColorById])

  // Deck initialisieren
  useEffect(() => {
    if (!containerRef.current) return
    const deck = new Deck({
      parent: containerRef.current,
      initialViewState: { longitude: lng, latitude: lat, zoom: 16, pitch: 55, bearing: -25, maxPitch: 70 },
      controller: true,
      layers: [],
      getTooltip: ({ object }) => {
        if (!object) return null
        if (object.art) return { text: `${object.art} · ≈ ${Math.round(object.height)} m hoch · Krone ${object.crown} m` }
        if (object.properties?.height) return { text: `Gebäude ≈ ${Math.round(object.properties.height)} m${object.properties.est ? ' (geschätzt)' : ''}` }
        return null
      },
    })
    deckRef.current = deck
    return () => { deck.finalize(); deckRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Layer + Licht bei jeder Änderung aktualisieren
  useEffect(() => {
    const deck = deckRef.current
    if (!deck) return
    const dLat = (HALF_M * 1.4) / 111320
    const dLng = (HALF_M * 1.4) / (111320 * Math.cos(lat * Math.PI / 180))
    const ground = [[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat]]

    const layers = [
      new TileLayer({
        id: 'basemap',
        data: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        minZoom: 0, maxZoom: 19, tileSize: 256,
        renderSubLayers: props => {
          const { west, south, east, north } = props.tile.bbox
          return new BitmapLayer(props, { data: null, image: props.data, bounds: [west, south, east, north] })
        },
      }),
      // Bodenplatte fängt die Schatten (halbtransparent über der Karte)
      new SolidPolygonLayer({
        id: 'ground',
        data: [{ polygon: ground }],
        getPolygon: d => d.polygon,
        getFillColor: showMap ? [250, 249, 244, 110] : [242, 240, 233, 235],
        material: { ambient: 0.75, diffuse: 0.5, shininess: 8, specularColor: [0, 0, 0] },
      }),
      buildingGeojson && new GeoJsonLayer({
        id: 'buildings',
        data: buildingGeojson,
        extruded: true,
        getElevation: f => f.properties.height,
        getFillColor: f => {
          const h = f.properties.height
          const t = Math.min(h / 40, 1)
          return [224 - 26 * t, 226 - 22 * t, 231 - 14 * t, 255]
        },
        getLineColor: [140, 145, 150, 60],
        pickable: true,
        material: { ambient: 0.45, diffuse: 0.65, shininess: 18, specularColor: [30, 30, 30] },
      }),
      // Bäume (Baumkataster): Kronenzylinder werfen echte Schatten
      showTrees && treeColumns.length > 0 && new SolidPolygonLayer({
        id: 'trees',
        data: treeColumns,
        extruded: true,
        getPolygon: d => d.polygon,
        getElevation: d => d.elevation,
        getFillColor: [92, 152, 90, 215],
        pickable: true,
        material: { ambient: 0.5, diffuse: 0.6, shininess: 5, specularColor: [0, 0, 0] },
      }),
      // Eigene BIOME-Features flach einblenden (Orientierung: wo ist meine Fläche?)
      new GeoJsonLayer({
        id: 'biome-features',
        data: featureGeojson,
        stroked: true, filled: true,
        getLineColor: f => [...f.properties.color, 235],
        getFillColor: f => [...f.properties.color, 70],
        getLineWidth: 1.6, lineWidthUnits: 'meters', lineWidthMinPixels: 2,
        getPointRadius: 2.5, pointRadiusUnits: 'meters', pointRadiusMinPixels: 4,
      }),
    ].filter(Boolean)

    const ambient = new AmbientLight({ color: [255, 255, 255], intensity: sunUp ? 1.0 : 1.6 })
    const sun = new SunLight({ timestamp: date.getTime(), color: [255, 250, 235], intensity: sunUp ? 1.7 : 0.0, _shadow: true })
    const effect = new LightingEffect({ ambient, sun })
    effect.shadowColor = [0, 0, 25, sunUp ? 0.42 : 0]

    deck.setProps({ layers, effects: [effect] })
  }, [buildingGeojson, featureGeojson, treeColumns, showTrees, date, sunUp, showMap, lat, lng])

  const chip = (active) => ({
    padding: '5px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${active ? `color-mix(in srgb, ${A} 45%, transparent)` : BORDER}`,
    background: active ? A14 : 'transparent', color: active ? A : MUTED,
  })

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1500, background: '#e8e8e2' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Kopfzeile */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '7px 12px', boxShadow: '0 2px 14px rgba(0,0,0,0.35)', pointerEvents: 'auto' }}>
          <Sun size={14} color="#f59e0b" />
          <span style={{ fontSize: 13, fontWeight: 600, color: FG, fontFamily: SANS }}>3D-Schatten</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '1px 6px' }}>BETA</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '7px 12px', fontSize: 11, color: MUTED, fontFamily: SANS, cursor: 'pointer', pointerEvents: 'auto' }}>
          <input type="checkbox" checked={showMap} onChange={e => setShowMap(e.target.checked)} style={{ accentColor: A }} />
          Karte durchscheinen lassen
        </label>
        {trees.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '7px 12px', fontSize: 11, color: MUTED, fontFamily: SANS, cursor: 'pointer', pointerEvents: 'auto' }}>
            <input type="checkbox" checked={showTrees} onChange={e => setShowTrees(e.target.checked)} style={{ accentColor: '#5c985a' }} />
            🌳 Bäume ({trees.length})
          </label>
        )}
        <button onClick={onClose} aria-label="3D-Ansicht schließen"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', color: FG, cursor: 'pointer', fontSize: 13, fontFamily: SANS, boxShadow: '0 2px 14px rgba(0,0,0,0.35)', pointerEvents: 'auto' }}>
          <X size={14} /> Zur Karte
        </button>
      </div>

      {/* Lade-/Fehlerzustand */}
      {!buildings && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9, pointerEvents: 'none' }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', pointerEvents: 'auto' }}>
            {error ? (
              <>
                <span style={{ fontSize: 13, color: FG, fontFamily: SANS }}>{error}</span>
                <button onClick={load} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: A, color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: SANS }}>Erneut</button>
              </>
            ) : (
              <>
                <Loader size={16} color={A} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: FG, fontFamily: SANS }}>Lade Gebäude aus OpenStreetMap…</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Steuerung: Jahreszeit + Uhrzeit */}
      <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 10, width: 'min(560px, calc(100% - 24px))', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {DATE_PRESETS.map(p => (
            <button key={p.key} onClick={() => setDateKey(p.key)} title={p.title} style={chip(dateKey === p.key)}>
              {p.title === p.label ? p.label : `${p.title} ${p.label}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: FG, minWidth: 48 }}>{fmtClock(minutes)}</span>
          <input type="range" min={240} max={1320} step={10} value={minutes} onChange={e => setMinutes(+e.target.value)}
            style={{ flex: 1, accentColor: '#f59e0b' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 5, fontFamily: MONO, fontSize: 9, color: MUTED, flexWrap: 'wrap' }}>
          <span>↑ {sunTimes.sunrise ? sunTimes.sunrise.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'} · ↓ {sunTimes.sunset ? sunTimes.sunset.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          <span>{sunUp ? `Sonnenhöhe ${(sunPos.altitude * 180 / Math.PI).toFixed(0)}°` : 'Sonne unter dem Horizont'}</span>
          <span>{dataSource === 'alkis' ? 'Daten: ALKIS + Baumkataster Berlin' : 'Daten: OSM (Höhen z.T. geschätzt)'}</span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
