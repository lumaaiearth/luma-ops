// ─────────────────────────────────────────────────────────────────────────────
// Kartenstatus für die BIOME-Statusleiste
//
// Die Statusleiste nannte in der Kartenansicht nur Standort und Stichtag des
// Datenkerns — nicht, was die Karte gerade zeigt. Die Karte meldet hier
// Grundkarte, Overlays, Maßstab und Cursorposition; die Leiste liest per
// useSyncExternalStore. Eigener kleiner Speicher statt Prop/State, weil die
// Cursorposition bei jeder Mausbewegung wechselt und sonst die ganze Seite
// neu zeichnen würde.
// Geprüft mit scripts/test-karten-status.mjs
// ─────────────────────────────────────────────────────────────────────────────

const LEER = { aktiv: false, grundkarte: null, overlays: [], zoom: null, mitte: null, cursor: null }
let stand = LEER
const hoerer = new Set()

export function kartenStatusLesen() { return stand }

export function kartenStatusAbo(fn) {
  hoerer.add(fn)
  return () => hoerer.delete(fn)
}

export function kartenStatusSetzen(teil) {
  const neu = teil === null ? LEER : { ...stand, ...teil, aktiv: true }
  if (teil !== null && Object.keys(teil).every(k => stand[k] === teil[k]) && stand.aktiv) return
  stand = neu
  hoerer.forEach(fn => fn())
}

// Maßstabszahl bei Web-Mercator-Kacheln (256 px) und 96 dpi, gerundet auf
// eine „runde“ Zahl — die Anzeige ist eine Orientierung, kein Messwert.
export function massstab(zoom, lat) {
  if (!Number.isFinite(zoom) || !Number.isFinite(lat)) return null
  const mProPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / 2 ** zoom
  const zahl = mProPixel * 96 / 0.0254
  const stelle = 10 ** Math.floor(Math.log10(zahl))
  const gerundet = Math.round(zahl / stelle * 2) / 2 * stelle
  return `1:${Math.round(gerundet).toLocaleString('de-DE')}`
}

export const koordinateKurz = c => c ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : null
