import { JOB_TYPES } from '../data/seed.js'
import { peopleForIds } from './people.js'
import { tgSend, tgGroups } from './telegram.js'

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function formatDate(iso) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

export function buildWeeklySummary(jobs, projects) {
  const { monday, sunday } = getWeekRange()
  const monIso = isoDate(monday)
  const sunIso = isoDate(sunday)

  const weekJobs = jobs.filter(j => j.date >= monIso && j.date <= sunIso)
  if (!weekJobs.length) return null

  const byDay = {}
  for (const job of weekJobs) {
    if (!byDay[job.date]) byDay[job.date] = []
    byDay[job.date].push(job)
  }

  const proj = id => projects.find(p => p.id === id)?.name || '—'
  const type = id => JOB_TYPES.find(t => t.id === id)?.label || id

  let lines = [`<b>📅 LUMA Woche ${formatDate(monIso)}–${formatDate(sunIso)}</b>`, '']

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  for (const date of Object.keys(byDay).sort()) {
    const dayIdx = (new Date(date).getDay() + 6) % 7
    lines.push(`<b>${days[dayIdx]} ${formatDate(date)}</b>`)
    for (const j of byDay[date]) {
      const assignees = peopleForIds(j.assigned_users).map(u => u.name).join(', ')
      const time = j.start_time ? ` ${j.start_time}${j.end_time ? `–${j.end_time}` : ''}` : ''
      lines.push(`  • ${j.title} [${type(j.job_type)}]${time}`)
      if (assignees) lines.push(`    👤 ${assignees}`)
      if (j.location) lines.push(`    📍 ${j.location.split(',')[0]}`)
    }
    lines.push('')
  }

  lines.push(`<i>${weekJobs.length} Einsatz${weekJobs.length !== 1 ? 'ätze' : ''} diese Woche</i>`)
  return lines.join('\n')
}

export function maybeSendWeeklySummary(jobs, projects) {
  const now = new Date()
  const isMonday = now.getDay() === 1
  const isEarlyMorning = now.getHours() >= 8 && now.getHours() < 10
  if (!isMonday || !isEarlyMorning) return

  const todayKey = `luma_weekly_sent_${now.toISOString().slice(0, 10)}`
  if (localStorage.getItem(todayKey)) return
  localStorage.setItem(todayKey, '1')

  const text = buildWeeklySummary(jobs, projects)
  if (!text) return

  const groups = tgGroups()
  const sent = new Set()
  for (const chatId of Object.values(groups)) {
    if (chatId && !sent.has(chatId)) {
      tgSend(chatId, text)
      sent.add(chatId)
    }
  }
}
