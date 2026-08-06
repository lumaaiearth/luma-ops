// Beispielbilder für Features ohne eigene Fotos: generierte SVG-Data-URIs,
// kein Netzwerk nötig. Werden ersetzt, sobald echte Fotos hochgeladen sind.

const THEMES = {
  tree:  [['#14532d', '#22c55e', '🌳'], ['#166534', '#4ade80', '🍃'], ['#3f6212', '#a3e635', '🌿']],
  bed:   [['#3f6212', '#a3e635', '🌿'], ['#713f12', '#f59e0b', '🌼'], ['#14532d', '#22c55e', '🦋']],
  area:  [['#0c4a6e', '#60a5fa', '📐'], ['#14532d', '#22c55e', '🛰️']],
  point: [['#78350f', '#f59e0b', '📍']],
  line:  [['#4c1d95', '#c084fc', '〰️']],
}

function svgDataUri([from, to, emoji], label, idx, hinweis = 'Beispielbild — eigenes Foto hochladen') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="640" height="480" fill="url(#g)"/>
  <circle cx="${140 + idx * 60}" cy="150" r="90" fill="rgba(255,255,255,0.08)"/>
  <circle cx="500" cy="360" r="130" fill="rgba(0,0,0,0.12)"/>
  <text x="320" y="240" font-size="110" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="320" y="340" font-size="26" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="sans-serif">${label}</text>
  <text x="320" y="374" font-size="17" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="sans-serif">${hinweis}</text>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

// Liefert 1–3 Beispielbilder passend zum Feature-Typ.
export function examplePhotos(feature) {
  const themes = THEMES[feature?.feature_type] || THEMES.point
  const label = (feature?.label || '').slice(0, 40) || 'LUMA BIOME'
  return themes.map((t, i) => ({ id: `example-${feature?.id || 'x'}-${i}`, url: svgDataUri(t, label, i), example: true }))
}

// Platzhalter für eine Pflegefläche im Kundenportal, solange noch keine
// echten Einsatzfotos vorliegen.
//
// Bewusst KEINE Fotomotive, sondern erkennbar generierte Kacheln mit dem
// Hinweis „Fotodokumentation folgt“: Der Leistungsnachweis belegt erbrachte
// Arbeit — ein bildhafter Platzhalter, der wie ein echtes Foto aussieht,
// wäre in diesem Zusammenhang ein falscher Beleg.
const PFLEGE_THEMES = [
  ['#14532d', '#22c55e', '🌿'],
  ['#3f6212', '#a3e635', '✂️'],
  ['#166534', '#4ade80', '🌳'],
]

// Eigenes, kompaktes Format: Die Kacheln werden als 104-px-Thumbnails
// gezeigt. Der große Text der Beispielbilder oben wäre dabei auf ~4 px
// herunterskaliert und damit unlesbar — hier trägt das Symbol, die
// Erklärung steht als Bildunterschrift daneben.
function platzhalterSvg([from, to, emoji], idx) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="208" height="156" viewBox="0 0 208 156">
  <defs><linearGradient id="g${idx}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="208" height="156" fill="url(#g${idx})"/>
  <circle cx="${40 + idx * 26}" cy="42" r="34" fill="rgba(255,255,255,0.07)"/>
  <circle cx="168" cy="126" r="46" fill="rgba(0,0,0,0.12)"/>
  <text x="104" y="82" font-size="52" text-anchor="middle" dominant-baseline="middle" opacity="0.9">${emoji}</text>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export function beispielFotosFlaeche(anzahl = 3) {
  const n = Math.max(1, Math.min(anzahl, PFLEGE_THEMES.length))
  return PFLEGE_THEMES.slice(0, n).map((t, i) => ({
    id: `platzhalter-${i}`,
    url: platzhalterSvg(t, i),
    platzhalter: true,
  }))
}
