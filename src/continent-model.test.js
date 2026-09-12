import test from 'node:test';
import assert from 'node:assert/strict';
import { neighboursAt,estimate,createFieldGrid,sampleGrid,distanceKm } from './continent-model.js';
const stations=[{lat:48,lon:5},{lat:48,lon:7}];
const frame=(density,u=10,v=2)=>({dens:Array(15).fill(density),ub:Array(15).fill(u),vb:Array(15).fill(v)});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('a constant observed field stays constant between stations',()=>{
  for(const lon of [5,5.5,6,6.5,7])close(estimate(neighboursAt(stations,48,lon),[frame(17),frame(17)],0).density,17);
});
test('opposing velocity components pass through zero without inventing a turn',()=>{
  const result=estimate(neighboursAt(stations,48,6),[frame(20,10,2),frame(40,-10,-2)],0);
  close(result.density,30);close(result.u,0);close(result.v,0);
});
test('missing values are excluded, observed zero remains zero and incomplete velocity pairs stay absent',()=>{
  const n=neighboursAt(stations,48,6),zero=estimate(n,[frame(0,null,2),frame(null)],0);
  assert.equal(zero.density,0);assert.equal(zero.u,null);assert.equal(zero.v,null);
  assert.ok(zero.support>0);assert.equal(estimate(n,[frame(null),frame(null)],0).density,null);
});
test('the estimate has finite reach and holdout excludes the entire station',()=>{
  assert.equal(estimate(neighboursAt(stations,60,20),[frame(10),frame(20)],0).support,0);
  const n=neighboursAt(stations,48,5,0);assert.ok(n.every(x=>x.i!==0));
  close(estimate(n,[frame(1000),frame(20)],0).density,20);
  close(distanceKm(stations[0],stations[0]),0);
});
test('support fades continuously with distance from the nearest available observation',()=>{
  const single=[stations[0]],frames=[frame(10)];
  const near=estimate(neighboursAt(single,49.2,5),frames,0),far=estimate(neighboursAt(single,49.8,5),frames,0);
  assert.ok(near.support>far.support&&far.support>0);close(near.density,far.density);
});
test('grid texture rows run south to north and pack fifteen separate altitude bands',()=>{
  const grid=createFieldGrid(stations,{west:5,east:7,south:48,north:49,step:1});
  assert.equal(grid.width,3);assert.equal(grid.height,2);assert.equal(grid.cells[3].lat,49);
  const f=frame(10);f.dens[14]=90;const data=sampleGrid(grid,[f,f]);
  assert.equal(data.length,3*2*15*4);assert.ok(Math.abs(data[0]-.1)<1e-6);assert.ok(Math.abs(data[14*6*4]-.9)<1e-6);
});
