// ─────────────────────────────────────────────────────────────────────────────
// Einsatz abschließen: Vorschlag der Stunden je Person
//
// Reine Logik ohne React, geprüft mit scripts/test-einsatz-abschluss.mjs.
// Der Dialog (src/components/EinsatzAbschliessen.jsx) bucht damit die Zeit
// direkt auf den Einsatz (time_entries.job_id) — der Weg, über den Plan/Ist,
// Stundenkonten und der Leistungsnachweis überhaupt erst Daten bekommen.
// ─────────────────────────────────────────────────────────────────────────────

const viertel = (h) => Math.round(h * 4) / 4

/** Dauer zwischen zwei Uhrzeiten "HH:MM" in Stunden; null, wenn nicht bestimmbar. */
export function dauerStunden(start, ende) {
  const m = (t) => {
    const r = /^(\d{1,2}):(\d{2})/.exec(t || '')
    return r ? Number(r[1]) * 60 + Number(r[2]) : null
  }
  const a = m(start), b = m(ende)
  if (a == null || b == null || b <= a) return null
  return viertel((b - a) / 60)
}

/**
 * Vorschlag: Stunden je eingeteilter Person.
 *   1. Start- und Endzeit am Einsatz → diese Dauer für jede Person
 *   2. sonst Soll-Stunden des Einsatzes, gleich auf die Personen verteilt
 *   3. sonst leer — dann trägt man selbst ein, statt eine Zahl zu raten
 * Bereits gebuchte Stunden einer Person werden abgezogen, damit ein zweites
 * Abschließen nichts doppelt bucht.
 *
 * @param {object} job       Einsatz (start_time, end_time, planned_hours, assigned_users)
 * @param {object[]} gebucht time_entries mit job_id dieses Einsatzes
 * @returns {Record<string, number|''>}
 */
export function vorschlagStunden(job, gebucht = []) {
  const personen = job?.assigned_users || []
  if (!personen.length) return {}
  const dauer = dauerStunden(job.start_time, job.end_time)
  const soll = Number(job.planned_hours) || 0
  const jePerson = dauer != null ? dauer : soll > 0 ? viertel(soll / personen.length) : null

  const schon = {}
  for (const e of gebucht) schon[e.user_id] = (schon[e.user_id] || 0) + Number(e.hours || 0)

  const v = {}
  for (const p of personen) {
    if (jePerson == null) { v[p] = ''; continue }
    const rest = viertel(jePerson - (schon[p] || 0))
    v[p] = rest > 0 ? rest : ''
  }
  return v
}
