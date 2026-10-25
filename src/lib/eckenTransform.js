// ─────────────────────────────────────────────────────────────────────────────
// Bild auf vier Eckpunkte legen (K12)
//
// Drohnenbilder wurden achsparallel in ihren Umrisskasten gelegt. Ein UTM-
// Raster ist in der Webkarte aber leicht gedreht (Meridiankonvergenz, Berlin
// ~1,2°) — auf 300 m sind das mehrere Meter Versatz an den Rändern. Hier:
// Projektive Abbildung (Homographie) vom Bildrechteck auf die vier Eckpunkte
// in Bildschirmkoordinaten, ausgegeben als CSS matrix3d.
//
// Eckenreihenfolge überall: oben links, oben rechts, unten rechts, unten links
// (im Uhrzeigersinn, wie das Bild liegt).
// Geprüft mit scripts/test-ecken-transform.mjs
// ─────────────────────────────────────────────────────────────────────────────

// Lineares Gleichungssystem (n×n) per Gauß mit Spaltenpivot
function loese(A, b) {
  const n = b.length
  const M = A.map((z, i) => [...z, b[i]])
  for (let k = 0; k < n; k++) {
    let p = k
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i
    if (Math.abs(M[p][k]) < 1e-12) return null
    ;[M[k], M[p]] = [M[p], M[k]]
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k]
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]
    }
  }
  const x = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n]
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]
    x[i] = s / M[i][i]
  }
  return x
}

/**
 * Homographie, die (0,0),(w,0),(w,h),(0,h) auf die vier Zielpunkte abbildet.
 * @param {number} w Bildbreite (px)
 * @param {number} h Bildhöhe (px)
 * @param {[number,number][]} ziel [ol, or, ur, ul] in Bildschirm-Pixeln
 * @returns {number[]|null} [a,b,c,d,e,f,g,h] mit u=(ax+by+c)/(gx+hy+1), v=(dx+ey+f)/(gx+hy+1)
 */
export function homographie(w, h, ziel) {
  if (!(w > 0 && h > 0) || !Array.isArray(ziel) || ziel.length !== 4) return null
  const quelle = [[0, 0], [w, 0], [w, h], [0, h]]
  const A = [], b = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = quelle[i], [u, v] = ziel[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }
  const x = loese(A, b)
  return x && x.every(Number.isFinite) ? x : null
}

export function abbilden(H, x, y) {
  const [a, b, c, d, e, f, g, h] = H
  const n = g * x + h * y + 1
  return [(a * x + b * y + c) / n, (d * x + e * y + f) / n]
}

/** CSS-Transform (transform-origin: 0 0) für ein Bild w×h auf die vier Punkte. */
export function matrix3d(w, h, ziel) {
  const H = homographie(w, h, ziel)
  if (!H) return null
  const [a, b, c, d, e, f, g, hh] = H
  // Spaltenweise: 3×3-Homographie in die 4×4-Matrix (z bleibt unberührt)
  return `matrix3d(${[a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].join(',')})`
}

/**
 * Eckpunkte aus der gespeicherten Geometrie eines Drohnenbilds.
 * Neue Bilder (properties.eckgenau) speichern den Ring als [ol, or, ur, ul, ol];
 * ältere einen achsparallelen Kasten — daraus werden die Ecken abgeleitet.
 * @returns {[number,number][]|null} [lng,lat] für ol, or, ur, ul
 */
export function bildEcken(feature) {
  const ring = feature?.geometry?.coordinates?.[0]
  if (!Array.isArray(ring) || ring.length < 4) return null
  if (feature.properties?.eckgenau) return ring.slice(0, 4).map(p => [p[0], p[1]])
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1])
  const w = Math.min(...lngs), e = Math.max(...lngs), s = Math.min(...lats), n = Math.max(...lats)
  return [[w, n], [e, n], [e, s], [w, s]]
}
