// ─────────────────────────────────────────────────────────────────────────────
// Orthomosaik → Kartenkacheln, direkt im Browser (K13)
//
// Vorher ging das nur per Skript (gdal2tiles + scripts/upload-tiles.mjs mit
// service_role-Key). Jetzt erzeugt die App die Kacheln selbst:
//   · das GeoTIFF wird blockweise gelesen (fromBlob) — nie ganz im Speicher,
//   · die feinste Stufe wird aus dem Raster abgetastet, jede gröbere Stufe aus
//     den vier Kacheln darunter (Tiefensuche: Speicher bleibt klein),
//   · Kacheln ohne Bildinhalt werden nicht hochgeladen.
// Kein Server, keine Edge Function — es zählt nur der Speicherplatz, deshalb
// schätzt `schaetzung` vorher Anzahl und Größe.
//
// Reine Rechenteile (oben) sind ohne Browser geprüft: scripts/test-ortho-kacheln.mjs
// ─────────────────────────────────────────────────────────────────────────────

import proj4 from 'proj4'

export const KACHEL = 256
export const MAX_ZOOM = 22
const UMFANG = 2 * Math.PI * 6378137
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs'

// ── Kachelrechnung (Web Mercator, XYZ wie OSM) ─────────────────────────────

/** Globale Pixelkoordinate einer Position auf Zoomstufe z. */
export function zuPixel(lng, lat, z) {
  const n = KACHEL * 2 ** z
  const s = Math.sin(lat * Math.PI / 180)
  return [(lng + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

export function ausPixel(px, py, z) {
  const n = KACHEL * 2 ** z
  const lng = px / n * 360 - 180
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * py / n))) * 180 / Math.PI
  return [lng, lat]
}

/** Bodenauflösung einer Kachelstufe in m/px. */
export const aufloesung = (z, lat) => UMFANG * Math.cos(lat * Math.PI / 180) / (KACHEL * 2 ** z)

/** Feinste sinnvolle Zoomstufe für eine Bodenauflösung (m/px) — nicht feiner als das Bild. */
export function zoomFuerAufloesung(mProPx, lat) {
  if (!(mProPx > 0)) return null
  const z = Math.round(Math.log2(UMFANG * Math.cos(lat * Math.PI / 180) / (KACHEL * mProPx)))
  return Math.max(0, Math.min(MAX_ZOOM, z))
}

/** Kachelbereich {x0,x1,y0,y1} (einschließlich), der die Ecken [lng,lat] abdeckt. */
export function kachelBereich(ecken, z) {
  const px = ecken.map(([lng, lat]) => zuPixel(lng, lat, z))
  const xs = px.map(p => p[0]), ys = px.map(p => p[1])
  return {
    x0: Math.floor(Math.min(...xs) / KACHEL), x1: Math.floor((Math.max(...xs) - 1e-9) / KACHEL),
    y0: Math.floor(Math.min(...ys) / KACHEL), y1: Math.floor((Math.max(...ys) - 1e-9) / KACHEL),
  }
}

/**
 * Anzahl Kacheln und geschätzter Speicher. Die Zahl ist eine Obergrenze (der
 * Umrisskasten zählt mit), leere Randkacheln werden später nicht hochgeladen.
 */
export function schaetzung(ecken, minZ, maxZ, { kbProKachel = 40 } = {}) {
  let kacheln = 0
  for (let z = minZ; z <= maxZ; z++) {
    const b = kachelBereich(ecken, z)
    kacheln += (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1)
  }
  return { kacheln, mb: Math.round(kacheln * kbProKachel / 1024) }
}

// ── Abtasten ────────────────────────────────────────────────────────────────

/**
 * RGBA-Ausschnitt der Größe outW×outH aus einem Quellraster.
 * Die Lage im Quellraster ist über die vier Ecken des Ausschnitts gegeben
 * (Quellpixel [spalte, zeile] für ol, or, ur, ul); dazwischen bilinear —
 * über eine Kachelgruppe ist die Abbildung UTM ↔ Web Mercator praktisch linear.
 * @param {{ daten: ArrayLike<number>, breite: number, hoehe: number, kanaele: number }} quelle  verschachtelt (RGB… oder RGBA…)
 * @param {[number,number][]} ecken  Quellpixel der Ausschnittsecken
 * @returns {{ rgba: Uint8ClampedArray, leer: boolean }}
 */
export function abtasten(quelle, ecken, outW, outH, { schwarzTransparent = false } = {}) {
  const { daten, breite, hoehe, kanaele } = quelle
  const rgba = new Uint8ClampedArray(outW * outH * 4)
  const [ol, or, ur, ul] = ecken
  let leer = true
  for (let y = 0; y < outH; y++) {
    const v = (y + 0.5) / outH
    // linke und rechte Kante in dieser Zeile
    const lx = ol[0] + (ul[0] - ol[0]) * v, ly = ol[1] + (ul[1] - ol[1]) * v
    const rx = or[0] + (ur[0] - or[0]) * v, ry = or[1] + (ur[1] - or[1]) * v
    for (let x = 0; x < outW; x++) {
      const u = (x + 0.5) / outW
      const sx = Math.floor(lx + (rx - lx) * u), sy = Math.floor(ly + (ry - ly) * u)
      if (sx < 0 || sy < 0 || sx >= breite || sy >= hoehe) continue
      const q = (sy * breite + sx) * kanaele
      const a = kanaele >= 4 ? daten[q + 3] : 255
      if (a === 0) continue
      const r = daten[q], g = daten[q + 1], b = daten[q + 2]
      if (schwarzTransparent && kanaele < 4 && r === 0 && g === 0 && b === 0) continue
      const o = (y * outW + x) * 4
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a
      leer = false
    }
  }
  return { rgba, leer }
}

/** readRGB liefert je nach Version verschachtelt oder je Kanal — immer verschachtelt zurückgeben. */
export function verschachtelt(rgb, n, kanaele) {
  if (Array.isArray(rgb) && rgb[0]?.length === n) {
    const out = new Uint8ClampedArray(n * kanaele)
    for (let i = 0; i < n; i++) for (let k = 0; k < kanaele; k++) out[i * kanaele + k] = rgb[k] ? rgb[k][i] : 255
    return out
  }
  return rgb
}

// ── Im Browser: Kacheln erzeugen ───────────────────────────────────────────

function leinwand(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  return c
}
async function alsBlob(c, typ) {
  if (c.convertToBlob) return c.convertToBlob({ type: typ, quality: 0.85 })
  return new Promise(ok => c.toBlob(ok, typ, 0.85))
}

/** Kann der Browser WebP mit Transparenz schreiben? Sonst PNG. */
export async function kachelFormat() {
  try {
    const b = await alsBlob(leinwand(2, 2), 'image/webp')
    return b?.type === 'image/webp' ? { typ: 'image/webp', endung: 'webp' } : { typ: 'image/png', endung: 'png' }
  } catch { return { typ: 'image/png', endung: 'png' } }
}

/**
 * Kopfdaten eines GeoTIFF, ohne das Raster zu lesen.
 * @param {Blob} datei
 * @param {Record<number,string>} defs  Proj4-Definitionen je EPSG (aus geotiffImport)
 */
export async function orthoKopf(datei, defs, epsgAusGeoKeys) {
  const { fromBlob } = await import('geotiff')
  const tiff = await fromBlob(datei)
  const image = await tiff.getImage()
  const epsg = epsgAusGeoKeys(image.getGeoKeys?.())
  if (!epsg) return { fehler: 'Das Bezugssystem des GeoTIFF ist nicht angegeben.' }
  const def = defs[epsg]
  if (!def) return { fehler: `Bezugssystem EPSG:${epsg} wird noch nicht unterstützt.` }
  let bbox
  try { bbox = image.getBoundingBox() } catch { return { fehler: 'Das TIFF enthält keine Georeferenz.' } }
  const [ox, oy] = image.getOrigin()
  const [rx, ry] = image.getResolution()
  const nachWgs = epsg === 4326 || epsg === 4258 ? p => p : p => proj4(def, WGS84, p)
  const [w, s, e, n] = bbox
  const ecken = [[w, n], [e, n], [e, s], [w, s]].map(nachWgs)
  const lat = (ecken[0][1] + ecken[2][1]) / 2
  // Bodenauflösung in Metern: bei Grad-Systemen umrechnen
  const mProPx = epsg === 4326 || epsg === 4258 ? Math.abs(rx) * 111320 * Math.cos(lat * Math.PI / 180) : Math.abs(rx)
  return {
    tiff, image, epsg, def, ecken, mProPx, lat,
    breite: image.getWidth(), hoehe: image.getHeight(), kanaele: image.getSamplesPerPixel(),
    nachQuelle: epsg === 4326 || epsg === 4258
      ? ([lng, lat2]) => [(lng - ox) / rx, (lat2 - oy) / ry]
      : ([lng, lat2]) => { const [X, Y] = proj4(WGS84, def, [lng, lat2]); return [(X - ox) / rx, (Y - oy) / ry] },
  }
}

/**
 * Alle Kacheln erzeugen und über `hochladen(pfad, blob)` abgeben.
 * @returns {Promise<{ hochgeladen: number, leer: number, abgebrochen: boolean }>}
 */
export async function kachelnErzeugen(kopf, { minZ, maxZ, format, hochladen, fortschritt, abbrechen, schwarzTransparent = true, gleichzeitig = 6 }) {
  const { image, ecken, nachQuelle, breite, hoehe, kanaele } = kopf
  const mitAlpha = kanaele >= 4
  // Gruppenstufe: eine Leseeinheit umfasst 4×4 Kacheln der feinsten Stufe
  const gruppeZ = Math.max(minZ, maxZ - 2)
  const stand = { hochgeladen: 0, leer: 0, abgebrochen: false }
  const warteschlange = new Set()

  async function abgeben(z, x, y, c) {
    const blob = await alsBlob(c, format.typ)
    const p = hochladen(`${z}/${x}/${y}.${format.endung}`, blob).then(() => {
      stand.hochgeladen++
      fortschritt?.(stand)
    })
    warteschlange.add(p)
    p.finally(() => warteschlange.delete(p))
    if (warteschlange.size >= gleichzeitig) await Promise.race(warteschlange)
  }

  // Umrisskasten in Quellpixeln für den schnellen Schnitttest
  const quellRahmen = { x0: 0, y0: 0, x1: breite, y1: hoehe }

  async function gruppe(z, gx, gy) {
    const faktor = 2 ** (maxZ - z)                // Kacheln je Seite auf maxZ
    const seite = KACHEL * faktor
    const px0 = gx * KACHEL * faktor, py0 = gy * KACHEL * faktor
    // Ecken der Gruppe in Quellpixeln
    const q = [[px0, py0], [px0 + seite, py0], [px0 + seite, py0 + seite], [px0, py0 + seite]]
      .map(([px, py]) => nachQuelle(ausPixel(px, py, maxZ)))
    const xs = q.map(p => p[0]), ys = q.map(p => p[1])
    const fx0 = Math.max(quellRahmen.x0, Math.floor(Math.min(...xs)) - 1), fx1 = Math.min(quellRahmen.x1, Math.ceil(Math.max(...xs)) + 1)
    const fy0 = Math.max(quellRahmen.y0, Math.floor(Math.min(...ys)) - 1), fy1 = Math.min(quellRahmen.y1, Math.ceil(Math.max(...ys)) + 1)
    if (fx1 <= fx0 || fy1 <= fy0) return null
    // Sehr feine Quellen beim Lesen verkleinern (höchstens 4096 px Kante)
    const fw = fx1 - fx0, fh = fy1 - fy0
    const s = Math.min(1, 4096 / Math.max(fw, fh))
    const lw = Math.max(1, Math.round(fw * s)), lh = Math.max(1, Math.round(fh * s))
    const roh = await image.readRGB({ window: [fx0, fy0, fx1, fy1], width: lw, height: lh, interleave: true, enableAlpha: mitAlpha })
    const k = mitAlpha ? 4 : 3
    const quelle = { daten: verschachtelt(roh, lw * lh, k), breite: lw, hoehe: lh, kanaele: k }
    const lokal = p => [(p[0] - fx0) * s, (p[1] - fy0) * s]

    // feinste Stufe: faktor × faktor Kacheln abtasten
    const fein = []
    for (let j = 0; j < faktor; j++) {
      for (let i = 0; i < faktor; i++) {
        const t = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
          .map(([a, b]) => lokal(nachQuelle(ausPixel(px0 + a * KACHEL, py0 + b * KACHEL, maxZ))))
        const { rgba, leer } = abtasten(quelle, t, KACHEL, KACHEL, { schwarzTransparent })
        if (leer) { stand.leer++; fein.push(null); continue }
        const c = leinwand(KACHEL, KACHEL)
        c.getContext('2d').putImageData(new ImageData(rgba, KACHEL, KACHEL), 0, 0)
        await abgeben(maxZ, gx * faktor + i, gy * faktor + j, c)
        fein.push(c)
      }
    }
    // innerhalb der Gruppe nach oben zusammensetzen
    let stufe = fein, n = faktor, zz = maxZ
    while (n > 1) {
      const neu = []
      for (let j = 0; j < n / 2; j++) {
        for (let i = 0; i < n / 2; i++) {
          const kinder = [stufe[(2 * j) * n + 2 * i], stufe[(2 * j) * n + 2 * i + 1], stufe[(2 * j + 1) * n + 2 * i], stufe[(2 * j + 1) * n + 2 * i + 1]]
          const c = zusammensetzen(kinder)
          if (c) await abgeben(zz - 1, (gx * faktor) / 2 ** (maxZ - zz + 1) + i, (gy * faktor) / 2 ** (maxZ - zz + 1) + j, c)
          neu.push(c)
        }
      }
      stufe = neu; n /= 2; zz--
    }
    return stufe[0]
  }

  function zusammensetzen(kinder) {
    if (!kinder.some(Boolean)) return null
    const c = leinwand(KACHEL, KACHEL)
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    kinder.forEach((k, i) => { if (k) g.drawImage(k, (i % 2) * KACHEL / 2, Math.floor(i / 2) * KACHEL / 2, KACHEL / 2, KACHEL / 2) })
    return c
  }

  // Tiefensuche von minZ bis zur Gruppenstufe
  async function kachel(z, x, y) {
    if (abbrechen?.()) { stand.abgebrochen = true; return null }
    if (z === gruppeZ) return gruppe(z, x, y)
    const kinder = []
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) kinder.push(await kachel(z + 1, 2 * x + dx, 2 * y + dy))
    const c = zusammensetzen(kinder)
    if (c && !stand.abgebrochen) await abgeben(z, x, y, c)
    return c
  }

  const b = kachelBereich(ecken, minZ)
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) await kachel(minZ, x, y)
  await Promise.all(warteschlange)
  return stand
}
