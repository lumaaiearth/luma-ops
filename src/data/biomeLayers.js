// BIOME™ Karten-Ebenen: Basiskarten + echte Open-Data-Overlays.
// Alle Endpunkte sind geprüft (GetCapabilities + GetMap in EPSG:3857, Juli 2026).
//
// Quellen:
//  · Berlin Umweltatlas / GDI Berlin  — https://gdi.berlin.de/services/wms/<dienst>
//    (Klimaanalyse 2022, Starkregengefahrenkarte, Versiegelung 2021, Grünvolumen 2020)
//  · DWD GeoServer                    — https://maps.dwd.de/geoserver/dwd/wms
//    (Niederschlagsradar, RADOLAN 24h-Summen, Jahresniederschlag)
//  · Copernicus / EEA                 — CORINE Land Cover 2018 (EU-weit)
//  · EOX Sentinel-2 cloudless         — https://s2maps.eu (Basiskarte)

/* ─── BASISKARTEN ────────────────────────────────────────────────────────── */
export const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  // Sentinel-2 cloudless (10 m, wolkenfrei zusammengesetzt) — echte ESA-Daten,
  // gut um Vegetationsstand/Versiegelung großflächig zu beurteilen.
  sentinel: {
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
    attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX</a> (2024) &copy; ESA/Copernicus',
    maxNativeZoom: 16,
    maxZoom: 22,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
}

/* ─── OVERLAY-KATEGORIEN ─────────────────────────────────────────────────── */
export const LAYER_CATS = [
  { id: 'hitze',  label: '🌡️ Hitze & Stadtklima',    color: '#f97316' },
  { id: 'wasser', label: '🌧️ Regen & Überflutung',   color: '#38bdf8' },
  { id: 'bio',    label: '🌿 Vegetation & Ökologie',  color: '#22EAA7' },
]

const GDI = 'https://gdi.berlin.de/services/wms'
const DWD = 'https://maps.dwd.de/geoserver/dwd/wms'
const CORINE = 'https://copernicus.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer'
const ATTR_BERLIN = '&copy; <a href="https://www.berlin.de/umweltatlas/">Umweltatlas Berlin</a> / GDI Berlin'
const ATTR_DWD = '&copy; <a href="https://www.dwd.de">DWD</a>'

export const OPEN_LAYERS = [
  /* ── Hitze & Stadtklima (Klimamodell Berlin 2022, 10-m-Raster) ─────────── */
  { id: 'uhi_nacht', label: 'Wärmeinseln (Nacht 4 Uhr)', color: '#f97316', cat: 'hitze', region: 'Berlin',
    desc: 'Lufttemperatur 4 Uhr nachts — zeigt, wo die Stadt nicht abkühlt (Urban-Heat-Island). Klimamodell Berlin 2022, 10-m-Raster.',
    wms: { url: GDI, layers: 'g_ua_lufttemp_raster_t2m_04h_2022', format: 'image/png', transparent: true, opacity: 0.62, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'hitze_tag', label: 'Hitze tagsüber (14 Uhr)', color: '#ef4444', cat: 'hitze', region: 'Berlin',
    desc: 'Lufttemperatur 14 Uhr an einem Sommertag — Hitze-Hotspots für Pflanzungen & Bewässerungsplanung.',
    wms: { url: GDI, layers: 'i_ua_lufttemp_raster_t2m_14h_2022', format: 'image/png', transparent: true, opacity: 0.62, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'pet_stress', label: 'Hitzestress (PET)', color: '#fb7185', cat: 'hitze', region: 'Berlin',
    desc: 'Physiologisch Äquivalente Temperatur — wo Hitze für Menschen gesundheitlich belastend wird. Argumentationsbasis für Entsiegelung & Grün.',
    wms: { url: GDI, layers: 'q_ua_pet_raster_2022', format: 'image/png', transparent: true, opacity: 0.62, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'kaltluft', label: 'Kaltluftströme', color: '#818cf8', cat: 'hitze', region: 'Berlin',
    desc: 'Kaltluftvolumenstrom 22 Uhr — welche Grünflächen die Stadt nachts kühlen. Diese Flächen freihalten!',
    wms: { url: GDI, layers: 'c_ua_kaltluftvol_raster_22h_2022', format: 'image/png', transparent: true, opacity: 0.6, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'versiegelung', label: 'Versiegelung 2021', color: '#a8a29e', cat: 'hitze', region: 'Berlin',
    desc: 'Versiegelungsgrad je Block (Umweltatlas 2021) — Treiber des Hitzeinsel-Effekts, Potenzialflächen für Entsiegelung.',
    wms: { url: GDI, layers: 'versieg2021', format: 'image/png', transparent: true, opacity: 0.6, version: '1.3.0', attribution: ATTR_BERLIN } },

  /* ── Regen & Überflutung ───────────────────────────────────────────────── */
  { id: 'regenradar', label: 'Regenradar (live)', color: '#38bdf8', cat: 'wasser', region: 'DE',
    desc: 'DWD-Niederschlagsradar, aktualisiert alle 5 Minuten — was gerade vom Himmel kommt.',
    refreshMs: 5 * 60_000,
    wms: { url: DWD, layers: 'dwd:Niederschlagsradar', format: 'image/png', transparent: true, opacity: 0.7, version: '1.3.0', attribution: ATTR_DWD } },
  { id: 'regen_24h', label: 'Niederschlag 24h', color: '#0ea5e9', cat: 'wasser', region: 'DE',
    desc: 'RADOLAN-Summen der letzten 24 Stunden (DWD) — wie viel Wasser wirklich angekommen ist. Ideal als Gieß-Entscheider.',
    wms: { url: DWD, layers: 'dwd:SF-Produkt', format: 'image/png', transparent: true, opacity: 0.68, version: '1.3.0', attribution: ATTR_DWD } },
  { id: 'srgk_selten', label: 'Starkregen: 10-jährlich', color: '#2dd4bf', cat: 'wasser', region: 'Berlin',
    desc: 'Wasserstände bei seltenem Starkregen (Starkregengefahrenkarte) — wo die Kanalisation zuerst überläuft.',
    wms: { url: GDI, layers: 'bb_wasserstand_selten', format: 'image/png', transparent: true, opacity: 0.65, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'srgk_extrem', label: 'Starkregen: Extremereignis', color: '#6366f1', cat: 'wasser', region: 'Berlin',
    desc: 'Überflutungs-Hotspots bei Extremregen (100 mm/h) — hier fehlt Infrastruktur: Flächen für Versickerung, Mulden, Regengärten.',
    wms: { url: GDI, layers: 'db_wassersand_extrem', format: 'image/png', transparent: true, opacity: 0.65, version: '1.3.0', attribution: ATTR_BERLIN } },

  /* ── Vegetation & Ökologie ─────────────────────────────────────────────── */
  { id: 'gruenvolumen', label: 'Grünvolumen', color: '#22c55e', cat: 'bio', region: 'Berlin',
    desc: 'Grünvolumenzahl 2020 (m³ Grün pro m²) — wie viel Vegetation ein Block wirklich trägt, nicht nur Fläche.',
    wms: { url: GDI, layers: 'a_gruenvol2020', format: 'image/png', transparent: true, opacity: 0.6, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'corine_vegetation', label: 'Wälder & Wiesen (EU)', color: '#22EAA7', cat: 'bio', region: 'EU',
    desc: 'Wälder, Wiesen, Heiden aus CORINE 2018 — Biodiversitätspotenzial, auch außerhalb Berlins.',
    wms: { url: CORINE, layers: '3', format: 'image/png', transparent: true, opacity: 0.6, version: '1.1.1', attribution: '&copy; Copernicus/EEA' } },
  { id: 'corine_water', label: 'Gewässer (EU)', color: '#60a5fa', cat: 'bio', region: 'EU',
    desc: 'Flüsse, Seen, Feuchtgebiete — Kühlkorridore im Stadtklima.',
    wms: { url: CORINE, layers: '4', format: 'image/png', transparent: true, opacity: 0.6, version: '1.1.1', attribution: '&copy; Copernicus/EEA' } },
]
