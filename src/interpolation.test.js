import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleFrame, turnTexture } from './interpolation.js';

function frame(minute, density, east, north) {
  return { minute, time:new Date(Date.UTC(2018,8,4,18,minute)).toISOString(),
    dens:Array(15).fill(density),ub:Array(15).fill(east),vb:Array(15).fill(north) };
}
const near=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('midpoints interpolate density and Cartesian velocity without changing observations',()=>{
  const frames=[frame(0,10,-2,8),frame(5,30,2,12)];
  const before=JSON.stringify(frames),mid=sampleFrame(frames,.5);
  assert.equal(mid.dens[0],20);assert.equal(mid.ub[0],0);assert.equal(mid.vb[0],10);
  assert.equal(mid.meanDensity,20);assert.equal(mid.time,'2018-09-04T18:02:30.000Z');
  assert.equal(JSON.stringify(frames),before);
  assert.equal(sampleFrame(frames,0),frames[0]);assert.equal(sampleFrame(frames,1),frames[1]);
  assert.equal(sampleFrame(frames,-1),frames[0]);assert.equal(sampleFrame(frames,2),frames[1]);
});

test('opposing movement passes through zero rather than inventing a perpendicular flow',()=>{
  const frames=[frame(0,10,10,0),frame(5,10,-10,0)];
  assert.equal(sampleFrame(frames,.5).ub[0],0);
  assert.equal(sampleFrame(frames,.5).vb[0],0);
  assert.equal(turnTexture(1.2,0,0,.016),1.2);
  const turned=turnTexture(0,-10,0,.016);
  assert.ok(turned>0&&turned<.2,'texture should turn gradually, not flip instantly');
});

test('texture turns over the short angular seam',()=>{
  const angle=179*Math.PI/180,target=-179*Math.PI/180;
  const next=turnTexture(angle,Math.cos(target),Math.sin(target),.016);
  assert.ok(next>angle&&next-angle<.01);
});

test('missing density remains unavailable on either side of a gap; zero remains zero',()=>{
  const frames=[frame(0,0,0,0),frame(5,20,2,3),frame(10,30,3,4)];
  frames[1].dens[0]=null;
  for(const p of [.5,1.5]){
    const value=sampleFrame(frames,p);
    assert.equal(value.dens[0],null);assert.equal(value.ub[0],null);
    assert.equal(value.meanDensity,null);
  }
  assert.equal(sampleFrame(frames,0).dens[0],0);
  assert.equal(sampleFrame(frames,1).dens[0],null);
});

test('incomplete velocity pairs stay unavailable without removing known density',()=>{
  const frames=[frame(0,10,1,2),frame(5,20,3,4)];frames[1].vb[0]=null;
  const mid=sampleFrame(frames,.5);
  assert.equal(mid.dens[0],15);assert.equal(mid.ub[0],null);assert.equal(mid.vb[0],null);
});

test('non-adjacent timestamps cannot be bridged even when values exist',()=>{
  const mid=sampleFrame([frame(0,10,1,2),frame(10,20,3,4)],.5);
  assert.ok(mid.dens.every(v=>v===null));assert.ok(mid.ub.every(v=>v===null));
});

test('real Memmingen data remains continuous at every complete interior sample',()=>{
  const study=JSON.parse(readFileSync(new URL('../data/processed/memmingen-three-nights.json',import.meta.url)));
  let checked=0;
  for(const {frames} of study.nights){
    for(let i=1;i<frames.length-1;i++){
      const left=sampleFrame(frames,i-1e-9),right=sampleFrame(frames,i+1e-9);
      for(const key of ['dens','ub','vb'])for(let band=0;band<15;band++){
        if(left[key][band]===null||right[key][band]===null)continue;
        near(left[key][band],frames[i][key][band],1e-6);
        near(right[key][band],frames[i][key][band],1e-6);checked++;
      }
    }
  }
  assert.ok(checked>10000);
});
