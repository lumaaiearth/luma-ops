import { SEED_JOBS, SEED_RECURRING, SEED_SENSORS, SEED_TIME_ENTRIES, SEED_INVOICES, PROJECTS_OPS } from '../data/seed.js'

const KEYS = { jobs: 'luma_jobs', recurring: 'luma_recurring', sensors: 'luma_sensors', time: 'luma_time_entries', invoices: 'luma_invoices', projects: 'luma_projects' }

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

export function getJobs() { return load(KEYS.jobs, SEED_JOBS) }
export function saveJobs(jobs) { save(KEYS.jobs, jobs) }

export function getRecurring() { return load(KEYS.recurring, SEED_RECURRING) }
export function saveRecurring(r) { save(KEYS.recurring, r) }

export function getSensors() { return load(KEYS.sensors, SEED_SENSORS) }
export function saveSensors(s) { save(KEYS.sensors, s) }

export function getTimeEntries() { return load(KEYS.time, SEED_TIME_ENTRIES) }
export function saveTimeEntries(t) { save(KEYS.time, t) }

export function getInvoices() { return load(KEYS.invoices, SEED_INVOICES) }
export function saveInvoices(i) { save(KEYS.invoices, i) }

export function getProjects() { return load(KEYS.projects, PROJECTS_OPS) }
export function saveProjects(p) { save(KEYS.projects, p) }

export function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function getWeekDays(startIso) {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i))
}
