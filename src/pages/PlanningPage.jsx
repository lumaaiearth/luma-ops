import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { useOps } from '../context/OpsContext.jsx'
import { PLANTS, filterPlants, LICHT_LABELS, WASSER_LABELS, BODEN_LABELS, TYPE_LABELS, MONTHS, DRAINAGE_LABELS, WUCHSFORM_LABELS } from '../data/plants.js'
import { HABITATS, filterHabitats, HABITAT_KATEGORIE_LABELS, HABITAT_KATEGORIE_EMOJI, HABITAT_ZIEL_LABELS } from '../data/habitats.js'
import { calcAngebot } from '../data/preise.js'
import {
  Leaf, Search, Plus, Minus, ExternalLink, X, ChevronDown, ChevronUp,
  Filter, Download, SlidersHorizontal, Ruler, Grid3x3, Info,
  Sun, Droplets, FlaskConical, Bug, Bird, Flower, Sprout, TreePine,
  Box, LayoutGrid, Map as MapIcon, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { computePlacement, buildGrid, stateForMonth, growthForMonth, growthBucket, POLLI_GROUPS } from '../lib/beetLayout.js'
import { shapeMetaFromGeometry } from '../lib/shapeMeta.js'
import { fetchElevation, siteInfo } from '../lib/siteData.js'
import ShapeView from '../components/ShapeView.jsx'
// 3D-Modell-Ansicht (three.js) lazy laden — eigener Chunk.
const Beet3DPoly = lazy(() => import('../components/Beet3DPoly.jsx'))
import { plantSprite, SPRITE_PX_PER_M } from '../lib/plantSprites.js'

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

// Art der Pflanze / Wuchsform (prädikatbasiert, feiner als der reine `type`)
const ART_OPTS = [
  { key: 'staude',       label: '🌼 Krautpflanzen/Stauden', test: p => ['staude', 'einjährig', 'zweijährig'].includes(p.type) },
  { key: 'gras',         label: '🌾 Gräser',                test: p => p.type === 'gras' },
  { key: 'strauch',      label: '🪴 Sträucher',             test: p => p.type === 'strauch' },
  { key: 'baum_niedrig', label: '🌳 Gehölze niedrig',       test: p => p.type === 'baum' && (p.hoehe?.[1] ?? 0) < 800 },
  { key: 'baum_hoch',    label: '🌲 Gehölze hoch',          test: p => p.type === 'baum' && (p.hoehe?.[1] ?? 0) >= 800 },
]

/* ─── WORKFLOW-SCHRITTE ─────────────────────────────────────────────────── */
// 3-Screen-Ablauf (Neuaufbau): Standort → Beet & Pflanzen → Übersicht & Export.
const STEPS = [
  { key: 'standort', label: 'Start & Standort',  short: 'Standort', emoji: '📍', hint: 'Fläche aus BIOME, Standortfaktoren & Blickrichtung' },
  { key: 'beet',     label: 'Beet & Pflanzen',   short: 'Beet',     emoji: '🌿', hint: 'Rasterplan-Vorschau, automatisch füllen oder selbst wählen' },
  { key: 'plan',     label: 'Übersicht & Export', short: 'Export',  emoji: '📋', hint: 'Wissenschaftliche Übersicht, Pflege, PDF & Excel' },
]
const STEP_INDEX = k => Math.max(0, STEPS.findIndex(s => s.key === k))

/* ─── MAIN ──────────────────────────────────────────────────────────────── */
export default function PlanningPage() {
  const { themeId } = useTheme()
  const L = themeId === 'light'
  const bp = useBreakpoint()
  const isMobile = bp === 'xs' || bp === 'sm'
  const { projects = [], updateProject, pflanzplaene = [], createPflanzplan, updatePflanzplan, deletePflanzplan,
    createTask, createRecurring, tasks = [], recurring = [] } = useOps()
  const location = useLocation()
  const navigate = useNavigate()

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
  const [onlyNachtfalter, setOnlyNachtfalter] = useState(false)
  const [onlyKaefer, setOnlyKaefer] = useState(false)
  const [onlyVoegel, setOnlyVoegel] = useState(false)
  const [onlyZier, setOnlyZier] = useState(false)
  const [artKeys, setArtKeys] = useState([])
  const [openSec, setOpenSec] = useState({ standort: false, art: false, bio: false })
  const [search, setSearch] = useState('')
  const [filterPanelOpen, setFilterPanelOpen] = useState(() => window.innerWidth >= 768)
  const [activeFilters, setActiveFilters] = useState('standort') // 'standort'|'biologie'|'boden'

  // ── Plan
  const [plan, setPlan] = useState([])
  const [activeTab, setActiveTab] = useState('standort')
  const [beetView, setBeetView] = useState('raster') // 'raster' | '3d' (Modul 2/3 Vorschau)
  const [saveProjectId, setSaveProjectId] = useState('')
  const [savedToProject, setSavedToProject] = useState(false)
  const [sheetPlant, setSheetPlant] = useState(null) // Steckbrief-Sheet
  const [sheetQty, setSheetQty] = useState(1)        // Anzahl-Regler im Steckbrief
  const [autoArea, setAutoArea] = useState(null)     // Fläche für Auto-Auswahl (m²), null = aus Beet
  const [planTitel, setPlanTitel] = useState('')
  const [savedPlanId, setSavedPlanId] = useState(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [showSavedPlans, setShowSavedPlans] = useState(false)

  // ── Beetplaner
  const [beetW, setBeetW] = useState(4)
  const [beetH, setBeetH] = useState(2)
  const [beetForm, setBeetForm] = useState('rechteck') // 'rechteck'|'oval'
  const [viewDir, setViewDir] = useState({ x: 0, y: -1 }) // Blickrichtung der Besucher → Höhenschichtung
  const [fromMapFeature, setFromMapFeature] = useState(null)
  const [shapeMeta, setShapeMeta] = useState(null)   // aus BIOME-Shape abgeleitet
  const [site, setSite] = useState(null)             // Höhe/Klimazone/Region/Pflegehinweis

  // ── Habitate (Habitatelemente)
  const [habitatPlan, setHabitatPlan] = useState([])
  const [catalogMode, setCatalogMode] = useState('pflanzen') // 'pflanzen'|'habitate'
  const [habCat, setHabCat] = useState(null)      // Kategorie-Filter
  const [habSearch, setHabSearch] = useState('')
  const [sheetHabitat, setSheetHabitat] = useState(null)

  // ── LUMA-Ops-Anbindung
  const [showOpsDialog, setShowOpsDialog] = useState(false)
  const [opsOpts, setOpsOpts] = useState({ bestellung: true, pflanzung: true, einbau: true, erstpflege: true, recurring: false })
  const [opsDone, setOpsDone] = useState(false)

  // Pre-fill from map navigation state
  useEffect(() => {
    const state = location.state
    if (!state?.fromMapFeature) return
    const { area_m2, geometry } = state.fromMapFeature
    // Vollen Shape auswerten (GPS/Umfang/Fläche/lokale Meter-Form)
    const meta = geometry ? shapeMetaFromGeometry(geometry) : null
    if (meta?.local) {
      // Beet nimmt die exakte Bounding-Box der Form; das Polygon maskiert später.
      setBeetW(Math.max(0.5, Math.round(meta.bbox_w_m * 10) / 10))
      setBeetH(Math.max(0.5, Math.round(meta.bbox_h_m * 10) / 10))
      setShapeMeta(meta)
      setActiveTab('standort')
    } else if (area_m2 > 0) {
      const w = Math.round(Math.sqrt(area_m2 * 2) * 10) / 10
      const h = Math.round((area_m2 / w) * 10) / 10
      setBeetW(w); setBeetH(h); setActiveTab('standort')
    }
    setFromMapFeature(state.fromMapFeature)
  }, [location.state])

  // Deep-Link aus BIOME: verknüpften Pflanzplan direkt öffnen
  // (Feature-Panel → „Florales™"-Eintrag navigiert mit state.openPlanId hierher)
  useEffect(() => {
    const openId = location.state?.openPlanId
    if (!openId || !pflanzplaene.length) return
    const pp = pflanzplaene.find(p => p.id === openId)
    if (pp) loadPflanzplan(pp)
  }, [location.state, pflanzplaene]) // eslint-disable-line react-hooks/exhaustive-deps

  // Standort-Daten (Höhe via API, Klimazone/Region offline) aus dem Schwerpunkt.
  useEffect(() => {
    const c = shapeMeta?.centroid
    if (!c) { setSite(null); return }
    let alive = true
    setSite(siteInfo(c.lat, c.lng, null)) // sofort mit Offline-Werten
    fetchElevation(c.lat, c.lng).then(elev => {
      if (alive && elev != null) setSite(siteInfo(c.lat, c.lng, elev))
    })
    return () => { alive = false }
  }, [shapeMeta])

  const filtered = useMemo(() => {
    const available = typeof filterPlants === 'function' ? filterPlants({
      licht, wasser, boden, drainage, ph, searchTerm: search,
    }) : PLANTS
    return available.filter(p => {
      if (artKeys.length && !ART_OPTS.some(a => artKeys.includes(a.key) && a.test(p))) return false
      if (onlyHeimisch && !p.heimisch) return false
      if (onlyRaupen && !p.raupenfutter) return false
      if (onlyBienen && !p.bienen) return false
      if (onlyTagfalter && !p.tagfalter) return false
      if (onlyNachtfalter && !p.nachtfalter) return false
      if (onlyKaefer && !p.kaefer) return false
      if (onlyVoegel && !p.voegel) return false
      if (onlyZier && !p.zierpflanze) return false
      return true
    })
  }, [licht, wasser, boden, drainage, ph, search, artKeys, onlyHeimisch, onlyRaupen, onlyTagfalter, onlyBienen, onlyNachtfalter, onlyKaefer, onlyVoegel, onlyZier])

  // Kontinuierliche Platzierung für die 3D-Ansicht (Drifts/Höhenschichtung).
  const plantsWithPlacement = useMemo(() => computePlacement(plan, beetW, beetH), [plan, beetW, beetH])

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
  // Setzt die Anzahl auf einen exakten Wert – legt die Art bei Bedarf neu an (Upsert).
  function setPlanCount(plant, count) {
    if (count <= 0) { setPlan(prev => prev.filter(p => p.id !== plant.id)); return }
    setPlan(prev => prev.some(p => p.id === plant.id)
      ? prev.map(p => p.id === plant.id ? { ...p, count } : p)
      : [...prev, { ...plant, count }])
  }

  // Anzahl-Regler im Steckbrief beim Öffnen sinnvoll vorbelegen.
  useEffect(() => {
    if (!sheetPlant) return
    const ex = plan.find(p => p.id === sheetPlant.id)
    setSheetQty(ex ? ex.count : suggestQty(sheetPlant))
  }, [sheetPlant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trifft automatisch eine standortpassende Pflanzenauswahl für die Freiform.
  function autoFillForArea() {
    const area = shapeMeta?.area_m2 || (autoArea != null ? autoArea : Math.round(beetArea) || 10)
    const usingArtFilter = artKeys.length > 0
    const pool = usingArtFilter ? filtered : filtered.filter(p => ['staude', 'gras', 'einjährig', 'zweijährig'].includes(p.type))
    if (!pool.length) return
    const groups = [
      onlyBienen && 'bienen', onlyTagfalter && 'tagfalter', onlyNachtfalter && 'nachtfalter',
      onlyKaefer && 'kaefer', onlyVoegel && 'voegel',
    ].filter(Boolean)
    const targetCount = Math.max(5, Math.min(20, Math.round(area / 1.2)))
    const result = generatePlan({ area, targetCount, candPool: pool, targetGroups: groups.length ? groups : ['bienen'] })
    if (!result.length) return
    if (plan.length && !window.confirm(`Aktuellen Plan (${plan.length} Arten) durch die automatische Auswahl ersetzen?`)) return
    setPlan(result)
    // bleibt in Modul 2 → Bepflanzung erscheint direkt in der Freiform
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
  const angebot = useMemo(() => calcAngebot({ plan, habitatPlan }), [plan, habitatPlan])

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
        position: h.position ?? null, // {x,y} bzw. Karten-Referenz — für spätere Verortung
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

  // Aus dem gespeicherten Plan Aufgaben/Einsätze im Pflege-Board anlegen.
  function createOpsFromPlan(opts) {
    const planId = savedPlanId
    if (!planId) return
    const clientId = projects.find(p => p.id === saveProjectId)?.client_id || null
    const base = { project_id: saveProjectId || null, client_id: clientId, board_id: 'b_pflege', status: 'not_started', priority: 'medium' }
    const openRef = ref => (tasks || []).some(t => t.source_ref === ref && t.status !== 'done' && t.status !== 'archive')
    const mk = (suffix, data) => { const ref = `pflanzplan:${planId}:${suffix}`; if (!openRef(ref)) createTask?.({ ...base, source_ref: ref, ...data }) }
    const label = planTitel || 'Plan'
    const mat = rollupMaterial(habitatPlan)
    const matLines = mat.map(m => `${m.material}: ${m.menge} ${m.einheit}`)
    const plantLines = plan.map(p => `${p.count}× ${p.name}`)

    if (opts.bestellung) mk('bestellung', {
      title: `Material & Pflanzen bestellen — ${label}`, task_type: 'bestellung',
      material: [...plantLines, ...matLines],
      description: `Pflanzen: ${plantLines.join(', ') || '—'}\nMaterial: ${matLines.join(', ') || '—'}`,
    })
    if (opts.pflanzung && plan.length) mk('pflanzung', {
      title: `Pflanzung durchführen — ${label}`, task_type: 'pflanzung',
      description: plan.map(p => `${p.count}× ${p.name} (Ø${p.pflanzabstand || 40} cm)`).join(', '),
    })
    if (opts.einbau) habitatPlan.forEach(h => mk(`einbau:${h.id}`, {
      title: `${h.name} einbauen${h.count > 1 ? ` (${h.count}×)` : ''}`, task_type: 'installation',
      description: [h.standort_hinweis, h.maschine ? `Gerät: ${h.maschine}` : ''].filter(Boolean).join(' · '),
      material: (h.material || []).map(m => `${m.material}: ${Math.round((m.menge || 0) * h.count * 100) / 100} ${m.einheit}`),
      checklist: (h.einbau_schritte || []).map(text => ({ id: crypto.randomUUID(), text, done: false })),
    }))
    if (opts.erstpflege) mk('erstpflege', {
      title: `Anwachspflege / Gießen 1. Jahr — ${label}`, task_type: 'giessen',
      description: 'In Trockenphasen des ersten Jahres regelmäßig wässern bis zum Anwachsen. Danach nur bei extremer Trockenheit (mager halten).',
    })
    if (opts.recurring && createRecurring) {
      const existsTmpl = t => (recurring || []).some(r => r.title === t)
      if (plan.length && !existsTmpl(`Rückschnitt & Pflege — ${label}`)) {
        createRecurring({ project_id: saveProjectId || null, title: `Rückschnitt & Pflege — ${label}`, job_type: 'pflege',
          interval_days: 365, next_date: nextDateForMonth(3), assigned_users: [], vehicle_id: null, tools: [],
          notes: 'Staudenrückschnitt März/April, Schnittgut abräumen (Fläche mager halten).' })
      }
      habitatPlan.filter(h => h.pflege_intervall_monate).forEach(h => {
        const t = `Pflege: ${h.name}`
        if (!existsTmpl(t)) createRecurring({ project_id: saveProjectId || null, title: t, job_type: 'pflege',
          interval_days: Math.round(h.pflege_intervall_monate * 30.4), next_date: nextDateForMonth(seasonMonth(h.jahreszeit)),
          assigned_users: [], vehicle_id: null, tools: [], notes: h.pflege_hinweis || '' })
      })
    }
    setShowOpsDialog(false)
    setOpsDone(true)
    setTimeout(() => setOpsDone(false), 3000)
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

  const secCountStandort = [licht, wasser, boden, drainage, ph].filter(v => v != null).length
  const secCountArt = artKeys.length
  const secCountBio = [onlyBienen, onlyTagfalter, onlyNachtfalter, onlyKaefer, onlyVoegel, onlyRaupen, onlyHeimisch, onlyZier].filter(Boolean).length
  const activeFilterCount = secCountStandort + secCountArt + secCountBio
  const effectiveAutoArea = autoArea != null ? autoArea : (Math.round(beetArea) || 10)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── MAP FEATURE BANNER ──────────────────────────────────────────── */}
      {fromMapFeature && (
        <div style={{ background: '#22c55e18', borderBottom: `1px solid #22c55e30`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>🗺️</span>
          <span style={{ fontSize: 12, color: '#22c55e', fontFamily: "'Space Grotesk', sans-serif" }}>
            <b>{fromMapFeature.label}</b> aus BIOME
            {shapeMeta
              ? ` · ${shapeMeta.area_m2} m² · Umfang ${shapeMeta.perimeter_m} m${shapeMeta.centroid ? ` · ${shapeMeta.centroid.lat.toFixed(5)}, ${shapeMeta.centroid.lng.toFixed(5)}` : ''}`
              : ` · ${fromMapFeature.area_m2?.toFixed(1)} m² vorbelegt`}
          </span>
          <button onClick={() => setFromMapFeature(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── HEADER + WORKFLOW-STEPPER ──────────────────────────────────── */}
      <div style={{ padding: isMobile ? '10px 12px 0' : '14px 24px 0', flexShrink: 0 }}>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: A14, border: `1px solid ${A20}`, borderRadius: 8, padding: '5px 12px' }}>
              <Leaf size={12} color={A} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: L ? 700 : 400 }}>
                Florales™ · {PLANTS.length} Arten · {HABITATS.length} Habitate
              </span>
            </div>
          </div>
        )}
        <WorkflowStepper active={activeTab} setActive={setActiveTab} isMobile={isMobile} L={L}
          planCount={totalPlants + totalHabitats} hasPlan={(totalPlants + totalHabitats) > 0} />
      </div>

      {/* ── SCREEN 1: START & STANDORT ─────────────────────────────────── */}
      {activeTab === 'standort' && (
        <StandortScreen
          L={L} shadow={shadow} cardBg={cardBg} isMobile={isMobile}
          shapeMeta={shapeMeta} fromMapFeature={fromMapFeature} site={site} plan={plan}
          licht={licht} setLicht={setLicht} wasser={wasser} setWasser={setWasser}
          boden={boden} setBoden={setBoden} drainage={drainage} setDrainage={setDrainage}
          ph={ph} setPh={setPh}
          onOpenBiome={() => navigate('/map')}
          onNext={() => setActiveTab('beet')}
        />
      )}

      {/* ── SCREEN 2: BEET & PFLANZEN ──────────────────────────────────── */}
      {activeTab === 'beet' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Katalog-Umschalter: Pflanzen | Habitate */}
          <div style={{ padding: isMobile ? '10px 12px 0' : '12px 24px 0', flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', gap: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4 }}>
              {[['pflanzen', '🌱 Pflanzen'], ['habitate', '🪵 Habitate']].map(([k, l]) => (
                <button key={k} onClick={() => setCatalogMode(k)} style={{
                  padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: catalogMode === k ? 700 : (L ? 500 : 400),
                  border: 'none', background: catalogMode === k ? A14 : 'transparent', color: catalogMode === k ? A : MUTED, cursor: 'pointer',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {catalogMode === 'pflanzen' && (<>
          {/* Beet-Vorschau (exakte Freiform) + Auto-Auswahl — keine Filter mehr */}
          <div style={{ padding: isMobile ? '0 12px' : '0 24px', flexShrink: 0 }}>
            {shapeMeta?.local ? (
              <div style={{ background: cardBg, borderRadius: 12, padding: 14, boxShadow: shadow, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: L ? 700 : 400, flex: 1 }}>
                    🗺️ {fromMapFeature?.label || 'Fläche'} · {shapeMeta.area_m2} m²
                  </div>
                  {[['raster', '🔤 Rasterplan'], ['3d', '🧊 3D-Modelle']].map(([v, lbl]) => (
                    <button key={v} onClick={() => setBeetView(v)} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: beetView === v ? 700 : 500,
                      border: beetView === v ? `1.5px solid ${A}` : `1px solid ${BORDER}`, background: beetView === v ? A14 : 'transparent', color: beetView === v ? A : MUTED,
                    }}>{lbl}</button>
                  ))}
                </div>
                {beetView === '3d' ? (
                  plan.length === 0
                    ? <div style={{ height: isMobile ? 240 : 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 13, background: L ? '#f4f7f0' : '#0e1712', borderRadius: 8 }}>Fläche zuerst automatisch füllen oder Pflanzen wählen</div>
                    : <Suspense fallback={<div style={{ height: isMobile ? 240 : 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 13 }}>🧊 3D-Modelle werden geladen …</div>}>
                        <Beet3DPoly placement={plantsWithPlacement} beetW={beetW} beetH={beetH} beetForm={beetForm} polygon={shapeMeta.local.points} L={L} shadow={shadow} cardBg={cardBg} />
                      </Suspense>
                ) : (
                  <ShapeView shapeMeta={shapeMeta} plan={plan} height={isMobile ? 240 : 320} L={L} cardBg={cardBg} showCodes showLegend />
                )}
              </div>
            ) : (
              <div style={{ background: A14, border: `1px solid ${A20}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 12.5, color: FG }}>
                Noch keine Fläche definiert — <button onClick={() => setActiveTab('standort')} style={{ background: 'none', border: 'none', color: A, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>zurück zu Start & Standort</button>, um die Freiform in BIOME zu zeichnen.
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: A14, border: `1px solid ${A20}`, borderRadius: 12, padding: isMobile ? '10px 12px' : '10px 14px', marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <div style={{ flex: 1, minWidth: 170 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>Fläche automatisch bepflanzen</div>
                <div style={{ fontSize: 11, color: MUTED }}>Wissenschaftlich optimierte Auswahl nach deinen Standortfaktoren aus Schritt 1.</div>
              </div>
              <button onClick={autoFillForArea} disabled={!filtered.length}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: filtered.length ? A : BORDER, border: 'none', color: 'var(--luma-on-a)', borderRadius: 8, padding: '9px 16px', cursor: filtered.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                ✨ Automatisch füllen
              </button>
            </div>
          </div>

          {/* Pflanzen-Palette (nach Standort passend, ohne Filter) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 12px 24px' : '0 24px 24px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '2px 0 10px', fontWeight: L ? 700 : 400 }}>
              🌱 Passende Pflanzen ({filtered.length}) — antippen zum Hinzufügen
            </div>
            {filtered.length === 0 ? (
              <EmptyState msg="Keine passenden Pflanzen 🌵" sub="Standortfaktoren in Schritt 1 anpassen" />
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
          </>)}

          {catalogMode === 'habitate' && (
            <HabitatCatalog
              habCat={habCat} setHabCat={setHabCat}
              habSearch={habSearch} setHabSearch={setHabSearch}
              habitatPlan={habitatPlan}
              onTap={setSheetHabitat}
              onAdd={addHabitat}
              onRemove={h => setHabitatCount(h.id, (habitatPlan.find(x => x.id === h.id)?.count || 1) - 1)}
              isMobile={isMobile} L={L} shadow={shadow} cardBg={cardBg}
            />
          )}

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
                  {/* Spezialisierte & assoziierte Arten */}
                  {(sheetPlant.spezialisten?.length > 0 || sheetPlant.assoziierte_arten) && (
                    <div style={{ background: '#f59e0b12', border: '1px solid #f59e0b30', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                      {sheetPlant.assoziierte_arten ? (
                        <div style={{ fontSize: 12.5, color: FG, marginBottom: sheetPlant.spezialisten?.length ? 8 : 0 }}>
                          <b style={{ color: '#b45309', fontSize: 15 }}>~{sheetPlant.assoziierte_arten}</b> assoziierte Insektenarten profitieren von dieser Pflanze.
                        </div>
                      ) : null}
                      {sheetPlant.spezialisten?.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>🐝 Spezialisten (auf diese Pflanze angewiesen):</div>
                          <div style={{ fontSize: 12, color: FG }}>{sheetPlant.spezialisten.join(' · ')}</div>
                        </>
                      )}
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
                  {/* Anzahl-Regler */}
                  {(() => {
                    const spacing = (sheetPlant.pflanzabstand || 40) / 100
                    const coverage = Math.round(sheetQty * spacing * spacing * 100) / 100
                    const inPlanNow = plan.some(p => p.id === sheetPlant.id)
                    const stepBtn = { width: 34, height: 34, flexShrink: 0, borderRadius: 8, border: `1px solid ${BORDER}`, background: cardBg, color: FG, fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }
                    return (
                      <div style={{ background: L ? 'rgba(0,0,0,0.03)' : BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: FG }}>Anzahl Individuen</span>
                          <span style={{ fontSize: 11, color: MUTED }}>≈ {coverage} m² · Ø {sheetPlant.pflanzabstand || 40} cm</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => setSheetQty(q => Math.max(1, q - 1))} style={stepBtn}>−</button>
                          <input type="range" min={1} max={50} value={Math.min(sheetQty, 50)} onChange={e => setSheetQty(+e.target.value)} style={{ flex: 1, accentColor: A }} />
                          <button onClick={() => setSheetQty(q => q + 1)} style={stepBtn}>+</button>
                          <input type="number" min={1} value={sheetQty} onChange={e => setSheetQty(Math.max(1, Math.round(+e.target.value) || 1))}
                            style={{ width: 56, textAlign: 'center', background: cardBg, border: `1px solid ${BORDER}`, color: FG, borderRadius: 8, padding: '7px 4px', fontSize: 15, fontWeight: 700, outline: 'none' }} />
                        </div>
                        {inPlanNow && <div style={{ fontSize: 11, color: A, marginTop: 8, fontWeight: 600 }}>Bereits im Plan — Anzahl wird angepasst.</div>}
                      </div>
                    )
                  })()}
                  {/* Add / Set button */}
                  <button onClick={() => { setPlanCount(sheetPlant, sheetQty); setSheetPlant(null) }}
                    className="lu-btn-primary" style={{ width: '100%', padding: '14px', borderRadius: 12, background: A, border: 'none', color: 'var(--luma-on-a)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    {plan.some(p => p.id === sheetPlant.id) ? `✓ Anzahl auf ${sheetQty}× setzen` : `+ ${sheetQty}× zum Plan hinzufügen`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Habitat Steckbrief Sheet */}
          {sheetHabitat && (
            <HabitatSheet habitat={sheetHabitat} onClose={() => setSheetHabitat(null)} onAdd={h => { addHabitat(h); setSheetHabitat(null) }} L={L} />
          )}
        </div>
      )}

      {/* ── TAB: PLAN ──────────────────────────────────────────────────── */}
      {activeTab === 'plan' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 24px 24px' }}>
          {plan.length === 0 && habitatPlan.length === 0 ? (
            <EmptyState msg="Plan ist noch leer 🌱" sub="Pflanzen unter Beet & Pflanzen hinzufügen" action={() => setActiveTab('beet')} actionLabel="Zu Beet & Pflanzen →" />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>

              {plan.length > 0 && (<>
              {/* Freiform mit Bepflanzung — durchgängiger Anker (wie Modul 1 & 2) */}
              {shapeMeta?.local && (
                <div style={{ background: L ? '#fff' : SURFACE, borderRadius: 12, padding: 14, boxShadow: shadow, marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: L ? 700 : 400 }}>
                    🗺️ {fromMapFeature?.label || 'Fläche'} · {shapeMeta.area_m2} m² · Umfang {shapeMeta.perimeter_m} m
                  </div>
                  <ShapeView shapeMeta={shapeMeta} plan={plan} height={isMobile ? 240 : 320} L={L} cardBg={cardBg} showCodes showLegend />
                </div>
              )}
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
                <StatCard label="Pflanzen gesamt" value={totalPlants} emoji="🌱" color={A} L={L} shadow={shadow} />
                <StatCard label="Arten" value={plan.length} emoji="🔢" color="#8b5cf6" L={L} shadow={shadow} />
                <StatCard label="Heimisch" value={plan.filter(p => p.heimisch).length} emoji="🏡" color="#047A3C" L={L} shadow={shadow} />
                <StatCard label="Ø Nektar" value={plan.filter(p=>p.nektar).length ? (plan.reduce((s,p)=>s+(p.nektar||0),0)/plan.filter(p=>p.nektar).length).toFixed(1) : '–'} emoji="🍯" color="#d97706" L={L} shadow={shadow} />
                <StatCard label="Raupenfutter" value={plan.filter(p => p.raupenfutter).length} emoji="🐛" color="#10b981" L={L} shadow={shadow} />
              </div>

              {/* Standort & Pflege (wissenschaftliche Indikatoren) */}
              {site && (
                <div style={{ background: L ? '#fff' : SURFACE, borderRadius: 12, padding: '16px 18px', boxShadow: shadow, marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }}>🌍 Standort & Anwuchspflege</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                    {shapeMeta?.centroid && <Meta label="GPS" value={`${shapeMeta.centroid.lat.toFixed(4)}, ${shapeMeta.centroid.lng.toFixed(4)}`} L={L} />}
                    <Meta label="Höhe ü. NHN" value={site.elevation != null ? `${site.elevation} m` : '—'} L={L} />
                    <Meta label="Klimazone" value={`${site.zone} (USDA)`} L={L} />
                    <Meta label="Region" value={site.region} L={L} />
                  </div>
                  <div style={{ fontSize: 12.5, color: FG, lineHeight: 1.6, background: A14, border: `1px solid ${A20}`, borderRadius: 8, padding: '10px 12px' }}>
                    <b>💧 Anwuchspflege:</b> {site.wateringHint}
                  </div>
                </div>
              )}
              {/* Blühkalender */}
              <BloomCalendar plan={plan} L={L} shadow={shadow} />
              {/* Trachtkalender — was blüht wann für wen */}
              <ForageCalendar plan={plan} L={L} shadow={shadow} />

              {/* Plant Rows */}
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '16px 0 8px', fontWeight: L ? 700 : 400 }}>Pflanzliste</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {plan.map(p => (
                  <PlanRow key={p.id} plant={p} onAdd={() => addToPlan(p)} onRemove={() => setCount(p.id, p.count - 1)} L={L} shadow={shadow} cardBg={cardBg} />
                ))}
              </div>
              </>)}

              {/* Habitatelemente */}
              {habitatPlan.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
                    <StatCard label="Habitat-Elemente" value={totalHabitats} emoji="🪵" color="#92400e" L={L} shadow={shadow} />
                    <StatCard label="Aufwand ca." value={`${habitatPlan.reduce((s, h) => s + (h.aufwand_h || 0) * h.count, 0)} h`} emoji="⏱️" color="#0369a1" L={L} shadow={shadow} />
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '4px 0 8px', fontWeight: L ? 700 : 400 }}>Habitatelemente</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {habitatPlan.map(h => (
                      <HabitatPlanRow key={h.id} habitat={h} onAdd={() => addHabitat(h)} onRemove={() => setHabitatCount(h.id, h.count - 1)} L={L} shadow={shadow} cardBg={cardBg} />
                    ))}
                  </div>
                </div>
              )}

              {/* Kalkulation (intern) */}
              <div style={{ background: L ? '#f9fafb' : '#0f1a22', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: L ? 700 : 400 }}>Kalkulation (intern)</span>
                  <span style={{ fontSize: 11, color: MUTED }}>EK {angebot.ek_summe.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <div><span style={{ fontSize: 20, fontWeight: 800, color: A }}>{angebot.vk_netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</span><span style={{ fontSize: 11, color: MUTED }}> VK netto</span></div>
                  <div style={{ fontSize: 12, color: MUTED }}>Pflanzen {angebot.pflanzen_vk.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € · Material {angebot.material_vk.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € · Arbeit {angebot.arbeit_std} h → {angebot.arbeit_vk.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</div>
                </div>
                {angebot.unbekannt > 0 && <div style={{ fontSize: 10.5, color: '#d97706', marginTop: 6 }}>⚠️ {angebot.unbekannt} Position(en) ohne hinterlegten Preis — VK unvollständig.</div>}
              </div>

              {/* Export */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => {
                  exportPdf(plan, { label: fromMapFeature?.label, beetArea, beetW, beetH, habitats: habitatPlan, site, shapeMeta })
                  if (savedPlanId) updatePflanzplan(savedPlanId, { status: 'pdf_erstellt' })
                }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#052e16', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  <Download size={13} /> Plan-PDF
                </button>
                <button onClick={() => exportBaumschulCsv(plan, { label: fromMapFeature?.label })} disabled={!plan.length}
                  title="Einfache Bestellliste (CSV, öffnet in Excel)"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '9px 18px', cursor: plan.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, opacity: plan.length ? 1 : 0.5 }}>
                  <Download size={13} /> Baumschul-Liste (Excel)
                </button>
                <button onClick={() => { setPlan([]); setHabitatPlan([]) }} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Plan leeren
                </button>
                <button onClick={() => setActiveTab('beet')} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
                  🌿 Im Beet planen →
                </button>
                <button onClick={() => savedPlanId && setShowOpsDialog(true)} disabled={!savedPlanId}
                  title={savedPlanId ? '' : 'Plan zuerst speichern'}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: savedPlanId ? A : (L ? '#e5e7eb' : '#1e2a32'), border: 'none', color: savedPlanId ? 'var(--luma-on-a)' : MUTED, borderRadius: 8, padding: '9px 16px', cursor: savedPlanId ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                  🗂️ In LUMA Ops anlegen
                </button>
                {opsDone && <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: A, fontWeight: 700 }}>✓ angelegt</span>}
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
                    disabled={(plan.length === 0 && habitatPlan.length === 0) || savingPlan}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: (plan.length || habitatPlan.length) ? '#052e16' : (L ? '#e5e7eb' : '#1e2a32'), border: 'none', color: (plan.length || habitatPlan.length) ? '#fff' : MUTED, borderRadius: 8, padding: '9px 18px', cursor: (plan.length || habitatPlan.length) ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
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

      {/* ── WORKFLOW-FOOTER: durchleiten ────────────────────────────────── */}
      <WorkflowFooter active={activeTab} setActive={setActiveTab} isMobile={isMobile} L={L}
        hasPlan={(totalPlants + totalHabitats) > 0} />

      {/* ── LUMA-Ops-Dialog ─────────────────────────────────────────────── */}
      {showOpsDialog && (
        <OpsDialog opts={opsOpts} setOpts={setOpsOpts}
          hasPlants={plan.length > 0} hasHabitats={habitatPlan.length > 0}
          onConfirm={() => createOpsFromPlan(opsOpts)} onClose={() => setShowOpsDialog(false)} L={L} />
      )}
    </div>
  )
}

function OpsDialog({ opts, setOpts, hasPlants, hasHabitats, onConfirm, onClose, L }) {
  const Row = ({ k, label, desc, disabled }) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, border: `1px solid ${BORDER}` }}>
      <input type="checkbox" checked={!!opts[k] && !disabled} disabled={disabled} onChange={e => setOpts(o => ({ ...o, [k]: e.target.checked }))} style={{ marginTop: 2 }} />
      <span>
        <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{label}</div>
        <div style={{ fontSize: 11, color: MUTED }}>{desc}</div>
      </span>
    </label>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: SURFACE, borderRadius: 16, padding: 20, width: 'min(460px, 100%)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 50px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: FG, marginBottom: 4 }}>In LUMA Ops anlegen</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Wähle, welche Aufgaben &amp; Einsätze aus diesem Plan auf dem Pflege-Board erstellt werden.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row k="bestellung" label="🛒 Material &amp; Pflanzen bestellen" desc="Aufgabe mit Bestell-/Materialliste" />
          <Row k="pflanzung" label="🌱 Pflanzung durchführen" desc="Aufgabe zur Pflanzung" disabled={!hasPlants} />
          <Row k="einbau" label="🪵 Habitat-Einbau" desc="Je Element eine Aufgabe mit Einbau-Checkliste" disabled={!hasHabitats} />
          <Row k="erstpflege" label="💧 Anwachspflege (1. Jahr)" desc="Gieß-/Pflegeaufgabe fürs erste Jahr" />
          <Row k="recurring" label="🔁 Wiederkehrende Pflege (Serie)" desc="Kalender-Serientermine: Rückschnitt, Nisthilfe-/Teichpflege …" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
          <button onClick={onConfirm} style={{ background: A, border: 'none', color: 'var(--luma-on-a)', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Anlegen</button>
        </div>
      </div>
    </div>
  )
}

/* ─── GENERATOR-KOMPONENTE (Säule 2) ─────────────────────────────────────── */
function GenBtn3({ v, cur, set, label, L }) {
  const on = cur === v
  return (
    <button onClick={() => set(on ? null : v)} style={{ padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: on ? 700 : (L ? 500 : 400), border: on ? `1.5px solid ${A}` : `1px solid ${BORDER}`, background: on ? A14 : 'transparent', color: on ? A : MUTED }}>{label}</button>
  )
}
function GenSlider({ label, value, set, min, max, step = 1, suffix = '' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, marginBottom: 4 }}><span>{label}</span><span style={{ color: A, fontWeight: 700 }}>{value}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(+e.target.value)} style={{ width: '100%', accentColor: A, cursor: 'pointer' }} />
    </div>
  )
}
function ScoreTile({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}
function Generator({ L, shadow, cardBg, onApply }) {
  const [licht, setLicht] = useState(1)
  const [wasser, setWasser] = useState(2)
  const [boden, setBoden] = useState(null)
  const [area, setArea] = useState(10)
  const [targetCount, setTargetCount] = useState(12)
  const [wBloom, setWBloom] = useState(2)
  const [wBee, setWBee] = useState(2)
  const [wHeimisch, setWHeimisch] = useState(1)
  const [wZier, setWZier] = useState(1)
  const [groups, setGroups] = useState(['bienen'])
  const [addHab, setAddHab] = useState(true)

  const result = useMemo(
    () => generatePlan({ licht, wasser, boden, area, targetCount, wBloom, wBee, wHeimisch, wZier, targetGroups: groups }),
    [licht, wasser, boden, area, targetCount, wBloom, wBee, wHeimisch, wZier, groups]
  )
  const covered = new Set(); result.forEach(p => (p.bluete_monate || []).forEach(m => covered.add(m)))
  const totalPl = result.reduce((s, p) => s + p.count, 0)
  const heimP = result.length ? Math.round(result.filter(p => p.heimisch).length / result.length * 100) : 0
  const toggleGroup = g => setGroups(gs => gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g])
  const card = { background: cardBg, borderRadius: 12, padding: 16, boxShadow: shadow }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, alignItems: 'start' }}>
      {/* Regler */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>📍 Standort</div>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Licht</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {[[1, '☀️ Sonne'], [2, '⛅ Halbsch.'], [3, '🌥️ Schatten']].map(([v, l]) => <GenBtn3 key={v} v={v} cur={licht} set={setLicht} label={l} L={L} />)}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Feuchte</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {[[1, '🏜️ Trocken'], [2, '💧 Mäßig'], [3, '🌊 Feucht']].map(([v, l]) => <GenBtn3 key={v} v={v} cur={wasser} set={setWasser} label={l} L={L} />)}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Boden (optional)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['sandy', '🏖️ Sand'], ['loamy', '🧱 Lehm'], ['humus', '🌿 Humus']].map(([v, l]) => <GenBtn3 key={v} v={v} cur={boden} set={setBoden} label={l} L={L} />)}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>🎛️ Regler</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GenSlider label="Fläche" value={area} set={setArea} min={1} max={100} suffix=" m²" />
            <GenSlider label="Artenvielfalt" value={targetCount} set={setTargetCount} min={4} max={30} />
            <GenSlider label="Blühfolge-Gewicht" value={wBloom} set={setWBloom} min={0} max={4} />
            <GenSlider label="Bienenwert-Gewicht" value={wBee} set={setWBee} min={0} max={4} />
            <GenSlider label="Heimisch-Gewicht" value={wHeimisch} set={setWHeimisch} min={0} max={4} />
            <GenSlider label="Ästhetik-Gewicht" value={wZier} set={setWZier} min={0} max={4} />
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>🐝 Ziel-Bestäuber</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['bienen', '🐝 Bienen'], ['tagfalter', '🦋 Tagfalter'], ['nachtfalter', '🌙 Nachtfalter'], ['kaefer', '🪲 Käfer'], ['voegel', '🐦 Vögel']].map(([g, l]) => (
              <button key={g} onClick={() => toggleGroup(g)} style={{ padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: groups.includes(g) ? 700 : (L ? 500 : 400), border: groups.includes(g) ? `1.5px solid ${A}` : `1px solid ${BORDER}`, background: groups.includes(g) ? A14 : 'transparent', color: groups.includes(g) ? A : MUTED }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {/* Ergebnis */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: FG }}>✨ Vorschlag</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED, cursor: 'pointer' }}>
              <input type="checkbox" checked={addHab} onChange={e => setAddHab(e.target.checked)} /> Habitate vorschlagen
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 8, marginBottom: 12 }}>
            <ScoreTile label="Arten" value={result.length} color={A} />
            <ScoreTile label="Pflanzen" value={totalPl} color="#0369a1" />
            <ScoreTile label="Blühmonate" value={`${covered.size}/12`} color={covered.size >= 8 ? '#16a34a' : '#d97706'} />
            <ScoreTile label="Heimisch" value={`${heimP}%`} color="#047A3C" />
          </div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
            {MONTHS.map((mn, i) => (
              <div key={i} title={mn} style={{ flex: 1, height: 22, borderRadius: 3, background: covered.has(i + 1) ? A : (L ? '#e5e7eb' : '#1e2a32'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: covered.has(i + 1) ? 'var(--luma-on-a)' : MUTED }}>{mn[0]}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 12 }}>Blühfolge über das Jahr (grün = abgedeckt)</div>
          <button onClick={() => onApply(result, addHab ? suggestHabitats({ licht, wasser }) : null)} disabled={!result.length}
            style={{ width: '100%', padding: 12, borderRadius: 10, background: result.length ? A : BORDER, border: 'none', color: 'var(--luma-on-a)', fontSize: 14, fontWeight: 700, cursor: result.length ? 'pointer' : 'not-allowed' }}>
            In Plan übernehmen →
          </button>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Artenauswahl</div>
          {result.length === 0 ? <div style={{ fontSize: 13, color: MUTED }}>Keine passenden Arten — Standort/Filter lockern.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.bluete_farbe || A, flexShrink: 0 }} />
                  <span style={{ color: FG, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: MUTED, fontStyle: 'italic' }}>{p.latin}</span>
                  <span style={{ marginLeft: 'auto', color: A, fontWeight: 700 }}>{p.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

/* ─── SCREEN 1: START & STANDORT ─────────────────────────────────────────── */
// Welcome + Fläche (BIOME-Shape oder manuell) + Standortfaktoren + Blickrichtung.
// Die Faktoren (licht/wasser/boden/drainage/ph) sind die EINZIGE Quelle und
// steuern Filter & Auto-Auswahl auf Screen 2.
function StandortScreen({ L, shadow, cardBg, isMobile, shapeMeta, fromMapFeature, site, plan, licht, setLicht, wasser, setWasser, boden, setBoden, drainage, setDrainage, ph, setPh, onOpenBiome, onNext }) {
  const card = { background: cardBg, borderRadius: 12, padding: '16px 18px', boxShadow: shadow, marginBottom: 14 }
  const hd = { fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }
  const hasShape = !!shapeMeta
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 24px' : '16px 24px 24px' }}>
      {/* Welcome */}
      <div style={{ ...card, background: A14, border: `1px solid ${A20}` }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: FG, marginBottom: 6 }}>🌿 Florales — Pflanzplanung für ökologische Projekte</div>
        <div style={{ fontSize: 13, color: FG, lineHeight: 1.6 }}>
          Florales hilft bei der Zusammenstellung und Planung von Staudenbeeten für ökologische
          Pflanzprojekte. Zeichne die exakte Fläche in der BIOME-Karte, lege Standort und
          gewünschte Pflanzen fest — anschließend planst du die Bepflanzung genau in dieser Form
          und bekommst eine wissenschaftliche Übersicht mit Pflege, Kalkulation und Bestellliste.
        </div>
      </div>

      {/* Fläche */}
      <div style={card}>
        <div style={hd}>📐 Fläche (Freiform aus BIOME)</div>
        {hasShape ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: A, background: A14, border: `1px solid ${A20}`, borderRadius: 999, padding: '3px 10px' }}>🗺️ {fromMapFeature?.label || 'Fläche'} aus BIOME</span>
              <button onClick={onOpenBiome} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>Andere Fläche zeichnen</button>
            </div>
            {/* Die echte Freiform — durchgängiger Anker in allen Modulen */}
            <div style={{ marginBottom: 12 }}>
              <ShapeView shapeMeta={shapeMeta} plan={plan || []} height={isMobile ? 220 : 300} L={L} cardBg={cardBg} showCodes />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
              <Meta label="Fläche" value={`${shapeMeta.area_m2} m²`} L={L} />
              <Meta label="Umfang" value={`${shapeMeta.perimeter_m} m`} L={L} />
              <Meta label="GPS" value={shapeMeta.centroid ? `${shapeMeta.centroid.lat.toFixed(4)}, ${shapeMeta.centroid.lng.toFixed(4)}` : '—'} L={L} />
              <Meta label="Höhe ü. NHN" value={site?.elevation != null ? `${site.elevation} m` : '…'} L={L} />
              <Meta label="Klimazone" value={site?.zone ? `${site.zone} (USDA)` : '…'} L={L} />
              <Meta label="Region" value={site?.region || '…'} L={L} />
              <Meta label="Niederschlag" value={site?.arid || '…'} L={L} />
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
            <div style={{ fontSize: 14, color: FG, fontWeight: 700, marginBottom: 6 }}>Zeichne deine Fläche in der Karte</div>
            <div style={{ fontSize: 12.5, color: MUTED, maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Reale Beete sind selten rechteckig — sie verlaufen entlang von Wegen, Wänden und Kanten.
              Zeichne die exakte Freiform auf dem Satellitenbild in BIOME; Florales übernimmt Form,
              Umfang, Fläche, GPS und Standortdaten und plant die Bepflanzung genau darin.
            </div>
            <button onClick={onOpenBiome} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, border: 'none', color: 'var(--luma-on-a)', borderRadius: 10, padding: '13px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              🗺️ Fläche in BIOME einzeichnen →
            </button>
          </div>
        )}
      </div>

      {/* Standortfaktoren */}
      <div style={card}>
        <div style={hd}>📍 Standortfaktoren</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
          <FilterGroup label="☀️ Licht" opts={LICHT_OPTS} selected={licht} onSelect={v => setLicht(licht === v ? null : v)} color="#d97706" L={L} isMobile={isMobile} />
          <FilterGroup label="💧 Wasser" opts={WASSER_OPTS} selected={wasser} onSelect={v => setWasser(wasser === v ? null : v)} color="#0ea5e9" L={L} isMobile={isMobile} />
          <FilterGroup label="🌍 Boden" opts={BODEN_OPTS} selected={boden} onSelect={v => setBoden(boden === v ? null : v)} color="#92400e" L={L} isMobile={isMobile} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🧪 Drainage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {DRAINAGE_OPTS.map(o => (
                <button key={String(o.value)} onClick={() => setDrainage(drainage === o.value ? null : o.value)} style={{
                  padding: '6px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left', cursor: 'pointer', fontWeight: drainage === o.value ? 700 : 500,
                  border: drainage === o.value ? `1.5px solid #92400e` : `1px solid ${BORDER}`, background: drainage === o.value ? '#92400e14' : 'transparent', color: drainage === o.value ? '#92400e' : MUTED,
                }}>{o.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🧫 pH-Wert</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PH_OPTS.map(o => (
                <button key={String(o.value)} onClick={() => setPh(ph === o.value ? null : o.value)} style={{
                  padding: '6px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left', cursor: 'pointer', fontWeight: ph === o.value ? 700 : 500,
                  border: ph === o.value ? `1.5px solid #7c3aed` : `1px solid ${BORDER}`, background: ph === o.value ? '#7c3aed14' : 'transparent', color: ph === o.value ? '#7c3aed' : MUTED,
                }}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!hasShape && <span style={{ fontSize: 12, color: MUTED }}>Zeichne zuerst eine Fläche in BIOME, um fortzufahren.</span>}
        <button onClick={onNext} disabled={!hasShape} style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', background: hasShape ? A : BORDER, border: 'none', color: hasShape ? 'var(--luma-on-a)' : MUTED, borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: hasShape ? 'pointer' : 'not-allowed' }}>
          Weiter zu Beet & Pflanzen →
        </button>
      </div>
    </div>
  )
}
function Meta({ label, value, L }) {
  return (
    <div style={{ background: L ? 'rgba(0,0,0,0.04)' : BG, borderRadius: 8, padding: '8px 10px', border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: FG, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

/* ─── BEETPLANER ─────────────────────────────────────────────────────────── */
// Dichte-Stufen = Ziel-Pflanzdichte in Krautigen/m². Die Stückzahlen (und damit
// die Bepflanzung) skalieren mit der Dichte; große Pflanzen bekommen anteilig
// weniger (über assignCounts/ROLE_WEIGHT & Ausbreitung).
const DENSITY_PERM2 = { 1: 4, 2: 6, 3: 8, 4: 11, 5: 15 }
const DENSITY_LABEL = { 1: 'sehr locker', 2: 'locker', 3: 'normal', 4: 'dicht', 5: 'sehr dicht' }
function BeetPlaner({ plan, beetW, setBeetW, beetH, setBeetH, beetForm, setBeetForm, beetArea, L, shadow, cardBg, onAddMore, onRescale, label, polygon, viewDir }) {
  const canvasRef = useRef(null)
  const [bloomMonth, setBloomMonth] = useState(0) // 0 = ganzjährig, 1-12 = Monat (Blühfolge)
  const [density, setDensity] = useState(3)       // 1 = sehr locker … 5 = sehr dicht
  const [view, setView] = useState('raster')      // 'raster' = Pflanzanleitung (Standard) · 'drift' = Drift-Karte (3D/Fotos archiviert)

  // Pflanzenverteilung: kollisionsbewusst platziert (Drifts, Höhenstaffelung),
  // deterministisch. Von Drift-Karte UND isometrischer Ansicht gemeinsam genutzt
  // (src/lib/beetLayout.js) → 2D-Plan und 3D zeigen exakt dasselbe Beet.
  const plantsWithPlacement = useMemo(
    () => computePlacement(plan, beetW, beetH),
    [plan, beetW, beetH]
  )

  const totalNeeded = plan.reduce((s, p) => {
    const ppm = 1 / Math.pow((p.pflanzabstand || 40) / 100, 2)
    return s + Math.round(beetArea * ppm * (1 / plan.length))
  }, 0)

  useEffect(() => {
    if (view !== 'drift') return
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

    // Pflanzen als Drifts – hinten (oben) zuerst gezeichnet, vorne überlagert (Schichtung).
    plantsWithPlacement.forEach(p => {
      const cx = p.px * scaleX
      const cy = p.py * scaleY
      const r = Math.max(3, Math.min(52, p._r * scaleX)) // _r = Radius in m (halbe Ausbreitung)
      const blooming = bloomMonth === 0 || (p.bluete_monate || []).includes(bloomMonth)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      if (blooming) {
        ctx.fillStyle = (p.bluete_farbe || '#10b981') + 'cc'
        ctx.fill()
        ctx.strokeStyle = L ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
        ctx.stroke()
      } else {
        // außerhalb der Blüte: gedämpft (Blühfolge sichtbar machen)
        ctx.fillStyle = L ? 'rgba(0,0,0,0.055)' : 'rgba(255,255,255,0.05)'
        ctx.fill()
        ctx.strokeStyle = L ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    })
  }, [plantsWithPlacement, beetW, beetH, beetForm, L, bloomMonth, view])

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
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{plan.length > 0 ? `${plan.reduce((s, p) => s + p.count, 0)} Pflanzen · ${plan.length} Arten · ${(plan.reduce((s, p) => s + p.count, 0) / Math.max(beetArea, 0.1)).toFixed(1)}/m²` : 'Pflanzen zum Plan hinzufügen'}</div>
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
          {/* Dichte-Regler (global): steuert Pflanzdichte (Stück/m²) – Mengen skalieren
              rollen-/größengerecht mit. Große Pflanzen bekommen anteilig weniger. */}
          <div style={{ background: cardBg, borderRadius: 12, padding: '14px 16px', boxShadow: shadow, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 700, whiteSpace: 'nowrap' }}>
              🌱 Pflanzdichte: <span style={{ color: A }}>{DENSITY_LABEL[density]}</span> <span style={{ color: MUTED, fontWeight: 400 }}>(~{DENSITY_PERM2[density]} Stauden/m²)</span>
            </span>
            <input type="range" min={1} max={5} step={1} value={density}
              onChange={e => { const v = +e.target.value; setDensity(v); onRescale?.(DENSITY_PERM2[v]) }}
              style={{ flex: 1, minWidth: 160, accentColor: A, cursor: 'pointer' }} />
          </div>

          {/* Ansicht-Umschalter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              ['raster', <LayoutGrid size={14} key="r" />, 'Rasterplan'],
              ['drift', <MapIcon size={14} key="d" />, 'Drift-Karte'],
            ].map(([v, icon, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                fontSize: 12.5, cursor: 'pointer', fontWeight: view === v ? 700 : (L ? 500 : 400),
                border: view === v ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
                background: view === v ? A14 : 'transparent', color: view === v ? A : MUTED,
              }}>{icon} {lbl}</button>
            ))}
          </div>

          {/* ── PFLANZANLEITUNG (Rasterplan mit Vierecken) ── */}
          {view === 'raster' && (
            <RasterPlan plan={plan} beetW={beetW} beetH={beetH} beetArea={beetArea}
              L={L} shadow={shadow} cardBg={cardBg} label={label} polygon={polygon} viewDir={viewDir} />
          )}

          {/* ── DRIFT-KARTE (kontinuierliche Blühfolge) ── */}
          {view === 'drift' && (
            <div style={{ background: cardBg, borderRadius: 12, padding: 16, boxShadow: shadow, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }}>
                🗺️ Drift-Karte — {beetW}m × {beetH}m
              </div>
              {/* Saison-Regler: Blühfolge sichtbar machen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: bloomMonth === 0 ? MUTED : A, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 108 }}>
                  🗓️ {bloomMonth === 0 ? 'Ganzjährig' : `Blüte im ${MONTHS[bloomMonth - 1]}`}
                </span>
                <input type="range" min={0} max={12} step={1} value={bloomMonth}
                  onChange={e => setBloomMonth(+e.target.value)}
                  style={{ flex: 1, accentColor: A, cursor: 'pointer' }} />
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
          )}

          {/* Pflanzabstände & Mengen (immer sichtbar) */}
          <div style={{ background: cardBg, borderRadius: 12, padding: '16px 18px', boxShadow: shadow }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, fontWeight: L ? 700 : 400 }}>
              📏 Pflanzabstände & Mengen
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
              {plan.reduce((s, p) => s + p.count, 0)} Pflanzen auf {beetArea.toFixed(1)} m² · Ø {(plan.reduce((s, p) => s + p.count, 0) / Math.max(beetArea, 0.1)).toFixed(1)}/m²
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {plan.map(p => {
                const spacing = p.pflanzabstand || 40
                const flaeche = (p.count * Math.pow(spacing / 100, 2)) // grobe belegte Fläche (m²)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.bluete_farbe || A, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: FG, fontWeight: L ? 600 : 400 }}>{p.name}</span>
                    <span style={{ color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 10 }}>Ø {spacing}cm · ~{flaeche.toFixed(1)}m²</span>
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

/* ─── BESTÄUBER / TRACHTKALENDER ─────────────────────────────────────────── */
// POLLI_GROUPS kommt aus beetLayout.js.
// Hauptflugzeit der Bestäuber (April–September): Blühlücken hier sind kritisch.
const FORAGE_SEASON = [4, 5, 6, 7, 8, 9]

// „Was blüht wann für wen": Matrix Bestäubergruppe × Monat, Zelle = Anzahl der
// Arten im Plan, die diese Gruppe versorgen UND in dem Monat blühen. Lücken in
// der Hauptflugzeit werden hervorgehoben (wissenschaftlicher als Pathmaker).
function ForageCalendar({ plan, L, shadow }) {
  const groups = POLLI_GROUPS.filter(g => plan.some(p => p[g.key]))
  if (!groups.length) return null
  const val = (gk, mi) => plan.filter(p => p[gk] && p.bluete_monate?.includes(mi + 1)).length
  const maxByGroup = Object.fromEntries(groups.map(g => [g.key, Math.max(1, ...MONTHS.map((_, mi) => val(g.key, mi)))]))
  const gaps = groups.flatMap(g => FORAGE_SEASON.filter(m => val(g.key, m - 1) === 0).map(m => ({ g, m })))

  return (
    <div style={{ background: L ? '#fff' : SURFACE, borderRadius: 12, padding: '16px 18px', boxShadow: shadow, marginBottom: 4, marginTop: 12 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, fontWeight: L ? 700 : 400 }}>🐝 Trachtkalender — was blüht wann für wen</div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>Arten im Plan, die je Gruppe & Monat Nahrung bieten. Rot = Lücke in der Hauptflugzeit (Apr–Sep).</div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 420 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '96px repeat(12,1fr)', gap: 3, marginBottom: 3 }}>
            <span />
            {MONTHS.map(m => <span key={m} style={{ textAlign: 'center', fontSize: 8, color: MUTED, fontFamily: "'Space Mono', monospace", fontWeight: L ? 700 : 400 }}>{m}</span>)}
          </div>
          {groups.map(g => (
            <div key={g.key} style={{ display: 'grid', gridTemplateColumns: '96px repeat(12,1fr)', gap: 3, marginBottom: 3, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: FG, fontWeight: L ? 600 : 400, whiteSpace: 'nowrap' }}>{g.emoji} {g.label}</span>
              {MONTHS.map((m, mi) => {
                const v = val(g.key, mi)
                const isSeason = FORAGE_SEASON.includes(mi + 1)
                const bg = v > 0
                  ? `rgba(4,122,60,${0.2 + 0.6 * v / maxByGroup[g.key]})`
                  : (isSeason ? 'rgba(220,38,38,0.16)' : (L ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'))
                return (
                  <span key={m} title={`${g.label} · ${m}: ${v} Art(en)`} style={{
                    height: 22, borderRadius: 4, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: v > 0 ? '#fff' : (isSeason ? '#dc2626' : MUTED),
                    border: v === 0 && isSeason ? '1px solid rgba(220,38,38,0.4)' : 'none',
                  }}>{v > 0 ? v : (isSeason ? '!' : '·')}</span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {gaps.length > 0 && (
        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 10, background: 'rgba(220,38,38,0.08)', borderRadius: 6, padding: '7px 10px' }}>
          ⚠️ Blühlücke: {groups.filter(g => FORAGE_SEASON.some(m => val(g.key, m - 1) === 0)).map(g => {
            const gm = FORAGE_SEASON.filter(m => val(g.key, m - 1) === 0).map(m => MONTHS[m - 1]).join(', ')
            return `${g.label} (${gm})`
          }).join(' · ')} — eine früher/später blühende Art derselben Gruppe ergänzen.
        </div>
      )}
    </div>
  )
}


/* ─── RASTERPLAN — druckbare Pflanzanleitung (Vierecke wie Pathmaker) ─────── */
const RASTER_CELLS = [
  { cm: 25, label: '25 cm' },
  { cm: 33, label: '33 cm' },
  { cm: 50, label: '50 cm' },
]
function RasterPlan({ plan, beetW, beetH, beetArea, L, shadow, cardBg, label, polygon, viewDir }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [cellCm, setCellCm] = useState(33)
  const [showCodes, setShowCodes] = useState(true)

  const grid = useMemo(() => buildGrid(plan, beetW, beetH, cellCm, { polygon, viewDir }), [plan, beetW, beetH, cellCm, polygon, viewDir])
  const codeById = useMemo(() => new Map(grid.legend.map(l => [l.id, l])), [grid])

  const draw = () => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const cssW = wrap.clientWidth
    const cell = Math.max(10, Math.min(46, (cssW - 4) / grid.cols))
    const cssH = cell * grid.rows + 4
    canvas.width = cssW * DPR; canvas.height = cssH * DPR
    canvas.style.height = cssH + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    const ox = (cssW - grid.cols * cell) / 2, oy = 2
    for (let idx = 0; idx < grid.cells.length; idx++) {
      if (grid.inside && !grid.inside[idx]) continue   // außerhalb der Beetform → nicht zeichnen
      const col = idx % grid.cols, row = Math.floor(idx / grid.cols)
      const x = ox + col * cell, y = oy + row * cell
      const id = grid.cells[idx]
      const leg = id && codeById.get(id)
      ctx.fillStyle = leg ? leg.farbe : (L ? '#f1f4ef' : '#1a241d')
      ctx.globalAlpha = leg ? 0.9 : 1
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      ctx.globalAlpha = 1
      ctx.strokeStyle = L ? 'rgba(5,46,22,0.18)' : 'rgba(255,255,255,0.16)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      if (showCodes && leg && cell >= 16) {
        ctx.fillStyle = pickTextColor(leg.farbe)
        ctx.font = `bold ${Math.min(13, cell * 0.42)}px monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(leg.code, x + cell / 2, y + cell / 2)
      }
    }
  }
  useEffect(draw, [grid, codeById, L, showCodes])
  useEffect(() => { const r = () => draw(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }) // eslint-disable-line

  function exportPng() {
    const DPR = 2
    const cell = 34
    const gw = grid.cols * cell, gh = grid.rows * cell
    const HEAD = 54, PAD = 24
    const legRows = grid.legend.length
    const LEG = 26 + legRows * 20 + 16
    const W = Math.max(gw + PAD * 2, 460), H = HEAD + gh + 40 + LEG
    const oc = document.createElement('canvas'); oc.width = W * DPR; oc.height = H * DPR
    const ctx = oc.getContext('2d'); ctx.scale(DPR, DPR)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
    // Kopf
    ctx.fillStyle = '#052e16'; ctx.fillRect(0, 0, W, HEAD)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'
    ctx.fillText('PFLANZANLEITUNG — LUMA BIOME', 20, 23)
    ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(`${label || `${beetW}m × ${beetH}m`} · Raster ${grid.cellCm} cm · ${grid.cols}×${grid.rows} Zellen`, 20, 41)
    ctx.textAlign = 'right'; ctx.fillText(new Date().toLocaleDateString('de-DE'), W - 20, 41); ctx.textAlign = 'left'
    // Raster
    const gx0 = (W - gw) / 2, gy0 = HEAD + 16
    for (let idx = 0; idx < grid.cells.length; idx++) {
      if (grid.inside && !grid.inside[idx]) continue   // außerhalb der Beetform
      const col = idx % grid.cols, row = Math.floor(idx / grid.cols)
      const x = gx0 + col * cell, y = gy0 + row * cell
      const leg = grid.cells[idx] && codeById.get(grid.cells[idx])
      ctx.fillStyle = leg ? leg.farbe : '#f0f0f0'
      ctx.fillRect(x, y, cell, cell)
      ctx.strokeStyle = 'rgba(5,46,22,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      if (leg) {
        ctx.fillStyle = pickTextColor(leg.farbe); ctx.font = 'bold 13px monospace'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(leg.code, x + cell / 2, y + cell / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }
    }
    // Achsenbeschriftung (Spalten/Reihen), damit man Zellen findet
    ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'center'
    for (let c = 0; c < grid.cols; c++) ctx.fillText(String(c + 1), gx0 + c * cell + cell / 2, gy0 - 4)
    ctx.textAlign = 'right'
    for (let r = 0; r < grid.rows; r++) ctx.fillText(String(r + 1), gx0 - 4, gy0 + r * cell + cell / 2 + 3)
    ctx.textAlign = 'left'
    // Legende
    const ly0 = gy0 + gh + 30
    ctx.fillStyle = '#052e16'; ctx.font = 'bold 10px monospace'; ctx.fillText('LEGENDE', 20, ly0)
    ctx.textAlign = 'right'; ctx.fillStyle = '#666'; ctx.font = '10px sans-serif'
    ctx.fillText(`${grid.legend.reduce((s, l) => s + l.cells, 0)} Pflanzen · ${beetArea.toFixed(1)} m²`, W - 20, ly0); ctx.textAlign = 'left'
    grid.legend.forEach((l, i) => {
      const y = ly0 + 20 + i * 20
      ctx.fillStyle = l.farbe; ctx.fillRect(20, y - 10, 14, 14)
      ctx.strokeStyle = '#ccc'; ctx.strokeRect(20.5, y - 9.5, 13, 13)
      ctx.fillStyle = pickTextColor(l.farbe); ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'
      ctx.fillText(l.code, 27, y - 0.5); ctx.textAlign = 'left'
      ctx.fillStyle = '#111'; ctx.font = '600 11px sans-serif'; ctx.fillText(l.name, 44, y)
      ctx.fillStyle = '#666'; ctx.font = 'italic 10px sans-serif'
      ctx.fillText(l.latin, 44 + ctx.measureText(l.name + '  ').width, y)
      ctx.fillStyle = '#047a3c'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`${l.cells}×`, W - 60, y)
      ctx.fillStyle = '#999'; ctx.font = '9px monospace'; ctx.fillText(`Ø${l.pflanzabstand}cm`, W - 20, y); ctx.textAlign = 'left'
    })
    oc.toBlob(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pflanzanleitung-luma-${new Date().toISOString().slice(0, 10)}.png`; a.click() }, 'image/png')
  }

  return (
    <div style={{ background: cardBg, borderRadius: 12, padding: 16, boxShadow: shadow, marginBottom: 16 }} ref={wrapRef}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, fontWeight: L ? 700 : 400 }}>
        🧭 Pflanzanleitung — Raster {grid.cols}×{grid.rows}
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
        Jede Zelle = {grid.cellCm}×{grid.cellCm} cm = eine Pflanze. Setze die Art laut Farbe/Code an ihre Position.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Rasterweite:</span>
        {RASTER_CELLS.map(rc => (
          <button key={rc.cm} onClick={() => setCellCm(rc.cm)} style={{
            padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: cellCm === rc.cm ? 700 : 400,
            border: cellCm === rc.cm ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
            background: cellCm === rc.cm ? A14 : 'transparent', color: cellCm === rc.cm ? A : MUTED,
          }}>{rc.label}</button>
        ))}
        <label style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 4 }}>
          <input type="checkbox" checked={showCodes} onChange={e => setShowCodes(e.target.checked)} /> Codes anzeigen
        </label>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
      </div>
      {/* Legende */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 12 }}>
        {grid.legend.map(l => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: l.farbe, color: pickTextColor(l.farbe), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{l.code}</span>
            <span style={{ flex: 1, color: FG, fontWeight: L ? 600 : 400 }}>{l.name} <span style={{ color: MUTED, fontStyle: 'italic', fontWeight: 400 }}>{l.latin}</span></span>
            {l.heimisch && <span style={{ fontSize: 9, border: `1px solid ${A}`, color: A, borderRadius: 5, padding: '0 5px' }}>heim.</span>}
            <span style={{ color: A, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{l.cells}×</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 12 }}>
        <button onClick={exportPng} style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          background: A14, border: `1px solid ${A20}`, color: A,
          borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}><Download size={13} /> Pflanzanleitung als PNG</button>
      </div>
    </div>
  )
}
// Textfarbe (schwarz/weiß) nach Kontrast zur Zellfarbe wählen.
function pickTextColor(hex) {
  const h = (hex || '#10b981').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1a2b1f' : '#ffffff'
}

/* ─── PLANT CARD ─────────────────────────────────────────────────────────── */
/* ─── PLANT IMAGE + GALLERY ─────────────────────────────────────────────── */
// Bilder zu einer Art per botanischem Namen holen (funktioniert auch ohne
// hinterlegtes wiki_img). Lead-Bild via Wikipedia-REST (de → en), weitere Bilder
// via Action-API. Ergebnis pro Art gecacht, damit die Grid-Ansicht nicht flutet.
const _imgCache = new Map() // latin -> Promise<string[]>
async function fetchPlantImages(latin, seed) {
  const key = latin || seed || ''
  if (_imgCache.has(key)) return _imgCache.get(key)
  const title = encodeURIComponent((latin || '').replace(/ /g, '_'))
  const promise = (async () => {
    const urls = []
    if (seed) urls.push(seed)
    // Lead-Bild (Habitus) über die REST-Summary — deutsche Wikipedia bevorzugt
    for (const lang of ['de', 'en']) {
      try {
        const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`)
        if (!r.ok) continue
        const d = await r.json()
        const u = d?.originalimage?.source || d?.thumbnail?.source
        if (u && !urls.includes(u)) { urls.push(u); break }
      } catch { /* weiter */ }
    }
    // Weitere Bilder aus der Bildliste des Artikels
    try {
      const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=images&format=json&origin=*&imlimit=20`)
      if (r.ok) {
        const d = await r.json()
        const page = Object.values(d?.query?.pages || {})[0]
        const candidates = (page?.images || []).map(i => i.title)
          .filter(t => /\.(jpg|jpeg|png)$/i.test(t))
          .filter(t => !/Flag_|Icon_|Logo_|Map_|Stub_|Pictogram|Symbol|Arrow|Button|Disambig|Commons-logo|Question_|Edit-|Ambox/i.test(t))
          .slice(0, 10)
        if (candidates.length) {
          const r2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${candidates.map(c => encodeURIComponent(c)).join('|')}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`)
          if (r2.ok) {
            const d2 = await r2.json()
            Object.values(d2?.query?.pages || {})
              .map(p => p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url)
              .filter(Boolean)
              .filter(u => u.includes('wikimedia') && !urls.includes(u))
              .forEach(u => urls.push(u))
          }
        }
      }
    } catch { /* egal */ }
    return [...new Set(urls)].slice(0, 6)
  })()
  _imgCache.set(key, promise)
  return promise
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
    let alive = true
    setIdx(0)
    fetchPlantImages(plant.latin, plant.wiki_img).then(imgs => { if (alive && imgs.length) setImages(imgs) })
    return () => { alive = false }
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
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'rgba(127,127,127,0.10)' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img src={images[idx]} alt={plant.latin}
          style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block' }}
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
  const [src, setSrc] = useState(p.wiki_img || null)
  const [error, setError] = useState(false)
  const ref = useRef(null)
  const h = compact ? 52 : 110
  const w = compact ? 52 : '100%'
  useEffect(() => {
    setError(false)
    setSrc(p.wiki_img || null)
    if (p.wiki_img) return
    const load = () => fetchPlantImages(p.latin).then(a => { if (a[0]) setSrc(a[0]) })
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { load(); return }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); load() }
    }, { rootMargin: '250px' })
    io.observe(el)
    return () => io.disconnect()
  }, [p.latin])
  if (!src || error) return (
    <div ref={ref} style={{ width: w, height: h, flexShrink: 0, background: p.bluete_farbe ? p.bluete_farbe + '22' : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: compact ? 20 : 36, height: compact ? 20 : 36, borderRadius: '50%', background: p.bluete_farbe || A, opacity: 0.5 }} />
    </div>
  )
  return (
    <img ref={ref} src={src} alt={p.latin}
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
// Workflow-Stepper: nummerierter, geführter Ablauf. Desktop = horizontale
// Schrittleiste mit Verbindungslinie; Mobil = kompakte Punktreihe + aktueller
// Schritt gross darüber. Jeder Schritt ist anklickbar (Sprung).
function WorkflowStepper({ active, setActive, isMobile, L, planCount, hasPlan }) {
  const cur = STEP_INDEX(active)
  const done = i => i < cur || (i <= cur && hasPlan) // erledigt: bereits durchlaufen oder Plan vorhanden

  if (isMobile) {
    const s = STEPS[cur]
    return (
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, fontWeight: 700 }}>Schritt {cur + 1}/{STEPS.length}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: FG }}>{s.emoji} {s.label}</span>
          {active === 'plan' && planCount > 0 && <span style={{ fontSize: 11, color: MUTED }}>· {planCount}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((st, i) => (
            <button key={st.key} onClick={() => setActive(st.key)} aria-label={st.label} style={{
              flex: 1, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
              background: i === cur ? A : (done(i) ? A20 : (L ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)')),
            }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{s.hint}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 4 }}>
      {STEPS.map((st, i) => {
        const isCur = i === cur, isDone = done(i) && !isCur
        return (
          <div key={st.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : '0 0 auto' }}>
            <button onClick={() => setActive(st.key)} title={st.hint} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
              border: isCur ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
              background: isCur ? A14 : (L ? '#fff' : 'transparent'),
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, fontFamily: "'Space Mono', monospace",
                background: isCur ? A : (isDone ? A : (L ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)')),
                color: (isCur || isDone) ? 'var(--luma-on-a, #fff)' : MUTED,
              }}>{isDone ? '✓' : (i + 1)}</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: isCur ? 700 : (L ? 600 : 500), color: isCur ? A : FG }}>{st.emoji} {st.label}</span>
                <span style={{ fontSize: 10, color: MUTED, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.hint}</span>
              </span>
              {st.key === 'plan' && planCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: A, background: A14, borderRadius: 999, padding: '1px 8px' }}>{planCount}</span>}
            </button>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: done(i + 1) ? A20 : BORDER, minWidth: 10 }} />}
          </div>
        )
      })}
    </div>
  )
}

// Persistenter Fuss-Navigator „Zurück / Weiter" — führt den Nutzer Schritt für
// Schritt durch den Workflow (identisch auf Handy & Desktop).
function WorkflowFooter({ active, setActive, isMobile, L, hasPlan }) {
  const cur = STEP_INDEX(active)
  const prev = STEPS[cur - 1], next = STEPS[cur + 1]
  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: isMobile ? '8px 12px calc(8px + env(safe-area-inset-bottom))' : '10px 24px',
      borderTop: `1px solid ${BORDER}`, background: L ? '#fff' : SURFACE,
    }}>
      {prev ? (
        <button onClick={() => setActive(prev.key)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
          border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontSize: 13, fontWeight: 500,
        }}><ChevronLeft size={15} />{isMobile ? '' : 'Zurück'}</button>
      ) : <span />}
      <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: MUTED }}>
        {isMobile ? `${cur + 1}/${STEPS.length}` : `Schritt ${cur + 1} von ${STEPS.length} · ${STEPS[cur].label}`}
      </span>
      {next ? (
        <button onClick={() => setActive(next.key)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
          border: 'none', background: A, color: 'var(--luma-on-a, #fff)', fontSize: 13, fontWeight: 700,
        }}>Weiter: {next.short} <ChevronRight size={15} /></button>
      ) : (
        <span style={{ fontSize: 12, color: hasPlan ? A : MUTED, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasPlan ? '✓ Plan fertig — exportieren' : 'Plan noch leer'}
        </span>
      )}
    </div>
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

function FilterSection({ label, open, onToggle, count = 0, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '11px 2px', color: FG }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
          {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: A, background: A14, borderRadius: 20, padding: '1px 7px', lineHeight: 1.6 }}>{count}</span>}
        </span>
        {open ? <ChevronUp size={15} color={MUTED} /> : <ChevronDown size={15} color={MUTED} />}
      </button>
      {open && <div style={{ padding: '2px 2px 14px' }}>{children}</div>}
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

// Simple Bestellliste für die Baumschule als CSV (öffnet direkt in Excel).
// Semikolon-getrennt (deutsches Excel), UTF-8-BOM für Umlaute.
function exportBaumschulCsv(plan, { label } = {}) {
  const esc = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const header = ['Nr', 'Anzahl', 'Art (deutsch)', 'Art (botanisch)', 'Pflanzabstand (cm)', 'heimisch']
  const rows = plan.map((p, i) => [i + 1, p.count, p.name, p.latin, p.pflanzabstand || 40, p.heimisch ? 'ja' : 'nein'])
  const total = plan.reduce((s, p) => s + p.count, 0)
  rows.push(['', total, `SUMME (${plan.length} Arten)`, '', '', ''])
  const csv = [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `baumschul-bestellliste-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

function exportPlan(plan, habitats = []) {
  const mat = rollupMaterial(habitats)
  const lines = [
    'PFLANZ- & HABITATPLAN — LUMA BIOME',
    '='.repeat(50), '',
    'PFLANZLISTE:',
    ...plan.map(p => `  ${p.count}x  ${p.name} (${p.latin})\n       Licht: ${p.licht.map(l => LICHT_LABELS[l]).join('/')} | Wasser: ${p.wasser.map(w => WASSER_LABELS[w]).join('/')} | Abstand: ${p.pflanzabstand || 40}cm`),
    '',
    `GESAMT: ${plan.reduce((s, p) => s + p.count, 0)} Pflanzen (${plan.length} Arten)`,
    ...(habitats.length ? [
      '', 'HABITATELEMENTE:',
      ...habitats.map(h => `  ${h.count}x  ${h.name} (${HABITAT_KATEGORIE_LABELS[h.kategorie] || h.kategorie}) — Aufwand ${(h.aufwand_h || 0) * h.count} h`),
      '', 'MATERIAL (aggregiert):',
      ...mat.map(m => `  ${m.menge} ${m.einheit}  ${m.material}`),
    ] : []),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'pflanzplan-luma.txt'
  a.click()
}

function seasonMonth(s) {
  if (!s) return 4
  if (s.includes('Frühjahr')) return 3
  if (s.includes('Herbst')) return 9
  if (s.includes('Sommer')) return 6
  if (s.includes('Winter')) return 11
  return 4
}
function nextDateForMonth(month) {
  const now = new Date()
  let year = now.getFullYear()
  if (now.getMonth() + 1 > month) year += 1
  return `${year}-${String(month).padStart(2, '0')}-15`
}

function rollupMaterial(habitats) {
  const acc = new Map()
  for (const h of habitats)
    for (const m of (h.material || [])) {
      const key = `${m.material}|${m.einheit}`
      acc.set(key, (acc.get(key) || 0) + (m.menge || 0) * (h.count || 1))
    }
  return [...acc.entries()].map(([k, menge]) => {
    const [material, einheit] = k.split('|')
    return { material, menge: Math.round(menge * 100) / 100, einheit }
  }).sort((a, b) => a.material.localeCompare(b.material))
}

/* ─── GENERATOR (Säule 2) ────────────────────────────────────────────────────
   Greedy-Optimierung: wählt aus dem standortpassenden Pool iterativ die Art mit
   dem höchsten marginalen Score (Blühfolge schließen, Bestäubergruppen abdecken,
   Bienenwert, Heimisch-Bonus, Ästhetik). Deterministisch — kein Zufall. */
const GEN_GROUP_KEYS = ['bienen', 'tagfalter', 'nachtfalter', 'kaefer', 'voegel']
// Empfohlene Stückzahl für eine kleine Pflanzgruppe (~1 m² Drift) anhand des Pflanzabstands.
function suggestQty(plant) {
  const spacing = (plant?.pflanzabstand || 40) / 100
  return Math.min(24, Math.max(3, Math.round(1 / (spacing * spacing))))
}

// Strukturelle Rolle einer Art – steuert rollengerechte Stückzahlen UND die
// Höhenschichtung in der Beet-Visualisierung.
function plantRole(p) {
  const h = p.hoehe?.[1] ?? 50
  if (p.type === 'baum') return 'baum'
  if (p.type === 'strauch') return 'strauch'
  if (p.funktion === 'Zw') return 'geophyt'
  if (p.type === 'gras') return 'gras'
  if (p.funktion === 'Ge' || h >= 120) return 'geruest'                                   // Gerüstbildner (hoch, wenige)
  if (p.funktion === 'Bo' || p.wuchsform === 'kriechend' || p.wuchsform === 'polster' || h < 25) return 'bodendecker'
  if (h >= 60) return 'begleit'                                                            // Struktur-/Leitstaude
  return 'fuell'                                                                           // Füllstaude
}

// Rollengerechte Mengen (Staudenmischpflanzung-Prinzip): Gehölze als Einzel-
// exemplare/Akzente, Krautige nach Ziel-Gesamtdichte × Rollen-Gewicht – statt
// die Fläche stur gleich auf alle Arten zu verteilen (das ergab „120× Löwenzahn").
const HERB_DENSITY = 8 // Stauden/m² – Standard-Zielgesamtdichte („normal")
const ROLE_WEIGHT = { geruest: 0.4, begleit: 1, fuell: 1.2, bodendecker: 1.7, gras: 0.9, geophyt: 1 }
// perM2: gewünschte Krautige/m² (Pflanzdichte). Gehölze bleiben Einzelakzente.
function assignCounts(species, area, perM2 = HERB_DENSITY) {
  const woody = [], herb = []
  species.forEach(p => (p.type === 'baum' || p.type === 'strauch' ? woody : herb).push(p))
  const counts = new Map()
  let woodyArea = 0
  for (const p of woody) {
    const spread = (p.ausbreitung || p.pflanzabstand || (p.type === 'baum' ? 400 : 180)) / 100
    const footprint = Math.max(0.25, spread * spread)
    const n = Math.max(1, Math.min(Math.round(area / (footprint * 4)), p.type === 'baum' ? 2 : 5))
    woodyArea += n * footprint
    counts.set(p.id, n)
  }
  const herbArea = Math.max(area - woodyArea, area * 0.35)
  const totalHerb = Math.max(herb.length, Math.round(perM2 * herbArea))
  const totalW = herb.reduce((s, p) => s + (ROLE_WEIGHT[plantRole(p)] ?? 1), 0) || 1
  for (const p of herb) {
    const raw = totalHerb * (ROLE_WEIGHT[plantRole(p)] ?? 1) / totalW
    counts.set(p.id, Math.max(1, Math.round(raw)))
  }
  return species.map(p => ({ ...p, count: counts.get(p.id) ?? 1, role: plantRole(p) }))
}

// Deterministische Pseudozufallszahlen (kein Math.random – Plan muss reproduzierbar sein).
function hashStr(s) { let h = 2166136261; const t = String(s); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function seededRand(seed) { let t = (seed >>> 0) + 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
// candPool: optionaler, bereits gefilterter Kandidatenpool (z.B. aus der Suchansicht),
// damit die Auto-Auswahl ALLE aktiven Filter berücksichtigt statt nur Standort.
function generatePlan({ licht = 1, wasser = 2, boden = null, area = 10, targetCount = 12, wBloom = 2, wBee = 2, wHeimisch = 1, wZier = 1, targetGroups = ['bienen'], candPool = null }) {
  const pool = candPool || filterPlants({ licht, wasser, boden }).filter(p => ['staude', 'gras', 'einjährig', 'zweijährig'].includes(p.type))
  const covered = new Set(), groupCov = new Set(), chosen = [], chosenIds = new Set()
  while (chosen.length < targetCount) {
    let best = null, bestScore = -Infinity
    for (const p of pool) {
      if (chosenIds.has(p.id)) continue
      const newMonths = (p.bluete_monate || []).filter(m => !covered.has(m)).length
      const beeVal = ((p.nektar || 0) + (p.pollen || 0) + (p.insekten || 0)) / 15
      const grpMatch = targetGroups.length ? targetGroups.filter(g => p[g]).length / targetGroups.length : 1
      const newGroups = GEN_GROUP_KEYS.filter(g => p[g] && !groupCov.has(g)).length
      const score = wBloom * (newMonths + newGroups * 0.5) + wBee * (beeVal * 5) + wHeimisch * (p.heimisch ? 1.5 : 0) + wZier * ((p.zierwert || 3) / 5 * 2) + grpMatch
      if (score > bestScore) { bestScore = score; best = p }
    }
    if (!best) break
    chosenIds.add(best.id); chosen.push(best)
    ;(best.bluete_monate || []).forEach(m => covered.add(m))
    GEN_GROUP_KEYS.forEach(g => { if (best[g]) groupCov.add(g) })
  }
  return assignCounts(chosen, area)
}
function suggestHabitats({ licht = 1, wasser = 2 }) {
  const ids = new Set(['insektentraenke', 'liegendes-totholz', 'vogelkasten'])
  if (wasser >= 3) { ids.add('sumpfbeet'); ids.add('teich') }
  if (wasser <= 1 && licht === 1) { ids.add('sandarium'); ids.add('lesesteinhaufen'); ids.add('wildbienen-nisthilfe') }
  return HABITATS.filter(h => ids.has(h.id)).map(h => ({ ...h, count: 1 }))
}

// Offscreen-Schnappschuss der isometrischen Ansicht (Hochsommer, feste Kamera)
// als dataURL — für die Einbettung ins Plan-PDF.
function renderIsoSnapshot(plan, beetW = 6, beetH = 4, month = 7) {
  try {
    const placement = computePlacement(plan, beetW, beetH)
    if (!placement.length) return null
    const W = 1000, H = 460
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    const theta = -0.5, cos = Math.cos(theta), sin = Math.sin(theta)
    const S = Math.min(W / (beetW + 3), H / ((beetH + 4) * 0.55))
    const cx = W / 2, cy = H * 0.58
    const P = (x, y) => { const xr = (x - beetW / 2) * cos - (y - beetH / 2) * sin, yr = (x - beetW / 2) * sin + (y - beetH / 2) * cos; return [cx + xr * S, cy + yr * S * 0.5] }
    ctx.strokeStyle = 'rgba(4,122,60,0.12)'
    for (let gx = -3; gx <= beetW + 3; gx++) { const a = P(gx, -2), b = P(gx, beetH + 2); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
    for (let gy = -2; gy <= beetH + 2; gy++) { const a = P(-3, gy), b = P(beetW + 3, gy); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
    ctx.fillStyle = '#eef4ea'; ctx.beginPath();[[0, 0], [beetW, 0], [beetW, beetH], [0, beetH]].forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]) }); ctx.closePath(); ctx.fill()
    const growth = growthForMonth(month), gb = growthBucket(month)
    const order = placement.map(p => { const [sx, sy] = P(p.px, p.py); return { p, sx, sy } }).sort((a, b) => a.sy - b.sy)
    for (const { p, sx, sy } of order) {
      const img = plantSprite(p, stateForMonth(p, month), growth, gb, (Math.round(p.px * 7) + Math.round(p.py * 13)) % 2)
      const scale = (S / SPRITE_PX_PER_M) * 1.05, w = img.width * scale, h = img.height * scale
      ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(4, w * 0.22), Math.max(2, w * 0.09), 0, 0, 7); ctx.fill()
      ctx.drawImage(img, sx - w / 2, sy - h, w, h)
    }
    return cv.toDataURL('image/jpeg', 0.82)
  } catch { return null }
}
// Offscreen-Schnappschuss des Rasterplans (Vierecke + Codes) als dataURL.
function renderRasterSnapshot(plan, beetW = 6, beetH = 4, cellCm = 33) {
  try {
    const g = buildGrid(plan, beetW, beetH, cellCm)
    if (!g.legend.length) return null
    const by = new Map(g.legend.map(l => [l.id, l]))
    const cell = Math.max(16, Math.min(40, Math.floor(900 / g.cols)))
    const pad = 22
    const W = g.cols * cell + pad * 2, H = g.rows * cell + pad * 2
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    for (let idx = 0; idx < g.cells.length; idx++) {
      const col = idx % g.cols, row = Math.floor(idx / g.cols), x = pad + col * cell, y = pad + row * cell
      const leg = g.cells[idx] && by.get(g.cells[idx])
      ctx.fillStyle = leg ? leg.farbe : '#f0f0f0'; ctx.fillRect(x, y, cell, cell)
      ctx.strokeStyle = 'rgba(5,46,22,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      if (leg && cell >= 16) { ctx.fillStyle = pickTextColor(leg.farbe); ctx.font = `bold ${Math.min(13, cell * 0.42)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(leg.code, x + cell / 2, y + cell / 2) }
    }
    ctx.fillStyle = '#888'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    for (let c = 0; c < g.cols; c++) ctx.fillText(String(c + 1), pad + c * cell + cell / 2, pad - 6)
    ctx.textAlign = 'right'
    for (let r = 0; r < g.rows; r++) ctx.fillText(String(r + 1), pad - 6, pad + r * cell + cell / 2 + 3)
    return cv.toDataURL('image/jpeg', 0.85)
  } catch { return null }
}

function exportPdf(plan, { label, beetArea, beetW, beetH, habitats = [], site = null, shapeMeta = null } = {}) {
  const isoImg = renderIsoSnapshot(plan, beetW || 6, beetH || 4, 7)
  const rasterImg = renderRasterSnapshot(plan, beetW || 6, beetH || 4, 33)
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

  // ── Habitat-Abschnitte ──
  const habTotal = habitats.reduce((s, h) => s + (h.count || 0), 0)
  const habAufwand = habitats.reduce((s, h) => s + (h.aufwand_h || 0) * (h.count || 1), 0)
  const habRows = habitats.map((h, i) => `
    <tr>
      <td class="nr">${i + 1}</td>
      <td class="name">${h.bild_emoji || ''} ${h.name}</td>
      <td>${HABITAT_KATEGORIE_LABELS[h.kategorie] || h.kategorie}</td>
      <td class="center">${h.count}</td>
      <td class="center">${h.flaeche_m2 ? (Math.round(h.flaeche_m2 * h.count * 10) / 10) + ' m²' : '—'}</td>
      <td class="center">${Math.round((h.aufwand_h || 0) * h.count * 10) / 10} h</td>
      <td>${h.jahreszeit || '—'}</td>
    </tr>`).join('')
  const mat = rollupMaterial(habitats)
  const matRows = mat.map(m => `<tr><td>${m.material}</td><td class="center">${m.menge}</td><td class="center">${m.einheit}</td></tr>`).join('')
  const einbauBoxes = habitats.filter(h => h.einbau_schritte?.length).map(h => `
    <div class="box">
      <div style="font-weight:700; color:#052e16; font-size:10pt;">${h.bild_emoji || ''} ${h.name}${h.count > 1 ? ' · ' + h.count + '×' : ''}</div>
      ${h.standort_hinweis ? `<div style="font-size:8.5pt; color:#555; margin-top:2px;">Standort: ${h.standort_hinweis}${h.maschine ? ' · Gerät: ' + h.maschine : ''}</div>` : ''}
      <ol>${h.einbau_schritte.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>`).join('')
  const seasons = {}
  habitats.forEach(h => { const s = h.jahreszeit || 'ganzjährig'; seasons[s] = (seasons[s] || 0) + (h.aufwand_h || 0) * (h.count || 1) })
  const seasonRows = Object.entries(seasons).map(([s, hrs]) => `<tr><td>${s}</td><td class="center">${Math.round(hrs * 10) / 10} h</td></tr>`).join('')
  const pflegeRows = habitats.filter(h => h.pflege_hinweis).map(h => `<tr><td>${h.name}</td><td class="center">${h.pflege_intervall_monate ? 'alle ' + h.pflege_intervall_monate + ' Mon.' : '—'}</td><td>${h.pflege_hinweis}</td></tr>`).join('')
  const habitatSections = habitats.length ? `
<div class="section-h">Habitatelemente</div>
<div class="meta">
  <div class="meta-item"><strong>${habTotal}</strong><span>Elemente</span></div>
  <div class="meta-item"><strong>${habitats.length}</strong><span>Typen</span></div>
  <div class="meta-item"><strong>${Math.round(habAufwand * 10) / 10} h</strong><span>Bauaufwand ca.</span></div>
</div>
<table>
  <thead><tr><th>Nr.</th><th>Element</th><th>Kategorie</th><th class="center">Anzahl</th><th class="center">Fläche</th><th class="center">Aufwand</th><th>Jahreszeit</th></tr></thead>
  <tbody>${habRows}</tbody>
</table>
${mat.length ? `<div class="section-h">Materialbestellliste (aggregiert)</div>
<table>
  <thead><tr><th>Material</th><th class="center">Menge</th><th class="center">Einheit</th></tr></thead>
  <tbody>${matRows}</tbody>
</table>
<div class="order-note"><strong>📦 Materialbestellung</strong>Obige Mengen beim Naturstoff-/Baustoffhandel anfragen. Eigenmaterial (Schnittgut, Reisig, Aushub) vor Ort nutzen.</div>` : ''}
${einbauBoxes ? '<div class="section-h">Einbauanleitung (fachgerecht)</div>' + einbauBoxes : ''}
<div class="section-h">Personal- &amp; Zeitplanung</div>
<table>
  <thead><tr><th>Jahreszeit / Baufenster</th><th class="center">Bauaufwand</th></tr></thead>
  <tbody>${seasonRows}<tr><td style="font-weight:700;">Summe Habitat-Einbau</td><td class="center" style="font-weight:700;">${Math.round(habAufwand * 10) / 10} h</td></tr></tbody>
</table>
<div style="font-size:8.5pt; color:#555; margin-top:4px;">Zzgl. Pflanzung (${total} Pflanzen) sowie An-/Abfahrt. Fachkräfte entsprechend Bauaufwand einplanen.</div>
${pflegeRows ? `<div class="section-h">Pflegeplan</div>
<table>
  <thead><tr><th>Element</th><th class="center">Intervall</th><th>Pflegemaßnahme</th></tr></thead>
  <tbody>${pflegeRows}</tbody>
</table>` : ''}
` : ''

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
  .section-h { font-size: 13pt; font-weight: 800; color: #052e16; margin: 26px 0 10px; border-bottom: 2px solid #bbf7d0; padding-bottom: 4px; }
  .box { margin-top: 10px; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 6px; }
  .box ol, .box ul { margin: 4px 0 0 18px; font-size: 9pt; color: #333; line-height: 1.6; }
  .viz { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
  .viz figure { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; background: #fff; }
  .viz img { width: 100%; height: auto; display: block; border-radius: 4px; }
  .viz figcaption { font-size: 8.5pt; color: #555; margin-top: 6px; text-align: center; }
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
  ${shapeMeta?.perimeter_m ? `<div class="meta-item"><strong>${shapeMeta.perimeter_m} m</strong><span>Umfang</span></div>` : ''}
  ${site?.zone ? `<div class="meta-item"><strong>${site.zone}</strong><span>Klimazone USDA</span></div>` : ''}
  ${site?.elevation != null ? `<div class="meta-item"><strong>${site.elevation} m</strong><span>ü. NHN</span></div>` : ''}
</div>

${site ? `<div class="section-h">Standort &amp; Anwuchspflege</div>
<table>
  <tbody>
    ${shapeMeta?.centroid ? `<tr><td class="name">GPS-Koordinaten</td><td>${shapeMeta.centroid.lat.toFixed(5)}, ${shapeMeta.centroid.lng.toFixed(5)}</td></tr>` : ''}
    <tr><td class="name">Klimaregion</td><td>${site.region} · Niederschlag ${site.arid}</td></tr>
    <tr><td class="name">Winterhärtezone</td><td>${site.zone} (USDA, Näherung)</td></tr>
  </tbody>
</table>
<div class="order-note"><strong>💧 Anwuchspflege</strong>${site.wateringHint}</div>` : ''}

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

${(isoImg || rasterImg) ? `
<div class="section-h">Visualisierung &amp; Pflanzanleitung</div>
<div class="viz">
  ${isoImg ? `<figure><img src="${isoImg}" alt="3D-Jahresansicht"><figcaption>Isometrisches Pflanzbild (Hochsommer) — so entwickelt sich das Beet.</figcaption></figure>` : ''}
  ${rasterImg ? `<figure><img src="${rasterImg}" alt="Rasterplan"><figcaption>Pflanzanleitung: jede Zelle = 33×33 cm = eine Pflanze (Code laut Pflanzliste-Farbe).</figcaption></figure>` : ''}
</div>` : ''}

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

${habitatSections}

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

/* ─── HABITAT-KOMPONENTEN ────────────────────────────────────────────────── */
const ZIEL_EMOJI = { wildbienen: '🐝', bienen: '🐝', voegel: '🐦', reptilien: '🦎', amphibien: '🐸', kaefer: '🪲', igel: '🦔', fledermaus: '🦇' }
function habitatZielEmojis(h) {
  const seen = new Set(), out = []
  for (const key of Object.keys(ZIEL_EMOJI)) {
    const e = ZIEL_EMOJI[key]
    if (h[key] && !seen.has(e)) { seen.add(e); out.push({ e, t: HABITAT_ZIEL_LABELS[key] }) }
  }
  return out
}
const roundBtn = (L, primary) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7,
  border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? A : (L ? '#fff' : SURFACE),
  color: primary ? 'var(--luma-on-a)' : MUTED, cursor: 'pointer', flexShrink: 0,
})

function CatChip({ label, active, onClick, L }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : (L ? 500 : 400),
      border: active ? `1.5px solid ${A}` : `1px solid ${BORDER}`, background: active ? A14 : 'transparent',
      color: active ? A : MUTED, cursor: 'pointer',
    }}>{label}</button>
  )
}

function SheetH({ label }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
}
function InfoLine({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>{label}: </span>
      <span style={{ fontSize: 13, color: FG }}>{value}</span>
    </div>
  )
}

// Reales Foto je Habitatelement über die deutsche Wikipedia (Fallback: Emoji).
const HABITAT_WIKI = {
  'liegendes-totholz': 'Totholz', 'stehendes-totholz': 'Totholz', 'reisig-kreis': 'Reisighaufen',
  'kaeferkeller': 'Totholz', 'totholz-beeteinfassung': 'Totholz', 'benjeshecke': 'Benjeshecke',
  'trockenmauer': 'Trockenmauer', 'lesesteinhaufen': 'Lesesteinhaufen', 'sickermulde': 'Versickerungsmulde',
  'sumpfbeet': 'Sumpfbeet', 'teich': 'Gartenteich', 'insektentraenke': 'Vogeltränke',
  'sandarium': 'Wildbienen', 'abbruchkante': 'Steilwand', 'wildbienen-nisthilfe': 'Insektenhotel',
  'fledermauskasten': 'Fledermauskasten', 'vogelkasten': 'Nistkasten',
}
function HabitatImage({ id, emoji, variant }) {
  const [src, setSrc] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    const title = HABITAT_WIKI[id]
    if (!title) return
    const load = () => fetchPlantImages(title).then(a => { if (a[0]) setSrc(a[0]) })
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { load(); return }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load() } }, { rootMargin: '250px' })
    io.observe(el); return () => io.disconnect()
  }, [id])
  const H = variant === 'sheet' ? 200 : 104
  const radius = variant === 'sheet' ? 12 : 0
  if (!src) return (
    <div ref={ref} style={{ width: '100%', height: H, background: 'rgba(127,127,127,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: variant === 'sheet' ? 54 : 40, borderRadius: radius }}>{emoji}</div>
  )
  return <img ref={ref} src={src} alt="" style={{ width: '100%', height: H, objectFit: 'cover', display: 'block', borderRadius: radius }} />
}

function HabitatCatalog({ habCat, setHabCat, habSearch, setHabSearch, habitatPlan, onTap, onAdd, onRemove, isMobile, L, shadow, cardBg }) {
  const list = filterHabitats({ kategorie: habCat, searchTerm: habSearch })
  const cats = Object.keys(HABITAT_KATEGORIE_LABELS)
  return (
    <>
      <div style={{ padding: isMobile ? '10px 12px 0' : '12px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <CatChip label="Alle" active={!habCat} onClick={() => setHabCat(null)} L={L} />
          {cats.map(c => (
            <CatChip key={c} label={`${HABITAT_KATEGORIE_EMOJI[c]} ${HABITAT_KATEGORIE_LABELS[c]}`} active={habCat === c} onClick={() => setHabCat(habCat === c ? null : c)} L={L} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: L ? 'rgba(0,0,0,0.05)' : BG, borderRadius: 8, padding: '8px 12px', border: `1px solid ${BORDER}`, marginBottom: 12 }}>
          <Search size={13} color={MUTED} />
          <input value={habSearch} onChange={e => setHabSearch(e.target.value)} placeholder="Habitatelement suchen..."
            style={{ background: 'none', border: 'none', outline: 'none', color: FG, fontSize: 13, width: '100%' }} />
          {habSearch && <button onClick={() => setHabSearch('')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 0 }}><X size={12} /></button>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 12px 24px' : '0 24px 24px' }}>
        {list.length === 0 ? (
          <EmptyState msg="Kein Habitatelement gefunden 🪵" sub="Andere Kategorie oder Suche probieren" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
            {list.map(h => (
              <HabitatCard key={h.id} habitat={h} inPlan={habitatPlan.find(x => x.id === h.id)}
                onTap={() => onTap(h)} onAdd={() => onAdd(h)} onRemove={() => onRemove(h)} L={L} shadow={shadow} cardBg={cardBg} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function HabitatCard({ habitat, inPlan, onTap, onAdd, onRemove, L, shadow, cardBg }) {
  const ziele = habitatZielEmojis(habitat)
  return (
    <div onClick={onTap} style={{ background: cardBg, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: shadow, display: 'flex', flexDirection: 'column' }}>
      <HabitatImage id={habitat.id} emoji={habitat.bild_emoji} variant="banner" />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: FG }}>{habitat.name}</div>
          <div style={{ fontSize: 11, color: MUTED }}>
            {HABITAT_KATEGORIE_LABELS[habitat.kategorie]}{habitat.flaeche_m2 ? ` · ${habitat.flaeche_m2} m²` : ''} · ⏱ {habitat.aufwand_h} h
          </div>
        </div>
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{habitat.beschreibung}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {ziele.map(z => <span key={z.t} title={z.t} style={{ fontSize: 14 }}>{z.e}</span>)}
          </div>
          {inPlan ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
              <button onClick={onRemove} style={roundBtn(L)}><Minus size={14} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: FG, minWidth: 16, textAlign: 'center' }}>{inPlan.count}</span>
              <button onClick={onAdd} style={roundBtn(L, true)}><Plus size={14} /></button>
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); onAdd() }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Plus size={13} /> Plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function HabitatPlanRow({ habitat, onAdd, onRemove, L, shadow, cardBg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: cardBg, borderRadius: 10, padding: '8px 12px', boxShadow: shadow }}>
      <div style={{ fontSize: 20 }}>{habitat.bild_emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{habitat.name}</div>
        <div style={{ fontSize: 11, color: MUTED }}>
          {HABITAT_KATEGORIE_LABELS[habitat.kategorie]} · ⏱ {(habitat.aufwand_h || 0) * habitat.count} h{habitat.jahreszeit ? ` · ${habitat.jahreszeit}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onRemove} style={roundBtn(L)}><Minus size={14} /></button>
        <span style={{ fontSize: 14, fontWeight: 700, color: FG, minWidth: 18, textAlign: 'center' }}>{habitat.count}</span>
        <button onClick={onAdd} style={roundBtn(L, true)}><Plus size={14} /></button>
      </div>
    </div>
  )
}

function HabitatSheet({ habitat, onClose, onAdd, L }) {
  const ziele = habitatZielEmojis(habitat)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, background: SURFACE, borderRadius: '20px 20px 0 0',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER }} />
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 40px' }}>
          <div style={{ margin: '8px 0 12px' }}><HabitatImage id={habitat.id} emoji={habitat.bild_emoji} variant="sheet" /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px' }}>
            <div style={{ fontSize: 28, lineHeight: 1 }}>{habitat.bild_emoji}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: FG }}>{habitat.name}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{HABITAT_KATEGORIE_LABELS[habitat.kategorie]}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
            {habitat.flaeche_m2 && <MBadge emoji="📐" label={`${habitat.flaeche_m2} m²`} L={L} />}
            {habitat.dimension && <MBadge emoji="📏" label={habitat.dimension} L={L} />}
            <MBadge emoji="⏱️" label={`${habitat.aufwand_h} h`} L={L} />
            {habitat.jahreszeit && <MBadge emoji="📅" label={habitat.jahreszeit} L={L} />}
            {habitat.maschine && <MBadge emoji="🚜" label={habitat.maschine} L={L} />}
          </div>
          {ziele.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginBottom: 12, flexWrap: 'wrap' }}>
              {ziele.map(z => (
                <span key={z.t} style={{ fontSize: 12, color: FG, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>{z.e}</span>{z.t}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 14, color: FG, lineHeight: 1.7, marginBottom: 12 }}>{habitat.beschreibung}</p>
          {habitat.standort_hinweis && <InfoLine label="Standort" value={habitat.standort_hinweis} />}
          {habitat.material?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <SheetH label="🧱 Material" />
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: FG, lineHeight: 1.7 }}>
                {habitat.material.map((m, i) => <li key={i}>{m.material}: {m.menge} {m.einheit}</li>)}
              </ul>
            </div>
          )}
          {habitat.einbau_schritte?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <SheetH label="🔧 Einbau (fachgerecht)" />
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: FG, lineHeight: 1.7 }}>
                {habitat.einbau_schritte.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
          {habitat.pflege_hinweis && (
            <InfoLine label="Pflege" value={`${habitat.pflege_hinweis}${habitat.pflege_intervall_monate ? ` (alle ${habitat.pflege_intervall_monate} Monate)` : ''}`} />
          )}
          <button onClick={() => onAdd(habitat)} className="lu-btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: 12, background: A, border: 'none', color: 'var(--luma-on-a)', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
            + Zum Plan hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
