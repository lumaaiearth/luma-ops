// ─────────────────────────────────────────────────────────────────────────────
// Kartenkacheln eines Projektgebiets offline vorhalten (K17)
//
// Im Feld gibt es oft kein Netz. Bisher lag offline nur, was zufällig schon
// angesehen war — und die amtlichen Luftbilder (GDI Berlin, LGB, basemap.de)
// fielen nicht einmal darunter, weil die Cache-Regel ihre Hosts nicht kannte.
// Jetzt lädt „Offline vorhalten“ die Kacheln des Projektgebiets vorab in
// denselben Cache, aus dem der Service Worker (vite.config.js) liest.
//
// Nur Quellen, deren Bedingungen das Vorabladen erlauben (amtliche offene
// Daten, eigene Orthomosaike). OSM, Esri, OpenTopoMap und EOX untersagen
// Massen-Downloads — sie bleiben beim „zuletzt angesehen“-Cache.
// Rechenteile geprüft mit scripts/test-offline-kacheln.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { kachelBereich } from './orthoKacheln.js'

/** Grundkarten, die vorab geladen werden dürfen (alle mit CORS geprüft). */
export const OFFLINE_ERLAUBT = new Set(['luftbild_berlin', 'luftbild_bb', 'basemap_de', 'k5_berlin'])
export const CACHE_AMTLICH = 'luma-kacheln-amtlich'
export const CACHE_ORTHO = 'luma-ortho-kacheln'
export const MAX_KACHELN = 4000

const GRAD_JE_M = 1 / 111320

/**
 * Gebiet eines Projekts: Umriss aller Objekte, sonst der Pin; plus Rand.
 * @returns {[number,number,number,number]|null} [west, süd, ost, nord]
 */
export function projektGebiet(project, features = [], { randM = 60, pinRadiusM = 250 } = {}) {
  const punkte = []
  const sammeln = g => {
    if (!g) return
    if (g.type === 'Point') punkte.push(g.coordinates)
    else if (g.type === 'LineString' || g.type === 'MultiPoint') punkte.push(...g.coordinates)
    else if (g.type === 'Polygon' || g.type === 'MultiLineString') g.coordinates.forEach(r => punkte.push(...r))
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(r => punkte.push(...r)))
  }
  features.filter(f => f.project_id === project?.id).forEach(f => sammeln(f.geometry))
  let w, s, e, n, rand = randM
  if (punkte.length) {
    w = Math.min(...punkte.map(p => p[0])); e = Math.max(...punkte.map(p => p[0]))
    s = Math.min(...punkte.map(p => p[1])); n = Math.max(...punkte.map(p => p[1]))
  } else if (Number.isFinite(project?.lat) && Number.isFinite(project?.lng)) {
    w = e = project.lng; s = n = project.lat; rand = pinRadiusM
  } else return null
  const dLat = rand * GRAD_JE_M, dLng = rand * GRAD_JE_M / Math.cos(((s + n) / 2) * Math.PI / 180)
  return [w - dLng, s - dLat, e + dLng, n + dLat]
}

/** Alle Kacheln {z,x,y} des Gebiets von minZ bis maxZ. */
export function kachelListe(gebiet, minZ, maxZ) {
  const [w, s, e, n] = gebiet
  const ecken = [[w, n], [e, n], [e, s], [w, s]]
  const out = []
  for (let z = minZ; z <= maxZ; z++) {
    const b = kachelBereich(ecken, z)
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) out.push({ z, x, y })
  }
  return out
}

/** URL einer XYZ-Kachel aus der Vorlage ({s} → a). */
export const xyzUrl = (vorlage, { z, x, y }) => vorlage.replace('{s}', 'a').replace('{z}', z).replace('{x}', x).replace('{y}', y)

/**
 * Feinste vorab zu ladende Stufe einer Grundkarte: höchstens ihre echte
 * Auflösung, höchstens 20 (darüber vervielfacht sich die Menge ohne Gewinn).
 */
export const feinsteStufe = tile => Math.min(20, tile?.maxNativeZoom || 19)

// ── Im Browser ───────────────────────────────────────────────────────────────

/**
 * Kachel-URLs genau so, wie die Karte sie anfragt — sonst trifft der Cache
 * nicht. Für WMS rechnet Leaflet selbst (gleiche Optionen wie in MapPage).
 */
export async function kachelUrls(tile, kacheln) {
  if (!tile.wms) return kacheln.map(k => xyzUrl(tile.url, k))
  const L = (await import('leaflet')).default
  const div = document.createElement('div')
  Object.assign(div.style, { position: 'absolute', left: '-10000px', top: '0', width: '256px', height: '256px' })
  document.body.appendChild(div)
  const karte = L.map(div, { zoomControl: false, attributionControl: false, fadeAnimation: false, zoomAnimation: false })
  try {
    karte.setView([52.5, 13.4], 10)
    const ebene = L.tileLayer.wms(tile.url, { layers: tile.layers, format: tile.format, attribution: tile.attribution, maxNativeZoom: tile.maxNativeZoom, maxZoom: tile.maxZoom })
    // Nur für die URL-Bildung anmelden, keine Kacheln laden lassen
    ebene._map = karte
    ebene._crs = karte.options.crs
    ebene._wmsVersion = parseFloat(ebene.wmsParams.version)
    const tileSize = ebene.getTileSize()
    ebene.wmsParams.width = tileSize.x
    ebene.wmsParams.height = tileSize.y
    ebene.wmsParams[ebene._wmsVersion >= 1.3 ? 'crs' : 'srs'] = ebene._crs.code
    // Wie TileLayer.WMS.getTileUrl, aber ohne dessen Abhängigkeit vom
    // laufenden Kachelraster (_globalTileRange) — die URL hat keine Platzhalter.
    const basis = ebene._url
    const parameter = L.Util.getParamString(ebene.wmsParams, basis, ebene.options.uppercase)
    return kacheln.map(k => {
      const p = L.point(k.x, k.y); p.z = k.z
      const [nw, se] = ebene._tileCoordsToNwSe(p)
      const b = L.bounds(ebene._crs.project(nw), ebene._crs.project(se))
      const bbox = (ebene._wmsVersion >= 1.3 && ebene._crs === L.CRS.EPSG4326 ? [b.min.y, b.min.x, b.max.y, b.max.x] : [b.min.x, b.min.y, b.max.x, b.max.y]).join(',')
      return basis + parameter + (ebene.options.uppercase ? '&BBOX=' : '&bbox=') + bbox
    })
  } finally {
    karte.remove()
    div.remove()
  }
}

/**
 * URLs laden und in den Cache legen. Bereits vorhandene werden übersprungen.
 * @returns {Promise<{ geladen: number, vorhanden: number, fehlend: number, abgebrochen: boolean }>}
 */
export async function vorhalten(urls, cacheName, { fortschritt, abbrechen, gleichzeitig = 6 } = {}) {
  const cache = await caches.open(cacheName)
  const stand = { geladen: 0, vorhanden: 0, fehlend: 0, abgebrochen: false, gesamt: urls.length }
  let i = 0
  async function arbeiter() {
    while (i < urls.length) {
      if (abbrechen?.()) { stand.abgebrochen = true; return }
      const url = urls[i++]
      try {
        if (await cache.match(url)) { stand.vorhanden++ }
        else {
          const r = await fetch(url, { mode: 'cors', credentials: 'omit' })
          // 404 bei Orthomosaiken = Kachel ohne Bildinhalt, kein Fehler
          if (r.ok) { await cache.put(url, r); stand.geladen++ } else stand.fehlend++
        }
      } catch { stand.fehlend++ }
      fortschritt?.({ ...stand })
    }
  }
  await Promise.all(Array.from({ length: gleichzeitig }, arbeiter))
  return stand
}
