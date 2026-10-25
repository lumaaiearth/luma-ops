// ─────────────────────────────────────────────────────────────────────────────
// Zeitvergleich zweier Befliegungen (K14)
//
// Zwei Luftbilder/Orthomosaike übereinander, ein senkrechter Schieber teilt
// die Karte: links „vorher“, rechts „nachher“. Jede Ebene wird per CSS
// clip-path beschnitten — in Layer-Koordinaten, weil die Ebenen im Map-Pane
// liegen, das beim Schwenken verschoben wird.
// Geprüft mit scripts/test-vergleich.mjs
// ─────────────────────────────────────────────────────────────────────────────

const r = v => Math.round(v * 10) / 10

/**
 * clip-path-Polygone für die beiden Seiten.
 * @param {{x:number,y:number}} nw  Layer-Punkt der linken oberen Kartenecke
 * @param {{x:number,y:number}} groesse  Kartengröße in px
 * @param {number} anteil  Lage des Schiebers, 0 = ganz links, 1 = ganz rechts
 */
export function clipPolygone(nw, groesse, anteil) {
  const a = Math.min(1, Math.max(0, Number.isFinite(anteil) ? anteil : 0.5))
  const x0 = r(nw.x), y0 = r(nw.y), x1 = r(nw.x + groesse.x), y1 = r(nw.y + groesse.y)
  const xs = r(nw.x + groesse.x * a)
  const poly = (l, rr) => `polygon(${l}px ${y0}px, ${rr}px ${y0}px, ${rr}px ${y1}px, ${l}px ${y1}px)`
  return { links: poly(x0, xs), rechts: poly(xs, x1) }
}

const LUFTBILD = new Set(['drone_image', 'ortho_tiles'])
export const aufnahmeDatum = f => f.properties?.aufnahme_datum || f.created_at || null

/**
 * Luftbilder, die sich vergleichen lassen — nach Aufnahmedatum, älteste zuerst.
 * Vorschlag: die beiden jüngsten Aufnahmen des Projekts mit den meisten Bildern.
 */
export function vergleichsKandidaten(features) {
  const liste = features
    .filter(f => LUFTBILD.has(f.feature_type) && f.geometry && (f.properties?.image_url || f.properties?.tiles_url))
    .sort((a, b) => String(aufnahmeDatum(a)).localeCompare(String(aufnahmeDatum(b))))
  const jeProjekt = new Map()
  for (const f of liste) jeProjekt.set(f.project_id, [...(jeProjekt.get(f.project_id) || []), f])
  const groesste = [...jeProjekt.values()].sort((a, b) => b.length - a.length)[0] || []
  const vorschlag = groesste.length >= 2 ? { a: groesste.at(-2).id, b: groesste.at(-1).id } : null
  return { liste, vorschlag }
}
