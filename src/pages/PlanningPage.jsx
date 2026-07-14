import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { useOps } from '../context/OpsContext.jsx'
import { PLANTS, filterPlants, LICHT_LABELS, WASSER_LABELS, BODEN_LABELS, TYPE_LABELS, MONTHS, DRAINAGE_LABELS, WUCHSFORM_LABELS } from '../data/plants.js'
import { HABITATS, filterHabitats, HABITAT_KATEGORIE_LABELS, HABITAT_KATEGORIE_EMOJI, HABITAT_ZIEL_LABELS } from '../data/habitats.js'
import {
  Leaf, Search, Plus, Minus, ExternalLink, X, ChevronDown, ChevronUp,
  Filter, Download, SlidersHorizontal, Ruler, Grid3x3, Info,
  Sun, Droplets, FlaskConical, Bug, Bird, Flower, Sprout, TreePine,
} from 'lucide-react'

/* ─── PFLANZPLAN STATUS ─────────────────────────────────────────────────── */
const STATUS_LABELS = {
  planung: 'Planung',
  pdf_erstellt: 'PDF erstellt',
  bestellung: 'Bestellt',
  bestellung_bestaetigt: 'Bestätigt',
  pflanzung_laufend: 'Pflanzung',
  wachstum: 'Wachstum',
  maintenance: 'Pflege',
}
const STATUS_COLORS = {
  planung:                { bg: '#e0f2fe', fg: '#0369a1' },
  pdf_erstellt:           { bg: '#fef9c3', fg: '#854d0e' },
  bestellung:             { bg: '#fed7aa', fg: '#9a3412' },
  bestellung_bestaetigt:  { bg: '#bbf7d0', fg: '#065f46' },
  pflanzung_laufend:      { bg: '#d1fae5', fg: '#047857' },
  wachstum:               { bg: '#dcfce7', fg: '#15803d' },
  maintenance:            { bg: '#f0fdf4', fg: '#166534' },
}

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
  const { projects = [], updateProject, pflanzplaene = [], createPflanzplan, updatePflanzplan, deletePflanzplan } = useOps()
  const location = useLocation()

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
  const [filterPanelOpen, setFilterPanelOpen] = useState(() => window.innerWidth >= 768)
  const [activeFilters, setActiveFilters] = useState('standort') // 'standort'|'biologie'|'boden'

  // ── Plan
  const [plan, setPlan] = useState([])
  const [activeTab, setActiveTab] = useState('suche')
  const [saveProjectId, setSaveProjectId] = useState('')
  const [savedToProject, setSavedToProject] = useState(false)
  const [sheetPlant, setSheetPlant] = useState(null) // Steckbrief-Sheet
  const [planTitel, setPlanTitel] = useState('')
  const [savedPlanId, setSavedPlanId] = useState(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [showSavedPlans, setShowSavedPlans] = useState(false)

  // ── Beetplaner
  const [beetW, setBeetW] = useState(4)
  const [beetH, setBeetH] = useState(2)
  const [beetForm, setBeetForm] = useState('rechteck') // 'rechteck'|'oval'
  const [fromMapFeature, setFromMapFeature] = useState(null)

  // ── Habitate (Habitatelemente)
  const [habitatPlan, setHabitatPlan] = useState([])
  const [catalogMode, setCatalogMode] = useState('pflanzen') // 'pflanzen'|'habitate'
  const [habCat, setHabCat] = useState(null)      // Kategorie-Filter
  const [habSearch, setHabSearch] = useState('')
  const [sheetHabitat, setSheetHabitat] = useState(null)

  // Pre-fill from map navigation state
  useEffect(() => {
    const state = location.state
    if (!state?.fromMapFeature) return
    const { area_m2, label, feature_id } = state.fromMapFeature
    if (area_m2 > 0) {
      // Derive beet dimensions: assume 2:1 ratio
      const w = Math.round(Math.sqrt(area_m2 * 2) * 10) / 10
      const h = Math.round((area_m2 / w) * 10) / 10
      setBeetW(w)
      setBeetH(h)
      setActiveTab('plan')
    }
    setFromMapFeature(state.fromMapFeature)
  }, [location.state])

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

  function addHabitat(h) {
    setHabitatPlan(prev => {
      const ex = prev.find(x => x.id === h.id)
      if (ex) return prev.map(x => x.id === h.id ? { ...x, count: x.count + 1 } : x)
      return [...prev, { ...h, count: 1 }]
    })
  }
  function setHabitatCount(id, count) {
    if (count <= 0) setHabitatPlan(prev => prev.filter(x => x.id !== id))
    else setHabitatPlan(prev => prev.map(x => x.id === id ? { ...x, count } : x))
  }

  const totalPlants = plan.reduce((s, p) => s + p.count, 0)
  const totalHabitats = habitatPlan.reduce((s, h) => s + h.count, 0)

  async function savePlanToProject() {
    if (!saveProjectId || !updateProject) return
    const payload = plan.map(p => ({ id: p.id, name: p.name, count: p.count }))
    await updateProject(saveProjectId, { plant_plan: payload })
    setSavedToProject(true)
    setTimeout(() => setSavedToProject(false), 2500)
  }

  async function savePflanzplan() {
    if (!plan.length && !habitatPlan.length) return
    setSavingPlan(true)
    try {
      const positionen = plan.map(p => ({
        id: p.id, name: p.name, latin: p.latin, count: p.count,
        pflanzabstand: p.pflanzabstand, bluete_farbe: p.bluete_farbe,
        bluete_monate: p.bluete_monate, heimisch: p.heimisch,
        nektar: p.nektar, raupenfutter: p.raupenfutter,
      }))
      const habitate = habitatPlan.map(h => ({
        id: h.id, name: h.name, kategorie: h.kategorie, count: h.count, bild_emoji: h.bild_emoji,
        flaeche_m2: h.flaeche_m2, aufwand_h: h.aufwand_h, jahreszeit: h.jahreszeit,
        material: h.material, pflege_intervall_monate: h.pflege_intervall_monate, pflege_hinweis: h.pflege_hinweis,
      }))
      const data = {
        titel: planTitel || `Plan ${new Date().toLocaleDateString('de-DE')}`,
        status: 'planung',
        positionen,
        habitate,
        flaeche_m2: beetArea || null,
        beet_w: beetW, beet_h: beetH, beet_form: beetForm,
        projekt_id: saveProjectId || null,
        standort_id: fromMapFeature?.feature_id || null,
      }
      if (savedPlanId) {
        updatePflanzplan(savedPlanId, {
          positionen, habitate, titel: data.titel,
          flaeche_m2: data.flaeche_m2, beet_w: beetW, beet_h: beetH, beet_form: beetForm,
          updated_at: new Date().toISOString(),
        })
      } else {
        const saved = await createPflanzplan(data)
        setSavedPlanId(saved.id)
      }
      setSavedToProject(true)
      setTimeout(() => setSavedToProject(false), 2500)
    } finally {
      setSavingPlan(false)
    }
  }

  function loadPflanzplan(pp) {
    if (!pp?.positionen?.length && !pp?.habitate?.length) return
    const restored = (pp.positionen || []).map(pos => {
      const base = PLANTS.find(p => p.id === pos.id) || {}
      return { ...base, ...pos }
    })
    setPlan(restored)
    const restoredHab = (pp.habitate || []).map(pos => {
      const base = HABITATS.find(h => h.id === pos.id) || {}
      return { ...base, ...pos }
    })
    setHabitatPlan(restoredHab)
    setPlanTitel(pp.titel || '')
    setSavedPlanId(pp.id)
    if (pp.beet_w) setBeetW(pp.beet_w)
    if (pp.beet_h) setBeetH(pp.beet_h)
    if (pp.beet_form) setBeetForm(pp.beet_form)
    setActiveTab('plan')
    setShowSavedPlans(false)
  }
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

      {/* ── MAP FEATURE BANNER ──────────────────────────────────────────── */}
      {fromMapFeature && (
        <div style={{ background: '#22c55e18', borderBottom: `1px solid #22c55e30`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>🗺️</span>
          <span style={{ fontSize: 12, color: '#22c55e', fontFamily: "'Space Grotesk', sans-serif" }}>
            <b>{fromMapFeature.label}</b> aus der Karte · {fromMapFeature.area_m2?.toFixed(1)} m² vorbelegt
          </span>
          <button onClick={() => setFromMapFeature(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '12px 12px 0' : '16px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: A14, border: `1px solid ${A20}`, borderRadius: 8, padding: '5px 12px' }}>
              <Leaf size={12} color={A} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: L ? 700 : 400 }}>
                Florales™ · {PLANTS.length} Arten
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
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 16px', maxHeight: isMobile ? '45vh' : undefined, overflowY: isMobile ? 'auto' : undefined }}>
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

          {/* Plant Grid / List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 12px 24px' : '0 24px 24px' }}>
            {filtered.length === 0 ? (
              <EmptyState msg="Keine Pflanzen für diese Kombination 🌵" sub="Probiere andere Filter" />
            ) : isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map(plant => (
                  <PlantListRow
                    key={plant.id}
                    plant={plant}
                    onTap={() => setSheetPlant(plant)}
                    onAdd={() => addToPlan(plant)}
                    onRemove={() => setCount(plant.id, (plan.find(p => p.id === plant.id)?.count || 1) - 1)}
                    inPlan={plan.find(p => p.id === plant.id)}
                    L={L} shadow={shadow} cardBg={cardBg}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
                {filtered.map(plant => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onTap={() => setSheetPlant(plant)}
                    onAdd={() => addToPlan(plant)}
                    onRemove={() => setCount(plant.id, (plan.find(p => p.id === plant.id)?.count || 1) - 1)}
                    inPlan={plan.find(p => p.id === plant.id)}
                    isMobile={isMobile}
                    L={L} shadow={shadow} cardBg={cardBg}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mobile Steckbrief Sheet */}
          {sheetPlant && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={() => setSheetPlant(null)}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
              <div onClick={e => e.stopPropagation()} style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: SURFACE, borderRadius: '20px 20px 0 0',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
              }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER }} />
                </div>
                {/* Scrollable content */}
                <div style={{ overflowY: 'auto', padding: '0 20px 40px' }}>
                  {/* Color bar */}
                  <div style={{ height: 4, background: sheetPlant.bluete_farbe || A, borderRadius: 2, marginBottom: 16, opacity: 0.8 }} />
                  {/* Plant image gallery */}
                  <PlantGallery plant={sheetPlant} />
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: FG }}>{sheetPlant.name}</div>
                      <div style={{ fontSize: 11, fontStyle: 'italic', color: MUTED }}>{sheetPlant.latin}</div>
                    </div>
                    {sheetPlant.heimisch && <span style={{ marginLeft: 'auto', fontSize: 9, background: '#047A3C18', color: '#047A3C', border: '1px solid #047A3C30', padding: '3px 8px', borderRadius: 100, fontWeight: 700 }}>heimisch</span>}
                  </div>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '12px 0' }}>
                    <MBadge emoji="☀️" label={sheetPlant.licht.map(l => LICHT_LABELS[l]).join('/')} L={L} />
                    <MBadge emoji="💧" label={sheetPlant.wasser.map(w => WASSER_LABELS[w]).join('/')} L={L} />
                    <MBadge emoji="📏" label={`${sheetPlant.hoehe[0]}–${sheetPlant.hoehe[1]}cm`} L={L} />
                    <MBadge emoji="🌸" label={`${MONTHS[sheetPlant.bluete_monate[0]-1]}–${MONTHS[sheetPlant.bluete_monate[sheetPlant.bluete_monate.length-1]-1]}`} L={L} />
                    {sheetPlant.pflanzabstand && <MBadge emoji="↔️" label={`${sheetPlant.pflanzabstand}cm`} L={L} />}
                    {sheetPlant.ph_min && <MBadge emoji="🧪" label={`pH ${sheetPlant.ph_min}–${sheetPlant.ph_max}`} L={L} />}
                  </div>
                  {/* Eco row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }}>
                    {sheetPlant.bienen && <span style={{ fontSize: 18 }} title="Bienen">🐝</span>}
                    {sheetPlant.tagfalter && <span style={{ fontSize: 18 }} title="Tagfalter">🦋</span>}
                    {sheetPlant.nachtfalter && <span style={{ fontSize: 18 }} title="Nachtfalter">🌙</span>}
                    {sheetPlant.raupenfutter && <span style={{ fontSize: 18 }} title="Raupenfutterpflanze">🐛</span>}
                    {sheetPlant.kaefer && <span style={{ fontSize: 18 }} title="Käfer">🪲</span>}
                    {sheetPlant.voegel && <span style={{ fontSize: 18 }} title="Vögel">🐦</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
                      {[1,2,3,4,5].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: i <= (sheetPlant.nektar || 0) ? A : BORDER, opacity: i <= (sheetPlant.nektar || 0) ? 1 : 0.3 }} />)}
                      <span style={{ fontSize: 10, color: MUTED, marginLeft: 4 }}>Nektar</span>
                    </div>
                  </div>
                  {/* Description */}
                  <p style={{ fontSize: 14, color: FG, lineHeight: 1.7, marginBottom: 12 }}>{sheetPlant.beschreibung}</p>
                  {/* Raupenfutter */}
                  {sheetPlant.raupenfutter && sheetPlant.raupenfutter_arten?.length > 0 && (
                    <div style={{ background: '#10b98112', border: '1px solid #10b98130', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>🐛 Raupenfutterpflanze für:</div>
                      <div style={{ fontSize: 12, color: FG }}>{sheetPlant.raupenfutter_arten.join(' · ')}</div>
                    </div>
                  )}
                  {/* Links */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <a href={`https://de.wikipedia.org/wiki/${sheetPlant.latin.replace(/ /g,'_')}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: A, fontWeight: 600, textDecoration: 'none', padding: '7px 14px', borderRadius: 8, background: A14, border: `1px solid color-mix(in srgb, ${A} 19%, transparent)` }}>
                      <ExternalLink size={12} /> Wikipedia
                    </a>
                    <a href={`https://www.floraweb.de/pflanzenarten/suche.xsql?taxname=${encodeURIComponent(sheetPlant.latin)}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: MUTED, fontWeight: 600, textDecoration: 'none', padding: '7px 14px', borderRadius: 8, background: BORDER + '40', border: `1px solid ${BORDER}` }}>
                      <ExternalLink size={12} /> FloraWeb
                    </a>
                  </div>
                  {/* Add button */}
                  <button onClick={() => { addToPlan(sheetPlant); setSheetPlant(null) }}
                    className="lu-btn-primary" style={{ width: '100%', padding: '14px', borderRadius: 12, background: A, border: 'none', color: 'var(--luma-on-a)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    + Zum Plan hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}
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
                <button onClick={() => {
                  exportPdf(plan, { label: fromMapFeature?.label, beetArea, beetW, beetH })
                  if (savedPlanId) updatePflanzplan(savedPlanId, { status: 'pdf_erstellt' })
                }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#052e16', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  <Download size={13} /> Baumschul-PDF
                </button>
                <button onClick={() => exportPlan(plan)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Download size={13} /> .txt
                </button>
                <button onClick={() => setPlan([])} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Plan leeren
                </button>
                <button onClick={() => setActiveTab('beet')} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  🌿 Im Beet planen →
                </button>
              </div>

              {/* Save Plan */}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={planTitel}
                    onChange={e => setPlanTitel(e.target.value)}
                    placeholder={`Plan ${new Date().toLocaleDateString('de-DE')}`}
                    style={{ flex: 1, minWidth: 160, background: L ? '#fff' : SURFACE, border: `1px solid ${BORDER}`, color: FG, borderRadius: 8, padding: '9px 12px', fontSize: 13 }}
                  />
                  <button
                    onClick={savePflanzplan}
                    disabled={plan.length === 0 || savingPlan}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: plan.length ? '#052e16' : (L ? '#e5e7eb' : '#1e2a32'), border: 'none', color: plan.length ? '#fff' : MUTED, borderRadius: 8, padding: '9px 18px', cursor: plan.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {savedToProject ? '✓ Gespeichert' : savingPlan ? '...' : savedPlanId ? '💾 Aktualisieren' : '💾 Plan speichern'}
                  </button>
                  {pflanzplaene.length > 0 && (
                    <button
                      onClick={() => setShowSavedPlans(v => !v)}
                      style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13 }}
                    >
                      📂 {pflanzplaene.length} gespeichert
                    </button>
                  )}
                </div>

                {/* Saved Plans List */}
                {showSavedPlans && pflanzplaene.length > 0 && (
                  <div style={{ background: L ? '#f9fafb' : '#0f1a22', border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                    {pflanzplaene.map(pp => (
                      <div key={pp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onClick={() => loadPflanzplan(pp)}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: STATUS_COLORS[pp.status]?.bg || A14, color: STATUS_COLORS[pp.status]?.fg || A }}>{STATUS_LABELS[pp.status] || pp.status}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: FG }}>{pp.titel}</span>
                        <span style={{ fontSize: 11, color: MUTED }}>{pp.positionen?.length || 0} Arten</span>
                        <button onClick={e => { e.stopPropagation(); deletePflanzplan(pp.id); if (savedPlanId === pp.id) setSavedPlanId(null) }} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 15, padding: '0 2px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status updater for active plan */}
                {savedPlanId && (() => {
                  const activePlan = pflanzplaene.find(p => p.id === savedPlanId)
                  if (!activePlan) return null
                  const statusList = ['planung','pdf_erstellt','bestellung','bestellung_bestaetigt','pflanzung_laufend','wachstum','maintenance']
                  const curIdx = statusList.indexOf(activePlan.status)
                  return (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: MUTED }}>Status:</span>
                      {statusList.map((s, i) => (
                        <button key={s} onClick={() => updatePflanzplan(savedPlanId, { status: s })}
                          style={{ fontSize: 11, fontWeight: i === curIdx ? 700 : 400, padding: '3px 9px', borderRadius: 20, border: `1px solid ${i === curIdx ? A : BORDER}`, background: i === curIdx ? A14 : 'transparent', color: i === curIdx ? A : MUTED, cursor: 'pointer' }}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* Attach to project */}
                {projects.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={saveProjectId}
                      onChange={e => { setSaveProjectId(e.target.value); setSavedToProject(false) }}
                      style={{ flex: 1, minWidth: 180, background: L ? '#fff' : SURFACE, border: `1px solid ${BORDER}`, color: FG, borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}
                    >
                      <option value="">— Projekt verknüpfen —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
            label={fromMapFeature?.label}
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
function BeetPlaner({ plan, beetW, setBeetW, beetH, setBeetH, beetForm, setBeetForm, beetArea, L, shadow, cardBg, onAddMore, label }) {
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

  function exportPng() {
    const DPR = 2
    const LEGEND_H = Math.max(80, plan.length * 22 + 60)
    const HEADER_H = 56
    const SCALE_H = 36
    const BED_W = Math.min(800, beetW * 80)
    const BED_H = Math.min(400, beetH * 80)
    const TOT_W = BED_W + 80 // padding left+right
    const TOT_H = HEADER_H + BED_H + SCALE_H + LEGEND_H + 24

    const oc = document.createElement('canvas')
    oc.width = TOT_W * DPR
    oc.height = TOT_H * DPR
    const ctx = oc.getContext('2d')
    ctx.scale(DPR, DPR)

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, TOT_W, TOT_H)

    // Header bar
    ctx.fillStyle = '#052e16'
    ctx.fillRect(0, 0, TOT_W, HEADER_H)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('PFLANZPLAN — LUMA BIOME', 20, 24)
    const planTitle = label || `${beetW}m × ${beetH}m · ${plan.length} Arten`
    ctx.font = '11px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillText(planTitle, 20, 42)
    // Date top right
    ctx.textAlign = 'right'
    ctx.fillText(new Date().toLocaleDateString('de-DE'), TOT_W - 20, 42)
    ctx.textAlign = 'left'

    // Draw bed on offscreen sub-canvas first, then blit
    const bedCanvas = canvasRef.current
    if (bedCanvas) {
      ctx.drawImage(bedCanvas, 40, HEADER_H + 8, BED_W, BED_H)
    }

    // Scale bar
    const sbY = HEADER_H + BED_H + 12
    const meterPx = BED_W / beetW // pixels per meter in output canvas
    const scaleM = beetW >= 4 ? 2 : 1
    const scalePx = meterPx * scaleM
    ctx.fillStyle = '#333'
    ctx.font = '10px monospace'
    ctx.fillText(`${scaleM}m`, 40 + scalePx + 4, sbY + 12)
    ctx.fillStyle = '#052e16'
    ctx.fillRect(40, sbY + 4, scalePx, 4)
    ctx.fillStyle = '#fff'
    ctx.fillRect(40 + scalePx / 2, sbY + 4, scalePx / 2, 4)
    // tick marks
    ctx.fillStyle = '#052e16'
    ctx.fillRect(40, sbY, 2, 12)
    ctx.fillRect(40 + scalePx, sbY, 2, 12)

    // Legend
    const lgY = sbY + SCALE_H
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, lgY, TOT_W, LEGEND_H)
    ctx.strokeStyle = '#e2e8e2'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, lgY); ctx.lineTo(TOT_W, lgY); ctx.stroke()

    ctx.fillStyle = '#052e16'
    ctx.font = 'bold 10px monospace'
    ctx.fillText('LEGENDE', 20, lgY + 18)

    const totalPlants = plan.reduce((s, p) => s + p.count, 0)
    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'right'
    ctx.fillText(`${totalPlants} Pflanzen gesamt · ${beetArea.toFixed(1)} m²`, TOT_W - 20, lgY + 18)
    ctx.textAlign = 'left'

    plan.forEach((p, i) => {
      const lx = 20
      const ly = lgY + 32 + i * 22
      ctx.beginPath()
      ctx.arc(lx + 7, ly - 4, 7, 0, Math.PI * 2)
      ctx.fillStyle = p.bluete_farbe || '#10b981'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.fillStyle = '#111'
      ctx.font = '600 11px sans-serif'
      ctx.fillText(p.name, lx + 20, ly)
      ctx.fillStyle = '#555'
      ctx.font = '10px sans-serif'
      ctx.fillText(`${p.latin}`, lx + 20 + ctx.measureText(p.name + ' ').width + 2, ly)
      ctx.fillStyle = '#047a3c'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${p.count}×`, TOT_W - 60, ly)
      ctx.fillStyle = '#999'
      ctx.font = '9px monospace'
      ctx.fillText(`Ø${p.pflanzabstand || 40}cm`, TOT_W - 20, ly)
      ctx.textAlign = 'left'
    })

    oc.toBlob(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `pflanzplan-luma-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    }, 'image/png')
  }

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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
              {plan.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.bluete_farbe || A, flexShrink: 0 }} />
                  <span style={{ color: FG, fontWeight: L ? 600 : 400 }}>{p.name}</span>
                  <span style={{ color: MUTED }}>({p.count}×)</span>
                </div>
              ))}
              <button onClick={exportPng} style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                background: A14, border: `1px solid ${A20}`, color: A,
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}>
                <Download size={12} /> PNG exportieren
              </button>
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
/* ─── PLANT IMAGE + GALLERY ─────────────────────────────────────────────── */
async function fetchMoreWikiImages(latin, primaryUrl) {
  const t = encodeURIComponent(latin.replace(/ /g, '_'))
  try {
    const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${t}&prop=images&format=json&origin=*&imlimit=20`)
    if (!r.ok) return [primaryUrl]
    const d = await r.json()
    const page = Object.values(d?.query?.pages || {})[0]
    if (!page?.images) return [primaryUrl]

    const candidates = page.images
      .map(i => i.title)
      .filter(t => /\.(jpg|jpeg|png)$/i.test(t))
      .filter(t => !/Flag_|Icon_|Logo_|Map_|Stub_|Pictogram|Symbol|Arrow|Button|Disambig/i.test(t))
      .slice(0, 10)

    if (!candidates.length) return [primaryUrl]

    const r2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${candidates.map(c => encodeURIComponent(c)).join('|')}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`)
    if (!r2.ok) return [primaryUrl]
    const d2 = await r2.json()
    const extraUrls = Object.values(d2?.query?.pages || {})
      .map(p => p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url)
      .filter(Boolean)
      .filter(u => u !== primaryUrl && u.includes('wikimedia'))

    return [primaryUrl, ...extraUrls].slice(0, 5)
  } catch {
    return [primaryUrl]
  }
}

function PlantImage({ plant }) {
  const [error, setError] = useState(false)
  if (!plant.wiki_img || error) return (
    <div style={{ width: '100%', height: 60, background: BORDER, borderRadius: 8, opacity: 0.12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, opacity: 0.4 }}>Kein Bild</span>
    </div>
  )
  return (
    <img src={plant.wiki_img} alt={plant.latin}
      style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 12, display: 'block' }}
      onError={() => setError(true)} />
  )
}

function PlantGallery({ plant }) {
  const [images, setImages] = useState(plant.wiki_img ? [plant.wiki_img] : [])
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(null)

  useEffect(() => {
    if (!plant.wiki_img) return
    fetchMoreWikiImages(plant.latin, plant.wiki_img).then(imgs => setImages(imgs))
  }, [plant.latin, plant.wiki_img])

  const prev = () => setIdx(i => (i - 1 + images.length) % images.length)
  const next = () => setIdx(i => (i + 1) % images.length)

  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = e => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -40) next()
    else if (dx > 40) prev()
    touchStartX.current = null
  }

  const handleImgError = () => {
    setImages(imgs => {
      const next = imgs.filter((_, i) => i !== idx)
      return next.length ? next : []
    })
    setIdx(i => Math.max(0, i - 1))
  }

  if (images.length === 0) return (
    <div style={{ width: '100%', height: 200, background: BORDER, borderRadius: 12, opacity: 0.12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>Kein Bild verfügbar</span>
    </div>
  )

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img src={images[idx]} alt={plant.latin}
          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
          onError={handleImgError} />
        {images.length > 1 && (
          <>
            <button onClick={prev}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={next}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: '2px 8px', fontSize: 11, color: '#fff' }}>
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
          {images.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)}
              style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? A : BORDER, cursor: 'pointer', transition: 'width 0.2s ease' }} />
          ))}
        </div>
      )}
    </div>
  )
}

function CardThumb({ plant: p, compact }) {
  const [error, setError] = useState(false)
  const h = compact ? 52 : 110
  const w = compact ? 52 : '100%'
  if (!p.wiki_img || error) return (
    <div style={{ width: w, height: h, flexShrink: 0, background: p.bluete_farbe ? p.bluete_farbe + '22' : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: compact ? 20 : 36, height: compact ? 20 : 36, borderRadius: '50%', background: p.bluete_farbe || A, opacity: 0.5 }} />
    </div>
  )
  return (
    <img src={p.wiki_img} alt={p.latin}
      style={{ width: w, height: h, flexShrink: 0, objectFit: 'cover', display: 'block' }}
      onError={() => setError(true)} />
  )
}

function PlantCard({ plant: p, onTap, onAdd, onRemove, inPlan, isMobile, L, shadow, cardBg }) {
  return (
    <div onClick={onTap} style={{ background: cardBg, borderRadius: 10, boxShadow: shadow, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ position: 'relative' }}>
        <CardThumb plant={p} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(0,0,0,0.45))' }} />
        {inPlan ? (
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={onRemove} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={11} /></button>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#fff', minWidth: 14, textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{inPlan.count}</span>
            <button onClick={onAdd} style={{ width: 24, height: 24, borderRadius: 6, background: '#047A3C', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={11} /></button>
          </div>
        ) : (
          <button onClick={e => { e.stopPropagation(); onAdd() }} style={{
            position: 'absolute', top: 8, right: 8,
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(0,0,0,0.45)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Plus size={13} /></button>
        )}
        <div style={{ position: 'absolute', bottom: 6, left: 10, right: 44, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{p.name}</div>
        </div>
      </div>
      <div style={{ height: 2, background: p.bluete_farbe || '#888', opacity: 0.7 }} />
      <div style={{ padding: '10px 13px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <div style={{ fontSize: 10, fontStyle: 'italic', color: MUTED, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.latin}</div>
            {p.heimisch && <span style={{ fontSize: 8, background: '#047A3C18', color: '#047A3C', border: '1px solid #047A3C30', padding: '1px 5px', borderRadius: 100, fontWeight: 700, flexShrink: 0 }}>heimisch</span>}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
            <MBadge emoji="☀️" label={p.licht.map(l => LICHT_LABELS[l]).join('/')} L={L} />
            <MBadge emoji="💧" label={p.wasser.map(w => WASSER_LABELS[w]).join('/')} L={L} />
            {!isMobile && <MBadge emoji="📏" label={`${p.hoehe[0]}–${p.hoehe[1]}cm`} L={L} />}
            <MBadge emoji="🌸" label={`${MONTHS[p.bluete_monate[0]-1]}–${MONTHS[p.bluete_monate[p.bluete_monate.length-1]-1]}`} L={L} />
          </div>

          {/* Eco row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {p.bienen && <span title="Bienen" style={{ fontSize: 13 }}>🐝</span>}
            {p.tagfalter && <span title="Tagfalter" style={{ fontSize: 13 }}>🦋</span>}
            {p.nachtfalter && <span title="Nachtfalter" style={{ fontSize: 13 }}>🌙</span>}
            {p.raupenfutter && <span title="Raupenfutterpflanze" style={{ fontSize: 13 }}>🐛</span>}
            {p.kaefer && <span title="Käfer" style={{ fontSize: 13 }}>🪲</span>}
            {p.voegel && <span title="Vögel" style={{ fontSize: 13 }}>🐦</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: 1, background: i <= (p.nektar || p.insekten || 0) ? A : BORDER, opacity: i <= (p.nektar || p.insekten || 0) ? 1 : 0.3 }} />)}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 8, color: MUTED, marginTop: 4, opacity: 0.4, textAlign: 'center' }}>Tippen für Steckbrief</div>
      </div>
    </div>
  )
}

/* ─── MOBILE LIST ROW ───────────────────────────────────────────────────── */
function PlantListRow({ plant: p, onTap, onAdd, onRemove, inPlan, L, shadow, cardBg }) {
  return (
    <div onClick={onTap} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: cardBg, borderRadius: 10, boxShadow: shadow,
      overflow: 'hidden', cursor: 'pointer',
      borderLeft: `3px solid ${p.bluete_farbe || '#888'}`,
    }}>
      {/* Thumb */}
      <CardThumb plant={p} compact />
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, padding: '8px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: FG, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ fontSize: 10, fontStyle: 'italic', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{p.latin}</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <MBadge emoji="☀️" label={p.licht.map(l => LICHT_LABELS[l]).join('/')} L={L} />
          <MBadge emoji="💧" label={p.wasser.map(w => WASSER_LABELS[w]).join('/')} L={L} />
          {p.bienen && <span style={{ fontSize: 11 }}>🐝</span>}
          {p.tagfalter && <span style={{ fontSize: 11 }}>🦋</span>}
          {p.raupenfutter && <span style={{ fontSize: 11 }}>🐛</span>}
          {p.heimisch && <span style={{ fontSize: 8, background: '#047A3C18', color: '#047A3C', border: '1px solid #047A3C30', padding: '1px 5px', borderRadius: 100, fontWeight: 700 }}>heimisch</span>}
        </div>
      </div>
      {/* +/- controls */}
      {inPlan ? (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 10, flexShrink: 0 }}>
          <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: FG, minWidth: 18, textAlign: 'center' }}>{inPlan.count}</span>
          <button onClick={onAdd} style={{ width: 28, height: 28, borderRadius: 7, background: '#047A3C', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); onAdd() }} style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginRight: 10,
          background: 'rgba(0,0,0,0.08)', border: 'none', color: FG, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Plus size={14} /></button>
      )}
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
          {active && <span style={{ color: 'var(--luma-on-a)', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>✓</span>}
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

function exportPdf(plan, { label, beetArea, beetW, beetH } = {}) {
  const total = plan.reduce((s, p) => s + p.count, 0)
  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const planTitle = label || `Pflanzplan ${beetW ? `${beetW}m × ${beetH}m` : ''}`

  const MONTH_NAMES = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  const bloomStr = p => {
    if (!p.bluete_monate?.length) return '—'
    const sorted = [...p.bluete_monate].sort((a,b)=>a-b)
    return `${MONTH_NAMES[sorted[0]-1]}–${MONTH_NAMES[sorted[sorted.length-1]-1]}`
  }

  const rows = plan.map((p, i) => `
    <tr>
      <td class="nr">${i + 1}</td>
      <td class="swatch-cell"><span class="swatch" style="background:${p.bluete_farbe || '#10b981'}"></span></td>
      <td class="name">${p.name}</td>
      <td class="latin">${p.latin || '—'}</td>
      <td class="center">${p.count}</td>
      <td class="center">${p.pflanzabstand || 40} cm</td>
      <td class="center bloom">${bloomStr(p)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${planTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 28mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #052e16; padding-bottom: 10px; margin-bottom: 18px; }
  .header-left h1 { font-size: 18pt; font-weight: 800; color: #052e16; letter-spacing: -0.02em; line-height: 1; }
  .header-left p { font-size: 9pt; color: #555; margin-top: 5px; }
  .header-right { text-align: right; font-size: 9pt; color: #555; line-height: 1.6; }
  .header-right strong { display: block; font-size: 11pt; color: #052e16; }
  .meta { display: flex; gap: 24px; margin-bottom: 18px; padding: 10px 14px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; }
  .meta-item { font-size: 9pt; }
  .meta-item strong { display: block; font-size: 14pt; font-weight: 800; color: #047a3c; }
  .meta-item span { color: #555; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.06em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  thead tr { background: #052e16; color: #fff; }
  thead th { padding: 7px 10px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; text-align: left; }
  thead th.center { text-align: center; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody tr:hover { background: #ecfdf5; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  td.nr { color: #999; font-size: 9pt; width: 28px; }
  td.swatch-cell { width: 24px; padding-right: 0; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); }
  td.name { font-weight: 600; font-size: 11pt; }
  td.latin { color: #555; font-style: italic; font-size: 9.5pt; }
  td.center { text-align: center; font-size: 10pt; }
  td.bloom { font-size: 9pt; color: #047a3c; font-weight: 600; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8pt; color: #999; }
  .order-note { margin-top: 18px; padding: 12px 16px; border: 1.5px dashed #bbf7d0; border-radius: 6px; font-size: 9pt; color: #047a3c; background: #f0fdf4; }
  .order-note strong { display: block; margin-bottom: 4px; font-size: 10pt; color: #052e16; }
  @media print {
    body { padding: 15mm 15mm; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>PFLANZPLAN</h1>
    <p>LUMA BIOME — ${planTitle}</p>
  </div>
  <div class="header-right">
    <strong>LUMA GmbH</strong>
    Berlin, ${date}
  </div>
</div>

<div class="meta">
  <div class="meta-item"><strong>${total}</strong><span>Pflanzen gesamt</span></div>
  <div class="meta-item"><strong>${plan.length}</strong><span>Arten</span></div>
  ${beetArea ? `<div class="meta-item"><strong>${beetArea.toFixed(1)} m²</strong><span>Fläche</span></div>` : ''}
</div>

<table>
  <thead>
    <tr>
      <th>Nr.</th>
      <th></th>
      <th>Art (Deutsch)</th>
      <th>Art (Lateinisch)</th>
      <th class="center">Anzahl</th>
      <th class="center">Abstand</th>
      <th class="center">Blüte</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="order-note">
  <strong>🌿 Bestellanfrage an Baumschule</strong>
  Bitte Angebot für obige Pflanzliste (${total} Pflanzen, ${plan.length} Arten${beetArea ? `, Fläche ca. ${beetArea.toFixed(1)} m²` : ''}) einreichen.<br>
  Bevorzugt Regiosaatgut / regionale Herkünfte (§40 BNatSchG). Liefertermin nach Absprache.<br><br>
  <strong>Angebotsfrist:</strong> __________________ &nbsp;&nbsp; <strong>Lieferwunsch:</strong> __________________
</div>

<div style="margin-top:18px; border:1px solid #e5e7eb; border-radius:6px; padding:12px 16px;">
  <div style="font-size:9pt; font-weight:700; color:#052e16; margin-bottom:8px;">Verfügbarkeitsbestätigung Baumschule</div>
  <table style="width:100%; border-collapse:collapse; font-size:9pt;">
    <thead><tr style="background:#f9fafb;"><th style="text-align:left;padding:5px 8px;border:1px solid #e5e7eb;">Art</th><th style="text-align:center;padding:5px 8px;border:1px solid #e5e7eb;">Bestellt</th><th style="text-align:center;padding:5px 8px;border:1px solid #e5e7eb;">Verfügbar</th><th style="text-align:left;padding:5px 8px;border:1px solid #e5e7eb;">Alternativ / Notiz</th></tr></thead>
    <tbody>${plan.map(p => `<tr><td style="padding:5px 8px;border:1px solid #e5e7eb;">${p.name}</td><td style="text-align:center;padding:5px 8px;border:1px solid #e5e7eb;">${p.count}</td><td style="text-align:center;padding:5px 8px;border:1px solid #e5e7eb;">☐ ja &nbsp; ☐ nein</td><td style="padding:5px 8px;border:1px solid #e5e7eb;"></td></tr>`).join('')}</tbody>
  </table>
</div>

<div style="margin-top:18px; display:flex; gap:40px; font-size:9pt; color:#555;">
  <div style="flex:1;">Datum, Unterschrift LUMA:<br><br>_________________________________</div>
  <div style="flex:1;">Datum, Unterschrift Baumschule:<br><br>_________________________________</div>
</div>

<div class="footer">
  <span>LUMA GmbH · Berlin · luma.earth</span>
  <span>Erstellt mit LUMA BIOME · ${date}</span>
</div>

<script>window.onload = () => { window.print() }</script>
</body>
</html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}
