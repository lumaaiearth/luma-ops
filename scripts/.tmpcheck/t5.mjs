import { geomMeasures, geometryCentroid } from '/home/user/luma-ops/src/lib/geo.js'
const lat0=52.52, lng0=13.40
const kx=111320*Math.cos(lat0*Math.PI/180), ky=111320
const P=(x,y)=>[lng0+x/kx, lat0+y/ky]
// Rechteck 20 x 10 m, GeoJSON-konform geschlossen
const rect={type:'Polygon',coordinates:[[P(0,0),P(20,0),P(20,10),P(0,10),P(0,0)]]}
const m=geomMeasures(rect)
const c=m.centroid
console.log('Rechteck 20x10: Fläche',m.area_m2.toFixed(1),'Umfang',m.perimeter_m.toFixed(1))
console.log('  Schwerpunkt-Versatz gegenüber echter Mitte:',
  (((c.lng-lng0)*kx)-10).toFixed(2),'m Ost /',(((c.lat-lat0)*ky)-5).toFixed(2),'m Nord')
// Beet mit Teich (Loch)
const holed={type:'Polygon',coordinates:[[P(0,0),P(20,0),P(20,10),P(0,10),P(0,0)],[P(5,3),P(15,3),P(15,7),P(5,7),P(5,3)]]}
console.log('Beet 200 m2 mit 40-m2-Teich -> gemeldete Fläche',geomMeasures(holed).area_m2.toFixed(1),'m2 (richtig waeren 160)')
// MultiPolygon: zwei Teilflaechen, eine fein digitalisiert
const fine=[]; for(let i=0;i<=40;i++) fine.push(P(0+ i*0.25, 0))
const polyA=[[...fine, P(10,5), P(0,5), P(0,0)]]
const polyB=[[P(100,100),P(110,100),P(110,110),P(100,110),P(100,100)]]
const mp={type:'MultiPolygon',coordinates:[polyA,polyB]}
const cm=geometryCentroid(mp)
console.log('MultiPolygon-Schwerpunkt (m):',(((cm.lng-lng0)*kx)).toFixed(1),(((cm.lat-lat0)*ky)).toFixed(1),'— flaechengewichtet waere ca. 55/55')
