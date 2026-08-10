// Serien-Kartierung: kompaktes Kurzformular nach dem Setzen eines Baums.
// Speichern hält den Zeichenmodus aktiv → nächster Tap setzt den nächsten Baum.
import { useState, useRef, useEffect } from 'react'
import { X, ChevronsRight, Check, SlidersHorizontal } from 'lucide-react'
import { A, SURFACE, BORDER, FG, MUTED } from '../lib/theme.js'
import { TREE_SPECIES, speciesHistory, rememberSpecies, matchSpecies } from '../data/treeSpecies.js'

const MONO = "'Space Mono', monospace"
const SANS = "'Space Grotesk', sans-serif"

const INPUT = {
  width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${BORDER}`,
  background: 'color-mix(in srgb, var(--luma-fg) 4%, transparent)', color: FG, fontSize: 13,
  fontFamily: SANS, outline: 'none', boxSizing: 'border-box',
}
const LABEL = { fontSize: 9, color: MUTED, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, display: 'block' }

export default function TreeQuickForm({ project, suggestedNumber, savedCount = 0, isMobile, onSave, onFullForm, onDiscard, onExit }) {
  const [nummer, setNummer] = useState(suggestedNumber || '')
  const [art, setArt] = useState('')
  const [umfang, setUmfang] = useState('')
  const artRef = useRef(null)
  const history = speciesHistory()

  useEffect(() => { setNummer(suggestedNumber || '') }, [suggestedNumber])
  useEffect(() => { artRef.current?.focus() }, [])

  function collect() {
    const m = matchSpecies(art)
    const properties = {
      baumnummer: nummer || undefined,
      baumart_deutsch: m?.name || art || undefined,
      baumart_latein: m?.latin || undefined,
      stammumfang_cm: umfang || undefined,
      // Ohne Messhöhe ist der Umfang später nicht einzuordnen. Die
      // Schnellerfassung misst in 1,30 m; das steht jetzt im Datensatz.
      umfang_messhoehe_cm: umfang ? 130 : undefined,
    }
    if (m || art) rememberSpecies(m?.name || art, m?.latin || '')
    return { label: m?.name || art || nummer || 'Baum', properties }
  }

  function submit(e) {
    e?.preventDefault()
    onSave(collect())
    setArt(''); setUmfang('')  // Nummer wird vom Parent hochgezählt
    artRef.current?.focus()
  }

  return (
    <div className="lu-fade-in" style={{
      position: 'absolute', zIndex: 1350,
      left: isMobile ? 0 : '50%', right: isMobile ? 0 : 'auto', bottom: isMobile ? 0 : 20,
      transform: isMobile ? 'none' : 'translateX(-50%)',
      width: isMobile ? '100%' : 460,
      background: SURFACE, border: `1px solid color-mix(in srgb, #22c55e 40%, transparent)`,
      borderRadius: isMobile ? '14px 14px 0 0' : 12,
      boxShadow: '0 -4px 30px rgba(0,0,0,0.45)', padding: '14px 16px',
      paddingBottom: isMobile ? 'calc(14px + env(safe-area-inset-bottom))' : 14,
    }}>
      {/* Kopf */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🌳</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: FG }}>Baum erfassen</div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>
            {project?.name}{savedCount > 0 ? ` · ${savedCount} in dieser Serie` : ''}
          </div>
        </div>
        <button type="button" onClick={onExit} title="Serie beenden" className="lu-btn-ghost"
          style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={13} />
        </button>
      </div>

      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 78px', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={LABEL}>Nummer</label>
            <input style={{ ...INPUT, fontFamily: MONO, fontSize: 12 }} value={nummer} onChange={e => setNummer(e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Baumart</label>
            <input ref={artRef} style={INPUT} value={art} onChange={e => setArt(e.target.value)}
              placeholder="Stieleiche / Quercus…" list="luma-quick-species" autoComplete="off" />
            <datalist id="luma-quick-species">
              {history.map((s, i) => <option key={`h-${i}`} value={s.name}>{s.latin}</option>)}
              {TREE_SPECIES.map(s => <option key={s.latin} value={s.name}>{s.latin}</option>)}
            </datalist>
          </div>
          <div>
            <label style={LABEL}>Umfang cm (1,30 m)</label>
            <input style={INPUT} type="number" inputMode="numeric" value={umfang} onChange={e => setUmfang(e.target.value)} placeholder="85" />
          </div>
        </div>

        {/* Zuletzt verwendete Arten als Ein-Tap-Chips */}
        {history.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {history.slice(0, 4).map((s, i) => (
              <button key={i} type="button" onClick={() => setArt(s.name)} className="lu-chip"
                style={{ padding: '3px 9px', borderRadius: 12, border: `1px solid ${art === s.name ? '#22c55e70' : BORDER}`, background: art === s.name ? '#22c55e18' : 'transparent', color: art === s.name ? '#22c55e' : MUTED, cursor: 'pointer', fontSize: 11, fontFamily: SANS }}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" className="lu-btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, background: A, border: 'none', color: 'var(--luma-on-a)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: SANS }}>
            <Check size={14} /> Speichern <ChevronsRight size={13} style={{ opacity: 0.6 }} />
          </button>
          <button type="button" onClick={() => onFullForm(collect())} title="Alle FLL-Felder ausfüllen" className="lu-btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: SANS, whiteSpace: 'nowrap' }}>
            <SlidersHorizontal size={12} /> {isMobile ? 'Mehr' : 'Alle Felder'}
          </button>
          <button type="button" onClick={onDiscard} title="Diesen Punkt verwerfen" className="lu-btn-danger"
            style={{ padding: '9px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', fontSize: 12, fontFamily: SANS }}>
            Verwerfen
          </button>
        </div>
      </form>
    </div>
  )
}
