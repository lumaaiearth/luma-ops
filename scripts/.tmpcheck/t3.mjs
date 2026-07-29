// Heatmap-Verfahren (ohne Bäume) nachbauen und mit solar.js an denselben Punkten vergleichen
import { readFileSync } from 'node:fs'
import * as suncalcNs from 'suncalc'
import { analyzeSun } from '/home/user/luma-ops/src/lib/solar.js'
const SunCalc = suncalcNs.default || suncalcNs
const CELL=4, STEP_MIN=10, OBSERVER_H=0.5
const patch=JSON.parse(readFileSync('/home/user/luma-ops/public/lod2/r95.json','utf8'))
const clat=patch.center.lat, clng=patch.center.lng
const R=(patch.radius||350)-10
const kx=111320*Math.cos(clat*Math.PI/180), ky=111320
const toXY=(lo,la)=>[(lo-clng)*kx,(la-clat)*ky]
const faces=[],grounds=[]
for(const b of patch.buildings) for(const f of b.faces){
  const pts=f.pts.map(([lo,la,z])=>{const [x,y]=toXY(lo,la);return [x,y,z]})
  if(f.t==='g') grounds.push(pts); else faces.push(pts)
}
const W=Math.ceil(2*R/CELL),H=W,originX=-R,originY=-R
function stampPolygon(buf,pts,value){
  let minY=Infinity,maxY=-Infinity
  for(const [,y] of pts){if(y<minY)minY=y;if(y>maxY)maxY=y}
  const j0=Math.max(0,Math.floor((minY-originY)/CELL)), j1=Math.min(H-1,Math.ceil((maxY-originY)/CELL))
  for(let j=j0;j<=j1;j++){
    const y=originY+(j+0.5)*CELL
    const xs=[]
    for(let a=0,b=pts.length-1;a<pts.length;b=a++){
      const [xa,ya]=pts[a],[xb,yb]=pts[b]
      if((ya>y)!==(yb>y)) xs.push(xa+((y-ya)/(yb-ya))*(xb-xa))
    }
    xs.sort((p,q)=>p-q)
    for(let k=0;k+1<xs.length;k+=2){
      const i0=Math.max(0,Math.ceil((xs[k]-originX)/CELL-0.5)), i1=Math.min(W-1,Math.floor((xs[k+1]-originX)/CELL-0.5))
      for(let i=i0;i<=i1;i++) buf[j*W+i]|=value
    }
  }
}
const mask=new Uint8Array(W*H)
for(const g of grounds) stampPolygon(mask,g.map(([x,y])=>[x,y]),1)
const year=new Date().getFullYear()
const day=new Date(year,5,21,12)
const times=SunCalc.getTimes(day,clat,clng)
const steps=[]
for(let ts=times.sunrise.getTime();ts<=times.sunset.getTime();ts+=STEP_MIN*60000){
  const pos=SunCalc.getPosition(new Date(ts),clat,clng); if(pos.altitude>0.005) steps.push(pos)
}
const shade=new Float32Array(W*H)
const stampB=new Uint8Array(W*H)
for(const pos of steps){
  stampB.fill(0)
  const bearing=pos.azimuth+Math.PI, bx=Math.sin(bearing), by=Math.cos(bearing)
  const perH=1/Math.tan(pos.altitude)
  for(const pts of faces){
    const proj=pts.map(([x,y,z])=>{const d=Math.max(0,z-OBSERVER_H)*perH; return [x-bx*d,y-by*d]})
    stampPolygon(stampB,[...pts.map(([x,y])=>[x,y]),...proj.reverse()],1)
  }
  for(let i=0;i<shade.length;i++) if(stampB[i]) shade[i]+=1
}
const maxHours=steps.length*STEP_MIN/60
console.log('maxHours',maxHours,'W',W)
// Stichproben: unmaskierte Zellen mit unterschiedlichem Schattenanteil
let rows=[]
for(let j=5;j<H-5;j+=17) for(let i=5;i<W-5;i+=17){
  const idx=j*W+i
  if(mask[idx]) continue
  const x=originX+(i+0.5)*CELL, y=originY+(j+0.5)*CELL
  const lat=clat+y/ky, lng=clng+x/kx
  if(Math.hypot(x,y)>R-40) continue
  const hHeat=(steps.length-shade[idx])*STEP_MIN/60
  const a=analyzeSun(lat,lng,[],[],{lod2Patch:patch})
  rows.push({lat:lat.toFixed(6),lng:lng.toFixed(6),heat:+hHeat.toFixed(1),solar:a.seasons.sommer.sun,onB:a.on_building,d:+(hHeat-a.seasons.sommer.sun).toFixed(1)})
}
rows=rows.filter(r=>!r.onB)
console.log('n=',rows.length)
const diffs=rows.map(r=>r.d)
const mean=diffs.reduce((a,b)=>a+b,0)/diffs.length
console.log('mean diff (heat - solar):',mean.toFixed(2),'min',Math.min(...diffs),'max',Math.max(...diffs))
console.log('|diff|>1h:',diffs.filter(d=>Math.abs(d)>1).length, ' |diff|>2h:',diffs.filter(d=>Math.abs(d)>2).length)
rows.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d))
console.log(rows.slice(0,12))
