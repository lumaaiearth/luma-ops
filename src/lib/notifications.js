// Push-/Erinnerungs-Benachrichtigungen für persönliche Termine.
//
// Zwei Wege, ein gemeinsames API:
//   • Verpackte App (iOS/Android, Capacitor) → echte OS-Benachrichtigungen über
//     @capacitor/local-notifications. Werden vom Betriebssystem geplant und
//     erscheinen auch, wenn die App geschlossen ist.
//   • Web / PWA → Notification-API. Solange die App (oder ihr Tab) läuft,
//     feuern In-App-Timer die Erinnerung. Für den Hintergrund im Browser wäre
//     ein Push-Server nötig — bewusst nicht umgesetzt (die App wird primär als
//     native App genutzt).
//
// Erinnerungen gelten für Termine mit Uhrzeit (start_time). Ganztägige Einsätze
// bekommen keine automatische Erinnerung.
import { isNativeApp } from './platform.js'

const ENABLED_KEY   = 'luma_notify_enabled'   // '1' | '0'
const LEAD_KEY      = 'luma_notify_lead'       // Standard-Vorlaufzeit in Minuten
const OVERRIDES_KEY = 'luma_job_reminders'     // { [jobId]: minutes | 'off' }

const DEFAULT_LEAD = 30
export const LEAD_OPTIONS = [
  { value: 5,    label: '5 Minuten vorher' },
  { value: 10,   label: '10 Minuten vorher' },
  { value: 15,   label: '15 Minuten vorher' },
  { value: 30,   label: '30 Minuten vorher' },
  { value: 60,   label: '1 Stunde vorher' },
  { value: 120,  label: '2 Stunden vorher' },
  { value: 1440, label: '1 Tag vorher' },
]

// ── Kleine localStorage-Helfer ──────────────────────────────────────────────
export function notificationsSupported() {
  if (typeof window === 'undefined') return false
  if (isNativeApp()) return true
  return 'Notification' in window
}

export function isEnabled() {
  return notificationsSupported() && localStorage.getItem(ENABLED_KEY) === '1'
}

export function setEnabled(on) {
  localStorage.setItem(ENABLED_KEY, on ? '1' : '0')
}

export function getLeadMinutes() {
  const n = Number(localStorage.getItem(LEAD_KEY))
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LEAD
}

export function setLeadMinutes(n) {
  localStorage.setItem(LEAD_KEY, String(n))
}

function readOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {} } catch { return {} }
}

// null → Standard-Vorlaufzeit benutzen; 'off' → keine Erinnerung; Zahl → Minuten.
export function getReminderOverride(jobId) {
  const v = readOverrides()[jobId]
  return v === undefined ? null : v
}

export function setReminderOverride(jobId, value) {
  const map = readOverrides()
  if (value === null || value === undefined) delete map[jobId]
  else map[jobId] = value
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map))
}

export function clearReminderOverride(jobId) {
  setReminderOverride(jobId, null)
}

// ── Berechtigungen ──────────────────────────────────────────────────────────
// Liefert 'granted' | 'denied' | 'default'.
export async function getPermission() {
  if (!notificationsSupported()) return 'denied'
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const s = await LocalNotifications.checkPermissions()
      return s.display === 'prompt' || s.display === 'prompt-with-rationale' ? 'default' : s.display
    } catch { return 'default' }
  }
  return Notification.permission
}

export async function requestPermission() {
  if (!notificationsSupported()) return false
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const s = await LocalNotifications.requestPermissions()
      return s.display === 'granted'
    } catch { return false }
  }
  try {
    const r = await Notification.requestPermission()
    return r === 'granted'
  } catch { return false }
}

// ── Erinnerungslogik ────────────────────────────────────────────────────────
// Stabile 32-Bit-Zahl aus der Job-ID (Capacitor braucht int-IDs).
function numericId(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) {
    h = (h * 31 + String(str).charCodeAt(i)) | 0
  }
  return Math.abs(h) % 2000000000 + 1
}

function reminderMinutesFor(job) {
  const ov = getReminderOverride(job.id)
  if (ov === 'off') return null
  if (typeof ov === 'number') return ov
  return getLeadMinutes()
}

// Zeitpunkt, zu dem die Erinnerung feuern soll (Date) — oder null.
function fireDateFor(job, minutesBefore) {
  if (!job.date || !job.start_time) return null
  const start = new Date(`${job.date}T${job.start_time}:00`)
  if (isNaN(start.getTime())) return null
  return new Date(start.getTime() - minutesBefore * 60_000)
}

function leadLabel(mins) {
  if (mins <= 0) return 'Jetzt'
  if (mins < 60) return `in ${mins} Min`
  if (mins < 1440) {
    const h = mins / 60
    return `in ${Number.isInteger(h) ? h : h.toFixed(1)} Std`
  }
  const d = mins / 1440
  return d === 1 ? 'morgen' : `in ${d} Tagen`
}

function bodyFor(job, mins) {
  const time = job.start_time ? `${job.start_time}${job.end_time ? `–${job.end_time}` : ''}` : ''
  const place = job.location ? job.location.split(',')[0] : ''
  return [`Termin ${leadLabel(mins)}`, time, place].filter(Boolean).join(' · ')
}

// Aus der Job-Liste die tatsächlich zu planenden Erinnerungen ableiten.
function buildPlan(jobs) {
  const now = Date.now()
  const HORIZON = 60 * 24 * 3600_000 // max. 60 Tage im Voraus planen
  const plan = []
  for (const job of jobs || []) {
    if (!job || job.status === 'cancelled' || !job.start_time || !job.date) continue
    const mins = reminderMinutesFor(job)
    if (mins == null) continue
    const at = fireDateFor(job, mins)
    if (!at) continue
    const ts = at.getTime()
    if (ts <= now || ts - now > HORIZON) continue
    plan.push({ job, mins, at, ts })
  }
  return plan
}

// ── Web: In-App-Timer ───────────────────────────────────────────────────────
const webTimers = new Map() // jobId → timeoutId

function clearWebTimers() {
  for (const id of webTimers.values()) clearTimeout(id)
  webTimers.clear()
}

async function showWeb(title, opts) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) { await reg.showNotification(title, opts); return }
    }
  } catch { /* fällt unten auf new Notification zurück */ }
  try { new Notification(title, opts) } catch { /* Berechtigung fehlt */ }
}

async function showWebNotification(job, mins) {
  await showWeb(job.title, {
    body: bodyFor(job, mins),
    tag: `luma-job-${job.id}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { date: job.date },
  })
}

function scheduleWeb(plan) {
  clearWebTimers()
  const now = Date.now()
  // setTimeout ist auf ~24,8 Tage begrenzt und driftet über lange Zeiträume —
  // daher nur Erinnerungen der nächsten 24 h als Timer setzen. Der Rest wird beim
  // nächsten App-Start (scheduleJobReminders) erneut ausgewertet.
  const WINDOW = 24 * 3600_000
  for (const { job, mins, ts } of plan) {
    const delay = ts - now
    if (delay > WINDOW) continue
    const id = setTimeout(() => {
      showWebNotification(job, mins)
      webTimers.delete(job.id)
    }, delay)
    webTimers.set(job.id, id)
  }
}

// ── Native: OS-Benachrichtigungen ───────────────────────────────────────────
async function scheduleNative(plan) {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  // Android-Kanal (ab Android 8 nötig, auf iOS ein No-op).
  try {
    await LocalNotifications.createChannel({
      id: 'luma-termine',
      name: 'Termine',
      description: 'Erinnerungen an anstehende Termine',
      importance: 5,
      visibility: 1,
    })
  } catch { /* iOS / nicht unterstützt */ }

  // Zuerst alle eigenen, noch ausstehenden Erinnerungen entfernen und komplett neu
  // planen — idempotent und einfacher als Diffing.
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications?.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
    }
  } catch { /* egal */ }

  if (!plan.length) return
  const notifications = plan.map(({ job, mins, at }) => ({
    id: numericId(job.id),
    title: job.title,
    body: bodyFor(job, mins),
    schedule: { at, allowWhileIdle: true },
    channelId: 'luma-termine',
    extra: { date: job.date, jobId: job.id },
  }))
  try { await LocalNotifications.schedule({ notifications }) } catch (e) {
    console.warn('[notifications] schedule failed:', e?.message || e)
  }
}

// ── Öffentliches API: Erinnerungen (neu) planen ─────────────────────────────
let rescheduleTimer = null

// Plant alle Termin-Erinnerungen neu. Ruhig oft aufrufbar (idempotent).
export async function scheduleJobReminders(jobs) {
  if (!isEnabled()) {
    clearWebTimers()
    if (isNativeApp()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const pending = await LocalNotifications.getPending()
        if (pending.notifications?.length) {
          await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
        }
      } catch { /* egal */ }
    }
    return
  }
  if ((await getPermission()) !== 'granted') return

  const plan = buildPlan(jobs)
  if (isNativeApp()) await scheduleNative(plan)
  else scheduleWeb(plan)
}

// Leichtgewichtiges Entprellen, damit häufige Job-Änderungen nicht jedes Mal neu planen.
export function scheduleJobRemindersDebounced(jobs, delay = 1500) {
  clearTimeout(rescheduleTimer)
  rescheduleTimer = setTimeout(() => scheduleJobReminders(jobs), delay)
}

// Sofortige Test-Benachrichtigung (für den Button in den Einstellungen).
export async function sendTestNotification() {
  if ((await getPermission()) !== 'granted') {
    const ok = await requestPermission()
    if (!ok) return false
  }
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      try {
        await LocalNotifications.createChannel({
          id: 'luma-termine', name: 'Termine',
          description: 'Erinnerungen an anstehende Termine', importance: 5, visibility: 1,
        })
      } catch { /* iOS */ }
      await LocalNotifications.schedule({
        notifications: [{
          id: 2147480000,
          title: 'LUMA Ops',
          body: 'Test-Benachrichtigung — Erinnerungen sind aktiv ✅',
          schedule: { at: new Date(Date.now() + 1500) },
          channelId: 'luma-termine',
        }],
      })
      return true
    } catch { return false }
  }
  await showWeb('LUMA Ops', {
    body: 'Test-Benachrichtigung — Erinnerungen sind aktiv ✅',
    tag: 'luma-test',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })
  return true
}
