import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { sb } from '../lib/supabase.js'
import { A, SURFACE, BORDER, FG, MUTED, A06, A08, A18, A20 } from '../lib/theme.js'
import { useTheme, THEMES } from '../context/ThemeContext.jsx'
import { VEHICLES, TEAM } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
import { useGCal } from '../context/GCalContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { genId } from '../lib/storage.js'
import { tgSend } from '../lib/telegram.js'
import { Car, Truck, Plus, Trash2, Calendar, ExternalLink, AlertTriangle, Send, Check, RefreshCw, Unlink, FolderOpen, Pencil, X } from 'lucide-react'

const DEFAULT_CHIPS = [
  'Wochenpflege', 'Rasenmähen', 'Baumpflege', 'Schröpfschnitt',
  'Mulchen', 'Pflanzung', 'Bewässerung', 'Dokumentation',
  'Beratung/Meeting', 'Aufräumen', 'Unkrautentfernung', 'Schnittarbeiten',
]

const INPUT_STYLE = {
  background: SURFACE, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: '9px 12px', color: FG,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, outline: 'none', width: '100%',
}
const LABEL = {
  fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED,
  letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5,
}

const TYPE_ICONS = { van: '🚐', car: '🚗', trailer: '🔧', lift: '🏗', truck: '🚛' }
const TYPE_LABELS = { van: 'Transporter', car: 'PKW', trailer: 'Anhänger', lift: 'Hebebühne', truck: 'LKW / Pritsche' }

function VehicleCard({ v, onDelete }) {
  const isOwned = v.ownership === 'owned'
  return (
    <div style={{ padding: '14px 16px', background: SURFACE, border: `1px solid ${isOwned ? v.color + '30' : BORDER}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: `${v.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {TYPE_ICONS[v.type] || '🚐'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: FG }}>{v.name}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 10, background: isOwned ? `${v.color}20` : A06, color: isOwned ? v.color : MUTED, border: `1px solid ${isOwned ? v.color + '40' : BORDER}` }}>
            {isOwned ? 'EIGENTUM' : 'LEIHE'}
          </span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
          {v.model} · {TYPE_LABELS[v.type] || v.type}
        </div>
      </div>
      {onDelete && (
        <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

function TeamIcalRow({ member }) {
  const [url, setUrl] = useState(() => localStorage.getItem(`luma_team_ical_${member.id}`) || '')
  const [saved, setSaved] = useState(false)
  function save() {
    if (url.trim()) localStorage.setItem(`luma_team_ical_${member.id}`, url.trim())
    else localStorage.removeItem(`luma_team_ical_${member.id}`)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  return (
    <div style={{ padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${member.color}22`, border: `2px solid ${member.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: member.color, fontWeight: 700 }}>{member.initials}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: FG }}>{member.name}</span>
        {url && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: A, padding: '1px 6px', background: A06, borderRadius: 8 }}>aktiv</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...INPUT_STYLE, flex: 1, fontSize: 11, fontFamily: "'Space Mono', monospace" }}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/.../.../basic.ics"
        />
        <button onClick={save}
          style={{ padding: '8px 14px', borderRadius: 6, background: saved ? '#22EAA722' : A, border: 'none', color: saved ? '#22EAA7' : '#001219', cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
          {saved ? '✓' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  // user.role is the Supabase auth role ('authenticated' for everyone) —
  // the app role lives in user_profile.rolle, exposed as isAdmin.
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  const { themeId, setTheme } = useTheme()

  const { connected: gcalConnected, ready: gcalReady, syncing: gcalSyncing, calendars, calendarId, connect: gcalConnect, disconnect: gcalDisconnect, setCalendarId, reload: gcalReload } = useGCal()
  const { projects, createProject, updateProject, deleteProject, vehicles, createVehicle, deleteVehicle, chips, saveChips } = useOps()
  const [showAddProject, setShowAddProject] = useState(false)
  const [newP, setNewP] = useState({ name: '', location: '', client: '' })
  const [editProjectId, setEditProjectId] = useState(null)
  const [editP, setEditP] = useState({})
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newV, setNewV] = useState({ name: '', model: '', type: 'van', ownership: 'owned', color: '#08AA56' })
  const [gcalUrl, setGcalUrl] = useState(() => localStorage.getItem('luma_gcal_url') || '')
  const [gcalStatus, setGcalStatus] = useState(null)
  const [newChip, setNewChip] = useState('')
  const [gcalEvents, setGcalEvents] = useState([])

  // Telegram chat IDs live in app_settings ('telegram_groups') so they work
  // on every device. The bot token is a Supabase secret (TELEGRAM_BOT_TOKEN)
  // used by the tg-send Edge Function — it never reaches the browser.
  const [tgPflege, setTgPflege] = useState('')
  const [tgPm, setTgPm] = useState('')
  const [tgInter, setTgInter] = useState('')
  const [tgSaved, setTgSaved] = useState(false)
  const [tgTestStatus, setTgTestStatus] = useState({}) // { pflege: 'ok'|'error', ... }

  useEffect(() => {
    sb.from('app_settings').select('value').eq('key', 'telegram_groups').maybeSingle().then(({ data }) => {
      if (data?.value) {
        setTgPflege(data.value.pflege || '')
        setTgPm(data.value.pm || '')
        setTgInter(data.value.inter || '')
      }
    })
  }, [])

  async function saveTgSettings() {
    const value = { pflege: tgPflege.trim(), pm: tgPm.trim(), inter: tgInter.trim() }
    const { error } = await sb.from('app_settings').upsert(
      { key: 'telegram_groups', value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    if (error) {
      window.__lumaToast?.(`⚠️ Speicherfehler (telegram_groups): ${error.message}`)
    } else {
      setTgSaved(true)
      setTimeout(() => setTgSaved(false), 2000)
    }
  }

  async function testTg(group, chatId) {
    if (!chatId) return
    await saveTgSettings() // ensure the Edge Function sees the current IDs
    setTgTestStatus(s => ({ ...s, [group]: 'loading' }))
    const result = await tgSend(group, `✅ LUMA Ops verbunden — Gruppe: ${group}`)
    setTgTestStatus(s => ({ ...s, [group]: result?.ok ? 'ok' : 'error' }))
  }

  function addChip(e) {
    e.preventDefault()
    const val = newChip.trim()
    if (!val || chips.includes(val)) return
    saveChips([...chips, val])
    setNewChip('')
  }

  async function addVehicle(e) {
    e.preventDefault()
    if (!newV.name) return
    await createVehicle(newV)
    setNewV({ name: '', model: '', type: 'van', ownership: 'owned', color: '#08AA56' })
    setShowAddVehicle(false)
  }

  async function importGcal() {
    if (!gcalUrl) return
    setGcalStatus('loading')
    setGcalEvents([])
    try {
      // Google Calendar iCal URLs need CORS proxy for browser fetch
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(gcalUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const text = await res.text()
      // Parse basic iCal VEVENT blocks
      const events = []
      const blocks = text.split('BEGIN:VEVENT')
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i]
        const get = (key) => {
          const m = block.match(new RegExp(key + '[^:]*:([^\\r\\n]+)'))
          return m ? m[1].trim() : ''
        }
        const dtstart = get('DTSTART')
        const summary = get('SUMMARY')
        const location = get('LOCATION')
        if (summary && dtstart) {
          const dateStr = dtstart.replace('T', '').slice(0, 8)
          const iso = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
          events.push({ summary, date: iso, location })
        }
      }
      setGcalEvents(events.slice(0, 20))
      setGcalStatus('ok')
      localStorage.setItem('luma_gcal_url', gcalUrl)
    } catch (err) {
      setGcalStatus('error')
    }
  }

  const owned = (vehicles || []).filter(v => v.ownership === 'owned')
  const rental = (vehicles || []).filter(v => v.ownership === 'rental')

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 28 }}>Einstellungen</h1>

      {/* ── Design ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Design</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEMES.map(t => {
            const active = themeId === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${active ? A + '80' : BORDER}`,
                  background: active ? A08 : SURFACE,
                  transition: 'all 0.15s',
                }}
              >
                {/* Color preview dots */}
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: t.vars['--luma-bg'], border: '1px solid rgba(255,255,255,0.12)' }} />
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: t.vars['--luma-surface'], border: '1px solid rgba(255,255,255,0.12)' }} />
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: t.vars['--luma-a'] }} />
                </div>
                <span style={{ fontSize: 13, color: active ? A : FG, fontFamily: "'Space Grotesk', sans-serif", fontWeight: active ? 500 : 400 }}>
                  {t.name}
                </span>
                {active && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: A }}>✓</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Fuhrpark ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Fuhrpark</div>
          <button onClick={() => setShowAddVehicle(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: showAddVehicle ? A18 : 'transparent', border: `1px solid ${showAddVehicle ? A + '50' : BORDER}`, color: showAddVehicle ? A : MUTED, cursor: 'pointer', fontSize: 12 }}>
            <Plus size={12} /> Fahrzeug / Gerät
          </button>
        </div>

        {showAddVehicle && (
          <form onSubmit={addVehicle} style={{ padding: '16px', background: A08, border: `1px solid ${A20}`, borderRadius: 8, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LABEL}>Name *</label>
              <input style={INPUT_STYLE} value={newV.name} onChange={e => setNewV(v => ({ ...v, name: e.target.value }))} placeholder="z.B. LUMi" required />
            </div>
            <div>
              <label style={LABEL}>Modell</label>
              <input style={INPUT_STYLE} value={newV.model} onChange={e => setNewV(v => ({ ...v, model: e.target.value }))} placeholder="z.B. Renault Kangoo" />
            </div>
            <div>
              <label style={LABEL}>Typ</label>
              <select style={INPUT_STYLE} value={newV.type} onChange={e => setNewV(v => ({ ...v, type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Eigentum / Leihe</label>
              <select style={INPUT_STYLE} value={newV.ownership} onChange={e => setNewV(v => ({ ...v, ownership: e.target.value }))}>
                <option value="owned">Eigentum</option>
                <option value="rental">Leihe / extern</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddVehicle(false)} style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>
              <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Hinzufügen</button>
            </div>
          </form>
        )}

        <div style={{ marginBottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Eigene Fahrzeuge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {owned.map(v => <VehicleCard key={v.id} v={v} onDelete={() => deleteVehicle(v.id)} />)}
        </div>

        <div style={{ marginBottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Leihgeräte & externe Fahrzeuge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rental.map(v => <VehicleCard key={v.id} v={v} onDelete={() => deleteVehicle(v.id)} />)}
          {rental.length === 0 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, padding: '8px 0' }}>Keine Leihgeräte hinterlegt</div>}
        </div>
      </section>

      {/* ── Google Calendar OAuth Sync ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          Google Kalender Sync
        </div>
        <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${gcalConnected ? A + '40' : BORDER}`, borderRadius: 8, marginBottom: 12 }}>
          {!gcalConnected ? (
            <div>
              <div style={{ fontSize: 13, color: FG, marginBottom: 10, lineHeight: 1.6 }}>
                Mit Google Kalender verbinden — Einsätze werden bidirektional synchronisiert.
              </div>
              <button
                onClick={gcalConnect}
                disabled={!gcalReady}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 6, background: gcalReady ? A : A06, border: 'none', color: gcalReady ? '#001219' : MUTED, cursor: gcalReady ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
                <Calendar size={14} />
                {gcalReady ? 'Mit Google Kalender verbinden' : 'Lädt…'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22EAA7' }} />
                  <span style={{ fontSize: 13, color: FG }}>Verbunden</span>
                  {gcalSyncing && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A }}>sync…</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={gcalReload} style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={12} />
                  </button>
                  <button onClick={gcalDisconnect} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, fontSize: 12 }}>
                    <Unlink size={11} /> Trennen
                  </button>
                </div>
              </div>
              {calendars.length > 0 && (
                <div>
                  <label style={LABEL}>Kalender</label>
                  <select style={INPUT_STYLE} value={calendarId} onChange={e => setCalendarId(e.target.value)}>
                    {calendars.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.primary ? ' (Primär)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: '10px 14px', background: A06, border: `1px solid ${A18}`, borderRadius: 6, marginBottom: 24 }}>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: MUTED, lineHeight: 2 }}>
            <li>Neuer Einsatz in luma-ops → erscheint in Google Kalender</li>
            <li>Einsatz verschoben / gelöscht → wird in GCal aktualisiert</li>
            <li>GCal-Termine → als Overlay im Kalender sichtbar (grau gestrichelt)</li>
            <li>GCal-Termin anklicken → Einsatz mit vorausgefüllten Feldern erstellen</li>
          </ul>
        </div>
      </section>

      {/* ── Google Calendar iCal Import (Fallback) ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          Google Kalender Import (iCal, read-only)
        </div>

        <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: FG, marginBottom: 10, lineHeight: 1.6 }}>
            Google Calendar iCal-URL einfügen — Termine werden als Einsatz-Vorschläge importiert.
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 12 }}>
            Google Calendar → Einstellungen → Kalender wählen → "Privatadresse im iCal-Format" kopieren
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...INPUT_STYLE, flex: 1 }}
              value={gcalUrl}
              onChange={e => setGcalUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/.../.../basic.ics"
            />
            <button
              onClick={importGcal}
              disabled={!gcalUrl || gcalStatus === 'loading'}
              style={{ padding: '9px 16px', borderRadius: 6, background: gcalUrl ? A : A06, border: 'none', color: gcalUrl ? '#001219' : MUTED, cursor: gcalUrl ? 'pointer' : 'default', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {gcalStatus === 'loading' ? 'Lädt...' : 'Importieren'}
            </button>
          </div>
        </div>

        {gcalStatus === 'error' && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 6, marginBottom: 10 }}>
            <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#ef4444' }}>Import fehlgeschlagen. Prüfe die URL oder ob der Kalender öffentlich freigegeben ist.</span>
          </div>
        )}

        {gcalStatus === 'ok' && gcalEvents.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, marginBottom: 8 }}>{gcalEvents.length} Termine gefunden</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {gcalEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '9px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, minWidth: 80 }}>{ev.date}</div>
                  <div style={{ flex: 1, fontSize: 13, color: FG }}>{ev.summary}</div>
                  {ev.location && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{ev.location}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {gcalStatus === 'ok' && gcalEvents.length === 0 && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, padding: '8px 0' }}>Keine kommenden Termine gefunden.</div>
        )}
      </section>

      {/* ── Team Kalender (iCal free/busy) ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
          Team Kalender (Verfügbarkeit)
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 14, lineHeight: 1.7 }}>
          Privaten iCal-Link pro Teammitglied eintragen → Termine werden anonymisiert als "Belegt"-Block im Kalender angezeigt.
          <br />Google Calendar → Einstellungen → Kalender → "Privatadresse im iCal-Format" kopieren
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TEAM.map(member => <TeamIcalRow key={member.id} member={member} />)}
        </div>
      </section>

      {/* ── Telegram ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          Telegram Integration
        </div>
        <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: FG, marginBottom: 6, lineHeight: 1.6 }}>
            Bot <code style={{ fontFamily: "'Space Mono', monospace", background: A06, padding: '1px 6px', borderRadius: 3 }}>@lumaaiearth_bot</code> zu den Gruppen hinzufügen, dann Chat-IDs unten eintragen.
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 14 }}>
            Chat-ID ermitteln: Bot in Gruppe schreiben → https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates → "chat":&#123;"id":...&#125;
            <br />Bot-Token: als Secret <code>TELEGRAM_BOT_TOKEN</code> in Supabase hinterlegt (Dashboard → Edge Functions → Secrets), nicht im Browser.
          </div>

          {[
            { key: 'pflege', label: 'LUMA Pflege', members: 'Jona · Anselm · Malte', state: tgPflege, setState: setTgPflege },
            { key: 'pm', label: 'LUMA Projektmanagement', members: 'Malte · Lukas · Robert', state: tgPm, setState: setTgPm },
            { key: 'inter', label: 'LUMA Inter', members: 'Lukas · Malte', state: tgInter, setState: setTgInter },
          ].map(({ key, label, members, state, setState }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={LABEL}>{label} <span style={{ color: MUTED, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— {members}</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...INPUT_STYLE, fontFamily: "'Space Mono', monospace", fontSize: 12 }}
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="-100123456789"
                />
                <button
                  onClick={() => testTg(key, state)}
                  disabled={!state || tgTestStatus[key] === 'loading'}
                  style={{
                    width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                    background: tgTestStatus[key] === 'ok' ? '#22EAA722' : A06,
                    border: `1px solid ${tgTestStatus[key] === 'ok' ? '#22EAA750' : tgTestStatus[key] === 'error' ? '#ef444450' : BORDER}`,
                    cursor: state ? 'pointer' : 'default',
                    color: tgTestStatus[key] === 'ok' ? '#22EAA7' : tgTestStatus[key] === 'error' ? '#ef4444' : MUTED,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {tgTestStatus[key] === 'ok' ? <Check size={14} /> : <Send size={13} />}
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveTgSettings}
              style={{ padding: '8px 18px', borderRadius: 6, background: tgSaved ? '#22EAA722' : A, border: 'none', color: tgSaved ? '#22EAA7' : '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}>
              {tgSaved ? '✓ Gespeichert' : 'Speichern'}
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: A06, border: `1px solid ${A18}`, borderRadius: 6 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wann wird benachrichtigt?</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: MUTED, lineHeight: 2 }}>
            <li>Neuer Einsatz mit Jona / Anselm → LUMA Pflege</li>
            <li>Einsatz abgesagt oder verschoben → betroffene Gruppe</li>
            <li>Sensor kritisch → LUMA Projektmanagement</li>
            <li>Fahrzeug doppelt gebucht → LUMA Inter</li>
          </ul>
        </div>
      </section>

      {/* ── Projekte ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Projekte</div>
          <button onClick={() => { setShowAddProject(v => !v); setNewP({ name: '', location: '', client: '' }) }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: showAddProject ? A18 : 'transparent', border: `1px solid ${showAddProject ? A + '50' : BORDER}`, color: showAddProject ? A : MUTED, cursor: 'pointer', fontSize: 12 }}>
            <Plus size={13} /> Projekt hinzufügen
          </button>
        </div>

        {/* Add form */}
        {showAddProject && (
          <div style={{ padding: '16px', background: A08, border: `1px solid ${A20}`, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={LABEL}>Name *</label>
                <input style={INPUT_STYLE} placeholder="z.B. MV Tiny Forest" value={newP.name} onChange={e => setNewP(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Standort</label>
                <input style={INPUT_STYLE} placeholder="z.B. Berlin-Mitte" value={newP.location} onChange={e => setNewP(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Kunde</label>
                <input style={INPUT_STYLE} placeholder="z.B. JOPE AG" value={newP.client} onChange={e => setNewP(p => ({ ...p, client: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddProject(false)} style={{ padding: '7px 14px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12 }}>Abbrechen</button>
              <button
                onClick={() => {
                  if (!newP.name) return
                  createProject({ id: newP.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), ...newP })
                  setShowAddProject(false)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                <Check size={13} /> Hinzufügen
              </button>
            </div>
          </div>
        )}

        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {projects.map(p => (
            <div key={p.id} style={{ padding: '12px 16px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              {editProjectId === p.id ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label style={LABEL}>Name</label>
                    <input style={INPUT_STYLE} value={editP.name} onChange={e => setEditP(v => ({ ...v, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LABEL}>Standort</label>
                    <input style={INPUT_STYLE} value={editP.location} onChange={e => setEditP(v => ({ ...v, location: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LABEL}>Kunde</label>
                    <input style={INPUT_STYLE} value={editP.client} onChange={e => setEditP(v => ({ ...v, client: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { updateProject(p.id, editP); setEditProjectId(null) }} style={{ padding: '8px 12px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 12 }}><Check size={13} /></button>
                    <button onClick={() => setEditProjectId(null)} style={{ padding: '8px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FolderOpen size={14} color={A} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: FG }}>{p.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>
                      {[p.location, p.client].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditProjectId(p.id); setEditP({ name: p.name, location: p.location || '', client: p.client || '' }) }}
                      style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => deleteProject(p.id)}
                      style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Noch keine Projekte</div>
          )}
        </div>
      </section>

      {/* ── Tätigkeit-Chips ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          Tätigkeit Schnellauswahl
        </div>
        <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {chips.map(chip => (
              <div key={chip} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, border: `1px solid ${BORDER}`, background: A06 }}>
                <span style={{ fontSize: 12, color: FG }}>{chip}</span>
                <button onClick={() => saveChips(chips.filter(c => c !== chip))}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, padding: 0, display: 'flex', alignItems: 'center' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addChip} style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...INPUT_STYLE, flex: 1 }}
              value={newChip}
              onChange={e => setNewChip(e.target.value)}
              placeholder="Neue Tätigkeit hinzufügen…"
            />
            <button type="submit" disabled={!newChip.trim()}
              style={{ padding: '8px 14px', borderRadius: 6, background: newChip.trim() ? A : A06, border: 'none', color: newChip.trim() ? '#001219' : MUTED, cursor: newChip.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
              + Hinzufügen
            </button>
          </form>
          <button onClick={() => saveChips(DEFAULT_CHIPS)}
            style={{ marginTop: 10, padding: '5px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 11 }}>
            Zurücksetzen
          </button>
        </div>
      </section>

      {/* ── Passwords note ── */}
      <div style={{ padding: '14px 18px', background: A06, border: `1px solid ${A18}`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Passwörter</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Aktuell: alle Accounts mit <code style={{ fontFamily: "'Space Mono', monospace", background: A06, padding: '1px 5px', borderRadius: 3 }}>luma2026</code>. Für produktiven Einsatz → Supabase Auth einrichten, dann individuelle Passwörter per E-Mail-Einladung.
        </div>
      </div>
    </div>
  )
}
