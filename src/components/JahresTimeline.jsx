// ════════════════════════════════════════════════════════════════════
// Jahres-Zeitachse der Pflegeplanung
//
// Eine Zeile je Projektfläche, waagerecht endlos durch die Jahre. Darin
// liegen alle Pflegegänge als Karten: erledigte gefüllt, terminierte
// kräftig, Vorschläge aus dem LV blass und gestrichelt. Jahreszeiten
// hinterlegen die Fläche, die Wetterprognose sitzt im Kopf, „Heute" ist
// eine Linie. Karten lassen sich mit der Maus verschieben — das schreibt
// die neue Woche zurück, und die Aufgabenkarte folgt automatisch.
//
// Positioniert wird nach echtem Datum (x = Tage seit Bereichsanfang ×
// Tagesbreite), nicht nach Wochen-Index — sonst driften Jahre mit 53
// Kalenderwochen auseinander.
// ════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { A, BG, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER, INFO, A06 } from '../lib/theme.js'
import { MONO } from './ui.jsx'
import { STATUS_COLOR } from '../lib/weather.js'
import WeatherIcon from './WeatherIcon.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import {
  CalendarPlus, Check, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  X, Pencil, Trash2, RotateCcw,
} from 'lucide-react'

const TAG_MS = 86400000
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// Jahreszeiten nach Kalenderwoche (Winter = Pflegepause)
const SAISON_BANDS = [
  { key: 'fruehjahr', label: 'Frühjahr', vonKw: 10, bisKw: 21, color: OK },
  { key: 'sommer',    label: 'Sommer',   vonKw: 22, bisKw: 35, color: A },
  { key: 'herbst',    label: 'Herbst',   vonKw: 36, bisKw: 48, color: WARN },
  { key: 'winter1',   label: 'Winter',   vonKw: 1,  bisKw: 9,  color: INFO },
  { key: 'winter2',   label: 'Winter',   vonKw: 49, bisKw: 52, color: INFO },
]

const ZOOMS = [
  { id: 'jahr',   label: 'Jahr',   tagW: 3.6 },
  { id: 'saison', label: 'Saison', tagW: 6.5 },
  { id: 'monat',  label: 'Monat',  tagW: 12 },
]

const utc = (y, m, d) => new Date(Date.UTC(y, m, d))
const isoStr = (d) => d.toISOString().slice(0, 10)
const parseISO = (s) => new Date(s + 'T00:00:00Z')
const tageZwischen = (a, b) => Math.round((b - a) / TAG_MS)

// Montag der ISO-Kalenderwoche (der 4. Januar liegt immer in KW 1)
function montagVonKw(jahr, kw) {
  const jan4 = utc(jahr, 0, 4)
  const dow = jan4.getUTCDay() || 7
  const montag1 = new Date(jan4.getTime() - (dow - 1) * TAG_MS)
  return new Date(montag1.getTime() + (kw - 1) * 7 * TAG_MS)
}

function kwVonDatum(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dow)
  const jahresAnfang = utc(t.getUTCFullYear(), 0, 1)
  return { jahr: t.getUTCFullYear(), kw: Math.ceil(((t - jahresAnfang) / TAG_MS + 1) / 7) }
}

const hrs = (n) => `${Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`

/* ─── Eine Karte auf der Zeitachse ──────────────────────────────── */

function GangKarte({ item, tagW, links, breite, luecke, kompakt, onDrag, onOpen, aktiv }) {
  const [zieht, setZieht] = useState(false)
  const [versatz, setVersatz] = useState(0)
  const startX = useRef(0)
  const halten = useRef(null)

  const beweglich = item.status === 'geplant' || item.status === 'terminiert'
  const entfallen = item.status === 'entfallen'

  function down(e) {
    if (!beweglich) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startX.current = e.clientX
    const ziel = e.currentTarget
    const pid = e.pointerId
    if (e.pointerType === 'touch') {
      // Am Finger erst nach kurzem Halten greifen, damit Wischen die
      // Zeitachse scrollt statt versehentlich Einsätze zu verschieben.
      halten.current = setTimeout(() => {
        halten.current = null
        setZieht(true)
        ziel.setPointerCapture?.(pid)
        navigator.vibrate?.(8)
      }, 350)
    } else {
      e.stopPropagation()
      setZieht(true)
      ziel.setPointerCapture?.(pid)
    }
  }
  function move(e) {
    if (!zieht) {
      // Bewegt sich der Finger vor dem Greifen, ist es eine Wischgeste
      if (halten.current && Math.abs(e.clientX - startX.current) > 6) {
        clearTimeout(halten.current); halten.current = null
      }
      return
    }
    setVersatz(e.clientX - startX.current)
  }
  // Bricht die Geste ab (Anruf, Geste vom System übernommen), darf kein
  // Versatz stehen bleiben — sonst schreibt die nächste Berührung eine
  // Verschiebung, die niemand ausgelöst hat.
  function abbruch() {
    if (halten.current) { clearTimeout(halten.current); halten.current = null }
    setZieht(false)
    setVersatz(0)
  }

  function up(e) {
    if (halten.current) { clearTimeout(halten.current); halten.current = null }
    if (!zieht) { onOpen(item); return }                 // Tippen = Details
    setZieht(false)
    const tage = Math.round(versatz / tagW)
    setVersatz(0)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    // Totzone mindestens ein Tag breit: bei enger Ansicht sind 4 Pixel
    // schon ein Tag, ein Wackeln beim Tippen würde sonst verschieben.
    if (Math.abs(versatz) < Math.max(8, tagW)) { onOpen(item); return }
    if (tage !== 0) onDrag(item, tage)
  }

  const vorschlag = item.status === 'geplant'
  const erledigt = item.status === 'erledigt'
  const farbe = entfallen ? MUTED : erledigt ? OK : item.status === 'terminiert' ? INFO : item.ueberfaellig ? DANGER : A
  const beschriftungInnen = breite > 84

  const balken = (
    <div
      onPointerDown={down} onPointerMove={move} onPointerUp={up}
      onPointerCancel={abbruch} onLostPointerCapture={abbruch}
      role="button" tabIndex={0}
      aria-label={`${item.titel}, ${hrs(item.stunden)}, ${item.datumText}, ${item.status}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); return }
        // Mit den Pfeiltasten wochenweise verschieben (Umschalt = tageweise)
        if (!beweglich) return
        if (e.key === 'ArrowLeft')  { e.preventDefault(); onDrag(item, e.shiftKey ? -1 : -7) }
        if (e.key === 'ArrowRight') { e.preventDefault(); onDrag(item, e.shiftKey ? 1 : 7) }
      }}
      title={`${item.titel} · ${hrs(item.stunden)} · ${item.datumText}`}
      style={{
        position: 'absolute', left: links + versatz, top: 11, width: Math.max(breite, 15), height: 28,
        borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5, padding: '0 7px',
        cursor: beweglich ? (zieht ? 'grabbing' : 'grab') : 'pointer',
        background: (vorschlag || entfallen) ? `color-mix(in srgb, ${farbe} 12%, transparent)` : `color-mix(in srgb, ${farbe} 88%, transparent)`,
        border: (vorschlag || entfallen) ? `1.5px dashed color-mix(in srgb, ${farbe} 55%, transparent)` : `1px solid color-mix(in srgb, ${farbe} 92%, transparent)`,
        color: (vorschlag || entfallen) ? farbe : '#fff',
        opacity: zieht ? 0.85 : entfallen ? 0.6 : erledigt ? 0.92 : 1,
        textDecoration: entfallen ? 'line-through' : 'none',
        boxShadow: zieht ? '0 8px 20px rgba(0,0,0,0.22)' : aktiv ? `0 0 0 2px ${BG}, 0 0 0 3.5px ${farbe}` : 'none',
        zIndex: zieht ? 40 : aktiv ? 20 : 5,
        transition: zieht ? 'none' : 'box-shadow 0.15s, opacity 0.15s',
        userSelect: 'none', overflow: 'hidden', whiteSpace: 'nowrap',
        touchAction: zieht ? 'none' : 'auto',
      }}>
      {erledigt && <Check size={12} style={{ flexShrink: 0 }} />}
      {beschriftungInnen && (
        <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.kurz}
        </span>
      )}
      {beschriftungInnen && breite > 165 && (
        <span style={{ fontFamily: MONO, fontSize: 9.5, opacity: 0.75, marginLeft: 'auto' }}>{hrs(item.stunden)}</span>
      )}
    </div>
  )

  // Schmale Balken bekommen ihre Beschriftung daneben statt hinein
  const dahinter = !beschriftungInnen && !kompakt && (
    <span style={{
      position: 'absolute', left: links + Math.max(breite, 15) + 7 + versatz, top: 17,
      maxWidth: Math.max(0, luecke - 12), overflow: 'hidden', textOverflow: 'ellipsis',
      fontSize: 10.5, color: erledigt ? MUTED : farbe, whiteSpace: 'nowrap',
      pointerEvents: 'none', opacity: zieht ? 0.5 : 0.92, zIndex: 4,
    }}>
      {item.kurz} <span style={{ fontFamily: MONO, opacity: 0.7 }}>{hrs(item.stunden)}</span>
    </span>
  )

  return <>{balken}{dahinter}</>
}

/* ─── Zeitachse ─────────────────────────────────────────────────── */

export default function JahresTimeline({
  plaene, gaenge, jobById, projById, clientById, clients, forecast,
  onTerminieren, onErledigt, onVerschiebeGang, onVerschiebeJob,
  onEntfaellt, onWiederAufnehmen, onBearbeiten,
}) {
  const heute = useMemo(() => {
    const n = new Date()
    return utc(n.getFullYear(), n.getMonth(), n.getDate())
  }, [])

  const bp = useBreakpoint()
  const kompakt = bp === 'xs' || bp === 'sm'

  const [zoom, setZoom] = useState(kompakt ? 0 : 1)
  const tagW = ZOOMS[zoom].tagW
  const [bereich, setBereich] = useState(() => ({ von: heute.getUTCFullYear() - 1, bis: heute.getUTCFullYear() + 1 }))
  const [fClient, setFClient] = useState('alle')
  const [zeige, setZeige] = useState({ geplant: true, terminiert: true, erledigt: true, entfallen: false })
  const [wetterAn, setWetterAn] = useState(true)
  const [popoverId, setPopoverId] = useState(null)
  const [offen, setOffen] = useState(() => new Set())   // aufgeklappte Projekte
  const klapp = (id) => setOffen((prev) => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const scroller = useRef(null)
  const startDatum = useMemo(() => utc(bereich.von, 0, 1), [bereich.von])
  const endDatum = useMemo(() => utc(bereich.bis, 11, 31), [bereich.bis])
  const gesamtTage = tageZwischen(startDatum, endDatum) + 1
  const gesamtBreite = gesamtTage * tagW
  const x = (d) => tageZwischen(startDatum, d) * tagW

  /* Zeilen: eine je Projektfläche, über alle Jahre hinweg */
  const zeilen = useMemo(() => {
    const planById = Object.fromEntries(plaene.map((p) => [p.id, p]))
    const proj = {}
    for (const g of gaenge) {
      const plan = planById[g.plan_id]
      if (!plan) continue
      const p = projById[plan.project_id]
      if (!p) continue
      if (fClient !== 'alle' && p.client_id !== fClient) continue
      if (!zeige[g.status]) continue

      const job = g.job_id ? jobById[g.job_id] : null
      const von = job?.date ? parseISO(job.date) : montagVonKw(g.jahr, g.kw)
      const tage = job?.date ? 1 : 5                     // fester Einsatz = 1 Tag, Vorschlag = KW-Fenster
      const stunden = Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0)
      const kurzTitel = (g.titel || 'Pflegegang').replace(/\s*\(KW\s*\d+\)\s*$/, '')

      const leistungen = Array.isArray(g.aufgaben) ? g.aufgaben : []
      ;(proj[p.id] = proj[p.id] || { projekt: p, items: [] }).items.push({
        id: g.id, gang: g, job, status: g.status, von, tage, stunden, leistungen,
        kurz: kurzTitel,
        titel: `${kurzTitel} · ${p.flaeche_code || p.name}`,
        datumText: job?.date
          ? von.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
          : `KW ${g.kw} / ${g.jahr}`,
        ueberfaellig: g.status === 'geplant' && von < heute,
      })
    }
    // Je Projekt die Liste der Leistungen, die dort übers Jahr anfallen.
    // Reihenfolge nach Häufigkeit: was oft vorkommt, steht oben.
    for (const z of Object.values(proj)) {
      z.items.sort((a, b) => a.von - b.von)
      const nach = new Map()
      for (const it of z.items) {
        // Erst je Einsatz bündeln: derselbe Titel kann mehrfach vorkommen,
        // wenn ein Restant aus dem Vorgänger übernommen wurde.
        const proGang = new Map()
        for (const l of it.leistungen) {
          const titel = (l.titel || '').trim()
          if (!titel) continue
          const e = proGang.get(titel) || { titel, stunden: 0, offen: true }
          e.stunden += Number(l.stunden || 0)
          if (!l.offen) e.offen = false   // mindestens ein Eintrag wurde geleistet
          proGang.set(titel, e)
        }
        it.proLeistung = proGang
        for (const e of proGang.values()) {
          const z2 = nach.get(e.titel) || { titel: e.titel, anzahl: 0, stunden: 0 }
          z2.anzahl += 1                  // je Einsatz einmal, nicht je Eintrag
          z2.stunden += e.stunden
          nach.set(e.titel, z2)
        }
      }
      z.leistungen = [...nach.values()].sort((a, b) => b.anzahl - a.anzahl || a.titel.localeCompare(b.titel))
    }
    return Object.values(proj).sort((a, b) => {
      const ka = clientById[a.projekt.client_id]?.name || ''
      const kb = clientById[b.projekt.client_id]?.name || ''
      return ka.localeCompare(kb) || (a.projekt.flaeche_code || a.projekt.name).localeCompare(b.projekt.flaeche_code || b.projekt.name)
    })
  }, [plaene, gaenge, jobById, projById, clientById, fClient, zeige, heute])

  /* Endloses Scrollen: an den Rändern ein Jahr anhängen.
     Während eigener Sprünge gesperrt — sonst löst das Scrollen zum
     Heute-Datum unterwegs ein Anhängen aus und verschiebt sich selbst. */
  const nachPrepend = useRef(null)
  const gesperrt = useRef(true)

  function beiScroll(e) {
    if (gesperrt.current) return
    const el = e.currentTarget
    if (el.scrollLeft < 300) {
      gesperrt.current = true
      nachPrepend.current = { scrollLeft: el.scrollLeft, breite: el.scrollWidth }
      setBereich((b) => ({ ...b, von: b.von - 1 }))
    } else if (el.scrollLeft + el.clientWidth > el.scrollWidth - 300) {
      gesperrt.current = true
      setBereich((b) => ({ ...b, bis: b.bis + 1 }))
      setTimeout(() => { gesperrt.current = false }, 120)
    }
  }

  // Beim Anhängen nach links die Scrollposition ausgleichen, sonst springt die Ansicht
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !nachPrepend.current) return
    el.scrollLeft = nachPrepend.current.scrollLeft + (el.scrollWidth - nachPrepend.current.breite)
    nachPrepend.current = null
    setTimeout(() => { gesperrt.current = false }, 120)
  }, [bereich.von])

  function zuHeute(weich = true) {
    const el = scroller.current
    if (!el) return
    gesperrt.current = true
    const ziel = Math.max(0, x(heute) - el.clientWidth / 3)
    el.scrollTo({ left: ziel, behavior: weich ? 'smooth' : 'auto' })
    setTimeout(() => { gesperrt.current = false }, weich ? 700 : 150)
  }

  // Erster Aufschlag: ohne Animation direkt auf heute, damit das Nachladen
  // der Jahre nicht mitten in der Bewegung greift.
  const startPos = useRef(false)
  useLayoutEffect(() => {
    if (startPos.current) return
    startPos.current = true
    zuHeute(false)
  }, [])
  useEffect(() => { if (startPos.current) zuHeute(false) }, [zoom])

  /* Monats- und Wochenraster */
  const monate = useMemo(() => {
    const out = []
    for (let j = bereich.von; j <= bereich.bis; j++) {
      for (let m = 0; m < 12; m++) {
        const von = utc(j, m, 1)
        const bis = utc(j, m + 1, 0)
        out.push({ key: `${j}-${m}`, label: MONATE[m], jahr: j, monat: m, links: x(von), breite: (tageZwischen(von, bis) + 1) * tagW })
      }
    }
    return out
  }, [bereich, tagW])

  const wochen = useMemo(() => {
    const out = []
    for (let j = bereich.von; j <= bereich.bis; j++) {
      for (let kw = 1; kw <= 53; kw++) {
        const mo = montagVonKw(j, kw)
        if (mo.getUTCFullYear() !== j && kw > 50) continue
        if (mo < startDatum || mo > endDatum) continue
        out.push({ key: `${j}-${kw}`, kw, jahr: j, links: x(mo), breite: 7 * tagW })
      }
    }
    return out
  }, [bereich, tagW])

  const saisonFlaechen = useMemo(() => {
    const out = []
    for (let j = bereich.von; j <= bereich.bis; j++) {
      for (const s of SAISON_BANDS) {
        const von = montagVonKw(j, s.vonKw)
        const bis = new Date(montagVonKw(j, s.bisKw).getTime() + 6 * TAG_MS)
        out.push({ key: `${j}-${s.key}`, label: s.label, color: s.color, links: x(von), breite: tageZwischen(von, bis) * tagW })
      }
    }
    return out
  }, [bereich, tagW])

  const wetterTage = useMemo(() => {
    if (!wetterAn || !forecast?.length) return []
    return forecast.map((tag) => ({
      ...tag,
      links: x(parseISO(tag.date)),
      datumText: parseISO(tag.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
    })).filter((t) => t.links >= 0)
  }, [forecast, wetterAn, tagW, startDatum])

  // Rahmen um den Vorhersagezeitraum, damit erkennbar ist, wo die Prognose endet
  const wetterFenster = useMemo(() => {
    if (!wetterTage.length) return { von: 0, breite: 0 }
    const von = Math.min(...wetterTage.map((t) => t.links))
    const bis = Math.max(...wetterTage.map((t) => t.links)) + tagW
    return { von, breite: bis - von }
  }, [wetterTage, tagW])

  /* Verschieben: neue Woche bzw. neues Datum zurückschreiben */
  function verschiebe(item, tage) {
    const neu = new Date(item.von.getTime() + tage * TAG_MS)
    if (item.job) onVerschiebeJob(item.gang, item.job, isoStr(neu))
    else {
      const { jahr, kw } = kwVonDatum(neu)
      onVerschiebeGang(item.gang, jahr, kw)
    }
  }

  // Nicht das angeklickte Objekt merken, sondern seine Kennung: nach einem
  // Verschieben baut der Zeilen-Speicher neue Objekte, ein Abbild zeigte
  // sonst die alte Woche und erzeugte einen Einsatz mit falschem Titel.
  const popover = useMemo(() => {
    if (!popoverId) return null
    for (const z of zeilen) {
      const treffer = z.items.find((i) => i.id === popoverId)
      if (treffer) return treffer
    }
    return null
  }, [popoverId, zeilen])

  const ZEILE_H = kompakt ? 44 : 50
  const UNTER_H = kompakt ? 26 : 30
  // +1 je Zeile für die Trennlinie, sonst laufen Saisonbänder und Raster kurz
  const zeilenHoehe = (z) => ZEILE_H + 1 + (offen.has(z.projekt.id) ? z.leistungen.length * (UNTER_H + 1) : 0)
  const gesamtHoehe = zeilen.reduce((sum, z) => sum + zeilenHoehe(z), 0)
  const KOPF_H = (wetterAn ? 76 : 56) - (kompakt ? 8 : 0)
  const SPALTE_W = kompakt ? 88 : 208

  const chip = (an, setzen, label, farbe) => (
    <button onClick={setzen} style={{
      padding: kompakt ? '4px 8px' : '4px 10px', borderRadius: 999, cursor: 'pointer',
      fontSize: kompakt ? 11 : 11.5, whiteSpace: 'nowrap', flexShrink: 0,
      border: `1px solid ${an ? `color-mix(in srgb, ${farbe} 45%, transparent)` : BORDER}`,
      background: an ? `color-mix(in srgb, ${farbe} 12%, transparent)` : 'transparent',
      color: an ? farbe : MUTED, fontFamily: 'inherit',
    }}>{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Werkzeugleiste */}
      <div className={kompakt ? 'lu-scroll-x' : undefined} style={{
        display: 'flex', alignItems: 'center', gap: kompakt ? 6 : 8,
        flexWrap: kompakt ? 'nowrap' : 'wrap',
        overflowX: kompakt ? 'auto' : 'visible',
        paddingBottom: kompakt ? 4 : 0,
      }}>
        <button onClick={zuHeute} style={{
          padding: '6px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE,
          color: FG, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', fontWeight: 500, flexShrink: 0,
        }}>Heute</button>
        <div style={{ display: 'flex', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => scroller.current?.scrollBy({ left: -420, behavior: 'smooth' })}
            style={{ padding: '6px 9px', background: SURFACE, border: 'none', borderRight: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', display: 'flex' }}><ChevronLeft size={15} /></button>
          <button onClick={() => scroller.current?.scrollBy({ left: 420, behavior: 'smooth' })}
            style={{ padding: '6px 9px', background: SURFACE, border: 'none', color: MUTED, cursor: 'pointer', display: 'flex' }}><ChevronRight size={15} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${BORDER}`, borderRadius: 8, background: SURFACE, padding: 2, flexShrink: 0 }}>
          <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0}
            style={{ padding: '4px 7px', background: 'transparent', border: 'none', color: zoom === 0 ? BORDER : MUTED, cursor: zoom === 0 ? 'default' : 'pointer', display: 'flex' }}><ZoomOut size={14} /></button>
          {!kompakt && <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED, minWidth: 44, textAlign: 'center' }}>{ZOOMS[zoom].label}</span>}
          <button onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1}
            style={{ padding: '4px 7px', background: 'transparent', border: 'none', color: zoom === ZOOMS.length - 1 ? BORDER : MUTED, cursor: zoom === ZOOMS.length - 1 ? 'default' : 'pointer', display: 'flex' }}><ZoomIn size={14} /></button>
        </div>

        <select value={fClient} onChange={(e) => setFClient(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE,
          color: FG, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
          maxWidth: kompakt ? 140 : 'none',
        }}>
          <option value="alle">Alle Auftraggeber</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 5, marginLeft: 4, flexShrink: 0 }}>
          {chip(zeige.geplant, () => setZeige((z) => ({ ...z, geplant: !z.geplant })), 'Vorschläge', A)}
          {chip(zeige.terminiert, () => setZeige((z) => ({ ...z, terminiert: !z.terminiert })), 'Terminiert', INFO)}
          {chip(zeige.erledigt, () => setZeige((z) => ({ ...z, erledigt: !z.erledigt })), 'Erledigt', OK)}
          {chip(zeige.entfallen, () => setZeige((z) => ({ ...z, entfallen: !z.entfallen })), 'Entfallen', MUTED)}
          {chip(wetterAn, () => setWetterAn((w) => !w), 'Wetter', WARN)}
        </div>
      </div>

      {/* Zeitachse */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, background: SURFACE, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex',
          // Am großen Bildschirm füllt die Achse die Höhe und scrollt in sich;
          // am Handy wächst sie mit der Seite, weil dort ohnehin gescrollt wird.
          maxHeight: kompakt ? 'none' : 'calc(100vh - 300px)',
          overflowY: kompakt ? 'visible' : 'auto',
        }}>

          {/* Feste linke Spalte */}
          <div style={{ width: SPALTE_W, flexShrink: 0, borderRight: `1px solid ${BORDER}`, background: SURFACE, zIndex: 30, position: 'relative', boxShadow: '2px 0 8px -4px rgba(0,0,0,0.18)' }}>
            <div style={{ height: KOPF_H, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-end', padding: kompakt ? '0 8px 8px' : '0 14px 8px', position: 'sticky', top: 0, background: SURFACE, zIndex: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: kompakt ? 9 : 10, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {kompakt ? 'Ort' : 'Standort'}
              </span>
            </div>
            {zeilen.map((z) => {
              const kunde = clientById[z.projekt.client_id]
              return (
                <div key={z.projekt.id} style={{
                  background: zeilen.indexOf(z) % 2 ? `color-mix(in srgb, ${FG} 2%, transparent)` : 'transparent',
                  borderBottom: `1px solid color-mix(in srgb, ${BORDER} 45%, transparent)`,
                }}>
                  {/* Projektzeile — aufklappbar, wenn Leistungen hinterlegt sind */}
                  <button onClick={() => z.leistungen.length && klapp(z.projekt.id)}
                    aria-expanded={offen.has(z.projekt.id)}
                    title={z.leistungen.length ? 'Leistungen ein-/ausklappen' : 'Keine Einzelleistungen hinterlegt'}
                    style={{
                      height: ZEILE_H, width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                      padding: kompakt ? '0 8px' : '0 14px', background: 'transparent', border: 'none',
                      cursor: z.leistungen.length ? 'pointer' : 'default', textAlign: 'left',
                      fontFamily: 'inherit', color: FG,
                    }}>
                    {z.leistungen.length > 0 && (
                      <ChevronRight size={13} style={{
                        color: MUTED, flexShrink: 0,
                        transform: offen.has(z.projekt.id) ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s',
                      }} />
                    )}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: kompakt ? 12 : 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {z.projekt.flaeche_code || z.projekt.name}
                      </span>
                      <span title={kunde?.name || ''}
                        style={{ display: 'block', fontFamily: MONO, fontSize: 9.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {kompakt ? `${z.items.length}×` : `${kunde?.name || '—'} · ${z.items.length} Einsätze`}
                      </span>
                    </span>
                  </button>

                  {/* Aufgeklappt: eine Zeile je Leistung, die dort anfällt */}
                  {offen.has(z.projekt.id) && z.leistungen.map((l) => (
                    <div key={l.titel} title={`${l.titel} · ${l.anzahl} Einsätze · ${hrs(l.stunden)} insgesamt`}
                      style={{
                        height: UNTER_H, display: 'flex', alignItems: 'center', gap: 6,
                        padding: kompakt ? '0 8px 0 20px' : '0 14px 0 33px',
                        borderTop: `1px solid color-mix(in srgb, ${BORDER} 30%, transparent)`,
                      }}>
                      <span style={{ flex: 1, fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.titel}
                      </span>
                      {!kompakt && (
                        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, flexShrink: 0 }}>{l.anzahl}×</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
            {!zeilen.length && <div style={{ padding: '22px 14px', fontSize: 13, color: MUTED }}>Keine Einsätze im Filter.</div>}
          </div>

          {/* Scrollbare Zeitachse */}
          <div ref={scroller} onScroll={beiScroll} className="lu-scroll-x"
            style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
            <div style={{ width: gesamtBreite, position: 'relative' }}>

              {/* Kopf: Monate, Wochen, Wetter */}
              <div style={{ height: KOPF_H, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: SURFACE, zIndex: 12 }}>
                {saisonFlaechen.map((s) => (
                  <div key={s.key} style={{
                    position: 'absolute', left: s.links, width: s.breite, top: 0, bottom: 0,
                    background: `color-mix(in srgb, ${s.color} 13%, transparent)`,
                    borderTop: `2px solid color-mix(in srgb, ${s.color} 55%, transparent)`,
                  }}>
                    {s.breite > 90 && !kompakt && (
                      <span style={{
                        position: 'absolute', top: 3, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 8.5,
                        letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: `color-mix(in srgb, ${s.color} 85%, transparent)`, whiteSpace: 'nowrap',
                      }}>{s.label}</span>
                    )}
                  </div>
                ))}
                {monate.map((m) => (
                  <div key={m.key} style={{
                    position: 'absolute', left: m.links, width: m.breite, top: 14, height: 22,
                    borderLeft: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', paddingLeft: 8,
                    fontSize: 12, fontWeight: 600, color: FG, whiteSpace: 'nowrap', overflow: 'hidden', letterSpacing: '0.01em',
                  }}>
                    {m.breite > 60 ? (m.monat === 0 ? `${m.label} ${m.jahr}` : m.label) : ''}
                  </div>
                ))}
                {wochen.map((w) => (
                  <div key={w.key} style={{
                    position: 'absolute', left: w.links, width: w.breite, top: 34, height: 18,
                    borderLeft: `1px solid color-mix(in srgb, ${BORDER} 55%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: MONO, fontSize: 8.5, color: MUTED, opacity: 0.75,
                  }}>
                    {w.breite > 19 ? w.kw : ''}
                  </div>
                ))}
                {/* Wettervorhersage. Open-Meteo liefert 14 Tage — weiter draußen
                    gibt es keine Prognose, deshalb ist der Bereich begrenzt und
                    wird als solcher gekennzeichnet. */}
                {wetterAn && wetterTage.length > 0 && (
                  <div title="Wettervorhersage — weiter als 14 Tage gibt es keine Prognose"
                    style={{
                      position: 'absolute', left: wetterFenster.von, width: wetterFenster.breite,
                      top: 47, height: 26, borderRadius: 6,
                      background: `color-mix(in srgb, ${FG} 4%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${BORDER} 70%, transparent)`,
                    }} />
                )}
                {wetterAn && wetterTage.map((t) => {
                  const farbe = STATUS_COLOR[t.status] || MUTED
                  const titel = `${t.datumText}: ${t.label} · ${t.tempMax}°/${t.tempMin}° · ${t.precip} mm Regen`
                  // Ab Saison-Zoom passt ein Symbol, darunter bleibt ein farbiger
                  // Tagesbalken — beides zeigt dieselbe Bewertung.
                  return tagW >= 6 ? (
                    <div key={t.date} title={titel}
                      style={{ position: 'absolute', left: t.links, width: tagW, top: 48, height: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                      <WeatherIcon icon={t.icon} size={Math.min(13, Math.max(9, tagW - 1))} color={farbe} />
                      {tagW >= 10 && <span style={{ fontFamily: MONO, fontSize: 7.5, color: MUTED }}>{t.tempMax}°</span>}
                    </div>
                  ) : (
                    <div key={t.date} title={titel}
                      style={{ position: 'absolute', left: t.links + 0.5, width: Math.max(tagW - 1, 2), top: 53, height: 12, borderRadius: 2, background: farbe, opacity: 0.9 }} />
                  )
                })}
              </div>

              {/* Zeilen */}
              <div style={{ position: 'relative' }}>
                {/* Jahreszeiten und Wochenraster hinter den Karten */}
                {saisonFlaechen.map((s) => (
                  <div key={s.key} style={{
                    position: 'absolute', left: s.links, width: s.breite, top: 0, height: gesamtHoehe,
                    background: `color-mix(in srgb, ${s.color} 7%, transparent)`, pointerEvents: 'none',
                  }} />
                ))}
                {monate.map((m) => (
                  <div key={m.key} style={{
                    position: 'absolute', left: m.links, top: 0, width: 1, height: gesamtHoehe,
                    background: BORDER, pointerEvents: 'none',
                  }} />
                ))}

                {/* Heute-Linie */}
                <div style={{ position: 'absolute', left: x(heute), top: 0, bottom: 0, width: 2, background: `color-mix(in srgb, ${DANGER} 85%, transparent)`, zIndex: 25, pointerEvents: 'none' }}>
                  <div style={{
                    position: 'absolute', top: -5, left: -4, width: 10, height: 10,
                    borderRadius: '50%', background: DANGER, border: `2px solid ${SURFACE}`,
                  }} />
                </div>

                {zeilen.map((z, i) => (
                  <div key={z.projekt.id} style={{
                    borderBottom: `1px solid color-mix(in srgb, ${BORDER} 45%, transparent)`,
                    background: i % 2 ? `color-mix(in srgb, ${FG} 2%, transparent)` : 'transparent',
                  }}>
                    <div style={{ height: ZEILE_H, position: 'relative' }}>
                      {z.items.map((item, k) => {
                        const links = x(item.von)
                        const breite = item.tage * tagW
                        const naechster = z.items[k + 1]
                        const luecke = naechster ? x(naechster.von) - (links + breite) : 260
                        return (
                          <GangKarte key={item.id} item={item} tagW={tagW} kompakt={kompakt}
                            links={links} breite={breite} luecke={luecke}
                            aktiv={popoverId === item.id}
                            onDrag={verschiebe}
                            onOpen={(it) => setPopoverId(it.id)} />
                        )
                      })}
                    </div>

                    {/* Je Leistung eine Spur: zeigt, an welchen Terminen sie
                        tatsächlich ansteht — die Lücken sind die Aussage. */}
                    {offen.has(z.projekt.id) && z.leistungen.map((l) => (
                      <div key={l.titel} style={{
                        height: UNTER_H, position: 'relative',
                        borderTop: `1px solid color-mix(in srgb, ${BORDER} 30%, transparent)`,
                      }}>
                        {z.items.map((item) => {
                          const treffer = item.proLeistung?.get(l.titel)
                          if (!treffer) return null
                          // Beim Abschluss nicht abgehakt = nicht ausgeführt.
                          // Darf nicht wie geleistet aussehen.
                          const nichtGemacht = item.status === 'erledigt' && treffer.offen
                          const farbe = nichtGemacht ? WARN
                            : item.status === 'erledigt' ? OK
                            : item.status === 'terminiert' ? INFO
                            : item.ueberfaellig ? DANGER : A
                          const zusatz = nichtGemacht ? ' · nicht ausgeführt' : ''
                          return (
                            <button key={item.id} onClick={() => setPopoverId(item.id)}
                              title={`${l.titel} · ${hrs(treffer.stunden)} · ${item.datumText}${zusatz}`}
                              aria-label={`${l.titel}, ${hrs(treffer.stunden)}, ${item.datumText}${zusatz}`}
                              style={{
                                position: 'absolute', left: x(item.von), top: (UNTER_H - 12) / 2,
                                width: Math.max(item.tage * tagW, 12), height: 12, borderRadius: 4,
                                background: (item.status === 'geplant' || nichtGemacht)
                                  ? `color-mix(in srgb, ${farbe} 22%, transparent)`
                                  : `color-mix(in srgb, ${farbe} 75%, transparent)`,
                                border: (item.status === 'geplant' || nichtGemacht)
                                  ? `1px dashed color-mix(in srgb, ${farbe} 60%, transparent)` : 'none',
                                padding: 0, cursor: 'pointer',
                                outline: popoverId === item.id ? `2px solid ${farbe}` : 'none',
                                outlineOffset: 1,
                              }} />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legende */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: kompakt ? '6px 10px' : '7px 14px', display: 'flex', gap: kompakt ? 10 : 16, flexWrap: 'wrap', alignItems: 'center', background: BG }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
            <span style={{ width: 16, height: 9, borderRadius: 3, border: `1.5px dashed color-mix(in srgb, ${A} 55%, transparent)`, background: `color-mix(in srgb, ${A} 12%, transparent)` }} />Vorschlag aus dem LV
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
            <span style={{ width: 16, height: 9, borderRadius: 3, background: INFO }} />terminierter Einsatz
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: MUTED }}>
            <span style={{ width: 16, height: 9, borderRadius: 3, background: OK }} />erledigt
          </span>
          {!kompakt && (
            <span style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>
              Karten lassen sich ziehen — die Aufgabenkarte folgt automatisch.
            </span>
          )}
        </div>
      </div>

      {/* Detailkarte zum angeklickten Einsatz */}
      {popover && (
        <div style={{
          border: `1px solid ${BORDER}`, borderRadius: 12, background: SURFACE, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, color: FG, fontWeight: 500 }}>{popover.titel}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, marginTop: 2 }}>
              {popover.datumText} · {hrs(popover.stunden)} · {popover.status}
              {popover.ueberfaellig ? ' · überfällig' : ''}
            </div>
            {popover.leistungen.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {popover.leistungen.map((l, i) => (
                  <span key={i} style={{
                    fontSize: 11, color: FG, background: A06, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: '2px 8px',
                  }}>
                    {l.titel} <span style={{ fontFamily: MONO, color: MUTED }}>{hrs(l.stunden)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {popover.status === 'geplant' && (
            <button onClick={() => { onTerminieren(popover.gang); setPopoverId(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              border: `1px solid color-mix(in srgb, ${A} 35%, transparent)`, background: A06, color: A,
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}><CalendarPlus size={13} />Terminieren</button>
          )}
          {popover.job && onBearbeiten && (
            <button onClick={() => { onBearbeiten(popover.job); setPopoverId(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${BORDER}`, background: SURFACE, color: FG,
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}><Pencil size={13} />Bearbeiten</button>
          )}
          {popover.status === 'entfallen' && onWiederAufnehmen && (
            <button onClick={() => { onWiederAufnehmen(popover.gang); setPopoverId(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              border: `1px solid color-mix(in srgb, ${A} 35%, transparent)`, background: A06, color: A,
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}><RotateCcw size={13} />Zurückholen</button>
          )}
          {popover.status !== 'erledigt' && popover.status !== 'entfallen' && (
            <button onClick={() => { onErledigt(popover.gang); setPopoverId(null) }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
              border: `1px solid color-mix(in srgb, ${OK} 35%, transparent)`,
              background: `color-mix(in srgb, ${OK} 10%, transparent)`, color: OK,
              cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
            }}><Check size={13} />Abschließen</button>
          )}
          {popover.status !== 'entfallen' && onEntfaellt && (
            <button onClick={() => { onEntfaellt(popover.gang); setPopoverId(null) }}
              title="Einsatz entfällt — bleibt als entfallen erhalten und kann zurückgeholt werden"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                border: `1px solid color-mix(in srgb, ${DANGER} 30%, transparent)`,
                background: `color-mix(in srgb, ${DANGER} 8%, transparent)`, color: DANGER,
                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
              }}><Trash2 size={13} />Entfernen</button>
          )}
          <button onClick={() => setPopoverId(null)} style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer', display: 'flex', padding: 4 }}><X size={15} /></button>
        </div>
      )}
    </div>
  )
}
