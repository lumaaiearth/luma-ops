// Pflege → „Kalender & Planung“
//   1. Abo des Google-Kalenders (Edge Function kalender-sync)
//   2. Bot: Termine ↔ Pflegegänge zuordnen, fehlende Termine zeigen
//   3. Folgejahr: Termine je Gang vorschlagen, Kosten je Standort, .ics-Export
// Logik in src/lib/pflegeKalender.js und src/lib/pflegeJahresplanung.js.
import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Check, X, CalendarPlus, Download, CalendarCheck, AlertTriangle, Link2 } from 'lucide-react'
import { sb } from '../lib/supabase.js'
import { A, BORDER, FG, MUTED, OK, WARN, DANGER, INFO } from '../lib/theme.js'
import { Card, Button, Badge, SectionLabel, INPUT_STYLE, LABEL_STYLE, MONO, SANS } from './ui.jsx'
import { termineZuordnen, fehlendeTermine, googleTerminLink, isoWoche } from '../lib/pflegeKalender.js'
import { termineVorschlagen, kostenJeStandort, bevorzugteWochentage, termineAlsKalender, montagDerKW, terminDauer } from '../lib/pflegeJahresplanung.js'
import { icsSchreiben, plusTage } from '../lib/kalenderIcs.js'
import { eur } from '../lib/angebot.js'

const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const VERALTET_MS = 30 * 60 * 1000
const datum = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const vor = ts => {
  if (!ts) return 'noch nie'
  const min = Math.round((Date.now() - Date.parse(ts)) / 60000)
  return min < 1 ? 'gerade eben' : min < 60 ? `vor ${min} min` : min < 1440 ? `vor ${Math.round(min / 60)} h` : `am ${new Date(ts).toLocaleDateString('de-DE')}`
}
const SICHER_FARBE = { sicher: OK, wahrscheinlich: INFO, unklar: WARN, zusatz: MUTED }
const SICHER_TEXT = { sicher: 'sicher', wahrscheinlich: 'wahrscheinlich', unklar: 'unklar', zusatz: 'Zusatztermin' }

function herunterladen(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PflegeKalender({ jahr, plaene, gaenge, projects, clients, rates, jobs, isAdmin, planLabel, onUebernehmen, onZusatz, onTermineSetzen }) {
  const [status, setStatus] = useState([])
  const [termine, setTermine] = useState([])
  const [gespeichert, setGespeichert] = useState([])
  const [laedt, setLaedt] = useState(true)
  const [synct, setSynct] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [neueUrl, setNeueUrl] = useState('')
  const [urlOffen, setUrlOffen] = useState(false)
  const [arbeitet, setArbeitet] = useState(null)
  const autoSync = useRef(false)

  const projById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])
  const planInfo = useMemo(() => new Map(plaene.map(p => {
    const pr = projById[p.project_id] || {}
    return [p.id, { clientId: pr.client_id, label: planLabel(p), kunde: clients.find(c => c.id === pr.client_id)?.name || pr.client || '', ort: [p.objekt, pr.location].filter(Boolean).join(', ') }]
  })), [plaene, projById, clients, planLabel])

  async function laden() {
    const von = `${jahr - 1}-01-01`, bis = `${jahr + 1}-12-31`
    const [st, te, zu] = await Promise.all([
      sb.rpc('kalender_status'),
      sb.from('kalender_termine').select('*').gte('start_datum', von).lte('start_datum', bis).order('start_datum').limit(5000),
      sb.from('kalender_zuordnungen').select('*'),
    ])
    const err = st.error || te.error || zu.error
    if (err) setFehler(err.message)
    setStatus(st.data || []); setTermine(te.data || []); setGespeichert(zu.data || [])
    setLaedt(false)
    return st.data || []
  }

  async function abgleichen(erzwingen = true) {
    setSynct(true); setFehler(null)
    const { data, error } = await sb.functions.invoke('kalender-sync', { body: { erzwingen } })
    if (error) setFehler(`Abgleich fehlgeschlagen: ${error.message}`)
    else if (data?.quellen?.some(q => q.fehler)) setFehler(data.quellen.filter(q => q.fehler).map(q => `${q.name}: ${q.fehler}`).join(' · '))
    await laden()
    setSynct(false)
  }

  useEffect(() => {
    let weg = false
    laden().then(st => {
      // Beim Öffnen abgleichen, wenn der letzte Abgleich älter als 30 min ist
      if (weg || autoSync.current) return
      autoSync.current = true
      if (st.some(q => q.aktiv && (!q.zuletzt_sync || Date.now() - Date.parse(q.zuletzt_sync) > VERALTET_MS))) abgleichen(false)
    })
    return () => { weg = true }
  }, [jahr]) // eslint-disable-line react-hooks/exhaustive-deps

  async function quelleSpeichern(e) {
    e.preventDefault()
    const url = neueUrl.trim()
    if (!/^https:\/\/.+\.ics(\?.*)?$/i.test(url) && !/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(url)) {
      setFehler('Das sieht nicht nach einer iCal-Adresse aus (https://…/basic.ics).'); return
    }
    const bestehend = status[0]
    const { error } = bestehend
      ? await sb.from('kalender_quellen').update({ ical_url: url, letzter_fehler: null }).eq('id', bestehend.id)
      : await sb.from('kalender_quellen').insert({ name: 'Google-Kalender LUMA', ical_url: url })
    if (error) { setFehler(error.message); return }
    setNeueUrl(''); setUrlOffen(false)
    await abgleichen(true)
  }

  // ── Bot ──────────────────────────────────────────────────────────────────
  const { zuordnungen, ohneStandort } = useMemo(
    () => termineZuordnen({ termine, plaene, gaenge, projects, bestaetigt: gespeichert }),
    [termine, plaene, gaenge, projects, gespeichert])
  const entscheidung = useMemo(() => new Map(gespeichert.map(z => [`${z.termin_id}|${z.plan_id}`, z])), [gespeichert])
  const terminVon = useMemo(() => new Map(termine.map(t => [t.id, t])), [termine])
  const gangVon = useMemo(() => new Map(gaenge.map(g => [g.id, g])), [gaenge])
  const planVon = useMemo(() => new Map(plaene.map(p => [p.id, p])), [plaene])

  const offen = zuordnungen
    .filter(z => !entscheidung.has(`${z.terminId}|${z.planId}`))
    .filter(z => (isoWoche(terminVon.get(z.terminId)?.start_datum || `${jahr}-01-01`).jahr) === jahr)
  const bestaetigtAnzahl = gespeichert.filter(z => z.status === 'bestaetigt').length
  const mitStatus = [
    ...gespeichert.filter(z => z.status === 'bestaetigt' && z.gang_id).map(z => ({ gangId: z.gang_id, status: 'bestaetigt' })),
    ...zuordnungen.filter(z => entscheidung.get(`${z.terminId}|${z.planId}`)?.status !== 'ignoriert'),
  ]
  const jahrGaenge = gaenge.filter(g => planVon.get(g.plan_id)?.jahr === jahr)
  const heute = new Date().toISOString().slice(0, 10)
  const fehlend = fehlendeTermine({ gaenge: jahrGaenge.map(g => ({ ...g, jahr: g.jahr ?? jahr })), zuordnungen: mitStatus, heute })

  async function entscheiden(z, statusNeu) {
    setArbeitet(`${z.terminId}|${z.planId}`)
    const zeile = { termin_id: z.terminId, plan_id: z.planId, gang_id: z.gangId, status: statusNeu }
    const { data, error } = await sb.from('kalender_zuordnungen').upsert(zeile, { onConflict: 'termin_id,plan_id' }).select().single()
    if (error) { setFehler(error.message); setArbeitet(null); return }
    if (statusNeu === 'bestaetigt') {
      const t = terminVon.get(z.terminId)
      if (z.gangId) await onUebernehmen(gangVon.get(z.gangId), t)
      else await onZusatz(planVon.get(z.planId), t)
    }
    setGespeichert(prev => [...prev.filter(x => !(x.termin_id === z.terminId && x.plan_id === z.planId)), data])
    setArbeitet(null)
  }
  async function alleSicheren() {
    for (const z of offen.filter(x => x.sicherheit === 'sicher' && x.gangId)) await entscheiden(z, 'bestaetigt')
  }

  // ── Folgejahr ────────────────────────────────────────────────────────────
  const [zieljahr, setZieljahr] = useState(jahr + 1)
  const [kapazitaet, setKapazitaet] = useState(16)
  const [startZeit, setStartZeit] = useState('08:00')
  const [mitFahrt, setMitFahrt] = useState(true)
  const [kalibrieren, setKalibrieren] = useState(true)
  const [vorschlag, setVorschlag] = useState(null)
  useEffect(() => { setZieljahr(jahr + 1); setVorschlag(null) }, [jahr])

  const zielPlaene = plaene.filter(p => p.jahr === zieljahr)
  const zielGaenge = gaenge.filter(g => zielPlaene.some(p => p.id === g.plan_id))
  const kosten = useMemo(() => kostenJeStandort({ plaene: zielPlaene, gaenge: zielGaenge, planInfo, saetze: rates || {}, mitFahrt, kalibrieren }),
    [zielPlaene, zielGaenge, planInfo, rates, mitFahrt, kalibrieren]) // eslint-disable-line react-hooks/exhaustive-deps

  function vorschlagen() {
    // Wochentag je Standort aus dem Vorjahr: bestätigte Kalendertermine und erledigte Einsätze
    const vorPlan = new Map(zielPlaene.map(zp => [zp.id, plaene.find(p => p.jahr === zieljahr - 1 && p.project_id === zp.project_id && (p.objekt || '') === (zp.objekt || ''))?.id]))
    const zielVonVor = new Map([...vorPlan].filter(([, v]) => v).map(([z, v]) => [v, z]))
    const vorjahr = []
    for (const z of gespeichert.filter(x => x.status === 'bestaetigt')) {
      const t = terminVon.get(z.termin_id), ziel = zielVonVor.get(z.plan_id)
      if (t && ziel) vorjahr.push({ planId: ziel, datum: t.start_datum })
    }
    for (const j of jobs || []) {
      if (!j.date?.startsWith(String(zieljahr - 1)) || j.job_type !== 'pflege') continue
      for (const zp of zielPlaene.filter(p => p.project_id === j.project_id)) vorjahr.push({ planId: zp.id, datum: j.date })
    }
    setVorschlag(termineVorschlagen({ jahr: zieljahr, gaenge: zielGaenge, planInfo, wochentage: bevorzugteWochentage(vorjahr), tagesKapazitaet: Number(kapazitaet) || 16, startZeit }))
  }

  const sel = { ...INPUT_STYLE, width: 'auto', padding: '6px 9px' }
  const q = status[0]
  return (
    <div style={{ display: 'grid', gap: 14, fontFamily: SANS }} data-test="pflege-kalender">
      {/* ── 1. Abo ── */}
      <Card padding="14px 16px">
        <SectionLabel action={q && <Button variant="ghost" size="sm" icon={RefreshCw} disabled={synct} onClick={() => abgleichen(true)}>{synct ? 'Gleicht ab…' : 'Jetzt abgleichen'}</Button>}>
          Google-Kalender abonniert
        </SectionLabel>
        {laedt ? <div style={{ fontSize: 12, color: MUTED }}>lädt…</div> : q ? (
          <div style={{ fontSize: 12.5, color: FG, lineHeight: 1.6 }} data-test="kalender-status">
            <CalendarCheck size={13} style={{ verticalAlign: '-2px', color: q.letzter_fehler ? DANGER : OK }} /> {q.name} · zuletzt abgeglichen {vor(q.zuletzt_sync)}
            {q.anzahl != null && ` · ${q.anzahl.toLocaleString('de-DE')} Termine`}
            {q.letzter_fehler && <div style={{ color: DANGER }}>Letzter Abgleich: {q.letzter_fehler}</div>}
            <div style={{ fontSize: 11, color: MUTED }}>Abgleich beim Öffnen dieser Seite (wenn älter als 30 min) und auf Knopfdruck — stündlich automatisch, sobald der Abgleich-Schlüssel hinterlegt ist.</div>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: MUTED }}>Noch kein Kalender abonniert.</div>
        )}
        {isAdmin && (!q || urlOffen) && (
          <form onSubmit={quelleSpeichern} style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <label style={LABEL_STYLE}>Geheime iCal-Adresse des Google-Kalenders</label>
            <input type="url" value={neueUrl} onChange={e => setNeueUrl(e.target.value)} required autoComplete="off" spellCheck={false}
              placeholder="https://calendar.google.com/calendar/ical/…/private-…/basic.ics" style={INPUT_STYLE} data-test="kalender-url" />
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
              Google Kalender → Einstellungen → links den Kalender wählen → „Kalender integrieren“ → <b>Privatadresse im iCal-Format</b> kopieren.
              Die Adresse wird nur auf dem Server gespeichert, nur Admins können sie ändern, angezeigt wird sie nirgends.
            </div>
            <div><Button type="submit" size="sm">Speichern und abgleichen</Button></div>
          </form>
        )}
        {isAdmin && q && !urlOffen && <button onClick={() => setUrlOffen(true)} style={{ marginTop: 6, background: 'none', border: 'none', color: MUTED, fontSize: 11, cursor: 'pointer', padding: 0 }}>Adresse ersetzen</button>}
        {!isAdmin && !q && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Einrichten kann ein Admin.</div>}
        {fehler && <div style={{ marginTop: 8, fontSize: 12, color: DANGER }}>{fehler}</div>}
      </Card>

      {/* ── 2a. Zuordnungen ── */}
      {q && (
        <Card padding="14px 16px">
          <SectionLabel action={offen.some(z => z.sicherheit === 'sicher' && z.gangId) && <Button size="sm" icon={Check} disabled={!!arbeitet} onClick={alleSicheren} data-test="alle-sicheren">Alle sicheren übernehmen</Button>}>
            Termine zuordnen {jahr} · {offen.length} offen · {bestaetigtAnzahl} übernommen
          </SectionLabel>
          {!offen.length ? <div style={{ fontSize: 12.5, color: MUTED }}>Nichts zu prüfen.</div> : (
            <div style={{ display: 'grid', gap: 6 }} data-test="zuordnungen">
              {offen.slice(0, 80).map(z => {
                const t = terminVon.get(z.terminId), gg = z.gangId && gangVon.get(z.gangId)
                const key = `${z.terminId}|${z.planId}`
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: FG }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{datum(t?.start_datum)}{t?.start_zeit ? ` ${t.start_zeit}` : ''}</span> · {t?.titel || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: FG, marginTop: 2 }}>
                        → <b>{planInfo.get(z.planId)?.label}</b>{gg ? ` · ${gg.titel || `KW ${gg.kw}`}` : ''}{' '}
                        <Badge color={SICHER_FARBE[z.sicherheit]}>{SICHER_TEXT[z.sicherheit]}</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: MUTED }}>{z.grund}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" icon={Check} disabled={arbeitet === key} onClick={() => entscheiden(z, 'bestaetigt')} title={gg ? 'Termin übernehmen: Einsatz anlegen bzw. verschieben, Gang wird terminiert' : 'Als Zusatz-Einsatz anlegen'}>
                        {gg ? 'Übernehmen' : 'Zusatz-Einsatz'}
                      </Button>
                      <Button size="sm" variant="ghost" icon={X} disabled={arbeitet === key} onClick={() => entscheiden(z, 'ignoriert')} title="Gehört nicht dazu">Ignorieren</Button>
                    </div>
                  </div>
                )
              })}
              {offen.length > 80 && <div style={{ fontSize: 11, color: MUTED }}>… und {offen.length - 80} weitere</div>}
            </div>
          )}
          {ohneStandort.length > 0 && (
            <details style={{ marginTop: 8, fontSize: 11.5, color: MUTED }}>
              <summary style={{ cursor: 'pointer' }}>{ohneStandort.length} Termine ohne erkennbaren Standort (z. B. private oder interne Termine)</summary>
              <div style={{ marginTop: 4, lineHeight: 1.6 }}>
                {ohneStandort.filter(t => isoWoche(t.start_datum).jahr === jahr).slice(0, 40).map(t => <div key={t.id}>{datum(t.start_datum)} · {t.titel}</div>)}
                <div>Tipp: Kürzel (BL, H14 …) oder Standortname in den Titel schreiben, dann ordnet der Bot den Termin zu.</div>
              </div>
            </details>
          )}
        </Card>
      )}

      {/* ── 2b. Fehlende Termine ── */}
      <Card padding="14px 16px">
        <SectionLabel action={fehlend.kommend.length > 0 && (
          <Button variant="ghost" size="sm" icon={Download} data-test="fehlende-ics"
            onClick={() => {
              const v = termineVorschlagen({ jahr, gaenge: fehlend.kommend, planInfo, tagesKapazitaet: Number(kapazitaet) || 16, startZeit })
              herunterladen(icsSchreiben(termineAlsKalender(v.filter(x => x.datum >= heute), { gaenge: fehlend.kommend, planInfo }), { name: `LUMA Pflege ${jahr}` }), `luma-pflege-fehlend-${jahr}.ics`)
            }}>Alle als Kalenderdatei</Button>
        )}>
          Pflegegänge ohne Kalendertermin {jahr}
        </SectionLabel>
        {!q && <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 6 }}>Ohne abonnierten Kalender gilt hier jeder offene Gang als ohne Termin.</div>}
        {[['kommend', 'Kommend', fehlend.kommend, WARN], ['ueberfaellig', 'Vergangen, nicht erledigt', fehlend.ueberfaellig, DANGER]].map(([k, titel, liste, farbe]) => liste.length > 0 && (
          <div key={k} style={{ marginBottom: 8 }} data-test={`fehlend-${k}`}>
            <div style={{ fontSize: 11, color: farbe, fontFamily: MONO, marginBottom: 4 }}>{titel} · {liste.length}</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {liste.slice(0, 60).map(gg => {
                const info = planInfo.get(gg.plan_id) || {}
                const tag = gg.termin || plusTage(montagDerKW(jahr, gg.kw), 1)   // Dienstag der KW
                const ende = (() => { const [h, mi] = startZeit.split(':').map(Number); const min = h * 60 + mi + terminDauer(gg) * 60; return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}` })()
                return (
                  <div key={gg.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: FG }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, minWidth: 48 }}>KW {gg.kw}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{info.label} · {gg.titel}</span>
                    <a href={googleTerminLink({ titel: `Pflege ${info.label} – ${gg.titel || `KW ${gg.kw}`}`, datum: tag, start: startZeit, ende, ort: info.ort, beschreibung: `Pflegegang KW ${gg.kw}` })}
                      target="_blank" rel="noopener noreferrer" title="Vorausgefüllten Termin in Google Kalender öffnen"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: A, textDecoration: 'none' }}>
                      <CalendarPlus size={12} /> In Google anlegen
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {!fehlend.kommend.length && !fehlend.ueberfaellig.length && <div style={{ fontSize: 12.5, color: OK }}>Für jeden offenen Pflegegang steht ein Termin im Kalender.</div>}
      </Card>

      {/* ── 3. Folgejahr ── */}
      <Card padding="14px 16px">
        <SectionLabel>Pflege {zieljahr} einplanen</SectionLabel>
        {!zielPlaene.length ? (
          <div style={{ fontSize: 12.5, color: MUTED }}>Für {zieljahr} gibt es noch keine Pflegepläne — oben „{zieljahr} vorbereiten“ übernimmt sie aus {zieljahr - 1}.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
              <label style={{ display: 'grid', gap: 3 }}><span style={LABEL_STYLE}>Team-Stunden je Tag</span>
                <input type="number" min="4" max="40" step="1" value={kapazitaet} onChange={e => setKapazitaet(e.target.value)} style={{ ...sel, width: 90 }} data-test="kapazitaet" /></label>
              <label style={{ display: 'grid', gap: 3 }}><span style={LABEL_STYLE}>Beginn</span>
                <input type="time" value={startZeit} onChange={e => setStartZeit(e.target.value)} style={sel} /></label>
              <Button icon={CalendarPlus} onClick={vorschlagen} data-test="termine-vorschlagen">Termine vorschlagen</Button>
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
              Jeder Gang bleibt in seiner Kalenderwoche. Montag–Freitag, keine Berliner Feiertage, Wochentag wie im Vorjahr (sonst Dienstag),
              Standorte desselben Auftraggebers möglichst als Tour am selben Tag, solange die Team-Stunden reichen. Dauer = Soll + Anfahrt ÷ Teamgröße.
            </div>
            {vorschlag && (
              <div data-test="terminvorschlag">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <Button size="sm" icon={Check} onClick={() => onTermineSetzen(vorschlag.filter(v => v.datum))} data-test="termine-uebernehmen">Termine in den Plan übernehmen</Button>
                  <Button size="sm" variant="ghost" icon={Download} data-test="termine-ics"
                    onClick={() => herunterladen(icsSchreiben(termineAlsKalender(vorschlag, { gaenge: zielGaenge, planInfo }), { name: `LUMA Pflege ${zieljahr}` }), `luma-pflege-${zieljahr}.ics`)}>
                    Kalenderdatei für Google (.ics)
                  </Button>
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
                  Import in Google: Einstellungen → Importieren &amp; Exportieren → Datei wählen → Kalender. Danach erkennt der Bot jeden Termin sicher wieder.
                </div>
                <div style={{ maxHeight: 420, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ textAlign: 'left', color: MUTED, fontSize: 10.5 }}>
                      {['Datum', 'Zeit', 'Standort', 'Gang', 'Hinweis'].map(h => <th key={h} style={{ padding: '6px 8px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: 'var(--luma-surface)' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {vorschlag.map(v => {
                        const gg = gangVon.get(v.gangId) || {}
                        return (
                          <tr key={v.gangId} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={{ padding: '5px 8px', fontFamily: MONO, whiteSpace: 'nowrap' }}>{v.datum ? `${WOCHENTAG[v.wochentag]} ${new Date(v.datum + 'T00:00:00').toLocaleDateString('de-DE')}` : '—'}</td>
                            <td style={{ padding: '5px 8px', fontFamily: MONO, whiteSpace: 'nowrap' }}>{v.start}–{v.ende}</td>
                            <td style={{ padding: '5px 8px' }}>{planInfo.get(v.planId)?.label}</td>
                            <td style={{ padding: '5px 8px', color: MUTED }}>KW {gg.kw}</td>
                            <td style={{ padding: '5px 8px', color: v.voll ? DANGER : MUTED, fontSize: 11 }}>{v.voll && <AlertTriangle size={11} style={{ verticalAlign: '-1px' }} />} {v.grund}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }} data-test="kosten-standorte">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: FG }}>Kosten je Standort {zieljahr}</span>
                <label style={{ fontSize: 11.5, color: MUTED, display: 'flex', gap: 5, alignItems: 'center' }}><input type="checkbox" checked={mitFahrt} onChange={e => setMitFahrt(e.target.checked)} /> Anfahrt einpreisen</label>
                <label style={{ fontSize: 11.5, color: MUTED, display: 'flex', gap: 5, alignItems: 'center' }}><input type="checkbox" checked={kalibrieren} onChange={e => setKalibrieren(e.target.checked)} /> Kalibrierfaktor anwenden</label>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ textAlign: 'left', color: MUTED, fontSize: 10.5 }}>
                  {['Standort', 'Auftraggeber', 'Gänge', 'Stunden', '€/h', 'netto', 'brutto'].map(h => <th key={h} style={{ padding: '5px 6px', borderBottom: `1px solid ${BORDER}`, textAlign: ['Gänge', 'Stunden', '€/h', 'netto', 'brutto'].includes(h) ? 'right' : 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {kosten.zeilen.map(z => (
                    <tr key={z.planId} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '5px 6px' }}>{z.label}{z.hinweis && <div style={{ fontSize: 10.5, color: WARN }}>{z.hinweis}</div>}{z.kalib && <span style={{ fontFamily: MONO, fontSize: 10, color: INFO }}> ×{String(z.kalib).replace('.', ',')}</span>}</td>
                      <td style={{ padding: '5px 6px', color: MUTED }}>{z.kunde}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: MONO }}>{z.gaenge}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: MONO }} title={`${z.stundenVorOrt} h vor Ort + ${z.stundenFahrt} h Anfahrt`}>{z.stunden.toLocaleString('de-DE')}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: MONO }}>{z.satz}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: MONO }}>{eur(z.netto)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: MONO, color: MUTED }}>{eur(z.brutto)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 600 }}>
                    <td style={{ padding: '6px' }} colSpan={2}>Summe</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: MONO }}>{kosten.summe.gaenge}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: MONO }}>{kosten.summe.stunden.toLocaleString('de-DE')}</td>
                    <td />
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: MONO }} data-test="kosten-summe">{eur(kosten.summe.netto)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: MONO, color: MUTED }}>{eur(kosten.summe.brutto)}</td>
                  </tr>
                </tbody>
              </table>
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
                <Link2 size={11} style={{ verticalAlign: '-1px' }} /> Gleiche Rechnung wie „Angebote &amp; Verträge → Angebot generieren“ (Stundensatz je Auftraggeber, Anfahrt je Gang, Kalibrierung nur zwischen 0,5 und 2).
                Daraus das Angebot für den Kunden erzeugen.
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
