// Die früheren get*/save*-Helfer (localStorage mit Demodaten aus seed.js als
// Ersatz) sind entfernt: save* wurde nie aufgerufen, get* lieferte deshalb
// immer die Demodaten — und die erschienen, sobald eine Abfrage leer war.

export function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function toLocalIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoToday() {
  return toLocalIso(new Date())
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toLocalIso(d)
}

export function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toLocalIso(d)
}

export function getWeekDays(startIso) {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i))
}
