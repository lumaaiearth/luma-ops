import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED } from '../components/Layout.jsx'
import { JOB_TYPES, TEAM } from '../data/seed.js'
import { isoToday, addDays, formatDate } from '../lib/storage.js'
import { AlertTriangle, CheckCircle2, Clock, Repeat } from 'lucide-react'

const STATUS_COLORS = { planned: '#6EA8C0', in_progress: A, done: '#22EAA7', cancelled: '#6B7280' }
const STATUS_LABELS = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt' }

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 300, color: color || FG, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { jobs, recurring, sensors, projects } = useOps()
  const { user } = useAuth()
  const today = isoToday()
  const tomorrow = addDays(today, 1)

  const todayJobs = jobs.filter(j => j.date === today)
  const tomorrowJobs = jobs.filter(j => j.date === tomorrow)
  const weekJobs = jobs.filter(j => j.date >= today && j.date <= addDays(today, 7))
  const myJobs = weekJobs.filter(j => j.assigned_users.includes(user?.id))
  const criticalSensors = sensors.filter(s => s.status === 'critical')
  const warningSensors = sensors.filter(s => s.status === 'warning')

  const upcoming = jobs
    .filter(j => j.date >= today && j.status !== 'done' && j.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Hey {user?.name} 👋
        </h1>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: MUTED }}>
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Sensor alerts */}
      {(criticalSensors.length > 0 || warningSensors.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          {criticalSensors.map(s => {
            const project = projects.find(p => p.id === s.project_id)
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#ef444418', border: '1px solid #ef444440', borderRadius: 8, marginBottom: 8 }}>
                <AlertTriangle size={16} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#ef4444' }}>Kritisch: {s.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>{project?.name} · {s.value}{s.unit} (Schwellwert: {s.threshold_low}{s.unit})</div>
                </div>
              </div>
            )
          })}
          {warningSensors.map(s => {
            const project = projects.find(p => p.id === s.project_id)
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F59E0B18', border: '1px solid #F59E0B40', borderRadius: 8, marginBottom: 8 }}>
                <AlertTriangle size={16} color="#F59E0B" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#F59E0B' }}>Warnung: {s.name}</div>
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
        <StatCard label="Meine Einsätze" value={myJobs.length} sub="7 Tage" color={myJobs.length > 0 ? '#22EAA7' : undefined} />
        <StatCard label="Sensoren" value={`${criticalSensors.length + warningSensors.length}`} sub={criticalSensors.length > 0 ? `${criticalSensors.length} kritisch` : 'alles ok'} color={criticalSensors.length > 0 ? '#ef4444' : warningSensors.length > 0 ? '#F59E0B' : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Upcoming jobs */}
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            Anstehende Einsätze
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upcoming.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Keine Einsätze geplant</div>
            )}
            {upcoming.map(job => {
              const type = JOB_TYPES.find(t => t.id === job.job_type)
              const project = projects.find(p => p.id === job.project_id)
              const assignees = TEAM.filter(t => job.assigned_users.includes(t.id))
              const isToday = job.date === today
              const isTomorrow = job.date === tomorrow
              return (
                <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, borderLeft: `3px solid ${type?.color || A}` }}>
                  <div style={{ minWidth: 60, textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>
                      {isToday ? 'Heute' : isTomorrow ? 'Morgen' : formatDate(job.date)}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FG, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color }}>{project?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {assignees.map(u => (
                      <div key={u.id} style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '3px 8px', borderRadius: 4, background: `${STATUS_COLORS[job.status]}18`, border: `1px solid ${STATUS_COLORS[job.status]}40`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: STATUS_COLORS[job.status] }}>
                    {STATUS_LABELS[job.status]}
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
                <div key={r.id} style={{ padding: '12px 14px', background: SURFACE, border: `1px solid ${overdue ? '#ef444440' : BORDER}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: FG }}>{r.title}</div>
                    <Repeat size={12} color={type?.color || A} style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color, marginBottom: 4 }}>{project?.name}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: overdue ? '#ef4444' : MUTED }}>
                    {overdue ? `${Math.abs(daysUntil)} Tage überfällig` : daysUntil === 0 ? 'Heute fällig' : `in ${daysUntil} Tagen · alle ${r.interval_days}d`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
