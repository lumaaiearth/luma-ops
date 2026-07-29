// ────────────────────────────────────────────────────────────────
// Pflege — Pflegeplanung (docs/PFLEGEPLANUNG_KONZEPT.md)
// Tabs: Pläne (Jahresplan je Standort als Aufgaben×Monats-Matrix),
// Kapazität (Bedarf vs. verfügbare Stunden je Monat), Plan/Ist
// (Kalibrierung aus der Zeiterfassung), Angebote (Generator, admin).
// Daten: pflege_plaene / pflege_aufgaben / pflege_gaenge / angebote.
// ────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import {
  Sprout, Scale, FileText, Plus, Copy, Trash2, Check, Pencil,
  ChevronDown, ChevronRight, AlertTriangle, CalendarPlus, RotateCcw, RefreshCw, Printer,
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

const MONATE = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
// KW→Monat wie in den Excel-Plänen/Import (Jan KW1–5 … Dez KW49–53)
const MONTH_KWS = [[1, 5], [6, 9], [10, 13], [14, 18], [19, 22], [23, 26], [27, 31], [32, 35], [36, 40], [41, 44], [45, 48], [49, 53]]
const monthOf = (kw) => MONTH_KWS.findIndex(([a, b]) => kw >= a && kw <= b)

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
const seasonOf = (kw) => (kw >= 10 && kw <= 18 ? 'Frühjahrspflege' : kw <= 39 ? 'Sommerpflege' : kw <= 49 ? 'Herbstpflege' : 'Winter')

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
    const t = w.turnus === 'monatlich' ? 'monatlich' : w.turnus === '2x_monat' ? '2× monatlich' : w.turnus === 'quartal' ? 'quartalsweise' : '1×'
    return `${t} ${range}`
  }).join(' · ')
}

/** Monatssummen (12 Werte) aus dem KW→h-Objekt einer Aufgabe */
function monthSums(wochen) {
  const out = Array(12).fill(0)
  for (const [kw, h] of Object.entries(wochen || {})) {
    const m = monthOf(Number(kw))
    if (m >= 0) out[m] += Number(h) || 0
  }
  return out
}

export default function PflegePage() {
  const isMobile = useIsMobile()
  const { projects, clients, jobs, createJob } = useOps()
  const { entries, hourRules, rates } = useTime()
  const { isAdmin } = useAuth()

  const [tab, setTab] = useState('plaene')
  const [plaene, setPlaene] = useState([])
  const [aufgaben, setAufgaben] = useState([])
  const [gaenge, setGaenge] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [jahr, setJahr] = useState(2026)
  const [offerModal, setOfferModal] = useState(false)
  const [gangModal, setGangModal] = useState(null)      // Gang, der terminiert wird
  const [aufgabeModal, setAufgabeModal] = useState(null) // { plan, aufgabe|null }

  async function loadAll() {
    try {
      const [p, a, g, o] = await Promise.all([
        sb.from('pflege_plaene').select('*').order('project_id'),
        sb.from('pflege_aufgaben').select('*').order('sort_order'),
        sb.from('pflege_gaenge').select('*').order('kw'),
        sb.from('angebote').select('*').order('created_at', { ascending: false }), // RLS: nur Admins sehen Zeilen
      ])
      setPlaene(p.data || []); setAufgaben(a.data || []); setGaenge(g.data || []); setOffers(o.data || [])
    } catch (err) { dbErr('pflege')(err) }
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  const projById = useMemo(() => Object.fromEntries((projects || []).map((p) => [p.id, p])), [projects])
  const clientById = useMemo(() => Object.fromEntries((clients || []).map((c) => [c.id, c])), [clients])

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
    if (!window.confirm(`Aufgabe „${aufgabe.titel}" löschen?`)) return
    const { error } = await sb.from('pflege_aufgaben').delete().eq('id', aufgabe.id)
    if (error) return dbErr('pflege_aufgaben')(error)
    setAufgaben((prev) => prev.filter((a) => a.id !== aufgabe.id))
  }

  // Geplante Gänge eines Plans aus den Aufgaben neu erzeugen.
  // Terminierte/erledigte/entfallene Gänge (und ihre KWs) bleiben unberührt.
  async function regenerateGaenge(plan) {
    const kept = (gaengeByPlan[plan.id] || []).filter((g) => g.status !== 'geplant')
    const keptKws = new Set(kept.map((g) => g.kw))
    const del = await sb.from('pflege_gaenge').delete().eq('plan_id', plan.id).eq('status', 'geplant')
    if (del.error) return dbErr('pflege_gaenge')(del.error)
    const weekly = {}, perKw = {}
    for (const a of aufgabenByPlan[plan.id] || []) {
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
        titel: `${seasonOf(Number(kw))} (KW ${kw})`, aufgaben: perKw[kw], soll_stunden: h,
      }))
    if (rows.length) {
      const ins = await sb.from('pflege_gaenge').insert(rows).select()
      if (ins.error) return dbErr('pflege_gaenge')(ins.error)
      setGaenge((prev) => [...prev.filter((g) => g.plan_id !== plan.id || g.status !== 'geplant'), ...ins.data])
    } else {
      setGaenge((prev) => prev.filter((g) => g.plan_id !== plan.id || g.status !== 'geplant'))
    }
  }

  const TABS = [['plaene', 'Pläne'], ['gaenge', 'Gänge'], ['kapazitaet', 'Kapazität'], ['planist', 'Plan/Ist'], ...(isAdmin ? [['angebote', 'Angebote']] : [])]

  return (
    <div>
      <PageHeader
        title="Pflege" isMobile={isMobile}
        eyebrow="Pflegeplanung"
        sub={`${yearPlans.length} Standorte · ${hrs(yearPlans.reduce((s, p) => s + planHours(p), 0))} geplant in ${jahr}`}
        actions={years.length > 1 && (
          <select value={jahr} onChange={(e) => setJahr(Number(e.target.value))} style={{ ...INPUT_STYLE, width: 'auto', padding: '8px 12px' }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} isMobile={isMobile} />
      {loading ? (
        <EmptyState icon={Sprout} title="lädt…" />
      ) : !yearPlans.length && tab !== 'angebote' ? (
        <EmptyState icon={Sprout} title={`Keine Pflegepläne für ${jahr}`} hint="Import: node scripts/gen-pflege-import.mjs → supabase/seed/pflegeplaene_2026_import.sql" />
      ) : (
        <>
          {tab === 'plaene' && <TabPlaene isMobile={isMobile} plans={yearPlans} {...{ aufgabenByPlan, gaengeByPlan, planLabel, planClientId, planHours, clientById, updatePlan, regenerateGaenge, deleteAufgabe, onEditAufgabe: (plan, aufgabe) => setAufgabeModal({ plan, aufgabe }) }} />}
          {tab === 'gaenge' && <TabGaenge plans={yearPlans} {...{ jahr, gaengeByPlan, planLabel, updateGang, jobs, onTerminieren: setGangModal }} />}
          {tab === 'kapazitaet' && <TabKapazitaet plans={yearPlans} {...{ gaengeByPlan, hourRules, planLabel }} />}
          {tab === 'planist' && <TabPlanIst plans={yearPlans} {...{ jahr, entries, jobs, gaengeByPlan, planLabel, planHours, projById, updatePlan }} />}
          {tab === 'angebote' && isAdmin && (
            <TabAngebote {...{ offers, setOffers, plaene, jahr, clients, clientById, rates, planLabel, planClientId, planHours, aufgabenByPlan, projById, onNew: () => setOfferModal(true) }} />
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
    </div>
  )
}

/* ─── Tab: Gänge (Terminierung & Statuspflege) ────────────────── */

function TabGaenge({ plans, jahr, gaengeByPlan, planLabel, updateGang, jobs, onTerminieren }) {
  const [filter, setFilter] = useState('faellig')
  const curKW = jahr === new Date().getFullYear() ? isoWeek() : jahr < new Date().getFullYear() ? 53 : 0
  const jobById = useMemo(() => Object.fromEntries((jobs || []).map((j) => [j.id, j])), [jobs])

  const all = plans.flatMap((p) => (gaengeByPlan[p.id] || []).map((g) => ({ ...g, planRef: p })))
    .sort((a, b) => a.kw - b.kw || planLabel(a.planRef).localeCompare(planLabel(b.planRef)))
  const isFaellig = (g) => g.status === 'geplant' && g.kw <= curKW + 2
  const rows = all.filter((g) =>
    filter === 'alle' ? true : filter === 'faellig' ? isFaellig(g) : g.status === filter)
  const overdue = all.filter((g) => g.status === 'geplant' && g.kw < curKW)

  function bulk(status) {
    if (!window.confirm(`${overdue.length} überfällige Gänge auf „${status}" setzen?`)) return
    overdue.forEach((g) => updateGang(g.id, { status }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chips
          options={[['faellig', `Fällig (${all.filter(isFaellig).length})`], ['geplant', 'Geplant'], ['terminiert', 'Terminiert'], ['erledigt', 'Erledigt'], ['entfallen', 'Entfallen'], ['alle', 'Alle']]}
          value={filter} onChange={setFilter} />
        {overdue.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <Button variant="ghost" onClick={() => bulk('erledigt')}>Überfällige → erledigt</Button>
            <Button variant="ghost" onClick={() => bulk('entfallen')}>Überfällige → entfallen</Button>
          </div>
        )}
      </div>
      {!rows.length && <EmptyState icon={CalendarPlus} title="Keine Gänge in dieser Ansicht" />}
      {rows.map((g) => {
        const job = g.job_id ? jobById[g.job_id] : null
        const late = g.status === 'geplant' && g.kw < curKW
        return (
          <Card key={g.id} accent={late ? DANGER : GANG_STATUS[g.status]}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Badge color={late ? DANGER : MUTED}>KW {g.kw}</Badge>
              <div style={{ fontSize: 13, fontWeight: 500, color: FG, flex: 1, minWidth: 160 }}>
                {planLabel(g.planRef)}
                <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginLeft: 8 }}>{g.titel}</span>
              </div>
              <Badge color={GANG_STATUS[g.status]}>{late ? 'überfällig' : g.status}</Badge>
              <div style={{ fontFamily: MONO, fontSize: 12, color: FG }} title="vor Ort + Fahrt">
                {hrs(Number(g.soll_stunden) + Number(g.fahrt_stunden || 0))}
              </div>
            </div>
            {job && (
              <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 6 }}>
                Einsatz: {job.date ? new Date(job.date + 'T00:00:00').toLocaleDateString('de-DE') : '—'} · {(job.assigned_users || []).join(', ') || 'ohne Crew'} · Status {job.status}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {g.status === 'geplant' && (
                <>
                  <Button icon={CalendarPlus} onClick={() => onTerminieren(g)}>Terminieren</Button>
                  <Button variant="ghost" icon={Check} onClick={() => updateGang(g.id, { status: 'erledigt' })}>Erledigt</Button>
                  <Button variant="ghost" onClick={() => updateGang(g.id, { status: 'entfallen' })}>Entfallen</Button>
                </>
              )}
              {g.status === 'terminiert' && (
                <>
                  <Button variant="ghost" icon={Check} onClick={() => updateGang(g.id, { status: 'erledigt' })}>Erledigt</Button>
                  <Button variant="ghost" icon={RotateCcw} onClick={() => updateGang(g.id, { status: 'geplant', job_id: null })}>Verknüpfung lösen</Button>
                </>
              )}
              {(g.status === 'erledigt' || g.status === 'entfallen') && (
                <Button variant="ghost" icon={RotateCcw} onClick={() => updateGang(g.id, { status: 'geplant' })}>Zurücksetzen</Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ─── Modal: Gang terminieren ─────────────────────────────────── */

function TerminModal({ gang, label, onClose, onSubmit }) {
  const [date, setDate] = useState('')
  const [crew, setCrew] = useState([])
  const people = allPeople()

  return (
    <Modal eyebrow="Pflegegang terminieren" title={`${label} · KW ${gang.kw}`} onClose={onClose} maxWidth={480}>
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

/* ─── Modal: Aufgabe anlegen/bearbeiten ───────────────────────── */

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

  return (
    <Modal eyebrow={aufgabe ? 'Aufgabe bearbeiten' : 'Aufgabe hinzufügen'} title={titel || 'Neue Aufgabe'} onClose={onClose} maxWidth={560}>
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
        <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
          ergibt {jahresH.toLocaleString('de-DE')} h/Jahr in {Object.keys(vorschau).length} Gängen — danach „Gänge neu generieren" im Plan
        </div>
        <ModalActions onCancel={onClose} submitLabel="Speichern" />
      </form>
    </Modal>
  )
}

/* ─── Tab: Pläne ──────────────────────────────────────────────── */

function TabPlaene({ isMobile, plans, aufgabenByPlan, gaengeByPlan, planLabel, planClientId, planHours, clientById, updatePlan, regenerateGaenge, deleteAufgabe, onEditAufgabe }) {
  const [open, setOpen] = useState(null)
  const totalH = plans.reduce((s, p) => s + planHours(p), 0)
  const allGaenge = plans.flatMap((p) => gaengeByPlan[p.id] || [])
  const monthDemand = Array(12).fill(0)
  for (const g of allGaenge) {
    const m = monthOf(g.kw)
    if (m >= 0 && g.status !== 'entfallen') monthDemand[m] += Number(g.soll_stunden || 0)
  }
  const peak = Math.max(...monthDemand)
  const peakMonth = MONATE[monthDemand.indexOf(peak)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Standorte" value={plans.length} />
        <StatCard label="Jahresstunden" value={hrs(totalH)} sub="vor Ort, ohne Fahrt" />
        <StatCard label="Pflegegänge" value={allGaenge.length} />
        <StatCard label="Spitzenmonat" value={peakMonth} sub={hrs(peak)} color={peak > 0 ? WARN : undefined} />
      </div>

      {plans.map((p) => {
        const tasks = aufgabenByPlan[p.id] || []
        const client = clientById[planClientId(p)]
        const isOpen = open === p.id
        return (
          <Card key={p.id} padding="0">
            <div onClick={() => setOpen(isOpen ? null : p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
              {isOpen ? <ChevronDown size={15} color={MUTED} /> : <ChevronRight size={15} color={MUTED} />}
              <div style={{ fontSize: 14, fontWeight: 500, color: FG, flex: 1, minWidth: 160 }}>{planLabel(p)}</div>
              {client && <Badge color={client.color || A}>{client.name}</Badge>}
              <Badge color={STATUS_COLORS[p.status] || MUTED}>{p.status}</Badge>
              {Number(p.kalib_faktor) !== 1 && <Badge color={INFO}>Kalibrierung ×{Number(p.kalib_faktor).toLocaleString('de-DE')}</Badge>}
              <div style={{ fontFamily: MONO, fontSize: 12, color: FG }}>{hrs(planHours(p))}</div>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '12px 18px 16px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th style={{ ...LABEL_STYLE, marginBottom: 0, textAlign: 'left', padding: '6px 8px 6px 0', position: 'sticky', left: 0, background: SURFACE }}>Aufgabe</th>
                        {MONATE.map((m) => <th key={m} style={{ ...LABEL_STYLE, marginBottom: 0, padding: '6px 4px', textAlign: 'right' }}>{m}</th>)}
                        <th style={{ ...LABEL_STYLE, marginBottom: 0, padding: '6px 0 6px 10px', textAlign: 'right' }}>Jahr</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((a) => {
                        const sums = monthSums(a.wochen)
                        const leer = Number(a.jahres_stunden) === 0
                        return (
                          <tr key={a.id} style={{ borderTop: `1px solid ${BORDER}`, opacity: leer ? 0.45 : 1 }}>
                            <td style={{ padding: '7px 8px 7px 0', fontSize: 12, color: FG, maxWidth: 260, position: 'sticky', left: 0, background: SURFACE }} title={a.beschreibung || a.titel}>
                              {a.titel}
                              <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 2 }}>{fensterText(a.fenster)}</div>
                            </td>
                            {sums.map((h, i) => (
                              <td key={i} style={{ padding: '7px 4px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: h ? FG : `color-mix(in srgb, ${MUTED} 40%, transparent)` }}>
                                {h ? round2(h).toLocaleString('de-DE') : '·'}
                              </td>
                            ))}
                            <td style={{ padding: '7px 0 7px 10px', textAlign: 'right', fontFamily: MONO, fontSize: 11, color: FG, fontWeight: 700 }}>{round2(Number(a.jahres_stunden)).toLocaleString('de-DE')}</td>
                            <td style={{ padding: '7px 0 7px 8px', whiteSpace: 'nowrap' }}>
                              <button type="button" onClick={() => onEditAufgabe(p, a)} title="Aufgabe bearbeiten"
                                style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}>
                                <Pencil size={12} />
                              </button>
                              <button type="button" onClick={() => deleteAufgabe(a)} title="Aufgabe löschen"
                                style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}>
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {p.notizen && (
                  <div style={{ marginTop: 12, fontSize: 12, color: MUTED, lineHeight: 1.55, fontStyle: 'italic' }}>{p.notizen}</div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <SectionLabel>Status</SectionLabel>
                  {['entwurf', 'aktiv', 'abgeschlossen'].map((s) => (
                    <span key={s} onClick={() => updatePlan(p.id, { status: s })} style={{ cursor: 'pointer', opacity: p.status === s ? 1 : 0.5 }}>
                      <Badge color={p.status === s ? STATUS_COLORS[s] : MUTED}>{s}</Badge>
                    </span>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                    <Button variant="ghost" icon={Plus} onClick={() => onEditAufgabe(p, null)}>Aufgabe</Button>
                    <Button variant="ghost" icon={RefreshCw} title="Geplante Gänge aus den Aufgaben neu erzeugen (terminierte/erledigte bleiben)"
                      onClick={() => regenerateGaenge(p)}>Gänge neu generieren</Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ─── Tab: Kapazität ──────────────────────────────────────────── */

function TabKapazitaet({ plans, gaengeByPlan, hourRules }) {
  // Bedarf je Monat: Soll- + Fahrtstunden aller Gänge (außer entfallen)
  const demand = Array(12).fill(0)
  for (const p of plans) {
    for (const g of gaengeByPlan[p.id] || []) {
      const m = monthOf(g.kw)
      if (m >= 0 && g.status !== 'entfallen') demand[m] += Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0)
    }
  }
  // Verfügbar: Stundenkonto-Regeln der Pflegekräfte (monatlich + wöchentlich)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <SectionLabel style={{ marginBottom: 12 }}>Bedarf (inkl. Fahrt) vs. verfügbare Stunden je Monat</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MONATE.map((m, i) => {
            const d = demand[i]
            const over = d > monthlyCap + 0.01
            return (
              <div key={m} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 130px', gap: 10, alignItems: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>{m}</div>
                <div style={{ position: 'relative', height: 16, background: `color-mix(in srgb, ${MUTED} 8%, transparent)`, borderRadius: 5, overflow: 'hidden' }}>
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
        <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 12 }}>
          Verfügbar = Stundenkonto-Regeln ({capPeople || '—'}) · Bedarf = Pflegegänge inkl. Fahrt-/Rüstzeit
        </div>
      </Card>

      {overMonths.length > 0 && (
        <Card accent={WARN}>
          <SectionLabel style={{ marginBottom: 10 }}>Team-/Springer-Bedarf</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {overMonths.map(({ m, delta }) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: FG }}>
                <AlertTriangle size={13} color={WARN} />
                <strong>{MONATE[m]}:</strong> {hrs(-delta)} zusätzlich nötig
                <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>≈ {Math.ceil(-delta / 10)} Personen-Tage à 10 h</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>
            Diese Stunden früh im Team (Malte/Lukas/Robert) oder über Freelancer einplanen — nicht erst im Monat selbst. (Konzept Kap. 8.3)
          </div>
        </Card>
      )}
    </div>
  )
}

/* ─── Tab: Plan/Ist ───────────────────────────────────────────── */

function TabPlanIst({ plans, jahr, entries, jobs, gaengeByPlan, planLabel, planHours, projById, updatePlan }) {
  const curKW = jahr === new Date().getFullYear() ? isoWeek() : jahr < new Date().getFullYear() ? 53 : 0
  const [copied, setCopied] = useState(null)

  // Leistungsnachweis (Phase 4): erledigte Pflege-Einsätze des Jahres als Text
  // für den Kunden — Datum, Titel, Stunden (gebucht, sonst Soll), Summe.
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
  // „erledigt“ geklickt wurden — sonst bliebe er in der Praxis leer.
  function pdfNachweis(projectId, label, ps) {
    // Planwert aus den Gängen inklusive An-/Abfahrt und ohne entfallene Gänge:
    // Die Ist-Seite (Zeiterfassung) enthält die Fahrtzeit ebenfalls, sonst wäre
    // der Erfüllungsgrad auf dem Kundenbeleg systematisch zu hoch.
    const soll = ps
      .flatMap((p) => gaengeByPlan[p.id] || [])
      .filter((g) => g.status !== 'entfallen')
      .reduce((s, g) => s + Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0), 0)
    const nachweis = buildLeistungsnachweis({
      leistungen: normalisiereZeiteintraege(
        (entries || []).filter((e) => e.project_id === projectId)),
      projekte: [{ id: projectId, name: label, location: projById[projectId]?.location || '' }],
      plaene: [{ project_id: projectId, jahr, soll_stunden: round2(soll) }],
      jahr,
    })
    const ok = druckeLeistungsnachweis(nachweis, {
      kundeName: projById[projectId]?.client || '',
      titel: `Leistungsnachweis ${jahr}`,
    })
    if (!ok) window.__lumaToast?.('⚠️ Pop-up-Blocker verhindert die Druckansicht')
  }

  // Ist je Projekt aus der Zeiterfassung (alle Buchungen des Jahres auf das Projekt)
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
      {groups.map(([projectId, ps]) => {
        const label = ps.length === 1 ? planLabel(ps[0]) : projById[projectId]?.name || projectId
        const gs = ps.flatMap((p) => gaengeByPlan[p.id] || []).filter((g) => g.status !== 'entfallen')
        const sollYtd = gs.filter((g) => g.kw <= curKW).reduce((s, g) => s + Number(g.soll_stunden || 0), 0)
        const sollJahr = ps.reduce((s, p) => s + planHours(p), 0)
        const ist = istByProject[projectId] || 0
        const faktor = sollYtd > 0 ? ist / sollYtd : null
        const off = faktor !== null && (faktor > 1.15 || faktor < 0.85)
        return (
          <Card key={projectId} accent={faktor === null ? undefined : off ? WARN : OK}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: FG, flex: 1, minWidth: 150 }}>{label}</div>
              {faktor !== null && (
                <Badge color={off ? WARN : OK}>Ist/Soll ×{faktor.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</Badge>
              )}
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 10, flexWrap: 'wrap' }}>
              {[['Soll bis KW ' + curKW, hrs(sollYtd)], ['Ist gebucht', hrs(ist)], ['Jahres-Soll', hrs(sollJahr)],
                ['Prognose Jahr', faktor !== null ? hrs(sollJahr * faktor) : '—']].map(([l, v]) => (
                <div key={l}>
                  <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, color: FG }}>{v}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <Button variant="ghost" icon={copied === projectId ? Check : Copy}
                  title="Erledigte Pflege-Einsätze des Jahres als Text für den Kunden kopieren"
                  onClick={() => copyNachweis(projectId, label)}>
                  {copied === projectId ? 'Kopiert' : 'Leistungsnachweis'}
                </Button>
                <Button variant="ghost" icon={Printer}
                  title="Leistungsnachweis aus der Zeiterfassung als PDF für den Kunden erzeugen"
                  onClick={() => pdfNachweis(projectId, label, ps)}>
                  PDF
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
    </div>
  )
}

/* ─── Tab: Angebote (admin) ───────────────────────────────────── */

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
  async function copy(offer) {
    try {
      await navigator.clipboard.writeText(offerText(offer))
      setCopied(offer.id)
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
          hint="Angebote werden aus den Pflegeplänen generiert — Stunden × Kalibrierung × Stundensatz, als Pauschale formuliert." />
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
            <Button variant="ghost" icon={copied === o.id ? Check : Copy} onClick={() => copy(o)}>
              {copied === o.id ? 'Kopiert' : 'Angebotstext kopieren'}
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
