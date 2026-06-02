import { useState, useMemo, useRef, useEffect } from 'react'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { PLANTS, filterPlants, LICHT_LABELS, WASSER_LABELS, BODEN_LABELS, TYPE_LABELS, MONTHS, DRAINAGE_LABELS, WUCHSFORM_LABELS } from '../data/plants.js'
import {
  Leaf, Search, Plus, Minus, ExternalLink, X, ChevronDown, ChevronUp,
  Filter, Download, SlidersHorizontal, Ruler, Grid3x3, Info,
  Sun, Droplets, FlaskConical, Bug, Bird, Flower, Sprout, TreePine,
} from 'lucide-react'

/* ─── OPTION SETS ───────────────────────────────────────────────────────── */
const LICHT_OPTS = [
  { value: 1, label: 'Vollsonne', emoji: '☀️', desc: '>6h' },
  { value: 2, label: 'Halbschatten', emoji: '⛅', desc: '3–6h' },
  { value: 3, label: 'Schatten', emoji: '🌥️', desc: '<3h' },
]
const WASSER_OPTS = [
  { value: 1, label: 'Trocken', emoji: '🏜️', desc: 'Sandboden' },
  { value: 2, label: 'Mäßig', emoji: '💧', desc: 'normal' },
  { value: 3, label: 'Feucht', emoji: '🌊', desc: 'nass' },
]
const BODEN_OPTS = [
  { value: 'sandy', label: 'Sand', emoji: '🏖️' },
  { value: 'loamy', label: 'Lehm', emoji: '🧱' },
  { value: 'clay', label: 'Ton', emoji: '🪨' },
  { value: 'humus', label: 'Humus', emoji: '🌿' },
]
const DRAINAGE_OPTS = [
  { value: null, label: 'Alle' },
  { value: 'durchlässig', label: 'Durchlässig' },
  { value: 'normal', label: 'Normal' },
  { value: 'stauend', label: 'Stauend' },
]
const PH_OPTS = [
  { value: null, label: 'Alle' },
  { value: 5.0, label: 'Sauer (<5.5)' },
  { value: 6.5, label: 'Neutral (5.5–7)' },
  { value: 7.5, label: 'Alkalisch (>7)' },
]
const TYPE_OPTS = Object.entries(TYPE_LABELS || {}).map(([v, l]) => ({ value: v, label: l }))
const WUCHSFORM_OPTS = Object.entries(WUCHSFORM_LABELS || {}).map(([v, l]) => ({ value: v, label: l }))

/* ─── MAIN ──────────────────────────────────────────────────────────────── */
export default function PlanningPage() {
  const { themeId } = useTheme()
  const L = themeId === 'light'
  const bp = useBreakpoint()
  const isMobile = bp === 'xs' || bp === 'sm'

  // ── Filters
  const [licht, setLicht] = useState(null)
  const [wasser, setWasser] = useState(null)
  const [boden, setBoden] = useState(null)
  const [types, setTypes] = useState([])
  const [wuchsformen, setWuchsformen] = useState([])
  const [drainage, setDrainage] = useState(null)
  const [ph, setPh] = useState(null)
  const [onlyHeimisch, setOnlyHeimisch] = useState(false)
  const [onlyRaupen, setOnlyRaupen] = useState(false)
  const [onlyTagfalter, setOnlyTagfalter] = useState(false)
  const [onlyBienen, setOnlyBienen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPanelOpen, setFilterPanelOpen] = useState(true)
  const [activeFilters, setActiveFilters] = useState('standort') // 'standort'|'biologie'|'boden'

  // ── Plan
  const [plan, setPlan] = useState([])
  const [activeTab, setActiveTab] = useState('suche')
  const [expandedPlant, setExpandedPlant] = useState(null)

  // ── Beetplaner
  const [beetW, setBeetW] = useState(4)
  const [beetH, setBeetH] = useState(2)
  const [beetForm, setBeetForm] = useState('rechteck') // 'rechteck'|'oval'

  const filtered = useMemo(() => {
    const available = typeof filterPlants === 'function' ? filterPlants({
      licht, wasser, boden,
      types: types.length ? types : null,
      wuchsform: wuchsformen.length ? wuchsformen[0] : null,
      drainage,
      ph,
      searchTerm: search,
    }) : PLANTS
    return available.filter(p => {
      if (onlyHeimisch && !p.heimisch) return false
      if (onlyRaupen && !p.raupenfutter) return false
      if (onlyTagfalter && !p.tagfalter) return false
      if (onlyBienen && !p.bienen) return false
      return true
    })
  }, [licht, wasser, boden, types, wuchsformen, drainage, ph, search, onlyHeimisch, onlyRaupen, onlyTagfalter, onlyBienen])

  function addToPlan(plant) {
    setPlan(prev => {
      const ex = prev.find(p => p.id === plant.id)
      if (ex) return prev.map(p => p.id === plant.id ? { ...p, count: p.count + 1 } : p)
      return [...prev, { ...plant, count: 1 }]
    })
  }
  function setCount(id, count) {
    if (count <= 0) setPlan(prev => prev.filter(p => p.id !== id))
    else setPlan(prev => prev.map(p => p.id === id ? { ...p, count } : p))
  }

  const totalPlants = plan.reduce((s, p) => s + p.count, 0)
  const beetArea = beetForm === 'oval'
    ? Math.PI * (beetW / 2) * (beetH / 2)
    : beetW * beetH

  const cardBg = L ? '#fff' : SURFACE
  const shadow = L ? '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1.5px rgba(0,0,0,0.07)' : `0 0 0 1px ${BORDER}`

  const activeFilterCount = [licht, wasser, boden, drainage, ph, ...types, ...wuchsformen,
    onlyHeimisch && 'h', onlyRaupen && 'r', onlyTagfalter && 't', onlyBienen && 'b'
  ].filter(Boolean).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '12px 12px 0' : '16px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: A14, border: `1px solid ${A20}`, borderRadius: 8, padding: '5px 12px' }}>
              <Leaf size={12} color={A} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: L ? 700 : 400 }}>
                Pflanzplanung · {PLANTS.length} Arten
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <TabBtn label="🔍 Suchen" active={activeTab === 'suche'} onClick={() => setActiveTab('suche')} L={L} />
            <TabBtn label={`📋 Plan${totalPlants > 0 ? ` (${totalPlants})` : ''}`} active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} L={L} dot={totalPlants > 0 && activeTab !== 'plan'} />
            <TabBtn label="🌿 Beet" active={activeTab === 'beet'} onClick={() => setActiveTab('beet')} L={L} />
          </div>
        </div>
      </div>

      {/* ── TAB: SUCHE ─────────────────────────────────────────────────── */}
      {activeTab === 'suche' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Filter Panel */}
          <div style={{ padding: isMobile ? '0 12px' : '0 24px', flexShrink: 0 }}>
            <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden', boxShadow: L ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>

              {/* Filter header */}
              <div
                onClick={() => setFilterPanelOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <SlidersHorizontal size={13} color={MUTED} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: L ? 700 : 400, flex: 1 }}>
                  Filter {activeFilterCount > 0 && <span style={{ color: A }}>· {activeFilterCount} aktiv</span>}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A }}>
                  {filtered.length}/{PLANTS.length} Pflanzen
                </span>
                {filterPanelOpen ? <ChevronUp size={13} color={MUTED} /> : <ChevronDown size={13} color={MUTED} />}
              </div>

              {filterPanelOpen && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 16px' }}>
                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {[['standort', '📍 Standort'], ['biologie', '🐝 Biologie'], ['boden', '🌍 Boden & Art']].map(([k, l]) => (
                      <button key={k} onClick={() => setActiveFilters(k)} style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: activeFilters === k ? 700 : (L ? 500 : 400),
                        border: activeFilters === k ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
                        background: activeFilters === k ? A14 : 'transparent', color: activeFilters === k ? A : MUTED, cursor: 'pointer',
                      }}>{l}</button>
                    ))}
                  </div>

                  {/* STANDORT filters */}
                  {activeFilters === 'standort' && !isMobile && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                      <FilterGroup label="☀️ Licht" opts={LICHT_OPTS} selected={licht} onSelect={v => setLicht(licht === v ? null : v)} color="#d97706" L={L} isMobile={false} />
                      <FilterGroup label="💧 Wasser" opts={WASSER_OPTS} selected={wasser} onSelect={v => setWasser(wasser === v ? null : v)} color="#0ea5e9" L={L} isMobile={false} />
                      <FilterGroup label="🌍 Boden" opts={BODEN_OPTS} selected={boden} onSelect={v => setBoden(boden === v ? null : v)} color="#92400e" L={L} isMobile={false} />
                    </div>
                  )}
                  {/* Mobile: one group at a time via own sub-tabs */}
                  {activeFilters === 'standort' && isMobile && <MobileStandortFilter licht={licht} setLicht={setLicht} wasser={wasser} setWasser={setWasser} boden={boden} setBoden={setBoden} L={L} />}

                  {/* BIOLOGIE filters */}
                  {activeFilters === 'biologie' && (
                    <div style={{ display: 'flex', gap: isMobile ? 10 : 8, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                      <BioToggle label="🐝 Bienen" active={onlyBienen} onClick={() => setOnlyBienen(v => !v)} L={L} isMobile={isMobile} />
                      <BioToggle label="🦋 Tagfalter" active={onlyTagfalter} onClick={() => setOnlyTagfalter(v => !v)} L={L} isMobile={isMobile} />
                      <BioToggle label="🐛 Raupenfutter" active={onlyRaupen} onClick={() => setOnlyRaupen(v => !v)} L={L} isMobile={isMobile} />
                      <BioToggle label="🏡 Heimisch" active={onlyHeimisch} onClick={() => setOnlyHeimisch(v => !v)} L={L} isMobile={isMobile} />
                    </div>
                  )}

                  {/* BODEN & ART filters */}
                  {activeFilters === 'boden' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🧪 Drainage</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {DRAINAGE_OPTS.map(o => (
                            <button key={String(o.value)} onClick={() => setDrainage(drainage === o.value ? null : o.value)} style={{
                              padding: '6px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left', cursor: 'pointer',
                              fontWeight: drainage === o.value ? 700 : (L ? 500 : 400),
                              border: drainage === o.value ? `1.5px solid #92400e` : `1px solid ${BORDER}`,
                              background: drainage === o.value ? '#92400e14' : 'transparent',
                              color: drainage === o.value ? '#92400e' : MUTED,
                            }}>{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🌿 Typ</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {TYPE_OPTS.map(o => (
                            <TypeToggle key={o.value} label={o.label} active={types.includes(o.value)} onClick={() => setTypes(prev => prev.includes(o.value) ? prev.filter(t => t !== o.value) : [...prev, o.value])} L={L} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: L ? 'rgba(0,0,0,0.05)' : BG, borderRadius: 8, padding: '8px 12px', border: `1px solid ${BORDER}` }}>
                    <Search size={13} color={MUTED} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Name, Latein oder Art suchen..."
                      style={{ background: 'none', border: 'none', outline: 'none', color: FG, fontSize: 13, width: '100%' }}
                    />
                    {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 0 }}><X size={12} /></button>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plant Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 12px 24px' : '0 24px 24px' }}>
            {filtered.length === 0 ? (
              <EmptyState msg="Keine Pflanzen für diese Kombination 🌵" sub="Probiere andere Filter" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
                {filtered.map(plant => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    expanded={expandedPlant === plant.id}
                    onToggle={() => setExpandedPlant(expandedPlant === plant.id ? null : plant.id)}
                    onAdd={() => addToPlan(plant)}
                    inPlan={plan.find(p => p.id === plant.id)}
                    L={L} shadow={shadow} cardBg={cardBg}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: PLAN ──────────────────────────────────────────────────── */}
      {activeTab === 'plan' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px 24px' }}>
          {plan.length === 0 ? (
            <EmptyState msg="Plan ist noch leer 🌱" sub="Pflanzen suchen und hinzufügen" action={() => setActiveTab('suche')} actionLabel="Zur Suche →" />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
                <StatCard label="Pflanzen gesamt" value={totalPlants} emoji="🌱" color={A} L={L} shadow={shadow} />
                <StatCard label="Arten" value={plan.length} emoji="🔢" color="#8b5cf6" L={L} shadow={shadow} />
                <StatCard label="Heimisch" value={plan.filter(p => p.heimisch).length} emoji="🏡" color="#047A3C" L={L} shadow={shadow} />
                <StatCard label="Ø Nektar" value={plan.filter(p=>p.nektar).length ? (plan.reduce((s,p)=>s+(p.nektar||0),0)/plan.filter(p=>p.nektar).length).toFixed(1) : '–'} emoji="🍯" color="#d97706" L={L} shadow={shadow} />
                <StatCard label="Raupenfutter" value={plan.filter(p => p.raupenfutter).length} emoji="🐛" color="#10b981" L={L} shadow={shadow} />
              </div>

              {/* Blühkalender */}
              <BloomCalendar plan={plan} L={L} shadow={shadow} />

              {/* Plant Rows */}
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '16px 0 8px', fontWeight: L ? 700 : 400 }}>Pflanzliste</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {plan.map(p => (
                  <PlanRow key={p.id} plant={p} onAdd={() => addToPlan(p)} onRemove={() => setCount(p.id, p.count - 1)} L={L} shadow={shadow} cardBg={cardBg} />
                ))}
              </div>

              {/* Export */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => exportPlan(plan)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Download size={13} /> Plan exportieren (.txt)
                </button>
                <button onClick={() => setPlan([])} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Plan leeren
                </button>
                <button onClick={() => setActiveTab('beet')} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  🌿 Im Beet planen →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: BEETPLANER ────────────────────────────────────────────── */}
      {activeTab === 'beet' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px 24px' }}>
          <BeetPlaner
            plan={plan}
            beetW={beetW} setBeetW={setBeetW}
            beetH={beetH} setBeetH={setBeetH}
            beetForm={beetForm} setBeetForm={setBeetForm}
            beetArea={beetArea}
            L={L} shadow={shadow} cardBg={cardBg}
            onAddMore={() => setActiveTab('suche')}
          />
        </div>
      )}
    </div>
  )
}

/* ─── BLÜHKALENDER ──────────────────────────────────────────────────────── */
function BloomCalendar({ plan, L, shadow }) {
  return (
    <div style={{ background: L ? '#fff' : SURFACE, borderRadius: 12, padding: '16px 18px', boxShadow: shadow, marginBottom: 4 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, fontWeight: L ? 700 : 400 }}>📅 Blühkalender</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 3 }}>
        {MONTHS.map((m, mi) => {
          const mp = plan.filter(p => p.bluete_monate?.includes(mi + 1))
          const intensity = mp.length / Math.max(plan.length, 1)
          return (
            <div key={m} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: MUTED, marginBottom: 4, fontFamily: "'Space Mono', monospace", fontWeight: L ? 700 : 400 }}>{m}</div>
              <div style={{
                height: 32, borderRadius: 4,
                background: mp.length > 0
                  ? `linear-gradient(180deg, ${mp[0]?.bluete_farbe || A} 0%, ${mp[1]?.bluete_farbe || A} 100%)`
                  : (L ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'),
                opacity: mp.length > 0 ? 0.7 + intensity * 0.3 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {mp.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{mp.length}</span>}
              </div>
              <div style={{ fontSize: 8, color: mp.length > 0 ? A : MUTED, marginTop: 3, fontWeight: 700 }}>{mp.length > 0 ? mp.length : '·'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── BEETPLANER ─────────────────────────────────────────────────────────── */
function BeetPlaner({ plan, beetW, setBeetW, beetH, setBeetH, beetForm, setBeetForm, beetArea, L, shadow, cardBg, onAddMore }) {
  const canvasRef = useRef(null)

  // Calculate plant distribution
  const plantsWithPlacement = useMemo(() => {
    const result = []
    let x = 0, y = 0
    plan.forEach(plant => {
      const spacing = (plant.pflanzabstand || 40) / 100 // in meters
      for (let i = 0; i < plant.count; i++) {
        result.push({ ...plant, px: x, py: y })
        x += spacing
        if (x > beetW - spacing / 2) { x = 0; y += spacing }
      }
    })
    return result
  }, [plan, beetW])

  const totalNeeded = plan.reduce((s, p) => {
    const ppm = 1 / Math.pow((p.pflanzabstand || 40) / 100, 2)
    return s + Math.round(beetArea * ppm * (1 / plan.length))
  }, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const scaleX = W / beetW, scaleY = H / beetH

    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = L ? '#f0fdf4' : '#0e1c0f'
    if (beetForm === 'oval') {
      ctx.beginPath()
      ctx.ellipse(W / 2, H / 2, W / 2 - 2, H / 2 - 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = L ? 'rgba(4,122,60,0.4)' : 'rgba(16,185,129,0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.fillRect(2, 2, W - 4, H - 4)
      ctx.strokeStyle = L ? 'rgba(4,122,60,0.4)' : 'rgba(16,185,129,0.3)'
      ctx.lineWidth = 2
      ctx.strokeRect(2, 2, W - 4, H - 4)
    }

    // Grid lines
    ctx.strokeStyle = L ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let gx = 0; gx <= beetW; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * scaleX, 0); ctx.lineTo(gx * scaleX, H); ctx.stroke()
    }
    for (let gy = 0; gy <= beetH; gy++) {
      ctx.beginPath(); ctx.moveTo(0, gy * scaleY); ctx.lineTo(W, gy * scaleY); ctx.stroke()
    }

    // Plants
    plantsWithPlacement.forEach(p => {
      if (p.px > beetW || p.py > beetH) return
      const cx = p.px * scaleX + (p.pflanzabstand || 40) / 100 * scaleX / 2
      const cy = p.py * scaleY + (p.pflanzabstand || 40) / 100 * scaleY / 2
      const r = Math.max(4, ((p.ausbreitung || p.pflanzabstand || 40) / 100 * scaleX) / 2 - 2)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = (p.bluete_farbe || '#10b981') + 'cc'
      ctx.fill()
      ctx.strokeStyle = (p.bluete_farbe || '#10b981')
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [plantsWithPlacement, beetW, beetH, beetForm, L])

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
      {/* Beet Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: cardBg, borderRadius: 10, padding: '16px', boxShadow: shadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>📐 Beetgröße</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Breite (m)</div>
              <input type="number" min={0.5} max={20} step={0.5} value={beetW}
                onChange={e => setBeetW(+e.target.value)}
                style={{ width: '100%', background: L ? 'rgba(0,0,0,0.05)' : BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 10px', color: FG, fontSize: 14, fontWeight: 700 }} />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Tiefe (m)</div>
              <input type="number" min={0.5} max={20} step={0.5} value={beetH}
                onChange={e => setBeetH(+e.target.value)}
                style={{ width: '100%', background: L ? 'rgba(0,0,0,0.05)' : BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 10px', color: FG, fontSize: 14, fontWeight: 700 }} />
            </label>
          </div>
        </div>
        <div style={{ background: cardBg, borderRadius: 10, padding: '16px', boxShadow: shadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>🟢 Form</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['rechteck', '▬ Rechteck'], ['oval', '⬭ Oval']].map(([v, l]) => (
              <button key={v} onClick={() => setBeetForm(v)} style={{
                flex: 1, padding: '8px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: beetForm === v ? 700 : (L ? 500 : 400),
                border: beetForm === v ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
                background: beetForm === v ? A14 : 'transparent', color: beetForm === v ? A : MUTED,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ background: cardBg, borderRadius: 10, padding: '16px', boxShadow: shadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>📊 Fläche</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: A, letterSpacing: '-0.02em' }}>{beetArea.toFixed(1)} m²</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{plan.length > 0 ? `~${Math.round(beetArea * 3)} Pflanzen bei Ø30cm Abstand` : 'Pflanzen zum Plan hinzufügen'}</div>
        </div>
      </div>

      {plan.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={{ fontSize: 14, color: FG, marginBottom: 6, fontWeight: L ? 700 : 400 }}>Noch keine Pflanzen im Plan</div>
          <button onClick={onAddMore} style={{ background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Pflanzen suchen →</button>
        </div>
      ) : (
        <>
          {/* Canvas */}
          <div style={{ background: cardBg, borderRadius: 12, padding: 16, boxShadow: shadow, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }}>
              🗺️ Pflanzverteilung — {beetW}m × {beetH}m
            </div>
            <canvas
              ref={canvasRef}
              width={Math.min(800, beetW * 80)}
              height={Math.min(400, beetH * 80)}
              style={{ width: '100%', borderRadius: 8, display: 'block', maxHeight: 300 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {plan.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.bluete_farbe || A, flexShrink: 0 }} />
                  <span style={{ color: FG, fontWeight: L ? 600 : 400 }}>{p.name}</span>
                  <span style={{ color: MUTED }}>({p.count}×)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pflanzabstandstabelle */}
          <div style={{ background: cardBg, borderRadius: 12, padding: '16px 18px', boxShadow: shadow }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }}>
              📏 Pflanzabstände & Mengen
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {plan.map(p => {
                const spacing = p.pflanzabstand || 40
                const ppm = 1 / Math.pow(spacing / 100, 2)
                const rec = Math.round(beetArea * ppm * (1 / plan.length))
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.bluete_farbe || A, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: FG, fontWeight: L ? 600 : 400 }}>{p.name}</span>
                    <span style={{ color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 10 }}>Ø {spacing}cm</span>
                    <span style={{ color: A, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{p.count}×</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── PLANT CARD ─────────────────────────────────────────────────────────── */
function PlantCard({ plant: p, expanded, onToggle, onAdd, inPlan, L, shadow, cardBg }) {
  return (
    <div style={{ background: cardBg, borderRadius: 10, boxShadow: shadow, overflow: 'hidden' }}>
      <div style={{ height: 3, background: p.bluete_farbe || '#888', opacity: 0.75 }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 16 }}>{p.bild_emoji || '🌿'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              {p.heimisch && <span style={{ fontSize: 9, background: '#047A3C18', color: '#047A3C', border: '1px solid #047A3C30', padding: '1px 6px', borderRadius: 100, fontWeight: 700, flexShrink: 0 }}>heimisch</span>}
            </div>
            <div style={{ fontSize: 10, fontStyle: 'italic', color: MUTED, marginBottom: 8 }}>{p.latin}</div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 7 }}>
              <MBadge emoji="☀️" label={p.licht.map(l => LICHT_LABELS[l]).join('/')} L={L} />
              <MBadge emoji="💧" label={p.wasser.map(w => WASSER_LABELS[w]).join('/')} L={L} />
              <MBadge emoji="📏" label={`${p.hoehe[0]}–${p.hoehe[1]}cm`} L={L} />
              <MBadge emoji="🌸" label={`${MONTHS[p.bluete_monate[0]-1]}–${MONTHS[p.bluete_monate[p.bluete_monate.length-1]-1]}`} L={L} />
              {p.pflanzabstand && <MBadge emoji="↔️" label={`${p.pflanzabstand}cm`} L={L} />}
            </div>

            {/* Eco row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {p.bienen && <span title="Bienen">🐝</span>}
              {p.tagfalter && <span title="Tagfalter">🦋</span>}
              {p.nachtfalter && <span title="Nachtfalter">🌙</span>}
              {p.raupenfutter && <span title="Raupenfutterpflanze">🐛</span>}
              {p.kaefer && <span title="Käfer">🪲</span>}
              {p.voegel && <span title="Vögel">🐦</span>}
              <div style={{ marginLeft: 4, display: 'flex', gap: 1 }}>
                {[1,2,3,4,5].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: 1, background: i <= (p.nektar || p.insekten || 0) ? A : BORDER, opacity: i <= (p.nektar || p.insekten || 0) ? 1 : 0.35 }} />)}
              </div>
              <span style={{ fontSize: 9, color: MUTED }}>Nektar</span>
            </div>
          </div>

          {/* Add btn */}
          <button onClick={onAdd} style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: inPlan ? '#047A3C' : A14, border: `1px solid ${inPlan ? '#047A3C' : A20}`,
            color: inPlan ? '#fff' : A, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
          }}>{inPlan ? inPlan.count : <Plus size={13} />}</button>
        </div>

        {/* Toggle */}
        <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: MUTED, fontSize: 10, cursor: 'pointer', padding: '5px 0 0', marginTop: 2 }}>
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? 'Weniger' : 'Details'}
        </button>

        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, marginBottom: 8 }}>{p.beschreibung}</p>
            {p.raupenfutter && p.raupenfutter_arten?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>🐛 Raupenfutter für: </span>
                <span style={{ fontSize: 10, color: MUTED }}>{p.raupenfutter_arten.join(', ')}</span>
              </div>
            )}
            {p.ph_min && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>🧪 pH {p.ph_min}–{p.ph_max} · {p.drainage || '–'}</div>}
            <a href={p.naturadb_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: A, fontWeight: 600, textDecoration: 'none' }}>
              <ExternalLink size={11} /> naturaDB
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PLAN ROW ──────────────────────────────────────────────────────────── */
function PlanRow({ plant: p, onAdd, onRemove, L, shadow, cardBg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: cardBg, borderRadius: 9, padding: '10px 14px', boxShadow: shadow }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.bluete_farbe || A, flexShrink: 0, opacity: 0.85 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{p.name}</div>
        <div style={{ fontSize: 10, fontStyle: 'italic', color: MUTED }}>{p.latin}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, fontSize: 12 }}>
        {p.bienen && '🐝'}{p.tagfalter && '🦋'}{p.raupenfutter && '🐛'}{p.voegel && '🐦'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button onClick={onRemove} style={{ width: 24, height: 24, borderRadius: 6, background: 'none', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={11} />
        </button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: FG, minWidth: 20, textAlign: 'center' }}>{p.count}</span>
        <button onClick={onAdd} style={{ width: 24, height: 24, borderRadius: 6, background: A14, border: `1px solid ${A20}`, color: A, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={11} />
        </button>
      </div>
      <a href={p.naturadb_url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, display: 'flex' }}>
        <ExternalLink size={12} />
      </a>
    </div>
  )
}

/* ─── HELPERS ───────────────────────────────────────────────────────────── */
function TabBtn({ label, active, onClick, L, dot }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 8, fontSize: 12, position: 'relative',
      fontWeight: active ? 700 : (L ? 500 : 400),
      border: active ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
      background: active ? A14 : 'transparent', color: active ? A : MUTED, cursor: 'pointer',
    }}>
      {label}
      {dot && <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#047A3C' }} />}
    </button>
  )
}

function MobileStandortFilter({ licht, setLicht, wasser, setWasser, boden, setBoden, L }) {
  const [sub, setSub] = useState('licht')
  const groups = [
    { id: 'licht', label: '☀️ Licht', opts: LICHT_OPTS, val: licht, set: v => setLicht(licht === v ? null : v), color: '#d97706', active: licht != null },
    { id: 'wasser', label: '💧 Wasser', opts: WASSER_OPTS, val: wasser, set: v => setWasser(wasser === v ? null : v), color: '#0ea5e9', active: wasser != null },
    { id: 'boden', label: '🌍 Boden', opts: BODEN_OPTS, val: boden, set: v => setBoden(boden === v ? null : v), color: '#92400e', active: boden != null },
  ]
  const active = groups.find(g => g.id === sub)
  return (
    <div>
      {/* Sub-tab strip */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {groups.map(g => (
          <button key={g.id} onClick={() => setSub(g.id)} style={{
            flex: 1, padding: '10px 6px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: sub === g.id ? 700 : 500,
            border: sub === g.id ? `2px solid ${g.color}` : `1.5px solid ${BORDER}`,
            background: sub === g.id ? `${g.color}12` : 'transparent',
            color: sub === g.id ? g.color : MUTED,
            position: 'relative',
          }}>
            {g.label}
            {g.active && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: g.color }} />}
          </button>
        ))}
      </div>
      {/* Current group options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {active.opts.map(o => {
          const isActive = active.val === o.value
          return (
            <button key={o.value} onClick={() => active.set(o.value)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 10, fontSize: 15, minHeight: 52,
              textAlign: 'left', cursor: 'pointer', width: '100%', fontWeight: isActive ? 700 : 500,
              border: isActive ? `2px solid ${active.color}` : `1.5px solid ${BORDER}`,
              background: isActive ? `${active.color}12` : 'transparent',
              color: isActive ? active.color : FG,
            }}>
              <span style={{ fontSize: 22 }}>{o.emoji}</span>
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.desc && <span style={{ fontSize: 11, color: MUTED }}>{o.desc}</span>}
              {isActive && <span style={{ fontSize: 16, color: active.color }}>✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FilterGroup({ label, opts, selected, onSelect, color, L, isMobile }) {
  if (isMobile) {
    // NaturaDB-style: large radio buttons stacked vertically
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opts.map(o => {
            const active = selected === o.value
            return (
              <button key={o.value} onClick={() => onSelect(o.value)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', borderRadius: 10, fontSize: 14,
                textAlign: 'left', cursor: 'pointer', width: '100%', minHeight: 52,
                fontWeight: active ? 700 : 500,
                border: active ? `2px solid ${color}` : `1.5px solid ${BORDER}`,
                background: active ? `${color}12` : 'transparent',
                color: active ? color : FG,
              }}>
                <span style={{ fontSize: 20 }}>{o.emoji}</span>
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.desc && <span style={{ fontSize: 11, color: MUTED }}>{o.desc}</span>}
                {active && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {opts.map(o => (
          <button key={o.value} onClick={() => onSelect(o.value)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', borderRadius: 7, fontSize: 12,
            textAlign: 'left', cursor: 'pointer', width: '100%',
            fontWeight: selected === o.value ? 700 : (L ? 500 : 400),
            border: selected === o.value ? `1.5px solid ${color}` : `1px solid ${BORDER}`,
            background: selected === o.value ? `${color}12` : 'transparent',
            color: selected === o.value ? color : MUTED,
          }}>
            <span>{o.emoji}</span>
            <span style={{ flex: 1 }}>{o.label}</span>
            {o.desc && <span style={{ fontSize: 9, opacity: 0.6 }}>{o.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function BioToggle({ label, active, onClick, L, isMobile }) {
  if (isMobile) {
    return (
      <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 10, fontSize: 15, cursor: 'pointer',
        width: '100%', minHeight: 52, textAlign: 'left',
        fontWeight: active ? 700 : 500,
        border: active ? `2px solid ${A}` : `1.5px solid ${BORDER}`,
        background: active ? A14 : 'transparent', color: active ? A : FG,
      }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${active ? A : BORDER}`, background: active ? A : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {active && <span style={{ color: '#001219', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>✓</span>}
        </div>
        {label}
      </button>
    )
  }
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
      fontWeight: active ? 700 : (L ? 500 : 400),
      border: active ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
      background: active ? A14 : 'transparent', color: active ? A : MUTED,
    }}>{label}</button>
  )
}

function TypeToggle({ label, active, onClick, L }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', textAlign: 'left',
      fontWeight: active ? 700 : (L ? 500 : 400),
      border: active ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
      background: active ? A14 : 'transparent', color: active ? A : MUTED,
    }}>{label}</button>
  )
}

function MBadge({ emoji, label, L }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, color: MUTED,
      fontWeight: L ? 600 : 400, background: L ? 'rgba(0,0,0,0.05)' : BG,
      padding: '2px 6px', borderRadius: 100, border: L ? '1px solid rgba(0,0,0,0.07)' : 'none',
    }}><span>{emoji}</span>{label}</span>
  )
}

function StatCard({ label, value, emoji, color, L, shadow }) {
  return (
    <div style={{ background: L ? '#fff' : SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '13px 14px', textAlign: 'center', boxShadow: L ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, fontWeight: L ? 600 : 400, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function EmptyState({ msg, sub, action, actionLabel }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: MUTED, gap: 8, padding: '40px 0' }}>
      <div style={{ fontSize: 40 }}>🌵</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>{msg}</div>
      <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
      {action && <button onClick={action} style={{ marginTop: 8, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{actionLabel}</button>}
    </div>
  )
}

function exportPlan(plan) {
  const lines = [
    'PFLANZPLAN — LUMA BIOME',
    '='.repeat(50), '',
    'PFLANZLISTE:',
    ...plan.map(p => `  ${p.count}x  ${p.name} (${p.latin})\n       Licht: ${p.licht.map(l => LICHT_LABELS[l]).join('/')} | Wasser: ${p.wasser.map(w => WASSER_LABELS[w]).join('/')} | Abstand: ${p.pflanzabstand || 40}cm`),
    '',
    `GESAMT: ${plan.reduce((s, p) => s + p.count, 0)} Pflanzen (${plan.length} Arten)`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'pflanzplan-luma.txt'
  a.click()
}
