// Klima-Steckbrief einer Fläche: fasst Sonnenanalyse, Starkregen-Check und die
// amtlichen Klimadaten (Umweltatlas) zu einem druckfähigen Bericht zusammen —
// das Dokument, das man einer Verwaltung oder einem Auftraggeber vorlegt.
// Öffnet als Vollbild-Overlay, druckt über die Browser-Druckfunktion (auch PDF).
import { useState, useEffect, useRef } from 'react'
import { X, Printer, Loader, Sun, Droplets, Thermometer, Leaf, MapPin } from 'lucide-react'
import { geomMeasures, fmtArea, fmtLen, fmtLatLng } from '../lib/geo.js'
import { SEASONS, LICHT_KLASSEN } from '../lib/solar.js'
import { AMPEL as REGEN_AMPEL, SZENARIEN } from '../lib/starkregen.js'
import { fetchKlimaProfil, empfehlungen } from '../lib/klimaProfil.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

// Bewusst feste, helle Druckfarben (unabhängig vom App-Theme) — der Bericht
// soll auf Papier und als PDF identisch aussehen.
const INK = '#111827', SOFT = '#6b7280', LINE = '#e5e7eb', PAPER = '#ffffff', TINT = '#f9fafb'

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section style={{ marginBottom: 22, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: `1px solid ${LINE}`, paddingBottom: 5, marginBottom: 10 }}>
        {Icon && <Icon size={14} color={SOFT} style={{ transform: 'translateY(2px)' }} />}
        <h2 style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <span style={{ fontFamily: MONO, fontSize: 9, color: SOFT }}>{subtitle}</span>}
      </div>
      {children}
    </section>
  )
}

function Tile({ label, value, sub, color }) {
  return (
    <div style={{ background: TINT, border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 11px', breakInside: 'avoid' }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: SOFT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: color || INK, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 9, color: SOFT, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Zeile({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 12, fontFamily: SANS, color: INK }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: SOFT, minWidth: 150, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 2 }}>{k}</span>
      <span style={{ flex: 1 }}>{v}</span>
    </div>
  )
}

export default function ClimateReport({ feature, project, heatmapEntry, onClose }) {
  const [klima, setKlima] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fehler, setFehler] = useState(null)
  const abortRef = useRef(null)

  const p = feature?.properties || {}
  const sonne = p.sonnenanalyse || null
  const regen = p.starkregen || null
  const m = geomMeasures(feature?.geometry)
  const c = m?.centroid

  useEffect(() => {
    if (!c) { setLoading(false); return }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    fetchKlimaProfil(c.lat, c.lng, { signal: ctrl.signal })
      .then(setKlima)
      .catch(() => setFehler('Die amtlichen Klimadaten sind gerade nicht abrufbar.'))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [c?.lat, c?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!feature) return null

  const licht = sonne ? LICHT_KLASSEN[sonne.licht] : null
  const regenAmpel = regen ? REGEN_AMPEL[regen.ampel] : null
  const tipps = empfehlungen({ klima, sonne, regen, flaeche_m2: m?.area_m2 || 0 })
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,18,22,0.75)', overflowY: 'auto', padding: '24px 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        @media print {
          body > *:not(.lu-report-root) { display: none !important; }
          .lu-report-root { position: static !important; inset: auto !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
          .lu-report-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; border-radius: 0 !important; }
          .lu-report-noprint { display: none !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="lu-report-root" style={{ display: 'contents' }}>
        <div className="lu-report-sheet" style={{ maxWidth: 820, margin: '0 auto', background: PAPER, borderRadius: 12, boxShadow: '0 24px 70px rgba(0,0,0,0.45)', padding: '28px 34px 34px', color: INK }}>

          {/* Aktionsleiste (nicht im Druck) */}
          <div className="lu-report-noprint" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#08AA56', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: SANS }}>
              <Printer size={14} /> Drucken / als PDF speichern
            </button>
            <button onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px solid ${LINE}`, background: PAPER, color: SOFT, cursor: 'pointer', fontSize: 13, fontFamily: SANS }}>
              <X size={14} /> Schließen
            </button>
          </div>

          {/* Kopf */}
          <header style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', color: '#08AA56', textTransform: 'uppercase', marginBottom: 6 }}>
                  LUMA BIOME™ · Klima-Steckbrief
                </div>
                <h1 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  {feature.label || 'Fläche'}
                </h1>
                <div style={{ fontFamily: SANS, fontSize: 13, color: SOFT }}>
                  {project?.name || 'Ohne Projekt'}{project?.location ? ` · ${project.location}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 10, color: SOFT, lineHeight: 1.7 }}>
                <div>Stand: {heute}</div>
                {m?.area_m2 > 0 && <div>Fläche: {fmtArea(m.area_m2)}</div>}
                {m?.perimeter_m > 0 && <div>Umfang: {fmtLen(m.perimeter_m)}</div>}
                {c && <div>{fmtLatLng(c)}</div>}
              </div>
            </div>
          </header>

          {/* Kernaussage */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 22 }}>
            <Tile label="Licht" value={licht?.label || 'nicht berechnet'} color={licht?.color}
              sub={sonne ? `${sonne.seasons?.sommer?.sun} h Sonne am 21.6.` : 'im Panel „Sonne & Licht" berechnen'} />
            <Tile label="Wärmebelastung" value={klima?.hitze?.pet?.bewertung || klima?.hitze?.stufe?.label || (loading ? '…' : '—')}
              color={klima?.hitze?.stufe?.color} sub={klima?.hitze?.pet ? `PET ${klima.hitze.pet.text}` : 'Umweltatlas 2022'} />
            <Tile label="Starkregen" value={regenAmpel?.label || 'nicht geprüft'} color={regenAmpel?.color}
              sub={regen ? 'Starkregengefahrenkarte' : 'im Panel prüfen'} />
            <Tile label="Versiegelung" value={klima?.versiegelung ? `${klima.versiegelung.pct.toFixed(0)} %` : (loading ? '…' : '—')}
              color={klima?.versiegelung?.stufe?.color} sub={klima?.versiegelung?.stufe?.label || 'Block, Umweltatlas 2021'} />
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: SOFT, fontSize: 12, fontFamily: SANS, marginBottom: 16 }}>
              <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Lade amtliche Klimadaten (Umweltatlas Berlin)…
            </div>
          )}
          {fehler && <div style={{ fontFamily: MONO, fontSize: 11, color: '#b91c1c', marginBottom: 16 }}>{fehler}</div>}

          {/* 1 Sonne */}
          <Section icon={Sun} title="Sonne & Licht" subtitle="eigene Simulation · LoD2-Dachmodell + Baumkataster">
            {sonne ? (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SANS, fontSize: 12, marginBottom: 8 }}>
                  <thead>
                    <tr>
                      {['Stichtag', 'Direkte Sonne', 'Max. möglich', 'Strahlung (klarer Tag)'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontFamily: MONO, fontSize: 8, color: SOFT, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 6px', borderBottom: `1px solid ${LINE}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SEASONS.map(s => {
                      const v = sonne.seasons?.[s.key]
                      if (!v) return null
                      return (
                        <tr key={s.key}>
                          <td style={{ padding: '5px 6px', borderBottom: `1px solid ${LINE}` }}>{s.emoji} {s.label} ({s.day}.{s.month + 1}.)</td>
                          <td style={{ padding: '5px 6px', borderBottom: `1px solid ${LINE}`, fontWeight: 700 }}>{v.sun} h</td>
                          <td style={{ padding: '5px 6px', borderBottom: `1px solid ${LINE}`, color: SOFT }}>{v.possible} h</td>
                          <td style={{ padding: '5px 6px', borderBottom: `1px solid ${LINE}` }}>{v.kwh} kWh/m²</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <Zeile k="Einstufung" v={<><b style={{ color: licht?.color }}>{licht?.label}</b> — {licht?.hint}</>} />
                <Zeile k="Berücksichtigt" v={`${sonne.buildings_n} Gebäude (${sonne.source === 'lod2' ? 'LoD2-Dachmodell, amtlich' : sonne.source === 'alkis' ? 'ALKIS' : 'OpenStreetMap'})${sonne.trees_n ? `, ${sonne.trees_n} Bäume aus dem Baumkataster mit saisonalem Laubzustand` : ''}`} />
              </>
            ) : (
              <div style={{ fontSize: 12, color: SOFT, fontFamily: SANS }}>Noch nicht berechnet — im Detailpanel unter „☀️ Sonne &amp; Licht" starten.</div>
            )}
            {heatmapEntry?.heatmaps?.sommer && (
              <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'flex-start', breakInside: 'avoid' }}>
                <img src={`/lod2/${heatmapEntry.heatmaps.sommer}`} alt="Sonnenstunden-Raster"
                  style={{ width: 190, height: 190, objectFit: 'cover', border: `1px solid ${LINE}`, borderRadius: 6, background: '#0f172a' }} />
                <div style={{ fontSize: 11, color: SOFT, fontFamily: SANS, lineHeight: 1.6 }}>
                  <b style={{ color: INK }}>Sonnenstunden im Umfeld (21.6.)</b><br />
                  4-m-Raster, dunkelblau = ganztägig verschattet, gelb = volle Sonne.
                  Grundlage: amtliche Dachgeometrien und Baumkataster; Simulation der direkten
                  Einstrahlung in 10-Minuten-Schritten.
                </div>
              </div>
            )}
          </Section>

          {/* 2 Hitze */}
          <Section icon={Thermometer} title="Hitze & Stadtklima" subtitle="Umweltatlas Berlin · Klimaanalyse 2022">
            {klima?.hitze?.tag ? (
              <>
                <Zeile k="Lufttemperatur 14 Uhr" v={`${klima.hitze.tag.text} (Sommertag)`} />
                {klima.hitze.nacht && <Zeile k="Lufttemperatur 4 Uhr" v={`${klima.hitze.nacht.text} — ${klima.hitze.nacht.mitte >= 18 ? 'kaum nächtliche Abkühlung (Wärmeinsel)' : 'nächtliche Abkühlung vorhanden'}`} />}
                {klima.hitze.pet && <Zeile k="Wärmebelastung (PET)" v={<><b style={{ color: klima.hitze.stufe?.color }}>{klima.hitze.pet.bewertung}</b> · {klima.hitze.pet.text} — gefühlte Temperatur für Menschen im Freien</>} />}
              </>
            ) : !loading && <div style={{ fontSize: 12, color: SOFT, fontFamily: SANS }}>Für diesen Standort liegen keine Klimamodell-Daten vor (außerhalb Berlins).</div>}
            {klima?.versiegelung && (
              <>
                <Zeile k="Versiegelungsgrad" v={`${klima.versiegelung.pct.toFixed(1)} % des Blocks (${klima.versiegelung.bebaut_pct?.toFixed(1)} % Bebauung, ${klima.versiegelung.sonstige_pct?.toFixed(1)} % sonstige Flächen)`} />
                {klima.versiegelung.trend_pct != null && (
                  <Zeile k="Trend 2016 → 2021" v={`${klima.versiegelung.trend_pct > 0 ? '+' : ''}${klima.versiegelung.trend_pct.toFixed(2)} Prozentpunkte ${klima.versiegelung.trend_pct > 0 ? '(zunehmende Versiegelung)' : klima.versiegelung.trend_pct < 0 ? '(Entsiegelung)' : ''}`} />
                )}
                <Zeile k="Blocktyp" v={`${klima.versiegelung.blocktyp}${klima.versiegelung.blockflaeche_m2 ? ` · Blockfläche ${fmtArea(klima.versiegelung.blockflaeche_m2)}` : ''}`} />
              </>
            )}
          </Section>

          {/* 3 Grün */}
          {klima?.gruen && (
            <Section icon={Leaf} title="Vegetation im Block" subtitle="Umweltatlas Berlin · Grünvolumen 2020">
              <Zeile k="Grünvolumenzahl" v={`${klima.gruen.gvz.toFixed(2)} m³ Vegetationsvolumen je m² Blockfläche`} />
              <Zeile k="Vegetationsanteil" v={`${klima.gruen.anteil_pct} % der Blockfläche, mittlere Bestandshöhe ${klima.gruen.hoehe_m?.toFixed(1)} m`} />
              {klima.gruen.trend_gvz != null && (
                <Zeile k="Trend 2010 → 2020" v={`${klima.gruen.trend_gvz > 0 ? '+' : ''}${klima.gruen.trend_gvz.toFixed(2)} m³/m² ${klima.gruen.trend_gvz < -0.3 ? '— spürbarer Verlust an Gehölzvolumen' : klima.gruen.trend_gvz > 0.3 ? '— Zuwachs' : ''}`} />
              )}
            </Section>
          )}

          {/* 4 Regen */}
          <Section icon={Droplets} title="Starkregen & Überflutung" subtitle="Starkregengefahrenkarte Berlin">
            {regen ? (
              <>
                <Zeile k="Bewertung" v={<><b style={{ color: regenAmpel?.color }}>{regenAmpel?.label}</b> — {regenAmpel?.hint}</>} />
                {regen.modellgebiet && SZENARIEN.map(s => {
                  const v = regen.szenarien?.[s.key]
                  return v ? (
                    <Zeile key={s.key} k={s.label}
                      v={`${v.anteil_pct > 0 ? `${v.anteil_pct} % des 120-m-Umfelds überflutet` : 'kein modellierter Wasserstand im Umfeld'}${v.klasse ? ` · am Standort: ${v.klasse}` : ''}`} />
                  ) : null
                })}
              </>
            ) : (
              <div style={{ fontSize: 12, color: SOFT, fontFamily: SANS }}>Noch nicht geprüft — im Detailpanel unter „🌧️ Starkregen-Check" starten.</div>
            )}
          </Section>

          {/* 5 Empfehlungen */}
          {tipps.length > 0 && (
            <Section icon={MapPin} title="Empfehlungen für diese Fläche" subtitle="aus den Analysen abgeleitet">
              <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {tipps.map((t, i) => (
                  <li key={i} style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.6, breakInside: 'avoid' }}>
                    <b>{t.titel}</b><br />
                    <span style={{ color: '#374151' }}>{t.text}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Fuß */}
          <footer style={{ borderTop: `1px solid ${LINE}`, paddingTop: 10, marginTop: 8, fontFamily: MONO, fontSize: 8.5, color: SOFT, lineHeight: 1.7 }}>
            <div><b>Quellen:</b> Umweltatlas Berlin / Geodateninfrastruktur Berlin (Klimaanalyse 2022, Versiegelung 2021,
              Grünvolumen 2020, Starkregengefahrenkarte, ALKIS-Gebäude, Baumkataster, 3D-Gebäudemodell LoD2) — Lizenz dl-de/by-2-0 bzw. dl-de/zero-2-0.</div>
            <div><b>Methodik Sonne:</b> Sonnenstand nach NOAA-Algorithmus, Verschattung durch amtliche Gebäudegeometrien
              und Baumkronen (saisonaler Laubzustand), Zeitschritt 10 Minuten, Bezugshöhe 0,5 m über Grund.
              Strahlungswerte sind Klarhimmel-Potenziale ohne Bewölkung; reale Jahreswerte liegen niedriger.</div>
            <div><b>Hinweis:</b> Automatisch erzeugter Bericht als Planungshilfe — er ersetzt keine Vor-Ort-Begutachtung.
              Erstellt mit LUMA BIOME™ am {heute}.</div>
          </footer>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
