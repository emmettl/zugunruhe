import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAirGrid,airMovementGrid,sampleAirMovement} from './regional-air-model.js';
import {sampleMovement} from './currents-model.js';
import {AIR_BOUNDS} from './regional-air-model.js';
const f=(u,v)=>({dens:Array(15).fill(10),ub:Array(15).fill(-5),vb:Array(15).fill(-2),uw:Array(15).fill(u),vw:Array(15).fill(v)});
test('regional wind is independent of bird gaps and incomplete wind pairs stay absent',()=>{
 const stations=[{lat:48,lon:8}],grid=createAirGrid(stations),frame=f(4,-3);frame.dens.fill(null);frame.ub.fill(null);frame.vb.fill(null);
 const data=airMovementGrid(grid,[frame],'wind'),sample=sampleMovement(data,48,8,5,AIR_BOUNDS);
 assert.equal(sample.u,4);assert.equal(sample.v,-3);assert.equal(sample.density,1);
 assert.equal(sampleMovement(airMovementGrid(grid,[frame],'birds'),48,8,5,AIR_BOUNDS),null);
 frame.vw.fill(null);assert.equal(sampleMovement(airMovementGrid(grid,[frame],'wind'),48,8,5,AIR_BOUNDS),null);
});
test('regional wind interpolates vector components through calm, with bounded spatial support',()=>{
 const stations=[{lat:48,lon:8}],grid=createAirGrid(stations),fields=[airMovementGrid(grid,[f(4,-3)],'wind'),airMovementGrid(grid,[f(-4,3)],'wind')];
 const value=sampleAirMovement(fields,{lat:48,lon:8},.5,5);assert.equal(value.u,0);assert.equal(value.v,0);
 assert.equal(sampleAirMovement(fields,{lat:51.5,lon:14},.5,5),null);
});
test('selected September window retains opposing regional winds and no widespread clock dropout',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/processed/regional-air-night.json',import.meta.url)));
 const at=name=>data.stations.find(s=>s.name===name).frames[36];
 assert.equal(data.date,'2018-09-24');assert.equal(data.stations.length,37);
 assert.equal(at('frmtc').uw[5],-10.41);assert.equal(at('deeis').uw[5],7.8);assert.equal(at('demem').dens[5],17.62);
 for(let i=0;i<115;i++){
  assert.equal(Date.parse(data.stations[0].frames[i].time),Date.parse('2018-09-24T19:00:00Z')+i*300000);
  const pairs=data.stations.reduce((n,s)=>n+s.frames[i].dens.filter((d,b)=>[d,s.frames[i].ub[b],s.frames[i].vb[b]].every(Number.isFinite)).length,0);
  assert.ok(pairs>=320);
 }
});
test('comparison nights retain a common clock, continuous coverage, and contrasting source vectors',()=>{
 for(const [date,u,v,density] of [['2018-09-09',5.67,.19,7.04],['2018-10-08',-.35,1.38,13.65]]){
  const data=JSON.parse(fs.readFileSync(new URL(`../data/processed/regional-air-${date}-night.json`,import.meta.url)));
  assert.equal(data.date,date);assert.equal(data.stations.length,37);
  for(let i=0;i<115;i++){
   let pairs=0;
   for(const s of data.stations){
    const f=s.frames[i];assert.equal(Date.parse(f.time),Date.parse(`${date}T19:00:00Z`)+i*300000);
    for(let b=0;b<15;b++){
     assert.ok(Number.isFinite(f.uw[b])&&Number.isFinite(f.vw[b]));
     if([f.dens[b],f.ub[b],f.vb[b]].every(Number.isFinite))pairs++;
    }
   }
   assert.ok(pairs>=278,`${date}: widespread dropout at frame ${i}`);
  }
  const f=data.stations.find(s=>s.name==='demem').frames[36];
  assert.equal(f.uw[5],u);assert.equal(f.vw[5],v);assert.equal(f.dens[5],density);
  for(const kind of ['wind','birds']){
   const paths=JSON.parse(fs.readFileSync(new URL(`../data/processed/regional-air-${date}-${kind}.json`,import.meta.url)));
   assert.equal(paths.start,`${date}T19:00:00Z`);assert.equal(paths.seed,20180924);
   // Warm-up and ending room must leave both flows present throughout the visible clock.
   for(let i=12;i<=108;i++)assert.ok(paths.tracks.some(t=>t.start<i-2&&t.start+t.points.length-1>i+3),`${date} ${kind}: no established paths at ${i}`);
  }
 }
});
