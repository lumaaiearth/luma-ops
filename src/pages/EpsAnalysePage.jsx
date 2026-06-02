import { useNavigate } from 'react-router-dom'
import { A, SURFACE, BORDER, FG, MUTED, BG, A14, A20 } from '../lib/theme.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import { ArrowLeft, Bug, Euro, Wrench, Leaf, Shield, Zap, TrendingUp, AlertTriangle, Star } from 'lucide-react'

/* ─── DATA ─── */

const KPIS = [
  { label: 'Aktive Anbieter', value: '30–50', sub: 'Berlin-Brandenburg', color: '#3b82f6', icon: '🏢' },
  { label: 'Marktwachstum p.a.', value: '+12%', sub: 'durch Klimawandel', color: '#10b981', icon: '📈' },
  { label: 'Preis Nest-Absaugung', value: '€80–350', sub: 'je nach Aufwand', color: '#f59e0b', icon: '🌿' },
  { label: 'Bt-Prävention', value: 'ab €20', sub: 'pro Baum', color: '#8b5cf6', icon: '🧬' },
  { label: 'Hubarbeitsbühne', value: '€400–800', sub: 'pro Tag', color: '#ef4444', icon: '🚜' },
  { label: 'Marktgröße Schätzung', value: '~€8M', sub: 'Region Berlin-Bbg./Jahr', color: '#06b6d4', icon: '💶' },
]

const PRICE_DATA = [
  { name: 'Bt-Prävention\n(pro Baum)', min: 20, max: 45 },
  { name: 'Nestabsaugung\n(pro Nest)', min: 80, max: 350 },
  { name: 'Hubarbeitsbühne\n(pro Tag)', min: 400, max: 800 },
  { name: 'Jahresvertrag\n(pro Baum)', min: 60, max: 120 },
  { name: 'Komplettpaket\n(10 Bäume)', min: 500, max: 1500 },
]

const COMPETITORS = [
  {
    name: 'Rentokil Initial',
    type: 'Konzern',
    typeColor: '#ef4444',
    threat: 'Hoch',
    threatColor: '#ef4444',
    methods: ['Mechanisch', 'Chemisch'],
    strengths: 'Bundesweites Netz, starker Vertrieb, bekannte Marke, Rahmenverträge mit Kommunen',
    weaknesses: 'Hohe Preise, wenig flexibel, unpersönlich, langsame Reaktion bei Kleinaufträgen, kaum Nachhaltigkeit',
    radarScore: [3, 5, 4, 2, 5],
  },
  {
    name: 'Anticimex',
    type: 'Konzern',
    typeColor: '#ef4444',
    threat: 'Hoch',
    threatColor: '#ef4444',
    methods: ['Bt-Spritzung', 'Mechanisch'],
    strengths: 'Starkes Online-Marketing, biologische Präparate beworben, ab €20/Baum kommuniziert, digitale Terminbuchung, Jahresverträge',
    weaknesses: 'Pauschalaussagen ohne Ortsbegehung, wenig individuelle Beratung, Standardverfahren dominiert',
    radarScore: [4, 4, 5, 3, 4],
  },
  {
    name: 'Berliner Bär eG',
    type: 'Regional',
    typeColor: '#10b981',
    threat: 'Mittel',
    threatColor: '#f59e0b',
    methods: ['Mechanisch', 'Biologisch'],
    strengths: 'Genossenschaftlich, Preisvorteil, regionale Verwurzelung, persönlicher Kontakt',
    weaknesses: 'Begrenzte Kapazitäten, wenig digitale Präsenz, keine Preistransparenz online',
    radarScore: [2, 3, 2, 5, 2],
  },
  {
    name: 'Baumpflege Schmidt',
    type: 'Spezialist',
    typeColor: '#3b82f6',
    threat: 'Mittel',
    threatColor: '#f59e0b',
    methods: ['Baumpflege', 'EPS-Entfernung'],
    strengths: 'Expertise im Baum, Kundennähe, flexible Termine',
    weaknesses: 'Klein, keine Preisangaben, begrenztes Volumen, kein Bt-Fokus',
    radarScore: [2, 2, 2, 4, 3],
  },
]

const RADAR_AXES = ['Preis', 'Marketing', 'Digital', 'Regional', 'Bio-Fokus']

const METHODS = [
  {
    icon: '🌿', title: 'Biologisch (Bt)', color: '#10b981',
    desc: 'Bacillus thuringiensis (Foray, XenTari, Delfin) — Spritzung im Frühjahr bei Raupenstadium L1–L2. Keine Gefahr für Mensch, Tier, Biene.',
    cost: 'ab €20/Baum', timing: 'April–Mai', advantage: 'Marktlücke — kaum Anbieter kommunizieren dies aktiv',
  },
  {
    icon: '🪣', title: 'Mechanisch (Absaugung)', color: '#3b82f6',
    desc: 'Industriestaubsauger mit HEPA-H14-Filter. Standardverfahren für aktive Nester. Schutzanzug PSA Klasse 3 erforderlich.',
    cost: '€80–350/Nest', timing: 'Mai–September', advantage: 'Sofortlösung, kein Chemikalieneinsatz',
  },
  {
    icon: '🔥', title: 'Thermisch (Abbrennen)', color: '#f59e0b',
    desc: 'Verbrennen der Nester mit Gasbrenner. Weniger verbreitet, nur für zugängliche Nester. Brandschutz beachten.',
    cost: '€60–200/Nest', timing: 'Ganzjährig', advantage: 'Günstig bei erreichbaren Nestern',
  },
  {
    icon: '💊', title: 'Chemisch (Pyrethroide)', color: '#ef4444',
    desc: 'Pyrethroide wie Deltamethrin. Nur als letztes Mittel, da schädlich für Bienen und Wasserorganismen. Stark rückläufig.',
    cost: '€50–150/Behandlung', timing: 'Mai–Juli', advantage: 'Schnellwirksamkeit, aber Imageproblem',
  },
]

const USP_RECS = [
  { icon: '🌱', title: 'Bio-First Positionierung', color: '#10b981', desc: 'Als einziger Anbieter, der ausschließlich biologische Methoden (Bt) anbietet und aktiv kommuniziert. Klarer Weißer Fleck im Markt.' },
  { icon: '📊', title: 'Preistransparenz', color: '#3b82f6', desc: 'Öffentliche Preisliste online. Kaum ein Wettbewerber tut das — erzeugt sofort Vertrauen und spart Vertriebsaufwand.' },
  { icon: '📆', title: 'Jahresvertrag + Monitoring', color: '#8b5cf6', desc: 'Prävention im Frühjahr + Monitoring-Begehung im Herbst als Abo-Modell. Recurring Revenue, planbare Kapazität.' },
  { icon: '🤝', title: 'Kooperationsnetz Baumpflege', color: '#f59e0b', desc: 'Partnerprogramm mit Baumpflegern die keine EPS-Lizenz haben. Wir übernehmen EPS, sie bringen Kunden = Win-Win.' },
  { icon: '🏛️', title: 'Kommunale Rahmenverträge', color: '#06b6d4', desc: 'Bezirksämter, Landesbetrieb Forsten, Straßen Berlin als Zielkunden. Langfristige Sicherheit bei niedrigerem Margendruck.' },
]

/* ─── COMPONENTS ─── */

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#161b27', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.fill, fontWeight: 600 }}>
            {p.name === 'min' ? 'Ab ' : 'Bis '} €{p.value}
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function EpsAnalysePage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* Back */}
      <button
        onClick={() => navigate('/analyse')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: MUTED, fontSize: 13, cursor: 'pointer', marginBottom: 28, padding: 0 }}
      >
        <ArrowLeft size={14} /> Zurück zu Analysen
      </button>

      {/* Hero */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '36px 36px 32px', marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #ef4444)', borderRadius: '12px 12px 0 0' }} />
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
          <Bug size={11} color="#f59e0b" />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Marktanalyse · Juni 2025</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 600, color: FG, letterSpacing: '-0.03em', marginBottom: 8, maxWidth: 680 }}>
          EPS Markt & Wettbewerbsanalyse
          <br /><span style={{ color: '#f59e0b' }}>Berlin-Brandenburg 2025</span>
        </h1>
        <p style={{ fontSize: 14, color: MUTED, maxWidth: 620, lineHeight: 1.7 }}>
          Vollständige Analyse des Markts für Eichenprozessionsspinner-Bekämpfung: Wettbewerber, Preismodelle, Methoden (biologisch, mechanisch, chemisch) und strategische Empfehlungen für Lumas Positionierung.
        </p>
      </div>

      {/* KPI Grid */}
      <Section icon={<TrendingUp size={16} color="#3b82f6" />} title="Marktüberblick" subtitle="Key Indicators">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {KPIS.map(k => (
            <div key={k.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '18px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, letterSpacing: '-0.03em', marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: FG, marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Price Chart */}
      <Section icon={<Euro size={16} color="#10b981" />} title="Preisgestaltung" subtitle="Typische Marktpreise Berlin-Brandenburg">
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '24px 16px' }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={PRICE_DATA} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: MUTED, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="min" name="min" fill="#10b981" radius={[4,4,0,0]} opacity={0.7} />
              <Bar dataKey="max" name="max" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4 }}>
            <LegendDot color="#10b981" label="Mindestpreis" />
            <LegendDot color="#3b82f6" label="Maximalpreis" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Basis-Einsatz (1–5 Bäume)', price: '€200–600', note: 'Anfahrt + Absaugung' },
            { label: 'Mittlerer Auftrag (5–20 Bäume)', price: '€500–2.000', note: 'inkl. Hubarbeitsbühne' },
            { label: 'Großauftrag (20+ Bäume)', price: 'ab €2.500', note: 'Pauschal + Jahresvertrag' },
            { label: 'Notfalleinsatz', price: '+25–40% Aufschlag', note: 'Wochenende / kurzfristig' },
          ].map(p => (
            <div key={p.label} style={{ background: BG, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: FG, marginBottom: 2 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{p.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Methods */}
      <Section icon={<Wrench size={16} color="#f59e0b" />} title="Methoden & Ausrüstung" subtitle="Eingesetzte Verfahren im Markt">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
          {METHODS.map(m => (
            <div key={m.title} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px', borderTop: `2px solid ${m.color}` }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: m.color, marginBottom: 6 }}>{m.title}</div>
              <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>{m.desc}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color={m.color} label={m.cost} />
                <Tag color={MUTED} label={m.timing} />
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: `${m.color}12`, borderRadius: 6, fontSize: 11, color: m.color, lineHeight: 1.4 }}>
                💡 {m.advantage}
              </div>
            </div>
          ))}
        </div>

        {/* Bt highlight */}
        <div style={{ marginTop: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Leaf size={16} color="#10b981" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>Bacillus thuringiensis (Bt) — die Marktlücke</span>
          </div>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 12 }}>
            Bt ist ein natürlich vorkommendes Bodenbakterium, das ausschließlich Schmetterlingsraupen befällt. Präparate wie <strong style={{color: FG}}>Foray ES, XenTari WG</strong> und <strong style={{color:FG}}>Delfin WG</strong> sind in Deutschland zugelassen. Die Spritzung muss im Frühjahr (April–Mai) bei Raupenstadium L1–L2 erfolgen. <strong style={{color:'#10b981'}}>Kaum ein Anbieter in Berlin-Brandenburg kommuniziert Bt aktiv als Kernleistung</strong> — dies ist Lumas größte Chance.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Foray ES', 'XenTari WG', 'Delfin WG', 'Rimi (Bayer)', 'Carpovirusine Pro'].map(p => (
              <Tag key={p} color="#10b981" label={p} />
            ))}
          </div>
        </div>
      </Section>

      {/* Competitors */}
      <Section icon={<AlertTriangle size={16} color="#ef4444" />} title="Wettbewerber" subtitle="Hauptanbieter im Markt Berlin-Brandenburg">
        <div style={{ display: 'grid', gap: 12 }}>
          {COMPETITORS.map(c => (
            <div key={c.name} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: FG }}>{c.name}</span>
                    <Tag color={c.typeColor} label={c.type} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.methods.map(m => (
                      <span key={m} style={{ fontSize: 10, color: MUTED, background: BG, padding: '3px 8px', borderRadius: 100 }}>{m}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>Bedrohung</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.threatColor }}>● {c.threat}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>✓ Stärken</div>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{c.strengths}</p>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>✗ Schwächen</div>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{c.weaknesses}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* USP */}
      <Section icon={<Star size={16} color="#f59e0b" />} title="Strategische Empfehlungen" subtitle="USPs für Luma im EPS-Markt">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
          {USP_RECS.map((u, i) => (
            <div key={i} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: u.color, borderRadius: '10px 0 0 10px' }} />
              <div style={{ paddingLeft: 12 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{u.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: u.color, marginBottom: 6 }}>{u.title}</div>
                <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Summary Box */}
      <div style={{ marginTop: 32, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '28px 32px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, background: 'rgba(16,185,129,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>Executive Summary</div>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.8, maxWidth: 720 }}>
              Der EPS-Markt in Berlin-Brandenburg wächst durch den Klimawandel mit ~12% p.a. und ist trotzdem noch fragmentiert. <strong style={{color: FG}}>Lumas größte Chance: Bio-First-Positionierung mit Bt</strong> — kein Konkurrent kommuniziert dies konsequent. Kombiniert mit Preistransparenz, Jahresverträgen und einem Kooperationsnetz für Baumpfleger kann Luma in 2–3 Jahren zur regionalen Referenz für nachhaltige EPS-Bekämpfung werden. Sofortiger Quick-Win: öffentliche Preisliste + Bt-Landingpage auf luma-biome.de.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', color: MUTED, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
        Luma Research · Berlin-Brandenburg · Juni 2025 · Erstellt von GiordaniBruno AI
      </div>
    </div>
  )
}

/* ─── HELPERS ─── */

function Section({ icon, title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: FG, letterSpacing: '-0.02em' }}>{title}</div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Tag({ color, label }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color, padding: '3px 10px',
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 100, letterSpacing: '0.03em',
    }}>{label}</span>
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
    </div>
  )
}
