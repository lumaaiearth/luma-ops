// „Offline vorhalten“ für ein Projektgebiet (K17). Rechnen und Laden in
// src/lib/offlineKacheln.js; hier Auswahl, Schätzung, Fortschritt.
import { useMemo, useRef, useState } from 'react'
import { X, Download } from 'lucide-react'
import { SURFACE, BORDER, FG, MUTED, A, A14 } from '../lib/theme.js'
import { TILES, GRUNDKARTEN } from '../data/biomeLayers.js'
import {
  OFFLINE_ERLAUBT, CACHE_AMTLICH, CACHE_ORTHO, MAX_KACHELN,
  projektGebiet, kachelListe, feinsteStufe, xyzUrl, kachelUrls, vorhalten,
} from '../lib/offlineKacheln.js'
import { bildEcken } from '../lib/eckenTransform.js'

const MIN_Z = 14

export default function OfflineDialog({ project, features, aktuelleGrundkarte, onClose }) {
  const erlaubt = GRUNDKARTEN.filter(g => OFFLINE_ERLAUBT.has(g.id))
  const [grundkarte, setGrundkarte] = useState(OFFLINE_ERLAUBT.has(aktuelleGrundkarte) ? aktuelleGrundkarte : 'luftbild_berlin')
  const orthos = useMemo(() => features.filter(f => f.project_id === project.id && f.feature_type === 'ortho_tiles' && f.properties?.tiles_url), [features, project.id])
  const [mitOrtho, setMitOrtho] = useState(true)
  const [stand, setStand] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)
  const abbruch = useRef(false)

  const gebiet = useMemo(() => projektGebiet(project, features), [project, features])
  const plan = useMemo(() => {
    if (!gebiet) return null
    const tile = TILES[grundkarte]
    const grund = kachelListe(gebiet, MIN_Z, feinsteStufe(tile))
    const ortho = mitOrtho ? orthos.flatMap(f => {
      const p = f.properties
      const ecken = bildEcken(f)
      const lngs = ecken.map(e => e[0]), lats = ecken.map(e => e[1])
      return kachelListe([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], Math.max(p.minZoom || MIN_Z, MIN_Z), p.maxZoom || 20)
        .map(k => xyzUrl(p.tiles_url, p.tms ? { ...k, y: 2 ** k.z - 1 - k.y } : k))
    }) : []
    return { tile, grund, ortho, gesamt: grund.length + ortho.length }
  }, [gebiet, grundkarte, mitOrtho, orthos])
  const zuViele = plan && plan.gesamt > MAX_KACHELN

  async function starten() {
    if (!plan || zuViele) return
    if (typeof caches === 'undefined') { setFehler('Dieser Browser kann keine Kacheln speichern.'); return }
    abbruch.current = false
    setLaeuft(true); setFehler(null)
    try {
      const urls = await kachelUrls(plan.tile, plan.grund)
      const summe = { geladen: 0, vorhanden: 0, fehlend: 0, gesamt: plan.gesamt }
      const teil = async (liste, cache) => {
        const basis = { ...summe }
        const s = await vorhalten(liste, cache, {
          abbrechen: () => abbruch.current,
          fortschritt: st => setStand({ ...summe, geladen: basis.geladen + st.geladen, vorhanden: basis.vorhanden + st.vorhanden, fehlend: basis.fehlend + st.fehlend }),
        })
        summe.geladen += s.geladen; summe.vorhanden += s.vorhanden; summe.fehlend += s.fehlend
        return s.abgebrochen
      }
      const ab = (await teil(urls, CACHE_AMTLICH)) || (plan.ortho.length > 0 && await teil(plan.ortho, CACHE_ORTHO))
      setStand({ ...summe, fertig: !ab, abgebrochen: ab })
    } catch (e) {
      setFehler(`Vorhalten fehlgeschlagen (${e.message || e}).`)
    } finally {
      setLaeuft(false)
    }
  }

  const sel = { width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, fontSize: 12 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} data-test="offline-dialog" className="lu-fade-in"
        style={{ width: '100%', maxWidth: 420, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, color: FG, fontFamily: "'Space Grotesk', sans-serif", display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Offline vorhalten</div>
            <div style={{ fontSize: 11, color: MUTED }}>{project.name}</div>
          </div>
          <button onClick={onClose} title="Schließen" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {!gebiet ? (
          <div style={{ fontSize: 12, color: MUTED }}>Für dieses Projekt gibt es weder Objekte noch einen Pin — es ist unklar, welches Gebiet geladen werden soll.</div>
        ) : (
          <>
            <label style={{ fontSize: 11, color: MUTED, display: 'grid', gap: 4 }}>Grundkarte
              <select value={grundkarte} onChange={e => setGrundkarte(e.target.value)} disabled={laeuft} data-test="offline-grundkarte" style={sel}>
                {erlaubt.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </label>
            {orthos.length > 0 && (
              <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={mitOrtho} onChange={e => setMitOrtho(e.target.checked)} disabled={laeuft} />
                Orthomosaike des Projekts ({orthos.length}) mitnehmen
              </label>
            )}
            <div data-test="offline-schaetzung" style={{ fontSize: 11, color: zuViele ? '#f87171' : MUTED, lineHeight: 1.5 }}>
              Zoom {MIN_Z}–{feinsteStufe(plan.tile)}: {plan.grund.length.toLocaleString('de-DE')} Kacheln Grundkarte
              {plan.ortho.length > 0 && `, ${plan.ortho.length.toLocaleString('de-DE')} Kacheln Orthomosaik`}
              {' '}(etwa {Math.max(1, Math.round(plan.gesamt * 35 / 1024))} MB auf diesem Gerät).
              {zuViele && ` Mehr als ${MAX_KACHELN.toLocaleString('de-DE')} Kacheln — das Gebiet ist zu groß.`}
            </div>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
              OpenStreetMap und Satellit (Esri) werden nicht vorab geladen — ihre Nutzungsbedingungen verbieten das.
              Offline zeigt die Karte von ihnen nur, was zuvor angesehen wurde.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={starten} disabled={laeuft || zuViele} data-test="offline-starten"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, border: `1px solid ${A}`, background: A14, color: A, cursor: laeuft || zuViele ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: zuViele ? 0.5 : 1 }}>
                <Download size={14} /> {laeuft ? 'Lädt …' : 'Kacheln vorhalten'}
              </button>
              {laeuft && <button onClick={() => { abbruch.current = true }} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', fontSize: 13 }}>Abbrechen</button>}
            </div>
          </>
        )}
        {stand && (
          <div data-test="offline-stand" style={{ fontSize: 12, color: stand.fertig ? '#22c55e' : MUTED }}>
            {stand.fertig ? 'Fertig: ' : stand.abgebrochen ? 'Abgebrochen: ' : ''}
            {(stand.geladen + stand.vorhanden).toLocaleString('de-DE')} von {stand.gesamt.toLocaleString('de-DE')} Kacheln offline verfügbar
            {stand.vorhanden > 0 && ` (${stand.vorhanden.toLocaleString('de-DE')} waren schon da)`}
            {stand.fehlend > 0 && ` · ${stand.fehlend.toLocaleString('de-DE')} ohne Bild oder nicht erreichbar`}
          </div>
        )}
        {fehler && <div style={{ fontSize: 12, color: '#f87171' }}>{fehler}</div>}
      </div>
    </div>
  )
}
