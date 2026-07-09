import { useNavigate } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useWeather } from '../context/WeatherContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER, INFO } from '../lib/theme.js'
import { StatCard, EmptyState } from '../components/ui.jsx'
import { JOB_TYPES, TEAM, TASK_STATUSES, TASK_PRIORITIES } from '../data/seed.js'
import { isoToday, addDays, formatDate } from '../lib/storage.js'
import { AlertTriangle, CheckCircle2, Clock, Repeat, Droplets, Umbrella, Sun as SunIcon, ListTodo, ChevronRight } from 'lucide-react'

const TASK_S = Object.fromEntries(TASK_STATUSES.map(s => [s.id, s]))
const TASK_P = Object.fromEntries(TASK_PRIORITIES.map(p => [p.id, p]))
import { useIsMobile } from '../lib/useIsMobile.js'
import WeatherIcon from '../components/WeatherIcon.jsx'
import { getWeatherForDate, STATUS_COLOR, WEATHER_CITY } from '../lib/weather.js'

const STATUS_COLORS = { planned: INFO, in_progress: A, done: OK, cancelled: '#6B7280' }
const STATUS_LABELS = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }

const WEATHER_STATUS_LABELS = { good: 'Gut', mixed: 'Gemischt', warn: 'Warnung', danger: 'Alarm' }

function WeatherDayCard({ day, featured = false }) {
  const sc = STATUS_COLOR[day.status]
  const isWarn = day.status === 'warn' || day.status === 'danger'
  const isGood = day.status === 'good'

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${isWarn ? sc + '60' : isGood ? sc + '30' : BORDER}`,
      borderRadius: 8,
      padding: featured ? '16px 20px' : '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: featured ? 10 : 6,
      minWidth: featured ? 0 : 110,
      flexShrink: featured ? undefined : 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Status accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: sc, borderRadius: '8px 8px 0 0', opacity: isGood ? 0.5 : 1 }} />

      {/* Day label */}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: featured ? 11 : 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
        {new Date(day.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: featured ? 'long' : 'short', day: 'numeric', month: featured ? 'long' : 'numeric' })}
      </div>

      {/* Icon + temp row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: featured ? 12 : 8 }}>
        <WeatherIcon code={day.wmoCode} size={featured ? 32 : 22} color={sc} />
        <div>
          <div style={{ fontSize: featured ? 28 : 18, fontWeight: 300, color: FG, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {day.tempMax}°
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
            min {day.tempMin}°
          </div>
        </div>
        {/* Status badge */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 4, background: sc + '18', border: `1px solid ${sc}40` }}>
          {isWarn && <AlertTriangle size={10} color={sc} />}
          {isGood && !isWarn && <CheckCircle2 size={10} color={sc} />}
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: sc, fontWeight: 700 }}>
            {WEATHER_STATUS_LABELS[day.status]}
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: featured ? 13 : 11, color: MUTED }}>{day.label}</div>

      {/* Warnings */}
      {day.warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {day.warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Space Mono', monospace", fontSize: 10, color: sc }}>
              <AlertTriangle size={9} color={sc} />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Detail row (featured only) */}
      {featured && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 2, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Luftfeuchte</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={11} color={MUTED} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: FG }}>{day.humidity}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Niederschlag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Umbrella size={11} color={MUTED} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: FG }}>{day.precip} mm</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>UV-Index</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SunIcon size={11} color={MUTED} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: day.uvMax >= 7 ? WARN : FG }}>{day.uvMax}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WeatherSection({ isMobile }) {
  const forecast = useWeather()
  const today = isoToday()
  const days = forecast.filter(d => d.date >= today).slice(0, 7)

  if (days.length === 0) return null

  const [todayFc, ...rest] = days

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
        Wetter · {WEATHER_CITY}
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {/* Today — featured */}
        <div style={{ flex: isMobile ? '0 0 240px' : '0 0 300px', minWidth: 0 }}>
          <WeatherDayCard day={todayFc} featured />
        </div>
        {/* Next 6 days — compact */}
        {rest.map(d => (
          <WeatherDayCard key={d.date} day={d} />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { jobs, recurring, sensors, projects, tasks } = useOps()
  const { user, displayName } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const today = isoToday()
  const tomorrow = addDays(today, 1)

  const todayJobs = jobs.filter(j => j.date === today)
  const tomorrowJobs = jobs.filter(j => j.date === tomorrow)
  const weekJobs = jobs.filter(j => j.date >= today && j.date <= addDays(today, 7))
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

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Hey {displayName} 👋
        </h1>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: MUTED }}>
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Heute — Einsätze + fällige Aufgaben */}
      {(todayJobs.length > 0 || dueTasks.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Heute
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayJobs.map(job => {
              const type = JOB_TYPES.find(t => t.id === job.job_type)
              const project = projects.find(p => p.id === job.project_id)
              const assignees = TEAM.filter(t => (job.assigned_users || []).includes(t.id))
              return (
                <div key={`j-${job.id}`} onClick={() => navigate('/jobs')} className="lu-card lu-clickable"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${type?.color || A}`, borderRadius: 8 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: type?.color || A, background: `color-mix(in srgb, ${type?.color || A} 10%, transparent)`, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>Einsatz</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{project?.name}{job.start_time ? ` · ${job.start_time}${job.end_time ? `–${job.end_time}` : ''}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {assignees.slice(0, 4).map(u => (
                      <div key={u.id} title={u.name} style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {dueTasks.map(t => {
              const st = TASK_S[t.status]
              const prio = TASK_P[t.priority]
              const project = projects.find(p => p.id === t.project_id)
              const owner = t.owner_id ? TEAM.find(u => u.id === t.owner_id) : null
              const overdue = t.due_date < today
              return (
                <div key={`t-${t.id}`} onClick={() => navigate('/tasks')} className="lu-card lu-clickable"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: SURFACE, border: `1px solid ${overdue ? `color-mix(in srgb, ${DANGER} 30%, transparent)` : BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, borderRadius: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#A78BFA', background: '#A78BFA18', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}><ListTodo size={10} />Aufgabe</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: overdue ? DANGER : MUTED }}>
                      {overdue ? `überfällig seit ${formatDate(t.due_date)}` : 'heute fällig'}{project ? ` · ${project.name}` : ''}{owner ? ` · ${owner.name}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: st?.color, background: `${st?.color}18`, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>{st?.short}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sensor alerts */}
      {(criticalSensors.length > 0 || warningSensors.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          {[...criticalSensors.map(s => ({ s, level: 'crit' })), ...warningSensors.map(s => ({ s, level: 'warn' }))].map(({ s, level }) => {
            const project = projects.find(p => p.id === s.project_id)
            const c = level === 'crit' ? DANGER : WARN
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: `color-mix(in srgb, ${c} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`, borderRadius: 8, marginBottom: 8 }}>
                <AlertTriangle size={16} color={c} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: c }}>{level === 'crit' ? 'Kritisch' : 'Warnung'}: {s.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>{project?.name} · {s.value}{s.unit} (Schwellwert: {s.threshold_low}{s.unit})</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Heute" value={todayJobs.length} sub={`${todayJobs.filter(j => j.status === 'done').length} erledigt`} color={todayJobs.length > 0 ? A : undefined} />
        <StatCard label="Morgen" value={tomorrowJobs.length} sub="geplant" />
        <StatCard label="Diese Woche" value={weekJobs.length} sub="insgesamt" />
        <StatCard label="Meine Einsätze" value={myJobs.length} sub="7 Tage" color={myJobs.length > 0 ? OK : undefined} />
        <StatCard label="Offene Aufgaben" value={openTasks.length} sub={overdueTasks.length > 0 ? `${overdueTasks.length} überfällig` : `${myOpenTasks.length} für mich`} color={overdueTasks.length > 0 ? DANGER : openTasks.length > 0 ? A : undefined} onClick={() => navigate('/tasks')} />
        <StatCard label="Sensoren" value={`${criticalSensors.length + warningSensors.length}`} sub={criticalSensors.length > 0 ? `${criticalSensors.length} kritisch` : 'alles ok'} color={criticalSensors.length > 0 ? DANGER : warningSensors.length > 0 ? WARN : undefined} />
      </div>

      {/* Weather */}
      <WeatherSection isMobile={isMobile} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Upcoming jobs */}
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Anstehende Einsätze
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upcoming.length === 0 && (
              <EmptyState title="Keine Einsätze geplant" hint="Neue Einsätze legst du in der Einsatzübersicht an." />
            )}
            {upcoming.map(job => {
              const type = JOB_TYPES.find(t => t.id === job.job_type)
              const project = projects.find(p => p.id === job.project_id)
              const assignees = TEAM.filter(t => (job.assigned_users || []).includes(t.id))
              const isToday = job.date === today
              const isTomorrow = job.date === tomorrow
              return (
                <div key={job.id} style={{ padding: isMobile ? '10px 12px' : '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, borderLeft: `3px solid ${type?.color || A}` }}>
                  {isMobile ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {assignees.slice(0, 3).map(u => (
                            <div key={u.id} title={u.name} style={{ width: 20, height: 20, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                            </div>
                          ))}
                          {assignees.length > 3 && <div style={{ width: 20, height: 20, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: MUTED }}>+{assignees.length - 3}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>{isToday ? 'Heute' : isTomorrow ? 'Morgen' : formatDate(job.date)}</span>
                        {project && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color }}>{project.name}</span>}
                        <span style={{ marginLeft: 'auto', padding: '2px 7px', borderRadius: 4, background: `color-mix(in srgb, ${STATUS_COLORS[job.status]} 10%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: STATUS_COLORS[job.status] }}>{STATUS_LABELS[job.status]}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ minWidth: 60, flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>
                          {isToday ? 'Heute' : isTomorrow ? 'Morgen' : formatDate(job.date)}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: FG, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color }}>{project?.name}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {assignees.slice(0, 4).map(u => (
                          <div key={u.id} title={u.name} style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                          </div>
                        ))}
                        {assignees.length > 4 && <div style={{ width: 22, height: 22, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: MUTED }}>+{assignees.length - 4}</div>}
                      </div>
                      <div style={{ padding: '3px 8px', borderRadius: 4, background: `color-mix(in srgb, ${STATUS_COLORS[job.status]} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${STATUS_COLORS[job.status]} 25%, transparent)`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: STATUS_COLORS[job.status], flexShrink: 0 }}>
                        {STATUS_LABELS[job.status]}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar column: my tasks + recurring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* My open tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Meine Aufgaben
            </div>
            <button onClick={() => navigate('/tasks')} style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
              alle <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myOpenTasks.length === 0 && (
              <EmptyState title="Keine offenen Aufgaben 🎉" style={{ padding: '20px 16px' }} />
            )}
            {myOpenTasks.slice(0, 6).map(t => {
              const st = TASK_S[t.status]
              const prio = TASK_P[t.priority]
              const project = projects.find(p => p.id === t.project_id)
              const overdue = t.due_date && t.due_date < today
              return (
                <div key={t.id} onClick={() => navigate('/tasks')}
                  className="lu-card lu-clickable"
                  style={{ padding: '10px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: FG, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: st?.color, background: st?.color + '18', padding: '1px 6px', borderRadius: 8 }}>{st?.short}</span>
                    {project && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED }}>{project.name}</span>}
                    {t.due_date && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: overdue ? DANGER : MUTED, marginLeft: 'auto' }}>{overdue ? '⚠ ' : ''}{formatDate(t.due_date)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recurring templates */}
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Wiederkehrende Aufgaben
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recurring.filter(r => r.active).map(r => {
              const type = JOB_TYPES.find(t => t.id === r.job_type)
              const project = projects.find(p => p.id === r.project_id)
              const daysUntil = Math.ceil((new Date(r.next_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
              const overdue = daysUntil < 0
              return (
                <div key={r.id} style={{ padding: '12px 14px', background: SURFACE, border: `1px solid ${overdue ? `color-mix(in srgb, ${DANGER} 30%, transparent)` : BORDER}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: FG }}>{r.title}</div>
                    <Repeat size={12} color={type?.color || A} style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color, marginBottom: 4 }}>{project?.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: overdue ? DANGER : MUTED }}>
                    {overdue ? `${Math.abs(daysUntil)} Tage überfällig` : daysUntil === 0 ? 'Heute fällig' : `in ${daysUntil} Tagen · alle ${r.interval_days}d`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
