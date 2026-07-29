// Inverse-Distance-Weighting: aus einzelnen Messpunkten eine Fläche schätzen.
//
// Ein Kunde sieht im Dashboard bisher nur Punkte. Die Frage ist aber fast immer
// „wie sieht es DAZWISCHEN aus" — welcher Teil des Parks trocknet zuerst aus.
// IDW ist dafür das ehrlichste einfache Verfahren: der geschätzte Wert einer
// Zelle ist der mit 1/d^p gewichtete Mittelwert der umliegenden Messungen. Es
// erfindet keine Extremwerte (das Ergebnis bleibt immer zwischen dem kleinsten
// und größten Messwert) und trifft die Messpunkte exakt.
//
// Grenzen, die die Oberfläche benennen muss: IDW ist eine Schätzung, keine
// Messung. Ohne Messpunkt in der Nähe wird nichts gezeichnet (`maxDistM`) —
// lieber eine Lücke als eine erfundene Fläche.

const R_ERDE = 6371000

/** Meter pro Grad Länge/Breite auf der Bezugsbreite — für kleine Gebiete genau genug. */
function meterProGrad(lat) {
  const rad = (lat * Math.PI) / 180
  return {
    lat: (Math.PI / 180) * R_ERDE,
    lng: (Math.PI / 180) * R_ERDE * Math.cos(rad),
  }
}

/**
 * Rechnet ein IDW-Raster über die Bounding-Box.
 *
 * @param punkte    [{lat, lng, value}] — Werte ohne Zahl werden ignoriert
 * @param bbox      [south, west, north, east]
 * @param breite    Rasterspalten (Default 140)
 * @param hoehe     Rasterzeilen (Default 100)
 * @param potenz    Distanzexponent p (Default 2 — Standard für Umweltdaten)
 * @param maxDistM  Zellen ohne Messpunkt in diesem Umkreis bleiben leer
 * @param maske     optional (lng, lat) => boolean; false = Zelle bleibt leer
 * @returns {{werte: Float32Array, breite, hoehe, bbox, min, max, gefuellt}}
 *          `werte` enthält NaN für leere Zellen.
 */
export function idwRaster({ punkte, bbox, breite = 140, hoehe = 100, potenz = 2, maxDistM = 600, maske }) {
  const nutz = (punkte || []).filter(p => Number.isFinite(p?.value) && Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
  const werte = new Float32Array(breite * hoehe).fill(NaN)
  if (!nutz.length || !bbox) return { werte, breite, hoehe, bbox, min: null, max: null, gefuellt: 0 }

  const [south, west, north, east] = bbox
  const mpg = meterProGrad((south + north) / 2)
  const maxD2 = maxDistM * maxDistM

  // Punkte einmalig in ein lokales Meter-System legen — spart pro Zelle
  // die trigonometrische Umrechnung.
  const px = nutz.map(p => ({ x: (p.lng - west) * mpg.lng, y: (p.lat - south) * mpg.lat, v: p.value }))

  let min = Infinity, max = -Infinity, gefuellt = 0
  for (let iy = 0; iy < hoehe; iy++) {
    // Zellmittelpunkt; Zeile 0 ist oben (Norden), passend zum Canvas.
    const lat = north - ((iy + 0.5) / hoehe) * (north - south)
    const y = (lat - south) * mpg.lat
    for (let ix = 0; ix < breite; ix++) {
      const lng = west + ((ix + 0.5) / breite) * (east - west)
      if (maske && !maske(lng, lat)) continue
      const x = (lng - west) * mpg.lng

      let sw = 0, sv = 0, treffer = false, exakt = null
      for (const p of px) {
        const dx = x - p.x, dy = y - p.y
        const d2 = dx * dx + dy * dy
        if (d2 > maxD2) continue
        treffer = true
        if (d2 < 1) { exakt = p.v; break }          // < 1 m: Messwert direkt übernehmen
        const w = 1 / Math.pow(d2, potenz / 2)
        sw += w
        sv += w * p.v
      }
      if (!treffer) continue
      const v = exakt != null ? exakt : sv / sw
      werte[iy * breite + ix] = v
      if (v < min) min = v
      if (v > max) max = v
      gefuellt++
    }
  }
  return { werte, breite, hoehe, bbox, min: gefuellt ? min : null, max: gefuellt ? max : null, gefuellt }
}

/**
 * Malt ein Raster als PNG-DataURL (transparent, wo kein Wert steht).
 * @param farbe (v) => [r, g, b]
 */
export function rasterZuDataUrl(raster, farbe, alpha = 0.72) {
  const { werte, breite, hoehe } = raster
  const canvas = document.createElement('canvas')
  canvas.width = breite
  canvas.height = hoehe
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(breite, hoehe)
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
  for (let i = 0; i < werte.length; i++) {
    const v = werte[i]
    if (Number.isNaN(v)) continue
    const [r, g, b] = farbe(v)
    const o = i * 4
    img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = a
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
