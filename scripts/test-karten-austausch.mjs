// Regressionstest für src/lib/kartenAustausch.js
//
//   node scripts/test-karten-austausch.mjs
import { dateiEinlesen, alsGeoJSON, alsCSV } from '../src/lib/kartenAustausch.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }
const nah = (a, b, eps = 1e-5) => Math.abs(a - b) < eps

// GeoJSON: Polygon ohne Typ → Beet, Punkt mit Baumart → Baum, MultiPolygon zerlegt
const gj = JSON.stringify({ type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { name: 'Staudenbeet' }, geometry: { type: 'Polygon', coordinates: [[[13.377, 52.516], [13.378, 52.516], [13.378, 52.517], [13.377, 52.516]]] } },
  { type: 'Feature', properties: { art_dtsch: 'Winter-Linde', art_bot: 'Tilia cordata', baumid: '00008100:000c1b29', stammumfg: '157', pflanzjahr: 1985 }, geometry: { type: 'Point', coordinates: [13.3781, 52.5163, 34.2] } },
  { type: 'Feature', properties: { typ: 'area' }, geometry: { type: 'MultiPolygon', coordinates: [
    [[[13.37, 52.51], [13.371, 52.51], [13.371, 52.511], [13.37, 52.51]]],
    [[[13.38, 52.51], [13.381, 52.51], [13.381, 52.511], [13.38, 52.51]]] ] } },
  { type: 'Feature', properties: {}, geometry: null },
] })
const a = dateiEinlesen(gj, 'baeume.geojson')
pruefe(a.format === 'geojson' && a.objekte.length === 4, `GeoJSON: 4 Objekte (MultiPolygon zerlegt), ${a.objekte.length} gelesen`)
pruefe(a.objekte[0].feature_type === 'bed' && a.objekte[0].label === 'Staudenbeet', 'Polygon ohne Typ → Beet, Name → Bezeichnung')
const baum = a.objekte[1]
pruefe(baum.feature_type === 'tree' && baum.properties.baumart_deutsch === 'Winter-Linde' && baum.properties.baumart_latein === 'Tilia cordata', 'Baumkataster-Felder (art_dtsch/art_bot) → Baumart')
pruefe(baum.properties.stammumfang_cm === 157 && baum.properties.baumnummer === '00008100:000c1b29' && baum.label === '00008100:000c1b29', 'Stammumfang als Zahl, Baum-ID als Nummer und Bezeichnung')
pruefe(baum.geometry.coordinates.length === 2, 'Höhe (3. Koordinate) wird verworfen')
pruefe(a.objekte[2].feature_type === 'area' && a.objekte[3].feature_type === 'area', 'angegebener Typ „area“ gilt für beide Teile')
pruefe(a.fehler.length === 1, 'Objekt ohne Geometrie wird gemeldet, nicht still verschluckt')
pruefe(dateiEinlesen(gj, 'x.json', { flaechenTyp: 'area' }).objekte[0].feature_type === 'area', 'Flächentyp für Polygone wählbar')

// KML
const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<Placemark><name>Eiche &amp; Co</name><ExtendedData><Data name="Baumnummer"><value>B-17</value></Data></ExtendedData>
<Point><coordinates>13.4245,52.4875,0</coordinates></Point></Placemark>
<Placemark><name><![CDATA[Wiese Süd]]></name><Polygon><outerBoundaryIs><LinearRing><coordinates>
13.42,52.48,0 13.43,52.48,0 13.43,52.49,0 13.42,52.49,0 13.42,52.48,0
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
<Placemark><name>Weg</name><LineString><coordinates>13.42,52.48 13.43,52.49</coordinates></LineString></Placemark>
</Document></kml>`
const k = dateiEinlesen(kml, 'export.kml')
pruefe(k.objekte.length === 3 && k.fehler.length === 0, 'KML: Punkt, Polygon, Linie gelesen')
pruefe(k.objekte[0].feature_type === 'tree' && k.objekte[0].label === 'Eiche & Co' && k.objekte[0].properties.baumnummer === 'B-17', 'KML-Punkt mit Baumnummer (ExtendedData) → Baum, Entities aufgelöst')
pruefe(k.objekte[1].label === 'Wiese Süd' && k.objekte[1].geometry.coordinates[0].length === 5, 'CDATA-Name, Ring vollständig')
pruefe(k.objekte[2].feature_type === 'line', 'LineString → Linie')

// CSV deutsch (Semikolon, Dezimalkomma)
const csv = '\uFEFFNr;Baumart;Breite;Länge;Höhe;Bemerkung\r\n1;Spitz-Ahorn;52,5163;13,3781;12,5;"am Zaun; schief"\r\n2;Hainbuche;;;;\r\n'
const c = dateiEinlesen(csv, 'baumliste.csv')
pruefe(c.objekte.length === 1 && c.fehler.length === 1 && /Zeile 3/.test(c.fehler[0]), 'CSV: Zeile ohne Koordinaten wird mit Zeilennummer gemeldet')
const c0 = c.objekte[0]
pruefe(c0.feature_type === 'tree' && nah(c0.geometry.coordinates[1], 52.5163) && nah(c0.geometry.coordinates[0], 13.3781), 'Dezimalkomma, Breite/Länge richtig herum')
pruefe(c0.properties.baumhoehe_m === 12.5 && c0.properties.notizen === 'am Zaun; schief' && c0.properties.baumnummer === '1', 'Höhe als Zahl, Anführungszeichen mit Semikolon, Nr → Baumnummer')

// CSV in UTM 33 (Berliner Baumkataster: Rechts-/Hochwert)
const utm = 'baumnummer,art,x,y\nB-1,Linde,389420.5,5819390.2\nB-2,Eiche,33389420.5,5819390.2\n'
const u = dateiEinlesen(utm, 'kataster.csv')
pruefe(u.objekte.length === 2 && u.objekte.every(o => nah(o.geometry.coordinates[1], 52.516, 0.01) && nah(o.geometry.coordinates[0], 13.377, 0.01)),
  `UTM 33 (auch mit Zonenvorsatz) → WGS84 in Berlin-Mitte (${u.objekte[0]?.geometry.coordinates.map(v => v.toFixed(4))})`)
pruefe(dateiEinlesen('a;b\n1;2\n', 'x.csv').fehler[0]?.startsWith('Keine Koordinatenspalten'), 'CSV ohne Koordinatenspalten → verständlicher Hinweis')
pruefe(dateiEinlesen('{kaputt', 'x.geojson').fehler[0]?.startsWith('Datei nicht lesbar'), 'kaputtes JSON → Fehler statt Absturz')

// Export
const feats = [
  { id: 'f1', project_id: 'p1', feature_type: 'area', label: 'Fläche; Nord', geometry: { type: 'Polygon', coordinates: [[[13.3768, 52.5158], [13.3786, 52.5158], [13.3786, 52.5168], [13.3768, 52.5168], [13.3768, 52.5158]]] }, properties: { area_m2: 1, photos: ['x'] } },
  { id: 'f2', project_id: 'p1', feature_type: 'tree', label: 'B-0001', geometry: { type: 'Point', coordinates: [13.3781, 52.5163] }, properties: { baumnummer: 'B-0001', stammumfang_cm: 157.5, sonnenanalyse: { a: 1 } } },
  { id: 'f3', project_id: 'p1', feature_type: 'drone_image', geometry: { type: 'Polygon', coordinates: [] }, properties: {} },
]
const projekte = [{ id: 'p1', name: 'Testfläche Nord' }]
const g = alsGeoJSON(feats, projekte)
pruefe(g.features.length === 2, 'GeoJSON-Export: Luftbilder bleiben draußen')
pruefe(g.features[0].properties.projekt === 'Testfläche Nord' && g.features[0].properties.flaeche_m2 > 1000 && !('photos' in g.features[0].properties) && !('area_m2' in g.features[0].properties),
  'Projektname, Fläche aus der Geometrie (nicht der gespeicherte Altwert), keine Fotos')
const zurueck = dateiEinlesen(JSON.stringify(g), 'export.geojson')
pruefe(zurueck.objekte.map(o => o.feature_type).join() === 'area,tree' && zurueck.objekte[1].properties.stammumfang_cm === 157.5, 'Export → Import ergibt dieselben Typen und Werte')
const csvOut = alsCSV(feats, projekte)
const zeilen = csvOut.replace(/^\uFEFF/, '').trim().split('\r\n')
pruefe(zeilen.length === 3 && zeilen[0].startsWith('id;typ;bezeichnung;projekt;breite;laenge'), 'CSV-Export: Kopf + 2 Zeilen')
pruefe(zeilen[1].includes('"Fläche; Nord"') && zeilen[2].includes('157,5') && !csvOut.includes('sonnenanalyse'), 'Semikolon im Text gequotet, Dezimalkomma, keine Analyseobjekte')
const csvZurueck = dateiEinlesen(csvOut, 'export.csv')
pruefe(csvZurueck.objekte.length === 2 && csvZurueck.objekte[1].properties.baumnummer === 'B-0001', 'CSV-Export lässt sich wieder einlesen')

console.log(`\n═══ Karten-Austausch: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
