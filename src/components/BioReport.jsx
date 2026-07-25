// Biodiversitäts-Report — visuelle Auswertung des Pflanzplans in Modul 3.
// Score + Teilbewertungen, Trachtverlauf über das Jahr, Spezialisten/Falter,
// konkrete Empfehlungen. Datengrundlage: lib/bioReport.js (reine Artdaten).
import { useMemo, useState } from 'react'
import { A, A14, A20, BORDER, FG, MUTED, SURFACE } from '../lib/theme.js'
import { buildBioReport, gapCandidates } from '../lib/bioReport.js'

const PRIO = { hoch: '#dc2626', mittel: '#d97706', niedrig: '#6b7280' }

export default function BioReport({ plan = [], area_m2 = null, site = null, candidates = [], onAdd = null, L = true, shadow, cardBg = '#fff', isMobile = false }) {
  const report = useMemo(() => buildBioReport(plan, { area_m2, site }), [plan, area_m2, site])
  const gaps = useMemo(() => report ? gapCandidates(report, candidates, plan) : [], [report, candidates, plan])
  const [showArten, setShowArten] = useState(false)
  if (!report) return null

  const { score, stufe, teil, monthly, kennzahlen: k, empfehlungen } = report
  const card = { background: cardBg, borderRadius: 12, padding: '16px 18px', boxShadow: shadow, marginBottom: 12 }
  const hd = { fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: L ? 700 : 400 }
  const maxIdx = Math.max(1, ...monthly.map(m => m.index))

  return (
    <div style={card}>
      <div style={hd}>🐝 Biodiversitäts-Report</div>

      {/* Score + Teilbewertungen */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 78, height: 78, borderRadius: '50%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: `conic-gradient(${stufe.farbe} ${score * 3.6}deg, ${L ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'} 0deg)`,
          }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: cardBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: stufe.farbe, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 9, color: MUTED }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: stufe.farbe }}>Ökologischer Wert: {stufe.label}</div>
            <div style={{ fontSize: 11.5, color: MUTED, maxWidth: 260, lineHeight: 1.5 }}>
              {k.arten} Arten · {k.individuen} Pflanzen{k.dichte ? ` · ${k.dichte}/m²` : ''} · {k.heimischPct} % heimisch
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {teil.map(t => (
            <div key={t.key} title={t.hinweis}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: FG, fontWeight: L ? 600 : 400 }}>{t.label}</span>
                <span style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{t.punkte}/{t.max}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: L ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{ width: `${100 * t.punkte / t.max}%`, height: '100%', background: A, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trachtangebot über das Jahr */}
      <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 6 }}>Trachtangebot im Jahresverlauf</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70, marginBottom: 4 }}>
        {monthly.map(m => {
          const luecke = report.luecken.some(l => l.monat === m.monat)
          return (
            <div key={m.monat} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
              title={`${m.name}: ${m.arten} Arten, ${m.individuen} Pflanzen im Blühaspekt`}>
              <span style={{ fontSize: 9, color: luecke ? '#dc2626' : MUTED, fontWeight: 700 }}>{m.arten || '–'}</span>
              <div style={{
                width: '100%', height: `${Math.max(4, 100 * m.index / maxIdx)}%`, borderRadius: '3px 3px 0 0',
                background: luecke ? 'rgba(220,38,38,0.35)' : A, border: luecke ? '1px solid #dc2626' : 'none',
              }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {monthly.map(m => <span key={m.monat} style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: MUTED, fontFamily: "'Space Mono', monospace" }}>{m.name}</span>)}
      </div>

      {/* Kennzahlen-Kacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          ['Spezialisten-Wildbienen', k.spezialisten, 'Oligolektische Arten, die auf diese Pflanzen angewiesen sind'],
          ['Falterarten (Raupenfutter)', k.raupenArten, `${k.raupenPflanzen} Arten im Plan dienen als Raupenfutter`],
          ['Ø assoziierte Tierarten', k.assocAvg ?? '–', 'Durchschnittlich dokumentierte Tierarten je Pflanzenart'],
          ['Höhenschichten', `${k.schichten}/4`, 'Bodendecker, mittel, hoch, Gerüstbildner'],
        ].map(([label, val, title]) => (
          <div key={label} title={title} style={{ background: L ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: A, lineHeight: 1.2 }}>{val}</div>
            <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Spezialisten-/Falterlisten (aufklappbar) */}
      {(report.spezialistenListe.length > 0 || report.raupenListe.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowArten(s => !s)} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '5px 12px', fontSize: 11.5, cursor: 'pointer' }}>
            {showArten ? '▾' : '▸'} Geförderte Tierarten im Detail
          </button>
          {showArten && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              {report.spezialistenListe.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 5 }}>🐝 Spezialisierte Wildbienen ({report.spezialistenListe.length})</div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.7 }}>{report.spezialistenListe.join(' · ')}</div>
                </div>
              )}
              {report.raupenListe.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 5 }}>🦋 Falter mit Raupenfutter ({report.raupenListe.length})</div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.7 }}>{report.raupenListe.join(' · ')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empfehlungen */}
      {empfehlungen.length > 0 && (
        <div style={{ marginBottom: gaps.length ? 14 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 7 }}>Empfehlungen zur Verbesserung</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {empfehlungen.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: FG, lineHeight: 1.5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIO[e.prio], flexShrink: 0, marginTop: 5 }} />
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lückenschließer aus dem Katalog */}
      {gaps.length > 0 && (
        <div style={{ background: A14, border: `1px solid ${A20}`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FG, marginBottom: 8 }}>✨ Passende Arten, um die Trachtlücken zu schließen</div>
          {gaps.map(g => (
            <div key={g.monat} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4 }}>{g.name}:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {g.arten.map(c => (
                  <button key={c.id} onClick={() => onAdd?.(c)} disabled={!onAdd} title={c.latin}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, background: L ? '#fff' : SURFACE, border: `1px solid ${BORDER}`,
                      color: FG, borderRadius: 999, padding: '4px 10px', fontSize: 11.5, cursor: onAdd ? 'pointer' : 'default',
                    }}>
                    {onAdd && <span style={{ color: A, fontWeight: 800 }}>+</span>}
                    {c.name}
                    {c.heimisch && <span style={{ fontSize: 9, color: A, border: `1px solid ${A20}`, borderRadius: 4, padding: '0 4px' }}>heimisch</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: MUTED, marginTop: 12, lineHeight: 1.5, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        <b>Methodik:</b> {report.methodik} Artdaten aus der kuratierten Florales-Datenbank (naturaDB/FloraWeb). Transparentes Punktemodell, kein zertifizierter Standard.
      </div>
    </div>
  )
}
