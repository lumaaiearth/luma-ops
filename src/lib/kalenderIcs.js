// ─────────────────────────────────────────────────────────────────────────────
// iCalendar (.ics) lesen und schreiben
//
// Lesen: für das Abo des Google-Kalenders (Edge Function kalender-sync liest
// die geheime iCal-Adresse serverseitig — vorher ging der Import über einen
// fremden CORS-Proxy, der damit die geheime Adresse kannte).
// Schreiben: geplante Pflegetermine als .ics zum Import in Google.
//
// Bewusst ohne Abhängigkeiten, damit dieselbe Datei im Browser, in Node (Test)
// und in Deno (Edge Function) läuft. Die Function enthält eine Kopie; der Test
// prüft, dass beide gleich sind.
// Geprüft mit scripts/test-kalender-ics.mjs
// ─────────────────────────────────────────────────────────────────────────────

const ZEITZONE = 'Europe/Berlin'
const TAGE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** Fortsetzungszeilen zusammenführen (RFC 5545, 3.1). */
export function entfalten(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
}

const textWert = s => String(s ?? '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
const textEscape = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Eine Zeile „NAME;PARAM=x:WERT“ zerlegen. */
function zeile(z) {
  const i = z.indexOf(':')
  if (i < 0) return null
  const kopf = z.slice(0, i), wert = z.slice(i + 1)
  const [name, ...params] = kopf.split(';')
  const p = {}
  for (const x of params) { const j = x.indexOf('='); if (j > 0) p[x.slice(0, j).toUpperCase()] = x.slice(j + 1).replace(/^"|"$/g, '') }
  return { name: name.toUpperCase(), params: p, wert }
}

const pad = n => String(n).padStart(2, '0')
const isoDatum = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

/** UTC-Zeitpunkt → Datum und Uhrzeit in Berlin. */
function inBerlin(ms) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: ZEITZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const t = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  return { datum: `${t.year}-${t.month}-${t.day}`, zeit: `${t.hour}:${t.minute}` }
}

/**
 * Datumswert lesen. Ergebnis immer in Berliner Ortszeit:
 * { datum: 'YYYY-MM-DD', zeit: 'HH:MM' | null (ganztags) }
 * Zeiten mit anderer TZID als Berlin werden über UTC umgerechnet, soweit die
 * Zeitzone dem Browser/Laufzeit bekannt ist; sonst als Ortszeit genommen.
 */
export function datumLesen(wert, params = {}) {
  const m = String(wert || '').match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (params.VALUE === 'DATE' || h === undefined) return { datum: isoDatum(y, mo, d), zeit: null }
  if (z) return inBerlin(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)))
  const tz = params.TZID
  if (tz && tz !== ZEITZONE) {
    try {
      // Ortszeit in tz → UTC: Versatz der Zone zu diesem Zeitpunkt bestimmen
      const naiv = Date.UTC(+y, +mo - 1, +d, +h, +mi)
      const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      const t = Object.fromEntries(f.formatToParts(new Date(naiv)).map(x => [x.type, x.value]))
      const dort = Date.UTC(+t.year, +t.month - 1, +t.day, +t.hour, +t.minute)
      return inBerlin(naiv - (dort - naiv))
    } catch { /* unbekannte Zone: als Ortszeit nehmen */ }
  }
  return { datum: isoDatum(y, mo, d), zeit: `${h}:${mi}` }
}

// ── Datumsrechnung auf Kalendertagen (ohne Zeitzonen) ───────────────────────
const alsTag = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5
const ausTag = t => { const d = new Date(t * 864e5); return isoDatum(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) }
export const plusTage = (iso, n) => ausTag(alsTag(iso) + n)
export const wochentag = iso => new Date(alsTag(iso) * 864e5).getUTCDay()   // 0 = So
const tageImMonat = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** RRULE in Einzeltermine (Startdaten) im Fenster [von, bis] aufschlüsseln. */
export function wiederholungen(startIso, rrule, { von, bis, max = 1500, startZeit = null } = {}) {
  const r = Object.fromEntries(String(rrule).split(';').map(x => x.split('=')).filter(x => x.length === 2).map(([k, v]) => [k.toUpperCase(), v]))
  const freq = r.FREQ
  const intervall = Math.max(1, Number(r.INTERVAL) || 1)
  const anzahl = r.COUNT ? Number(r.COUNT) : Infinity
  // UNTIL mit Uhrzeit: ein Termin am letzten Tag zählt nur, wenn er nicht später beginnt
  const bisZeit = r.UNTIL ? datumLesen(r.UNTIL) : null
  const ende = bisZeit ? (bisZeit.zeit && startZeit && startZeit > bisZeit.zeit ? plusTage(bisZeit.datum, -1) : bisZeit.datum) : null
  const grenze = [bis, ende].filter(Boolean).sort()[0] || plusTage(startIso, 3 * 365)
  const byday = r.BYDAY ? r.BYDAY.split(',').map(x => { const t = x.match(/^([+-]?\d+)?([A-Z]{2})$/); return t ? { n: t[1] ? Number(t[1]) : null, tag: TAGE.indexOf(t[2]) } : null }).filter(Boolean) : null
  const bymonthday = r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null
  const out = []
  let gezaehlt = 0
  const nimm = iso => {
    if (iso < startIso || iso > grenze || gezaehlt >= anzahl) return false
    gezaehlt++
    if (!von || iso >= von) out.push(iso)
    return true
  }
  const y0 = +startIso.slice(0, 4), m0 = +startIso.slice(5, 7)
  for (let schritt = 0; ; schritt++) {
    // gezaehlt ändert sich in nimm()
    if (out.length >= max || gezaehlt >= anzahl) break
    let kandidaten = []
    if (freq === 'DAILY') kandidaten = [plusTage(startIso, schritt * intervall)]
    else if (freq === 'WEEKLY') {
      const wochenStart = plusTage(startIso, schritt * 7 * intervall - ((wochentag(startIso) + 6) % 7))   // Montag
      const tage = byday ? byday.map(b => b.tag) : [wochentag(startIso)]
      kandidaten = tage.map(t => plusTage(wochenStart, (t + 6) % 7)).sort()
    } else if (freq === 'MONTHLY') {
      const mIndex = (m0 - 1) + schritt * intervall
      const y = y0 + Math.floor(mIndex / 12), m = (mIndex % 12) + 1
      const n = tageImMonat(y, m)
      if (byday) {
        for (const b of byday) {
          const alle = []
          for (let d = 1; d <= n; d++) if (wochentag(isoDatum(y, m, d)) === b.tag) alle.push(isoDatum(y, m, d))
          if (b.n == null) kandidaten.push(...alle)
          else { const x = b.n > 0 ? alle[b.n - 1] : alle[alle.length + b.n]; if (x) kandidaten.push(x) }
        }
      } else {
        for (const d of bymonthday || [+startIso.slice(8, 10)]) { const dd = d < 0 ? n + d + 1 : d; if (dd >= 1 && dd <= n) kandidaten.push(isoDatum(y, m, dd)) }
      }
      kandidaten.sort()
    } else if (freq === 'YEARLY') {
      const y = y0 + schritt * intervall
      const d = Math.min(+startIso.slice(8, 10), tageImMonat(y, m0))
      kandidaten = [isoDatum(y, m0, d)]
    } else return [startIso]
    if (!kandidaten.length && schritt > 600) break
    if (kandidaten.length && kandidaten[0] > grenze) break
    for (const k of kandidaten) nimm(k)
  }
  return out
}

/**
 * ICS-Text → Termine im Fenster. Serien werden aufgeschlüsselt, Ausnahmen
 * (EXDATE) entfernt, geänderte Einzeltermine (RECURRENCE-ID) übernommen,
 * abgesagte (STATUS:CANCELLED) markiert.
 * @returns {{uid, start_datum, start_zeit, ende_datum, ende_zeit, ganztags, titel, ort, beschreibung, abgesagt}[]}
 */
export function icsLesen(text, { von = null, bis = null } = {}) {
  const roh = []
  let ev = null
  for (const z of entfalten(text).split('\n')) {
    if (z === 'BEGIN:VEVENT') { ev = { exdate: [] }; continue }
    if (z === 'END:VEVENT') { if (ev) roh.push(ev); ev = null; continue }
    if (!ev) continue
    const p = zeile(z)
    if (!p) continue
    switch (p.name) {
      case 'UID': ev.uid = p.wert.trim(); break
      case 'SUMMARY': ev.titel = textWert(p.wert).trim(); break
      case 'LOCATION': ev.ort = textWert(p.wert).trim(); break
      case 'DESCRIPTION': ev.beschreibung = textWert(p.wert).trim(); break
      case 'DTSTART': ev.start = datumLesen(p.wert, p.params); break
      case 'DTEND': ev.ende = datumLesen(p.wert, p.params); break
      case 'DURATION': ev.dauer = p.wert; break
      case 'RRULE': ev.rrule = p.wert; break
      case 'EXDATE': for (const w of p.wert.split(',')) { const d = datumLesen(w, p.params); if (d) ev.exdate.push(d.datum) } break
      case 'RECURRENCE-ID': ev.recurrence = datumLesen(p.wert, p.params)?.datum; break
      case 'STATUS': ev.status = p.wert.trim().toUpperCase(); break
    }
  }

  const ausnahmen = new Map()   // uid|datum → geänderter Einzeltermin
  for (const e of roh) if (e.recurrence && e.uid) ausnahmen.set(`${e.uid}|${e.recurrence}`, e)

  const zuTermin = (e, startDatum) => {
    const s = e.start, en = e.ende
    const versatz = s && en ? alsTag(en.datum) - alsTag(s.datum) : 0
    // Ganztägige Termine enden laut RFC am Folgetag (exklusiv)
    const endeDatum = en ? plusTage(startDatum, s.zeit == null ? Math.max(0, versatz - 1) : versatz) : startDatum
    return {
      uid: e.uid || `${e.titel || 'termin'}-${startDatum}`,
      start_datum: startDatum, start_zeit: s.zeit, ende_datum: endeDatum, ende_zeit: en?.zeit ?? null,
      ganztags: s.zeit == null, titel: e.titel || '', ort: e.ort || '', beschreibung: e.beschreibung || '',
      abgesagt: e.status === 'CANCELLED',
    }
  }

  const out = []
  for (const e of roh) {
    if (!e.start || e.recurrence) continue
    const daten = e.rrule ? wiederholungen(e.start.datum, e.rrule, { von, bis, startZeit: e.start.zeit }) : [e.start.datum]
    for (const d of daten) {
      if (e.exdate.includes(d)) continue
      const geaendert = ausnahmen.get(`${e.uid}|${d}`)
      if (geaendert) continue          // kommt unten als eigener Termin
      if ((von && d < von) || (bis && d > bis)) continue
      out.push(zuTermin(e, d))
    }
  }
  for (const e of ausnahmen.values()) {
    if (!e.start) continue
    const d = e.start.datum
    if ((von && d < von) || (bis && d > bis)) continue
    out.push(zuTermin(e, d))
  }
  return out.sort((a, b) => (a.start_datum + (a.start_zeit || '')).localeCompare(b.start_datum + (b.start_zeit || '')))
}

// ── Schreiben ────────────────────────────────────────────────────────────────

const faltZeile = z => {
  // höchstens 75 Oktette je Zeile; hier vereinfacht nach Zeichen (UTF-8-sicher genug für Import)
  const teile = []
  for (let i = 0; i < z.length; i += 73) teile.push((i ? ' ' : '') + z.slice(i, i + 73))
  return teile.join('\r\n')
}
const kompakt = iso => iso.replace(/-/g, '')

/**
 * Termine als .ics (Ortszeit Europe/Berlin).
 * @param {{uid, datum, start?, ende?, titel, ort?, beschreibung?}[]} termine  start/ende 'HH:MM'; ohne start ganztags
 */
export function icsSchreiben(termine, { name = 'LUMA Pflege' } = {}) {
  const jetzt = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const z = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LUMA Ops//Pflegeplanung//DE', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${textEscape(name)}`, `X-WR-TIMEZONE:${ZEITZONE}`]
  for (const t of termine) {
    z.push('BEGIN:VEVENT', `UID:${t.uid}`, `DTSTAMP:${jetzt}`)
    if (t.start) {
      z.push(`DTSTART;TZID=${ZEITZONE}:${kompakt(t.datum)}T${t.start.replace(':', '')}00`)
      z.push(`DTEND;TZID=${ZEITZONE}:${kompakt(t.datum)}T${(t.ende || t.start).replace(':', '')}00`)
    } else {
      z.push(`DTSTART;VALUE=DATE:${kompakt(t.datum)}`, `DTEND;VALUE=DATE:${kompakt(plusTage(t.datum, 1))}`)
    }
    z.push(`SUMMARY:${textEscape(t.titel)}`)
    if (t.ort) z.push(`LOCATION:${textEscape(t.ort)}`)
    if (t.beschreibung) z.push(`DESCRIPTION:${textEscape(t.beschreibung)}`)
    z.push('END:VEVENT')
  }
  z.push('END:VCALENDAR')
  return z.map(faltZeile).join('\r\n') + '\r\n'
}
