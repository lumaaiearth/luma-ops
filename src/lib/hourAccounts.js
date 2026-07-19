// ── Stundenkonto-Logik ────────────────────────────────────────────────────────
// Regeln kommen aus Supabase (hour_rules), Fallback ist HOUR_TARGETS in seed.js.
//
// Regeltypen:
//   monthly  — X h je bezahltem Monat (paid_months = ["2026-01", …]),
//              Startwert des Kontos = −carryover (Stundenschulden Vorjahr).
//              Vorgabe Malte 07/2026: 30,88 h/Monat für Jona & Felix.
//   weekly   — X h je Woche (Soll = Wochen-Soll × Anzahl Montage im Monat)
//   balance  — kein Soll, GF-Balance (Malte/Lukas)
//   project  — kein Soll, projektbasiert (Robert)

import { HOUR_TARGETS } from '../data/seed.js'

// DB-Zeile (hour_rules) → einheitliches Regel-Objekt; ohne Zeile: seed-Fallback
export function normalizeRule(dbRow, uid) {
  if (dbRow) {
    return {
      type: dbRow.rule_type,
      monthly: Number(dbRow.monthly_hours) || 0,
      weekly: Number(dbRow.weekly_hours) || 0,
      paid_months: Array.isArray(dbRow.paid_months) ? dbRow.paid_months : [],
      carryover: Number(dbRow.carryover_hours) || 0,
      note: dbRow.note || '',
    }
  }
  const t = HOUR_TARGETS[uid]
  if (!t) return null
  return {
    type: t.type,
    monthly: t.monthly || 0,
    weekly: t.weekly || 0,
    paid_months: t.paid_months || [],
    carryover: t.carryover || 0,
    note: '',
  }
}

export function hasKonto(rule) {
  return rule && (rule.type === 'weekly' || rule.type === 'monthly')
}

function mondaysInMonth(year, month) {
  let mondays = 0
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 1) mondays++
    d.setDate(d.getDate() + 1)
  }
  return mondays
}

// SOLL-Stunden einer Person in einem Monat
export function monthlyTarget(rule, year, month) {
  if (!rule) return 0
  if (rule.type === 'weekly') return rule.weekly * mondaysInMonth(year, month)
  if (rule.type === 'monthly') {
    const key = `${year}-${String(month).padStart(2, '0')}`
    return rule.paid_months.includes(key) ? rule.monthly : 0
  }
  return 0
}

export function monthlyActual(entries, userId, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return entries.filter(e => e.user_id === userId && e.date?.startsWith(prefix))
    .reduce((s, e) => s + Number(e.hours), 0)
}

// Jahres-Soll (nur informativ; bei monthly = Summe der bezahlten Monate)
export function yearTargetTotal(rule, year) {
  if (!hasKonto(rule)) return null
  return Array.from({ length: 12 }, (_, i) => monthlyTarget(rule, year, i + 1))
    .reduce((s, v) => s + v, 0) + (rule.carryover || 0)
}

// Kumulierter Kontostand bis zum aktuellen Monat.
// Positiv = Guthaben (mehr gearbeitet als geschuldet), negativ = Rückstand.
export function kontostand(rule, entries, uid, uptoMonth = null) {
  if (!hasKonto(rule)) return null
  const year = new Date().getFullYear()
  const nowMonth = uptoMonth ?? (new Date().getMonth() + 1)
  let cumulative = -(rule.carryover || 0)
  for (let m = 1; m <= nowMonth; m++) {
    cumulative += monthlyActual(entries, uid, year, m) - monthlyTarget(rule, year, m)
  }
  return Math.round(cumulative * 100) / 100
}

// Monatstabelle für die Kontostand-Karte: [{m, soll, ist, saldo, kum}]
export function kontoMonthData(rule, entries, uid) {
  const year = new Date().getFullYear()
  const nowMonth = new Date().getMonth() + 1
  let cumulative = -(rule?.carryover || 0)
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const soll = monthlyTarget(rule, year, m)
    const ist = m <= nowMonth ? monthlyActual(entries, uid, year, m) : null
    const saldo = ist !== null ? Math.round((ist - soll) * 100) / 100 : null
    if (saldo !== null) cumulative = Math.round((cumulative + saldo) * 100) / 100
    return { m, soll, ist, saldo, kum: saldo !== null ? cumulative : null }
  })
}

// "HH:MM" − "HH:MM" → Dezimalstunden (auf 2 Stellen gerundet), null wenn unvollständig
export function hoursFromTimes(start, end) {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some(Number.isNaN)) return null
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60 // über Mitternacht
  return Math.round((mins / 60) * 100) / 100
}
