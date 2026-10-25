// Regressionstest für src/lib/geotiffImport.js
//
//   node scripts/test-geotiff-import.mjs
//
// Baut kleine GeoTIFFs mit geotiff.js selbst (in WGS84 und in UTM 33) und
// prüft, dass Lage und Pixel richtig herauskommen.
import { writeArrayBuffer } from 'geotiff'
import { epsgAusGeoKeys, nachWgs84, eckenNachWgs84, leseGeoTiff } from '../src/lib/geotiffImport.js'

let ok = 0, fehler = 0
function pruefe(b, text) { if (b) { ok++; console.log(`  ok  ${text}`) } else { fehler++; console.log(`  FEHLER  ${text}`) } }
const nahe = (a, b, tol) => Math.abs(a - b) <= tol

pruefe(epsgAusGeoKeys({ ProjectedCSTypeGeoKey: 25833, GeographicTypeGeoKey: 4258 }) === 25833, 'projiziertes System hat Vorrang')
pruefe(epsgAusGeoKeys({ GeographicTypeGeoKey: 4326 }) === 4326, 'geographisches System erkannt')
pruefe(epsgAusGeoKeys({ ProjectedCSTypeGeoKey: 32767 }) === null, 'benutzerdefiniert (32767) → nicht bestimmbar')

// Ein Kasten von 300 m × 200 m in UTM 33 bei der Siegessäule (≈ 52,5145° N, 13,3502° E).
// Rückrechnung muss in Berlin landen und die Ausdehnung grob stimmen.
const utm = nachWgs84([387300, 5819800, 387600, 5820000], 25833)
// Nur der grobe Rahmen ist hier belegbar (Berlin liegt zwischen 52,3–52,7° N und
// 13,0–13,8° O) — die genaue Rechnung ist die von proj4.
pruefe(utm && utm.south > 52.3 && utm.north < 52.7 && utm.west > 13.0 && utm.east < 13.8, `UTM 33 → WGS84 landet in Berlin (${utm && utm.south.toFixed(4)}, ${utm && utm.west.toFixed(4)})`)
pruefe(utm && nahe((utm.east - utm.west) * 111320 * Math.cos(52.51 * Math.PI / 180), 300, 15), 'Breite ≈ 300 m bleibt erhalten')
pruefe(utm && nahe((utm.north - utm.south) * 111320, 200, 15), 'Höhe ≈ 200 m bleibt erhalten')
pruefe(nachWgs84([1, 2, 3, 4], 99999) === null, 'unbekanntes Bezugssystem → null statt geraten')

// Echtes kleines GeoTIFF in UTM 33: 4 × 2 Pixel, RGB
const w = 4, h = 2
// flach und verschachtelt (RGBRGB…), so erwartet es writeArrayBuffer
const pixel = Array.from({ length: w * h }, () => [200, 100, 50]).flat()
const tifUtm = await writeArrayBuffer(pixel, {
  width: w, height: h, BitsPerSample: [8, 8, 8], SamplesPerPixel: 3, PhotometricInterpretation: 2,
  ModelPixelScale: [75, 100, 0], ModelTiepoint: [0, 0, 0, 387300, 5820000, 0],
  ProjectedCSTypeGeoKey: 25833, GTModelTypeGeoKey: 1, GTRasterTypeGeoKey: 1,
})
const ergUtm = await leseGeoTiff(tifUtm)
pruefe(!ergUtm.fehler && ergUtm.epsg === 25833, `GeoTIFF in UTM 33 wird gelesen${ergUtm.fehler ? ': ' + ergUtm.fehler : ''}`)
pruefe(ergUtm.bounds && nahe(ergUtm.bounds.south, utm.south, 0.001) && nahe(ergUtm.bounds.west, utm.west, 0.001), 'Lage des UTM-GeoTIFF stimmt mit der Umrechnung des Kastens überein')
pruefe(ergUtm.rgba && ergUtm.rgba.length === w * h * 4 && ergUtm.rgba[0] === 200 && ergUtm.rgba[1] === 100 && ergUtm.rgba[3] === 255, 'Pixel kommen als RGBA an (deckend)')

// Ecken einzeln: das UTM-Raster ist in WGS84 gedreht (Meridiankonvergenz ~1°)
const ek = ergUtm.ecken
pruefe(Array.isArray(ek) && ek.length === 4, 'GeoTIFF liefert vier Bildecken')
const drehung = ek && Math.atan2(ek[1][1] - ek[0][1], (ek[1][0] - ek[0][0]) * Math.cos(52.51 * Math.PI / 180)) * 180 / Math.PI
pruefe(ek && Math.abs(drehung) > 0.5 && Math.abs(drehung) < 2, `Oberkante gegenüber Ost gedreht (${drehung?.toFixed(2)}°) — achsparallel wäre falsch`)
pruefe(ek && ek.every(p => p[0] >= ergUtm.bounds.west - 1e-9 && p[0] <= ergUtm.bounds.east + 1e-9 && p[1] >= ergUtm.bounds.south - 1e-9 && p[1] <= ergUtm.bounds.north + 1e-9), 'alle Ecken liegen im Umrisskasten')
const ekWgs = eckenNachWgs84([13, 52, 14, 53], 4326)
pruefe(JSON.stringify(ekWgs) === JSON.stringify([[13, 53], [14, 53], [14, 52], [13, 52]]), 'WGS84: Ecken ol, or, ur, ul unverändert')

const tifWgs = await writeArrayBuffer(pixel, {
  width: w, height: h, BitsPerSample: [8, 8, 8], SamplesPerPixel: 3, PhotometricInterpretation: 2,
  ModelPixelScale: [0.001, 0.001, 0], ModelTiepoint: [0, 0, 0, 13.35, 52.52, 0],
  GeographicTypeGeoKey: 4326, GTModelTypeGeoKey: 2, GTRasterTypeGeoKey: 1,
})
const ergWgs = await leseGeoTiff(tifWgs)
pruefe(!ergWgs.fehler && nahe(ergWgs.bounds.west, 13.35, 1e-6) && nahe(ergWgs.bounds.north, 52.52, 1e-6), 'GeoTIFF in WGS84 wird unverändert übernommen')

console.log(`\n═══ GeoTIFF-Import: ${ok} bestanden, ${fehler} fehlgeschlagen ═══`)
process.exit(fehler ? 1 : 0)
