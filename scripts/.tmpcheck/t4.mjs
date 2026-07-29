import { readFileSync } from 'node:fs'
import { analyzeSun, prepareLod2 } from '/home/user/luma-ops/src/lib/solar.js'
for (const n of ['r95','k28']) {
  const patch=JSON.parse(readFileSync(`/home/user/luma-ops/public/lod2/${n}.json`,'utf8'))
  const {lat,lng}=patch.center
  let t=Date.now(); const prep=prepareLod2(lat+0.001,lng+0.001,patch); const tp=Date.now()-t
  t=Date.now(); const a=analyzeSun(lat+0.001,lng+0.001,[],[],{lod2Patch:patch}); const ta=Date.now()-t
  console.log(n,'Gebäude',patch.buildings.length,'Flächen gesamt',patch.buildings.reduce((s,b)=>s+b.faces.length,0),'-> relevante Flächen',prep.faces.length,'prepare',tp+'ms','analyzeSun',ta+'ms', 'sommer',a.seasons.sommer.sun)
}
