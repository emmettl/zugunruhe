import fs from 'node:fs';
import { frameMean } from '../src/network-geo.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/processed/${name}.json`,import.meta.url)));
const network=read('network-night'),local=read('memmingen-three-nights');
const median=values=>{const s=values.slice().sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length?(s[m]+s[Math.floor((s.length-1)/2)])/2:null;};
const summarise=frames=>{
  const valid=frames.map((frame,index)=>({index,time:frame.time,density:frameMean(frame)})).filter(f=>f.density!==null);
  const peak=valid.reduce((a,b)=>a.density>b.density?a:b);
  return {completeProfiles:valid.length,first:valid[0],peak,last:valid.at(-1)};
};
const localNights=local.nights.map(n=>({date:n.date,...summarise(n.frames)}));
const windows=[];
for(let index=0;index<=126;index+=6){
  const profiles=network.stations.map(s=>s.frames[index]),values=profiles.map(frameMean).filter(d=>d!==null);
  const memmingen=profiles[network.stations.findIndex(s=>s.name==='demem')];
  windows.push({index,time:profiles[0].time,completeStations:values.length,networkMedian:median(values),memmingen:frameMean(memmingen)});
}
const sparseFrames=network.stations[0].frames.slice(12,127).flatMap((f,offset)=>{
  const index=offset+12,completeStations=network.stations.filter(s=>frameMean(s.frames[index])!==null).length;
  return completeStations<18?[{index,time:f.time,completeStations}]:[];
});
const result={sparseFrames,source:network.source,method:'Arithmetic mean of all 15 equal-width density bins, only for complete profiles; network median weights stations equally, not land area. Changing coverage limits comparisons. No missing observations are treated as zero.',localNights,windows};
fs.writeFileSync(new URL('../data/processed/night-shape.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
