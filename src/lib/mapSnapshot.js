// Statisches Kartenbild aus XYZ-Kacheln.
//
// Warum selbst bauen: Der Klima-Steckbrief wird gedruckt bzw. als PDF verschickt
// und liegt dann ohne App auf dem Tisch einer Verwaltung. Ohne Kartenausschnitt
// ist nicht nachvollziehbar, um welche Fläche es überhaupt geht. Fertige
// Static-Map-APIs (Google, Mapbox) brauchen einen kostenpflichtigen Key und
// würden Standortdaten an Dritte schicken — also komponieren wir die Kacheln
// selbst auf ein Canvas und zeichnen den Umriss darüber.
//
// Beide genutzten Kachel-Dienste liefern `Access-Control-Allow-Origin: *`
// (geprüft Juli 2026), das Canvas bleibt also exportierbar (toDataURL).
// Schlägt der CORS-Export doch fehl, liefern wir `null` statt eines kaputten
// Bildes — der Bericht bleibt dann einfach ohne Karte lesbar.

const TILE = 256

/** Web-Mercator: Weltkoordinate in Pixeln bei gegebenem Zoom. */
function project(lat, lng, zoom) {
  const world = TILE * Math.pow(2, zoom)
  const s = Math.max(-0.9999, Math.min(0.9999, Math.sin((lat * Math.PI) / 180)))
  return {
    x: ((lng + 180) / 360) * world,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world,
  }
}

/**
 * Zerlegt eine GeoJSON-Geometrie in zeichenbare Teile. Ein Teil ist eine Liste
 * von Ringen: bei Polygonen Außenring + Löcher (die zusammen mit `evenodd`
 * gefüllt werden müssen, sonst werden Innenhöfe zugemalt), sonst genau einer.
 */
export function geometryParts(geometry) {
  if (!geometry) return []
  const { type, coordinates: c } = geometry
  if (!c) return []
  if (type === 'Point') return [[[c]]]
  if (type === 'MultiPoint' || type === 'LineString') return [[c]]
  if (type === 'MultiLineString') return c.map(l => [l])
  if (type === 'Polygon') return [c]
  if (type === 'MultiPolygon') return c
  if (type === 'GeometryCollection') return (geometry.geometries || []).flatMap(geometryParts)
  return []
}

/** Alle Ringe/Linien einer Geometrie flach — für Bounding-Box-Berechnungen. */
export function geometryRings(geometry) {
  return geometryParts(geometry).flat()
}

function boundsOf(rings) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180, n = 0
  for (const ring of rings) {
    for (const pt of ring) {
      const [lng, lat] = pt
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      n++
    }
  }
  return n ? { minLat, maxLat, minLng, maxLng } : null
}

function loadTile(url, signal) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let done = false
    // Eine hängende Kachel darf den Bericht nicht blockieren.
    const t = setTimeout(() => finish(null), 9000)
    function finish(v) {
      if (done) return
      done = true
      clearTimeout(t)
      resolve(v)
    }
    img.onload = () => finish(img)
    img.onerror = () => finish(null)
    if (signal) signal.addEventListener('abort', () => finish(null), { once: true })
    img.src = url
  })
}

const SUB = ['a', 'b', 'c']
function tileUrl(tpl, x, y, z) {
  return tpl
    .replace('{s}', SUB[(x + y) % SUB.length])
    .replace('{r}', '')
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y)
}

/** Metrische Länge eines Bildschirm-Pixels (Web-Mercator ist breitenabhängig). */
function metersPerPixel(lat, zoom) {
  return (156543.03392804097 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

function drawScaleBar(ctx, w, h, lat, zoom) {
  const mpp = metersPerPixel(lat, zoom)
  // Runde Zielbreite: ~1/4 der Bildbreite, auf 1/2/5·10ⁿ Meter gerundet.
  const roh = (w / 4) * mpp
  const pot = Math.pow(10, Math.floor(Math.log10(roh)))
  const meter = [1, 2, 5, 10].map(f => f * pot).filter(v => v <= roh * 1.4).pop() || pot
  const px = meter / mpp
  const x0 = 10, y0 = h - 12
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.fillRect(x0 - 5, y0 - 13, px + 62, 22)
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x0, y0 - 5); ctx.lineTo(x0, y0); ctx.lineTo(x0 + px, y0); ctx.lineTo(x0 + px, y0 - 5)
  ctx.stroke()
  ctx.fillStyle = '#111827'
  ctx.font = '11px monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText(meter >= 1000 ? `${meter / 1000} km` : `${meter} m`, x0 + px + 6, y0 - 3)
  ctx.restore()
}

function drawNorth(ctx, w) {
  const x = w - 20, y = 20
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.moveTo(x, y - 10); ctx.lineTo(x - 5, y + 7); ctx.lineTo(x, y + 3); ctx.lineTo(x + 5, y + 7)
  ctx.closePath(); ctx.fill()
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('N', x, y + 15)
  ctx.restore()
}

/**
 * Rendert einen Kartenausschnitt um `geometry` und zeichnet den Umriss ein.
 *
 * @returns {Promise<{dataUrl:string, zoom:number, kacheln:number, fehlend:number}|null>}
 *          `null`, wenn keine Geometrie vorliegt, alle Kacheln fehlen oder der
 *          Browser den Export blockiert.
 */
export async function renderMapSnapshot(geometry, opts = {}) {
  const {
    width = 620,
    height = 380,
    url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom = 19,
    minZoom = 13,
    padding = 46,          // Rand in Pixeln, damit der Umriss nicht am Bild klebt
    stroke = '#08AA56',
    fill = 'rgba(8,170,86,0.22)',
    scaleBar = true,
    punktZoom = 18,        // Zoom für Geometrien ohne Ausdehnung (Baum, Sensor)
    markerUnterPx = 0,     // kleiner als das → Marker statt Umriss (Übersichtskarte)
    signal,
  } = opts

  const rings = geometryRings(geometry)
  const b = boundsOf(rings)
  if (!b) return null

  const cLat = (b.minLat + b.maxLat) / 2
  const cLng = (b.minLng + b.maxLng) / 2

  // Größter Zoom, bei dem die Geometrie samt Rand noch ins Bild passt.
  // Ein einzelner Punkt passt in jeden Zoom — dort wäre die Maximalstufe
  // unbrauchbar nah, also auf `punktZoom` deckeln.
  const ohneAusdehnung = b.maxLat === b.minLat && b.maxLng === b.minLng
  const obenZoom = Math.min(maxZoom, ohneAusdehnung ? punktZoom : maxZoom)
  let zoom = Math.min(minZoom, obenZoom)
  for (let z = obenZoom; z >= minZoom; z--) {
    const nw = project(b.maxLat, b.minLng, z)
    const se = project(b.minLat, b.maxLng, z)
    if (se.x - nw.x <= width - 2 * padding && se.y - nw.y <= height - 2 * padding) { zoom = z; break }
  }

  const center = project(cLat, cLng, zoom)
  const left = center.x - width / 2
  const top = center.y - height / 2

  const canvas = document.createElement('canvas')
  const dpr = 2 // fürs Drucken doppelte Auflösung
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#1a1f26'
  ctx.fillRect(0, 0, width, height)

  const world = Math.pow(2, zoom)
  const x0 = Math.floor(left / TILE), x1 = Math.floor((left + width) / TILE)
  const y0 = Math.floor(top / TILE), y1 = Math.floor((top + height) / TILE)

  const jobs = []
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= world) continue
      const wx = ((tx % world) + world) % world
      jobs.push({ tx, ty, url: tileUrl(url, wx, ty, zoom) })
    }
  }

  let fehlend = 0
  const bilder = await Promise.all(jobs.map(j => loadTile(j.url, signal)))
  bilder.forEach((img, i) => {
    if (!img) { fehlend++; return }
    const j = jobs[i]
    ctx.drawImage(img, Math.round(j.tx * TILE - left), Math.round(j.ty * TILE - top), TILE, TILE)
  })
  if (fehlend === jobs.length) return null

  // Umriss zeichnen
  const isPoly = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
  const isPoint = geometry.type === 'Point' || geometry.type === 'MultiPoint'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const nw = project(b.maxLat, b.minLng, zoom)
  const se = project(b.minLat, b.maxLng, zoom)
  // In der Übersichtskarte schrumpft eine Fläche auf wenige Pixel — ein
  // Umriss wäre dort nur ein Fleck, ein Marker ist eindeutig lesbar.
  const alsMarker = isPoint || (markerUnterPx > 0 && se.x - nw.x < markerUnterPx && se.y - nw.y < markerUnterPx)

  if (alsMarker) {
    const punkte = isPoint ? rings.flat() : [[cLng, cLat]]
    for (const [lng, lat] of punkte) {
      const p = project(lat, lng, zoom)
      const x = p.x - left, y = p.y - top
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.fillStyle = fill; ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = stroke; ctx.fill()
    }
  } else {
    for (const part of geometryParts(geometry)) {
      // Außenring und Löcher in EINEM Pfad — sonst füllt die Innenfläche
      // eines Innenhofs mit.
      ctx.beginPath()
      let leer = true
      for (const ring of part) {
        if (!ring || ring.length < 2) continue
        leer = false
        ring.forEach(([lng, lat], i) => {
          const p = project(lat, lng, zoom)
          const x = p.x - left, y = p.y - top
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        if (isPoly) ctx.closePath()
      }
      if (leer) continue
      if (isPoly) { ctx.fillStyle = fill; ctx.fill('evenodd') }
      // Weiße Kontur unter der farbigen Linie — bleibt auf hellen wie dunklen
      // Luftbildern sichtbar.
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke()
      ctx.lineWidth = 2.5; ctx.strokeStyle = stroke; ctx.stroke()
    }
  }

  if (scaleBar) drawScaleBar(ctx, width, height, cLat, zoom)
  drawNorth(ctx, width)

  try {
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.86), zoom, kacheln: jobs.length, fehlend }
  } catch {
    return null // Canvas getaint (CORS) — lieber keine Karte als eine kaputte
  }
}
