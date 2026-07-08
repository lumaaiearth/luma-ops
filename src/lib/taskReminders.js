import { TEAM, TASK_STATUSES } from '../data/seed.js'
import { tgSend, tgGroups } from './telegram.js'
import { isoToday } from './storage.js'

function fmt(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}
const person = id => TEAM.find(u => u.id === id)?.name || null
const isOpen = t => t.status !== 'done' && t.status !== 'archive'

// Baut einen kompakten Morgen-Digest: überfällige + heute fällige Aufgaben.
export function buildTaskReminder(tasks, projects = []) {
  const today = isoToday()
  const proj = id => projects.find(p => p.id === id)?.name || ''

  const open = (tasks || []).filter(isOpen)
  const overdue = open.filter(t => t.due_date && t.due_date < today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const dueToday = open.filter(t => t.due_date === today)
  if (overdue.length === 0 && dueToday.length === 0) return null

  const line = t => {
    const who = t.owner_id ? person(t.owner_id) : null
    const p = proj(t.project_id)
    const meta = [who, p].filter(Boolean).join(' · ')
    return `  • ${t.title}${meta ? ` — ${meta}` : ''}`
  }

  const lines = [`<b>✅ LUMA Aufgaben — ${fmt(today)}</b>`, '']
  if (overdue.length) {
    lines.push(`<b>❗ Überfällig (${overdue.length})</b>`)
    overdue.forEach(t => lines.push(`${line(t)} <i>(seit ${fmt(t.due_date)})</i>`))
    lines.push('')
  }
  if (dueToday.length) {
    lines.push(`<b>📅 Heute fällig (${dueToday.length})</b>`)
    dueToday.forEach(t => lines.push(line(t)))
  }
  return lines.join('\n')
}

// Feuert einmal pro Tag im Morgenfenster beim App-Start (wie die Wochenübersicht).
export function maybeSendTaskReminders(tasks, projects) {
  const now = new Date()
  const isMorning = now.getHours() >= 7 && now.getHours() < 11
  if (!isMorning) return

  const todayKey = `luma_taskreminder_sent_${now.toISOString().slice(0, 10)}`
  if (localStorage.getItem(todayKey)) return

  const text = buildTaskReminder(tasks, projects)
  if (!text) return
  localStorage.setItem(todayKey, '1')

  const sent = new Set()
  for (const chatId of Object.values(tgGroups())) {
    if (chatId && !sent.has(chatId)) { tgSend(chatId, text); sent.add(chatId) }
  }
}
