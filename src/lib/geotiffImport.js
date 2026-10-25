// ─────────────────────────────────────────────────────────────────────────────
// GeoTIFF-Import für Drohnenbilder
//
// Zwei Fehler im bisherigen Import:
//  1. Nur GeoTIFFs mit Gradangaben wurden erkannt. Drohnen-Software exportiert
//     in Berlin meist in UTM 33 (EPSG:25833) — dann kam stillschweigend nichts
//     zurück und die Koordinaten mussten von Hand eingetippt werden.
//  2. Das TIFF wurde roh hochgeladen und als <img> über die Karte gelegt.
//     Browser zeigen TIFF dort nicht an — das Bild blieb unsichtbar.
//
// Hier: Bezugssystem aus den GeoKeys lesen, Ecken nach WGS84 umrechnen (proj4)
// und das Raster in RGBA-Pixel lesen, die der Dialog als PNG hochlädt.
// Ohne Browser prüfbar: scripts/test-geotiff-import.mjs
// ─────────────────────────────────────────────────────────────────────────────

import proj4 from 'proj4'

// Bezugssysteme, die bei Drohnen- und Vermessungsdaten in Berlin/Brandenburg
// vorkommen. Weitere bei Bedarf ergänzen (Definition von epsg.io).
const DEFS = {
  4326: '+proj=longlat +datum=WGS84 +no_defs',
  4258: '+proj=longlat +ellps=GRS80 +no_defs',                                   // ETRS89
  3857: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs',
  25832: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs',                   // ETRS89 / UTM 32N
  25833: '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs',                   // ETRS89 / UTM 33N
  32632: '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',
  32633: '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs',
  // Soldner Berlin (ältere Vermessungsunterlagen)
  3068: '+proj=cass +lat_0=52.41864827777778 +lon_0=13.62720366666667 +x_0=40000 +y_0=10000 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs',
}

export const UNTERSTUETZTE_EPSG = Object.keys(DEFS).map(Number)
export { DEFS }

/** EPSG-Code aus den GeoKeys eines GeoTIFF (projiziert vor geographisch). */
export function epsgAusGeoKeys(keys) {
  if (!keys) return null
  const p = keys.ProjectedCSTypeGeoKey
  if (p && p !== 32767) return p
  const g = keys.GeographicTypeGeoKey
  if (g && g !== 32767) return g
  return null
}

/**
 * Umrisskasten [west, south, east, north] im Bezugssystem `epsg` nach WGS84.
 * Rechnet alle vier Ecken um und nimmt Min/Max — bei UTM ist das Raster
 * gegenüber Nord leicht gedreht (Meridiankonvergenz, Berlin ~1,2°).
 * @returns {{south:number, west:number, north:number, east:number} | null}
 */
export function nachWgs84(bbox, epsg) {
  const def = DEFS[epsg]
  if (!def || !bbox || bbox.length !== 4) return null
  const [w, s, e, n] = bbox
  const ecken = epsg === 4326 || epsg === 4258
    ? [[w, s], [e, s], [e, n], [w, n]]
    : [[w, s], [e, s], [e, n], [w, n]].map((p) => proj4(def, DEFS[4326], p))
  const lngs = ecken.map((p) => p[0]), lats = ecken.map((p) => p[1])
  const r = { west: Math.min(...lngs), east: Math.max(...lngs), south: Math.min(...lats), north: Math.max(...lats) }
  const plausibel = Object.values(r).every(Number.isFinite) && Math.abs(r.north) <= 90 && Math.abs(r.east) <= 180 && r.east > r.west && r.north > r.south
  return plausibel ? r : null
}

/**
 * Die vier Bildecken einzeln nach WGS84 — ol, or, ur, ul als [lng, lat].
 * Anders als der Umrisskasten behält das die Drehung eines UTM-Rasters
 * gegenüber Nord, damit das Bild eckgenau auf der Karte liegt (K12).
 */
export function eckenNachWgs84(bbox, epsg) {
  const def = DEFS[epsg]
  if (!def || !bbox || bbox.length !== 4) return null
  const [w, s, e, n] = bbox
  const roh = [[w, n], [e, n], [e, s], [w, s]]
  const ecken = epsg === 4326 || epsg === 4258 ? roh : roh.map((p) => proj4(def, DEFS[4326], p))
  return ecken.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[1]) <= 90) ? ecken : null
}

/**
 * GeoTIFF lesen: Lage in WGS84 und ein verkleinertes RGBA-Raster für die
 * Anzeige (längste Kante höchstens `maxKante` Pixel).
 * @param {ArrayBuffer} buf
 * @returns {Promise<{bounds, ecken, epsg, breite, hoehe, rgba: Uint8ClampedArray, kanaele: number} | {fehler: string, epsg?: number}>}
 */
export async function leseGeoTiff(buf, { maxKante = 4096 } = {}) {
  const { fromArrayBuffer } = await import('geotiff')
  const tiff = await fromArrayBuffer(buf)
  const image = await tiff.getImage()
  const epsg = epsgAusGeoKeys(image.getGeoKeys?.())
  let bbox
  try { bbox = image.getBoundingBox() } catch { return { fehler: 'Das TIFF enthält keine Georeferenz (kein GeoTIFF).' } }
  if (!epsg) return { fehler: 'Das Bezugssystem des GeoTIFF ist nicht angegeben.' }
  const bounds = nachWgs84(bbox, epsg)
  if (!bounds) return { fehler: `Bezugssystem EPSG:${epsg} wird noch nicht unterstützt (unterstützt: ${UNTERSTUETZTE_EPSG.join(', ')}).`, epsg }

  const w0 = image.getWidth(), h0 = image.getHeight()
  const f = Math.min(1, maxKante / Math.max(w0, h0))
  const breite = Math.max(1, Math.round(w0 * f)), hoehe = Math.max(1, Math.round(h0 * f))
  const kanaele = image.getSamplesPerPixel()
  // readRGB liefert je nach geotiff-Version verschachtelt (RGBRGB…) oder je
  // Kanal getrennt ([R[], G[], B[], A[]]) — beides auswerten.
  const rgb = await image.readRGB({ width: breite, height: hoehe, enableAlpha: kanaele >= 4, resampleMethod: 'bilinear' })
  const n = breite * hoehe
  const rgba = new Uint8ClampedArray(n * 4)
  if (Array.isArray(rgb) && rgb[0]?.length === n) {
    const [R, G, B, Al] = rgb
    for (let i = 0; i < n; i++) {
      rgba[i * 4] = R[i]; rgba[i * 4 + 1] = G[i]; rgba[i * 4 + 2] = B[i]; rgba[i * 4 + 3] = Al ? Al[i] : 255
    }
  } else {
    const k = rgb.length / n
    for (let i = 0, j = 0; i < n; i++, j += k) {
      rgba[i * 4] = rgb[j]; rgba[i * 4 + 1] = rgb[j + 1]; rgba[i * 4 + 2] = rgb[j + 2]
      rgba[i * 4 + 3] = k >= 4 ? rgb[j + 3] : 255
    }
  }
  return { bounds, ecken: eckenNachWgs84(bbox, epsg), epsg, breite, hoehe, rgba, kanaele }
}

/** RGBA-Raster als PNG-Blob (nur im Browser). */
export async function rasterAlsPng({ rgba, breite, hoehe }) {
  const canvas = document.createElement('canvas')
  canvas.width = breite; canvas.height = hoehe
  canvas.getContext('2d').putImageData(new ImageData(rgba, breite, hoehe), 0, 0)
  return new Promise((ok, fehl) => canvas.toBlob((b) => (b ? ok(b) : fehl(new Error('PNG-Umwandlung fehlgeschlagen'))), 'image/png'))
}
