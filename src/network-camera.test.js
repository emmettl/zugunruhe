import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { arcPoint,createCameraJourney } from './network-camera.js';
import { globePoint,cameraAltitude } from './network-geo.js';
const point=(lat,lon,h)=>new THREE.Vector3(...globePoint(lat,lon,h));
const pose=(lat,lon,h)=>({position:point(lat,lon,h),target:point(lat+1,lon,2)});
function setup(duration=2.4){
  let current=pose(44,9,1000);
  const initial={position:current.position.clone(),target:current.target.clone()};
  const journey=createCameraJourney(()=>current,p=>{current=p;},()=>{},duration);
  return {journey,initial,get current(){return current;}};
}
function assertPose(a,b){assert.ok(a.position.distanceTo(b.position)<1e-10);assert.ok(a.target.distanceTo(b.target)<1e-10);}
test('close view returns to the exact previous orbit, including after another station',()=>{
  const state=setup(),a=pose(48,10,60),b=pose(46,2,65);
  state.journey.focus(a);state.journey.step(3);assertPose(state.current,a);
  state.journey.focus(b);state.journey.step(3);assertPose(state.current,b);
  state.journey.back();state.journey.step(3);assertPose(state.current,state.initial);
  assert.equal(state.journey.canReturn,false);assert.equal(state.journey.moving,false);
});
test('Back during descent is continuous and retains the original destination',()=>{
  const state=setup();state.journey.focus(pose(48,10,60));state.journey.step(.9);
  const before=state.current;state.journey.back();state.journey.step(0);assertPose(state.current,before);
  state.journey.step(3);assertPose(state.current,state.initial);
});
test('camera travel remains above Earth between distant sites',()=>{
  const from=point(43,-5,100),to=point(55,15,45);
  for(let i=0;i<=100;i++){
    const altitude=cameraAltitude(arcPoint(from,to,i/100).toArray());
    assert.ok(altitude>=45-1e-8&&altitude<=100+1e-8);
  }
});
test('preset reset clears history and reduced motion reaches both endpoints immediately',()=>{
  const state=setup(0),close=pose(48,10,60);
  state.journey.focus(close);state.journey.step(0);assertPose(state.current,close);
  state.journey.back();state.journey.step(0);assertPose(state.current,state.initial);
  state.journey.focus(close);state.journey.reset();state.journey.back();state.journey.step(3);
  assertPose(state.current,state.initial);assert.equal(state.journey.canReturn,false);
});
