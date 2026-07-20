// Standort-Daten für Florales — Höhe ü. NHN (API + Fallback), Winterhärtezone
// und regionale Pflegehinweise. Höhe kommt aus einer API; Zone/Region werden
// offline aus den Koordinaten geschätzt (belastbar genug für Mitteleuropa),
// damit die App auch ohne Internet sinnvolle Werte zeigt.

// Höhe über NHN: open-meteo (bereits im Projekt genutzt) → open-elevation.
export async function fetchElevation(lat, lng) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
    if (r.ok) { const d = await r.json(); const e = Array.isArray(d?.elevation) ? d.elevation[0] : d?.elevation; if (Number.isFinite(e)) return Math.round(e) }
  } catch { /* Fallback */ }
  try {
    const r = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`)
    if (r.ok) { const d = await r.json(); const e = d?.results?.[0]?.elevation; if (Number.isFinite(e)) return Math.round(e) }
  } catch { /* keine Höhe */ }
  return null
}

// USDA-Winterhärtezone (Näherung Mitteleuropa) aus Breite/Länge/Höhe.
// Deutschland liegt grob in 5b–8a. Ostdeutschland kontinentaler (kälter),
// Küste/Rheinebene milder; ~1 Zone kälter je ~700 Höhenmeter.
export function hardinessZone(lat, lng, elev = 100) {
  let z = 8.2
  z -= Math.max(0, lng - 8) * 0.16      // Osten kälter
  z -= Math.max(0, lat - 50.5) * 0.10   // leicht nach Norden (Binnenland)
  if (lat > 53.3 || lng < 7.5) z += 0.4 // Küste/NW milder
  z -= Math.max(0, (elev - 80)) / 700    // Höhe
  z = Math.max(5, Math.min(8.4, z))
  const num = Math.floor(z)
  const half = (z - num) >= 0.5 ? 'b' : 'a'
  return `${num}${half}`
}

// Grobe Klimaregion + Trockenheit (steuert Anwuchs-Bewässerung).
export function climateRegion(lat, lng) {
  // Kontinentalität: Osten trockener (Brandenburg ~13–15° O, ~500–580 mm/a),
  // Nordwesten/Küste feuchter (~750–850 mm/a).
  if (lng >= 12.2 && lat >= 51.5 && lat <= 53.6) return { region: 'Ostdeutsches Tiefland', arid: 'trocken' }
  if (lat > 53.3 || lng < 7.3) return { region: 'Küste / Nordwesten', arid: 'feucht' }
  if (lng >= 11) return { region: 'Ostmitteldeutschland', arid: 'mäßig-trocken' }
  return { region: 'Mitteldeutschland / West', arid: 'mäßig' }
}

// Anwuchs-/Pflegehinweis je nach Trockenheit und Höhe.
export function wateringHint(arid, elev = 100) {
  if (arid === 'trocken')
    return 'Trockene, kontinentale Lage: in den ersten 2–3 Standjahren intensiv wässern (bei Hitze 1–2× pro Woche durchdringend), da Sommerniederschläge oft nicht ausreichen. Mulchen dringend empfohlen.'
  if (arid === 'mäßig-trocken')
    return 'Mäßig trockene Lage: erste 2 Jahre regelmäßig wässern, besonders in Trockenperioden; Mulchschicht hält Feuchte.'
  if (arid === 'feucht')
    return 'Niederschlagsreiche Lage: nur in ausgeprägten Trockenphasen im ersten Standjahr zusätzlich wässern. Auf gute Drainage achten.'
  return 'Erste 1–2 Jahre zur Anwuchspflege bei Trockenheit wässern; danach meist etabliert.'
}

// Komplettes Standort-Info-Paket (Höhe via API separat).
export function siteInfo(lat, lng, elev) {
  const cr = climateRegion(lat, lng)
  return {
    elevation: elev ?? null,
    zone: hardinessZone(lat, lng, elev ?? 100),
    region: cr.region,
    arid: cr.arid,
    wateringHint: wateringHint(cr.arid, elev ?? 100),
  }
}
