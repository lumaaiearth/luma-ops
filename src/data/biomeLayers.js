// BIOME™ Karten-Ebenen: Basiskarten + echte Open-Data-Overlays.
// Alle Endpunkte sind geprüft (GetCapabilities + GetMap in EPSG:3857 + Pixel-
// Check auf sichtbaren Inhalt, Juli 2026). CORINE/EEA wurde entfernt: der
// discomap-Dienst liefert über Berlin nur leere Kacheln (die nummerierten
// Layer sind fast alle Frankreich-Übersee-Gebiete).
//
// Quellen:
//  · Berlin Umweltatlas / GDI Berlin  — https://gdi.berlin.de/services/wms/<dienst>
//    (Klimaanalyse 2022, Starkregengefahrenkarte, Versiegelung 2021,
//     Grünvolumen 2020, Baumbestand)
//  · DWD GeoServer                    — https://maps.dwd.de/geoserver/dwd/wms
//    (Niederschlagsradar, RADOLAN 24h-Summen)
//  · EOX Sentinel-2 cloudless         — https://s2maps.eu (Basiskarte)

/* ─── BASISKARTEN ────────────────────────────────────────────────────────── */
// Ruhige helle bzw. dunkle Karte — auch für Klima-Steckbrief, 3D-Ansicht und
// Klima-Dashboard. Beide erlauben CORS (nötig fürs Zeichnen auf Canvas).
export const HELLE_KARTE_URL = 'https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_grau/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png'
export const DUNKLE_KARTE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

// Reihenfolge, Gruppen und Beschriftung der Auswahl (Ebenen-Panel, Seitenleiste).
// Alle Dienste geprüft am 2026-10-24 mit einer Kachel über Berlin bzw.
// Eberswalde (HTTP 200, Bildinhalt angesehen).
export const GRUNDKARTEN_GRUPPEN = [
  { id: 'luftbild', label: 'Luftbilder' },
  { id: 'karte',    label: 'Karten' },
  { id: 'topo',     label: 'Gelände & Topografie' },
]
export const GRUNDKARTEN = [
  { id: 'luftbild_berlin', gruppe: 'luftbild', label: 'Luftbild Berlin', kurz: 'Berlin 20 cm', hinweis: 'Amtliches TrueOrthophoto 2024, 20 cm — Kronen und Beete scharf bis Zoom 21. Nur Berlin.' },
  { id: 'luftbild_bb',     gruppe: 'luftbild', label: 'Luftbild Brandenburg', kurz: 'Brandenb. 20 cm', hinweis: 'Amtliches Orthophoto (DOP20) der LGB — Berlin und Brandenburg, z. B. Eberswalde.' },
  { id: 'satellite',       gruppe: 'luftbild', label: 'Satellit (Esri)', kurz: 'Satellit', hinweis: 'Esri World Imagery — weltweit, ab Zoom 19 nur hochgerechnet, Aufnahmedatum je Gebiet verschieden.' },
  { id: 'sentinel',        gruppe: 'luftbild', label: 'Sentinel-2', kurz: 'Sentinel', hinweis: 'ESA-Satellit, 10 m, wolkenfrei 2024 — Überblick, ab Zoom ~17 unscharf.' },
  { id: 'osm',             gruppe: 'karte', label: 'OpenStreetMap', kurz: 'OSM', hinweis: 'Straßen, Hausnummern, Wege, Bänke, Bäume — so detailliert wie die OSM-Community kartiert.' },
  { id: 'osm_de',          gruppe: 'karte', label: 'OpenStreetMap (deutscher Stil)', kurz: 'OSM DE', hinweis: 'OSM im vertrauten deutschen Kartenstil (openstreetmap.de).' },
  { id: 'basemap_de',      gruppe: 'karte', label: 'basemap.de (amtlich)', kurz: 'basemap.de', hinweis: 'Amtliche Webkarte des Bundes (BKG) aus ALKIS/ATKIS — Gebäude und Flurstücks-nahe Genauigkeit, ganz Deutschland.' },
  { id: 'k5_berlin',       gruppe: 'karte', label: 'Karte Berlin 1:5000', kurz: 'K5 Berlin', hinweis: 'Amtliche Stadtkarte 1:5000 (Geoportal Berlin) — Gebäude, Hausnummern, Straßennamen.' },
  { id: 'light',           gruppe: 'karte', label: 'Hell (grau, amtlich)', kurz: 'Hell', hinweis: 'basemap.de in Graustufen — ruhig, gut unter Klima-Ebenen.' },
  { id: 'dark',            gruppe: 'karte', label: 'Dunkel', kurz: 'Dunkel', hinweis: 'Esri Dark Gray — ruhige dunkle Karte, ab Zoom 17 unscharf.' },
  { id: 'opentopomap',     gruppe: 'topo', label: 'OpenTopoMap', kurz: 'OpenTopo', hinweis: 'Topografische Karte mit Höhenlinien und Geländeschummerung (OSM + SRTM), bis Zoom 17.' },
  { id: 'esri_topo',       gruppe: 'topo', label: 'Topografie (Esri)', kurz: 'Esri Topo', hinweis: 'Esri World Topographic Map — Relief, Gewässer, Wald.' },
]

export const TILES = {
  // Digitale farbige TrueOrthophotos 2024 (DOP20RGBI) — Geoportal Berlin.
  // Geprüft 2026-10-24: GetCapabilities 200, GetMap in EPSG:3857 liefert Bild.
  // TrueOrtho: Gebäude ohne Kippen, Kronen lagerichtig — für die Baumerfassung
  // deutlich besser als Esri. Außerhalb Berlins weiß.
  luftbild_berlin: {
    wms: true,
    url: 'https://gdi.berlin.de/services/wms/truedop_2024',
    layers: 'truedop_2024',
    format: 'image/jpeg',
    attribution: '&copy; <a href="https://www.berlin.de/sen/sbw/stadtdaten/geoportal/">Geoportal Berlin</a> / TrueDOP 2024 (dl-de/zero-2-0)',
    maxNativeZoom: 21,
    maxZoom: 22,
  },
  // OpenStreetMap-Standardkarte. Nutzungsbedingungen: Namensnennung (unten
  // rechts), keine Massenabrufe — für eine interne Fachanwendung in Ordnung.
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  // Orthophoto Berlin/Brandenburg (DOP20, LGB). dl-de/by-2.0.
  luftbild_bb: {
    wms: true,
    url: 'https://isk.geobasis-bb.de/mapproxy/dop20c/service/wms',
    layers: 'bebb_dop20c',
    format: 'image/jpeg',
    attribution: '&copy; GeoBasis-DE/LGB (dl-de/by-2-0)',
    maxNativeZoom: 21,
    maxZoom: 22,
  },
  osm_de: {
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, Stil: openstreetmap.de',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  // basemap.de Web-Raster (BKG) — dl-de/by-2.0
  basemap_de: {
    url: 'https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png',
    attribution: '&copy; <a href="https://basemap.de">basemap.de</a> / BKG (dl-de/by-2-0)',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  k5_berlin: {
    wms: true,
    url: 'https://gdi.berlin.de/services/wms/k5_farbe',
    layers: 'k5_farbe',
    format: 'image/png',
    attribution: '&copy; Geoportal Berlin / K5 (dl-de/zero-2-0)',
    maxNativeZoom: 21,
    maxZoom: 22,
  },
  opentopomap: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Karte: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), Daten: &copy; OpenStreetMap-Mitwirkende, SRTM',
    maxNativeZoom: 17,
    maxZoom: 22,
  },
  esri_topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a> and contributors',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  // Sentinel-2 cloudless (10 m, wolkenfrei zusammengesetzt) — echte ESA-Daten.
  // Ab Zoom ~17 naturgemäß unscharf (10-m-Auflösung) → Überblick, kein Detail.
  sentinel: {
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
    attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX</a> (2024) &copy; ESA/Copernicus',
    maxNativeZoom: 16,
    maxZoom: 22,
  },
  // „Hell“ und „Dunkel“ kamen bis 2026-10 von CARTO. CARTO verlangt inzwischen
  // einen API-Schlüssel und liefert ohne ihn auf JEDER Zoomstufe nur noch das
  // Wasserzeichen „API KEY REQUIRED“ — beide Karten waren damit unbrauchbar.
  dark: {
    url: DUNKLE_KARTE_URL,
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap-Mitwirkende',
    maxNativeZoom: 16,   // höher liefert Esri nur Platzhalter
    maxZoom: 22,
  },
  light: {
    url: HELLE_KARTE_URL,
    attribution: '&copy; <a href="https://basemap.de">basemap.de</a> / BKG (dl-de/by-2-0)',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
}

/* ─── OVERLAY-KATEGORIEN ─────────────────────────────────────────────────── */
export const LAYER_CATS = [
  { id: 'hitze',  label: '🌡️ Hitze & Stadtklima',    color: '#f97316' },
  { id: 'wasser', label: '🌧️ Regen & Überflutung',   color: '#38bdf8' },
  { id: 'bio',    label: '🌿 Vegetation & Ökologie',  color: '#22EAA7' },
  { id: 'kataster', label: '🗺️ Grenzen & Kataster',  color: '#93c5fd' },
  { id: 'gelaende', label: '⛰️ Gelände & Beschriftung', color: '#d6b98c' },
]

// Wichtig: jeder GDI-Berlin-Dienst hat einen eigenen Pfad (…/wms/<dienst>) —
// der Root-Pfad allein liefert 404 und damit unsichtbare Kacheln.
const GDI = 'https://gdi.berlin.de/services/wms'
const DWD = 'https://maps.dwd.de/geoserver/dwd/wms'
const ATTR_BERLIN = '&copy; <a href="https://www.berlin.de/umweltatlas/">Umweltatlas Berlin</a> / GDI Berlin'
const ATTR_DWD = '&copy; <a href="https://www.dwd.de">DWD</a>'

export const OPEN_LAYERS = [
  /* ── Hitze & Stadtklima (Klimamodell Berlin 2022, 10-m-Raster) ─────────── */
  { id: 'sonnen_heatmap', label: 'Sonnen-Heatmap', color: '#fbbf24', cat: 'hitze', region: 'Projekte',
    custom: 'lod2-heatmap',
    desc: 'Eigene Simulation: direkte Sonnenstunden im 4-m-Raster (Jahreszeit unten wählbar) aus LoD2-Dachmodell + Baumkataster (dunkelblau = dauerbeschattet, gelb = vollsonnig). Verfügbar in den Projektgebieten.' },
  { id: 'uhi_nacht', label: 'Wärmeinseln (Nacht 4 Uhr)', color: '#f97316', cat: 'hitze', region: 'Berlin',
    desc: 'Lufttemperatur 4 Uhr nachts — zeigt, wo die Stadt nicht abkühlt (Urban-Heat-Island). Klimamodell Berlin 2022, 10-m-Raster.',
    wms: { url: `${GDI}/ua_klimaanalyse_2022`, layers: 'g_ua_lufttemp_raster_t2m_04h_2022', format: 'image/png', transparent: true, opacity: 0.62, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'hitze_tag', label: 'Hitze tagsüber (14 Uhr)', color: '#ef4444', cat: 'hitze', region: 'Berlin',
    desc: 'Lufttemperatur 14 Uhr an einem Sommertag — Hitze-Hotspots für Pflanzungen & Bewässerungsplanung.',
    wms: { url: `${GDI}/ua_klimaanalyse_2022`, layers: 'i_ua_lufttemp_raster_t2m_14h_2022', format: 'image/png', transparent: true, opacity: 0.62, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'pet_stress', label: 'Hitzestress (PET)', color: '#fb7185', cat: 'hitze', region: 'Berlin',
    desc: 'Physiologisch Äquivalente Temperatur — wo Hitze für Menschen gesundheitlich belastend wird. Argumentationsbasis für Entsiegelung & Grün.',
    wms: { url: `${GDI}/ua_klimaanalyse_2022`, layers: 'q_ua_pet_raster_2022', format: 'image/png', transparent: true, opacity: 0.62, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'kaltluft', label: 'Kaltluftströme', color: '#818cf8', cat: 'hitze', region: 'Berlin',
    desc: 'Kaltluftvolumenstrom 22 Uhr — welche Grünflächen die Stadt nachts kühlen. Diese Flächen freihalten!',
    wms: { url: `${GDI}/ua_klimaanalyse_2022`, layers: 'c_ua_kaltluftvol_raster_22h_2022', format: 'image/png', transparent: true, opacity: 0.6, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'versiegelung', label: 'Versiegelung 2021', color: '#a8a29e', cat: 'hitze', region: 'Berlin',
    desc: 'Versiegelungsgrad je Block (Umweltatlas 2021) — Treiber des Hitzeinsel-Effekts, Potenzialflächen für Entsiegelung.',
    wms: { url: `${GDI}/ua_versiegelung_2021`, layers: 'versieg2021', format: 'image/png', transparent: true, opacity: 0.6, version: '1.3.0', attribution: ATTR_BERLIN } },

  /* ── Regen & Überflutung ───────────────────────────────────────────────── */
  { id: 'regenradar', label: 'Regenradar (live)', color: '#38bdf8', cat: 'wasser', region: 'DE',
    desc: 'DWD-Niederschlagsradar (5-Minuten-Takt) — nur sichtbar, wenn es gerade irgendwo regnet.',
    wms: { url: DWD, layers: 'dwd:Niederschlagsradar', format: 'image/png', transparent: true, opacity: 0.7, version: '1.3.0', attribution: ATTR_DWD } },
  { id: 'regen_24h', label: 'Niederschlag 24h', color: '#0ea5e9', cat: 'wasser', region: 'DE',
    desc: 'RADOLAN-Summen der letzten 24 Stunden (DWD) — wie viel Wasser wirklich angekommen ist. Ideal als Gieß-Entscheider.',
    wms: { url: DWD, layers: 'dwd:SF-Produkt', format: 'image/png', transparent: true, opacity: 0.68, version: '1.3.0', attribution: ATTR_DWD } },
  { id: 'srgk_selten', label: 'Starkregen: 10-jährlich', color: '#2dd4bf', cat: 'wasser', region: 'Berlin',
    desc: 'Wasserstände bei seltenem Starkregen — wo die Kanalisation zuerst überläuft. Detailkarte 1:5.000: erst ab Zoomstufe ~17 sichtbar (nah heranzoomen).',
    minZoom: 17,
    wms: { url: `${GDI}/ua_srgk`, layers: 'bb_wasserstand_selten', format: 'image/png', transparent: true, opacity: 0.65, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'srgk_extrem', label: 'Starkregen: Extremereignis', color: '#6366f1', cat: 'wasser', region: 'Berlin',
    desc: 'Überflutungs-Hotspots bei Extremregen — hier fehlt Infrastruktur: Flächen für Versickerung, Mulden, Regengärten. Detailkarte 1:5.000: erst ab Zoomstufe ~17 sichtbar.',
    minZoom: 17,
    wms: { url: `${GDI}/ua_srgk`, layers: 'db_wassersand_extrem', format: 'image/png', transparent: true, opacity: 0.65, version: '1.3.0', attribution: ATTR_BERLIN } },

  /* ── Vegetation & Ökologie ─────────────────────────────────────────────── */
  { id: 'gruenvolumen', label: 'Grünvolumen', color: '#22c55e', cat: 'bio', region: 'Berlin',
    desc: 'Grünvolumenzahl 2020 (m³ Grün pro m²) — wie viel Vegetation ein Block wirklich trägt, nicht nur Fläche.',
    wms: { url: `${GDI}/ua_gruenvolumen_2020`, layers: 'a_gruenvol2020', format: 'image/png', transparent: true, opacity: 0.6, version: '1.3.0', attribution: ATTR_BERLIN } },
  { id: 'baumbestand', label: 'Baumkataster Berlin', color: '#4ade80', cat: 'bio', region: 'Berlin',
    desc: 'Straßen- & Anlagenbäume des Landes Berlin (amtliches Baumkataster) — Abgleich mit eigenen BIOME-Bäumen. Ab Zoomstufe ~14 sinnvoll.',
    minZoom: 14,
    wms: { url: `${GDI}/baumbestand`, layers: 'strassenbaeume,anlagenbaeume', format: 'image/png', transparent: true, opacity: 0.85, version: '1.3.0', attribution: ATTR_BERLIN } },

  /* ── Grenzen & Kataster ────────────────────────────────────────────────── */
  // Geprüft 2026-10-24: GetMap in EPSG:3857 liefert die Flurstücksgrenzen.
  { id: 'flurstuecke', label: 'Flurstücke (ALKIS)', color: '#93c5fd', cat: 'kataster', region: 'Berlin',
    desc: 'Amtliche Flurstücksgrenzen — wem gehört welche Fläche, wo endet das Grundstück. Ab Zoomstufe ~16 sinnvoll.',
    minZoom: 15,
    wms: { url: `${GDI}/alkis_flurstuecke`, layers: 'flurstuecke', format: 'image/png', transparent: true, opacity: 0.9, version: '1.3.0', attribution: '&copy; Geoportal Berlin / ALKIS' } },

  /* ── Gelände & Beschriftung ────────────────────────────────────────────── */
  // Geprüft 2026-10-24: Unterebenen a_/b_ liefern Bilder, der Gruppenname nicht.
  { id: 'hoehenlinien', label: 'Höhenlinien (DGM1)', color: '#d6b98c', cat: 'gelaende', region: 'Berlin',
    desc: 'Höhenlinien aus dem amtlichen Geländemodell (1 m) — Mulden, Senken, wohin Regenwasser fließt.',
    minZoom: 15,
    wms: { url: `${GDI}/dgm1_schummerung`, layers: 'a_dgm1_hoehenlinien', format: 'image/png', transparent: true, opacity: 0.85, version: '1.3.0', attribution: '&copy; Geoportal Berlin / ATKIS DGM' } },
  { id: 'schummerung', label: 'Geländeschummerung', color: '#a8a29e', cat: 'gelaende', region: 'Berlin',
    desc: 'Schattiertes Relief aus dem DGM1 — macht Böschungen, Wälle und Senken sichtbar. Berlin ist flach, der Effekt ist dezent.',
    wms: { url: `${GDI}/dgm1_schummerung`, layers: 'b_dgm1_schummerung', format: 'image/png', transparent: true, opacity: 0.45, version: '1.3.0', attribution: '&copy; Geoportal Berlin / ATKIS DGM' } },
  { id: 'beschriftung', label: 'Straßen- & Ortsnamen', color: '#e5e7eb', cat: 'gelaende', region: 'Welt',
    desc: 'Straßen mit Namen — legt die Orientierung über ein Luftbild.',
    tiles: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap-Mitwirkende', maxNativeZoom: 19 } },
]
