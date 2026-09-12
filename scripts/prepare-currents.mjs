import fs from 'node:fs';
import { createFieldGrid } from '../src/continent-model.js';
import { movementGrid,sampleMovement,mixMovement,advancePath } from '../src/currents-model.js';
import { terrainSampler } from '../src/network-terrain.js';
import { bridgeNightGap } from '../src/night-data.js';
const night=process.argv.includes('--night');
const network=JSON.parse(fs.readFileSync(new URL('../data/processed/network-night.json',import.meta.url)));
if(night)network.stations=bridgeNightGap(network.stations);
const terrain=JSON.parse(fs.readFileSync(new URL('../data/processed/network-terrain.json',import.meta.url)));
const {heightAt}=terrainSampler(terrain),grid=createFieldGrid(network.stations),fields=[];
for(let i=0;i<145;i++)fields.push(movementGrid(grid,network.stations.map(s=>s.frames[i])));
let state=20180904;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
const tracks=[];let candidates=0;
for(let start=0;start<144;start++){
  const cumulative=[],field=fields[start];let total=0;
  for(let i=0;i<grid.cells.length*15;i++){const d=field[i*4],support=field[i*4+3];total+=Number.isFinite(d)&&support>.2?Math.max(0,d)*support:0;cumulative.push(total);}
  if(total===0)continue;
  for(let seed=0;seed<18;seed++){
    const chosen=random()*total;let lo=0,hi=cumulative.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<chosen)lo=mid+1;else hi=mid;}
    const band=Math.floor(lo/grid.cells.length),cell=grid.cells[lo%grid.cells.length];
    let p={lat:cell.lat+(random()-.5)*.25,lon:cell.lon+(random()-.5)*.25};
    const sample=(position,time)=>{
      if(heightAt(position.lat,position.lon)>=1.1+band*.2)return null;
      const a=Math.floor(time+1e-8),f=Math.max(0,time-a);if(a>144)return null;
      return mixMovement(sampleMovement(fields[a],position.lat,position.lon,band),f<1e-8?null:sampleMovement(fields[Math.min(144,a+1)],position.lat,position.lon,band),f<1e-8?0:f);
    };
    const initial=sample(p,start);if(!initial||initial.density<=0||initial.support<.2)continue;
    const pack=value=>[Number(value.lat.toFixed(6)),Number(value.lon.toFixed(6)),Number(value.density.toFixed(3)),Number(value.support.toFixed(4))];
    const points=[pack({...p,...initial})],end=Math.min(144,start+30+Math.floor(random()*13));candidates++;
    let stopped=false;
    for(let t=start;t<end&&!stopped;t++){
      for(let sub=0;sub<5;sub++){p=advancePath(p,t+sub/5,.2,sample);if(!p){stopped=true;break;}}
      if(!stopped)points.push(pack(p));
    }
    if(points.length>=4)tracks.push({start,band,points});
  }
}
const output={source:'Zenodo 4587338 v3; network-night.json',start:network.stations[0].frames[0].time,stepSeconds:300,method:'RK2, 60-second integration; bilinear space and linear time; fixed altitude; seeded density-weighted tracers, not individual birds',seed:20180904,tracks};
if(night)output.presentationEstimate='Night only: missing bands at 00:45–00:55 linearly interpolated between 00:40 and 01:00 before integrating tracers. Retained observations are unchanged.';
fs.writeFileSync(new URL(night?'../data/processed/night-currents.json':'../data/processed/currents-night.json',import.meta.url),JSON.stringify(output));
console.log(`Prepared ${tracks.length} paths from ${candidates} seeds; ${tracks.reduce((n,t)=>n+t.points.length,0)} points.`);
