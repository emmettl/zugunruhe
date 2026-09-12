import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleAirFrame,describeVector} from './air-model.js';
const air=JSON.parse(fs.readFileSync(new URL('../data/processed/air-three-nights.json',import.meta.url)));
const birds=JSON.parse(fs.readFileSync(new URL('../data/processed/memmingen-three-nights.json',import.meta.url)));
test('Air preserves the original three bird nights, times and missingness',()=>{
 air.nights.forEach((n,ni)=>n.frames.forEach((f,i)=>{
  for(const key of ['time','minute','dens','ub','vb'])assert.deepEqual(f[key],birds.nights[ni].frames[i][key]);
  assert.equal(f.uw.length,15);assert.equal(f.vw.length,15);
 }));
});
test('bird and wind vectors use the same adjacent clock and retain exact samples',()=>{
 const f=air.nights[1].frames;
 assert.equal(sampleAirFrame(f,48),f[48]);
 const mixed=sampleAirFrame(f,48.5);
 for(const key of ['ub','vb','uw','vw'])assert.equal(mixed[key][5],(f[48][key][5]+f[49][key][5])/2);
 assert.deepEqual([f[48].ub[5],f[48].vb[5],f[48].uw[5],f[48].vw[5]],[-6.36,-5.22,2.41,-2.11]);
});
test('missing or non-adjacent wind components cannot create a vector',()=>{
 const f=structuredClone(air.nights[1].frames.slice(48,50));f[1].uw[0]=null;
 const mixed=sampleAirFrame(f,.5);assert.equal(mixed.uw[0],null);assert.equal(mixed.vw[0],null);
 f[1].time='2018-09-03T22:10:00Z';assert(sampleAirFrame(f,.5).uw.every(v=>v===null));
});
test('vector bearings point toward movement and preserve calm and unavailable states',()=>{
 assert.deepEqual(describeVector(0,10),{speed:36,bearing:0});
 assert.equal(describeVector(10,0).bearing,90);assert.equal(describeVector(0,-10).bearing,180);
 assert.equal(describeVector(null,10),null);assert.equal(describeVector(0,0).speed,0);
});
