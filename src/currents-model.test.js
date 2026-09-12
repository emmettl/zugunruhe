import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePath,mixMovement,sampleMovement,movementGrid,visibleSegments } from './currents-model.js';
import { createFieldGrid,distanceKm } from './continent-model.js';
const velocity=(u,v)=>({u,v,density:20,support:1});
test('east/north velocities travel the correct distance on the study clock',()=>{
  const start={lat:48,lon:7};
  const east=advancePath(start,0,1,()=>velocity(10,0)),north=advancePath(start,0,1,()=>velocity(0,10));
  assert.equal(east.lat,start.lat);assert.ok(east.lon>start.lon);assert.equal(north.lon,start.lon);assert.ok(north.lat>start.lat);
  assert.ok(Math.abs(distanceKm(start,east)-3)<.001);assert.ok(Math.abs(distanceKm(start,north)-3)<.001);
  assert.deepEqual(advancePath(start,0,1,()=>velocity(0,0)),{...start,...velocity(0,0)});
});
test('integration follows changing vectors and stops at gaps instead of crossing them',()=>{
  const start={lat:48,lon:7};
  const turn=advancePath(start,0,1,(_p,t)=>velocity(10*(1-t),10*t));
  assert.ok(turn.lat>48&&turn.lon>7);assert.ok(Math.abs(distanceKm(start,turn)-Math.sqrt(4.5))<.001);
  assert.equal(advancePath(start,0,1,(_p,t)=>t===.5?null:velocity(10,0)),null);
  assert.equal(advancePath(start,0,1,(_p,t)=>t===1?null:velocity(10,0)),null);
  assert.equal(mixMovement(velocity(10,0),null,.5),null);
  assert.equal(mixMovement(velocity(10,0),null,0).u,10);
});
test('missing velocity stays unavailable; exact valid nodes do not require missing neighbours',()=>{
  const bounds={west:7,east:8,south:48,north:49,step:1},grid=createFieldGrid([{lat:48,lon:7}],bounds);
  const frame={dens:Array(15).fill(20),ub:Array(15).fill(null),vb:Array(15).fill(3)};
  const missing=movementGrid(grid,[frame]);assert.equal(sampleMovement(missing,48,7,0,bounds),null);
  const field=new Float32Array(4*15*4);field.fill(NaN);field.set([20,10,0,1]);
  assert.equal(sampleMovement(field,48,7,0,bounds).u,10);assert.equal(sampleMovement(field,48.5,7.5,0,bounds),null);
  assert.equal(sampleMovement(field,48,6,0,bounds),null);
});
test('trails truncate at the current clock and restore identically when scrubbing back',()=>{
  const track={start:0,band:2,points:Array.from({length:10},(_,i)=>[48,7+i*.01,20,1])};
  const first=visibleSegments(track,4.5,2);visibleSegments(track,7,2);
  assert.deepEqual(visibleSegments(track,4.5,2),first);
  assert.equal(first[0].a[1],7.025);assert.equal(first.at(-1).b[1],7.045);
  assert.deepEqual(visibleSegments(track,0),[]);assert.deepEqual(visibleSegments(track,9),[]);
});
