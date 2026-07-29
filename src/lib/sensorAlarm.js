// Alarmregeln für Sensoren.
//
// Bisher gab es genau eine fest verdrahtete Regel: Unterschreitung von
// threshold_low × 0,6 → Telegram an die PM-Gruppe + Gieß-Aufgabe. Das reichte
// für Bodenfeuchte, ließ aber alles andere liegen — eine Überschreitung
// (Staunässe, Hitze) löste nie etwas aus, obwohl `threshold_high` seit jeher
// in der Tabelle steht, und schwankende Werte an der Grenze konnten Alarme
// im Minutentakt erzeugen.
//
// Dieses Modul ist reine Logik ohne Seiteneffekte: Wer benachrichtigt wird und
// ob eine Aufgabe entsteht, entscheidet `pruefeAlarm`; das Versenden macht der
// Aufrufer (OpsContext). So ist die Regelauswertung testbar.

export const STUFEN = {
  ok:       { rang: 0, label: 'OK',       emoji: '✅' },
  warning:  { rang: 1, label: 'Warnung',  emoji: '⚠️' },
  critical: { rang: 2, label: 'Kritisch', emoji: '🚨' },
}
const rang = s => STUFEN[s]?.rang ?? 0

export const TELEGRAM_ZIELE = [
  { id: 'pflege', label: 'Pflege-Gruppe' },
  { id: 'pm',     label: 'PM-Gruppe' },
  { id: 'inter',  label: 'Interne Gruppe' },
  { id: 'aus',    label: 'Keine Nachricht' },
]

export const AUFGABE_AB = [
  { id: 'critical', label: 'nur bei „Kritisch"' },
  { id: 'warning',  label: 'schon bei „Warnung"' },
  { id: 'aus',      label: 'keine Aufgabe' },
]

/**
 * Vollständige Regel eines Sensors — ergänzt fehlende Felder aus den alten
 * Spalten `threshold_low`/`threshold_high`, damit bestehende Sensoren sich
 * genau wie vorher verhalten, bis jemand die Regel bewusst anpasst.
 */
export function alarmRegel(sensor) {
  const cfg = sensor?.alarm_config || {}
  const low = num(sensor?.threshold_low)
  const high = num(sensor?.threshold_high)

  const warn_low  = pick(cfg.warn_low, low)
  // 0,6 × Mindestwert war die bisher fest verdrahtete Kritisch-Schwelle.
  const krit_low  = pick(cfg.krit_low, low != null ? round2(low * 0.6) : null)
  const warn_high = pick(cfg.warn_high, high)
  // Bewusst ohne Vorgabe: „zu viel" ist je nach Messgröße harmlos (Regen) oder
  // gefährlich (Hitze) — das muss jemand entscheiden, wir raten nicht.
  const krit_high = pick(cfg.krit_high, null)

  const spanne = warn_low != null && warn_high != null ? Math.abs(warn_high - warn_low) : null
  const hysterese = pick(cfg.hysterese, spanne ? round2(spanne * 0.03) : 0) || 0

  return {
    aktiv: cfg.aktiv !== false,
    warn_low, krit_low, warn_high, krit_high,
    hysterese,
    ruhe_min: pick(cfg.ruhe_min, 240),
    min_dauer_min: pick(cfg.min_dauer_min, 10),
    telegram: cfg.telegram || 'pm',
    aufgabe: cfg.aufgabe || 'critical',
    board_id: cfg.board_id || 'b_pflege',
    entwarnung: cfg.entwarnung !== false,
  }
}

function num(v) { const n = Number(v); return v == null || v === '' || Number.isNaN(n) ? null : n }
function pick(v, fallback) { const n = num(v); return n == null ? fallback : n }
function round2(v) { return Math.round(v * 100) / 100 }

/** Rohe Einstufung eines Wertes ohne Hysterese. */
function stufeFuer(r, v) {
  if (r.krit_low != null && v < r.krit_low)   return { stufe: 'critical', richtung: 'unter', grenze: r.krit_low }
  if (r.krit_high != null && v > r.krit_high) return { stufe: 'critical', richtung: 'ueber', grenze: r.krit_high }
  if (r.warn_low != null && v < r.warn_low)   return { stufe: 'warning',  richtung: 'unter', grenze: r.warn_low }
  if (r.warn_high != null && v > r.warn_high) return { stufe: 'warning',  richtung: 'ueber', grenze: r.warn_high }
  return { stufe: 'ok', richtung: null, grenze: null }
}

/** Schwellen um die Hysteresespanne verschieben — erschwert das Entwarnen. */
function verschoben(r, richtung, h) {
  if (!h || !richtung) return r
  return richtung === 'unter'
    ? { ...r, warn_low:  r.warn_low  != null ? r.warn_low  + h : null,
              krit_low:  r.krit_low  != null ? r.krit_low  + h : null }
    : { ...r, warn_high: r.warn_high != null ? r.warn_high - h : null,
              krit_high: r.krit_high != null ? r.krit_high - h : null }
}

/**
 * Wertet einen neuen Messwert gegen die Regel aus.
 *
 * @param sensor  Sensor-Datensatz (inkl. alarm_config / alarm_state)
 * @param value   neuer Messwert
 * @param jetzt   Zeitstempel in ms (injizierbar für Tests)
 * @returns {{stufe, richtung, grenze, wechsel, eskalation, melden, meldung,
 *           aufgabe, state}}
 *          `melden` = Telegram schicken, `aufgabe` = Aufgabendaten oder null,
 *          `state` = neuer Wert für sensors.alarm_state.
 */
export function pruefeAlarm({ sensor, value, jetzt = Date.now() }) {
  const r = alarmRegel(sensor)
  const st = sensor?.alarm_state || {}
  const vorher = STUFEN[st.stufe] ? st.stufe : (STUFEN[sensor?.status] ? sensor.status : 'ok')
  const vorRichtung = vorher === 'ok' ? null : (st.richtung || 'unter')
  const v = num(value)

  // Kein verwertbarer Messwert (frisch gesetzter Sensor, Ausfall): Zustand
  // unverändert lassen — `Number(null) === 0` hätte hier sonst jeden Sensor
  // ohne Messung als kritisch trocken gemeldet.
  if (v == null) {
    return {
      stufe: vorher, richtung: vorRichtung, grenze: null, wechsel: false, eskalation: false,
      melden: false, art: null, meldung: null, ziel: r.telegram, aufgabe: null, state: st,
    }
  }
  if (!r.aktiv) {
    return {
      stufe: 'ok', richtung: null, grenze: null, wechsel: vorher !== 'ok', eskalation: false,
      melden: false, art: null, meldung: null, ziel: 'aus', aufgabe: null,
      state: { stufe: 'ok', richtung: null, seit: new Date(jetzt).toISOString(), gemeldet_ts: null, gemeldet_stufe: null },
    }
  }

  const roh = stufeFuer(r, v)
  let erg = roh
  // Nur beim Herabstufen bremsen — sonst würde die Hysterese Alarme auslösen,
  // die der reine Messwert gar nicht hergibt.
  if (rang(roh.stufe) < rang(vorher) && r.hysterese > 0 && vorRichtung) {
    const gehalten = stufeFuer(verschoben(r, vorRichtung, r.hysterese), v)
    if (rang(gehalten.stufe) > rang(roh.stufe)) {
      erg = rang(gehalten.stufe) > rang(vorher)
        ? { stufe: vorher, richtung: vorRichtung, grenze: gehalten.grenze }
        : gehalten
    }
  }

  const wechsel = erg.stufe !== vorher
  const eskalation = rang(erg.stufe) > rang(vorher)
  const letzteMeldung = st.gemeldet_ts ? Date.parse(st.gemeldet_ts) : 0
  const ruheVorbei = !letzteMeldung || jetzt - letzteMeldung >= r.ruhe_min * 60_000
  // Wie lange die bisherige Stufe schon hält. Ein Wert, der um eine Schwelle
  // pendelt, würde sonst im Takt der Messungen Nachrichten erzeugen; ein
  // echter Notfall (Eskalation auf „kritisch") wird davon nie aufgehalten.
  const dauer = st.seit ? jetzt - Date.parse(st.seit) : Infinity
  const langGenug = !Number.isFinite(dauer) || dauer >= r.min_dauer_min * 60_000

  let melden = false
  let art = null
  if (r.telegram !== 'aus') {
    if (eskalation && erg.stufe === 'critical') { melden = true; art = 'eskalation' }
    else if (eskalation) { melden = langGenug; art = 'eskalation' }
    else if (wechsel && erg.stufe === 'ok') { melden = r.entwarnung && !!st.gemeldet_ts && langGenug; art = 'entwarnung' }
    else if (wechsel) { melden = langGenug; art = 'entspannung' }     // kritisch → Warnung
    else if (erg.stufe === 'critical' && ruheVorbei) { melden = true; art = 'erinnerung' }
  }

  const aufgabeAb = r.aufgabe === 'aus' ? null : r.aufgabe
  const aufgabe = aufgabeAb && eskalation && rang(erg.stufe) >= rang(aufgabeAb)
    ? aufgabenVorschlag(sensor, v, erg, r)
    : null

  const seit = wechsel ? new Date(jetzt).toISOString() : (st.seit || new Date(jetzt).toISOString())
  return {
    stufe: erg.stufe, richtung: erg.richtung, grenze: erg.grenze,
    wechsel, eskalation, melden, art,
    meldung: melden ? meldungsText(sensor, v, erg, art) : null,
    ziel: r.telegram,
    aufgabe,
    // `gemeldet_*` gehört zum laufenden Alarm — mit der Rückkehr auf OK ist er
    // vorbei und die Felder werden geleert.
    state: {
      stufe: erg.stufe,
      richtung: erg.richtung,
      seit,
      gemeldet_ts: erg.stufe === 'ok' ? null : (melden ? new Date(jetzt).toISOString() : st.gemeldet_ts || null),
      gemeldet_stufe: erg.stufe === 'ok' ? null : (melden ? erg.stufe : st.gemeldet_stufe || null),
    },
  }
}

/* ─── Texte ───────────────────────────────────────────────────────────────── */

const MASSNAHME = {
  soil_moisture: { unter: 'Bewässerung prüfen — der Boden ist zu trocken.',
                   ueber: 'Auf Staunässe prüfen — Drainage oder Bewässerungsmenge korrigieren.' },
  soil_temp:     { unter: 'Frostschutz prüfen.', ueber: 'Beschattung/Mulchen prüfen — der Boden überhitzt.' },
  air_temp:      { unter: 'Frostschutz prüfen.', ueber: 'Hitzestress: Bewässerung und Beschattung prüfen.' },
  rainfall:      { unter: 'Anhaltende Trockenheit — Bewässerungsintervall anpassen.',
                   ueber: 'Starkregen: Abfluss und Versickerung vor Ort prüfen.' },
}
const AUFGABE_TYP = {
  soil_moisture: { unter: 'giessen', ueber: 'pflege' },
  soil_temp:     { unter: 'pflege',  ueber: 'pflege' },
  air_temp:      { unter: 'pflege',  ueber: 'giessen' },
  rainfall:      { unter: 'giessen', ueber: 'pflege' },
}

export function massnahmeText(sensor, richtung) {
  return MASSNAHME[sensor?.type]?.[richtung]
    || (richtung === 'unter' ? 'Wert unter dem Sollbereich — vor Ort prüfen.' : 'Wert über dem Sollbereich — vor Ort prüfen.')
}

function fmt(v, unit) { return `${Math.round(v * 10) / 10}${unit || ''}` }

function meldungsText(sensor, v, erg, art) {
  const u = sensor?.unit || ''
  const name = sensor?.name || 'Sensor'
  if (art === 'entwarnung') {
    return `✅ <b>Entwarnung</b>\n<b>${name}</b>\nWieder im Sollbereich: ${fmt(v, u)}`
  }
  const kopf = art === 'erinnerung' ? 'Weiterhin kritisch' : `Sensor ${STUFEN[erg.stufe].label.toLowerCase()}`
  const wort = erg.richtung === 'unter' ? 'unter' : 'über'
  return `${STUFEN[erg.stufe].emoji} <b>${kopf}</b>\n<b>${name}</b>\n`
    + `Aktuell ${fmt(v, u)} — ${wort} der Grenze ${fmt(erg.grenze, u)}\n`
    + massnahmeText(sensor, erg.richtung)
}

function aufgabenVorschlag(sensor, v, erg, r) {
  const u = sensor?.unit || ''
  const richtungswort = erg.richtung === 'unter' ? 'zu niedrig' : 'zu hoch'
  return {
    title: `${sensor?.name || 'Sensor'}: Wert ${richtungswort}`,
    description: `Messwert ${fmt(v, u)} (Grenze ${fmt(erg.grenze, u)}, Stufe ${STUFEN[erg.stufe].label}).\n${massnahmeText(sensor, erg.richtung)}`,
    board_id: r.board_id,
    task_type: AUFGABE_TYP[sensor?.type]?.[erg.richtung] || 'pflege',
    priority: erg.stufe === 'critical' ? 'high' : 'medium',
  }
}

/** Kurzfassung der Regel für die Oberfläche. */
export function regelZusammenfassung(sensor) {
  const r = alarmRegel(sensor)
  const u = sensor?.unit || ''
  if (!r.aktiv) return 'Alarm ausgeschaltet'
  const t = []
  if (r.krit_low != null) t.push(`kritisch < ${r.krit_low}${u}`)
  if (r.warn_low != null) t.push(`Warnung < ${r.warn_low}${u}`)
  if (r.warn_high != null) t.push(`Warnung > ${r.warn_high}${u}`)
  if (r.krit_high != null) t.push(`kritisch > ${r.krit_high}${u}`)
  return t.join(' · ') || 'keine Schwellen gesetzt'
}
