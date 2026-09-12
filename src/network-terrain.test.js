import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainSampler,stationLift } from './network-terrain.js';

const grid={centre:{lat:48.5,lon:6.5},spanKm:100,size:2,elevationMetres:[0,1000,2000,3000]};
test('geographic height sampling interpolates north-west to south-east',()=>{
  const s=terrainSampler(grid);
  assert.equal(s.heightAt(s.north,s.west),0);
  assert.ok(Math.abs(s.heightAt(s.north-s.latSpan,s.west+s.lonSpan)-3)<1e-10);
  assert.ok(Math.abs(s.heightAt(grid.centre.lat,grid.centre.lon)-1.5)<1e-10);
  assert.ok(Math.abs(s.heightAt(s.north-s.latSpan*.25,s.west+s.lonSpan*.75)-1.25)<1e-10);
});
test('bathymetry is clamped after interpolation and outside samples stay at the edge',()=>{
  const s=terrainSampler({...grid,elevationMetres:[-1000,1000,-1000,1000]});
  assert.ok(Math.abs(s.heightAt(grid.centre.lat,grid.centre.lon))<1e-10);
  assert.equal(s.heightAt(s.north+1,s.west-1),0);
  assert.equal(s.heightAt(s.north+1,s.west+s.lonSpan+1),1);
});
test('terrain exaggeration preserves station-centre clearance and layer spacing',()=>{
  const ground=.65,low=1.1,high=3.9;
  for(const relief of [1,4,8]){
    const lift=stationLift(ground,relief);
    assert.ok(Math.abs((low+lift-ground*relief)-(low-ground))<1e-12);
    assert.ok(Math.abs((high+lift)-(low+lift)-(high-low))<1e-12);
  }
});
