// Import/Export der Kartenobjekte (GeoJSON, KML, CSV-Baumlisten).
// Umwandlung in src/lib/kartenAustausch.js — hier nur Dialog und Zuordnung
// der eingelesenen Objekte zu Projekten.
import { useState, useMemo } from 'react'
import { X, Download, Upload } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED, OK, WARN, DANGER, A14 } from '../lib/theme.js'
import { dateiEinlesen, alsGeoJSON, alsCSV } from '../lib/kartenAustausch.js'
import { projektAusLage } from '../lib/projektAusLage.js'

const TYP_NAMEN = { tree: 'Bäume', area: 'Projektflächen', bed: 'Beete', point: 'Punkte', line: 'Linien' }
const AUS_DER_LAGE = '__lage__'

function herunterladen(inhalt, name, typ) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const dateiName = s => (s || 'karte').toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const knopf = (aktiv = false) => ({
  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, cursor: 'pointer',
  border: `1px solid ${aktiv ? A : BORDER}`, background: aktiv ? A14 : 'transparent', color: aktiv ? A : FG,
  fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
})
const ueberschrift = { fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, margin: '0 0 8px' }

export default function KartenAustausch({ sichtbare, alleObjekte, projects, standardProjektId, darfImportieren, onImport, onClose }) {
  const [umfang, setUmfang] = useState(standardProjektId || '')
  const [datei, setDatei] = useState(null)        // { name, text }
  const [flaechenTyp, setFlaechenTyp] = useState('bed')
  const [ziel, setZiel] = useState(standardProjektId || AUS_DER_LAGE)
  const [laeuft, setLaeuft] = useState(false)
  const [ergebnis, setErgebnis] = useState(null)

  const zumExport = useMemo(
    () => umfang ? alleObjekte.filter(f => f.project_id === umfang) : sichtbare,
    [umfang, alleObjekte, sichtbare])
  const exportName = dateiName(umfang ? projects.find(p => p.id === umfang)?.name : 'karte')

  const gelesen = useMemo(() => datei && dateiEinlesen(datei.text, datei.name, { flaechenTyp }), [datei, flaechenTyp])

  // Jedem Objekt ein Projekt geben — fest gewählt oder aus der Lage
  const zuordnung = useMemo(() => {
    if (!gelesen) return null
    const mit = [], ohne = []
    for (const o of gelesen.objekte) {
      const projectId = ziel === AUS_DER_LAGE ? projektAusLage(o.geometry, alleObjekte, projects)?.projectId : ziel
      ;(projectId ? mit : ohne).push({ ...o, project_id: projectId })
    }
    return { mit, ohne }
  }, [gelesen, ziel, alleObjekte, projects])

  const typen = useMemo(() => {
    const z = {}
    for (const o of zuordnung?.mit || []) z[o.feature_type] = (z[o.feature_type] || 0) + 1
    return Object.entries(z)
  }, [zuordnung])

  async function dateiGewaehlt(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErgebnis(null)
    setDatei({ name: f.name, text: await f.text() })
  }

  async function uebernehmen() {
    if (!zuordnung?.mit.length) return
    setLaeuft(true)
    const n = await onImport(zuordnung.mit)
    setLaeuft(false)
    setErgebnis({ gespeichert: n, gesamt: zuordnung.mit.length })
    setDatei(null)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} data-test="austausch-dialog" className="lu-fade-in"
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, color: FG, fontFamily: "'Space Grotesk', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Import / Export</div>
          <button onClick={onClose} title="Schließen" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={ueberschrift}>Export</div>
        <select value={umfang} onChange={e => setUmfang(e.target.value)} data-test="export-umfang"
          style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, fontSize: 12, marginBottom: 8 }}>
          <option value="">Alle sichtbaren Objekte</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
          <button style={knopf()} disabled={!zumExport.length} data-test="export-geojson"
            onClick={() => herunterladen(JSON.stringify(alsGeoJSON(zumExport, projects), null, 1), `${exportName}.geojson`, 'application/geo+json')}>
            <Download size={13} /> GeoJSON
          </button>
          <button style={knopf()} disabled={!zumExport.length} data-test="export-csv"
            onClick={() => herunterladen(alsCSV(zumExport, projects), `${exportName}.csv`, 'text/csv;charset=utf-8')}>
            <Download size={13} /> CSV
          </button>
          <span style={{ fontSize: 11, color: MUTED }}>{zumExport.filter(f => TYP_NAMEN[f.feature_type]).length} Objekte</span>
        </div>

        <div style={ueberschrift}>Import</div>
        {!darfImportieren ? (
          <div style={{ fontSize: 12, color: MUTED }}>Importieren dürfen nur Mitarbeitende.</div>
        ) : (
          <>
            <label style={{ ...knopf(), display: 'inline-flex' }}>
              <Upload size={13} /> Datei wählen
              <input type="file" accept=".geojson,.json,.kml,.csv,.txt,.tsv" onChange={dateiGewaehlt} data-test="import-datei" style={{ display: 'none' }} />
            </label>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
              GeoJSON, KML (Google Earth, QGIS) oder CSV-Baumliste mit Breite/Länge oder Rechts-/Hochwert (UTM 33).
            </div>

            {gelesen && (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }} data-test="import-vorschau">
                <div style={{ fontSize: 12 }}>
                  <b>{datei.name}</b> · {gelesen.format.toUpperCase()} · {gelesen.objekte.length} Objekte gelesen
                </div>
                {gelesen.fehler.length > 0 && (
                  <div style={{ fontSize: 11, color: WARN }}>
                    {gelesen.fehler.slice(0, 4).map((f, i) => <div key={i}>{f}</div>)}
                    {gelesen.fehler.length > 4 && <div>… und {gelesen.fehler.length - 4} weitere</div>}
                  </div>
                )}
                {gelesen.objekte.some(o => o.geometry.type === 'Polygon') && (
                  <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    Flächen ohne Typangabe als
                    <select value={flaechenTyp} onChange={e => setFlaechenTyp(e.target.value)}
                      style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, fontSize: 12 }}>
                      <option value="bed">Beet</option>
                      <option value="area">Projektfläche</option>
                    </select>
                  </label>
                )}
                <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                  Projekt
                  <select value={ziel} onChange={e => setZiel(e.target.value)} data-test="import-projekt"
                    style={{ padding: '7px 9px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: FG, fontSize: 12 }}>
                    <option value={AUS_DER_LAGE}>Aus der Lage (Projektfläche oder Projekt in der Nähe)</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                {zuordnung.ohne.length > 0 && (
                  <div style={{ fontSize: 11, color: WARN }}>
                    {zuordnung.ohne.length} Objekte liegen bei keinem Projekt und werden nicht übernommen — Projekt fest wählen, um sie mitzunehmen.
                  </div>
                )}
                <button style={knopf(true)} onClick={uebernehmen} disabled={laeuft || !zuordnung.mit.length} data-test="import-uebernehmen">
                  {laeuft ? 'Speichert …' : `${zuordnung.mit.length} Objekte übernehmen`}
                  {typen.length > 0 && <span style={{ color: MUTED }}>({typen.map(([t, n]) => `${n} ${TYP_NAMEN[t]}`).join(', ')})</span>}
                </button>
              </div>
            )}
            {ergebnis && (
              <div data-test="import-ergebnis" style={{ marginTop: 10, fontSize: 12, color: ergebnis.gespeichert === ergebnis.gesamt ? OK : DANGER }}>
                {ergebnis.gespeichert === ergebnis.gesamt
                  ? `${ergebnis.gespeichert} Objekte gespeichert.`
                  : `Nur ${ergebnis.gespeichert} von ${ergebnis.gesamt} Objekten gespeichert — der Rest wurde abgelehnt.`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
