import { useState } from 'react'
import { A, SURFACE, BORDER, FG, MUTED } from '../components/Layout.jsx'
import { VEHICLES } from '../data/seed.js'
import { useOps } from '../context/OpsContext.jsx'
import { genId } from '../lib/storage.js'
import { tgSend } from '../lib/telegram.js'
import { Car, Truck, Plus, Trash2, Calendar, ExternalLink, AlertTriangle, Send, Check } from 'lucide-react'

const INPUT_STYLE = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
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
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 10, background: isOwned ? `${v.color}20` : 'rgba(255,255,255,0.06)', color: isOwned ? v.color : MUTED, border: `1px solid ${isOwned ? v.color + '40' : BORDER}` }}>
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

export default function SettingsPage() {
  const [vehicles, setVehicles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('luma_vehicles')) || VEHICLES } catch { return VEHICLES }
  })
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newV, setNewV] = useState({ name: '', model: '', type: 'van', ownership: 'owned', color: '#08AA56' })
  const [gcalUrl, setGcalUrl] = useState(() => localStorage.getItem('luma_gcal_url') || '')
  const [gcalStatus, setGcalStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [gcalEvents, setGcalEvents] = useState([])

  const [tgToken, setTgToken] = useState(() => localStorage.getItem('luma_tg_token') || '')
  const [tgPflege, setTgPflege] = useState(() => localStorage.getItem('luma_tg_pflege') || '')
  const [tgPm, setTgPm] = useState(() => localStorage.getItem('luma_tg_pm') || '')
  const [tgInter, setTgInter] = useState(() => localStorage.getItem('luma_tg_inter') || '')
  const [tgTestStatus, setTgTestStatus] = useState({}) // { pflege: 'ok'|'error', ... }

  function saveTgSettings() {
    localStorage.setItem('luma_tg_token', tgToken)
    localStorage.setItem('luma_tg_pflege', tgPflege)
    localStorage.setItem('luma_tg_pm', tgPm)
    localStorage.setItem('luma_tg_inter', tgInter)
  }

  async function testTg(group, chatId) {
    if (!chatId || !tgToken) return
    localStorage.setItem('luma_tg_token', tgToken)
    setTgTestStatus(s => ({ ...s, [group]: 'loading' }))
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `✅ LUMA Ops verbunden — Gruppe: ${group}` }),
      })
      setTgTestStatus(s => ({ ...s, [group]: res.ok ? 'ok' : 'error' }))
    } catch {
      setTgTestStatus(s => ({ ...s, [group]: 'error' }))
    }
  }

  function saveVehicles(updated) {
    setVehicles(updated)
    localStorage.setItem('luma_vehicles', JSON.stringify(updated))
  }

  function addVehicle(e) {
    e.preventDefault()
    if (!newV.name) return
    saveVehicles([...vehicles, { ...newV, id: genId() }])
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

  const owned = vehicles.filter(v => v.ownership === 'owned')
  const rental = vehicles.filter(v => v.ownership === 'rental')

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, color: FG, letterSpacing: '-0.02em', marginBottom: 28 }}>Einstellungen</h1>

      {/* ── Fuhrpark ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Fuhrpark</div>
          <button onClick={() => setShowAddVehicle(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: showAddVehicle ? `${A}18` : 'transparent', border: `1px solid ${showAddVehicle ? A + '50' : BORDER}`, color: showAddVehicle ? A : MUTED, cursor: 'pointer', fontSize: 12 }}>
            <Plus size={12} /> Fahrzeug / Gerät
          </button>
        </div>

        {showAddVehicle && (
          <form onSubmit={addVehicle} style={{ padding: '16px', background: `${A}08`, border: `1px solid ${A}20`, borderRadius: 8, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          {owned.map(v => <VehicleCard key={v.id} v={v} onDelete={() => saveVehicles(vehicles.filter(x => x.id !== v.id))} />)}
        </div>

        <div style={{ marginBottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Leihgeräte & externe Fahrzeuge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rental.map(v => <VehicleCard key={v.id} v={v} onDelete={() => saveVehicles(vehicles.filter(x => x.id !== v.id))} />)}
          {rental.length === 0 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED, padding: '8px 0' }}>Keine Leihgeräte hinterlegt</div>}
        </div>
      </section>

      {/* ── Google Calendar Sync ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          Google Kalender Import
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
              style={{ padding: '9px 16px', borderRadius: 6, background: gcalUrl ? A : 'rgba(255,255,255,0.05)', border: 'none', color: gcalUrl ? '#001219' : MUTED, cursor: gcalUrl ? 'pointer' : 'default', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
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

      {/* ── Telegram ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          Telegram Integration
        </div>
        <div style={{ padding: '16px 20px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: FG, marginBottom: 6, lineHeight: 1.6 }}>
            Bot <code style={{ fontFamily: "'Space Mono', monospace", background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 3 }}>@lumaaiearth_bot</code> zu den Gruppen hinzufügen, dann Chat-IDs unten eintragen.
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, marginBottom: 14 }}>
            Chat-ID ermitteln: Bot in Gruppe schreiben → https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates → "chat":&#123;"id":...&#125;
          </div>

          <label style={LABEL}>Bot Token</label>
          <input
            style={{ ...INPUT_STYLE, marginBottom: 16, fontFamily: "'Space Mono', monospace", fontSize: 12 }}
            type="password"
            value={tgToken}
            onChange={e => setTgToken(e.target.value)}
            placeholder="123456789:AAE..."
          />

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
                  disabled={!state || !tgToken || tgTestStatus[key] === 'loading'}
                  style={{
                    width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                    background: tgTestStatus[key] === 'ok' ? '#22EAA722' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${tgTestStatus[key] === 'ok' ? '#22EAA750' : tgTestStatus[key] === 'error' ? '#ef444450' : BORDER}`,
                    cursor: state && tgToken ? 'pointer' : 'default',
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
              style={{ padding: '8px 18px', borderRadius: 6, background: A, border: 'none', color: '#001219', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Speichern
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: `${A}06`, border: `1px solid ${A}18`, borderRadius: 6 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wann wird benachrichtigt?</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: MUTED, lineHeight: 2 }}>
            <li>Neuer Einsatz mit Jona / Anselm → LUMA Pflege</li>
            <li>Einsatz abgesagt oder verschoben → betroffene Gruppe</li>
            <li>Sensor kritisch → LUMA Projektmanagement</li>
            <li>Fahrzeug doppelt gebucht → LUMA Inter</li>
          </ul>
        </div>
      </section>

      {/* ── Passwords note ── */}
      <div style={{ padding: '14px 18px', background: `${A}06`, border: `1px solid ${A}18`, borderRadius: 8 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: A, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Passwörter</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Aktuell: alle Accounts mit <code style={{ fontFamily: "'Space Mono', monospace", background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>luma2026</code>. Für produktiven Einsatz → Supabase Auth einrichten, dann individuelle Passwörter per E-Mail-Einladung.
        </div>
      </div>
    </div>
  )
}
