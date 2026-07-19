// Beet-Layout — gemeinsame, deterministische Platzierungs- und Rasterlogik für
// alle Pflanzplan-Ansichten (Drift-Karte, isometrisches 3D-Jahr, Rasterplan).
// Kein Zufall: alle Zufallszahlen sind seeded → reproduzierbare Pläne.

export function hashStr(s) {
  let h = 2166136261; const t = String(s)
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function seededRand(seed) {
  let t = (seed >>> 0) + 0x6D2B79F5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
function mulberry(seed) {
  let a = seed >>> 0
  return () => { a += 0x6D2B79F5; let r = Math.imul(a ^ (a >>> 15), a | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }
}

// ── Archetyp: bestimmt, wie eine Art in der 3D-Ansicht gemalt wird ──────────
// Aus vorhandenen Feldern abgeleitet (kein Pflegeaufwand in plants.js nötig).
// Reihenfolge = Priorität.
const ARCHE_BY_LATIN = [
  [/^(salvia|nepeta|agastache|lavandula|veronica|stachys|prunella|verbena|lythrum|digitalis|linaria|veronicastrum|liatris)/i, 'aehre'],
  [/^(achillea|angelica|foeniculum|daucus|pimpinella|eupatorium|sambucus|aegopodium|anthriscus|heracleum|sedum)/i, 'dolde'],
  [/^(echinacea|rudbeckia|helianthus|helenium|leucanthemum|anthemis|cosmos|calendula|tagetes|centaurea|cichorium|inula|buphthalmum|coreopsis|aster|symphyotrichum|solidago|bellis|matricaria|tanacetum|arnica|doronicum|gaillardia)/i, 'korb'],
  [/^(campanula|aquilegia|geranium|malva|geum|potentilla|helianthemum)/i, 'glocke'],
  [/^(thymus|sedum|sempervivum|dianthus|saponaria|antennaria|ajuga|glechoma|waldsteinia)/i, 'decker'],
]
export function deriveArchetype(p) {
  if (!p) return 'staude'
  if (p.type === 'baum') return 'baum'
  if (p.type === 'strauch') return 'strauch'
  if (p.type === 'gras' || p.wuchsform === 'horstig') return 'gras'
  if (p.funktion === 'Zw') return 'geophyt'
  const wf = p.wuchsform
  if (wf === 'kriechend' || wf === 'polster' || wf === 'hängend') return 'decker'
  const latin = p.latin || ''
  for (const [re, a] of ARCHE_BY_LATIN) if (re.test(latin)) return a
  const h = p.hoehe?.[1] ?? 50
  if (h < 20) return 'decker'
  return 'aehre' // sinnvolle Standard-Krautform
}

// ── Strukturelle Rolle (Höhenschichtung + Mengenlogik) ──────────────────────
export function plantRole(p) {
  const h = p.hoehe?.[1] ?? 50
  if (p.type === 'baum') return 'baum'
  if (p.type === 'strauch') return 'strauch'
  if (p.funktion === 'Zw') return 'geophyt'
  if (p.type === 'gras') return 'gras'
  if (p.funktion === 'Ge' || h >= 120) return 'geruest'
  if (p.funktion === 'Bo' || p.wuchsform === 'kriechend' || p.wuchsform === 'polster' || h < 25) return 'bodendecker'
  if (h >= 60) return 'begleit'
  return 'fuell'
}

// ── Kontinuierliche Platzierung (Drifts, Höhenstaffelung, Kollisionsschutz) ──
// px/py in Metern; _r = Radius (halbe Ausbreitung) in Metern. Von Drift-Karte
// UND isometrischer Ansicht genutzt → 2D-Plan und 3D zeigen dasselbe Beet.
export function computePlacement(plan, beetW, beetH) {
  const margin = Math.min(0.15, beetW * 0.03, beetH * 0.03)
  const heights = plan.map(p => p.hoehe?.[1] ?? 50)
  const hMin = Math.min(...heights, 20), hMax = Math.max(...heights, 100), hSpan = Math.max(1, hMax - hMin)
  const gap = 1.05
  const items = []
  plan.forEach(plant => {
    const r = Math.max(0.05, (plant.ausbreitung || plant.pflanzabstand || 40) / 100 / 2)
    const h = plant.hoehe?.[1] ?? 50
    for (let i = 0; i < (plant.count || 0); i++) {
      items.push({ plant, r, h, seed: (hashStr(plant.id) + items.length * 0x9E3779B1) >>> 0 })
    }
  })
  items.sort((a, b) => b.r - a.r)
  const placed = []
  for (const it of items) {
    const tallNorm = (it.h - hMin) / hSpan
    const bandCy = margin + it.r + Math.max(0.01, beetH - 2 * margin - 2 * it.r) * (0.12 + (1 - tallNorm) * 0.72)
    let best = { px: beetW / 2, py: bandCy }, bestScore = -Infinity
    for (let t = 0; t < 18; t++) {
      const s = (it.seed + t * 101) >>> 0
      const cx = margin + it.r + seededRand(s) * Math.max(0.01, beetW - 2 * margin - 2 * it.r)
      const cy = margin + it.r + seededRand(s + 1) * Math.max(0.01, beetH - 2 * margin - 2 * it.r)
      let minClear = Infinity, sameNear = 0
      for (const q of placed) {
        const d = Math.hypot(q.px - cx, q.py - cy)
        minClear = Math.min(minClear, d - (q._r + it.r) * gap)
        if (q.id === it.plant.id) sameNear = Math.max(sameNear, 1 / (1 + d * 5))
      }
      const score = (minClear >= 0 ? 60 : minClear * 30) + sameNear * 10 - Math.abs(cy - bandCy) * 7 + seededRand(s + 2) * 0.3
      if (score > bestScore) { bestScore = score; best = { px: cx, py: cy } }
    }
    placed.push({ ...it.plant, px: best.px, py: best.py, _r: it.r, seed: it.seed })
  }
  placed.sort((a, b) => a.py - b.py) // hinten (oben) zuerst → Höhenschichtung
  return placed
}

// ── Rasterplan (Pflanzanleitung mit Vierecken, wie Pollinator Pathmaker) ─────
// Teilt das Beet in gleich große Zellen und weist jede Zelle einer Art zu.
// Zellzahl je Art ∝ Stückzahl im Plan; Arten clustern zu Drifts (Voronoi mit
// Kapazität). Ergebnis: druckbare „Pflanze Art X in Zelle (Spalte,Reihe)"-Karte.
export function buildGrid(plan, beetW, beetH, cellCm) {
  const cols = Math.max(1, Math.round(beetW * 100 / cellCm))
  const rows = Math.max(1, Math.round(beetH * 100 / cellCm))
  const nCells = cols * rows
  const species = plan.filter(p => (p.count || 0) > 0)
  const cells = new Array(nCells).fill(null)
  if (!species.length) return { cols, rows, cellCm, cells, legend: [] }

  // Zielzahl Zellen je Art (∝ count), Summe = nCells (Rest größte Reste zuerst).
  const totalCount = species.reduce((s, p) => s + p.count, 0) || 1
  const quota = species.map(p => ({ p, exact: p.count / totalCount * nCells }))
  quota.forEach(q => { q.n = Math.floor(q.exact) })
  let rest = nCells - quota.reduce((s, q) => s + q.n, 0)
  quota.sort((a, b) => (b.exact - b.n) - (a.exact - a.n))
  for (let i = 0; i < rest; i++) quota[i % quota.length].n++
  quota.sort((a, b) => b.p.count - a.p.count)

  // Drift-Zentren je Art (seeded) — mehr Cluster für häufige/kleine Arten.
  const rnd = mulberry(hashStr('raster|' + species.map(s => s.id).join(',') + '|' + cols + 'x' + rows))
  const centers = new Map()
  quota.forEach(({ p, n }) => {
    const k = Math.max(1, Math.min(6, Math.round(Math.sqrt(n) / 1.6)))
    centers.set(p.id, Array.from({ length: k }, () => [rnd() * cols, rnd() * rows]))
  })

  // Greedy: (Zelle, Art)-Paare nach Distanz zum nächsten eigenen Cluster sortiert;
  // Zelle der nächstbesten Art mit freiem Kontingent zuweisen → kompakte Drifts.
  const remaining = new Map(quota.map(q => [q.p.id, q.n]))
  const pairs = []
  for (let idx = 0; idx < nCells; idx++) {
    const cx = idx % cols + 0.5, cy = Math.floor(idx / cols) + 0.5
    for (const { p } of quota) {
      let d = Infinity
      for (const [ccx, ccy] of centers.get(p.id)) d = Math.min(d, Math.hypot(ccx - cx, ccy - cy))
      pairs.push({ idx, id: p.id, d: d + rnd() * 0.35 })
    }
  }
  pairs.sort((a, b) => a.d - b.d)
  let filled = 0
  for (const pr of pairs) {
    if (filled >= nCells) break
    if (cells[pr.idx] !== null) continue
    if ((remaining.get(pr.id) || 0) <= 0) continue
    cells[pr.idx] = pr.id
    remaining.set(pr.id, remaining.get(pr.id) - 1)
    filled++
  }

  const legend = quota.map(({ p, n }, i) => ({
    id: p.id, name: p.name, latin: p.latin, farbe: p.bluete_farbe || '#10b981',
    code: gridCode(i), cells: n, heimisch: p.heimisch, pflanzabstand: p.pflanzabstand || 40,
  }))
  return { cols, rows, cellCm, cells, legend }
}
export function gridCode(i) {
  // A, B, … Z, AA, AB …
  let s = '', n = i
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

// ── Geteilte UI-Konstanten der Beet-Ansichten ────────────────────────────────
export const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
export const SEASON_OF = m => m <= 4 ? 'Frühling' : m === 5 ? 'Spätfrühling' : m === 6 ? 'Frühsommer' : m <= 8 ? 'Hochsommer' : m === 9 ? 'Spätsommer' : 'Herbst'
// Bestäubergruppen — Datengrundlage sind die bool-Felder je Art in plants.js.
export const POLLI_GROUPS = [
  { key: 'bienen', label: 'Wildbienen', emoji: '🐝' },
  { key: 'tagfalter', label: 'Tagfalter', emoji: '🦋' },
  { key: 'nachtfalter', label: 'Nachtfalter', emoji: '🌙' },
  { key: 'kaefer', label: 'Käfer', emoji: '🪲' },
  { key: 'voegel', label: 'Vögel', emoji: '🐦' },
]

// ── Saison-/Wachstumszustand für die isometrische Ansicht ───────────────────
export function stateForMonth(p, month) {
  const mm = p.bluete_monate || []
  if (mm.includes(month)) return 'bloom'
  if (mm.length && month > mm[mm.length - 1]) return 'seed'
  return 'green'
}
// Wuchsfaktor über das Gartenjahr (März klein → Hochsommer voll → Herbst).
export function growthForMonth(month) {
  return month <= 3 ? 0.35 : month === 4 ? 0.55 : month === 5 ? 0.78 : month <= 8 ? 1 : month === 9 ? 0.95 : 0.85
}
export function growthBucket(month) {
  return month <= 3 ? 'a' : month === 4 ? 'b' : month === 5 ? 'c' : month <= 8 ? 'd' : month === 9 ? 'e' : 'f'
}
