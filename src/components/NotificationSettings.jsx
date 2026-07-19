// Persönliche Termin-Erinnerungen ein-/ausschalten (Push-Benachrichtigungen).
// Lebt im Profil, damit jede:r Nutzer:in es fürs eigene Gerät steuern kann.
import { useState, useEffect } from 'react'
import { Bell, BellOff, Send, Check, AlertTriangle } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, A06, A18 } from '../lib/theme.js'
import { Card, Button, LABEL_STYLE, MONO } from './ui.jsx'
import { useOps } from '../context/OpsContext.jsx'
import { isNativeApp } from '../lib/platform.js'
import {
  notificationsSupported, isEnabled, setEnabled, getPermission, requestPermission,
  getLeadMinutes, setLeadMinutes, scheduleJobReminders, sendTestNotification, LEAD_OPTIONS,
} from '../lib/notifications.js'

function Toggle({ on, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: on ? A : 'rgba(255,255,255,0.12)',
        position: 'relative', transition: 'background 0.2s',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  )
}

export default function NotificationSettings() {
  const { jobs } = useOps()
  const supported = notificationsSupported()
  const [enabled, setEnabledState] = useState(() => isEnabled())
  const [permission, setPermission] = useState('default')
  const [lead, setLead] = useState(() => getLeadMinutes())
  const [testState, setTestState] = useState(null) // null | 'sending' | 'ok' | 'error'
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    getPermission().then(p => { if (active) setPermission(p) })
    return () => { active = false }
  }, [])

  async function toggleEnabled(next) {
    if (busy) return
    if (next) {
      setBusy(true)
      const granted = await requestPermission()
      setPermission(await getPermission())
      setBusy(false)
      if (!granted) return          // Berechtigung abgelehnt → Schalter bleibt aus
      setEnabled(true)
      setEnabledState(true)
      scheduleJobReminders(jobs)
    } else {
      setEnabled(false)
      setEnabledState(false)
      scheduleJobReminders(jobs)     // löscht geplante Erinnerungen
    }
  }

  function changeLead(val) {
    const n = Number(val)
    setLead(n)
    setLeadMinutes(n)
    if (enabled) scheduleJobReminders(jobs)
  }

  async function runTest() {
    setTestState('sending')
    const ok = await sendTestNotification()
    setPermission(await getPermission())
    setTestState(ok ? 'ok' : 'error')
    setTimeout(() => setTestState(null), 4000)
  }

  const denied = permission === 'denied'

  return (
    <Card padding="20px 22px" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {enabled ? <Bell size={15} color={A} /> : <BellOff size={15} color={MUTED} />}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>Termin-Erinnerungen</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 2 }}>
              Benachrichtigung vor wichtigen Terminen
            </div>
          </div>
        </div>
        {supported && <Toggle on={enabled} onChange={toggleEnabled} disabled={busy || denied} />}
      </div>

      {!supported && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, padding: '10px 12px', background: A06, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
          <AlertTriangle size={14} color={MUTED} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            Dieser Browser unterstützt keine Benachrichtigungen. In der installierten LUMA-Ops-App (iOS/Android) funktionieren Erinnerungen zuverlässig.
          </span>
        </div>
      )}

      {supported && denied && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, padding: '10px 12px', background: `color-mix(in srgb, ${WARN} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${WARN} 35%, transparent)`, borderRadius: 8 }}>
          <AlertTriangle size={14} color={WARN} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: FG, lineHeight: 1.5 }}>
            Benachrichtigungen sind {isNativeApp() ? 'für die App' : 'im Browser'} blockiert. Bitte in den {isNativeApp() ? 'System-Einstellungen' : 'Website-Einstellungen'} freigeben, dann hier aktivieren.
          </span>
        </div>
      )}

      {supported && enabled && !denied && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${BORDER}` }}>
          <label style={LABEL_STYLE}>Standard-Vorlaufzeit</label>
          <select
            value={lead}
            onChange={e => changeLead(e.target.value)}
            style={{ width: '100%', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 12px', color: FG, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: 'none' }}>
            {LEAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            Gilt für Termine mit Uhrzeit. Pro Termin lässt sich die Erinnerung im Einsatz-Fenster überschreiben oder abschalten.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Button
              variant="ghost"
              icon={testState === 'ok' ? Check : Send}
              onClick={runTest}
              disabled={testState === 'sending'}
              style={testState === 'ok' ? { color: OK, borderColor: `color-mix(in srgb, ${OK} 40%, transparent)` } : undefined}>
              {testState === 'sending' ? 'Sende…' : testState === 'ok' ? 'Gesendet' : 'Test-Benachrichtigung'}
            </Button>
            {testState === 'error' && (
              <span style={{ fontSize: 12, color: WARN }}>Konnte nicht gesendet werden.</span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
