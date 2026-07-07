import { useState } from 'react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { A, SURFACE, BORDER, FG, MUTED, BG, A06, A14 } from '../lib/theme.js'
import { TEAM, TASK_STATUSES, TASK_PRIORITIES, TASK_EFFORTS, TASK_TYPES } from '../data/seed.js'
import { isoToday, formatDate } from '../lib/storage.js'
import TaskModal from '../components/TaskModal.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { Plus, Trash2, LayoutGrid, List as ListIcon, User, CalendarClock, Flag } from 'lucide-react'

const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]))
const S = byId(TASK_STATUSES)
const P = byId(TASK_PRIORITIES)
const E = byId(TASK_EFFORTS)
const T = byId(TASK_TYPES)
const PRIO_RANK = { extreme: 0, high: 1, medium: 2, low: 3 }

const BOARD_STATUSES = TASK_STATUSES.filter(s => s.id !== 'archive')

function sortTasks(list) {
  return [...list].sort((a, b) => {
    const pr = (PRIO_RANK[a.priority] ?? 9) - (PRIO_RANK[b.priority] ?? 9)
    if (pr !== 0) return pr
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })
}

export default function TasksPage() {
  const { tasks, projects, clients, createTask, updateTask, deleteTask, setTaskStatus } = useOps()
  const { user } = useAuth()
  const bp = useBreakpoint()
  const isMobile = bp === 'xs' || bp === 'sm'

  const [view, setView]     = useState('board')  // board | list | mine
  const [modal, setModal]   = useState(null)     // { task } | { defaults }
  const [fClient, setFClient]     = useState('all')
  const [fProject, setFProject]   = useState('all')
  const [fAssignee, setFAssignee] = useState('all')
  const [showArchive, setShowArchive] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const today = isoToday()

  const filtered = tasks.filter(t =>
    (fClient === 'all'   || t.client_id === fClient) &&
    (fProject === 'all'  || t.project_id === fProject) &&
    (fAssignee === 'all' || (t.assigned_users || []).includes(fAssignee)) &&
    (view !== 'mine'     || (t.assigned_users || []).includes(user?.id)) &&
    (showArchive || t.status !== 'archive')
  )

  const openTotal = tasks.filter(t => t.status !== 'done' && t.status !== 'archive').length

  function handleSave(data) {
    if (modal?.task) updateTask(modal.task.id, data)
    else createTask(data)
    setModal(null)
  }

  const SELECT_STYLE = {
    background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6,
    padding: '7px 10px', color: FG, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
    outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ padding: isMobile ? '16px 12px' : 24, maxWidth: view === 'board' ? 1400 : 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em' }}>Aufgaben</h1>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, marginTop: 2 }}>{openTotal} offen · {tasks.length} gesamt</div>
        </div>
        <button onClick={() => setModal({ defaults: {} })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '9px 14px' : '8px 16px', borderRadius: 7, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} />{isMobile ? ' Neu' : ' Neue Aufgabe'}
        </button>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 2, background: SURFACE, borderRadius: 8, padding: 4, border: `1px solid ${BORDER}`, marginBottom: 14, width: 'fit-content' }}>
        {[['board', 'Board', LayoutGrid], ['list', 'Liste', ListIcon], ['mine', 'Meine', User]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setView(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: 'none', background: view === id ? A : 'transparent', color: view === id ? '#001219' : MUTED, cursor: 'pointer', fontSize: 13, fontWeight: view === id ? 500 : 400, fontFamily: "'Space Grotesk', sans-serif" }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={SELECT_STYLE} value={fClient} onChange={e => setFClient(e.target.value)}>
          <option value="all">Alle Kunden</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={SELECT_STYLE} value={fProject} onChange={e => setFProject(e.target.value)}>
          <option value="all">Alle Projekte</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={SELECT_STYLE} value={fAssignee} onChange={e => setFAssignee(e.target.value)}>
          <option value="all">Alle Zuständigen</option>
          {TEAM.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showArchive} onChange={e => setShowArchive(e.target.checked)} style={{ accentColor: A, cursor: 'pointer' }} />
          Archiv
        </label>
        {(fClient !== 'all' || fProject !== 'all' || fAssignee !== 'all') && (
          <button onClick={() => { setFClient('all'); setFProject('all'); setFAssignee('all') }}
            style={{ background: 'transparent', border: 'none', color: A, cursor: 'pointer', fontSize: 12 }}>× Filter zurücksetzen</button>
        )}
      </div>

      {/* ── BOARD VIEW ── */}
      {view === 'board' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
          {(showArchive ? TASK_STATUSES : BOARD_STATUSES).map(col => {
            const colTasks = sortTasks(filtered.filter(t => t.status === col.id))
            const isOver = dragOver === col.id
            return (
              <div key={col.id}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                onDragLeave={() => setDragOver(o => o === col.id ? null : o)}
                onDrop={e => { e.preventDefault(); if (dragId) setTaskStatus(dragId, col.id); setDragId(null); setDragOver(null) }}
                style={{ flex: '0 0 auto', width: isMobile ? 260 : 288, background: isOver ? A06 : 'transparent', border: `1px solid ${isOver ? A + '60' : 'transparent'}`, borderRadius: 10, padding: 4, transition: 'background 0.15s, border-color 0.15s' }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 10px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>{col.label}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, marginLeft: 'auto' }}>{colTasks.length}</span>
                  <button onClick={() => setModal({ defaults: { status: col.id } })} title="Aufgabe hinzufügen"
                    style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 2, display: 'flex' }}>
                    <Plus size={14} />
                  </button>
                </div>
                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                  {colTasks.map(t => (
                    <TaskCard key={t.id} task={t} projects={projects} clients={clients} today={today}
                      onOpen={() => setModal({ task: t })}
                      onDelete={() => deleteTask(t.id)}
                      onCycle={() => cycleStatus(t, setTaskStatus)}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => { setDragId(null); setDragOver(null) }} />
                  ))}
                  {colTasks.length === 0 && (
                    <div style={{ padding: '14px 8px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 10, opacity: 0.6 }}>–</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LIST / MINE VIEW ── */}
      {(view === 'list' || view === 'mine') && (
        <TaskTable tasks={sortTasks(filtered)} projects={projects} clients={clients} today={today} isMobile={isMobile}
          onOpen={t => setModal({ task: t })} onDelete={deleteTask} onCycle={t => cycleStatus(t, setTaskStatus)} />
      )}

      {modal && (
        <TaskModal
          initialTask={modal.task}
          defaults={modal.defaults}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// Klick auf Status-Pill → nächster Status (schneller Wechsel ohne Drag)
function cycleStatus(task, setTaskStatus) {
  const order = TASK_STATUSES.map(s => s.id)
  const idx = order.indexOf(task.status)
  setTaskStatus(task.id, order[(idx + 1) % order.length])
}

function DueBadge({ due, done, today }) {
  if (!due) return null
  const overdue = !done && due < today
  const isToday = due === today
  const color = overdue ? '#ef4444' : isToday ? A : MUTED
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 10, color, fontWeight: overdue || isToday ? 700 : 400 }}>
      <CalendarClock size={10} />
      {isToday ? 'Heute' : formatDate(due)}{overdue ? ' · überfällig' : ''}
    </span>
  )
}

function Assignees({ ids, size = 22 }) {
  const people = (ids || []).map(id => TEAM.find(t => t.id === id)).filter(Boolean)
  if (people.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
      {people.slice(0, 4).map(u => (
        <div key={u.id} title={u.name} style={{ width: size, height: size, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: size <= 20 ? 7 : 8, color: '#001219', fontWeight: 700 }}>{u.initials}</span>
        </div>
      ))}
      {people.length > 4 && <div style={{ width: size, height: size, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: MUTED }}>+{people.length - 4}</div>}
    </div>
  )
}

/* ─── BOARD CARD ───────────────────────────────────────────────────────────── */
function TaskCard({ task, projects, clients, today, onOpen, onDelete, onCycle, ...drag }) {
  const prio = P[task.priority]
  const client = clients.find(c => c.id === task.client_id)
  const project = projects.find(p => p.id === task.project_id)
  const type = task.task_type ? T[task.task_type] : null
  const eff = task.effort ? E[task.effort] : null
  const done = task.status === 'done' || task.status === 'archive'

  return (
    <div {...drag} onClick={onOpen}
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', position: 'relative' }}
      onMouseEnter={e => { const d = e.currentTarget.querySelector('.card-del'); if (d) d.style.opacity = 1 }}
      onMouseLeave={e => { const d = e.currentTarget.querySelector('.card-del'); if (d) d.style.opacity = 0 }}>

      <button className="card-del" onClick={e => { e.stopPropagation(); onDelete() }}
        style={{ position: 'absolute', top: 6, right: 6, opacity: 0, transition: 'opacity 0.15s', background: BG, border: `1px solid ${BORDER}`, borderRadius: 5, width: 24, height: 24, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={12} />
      </button>

      <div style={{ fontSize: 13, fontWeight: 500, color: done ? MUTED : FG, textDecoration: task.status === 'archive' ? 'line-through' : 'none', lineHeight: 1.35, paddingRight: 20, marginBottom: 8 }}>
        {task.title}
      </div>

      {/* chips: client / project / type */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: task.assigned_users?.length || task.due_date || eff ? 8 : 0 }}>
        {client && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: client.color || A, background: `${client.color || A}18`, border: `1px solid ${(client.color || A)}30`, padding: '1px 6px', borderRadius: 4 }}>{client.name.split(' ')[0]}</span>}
        {project && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, background: A06, padding: '1px 6px', borderRadius: 4 }}>{project.name}</span>}
        {type && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: type.color, padding: '1px 4px' }}>{type.label}</span>}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={e => { e.stopPropagation(); onCycle() }} title="Status weiterschalten"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 10, background: `${S[task.status]?.color}18`, border: `1px solid ${S[task.status]?.color}40`, color: S[task.status]?.color, cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9 }}>
          {S[task.status]?.short}
        </button>
        <DueBadge due={task.due_date} done={done} today={today} />
        {eff && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: eff.color, marginLeft: 'auto' }}>{eff.label}</span>}
        <div style={{ marginLeft: eff ? 0 : 'auto' }}><Assignees ids={task.assigned_users} size={20} /></div>
      </div>
    </div>
  )
}

/* ─── TABLE / LIST ─────────────────────────────────────────────────────────── */
function TaskTable({ tasks, projects, clients, today, isMobile, onOpen, onDelete, onCycle }) {
  if (tasks.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Keine Aufgaben</div>
  }

  if (isMobile) {
    // Mobile: kompakte Karten (dieselbe Optik wie das Board)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} projects={projects} clients={clients} today={today}
            onOpen={() => onOpen(t)} onDelete={() => onDelete(t.id)} onCycle={() => onCycle(t)} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 0.9fr 1.1fr 0.8fr 40px', gap: 10, padding: '10px 14px', background: SURFACE, borderBottom: `1px solid ${BORDER}`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span>Aufgabe</span><span>Kunde / Projekt</span><span>Status</span><span>Prio</span><span>Fällig</span><span>Zuständig</span><span />
      </div>
      {tasks.map(t => {
        const prio = P[t.priority]
        const client = clients.find(c => c.id === t.client_id)
        const project = projects.find(p => p.id === t.project_id)
        const done = t.status === 'done' || t.status === 'archive'
        return (
          <div key={t.id} onClick={() => onOpen(t)}
            style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 0.9fr 1.1fr 0.8fr 40px', gap: 10, padding: '11px 14px', borderBottom: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, cursor: 'pointer', alignItems: 'center', background: BG }}
            onMouseEnter={e => e.currentTarget.style.background = A06}
            onMouseLeave={e => e.currentTarget.style.background = BG}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: done ? MUTED : FG, textDecoration: t.status === 'archive' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              {t.task_type && T[t.task_type] && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: T[t.task_type].color, marginTop: 2 }}>{T[t.task_type].label}</div>}
            </div>
            <div style={{ minWidth: 0, fontSize: 11 }}>
              {client && <div style={{ color: client.color || A, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>}
              {project && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>}
            </div>
            <div>
              <button onClick={e => { e.stopPropagation(); onCycle(t) }} title="Status weiterschalten"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 10, background: `${S[t.status]?.color}18`, border: `1px solid ${S[t.status]?.color}40`, color: S[t.status]?.color, cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9 }}>
                {S[t.status]?.label}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: prio?.color }}>
              <Flag size={10} /> {prio?.label}
            </div>
            <div><DueBadge due={t.due_date} done={done} today={today} /></div>
            <div><Assignees ids={t.assigned_users} size={22} /></div>
            <button onClick={e => { e.stopPropagation(); onDelete(t.id) }}
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 5, width: 26, height: 26, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
