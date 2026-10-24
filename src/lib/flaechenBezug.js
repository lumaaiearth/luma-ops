// ─────────────────────────────────────────────────────────────────────────────
// Bezug zwischen Beeten und Projektflächen — aus der Lage abgeleitet
//
// Kein gespeicherter Verweis: wird eine Fläche verschoben, stimmt der Bezug
// sofort wieder. Für ein Beet: liegt es in einer Projektfläche seines
// Projekts (ganz, teilweise, gar nicht)? Für eine Projektfläche: welche Beete
// liegen darin, wie viel ist bepflanzt?
// Näherung: ein Beet gilt als „ganz innen“, wenn alle Eckpunkte innen liegen.
// Geprüft mit scripts/test-flaechenbezug.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { outerRing, pointInPolygon } from './shapeMeta.js'
import { geomMeasures } from './geo.js'

const istFlaeche = f => f.feature_type === 'area' && outerRing(f.geometry)
const istBeet = f => f.feature_type === 'bed' && outerRing(f.geometry)

function lageIn(beet, flaeche) {
  const ring = outerRing(flaeche.geometry)
  const ecken = outerRing(beet.geometry).slice(0, -1)
  const innen = ecken.filter(p => pointInPolygon(p, ring)).length
  return innen === ecken.length ? 'innen' : innen > 0 ? 'teilweise' : 'aussen'
}

/**
 * @returns {{ status: 'innen'|'teilweise'|'aussen'|'keine_projektflaeche', flaeche?: object } | null}
 */
export function bezugDesBeets(beet, features) {
  if (!istBeet(beet)) return null
  const flaechen = features.filter(f => istFlaeche(f) && f.project_id === beet.project_id)
  if (!flaechen.length) return { status: 'keine_projektflaeche' }
  const rang = { innen: 0, teilweise: 1, aussen: 2 }
  const best = flaechen.map(f => ({ flaeche: f, status: lageIn(beet, f) })).sort((a, b) => rang[a.status] - rang[b.status])[0]
  return best
}

/**
 * @returns {{ beete: object[], beetM2: number, flaecheM2: number, anteil: number, teilweise: number } | null}
 */
export function beeteInFlaeche(flaeche, features) {
  if (!istFlaeche(flaeche)) return null
  const beete = features.filter(f => istBeet(f) && f.project_id === flaeche.project_id)
    .map(b => ({ b, lage: lageIn(b, flaeche) }))
    .filter(x => x.lage !== 'aussen')
  const beetM2 = beete.reduce((s, x) => s + (geomMeasures(x.b.geometry)?.area_m2 || 0), 0)
  const flaecheM2 = geomMeasures(flaeche.geometry)?.area_m2 || 0
  return {
    beete: beete.map(x => x.b), beetM2, flaecheM2,
    anteil: flaecheM2 > 0 ? beetM2 / flaecheM2 : 0,
    teilweise: beete.filter(x => x.lage === 'teilweise').length,
  }
}
