import test from 'node:test';
import assert from 'node:assert/strict';
import {globePoint,cameraAltitude,frameMean} from './network-geo.js';
import { readFileSync } from 'node:fs';
test('camera presets preserve physical altitude above spherical Earth',()=>{
  for(const [lat,lon] of [[48.5,6.5],[45.5,6],[51,10],[43,-2]])for(const h of [0,1,4,100,500,1000])
    assert.ok(Math.abs(cameraAltitude(globePoint(lat,lon,h))-h)<1e-8);
});
test('coordinates map east to +x and north to -z with curvature below tangent',()=>{
  const east=globePoint(48.5,7),north=globePoint(49,6.5);
  assert.ok(east[0]>0&&north[2]<0&&east[1]<0&&north[1]<0);
});
test('a whole-column density mean is unavailable for incomplete profiles',()=>{
  assert.equal(frameMean({dens:[0,0,0]}),0);
  assert.equal(frameMean({dens:[0,null,3]}),null);
  assert.equal(frameMean({dens:[0,3,6]}),3);
});
test('network extraction retains the initial study observations and synchronized timestamps',()=>{
  const network=JSON.parse(readFileSync(new URL('../data/processed/network-night.json',import.meta.url)));
  const original=JSON.parse(readFileSync(new URL('../data/processed/memmingen-three-nights.json',import.meta.url)));
  assert.equal(network.stations.length,37);
  const memmingen=network.stations.find(s=>s.name==='demem');
  original.nights[2].frames.forEach((f,i)=>{
    for(const key of ['time','minute','dens','ub','vb'])assert.deepEqual(memmingen.frames[i][key],f[key]);
  });
  for(const station of network.stations){
    assert.equal(station.frames.length,145);
    station.frames.forEach((f,i)=>{
      assert.equal(f.time,memmingen.frames[i].time);
      for(const key of ['dens','ub','vb']){assert.equal(f[key].length,15);assert.ok(f[key].every(v=>v===null||Number.isFinite(v)));}
    });
  }
});
