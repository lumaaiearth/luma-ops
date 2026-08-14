// ════════════════════════════════════════════════════════════════════
// Auswertung der Pflege
//
// Drei Blöcke, die drei verschiedene Fragen beantworten:
//   1. Leistung — wer hat wo wie viel gearbeitet
//   2. Wirtschaftlichkeit — Umsatz, Kosten, Gewinn (nur Geschäftsführung)
//   3. Personen — Jahresleistung, Verteilung über die Monate, Stundenkonto
//
// Farben: feste kategoriale Reihenfolge (nie durchrotiert), je Modus
// eigene Stufen. Die Zahlen stehen direkt an den Balken — das ist hier
// nicht nur Komfort, sondern Pflicht: drei der hellen Stufen liegen unter
// 3:1 Kontrast zur Fläche, Beschriftung ist die vorgeschriebene Abhilfe.
// ════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LabelList,
} from 'recharts'
import { A, BG, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER, INFO } from '../lib/theme.js'
import { MONO, Card, SectionLabel } from './ui.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useBreakpoint } from '../lib/useBreakpoint.js'
import { normalizeRule, kontostand } from '../lib/hourAccounts.js'
import { Lock } from 'lucide-react'

// Kategoriale Reihenfolge, in beiden Modi geprüft (validate_palette.js):
// hell wie dunkel bestehen Helligkeitsband, Chroma, CVD- und Normalsicht-
// Abstand. Reihenfolge ist die Sicherheitsmechanik — nicht umsortieren.
const SERIE_HELL   = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const SERIE_DUNKEL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']

const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const eur = (n) => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eurGenau = (n) => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
const std = (n) => `${Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100

/* ─── Gemeinsame Bausteine ──────────────────────────────────────── */

function Tooltipp({ active, payload, label, einheit = 'h' }) {
  if (!active || !payload?.length) return null
  const sichtbar = payload.filter((p) => Number(p.value) > 0)
  const summe = sichtbar.reduce((s, p) => s + Number(p.value || 0), 0)
  const form = einheit === '€' ? eurGenau : std
  return (
    <div style={{
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10,
      padding: '9px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.16)', minWidth: 150,
    }}>
      <div style={{ fontSize: 12, color: FG, fontWeight: 500, marginBottom: 5 }}>{label}</div>
      {sichtbar.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: MUTED, padding: '1px 0' }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{p.name}</span>
          <span style={{ fontFamily: MONO, color: FG }}>{form(p.value)}</span>
        </div>
      ))}
      {sichtbar.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5, paddingTop: 5, borderTop: `1px solid ${BORDER}`, fontSize: 11.5, color: FG }}>
          <span>Gesamt</span><span style={{ fontFamily: MONO }}>{form(summe)}</span>
        </div>
      )}
    </div>
  )
}

function Block({ titel, hinweis, kinder, aktion }) {
  return (
    <Card padding="16px 18px">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <SectionLabel>{titel}</SectionLabel>
        {aktion}
      </div>
      {hinweis && <div style={{ fontSize: 12, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>{hinweis}</div>}
      {kinder}
    </Card>
  )
}

function Kennzahl({ label, wert, farbe = FG, unten }) {
  return (
    <div style={{ minWidth: 132 }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 21, color: farbe, fontWeight: 500, marginTop: 2 }}>{wert}</div>
      {unten && <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{unten}</div>}
    </div>
  )
}

/* ─── Auswertung ────────────────────────────────────────────────── */

export default function PflegeStatistik({
  plans, jahr, entries, costs, gaengeByPlan, projById, clientById,
  people, hourRules, rates, costRates, isAdmin, planLabel,
}) {
  const { isLight } = useTheme()
  const bp = useBreakpoint()
  const kompakt = bp === 'xs' || bp === 'sm'
  const SERIE = isLight ? SERIE_HELL : SERIE_DUNKEL
  const [zeigeTabelle, setZeigeTabelle] = useState(false)

  const achse = { fill: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 10 }

  /* Grunddaten: nur Flächen mit Pflegeplan, nur das gewählte Jahr */
  const basis = useMemo(() => {
    const projekte = new Map()
    for (const p of plans) {
      if (!projekte.has(p.project_id)) {
        const proj = projById[p.project_id]
        projekte.set(p.project_id, {
          id: p.project_id,
          kurz: proj?.flaeche_code || proj?.name || p.project_id,
          name: planLabel(p),
          clientId: proj?.client_id,
          soll: 0,
          offen: 0,
        })
      }
      const eintrag = projekte.get(p.project_id)
      for (const g of gaengeByPlan[p.id] || []) {
        if (g.status === 'entfallen') continue
        const h = Number(g.soll_stunden || 0) + Number(g.fahrt_stunden || 0)
        eintrag.soll += h
        if (g.status !== 'erledigt') eintrag.offen += h
      }
    }
    const imJahr = (d) => d?.startsWith(String(jahr))
    const zeiten = (entries || []).filter((e) => imJahr(e.date) && projekte.has(e.project_id))
    const material = (costs || []).filter((c) => imJahr(c.date) && projekte.has(c.project_id))
    return { projekte: [...projekte.values()], zeiten, material }
  }, [plans, gaengeByPlan, projById, entries, costs, jahr, planLabel])

  /* Wer war beteiligt — feste Reihenfolge, damit Farben stabil bleiben */
  const beteiligte = useMemo(() => {
    const ids = [...new Set(basis.zeiten.map((e) => e.user_id).filter(Boolean))]
    return ids
      .map((id) => ({ id, name: people.find((p) => p.id === id)?.name || id }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [basis.zeiten, people])

  /* 1 — Stunden je Fläche, gestapelt nach Person */
  const stundenDaten = useMemo(() => {
    const rows = basis.projekte.map((p) => {
      const row = { kurz: p.kurz, name: p.name, gesamt: 0 }
      for (const b of beteiligte) row[b.id] = 0
      return [p.id, row]
    })
    const map = new Map(rows)
    for (const e of basis.zeiten) {
      const row = map.get(e.project_id)
      if (!row) continue
      const h = Number(e.hours || 0)
      row[e.user_id] = r2((row[e.user_id] || 0) + h)
      row.gesamt = r2(row.gesamt + h)
    }
    return [...map.values()].filter((r) => r.gesamt > 0).sort((a, b) => b.gesamt - a.gesamt)
  }, [basis, beteiligte])

  /* 2 — Wirtschaftlichkeit je Fläche (nur Geschäftsführung) */
  const wirtschaft = useMemo(() => {
    if (!isAdmin) return null
    const rows = basis.projekte.map((p) => {
      const satz = Number(rates?.[p.clientId] ?? 0)
      const istStunden = basis.zeiten
        .filter((e) => e.project_id === p.id)
        .reduce((s, e) => s + Number(e.hours || 0), 0)
      const personal = basis.zeiten
        .filter((e) => e.project_id === p.id)
        .reduce((s, e) => s + Number(e.hours || 0) * Number(costRates?.[e.user_id] ?? 0), 0)
      const materialSumme = basis.material
        .filter((c) => c.project_id === p.id)
        .reduce((s, c) => s + Number(c.amount_net || 0), 0)
      const erbracht = istStunden * satz
      const erwartet = p.offen * satz
      const gewinn = erbracht - personal - materialSumme
      return {
        kurz: p.kurz, name: p.name, satz,
        istStunden: r2(istStunden), offenStunden: r2(p.offen),
        erbracht: r2(erbracht), erwartet: r2(erwartet), jahr: r2(erbracht + erwartet),
        personal: r2(personal), material: r2(materialSumme), gewinn: r2(gewinn),
      }
    }).sort((a, b) => b.jahr - a.jahr)

    const summe = rows.reduce((s, r) => ({
      erbracht: s.erbracht + r.erbracht, erwartet: s.erwartet + r.erwartet,
      jahr: s.jahr + r.jahr, personal: s.personal + r.personal,
      material: s.material + r.material, gewinn: s.gewinn + r.gewinn,
    }), { erbracht: 0, erwartet: 0, jahr: 0, personal: 0, material: 0, gewinn: 0 })

    const ohneSatz = rows.filter((r) => !r.satz).map((r) => r.kurz)
    const ohneKostensatz = [...new Set(basis.zeiten.filter((e) => !costRates?.[e.user_id]).map((e) => e.user_id))]
    return { rows, summe, ohneSatz, ohneKostensatz }
  }, [basis, isAdmin, rates, costRates])

  /* 3a — Stunden je Person und Monat */
  const monatsDaten = useMemo(() => {
    const rows = MONATE_KURZ.map((m, i) => {
      const row = { monat: m, gesamt: 0 }
      for (const b of beteiligte) row[b.id] = 0
      row._nr = i + 1
      return row
    })
    for (const e of basis.zeiten) {
      const m = Number(e.date?.slice(5, 7))
      if (!m) continue
      const row = rows[m - 1]
      const h = Number(e.hours || 0)
      row[e.user_id] = r2((row[e.user_id] || 0) + h)
      row.gesamt = r2(row.gesamt + h)
    }
    return rows
  }, [basis.zeiten, beteiligte])

  /* 3b — Stundenkonto je Person (Soll/Ist über alle Projekte, nicht nur Pflege) */
  const konten = useMemo(() => {
    return Object.values(hourRules || {}).map((r) => {
      const regel = normalizeRule(r, r.team_id)
      const saldo = kontostand(regel, entries || [], r.team_id)
      const inPflege = basis.zeiten
        .filter((e) => e.user_id === r.team_id)
        .reduce((s, e) => s + Number(e.hours || 0), 0)
      const gesamtJahr = (entries || [])
        .filter((e) => e.user_id === r.team_id && e.date?.startsWith(String(jahr)))
        .reduce((s, e) => s + Number(e.hours || 0), 0)
      return {
        id: r.team_id,
        name: people.find((p) => p.id === r.team_id)?.name || r.team_id,
        saldo, inPflege: r2(inPflege), gesamtJahr: r2(gesamtJahr),
        uebertrag: Number(regel?.carryover || 0),
      }
    }).filter((k) => k.saldo !== null).sort((a, b) => a.name.localeCompare(b.name))
  }, [hourRules, entries, basis.zeiten, people, jahr])

  const farbe = (i) => SERIE[i % SERIE.length]
  const gesamtStunden = r2(stundenDaten.reduce((s, r) => s + r.gesamt, 0))

  if (!basis.projekte.length) {
    return <Card padding="22px"><div style={{ fontSize: 13, color: MUTED }}>Für {jahr} liegen keine Pflegepläne vor.</div></Card>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1 · Leistung ───────────────────────────────────────── */}
      <Block
        titel={`Stunden je Fläche ${jahr}`}
        hinweis="Wer hat wo gearbeitet — ein Balken je Fläche, farblich nach Person geteilt. Die Zahl über dem Balken ist die Gesamtstundenzahl der Fläche."
        aktion={
          <button onClick={() => setZeigeTabelle((v) => !v)} style={{
            background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 7,
            padding: '4px 10px', color: MUTED, cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit',
          }}>{zeigeTabelle ? 'Diagramm' : 'Als Tabelle'}</button>
        }
        kinder={
          !stundenDaten.length ? (
            <div style={{ fontSize: 13, color: MUTED }}>Für {jahr} sind noch keine Stunden erfasst.</div>
          ) : zeigeTabelle ? (
            <div style={{ overflowX: 'auto' }} className="lu-scroll-x">
              <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Fläche</th>
                    {beteiligte.map((b) => <th key={b.id} style={{ textAlign: 'right', padding: '6px 8px' }}>{b.name}</th>)}
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {stundenDaten.map((r) => (
                    <tr key={r.kurz} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '6px 8px', color: FG }}>{r.kurz}</td>
                      {beteiligte.map((b) => (
                        <td key={b.id} style={{ padding: '6px 8px', textAlign: 'right', fontFamily: MONO, color: r[b.id] ? FG : MUTED }}>
                          {r[b.id] ? std(r[b.id]) : '—'}
                        </td>
                      ))}
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: MONO, color: FG, fontWeight: 500 }}>{std(r.gesamt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
                <Kennzahl label="Stunden gesamt" wert={std(gesamtStunden)} unten={`${stundenDaten.length} Flächen`} />
                <Kennzahl label="Beteiligte" wert={beteiligte.length} unten={beteiligte.map((b) => b.name).join(', ')} />
              </div>
              <ResponsiveContainer width="100%" height={Math.max(240, stundenDaten.length * 34 + 60)}>
                <BarChart data={stundenDaten} margin={{ top: 8, right: 44, left: 4, bottom: 4 }} layout="vertical" barSize={20}>
                  <CartesianGrid stroke={BORDER} horizontal={false} />
                  <XAxis type="number" tick={achse} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="kurz" tick={achse} axisLine={false} tickLine={false} width={kompakt ? 44 : 62} />
                  <Tooltip cursor={{ fill: `color-mix(in srgb, ${FG} 5%, transparent)` }} content={<Tooltipp einheit="h" />} />
                  <Legend wrapperStyle={{ fontSize: 11.5, color: MUTED, paddingTop: 6 }} iconType="square" iconSize={9} />
                  {beteiligte.map((b, i) => (
                    <Bar key={b.id} dataKey={b.id} name={b.name} stackId="s" fill={farbe(i)}
                      stroke={SURFACE} strokeWidth={2}
                      minPointSize={i === beteiligte.length - 1 ? 0.01 : 0}
                      radius={i === beteiligte.length - 1 ? [0, 4, 4, 0] : 0}>
                      {i === beteiligte.length - 1 && (
                        <LabelList dataKey="gesamt" position="right"
                          formatter={(v) => std(v)}
                          style={{ fill: FG, fontFamily: "'Space Mono', monospace", fontSize: 10.5 }} />
                      )}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </>
          )
        }
      />

      {/* ── 2 · Wirtschaftlichkeit (nur Geschäftsführung) ───────── */}
      {isAdmin ? (
        <Block
          titel={`Umsatz, Kosten und Gewinn ${jahr}`}
          hinweis="Gerechnet auf den hinterlegten Stundensatz je Auftraggeber. Erbracht = geleistete Stunden, erwartet = noch offene Soll-Stunden aus der Planung. Personalkosten aus den internen Stundenkosten, Material aus den erfassten Kosten."
          kinder={
            <>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 14 }}>
                <Kennzahl label="Umsatz erbracht" wert={eur(wirtschaft.summe.erbracht)} farbe={FG} />
                <Kennzahl label="noch erwartet" wert={eur(wirtschaft.summe.erwartet)} farbe={MUTED} />
                <Kennzahl label="Jahresumsatz" wert={eur(wirtschaft.summe.jahr)} farbe={A} />
                <Kennzahl label="Personalkosten" wert={eur(wirtschaft.summe.personal)} farbe={MUTED} />
                <Kennzahl label="Material" wert={eur(wirtschaft.summe.material)} farbe={MUTED} />
                <Kennzahl label="Gewinn (erbracht)" wert={eur(wirtschaft.summe.gewinn)}
                  farbe={wirtschaft.summe.gewinn >= 0 ? OK : DANGER}
                  unten={wirtschaft.summe.erbracht > 0 ? `${Math.round(wirtschaft.summe.gewinn / wirtschaft.summe.erbracht * 100)} % Marge` : null} />
              </div>

              {(wirtschaft.ohneSatz.length > 0 || wirtschaft.ohneKostensatz.length > 0) && (
                <div style={{
                  fontSize: 12, color: WARN, background: `color-mix(in srgb, ${WARN} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${WARN} 30%, transparent)`, borderRadius: 8,
                  padding: '8px 11px', marginBottom: 14, lineHeight: 1.5,
                }}>
                  {wirtschaft.ohneSatz.length > 0 && <div>Ohne hinterlegten Stundensatz und daher mit 0 € gerechnet: {wirtschaft.ohneSatz.join(', ')}.</div>}
                  {wirtschaft.ohneKostensatz.length > 0 && <div>Ohne internen Stundenkostensatz: {wirtschaft.ohneKostensatz.join(', ')} — die Personalkosten sind dadurch zu niedrig.</div>}
                </div>
              )}

              <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4 }}>Umsatz je Fläche — erbracht und noch erwartet</div>
              <ResponsiveContainer width="100%" height={Math.max(220, wirtschaft.rows.length * 32 + 56)}>
                <BarChart data={wirtschaft.rows} margin={{ top: 6, right: 60, left: 4, bottom: 4 }} layout="vertical" barSize={18}>
                  <CartesianGrid stroke={BORDER} horizontal={false} />
                  <XAxis type="number" tick={achse} axisLine={false} tickLine={false} tickFormatter={(v) => eur(v)} />
                  <YAxis type="category" dataKey="kurz" tick={achse} axisLine={false} tickLine={false} width={kompakt ? 44 : 62} />
                  <Tooltip cursor={{ fill: `color-mix(in srgb, ${FG} 5%, transparent)` }} content={<Tooltipp einheit="€" />} />
                  <Legend wrapperStyle={{ fontSize: 11.5, color: MUTED, paddingTop: 6 }} iconType="square" iconSize={9} />
                  <Bar dataKey="erbracht" name="erbracht" stackId="u" fill={SERIE[0]} stroke={SURFACE} strokeWidth={2} />
                  <Bar dataKey="erwartet" name="noch erwartet" stackId="u"
                    fill={`color-mix(in srgb, ${SERIE[0]} 28%, ${SURFACE})`} stroke={SURFACE} strokeWidth={2}
                    minPointSize={0.01} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="jahr" position="right" formatter={(v) => eur(v)}
                      style={{ fill: FG, fontFamily: "'Space Mono', monospace", fontSize: 10.5 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ fontSize: 11.5, color: MUTED, margin: '14px 0 4px' }}>
                Erbrachter Umsatz gegen Kosten — der Abstand ist der Gewinn
              </div>
              <ResponsiveContainer width="100%" height={Math.max(260, wirtschaft.rows.length * 46 + 56)}>
                <BarChart data={wirtschaft.rows} margin={{ top: 6, right: 76, left: 4, bottom: 4 }} layout="vertical" barSize={14} barGap={3}>
                  <CartesianGrid stroke={BORDER} horizontal={false} />
                  <XAxis type="number" tick={achse} axisLine={false} tickLine={false} tickFormatter={(v) => eur(v)} />
                  <YAxis type="category" dataKey="kurz" tick={achse} axisLine={false} tickLine={false} width={kompakt ? 44 : 62} />
                  <Tooltip cursor={{ fill: `color-mix(in srgb, ${FG} 5%, transparent)` }} content={<Tooltipp einheit="€" />} />
                  <Legend wrapperStyle={{ fontSize: 11.5, color: MUTED, paddingTop: 6 }} iconType="square" iconSize={9} />
                  {/* Umsatz und Kosten nebeneinander statt Gewinn im Stapel: ein
                      negativer Gewinn lässt sich nicht stapeln, und ein Verlust
                      muss sichtbar sein — hier ragt der Kostenbalken schlicht
                      über den Umsatzbalken hinaus. */}
                  <Bar dataKey="erbracht" name="Umsatz erbracht" fill={SERIE[0]} stroke={SURFACE} strokeWidth={2}
                    minPointSize={0.01} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="personal" name="Personalkosten" stackId="k" fill={SERIE[1]} stroke={SURFACE} strokeWidth={2} />
                  <Bar dataKey="material" name="Material" stackId="k" fill={SERIE[3]} stroke={SURFACE} strokeWidth={2}
                    minPointSize={0.01} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="gewinn" position="right"
                      formatter={(v) => `${v >= 0 ? '+' : '−'}${eur(Math.abs(v))}`}
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5 }}
                      fill={FG} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                Die Zahl am Ende ist der Gewinn dieser Fläche (Umsatz minus Personal und Material).
              </div>
            </>
          }
        />
      ) : (
        <Card padding="16px 18px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: MUTED, fontSize: 12.5 }}>
            <Lock size={14} />Umsatz, Kosten und Gewinn sind der Geschäftsführung vorbehalten.
          </div>
        </Card>
      )}

      {/* ── 3 · Personen ───────────────────────────────────────── */}
      <Block
        titel={`Arbeitszeit je Person ${jahr}`}
        hinweis="Verteilung der Pflegestunden über die Monate, farblich nach Person. Darunter das Stundenkonto: Ist gegen Soll über alle Projekte, nicht nur die Pflege."
        kinder={
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monatsDaten} margin={{ top: 12, right: 8, left: 4, bottom: 4 }} barSize={kompakt ? 12 : 22}>
                <CartesianGrid stroke={BORDER} vertical={false} />
                <XAxis dataKey="monat" tick={achse} axisLine={false} tickLine={false} />
                <YAxis tick={achse} axisLine={false} tickLine={false} width={38} />
                <Tooltip cursor={{ fill: `color-mix(in srgb, ${FG} 5%, transparent)` }} content={<Tooltipp einheit="h" />} />
                <Legend wrapperStyle={{ fontSize: 11.5, color: MUTED, paddingTop: 6 }} iconType="square" iconSize={9} />
                {beteiligte.map((b, i) => (
                  <Bar key={b.id} dataKey={b.id} name={b.name} stackId="m" fill={farbe(i)}
                    stroke={SURFACE} strokeWidth={2}
                    minPointSize={i === beteiligte.length - 1 ? 0.01 : 0}
                    radius={i === beteiligte.length - 1 ? [4, 4, 0, 0] : 0}>
                    {i === beteiligte.length - 1 && (
                      <LabelList dataKey="gesamt" position="top"
                        formatter={(v) => (v > 0 ? Math.round(v) : '')}
                        style={{ fill: MUTED, fontFamily: "'Space Mono', monospace", fontSize: 9.5 }} />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 16, overflowX: 'auto' }} className="lu-scroll-x">
              <table style={{ width: '100%', minWidth: 460, borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Person</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>in der Pflege</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>gesamt {jahr}</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Übertrag</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Guthaben</th>
                  </tr>
                </thead>
                <tbody>
                  {konten.map((k, i) => (
                    <tr key={k.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '7px 8px', color: FG }}>
                        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: farbe(beteiligte.findIndex((b) => b.id === k.id)), marginRight: 7 }} />
                        {k.name}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO, color: MUTED }}>{std(k.inPflege)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO, color: FG }}>{std(k.gesamtJahr)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO, color: MUTED }}>{k.uebertrag ? std(-k.uebertrag) : '—'}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: MONO, fontWeight: 500, color: k.saldo >= 0 ? OK : DANGER }}>
                        {k.saldo > 0 ? '+' : ''}{std(k.saldo)}
                      </td>
                    </tr>
                  ))}
                  {!konten.length && (
                    <tr><td colSpan={5} style={{ padding: '10px 8px', color: MUTED }}>Keine Stundenkonten hinterlegt.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
              Guthaben = geleistete minus geschuldete Stunden seit Jahresbeginn, abzüglich des Übertrags aus dem Vorjahr.
              Ein Minus bedeutet, dass noch Stunden offen sind.
            </div>
          </>
        }
      />
    </div>
  )
}
