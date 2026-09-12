import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bridgeNightGap } from './night-data.js';
import { sampleFrame } from './interpolation.js';
import { visibleSegments } from './currents-model.js';
import { NIGHT_START } from './night-journey.js';
const source=JSON.parse(fs.readFileSync(new URL('../data/processed/network-night.json',import.meta.url)));
const bridged=bridgeNightGap(source.stations);

test('Night opens with a measured, visible cloud rather than empty early-evening profiles',()=>{
  const home=source.stations.find(s=>s.name==='demem').frames[NIGHT_START];
  assert.equal(home.time,'2018-09-04T19:00:00Z');
  assert(home.dens.every(Number.isFinite));
  assert(home.dens.reduce((sum,d)=>sum+d,0)/15>2);
});
test('the Night bridge preserves all observed values and never extrapolates missing endpoints',()=>{
  let filled=0;
  source.stations.forEach((s,si)=>s.frames.forEach((frame,i)=>{
    const shown=bridged[si].frames[i];
    if(i<=80||i>=84){assert.equal(shown,frame);return;}
    for(const key of ['dens','ub','vb'])frame[key].forEach((v,band)=>{
      if(v!==null){assert.equal(shown[key][band],v);return;}
      const a=s.frames[80],b=s.frames[84];
      const valid=key==='dens'?[a.dens[band],b.dens[band]].every(Number.isFinite):
        shown.dens[band]!==null&&[a.ub[band],a.vb[band],b.ub[band],b.vb[band]].every(Number.isFinite);
      if(valid){assert.equal(shown[key][band],a[key][band]+(b[key][band]-a[key][band])*(i-80)/4);filled++;}
      else assert.equal(shown[key][band],null);
    });
  }));
  assert(filled>1000);
  assert.equal(source.stations.filter(s=>s.frames[82].dens.every(Number.isFinite)).length,2);
});
test('density and moving trails remain present through the whole dropout, including its edges',()=>{
  const paths=JSON.parse(fs.readFileSync(new URL('../data/processed/night-currents.json',import.meta.url)));
  for(let index=80;index<=84;index+=.25){
    const frames=bridged.map(s=>sampleFrame(s.frames,index));
    assert(frames.filter(f=>f.dens.every(Number.isFinite)).length>=30);
    assert(paths.tracks.filter(t=>visibleSegments(t,index).length>0).length>100);
  }
});
