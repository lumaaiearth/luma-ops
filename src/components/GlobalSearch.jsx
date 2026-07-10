// Globale Suche (Cmd/Ctrl+K): durchsucht Projekte, Kunden, Aufgaben,
// Einsätze, Bäume/Features, Sensoren, Team & Navigation — springt per
// Deep-Link direkt zum Ziel. Auf jeder Seite verfügbar (in Layout gerendert).
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { A, BG, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER, INFO } from '../lib/theme.js'
import { Avatar, MONO, SANS } from './ui.jsx'
import { TEAM, JOB_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '../data/seed.js'
import { formatDate } from '../lib/storage.js'
import {
  LayoutDashboard, CalendarDays, ListTodo, ListChecks, Map, BarChart2, Flower2,
  Clock, Database, FolderOpen, Radio, Users, Settings, UserCircle,
} from 'lucide-react'

const TASK_S = Object.fromEntries(TASK_STATUSES.map(s => [s.id, s]))
const TASK_P = Object.fromEntries(TASK_PRIORITIES.map(p => [p.id, p]))

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Kalender', to: '/calendar', icon: CalendarDays },
  { label: 'Offene Aufgaben', to: '/tasks', icon: ListTodo },
  { label: 'Einsatzübersicht', to: '/jobs', icon: ListChecks },
  { label: 'BIOME™ Karte', to: '/map', icon: Map },
  { label: 'Analysen', to: '/analyse', icon: BarChart2 },
  { label: 'Florales™', to: '/planning', icon: Flower2 },
  { label: 'Zeiten', to: '/time', icon: Clock },
  { label: 'Stammdaten', to: '/data', icon: Database },
  { label: 'Drive', to: '/drive', icon: FolderOpen },
  { label: 'Sensoren', to: '/sensors', icon: Radio },
  { label: 'Team', to: '/team', icon: Users },
  { label: 'Mein Profil', to: '/profile', icon: UserCircle },
  { label: 'Einstellungen', to: '/settings', icon: Settings },
]

const SENSOR_STATUS_COLOR = { critical: DANGER, warning: WARN, ok: OK }

// Einfaches Scoring: exakt > Wortanfang > Präfix > Teilstring; leer = kein Treffer
function score(text, q) {
  if (!text) return 0
  const t = text.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.split(/[\s\-_/]+/).some(w => w.startsWith(q))) return 60
  if (t.includes(q)) return 40
  return 0
}

export default function GlobalSearch() {
  const { projects, clients, tasks, jobs, sensors, mapFeatures } = useOps()
  const { profileForTeamId } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Cmd/Ctrl+K global; „/" öffnet ebenfalls (außerhalb von Eingabefeldern)
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setOpen(o => !o)
      } else if (e.key === '/' && !inField && !open) {
        e.preventDefault(); setOpen(true)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Trigger-Button aus der Rail/Topbar
  useEffect(() => {
    window.__lumaSearch = () => setOpen(true)
    return () => { delete window.__lumaSearch }
  }, [])

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30) }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = []

    if (!q) {
      // Ohne Eingabe: Schnellnavigation anbieten
      return NAV_ITEMS.slice(0, 7).map(n => ({
        type: 'nav', id: n.to, label: n.label, sub: 'Seite öffnen',
        icon: n.icon, color: MUTED, to: n.to, s: 1,
      }))
    }

    const push = (r, s) => { if (s > 0) out.push({ ...r, s }) }

    projects.forEach(p => {
      const s = Math.max(score(p.name, q), score(p.client, q) * 0.7, score(p.location, q) * 0.6)
      push({ type: 'Projekt', id: p.id, label: p.name, sub: p.client || p.location || 'Projekt', emoji: '📁', color: p.color || A, to: `/projects/${p.id}` }, s)
    })

    clients.forEach(c => {
      const s = Math.max(score(c.name, q), score(c.contact_name, q) * 0.6)
      push({ type: 'Kunde', id: c.id, label: c.name, sub: c.contact_name || 'Kunde', emoji: '🏢', color: c.color || INFO, to: `/clients/${c.id}` }, s)
    })

    ;(tasks || []).forEach(t => {
      const proj = projects.find(p => p.id === t.project_id)
      const s = Math.max(score(t.title, q), score(t.description, q) * 0.4, score(proj?.name, q) * 0.5)
      const st = TASK_S[t.status]
      push({ type: 'Aufgabe', id: t.id, label: t.title, sub: [st?.label, proj?.name, t.due_date ? `fällig ${formatDate(t.due_date)}` : null].filter(Boolean).join(' · '), emoji: '✓', color: TASK_P[t.priority]?.color || MUTED, to: `/tasks?open=${t.id}` }, s)
    })

    jobs.forEach(j => {
      const proj = projects.find(p => p.id === j.project_id)
      const s = Math.max(score(j.title, q), score(proj?.name, q) * 0.5, score(j.location, q) * 0.5)
      const type = JOB_TYPES.find(x => x.id === j.job_type)
      push({ type: 'Einsatz', id: j.id, label: j.title, sub: [formatDate(j.date), proj?.name].filter(Boolean).join(' · '), emoji: '🔧', color: type?.color || A, to: `/jobs?open=${j.id}` }, s)
    })

    mapFeatures.forEach(f => {
      if (f.feature_type === 'drone_image') return
      const props = f.properties || {}
      const s = Math.max(score(f.label, q), score(props.baumnummer, q), score(props.baumart_deutsch, q) * 0.9, score(props.baumart_latein, q) * 0.8)
      const isTree = f.feature_type === 'tree'
      push({ type: isTree ? 'Baum' : 'Feature', id: f.id, label: f.label || props.baumart_deutsch || 'Baum', sub: [props.baumnummer && `#${props.baumnummer}`, props.baumart_latein].filter(Boolean).join(' · ') || 'Karte', emoji: isTree ? '🌳' : '📍', color: '#22c55e', to: `/map?feature=${f.id}` }, s)
    })

    sensors.forEach(se => {
      const proj = projects.find(p => p.id === se.project_id)
      const s = Math.max(score(se.name, q), score(se.type, q) * 0.5, score(proj?.name, q) * 0.5)
      push({ type: 'Sensor', id: se.id, label: se.name, sub: [proj?.name, `${se.value}${se.unit}`].filter(Boolean).join(' · '), emoji: '📡', color: SENSOR_STATUS_COLOR[se.status] || MUTED, to: '/sensors' }, s)
    })

    TEAM.forEach(u => {
      const prof = profileForTeamId(u.id)
      const s = Math.max(score(u.name, q), score(prof?.name, q))
      push({ type: 'Person', id: u.id, label: prof?.name || u.name, sub: u.role, avatar: { initials: u.initials, color: u.color, src: prof?.avatar_url }, color: u.color, to: '/team' }, s)
    })

    NAV_ITEMS.forEach(n => {
      push({ type: 'nav', id: n.to, label: n.label, sub: 'Seite öffnen', icon: n.icon, color: MUTED, to: n.to }, score(n.label, q))
    })

    return out.sort((a, b) => b.s - a.s).slice(0, 20)
  }, [query, projects, clients, tasks, jobs, sensors, mapFeatures, profileForTeamId])

  useEffect(() => { setActive(0) }, [query])

  function go(r) {
    if (!r) return
    setOpen(false)
    navigate(r.to)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]) }
  }

  // aktives Element in Sicht scrollen
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', paddingLeft: 16, paddingRight: 16 }}
      onClick={() => setOpen(false)}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} />
      <div onClick={e => e.stopPropagation()} className="lu-fade-in"
        style={{ position: 'relative', width: '100%', maxWidth: 560, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

        {/* Eingabe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
          <Search size={17} color={MUTED} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Suchen: Projekte, Aufgaben, Einsätze, Bäume, Sensoren, Team…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: FG, fontSize: 15, fontFamily: SANS }} />
          <button onClick={() => setOpen(false)} aria-label="Schließen"
            style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>

        {/* Ergebnisse */}
        <div ref={listRef} style={{ maxHeight: '52vh', overflowY: 'auto', padding: 6 }}>
          {results.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: MUTED, fontFamily: MONO, fontSize: 12 }}>
              Keine Treffer für „{query}"
            </div>
          ) : results.map((r, i) => (
            <button key={`${r.type}-${r.id}`} data-idx={i} onClick={() => go(r)} onMouseEnter={() => setActive(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: i === active ? `color-mix(in srgb, ${A} 10%, transparent)` : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              {/* Icon / Avatar / Emoji */}
              {r.avatar ? (
                <Avatar initials={r.avatar.initials} color={r.avatar.color} size={26} src={r.avatar.src} />
              ) : r.icon ? (
                <span style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <r.icon size={14} color={r.color} />
                </span>
              ) : (
                <span style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{r.emoji}</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: FG, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                {r.sub && <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
              </div>
              {r.type !== 'nav' && (
                <span style={{ fontFamily: MONO, fontSize: 8, color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 25%, transparent)`, padding: '2px 7px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{r.type}</span>
              )}
            </button>
          ))}
        </div>

        {/* Fußleiste mit Hinweisen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px', borderTop: `1px solid ${BORDER}`, fontFamily: MONO, fontSize: 9, color: MUTED }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowUp size={10} /><ArrowDown size={10} /> Navigieren</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CornerDownLeft size={10} /> Öffnen</span>
          <span style={{ marginLeft: 'auto' }}>ESC schließen</span>
        </div>
      </div>
    </div>
  )
}
