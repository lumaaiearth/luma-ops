// ────────────────────────────────────────────────────────────────
// Design-Vorschau (nur Entwicklung, nicht Teil des App-Bundles).
//
//   npm run dev  →  http://localhost:5173/preview.html
//
// Zeigt alle geteilten Primitives aus components/ui.jsx mit Beispieldaten
// in allen vier Themes — zum Beurteilen von Typografie, Dichte, Elevation
// und Kontrast, ohne sich in der App anmelden zu müssen.
// ────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { THEMES } from './context/ThemeContext.jsx'
import {
  StatCard, Badge, Button, Panel, DataTable, ListRow, Toolbar, Tabs, Chips,
  EmptyState, Skeleton, Avatar, SectionLabel, PageHeader, INPUT_STYLE, LABEL_STYLE,
} from './components/ui.jsx'
import {
  A, SURFACE_2, BORDER, FG, MUTED, OK, WARN, DANGER, INFO, TEXT, SPACE, RADIUS,
} from './lib/theme.js'
import {
  CalendarDays, ListTodo, Radio, Users, AlertTriangle, CheckCircle2, Plus, Trash2, Repeat,
} from 'lucide-react'
import './styles/ui.css'

const JOBS = [
  { id: 1, date: 'Heute',     title: 'Rasenpflege Innenhof',        project: 'Wohnpark Süd',     status: 'in_progress', team: ['ML', 'JK'], accent: OK },
  { id: 2, date: 'Morgen',    title: 'Heckenschnitt Straßenseite',  project: 'Gewerbehof Nord',  status: 'planned',     team: ['TS'],       accent: INFO },
  { id: 3, date: '31.07.',    title: 'Baumkontrolle Allee',         project: 'Stadtpark Ost',    status: 'planned',     team: ['ML', 'AB', 'TS', 'JK', 'RW'], accent: INFO },
  { id: 4, date: '02.08.',    title: 'Bewässerung Neupflanzung',    project: 'Wohnpark Süd',     status: 'planned',     team: ['AB'],       accent: WARN },
]

const STATUS = {
  planned:     { label: 'Geplant',  color: INFO },
  in_progress: { label: 'Läuft',    color: A },
  done:        { label: 'Erledigt', color: OK },
}

function ThemeSwitcher({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap', marginBottom: SPACE[6] }}>
      {THEMES.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: SPACE[2], cursor: 'pointer',
            padding: '6px 12px', borderRadius: RADIUS.md, fontFamily: 'inherit',
            fontSize: TEXT.sm, fontWeight: value === t.id ? 600 : 500,
            color: value === t.id ? A : MUTED,
            background: 'transparent',
            border: `1px solid ${value === t.id ? A : BORDER}`,
          }}>
          <span style={{ display: 'flex', gap: 2 }}>
            {['--luma-bg', '--luma-surface', '--luma-a'].map(k => (
              <span key={k} style={{ width: 12, height: 12, borderRadius: 3, background: t.vars[k], border: `1px solid ${BORDER}` }} />
            ))}
          </span>
          {t.name}
        </button>
      ))}
    </div>
  )
}

function Preview() {
  const [themeId, setThemeId] = useState('light')
  const [tab, setTab] = useState('woche')
  const [chip, setChip] = useState('offen')

  // Theme-Variablen direkt setzen — ohne ThemeProvider, damit die Vorschau
  // unabhängig von der App-Statusverwaltung bleibt.
  const theme = THEMES.find(t => t.id === themeId)
  const rootStyle = Object.fromEntries(Object.entries(theme.vars))
  document.documentElement.style.colorScheme = theme.scheme
  Object.entries(theme.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))

  const columns = [
    { key: 'date', label: 'Termin', width: 96, mono: true,
      render: j => <span style={{ color: j.date === 'Heute' ? A : MUTED, fontWeight: j.date === 'Heute' ? 700 : 400 }}>{j.date}</span> },
    { key: 'title', label: 'Einsatz', render: j => <span style={{ fontWeight: 500 }}>{j.title}</span> },
    { key: 'project', label: 'Projekt', width: 180, muted: true },
    { key: 'team', label: 'Team', width: 110, render: j => (
      <div style={{ display: 'flex', gap: 3 }}>
        {j.team.slice(0, 4).map(i => <Avatar key={i} initials={i} size={20} color={A} />)}
        {j.team.length > 4 && (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: SURFACE_2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: TEXT['2xs'], color: MUTED }}>
            +{j.team.length - 4}
          </div>
        )}
      </div>
    ) },
    { key: 'status', label: 'Status', width: 96,
      render: j => <Badge color={STATUS[j.status].color}>{STATUS[j.status].label}</Badge> },
  ]

  return (
    <div style={{ ...rootStyle, minHeight: '100vh', background: 'var(--luma-bg)', color: FG, padding: SPACE[6] }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <PageHeader eyebrow="Design-System" title="LUMA Ops — UI-Bausteine"
          sub="Alle Primitives aus components/ui.jsx mit Beispieldaten" />

        <ThemeSwitcher value={themeId} onChange={setThemeId} />

        <SectionLabel style={{ marginBottom: SPACE[3] }}>Kennzahlen</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: SPACE[3], marginBottom: SPACE[6] }}>
          <StatCard icon={CalendarDays} label="Heute" value={4} sub="2 erledigt" />
          <StatCard icon={CalendarDays} label="Diese Woche" value={18} sub="vs. Vorwoche" delta={{ value: 3, dir: 'up' }} />
          <StatCard icon={ListTodo} label="Offene Aufgaben" value={27} sub="5 überfällig" color={DANGER} />
          <StatCard icon={Radio} label="Sensoren" value={2} sub="1 kritisch" color={WARN} />
          <StatCard icon={Users} label="Meine Einsätze" value={6} sub="nächste 7 Tage" />
        </div>

        <SectionLabel style={{ marginBottom: SPACE[3] }}>Werkzeugleiste, Reiter & Filter</SectionLabel>
        <Toolbar right={<><Button variant="ghost" size="sm" icon={Trash2}>Verwerfen</Button><Button size="sm" icon={Plus}>Einsatz anlegen</Button></>}>
          <Tabs tabs={[['tag', 'Tag'], ['woche', 'Woche'], ['monat', 'Monat']]} active={tab} onChange={setTab} style={{ marginBottom: 0 }} />
          <Chips options={[['offen', 'Offen'], ['laufend', 'Läuft'], ['fertig', 'Erledigt']]} value={chip} onChange={setChip}
            colors={{ offen: INFO, laufend: A, fertig: OK }} />
        </Toolbar>

        <Panel title="Anstehende Einsätze" style={{ marginBottom: SPACE[6] }}
          action={<span style={{ fontSize: TEXT.xs, color: MUTED }}>4 Einträge</span>}>
          <DataTable columns={columns} rows={JOBS} accent={j => j.accent} onRowClick={() => {}} />
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: SPACE[5], alignItems: 'start', marginBottom: SPACE[6] }}>
          <Panel title="Sensoralarme" action={<Badge color={DANGER}>2 offen</Badge>}>
            <ListRow accent={DANGER} onClick={() => {}}>
              <AlertTriangle size={15} style={{ color: DANGER, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: TEXT.base, fontWeight: 500 }}>Bodenfeuchte Beet 3</div>
                <div style={{ fontSize: TEXT.xs, color: MUTED }}>Wohnpark Süd · <span className="lu-num">12%</span> (Schwelle <span className="lu-num">25%</span>)</div>
              </div>
              <Badge color={DANGER}>Kritisch</Badge>
            </ListRow>
            <ListRow accent={WARN} onClick={() => {}}>
              <AlertTriangle size={15} style={{ color: WARN, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: TEXT.base, fontWeight: 500 }}>Temperatur Gewächshaus</div>
                <div style={{ fontSize: TEXT.xs, color: MUTED }}>Gewerbehof Nord · <span className="lu-num">31,4 °C</span></div>
              </div>
              <Badge color={WARN}>Warnung</Badge>
            </ListRow>
            <ListRow>
              <CheckCircle2 size={15} style={{ color: OK, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: TEXT.base, color: MUTED }}>Alle übrigen Sensoren im Rahmen</div>
            </ListRow>
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
            <Panel title="Wiederkehrend">
              <ListRow accent={A} onClick={() => {}} style={{ alignItems: 'flex-start' }}>
                <Repeat size={14} style={{ color: MUTED, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: TEXT.base, fontWeight: 500 }}>Rasenmähen</div>
                  <div style={{ fontSize: TEXT.xs, color: MUTED, marginTop: SPACE[1] }}>in 3 Tagen · Wohnpark Süd</div>
                </div>
                <span className="lu-num" style={{ fontSize: TEXT.xs, color: MUTED }}>alle 14d</span>
              </ListRow>
              <ListRow accent={DANGER} onClick={() => {}} style={{ alignItems: 'flex-start' }}>
                <Repeat size={14} style={{ color: DANGER, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: TEXT.base, fontWeight: 500 }}>Unkrautentfernung</div>
                  <div style={{ fontSize: TEXT.xs, color: DANGER, marginTop: SPACE[1] }}>4 Tage überfällig · Stadtpark Ost</div>
                </div>
                <span className="lu-num" style={{ fontSize: TEXT.xs, color: MUTED }}>alle 30d</span>
              </ListRow>
            </Panel>

            <Panel title="Leerer Zustand">
              <EmptyState icon={CheckCircle2} title="Keine offenen Aufgaben" hint="Alles abgearbeitet." style={{ border: 'none' }} />
            </Panel>

            <Panel title="Wird geladen">
              <div style={{ padding: SPACE[4], display: 'flex', flexDirection: 'column', gap: SPACE[3] }}>
                <Skeleton height={12} width="70%" />
                <Skeleton height={12} width="90%" />
                <Skeleton height={12} width="45%" />
              </div>
            </Panel>
          </div>
        </div>

        <SectionLabel style={{ marginBottom: SPACE[3] }}>Buttons, Badges & Formularfelder</SectionLabel>
        <Panel style={{ marginBottom: SPACE[6] }}>
          <div style={{ padding: SPACE[4], display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
            <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap', alignItems: 'center' }}>
              <Button>Speichern</Button>
              <Button variant="ghost">Abbrechen</Button>
              <Button variant="subtle">Duplizieren</Button>
              <Button variant="danger" icon={Trash2}>Löschen</Button>
              <Button size="sm" icon={Plus}>Klein</Button>
              <Button disabled>Deaktiviert</Button>
            </div>
            <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge>Standard</Badge>
              <Badge color={OK} icon={CheckCircle2}>Erledigt</Badge>
              <Badge color={WARN} icon={AlertTriangle}>Warnung</Badge>
              <Badge color={DANGER} icon={AlertTriangle}>Kritisch</Badge>
              <Badge color={INFO}>Geplant</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: SPACE[4] }}>
              <div>
                <label style={LABEL_STYLE}>Titel</label>
                <input style={INPUT_STYLE} defaultValue="Rasenpflege Innenhof" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Projekt</label>
                <select style={INPUT_STYLE}><option>Wohnpark Süd</option><option>Stadtpark Ost</option></select>
              </div>
            </div>
          </div>
        </Panel>

        <SectionLabel style={{ marginBottom: SPACE[3] }}>Typo-Skala</SectionLabel>
        <Panel>
          <div style={{ padding: SPACE[4], display: 'flex', flexDirection: 'column', gap: SPACE[3] }}>
            {[['3xl', 'Kennzahl 1.248'], ['2xl', 'Seitentitel'], ['xl', 'Seitentitel mobil'], ['lg', 'Panel-Titel'],
              ['md', 'Formularfeld'], ['base', 'Standardtext in einer Tabellenzeile'], ['sm', 'Sekundärtext'],
              ['xs', 'Metazeile, Spaltenkopf'], ['2xs', 'Mikrodaten']].map(([k, label]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[4] }}>
                <span className="lu-num" style={{ fontSize: TEXT.xs, color: MUTED, width: 44, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: TEXT[k], fontWeight: k === '3xl' || k === '2xl' ? 600 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Preview />)
