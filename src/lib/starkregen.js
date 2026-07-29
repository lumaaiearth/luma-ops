// Starkregen-Check: prüft einen Punkt gegen die Berliner Starkregengefahren-
// karte (ua_srgk) — zwei Szenarien (10-jährlich / Extremereignis).
// Wichtig: die Wasserstand-Layer rendern nur bei Maßstab ≤ 1:5000, deshalb
// wird ein kleines, hochaufgelöstes Fenster (~120 m, 0,75 m/px) abgefragt:
//  · GetFeatureInfo am Punkt → Wasserstand-Klasse (Text)
//  · GetMap-Pixelzählung im Umfeld → Anteil überfluteter Fläche
//  · WFS a_modellgebiete → liegt der Punkt überhaupt im Modellgebiet?

const WMS = 'https://gdi.berlin.de/services/wms/ua_srgk'
const WFS = 'https://gdi.berlin.de/services/wfs/ua_srgk'
const WIN = 60   // halbes Abfragefenster in Metern
const PX = 160   // Fensterauflösung → ~0,75 m/px → Maßstab ~1:2700

export const SZENARIEN = [
  { key: 'selten', layer: 'bb_wasserstand_selten', label: 'Seltenes Ereignis (~10-jährlich)' },
  { key: 'extrem', layer: 'db_wassersand_extrem', label: 'Extremereignis (100 mm/h)' },
]

export const AMPEL = {
  rot: { label: 'Überflutungsgefahr', color: '#ef4444', hint: 'Schon bei ~10-jährlichem Starkregen steht hier Wasser — Versickerung/Mulden mitplanen, empfindliche Pflanzung meiden.' },
  gelb: { label: 'Gefahr bei Extremregen', color: '#f59e0b', hint: 'Bei Extremereignissen überflutet — robuste, kurzzeitig staunässetolerante Auswahl von Vorteil.' },
  gruen: { label: 'Keine Überflutung modelliert', color: '#22c55e', hint: 'Im 120-m-Umfeld kein modellierter Wasserstand in beiden Szenarien.' },
  keine_daten: { label: 'Außerhalb der Modellgebiete', color: '#9ca3af', hint: 'Für diesen Ort liegt (noch) keine Starkregengefahrenkarte vor.' },
}

function bboxOf(lat, lng) {
  const dLat = WIN / 111320
  const dLng = WIN / (111320 * Math.cos(lat * Math.PI / 180))
  // WMS 1.3.0 + EPSG:4326 → Achsenfolge lat,lon
  return `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`
}

async function punktKlasse(lat, lng, layer) {
  const url = `${WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layer}&QUERY_LAYERS=${layer}&STYLES=&CRS=EPSG:4326&BBOX=${bboxOf(lat, lng)}&WIDTH=${PX}&HEIGHT=${PX}&I=${PX / 2}&J=${PX / 2}&INFO_FORMAT=text%2Fxml&FEATURE_COUNT=1`
  const text = await (await fetch(url)).text()
  const m = /<ua_srgk:Wasserstand_m>([^<]*)<\/ua_srgk:Wasserstand_m>/.exec(text)
  if (!m) return null
  const val = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()
  return val || null
}

async function anteilUmfeld(lat, lng, layer) {
  const url = `${WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${layer}&STYLES=&CRS=EPSG:4326&BBOX=${bboxOf(lat, lng)}&WIDTH=${PX}&HEIGHT=${PX}&FORMAT=image/png&TRANSPARENT=true`
  const blob = await (await fetch(url)).blob()
  const bmp = await createImageBitmap(blob)
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(PX, PX) : Object.assign(document.createElement('canvas'), { width: PX, height: PX })
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0)
  const data = ctx.getImageData(0, 0, PX, PX).data
  let wet = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 8) wet++
  return Math.round((wet / (PX * PX)) * 1000) / 10 // Prozent, 1 Nachkommastelle
}

async function imModellgebiet(lat, lng) {
  const d = 0.0004
  const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ua_srgk:a_modellgebiete&BBOX=${lat - d},${lng - d},${lat + d},${lng + d},urn:ogc:def:crs:EPSG::4326&COUNT=1&outputFormat=application/json`
  try {
    const json = await (await fetch(url)).json()
    return (json.features || []).length > 0
  } catch { return true } // im Zweifel prüfen statt fälschlich „keine Daten"
}

// Kein Punktwert ODER die „nicht dargestellt"-Klasse → nicht relevant betroffen
const relevant = klasse => !!klasse && !/nicht dargestellt/i.test(klasse)

export async function checkStarkregen(lat, lng) {
  const modellgebiet = await imModellgebiet(lat, lng)
  const result = { modellgebiet, szenarien: {}, computed_at: new Date().toISOString() }
  if (!modellgebiet) { result.ampel = 'keine_daten'; return result }

  for (const s of SZENARIEN) {
    const [klasse, anteil] = await Promise.all([
      punktKlasse(lat, lng, s.layer),
      anteilUmfeld(lat, lng, s.layer),
    ])
    result.szenarien[s.key] = { klasse, anteil_pct: anteil }
  }
  const selten = result.szenarien.selten, extrem = result.szenarien.extrem
  const seltenHit = relevant(selten?.klasse) || (selten?.anteil_pct ?? 0) > 5
  const extremHit = relevant(extrem?.klasse) || (extrem?.anteil_pct ?? 0) > 5
  result.ampel = seltenHit ? 'rot' : extremHit ? 'gelb' : 'gruen'
  return result
}
