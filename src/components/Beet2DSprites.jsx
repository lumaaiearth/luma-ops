// Beet 2D (Fotos) — realistische Beet-Ansicht aus freigestellten Pflanzenfotos.
// Quelle: /cutouts/<id>.webp (Build-Pipeline scripts/gen-cutouts.py). Sprites
// werden als 2D-Billboards platziert (gemeinsame Platzierung wie Rasterplan/
// Drift-Karte), tiefensortiert, in realen Höhenverhältnissen, ohne Boden.
// Saison-Stepper blendet nicht blühende Arten aus; Bestäuber-Fokus dimmt
// fremde Arten; Tippen bestimmt die Art. Kein three.js nötig.
import { useState, useRef, useEffect, useMemo } from 'react'
import { A, A14, A20, BORDER, FG, MUTED, SURFACE } from '../lib/theme.js'
import { Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { MONTHS_FULL, SEASON_OF, POLLI_GROUPS, hashStr, seededRand } from '../lib/beetLayout.js'

const CANVAS_H = 420
const CUTOUT_BASE = import.meta.env.BASE_URL + 'cutouts/'

// Bild-Cache über alle Instanzen (id -> HTMLImageElement | null wenn fehlt)
const imgCache = new Map()
function loadCutout(id, onDone) {
  if (imgCache.has(id)) { onDone(imgCache.get(id)); return }
  const img = new Image()
  img.onload = () => { imgCache.set(id, img); onDone(img) }
  img.onerror = () => { imgCache.set(id, null); onDone(null) }
  img.src = CUTOUT_BASE + id + '.webp'
}

export default function Beet2DSprites({ placement, beetW, beetH, L, shadow, cardBg }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [month, setMonth] = useState(6)
  const [group, setGroup] = useState('alle')
  const [sel, setSel] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [, setTick] = useState(0)          // Re-Render wenn Bilder nachladen
  const hitRef = useRef([])

  const arten = useMemo(() => {
    const seen = new Map()
    placement.forEach(p => { if (!seen.has(p.id)) seen.set(p.id, p) })
    return [...seen.values()]
  }, [placement])
  const bluehend = arten.filter(p => (p.bluete_monate || []).includes(month)).length
  const heimPct = arten.length ? Math.round(100 * arten.filter(p => p.heimisch).length / arten.length) : 0
  const groupArten = group === 'alle' ? arten.length : arten.filter(p => p[group]).length
  const groupBluehend = group === 'alle' ? bluehend : arten.filter(p => p[group] && (p.bluete_monate || []).includes(month)).length

  // Bilder anfordern
  useEffect(() => {
    let alive = true
    arten.forEach(p => loadCutout(p.id, () => { if (alive) setTick(t => t + 1) }))
    return () => { alive = false }
  }, [arten])

  const draw = () => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const W = wrap.clientWidth, H = CANVAS_H
    canvas.width = W * DPR; canvas.height = H * DPR; canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    // Hintergrund (kein Boden): sanfter Verlauf
    const g = ctx.createLinearGradient(0, 0, 0, H)
    if (L) { g.addColorStop(0, '#eef3f9'); g.addColorStop(1, '#f5f3ec') }
    else { g.addColorStop(0, '#0e1712'); g.addColorStop(1, '#0a110d') }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

    const margin = 40
    const horizon = H * 0.30, groundH = H * 0.52
    const refH = 1.6 // m Referenzhöhe für Skalierung
    const pxPerM = groundH * 0.9 / refH * zoom
    // Projektion: py (Tiefe) → Höhe auf Canvas + Skalierung (hinten kleiner)
    const project = p => {
      const d = beetH > 0 ? p.py / beetH : 0.5           // 0 hinten .. 1 vorne
      const persp = 0.62 + 0.38 * d                       // hinten schmaler
      const x = W / 2 + (p.px - beetW / 2) / beetW * (W - margin * 2) * persp
      const y = horizon + d * groundH
      const scale = (0.72 + 0.5 * d) * zoom
      return { x, y, scale }
    }
    const order = placement.map(p => ({ p, ...project(p) })).sort((a, b) => a.y - b.y)
    const hits = []
    for (const it of order) {
      const p = it.p
      const img = imgCache.get(p.id)
      const serves = group === 'alle' || p[group]
      const blooming = (p.bluete_monate || []).includes(month)
      let alpha = 1
      if (!serves) alpha = 0.12
      else if (!blooming) alpha = 0.5
      const hM = (p.hoehe?.[1] ?? 50) / 100
      const hpx = Math.max(14, hM * pxPerM * it.scale)
      // Schatten
      ctx.save(); ctx.globalAlpha = 0.10 * (serves ? 1 : 0.3); ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.ellipse(it.x, it.y, hpx * 0.28, hpx * 0.06, 0, 0, 7); ctx.fill(); ctx.restore()
      let wpx = hpx * 0.6
      if (img) {
        const ar = img.width / img.height
        wpx = hpx * ar
        ctx.globalAlpha = alpha
        ctx.drawImage(img, it.x - wpx / 2, it.y - hpx, wpx, hpx)
        ctx.globalAlpha = 1
      } else if (img === null || !imgCache.has(p.id)) {
        // Fallback: farbiger Tropfen (Bild fehlt oder lädt noch)
        ctx.globalAlpha = alpha
        ctx.fillStyle = (p.bluete_farbe || '#6a8f5a')
        ctx.beginPath(); ctx.ellipse(it.x, it.y - hpx * 0.4, wpx / 2, hpx * 0.4, 0, 0, 7); ctx.fill()
        ctx.globalAlpha = 1
      }
      if (sel && sel.id === p.id) {
        ctx.strokeStyle = A; ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse(it.x, it.y, wpx * 0.55, hpx * 0.09, 0, 0, 7); ctx.stroke()
      }
      hits.push({ p, x: it.x, y: it.y, wpx, hpx })
    }
    hitRef.current = hits
  }

  useEffect(draw) // bei jedem Render neu zeichnen (Bilder, Monat, Zoom, Auswahl)
  useEffect(() => {
    const onR = () => setTick(t => t + 1)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  function onTap(e) {
    const r = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    let best = null, bd = Infinity
    for (const h of hitRef.current) {
      if (mx > h.x - h.wpx / 2 && mx < h.x + h.wpx / 2 && my > h.y - h.hpx && my < h.y) {
        const d = Math.abs(h.y - h.hpx / 2 - my)
        if (d < bd) { bd = d; best = h.p }
      }
    }
    setSel(best)
  }

  function exportPng() {
    const c = canvasRef.current
    if (!c) return
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = `florales-beet-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  const dots = v => '●'.repeat(v || 0) + '○'.repeat(5 - (v || 0))
  const btn = { border: `1px solid ${BORDER}`, background: L ? '#fff' : SURFACE, color: FG, borderRadius: 999, padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 500, minWidth: 34, display: 'inline-flex', alignItems: 'center', gap: 4 }

  return (
    <div style={{ background: cardBg, borderRadius: 12, padding: 16, boxShadow: shadow, marginBottom: 16 }} ref={wrapRef}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: L ? 700 : 400 }}>
        🌸 Pflanzenansicht (Fotos) — {beetW}m × {beetH}m · tippen = Art bestimmen
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[
          `${arten.length} Arten`, `${placement.length} Pflanzen`, `heimisch ${heimPct}%`,
          group === 'alle'
            ? `blühend im ${MONTHS_FULL[month - 1]}: ${bluehend}/${arten.length}`
            : `versorgt ${POLLI_GROUPS.find(g => g.key === group)?.label} im ${MONTHS_FULL[month - 1]}: ${groupBluehend}/${groupArten}`,
        ].map((c, i) => (
          <span key={i} style={{ background: L ? A14 : 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: FG, fontVariantNumeric: 'tabular-nums' }}>{c}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 700, marginRight: 2 }}>Bestäuber-Fokus:</span>
        {[{ key: 'alle', label: 'Alle', emoji: '🌍' }, ...POLLI_GROUPS].map(gr => {
          const has = gr.key === 'alle' || arten.some(p => p[gr.key])
          return (
            <button key={gr.key} disabled={!has} onClick={() => setGroup(gr.key)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, fontSize: 11,
              cursor: has ? 'pointer' : 'not-allowed', opacity: has ? 1 : 0.35, fontWeight: group === gr.key ? 700 : 400,
              border: group === gr.key ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
              background: group === gr.key ? A14 : 'transparent', color: group === gr.key ? A : MUTED,
            }}>{gr.emoji} {gr.label}</button>
          )
        })}
      </div>
      {group !== 'alle' && groupArten > 0 && groupBluehend === 0 && (
        <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8, background: 'rgba(220,38,38,0.08)', borderRadius: 6, padding: '6px 10px' }}>
          ⚠️ Im {MONTHS_FULL[month - 1]} blüht nichts für {POLLI_GROUPS.find(g => g.key === group)?.label}. Blühlücke — passende Art ergänzen.
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} onClick={onTap} style={{ width: '100%', display: 'block', borderRadius: 8, cursor: 'pointer' }} />
        {sel && (
          <div style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: 300, background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px', boxShadow: shadow, display: 'flex', gap: 10 }}>
            {imgCache.get(sel.id) && <img src={CUTOUT_BASE + sel.id + '.webp'} alt="" style={{ width: 54, height: 54, objectFit: 'contain', flexShrink: 0 }} />}
            <div>
              <button onClick={() => setSel(null)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 0, color: MUTED, cursor: 'pointer', fontSize: 14 }}>✕</button>
              <div style={{ fontStyle: 'italic', fontFamily: 'Charter, Georgia, serif', fontSize: 14, color: FG }}>{sel.latin}</div>
              <div style={{ fontWeight: 700, color: FG, marginBottom: 4 }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: MUTED }}>
                Blüte {MONTHS_FULL[(sel.bluete_monate?.[0] || 1) - 1]}–{MONTHS_FULL[(sel.bluete_monate?.[sel.bluete_monate.length - 1] || 1) - 1]} · bis {sel.hoehe?.[1] ?? '?'} cm<br />
                Nektar <span style={{ color: A }}>{dots(sel.nektar)}</span> · Pollen <span style={{ color: A }}>{dots(sel.pollen)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, border: `1px solid ${A}`, color: A, borderRadius: 6, padding: '1px 6px' }}>{sel.heimisch ? 'heimisch' : 'Zierstaude'}</span>
                {sel.raupenfutter_arten?.length ? <span style={{ fontSize: 10, border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '1px 6px' }}>Raupenfutter: {sel.raupenfutter_arten[0]}</span> : null}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: L ? A14 : 'rgba(255,255,255,0.04)', borderRadius: 999, padding: '2px 4px' }}>
          <button onClick={() => setMonth(m => Math.max(1, m - 1))} style={btn} aria-label="Früher">‹</button>
          <span style={{ minWidth: 132, textAlign: 'center', fontSize: 12, fontWeight: 700, color: FG, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {SEASON_OF(month)}<br /><span style={{ fontWeight: 400, color: MUTED, textTransform: 'none', fontSize: 11 }}>{MONTHS_FULL[month - 1]}</span>
          </span>
          <button onClick={() => setMonth(m => Math.min(12, m + 1))} style={btn} aria-label="Später">›</button>
        </div>
        <span style={{ fontSize: 11, color: MUTED }}>Nicht blühende Arten sind ausgegraut</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button onClick={() => setZoom(z => Math.max(0.6, z * 0.85))} style={btn} aria-label="Kleiner"><ZoomOut size={13} /></button>
          <button onClick={() => setZoom(z => Math.min(2.4, z * 1.18))} style={btn} aria-label="Größer"><ZoomIn size={13} /></button>
          <button onClick={exportPng} style={{ ...btn, padding: '6px 12px' }}><Download size={12} /> PNG</button>
        </div>
      </div>
    </div>
  )
}
