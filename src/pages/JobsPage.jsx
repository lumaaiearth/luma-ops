import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, OK, DANGER, INFO } from '../lib/theme.js'
import { PageHeader, Button, Tabs, Chips, EmptyState, Badge } from '../components/ui.jsx'
import { JOB_TYPES, VEHICLES } from '../data/seed.js'
import { peopleForIds } from '../lib/people.js'
import { formatDate, isoToday } from '../lib/storage.js'
import JobModal from '../components/JobModal.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { Plus, Repeat, Trash2, CheckCircle2, Circle, Pencil, ChevronRight, Archive, RotateCcw } from 'lucide-react'

const STATUS_COLORS  = { planned: INFO, in_progress: A, done: OK, cancelled: '#6B7280', archived: '#6B7280' }
const STATUS_LABELS  = { planned: 'Geplant', in_progress: 'Läuft', done: 'Erledigt', cancelled: 'Abgesagt', archived: 'Archiv' }
const DURATION_LABEL = { full: 'Ganztags', half_am: 'Vormittag', half_pm: 'Nachmittag' }

export default function JobsPage() {
  const { jobs, archivedJobs, recurring, projects, clients, createJob, updateJob, deleteJob, setJobStatus, archiveJob, restoreJob, createRecurring, deleteRecurring } = useOps()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modal, setModal]   = useState(null)
  const [editJob, setEditJob] = useState(null)
  const [tab, setTab]       = useState(() => searchParams.get('tab') === 'recurring' ? 'recurring' : 'jobs')
  const [filter, setFilter] = useState('all')

  // Deep-Link: /jobs?open=<id> öffnet den Einsatz direkt
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || jobs.length === 0) return
    const job = [...jobs, ...archivedJobs].find(j => j.id === openId)
    if (job) { setEditJob(job); setModal({ job }) }
    searchParams.delete('open')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, jobs.length])
  const today = isoToday()
  const bp = useBreakpoint()
  const isMobile = bp === 'xs' || bp === 'sm'
  const isTablet = bp === 'md'

  function handleSave(result) {
    if (result.type === 'job') {
      if (editJob) updateJob(editJob.id, result.data)
      else createJob(result.data)
    } else {
      createRecurring(result.data)
    }
    setModal(null)
    setEditJob(null)
  }

  // Archivierte Einsätze erscheinen nur im Archiv-Filter, sonst nirgends
  const filteredJobs = (filter === 'archived' ? archivedJobs : jobs)
    .filter(j => filter === 'all' || filter === 'archived' || j.status === filter)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 24, maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Header ── */}
      <PageHeader
        title="Einsatzübersicht"
        isMobile={isMobile}
        actions={
          <Button icon={Plus} onClick={() => { setEditJob(null); setModal({ date: today }) }}>
            {isMobile ? 'Neu' : 'Neuer Einsatz'}
          </Button>
        }
      />

      {/* ── Tabs ── */}
      <Tabs
        tabs={[['jobs', `Einsätze (${jobs.length})`], ['recurring', `Wiederkehrend (${recurring.length})`]]}
        active={tab}
        onChange={setTab}
        isMobile={isMobile}
      />

      {/* ── Jobs List ── */}
      {tab === 'jobs' && (
        <>
          {/* Filter chips */}
          <Chips
            options={[
              ['all', 'Alle'],
              ['planned', 'Geplant'],
              ['in_progress', 'Läuft'],
              ['done', 'Erledigt'],
              ['cancelled', 'Abgesagt'],
              ['archived', 'Archiv'],
            ]}
            value={filter}
            onChange={setFilter}
            colors={STATUS_COLORS}
            style={{ marginBottom: 14, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: 2 }}
          />

          {/* Job rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredJobs.length === 0 && (
              <EmptyState title="Keine Einsätze" hint={filter !== 'all' ? 'Für diesen Filter gibt es keine Einträge.' : 'Lege mit „Neuer Einsatz“ den ersten an.'} />
            )}
            {filteredJobs.map(job => (
              <JobRow
                key={job.id}
                job={job}
                projects={projects}
                today={today}
                isMobile={isMobile}
                onToggleStatus={() => setJobStatus(job.id,
                  job.status === 'done' ? 'planned' :
                  job.status === 'planned' ? 'in_progress' : 'done')}
                onEdit={() => { setEditJob(job); setModal({ job }) }}
                onDelete={() => deleteJob(job.id)}
                onArchive={() => archiveJob(job.id)}
                onRestore={() => restoreJob(job.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Recurring ── */}
      {tab === 'recurring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recurring.length === 0 && (
            <EmptyState title="Keine Vorlagen" hint="Wiederkehrende Einsätze erstellst du über „Neuer Einsatz“." />
          )}
          {recurring.map(r => {
            const type      = JOB_TYPES.find(t => t.id === r.job_type)
            const project   = projects.find(p => p.id === r.project_id)
            const assignees = peopleForIds(r.assigned_users)
            const daysUntil = Math.ceil((new Date(r.next_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
            return (
              <div key={r.id} style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, borderLeft: `3px solid ${type?.color || A}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Repeat size={13} color={type?.color || A} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: FG }}>{r.title}</span>
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color, marginBottom: 3 }}>
                      {project?.name} · alle {r.interval_days} Tage
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: daysUntil < 0 ? DANGER : daysUntil === 0 ? A : MUTED }}>
                      Nächster: {formatDate(r.next_date)}&nbsp;
                      {daysUntil < 0 ? `(${Math.abs(daysUntil)}d überfällig)` : daysUntil === 0 ? '(heute)' : `(in ${daysUntil}d)`}
                    </div>
                  </div>
                  <button onClick={() => deleteRecurring(r.id)} className="lu-btn-danger" style={{ width: 32, height: 32, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {assignees.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: `${u.color}18`, border: `1px solid ${u.color}30` }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
                      </div>
                      <span style={{ fontSize: 11, color: u.color }}>{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <JobModal
          initialDate={modal.date}
          initialJob={editJob}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditJob(null) }}
        />
      )}
    </div>
  )
}

/* ─── JOB ROW ───────────────────────────────────────────────────────────── */
function JobRow({ job, projects, today, isMobile, onToggleStatus, onEdit, onDelete, onArchive, onRestore }) {
  const type      = JOB_TYPES.find(t => t.id === job.job_type)
  const project   = projects.find(p => p.id === job.project_id)
  const assignees = peopleForIds(job.assigned_users)
  const vehicle   = VEHICLES.find(v => v.id === job.vehicle_id)
  const isToday   = job.date === today
  const isArchived = job.status === 'archived'
  const isDone    = job.status === 'done' || isArchived

  // Fertiggestellt → per Bestätigung ins Archiv; archiviert → wiederherstellen
  const confirmBtn = job.status === 'done' ? (
    <button onClick={e => { e.stopPropagation(); onArchive() }} title="Einsatz bestätigen → Archiv" className="lu-btn-ghost"
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: `color-mix(in srgb, ${OK} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${OK} 30%, transparent)`, color: OK, cursor: 'pointer', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <Archive size={12} /> Bestätigen
    </button>
  ) : isArchived ? (
    <button onClick={e => { e.stopPropagation(); onRestore() }} title="Aus dem Archiv zurückholen" className="lu-btn-ghost"
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <RotateCcw size={12} /> Zurückholen
    </button>
  ) : null

  if (isMobile) {
    // ── MOBILE LAYOUT: 2-row card ──────────────────────────────────────────
    return (
      <div className="lu-card" style={{
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14,
        borderLeft: `3px solid ${type?.color || A}`,
        overflow: 'hidden',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px 6px' }}>
          {/* Status toggle */}
          <button
            onClick={e => { e.stopPropagation(); onToggleStatus() }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: STATUS_COLORS[job.status], flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center' }}>
            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: isDone ? MUTED : FG,
              textDecoration: isDone ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.title}
            </div>
          </div>

          {/* Edit tap target */}
          <button onClick={onEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Bottom meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 11px 42px', flexWrap: 'wrap' }}>
          {/* Date */}
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400, flexShrink: 0 }}>
            {isToday ? '● Heute' : formatDate(job.date)}
          </span>

          {project && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color, flexShrink: 0 }}>
              {project.name}
            </span>
          )}

          {/* Status badge */}
          <Badge color={STATUS_COLORS[job.status]}>{STATUS_LABELS[job.status]}</Badge>

          {confirmBtn}

          {/* Assignee avatars */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {assignees.slice(0, 4).map(u => (
              <div key={u.id} title={u.name} style={{ width: 20, height: 20, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${SURFACE}` }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
              </div>
            ))}
            {assignees.length > 4 && (
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, color: MUTED }}>+{assignees.length - 4}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── DESKTOP LAYOUT: horizontal row ───────────────────────────────────────
  return (
    <div className="lu-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, borderLeft: `3px solid ${type?.color || A}` }}>

      {/* Status toggle */}
      <button onClick={onToggleStatus}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: STATUS_COLORS[job.status], flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      {/* Date */}
      <div style={{ minWidth: 72, fontFamily: "'Space Mono', monospace", fontSize: 11, color: isToday ? A : MUTED, fontWeight: isToday ? 700 : 400 }}>
        {isToday ? 'Heute' : formatDate(job.date)}
      </div>

      {/* Time */}
      {job.start_time && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, minWidth: 80, flexShrink: 0 }}>
          {job.start_time}{job.end_time ? `–${job.end_time}` : ''}
        </div>
      )}

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: isDone ? MUTED : FG, textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {job.title}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {project && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: type?.color }}>{project.name}</span>}
          {vehicle  && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>· {vehicle.name}</span>}
          {job.duration && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>· {DURATION_LABEL[job.duration]}</span>}
          {job.location && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>· 📍 {job.location.split(',')[0]}</span>}
        </div>
      </div>

      {/* Assignees */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {assignees.slice(0, 5).map(u => (
          <div key={u.id} title={u.name} style={{ width: 24, height: 24, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
          </div>
        ))}
        {assignees.length > 5 && (
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: MUTED }}>+{assignees.length - 5}</span>
          </div>
        )}
      </div>

      {/* Status badge */}
      <Badge color={STATUS_COLORS[job.status]}>{STATUS_LABELS[job.status]}</Badge>

      {confirmBtn}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} title="Bearbeiten" className="lu-btn-ghost" style={{ width: 28, height: 28, borderRadius: 5, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pencil size={12} />
        </button>
        <button onClick={onDelete} title="Löschen" className="lu-btn-danger" style={{ width: 28, height: 28, borderRadius: 5, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
