// ────────────────────────────────────────────────────────────────
// Diagramm-Farben
//
// Die Kunden- und Einsatzart-Farben aus seed.js sind für den Kalender
// gewählt, nicht für Diagramme: nebeneinanderliegende Serien lassen sich
// bei Farbenblindheit teils nicht trennen. Diagramme benutzen deshalb eine
// eigene, geprüfte Palette.
//
// Geprüft mit dem Validator der dataviz-Vorgabe gegen die echten LUMA-
// Flächen (hell #ffffff, dunkel #0e1c26), je Modus eigene Stufen:
//   hell    schlechtestes Nachbarpaar ΔE 9.1 (Protanopie), Normalsicht 19.6
//   dunkel  schlechtestes Nachbarpaar ΔE 8.4 (Protanopie), Normalsicht 19.3
// Im hellen Modus liegen Aqua, Gelb und Magenta unter 3:1 Kontrast — deshalb
// hat jedes Diagramm eine Tabellenansicht, über die jeder Wert auch ohne
// Farbunterscheidung lesbar ist.
//
// Reihenfolge nicht ändern: sie IST der Schutzmechanismus. Neue Serien nie
// durch zusätzliche Farbtöne ergänzen — der Rest wandert in „Andere".
// ────────────────────────────────────────────────────────────────

const SERIES_LIGHT = [
  '#2a78d6', // 1 blau
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 gelb
  '#e87ba4', // 5 magenta
  '#008300', // 6 grün
  '#4a3aa7', // 7 violett
  '#e34948', // 8 rot
]

const SERIES_DARK = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
]

/** Sammelfarbe für den Rest jenseits der acht Plätze — bewusst neutral. */
export const REST_COLOR_LIGHT = '#8a8f94'
export const REST_COLOR_DARK  = '#6f7a82'

export const REST_ID = '__rest__'
export const REST_LABEL = 'Andere'

export function seriesPalette(isLight) {
  return isLight ? SERIES_LIGHT : SERIES_DARK
}

export function restColor(isLight) {
  return isLight ? REST_COLOR_LIGHT : REST_COLOR_DARK
}

/**
 * Feste Farbzuordnung über die VOLLSTÄNDIGE Domäne.
 *
 * Wichtig: Die Farbe hängt an der Entität, nicht an ihrem Rang im aktuell
 * gefilterten Bild. Sonst bekäme „JOPE" beim Filtern plötzlich die Farbe von
 * „BEW", und wer sich eine Farbe gemerkt hat, liest das Diagramm falsch.
 *
 * @param domainIds  alle möglichen Ids in stabiler Reihenfolge
 * @returns Map<id, hex> — Ids ab Platz 9 bekommen die neutrale Sammelfarbe
 */
export function makeColorScale(domainIds, isLight) {
  const palette = seriesPalette(isLight)
  const rest = restColor(isLight)
  const scale = new Map()
  domainIds.forEach((id, i) => scale.set(id, i < palette.length ? palette[i] : rest))
  scale.set(REST_ID, rest)
  return scale
}

/** Achsen, Gitter und Beschriftung — Diagrammrahmen tritt zurück. */
export const CHART_INK = {
  grid: 'var(--luma-border)',
  axis: 'var(--luma-muted)',
  surface: 'var(--luma-surface)',
}

/** Deutsche Zahlformatierung; Stunden mit einer Nachkommastelle wenn nötig. */
export function formatValue(v, unit) {
  if (v == null || Number.isNaN(v)) return '–'
  const n = unit === 'h'
    ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 })
    : v.toLocaleString('de-DE')
  return unit === 'h' ? `${n} h` : n
}
