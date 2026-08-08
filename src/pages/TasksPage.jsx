import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useWeather } from '../context/WeatherContext.jsx'
import { getWeatherForDate, STATUS_COLOR } from '../lib/weather.js'
import { A, SURFACE, BORDER, FG, MUTED, BG, A06, OK, DANGER } from '../lib/theme.js'
import { Avatar, Button, EmptyState } from '../components/ui.jsx'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_EFFORTS, TASK_TYPES } from '../data/seed.js'
import { findPerson, peopleForIds, avatarFor } from '../lib/people.js'
import { isoToday, formatDate } from '../lib/storage.js'
import TaskModal from '../components/TaskModal.jsx'
import BoardModal from '../components/BoardModal.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { Plus, Trash2, LayoutGrid, List as ListIcon, ListChecks, Star, User, CalendarClock, MapPin, Settings2, Layers, CheckSquare, AlertTriangle, RotateCcw, Check, CalendarPlus, Sprout } from 'lucide-react'

// Aufgabentypen, die im Freien stattfinden → wetterabhängig
const OUTDOOR_TYPES = ['installation', 'pflege', 'giessen', 'maehen', 'beikraut', 'pflanzung', 'reinigung', 'monitoring']
function weatherWarnColor(task, forecast) {
  if (!task.due_date || !OUTDOOR_TYPES.includes(task.task_type)) return null
  const w = getWeatherForDate(forecast, task.due_date)
  if (w && (w.status === 'warn' || w.status === 'danger')) return STATUS_COLOR[w.status]
  return null
}

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

function zeitraum(t) {
  if (t.start_date && t.due_date) {
    if (t.start_date === t.due_date) return formatDate(t.due_date)
    return `${formatDate(t.start_date)} – ${formatDate(t.due_date)}`
  }
  if (t.due_date) return `fällig ${formatDate(t.due_date)}`
  if (t.start_date) return `ab ${formatDate(t.start_date)}`
  return null
}

export default function TasksPage() {
  const { tasks, deletedTasks, projects, clients, boards, people, createTask, updateTask, deleteTask, restoreTask, purgeTask, setTaskStatus, createBoard, updateBoard, deleteBoard } = useOps()
  const { user } = useAuth()
  const navigate = useNavigate()
  const weatherForecast = useWeather()
  const bp = useBreakpoint()
  const isMobile = bp === 'xs' || bp === 'sm'

  const [activeBoard, setActiveBoard] = useState('all')  // 'all' | 'mine' | boardId | 'none'
  const [view, setView]     = useState('board')
  const [modal, setModal]   = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep-Link: /tasks?open=<id> öffnet die Aufgabe direkt
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || tasks.length === 0) return
    const t = tasks.find(x => x.id === openId)
    if (t) setModal({ task: t })
    searchParams.delete('open')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, tasks.length])
  const [boardModal, setBoardModal] = useState(null)
  const [fClient, setFClient]     = useState('all')
  const [fProject, setFProject]   = useState('all')
  const [fAssignee, setFAssignee] = useState('all')
  const [showArchive, setShowArchive] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const today = isoToday()
  const sortedBoards = [...boards].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const isMine = t => t.owner_id === user?.id || (t.assigned_users || []).includes(user?.id)
  const isOpen = t => t.status !== 'done' && t.status !== 'archive'

  // Board-scope
  function inScope(t) {
    if (activeBoard === 'all') return true
    if (activeBoard === 'mine') return isMine(t)
    if (activeBoard === 'none') return !t.board_id
    return t.board_id === activeBoard
  }

  const scoped = tasks.filter(inScope)
  const filtered = scoped.filter(t =>
    (fClient === 'all'   || t.client_id === fClient) &&
    (fProject === 'all'  || t.project_id === fProject) &&
    (fAssignee === 'all' || t.owner_id === fAssignee || (t.assigned_users || []).includes(fAssignee)) &&
    (showArchive || t.status !== 'archive')
  )

  const currentBoard = boards.find(b => b.id === activeBoard)
  const hasOrphans = tasks.some(t => !t.board_id)

  function handleSave(data) {
    if (modal?.task) updateTask(modal.task.id, data)
    else createTask(data)
    setModal(null)
  }
  function newTaskDefaults(extra = {}) {
    const b = boards.find(x => x.id === activeBoard)
    return { defaults: { board_id: b?.id || '', client_id: b?.client_id || '', ...extra } }
  }
  function handleBoardSave(data) {
    if (boardModal?.board) updateBoard(boardModal.board.id, data)
    else { const b = createBoard(data); setActiveBoard(b.id) }
    setBoardModal(null)
  }

  const SELECT_STYLE = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 10px', color: FG, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', cursor: 'pointer' }

  // ── Board switcher entry ──
  function BoardChip({ id, label, emoji, color, count, onEdit }) {
    const active = activeBoard === id
    return (
      <button onClick={() => setActiveBoard(id)} className={active ? 'lu-nav active' : 'lu-nav'}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? 'auto' : '100%', flexShrink: 0, padding: '8px 10px', borderRadius: 8, border: `1px solid ${active ? `color-mix(in srgb, ${color || A} 44%, transparent)` : 'transparent'}`, background: active ? `color-mix(in srgb, ${color || A} 10%, transparent)` : 'transparent', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap', color: MUTED }}>
        <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{emoji}</span>
        <span style={{ fontSize: 13, color: active ? (color || A) : FG, fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{count}</span>
        {onEdit && active && !isMobile && (
          <span onClick={e => { e.stopPropagation(); onEdit() }} style={{ color: MUTED, display: 'flex', cursor: 'pointer' }}><Settings2 size={13} /></span>
        )}
      </button>
    )
  }

  const switcher = (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 3, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0 }}>
      {!isMobile && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px 6px' }}>Ansicht</div>}
      <BoardChip id="all"  label="Alle Aufgaben" emoji={<Layers size={14} style={{ verticalAlign: 'middle' }} />} color={A} count={tasks.filter(t => showArchive || t.status !== 'archive').length} />
      <BoardChip id="mine" label="Meine" emoji={<Star size={14} style={{ verticalAlign: 'middle' }} />} color={A} count={tasks.filter(t => isMine(t) && isOpen(t)).length} />
      {!isMobile && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 10px 6px' }}>Bereiche</div>}
      {sortedBoards.map(b => (
        <BoardChip key={b.id} id={b.id} label={b.name} emoji={b.emoji} color={b.color}
          count={tasks.filter(t => t.board_id === b.id && isOpen(t)).length}
          onEdit={() => setBoardModal({ board: b })} />
      ))}
      {hasOrphans && <BoardChip id="none" label="Ohne Bereich" emoji="•" color={MUTED} count={tasks.filter(t => !t.board_id && isOpen(t)).length} />}
      <button onClick={() => setBoardModal({})} className="lu-btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '8px 10px', borderRadius: 8, border: `1px dashed ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 12, marginTop: isMobile ? 0 : 4, whiteSpace: 'nowrap' }}>
        <Plus size={13} /> Bereich
      </button>
      {deletedTasks.length > 0 && (
        <BoardChip id="trash" label="Papierkorb" emoji={<Trash2 size={13} style={{ verticalAlign: 'middle' }} />} color={MUTED} count={deletedTasks.length} />
      )}
    </div>
  )

  const boardMembers = currentBoard ? peopleForIds(currentBoard.members) : []

  return (
    <div style={{ padding: isMobile ? '14px 12px' : 20, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 20, alignItems: 'flex-start' }}>

      {/* Board switcher */}
      {isMobile ? switcher : <div style={{ width: 210, flexShrink: 0, position: 'sticky', top: 0 }}>{switcher}</div>}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentBoard ? <span>{currentBoard.emoji} {currentBoard.name}</span>
                  : activeBoard === 'mine' ? 'Meine Aufgaben'
                  : activeBoard === 'none' ? 'Ohne Bereich'
                  : activeBoard === 'trash' ? 'Papierkorb'
                  : 'Offene Aufgaben'}
              </h1>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, marginTop: 2 }}>
                {activeBoard === 'trash' ? `${deletedTasks.length} gelöscht` : `${scoped.filter(isOpen).length} offen · ${scoped.length} gesamt`}
              </div>
            </div>
            {boardMembers.length > 0 && (
              <div style={{ display: 'flex', gap: -4 }}>
                {boardMembers.map((u, i) => (
                  <Avatar key={u.id} title={u.name} initials={u.initials} color={u.color} size={26} src={avatarFor(u.id)}
                    style={{ border: `2px solid ${BG}`, marginLeft: i === 0 ? 0 : -8 }} />
                ))}
              </div>
            )}
          </div>
          <Button icon={Plus} onClick={() => setModal(newTaskDefaults())}>
            {isMobile ? 'Neu' : 'Neue Aufgabe'}
          </Button>
        </div>

        {/* Bereichs-Kennzahlen */}
        {activeBoard !== 'trash' && (() => {
          const off = scoped.filter(isOpen).length
          const over = scoped.filter(t => isOpen(t) && t.due_date && t.due_date < today).length
          const done = scoped.filter(t => t.status === 'done').length
          const kpis = [
            ['Offen', off, off > 0 ? A : MUTED],
            ['Überfällig', over, over > 0 ? DANGER : MUTED],
            ['Erledigt', done, OK],
          ]
          return (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {kpis.map(([label, val, color]) => (
                <div key={label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '8px 16px', minWidth: 92 }}>
                  <div style={{ fontSize: 22, fontWeight: 300, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{val}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* View tabs + filters */}
        {activeBoard !== 'trash' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: SURFACE, borderRadius: 14, padding: 4, border: `1px solid ${BORDER}` }}>
            {[['board', 'Board', LayoutGrid], ['todo', 'ToDo', ListChecks], ['list', 'Liste', ListIcon]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setView(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: view === id ? A : 'transparent', color: view === id ? 'var(--luma-on-a)' : MUTED, cursor: 'pointer', fontSize: 13, fontWeight: view === id ? 500 : 400, fontFamily: "'Space Grotesk', sans-serif" }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <select style={SELECT_STYLE} value={fClient} onChange={e => setFClient(e.target.value)}>
            <option value="all">Alle Kunden</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={SELECT_STYLE} value={fProject} onChange={e => setFProject(e.target.value)}>
            <option value="all">Alle Projekte</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={SELECT_STYLE} value={fAssignee} onChange={e => setFAssignee(e.target.value)}>
            <option value="all">Alle Personen</option>
            {people.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showArchive} onChange={e => setShowArchive(e.target.checked)} style={{ accentColor: A, cursor: 'pointer' }} /> Archiv
          </label>
        </div>
        )}

        {/* BOARD VIEW — Spalten füllen die Breite; passt es nicht, scrollt das
            Board horizontal. Die Karten scrollen je Spalte vertikal, damit die
            horizontale Scrollleiste immer sichtbar bleibt (vorher wurde das
            Board rechts „abgeschnitten", weil die Leiste unter allen Karten lag). */}
        {activeBoard !== 'trash' && view === 'board' && (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'stretch', minHeight: isMobile ? undefined : 'calc(100vh - 320px)', scrollbarWidth: 'thin' }}>
            {(showArchive ? TASK_STATUSES : BOARD_STATUSES).map(col => {
              const colTasks = sortTasks(filtered.filter(t => t.status === col.id))
              const isOver = dragOver === col.id
              return (
                <div key={col.id}
                  onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                  onDragLeave={() => setDragOver(o => o === col.id ? null : o)}
                  onDrop={e => { e.preventDefault(); if (dragId) setTaskStatus(dragId, col.id); setDragId(null); setDragOver(null) }}
                  style={{ flex: isMobile ? '0 0 auto' : '1 0 250px', width: isMobile ? 262 : undefined, minWidth: isMobile ? undefined : 250, maxWidth: isMobile ? undefined : 360, display: 'flex', flexDirection: 'column', background: isOver ? A06 : 'transparent', border: `1px solid ${isOver ? `color-mix(in srgb, ${A} 38%, transparent)` : 'transparent'}`, borderRadius: 10, padding: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 10px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>{col.label}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, marginLeft: 'auto' }}>{colTasks.length}</span>
                    <button onClick={() => setModal(newTaskDefaults({ status: col.id }))} title="Aufgabe hinzufügen"
                      style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 2, display: 'flex' }}><Plus size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40, flex: 1, maxHeight: isMobile ? undefined : 'calc(100vh - 340px)', overflowY: colTasks.length > 0 ? 'auto' : 'visible', paddingRight: 2 }}>
                    {colTasks.map(t => (
                      <TaskCard key={t.id} task={t} projects={projects} clients={clients} boards={boards} today={today} navigate={navigate} weatherForecast={weatherForecast}
                        showBoard={activeBoard === 'all' || activeBoard === 'mine' || activeBoard === 'none'}
                        onOpen={() => setModal({ task: t })} onDelete={() => deleteTask(t.id)}
                        onCycle={() => cycleStatus(t, setTaskStatus)}
                        draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setDragOver(null) }} />
                    ))}
                    {colTasks.length === 0 && <div style={{ padding: '14px 8px', textAlign: 'center', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 10, opacity: 0.6 }}>–</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TODO VIEW — kompakte Checkliste, gruppiert nach Fälligkeit */}
        {activeBoard !== 'trash' && view === 'todo' && (
          <TodoList tasks={filtered} boards={boards} today={today} isMobile={isMobile}
            showBoard={activeBoard === 'all' || activeBoard === 'mine' || activeBoard === 'none'}
            onOpen={t => setModal({ task: t })}
            onToggle={t => setTaskStatus(t.id, (t.status === 'done' || t.status === 'archive') ? 'not_started' : 'done')} />
        )}

        {/* LIST VIEW */}
        {activeBoard !== 'trash' && view === 'list' && (
          <TaskTable tasks={sortTasks(filtered)} projects={projects} clients={clients} boards={boards} today={today} isMobile={isMobile} navigate={navigate} weatherForecast={weatherForecast}
            showBoard={activeBoard === 'all' || activeBoard === 'mine' || activeBoard === 'none'}
            onOpen={t => setModal({ task: t })} onDelete={deleteTask} onCycle={t => cycleStatus(t, setTaskStatus)} />
        )}

        {/* PAPIERKORB */}
        {activeBoard === 'trash' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, marginBottom: 4 }}>
              Gelöschte Aufgaben — wiederherstellen oder endgültig entfernen.
            </div>
            {deletedTasks.length === 0 && (
              <EmptyState icon={Trash2} title="Papierkorb ist leer" />
            )}
            {[...deletedTasks].sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || '')).map(t => {
              const prio = P[t.priority]
              const project = projects.find(p => p.id === t.project_id)
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, borderRadius: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, marginTop: 2 }}>
                      {project ? project.name + ' · ' : ''}gelöscht {t.deleted_at ? formatDate(t.deleted_at.slice(0, 10)) : ''}
                    </div>
                  </div>
                  <button onClick={() => restoreTask(t.id)} title="Wiederherstellen" className="lu-btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, background: A06, border: `1px solid color-mix(in srgb, ${A} 25%, transparent)`, color: A, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                    <RotateCcw size={12} /> Wiederherstellen
                  </button>
                  <button onClick={() => { if (confirm(`„${t.title}" endgültig löschen?`)) purgeTask(t.id) }} title="Endgültig löschen" className="lu-btn-danger"
                    style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: `1px solid color-mix(in srgb, ${DANGER} 25%, transparent)`, cursor: 'pointer', color: DANGER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && <TaskModal initialTask={modal.task} defaults={modal.defaults} onSave={handleSave} onClose={() => setModal(null)} />}
      {boardModal && (
        <BoardModal initialBoard={boardModal.board} onSave={handleBoardSave} onClose={() => setBoardModal(null)}
          onDelete={boardModal.board ? () => { if (confirm(`Bereich „${boardModal.board.name}" löschen? Aufgaben bleiben erhalten.`)) { deleteBoard(boardModal.board.id); if (activeBoard === boardModal.board.id) setActiveBoard('all'); setBoardModal(null) } } : undefined} />
      )}
    </div>
  )
}

function cycleStatus(task, setTaskStatus) {
  const order = TASK_STATUSES.map(s => s.id)
  const idx = order.indexOf(task.status)
  setTaskStatus(task.id, order[(idx + 1) % order.length])
}

/* ─── People row: owner (ringed) + collaborators ───────────────────────────── */
function People({ ownerId, collaborators, size = 20 }) {
  const owner = ownerId ? findPerson(ownerId) : null
  const others = peopleForIds(collaborators).filter(u => u.id !== ownerId)
  if (!owner && others.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {owner && (
        <Avatar title={`Verantwortlich: ${owner.name}`} initials={owner.initials} color={owner.color} size={size + 2} src={avatarFor(owner.id)}
          style={{ border: `2px solid ${BORDER}` }} />
      )}
      {others.slice(0, 3).map(u => (
        <Avatar key={u.id} title={u.name} initials={u.initials} color={u.color} size={size} src={avatarFor(u.id)} />
      ))}
      {others.length > 3 && <div style={{ width: size, height: size, borderRadius: '50%', background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: MUTED }}>+{others.length - 3}</div>}
    </div>
  )
}

function LocationLink({ task, navigate }) {
  if (!task.location && !(task.lat && task.lng)) return null
  const label = (task.location || '').split(',')[0]
  function go(e) {
    e.stopPropagation()
    if (task.lat && task.lng) navigate('/map', { state: { focusCoords: [task.lat, task.lng], focusLabel: task.title } })
    else if (task.project_id) navigate('/map', { state: { focusProjectId: task.project_id } })
  }
  return (
    <button onClick={go} title="Auf Karte zeigen"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9, padding: 0, maxWidth: 140, overflow: 'hidden' }}>
      <MapPin size={10} color={A} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || 'Karte'}</span>
    </button>
  )
}

/* ─── BOARD CARD ───────────────────────────────────────────────────────────── */
function TaskCard({ task, projects, clients, boards, today, navigate, weatherForecast, showBoard, onOpen, onDelete, onCycle, ...drag }) {
  const prio = P[task.priority]
  const client = clients.find(c => c.id === task.client_id)
  const project = projects.find(p => p.id === task.project_id)
  const board = task.board_id ? boards.find(b => b.id === task.board_id) : null
  const type = task.task_type ? T[task.task_type] : null
  const eff = task.effort ? E[task.effort] : null
  const done = task.status === 'done' || task.status === 'archive'
  const zr = zeitraum(task)
  const overdue = task.due_date && !done && task.due_date < today
  const wc = !done ? weatherWarnColor(task, weatherForecast) : null

  return (
    <div {...drag} onClick={onOpen} className="lu-card lu-clickable"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, borderRadius: 14, padding: '10px 12px', position: 'relative' }}
      onMouseEnter={e => { const d = e.currentTarget.querySelector('.card-del'); if (d) d.style.opacity = 1 }}
      onMouseLeave={e => { const d = e.currentTarget.querySelector('.card-del'); if (d) d.style.opacity = 0 }}>

      <button className="card-del" onClick={e => { e.stopPropagation(); onDelete() }}
        style={{ position: 'absolute', top: 6, right: 6, opacity: 0, transition: 'opacity 0.15s', background: BG, border: `1px solid ${BORDER}`, borderRadius: 5, width: 24, height: 24, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={12} />
      </button>

      <div style={{ fontSize: 13, fontWeight: 500, color: done ? MUTED : FG, textDecoration: task.status === 'archive' ? 'line-through' : 'none', lineHeight: 1.35, paddingRight: 20, marginBottom: 8 }}>{task.title}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        {showBoard && board && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: board.color, background: `${board.color}18`, border: `1px solid ${board.color}30`, padding: '1px 6px', borderRadius: 4 }}>{board.emoji} {board.name}</span>}
        {client && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: client.color || A, background: `color-mix(in srgb, ${client.color || A} 10%, transparent)`, padding: '1px 6px', borderRadius: 4 }}>{client.name.split(' ')[0]}</span>}
        {project && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, background: A06, padding: '1px 6px', borderRadius: 4 }}>{project.name}</span>}
        {type && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: type.color, padding: '1px 4px' }}>{type.label}</span>}
        {task.gang_id && (
          <span title="Aus dem Leistungsverzeichnis abgeleitet — Änderungen am LV ziehen automatisch nach"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, color: A, background: A06, border: `1px solid ${A}30`, padding: '1px 6px', borderRadius: 4 }}>
            <Sprout size={9} />LV{task.summary ? ` · ${task.summary}` : ''}
          </span>
        )}
      </div>

      {(zr || (task.location || (task.lat && task.lng))) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          {zr && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, color: overdue ? DANGER : MUTED, fontWeight: overdue ? 700 : 400 }}><CalendarClock size={10} />{zr}{overdue ? ' · überfällig' : ''}</span>}
          <LocationLink task={task} navigate={navigate} />
          {wc && <span title="Wetterwarnung am Fälligkeitstag" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, color: wc }}><AlertTriangle size={10} />Wetter</span>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={e => { e.stopPropagation(); onCycle() }} title="Status weiterschalten"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 10, background: `${S[task.status]?.color}18`, border: `1px solid ${S[task.status]?.color}40`, color: S[task.status]?.color, cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9 }}>
          {S[task.status]?.short}
        </button>
        {task.checklist?.length > 0 && (
          <span title="Teilaufgaben" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, color: task.checklist.every(i => i.done) ? OK : MUTED }}>
            <CheckSquare size={10} />{task.checklist.filter(i => i.done).length}/{task.checklist.length}
          </span>
        )}
        {eff && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: eff.color }}>{eff.label}</span>}
        {task.gang_id && !task.job_id && !done && (
          <button onClick={e => { e.stopPropagation(); navigate(`/pflege?gang=${task.gang_id}`) }}
            title="Aus der Ankündigung einen festen Einsatz machen"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, background: A06, border: `1px solid ${A}35`, color: A, cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 9 }}>
            <CalendarPlus size={10} />Terminieren
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}><People ownerId={task.owner_id} collaborators={task.assigned_users} size={20} /></div>
      </div>
    </div>
  )
}

/* ─── TODO-LISTE — kompakte Abhak-Ansicht, gruppiert nach Fälligkeit ───────── */
function TodoList({ tasks, boards, today, isMobile, showBoard, onOpen, onToggle }) {
  if (tasks.length === 0) return <EmptyState title="Keine Aufgaben" hint="Passe die Filter an oder lege eine neue Aufgabe an." />

  const inWeek = (() => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })()

  const groups = [
    { id: 'overdue', label: 'Überfällig',   color: DANGER },
    { id: 'today',   label: 'Heute',        color: A },
    { id: 'week',    label: 'Diese Woche',  color: FG },
    { id: 'later',   label: 'Später',       color: MUTED },
    { id: 'nodate',  label: 'Ohne Datum',   color: MUTED },
    { id: 'done',    label: 'Erledigt',     color: OK },
  ]
  function groupOf(t) {
    if (t.status === 'done' || t.status === 'archive') return 'done'
    if (!t.due_date) return 'nodate'
    if (t.due_date < today) return 'overdue'
    if (t.due_date === today) return 'today'
    if (t.due_date <= inWeek) return 'week'
    return 'later'
  }
  const byGroup = {}
  sortTasks(tasks).forEach(t => { (byGroup[groupOf(t)] ??= []).push(t) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(g => {
        const list = byGroup[g.id]
        if (!list?.length) return null
        return (
          <div key={g.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 2px' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: g.color, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{g.label}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{list.length}</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
              {list.map((t, i) => {
                const prio = P[t.priority]
                const done = t.status === 'done' || t.status === 'archive'
                const board = t.board_id ? boards.find(b => b.id === t.board_id) : null
                const overdue = g.id === 'overdue'
                return (
                  <div key={t.id} onClick={() => onOpen(t)} className="lu-option"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '10px 10px' : '9px 12px', background: SURFACE, borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, cursor: 'pointer', opacity: done ? 0.6 : 1 }}>
                    <button onClick={e => { e.stopPropagation(); onToggle(t) }} title={done ? 'Als offen markieren' : 'Als erledigt markieren'}
                      style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${done ? OK : (prio?.color || BORDER)}`, background: done ? OK : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#001219', padding: 0 }}>
                      {done && <Check size={13} strokeWidth={3} />}
                    </button>
                    <span title={prio?.label} style={{ width: 6, height: 6, borderRadius: '50%', background: prio?.color || BORDER, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: done ? MUTED : FG, textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    {t.checklist?.length > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, color: t.checklist.every(i2 => i2.done) ? OK : MUTED, flexShrink: 0 }}>
                        <CheckSquare size={10} />{t.checklist.filter(i2 => i2.done).length}/{t.checklist.length}
                      </span>
                    )}
                    {showBoard && board && !isMobile && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: board.color, flexShrink: 0 }}>{board.emoji} {board.name}</span>
                    )}
                    {t.due_date && (
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: overdue ? DANGER : MUTED, fontWeight: overdue ? 700 : 400, flexShrink: 0 }}>{formatDate(t.due_date)}</span>
                    )}
                    {!isMobile && <People ownerId={t.owner_id} collaborators={t.assigned_users} size={18} />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── TABLE / LIST ─────────────────────────────────────────────────────────── */
function TaskTable({ tasks, projects, clients, boards, today, isMobile, navigate, weatherForecast, showBoard, onOpen, onDelete, onCycle }) {
  if (tasks.length === 0) return <EmptyState title="Keine Aufgaben" hint="Passe die Filter an oder lege eine neue Aufgabe an." />

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} projects={projects} clients={clients} boards={boards} today={today} navigate={navigate} weatherForecast={weatherForecast} showBoard={showBoard}
            onOpen={() => onOpen(t)} onDelete={() => onDelete(t.id)} onCycle={() => onCycle(t)} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 0.9fr 1.1fr 0.9fr 40px', gap: 10, padding: '10px 14px', background: SURFACE, borderBottom: `1px solid ${BORDER}`, fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span>Aufgabe</span><span>Kunde / Projekt</span><span>Status</span><span>Prio</span><span>Zeitraum</span><span>Team</span><span />
      </div>
      {tasks.map(t => {
        const prio = P[t.priority]
        const client = clients.find(c => c.id === t.client_id)
        const project = projects.find(p => p.id === t.project_id)
        const board = t.board_id ? boards.find(b => b.id === t.board_id) : null
        const done = t.status === 'done' || t.status === 'archive'
        const zr = zeitraum(t)
        const overdue = t.due_date && !done && t.due_date < today
        const wc = !done ? weatherWarnColor(t, weatherForecast) : null
        return (
          <div key={t.id} onClick={() => onOpen(t)} className="lu-option"
            style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 0.9fr 1.1fr 0.9fr 40px', gap: 10, padding: '11px 14px', borderBottom: `1px solid ${BORDER}`, borderLeft: `3px solid ${prio?.color || BORDER}`, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: done ? MUTED : FG, textDecoration: t.status === 'archive' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                {showBoard && board && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: board.color }}>{board.emoji} {board.name}</span>}
                <LocationLink task={t} navigate={navigate} />
                {t.checklist?.length > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, color: t.checklist.every(i => i.done) ? OK : MUTED }}><CheckSquare size={10} />{t.checklist.filter(i => i.done).length}/{t.checklist.length}</span>}
              </div>
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
            <div style={{ fontSize: 11, color: prio?.color }}>{prio?.label}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: overdue ? DANGER : MUTED, fontWeight: overdue ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>{zr || '—'}{wc && <AlertTriangle size={10} color={wc} title="Wetterwarnung" />}</div>
            <div><People ownerId={t.owner_id} collaborators={t.assigned_users} size={22} /></div>
            <button onClick={e => { e.stopPropagation(); onDelete(t.id) }} title="Löschen" className="lu-btn-danger"
              style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 5, width: 26, height: 26, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
