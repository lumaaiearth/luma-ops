// Sensor-Detailseite /sensors/:id — Live-Wert + Status, Verlaufs-Chart mit
// Zeitraum-Wahl (Heute/Woche/Monat/Gesamt), Min/Max/Ø, klickbare Kette
// Sensor → Projekt → Kunde, plus Kenndaten (Typ, Schwellwerte, Stand).
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ArrowLeft, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus, Bell } from 'lucide-react'
import { useOps } from '../context/OpsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { sb } from '../lib/supabase.js'
import { A, A20, BG, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER } from '../lib/theme.js'
import { PageHeader, Card, EmptyState, MONO, SANS } from '../components/ui.jsx'
import { SENSOR_TYPE_LABELS, SENSOR_TYPE_ICONS } from '../data/sensorTypes.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import { alarmRegel, regelHerkunft, STUFEN } from '../lib/sensorAlarm.js'
import { AlarmFelder, SpeichernLeiste, regelFelder } from '../components/AlarmRegelForm.jsx'

const RANGES = [
  { id: 'today', label: 'Heute', hours: 24 },
  { id: 'week', label: 'Woche', hours: 24 * 7 },
  { id: 'month', label: 'Monat', hours: 24 * 30 },
  { id: 'all', label: 'Gesamt', hours: null },
]

const statusColorOf = s => s === 'critical' ? DANGER : s === 'warning' ? WARN : OK
const statusLabelOf = s => s === 'critical' ? 'Kritisch' : s === 'warning' ? 'Warnung' : 'OK'

// Theme-Farben real auflösen (Recharts rendert var(...) in SVG nicht zuverlässig)
function themeColors() {
  const cs = getComputedStyle(document.documentElement)
  const g = v => cs.getPropertyValue(v).trim()
  return { a: g('--luma-a') || '#09BE60', fg: g('--luma-fg') || '#0a1409', muted: g('--luma-muted') || '#888', border: g('--luma-border') || '#ddd' }
}

export default function SensorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { sensors, projects, clients, boards, updateSensor } = useOps()
  const { isMitarbeiter } = useAuth()
  const [range, setRange] = useState('week')
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)

  const sensor = sensors.find(s => s.id === id)
  const project = sensor ? projects.find(p => p.id === sensor.project_id) : null
  const client = project ? (clients.find(c => c.id === project.client_id) || clients.find(c => c.name === project.client)) : null

  // Messwerte für den gewählten Zeitraum laden
  useEffect(() => {
    if (!sensor) return
    let cancelled = false
    setLoading(true)
    const r = RANGES.find(x => x.id === range)
    let q = sb.from('sensor_readings').select('value, ts').eq('sensor_id', id).order('ts', { ascending: true }).limit(1000)
    if (r.hours) q = q.gte('ts', new Date(Date.now() - r.hours * 3600_000).toISOString())
    q.then(({ data }) => {
      if (cancelled) return
      setReadings((data || []).map(d => ({ ts: new Date(d.ts).getTime(), value: Number(d.value) })))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id, range, sensor?.last_updated])

  const stats = useMemo(() => {
    if (readings.length === 0) return null
    const vals = readings.map(r => r.value)
    const min = Math.min(...vals), max = Math.max(...vals)
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length
    const trend = vals.length >= 2 ? vals[vals.length - 1] - vals[0] : 0
    return { min, max, avg: Math.round(avg * 10) / 10, trend: Math.round(trend * 10) / 10 }
  }, [readings])

  if (!sensor) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>
        <div style={{ marginBottom: 16 }}>Sensor nicht gefunden.</div>
        <button onClick={() => navigate('/sensors')} style={{ color: A, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Zurück zu den Sensoren</button>
      </div>
    )
  }

  const sc = statusColorOf(sensor.status)
  const showLow = range && sensor.threshold_low != null
  const showHigh = sensor.threshold_high != null

  const rangeForAxis = RANGES.find(x => x.id === range)
  const fmtTs = ts => {
    const d = new Date(ts)
    return rangeForAxis.id === 'today'
      ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }
  const col = themeColors()

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0, fontFamily: SANS }}>
        <ArrowLeft size={14} /> Zurück
      </button>

      {/* Kette: Sensoren → Projekt → Kunde */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, color: MUTED, marginBottom: 10 }}>
        <span onClick={() => navigate('/sensors')} style={{ cursor: 'pointer' }} className="lu-tab">Sensoren</span>
        {project && <><ChevronRight size={11} /><span onClick={() => navigate(`/projects/${project.id}`)} style={{ cursor: 'pointer', color: project.color || A }} className="lu-tab">{project.name}</span></>}
        {client && <><ChevronRight size={11} /><span onClick={() => navigate(`/clients/${client.id}`)} style={{ cursor: 'pointer' }} className="lu-tab">{client.name}</span></>}
      </div>

      <PageHeader
        eyebrow={`${SENSOR_TYPE_ICONS[sensor.type] || '📡'} ${SENSOR_TYPE_LABELS[sensor.type] || sensor.type}`}
        title={sensor.name}
        isMobile={isMobile}
        actions={
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 34, fontWeight: 300, color: sc, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {sensor.value}<span style={{ fontSize: 15, color: MUTED }}>{sensor.unit}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: sc, background: `color-mix(in srgb, ${sc} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${sc} 30%, transparent)`, padding: '2px 8px', borderRadius: 10 }}>
              {sensor.status === 'ok' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />} {statusLabelOf(sensor.status)}
            </div>
          </div>
        }
      />

      {/* Verlauf */}
      <Card padding={isMobile ? '16px 14px' : '18px 20px'} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Verlauf</div>
          <div style={{ display: 'inline-flex', gap: 3, background: BG, border: `1px solid ${BORDER}`, borderRadius: 999, padding: 3 }}>
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)} className={range === r.id ? undefined : 'lu-tab'}
                style={{ padding: '5px 13px', borderRadius: 999, border: 'none', background: range === r.id ? A : 'transparent', color: range === r.id ? 'var(--luma-on-a)' : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: range === r.id ? 600 : 400, fontFamily: SANS }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontFamily: MONO, fontSize: 12 }}>lädt…</div>
        ) : readings.length < 2 ? (
          <EmptyState
            icon={TrendingUp}
            title="Noch keine Verlaufsdaten"
            hint="Die Aufzeichnung läuft seit Kurzem. Starte auf der Sensoren-Seite die Simulation (oder warte auf echte Messwerte), dann füllt sich der Verlauf."
            style={{ border: 'none' }}
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={readings} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="sensorFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sc} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={sc} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={col.border} vertical={false} />
                <XAxis dataKey="ts" tickFormatter={fmtTs} tick={{ fill: col.muted, fontSize: 10, fontFamily: MONO }} stroke={col.border} minTickGap={40} />
                <YAxis tick={{ fill: col.muted, fontSize: 10, fontFamily: MONO }} stroke={col.border} width={40} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: SANS, fontSize: 12 }}
                  labelStyle={{ color: MUTED, fontFamily: MONO, fontSize: 10 }}
                  labelFormatter={ts => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  formatter={v => [`${v}${sensor.unit}`, SENSOR_TYPE_LABELS[sensor.type] || 'Wert']}
                />
                {showLow && <ReferenceLine y={sensor.threshold_low} stroke={WARN} strokeDasharray="4 4" strokeOpacity={0.6} />}
                {showHigh && <ReferenceLine y={sensor.threshold_high} stroke={WARN} strokeDasharray="4 4" strokeOpacity={0.4} />}
                <Area type="monotone" dataKey="value" stroke={sc} strokeWidth={2} fill="url(#sensorFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
                <MiniStat label="Ø" value={`${stats.avg}${sensor.unit}`} />
                <MiniStat label="Min" value={`${stats.min}${sensor.unit}`} />
                <MiniStat label="Max" value={`${stats.max}${sensor.unit}`} />
                <MiniStat label="Trend" value={`${stats.trend > 0 ? '+' : ''}${stats.trend}${sensor.unit}`}
                  icon={stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus}
                  color={stats.trend > 0 ? OK : stats.trend < 0 ? WARN : MUTED} />
              </div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 10, textAlign: 'right' }}>
              {readings.length} Messwerte im Zeitraum
            </div>
          </>
        )}
      </Card>

      {/* Kenndaten */}
      <Card padding={isMobile ? '16px 14px' : '18px 20px'}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Kenndaten</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12 }}>
          <Field label="Typ" value={`${SENSOR_TYPE_ICONS[sensor.type] || ''} ${SENSOR_TYPE_LABELS[sensor.type] || sensor.type}`} />
          <Field label="Einheit" value={sensor.unit} />
          <Field label="Aktueller Wert" value={`${sensor.value}${sensor.unit}`} color={sc} />
          <Field label="Schwelle min" value={sensor.threshold_low != null ? `${sensor.threshold_low}${sensor.unit}` : '—'} />
          <Field label="Schwelle max" value={sensor.threshold_high != null ? `${sensor.threshold_high}${sensor.unit}` : '—'} />
          <Field label="Letzte Messung" value={sensor.last_updated ? new Date(sensor.last_updated).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'} />
          <Field label="GPS-Position" value={sensor.lat && sensor.lng ? `${(+sensor.lat).toFixed(6)}, ${(+sensor.lng).toFixed(6)}` : '— (in BIOME auf der Karte anlegen)'} />
        </div>
        {sensor.lat && sensor.lng ? (
          <button onClick={() => navigate('/map', { state: { focusCoords: [sensor.lat, sensor.lng] } })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '8px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: A, cursor: 'pointer', fontSize: 12, fontFamily: SANS }}>
            🗺️ Auf Karte zeigen (BIOME™)
          </button>
        ) : null}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}`, fontFamily: MONO, fontSize: 10, color: MUTED, lineHeight: 1.6 }}>
          Netzwerk-Zuordnung, Installationsdaten, verbaute Komponenten und Notizen folgen mit der Sensor-Verwaltung.
        </div>
      </Card>

      <AlarmCard sensor={sensor} projekt={project} boards={boards} isMobile={isMobile}
        darfBearbeiten={isMitarbeiter} onSave={cfg => updateSensor(sensor.id, { alarm_config: cfg })} />
    </div>
  )
}
/* ── Alarmregel ──────────────────────────────────────────────────────────────
 * Legt fest, ab welchem Wert der Sensor meldet und was dann passiert.
 * Standard ist die Alarmvorlage des Projekts; ein Sensor kann bewusst
 * ausscheren. Angezeigt wird immer die Regel, die tatsächlich gilt.        */
function AlarmCard({ sensor, projekt, boards, isMobile, darfBearbeiten, onSave }) {
  const vorlage = projekt?.alarm_defaults || null
  const gespeicherteHerkunft = regelHerkunft(sensor)
  const [herkunft, setHerkunft] = useState(gespeicherteHerkunft)
  const [form, setForm] = useState(alarmRegel(sensor, vorlage))
  const [gespeichert, setGespeichert] = useState(false)

  // Bei Sensorwechsel (oder Änderung von außen) neu aus der Regel füllen.
  useEffect(() => {
    setHerkunft(regelHerkunft(sensor))
    setForm(alarmRegel(sensor, vorlage))
    setGespeichert(false)
  }, [sensor.id, JSON.stringify(sensor.alarm_config), JSON.stringify(vorlage)]) // eslint-disable-line react-hooks/exhaustive-deps

  const st = sensor.alarm_state || {}
  const stufe = STUFEN[st.stufe] ? st.stufe : sensor.status
  const sc = stufe === 'critical' ? DANGER : stufe === 'warning' ? WARN : OK
  const ausVorlage = herkunft === 'projekt'
  // Anzeige folgt dem Schalter: „Vorlage" zeigt sofort, was dann gälte.
  const angezeigt = ausVorlage ? alarmRegel({ ...sensor, alarm_config: { modus: 'projekt' } }, vorlage) : form
  const dirty = herkunft !== gespeicherteHerkunft ||
    (!ausVorlage && JSON.stringify(form) !== JSON.stringify(alarmRegel(sensor, vorlage)))

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setGespeichert(false) }

  function speichern() {
    onSave(ausVorlage ? { modus: 'projekt' } : { modus: 'eigen', ...regelFelder(form) })
    setGespeichert(true)
  }
  function verwerfen() {
    setHerkunft(gespeicherteHerkunft)
    setForm(alarmRegel(sensor, vorlage))
  }

  return (
    <Card padding={isMobile ? '16px 14px' : '18px 20px'} style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <Bell size={12} /> Alarmregel
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: sc }}>
          {STUFEN[stufe]?.emoji} {STUFEN[stufe]?.label || '—'}
          {st.seit && stufe !== 'ok' ? ` seit ${new Date(st.seit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      </div>

      {/* Herkunft der Regel */}
      <div style={{ display: 'flex', gap: 6, margin: '10px 0 12px', flexWrap: 'wrap' }}>
        {[['projekt', projekt ? `Vorlage: ${projekt.name}` : 'Projektvorlage'], ['eigen', 'Eigene Regel']].map(([id, label]) => (
          <button key={id} onClick={() => darfBearbeiten && (setHerkunft(id), setGespeichert(false))} disabled={!darfBearbeiten}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontFamily: SANS,
              border: `1px solid ${herkunft === id ? A : BORDER}`,
              background: herkunft === id ? A20 : 'transparent',
              color: herkunft === id ? A : MUTED, cursor: darfBearbeiten ? 'pointer' : 'default',
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 14 }}>
        {ausVorlage
          ? 'Dieser Sensor folgt der Alarmvorlage seines Projekts. Änderungen an der Vorlage wirken hier sofort.'
          : 'Eigene Regel — die Projektvorlage wird für diesen Sensor nicht angewendet.'}
        {' '}Leere Felder bedeuten „keine Grenze in dieser Richtung".
      </div>

      <AlarmFelder form={angezeigt} onSet={set} disabled={!darfBearbeiten || ausVorlage}
        boards={boards} unit={sensor.unit || ''} isMobile={isMobile} />

      {darfBearbeiten
        ? <SpeichernLeiste dirty={dirty} gespeichert={gespeichert} onSpeichern={speichern} onVerwerfen={verwerfen} />
        : <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 10, color: MUTED }}>Nur das LUMA-Team kann Alarmregeln ändern.</div>}
    </Card>
  )
}

function MiniStat({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: 'color-mix(in srgb, var(--luma-fg) 3%, transparent)', borderRadius: 10, padding: '9px 11px' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 15, fontWeight: 700, color: color || FG }}>
        {Icon && <Icon size={13} />}{value}
      </div>
    </div>
  )
}

function Field({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: color || FG, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
