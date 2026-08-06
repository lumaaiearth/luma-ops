// ────────────────────────────────────────────────────────────────
// Pflege — Pflegeplanung (docs/PFLEGEPLANUNG_KONZEPT.md, Kap. 6.1)
// Aufbau nach dem Vorbild professioneller GaLaBau-Software:
// Objektakte statt Matrix. Tabs:
//   Standorte  — je Standort: Saison-Fortschritt, Leistungsverzeichnis
//                (Turnussprache), Einsätze, LV-Versand, Jahresübernahme
//   Jahresplan — Belegungsleiste Standorte × KW (Saison-Bänder, Winter
//                = Pflegepause), Fällig-Leiste, Kapazitätsbalken
//   Abschluss  — Plan/Ist, Kalibrierung, Leistungsnachweis, Restanten
//   Angebote & Verträge (admin) — Generator + Vertragstext (ALLCURA-Struktur)
// Daten: pflege_plaene / pflege_aufgaben / pflege_gaenge / angebote.
// ────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import {
  Sprout, Scale, FileText, Plus, Copy, Trash2, Check, Pencil,
  ChevronDown, ChevronRight, AlertTriangle, CalendarPlus, RotateCcw, RefreshCw,
  Printer, Mail, ArrowRightCircle,
} from 'lucide-react'
import { sb } from '../lib/supabase.js'
import { useOps } from '../context/OpsContext.jsx'
import { useTime } from '../context/TimeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useIsMobile } from '../lib/useIsMobile.js'
import { allPeople } from '../lib/people.js'
import { A, BORDER, FG, MUTED, SURFACE, OK, WARN, DANGER, INFO } from '../lib/theme.js'
import {
  PageHeader, Tabs, Chips, Card, StatCard, Badge, Button, EmptyState, SectionLabel,
  Modal, ModalActions, DateInput, INPUT_STYLE, LABEL_STYLE, MONO, SANS,
} from '../components/ui.jsx'
import { PFLEGE_KATALOG } from '../data/pflegeKatalog.js'
import { normalisiereZeiteintraege, buildLeistungsnachweis } from '../lib/leistungsnachweis.js'
import { druckeLeistungsnachweis } from '../lib/printNachweis.js'
import { baueNachweisEmail } from '../lib/nachweisEmail.js'
import { sendeEmail, versandProtokoll } from '../lib/email.js'

const MONATE = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
// KW→Monat wie in den Excel-Plänen/Import (Jan KW1–5 … Dez KW49–53)
const MONTH_KWS = [[1, 5], [6, 9], [10, 13], [14, 18], [19, 22], [23, 26], [27, 31], [32, 35], [36, 40], [41, 44], [45, 48], [49, 53]]
const monthOf = (kw) => MONTH_KWS.findIndex(([a, b]) => kw >= a && kw <= b)

// Saisonmodell (Vorgabe Malte 08/2026): Frühjahr Mrz–Mai, Sommer Jun–Aug,
// Herbst Sep–Nov — Winter (Dez–Feb) ist Pflegepause.
const SAISONS = [
  { key: 'fruehjahr', label: 'Frühjahr', kurz: 'F', von: 10, bis: 21, color: OK },
  { key: 'sommer', label: 'Sommer', kurz: 'S', von: 22, bis: 35, color: A },
  { key: 'herbst', label: 'Herbst', kurz: 'H', von: 36, bis: 48, color: WARN },
]
const WINTER = { key: 'winter', label: 'Winter', kurz: 'W', color: MUTED }
const saisonForKw = (kw) => SAISONS.find((s) => kw >= s.von && kw <= s.bis) || WINTER

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - start) / 86400000 + 1) / 7)
}

const STATUS_COLORS = { entwurf: MUTED, aktiv: OK, abgeschlossen: INFO }
const OFFER_STATUS = { entwurf: MUTED, versendet: INFO, angenommen: OK, abgelehnt: DANGER }
const GANG_STATUS = { geplant: MUTED, terminiert: INFO, erledigt: OK, entfallen: DANGER }

/** KW→h einer Aufgabe aus ihren Saisonfenstern erzeugen (erste KW des Monats;
    Turnus: einmalig | monatlich | 2x_monat (zusätzlich Monatsmitte) | quartal (jeder 3.) | nach_bedarf (0 h)) */
function wochenFromFenster(fenster) {
  const w = {}
  const add = (kw, h) => { if (h > 0) w[kw] = round2((w[kw] || 0) + h) }
  for (const f of fenster || []) {
    const h = Number(f.stunden_pro_gang || 0)
    const von = Number(f.von_monat || 1), bis = Number(f.bis_monat || f.von_monat || 1)
    if (f.turnus === 'nach_bedarf') continue
    const step = f.turnus === 'quartal' ? 3 : 1
    for (let m = von; m <= bis; m += step) {
      const [a, b] = MONTH_KWS[m - 1]
      add(a, h)
      if (f.turnus === '2x_monat') add(Math.floor((a + b) / 2), h)
      if (f.turnus === 'einmalig') break
    }
  }
  return w
}
const round2 = (n) => Math.round(n * 100) / 100
const eur = (n) => `${(n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const hrs = (n) => `${round2(n ?? 0).toLocaleString('de-DE')} h`
const fmtDate = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '')

function dbErr(table) {
  return (err) => {
    console.error(`[DB] ${table} failed:`, err?.message || err)
    window.__lumaToast?.(`⚠️ Speicherfehler (${table}): ${err?.message || 'unbekannter Fehler'}`)
  }
}

/** Saisonfenster einer Aufgabe als Kurztext: "monatlich Apr–Okt · 1× im Nov" */
function fensterText(fenster) {
  if (!Array.isArray(fenster) || !fenster.length) return ''
  return fenster.map((w) => {
    const von = MONATE[(w.von_monat || 1) - 1], bis = MONATE[(w.bis_monat || w.von_monat || 1) - 1]
    const range = von === bis ? `im ${von}` : `${von}–${bis}`
    const t = w.turnus === 'monatlich' ? 'monatlich' : w.turnus === '2x_monat' ? '2× monatlich' : w.turnus === 'quartal' ? 'quartalsweise' : w.turnus === 'nach_bedarf' ? 'nach Bedarf' : '1×'
    return `${t} ${range}`
  }).join(' · ')
}

/** Leistungsverzeichnis eines Plans im ALLCURA-Stil (Kundendokument, Text) */
function lvDokument(plan, aufgaben, projName) {
  const lines = ['LEISTUNGSVERZEICHNIS', '']
  lines.push(`OBJEKT: ${projName}${plan.objekt ? ` — ${plan.objekt}` : ''}`)
  lines.push('', 'GARTENPFLEGE', '')
  for (const a of aufgaben.filter((x) => Number(x.jahres_stunden) > 0)) {
    lines.push(`o  ${a.titel} — ${fensterText(a.fenster) || 'nach Bedarf im Pflegeturnusrahmen'}.`)
  }
  lines.push('')
  lines.push('Zusätzliche Leistungen außerhalb dieses Verzeichnisses werden nur nach gesonderter Beauftragung ausgeführt und gesondert vergütet. Materialien (Pflanzen, Mulch, Erde u. Ä.) werden zu marktüblichen Preisen gegen Beleg berechnet. An- und Abfahrt sind enthalten. Dezember bis Februar ist Pflegepause; Winterleistungen nach Vereinbarung.')
  lines.push('', 'LUMA — Lukas Steingässer & Malte Larsen GbR')
  return lines.join('\n')
}

/** Vertragstext nach ALLCURA-Struktur, Konditionen zugunsten LUMA (Konzept Kap. 6.1) */
function vertragText(offer, client) {
  const von = offer.zeitraum_von ? new Date(offer.zeitraum_von).toLocaleDateString('de-DE') : '[Beginn]'
  const bis = offer.zeitraum_bis ? new Date(offer.zeitraum_bis).toLocaleDateString('de-DE') : '[Ende]'
  const abrechnung = { monatlich: 'monatlich in gleichen Teilbeträgen', quartal: 'quartalsweise in gleichen Teilbeträgen', drittel: 'in drei gleichen Teilbeträgen (30.06. / 30.09. / 31.12.)', einmalig: 'nach Leistungserbringung' }[offer.abrechnung] || offer.abrechnung
  const objekte = (offer.positionen || []).map((p) => `  – ${p.beschreibung}`).join('\n')
  return `DIENSTLEISTUNGSVERTRAG GARTENPFLEGE

Auftraggeber (AG):
${client?.name || '[Auftraggeber]'}
[Anschrift ergänzen]

Auftragnehmer (AN):
LUMA — Lukas Steingässer & Malte Larsen GbR
Schillerstr. 15, 16225 Eberswalde

Objekt(e):
${objekte || '  – [Objekt]'}

1. Gegenstand des Vertrages
Der AG überträgt dem AN die Gartenpflege gemäß dem beiliegenden Leistungsverzeichnis (Anlage 1).
Vergütung: ${eur(offer.summe_netto)} netto jährlich zzgl. gesetzlicher Umsatzsteuer.

2. Vertragslaufzeit
Der Vertrag beginnt am ${von} und läuft zunächst bis ${bis}. Er verlängert sich jeweils um
12 Monate, wenn er nicht spätestens 3 Monate vor Ablauf schriftlich gekündigt wird.

3. Art und Umfang der Leistungen
Der AN führt die Leistungen fachgerecht aus. Zusätzliche, nicht im Leistungsverzeichnis
enthaltene Leistungen werden nur nach Beauftragung durch den AG ausgeführt und gesondert
vergütet. Dezember bis Februar ist Pflegepause; Winterleistungen nach gesonderter Vereinbarung.

4. Auftragserfüllung und Abrechnung
Der AN führt einen Leistungsnachweis über die durchgeführten Einsätze. Die Abrechnung erfolgt
${abrechnung}. Zahlungen sind innerhalb von 14 Tagen nach Rechnungslegung fällig.
Umfang und Vergütung werden jährlich auf Basis der dokumentierten Einsätze gemeinsam überprüft.

5. Haftung
Der AN haftet für von ihm zu vertretende Schäden im Rahmen seiner Betriebshaftpflichtversicherung.
Bei Verletzung von Leben, Körper oder Gesundheit gelten die gesetzlichen Bestimmungen.

6. Schlussbestimmungen
Änderungen und Ergänzungen bedürfen der Schriftform. Im Übrigen gelten die Vorschriften des BGB.

Anlage 1: Leistungsverzeichnis je Objekt

Ort, Datum: ______________________

____________________________          ____________________________
Auftraggeber                          Auftragnehmer`
}

export default function PflegePage() {
  const isMobile = useIsMobile()
  const { projects, clients, jobs, createJob } = useOps()
  const { entries, hourRules, rates } = useTime()
  const { isAdmin } = useAuth()

  const [tab, setTab] = useState('standorte')
  const [plaene, setPlaene] = useState([])
  const [aufgaben, setAufgaben] = useState([])
  const [gaenge, setGaenge] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [jahr, setJahr] = useState(new Date().getFullYear())
  const [offerModal, setOfferModal] = useState(false)
  const [gangModal, setGangModal] = useState(null)          // Gang, der terminiert wird
  const [aufgabeModal, setAufgabeModal] = useState(null)    // { plan, aufgabe|null }
  const [erledigenModal, setErledigenModal] = useState(null) // Gang mit Aufgaben-Checkliste
  const [busyCarry, setBusyCarry] = useState(false)

  async function loadAll() {
    try {
      const [p, a, g, o] = await Promise.all([
        sb.from('pflege_plaene').select('*').order('project_id'),
        sb.from('pflege_aufgaben').select('*').order('sort_order'),
        sb.from('pflege_gaenge').select('*').order('kw'),
        sb.from('angebote').select('*').order('created_at', { ascending: false }), // RLS: nur Admins sehen Zeilen
      ])
      setPlaene(p.data || []); setAufgaben(a.data || []); setGaenge(g.data || []); setOffers(o.data || [])
      if (!(p.data || []).some((x) => x.jahr === new Date().getFullYear()) && (p.data || []).length) {
        setJahr(Math.max(...p.data.map((x) => x.jahr)))
      }
    } catch (err) { dbErr('pflege')(err) }
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  const projById = useMemo(() => Object.fromEntries((projects || []).map((p) => [p.id, p])), [projects])
  const clientById = useMemo(() => Object.fromEntries((clients || []).map((c) => [c.id, c])), [clients])
  const jobById = useMemo(() => Object.fromEntries((jobs || []).map((j) => [j.id, j])), [jobs])

  const yearPlans = useMemo(() => plaene.filter((p) => p.jahr === jahr), [plaene, jahr])
  const years = useMemo(() => [...new Set(plaene.map((p) => p.jahr))].sort(), [plaene])
  const aufgabenByPlan = useMemo(() => {
    const m = {}
    for (const a of aufgaben) (m[a.plan_id] = m[a.plan_id] || []).push(a)
    return m
  }, [aufgaben])
  const gaengeByPlan = useMemo(() => {
    const m = {}
    for (const g of gaenge) (m[g.plan_id] = m[g.plan_id] || []).push(g)
    return m
  }, [gaenge])

  const planLabel = (p) => {
    const proj = projById[p.project_id]
    return `${proj?.name || p.project_id}${p.objekt ? ` · ${p.objekt}` : ''}`
  }
  const planClientId = (p) => projById[p.project_id]?.client_id
  const planHours = (p) => (aufgabenByPlan[p.id] || []).reduce((s, a) => s + Number(a.jahres_stunden || 0), 0)

  function updatePlan(id, changes) {
    setPlaene((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))
    sb.from('pflege_plaene').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id)
      .then(({ error }) => { if (error) dbErr('pflege_plaene')(error) })
  }

  function updateGang(id, changes) {
    setGaenge((prev) => prev.map((g) => (g.id === id ? { ...g, ...changes } : g)))
    sb.from('pflege_gaenge').update(changes).eq('id', id)
      .then(({ error }) => { if (error) dbErr('pflege_gaenge')(error) })
  }

  // Erledigt-Setzen läuft über die Aufgaben-Checkliste (Restanten, Kap. 6.1):
  // Unerledigtes wird am Gang markiert und taucht im Abschluss-Tab auf.
  function markErledigt(gang) {
    if ((gang.aufgaben || []).length) setErledigenModal(gang)
    else updateGang(gang.id, { status: 'erledigt' })
  }

  // Gang terminieren → echter Einsatz (job) mit Soll-Stunden, Gang verlinkt.
  // Erledigt/abgesagt wird der Gang danach automatisch per DB-Trigger.
  function terminierenGang(gang, { date, assigned_users }) {
    const plan = plaene.find((p) => p.id === gang.plan_id)
    if (!plan || !date) return
    const aufgabenText = (gang.aufgaben || []).map((a) => `– ${a.titel} (${a.stunden} h)`).join('\n')
    const job = createJob({
      project_id: plan.project_id, title: gang.titel || `Pflegegang KW ${gang.kw}`,
      job_type: 'pflege', date, date_end: null, start_time: '08:00', end_time: null,
      duration: 'full', assigned_users, vehicle_id: null, vehicle_ids: [], tools: [],
      notes: `Pflegegang KW ${gang.kw}${plan.objekt ? ` · ${plan.objekt}` : ''}\n${aufgabenText}`,
      location: null, color: null, status: 'planned',
      planned_hours: round2(Number(gang.soll_stunden || 0) + Number(gang.fahrt_stunden || 0)),
    })
    updateGang(gang.id, { job_id: job.id, status: 'terminiert' })
    setGangModal(null)
  }

  // Aufgabe anlegen/ändern: wochen + jahres_stunden aus den Fenstern ableiten
  async function saveAufgabe(plan, aufgabe, values) {
    const wochen = wochenFromFenster(values.fenster)
    const jahres = round2(Object.values(wochen).reduce((s, h) => s + h, 0))
    const row = { ...values, wochen, jahres_stunden: jahres }
    if (aufgabe) {
      const { error } = await sb.from('pflege_aufgaben').update(row).eq('id', aufgabe.id)
      if (error) return dbErr('pflege_aufgaben')(error)
      setAufgaben((prev) => prev.map((a) => (a.id === aufgabe.id ? { ...a, ...row } : a)))
    } else {
      const sort = (aufgabenByPlan[plan.id] || []).length
      const { data, error } = await sb.from('pflege_aufgaben')
        .insert({ ...row, plan_id: plan.id, sort_order: sort }).select().single()
      if (error) return dbErr('pflege_aufgaben')(error)
      setAufgaben((prev) => [...prev, data])
    }
    setAufgabeModal(null)
  }

  async function deleteAufgabe(aufgabe) {
    if (!window.confirm(`Leistung „${aufgabe.titel}" aus dem Verzeichnis löschen?`)) return
    const { error } = await sb.from('pflege_aufgaben').delete().eq('id', aufgabe.id)
    if (error) return dbErr('pflege_aufgaben')(error)
    setAufgaben((prev) => prev.filter((a) => a.id !== aufgabe.id))
  }

  // Geplante Gänge eines Plans aus den Aufgaben neu erzeugen.
  // Terminierte/erledigte/entfallene Gänge (und ihre KWs) bleiben unberührt.
  async function regenerateGaenge(plan, tasksOverride) {
    const kept = (gaengeByPlan[plan.id] || []).filter((g) => g.status !== 'geplant')
    const keptKws = new Set(kept.map((g) => g.kw))
    const del = await sb.from('pflege_gaenge').delete().eq('plan_id', plan.id).eq('status', 'geplant')
    if (del.error) return dbErr('pflege_gaenge')(del.error)
    const weekly = {}, perKw = {}
    for (const a of tasksOverride || aufgabenByPlan[plan.id] || []) {
      for (const [kw, h] of Object.entries(a.wochen || {})) {
        if (!h) continue
        weekly[kw] = round2((weekly[kw] || 0) + Number(h))
        ;(perKw[kw] = perKw[kw] || []).push({ titel: a.titel.slice(0, 60), stunden: Number(h) })
      }
    }
    const rows = Object.entries(weekly)
      .filter(([kw]) => !keptKws.has(Number(kw)))
      .map(([kw, h]) => ({
        plan_id: plan.id, jahr: plan.jahr, kw: Number(kw),
        titel: `${saisonForKw(Number(kw)).label}spflege (KW ${kw})`, aufgaben: perKw[kw], soll_stunden: h,
      }))
    let inserted = []
    if (rows.length) {
      const ins = await sb.from('pflege_gaenge').insert(rows).select()
      if (ins.error) return dbErr('pflege_gaenge')(ins.error)
      inserted = ins.data || []
    }
    setGaenge((prev) => [...prev.filter((g) => g.plan_id !== plan.id || g.status !== 'geplant'), ...inserted])
  }

  // Jahresübernahme: LV + Kalibrierung + Notizen ins Folgejahr kopieren,
  // Gänge aus den Saisonfenstern neu erzeugen, Status Entwurf.
  async function carryOverPlan(plan, target) {
    if (plaene.some((p) => p.project_id === plan.project_id && p.objekt === plan.objekt && p.jahr === target)) return null
    const { data: np, error } = await sb.from('pflege_plaene').insert({
      project_id: plan.project_id, objekt: plan.objekt, jahr: target,
      status: 'entwurf', kalib_faktor: plan.kalib_faktor, notizen: plan.notizen,
    }).select().single()
    if (error) { dbErr('pflege_plaene')(error); return null }
    const rows = (aufgabenByPlan[plan.id] || []).map((a) => ({
      plan_id: np.id, katalog_key: a.katalog_key, titel: a.titel, beschreibung: a.beschreibung,
      kategorie: a.kategorie, fenster: a.fenster, wochen: a.wochen,
      jahres_stunden: a.jahres_stunden, sort_order: a.sort_order,
    }))
    let newTasks = []
    if (rows.length) {
      const ins = await sb.from('pflege_aufgaben').insert(rows).select()
      if (ins.error) { dbErr('pflege_aufgaben')(ins.error); return null }
      newTasks = ins.data || []
    }
    const weekly = {}, perKw = {}
    for (const a of newTasks) {
      for (const [kw, h] of Object.entries(a.wochen || {})) {
        if (!h) continue
        weekly[kw] = round2((weekly[kw] || 0) + Number(h))
        ;(perKw[kw] = perKw[kw] || []).push({ titel: a.titel.slice(0, 60), stunden: Number(h) })
      }
    }
    const gRows = Object.entries(weekly).map(([kw, h]) => ({
      plan_id: np.id, jahr: target, kw: Number(kw),
      titel: `${saisonForKw(Number(kw)).label}spflege (KW ${kw})`, aufgaben: perKw[kw], soll_stunden: h,
    }))
    let newGaenge = []
    if (gRows.length) {
      const gi = await sb.from('pflege_gaenge').insert(gRows).select()
      if (gi.error) { dbErr('pflege_gaenge')(gi.error) } else newGaenge = gi.data || []
    }
    setPlaene((prev) => [...prev, np])
    setAufgaben((prev) => [...prev, ...newTasks])
    setGaenge((prev) => [...prev, ...newGaenge])
    return np
  }

  async function prepareNextYear() {
    const target = jahr + 1
    const todo = yearPlans.filter((p) => !plaene.some((q) => q.project_id === p.project_id && q.objekt === p.objekt && q.jahr === target))
    if (!todo.length) { setJahr(target); return }
    if (!window.confirm(`${todo.length} Standorte ins Jahr ${target} übernehmen? (LV + Kalibrierung, Gänge neu, Status Entwurf)`)) return
    setBusyCarry(true)
    for (const p of todo) await carryOverPlan(p, target)
    setBusyCarry(false)
    setJahr(target)
  }

  const totalTage = yearPlans.reduce((s, p) => s + (gaengeByPlan[p.id] || []).filter((g) => g.status !== 'entfallen').length, 0)
  const TABS = [['standorte', 'Standorte'], ['jahresplan', 'Jahresplan'], ['abschluss', 'Abschluss'], ...(isAdmin ? [['angebote', 'Angebote & Verträge']] : [])]

  return (
    <div>
      <PageHeader
        title="Pflege" isMobile={isMobile}
        eyebrow="Pflegeplanung"
        sub={`${yearPlans.length} Standorte · ${totalTage} Einsatztage · ${hrs(yearPlans.reduce((s, p) => s + planHours(p), 0))} in ${jahr} · Winter = Pflegepause`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {years.length > 1 && (
              <select value={jahr} onChange={(e) => setJahr(Number(e.target.value))} style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px' }}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {yearPlans.length > 0 && !years.includes(jahr + 1) && (
              <Button variant="ghost" icon={ArrowRightCircle} disabled={busyCarry} onClick={prepareNextYear}>
                {busyCarry ? 'Übernehme…' : `${jahr + 1} vorbereiten`}
              </Button>
            )}
          </div>
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} isMobile={isMobile} />
      {loading ? (
        <EmptyState icon={Sprout} title="lädt…" />
      ) : !yearPlans.length && tab !== 'angebote' ? (
        <EmptyState icon={Sprout} title={`Keine Pflegepläne für ${jahr}`}
          hint={years.length ? `Vorhandene Jahre: ${years.join(', ')} — über „${jahr - 1}" auswählen und „${jahr} vorbereiten" übernehmen.` : 'Import: node scripts/gen-pflege-import.mjs'} />
      ) : (
        <>
          {tab === 'standorte' && (
            <TabStandorte isMobile={isMobile} plans={yearPlans}
              {...{ jahr, years, aufgabenByPlan, gaengeByPlan, jobById, planLabel, planClientId, planHours, clientById, projById, updatePlan, updateGang, regenerateGaenge, carryOverPlan, markErledigt, onTerminieren: setGangModal, deleteAufgabe, onEditAufgabe: (plan, aufgabe) => setAufgabeModal({ plan, aufgabe }) }} />
          )}
          {tab === 'jahresplan' && (
            <TabJahresplan plans={yearPlans}
              {...{ jahr, gaengeByPlan, jobById, planLabel, hourRules, markErledigt, onTerminieren: setGangModal }} />
          )}
          {tab === 'abschluss' && (
            <TabAbschluss plans={yearPlans}
              {...{ jahr, entries, jobs, gaengeByPlan, planLabel, planHours, projById, updatePlan, updateGang, clients }} />
          )}
          {tab === 'angebote' && isAdmin && (
            <TabAngebote {...{ offers, setOffers, clientById, onNew: () => setOfferModal(true) }} />
          )}
        </>
      )}
      {offerModal && (
        <OfferModal
          onClose={() => setOfferModal(false)}
          onSaved={(row) => { setOffers((prev) => [row, ...prev]); setOfferModal(false) }}
          {...{ plaene, jahr, clients, rates, planLabel, planClientId, planHours, aufgabenByPlan }}
        />
      )}
      {gangModal && (
        <TerminModal gang={gangModal} label={planLabel(plaene.find((p) => p.id === gangModal.plan_id) || {})}
          onClose={() => setGangModal(null)} onSubmit={(v) => terminierenGang(gangModal, v)} />
      )}
      {aufgabeModal && (
        <AufgabeModal plan={aufgabeModal.plan} aufgabe={aufgabeModal.aufgabe}
          onClose={() => setAufgabeModal(null)} onSave={saveAufgabe} />
      )}
      {erledigenModal && (
        <ErledigenModal gang={erledigenModal} label={planLabel(plaene.find((p) => p.id === erledigenModal.plan_id) || {})}
          onClose={() => setErledigenModal(null)}
          onSubmit={(neueAufgaben) => { updateGang(erledigenModal.id, { status: 'erledigt', aufgaben: neueAufgaben }); setErledigenModal(null) }} />
      )}
    </div>
  )
}

/* ─── Saison-Fortschritt (F · S · H als Segmente) ─────────────── */

function SaisonBar({ gaenge }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {SAISONS.map((s) => {
        const gs = gaenge.filter((g) => g.status !== 'entfallen' && saisonForKw(g.kw).key === s.key)
        const done = gs.filter((g) => g.status === 'erledigt').length
        const all = gs.length
        const complete = all > 0 && done === all
        return (
          <span key={s.key} title={`${s.label}spflege: ${done}/${all} Einsätze erledigt`}
            style={{
              fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 9,
              color: all === 0 ? `color-mix(in srgb, ${MUTED} 55%, transparent)` : complete ? 'var(--luma-on-a)' : s.color,
              background: complete ? s.color : `color-mix(in srgb, ${s.color} ${all === 0 ? 5 : 13}%, transparent)`,
              border: `1px solid color-mix(in srgb, ${s.color} ${all === 0 ? 15 : 35}%, transparent)`,
            }}>
            {s.kurz} {all > 0 ? `${done}/${all}` : '–'}
          </span>
        )
      })}
    </div>
  )
}

/* ─── Tab: Standorte (Objektakten) ────────────────────────────── */

function TabStandorte({ isMobile, plans, jahr, aufgabenByPlan, gaengeByPlan, jobById, planLabel, planClientId, planHours, clientById, projById, updatePlan, updateGang, regenerateGaenge, carryOverPlan, markErledigt, onTerminieren, deleteAufgabe, onEditAufgabe }) {
  const [open, setOpen] = useState(null)
  const [copied, setCopied] = useState(null)
  const curKW = jahr === new Date().getFullYear() ? isoWeek() : jahr < new Date().getFullYear() ? 53 : 0

  const sorted = [...plans].sort((a, b) => (planClientId(a) || '').localeCompare(planClientId(b) || '') || planLabel(a).localeCompare(planLabel(b)))
  const faelligCount = plans.reduce((s, p) => s + (gaengeByPlan[p.id] || []).filter((g) => g.status === 'geplant' && g.kw <= curKW + 2).length, 0)
  const doneCount = plans.reduce((s, p) => s + (gaengeByPlan[p.id] || []).filter((g) => g.status === 'erledigt').length, 0)
  const totalCount = plans.reduce((s, p) => s + (gaengeByPlan[p.id] || []).filter((g) => g.status !== 'entfallen').length, 0)

  async function copyText(key, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2500)
    } catch { window.__lumaToast?.('⚠️ Kopieren fehlgeschlagen') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Standorte" value={plans.length} />
        <StatCard label="Einsatztage" value={`${doneCount}/${totalCount}`} sub="erledigt / geplant" />
        <StatCard label="Jahresstunden" value={hrs(plans.reduce((s, p) => s + planHours(p), 0))} sub="vor Ort, ohne Fahrt" />
        <StatCard label="Fällig" value={faelligCount} sub="nächste 2 Wochen" color={faelligCount > 0 ? WARN : undefined} />
      </div>

      {sorted.map((p) => {
        const tasks = (aufgabenByPlan[p.id] || []).filter((a) => Number(a.jahres_stunden) > 0)
        const gs = (gaengeByPlan[p.id] || []).slice().sort((a, b) => a.kw - b.kw)
        const client = clientById[planClientId(p)]
        const isOpen = open === p.id
        const next = gs.find((g) => g.status === 'geplant' || g.status === 'terminiert')
        const nextJob = next?.job_id ? jobById[next.job_id] : null
        const projName = projById[p.project_id]?.name || p.project_id
        const lv = () => lvDokument(p, aufgabenByPlan[p.id] || [], projName)

        return (
          <Card key={p.id} padding="0">
            {/* Kopfzeile: bewusst nur das Wesentliche */}
            <div onClick={() => setOpen(isOpen ? null : p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
              {isOpen ? <ChevronDown size={15} color={MUTED} /> : <ChevronRight size={15} color={MUTED} />}
              <div style={{ fontSize: 14, fontWeight: 500, color: FG, flex: 1, minWidth: 150 }}>{planLabel(p)}</div>
              <SaisonBar gaenge={gs} />
              {next && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: next.status === 'terminiert' ? INFO : next.kw < curKW ? DANGER : MUTED }}>
                  {nextJob?.date ? `→ ${fmtDate(nextJob.date)}` : `→ KW ${next.kw}`}
                </span>
              )}
              {client && <Badge color={client.color || A}>{client.name}</Badge>}
              <div style={{ fontFamily: MONO, fontSize: 12, color: FG }}>{hrs(planHours(p))}</div>
            </div>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Leistungsverzeichnis */}
                <div>
                  <SectionLabel style={{ marginBottom: 8 }} action={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" icon={copied === `lv-${p.id}` ? Check : Copy} style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => copyText(`lv-${p.id}`, lv())}>{copied === `lv-${p.id}` ? 'Kopiert' : 'LV kopieren'}</Button>
                      <a href={`mailto:${clientById[planClientId(p)]?.contact_email || ''}?subject=${encodeURIComponent(`Leistungsverzeichnis Gartenpflege — ${projName}`)}&body=${encodeURIComponent(lv())}`}
                        style={{ textDecoration: 'none' }}>
                        <Button variant="ghost" icon={Mail} style={{ padding: '4px 10px', fontSize: 12 }} type="button">LV senden</Button>
                      </a>
                      <Button variant="ghost" icon={Plus} style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => onEditAufgabe(p, null)}>Leistung</Button>
                    </div>
                  }>Leistungsverzeichnis</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {tasks.map((a) => (
                      <div key={a.id} className="lu-card" style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 2px', borderBottom: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)` }}>
                        <span style={{ color: MUTED, fontSize: 11 }}>○</span>
                        <span style={{ fontSize: 13, color: FG }} title={a.beschreibung || ''}>{a.titel}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED, flex: 1 }}>{fensterText(a.fenster)}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED }}>{hrs(a.jahres_stunden)}</span>
                        <button type="button" onClick={() => onEditAufgabe(p, a)} title="Bearbeiten"
                          style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}><Pencil size={12} /></button>
                        <button type="button" onClick={() => deleteAufgabe(a)} title="Löschen"
                          style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {!tasks.length && <div style={{ fontSize: 12, color: MUTED }}>Noch keine Leistungen — über „+ Leistung" aus dem Katalog anlegen.</div>}
                  </div>
                </div>

                {/* Einsätze des Jahres */}
                <div>
                  <SectionLabel style={{ marginBottom: 8 }} action={
                    <Button variant="ghost" icon={RefreshCw} style={{ padding: '4px 10px', fontSize: 12 }}
                      title="Geplante Einsätze aus dem Leistungsverzeichnis neu erzeugen (terminierte/erledigte bleiben)"
                      onClick={() => regenerateGaenge(p)}>Neu generieren</Button>
                  }>Einsätze {jahr}</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {gs.map((g) => {
                      const saison = saisonForKw(g.kw)
                      const job = g.job_id ? jobById[g.job_id] : null
                      const late = g.status === 'geplant' && g.kw < curKW
                      const offen = (g.aufgaben || []).filter((a) => a.offen).length
                      return (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', flexWrap: 'wrap' }}>
                          <span title={`${saison.label}spflege`} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: saison.color, width: 12 }}>{saison.kurz}</span>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: late ? DANGER : MUTED, width: 46 }}>KW {g.kw}</span>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: FG, width: 84 }}>{job?.date ? fmtDate(job.date) : '—'}</span>
                          <Badge color={late ? DANGER : GANG_STATUS[g.status]}>{late ? 'überfällig' : g.status}</Badge>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{hrs(Number(g.soll_stunden) + Number(g.fahrt_stunden || 0))}</span>
                          {offen > 0 && <Badge color={WARN}>{offen} offen</Badge>}
                          <span style={{ flex: 1 }} />
                          {g.status === 'geplant' && (
                            <>
                              <Button variant="ghost" icon={CalendarPlus} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onTerminieren(g)}>Terminieren</Button>
                              <Button variant="ghost" icon={Check} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => markErledigt(g)}>Erledigt</Button>
                              <Button variant="ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => updateGang(g.id, { status: 'entfallen' })}>Entfällt</Button>
                            </>
                          )}
                          {g.status === 'terminiert' && (
                            <>
                              <Button variant="ghost" icon={Check} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => markErledigt(g)}>Erledigt</Button>
                              <Button variant="ghost" icon={RotateCcw} style={{ padding: '3px 9px', fontSize: 11 }} title="Verknüpfung zum Einsatz lösen" onClick={() => updateGang(g.id, { status: 'geplant', job_id: null })} />
                            </>
                          )}
                          {(g.status === 'erledigt' || g.status === 'entfallen') && (
                            <Button variant="ghost" icon={RotateCcw} style={{ padding: '3px 9px', fontSize: 11 }} title="Zurücksetzen" onClick={() => updateGang(g.id, { status: 'geplant' })} />
                          )}
                        </div>
                      )
                    })}
                    {!gs.length && <div style={{ fontSize: 12, color: MUTED }}>Keine Einsätze — über „Neu generieren" aus dem LV erzeugen.</div>}
                  </div>
                </div>

                {p.notizen && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55, fontStyle: 'italic' }}>{p.notizen}</div>}

                {/* Fußzeile: Status, Kalibrierung, Jahresübernahme */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  {['entwurf', 'aktiv', 'abgeschlossen'].map((s) => (
                    <span key={s} onClick={() => updatePlan(p.id, { status: s })} style={{ cursor: 'pointer', opacity: p.status === s ? 1 : 0.45 }}>
                      <Badge color={p.status === s ? STATUS_COLORS[s] : MUTED}>{s}</Badge>
                    </span>
                  ))}
                  <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginLeft: 8 }}>Kalibrierung ×</span>
                  <input type="number" step="0.05" min="0.1" max="5" value={Number(p.kalib_faktor) || 1}
                    onChange={(e) => updatePlan(p.id, { kalib_faktor: Number(e.target.value) || 1 })}
                    title="Ist/Plan-Faktor für Folgeangebote — händisch oder im Abschluss-Tab übernehmen"
                    style={{ ...INPUT_STYLE, width: 68, padding: '4px 8px', fontFamily: MONO, fontSize: 12, textAlign: 'right' }} />
                  <Button variant="ghost" icon={ArrowRightCircle} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}
                    title={`LV + Kalibrierung nach ${jahr + 1} kopieren, Einsätze neu erzeugen`}
                    onClick={() => carryOverPlan(p, jahr + 1).then((np) => np && window.__lumaToast?.(`✓ ${planLabel(p)} → ${jahr + 1} übernommen`))}>
                    → {jahr + 1}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ─── Tab: Jahresplan (Belegung Standorte × KW + Kapazität) ───── */

function TabJahresplan({ plans, jahr, gaengeByPlan, jobById, planLabel, hourRules, markErledigt, onTerminieren }) {
  const curKW = jahr === new Date().getFullYear() ? isoWeek() : jahr < new Date().getFullYear() ? 53 : 0
  const KWS = []
  for (let k = SAISONS[0].von; k <= SAISONS[2].bis; k += 1) KWS.push(k)

  const sorted = [...plans].sort((a, b) => planLabel(a).localeCompare(planLabel(b)))
  const faellig = plans.flatMap((p) => (gaengeByPlan[p.id] || [])
    .filter((g) => g.status === 'geplant' && g.kw <= curKW + 2)
    .map((g) => ({ ...g, planRef: p }))).sort((a, b) => a.kw - b.kw)
  const winterGaenge = plans.flatMap((p) => (gaengeByPlan[p.id] || [])
    .filter((g) => saisonForKw(g.kw).key === 'winter' && g.status !== 'entfallen')
    .map((g) => ({ ...g, planRef: p }))).sort((a, b) => a.kw - b.kw)

  // Einsatztage je KW (1 Gang ≈ 1 Einsatztag)
  const tageJeKw = {}
  for (const p of plans) for (const g of gaengeByPlan[p.id] || []) {
    if (g.status !== 'entfallen') tageJeKw[g.kw] = (tageJeKw[g.kw] || 0) + 1
  }

  const CELL = 20

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {faellig.length > 0 && (
        <Card accent={WARN} padding="12px 16px">
          <SectionLabel style={{ marginBottom: 8 }}>Fällig (bis KW {curKW + 2})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {faellig.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: g.kw < curKW ? DANGER : MUTED, width: 46 }}>KW {g.kw}</span>
                <span style={{ fontSize: 13, color: FG, flex: 1, minWidth: 140 }}>{planLabel(g.planRef)}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{hrs(Number(g.soll_stunden) + Number(g.fahrt_stunden || 0))}</span>
                <Button variant="ghost" icon={CalendarPlus} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onTerminieren(g)}>Terminieren</Button>
                <Button variant="ghost" icon={Check} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => markErledigt(g)}>Erledigt</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding="14px 16px">
        <SectionLabel style={{ marginBottom: 10 }}>Belegung {jahr} · KW {SAISONS[0].von}–{SAISONS[2].bis} (Dez–Feb Pflegepause)</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: KWS.length * CELL + 170 }}>
            {/* Saison-Band */}
            <div style={{ display: 'flex', marginLeft: 170, marginBottom: 4 }}>
              {SAISONS.map((s) => (
                <div key={s.key} style={{
                  width: (s.bis - s.von + 1) * CELL, textAlign: 'center',
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: s.color, borderBottom: `2px solid color-mix(in srgb, ${s.color} 55%, transparent)`, paddingBottom: 2,
                }}>{s.label}</div>
              ))}
            </div>
            {/* KW-Skala */}
            <div style={{ display: 'flex', marginLeft: 170, marginBottom: 6 }}>
              {KWS.map((k) => (
                <div key={k} style={{ width: CELL, textAlign: 'center', fontFamily: MONO, fontSize: 8, color: k === curKW ? FG : MUTED, fontWeight: k === curKW ? 700 : 400 }}>
                  {k % 2 === 0 ? k : ''}
                </div>
              ))}
            </div>
            {/* Zeilen je Standort */}
            {sorted.map((p) => {
              const byKw = {}
              for (const g of gaengeByPlan[p.id] || []) {
                if (g.status !== 'entfallen' && saisonForKw(g.kw).key !== 'winter') (byKw[g.kw] = byKw[g.kw] || []).push(g)
              }
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', height: 26 }}>
                  <div style={{ width: 170, fontSize: 12, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{planLabel(p)}</div>
                  {KWS.map((k) => {
                    const cell = byKw[k] || []
                    if (!cell.length) return <div key={k} style={{ width: CELL, textAlign: 'center', color: `color-mix(in srgb, ${MUTED} 22%, transparent)`, fontSize: 9 }}>·</div>
                    const g = cell[0]
                    const late = g.status === 'geplant' && g.kw < curKW
                    const c = late ? DANGER : g.status === 'erledigt' ? OK : g.status === 'terminiert' ? INFO : MUTED
                    const job = g.job_id ? jobById[g.job_id] : null
                    const tip = `${planLabel(p)} · KW ${g.kw} · ${hrs(Number(g.soll_stunden) + Number(g.fahrt_stunden || 0))}${job?.date ? ` · ${fmtDate(job.date)}` : ''} · ${late ? 'überfällig' : g.status}`
                    return (
                      <div key={k} style={{ width: CELL, display: 'flex', justifyContent: 'center' }}>
                        <button type="button" title={tip}
                          onClick={() => { if (g.status === 'geplant') onTerminieren(g) }}
                          style={{
                            width: 13, height: 13, borderRadius: '50%', border: 'none', padding: 0,
                            cursor: g.status === 'geplant' ? 'pointer' : 'default',
                            background: g.status === 'geplant' && !late ? `color-mix(in srgb, ${MUTED} 40%, transparent)` : c,
                            outline: cell.length > 1 ? `2px solid color-mix(in srgb, ${c} 45%, transparent)` : 'none',
                          }} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {/* Summenzeile: Einsatztage je KW */}
            <div style={{ display: 'flex', alignItems: 'center', height: 24, borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 3 }}>
              <div style={{ width: 170, ...LABEL_STYLE, marginBottom: 0 }}>Einsatztage</div>
              {KWS.map((k) => (
                <div key={k} style={{ width: CELL, textAlign: 'center', fontFamily: MONO, fontSize: 9, color: (tageJeKw[k] || 0) > 2 ? WARN : MUTED }}>
                  {tageJeKw[k] || ''}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {[['geplant', `color-mix(in srgb, ${MUTED} 40%, transparent)`], ['terminiert', INFO], ['erledigt', OK], ['überfällig', DANGER]].map(([l, c]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, color: MUTED }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c }} /> {l}
            </span>
          ))}
          <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>Klick auf geplanten Punkt = Terminieren</span>
        </div>
      </Card>

      {winterGaenge.length > 0 && (
        <Card padding="12px 16px">
          <SectionLabel style={{ marginBottom: 8 }}>Winter-Einsätze (Ausnahmen von der Pflegepause)</SectionLabel>
          {winterGaenge.map((g) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, width: 46 }}>KW {g.kw}</span>
              <span style={{ fontSize: 12.5, color: FG, flex: 1 }}>{planLabel(g.planRef)}</span>
              <Badge color={GANG_STATUS[g.status]}>{g.status}</Badge>
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{hrs(g.soll_stunden)}</span>
            </div>
          ))}
        </Card>
      )}

      <Kapazitaet plans={plans} gaengeByPlan={gaengeByPlan} hourRules={hourRules} />
    </div>
  )
}

/* ─── Kapazität (Bestandteil des Jahresplans) ─────────────────── */

function Kapazitaet({ plans, gaengeByPlan, hourRules }) {
  // 'gesamt' = Jahresbild (alle Gänge außer entfallen); 'offen' = nur geplant/terminiert
  const [mode, setMode] = useState('gesamt')
  const demand = Array(12).fill(0)
  for (const p of plans) {
    for (const g of gaengeByPlan[p.id] || []) {
      const m = monthOf(g.kw)
      if (m < 0 || g.status === 'entfallen') continue
      if (mode === 'offen' && g.status === 'erledigt') continue
      demand[m] += Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0)
    }
  }
  const rules = Object.values(hourRules || {})
  const monthlyCap = rules.reduce((s, r) => {
    if (r.rule_type === 'monthly') return s + Number(r.monthly_hours || 0)
    if (r.rule_type === 'weekly') return s + Number(r.weekly_hours || 0) * 4.33
    return s
  }, 0)
  const capPeople = rules.filter((r) => r.rule_type === 'monthly' || r.rule_type === 'weekly').map((r) => r.team_id).join(', ')
  const maxVal = Math.max(monthlyCap, ...demand, 1)
  const overMonths = demand.map((d, i) => ({ m: i, delta: monthlyCap - d })).filter((x) => x.delta < -0.01)

  return (
    <>
      <Card padding="14px 16px">
        <SectionLabel style={{ marginBottom: 10 }} action={
          <Chips options={[['gesamt', 'Jahresbild'], ['offen', 'Nur offen']]} value={mode} onChange={setMode} />
        }>Kapazität: Bedarf (inkl. Fahrt) vs. verfügbare Stunden</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {MONATE.map((m, i) => {
            const d = demand[i]
            const over = d > monthlyCap + 0.01
            return (
              <div key={m} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 130px', gap: 10, alignItems: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>{m}</div>
                <div style={{ position: 'relative', height: 14, background: `color-mix(in srgb, ${MUTED} 8%, transparent)`, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (d / maxVal) * 100)}%`, background: over ? `color-mix(in srgb, ${DANGER} 55%, transparent)` : `color-mix(in srgb, ${A} 55%, transparent)`, borderRadius: 5 }} />
                  <div title={`verfügbar: ${hrs(monthlyCap)}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(monthlyCap / maxVal) * 100}%`, width: 2, background: FG, opacity: 0.65 }} />
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: over ? DANGER : FG, textAlign: 'right' }}>
                  {round2(d).toLocaleString('de-DE')} / {round2(monthlyCap).toLocaleString('de-DE')} h
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 10 }}>
          Verfügbar = Stundenkonto-Regeln ({capPeople || '—'}) · Bedarf = Einsätze inkl. Fahrt-/Rüstzeit
        </div>
      </Card>

      {overMonths.length > 0 && (
        <Card accent={WARN} padding="12px 16px">
          <SectionLabel style={{ marginBottom: 8 }}>Team-/Springer-Bedarf</SectionLabel>
          {overMonths.map(({ m, delta }) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: FG, padding: '2px 0' }}>
              <AlertTriangle size={13} color={WARN} />
              <strong>{MONATE[m]}:</strong> {hrs(-delta)} zusätzlich nötig
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>≈ {Math.ceil(-delta / 10)} Personen-Tage à 10 h</span>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

/* ─── Modal: Gang terminieren ─────────────────────────────────── */

function TerminModal({ gang, label, onClose, onSubmit }) {
  const [date, setDate] = useState('')
  const [crew, setCrew] = useState([])
  const people = allPeople()

  return (
    <Modal eyebrow="Einsatz terminieren" title={`${label} · KW ${gang.kw}`} onClose={onClose} maxWidth={480}>
      <form onSubmit={(e) => { e.preventDefault(); if (date) onSubmit({ date, assigned_users: crew }) }}
        style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {hrs(Number(gang.soll_stunden))} vor Ort + {hrs(Number(gang.fahrt_stunden || 0))} Fahrt
          {(gang.aufgaben || []).length > 0 && ` · ${(gang.aufgaben || []).length} Aufgaben (landen in den Einsatz-Notizen)`}
        </div>
        <div>
          <label style={LABEL_STYLE}>Datum</label>
          <DateInput value={date} onChange={setDate} required />
        </div>
        <div>
          <label style={LABEL_STYLE}>Crew</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {people.map((p) => {
              const on = crew.includes(p.id)
              return (
                <button key={p.id} type="button" onClick={() => setCrew((prev) => on ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                  className="lu-chip"
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${on ? (p.color || A) : BORDER}`, background: on ? `color-mix(in srgb, ${p.color || A} 14%, transparent)` : 'transparent', color: on ? FG : MUTED, cursor: 'pointer', fontSize: 12, fontFamily: SANS }}>
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>
        <ModalActions onCancel={onClose} submitLabel="Einsatz anlegen" />
      </form>
    </Modal>
  )
}

/* ─── Modal: Gang abschließen (Restanten-Checkliste) ──────────── */

function ErledigenModal({ gang, label, onClose, onSubmit }) {
  const items = gang.aufgaben || []
  const [done, setDone] = useState(() => new Set(items.map((_, i) => i)))
  const toggle = (i) => setDone((prev) => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })
  const offen = items.length - done.size

  return (
    <Modal eyebrow="Einsatz abschließen" title={`${label} · KW ${gang.kw}`} onClose={onClose} maxWidth={520}>
      <form onSubmit={(e) => {
        e.preventDefault()
        onSubmit(items.map((a, i) => ({ ...a, offen: !done.has(i) || undefined })))
      }} style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, color: MUTED }}>Was wurde geschafft? Nicht Abgehaktes landet als „offen" im Abschluss-Tab und kann in den nächsten Einsatz übernommen werden.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((a, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: FG }}>
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} />
              <span style={{ flex: 1, textDecoration: done.has(i) ? 'none' : 'none', opacity: done.has(i) ? 1 : 0.75 }}>{a.titel}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{hrs(a.stunden)}</span>
            </label>
          ))}
        </div>
        {offen > 0 && (
          <div style={{ fontSize: 12, color: WARN }}>
            {offen} Aufgabe{offen === 1 ? '' : 'n'} bleib{offen === 1 ? 't' : 'en'} offen.
          </div>
        )}
        <ModalActions onCancel={onClose} submitLabel="Einsatz abschließen" />
      </form>
    </Modal>
  )
}

/* ─── Modal: Leistung anlegen/bearbeiten ──────────────────────── */

const TURNUS_OPTIONS = [['einmalig', '1×'], ['monatlich', 'monatlich'], ['2x_monat', '2× im Monat'], ['quartal', 'quartalsweise'], ['nach_bedarf', 'nach Bedarf (0 h)']]

function AufgabeModal({ plan, aufgabe, onClose, onSave }) {
  const [katalogKey, setKatalogKey] = useState(aufgabe?.katalog_key || '')
  const [titel, setTitel] = useState(aufgabe?.titel || '')
  const [beschreibung, setBeschreibung] = useState(aufgabe?.beschreibung || '')
  const [kategorie, setKategorie] = useState(aufgabe?.kategorie || 'pflanzen')
  const [fenster, setFenster] = useState(aufgabe?.fenster?.length ? aufgabe.fenster : [{ von_monat: 4, bis_monat: 10, turnus: 'monatlich', stunden_pro_gang: 1 }])

  function pickKatalog(key) {
    setKatalogKey(key)
    const k = PFLEGE_KATALOG.find((x) => x.key === key)
    if (k) { setTitel(k.titel); setBeschreibung(k.beschreibung); setKategorie(k.kategorie) }
  }
  const setF = (i, changes) => setFenster((prev) => prev.map((f, j) => (j === i ? { ...f, ...changes } : f)))
  const vorschau = wochenFromFenster(fenster)
  const jahresH = round2(Object.values(vorschau).reduce((s, h) => s + h, 0))
  // Winter = Pflegepause: Fenster in Dez–Feb sind erlaubt, werden aber markiert
  const winterFenster = fenster.some((f) => [12, 1, 2].includes(Number(f.von_monat)) || [12, 1, 2].includes(Number(f.bis_monat)))

  return (
    <Modal eyebrow={aufgabe ? 'Leistung bearbeiten' : 'Leistung hinzufügen'} title={titel || 'Neue Leistung'} onClose={onClose} maxWidth={560}>
      <form onSubmit={(e) => { e.preventDefault(); if (titel.trim()) onSave(plan, aufgabe, { katalog_key: katalogKey || null, titel: titel.trim(), beschreibung, kategorie, fenster }) }}
        style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={LABEL_STYLE}>Aus dem Katalog (optional)</label>
          <select value={katalogKey} onChange={(e) => pickKatalog(e.target.value)} style={INPUT_STYLE}>
            <option value="">— freie Position —</option>
            {PFLEGE_KATALOG.map((k) => <option key={k.key} value={k.key}>{k.titel}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL_STYLE}>Titel</label>
          <input value={titel} onChange={(e) => setTitel(e.target.value)} required style={INPUT_STYLE} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Beschreibung</label>
            <input value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Kategorie</label>
            <select value={kategorie} onChange={(e) => setKategorie(e.target.value)} style={INPUT_STYLE}>
              <option value="pflanzen">Pflanzen</option>
              <option value="bewaesserung">Bewässerung</option>
              <option value="spezial">Spezial</option>
            </select>
          </div>
        </div>
        <div>
          <SectionLabel style={{ marginBottom: 8 }}>Saisonfenster</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fenster.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 70px 30px', gap: 6, alignItems: 'center' }}>
                <select value={f.von_monat} onChange={(e) => setF(i, { von_monat: Number(e.target.value) })} style={{ ...INPUT_STYLE, padding: '7px 8px', fontSize: 12 }}>
                  {MONATE.map((m, j) => <option key={m} value={j + 1}>{m}</option>)}
                </select>
                <select value={f.bis_monat} onChange={(e) => setF(i, { bis_monat: Number(e.target.value) })} style={{ ...INPUT_STYLE, padding: '7px 8px', fontSize: 12 }}>
                  {MONATE.map((m, j) => <option key={m} value={j + 1}>{m}</option>)}
                </select>
                <select value={f.turnus} onChange={(e) => setF(i, { turnus: e.target.value })} style={{ ...INPUT_STYLE, padding: '7px 8px', fontSize: 12 }}>
                  {TURNUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="number" step="0.25" min="0" value={f.stunden_pro_gang}
                  onChange={(e) => setF(i, { stunden_pro_gang: Number(e.target.value) })}
                  style={{ ...INPUT_STYLE, padding: '7px 8px', fontSize: 12, textAlign: 'right' }} title="Stunden je Gang" />
                <button type="button" onClick={() => setFenster((prev) => prev.filter((_, j) => j !== i))}
                  style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }} title="Fenster entfernen">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" icon={Plus} style={{ marginTop: 8 }}
            onClick={() => setFenster((prev) => [...prev, { von_monat: 4, bis_monat: 4, turnus: 'einmalig', stunden_pro_gang: 1 }])}>
            Fenster hinzufügen
          </Button>
        </div>
        {winterFenster && (
          <div style={{ fontSize: 12, color: WARN }}>Hinweis: Dez–Feb ist Pflegepause — Winterleistungen nur als bewusste Ausnahme planen.</div>
        )}
        <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
          ergibt {jahresH.toLocaleString('de-DE')} h/Jahr in {Object.keys(vorschau).length} Einsätzen — danach im Standort „Neu generieren"
        </div>
        <ModalActions onCancel={onClose} submitLabel="Speichern" />
      </form>
    </Modal>
  )
}

/* ─── Tab: Abschluss (Plan/Ist, Nachweis, Restanten) ──────────── */

function TabAbschluss({ plans, jahr, entries, jobs, gaengeByPlan, planLabel, planHours, projById, updatePlan, updateGang, clients }) {
  const curKW = jahr === new Date().getFullYear() ? isoWeek() : jahr < new Date().getFullYear() ? 53 : 0
  const [copied, setCopied] = useState(null)
  const [mailModal, setMailModal] = useState(null)

  // Restanten: offene Aufgaben aus erledigten Einsätzen (ErledigenModal)
  const restanten = plans.flatMap((p) => (gaengeByPlan[p.id] || [])
    .filter((g) => g.status === 'erledigt')
    .flatMap((g) => (g.aufgaben || [])
      .map((a, idx) => ({ ...a, gang: g, idx, plan: p }))
      .filter((x) => x.offen)))

  // Restant in den nächsten offenen Einsatz des Standorts übernehmen
  function verschiebe(r) {
    const next = (gaengeByPlan[r.plan.id] || [])
      .filter((g) => (g.status === 'geplant' || g.status === 'terminiert') && g.kw > r.gang.kw)
      .sort((a, b) => a.kw - b.kw)[0]
      || (gaengeByPlan[r.plan.id] || []).find((g) => g.status === 'geplant')
    if (!next) { window.__lumaToast?.('⚠️ Kein offener Einsatz an diesem Standort — erst „Neu generieren" oder Gang anlegen'); return }
    updateGang(next.id, {
      aufgaben: [...(next.aufgaben || []), { titel: r.titel, stunden: r.stunden }],
      soll_stunden: round2(Number(next.soll_stunden || 0) + Number(r.stunden || 0)),
    })
    updateGang(r.gang.id, {
      aufgaben: (r.gang.aufgaben || []).map((a, i) => (i === r.idx ? { ...a, offen: undefined, verschoben: true } : a)),
    })
  }

  function nachweisText(projectId, label) {
    const done = (jobs || [])
      .filter((j) => j.project_id === projectId && j.job_type === 'pflege' && j.status === 'done' && (j.date || '').startsWith(String(jahr)))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const lines = [`Leistungsnachweis Pflege — ${label}`,
      `Zeitraum: 01.01.${jahr} – ${new Date().toLocaleDateString('de-DE')}`, '']
    let sum = 0
    for (const j of done) {
      const booked = (entries || []).filter((e) => e.job_id === j.id).reduce((s, e) => s + Number(e.hours || 0), 0)
      const h = booked || Number(j.planned_hours || 0)
      sum += h
      lines.push(`• ${new Date(j.date + 'T00:00:00').toLocaleDateString('de-DE')} — ${j.title} — ${round2(h).toLocaleString('de-DE')} h`)
    }
    if (!done.length) lines.push('(Noch keine erledigten Pflege-Einsätze im System.)')
    lines.push('', `Summe: ${round2(sum).toLocaleString('de-DE')} h`)
    return lines.join('\n')
  }

  async function copyNachweis(projectId, label) {
    try {
      await navigator.clipboard.writeText(nachweisText(projectId, label))
      setCopied(projectId)
      setTimeout(() => setCopied(null), 2500)
    } catch { window.__lumaToast?.('⚠️ Kopieren fehlgeschlagen') }
  }

  // Kundentauglicher Leistungsnachweis als PDF — Grundlage ist die
  // Zeiterfassung (time_entries), nicht der Job-Status. Damit enthält der
  // Nachweis auch die Einsätze, die vor Ort gebucht, aber nie als Job
  // „erledigt" geklickt wurden — sonst bliebe er in der Praxis leer.
  function baueNachweis(projectId, label, ps) {
    const soll = ps
      .flatMap((p) => gaengeByPlan[p.id] || [])
      .filter((g) => g.status !== 'entfallen')
      .reduce((s, g) => s + Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0), 0)
    return buildLeistungsnachweis({
      leistungen: normalisiereZeiteintraege(
        (entries || []).filter((e) => e.project_id === projectId)),
      projekte: [{ id: projectId, name: label, location: projById[projectId]?.location || '' }],
      plaene: [{ project_id: projectId, jahr, soll_stunden: round2(soll) }],
      jahr,
    })
  }

  function pdfNachweis(projectId, label, ps) {
    const ok = druckeLeistungsnachweis(baueNachweis(projectId, label, ps), {
      kundeName: projById[projectId]?.client || '',
      titel: `Leistungsnachweis ${jahr}`,
    })
    if (!ok) window.__lumaToast?.('⚠️ Pop-up-Blocker verhindert die Druckansicht')
  }

  function mailNachweis(projectId, label, ps) {
    const clientId = projById[projectId]?.client_id
    const client = (clients || []).find((c) => c.id === clientId) || null
    setMailModal({ nachweis: baueNachweis(projectId, label, ps), client, clientId, label })
  }

  const istByProject = useMemo(() => {
    const m = {}
    for (const e of entries || []) {
      if (!e.project_id || !e.date?.startsWith(String(jahr))) continue
      m[e.project_id] = (m[e.project_id] || 0) + Number(e.hours || 0)
    }
    return m
  }, [entries, jahr])

  // ALLCURA & Co.: mehrere Pläne je Projekt → auf Projektebene zusammenfassen,
  // weil die Zeiterfassung nur das Projekt kennt, nicht das Teilobjekt.
  const groups = useMemo(() => {
    const m = {}
    for (const p of plans) (m[p.project_id] = m[p.project_id] || []).push(p)
    return Object.entries(m)
  }, [plans])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {restanten.length > 0 && (
        <Card accent={WARN} padding="12px 16px">
          <SectionLabel style={{ marginBottom: 8 }}>Nicht fertiggestellt ({restanten.length})</SectionLabel>
          {restanten.map((r, i) => (
            <div key={`${r.gang.id}-${r.idx}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: FG, flex: 1, minWidth: 160 }}>
                {r.titel}
                <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginLeft: 8 }}>{planLabel(r.plan)} · KW {r.gang.kw}</span>
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{hrs(r.stunden)}</span>
              <Button variant="ghost" icon={ArrowRightCircle} style={{ padding: '3px 9px', fontSize: 11 }}
                onClick={() => verschiebe(r)}>In nächsten Einsatz</Button>
            </div>
          ))}
        </Card>
      )}

      {groups.map(([projectId, ps]) => {
        const label = ps.length === 1 ? planLabel(ps[0]) : projById[projectId]?.name || projectId
        const gs = ps.flatMap((p) => gaengeByPlan[p.id] || []).filter((g) => g.status !== 'entfallen')
        const sollYtd = gs.filter((g) => g.kw <= curKW).reduce((s, g) => s + Number(g.soll_stunden || 0), 0)
        const sollJahr = ps.reduce((s, p) => s + planHours(p), 0)
        const ist = istByProject[projectId] || 0
        const pflegeJobIds = new Set((jobs || []).filter((j) => j.project_id === projectId && j.job_type === 'pflege').map((j) => j.id))
        const istAufEinsatz = (entries || [])
          .filter((e) => e.job_id && pflegeJobIds.has(e.job_id) && e.date?.startsWith(String(jahr)))
          .reduce((s, e) => s + Number(e.hours || 0), 0)
        const faktor = sollYtd > 0 ? ist / sollYtd : null
        const off = faktor !== null && (faktor > 1.15 || faktor < 0.85)
        const erledigt = gs.filter((g) => g.status === 'erledigt').length
        return (
          <Card key={projectId} accent={faktor === null ? undefined : off ? WARN : OK}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: FG, flex: 1, minWidth: 150 }}>{label}</div>
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{erledigt}/{gs.length} Einsätze</span>
              {faktor !== null && (
                <Badge color={off ? WARN : OK}>Ist/Soll ×{faktor.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</Badge>
              )}
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 10, flexWrap: 'wrap' }}>
              {[['Soll bis KW ' + curKW, hrs(sollYtd)], ['Ist gebucht', hrs(ist)],
                ['davon auf Pflege-Einsätze', hrs(istAufEinsatz)], ['Jahres-Soll', hrs(sollJahr)],
                ['Prognose Jahr', faktor !== null ? hrs(sollJahr * faktor) : '—']].map(([l, v]) => (
                <div key={l}>
                  <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, color: FG }}>{v}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="ghost" icon={copied === projectId ? Check : Copy}
                  title="Erledigte Pflege-Einsätze des Jahres als Text für den Kunden kopieren"
                  onClick={() => copyNachweis(projectId, label)}>
                  {copied === projectId ? 'Kopiert' : 'Nachweis'}
                </Button>
                <Button variant="ghost" icon={Printer}
                  title="Leistungsnachweis aus der Zeiterfassung als PDF für den Kunden erzeugen"
                  onClick={() => pdfNachweis(projectId, label, ps)}>
                  PDF
                </Button>
                <Button variant="ghost" icon={Mail}
                  title="Leistungsnachweis per E-Mail an den Auftraggeber senden (mit Vorschau und Freigabe)"
                  onClick={() => mailNachweis(projectId, label, ps)}>
                  E-Mail
                </Button>
                {faktor !== null && (
                  <Button variant="ghost" icon={Scale}
                    title="Ist/Soll-Faktor als Kalibrierung für Folgeangebote in den Plan schreiben"
                    onClick={() => ps.forEach((p) => updatePlan(p.id, { kalib_faktor: round2(faktor) }))}>
                    Faktor übernehmen
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
      <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>
        Ist = alle Zeiterfassungs-Buchungen des Jahres auf das Projekt. Sauber wird der Vergleich, wenn Stunden je Einsatz
        (job) gebucht werden und Spezialaufträge eigene Einsätze sind (Konzept Kap. 4.2).
      </div>

      {mailModal && (
        <NachweisMailModal {...mailModal} jahr={jahr} onClose={() => setMailModal(null)} />
      )}
    </div>
  )
}

/* ─── Leistungsnachweis per E-Mail ─────────────────────────────────
   Bewusst mit Vorschau und ausdrücklicher Freigabe: Es geht an echte
   Auftraggeber. Automatischer Versand ist erst sinnvoll, wenn sich die
   Zahlen über eine Saison als verlässlich erwiesen haben (vgl. MANA_PLAN.md,
   „Human-in-the-Loop"). */
function NachweisMailModal({ nachweis, client, clientId, label, jahr, onClose }) {
  const { user, displayName } = useAuth()
  const mail = useMemo(() => baueNachweisEmail(nachweis, {
    kundeName: client?.name || '',
    anrede: client?.contact_name ? `Guten Tag ${client.contact_name}` : 'Guten Tag',
    zeitraumLabel: String(jahr),
    absender: displayName || 'Ihr LUMA-Team',
  }), [nachweis, client, jahr, displayName])

  const [betreff, setBetreff] = useState(mail.betreff)
  const [anTest, setAnTest] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ergebnis, setErgebnis] = useState(null)
  const [protokoll, setProtokoll] = useState([])

  useEffect(() => {
    if (clientId) versandProtokoll(clientId, 5).then(setProtokoll)
  }, [clientId])

  const kundenAdresse = (client?.contact_email || '').trim()
  const eigeneAdresse = (user?.email || '').trim()
  const empfaenger = anTest ? eigeneAdresse : kundenAdresse
  const kannSenden = Boolean(empfaenger) && !busy

  async function senden() {
    setBusy(true); setErgebnis(null)
    try {
      const res = await sendeEmail({
        clientId, betreff, html: mail.html, text: mail.text,
        typ: anTest ? 'test' : 'leistungsnachweis',
        zeitraum: String(jahr),
        to: anTest ? eigeneAdresse : undefined,
      })
      setErgebnis({ ok: true, text: `Gesendet an ${res.empfaenger}` })
      if (clientId) versandProtokoll(clientId, 5).then(setProtokoll)
    } catch (e) {
      setErgebnis({ ok: false, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal eyebrow="Leistungsnachweis" title={`${label} · ${jahr}`} onClose={onClose} maxWidth={720}>
      <form onSubmit={(e) => { e.preventDefault(); if (kannSenden) senden() }}
        style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Empfänger */}
        <div>
          <div style={LABEL_STYLE}>Empfänger</div>
          {kundenAdresse ? (
            <div style={{ fontSize: 13, color: FG, marginTop: 3 }}>
              {client?.name} — <span style={{ fontFamily: MONO }}>{kundenAdresse}</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: WARN, marginTop: 3 }}>
              Für {client?.name || 'diesen Auftraggeber'} ist keine Kontakt-E-Mail hinterlegt.
              In den Stammdaten beim Kunden ergänzen — oder unten zunächst an dich selbst testen.
            </div>
          )}
          {eigeneAdresse && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: MUTED, marginTop: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={anTest} onChange={(e) => setAnTest(e.target.checked)} />
              Zuerst als Test an mich selbst ({eigeneAdresse})
            </label>
          )}
        </div>

        {/* Betreff */}
        <div>
          <div style={LABEL_STYLE}>Betreff</div>
          <input style={INPUT_STYLE} value={betreff} onChange={(e) => setBetreff(e.target.value)} />
        </div>

        {/* Vorschau */}
        <div>
          <div style={LABEL_STYLE}>Vorschau</div>
          <iframe title="E-Mail-Vorschau" srcDoc={mail.html}
            style={{ width: '100%', height: 320, border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', marginTop: 4 }} />
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 5 }}>
            {nachweis.summe.objekte} Fläche(n) · {hrs(nachweis.summe.stunden)} · {nachweis.summe.einsatztage} Einsatztage
          </div>
        </div>

        {/* Bisherige Versände */}
        {protokoll.length > 0 && (
          <div>
            <div style={LABEL_STYLE}>Bereits gesendet</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              {protokoll.map((v) => (
                <div key={v.id} style={{ fontSize: 11.5, color: v.status === 'fehler' ? DANGER : MUTED, fontFamily: MONO }}>
                  {new Date(v.gesendet_am).toLocaleDateString('de-DE')} · {v.empfaenger}
                  {v.status === 'fehler' ? ' · fehlgeschlagen' : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        {ergebnis && (
          <div style={{ fontSize: 12.5, color: ergebnis.ok ? OK : DANGER, lineHeight: 1.5 }}>
            {ergebnis.ok ? '✓ ' : '⚠️ '}{ergebnis.text}
          </div>
        )}

        <ModalActions
          onCancel={onClose}
          cancelLabel={ergebnis?.ok ? 'Schließen' : 'Abbrechen'}
          left={<span style={{ fontSize: 11, color: MUTED }}>
            {empfaenger
              ? <>Antworten gehen an {eigeneAdresse || 'dich'}.</>
              : <>Kein Empfänger — bitte Kontakt-E-Mail ergänzen.</>}
          </span>}
          submitLabel={busy ? 'Sendet…' : anTest ? 'Test senden' : 'Senden'}
        />
      </form>
    </Modal>
  )
}

/* ─── Tab: Angebote & Verträge (admin) ────────────────────────── */

function lvTextForPlan(plan, aufgabenByPlan) {
  return (aufgabenByPlan[plan.id] || [])
    .filter((a) => Number(a.jahres_stunden) > 0)
    .map((a) => `  – ${a.titel}: ${fensterText(a.fenster) || 'nach Bedarf'}`)
    .join('\n')
}

function offerText(offer) {
  const von = offer.zeitraum_von ? new Date(offer.zeitraum_von).toLocaleDateString('de-DE') : '—'
  const bis = offer.zeitraum_bis ? new Date(offer.zeitraum_bis).toLocaleDateString('de-DE') : '—'
  const abrechnung = { monatlich: 'monatlich in gleichen Teilbeträgen', quartal: 'quartalsweise in gleichen Teilbeträgen', drittel: 'in drei gleichen Teilbeträgen (30.06. / 30.09. / 31.12.)', einmalig: 'nach Leistungserbringung' }[offer.abrechnung] || offer.abrechnung
  const lines = []
  lines.push('Sehr geehrte Damen und Herren,')
  lines.push('')
  lines.push(`vielen Dank für Ihr Vertrauen. Gerne unterbreiten wir Ihnen unser Angebot für die Pflege der folgenden Standorte im Leistungszeitraum ${von} – ${bis}:`)
  lines.push('')
  for (const pos of offer.positionen || []) {
    lines.push(`• ${pos.beschreibung} — Jahrespauschale ${eur(pos.betrag)} netto`)
    if (pos.lv) lines.push(pos.lv)
    lines.push('')
  }
  lines.push(`Gesamtsumme: ${eur(offer.summe_netto)} netto zzgl. gesetzlicher USt. Die Abrechnung erfolgt ${abrechnung}.`)
  lines.push('')
  lines.push('Grundlage ist der mit Ihnen abgestimmte Pflegeplan. Zusätzliche Leistungen außerhalb des beschriebenen Umfangs führen wir nur nach vorheriger Beauftragung aus; sie werden per Kurzangebot bzw. nach Aufwand gesondert berechnet. Materialien (Pflanzen, Mulch, Erde u. Ä.) werden zu marktüblichen Preisen gegen Beleg gesondert in Rechnung gestellt. An- und Abfahrt sind in der Pauschale enthalten.')
  lines.push('')
  lines.push('Umfang und Pauschale werden jährlich auf Basis der dokumentierten Einsätze gemeinsam überprüft und bei Bedarf angepasst.')
  lines.push('')
  lines.push('Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.')
  lines.push('Wir bedanken uns herzlich für Ihr Vertrauen.')
  return lines.join('\n')
}

function TabAngebote({ offers, setOffers, clientById, onNew }) {
  const [copied, setCopied] = useState(null)

  function setStatus(id, status) {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    sb.from('angebote').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      .then(({ error }) => { if (error) dbErr('angebote')(error) })
  }
  function remove(id) {
    if (!window.confirm('Angebot löschen?')) return
    setOffers((prev) => prev.filter((o) => o.id !== id))
    sb.from('angebote').delete().eq('id', id).then(({ error }) => { if (error) dbErr('angebote')(error) })
  }
  async function copy(key, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2500)
    } catch { window.__lumaToast?.('⚠️ Kopieren fehlgeschlagen') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Button icon={Plus} onClick={onNew}>Neues Pflege-Angebot</Button>
      </div>
      {!offers.length && (
        <EmptyState icon={FileText} title="Noch keine Angebote"
          hint="Angebote werden aus den Pflegeplänen generiert — Stunden × Kalibrierung × Stundensatz, als Pauschale formuliert. Aus einem angenommenen Angebot entsteht der Vertragstext." />
      )}
      {offers.map((o) => (
        <Card key={o.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: FG, flex: 1, minWidth: 160 }}>
              {o.titel || 'Angebot'}
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginLeft: 8 }}>{clientById[o.client_id]?.name}</span>
            </div>
            <Badge color={o.typ === 'spezial' ? INFO : A}>{o.typ}</Badge>
            <Badge color={OFFER_STATUS[o.status] || MUTED}>{o.status}</Badge>
            <div style={{ fontFamily: MONO, fontSize: 13, color: FG }}>{eur(o.summe_netto)}</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 6 }}>
            {o.zeitraum_von && `${new Date(o.zeitraum_von).toLocaleDateString('de-DE')} – ${new Date(o.zeitraum_bis).toLocaleDateString('de-DE')} · `}
            {(o.positionen || []).length} Positionen · {round2((o.positionen || []).reduce((s, p) => s + Number(p.stunden || 0), 0)).toLocaleString('de-DE')} h intern · Satz {o.stundensatz} €/h
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="ghost" icon={copied === o.id ? Check : Copy} onClick={() => copy(o.id, offerText(o))}>
              {copied === o.id ? 'Kopiert' : 'Angebotstext'}
            </Button>
            <Button variant="ghost" icon={copied === `v-${o.id}` ? Check : FileText}
              title="Dienstleistungsvertrag nach ALLCURA-Struktur (Laufzeit 12 Monate, Kündigung 3 Monate) als Text kopieren"
              onClick={() => copy(`v-${o.id}`, vertragText(o, clientById[o.client_id]))}>
              {copied === `v-${o.id}` ? 'Kopiert' : 'Vertrag'}
            </Button>
            {o.status === 'entwurf' && <Button variant="ghost" onClick={() => setStatus(o.id, 'versendet')}>Als versendet markieren</Button>}
            {o.status === 'versendet' && (
              <>
                <Button variant="ghost" onClick={() => setStatus(o.id, 'angenommen')}>Angenommen</Button>
                <Button variant="ghost" onClick={() => setStatus(o.id, 'abgelehnt')}>Abgelehnt</Button>
              </>
            )}
            <Button variant="danger" icon={Trash2} onClick={() => remove(o.id)} style={{ marginLeft: 'auto' }}>Löschen</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ─── Modal: Angebot aus Plänen generieren ────────────────────── */

function OfferModal({ onClose, onSaved, plaene, jahr, clients, rates, planLabel, planClientId, planHours, aufgabenByPlan }) {
  // Basis: Pläne des gewählten Basisjahres; Angebot gilt fürs Folgejahr
  const basePlans = plaene.filter((p) => p.jahr === jahr)
  const clientIds = [...new Set(basePlans.map(planClientId).filter(Boolean))]
  const [clientId, setClientId] = useState(clientIds[0] || '')
  const [satz, setSatz] = useState(rates?.[clientIds[0]] || 50)
  const [useKalib, setUseKalib] = useState(true)
  const [abrechnung, setAbrechnung] = useState('monatlich')
  const [zieljahr, setZieljahr] = useState(jahr + 1)
  const [stunden, setStunden] = useState({}) // plan_id → h override

  useEffect(() => { setSatz(rates?.[clientId] || 50) }, [clientId, rates])

  const myPlans = basePlans.filter((p) => planClientId(p) === clientId)
  const planStd = (p) => {
    if (stunden[p.id] != null) return Number(stunden[p.id]) || 0
    const raw = planHours(p) * (useKalib ? Number(p.kalib_faktor || 1) : 1)
    return Math.round(raw * 4) / 4
  }
  const summe = myPlans.reduce((s, p) => s + planStd(p) * satz, 0)

  function save(e) {
    e.preventDefault()
    const positionen = myPlans.map((p) => ({
      project_id: p.project_id,
      objekt: p.objekt || '',
      beschreibung: planLabel(p),
      stunden: planStd(p),
      betrag: round2(planStd(p) * satz),
      lv: lvTextForPlan(p, aufgabenByPlan),
    }))
    const row = {
      client_id: clientId, typ: 'pflege',
      titel: `Pflege ${clients.find((c) => c.id === clientId)?.name || ''} ${zieljahr}`,
      zeitraum_von: `${zieljahr}-01-01`, zeitraum_bis: `${zieljahr}-12-31`,
      stundensatz: Number(satz), positionen, summe_netto: round2(summe),
      abrechnung, status: 'entwurf', quelle_plan_ids: myPlans.map((p) => p.id),
    }
    sb.from('angebote').insert(row).select().single().then(({ data, error }) => {
      if (error) return dbErr('angebote')(error)
      onSaved(data)
    })
  }

  return (
    <Modal eyebrow="Angebot generieren" title={`Pflege-Angebot ${zieljahr}`} onClose={onClose} maxWidth={640}>
      <form onSubmit={save} style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Kunde</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={INPUT_STYLE}>
              {clientIds.map((id) => <option key={id} value={id}>{clients.find((c) => c.id === id)?.name || id}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Leistungsjahr</label>
            <select value={zieljahr} onChange={(e) => setZieljahr(Number(e.target.value))} style={INPUT_STYLE}>
              {[jahr, jahr + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Stundensatz (intern)</label>
            <input type="number" step="0.5" min="0" value={satz} onChange={(e) => setSatz(Number(e.target.value))} style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Abrechnung</label>
            <select value={abrechnung} onChange={(e) => setAbrechnung(e.target.value)} style={INPUT_STYLE}>
              <option value="monatlich">monatlich</option>
              <option value="quartal">quartalsweise</option>
              <option value="drittel">in Dritteln</option>
              <option value="einmalig">einmalig</option>
            </select>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: FG, cursor: 'pointer' }}>
          <input type="checkbox" checked={useKalib} onChange={(e) => setUseKalib(e.target.checked)} />
          Kalibrierungsfaktor der Pläne anwenden (Ist-Erfahrung einpreisen)
        </label>

        <div>
          <SectionLabel style={{ marginBottom: 8 }}>Positionen (Basis: Pläne {jahr})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myPlans.map((p) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: FG }}>
                  {planLabel(p)}
                  {useKalib && Number(p.kalib_faktor) !== 1 && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: INFO, marginLeft: 6 }}>×{Number(p.kalib_faktor).toLocaleString('de-DE')}</span>
                  )}
                </div>
                <input type="number" step="0.25" min="0" value={planStd(p)}
                  onChange={(e) => setStunden((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  style={{ ...INPUT_STYLE, padding: '7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 12 }} />
                <div style={{ fontFamily: MONO, fontSize: 12, color: FG, textAlign: 'right' }}>{eur(planStd(p) * satz)}</div>
              </div>
            ))}
            {!myPlans.length && <div style={{ fontSize: 12, color: MUTED }}>Keine Pläne für diesen Kunden in {jahr}.</div>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
          <SectionLabel>Summe netto (Pauschale)</SectionLabel>
          <div style={{ fontFamily: MONO, fontSize: 16, color: FG, fontWeight: 700 }}>{eur(summe)}</div>
        </div>

        <ModalActions onCancel={onClose} submitLabel="Angebot speichern" />
      </form>
    </Modal>
  )
}
