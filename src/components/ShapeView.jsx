// ShapeView — rendert die EXAKTE Freiform der Fläche (aus BIOME) als
// durchgängigen visuellen Anker in allen Modulen. Zeichnet den Polygon-Umriss
// und optional die Bepflanzung darin als Farbblöcke+Buchstaben (Rasterplan,
// auf die Form geclippt). Gleiche Form in Modul 1/2/3 → Bananenform bleibt
// Bananenform.
import { useRef, useEffect, useMemo } from 'react'
import { A, BORDER, FG, MUTED } from '../lib/theme.js'
import { buildGrid } from '../lib/beetLayout.js'

function pickTextColor(hex) {
  const h = (hex || '#10b981').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1a2b1f' : '#ffffff'
}

// shapeMeta.local = { points:[[x,y]…] (Meter), w, h }
export default function ShapeView({ shapeMeta, plan = [], cellCm = 33, height = 300, L = true, showCodes = true, showLegend = false, cardBg = '#fff' }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const local = shapeMeta?.local
  const poly = local?.points || null
  const bw = local?.w || 1, bh = local?.h || 1

  const grid = useMemo(
    () => (poly && plan.length) ? buildGrid(plan, bw, bh, cellCm, { polygon: poly }) : null,
    [poly, plan, bw, bh, cellCm]
  )
  const codeById = useMemo(() => grid ? new Map(grid.legend.map(l => [l.id, l])) : null, [grid])

  const draw = () => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const W = wrap.clientWidth, H = height
    canvas.width = W * DPR; canvas.height = H * DPR; canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, W, H)
    if (!poly) {
      ctx.fillStyle = MUTED; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Noch keine Fläche definiert', W / 2, H / 2)
      return
    }
    // Meter → px, formfüllend zentriert
    const pad = 16
    const s = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh)
    const ox = (W - bw * s) / 2, oy = (H - bh * s) / 2
    const P = (mx, my) => [ox + mx * s, oy + (bh - my) * s]  // y spiegeln (Nord oben)
    const cellM = cellCm / 100

    // Polygon-Pfad (für Fill-Hintergrund + Clip + Outline)
    const path = new Path2D()
    poly.forEach((pt, i) => { const [x, y] = P(pt[0], pt[1]); i ? path.lineTo(x, y) : path.moveTo(x, y) })
    path.closePath()

    // Beet-Hintergrund
    ctx.fillStyle = L ? '#eef4ea' : '#131c16'
    ctx.fill(path)

    // Bepflanzung als Blöcke (auf die Form geclippt)
    if (grid) {
      ctx.save(); ctx.clip(path)
      const cpx = cellM * s
      for (let idx = 0; idx < grid.cells.length; idx++) {
        if (!grid.inside[idx]) continue
        const col = idx % grid.cols, row = Math.floor(idx / grid.cols)
        const leg = grid.cells[idx] && codeById.get(grid.cells[idx])
        if (!leg) continue
        const [px, py] = P(col * cellM, (row + 1) * cellM) // obere-linke Ecke der Zelle (y gespiegelt)
        ctx.fillStyle = leg.farbe; ctx.globalAlpha = 0.92
        ctx.fillRect(px, py, cpx + 0.5, cpx + 0.5)
        ctx.globalAlpha = 1
        if (showCodes && cpx >= 15) {
          ctx.fillStyle = pickTextColor(leg.farbe)
          ctx.font = `bold ${Math.min(13, cpx * 0.5)}px monospace`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText(leg.code, px + cpx / 2, py + cpx / 2)
        }
      }
      ctx.restore()
    }

    // Umriss betont zeichnen
    ctx.lineWidth = 2.5
    ctx.strokeStyle = A
    ctx.stroke(path)
  }

  useEffect(draw, [grid, codeById, poly, bw, bh, L, height, showCodes])
  useEffect(() => { const r = () => draw(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }) // eslint-disable-line

  return (
    <div ref={wrapRef}>
      <canvas ref={canvasRef} style={{ width: '100%', display: 'block', borderRadius: 8 }} />
      {showLegend && grid && grid.legend.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {grid.legend.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, background: l.farbe, color: pickTextColor(l.farbe), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 10 }}>{l.code}</span>
              <span style={{ color: FG }}>{l.name}</span>
              <span style={{ color: MUTED }}>· {l.cells}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
