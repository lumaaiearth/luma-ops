// Klima-Steckbrief für einen Standort: fragt die amtlichen Berliner Fachdaten
// punktgenau über WMS-GetFeatureInfo ab (Klimaanalyse 2022, Versiegelung 2021,
// Grünvolumen 2020) und normalisiert sie in eine kompakte Struktur.
//
// Achtung Maßstab: die GDI-Dienste antworten nur in ausreichend großem Maßstab,
// deshalb wird ein kleines, hochaufgelöstes Fenster abgefragt (≈180 m / 200 px).

import { fetchT, mapLimit } from './fetchTimeout.js'

const GDI = 'https://gdi.berlin.de/services/wms'
const WIN_M = 90     // halbe Fensterkante in Metern
const PX = 200

function decode(s) {
  return String(s || '')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim()
}

// Alle Attribute des getroffenen Objekts als { feldname: wert }
async function featureInfo(service, layer, lat, lng, signal) {
  const dLat = WIN_M / 111320
  const dLng = WIN_M / (111320 * Math.cos(lat * Math.PI / 180))
  // WMS 1.3.0 + EPSG:4326 → Achsenfolge lat,lon
  const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`
  const url = `${GDI}/${service}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layer}&QUERY_LAYERS=${layer}&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${PX}&HEIGHT=${PX}&I=${PX / 2}&J=${PX / 2}&INFO_FORMAT=text%2Fxml&FEATURE_COUNT=1`
  const text = await (await fetchT(url, { timeout: 12000, signal })).text()
  const out = {}
  const re = /<[a-z_0-9]+:([A-Za-zÄÖÜäöüß_0-9]+)>([^<]*)<\/[a-z_0-9]+:[A-Za-zÄÖÜäöüß_0-9]+>/g
  let m
  while ((m = re.exec(text))) {
    const val = decode(m[2])
    if (val) out[m[1]] = val
  }
  return out
}

const num = v => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Aus „> 29 - 35 [°C]   Warm" → { text: '> 29–35 °C', bewertung: 'Warm', mitte: 32 }
function parseKlasse(raw) {
  if (!raw) return null
  const s = decode(raw)
  const range = /(-?[\d.,]+)\s*-\s*(-?[\d.,]+)/.exec(s)
  const mitte = range ? (num(range[1]) + num(range[2])) / 2 : num((/(-?[\d.,]+)/.exec(s) || [])[1])
  // „> 29 - 35 [°C] Warm" → Wert bis einschließlich Einheit, Bewertung dahinter
  const bewertung = (/\]\s*(.+)$/.exec(s) || [])[1]?.trim() || null
  const wert = (/^(.*?)\s*\[([^\]]+)\]/.exec(s) || [])
  const text = wert[1] ? `${wert[1].replace(/\s*-\s*/, '–')} ${wert[2]}`.trim() : s
  return { text, bewertung, mitte }
}

/* ── Bewertungslogik (für Ampeln & Empfehlungen) ────────────────────────── */
export function hitzeStufe(petMitte) {
  if (petMitte == null) return null
  if (petMitte >= 41) return { key: 'extrem', label: 'Extreme Wärmebelastung', color: '#dc2626' }
  if (petMitte >= 35) return { key: 'stark', label: 'Starke Wärmebelastung', color: '#ef4444' }
  if (petMitte >= 29) return { key: 'maessig', label: 'Mäßige Wärmebelastung', color: '#f59e0b' }
  if (petMitte >= 23) return { key: 'leicht', label: 'Leichte Wärmebelastung', color: '#a3e635' }
  return { key: 'gering', label: 'Geringe Wärmebelastung', color: '#22c55e' }
}

export function versiegelungStufe(pct) {
  if (pct == null) return null
  if (pct >= 70) return { key: 'sehr_hoch', label: 'Sehr stark versiegelt', color: '#dc2626' }
  if (pct >= 50) return { key: 'hoch', label: 'Stark versiegelt', color: '#f59e0b' }
  if (pct >= 30) return { key: 'mittel', label: 'Mäßig versiegelt', color: '#a3e635' }
  return { key: 'niedrig', label: 'Gering versiegelt', color: '#22c55e' }
}

/* ── Hauptabfrage ───────────────────────────────────────────────────────── */
export async function fetchKlimaProfil(lat, lng, { signal } = {}) {
  const [tag, nacht, pet, versiegelung, gruen] = await Promise.all([
    featureInfo('ua_klimaanalyse_2022', 'i_ua_lufttemp_raster_t2m_14h_2022', lat, lng, signal).catch(() => ({})),
    featureInfo('ua_klimaanalyse_2022', 'g_ua_lufttemp_raster_t2m_04h_2022', lat, lng, signal).catch(() => ({})),
    featureInfo('ua_klimaanalyse_2022', 'q_ua_pet_raster_2022', lat, lng, signal).catch(() => ({})),
    featureInfo('ua_versiegelung_2021', 'versieg2021', lat, lng, signal).catch(() => ({})),
    featureInfo('ua_gruenvolumen_2020', 'a_gruenvol2020', lat, lng, signal).catch(() => ({})),
  ])

  const petK = parseKlasse(pet.PET)
  const vgPct = num(versiegelung.vg_2021)
  const profil = {
    hitze: {
      tag: parseKlasse(tag.Lufttemperatur),
      nacht: parseKlasse(nacht.Lufttemperatur),
      pet: petK,
      stufe: hitzeStufe(petK?.mitte),
    },
    versiegelung: vgPct == null ? null : {
      pct: vgPct,
      bebaut_pct: num(versiegelung.probau_2021),
      sonstige_pct: num(versiegelung.provgneu_2021),
      trend_pct: num(versiegelung.vg_dif21_16),      // Änderung 2016→2021 (negativ = Entsiegelung)
      blocktyp: versiegelung.typklar || null,
      nutzung: versiegelung.wozklar || null,
      blockflaeche_m2: num(versiegelung.flalle),
      stufe: versiegelungStufe(vgPct),
    },
    gruen: num(gruen.vegvol2020) == null ? null : {
      gvz: num(gruen.vegvol2020),                    // Grünvolumenzahl m³/m²
      anteil_pct: num(gruen.vegproz2020),            // Vegetationsanteil
      hoehe_m: num(gruen.veghoh2020),                // mittlere Vegetationshöhe
      trend_gvz: num(gruen.changegvz),               // Änderung 2010→2020
    },
    computed_at: new Date().toISOString(),
    quelle: 'Umweltatlas Berlin (Klimaanalyse 2022, Versiegelung 2021, Grünvolumen 2020)',
  }
  profil.leer = !profil.hitze.tag && !profil.versiegelung && !profil.gruen
  return profil
}

/* ── Gebietsprofil: Stichprobe über ein Gebiet (Bezirk/Ortsteil/Fläche) ───
   Die Fachdaten sind punktbezogen (Blöcke bzw. 10-m-Raster). Für ein ganzes
   Gebiet wird ein Punktraster gelegt, jeder Punkt abgefragt und gemittelt —
   bewusst als STICHPROBE ausgewiesen, nicht als exakte Flächenstatistik. */

function pointInRing(pt, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function inGeom(lng, lat, geom) {
  if (!geom) return true
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []
  return polys.some(rings => pointInRing([lng, lat], rings[0]) && !rings.slice(1).some(h => pointInRing([lng, lat], h)))
}

// Gleichmäßiges Raster über die BBox, auf die Geometrie beschnitten
export function sampleScopePoints(bbox, geometry, ziel = 9) {
  if (!bbox) return []
  const [s, w, n, e] = bbox
  const out = []
  for (let grid = Math.ceil(Math.sqrt(ziel)); grid <= 9; grid++) {
    out.length = 0
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const lat = s + ((i + 0.5) / grid) * (n - s)
        const lng = w + ((j + 0.5) / grid) * (e - w)
        if (inGeom(lng, lat, geometry)) out.push({ lat, lng })
      }
    }
    if (out.length >= ziel) break
  }
  // gleichmäßig ausdünnen statt abschneiden
  if (out.length > ziel) {
    const step = out.length / ziel
    return Array.from({ length: ziel }, (_, i) => out[Math.floor(i * step)])
  }
  return out
}

const mittel = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

export async function fetchGebietsProfil(points, { signal } = {}) {
  if (!points?.length) return null
  // Nur die drei aussagekräftigsten Schichten je Punkt → 3 Anfragen/Punkt
  const results = await mapLimit(points, 6, async p => {
    const [pet, vers, gruen] = await Promise.all([
      featureInfo('ua_klimaanalyse_2022', 'q_ua_pet_raster_2022', p.lat, p.lng, signal).catch(() => ({})),
      featureInfo('ua_versiegelung_2021', 'versieg2021', p.lat, p.lng, signal).catch(() => ({})),
      featureInfo('ua_gruenvolumen_2020', 'a_gruenvol2020', p.lat, p.lng, signal).catch(() => ({})),
    ])
    return {
      pet: parseKlasse(pet.PET),
      vg: num(vers.vg_2021),
      vgTrend: num(vers.vg_dif21_16),
      gvz: num(gruen.vegvol2020),
      gvzTrend: num(gruen.changegvz),
      nutzung: vers.wozklar || null,
    }
  })

  const ok = results.filter(Boolean)
  const petWerte = ok.map(r => r.pet?.mitte).filter(v => v != null)
  const vgWerte = ok.map(r => r.vg).filter(v => v != null)
  const gvzWerte = ok.map(r => r.gvz).filter(v => v != null)
  const petAvg = mittel(petWerte)
  const vgAvg = mittel(vgWerte)

  // Statt einer „häufigsten Bewertung" (die dem Mittelwert widersprechen kann)
  // der belastbare Anteil: wie viele Stützpunkte liegen im kritischen Bereich?
  const belastet = petWerte.filter(v => v >= 35).length

  return {
    stichprobe: points.length,
    treffer: ok.length,
    pet: petAvg == null ? null : {
      mitte: Math.round(petAvg * 10) / 10,
      stufe: hitzeStufe(petAvg),
      spanne: petWerte.length > 1 ? [Math.min(...petWerte), Math.max(...petWerte)] : null,
      belastet,                                                   // PET ≥ 35 °C
      belastet_pct: petWerte.length ? Math.round((belastet / petWerte.length) * 100) : null,
    },
    versiegelung: vgAvg == null ? null : {
      pct: Math.round(vgAvg * 10) / 10,
      stufe: versiegelungStufe(vgAvg),
      trend_pct: mittel(ok.map(r => r.vgTrend).filter(v => v != null)),
      spanne: vgWerte.length > 1 ? [Math.min(...vgWerte), Math.max(...vgWerte)] : null,
    },
    gruen: gvzWerte.length ? {
      gvz: Math.round(mittel(gvzWerte) * 100) / 100,
      trend_gvz: mittel(ok.map(r => r.gvzTrend).filter(v => v != null)),
    } : null,
    computed_at: new Date().toISOString(),
  }
}

/* ── Sensor-Cluster nach Standortcharakter ───────────────────────────────
   Ordnet jedem Messpunkt die amtliche Blockversiegelung zu und gruppiert
   danach. So lässt sich vergleichen, wie sich Messwerte in versiegelter
   Umgebung gegenüber Grünlagen entwickeln — der eigentliche Erkenntniswert
   verteilter Sensorik. */
export const CLUSTER = [
  { key: 'versiegelt', label: 'Versiegelte Lage', kurz: 'versiegelt', color: '#ef4444', ab: 50 },
  { key: 'gemischt', label: 'Gemischte Lage', kurz: 'gemischt', color: '#f59e0b', ab: 25 },
  { key: 'gruen', label: 'Grünlage', kurz: 'grün', color: '#22c55e', ab: 0 },
  { key: 'unbekannt', label: 'Ohne Zuordnung', kurz: 'unbekannt', color: '#6b7280', ab: null },
]

export function clusterFor(vgPct) {
  if (vgPct == null) return CLUSTER[3]
  return CLUSTER.find(c => c.ab != null && vgPct >= c.ab) || CLUSTER[2]
}

// Für eine Liste Messpunkte den Versiegelungsgrad holen (1 Anfrage je Punkt)
export async function fetchSensorCluster(sensoren, { signal } = {}) {
  const res = await mapLimit(sensoren, 6, async s => {
    const v = await featureInfo('ua_versiegelung_2021', 'versieg2021', s.lat, s.lng, signal).catch(() => ({}))
    const pct = num(v.vg_2021)
    return { id: s.id, vg_pct: pct, nutzung: v.wozklar || null, cluster: clusterFor(pct).key }
  })
  const out = {}
  for (const r of res) if (r) out[r.id] = r
  return out
}

/* ── Maßnahmen-Empfehlungen aus allen Analysen ──────────────────────────── */
export function empfehlungen({ klima, sonne, regen, flaeche_m2 }) {
  const out = []
  const licht = sonne?.licht
  const sommer = sonne?.seasons?.sommer?.sun

  if (licht === 1) out.push({
    titel: 'Trockenheitsverträgliche, magere Pflanzung',
    text: `Die Fläche bekommt am 21.6. rund ${sommer} h direkte Sonne. Magersubstrat statt Mutterboden, Steppenstauden und Kräuter (z.B. Salbei, Katzenminze, Fetthenne). Kein regelmäßiges Gießen nach dem Anwachsjahr — das hält die Pflanzung mager und blühfreudig.`,
  })
  if (licht === 2) out.push({
    titel: 'Breite Staudenauswahl möglich',
    text: `Mit ${sommer} h Sommersonne liegt die Fläche im Halbschatten — die dankbarste Ausgangslage. Frischwiesen-/Saumarten funktionieren, ebenso Gehölzrand-Stauden an der schattigen Seite.`,
  })
  if (licht === 3) out.push({
    titel: 'Schattenkonzept statt Blühfläche',
    text: `Nur ${sommer} h direkte Sommersonne: Waldrand-Charakter planen (Farne, Waldgeißbart, Elfenblume). Blühintensive Steppenpflanzungen scheitern hier — häufigster Planungsfehler an solchen Standorten.`,
  })

  const hs = klima?.hitze?.stufe?.key
  if (hs === 'stark' || hs === 'extrem') out.push({
    titel: 'Hitzeinsel — Beschattung und Wasserhaushalt priorisieren',
    text: `Die Wärmebelastung liegt tagsüber bei „${klima.hitze.pet?.bewertung || klima.hitze.stufe.label}" (PET ${klima.hitze.pet?.text}). Schattenspendende Gehölze bringen hier den größten Kühleffekt; Substrat mit hoher Wasserhaltekapazität und Mulchauflage reduzieren den Gießbedarf spürbar.`,
  })
  if (klima?.hitze?.nacht?.mitte != null && klima.hitze.nacht.mitte >= 18) out.push({
    titel: 'Nächtliche Wärmeinsel',
    text: `Auch um 4 Uhr nachts liegt die Lufttemperatur bei ${klima.hitze.nacht.text} — die Umgebung kühlt kaum ab. Entsiegelung und Vegetationsvolumen wirken hier doppelt: tagsüber Verschattung, nachts Verdunstungskühlung.`,
  })

  const v = klima?.versiegelung
  if (v && v.pct >= 50) out.push({
    titel: 'Entsiegelungspotenzial im Block',
    text: `Der Block ist zu ${v.pct.toFixed(0)} % versiegelt (${v.bebaut_pct?.toFixed(0)} % Bebauung, ${v.sonstige_pct?.toFixed(0)} % sonstige Flächen). Bereits kleine Entsiegelungen (Stellplätze, Wege, Baumscheiben) verbessern Versickerung und Kleinklima messbar.`,
  })
  if (v && v.trend_pct != null && v.trend_pct > 1) out.push({
    titel: 'Versiegelung nimmt zu',
    text: `Seit 2016 ist die Versiegelung im Block um ${v.trend_pct.toFixed(1)} Prozentpunkte gestiegen — ein Argument für kompensierende Maßnahmen auf dieser Fläche.`,
  })

  const g = klima?.gruen
  if (g && g.trend_gvz != null && g.trend_gvz < -0.5) out.push({
    titel: 'Grünvolumen verloren',
    text: `Die Grünvolumenzahl ist von ${(g.gvz - g.trend_gvz).toFixed(1)} auf ${g.gvz.toFixed(1)} m³/m² gefallen (2010→2020) — im Block ging Gehölzvolumen verloren. Ersatzpflanzungen mit Zukunftsbaumarten sind hier gut begründbar.`,
  })

  if (regen?.ampel === 'rot') out.push({
    titel: 'Wasser zurückhalten statt ableiten',
    text: 'Die Fläche ist bereits bei einem ~10-jährlichen Starkregen von Überflutung betroffen. Muldenlage, Retentionsvolumen im Aufbau und staunässetolerante Arten einplanen — oder die Fläche bewusst als Regengarten/Versickerungsmulde ausbilden.',
  })
  if (regen?.ampel === 'gelb') out.push({
    titel: 'Auf Extremregen vorbereiten',
    text: 'Bei Extremregen steht hier Wasser. Eine flache Mulde mit Überlauf und wurzelstarke Arten verhindern Ausschwemmung und Substratverlust.',
  })

  if (flaeche_m2 > 0 && licht === 1 && (hs === 'stark' || hs === 'extrem')) out.push({
    titel: 'Bewässerung im Anwachsjahr einplanen',
    text: `Vollsonnig plus hohe Wärmebelastung: Für ${Math.round(flaeche_m2)} m² im ersten Standjahr etwa ${Math.round(flaeche_m2 * 15)} l pro Gießgang ansetzen (≈15 l/m²), in Trockenphasen wöchentlich. Ein Bodenfeuchte-Sensor auf der Fläche ersetzt das Schätzen.`,
  })

  return out
}
