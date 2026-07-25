// Pflegeplan mit Zeitansätzen — Stunden/Kosten je Standjahr, Aufgabenliste und
// Monatskalender. Grundlage für Pflegeverträge und Angebotskalkulation.
// Datengrundlage: lib/carePlan.js.
import { useMemo, useState } from 'react'
import { A, A14, A20, BORDER, FG, MUTED } from '../lib/theme.js'
import { buildCarePlan, fmtDauer } from '../lib/carePlan.js'

export default function CarePlanView({ plan = [], area_m2 = null, site = null, stundensatz = 60, beetW = null, beetH = null, L = true, shadow, cardBg = '#fff', isMobile = false }) {
  const care = useMemo(
    () => buildCarePlan(plan, { area_m2, site, stundensatz, beetW, beetH }),
    [plan, area_m2, site, stundensatz, beetW, beetH],
  )
  const [openPhase, setOpenPhase] = useState(1)
  if (!care) return null

  const card = { background: cardBg, borderRadius: 12, padding: '16px 18px', boxShadow: shadow, marginBottom: 12 }
  const hd = { fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }
  const eur = v => v.toLocaleString('de-DE') + ' €'

  return (
    <div style={card}>
      <div style={hd}>🧰 Pflegeplan & Zeitansätze — {care.flaeche} m²</div>

      {/* Phasen-Überblick */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {care.phasen.map(p => (
          <button key={p.jahr} onClick={() => setOpenPhase(p.jahr)} style={{
            textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '10px 12px',
            border: openPhase === p.jahr ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
            background: openPhase === p.jahr ? A14 : 'transparent',
          }}>
            <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 3 }}>{p.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: A }}>{fmtDauer(p.stunden)}</span>
              <span style={{ fontSize: 11, color: MUTED }}>≈ {eur(p.kosten)}</span>
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>{p.min_pro_m2} min/m² · Jahr</div>
          </button>
        ))}
      </div>

      {/* Aufgaben der gewählten Phase */}
      {care.phasen.filter(p => p.jahr === openPhase).map(p => (
        <div key={p.jahr} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: FG, lineHeight: 1.55, marginBottom: 10 }}>{p.beschreibung}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 460, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px 6px 0', fontWeight: 700 }}>Arbeitsgang</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px 6px', fontWeight: 700 }}>Monate</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px 6px', fontWeight: 700 }}>Durchg.</th>
                  <th style={{ textAlign: 'right', padding: '4px 0 6px 6px', fontWeight: 700 }}>Zeit</th>
                </tr>
              </thead>
              <tbody>
                {p.tasks.map(t => (
                  <tr key={t.key} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '7px 6px 7px 0', color: FG }}>
                      <div style={{ fontWeight: L ? 600 : 400 }}>{t.label}</div>
                      {t.hinweis && <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{t.hinweis}</div>}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'center', color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {t.monate.length > 3 ? `${t.monate[0]}.–${t.monate[t.monate.length - 1]}.` : t.monate.map(m => m + '.').join(' ')}
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{t.durchgaenge}×</td>
                    <td style={{ padding: '7px 0 7px 6px', textAlign: 'right', color: FG, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtDauer(t.stunden)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${BORDER}` }}>
                  <td colSpan={3} style={{ padding: '8px 6px 0 0', textAlign: 'right', color: MUTED, fontSize: 11 }}>Summe {p.label}</td>
                  <td style={{ padding: '8px 0 0 6px', textAlign: 'right', color: A, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtDauer(p.stunden)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Vertrags-/Kalkulationszeile */}
      <div style={{ background: A14, border: `1px solid ${A20}`, borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 10, color: MUTED }}>Regelpflege ab Jahr 3</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: A }}>{fmtDauer(care.regelpflege.stunden)}/Jahr · {eur(care.regelpflege.kosten)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: MUTED }}>Erste 3 Jahre gesamt</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: FG }}>{fmtDauer(care.gesamt3jahre.stunden)} · {eur(care.gesamt3jahre.kosten)}</div>
        </div>
        <div style={{ fontSize: 10.5, color: MUTED, flex: 1, minWidth: 160 }}>
          Basis für ein Pflegevertrags-Angebot. Stundensatz {care.stundensatz} €/h netto.
        </div>
      </div>

      {/* Monatskalender der Regelpflege */}
      <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 7 }}>Pflegekalender (Regelpflege)</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
        {care.monatsplan.map(m => (
          <div key={m.monat} style={{
            border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 9px',
            background: m.eintraege.length > 1 || (m.eintraege.length === 1 && !m.eintraege[0].startsWith('Ruhephase')) ? (L ? 'rgba(4,122,60,0.05)' : 'rgba(255,255,255,0.03)') : 'transparent',
          }}>
            <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Mono', monospace", marginBottom: 3 }}>{m.name}</div>
            {m.eintraege.length
              ? m.eintraege.map((e, i) => <div key={i} style={{ fontSize: 11, color: FG, lineHeight: 1.4 }}>· {e}</div>)
              : <div style={{ fontSize: 11, color: MUTED }}>—</div>}
          </div>
        ))}
      </div>

      {/* Fachliche Hinweise */}
      <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 6 }}>Pflegegrundsätze (ökologisch)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {care.hinweise.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 11.5, color: FG, lineHeight: 1.5 }}>
            <span style={{ color: A, fontWeight: 800 }}>✓</span><span>{h}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.5, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        <b>Annahmen:</b> {care.annahmen} Richtwerte für naturnahe Staudenpflanzungen — im Einzelfall standort- und witterungsabhängig.
      </div>
    </div>
  )
}
