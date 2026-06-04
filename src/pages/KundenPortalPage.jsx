import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, BG, BORDER, FG, MUTED, SURFACE, CARD } from '../lib/theme.js'
import { Leaf, MapPin, FileText, LogOut, CheckCircle2, Clock, Sprout, Wrench } from 'lucide-react'

const STATUS_LABELS = {
  planung:                '🗂 Planung',
  pdf_erstellt:           '📄 PDF erstellt',
  bestellung:             '🛒 Bestellt',
  bestellung_bestaetigt:  '✅ Bestätigt',
  pflanzung_laufend:      '🌱 Pflanzung läuft',
  wachstum:               '🌿 Wachstum',
  maintenance:            '🔧 Pflege',
}

const STATUS_COLORS = {
  planung:                '#6b7280',
  pdf_erstellt:           '#d97706',
  bestellung:             '#ea580c',
  bestellung_bestaetigt:  '#16a34a',
  pflanzung_laufend:      '#15803d',
  wachstum:               '#166534',
  maintenance:            '#047857',
}

const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

export default function KundenPortalPage() {
  const { profile, displayName, logout } = useAuth()
  const [plans, setPlans] = useState([])
  const [standorte, setStandorte] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        // Load plans for this customer's org
        const [plansRes, standorteRes] = await Promise.all([
          sb.from('pflanzplaene').select('*').eq('org_id', profile?.org_id).order('updated_at', { ascending: false }),
          sb.from('standort').select('*'),
        ])
        setPlans(plansRes.data || [])
        setStandorte(standorteRes.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  const biodiversitaetScore = (plan) => {
    if (!plan.positionen?.length) return 0
    const heimisch = plan.positionen.filter(p => p.heimisch).length
    return Math.round((heimisch / plan.positionen.length) * 100)
  }

  const totalArten = plans.reduce((s, p) => s + (p.positionen?.length || 0), 0)
  const totalPflanzen = plans.reduce((s, p) =>
    s + (p.positionen?.reduce((ss, pos) => ss + (pos.count || 1), 0) || 0), 0)
  const activePlans = plans.filter(p => !['planung','pdf_erstellt'].includes(p.status)).length

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: A, fontFamily: 'monospace' }}>
      Laden...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BG, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: SURFACE }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Leaf size={20} color={A} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: A, letterSpacing: '0.2em', textTransform: 'uppercase' }}>LUMA BIOME</span>
          <span style={{ fontSize: 11, color: MUTED }}>/ Kundenportal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: MUTED }}>👋 {displayName}</span>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
            <LogOut size={12} /> Abmelden
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: FG, margin: 0 }}>Ihre Biodiversitätsprojekte</h1>
          <p style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>Überblick über Ihre Pflanzpläne und Flächen — betreut von LUMA Biome.</p>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Aktive Projekte', value: activePlans, icon: <CheckCircle2 size={18} color={A} />, },
            { label: 'Pflanzpläne', value: plans.length, icon: <FileText size={18} color={A} /> },
            { label: 'Pflanzenarten', value: totalArten, icon: <Leaf size={18} color={A} /> },
            { label: 'Pflanzen gesamt', value: totalPflanzen, icon: <Sprout size={18} color={A} /> },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{kpi.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: A, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Plans */}
        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>
            <Leaf size={40} color={BORDER} style={{ margin: '0 auto 16px' }} />
            <p>Noch keine Pflanzpläne vorhanden.</p>
            <p style={{ fontSize: 12 }}>Ihr LUMA-Betreuer wird bald einen Plan erstellen.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map(plan => {
              const score = biodiversitaetScore(plan)
              const standort = standorte.find(s => s.id === plan.standort_id)
              const isOpen = selected === plan.id

              return (
                <div key={plan.id} style={{ background: CARD, border: `1px solid ${isOpen ? A : BORDER}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  {/* Plan Header */}
                  <div
                    onClick={() => setSelected(isOpen ? null : plan.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>{plan.titel}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: STATUS_COLORS[plan.status] + '22', color: STATUS_COLORS[plan.status] }}>
                          {STATUS_LABELS[plan.status] || plan.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: MUTED }}>
                        {standort && <span><MapPin size={11} style={{ verticalAlign: 'middle' }} /> {standort.name}</span>}
                        <span><Leaf size={11} style={{ verticalAlign: 'middle' }} /> {plan.positionen?.length || 0} Arten</span>
                        {plan.flaeche_m2 && <span>📐 {plan.flaeche_m2.toFixed(0)} m²</span>}
                      </div>
                    </div>

                    {/* Biodiversity Score */}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626', lineHeight: 1 }}>{score}%</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>heimisch</div>
                    </div>

                    <span style={{ color: MUTED, fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {/* Status Timeline */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 20px' }}>
                      {/* Progress bar */}
                      {(() => {
                        const steps = ['planung','bestellung','pflanzung_laufend','wachstum','maintenance']
                        const cur = steps.indexOf(plan.status.replace('pdf_erstellt','planung').replace('bestellung_bestaetigt','bestellung'))
                        return (
                          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                            {steps.map((s, i) => (
                              <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ height: 4, width: '100%', background: i <= cur ? A : BORDER, borderRadius: 2, transition: 'background 0.3s' }} />
                                <span style={{ fontSize: 10, color: i <= cur ? A : MUTED, textAlign: 'center' }}>
                                  {['Planung','Bestellung','Pflanzung','Wachstum','Pflege'][i]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Plant list */}
                      {plan.positionen?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Pflanzliste</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                            {plan.positionen.map((pos, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: BG, borderRadius: 8, fontSize: 13 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: pos.bluete_farbe || A, flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontWeight: 600, color: FG }}>{pos.name}</div>
                                  <div style={{ fontSize: 11, color: MUTED, fontStyle: 'italic' }}>{pos.latin}</div>
                                </div>
                                <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>×{pos.count || 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bloom calendar preview */}
                      {plan.positionen?.some(p => p.bluete_monate?.length) && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Blühkalender</div>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {MONTHS.map((m, mi) => {
                              const count = plan.positionen.filter(p => p.bluete_monate?.includes(mi + 1)).length
                              const intensity = count / Math.max(plan.positionen.length, 1)
                              return (
                                <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                  <div style={{ height: 32, width: '100%', background: intensity > 0 ? `rgba(8,170,86,${0.2 + intensity * 0.8})` : BORDER, borderRadius: 4, position: 'relative' }}>
                                    {count > 0 && <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 9, color: '#fff', fontWeight: 700 }}>{count}</div>}
                                  </div>
                                  <span style={{ fontSize: 9, color: MUTED }}>{m}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: 14, fontSize: 12, color: MUTED }}>
                        Zuletzt aktualisiert: {new Date(plan.updated_at).toLocaleDateString('de-DE')} · Betreut von LUMA Biome
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
