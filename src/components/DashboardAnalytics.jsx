// ────────────────────────────────────────────────────────────────
// Auswertung — Filterzeile über Kennzahlen, Verlauf, Verteilungen
// und Projekt-Punktwolke.
//
// Aufbau nach den Diagramm-Vorgaben:
//   · Eine Filterzeile über allem. Jedes Diagramm zeigt denselben
//     Ausschnitt — es gibt keine Filter je Diagramm, sonst widersprechen
//     sich die Zahlen auf einem Blick.
//   · Farbe trägt Identität nur dort, wo mehrere Serien nebeneinander
//     liegen (Verlauf). Ranglisten sind nominal und laufen einfarbig —
//     die Balkenlänge zeigt den Wert bereits, Farbe würde ihn doppeln.
//   · Jedes Diagramm hat eine Tabellenansicht. Sie ist die Rückfallebene
//     für alle, die Farben nicht unterscheiden, und macht jeden Wert
//     lesbar, ohne auf einen Tooltip angewiesen zu sein.
// ────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts'
import { Table2, BarChart3 } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useTime } from '../context/TimeContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { JOB_TYPES } from '../data/seed.js'
import { findPerson } from '../lib/people.js'
import { SURFACE, BORDER, FG, MUTED, TEXT, SPACE, RADIUS } from '../lib/theme.js'
import { makeColorScale, seriesPalette, restColor, REST_ID, REST_LABEL, formatValue } from '../lib/chartTheme.js'
import { Panel, Select, StatCard, EmptyState, Button } from './ui.jsx'

/* ─── Zeitraum & Buckets ──────────────────────────────────────────────────── */

const RANGES = [
  ['30',  'Letzte 30 Tage'],
  ['90',  'Letzte 90 Tage'],
  ['180', 'Letzte 6 Monate'],
  ['365', 'Letzte 12 Monate'],
  ['ytd', 'Laufendes Jahr'],
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangeStart(range, today) {
  if (range === 'ytd') return `${today.getFullYear()}-01-01`
  const d = new Date(today)
  d.setDate(d.getDate() - Number(range))
  return isoDate(d)
}

/** Montag der Woche, in der `iso` liegt — Wochenbuckets nach ISO-Konvention. */
function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00')
  const wd = (d.getDay() + 6) % 7   // Mo = 0
  d.setDate(d.getDate() - wd)
  return isoDate(d)
}

function monthStart(iso) {
  return iso.slice(0, 7) + '-01'
}

function bucketKey(iso, bucket) {
  return bucket === 'week' ? weekStart(iso) : monthStart(iso)
}

function bucketLabel(key, bucket) {
  const d = new Date(key + 'T00:00:00')
  if (bucket === 'month') return `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

/** Lückenlose Bucket-Liste — fehlende Wochen sollen als Null sichtbar sein,
 *  nicht stillschweigend zusammenrutschen. */
function bucketRange(fromIso, toIso, bucket) {
  const keys = []
  let cur = bucketKey(fromIso, bucket)
  const last = bucketKey(toIso, bucket)
  let guard = 0
  while (cur <= last && guard++ < 400) {
    keys.push(cur)
    const d = new Date(cur + 'T00:00:00')
    if (bucket === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    cur = isoDate(d)
  }
  return keys
}

/* ─── Diagrammbausteine ───────────────────────────────────────────────────── */

const AXIS_TICK = { fill: 'var(--luma-muted)', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }

/** Tooltip: Wert führt, Serienname folgt; Serie wird über einen kurzen
 *  Farbstrich ausgewiesen statt über eingefärbten Text. */
function ChartTooltip({ active, payload, label, unit, total }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter(p => p.value != null && p.value !== 0)
  const sum = rows.reduce((s, p) => s + p.value, 0)
  return (
    <div style={{
      background: 'var(--luma-card)', border: `1px solid ${BORDER}`, borderRadius: RADIUS.md,
      padding: `${SPACE[2]} ${SPACE[3]}`, boxShadow: 'var(--lu-elev-2)', minWidth: 150,
    }}>
      <div style={{ fontSize: TEXT.xs, color: MUTED, marginBottom: SPACE[2] }}>{label}</div>
      {rows.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], marginTop: 2 }}>
          <span style={{ width: 10, height: 2, borderRadius: 1, background: p.color, flexShrink: 0 }} />
          <span className="lu-num" style={{ fontSize: TEXT.base, fontWeight: 600, color: FG }}>
            {formatValue(p.value, unit)}
          </span>
          <span style={{ fontSize: TEXT.xs, color: MUTED, marginLeft: 'auto', textAlign: 'right' }}>{p.name}</span>
        </div>
      ))}
      {total && rows.length > 1 && (
        <div style={{ display: 'flex', gap: SPACE[2], marginTop: SPACE[2], paddingTop: SPACE[2], borderTop: `1px solid ${BORDER}` }}>
          <span className="lu-num" style={{ fontSize: TEXT.base, fontWeight: 600, color: FG }}>{formatValue(sum, unit)}</span>
          <span style={{ fontSize: TEXT.xs, color: MUTED, marginLeft: 'auto' }}>Summe</span>
        </div>
      )}
    </div>
  )
}

/** Legende mit Markierung in Markenform (Fläche = Rechteck), Text in Textfarbe. */
function ChartLegend({ series }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${SPACE[1]} ${SPACE[4]}`, marginTop: SPACE[3] }}>
      {series.map(s => (
        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE[2], fontSize: TEXT.xs, color: MUTED }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

/** Tabellenansicht — der WCAG-saubere Zwilling jedes Diagramms. */
function ChartTable({ columns, rows, unit }) {
  return (
    <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
      <table className="lu-table">
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.num ? 'right' : 'left' }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map(c => (
                <td key={c.key} className={c.num ? 'lu-cell-num' : undefined}>
                  {c.num ? formatValue(r[c.key], unit) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Waagerechte Rangliste. Nominale Kategorien → eine Farbe für alle Balken;
 *  die Länge zeigt den Wert, Farbe würde ihn nur doppeln. */
function RankChart({ data, unit, color, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }} barCategoryGap="22%">
        <CartesianGrid stroke={BORDER} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false}
          tickFormatter={v => v.toLocaleString('de-DE')} />
        <YAxis type="category" dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} width={132} />
        <Tooltip cursor={{ fill: 'var(--luma-surface-2)' }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" name="Wert" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20}
          label={{ position: 'right', fill: 'var(--luma-muted)', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif',
                   formatter: v => formatValue(v, unit) }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── Seite ───────────────────────────────────────────────────────────────── */

/** Datenanschluss — holt aus den Kontexten und reicht an die Darstellung weiter. */
export default function DashboardAnalytics({ isMobile }) {
  const { jobs, projects, clients } = useOps()
  const { entries } = useTime()
  const { isLight } = useTheme()
  return <AnalyticsView jobs={jobs} projects={projects} clients={clients}
    entries={entries} isLight={isLight} isMobile={isMobile} />
}

/**
 * Reine Darstellung — bekommt alle Daten als Props.
 * Dadurch lässt sich die Auswertung in preview.html mit Beispieldaten
 * öffnen, ohne sich anzumelden und ohne die Kontexte nachzubauen.
 */
export function AnalyticsView({ jobs, projects, clients, entries, isLight, isMobile }) {
  const [range, setRange]         = useState('90')
  const [clientId, setClientId]   = useState('all')
  const [projectId, setProjectId] = useState('all')
  const [jobType, setJobType]     = useState('all')
  const [metric, setMetric]       = useState('hours')
  const [bucket, setBucket]       = useState('week')
  const [breakdown, setBreakdown] = useState('jobType')
  const [asTable, setAsTable]     = useState(false)

  const unit = metric === 'hours' ? 'h' : ''
  const metricLabel = metric === 'hours' ? 'Stunden' : 'Einsätze'

  const today = useMemo(() => new Date(), [])
  const todayIso = isoDate(today)
  const fromIso = rangeStart(range, today)

  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])
  const jobById     = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs])

  // Stabile Domänen — die Farbzuordnung hängt hieran, nicht am Filterergebnis.
  const clientDomain = useMemo(() => [...clients].sort((a, b) => a.id.localeCompare(b.id)).map(c => c.id), [clients])
  const typeDomain   = useMemo(() => JOB_TYPES.map(t => t.id).concat('unbekannt'), [])
  const projectDomain = useMemo(() => [...projects].sort((a, b) => a.id.localeCompare(b.id)).map(p => p.id), [projects])

  const clientName = id => clients.find(c => c.id === id)?.name || 'Ohne Kunde'
  const typeName   = id => JOB_TYPES.find(t => t.id === id)?.label || 'Ohne Einsatzart'
  const projectName = id => projectById.get(id)?.name || 'Ohne Projekt'

  /* Beide Quellen auf eine gemeinsame Satzform bringen: Stunden kommen aus der
     Zeiterfassung, Einsätze aus der Einsatzplanung. Danach arbeiten alle
     Diagramme auf derselben Liste. */
  const records = useMemo(() => {
    if (metric === 'hours') {
      return entries.map(e => {
        const job = e.job_id ? jobById.get(e.job_id) : null
        return {
          date: (e.date || '').slice(0, 10),
          value: Number(e.hours) || 0,
          projectId: e.project_id || null,
          clientId: projectById.get(e.project_id)?.client_id || null,
          jobType: job?.job_type || 'unbekannt',
          people: e.user_id ? [e.user_id] : [],
        }
      })
    }
    return jobs.map(j => ({
      date: (j.date || '').slice(0, 10),
      value: 1,
      projectId: j.project_id || null,
      clientId: projectById.get(j.project_id)?.client_id || null,
      jobType: j.job_type || 'unbekannt',
      people: j.assigned_users || [],
    }))
  }, [metric, entries, jobs, jobById, projectById])

  const filtered = useMemo(() => records.filter(r =>
    r.date >= fromIso && r.date <= todayIso &&
    (clientId === 'all'  || r.clientId === clientId) &&
    (projectId === 'all' || r.projectId === projectId) &&
    (jobType === 'all'   || r.jobType === jobType)
  ), [records, fromIso, todayIso, clientId, projectId, jobType])

  /* ── Kennzahlen ── */
  const total = filtered.reduce((s, r) => s + r.value, 0)
  // Einsatzzahl unabhängig von der gewählten Kennzahl — für „Ø je Einsatz"
  const jobsInScope = useMemo(() => jobs.filter(j => {
    const d = (j.date || '').slice(0, 10)
    const cid = projectById.get(j.project_id)?.client_id || null
    return d >= fromIso && d <= todayIso &&
      (clientId === 'all'  || cid === clientId) &&
      (projectId === 'all' || j.project_id === projectId) &&
      (jobType === 'all'   || j.job_type === jobType)
  }), [jobs, projectById, fromIso, todayIso, clientId, projectId, jobType])

  const hoursInScope = useMemo(() => entries.reduce((s, e) => {
    const d = (e.date || '').slice(0, 10)
    const cid = projectById.get(e.project_id)?.client_id || null
    const job = e.job_id ? jobById.get(e.job_id) : null
    const ok = d >= fromIso && d <= todayIso &&
      (clientId === 'all'  || cid === clientId) &&
      (projectId === 'all' || e.project_id === projectId) &&
      (jobType === 'all'   || (job?.job_type || 'unbekannt') === jobType)
    return ok ? s + (Number(e.hours) || 0) : s
  }, 0), [entries, projectById, jobById, fromIso, todayIso, clientId, projectId, jobType])

  const activeProjects = new Set(filtered.map(r => r.projectId).filter(Boolean)).size
  const avgPerJob = jobsInScope.length ? hoursInScope / jobsInScope.length : 0

  /* ── Verlauf: Buckets × Serien ── */
  const breakdownKey = { client: 'clientId', jobType: 'jobType', project: 'projectId' }[breakdown]
  const breakdownDomain = { client: clientDomain, jobType: typeDomain, project: projectDomain }[breakdown] || []
  const breakdownName = { client: clientName, jobType: typeName, project: projectName }[breakdown] || (x => x)
  const colorScale = useMemo(
    () => makeColorScale(breakdownDomain, isLight),
    [breakdownDomain, isLight])

  const { timeline, timelineSeries } = useMemo(() => {
    const keys = bucketRange(fromIso, todayIso, bucket)
    const base = Object.fromEntries(keys.map(k => [k, {}]))

    if (breakdown === 'none') {
      filtered.forEach(r => {
        const k = bucketKey(r.date, bucket)
        if (base[k]) base[k].total = (base[k].total || 0) + r.value
      })
      return {
        timeline: keys.map(k => ({ key: k, label: bucketLabel(k, bucket), total: base[k].total || 0 })),
        timelineSeries: [{ id: 'total', label: metricLabel, color: seriesPalette(isLight)[0] }],
      }
    }

    // Nur die acht stärksten Ausprägungen bekommen eine eigene Farbe;
    // der Rest wird zu „Andere" gebündelt statt neue Farbtöne zu erfinden.
    const sums = new Map()
    filtered.forEach(r => {
      const id = r[breakdownKey] || 'unbekannt'
      sums.set(id, (sums.get(id) || 0) + r.value)
    })
    const top = [...sums.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id)
    const topSet = new Set(top)

    filtered.forEach(r => {
      const k = bucketKey(r.date, bucket)
      if (!base[k]) return
      const raw = r[breakdownKey] || 'unbekannt'
      const id = topSet.has(raw) ? raw : REST_ID
      base[k][id] = (base[k][id] || 0) + r.value
    })

    const hasRest = filtered.some(r => !topSet.has(r[breakdownKey] || 'unbekannt'))
    // Serienreihenfolge folgt der stabilen Domäne, nicht dem Rang —
    // sonst wechselt beim Filtern die Farbe der Überlebenden.
    const ordered = breakdownDomain.filter(id => topSet.has(id))
    const series = ordered.map(id => ({ id, label: breakdownName(id), color: colorScale.get(id) }))
    if (hasRest) series.push({ id: REST_ID, label: REST_LABEL, color: restColor(isLight) })

    return {
      timeline: keys.map(k => ({ key: k, label: bucketLabel(k, bucket), ...base[k] })),
      timelineSeries: series,
    }
  }, [filtered, fromIso, todayIso, bucket, breakdown, breakdownKey, breakdownDomain, colorScale, isLight, metricLabel])

  /* ── Ranglisten ── */
  const rank = (keyFn, nameFn, limit = 8) => {
    const sums = new Map()
    filtered.forEach(r => {
      const id = keyFn(r)
      if (id == null) return
      sums.set(id, (sums.get(id) || 0) + r.value)
    })
    return [...sums.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, value]) => ({ id, label: nameFn(id), value: Math.round(value * 10) / 10 }))
      .reverse()   // Recharts zeichnet von unten — größter Wert soll oben stehen
  }

  /* Die erste Verteilung folgt der Filtertiefe: Ist ein Kunde gewählt, wäre
     „nach Kunde" ein Diagramm mit genau einem Balken — dann sagen die Projekte
     des Kunden etwas, der Kunde selbst nichts mehr. Sind Kunde UND Projekt
     gewählt, entfällt die Kachel ganz. */
  const groupDim = clientId === 'all' ? 'client' : projectId === 'all' ? 'project' : null
  const byGroup = useMemo(() => {
    if (groupDim === 'client')  return rank(r => r.clientId, clientName)
    if (groupDim === 'project') return rank(r => r.projectId, projectName)
    return []
  }, [filtered, groupDim, clients, projects])
  const groupTitle = groupDim === 'client' ? 'nach Kunde' : 'nach Projekt'

  const byType   = useMemo(() => rank(r => r.jobType, typeName), [filtered])
  const byPerson = useMemo(() => {
    const sums = new Map()
    filtered.forEach(r => r.people.forEach(pid => sums.set(pid, (sums.get(pid) || 0) + r.value)))
    return [...sums.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id, value]) => ({ id, label: findPerson(id)?.name || id, value: Math.round(value * 10) / 10 }))
      .reverse()
  }, [filtered])

  /* ── Punktwolke: Aufwand je Projekt ──
     x = Einsätze, y = Stunden, Punktgröße = Ø Stunden je Einsatz.
     Zwei Messgrößen auf zwei Achsen sind hier korrekt (kein Diagramm mit
     zwei y-Skalen) — der Punkt beantwortet „viele kurze oder wenige lange
     Einsätze?", was keine Rangliste zeigt. Eine Farbe für alle Punkte:
     bei paarweise beliebiger Nachbarschaft trägt Farbe hier keine Identität. */
  const scatter = useMemo(() => {
    const byProject = new Map()
    jobsInScope.forEach(j => {
      if (!j.project_id) return
      const e = byProject.get(j.project_id) || { jobs: 0, hours: 0 }
      e.jobs += 1
      byProject.set(j.project_id, e)
    })
    entries.forEach(e => {
      const d = (e.date || '').slice(0, 10)
      if (d < fromIso || d > todayIso || !e.project_id) return
      const cid = projectById.get(e.project_id)?.client_id || null
      const job = e.job_id ? jobById.get(e.job_id) : null
      if (clientId !== 'all' && cid !== clientId) return
      if (projectId !== 'all' && e.project_id !== projectId) return
      if (jobType !== 'all' && (job?.job_type || 'unbekannt') !== jobType) return
      const rec = byProject.get(e.project_id) || { jobs: 0, hours: 0 }
      rec.hours += Number(e.hours) || 0
      byProject.set(e.project_id, rec)
    })
    return [...byProject.entries()]
      .filter(([, v]) => v.jobs > 0 || v.hours > 0)
      .map(([id, v]) => ({
        id,
        label: projectName(id),
        jobs: v.jobs,
        hours: Math.round(v.hours * 10) / 10,
        avg: v.jobs ? Math.round((v.hours / v.jobs) * 10) / 10 : 0,
      }))
  }, [jobsInScope, entries, fromIso, todayIso, clientId, projectId, jobType, projectById, jobById])

  /* Projektauswahl folgt dem Kunden — sonst stehen Projekte zur Wahl,
     die im gefilterten Bild gar nicht vorkommen können. */
  const projectOptions = useMemo(() => {
    const list = clientId === 'all' ? projects : projects.filter(p => p.client_id === clientId)
    return [['all', 'Alle Projekte'], ...[...list].sort((a, b) => a.name.localeCompare(b.name)).map(p => [p.id, p.name])]
  }, [projects, clientId])

  function changeClient(v) {
    setClientId(v)
    setProjectId('all')   // sonst bliebe ein Projekt gewählt, das nicht zum Kunden gehört
  }

  const seriesColor = seriesPalette(isLight)[0]
  const hasData = filtered.length > 0
  const showGroup = byGroup.length > 1
  const showType  = byType.length > 1

  return (
    <div>
      {/* ── Eine Filterzeile über allem ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: SPACE[2], alignItems: 'center',
        marginBottom: SPACE[4], padding: SPACE[3], background: 'var(--luma-surface-2)',
        border: `1px solid ${BORDER}`, borderRadius: RADIUS.lg,
      }}>
        <Select label="Zeitraum" value={range} onChange={setRange} options={RANGES} />
        <Select label="Kunde" value={clientId} onChange={changeClient}
          options={[['all', 'Alle Kunden'], ...[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name])]} />
        <Select label="Projekt" value={projectId} onChange={setProjectId} options={projectOptions} />
        <Select label="Einsatzart" value={jobType} onChange={setJobType}
          options={[['all', 'Alle Arten'], ...JOB_TYPES.map(t => [t.id, t.label])]} />
        <Select label="Kennzahl" value={metric} onChange={setMetric}
          options={[['hours', 'Pflegestunden'], ['jobs', 'Einsätze']]} />
        <Select label="Raster" value={bucket} onChange={setBucket}
          options={[['week', 'Wöchentlich'], ['month', 'Monatlich']]} />
        <Select label="Aufschlüsselung" value={breakdown} onChange={setBreakdown}
          options={[['jobType', 'Nach Einsatzart'], ['client', 'Nach Kunde'], ['project', 'Nach Projekt'], ['none', 'Keine']]} />
        <Button variant={asTable ? 'subtle' : 'ghost'} size="sm" icon={asTable ? BarChart3 : Table2}
          onClick={() => setAsTable(v => !v)} style={{ marginLeft: 'auto' }}>
          {asTable ? 'Diagramme' : 'Tabellen'}
        </Button>
      </div>

      {!hasData ? (
        <EmptyState icon={BarChart3} title="Keine Daten im gewählten Ausschnitt"
          hint="Zeitraum erweitern oder Filter zurücksetzen." />
      ) : (
        <>
          {/* Kennzahlen im gefilterten Ausschnitt */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: SPACE[3], marginBottom: SPACE[5] }}>
            <StatCard label="Pflegestunden" value={formatValue(hoursInScope, 'h')} sub="im Zeitraum" />
            <StatCard label="Einsätze" value={jobsInScope.length} sub="im Zeitraum" />
            <StatCard label="Ø je Einsatz" value={formatValue(avgPerJob, 'h')} sub="aus der Zeiterfassung" />
            <StatCard label="Aktive Projekte" value={activeProjects} sub="mit Aufwand" />
          </div>

          {/* ── Verlauf ── */}
          <Panel title={`Verlauf · ${metricLabel}`} style={{ marginBottom: SPACE[5] }}
            action={<span style={{ fontSize: TEXT.xs, color: MUTED }}>
              {bucket === 'week' ? 'je Woche' : 'je Monat'} · gesamt {formatValue(total, unit)}
            </span>}>
            <div style={{ padding: SPACE[4] }}>
              {asTable ? (
                <ChartTable unit={unit}
                  columns={[{ key: 'label', label: bucket === 'week' ? 'Woche ab' : 'Monat' },
                            ...timelineSeries.map(s => ({ key: s.id, label: s.label, num: true }))]}
                  rows={timeline.map(t => ({ id: t.key, ...t, ...Object.fromEntries(timelineSeries.map(s => [s.id, t[s.id] || 0])) }))} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <BarChart data={timeline} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barCategoryGap="24%">
                      <CartesianGrid stroke={BORDER} vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false}
                        interval="preserveStartEnd" minTickGap={16} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={46}
                        tickFormatter={v => v.toLocaleString('de-DE')} />
                      <Tooltip cursor={{ fill: 'var(--luma-surface-2)' }}
                        content={<ChartTooltip unit={unit} total={timelineSeries.length > 1} />} />
                      {timelineSeries.map((s, i) => (
                        <Bar key={s.id} dataKey={s.id} name={s.label} stackId="a" fill={s.color}
                          maxBarSize={24}
                          // 2px in Flächenfarbe trennen die Segmente — ein Rahmen
                          // in Datenfarbe würde Tinte hinzufügen, die keine Daten ist
                          stroke={SURFACE} strokeWidth={2}
                          radius={i === timelineSeries.length - 1 ? [4, 4, 0, 0] : 0} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  {timelineSeries.length > 1 && <ChartLegend series={timelineSeries} />}
                </>
              )}
            </div>
          </Panel>

          {/* ── Verteilungen ──
              Kacheln mit nur einem Balken werden ausgelassen: ein Balken ist
              keine Verteilung, die Zahl steht schon in den Kennzahlen oben. */}
          {(showGroup || showType) && (
            <div style={{
              display: 'grid', marginBottom: SPACE[5], gap: SPACE[5],
              gridTemplateColumns: isMobile || !(showGroup && showType) ? '1fr' : '1fr 1fr',
            }}>
              {showGroup && (
                <Panel title={`${metricLabel} ${groupTitle}`}>
                  <div style={{ padding: SPACE[4] }}>
                    {asTable
                      ? <ChartTable unit={unit} columns={[{ key: 'label', label: groupDim === 'client' ? 'Kunde' : 'Projekt' }, { key: 'value', label: metricLabel, num: true }]}
                          rows={[...byGroup].reverse()} />
                      : <RankChart data={byGroup} unit={unit} color={seriesColor} height={isMobile ? 220 : 260} />}
                  </div>
                </Panel>
              )}

              {showType && (
                <Panel title={`${metricLabel} nach Einsatzart`}>
                  <div style={{ padding: SPACE[4] }}>
                    {asTable
                      ? <ChartTable unit={unit} columns={[{ key: 'label', label: 'Einsatzart' }, { key: 'value', label: metricLabel, num: true }]}
                          rows={[...byType].reverse()} />
                      : <RankChart data={byType} unit={unit} color={seriesColor} height={isMobile ? 220 : 260} />}
                  </div>
                </Panel>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: SPACE[5] }}>
            {/* ── Punktwolke ── */}
            <Panel title="Aufwand je Projekt"
              action={<span style={{ fontSize: TEXT.xs, color: MUTED }}>Punktgröße = Ø Stunden/Einsatz</span>}>
              <div style={{ padding: SPACE[4] }}>
                {asTable ? (
                  <ChartTable
                    columns={[{ key: 'label', label: 'Projekt' }, { key: 'jobs', label: 'Einsätze', num: true },
                              { key: 'hours', label: 'Stunden', num: true }, { key: 'avg', label: 'Ø je Einsatz', num: true }]}
                    rows={[...scatter].sort((a, b) => b.hours - a.hours)} />
                ) : scatter.length === 0 ? (
                  <EmptyState title="Keine Projektdaten im Ausschnitt" style={{ border: 'none' }} />
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
                    <ScatterChart margin={{ top: 12, right: 16, left: -14, bottom: 16 }}>
                      <CartesianGrid stroke={BORDER} />
                      <XAxis type="number" dataKey="jobs" name="Einsätze" tick={AXIS_TICK}
                        axisLine={false} tickLine={false} allowDecimals={false}
                        label={{ value: 'Einsätze', position: 'insideBottom', offset: -8, fill: 'var(--luma-muted)', fontSize: 11 }} />
                      <YAxis type="number" dataKey="hours" name="Stunden" tick={AXIS_TICK}
                        axisLine={false} tickLine={false} width={52}
                        label={{ value: 'Stunden', angle: -90, position: 'insideLeft', offset: 18,
                                 fill: 'var(--luma-muted)', fontSize: 11, style: { textAnchor: 'middle' } }} />
                      <ZAxis type="number" dataKey="avg" range={[60, 460]} name="Ø je Einsatz" />
                      <Tooltip cursor={{ strokeDasharray: '0', stroke: BORDER }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const p = payload[0].payload
                          return (
                            <div style={{ background: 'var(--luma-card)', border: `1px solid ${BORDER}`, borderRadius: RADIUS.md, padding: `${SPACE[2]} ${SPACE[3]}`, boxShadow: 'var(--lu-elev-2)' }}>
                              <div style={{ fontSize: TEXT.base, fontWeight: 600, color: FG, marginBottom: SPACE[1] }}>{p.label}</div>
                              <div className="lu-num" style={{ fontSize: TEXT.xs, color: MUTED }}>
                                {p.jobs} Einsätze · {formatValue(p.hours, 'h')} · Ø {formatValue(p.avg, 'h')}
                              </div>
                            </div>
                          )
                        }} />
                      {/* 2px Ring in Flächenfarbe hält überlappende Punkte lesbar */}
                      <Scatter data={scatter} fill={seriesColor} stroke={SURFACE} strokeWidth={2}>
                        {scatter.map(p => <Cell key={p.id} fill={seriesColor} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            {/* ── Team ── */}
            <Panel title={metric === 'hours' ? 'Stunden nach Person' : 'Einsatzbeteiligungen'}>
              <div style={{ padding: SPACE[4] }}>
                {byPerson.length === 0 ? (
                  <EmptyState title="Keine Zuordnung im Ausschnitt" style={{ border: 'none' }} />
                ) : asTable ? (
                  <ChartTable unit={unit} columns={[{ key: 'label', label: 'Person' }, { key: 'value', label: metricLabel, num: true }]}
                    rows={[...byPerson].reverse()} />
                ) : (
                  <RankChart data={byPerson} unit={unit} color={seriesColor} height={isMobile ? 220 : 280} />
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
