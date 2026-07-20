// Mitarbeiter-Detailseite (/team/:id): Kontakt, Verfügbarkeit + Abwesenheiten,
// kommende & vergangene Einsätze, Stunden/Kontostand (hourAccounts), Top-Projekte.
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Plus, X, CalendarDays, Clock } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useTime } from '../context/TimeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { TEAM } from '../data/seed.js'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, A08, A14 } from '../lib/theme.js'
import { Avatar, Badge, Card, EmptyState, INPUT_STYLE, LABEL_STYLE, MONO, SANS, SectionLabel } from '../components/ui.jsx'
import { AvailabilityEditor } from './TeamPage.jsx'
import { normalizeRule, hasKonto, kontostand, kontoMonthData } from '../lib/hourAccounts.js'
import { isoToday, addDays, formatDate, genId, weekStart, getWeekDays } from '../lib/storage.js'
import { useIsMobile } from '../lib/useBreakpoint.js'

const ROLE_LABELS = { admin: 'Geschäftsführung', manager: 'Management', field: 'Mitarbeiter' }
const MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export default function TeamMemberPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { jobs, projects } = useOps()
  const { entries, hourRules } = useTime()
  const { profileForTeamId, isMitarbeiter } = useAuth()
  const isMobile = useIsMobile(700)
  const today = isoToday()

  const u = TEAM.find(t => t.id === id)
  const prof = u ? profileForTeamId(u.id) : null

  const [availability, setAvailability] = useState({})
  const [absences, setAbsences] = useState([])
  const [absForm, setAbsForm] = useState(null) // { date_from, date_to, reason } | null

  useEffect(() => {
    if (!u) return
    sb.from('user_availability').select('*').eq('team_id', u.id).then(({ data }) =>
      setAvailability(Object.fromEntries((data || []).map(r => [r.team_id, r]))))
    sb.from('user_absences').select('*').eq('team_id', u.id).order('date_from', { ascending: false }).then(({ data }) =>
      setAbsences(data || []))
  }, [id])

  const myJobs = useMemo(() =>
    jobs.filter(j => (j.assigned_users || []).includes(id) && j.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [jobs, id])

  if (!u) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState title="Person nicht gefunden" action={<Link to="/team" style={{ color: A }}>Zurück zum Team</Link>} />
      </div>
    )
  }

  const upcoming = myJobs.filter(j => (j.date_end || j.date) >= today)
  const past = myJobs.filter(j => (j.date_end || j.date) < today).reverse().slice(0, 15)

  // Stunden & Kontostand (Logik aus lib/hourAccounts — nicht duplizieren)
  const rule = normalizeRule(hourRules?.[id], id)
  const konto = hasKonto(rule) ? kontostand(rule, entries, id) : null
  const monthData = hasKonto(rule) ? kontoMonthData(rule, entries, id) : null
  const year = new Date().getFullYear()
  const nowMonth = new Date().getMonth() + 1
  const yearH = Math.round(entries.filter(e => e.user_id === id && e.date?.startsWith(String(year)))
    .reduce((s, e) => s + Number(e.hours), 0) * 10) / 10
  const weekDays = getWeekDays(weekStart(today))
  const weekH = Math.round(entries.filter(e => e.user_id === id && weekDays.includes(e.date))
    .reduce((s, e) => s + Number(e.hours), 0) * 10) / 10
  const monthPrefix = `${year}-${String(nowMonth).padStart(2, '0')}`
  const monthH = Math.round(entries.filter(e => e.user_id === id && e.date?.startsWith(monthPrefix))
    .reduce((s, e) => s + Number(e.hours), 0) * 10) / 10
  const kColor = konto === null ? MUTED : konto > 0 ? OK : konto < 0 ? WARN : MUTED

  // Top-Projekte (dieses Jahr)
  const topProjects = projects
    .map(p => ({
      ...p,
      h: Math.round(entries.filter(e => e.user_id === id && e.project_id === p.id && e.date?.startsWith(String(year)))
        .reduce((s, e) => s + Number(e.hours), 0) * 10) / 10,
    }))
    .filter(p => p.h > 0)
    .sort((a, b) => b.h - a.h)
    .slice(0, 6)
  const maxPH = Math.max(...topProjects.map(p => p.h), 1)

  function saveAvailability(teamId, changes) {
    setAvailability(prev => ({ ...prev, [teamId]: { ...(prev[teamId] || { team_id: teamId }), ...changes } }))
    sb.from('user_availability')
      .upsert({ team_id: teamId, ...changes, updated_at: new Date().toISOString() }, { onConflict: 'team_id' })
      .then(({ error }) => { if (error) console.error('[DB] user_availability', error.message) })
  }

  function addAbsence(e) {
    e.preventDefault()
    const row = { id: genId(), team_id: id, ...absForm, created_at: new Date().toISOString() }
    setAbsences(prev => [row, ...prev])
    sb.from('user_absences').insert(row).then(({ error }) => { if (error) console.error(error) })
    setAbsForm(null)
  }

  function removeAbsence(aid) {
    setAbsences(prev => prev.filter(a => a.id !== aid))
    sb.from('user_absences').delete().eq('id', aid).then(({ error }) => { if (error) console.error(error) })
  }

  function JobRow({ job, dim = false }) {
    const p = projects.find(pr => pr.id === job.project_id)
    return (
      <div onClick={() => navigate(`/einsaetze?view=liste&open=${job.id}`)} className="lu-card lu-clickable"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer', opacity: dim ? 0.75 : 1 }}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: job.color || A, flexShrink: 0 }} />
        <div style={{ minWidth: 76, fontFamily: MONO, fontSize: 10, color: job.date === today ? A : MUTED, fontWeight: job.date === today ? 700 : 400 }}>
          {job.date === today ? '● Heute' : formatDate(job.date)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: FG, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[p?.name, job.start_time ? `${job.start_time}${job.end_time ? `–${job.end_time}` : ''}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Kopf */}
      <button onClick={() => navigate('/team')} className="lu-btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: SANS, marginBottom: 16 }}>
        <ArrowLeft size={13} /> Team
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <Avatar initials={u.initials} color={u.color} size={64} src={prof?.avatar_url || null} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 500, color: FG, letterSpacing: '-0.02em', margin: 0 }}>{prof?.name || u.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <Badge color={u.color}>{ROLE_LABELS[u.role] || u.role}</Badge>
            {prof?.phone && (
              <a href={`tel:${prof.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: FG, textDecoration: 'none' }}>
                <Phone size={11} color={u.color} /> {prof.phone}
              </a>
            )}
            {prof?.contact_email && (
              <a href={`mailto:${prof.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: FG, textDecoration: 'none' }}>
                <Mail size={11} color={u.color} /> {prof.contact_email}
              </a>
            )}
          </div>
          {prof?.bio && <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>{prof.bio}</div>}
        </div>
        {konto !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: kColor, lineHeight: 1 }}>{konto > 0 ? '+' : ''}{konto}h</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 3 }}>Stundenkonto {year}</div>
          </div>
        )}
      </div>

      {/* KPI-Zeile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[[weekH, 'Diese Woche'], [monthH, 'Dieser Monat'], [yearH, `Jahr ${year}`]].map(([v, label]) => (
          <Card key={label} padding="14px 16px">
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: u.color, lineHeight: 1 }}>{v}h</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Verfügbarkeit + Abwesenheiten */}
        <Card padding="16px 18px">
          {isMitarbeiter ? (
            <AvailabilityEditor teamId={u.id} color={u.color} availability={availability} onChange={saveAvailability} />
          ) : (
            <SectionLabel style={{ marginBottom: 8 }}>Verfügbarkeit</SectionLabel>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 8px' }}>
            <SectionLabel>Abwesenheiten</SectionLabel>
            {isMitarbeiter && !absForm && (
              <button onClick={() => setAbsForm({ date_from: today, date_to: today, reason: '' })} className="lu-btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 11 }}>
                <Plus size={11} /> Eintragen
              </button>
            )}
          </div>
          {absForm && (
            <form onSubmit={addAbsence} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: A08, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={LABEL_STYLE}>Von *</label>
                  <input type="date" style={INPUT_STYLE} value={absForm.date_from} onChange={e => setAbsForm(f => ({ ...f, date_from: e.target.value }))} required />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Bis *</label>
                  <input type="date" style={INPUT_STYLE} value={absForm.date_to} onChange={e => setAbsForm(f => ({ ...f, date_to: e.target.value }))} required />
                </div>
              </div>
              <input style={INPUT_STYLE} value={absForm.reason} onChange={e => setAbsForm(f => ({ ...f, reason: e.target.value }))} placeholder="Grund (z.B. Urlaub)" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setAbsForm(null)} className="lu-btn-ghost" style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12 }}>Abbrechen</button>
                <button type="submit" className="lu-btn-primary" style={{ padding: '6px 14px', borderRadius: 6, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Speichern</button>
              </div>
            </form>
          )}
          {absences.length === 0 && !absForm && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>Keine Abwesenheiten eingetragen.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {absences.slice(0, 8).map(a => {
              const active = a.date_from <= today && today <= a.date_to
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MUTED }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: active ? WARN : MUTED, minWidth: 118 }}>
                    {formatDate(a.date_from)} – {formatDate(a.date_to)}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || '—'}</span>
                  {active && <Badge color={WARN}>jetzt</Badge>}
                  {isMitarbeiter && (
                    <button onClick={() => removeAbsence(a.id)} className="lu-btn-ghost" style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={9} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Top-Projekte */}
        <Card padding="16px 18px">
          <SectionLabel style={{ marginBottom: 10 }}>Top-Projekte {year}</SectionLabel>
          {topProjects.length === 0 && <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>Noch keine Stunden in {year}.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {topProjects.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Link to={`/projects/${p.id}`} style={{ fontSize: 12, color: FG, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.name}</Link>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: u.color, flexShrink: 0 }}>{p.h}h</span>
                </div>
                <div style={{ background: `color-mix(in srgb, ${FG} 6%, transparent)`, borderRadius: 2, height: 4 }}>
                  <div style={{ width: `${(p.h / maxPH) * 100}%`, height: '100%', background: u.color, borderRadius: 2, opacity: 0.75 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stundenkonto-Monatstabelle (30,88h-Regel etc. aus hourAccounts) */}
      {monthData && (
        <Card padding="16px 18px" style={{ marginBottom: 20 }}>
          <SectionLabel style={{ marginBottom: 4 }}>Stundenkonto {year} — Soll / Ist / Saldo</SectionLabel>
          {rule?.type === 'monthly' && (
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginBottom: 10 }}>
              Soll {rule.monthly}h je bezahltem Monat ({rule.paid_months.length} Monate)
              {rule.carryover ? ` · Übertrag ${year - 1}: −${rule.carryover}h` : ''}
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr>
                  <td />
                  {MONTHS.map((m, i) => (
                    <td key={m} style={{ fontFamily: MONO, fontSize: 9, color: i + 1 === nowMonth ? A : MUTED, fontWeight: i + 1 === nowMonth ? 700 : 400, textAlign: 'center', padding: '2px 5px 6px' }}>{m}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[['Soll', d => `${d.soll}h`, () => MUTED], ['Ist', d => d.ist !== null ? `${d.ist}h` : '—', () => FG], ['Konto', d => d.kum === null ? '—' : (d.kum > 0 ? `+${d.kum}` : `${d.kum}`), d => d.kum === null ? MUTED : d.kum > 0 ? OK : d.kum < 0 ? WARN : MUTED]].map(([label, fmt, colorFn]) => (
                  <tr key={label}>
                    <td style={{ fontFamily: MONO, fontSize: 9, color: MUTED, paddingRight: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</td>
                    {monthData.map((d, i) => (
                      <td key={i} style={{ fontFamily: MONO, fontSize: 10, textAlign: 'center', padding: '2px 5px', color: colorFn(d), background: i + 1 === nowMonth ? A14 : 'transparent' }}>
                        {fmt(d)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Einsätze */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Kommende Einsätze ({upcoming.length})</SectionLabel>
          {upcoming.length === 0 && <EmptyState icon={CalendarDays} title="Nichts geplant" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.slice(0, 15).map(j => <JobRow key={j.id} job={j} />)}
          </div>
        </div>
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>Vergangene Einsätze</SectionLabel>
          {past.length === 0 && <EmptyState icon={Clock} title="Noch keine Einsätze" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {past.map(j => <JobRow key={j.id} job={j} dim />)}
          </div>
        </div>
      </div>
    </div>
  )
}
