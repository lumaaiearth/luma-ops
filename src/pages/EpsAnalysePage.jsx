import { useNavigate } from 'react-router-dom'
import { A, SURFACE, BORDER, FG, MUTED, BG } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Bug, Euro, Wrench, Leaf, Shield, Zap, TrendingUp, AlertTriangle, Star } from 'lucide-react'

/* ─── DATA ─── */
const KPIS = [
  { label: 'Aktive Anbieter', value: '30–50', sub: 'Berlin-Brandenburg', emoji: '🏢', color: '#1d4ed8', colorL: '#1e40af' },
  { label: 'Marktwachstum p.a.', value: '+12%', sub: 'durch Klimawandel', emoji: '📈', color: '#047A3C', colorL: '#065f46' },
  { label: 'Nest-Absaugung', value: '€80–350', sub: 'je nach Aufwand', emoji: '🌿', color: '#b45309', colorL: '#92400e' },
  { label: 'Bt-Prävention', value: 'ab €20', sub: 'pro Baum', emoji: '🧬', color: '#6d28d9', colorL: '#5b21b6' },
  { label: 'Hubarbeitsbühne', value: '€400–800', sub: 'pro Tag', emoji: '🚜', color: '#b91c1c', colorL: '#991b1b' },
  { label: 'Marktgröße', value: '~€8M', sub: 'Region p.a. (Schätzung)', emoji: '💶', color: '#0e7490', colorL: '#155e75' },
]

const PRICE_DATA = [
  { name: 'Bt/Baum', min: 20, max: 45 },
  { name: 'Nest (Absaugung)', min: 80, max: 350 },
  { name: 'Bühne/Tag', min: 400, max: 800 },
  { name: 'Jahresabo/Baum', min: 60, max: 120 },
  { name: 'Paket 10 Bäume', min: 500, max: 1500 },
]

const COMPETITORS = [
  {
    name: 'Rentokil Initial', type: 'Konzern', typeColor: '#dc2626',
    threat: 'Hoch', threatColor: '#dc2626',
    methods: ['Mechanisch', 'Chemisch'],
    strengths: 'Bundesweites Netz, starker Vertrieb, bekannte Marke, Kommunalverträge',
    weaknesses: 'Hohe Preise, wenig flexibel, kaum Nachhaltigkeit, langsame Reaktion bei Kleinaufträgen',
  },
  {
    name: 'Anticimex', type: 'Konzern', typeColor: '#dc2626',
    threat: 'Hoch', threatColor: '#dc2626',
    methods: ['Bt-Spritzung', 'Mechanisch'],
    strengths: 'Starkes Online-Marketing, Bt kommuniziert, ab €20/Baum, digitale Terminbuchung, Jahresverträge',
    weaknesses: 'Pauschalaussagen, wenig individuelle Beratung, kein echter Bio-Fokus',
  },
  {
    name: 'Berliner Bär eG', type: 'Regional', typeColor: '#047A3C',
    threat: 'Mittel', threatColor: '#d97706',
    methods: ['Mechanisch', 'Biologisch'],
    strengths: 'Genossenschaftlich, Preisvorteil, regionale Verwurzelung, persönlicher Kontakt',
    weaknesses: 'Begrenzte Kapazitäten, wenig digitale Präsenz, keine Preistransparenz',
  },
  {
    name: 'Baumpflege Schmidt', type: 'Spezialist', typeColor: '#1d4ed8',
    threat: 'Mittel', threatColor: '#d97706',
    methods: ['Baumpflege', 'EPS-Entfernung'],
    strengths: 'Baumexpertise, Kundennähe, flexible Termine',
    weaknesses: 'Klein, keine Preisangaben, begrenztes Volumen, kein Bt-Fokus',
  },
]

const METHODS = [
  {
    emoji: '🌿', title: 'Biologisch (Bt)', color: '#047A3C', colorL: '#065f46',
    desc: 'Bacillus thuringiensis (Foray, XenTari, Delfin) — Spritzung April–Mai bei Raupenstadium L1–L2. Ungefährlich für Mensch, Tier, Biene.',
    cost: 'ab €20/Baum', timing: 'April–Mai',
    highlight: 'Marktlücke — kaum Anbieter kommunizieren dies aktiv',
  },
  {
    emoji: '🪣', title: 'Mechanisch (Absaugung)', color: '#1d4ed8', colorL: '#1e40af',
    desc: 'Industriestaubsauger mit HEPA-H14-Filter. Standardverfahren für aktive Nester. PSA Klasse 3 erforderlich.',
    cost: '€80–350/Nest', timing: 'Mai–September',
    highlight: 'Sofortlösung, kein Chemikalieneinsatz',
  },
  {
    emoji: '🔥', title: 'Thermisch (Abbrennen)', color: '#b45309', colorL: '#92400e',
    desc: 'Verbrennen der Nester mit Gasbrenner. Nur für zugängliche Nester. Brandschutz erforderlich.',
    cost: '€60–200/Nest', timing: 'Ganzjährig',
    highlight: 'Günstig bei erreichbaren Nestern',
  },
  {
    emoji: '💊', title: 'Chemisch (Pyrethroide)', color: '#b91c1c', colorL: '#991b1b',
    desc: 'Pyrethroide wie Deltamethrin. Nur als letztes Mittel — schädlich für Bienen, stark rückläufig.',
    cost: '€50–150/Behandlung', timing: 'Mai–Juli',
    highlight: 'Schnellwirkung, aber starkes Imageproblem',
  },
]

const USP_RECS = [
  { emoji: '🌱', title: 'Bio-First Positionierung', color: '#047A3C', colorL: '#065f46', desc: 'Als einziger Anbieter, der ausschließlich biologische Methoden (Bt) anbietet und aktiv kommuniziert. Klarer Weißer Fleck im Markt.' },
  { emoji: '📊', title: 'Preistransparenz', color: '#1d4ed8', colorL: '#1e40af', desc: 'Öffentliche Preisliste auf luma-biome.de. Kaum ein Wettbewerber tut das — erzeugt sofort Vertrauen.' },
  { emoji: '📆', title: 'Jahresvertrag + Monitoring', color: '#6d28d9', colorL: '#5b21b6', desc: 'Prävention im Frühjahr + Monitoring-Begehung im Herbst als Abo-Modell. Recurring Revenue, planbare Kapazität.' },
  { emoji: '🤝', title: 'Kooperationsnetz Baumpflege', color: '#b45309', colorL: '#92400e', desc: 'Partnerprogramm mit Baumpflegern ohne EPS-Lizenz — wir übernehmen EPS, sie bringen Kunden.' },
  { emoji: '🏛️', title: 'Kommunale Rahmenverträge', color: '#0e7490', colorL: '#155e75', desc: 'Bezirksämter, Landesbetrieb Forsten, Straßen Berlin als Zielkunden. Langfristige Sicherheit.' },
]

/* ─── COMPONENT ─── */

export default function EpsAnalysePage() {
  const navigate = useNavigate()
  const { themeId } = useTheme()
  const L = themeId === 'light'

  const accentBar = L ? '#d97706' : '#f59e0b'
  const cardBg = L ? '#fff' : SURFACE
  const innerBg = L ? 'rgba(0,0,0,0.035)' : BG
  const shadowCard = L ? '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1.5px rgba(0,0,0,0.07)' : `0 0 0 1px ${BORDER}`
  const shadowHover = L ? '0 6px 24px rgba(0,0,0,0.13)' : `0 0 0 1px rgba(255,255,255,0.15)`

  const c = (dark, light) => L ? light : dark

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 72px' }}>

      {/* Back */}
      <button onClick={() => navigate('/analyse')} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', color: MUTED,
        fontSize: 13, cursor: 'pointer', marginBottom: 28, padding: 0,
        fontWeight: L ? 600 : 400,
      }}>
        <ArrowLeft size={14} /> Zurück zu Analysen
      </button>

      {/* Hero */}
      <div style={{
        background: L
          ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fffbf0 100%)'
          : 'linear-gradient(135deg, #0d1b0f 0%, #132214 50%, #0a1a0d 100%)',
        border: L ? '1.5px solid rgba(217,119,6,0.3)' : `1px solid rgba(245,158,11,0.15)`,
        borderRadius: 14, padding: '36px 36px 32px', marginBottom: 36,
        position: 'relative', overflow: 'hidden',
        boxShadow: L ? '0 2px 16px rgba(0,0,0,0.08)' : 'none',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #d97706, #dc2626)', borderRadius: '14px 14px 0 0' }} />
        <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${L ? 'rgba(217,119,6,0.08)' : 'rgba(245,158,11,0.06)'} 0%, transparent 70%)` }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: L ? 'rgba(217,119,6,0.12)' : 'rgba(245,158,11,0.1)',
          border: L ? '1.5px solid rgba(217,119,6,0.4)' : '1px solid rgba(245,158,11,0.25)',
          borderRadius: 100, padding: '4px 14px', marginBottom: 16,
        }}>
          <Bug size={11} color={L ? '#b45309' : '#f59e0b'} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: L ? '#92400e' : '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            Marktanalyse · Juni 2025
          </span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: L ? 800 : 600, color: L ? '#0a1409' : '#f0f7fc', letterSpacing: '-0.03em', marginBottom: 10, maxWidth: 680 }}>
          EPS Markt & Wettbewerbsanalyse<br />
          <span style={{ color: L ? '#b45309' : '#fbbf24' }}>Berlin-Brandenburg 2025</span>
        </h1>
        <p style={{ fontSize: 14, color: L ? '#44403c' : 'rgba(240,247,252,0.7)', maxWidth: 620, lineHeight: 1.75 }}>
          Vollständige Analyse des Markts für Eichenprozessionsspinner-Bekämpfung: Wettbewerber, Preismodelle, Methoden (biologisch, mechanisch, chemisch) und strategische Empfehlungen für Lumas Positionierung.
        </p>
      </div>

      {/* KPI Grid */}
      <Sect icon={<TrendingUp size={16} color={c('#60a5fa','#1d4ed8')} />} title="Marktüberblick" subtitle="Key Indicators" L={L}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
          {KPIS.map(k => {
            const col = L ? k.colorL : k.color
            return (
              <div key={k.label} style={{
                background: cardBg, borderRadius: 10, padding: '18px 14px', textAlign: 'center',
                boxShadow: shadowCard,
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: col, letterSpacing: '-0.03em', marginBottom: 4 }}>{k.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{k.sub}</div>
              </div>
            )
          })}
        </div>
      </Sect>

      {/* Price Chart */}
      <Sect icon={<Euro size={16} color={c('#34d399','#047A3C')} />} title="Preisgestaltung" subtitle="Typische Marktpreise Berlin-Brandenburg" L={L}>
        <div style={{ background: cardBg, borderRadius: 12, padding: '24px 12px 12px', boxShadow: shadowCard }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={PRICE_DATA} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={L ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'} />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11, fontWeight: L ? 600 : 400 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip
                contentStyle={{
                  background: L ? '#fff' : '#0e1c26',
                  border: L ? '1.5px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, fontSize: 12,
                  color: FG,
                }}
                formatter={(val, name) => [`€${val}`, name === 'min' ? 'Mindestpreis' : 'Maximalpreis']}
              />
              <Bar dataKey="min" name="min" fill={L ? '#047A3C' : '#10b981'} radius={[4,4,0,0]} />
              <Bar dataKey="max" name="max" fill={L ? '#1d4ed8' : '#3b82f6'} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
            <LegDot color={L ? '#047A3C' : '#10b981'} label="Mindestpreis" L={L} />
            <LegDot color={L ? '#1d4ed8' : '#3b82f6'} label="Maximalpreis" L={L} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10, marginTop: 14 }}>
          {[
            { label: 'Basis (1–5 Bäume)', price: '€200–600', note: 'Anfahrt + Absaugung' },
            { label: 'Mittel (5–20 Bäume)', price: '€500–2.000', note: 'inkl. Hubarbeitsbühne' },
            { label: 'Großauftrag (20+)', price: 'ab €2.500', note: 'Pauschal + Jahresvertrag' },
            { label: 'Notfalleinsatz', price: '+25–40%', note: 'Wochenende / kurzfristig' },
          ].map(p => (
            <div key={p.label} style={{ background: innerBg, borderRadius: 8, padding: '14px 16px', border: L ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: L ? '#b45309' : '#f59e0b', marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: FG, marginBottom: 2 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{p.note}</div>
            </div>
          ))}
        </div>
      </Sect>

      {/* Methods */}
      <Sect icon={<Wrench size={16} color={c('#fbbf24','#b45309')} />} title="Methoden & Ausrüstung" subtitle="Eingesetzte Verfahren im Markt" L={L}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
          {METHODS.map(m => {
            const col = L ? m.colorL : m.color
            return (
              <div key={m.title} style={{
                background: cardBg, borderRadius: 12, padding: 22,
                boxShadow: shadowCard,
                borderTop: `3px solid ${col}`,
              }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{m.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: col, marginBottom: 8 }}>{m.title}</div>
                <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 14 }}>{m.desc}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Chip color={col} label={m.cost} L={L} />
                  <Chip color={MUTED} label={m.timing} L={L} />
                </div>
                <div style={{ padding: '8px 12px', background: L ? `${col}10` : `${col}14`, borderRadius: 8, fontSize: 11.5, color: col, lineHeight: 1.5, fontWeight: L ? 600 : 400, border: L ? `1px solid ${col}25` : 'none' }}>
                  💡 {m.highlight}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bt box */}
        <div style={{
          marginTop: 16,
          background: L ? '#f0fdf4' : 'rgba(4,122,60,0.06)',
          border: L ? '1.5px solid rgba(4,122,60,0.3)' : '1px solid rgba(16,185,129,0.2)',
          borderRadius: 12, padding: '22px 24px',
          boxShadow: L ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Leaf size={16} color={L ? '#047A3C' : '#10b981'} />
            <span style={{ fontSize: 14, fontWeight: 700, color: L ? '#047A3C' : '#10b981' }}>Bacillus thuringiensis (Bt) — die Marktlücke</span>
          </div>
          <p style={{ fontSize: 13, color: L ? '#374151' : MUTED, lineHeight: 1.75, marginBottom: 12 }}>
            Bt ist ein natürlich vorkommendes Bodenbakterium, das ausschließlich Schmetterlingsraupen befällt. Präparate wie <strong style={{color: FG}}>Foray ES, XenTari WG</strong> und <strong style={{color: FG}}>Delfin WG</strong> sind in Deutschland zugelassen. Spritzung muss im Frühjahr (April–Mai) bei Raupenstadium L1–L2 erfolgen. <strong style={{color: L ? '#047A3C' : '#10b981'}}>Kaum ein Anbieter in Berlin-Brandenburg kommuniziert Bt aktiv als Kernleistung</strong> — dies ist Lumas größte Chance.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Foray ES', 'XenTari WG', 'Delfin WG', 'Rimi (Bayer)', 'Carpovirusine Pro'].map(p => (
              <Chip key={p} color={L ? '#047A3C' : '#10b981'} label={p} L={L} />
            ))}
          </div>
        </div>
      </Sect>

      {/* Competitors */}
      <Sect icon={<AlertTriangle size={16} color={c('#f87171','#dc2626')} />} title="Wettbewerber" subtitle="Hauptanbieter im Markt Berlin-Brandenburg" L={L}>
        <div style={{ display: 'grid', gap: 12 }}>
          {COMPETITORS.map(comp => (
            <div key={comp.name} style={{ background: cardBg, borderRadius: 12, padding: '20px 24px', boxShadow: shadowCard }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: FG }}>{comp.name}</span>
                    <Chip color={comp.typeColor} label={comp.type} L={L} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {comp.methods.map(m => (
                      <span key={m} style={{ fontSize: 10, fontWeight: 600, color: MUTED, background: L ? 'rgba(0,0,0,0.06)' : BG, padding: '3px 9px', borderRadius: 100, border: L ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>{m}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 3, fontWeight: L ? 600 : 400 }}>Bedrohung</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: comp.threatColor }}>● {comp.threat}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: L ? '#047A3C' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>✓ Stärken</div>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>{comp.strengths}</p>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: L ? '#b91c1c' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>✗ Schwächen</div>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>{comp.weaknesses}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Sect>

      {/* USPs */}
      <Sect icon={<Star size={16} color={c('#fbbf24','#b45309')} />} title="Strategische Empfehlungen" subtitle="USPs für Luma im EPS-Markt" L={L}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
          {USP_RECS.map((u, i) => {
            const col = L ? u.colorL : u.color
            return (
              <div key={i} style={{ background: cardBg, borderRadius: 12, padding: '20px 20px 20px 24px', position: 'relative', overflow: 'hidden', boxShadow: shadowCard }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: col, borderRadius: '12px 0 0 12px' }} />
                <div style={{ fontSize: 24, marginBottom: 8 }}>{u.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: col, marginBottom: 8 }}>{u.title}</div>
                <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>{u.desc}</p>
              </div>
            )
          })}
        </div>
      </Sect>

      {/* Executive Summary */}
      <div style={{
        marginTop: 16,
        background: L ? '#f0fdf4' : 'rgba(4,122,60,0.06)',
        border: L ? '1.5px solid rgba(4,122,60,0.3)' : '1px solid rgba(16,185,129,0.2)',
        borderRadius: 14, padding: '28px 32px',
        boxShadow: L ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 42, height: 42,
            background: L ? 'rgba(4,122,60,0.12)' : 'rgba(16,185,129,0.12)',
            border: L ? '1.5px solid rgba(4,122,60,0.3)' : '1px solid rgba(16,185,129,0.25)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={18} color={L ? '#047A3C' : '#10b981'} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: L ? '#047A3C' : '#10b981', marginBottom: 10 }}>Executive Summary</div>
            <p style={{ fontSize: 13.5, color: L ? '#374151' : MUTED, lineHeight: 1.85, maxWidth: 720 }}>
              Der EPS-Markt in Berlin-Brandenburg wächst durch den Klimawandel mit ~12% p.a. und ist trotzdem fragmentiert. <strong style={{color: FG}}>Lumas größte Chance: Bio-First-Positionierung mit Bt</strong> — kein Konkurrent kommuniziert dies konsequent. Kombiniert mit Preistransparenz, Jahresverträgen und einem Kooperationsnetz für Baumpfleger kann Luma in 2–3 Jahren zur regionalen Referenz für nachhaltige EPS-Bekämpfung werden. Sofortiger Quick-Win: öffentliche Preisliste + Bt-Landingpage auf <strong style={{color: FG}}>luma-biome.de</strong>.
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center', color: MUTED, fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: '0.07em' }}>
        LUMA RESEARCH · BERLIN-BRANDENBURG · JUNI 2025 · GiordaniBruno AI
      </div>
    </div>
  )
}

/* ─── HELPERS ─── */

function Sect({ icon, title, subtitle, children, L }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 38, height: 38, background: SURFACE, border: `1.5px solid ${BORDER}`,
          borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: L ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: L ? 800 : 600, color: FG, letterSpacing: '-0.02em' }}>{title}</div>
          <div style={{ fontSize: 11, color: MUTED, fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em', fontWeight: L ? 600 : 400 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Chip({ color, label, L }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      padding: '3px 10px',
      background: L ? `${color}12` : `${color}18`,
      border: `1px solid ${color}${L ? '35' : '40'}`,
      borderRadius: 100, letterSpacing: '0.03em',
    }}>{label}</span>
  )
}

function LegDot({ color, label, L }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, color: MUTED, fontWeight: L ? 600 : 400 }}>{label}</span>
    </div>
  )
}
