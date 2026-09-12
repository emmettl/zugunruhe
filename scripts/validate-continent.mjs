import fs from 'node:fs';
import { neighboursAt,estimate } from '../src/continent-model.js';
const network=JSON.parse(fs.readFileSync(new URL('../data/processed/network-night.json',import.meta.url)));
const neighbours=network.stations.map((s,i)=>neighboursAt(network.stations,s.lat,s.lon,i));
const errors=[],baselineErrors=[];let unavailable=0,missing=0;
for(let index=0;index<=144;index+=6){
  const frames=network.stations.map(s=>s.frames[index]);
  for(let i=0;i<frames.length;i++)for(let band=0;band<15;band++){
    const truth=frames[i].dens[band];if(truth===null){missing++;continue;}
    const result=estimate(neighbours[i],frames,band);if(result.density===null||result.support<=0){unavailable++;continue;}
    const others=frames.filter((f,j)=>j!==i&&f.dens[band]!==null).map(f=>f.dens[band]);
    errors.push(Math.abs(result.density-truth));baselineErrors.push(Math.abs(others.reduce((s,d)=>s+d,0)/others.length-truth));
  }
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const median=a=>{const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.floor(sorted.length/2)];};
const result={method:'Leave one entire station out; evaluate every 30 minutes over the one-night study, all fifteen bands. The baseline is the contemporaneous mean of the remaining stations for that band. Kernel parameters were selected before this check; no fitting is performed.',
  observations:errors.length,unavailable,missing,units:'birds/km³',meanAbsoluteError:mean(errors),medianAbsoluteError:median(errors),baselineMeanAbsoluteError:mean(baselineErrors),baselineMedianAbsoluteError:median(baselineErrors),
  limitations:'A single-night check of spatial prediction at radar locations, not independent biological validation, calibrated uncertainty, or proof of accuracy outside this network.'};
fs.writeFileSync(new URL('../data/processed/continent-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
