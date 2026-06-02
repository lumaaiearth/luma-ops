import { useNavigate } from 'react-router-dom'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import { BarChart2, TrendingUp, Leaf, Bug, FlaskConical, ExternalLink } from 'lucide-react'

const ANALYSES = [
  {
    id: 'eps-markt-2025',
    title: 'EPS Markt & Wettbewerb',
    subtitle: 'Eichenprozessionsspinner Bekämpfung',
    region: 'Berlin-Brandenburg',
    date: 'Juni 2025',
    tags: ['Marktanalyse', 'Wettbewerb', 'Strategie'],
    icon: Bug,
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    colorBorder: 'rgba(245,158,11,0.3)',
    kpis: [
      { label: 'Aktive Anbieter', value: '30–50' },
      { label: 'Marktwachstum p.a.', value: '+12%' },
      { label: 'Ø Preis/Baum Bt', value: '€20–45' },
    ],
    description: 'Vollständige Analyse des EPS-Markts: Wettbewerber, Preismodelle, Methoden (mechanisch, biologisch, chemisch) und strategische Empfehlungen für Luma.',
  },
]

const COMING_SOON = [
  { title: 'Bienen & Bestäuber Markt', icon: Leaf, color: '#10b981', desc: 'Nachfrage, Förderprogramme, Stadtbegrünung' },
  { title: 'Baumpflege Preisspiegel', icon: TrendingUp, color: '#3b82f6', desc: 'Berliner Baumpflege-Markt & Preise' },
  { title: 'Pestizid-Alternativen', icon: FlaskConical, color: '#8b5cf6', desc: 'Biologische Mittel, Zulassungen, Kosten' },
]

export default function AnalysePage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: A14, border: `1px solid ${A20}`,
          borderRadius: 100, padding: '4px 14px', marginBottom: 14,
        }}>
          <BarChart2 size={12} color={A} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Research Hub</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 300, color: FG, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Analysen & Reports
        </h1>
        <p style={{ fontSize: 14, color: MUTED, maxWidth: 520 }}>
          Wissenschaftliche und ökonomische Studien zu Märkten, Wettbewerbern und strategischen Feldern von Luma.
        </p>
      </div>

      {/* Published analyses */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
          Veröffentlicht — {ANALYSES.length} Report{ANALYSES.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {ANALYSES.map(a => (
            <AnalysisCard key={a.id} analysis={a} onClick={() => navigate(`/analyse/${a.id}`)} />
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
          In Vorbereitung
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {COMING_SOON.map((c, i) => (
            <ComingSoonCard key={i} item={c} />
          ))}
        </div>
      </div>
    </div>
  )
}

function AnalysisCard({ analysis: a, onClick }) {
  const Icon = a.icon
  return (
    <div
      onClick={onClick}
      style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: 24, cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = a.colorBorder; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: a.color, borderRadius: '10px 10px 0 0', opacity: 0.8 }} />

      {/* Icon + tags */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 }}>
        <div style={{ width: 44, height: 44, background: a.colorBg, border: `1px solid ${a.colorBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={a.color} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {a.tags.slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: MUTED, padding: '3px 8px', borderRadius: 100, letterSpacing: '0.04em' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: FG, letterSpacing: '-0.02em', marginBottom: 2 }}>{a.title}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.05em' }}>{a.region} · {a.date}</div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>{a.description}</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {a.kpis.map(k => (
          <div key={k.label} style={{ background: BG, borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: a.color, letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2, lineHeight: 1.3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: a.color, fontSize: 13, fontWeight: 500 }}>
        <ExternalLink size={13} />
        <span>Report öffnen</span>
      </div>
    </div>
  )
}

function ComingSoonCard({ item }) {
  const Icon = item.icon
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, opacity: 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, background: `${item.color}18`, border: `1px solid ${item.color}40`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={item.color} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: FG }}>{item.title}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Demnächst</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: MUTED }}>{item.desc}</p>
    </div>
  )
}
