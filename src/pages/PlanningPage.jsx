import { useState, useMemo } from 'react'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { PLANTS, filterPlants, LICHT_LABELS, WASSER_LABELS, BODEN_LABELS, TYPE_LABELS, MONTHS } from '../data/plants.js'
import { Leaf, Search, Plus, Minus, ExternalLink, Sun, Droplets, Sprout, Bug, X, ChevronDown, ChevronUp, Filter, Download } from 'lucide-react'

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const LICHT_OPTS = [
  { value: 1, label: 'Vollsonne', emoji: '☀️', desc: '>6h täglich' },
  { value: 2, label: 'Halbschatten', emoji: '⛅', desc: '3–6h täglich' },
  { value: 3, label: 'Schatten', emoji: '🌥️', desc: '<3h täglich' },
]
const WASSER_OPTS = [
  { value: 1, label: 'Trocken', emoji: '🏜️', desc: 'Sandboden, kein Zusatzwasser' },
  { value: 2, label: 'Mäßig feucht', emoji: '💧', desc: 'Gelegentlich gießen' },
  { value: 3, label: 'Feucht', emoji: '🌊', desc: 'Regelmäßig feucht' },
]
const BODEN_OPTS = [
  { value: 'sandy', label: 'Sandig', emoji: '🏖️', desc: 'Brandenburg-Sandboden' },
  { value: 'loamy', label: 'Lehmig', emoji: '🧱', desc: 'Normaler Gartenboden' },
  { value: 'clay', label: 'Tonig', emoji: '🪨', desc: 'Schwerer Boden' },
  { value: 'humus', label: 'Humusreich', emoji: '🌿', desc: 'Waldboden, Kompost' },
]
const TYPE_OPTS = Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))
const INSECT_EMOJIS = { bienen: '🐝', schmetterlinge: '🦋', voegel: '🐦' }

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */
export default function PlanningPage() {
  const { themeId } = useTheme()
  const L = themeId === 'light'

  // Filter state
  const [licht, setLicht] = useState(1)
  const [wasser, setWasser] = useState(1)
  const [boden, setBoden] = useState('sandy')
  const [types, setTypes] = useState([])
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Plan state
  const [plan, setPlan] = useState([])
  const [activeTab, setActiveTab] = useState('suche') // 'suche' | 'plan'
  const [expandedPlant, setExpandedPlant] = useState(null)

  const filtered = useMemo(() =>
    filterPlants({ licht, wasser, boden, types: types.length ? types : null, searchTerm: search }),
    [licht, wasser, boden, types, search]
  )

  function addToPlan(plant) {
    setPlan(prev => {
      const ex = prev.find(p => p.id === plant.id)
      if (ex) return prev.map(p => p.id === plant.id ? { ...p, count: p.count + 1 } : p)
      return [...prev, { ...plant, count: 1 }]
    })
  }
  function removeFromPlan(id) {
    setPlan(prev => {
      const ex = prev.find(p => p.id === id)
      if (ex?.count > 1) return prev.map(p => p.id === id ? { ...p, count: p.count - 1 } : p)
      return prev.filter(p => p.id !== id)
    })
  }
  function clearPlan() { setPlan([]) }

  const totalPlants = plan.reduce((s, p) => s + p.count, 0)

  const cardShadow = L ? '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1.5px rgba(0,0,0,0.07)' : `0 0 0 1px ${BORDER}`

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A14, border: `1px solid ${A20}`, borderRadius: 100, padding: '3px 12px', marginBottom: 8 }}>
              <Leaf size={11} color={A} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase' }}>naturaDB · Brandenburger Sandboden</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: L ? 800 : 400, color: FG, letterSpacing: '-0.03em', margin: 0 }}>Pflanzplanung</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TabBtn label="🔍 Pflanzen suchen" active={activeTab === 'suche'} onClick={() => setActiveTab('suche')} L={L} />
            <TabBtn
              label={`🌱 Mein Plan ${totalPlants > 0 ? `(${totalPlants})` : ''}`}
              active={activeTab === 'plan'}
              onClick={() => setActiveTab('plan')}
              L={L}
              highlight={totalPlants > 0}
            />
          </div>
        </div>
      </div>

      {/* ── TAB: SUCHE ─────────────────────────────────────────────────── */}
      {activeTab === 'suche' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Standort-Konfigurator */}
          <div style={{ padding: '0 24px', flexShrink: 0 }}>
            <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12, boxShadow: L ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Filter size={13} color={MUTED} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: L ? 700 : 400 }}>Standort konfigurieren</span>
                <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.05em' }}>{filtered.length} Pflanzen</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {/* Licht */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>☀️ Licht</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {LICHT_OPTS.map(o => (
                      <StandortBtn key={o.value} opt={o} active={licht === o.value} onClick={() => setLicht(o.value)} color="#d97706" L={L} />
                    ))}
                  </div>
                </div>
                {/* Wasser */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>💧 Wasser</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {WASSER_OPTS.map(o => (
                      <StandortBtn key={o.value} opt={o} active={wasser === o.value} onClick={() => setWasser(o.value)} color="#0ea5e9" L={L} />
                    ))}
                  </div>
                </div>
                {/* Boden */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🌍 Boden</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {BODEN_OPTS.map(o => (
                      <StandortBtn key={o.value} opt={o} active={boden === o.value} onClick={() => setBoden(o.value)} color="#92400e" L={L} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Typ + Suche */}
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {TYPE_OPTS.map(o => (
                    <TypeChip
                      key={o.value}
                      label={o.label}
                      active={types.includes(o.value)}
                      onClick={() => setTypes(prev => prev.includes(o.value) ? prev.filter(t => t !== o.value) : [...prev, o.value])}
                      L={L}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: L ? 'rgba(0,0,0,0.05)' : BG, borderRadius: 8, padding: '7px 12px', border: `1px solid ${BORDER}`, minWidth: 180 }}>
                  <Search size={13} color={MUTED} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Name oder Latein..."
                    style={{ background: 'none', border: 'none', outline: 'none', color: FG, fontSize: 13, width: '100%' }}
                  />
                  {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 0 }}><X size={12} /></button>}
                </div>
              </div>
            </div>
          </div>

          {/* Plant List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontSize: 14 }}>
                Keine Pflanzen gefunden für diese Kombination 🌵<br />
                <span style={{ fontSize: 12, opacity: 0.7 }}>Probiere einen anderen Standort</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {filtered.map(plant => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    expanded={expandedPlant === plant.id}
                    onToggle={() => setExpandedPlant(expandedPlant === plant.id ? null : plant.id)}
                    onAdd={() => addToPlan(plant)}
                    inPlan={plan.find(p => p.id === plant.id)}
                    L={L}
                    cardShadow={cardShadow}
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: MUTED, gap: 12 }}>
              <div style={{ fontSize: 48 }}>🌱</div>
              <div style={{ fontSize: 15, fontWeight: L ? 700 : 400, color: FG }}>Noch keine Pflanzen im Plan</div>
              <div style={{ fontSize: 13, color: MUTED }}>Geh zur Suche und füge Pflanzen hinzu</div>
              <button onClick={() => setActiveTab('suche')} style={{ marginTop: 8, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Zur Pflanzensuche →
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10, marginBottom: 20, paddingTop: 4 }}>
                <StatCard label="Pflanzen gesamt" value={totalPlants} emoji="🌱" L={L} color={A} />
                <StatCard label="Arten" value={plan.length} emoji="🔢" L={L} color="#8b5cf6" />
                <StatCard label="Heimisch" value={plan.filter(p => p.heimisch).length} emoji="🏡" L={L} color="#047A3C" />
                <StatCard label="⌀ Insektenwert" value={(plan.reduce((s,p) => s+p.insekten,0)/plan.length).toFixed(1)} emoji="🐝" L={L} color="#d97706" />
              </div>

              {/* Blühkalender */}
              <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: L ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, fontWeight: L ? 700 : 400 }}>📅 Blühkalender</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 2 }}>
                  {MONTHS.map((m, mi) => {
                    const monthPlants = plan.filter(p => p.bluete_monate.includes(mi + 1))
                    return (
                      <div key={m}>
                        <div style={{ fontSize: 9, color: MUTED, textAlign: 'center', marginBottom: 4, fontFamily: "'Space Mono', monospace", fontWeight: L ? 700 : 400 }}>{m}</div>
                        <div style={{ minHeight: 40, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {monthPlants.slice(0,3).map(p => (
                            <div key={p.id} title={p.name} style={{
                              height: 8, borderRadius: 2,
                              background: p.bluete_farbe || A,
                              opacity: 0.85,
                            }} />
                          ))}
                          {monthPlants.length > 3 && (
                            <div style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>+{monthPlants.length - 3}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 8, color: monthPlants.length > 0 ? A : MUTED, textAlign: 'center', marginTop: 2, fontWeight: 700 }}>
                          {monthPlants.length > 0 ? monthPlants.length : '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Plant list */}
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: L ? 700 : 400 }}>
                Pflanzliste
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {plan.map(plant => (
                  <PlanRow key={plant.id} plant={plant} onAdd={() => addToPlan(plant)} onRemove={() => removeFromPlan(plant.id)} L={L} cardShadow={cardShadow} />
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    const lines = ['Pflanzplan – Luma Biome', '='.repeat(40), '',
                      ...plan.map(p => `${p.count}x  ${p.name} (${p.latin})`),
                      '', `Gesamt: ${totalPlants} Pflanzen`
                    ]
                    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = 'pflanzplan-luma.txt'
                    a.click()
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: A14, border: `1px solid ${A20}`, color: A, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Download size={13} /> Plan exportieren
                </button>
                <button onClick={clearPlan} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13 }}>
                  Plan leeren
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── SUB-COMPONENTS ────────────────────────────────────────────────────── */

function PlantCard({ plant, expanded, onToggle, onAdd, inPlan, L, cardShadow }) {
  const insectCount = [plant.bienen, plant.schmetterlinge, plant.voegel].filter(Boolean).length

  return (
    <div style={{
      background: L ? '#fff' : SURFACE,
      borderRadius: 10, boxShadow: cardShadow,
      overflow: 'hidden', transition: 'box-shadow 0.18s',
    }}>
      {/* Bloom color stripe */}
      <div style={{ height: 3, background: plant.bluete_farbe || '#888', opacity: 0.7 }} />

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 18 }}>{plant.bild_emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plant.name}</span>
              {plant.heimisch && <span style={{ fontSize: 9, background: '#047A3C18', color: '#047A3C', border: '1px solid #047A3C30', padding: '1px 6px', borderRadius: 100, fontWeight: 700, flexShrink: 0 }}>heimisch</span>}
            </div>
            <div style={{ fontSize: 11, fontStyle: 'italic', color: MUTED, marginBottom: 8 }}>{plant.latin}</div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              <Badge emoji="☀️" label={plant.licht.map(l => LICHT_LABELS[l]).join('/')} L={L} />
              <Badge emoji="💧" label={plant.wasser.map(w => WASSER_LABELS[w]).join('/')} L={L} />
              <Badge emoji="📏" label={`${plant.hoehe[0]}–${plant.hoehe[1]}cm`} L={L} />
              <Badge emoji="🌸" label={`${MONTHS[plant.bluete_monate[0]-1]}–${MONTHS[plant.bluete_monate[plant.bluete_monate.length-1]-1]}`} L={L} />
            </div>

            {/* Insect row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {plant.bienen && <span title="Bienen" style={{ fontSize: 13 }}>🐝</span>}
                {plant.schmetterlinge && <span title="Schmetterlinge" style={{ fontSize: 13 }}>🦋</span>}
                {plant.voegel && <span title="Vögel" style={{ fontSize: 13 }}>🐦</span>}
              </div>
              <InsectBar value={plant.insekten} />
            </div>
          </div>

          {/* Add btn */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={onAdd}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: inPlan ? '#047A3C' : A14,
                border: `1px solid ${inPlan ? '#047A3C' : A20}`,
                color: inPlan ? '#fff' : A,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>
              {inPlan ? inPlan.count : <Plus size={14} />}
            </button>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: MUTED, fontSize: 11, cursor: 'pointer', padding: '4px 0 0', marginTop: 4 }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Weniger' : 'Details'}
        </button>

        {expanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 10 }}>{plant.beschreibung}</p>
            <a href={plant.naturadb_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: A, fontWeight: 600, textDecoration: 'none' }}>
              <ExternalLink size={11} /> naturaDB ansehen
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function PlanRow({ plant, onAdd, onRemove, L, cardShadow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: L ? '#fff' : SURFACE, borderRadius: 10, padding: '12px 16px', boxShadow: cardShadow }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: plant.bluete_farbe || '#888', flexShrink: 0, opacity: 0.8 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{plant.name}</div>
        <div style={{ fontSize: 11, fontStyle: 'italic', color: MUTED }}>{plant.latin}</div>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>
        {plant.hoehe[0]}–{plant.hoehe[1]}cm
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {plant.bienen && '🐝'}{plant.schmetterlinge && '🦋'}{plant.voegel && '🐦'}
      </div>
      {/* Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={onRemove} style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={12} />
        </button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: FG, minWidth: 20, textAlign: 'center' }}>{plant.count}</span>
        <button onClick={onAdd} style={{ width: 26, height: 26, borderRadius: 6, background: A14, border: `1px solid ${A20}`, color: A, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={12} />
        </button>
      </div>
      <a href={plant.naturadb_url} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, display: 'flex' }}>
        <ExternalLink size={13} />
      </a>
    </div>
  )
}

/* ─── HELPERS ───────────────────────────────────────────────────────────── */

function TabBtn({ label, active, onClick, L, highlight }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 8, fontSize: 13,
      fontWeight: L ? 700 : (active ? 600 : 400),
      border: active ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
      background: active ? A14 : 'transparent',
      color: active ? A : MUTED,
      cursor: 'pointer',
      position: 'relative',
    }}>
      {label}
      {highlight && !active && <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#047A3C' }} />}
    </button>
  )
}

function StandortBtn({ opt, active, onClick, color, L }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 7, fontSize: 12,
      fontWeight: active ? (L ? 700 : 600) : (L ? 500 : 400),
      border: active ? `1.5px solid ${color}` : `1px solid ${BORDER}`,
      background: active ? `${color}12` : 'transparent',
      color: active ? color : MUTED,
      cursor: 'pointer', textAlign: 'left', width: '100%',
    }}>
      <span style={{ fontSize: 14 }}>{opt.emoji}</span>
      <span>{opt.label}</span>
      {opt.desc && <span style={{ fontSize: 10, opacity: 0.65, marginLeft: 'auto' }}>{opt.desc}</span>}
    </button>
  )
}

function TypeChip({ label, active, onClick, L }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 100, fontSize: 11,
      fontWeight: active ? 700 : (L ? 500 : 400),
      border: active ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
      background: active ? A14 : 'transparent',
      color: active ? A : MUTED,
      cursor: 'pointer',
    }}>{label}</button>
  )
}

function Badge({ emoji, label, L }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, color: MUTED, fontWeight: L ? 600 : 400,
      background: L ? 'rgba(0,0,0,0.05)' : BG,
      padding: '2px 7px', borderRadius: 100,
      border: L ? '1px solid rgba(0,0,0,0.07)' : 'none',
    }}>
      <span>{emoji}</span>{label}
    </span>
  )
}

function InsectBar({ value }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: 1,
          background: i <= value ? A : BORDER,
          opacity: i <= value ? 1 : 0.4,
        }} />
      ))}
    </div>
  )
}

function StatCard({ label, value, emoji, L, color }) {
  return (
    <div style={{
      background: L ? '#fff' : SURFACE,
      border: `1.5px solid ${BORDER}`, borderRadius: 10,
      padding: '14px 16px', textAlign: 'center',
      boxShadow: L ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: MUTED, fontWeight: L ? 600 : 400, marginTop: 2 }}>{label}</div>
    </div>
  )
}
