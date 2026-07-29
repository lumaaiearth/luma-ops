// Eingabemaske einer Alarmregel — identisch für die Vorlage eines Projekts
// und die Regel eines einzelnen Sensors. Bewusst eine gemeinsame Komponente:
// zwei Masken für dieselbe Regel driften auseinander, und dann bedeutet
// dasselbe Feld an zwei Stellen etwas anderes.
import { A, BG, BORDER, FG, MUTED, OK, WARN, DANGER } from '../lib/theme.js'
import { MONO, SANS } from './ui.jsx'
import { TELEGRAM_ZIELE, AUFGABE_AB } from '../lib/sensorAlarm.js'

const feldStyle = disabled => ({
  width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`,
  background: disabled ? 'transparent' : BG, color: FG, fontSize: 13, fontFamily: MONO,
  boxSizing: 'border-box', opacity: disabled ? 0.6 : 1,
})

export function NumFeld({ label, value, onChange, disabled, color, hint, placeholder }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: color || MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <input type="number" inputMode="decimal" value={value ?? ''} disabled={disabled} placeholder={placeholder || ''}
        onChange={e => onChange(e.target.value)} style={feldStyle(disabled)} />
      {hint && <div style={{ fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  )
}

export function SelFeld({ label, value, onChange, disabled, options }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)} style={{ ...feldStyle(disabled), fontFamily: SANS }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

export function Schalter({ label, checked, onChange, disabled }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: disabled ? MUTED : FG, cursor: disabled ? 'default' : 'pointer', paddingBottom: 8 }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: A, cursor: disabled ? 'default' : 'pointer' }} />
      {label}
    </label>
  )
}

/**
 * Die Felder einer Alarmregel.
 * @param form      aufgelöste Regel (siehe alarmRegel())
 * @param onSet     (feld, wert) => void
 * @param disabled  nur lesen
 */
export function AlarmFelder({ form, onSet, disabled, boards, unit = '', isMobile }) {
  const zahl = v => v === '' || v == null ? null : Number(v)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <NumFeld label={`Kritisch unter (${unit})`} value={form.krit_low} onChange={v => onSet('krit_low', zahl(v))} disabled={disabled} color={DANGER} />
        <NumFeld label={`Warnung unter (${unit})`} value={form.warn_low} onChange={v => onSet('warn_low', zahl(v))} disabled={disabled} color={WARN} />
        <NumFeld label={`Warnung über (${unit})`} value={form.warn_high} onChange={v => onSet('warn_high', zahl(v))} disabled={disabled} color={WARN} />
        <NumFeld label={`Kritisch über (${unit})`} value={form.krit_high} onChange={v => onSet('krit_high', zahl(v))} disabled={disabled} color={DANGER} placeholder="—" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <SelFeld label="Telegram" value={form.telegram} onChange={v => onSet('telegram', v)} disabled={disabled}
          options={TELEGRAM_ZIELE.map(z => [z.id, z.label])} />
        <SelFeld label="Aufgabe anlegen" value={form.aufgabe} onChange={v => onSet('aufgabe', v)} disabled={disabled}
          options={AUFGABE_AB.map(z => [z.id, z.label])} />
        <SelFeld label="Aufgabe im Bereich" value={form.board_id} onChange={v => onSet('board_id', v)} disabled={disabled || form.aufgabe === 'aus'}
          options={(boards || []).map(b => [b.id, `${b.emoji || ''} ${b.name}`.trim()])} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, alignItems: 'end' }}>
        <NumFeld label={`Hysterese (${unit})`} value={form.hysterese} onChange={v => onSet('hysterese', zahl(v) ?? 0)} disabled={disabled}
          hint="Abstand, den der Wert zum Entwarnen überwinden muss" />
        <NumFeld label="Ruhezeit (Min.)" value={form.ruhe_min} onChange={v => onSet('ruhe_min', zahl(v) ?? 0)} disabled={disabled}
          hint="Mindestabstand zwischen zwei gleichen Meldungen" />
        <Schalter label="Alarm aktiv" checked={form.aktiv} onChange={v => onSet('aktiv', v)} disabled={disabled} />
        <Schalter label="Entwarnung melden" checked={form.entwarnung} onChange={v => onSet('entwarnung', v)} disabled={disabled || !form.aktiv} />
      </div>
    </>
  )
}

/** Die Felder, die gespeichert werden — ohne abgeleitete Zusatzwerte. */
export function regelFelder(form) {
  return {
    aktiv: form.aktiv,
    warn_low: form.warn_low, krit_low: form.krit_low,
    warn_high: form.warn_high, krit_high: form.krit_high,
    hysterese: form.hysterese, ruhe_min: form.ruhe_min,
    telegram: form.telegram, aufgabe: form.aufgabe, board_id: form.board_id,
    entwarnung: form.entwarnung,
  }
}

export function SpeichernLeiste({ dirty, gespeichert, onSpeichern, onVerwerfen }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
      <button onClick={onSpeichern} disabled={!dirty}
        style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: dirty ? A : BORDER, color: dirty ? 'var(--luma-on-a)' : MUTED, cursor: dirty ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, fontFamily: SANS }}>
        Regel speichern
      </button>
      {dirty && (
        <button onClick={onVerwerfen}
          style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 13, fontFamily: SANS }}>
          Verwerfen
        </button>
      )}
      {gespeichert && !dirty && <span style={{ fontFamily: MONO, fontSize: 11, color: OK }}>gespeichert</span>}
    </div>
  )
}
