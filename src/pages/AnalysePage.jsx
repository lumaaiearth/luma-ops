import { useNavigate } from 'react-router-dom'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { BarChart2, TrendingUp, Leaf, Bug, FlaskConical, ExternalLink, Droplets, TreePine } from 'lucide-react'

const ANALYSES = [
  {
    id: 'eps-markt-2025',
    title: 'EPS Markt & Wettbewerb',
    subtitle: 'Eichenprozessionsspinner Bekämpfung',
    region: 'Berlin-Brandenburg',
    date: 'Juni 2025',
    tags: ['Marktanalyse', 'Wettbewerb', 'Strategie'],
    icon: Bug,
    color: '#d97706',
    colorLight: '#92400e',
    colorBgDark: 'rgba(217,119,6,0.1)',
    colorBgLight: 'rgba(146,64,14,0.08)',
    colorBorderDark: 'rgba(217,119,6,0.3)',
    colorBorderLight: 'rgba(146,64,14,0.25)',
    kpis: [
      { label: 'Aktive Anbieter', value: '30–50' },
      { label: 'Marktwachstum p.a.', value: '+12%' },
      { label: 'Ø Preis/Baum Bt', value: '€20–45' },
    ],
    description: 'Vollständige Analyse des EPS-Markts: Wettbewerber, Preismodelle, Methoden (mechanisch, biologisch, chemisch) und strategische Empfehlungen für Luma.',
    route: '/analyse/eps-markt-2025',
  },
  {
    id: 'bodenbiodiversitaet',
    title: 'Bodenbiodiversität für Stadtbäume',
    subtitle: 'Lebendiger Boden, resiliente Bäume',
    region: 'Berlin & Deutschland',
    date: 'Juni 2026',
    tags: ['Bodenökologie', 'Stadtbäume', 'Klimaresilienz'],
    icon: TreePine,
    color: '#16a34a',
    colorLight: '#15803d',
    colorBgDark: 'rgba(22,163,74,0.1)',
    colorBgLight: 'rgba(21,128,61,0.08)',
    colorBorderDark: 'rgba(22,163,74,0.3)',
    colorBorderLight: 'rgba(21,128,61,0.25)',
    kpis: [
      { label: 'Stadtbäume gefährdet', value: '70 %' },
      { label: 'Biopore kostet', value: '< 100 €' },
      { label: 'Berliner Bäume', value: '439.000' },
    ],
    description: 'Warum Bodenbiodiversität der entscheidende Faktor für klimaresilientere Stadtbäume ist — und wie Bioporen, Mulch und Mykorrhiza helfen. Mit LUMA-Felddaten aus dem Preußenpark.',
    route: '/analyse/artikel/bodenbiodiversitaet',
  },
  {
    id: 'schwammstaedte',
    title: 'Schwammstädte & Bodeninfiltration',
    subtitle: 'Urbane Grünflächen gegen Starkregen',
    region: 'Berlin & Europa',
    date: 'Juni 2026',
    tags: ['Schwammstadt', 'Starkregen', 'Bodeninfiltration'],
    icon: Droplets,
    color: '#0ea5e9',
    colorLight: '#0284c7',
    colorBgDark: 'rgba(14,165,233,0.1)',
    colorBgLight: 'rgba(2,132,199,0.08)',
    colorBorderDark: 'rgba(14,165,233,0.3)',
    colorBorderLight: 'rgba(2,132,199,0.25)',
    kpis: [
      { label: 'Versiegelung D', value: '45 %' },
      { label: 'Schäden 2024', value: '2,6 Mrd €' },
      { label: 'Infiltrationsverlust', value: '−90 %' },
    ],
    description: 'Wie Böden bei Extremregen versagen, was Schwammstädte leisten und warum Bioporen und Mulchen die kostengünstigsten Klimaanpassungsmaßnahmen sind. Berliner Regenwasseragentur & LUMA-Daten.',
    route: '/analyse/artikel/schwammstaedte',
  },
]

const COMING_SOON = [
  { title: 'Bienen & Bestäuber Markt', icon: Leaf, color: '#047A3C', desc: 'Nachfrage, Förderprogramme, Stadtbegrünung' },
  { title: 'Baumpflege Preisspiegel', icon: TrendingUp, color: '#1d4ed8', desc: 'Berliner Baumpflege-Markt & Preise' },
  { title: 'Pestizid-Alternativen', icon: FlaskConical, color: '#6d28d9', desc: 'Biologische Mittel, Zulassungen, Kosten' },
]

export default function AnalysePage() {
  const navigate = useNavigate()
  const { themeId } = useTheme()
  const isLight = themeId === 'light'

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
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 10, color: A,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>Research Hub</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: isLight ? 700 : 300, color: FG, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Analysen & Reports
        </h1>
        <p style={{ fontSize: 14, color: MUTED, maxWidth: 520, lineHeight: 1.65 }}>
          Wissenschaftliche und ökonomische Studien zu Märkten, Wettbewerbern und strategischen Feldern von Luma.
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: BORDER, marginBottom: 28 }} />

      {/* Published */}
      <div style={{ marginBottom: 48 }}>
        <SectionLabel label={`Veröffentlicht — ${ANALYSES.length} Report${ANALYSES.length !== 1 ? 's' : ''}`} isLight={isLight} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {ANALYSES.map(a => (
            <AnalysisCard key={a.id} analysis={a} isLight={isLight} onClick={() => navigate(a.route || `/analyse/${a.id}`)} />
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <SectionLabel label="In Vorbereitung" isLight={isLight} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {COMING_SOON.map((c, i) => (
            <ComingSoonCard key={i} item={c} isLight={isLight} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ label, isLight }) {
  return (
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 10,
      color: MUTED, letterSpacing: '0.14em', textTransform: 'uppercase',
      marginBottom: 14, fontWeight: isLight ? 700 : 400,
    }}>
      {label}
    </div>
  )
}

function AnalysisCard({ analysis: a, isLight, onClick }) {
  const Icon = a.icon
  const color = isLight ? a.colorLight : a.color
  const colorBg = isLight ? a.colorBgLight : a.colorBgDark
  const colorBorder = isLight ? a.colorBorderLight : a.colorBorderDark

  return (
    <div
      onClick={onClick}
      style={{
        background: SURFACE,
        border: `1.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: 24,
        cursor: 'pointer',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.15s',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isLight
          ? `0 4px 18px rgba(0,0,0,0.1), 0 0 0 1px ${color}30`
          : `0 0 0 1px ${color}40`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = BORDER
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
      }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '12px 12px 0 0' }} />

      {/* Icon + Tags row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, marginTop: 6 }}>
        <div style={{
          width: 46, height: 46,
          background: colorBg,
          border: `1.5px solid ${colorBorder}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={21} color={color} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {a.tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 10, fontWeight: 700,
              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
              color: MUTED,
              padding: '3px 9px', borderRadius: 100,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: FG, letterSpacing: '-0.02em', marginBottom: 3 }}>{a.title}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.05em' }}>
          {a.region} · {a.date}
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 20 }}>{a.description}</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {a.kpis.map(k => (
          <div key={k.label} style={{
            background: isLight ? 'rgba(0,0,0,0.04)' : BG,
            borderRadius: 8, padding: '10px 8px', textAlign: 'center',
            border: isLight ? `1px solid rgba(0,0,0,0.08)` : 'none',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2, lineHeight: 1.3, fontWeight: isLight ? 500 : 400 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontSize: 13, fontWeight: 700 }}>
        <ExternalLink size={13} />
        <span>Report öffnen</span>
      </div>
    </div>
  )
}

function ComingSoonCard({ item, isLight }) {
  const Icon = item.icon
  return (
    <div style={{
      background: SURFACE,
      border: `1.5px solid ${BORDER}`,
      borderRadius: 10,
      padding: 20,
      opacity: isLight ? 0.5 : 0.55,
      boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 34, height: 34,
          background: `${item.color}14`,
          border: `1.5px solid ${item.color}35`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={item.color} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: FG }}>{item.title}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Demnächst</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{item.desc}</p>
    </div>
  )
}
