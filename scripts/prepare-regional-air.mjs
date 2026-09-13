import fs from 'node:fs';
import {createAirGrid,airMovementGrid,sampleAirMovement,AIR_BOUNDS} from '../src/regional-air-model.js';
import {advancePath} from '../src/currents-model.js';
import {terrainSampler} from '../src/network-terrain.js';
const source=JSON.parse(fs.readFileSync(new URL('../data/raw/wind-audit/full-candidates.json',import.meta.url)));
const night=source.nights.find(n=>n.date==='2018-09-24');
const stations=night.stations.map(s=>({...s,frames:s.frames.map((f,i)=>({...f,time:night.times[i],minute:i*5}))}));
const output={source:source.source,altitudeCentresMAsl:source.altitudeCentresMAsl,date:night.date,stations};
fs.writeFileSync(new URL('../data/processed/regional-air-night.json',import.meta.url),JSON.stringify(output));
const {heightAt}=terrainSampler(JSON.parse(fs.readFileSync(new URL('../data/processed/network-terrain.json',import.meta.url))));
const grid=createAirGrid(stations),last=night.times.length-1;
let state=20180924;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
for(const kind of ['wind','birds']){
 const fields=night.times.map((_,i)=>airMovementGrid(grid,stations.map(s=>s.frames[i]),kind)),tracks=[];
 for(let start=0;start<last;start++){
  const cumulative=[],field=fields[start];let total=0;
  for(let i=0;i<grid.cells.length*15;i++){const d=field[i*4],support=field[i*4+3];total+=Number.isFinite(d)&&support>.25?Math.max(0,d)*support:0;cumulative.push(total);}
  if(!total)continue;
  for(let seed=0;seed<(kind==='wind'?90:60);seed++){
   const chosen=random()*total;let lo=0,hi=cumulative.length-1;
   while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<chosen)lo=mid+1;else hi=mid;}
   const band=Math.floor(lo/grid.cells.length),cell=grid.cells[lo%grid.cells.length];
   let p={lat:cell.lat+(random()-.5)*.25,lon:cell.lon+(random()-.5)*.25};
   const sample=(position,time)=>heightAt(position.lat,position.lon)>=1.1+band*.2?null:sampleAirMovement(fields,position,time,band);
   const initial=sample(p,start);if(!initial||initial.density<=0||initial.support<.25)continue;
   const pack=v=>[+v.lat.toFixed(6),+v.lon.toFixed(6),+v.density.toFixed(3),+v.support.toFixed(4)];
   const points=[pack({...p,...initial})],end=Math.min(last,start+24+Math.floor(random()*13));let stopped=false;
   for(let t=start;t<end&&!stopped;t++){
    for(let sub=0;sub<5;sub++){p=advancePath(p,t+sub/5,.2,sample);if(!p){stopped=true;break;}}
    if(!stopped)points.push(pack(p));
   }
   if(points.length>=4)tracks.push({start,band,points});
  }
 }
 fs.writeFileSync(new URL(`../data/processed/regional-air-${kind}.json`,import.meta.url),JSON.stringify({kind,start:night.times[0],stepSeconds:300,bounds:AIR_BOUNDS,seed:20180924,method:'Distance-kernel station estimate; bilinear space, linear time; RK2 60-second steps; fixed altitude; illustrative seeds, no gap filling',tracks}));
 console.log(kind,tracks.length,'paths',tracks.reduce((n,t)=>n+t.points.length,0),'points');
}
