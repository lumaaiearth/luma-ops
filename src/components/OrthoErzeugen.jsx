// Orthomosaik aus einem GeoTIFF direkt in der App kacheln und hochladen (K13).
// Rechnen in src/lib/orthoKacheln.js; hier Auswahl, Schätzung, Fortschritt.
import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { BORDER, FG, MUTED } from '../lib/theme.js'
import { SUPABASE_URL, sbUploadKachel } from '../lib/supabase.js'

// Mehr soll ein einzelnes Orthomosaik vom Speicher (Free-Plan 1 GB) nicht belegen
export const MAX_MB = 300

const knopf = { padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }

export default function OrthoErzeugen({ project, kuerzel, aufDateiName, onFertig }) {
  const [kopf, setKopf] = useState(null)
  const [fehler, setFehler] = useState(null)
  const [maxZ, setMaxZ] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const [stand, setStand] = useState(null)
  const abbruch = useRef(false)
  const [lib, setLib] = useState(null)

  async function dateiGewaehlt(f) {
    if (!f) return
    setFehler(null); setKopf(null); setStand(null)
    try {
      const [o, g] = await Promise.all([import('../lib/orthoKacheln.js'), import('../lib/geotiffImport.js')])
      const k = await o.orthoKopf(f, g.DEFS, g.epsgAusGeoKeys)
      if (k.fehler) { setFehler(k.fehler); return }
      setLib(o)
      setKopf({ ...k, dateiname: f.name })
      setMaxZ(o.zoomFuerAufloesung(k.mProPx, k.lat))
      aufDateiName?.(f.name.replace(/\.[^.]+$/, ''))
    } catch (e) {
      setFehler(`GeoTIFF konnte nicht gelesen werden (${e.message || e}).`)
    }
  }

  const minZ = maxZ != null ? Math.max(12, maxZ - 6) : null
  const schaetz = kopf && lib && maxZ != null ? lib.schaetzung(kopf.ecken, minZ, maxZ) : null
  const zuGross = schaetz && schaetz.mb > MAX_MB
  const nativ = kopf && lib ? lib.zoomFuerAufloesung(kopf.mProPx, kopf.lat) : null

  async function erzeugen() {
    if (!kopf || !kuerzel || zuGross) return
    abbruch.current = false
    setLaeuft(true); setFehler(null)
    try {
      const format = await lib.kachelFormat()
      const basis = `${project.id}/${kuerzel}`
      const s = await lib.kachelnErzeugen(kopf, {
        minZ, maxZ, format,
        hochladen: (pfad, blob) => sbUploadKachel(`${basis}/${pfad}`, blob, format.typ),
        fortschritt: st => setStand({ ...st }),
        abbrechen: () => abbruch.current,
      })
      setStand({ ...s })
      if (s.abgebrochen) { setFehler('Abgebrochen — bereits hochgeladene Kacheln bleiben liegen und werden beim nächsten Lauf überschrieben.'); return }
      if (!s.hochgeladen) { setFehler('Keine Kachel mit Bildinhalt erzeugt — liegt das Bild an der angegebenen Stelle?'); return }
      onFertig({
        feature_type: 'ortho_tiles',
        geometry: { type: 'Polygon', coordinates: [[...kopf.ecken, kopf.ecken[0]]] },
        properties: {
          tiles_url: `${SUPABASE_URL}/storage/v1/object/public/drone-tiles/${basis}/{z}/{x}/{y}.${format.endung}`,
          slug: kuerzel, minZoom: minZ, maxZoom: maxZ, tms: false, eckgenau: true,
          quelle: kopf.dateiname, aufloesung_cm: Math.round(kopf.mProPx * 1000) / 10,
        },
      })
    } catch (e) {
      setFehler(`Kacheln konnten nicht erzeugt werden (${e.message || e}).`)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div data-test="ortho-erzeugen-bereich" style={{ marginBottom: 16, padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: FG, marginBottom: 6 }}>Aus GeoTIFF erzeugen</div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0ea5e9', cursor: laeuft ? 'default' : 'pointer' }}>
        <Upload size={12} /> Orthomosaik (GeoTIFF) wählen
        <input type="file" accept=".tif,.tiff" disabled={laeuft} data-test="ortho-datei" style={{ display: 'none' }} onChange={e => { dateiGewaehlt(e.target.files[0]); e.target.value = '' }} />
      </label>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
        Die Kacheln entstehen hier im Browser und werden direkt hochgeladen — das Fenster offen lassen, bis es fertig ist.
      </div>

      {kopf && (
        <div data-test="ortho-kopf" style={{ marginTop: 10, fontSize: 12, color: FG, display: 'grid', gap: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: MUTED }}>
            {kopf.dateiname} · EPSG:{kopf.epsg} · {kopf.breite.toLocaleString('de-DE')} × {kopf.hoehe.toLocaleString('de-DE')} px · {(kopf.mProPx * 100).toFixed(1)} cm/px
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Feinste Stufe
            <select value={maxZ ?? ''} disabled={laeuft} onChange={e => setMaxZ(+e.target.value)} data-test="ortho-maxzoom"
              style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, fontSize: 12 }}>
              {[0, 1, 2, 3].map(d => nativ - d).filter(z => z >= 12).map(z => (
                <option key={z} value={z}>Zoom {z} · {(lib.aufloesung(z, kopf.lat) * 100).toFixed(1)} cm/px{z === nativ ? ' (Bildauflösung)' : ''}</option>
              ))}
            </select>
          </label>
          {schaetz && (
            <div data-test="ortho-schaetzung" style={{ fontSize: 11, color: zuGross ? '#f87171' : MUTED }}>
              Zoom {minZ}–{maxZ}: höchstens {schaetz.kacheln.toLocaleString('de-DE')} Kacheln, etwa {schaetz.mb} MB.
              {zuGross && ` Mehr als ${MAX_MB} MB — bitte eine gröbere feinste Stufe wählen.`}
            </div>
          )}
          {!kuerzel && <div style={{ fontSize: 11, color: '#f87171' }}>Bitte unten eine Bezeichnung oder ein Kürzel angeben.</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={erzeugen} disabled={laeuft || zuGross || !kuerzel} data-test="ortho-erzeugen"
              style={{ ...knopf, flex: 1, background: '#0ea5e9', color: '#fff', opacity: laeuft || zuGross || !kuerzel ? 0.6 : 1 }}>
              {laeuft ? 'Erzeugt …' : 'Kacheln erzeugen und hochladen'}
            </button>
            {laeuft && (
              <button onClick={() => { abbruch.current = true }} style={{ ...knopf, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED }}>
                Abbrechen
              </button>
            )}
          </div>
        </div>
      )}
      {stand && (
        <div data-test="ortho-fortschritt" style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
          {stand.hochgeladen.toLocaleString('de-DE')} Kacheln hochgeladen
          {schaetz ? ` (von höchstens ${schaetz.kacheln.toLocaleString('de-DE')})` : ''}
        </div>
      )}
      {fehler && <div style={{ marginTop: 8, fontSize: 11, color: '#f87171' }}>{fehler}</div>}
    </div>
  )
}
