const CLIENT_ID = '760210295813-v91skcr4pncp3rrdcfgroghaqs27iemc.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'

let _tokenClient = null

export function isConnected() {
  const token = localStorage.getItem('luma_gcal_access_token')
  const exp = Number(localStorage.getItem('luma_gcal_token_exp') || 0)
  return !!token && Date.now() < exp
}

export function getCalendarId() {
  return localStorage.getItem('luma_gcal_calendar_id') || 'primary'
}

export function initTokenClient(onToken) {
  if (!window.google?.accounts?.oauth2) return false
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.access_token) {
        localStorage.setItem('luma_gcal_access_token', resp.access_token)
        localStorage.setItem('luma_gcal_token_exp', Date.now() + resp.expires_in * 1000)
        onToken?.(true)
      }
    },
    error_callback: () => onToken?.(false),
  })
  return true
}

export function requestToken() {
  _tokenClient?.requestAccessToken({ prompt: isConnected() ? '' : 'consent' })
}

export function disconnect() {
  const token = localStorage.getItem('luma_gcal_access_token')
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {})
  }
  localStorage.removeItem('luma_gcal_access_token')
  localStorage.removeItem('luma_gcal_token_exp')
}

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('luma_gcal_access_token')
  if (!token) throw new Error('not_connected')
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  })
  if (res.status === 401) {
    localStorage.removeItem('luma_gcal_access_token')
    throw new Error('token_expired')
  }
  return res
}

export async function listCalendars() {
  const res = await apiFetch('https://www.googleapis.com/calendar/v3/users/me/calendarList')
  const data = await res.json()
  return data.items || []
}

export async function fetchEvents(from, to, calendarId = getCalendarId()) {
  const params = new URLSearchParams({
    timeMin: from.toISOString(), timeMax: to.toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
  })
  const res = await apiFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )
  const data = await res.json()
  return (data.items || []).map(ev => ({
    id: ev.id,
    title: ev.summary || '(kein Titel)',
    date: (ev.start?.date || ev.start?.dateTime || '').slice(0, 10),
    date_end: ev.end?.date
      ? shiftDayBack(ev.end.date)  // GCal all-day end is exclusive
      : (ev.end?.dateTime || '').slice(0, 10),
    start_time: ev.start?.dateTime ? ev.start.dateTime.slice(11, 16) : null,
    end_time: ev.end?.dateTime ? ev.end.dateTime.slice(11, 16) : null,
    description: ev.description || '',
    colorId: ev.colorId,
    isGCal: true,
  }))
}

export async function createEvent(job, projectName) {
  const calId = getCalendarId()
  const body = jobToEvent(job, projectName)
  const res = await apiFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
    { method: 'POST', body: JSON.stringify(body) }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.id
}

export async function updateEvent(gcalId, job, projectName) {
  const calId = getCalendarId()
  const body = jobToEvent(job, projectName)
  await apiFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${gcalId}`,
    { method: 'PUT', body: JSON.stringify(body) }
  ).catch(() => {})
}

export async function deleteEvent(gcalId) {
  const calId = getCalendarId()
  await apiFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${gcalId}`,
    { method: 'DELETE' }
  ).catch(() => {})
}

function jobToEvent(job, projectName) {
  const endDate = job.date_end && job.date_end > job.date ? job.date_end : job.date
  return {
    summary: job.title + (projectName ? ` — ${projectName}` : ''),
    description: job.notes || '',
    start: { date: job.date },
    end: { date: shiftDayForward(endDate) }, // GCal all-day end is exclusive
    colorId: JOB_TYPE_COLOR[job.job_type] || '7',
  }
}

function shiftDayForward(iso) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function shiftDayBack(iso) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const JOB_TYPE_COLOR = {
  pflege: '10', baumpflege: '6', installation: '9', beratung: '3',
  giessen: '7', maehen: '2', drohne: '5', sonstiges: '8',
}
