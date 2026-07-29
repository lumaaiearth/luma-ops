import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useWeather } from '../context/WeatherContext.jsx'
import { A, SURFACE_2, BORDER, FG, MUTED, OK, WARN, DANGER, INFO, TEXT, SPACE } from '../lib/theme.js'
import { StatCard, EmptyState, Avatar, Panel, DataTable, ListRow, Badge, SANS } from '../components/ui.jsx'
import { JOB_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '../data/seed.js'
import { findPerson, peopleForIds, avatarFor } from '../lib/people.js'
import { sb } from '../lib/supabase.js'
import { isoToday, addDays, formatDate } from '../lib/storage.js'
import { AlertTriangle, CheckCircle2, Repeat, Droplets, Umbrella, Sun as SunIcon, ListTodo, ChevronRight, CalendarDays, Users, Radio, Radar, Briefcase } from 'lucide-react'

const TASK_S = Object.fromEntries(TASK_STATUSES.map(s => [s.id, s]))
const TASK_P = Object.fromEntries(TASK_PRIORITIES.map(p => [p.id, p]))
import { useIsMobile } from '../lib/useIsMobile.js'
import WeatherIcon from '../components/WeatherIcon.jsx'
import { STATUS_COLOR, WEATHER_CITY } from '../lib/weather.js'

// Status über Semantik-Tokens statt fester Hex-Werte — trägt durch alle Themes.
const STATUS_COLORS = { planned: INFO, in_progress: A, done: OK, cancelled: MUTED }
const STATUS_LABELS = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }

const WEATHER_STATUS_LABELS = { good: 'Gut', mixed: 'Gemischt', warn: 'Warnung', danger: 'Alarm' }

/* Lucide setzt `color` als SVG-Attribut — dort greift var() nicht.
   Über style.color erbt das Icon die Farbe via currentColor korrekt. */
const iconColor = c => ({ color: c })

/* ─── Wetter ─────────────────────────────────────────────────────────────── */

function WeatherDayCell({ day }) {
  const sc = STATUS_COLOR[day.status]
  const isWarn = day.status === 'warn' || day.status === 'danger'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: SPACE[1],
      padding: `${SPACE[2]} ${SPACE[3]}`, minWidth: 92, flexShrink: 0,
      borderLeft: `1px solid ${BORDER}`,
    }}>
      <div style={{ fontSize: TEXT.xs, color: MUTED }}>
        {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
        <WeatherIcon code={day.wmoCode} size={16} color={sc} />
        <span className="lu-num" style={{ fontSize: TEXT.base, fontWeight: 600, color: FG }}>{day.tempMax}°</span>
        <span className="lu-num" style={{ fontSize: TEXT.xs, color: MUTED }}>{day.tempMin}°</span>
      </div>
      {isWarn && (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[1], fontSize: TEXT.xs, color: sc }}>
          <AlertTriangle size={10} /> {day.warnings[0] || WEATHER_STATUS_LABELS[day.status]}
        </div>
      )}
    </div>
  )
}

function WeatherStrip({ isMobile }) {
  const forecast = useWeather()
  const today = isoToday()
  const [expanded, setExpanded] = useState(false)
  const days = forecast.filter(d => d.date >= today).slice(0, 7)

  if (days.length === 0) return null

  const [todayFc, ...rest] = days
  const warnDays = rest.filter(d => d.status === 'warn' || d.status === 'danger')
  const tsc = STATUS_COLOR[todayFc.status]

  return (
    <Panel
      title={`Wetter · ${WEATHER_CITY}`}
      action={
        <button onClick={() => setExpanded(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: TEXT.xs, fontFamily: SANS, fontWeight: 500 }}>
          {expanded ? 'Details ausblenden' : '7-Tage-Details'}
          <ChevronRight size={13} style={{ transform: expanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
        </button>
      }
      style={{ marginBottom: SPACE[5] }}>

      {/* Heute prominent, Folgetage als kompakte Zellen daneben */}
      <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3], padding: `${SPACE[3]} ${SPACE[4]}`, minWidth: isMobile ? 200 : 260, flexShrink: 0 }}>
          <WeatherIcon code={todayFc.wmoCode} size={30} color={tsc} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[2] }}>
              <span className="lu-num" style={{ fontSize: TEXT['2xl'], fontWeight: 600, color: FG, letterSpacing: '-0.02em', lineHeight: 1 }}>{todayFc.tempMax}°</span>
              <span className="lu-num" style={{ fontSize: TEXT.sm, color: MUTED }}>min {todayFc.tempMin}°</span>
            </div>
            <div style={{ fontSize: TEXT.sm, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Heute · {todayFc.label}
            </div>
          </div>
        </div>

        {!isMobile && rest.slice(0, 6).map(d => <WeatherDayCell key={d.date} day={d} />)}

        {/* Zusammenfassung der Folgetage — mobil ersetzt sie die Zellen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], padding: `${SPACE[3]} ${SPACE[4]}`, marginLeft: 'auto', borderLeft: `1px solid ${BORDER}`, flexShrink: 0 }}>
          {warnDays.length > 0 ? (
            <Badge color={STATUS_COLOR[warnDays[0].status]} icon={AlertTriangle}>
              {warnDays.length} {warnDays.length === 1 ? 'Warntag' : 'Warntage'}
            </Badge>
          ) : (
            <Badge color={OK} icon={CheckCircle2}>7 Tage ohne Warnung</Badge>
          )}
        </div>
      </div>

      {/* Detailwerte nur auf Wunsch — Dashboard bleibt sonst ruhig */}
      {expanded && (
        <div className="lu-fade-in" style={{ borderTop: `1px solid ${BORDER}`, background: SURFACE_2, padding: `${SPACE[3]} ${SPACE[4]}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: SPACE[4] }}>
          {[
            { icon: Droplets, label: 'Luftfeuchte', value: `${todayFc.humidity}%`, warn: false },
            { icon: Umbrella, label: 'Niederschlag', value: `${todayFc.precip} mm`, warn: todayFc.precip > 5 },
            { icon: SunIcon, label: 'UV-Index', value: todayFc.uvMax, warn: todayFc.uvMax >= 7 },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: TEXT.xs, color: MUTED, marginBottom: SPACE[1] }}>{m.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                <m.icon size={13} style={iconColor(MUTED)} />
                <span className="lu-num" style={{ fontSize: TEXT.md, fontWeight: 600, color: m.warn ? WARN : FG }}>{m.value}</span>
              </div>
            </div>
          ))}
          {todayFc.warnings.length > 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: SPACE[2] }}>
              {todayFc.warnings.map((w, i) => (
                <Badge key={i} color={tsc} icon={AlertTriangle}>{w}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

/* ─── Seite ──────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { jobs, recurring, sensors, projects, tasks } = useOps()
  const { user, displayName } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const today = isoToday()
  const tomorrow = addDays(today, 1)

  // MANA: relevante offene Ausschreibungen (Score >= 60, noch nicht bearbeitet)
  const [manaCount, setManaCount] = useState(null)
  useEffect(() => {
    sb.from('mana_ausschreibungen')
      .select('id', { count: 'exact', head: true })
      .in('status', ['neu', 'interessant']).gte('score', 60)
      .then(({ count }) => setManaCount(count ?? 0))
  }, [])

  const todayJobs = jobs.filter(j => j.date === today)
  const tomorrowJobs = jobs.filter(j => j.date === tomorrow)
  const weekJobs = jobs.filter(j => j.date >= today && j.date <= addDays(today, 7))
  // Trend: kommende 7 Tage vs. vergangene 7 Tage
  const prevWeekJobs = jobs.filter(j => j.date >= addDays(today, -7) && j.date < today)
  const weekTrend = weekJobs.length - prevWeekJobs.length
  const myJobs = weekJobs.filter(j => (j.assigned_users || []).includes(user?.id))
  const criticalSensors = sensors.filter(s => s.status === 'critical')
  const warningSensors = sensors.filter(s => s.status === 'warning')

  const openTasks = (tasks || []).filter(t => t.status !== 'done' && t.status !== 'archive')
  const myOpenTasks = openTasks
    .filter(t => t.owner_id === user?.id || (t.assigned_users || []).includes(user?.id))
    .sort((a, b) => {
      const rank = { extreme: 0, high: 1, medium: 2, low: 3 }
      const pr = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9)
      if (pr !== 0) return pr
      return (a.due_date || '9999').localeCompare(b.due_date || '9999')
    })
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today)
  const dueTasks = openTasks
    .filter(t => t.due_date && t.due_date <= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  const upcoming = jobs
    .filter(j => j.date >= today && j.status !== 'done' && j.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  const alerts = [
    ...criticalSensors.map(s => ({ s, level: 'crit' })),
    ...warningSensors.map(s => ({ s, level: 'warn' })),
  ]

  // Spalten der Einsatzliste — eine Definition statt handgebauter Zeilen
  const jobColumns = [
    {
      key: 'date', label: 'Termin', width: 96, mono: true,
      render: j => {
        const isToday = j.date === today
        return (
          <span style={{ color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>
            {isToday ? 'Heute' : j.date === tomorrow ? 'Morgen' : formatDate(j.date)}
          </span>
        )
      },
    },
    {
      key: 'title', label: 'Einsatz',
      render: j => (
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{j.title}</div>
      ),
    },
    {
      key: 'project', label: 'Projekt', width: 180, muted: true,
      render: j => {
        const p = projects.find(x => x.id === j.project_id)
        if (!p) return <span style={{ color: MUTED }}>–</span>
        return (
          <span onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}`) }} title="Zur Projektseite"
            style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
            {p.name}
          </span>
        )
      },
    },
    {
      key: 'team', label: 'Team', width: 110,
      render: j => {
        const assignees = peopleForIds(j.assigned_users)
        if (!assignees.length) return <span style={{ color: MUTED }}>–</span>
        return (
          <div style={{ display: 'flex', gap: 3 }}>
            {assignees.slice(0, 4).map(u => (
              <Avatar key={u.id} title={u.name} initials={u.initials} color={u.color} size={20} src={avatarFor(u.id)} />
            ))}
            {assignees.length > 4 && (
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: SURFACE_2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: TEXT['2xs'], color: MUTED }}>
                +{assignees.length - 4}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'status', label: 'Status', width: 96,
      render: j => <Badge color={STATUS_COLORS[j.status]}>{STATUS_LABELS[j.status]}</Badge>,
    },
  ]

  return (
    <div style={{ padding: isMobile ? SPACE[4] : SPACE[6], maxWidth: 1240, margin: '0 auto' }}>

      {/* Kopf — Titel trägt, das Datum ordnet sich unter */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE[4], flexWrap: 'wrap', marginBottom: SPACE[5] }}>
        <div>
          <h1 style={{ fontSize: isMobile ? TEXT.xl : TEXT['2xl'], fontWeight: 600, color: FG, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
            Hallo {displayName}
          </h1>
          <div style={{ fontSize: TEXT.sm, color: MUTED, marginTop: SPACE[1] }}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Kennzahlen — dichte Reihe, Farbe nur wenn sie etwas bedeutet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: SPACE[3], marginBottom: SPACE[5] }}>
        <StatCard icon={CalendarDays} label="Heute" value={todayJobs.length}
          sub={`${todayJobs.filter(j => j.status === 'done').length} erledigt`}
          onClick={() => navigate(`/calendar?date=${today}`)} />
        <StatCard icon={CalendarDays} label="Morgen" value={tomorrowJobs.length} sub="geplant"
          onClick={() => navigate(`/calendar?date=${tomorrow}`)} />
        <StatCard icon={Briefcase} label="Diese Woche" value={weekJobs.length} sub="vs. Vorwoche"
          delta={{ value: Math.abs(weekTrend), dir: weekTrend > 0 ? 'up' : weekTrend < 0 ? 'down' : 'flat' }}
          onClick={() => navigate('/jobs')} />
        <StatCard icon={Users} label="Meine Einsätze" value={myJobs.length} sub="nächste 7 Tage"
          onClick={() => navigate('/jobs')} />
        <StatCard icon={ListTodo} label="Offene Aufgaben" value={openTasks.length}
          sub={overdueTasks.length > 0 ? `${overdueTasks.length} überfällig` : `${myOpenTasks.length} für mich`}
          color={overdueTasks.length > 0 ? DANGER : undefined}
          onClick={() => navigate('/tasks')} />
        <StatCard icon={Radio} label="Sensoren" value={criticalSensors.length + warningSensors.length}
          sub={criticalSensors.length > 0 ? `${criticalSensors.length} kritisch` : 'alles im Rahmen'}
          color={criticalSensors.length > 0 ? DANGER : warningSensors.length > 0 ? WARN : undefined}
          onClick={() => navigate('/sensors')} />
        <StatCard icon={Radar} label="MANA™" value={manaCount ?? '–'} sub="relevante Ausschreibungen"
          onClick={() => navigate('/mana')} />
      </div>

      {/* Alarme zuerst — was heute kaputt ist, gehört nach oben */}
      {alerts.length > 0 && (
        <Panel title="Sensoralarme" style={{ marginBottom: SPACE[5] }}
          action={<Badge color={criticalSensors.length > 0 ? DANGER : WARN}>{alerts.length} offen</Badge>}>
          {alerts.map(({ s, level }) => {
            const c = level === 'crit' ? DANGER : WARN
            const project = projects.find(p => p.id === s.project_id)
            return (
              <ListRow key={s.id} accent={c} onClick={() => navigate(`/sensors/${s.id}`)}>
                <AlertTriangle size={15} style={{ ...iconColor(c), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG }}>{s.name}</div>
                  <div style={{ fontSize: TEXT.xs, color: MUTED }}>
                    {project?.name} · <span className="lu-num">{s.value}{s.unit}</span> (Schwelle <span className="lu-num">{s.threshold_low}{s.unit}</span>)
                  </div>
                </div>
                <Badge color={c}>{level === 'crit' ? 'Kritisch' : 'Warnung'}</Badge>
              </ListRow>
            )
          })}
        </Panel>
      )}

      {/* Heute — Einsätze und fällige Aufgaben in einer Liste */}
      {(todayJobs.length > 0 || dueTasks.length > 0) && (
        <Panel title="Heute fällig" style={{ marginBottom: SPACE[5] }}
          action={<span style={{ fontSize: TEXT.xs, color: MUTED }}>{todayJobs.length + dueTasks.length} Einträge</span>}>
          {todayJobs.map(job => {
            const type = JOB_TYPES.find(t => t.id === job.job_type)
            const project = projects.find(p => p.id === job.project_id)
            const assignees = peopleForIds(job.assigned_users)
            return (
              <ListRow key={`j-${job.id}`} accent={type?.color || A} onClick={() => navigate(`/jobs?open=${job.id}`)}>
                <Badge color={type?.color || A} icon={CalendarDays}>Einsatz</Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                  <div style={{ fontSize: TEXT.xs, color: MUTED }}>
                    {project?.name}
                    {job.start_time && <> · <span className="lu-num">{job.start_time}{job.end_time ? `–${job.end_time}` : ''}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {assignees.slice(0, 4).map(u => (
                    <Avatar key={u.id} title={u.name} initials={u.initials} color={u.color} size={20} src={avatarFor(u.id)} />
                  ))}
                </div>
              </ListRow>
            )
          })}
          {dueTasks.map(t => {
            const st = TASK_S[t.status]
            const prio = TASK_P[t.priority]
            const project = projects.find(p => p.id === t.project_id)
            const owner = t.owner_id ? findPerson(t.owner_id) : null
            const overdue = t.due_date < today
            return (
              <ListRow key={`t-${t.id}`} accent={overdue ? DANGER : prio?.color || BORDER} onClick={() => navigate(`/tasks?open=${t.id}`)}>
                <Badge color={INFO} icon={ListTodo}>Aufgabe</Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: TEXT.xs, color: overdue ? DANGER : MUTED }}>
                    {overdue ? `überfällig seit ${formatDate(t.due_date)}` : 'heute fällig'}
                    {project ? ` · ${project.name}` : ''}{owner ? ` · ${owner.name}` : ''}
                  </div>
                </div>
                {st && <Badge color={st.color}>{st.short}</Badge>}
              </ListRow>
            )
          })}
        </Panel>
      )}

      <WeatherStrip isMobile={isMobile} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 340px', gap: SPACE[5], alignItems: 'start' }}>

        {/* Anstehende Einsätze — auf dem Desktop als echte Tabelle */}
        <Panel title="Anstehende Einsätze"
          action={
            <button onClick={() => navigate('/jobs')}
              style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: TEXT.xs, fontFamily: SANS, fontWeight: 500 }}>
              Alle Einsätze <ChevronRight size={13} />
            </button>
          }>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Keine Einsätze geplant"
              hint="Neue Einsätze legst du in der Einsatzübersicht an."
              style={{ border: 'none' }} />
          ) : isMobile ? (
            upcoming.map(job => {
              const type = JOB_TYPES.find(t => t.id === job.job_type)
              const project = projects.find(p => p.id === job.project_id)
              const assignees = peopleForIds(job.assigned_users)
              const isToday = job.date === today
              return (
                <ListRow key={job.id} accent={type?.color || A} onClick={() => navigate(`/jobs?open=${job.id}`)}
                  style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], marginTop: SPACE[1] }}>
                      <span className="lu-num" style={{ fontSize: TEXT.xs, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>
                        {isToday ? 'Heute' : job.date === tomorrow ? 'Morgen' : formatDate(job.date)}
                      </span>
                      {project && <span style={{ fontSize: TEXT.xs, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: SPACE[2], flexShrink: 0 }}>
                    <Badge color={STATUS_COLORS[job.status]}>{STATUS_LABELS[job.status]}</Badge>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {assignees.slice(0, 3).map(u => (
                        <Avatar key={u.id} title={u.name} initials={u.initials} color={u.color} size={18} src={avatarFor(u.id)} />
                      ))}
                    </div>
                  </div>
                </ListRow>
              )
            })
          ) : (
            <DataTable
              columns={jobColumns}
              rows={upcoming}
              accent={j => JOB_TYPES.find(t => t.id === j.job_type)?.color || A}
              onRowClick={j => navigate(`/jobs?open=${j.id}`)}
            />
          )}
        </Panel>

        {/* Rechte Spalte: meine Aufgaben + wiederkehrende Einsätze */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>

          <Panel title="Meine Aufgaben"
            action={
              <button onClick={() => navigate('/tasks')}
                style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: TEXT.xs, fontFamily: SANS, fontWeight: 500 }}>
                Alle <ChevronRight size={13} />
              </button>
            }>
            {myOpenTasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Keine offenen Aufgaben"
                hint="Alles abgearbeitet." style={{ border: 'none', padding: '24px 16px' }} />
            ) : myOpenTasks.slice(0, 6).map(t => {
              const st = TASK_S[t.status]
              const prio = TASK_P[t.priority]
              const project = projects.find(p => p.id === t.project_id)
              const overdue = t.due_date && t.due_date < today
              return (
                <ListRow key={t.id} accent={overdue ? DANGER : prio?.color || BORDER}
                  onClick={() => navigate(`/tasks?open=${t.id}`)} style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], marginTop: SPACE[1], flexWrap: 'wrap' }}>
                      {st && <Badge color={st.color}>{st.short}</Badge>}
                      {project && <span style={{ fontSize: TEXT.xs, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>}
                    </div>
                  </div>
                  {t.due_date && (
                    <span className="lu-num" style={{ fontSize: TEXT.xs, color: overdue ? DANGER : MUTED, flexShrink: 0 }}>
                      {formatDate(t.due_date)}
                    </span>
                  )}
                </ListRow>
              )
            })}
          </Panel>

          <Panel title="Wiederkehrende Einsätze">
            {recurring.filter(r => r.active).length === 0 ? (
              <EmptyState icon={Repeat} title="Nichts hinterlegt" style={{ border: 'none', padding: '24px 16px' }} />
            ) : recurring.filter(r => r.active).map(r => {
              const type = JOB_TYPES.find(t => t.id === r.job_type)
              const project = projects.find(p => p.id === r.project_id)
              const daysUntil = Math.ceil((new Date(r.next_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
              const overdue = daysUntil < 0
              return (
                <ListRow key={r.id} accent={overdue ? DANGER : type?.color || A}
                  onClick={() => navigate('/jobs?tab=recurring')} style={{ alignItems: 'flex-start' }}>
                  <Repeat size={14} style={{ ...iconColor(overdue ? DANGER : MUTED), flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: TEXT.base, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize: TEXT.xs, color: overdue ? DANGER : MUTED, marginTop: SPACE[1] }}>
                      {overdue
                        ? `${Math.abs(daysUntil)} Tage überfällig`
                        : daysUntil === 0 ? 'Heute fällig' : `in ${daysUntil} Tagen`}
                      {project ? ` · ${project.name}` : ''}
                    </div>
                  </div>
                  <span className="lu-num" style={{ fontSize: TEXT.xs, color: MUTED, flexShrink: 0 }}>alle {r.interval_days}d</span>
                </ListRow>
              )
            })}
          </Panel>
        </div>
      </div>
    </div>
  )
}
