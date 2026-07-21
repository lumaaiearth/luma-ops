// Beet 3D (Polygon) — echte Low-Poly-3D-Ansicht des Pflanzplans.
// Jede Art wird als prozedural generiertes Habitus-Modell (plantMeshes.js) in
// realen Metern gerendert; ein InstancedMesh pro Art hält alle Individuen.
// Saison-Stepper + Jahr-Animation, freie Kamera (ziehen = orbit, Rad = Zoom),
// Bestäuber-Fokus (fremde Arten transparent), Tippen = Art bestimmen (Raycast).
// Wird lazy geladen, damit three.js nicht im Hauptbundle landet.
import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { A, A14, A20, BORDER, FG, MUTED, SURFACE } from '../lib/theme.js'
import { Download, Play, Pause, RotateCw, Wind } from 'lucide-react'
import {
  growthForMonth, hashStr, seededRand,
  MONTHS_FULL, SEASON_OF, POLLI_GROUPS,
} from '../lib/beetLayout.js'
import { speciesGeometry, makePlantMaterial } from '../lib/plantMeshes.js'
import { pointInPolygon } from '../lib/shapeMeta.js'

function pointInPoly(x, y, ring) { return pointInPolygon([x, y], ring) }
const CANVAS_H = 400

// Weicher Schlagschatten: einmalige Radial-Gradient-Textur + flache Scheibe.
// Pro Pflanze eine Instanz am Boden → billig, ohne Shadow-Map (mobilfreundlich).
let _shadowTex = null
function shadowTexture() {
  if (_shadowTex) return _shadowTex
  const s = 64
  const cv = document.createElement('canvas'); cv.width = cv.height = s
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.34)')
  g.addColorStop(0.5, 'rgba(0,0,0,0.16)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
  _shadowTex = new THREE.CanvasTexture(cv)
  return _shadowTex
}
const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2)
const prefersReducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Beet3DPoly({ placement: placementRaw, beetW, beetH, beetForm, polygon = null, L, shadow, cardBg }) {
  // Nur Pflanzen innerhalb der Freiform (Polygon in lokalen Metern 0..beetW/0..beetH)
  const placement = useMemo(
    () => polygon ? placementRaw.filter(p => pointInPoly(p.px, p.py, polygon)) : placementRaw,
    [placementRaw, polygon]
  )
  const wrapRef = useRef(null)
  const mountRef = useRef(null)
  const threeRef = useRef(null)   // { renderer, scene, camera, plantGroup, groundGroup, meshBySpecies }
  const camRef = useRef({ azimuth: -0.65, polar: 0.95, dist: 0 }) // dist 0 → auto
  const dragRef = useRef({ on: false, x: 0, y: 0, moved: 0 })
  const [month, setMonth] = useState(6)
  const [playing, setPlaying] = useState(false)
  const [group, setGroup] = useState('alle')
  const [sel, setSel] = useState(null)
  const [webglFail, setWebglFail] = useState(false)
  const [wind, setWind] = useState(!prefersReducedMotion)
  const uTimeRef = useRef({ value: 0 })
  const uWindRef = useRef({ value: prefersReducedMotion ? 0 : 1 })
  const rafRef = useRef(0)

  const arten = useMemo(() => {
    const seen = new Map()
    placement.forEach(p => { if (!seen.has(p.id)) seen.set(p.id, p) })
    return [...seen.values()]
  }, [placement])
  const bluehend = arten.filter(p => (p.bluete_monate || []).includes(month)).length
  const heimPct = arten.length ? Math.round(100 * arten.filter(p => p.heimisch).length / arten.length) : 0
  const groupArten = group === 'alle' ? arten.length : arten.filter(p => p[group]).length
  const groupBluehend = group === 'alle' ? bluehend : arten.filter(p => p[group] && (p.bluete_monate || []).includes(month)).length

  // ── Szene einmalig aufbauen ────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    } catch { setWebglFail(true); return }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.style.cursor = 'grab'
    renderer.domElement.style.borderRadius = '8px'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400)
    scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    const sun = new THREE.DirectionalLight(0xfff7e6, 1.6)
    sun.position.set(6, 10, 4)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdfeaff, 0.5)
    fill.position.set(-5, 6, -6)
    scene.add(fill)

    const plantGroup = new THREE.Group()
    const groundGroup = new THREE.Group()
    scene.add(groundGroup, plantGroup)

    threeRef.current = { renderer, scene, camera, plantGroup, groundGroup, meshBySpecies: new Map() }

    const onResize = () => sizeAndRender()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      const t = threeRef.current
      if (t) {
        t.plantGroup.traverse(o => { if (o.isMesh) { o.material.dispose() } })
        t.groundGroup.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose() } })
        t.renderer.dispose()
        t.renderer.domElement.remove()
        threeRef.current = null
      }
    }
  }, []) // eslint-disable-line

  function sizeAndRender() {
    const t = threeRef.current, mount = mountRef.current
    if (!t || !mount) return
    const w = mount.clientWidth || 300
    t.renderer.setSize(w, CANVAS_H, false)
    t.camera.aspect = w / CANVAS_H
    t.camera.updateProjectionMatrix()
    render()
  }
  function render() {
    const t = threeRef.current
    if (!t) return
    const { azimuth, polar } = camRef.current
    const dist = camRef.current.dist || Math.max(beetW, beetH * 1.6) * 1.25 + 2
    camRef.current.dist = dist
    const cy = 0.35
    t.camera.position.set(
      Math.sin(azimuth) * Math.sin(polar) * dist,
      Math.cos(polar) * dist + cy,
      Math.cos(azimuth) * Math.sin(polar) * dist,
    )
    t.camera.lookAt(0, cy, 0)
    t.renderer.render(t.scene, t.camera)
  }

  // ── Boden/Beetfläche (bei Theme-/Maßwechsel neu) ──────────────────────────
  useEffect(() => {
    const t = threeRef.current
    if (!t) return
    t.groundGroup.clear()
    // Beetfläche als EXAKTE Freiform (Polygon) — sonst Rechteck/Oval als Fallback.
    let bedGeo
    if (polygon && polygon.length >= 3) {
      const shape = new THREE.Shape()
      polygon.forEach((pt, i) => { const x = pt[0] - beetW / 2, y = pt[1] - beetH / 2; i ? shape.lineTo(x, y) : shape.moveTo(x, y) })
      bedGeo = new THREE.ShapeGeometry(shape)
      bedGeo.rotateX(Math.PI / 2)   // XY-Form → XZ-Boden (y→z), passt zur Platzierung
    } else if (beetForm === 'oval') {
      const shape = new THREE.Shape(); shape.absellipse(0, 0, beetW / 2, beetH / 2, 0, Math.PI * 2)
      bedGeo = new THREE.ShapeGeometry(shape, 40); bedGeo.rotateX(-Math.PI / 2)
    } else {
      bedGeo = new THREE.PlaneGeometry(beetW, beetH); bedGeo.rotateX(-Math.PI / 2)
    }
    const bed = new THREE.Mesh(bedGeo, new THREE.MeshLambertMaterial({ color: L ? 0xe7ded0 : 0x241d16, side: THREE.DoubleSide }))
    bed.position.y = 0.004
    t.groundGroup.add(bed)
    camRef.current.dist = 0 // Auto-Distanz neu bestimmen
    sizeAndRender()
  }, [beetW, beetH, beetForm, polygon, L]) // eslint-disable-line

  // ── Pflanzen-Instanzen (bei Plan-/Monatswechsel) ──────────────────────────
  useEffect(() => {
    const t = threeRef.current
    if (!t) return
    const growth = growthForMonth(month)
    const gxz = 0.55 + 0.45 * growth
    // Individuen je Art gruppieren
    const bySpecies = new Map()
    placement.forEach(p => {
      if (!bySpecies.has(p.id)) bySpecies.set(p.id, { sp: p, items: [] })
      bySpecies.get(p.id).items.push(p)
    })
    // Alte Meshes entsorgen (Geometrien sind gecacht, nur Material/Mesh weg)
    t.plantGroup.children.slice().forEach(m => { t.plantGroup.remove(m); m.material?.dispose(); m.dispose?.() })
    t.meshBySpecies.clear()
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    for (const { sp, items } of bySpecies.values()) {
      const geo = speciesGeometry(sp, month)
      const mat = makePlantMaterial(uTimeRef.current, uWindRef.current)
      const mesh = new THREE.InstancedMesh(geo, mat, items.length)
      items.forEach((p, i) => {
        const s = 0.85 + seededRand(p.seed ?? hashStr(p.id + i)) * 0.3
        pos.set(p.px - beetW / 2, 0, p.py - beetH / 2)
        q.setFromAxisAngle(up, seededRand((p.seed ?? 1) + 7) * Math.PI * 2)
        scl.set(s * gxz, s * growth, s * gxz)
        m4.compose(pos, q, scl)
        mesh.setMatrixAt(i, m4)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.userData.sp = sp
      t.plantGroup.add(mesh)
      t.meshBySpecies.set(sp.id, mesh)
    }
    // Weiche Bodenschatten unter jeder Pflanze (eine Instanz, wächst mit Saison)
    if (placement.length) {
      const shMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: L ? 0.55 : 0.4 })
      const shMesh = new THREE.InstancedMesh(shadowGeo, shMat, placement.length)
      placement.forEach((p, i) => {
        const spread = Math.max(0.14, (p.ausbreitung || p.pflanzabstand || 40) / 100)
        const rad = spread * (0.7 + 0.35 * growth)
        pos.set(p.px - beetW / 2, 0.006, p.py - beetH / 2)
        q.identity(); scl.set(rad, 1, rad)
        m4.compose(pos, q, scl)
        shMesh.setMatrixAt(i, m4)
      })
      shMesh.instanceMatrix.needsUpdate = true
      shMesh.renderOrder = -1
      t.plantGroup.add(shMesh)
    }
    applyFocusAndSelection()
    sizeAndRender()
  }, [placement, month, beetW, beetH]) // eslint-disable-line

  // ── Bestäuber-Fokus + Auswahl-Hervorhebung ────────────────────────────────
  function applyFocusAndSelection() {
    const t = threeRef.current
    if (!t) return
    for (const mesh of t.meshBySpecies.values()) {
      const sp = mesh.userData.sp
      const serves = group === 'alle' || sp[group]
      mesh.material.transparent = !serves
      mesh.material.opacity = serves ? 1 : 0.13
      mesh.material.emissive = new THREE.Color(sel && sel.id === sp.id ? (L ? 0x0a5c33 : 0x0e7a44) : 0x000000)
      mesh.material.emissiveIntensity = sel && sel.id === sp.id ? 0.45 : 0
      mesh.material.needsUpdate = true
    }
  }
  useEffect(() => { applyFocusAndSelection(); render() }, [group, sel, L]) // eslint-disable-line

  // ── Jahr-Animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    const iv = setInterval(() => setMonth(m => (m >= 10 ? 3 : m + 1)), 950)
    return () => clearInterval(iv)
  }, [playing])

  // ── Wind: sanfter Dauer-Loop (rAF), höhenabhängige Schwingung im Shader ───
  useEffect(() => {
    uWindRef.current.value = wind ? 1 : 0
    if (!wind) { cancelAnimationFrame(rafRef.current); render(); return }
    let start = null
    const tick = ts => {
      if (start == null) start = ts
      uTimeRef.current.value = (ts - start) / 1000
      render()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [wind]) // eslint-disable-line
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── Interaktion: Orbit, Zoom, Raycast-Pick ────────────────────────────────
  const onDown = e => {
    dragRef.current = { on: true, x: e.clientX, y: e.clientY, moved: 0 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    if (threeRef.current) threeRef.current.renderer.domElement.style.cursor = 'grabbing'
  }
  const onMove = e => {
    const d = dragRef.current
    if (!d.on) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy)
    camRef.current.azimuth -= dx * 0.006
    camRef.current.polar = Math.min(1.35, Math.max(0.35, camRef.current.polar - dy * 0.004))
    render()
  }
  const onUp = e => {
    const d = dragRef.current
    dragRef.current = { ...d, on: false }
    const t = threeRef.current
    if (t) t.renderer.domElement.style.cursor = 'grab'
    if (d.moved < 6 && t) {
      const r = t.renderer.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, t.camera)
      const hits = ray.intersectObjects([...t.meshBySpecies.values()], false)
      setSel(hits.length ? hits[0].object.userData.sp : null)
    }
  }
  const onWheel = e => {
    e.preventDefault()
    camRef.current.dist = Math.min(60, Math.max(1.5, camRef.current.dist * (e.deltaY > 0 ? 1.08 : 0.93)))
    render()
  }

  function exportPng() {
    const t = threeRef.current
    if (!t) return
    render()
    const a = document.createElement('a')
    a.href = t.renderer.domElement.toDataURL('image/png')
    a.download = `florales-3d-${MONTHS_FULL[month - 1].toLowerCase()}-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  const dots = v => '●'.repeat(v || 0) + '○'.repeat(5 - (v || 0))
  const btn = { border: `1px solid ${BORDER}`, background: L ? '#fff' : SURFACE, color: FG, borderRadius: 999, padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 500, minWidth: 34 }

  if (webglFail) {
    return (
      <div style={{ background: cardBg, borderRadius: 12, padding: 24, boxShadow: shadow, marginBottom: 16, color: MUTED, fontSize: 13 }}>
        3D-Ansicht nicht verfügbar (WebGL fehlt auf diesem Gerät). Bitte Rasterplan oder Drift-Karte nutzen.
      </div>
    )
  }

  return (
    <div style={{ background: cardBg, borderRadius: 12, padding: 16, boxShadow: shadow, marginBottom: 16 }} ref={wrapRef}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: L ? 700 : 400 }}>
        🌿 3D-Jahresansicht — {beetW}m × {beetH}m · ziehen = drehen/neigen · tippen = Art
      </div>
      {/* Kennzahlen */}
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
      {/* Bestäuber-Fokus */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 700, marginRight: 2 }}>Bestäuber-Fokus:</span>
        {[{ key: 'alle', label: 'Alle', emoji: '🌍' }, ...POLLI_GROUPS].map(g => {
          const has = g.key === 'alle' || arten.some(p => p[g.key])
          return (
            <button key={g.key} disabled={!has} onClick={() => setGroup(g.key)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, fontSize: 11,
              cursor: has ? 'pointer' : 'not-allowed', opacity: has ? 1 : 0.35, fontWeight: group === g.key ? 700 : 400,
              border: group === g.key ? `1.5px solid ${A}` : `1px solid ${BORDER}`,
              background: group === g.key ? A14 : 'transparent', color: group === g.key ? A : MUTED,
            }}>{g.emoji} {g.label}</button>
          )
        })}
      </div>
      {group !== 'alle' && groupArten > 0 && groupBluehend === 0 && (
        <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8, background: 'rgba(220,38,38,0.08)', borderRadius: 6, padding: '6px 10px' }}>
          ⚠️ Im {MONTHS_FULL[month - 1]} blüht nichts für {POLLI_GROUPS.find(g => g.key === group)?.label}. Blühlücke — passende Art ergänzen.
        </div>
      )}
      {/* 3D-Viewport */}
      <div style={{ position: 'relative', height: CANVAS_H }}>
        <div ref={mountRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel}
          style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden', background: L ? 'linear-gradient(180deg,#f4f7f0 0%,#eef2e8 100%)' : 'linear-gradient(180deg,#0c1410 0%,#0a110d 100%)' }} />
        {sel && (
          <div style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: 280, background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px', boxShadow: shadow }}>
            <button onClick={() => setSel(null)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 0, color: MUTED, cursor: 'pointer', fontSize: 14 }}>✕</button>
            <div style={{ fontStyle: 'italic', fontFamily: 'Charter, Georgia, serif', fontSize: 14, color: FG }}>{sel.latin}</div>
            <div style={{ fontWeight: 700, color: FG, marginBottom: 4 }}>{sel.name}</div>
            <div style={{ fontSize: 11, color: MUTED }}>
              Blüte {MONTHS_FULL[(sel.bluete_monate?.[0] || 1) - 1]}–{MONTHS_FULL[(sel.bluete_monate?.[sel.bluete_monate.length - 1] || 1) - 1]} · Höhe bis {sel.hoehe?.[1] ?? '?'} cm · Ø {sel.ausbreitung || sel.pflanzabstand || '?'} cm<br />
              Nektar <span style={{ color: A }}>{dots(sel.nektar)}</span> · Pollen <span style={{ color: A }}>{dots(sel.pollen)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, border: `1px solid ${A}`, color: A, borderRadius: 6, padding: '1px 6px' }}>{sel.heimisch ? 'heimisch' : 'Zierstaude'}</span>
              {sel.raupenfutter_arten?.length ? <span style={{ fontSize: 10, border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '1px 6px' }}>Raupenfutter: {sel.raupenfutter_arten[0]}</span> : null}
            </div>
          </div>
        )}
      </div>
      {/* Steuerung */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: L ? A14 : 'rgba(255,255,255,0.04)', borderRadius: 999, padding: '2px 4px' }}>
          <button onClick={() => setMonth(m => Math.max(3, m - 1))} style={btn} aria-label="Früher">‹</button>
          <span style={{ minWidth: 132, textAlign: 'center', fontSize: 12, fontWeight: 700, color: FG, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {SEASON_OF(month)}<br /><span style={{ fontWeight: 400, color: MUTED, textTransform: 'none', fontSize: 11 }}>{MONTHS_FULL[month - 1]}</span>
          </span>
          <button onClick={() => setMonth(m => Math.min(10, m + 1))} style={btn} aria-label="Später">›</button>
        </div>
        <button onClick={() => setPlaying(p => !p)} style={{ ...btn, background: A, color: 'var(--luma-on-a, #fff)', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontWeight: 600, border: 'none' }}>
          {playing ? <Pause size={13} /> : <Play size={13} />} Jahr
        </button>
        <button onClick={() => setWind(w => !w)} title="Sanften Wind an/aus" style={{ ...btn, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', color: wind ? A : MUTED, borderColor: wind ? A : BORDER, fontWeight: wind ? 700 : 500 }}>
          <Wind size={13} /> Wind
        </button>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => { camRef.current.dist = Math.min(60, camRef.current.dist * 1.15); render() }} style={btn} aria-label="Kleiner">−</button>
          <button onClick={() => { camRef.current.dist = Math.max(1.5, camRef.current.dist * 0.87); render() }} style={btn} aria-label="Größer">+</button>
          <button onClick={() => { camRef.current = { azimuth: -0.65, polar: 0.95, dist: 0 }; render() }} style={btn} aria-label="Ansicht zurücksetzen"><RotateCw size={13} /></button>
          <button onClick={exportPng} style={{ ...btn, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px' }}><Download size={12} /> PNG</button>
        </div>
      </div>
    </div>
  )
}
