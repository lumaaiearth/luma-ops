import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Keywords that indicate non-regular pickups to skip
const EXCLUDE_KEYWORDS = ['sperrmüll', 'großmüll', 'schadstoff', 'problemstoff', 'sondermüll', 'elektro']

const BIN_EMOJI: Record<string, string> = {
  rest: '🗑️',
  bio: '🟤',
  papier: '📦',
  gelb: '🟡',
  wertstoff: '🟡',
  glas: '🍾',
}

// Unfold iCal long lines (CRLF + whitespace = continuation)
function unfoldIcal(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

function parseIcal(text: string): Array<{ summary: string; date: string }> {
  const unfolded = unfoldIcal(text)
  const events: Array<{ summary: string; date: string }> = []
  const blocks = unfolded.split(/BEGIN:VEVENT/)

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    const summaryMatch = block.match(/^SUMMARY[^:]*:(.+)$/m)
    const dtstartMatch = block.match(/^DTSTART[^:]*:(.+)$/m)

    if (!summaryMatch || !dtstartMatch) continue

    const summary = summaryMatch[1].trim()
    // Strip time part, normalise to YYYYMMDD
    const rawDate = dtstartMatch[1].trim().replace(/T.*$/, '').replace(/-/g, '')
    if (rawDate.length < 8) continue

    const iso = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
    events.push({ summary, date: iso })
  }

  return events
}

// Returns tomorrow's date as YYYY-MM-DD in the Europe/Berlin timezone
function tomorrowBerlin(): string {
  const now = new Date()
  // Add one day in milliseconds
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  // Format in Berlin local time
  return tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
}

function shouldExclude(summary: string): boolean {
  const lower = summary.toLowerCase()
  return EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw))
}

function binEmoji(summary: string): string {
  const lower = summary.toLowerCase()
  for (const [key, emoji] of Object.entries(BIN_EMOJI)) {
    if (lower.includes(key)) return emoji
  }
  return '🗑️'
}

Deno.serve(async () => {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Read settings
    const { data: rows, error: settingsErr } = await sb
      .from('app_settings')
      .select('key, value')
      .in('key', ['trash_ical_url', 'trash_tg_token', 'trash_tg_chat_id'])

    if (settingsErr) throw settingsErr

    const cfg: Record<string, string> = {}
    for (const row of rows ?? []) cfg[row.key] = row.value

    const icalUrl = cfg['trash_ical_url']
    const tgToken = cfg['trash_tg_token']
    const chatId = cfg['trash_tg_chat_id']

    if (!icalUrl || !tgToken || !chatId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Fehlende Einstellungen: trash_ical_url, trash_tg_token oder trash_tg_chat_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Fetch iCal
    const icalRes = await fetch(icalUrl)
    if (!icalRes.ok) throw new Error(`iCal-Abruf fehlgeschlagen: HTTP ${icalRes.status}`)
    const icalText = await icalRes.text()

    // Parse & filter
    const tomorrow = tomorrowBerlin()
    const events = parseIcal(icalText)
      .filter((e) => e.date === tomorrow)
      .filter((e) => !shouldExclude(e.summary))

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, tomorrow, reason: 'Keine reguläre Abholung morgen' }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Build Telegram message
    const dateLabel = new Date(tomorrow + 'T12:00:00Z').toLocaleDateString('de-DE', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    const lines = [`🗓 <b>Müllabfuhr morgen, ${dateLabel}!</b>`, '']
    for (const ev of events) {
      lines.push(`${binEmoji(ev.summary)} ${ev.summary}`)
    }
    lines.push('')
    lines.push('<i>Bitte Tonne rechtzeitig rausstellen.</i>')

    const text = lines.join('\n')

    const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })

    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram-Fehler: ${JSON.stringify(tgData)}`)

    return new Response(
      JSON.stringify({ ok: true, sent: true, events, tomorrow }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
