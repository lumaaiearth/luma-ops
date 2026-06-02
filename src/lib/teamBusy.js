const PROXY = 'https://api.allorigins.win/raw?url='

function toIsoDate(s) {
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
}

function parseIcal(text, fromIso, toIso) {
  const busy = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i]
    const get = key => { const m = b.match(new RegExp(key + '[^:]*:([^\\r\\n]+)')); return m ? m[1].trim() : '' }
    const rawStart = get('DTSTART')
    const rawEnd = get('DTEND')
    if (!rawStart) continue

    const sClean = rawStart.replace(/.*:/, '')
    const eClean = rawEnd ? rawEnd.replace(/.*:/, '') : sClean

    const date = toIsoDate(sClean.slice(0, 8))
    const endDate = toIsoDate(eClean.slice(0, 8))
    const allDay = !rawStart.includes('T')

    let start_time = null
    let end_time = null
    if (!allDay) {
      const tStart = sClean.replace(/.*T/, '').slice(0, 4)
      start_time = `${tStart.slice(0,2)}:${tStart.slice(2,4)}`
      if (rawEnd && eClean.includes('T')) {
        const tEnd = eClean.replace(/.*T/, '').slice(0, 4)
        end_time = `${tEnd.slice(0,2)}:${tEnd.slice(2,4)}`
      }
    }

    if (endDate < fromIso || date > toIso) continue
    busy.push({ date, endDate, start_time, end_time, allDay })
  }
  return busy
}

export async function fetchTeamBusy(userId, fromIso, toIso) {
  const url = localStorage.getItem(`luma_team_ical_${userId}`)
  if (!url) return []
  try {
    const res = await fetch(PROXY + encodeURIComponent(url))
    if (!res.ok) return []
    return parseIcal(await res.text(), fromIso, toIso)
  } catch { return [] }
}
