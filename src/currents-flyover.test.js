import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlyover,flyoverPose } from './currents-flyover.js';
import { createCameraJourney } from './network-camera.js';
import { cameraAltitude } from './network-geo.js';
test('flyover travels continuously at 100 km with a forward-looking target',()=>{
  let previous=flyoverPose(0);const start=previous;
  for(let i=1;i<=200;i++){
    const p=flyoverPose(i/200);
    assert.ok(Math.abs(cameraAltitude(p.position.toArray())-100)<1e-8);
    assert.ok(p.position.distanceTo(previous.position)<.15);
    assert.ok(p.target.distanceTo(p.position)>1);previous=p;
  }
  assert.ok(previous.position.distanceTo(start.position)>5);
});
test('stopping a flyover holds the camera and Back restores the original bookmark',()=>{
  let current=flyoverPose(.9),before=current;
  const write=p=>{current=p;},journey=createCameraJourney(()=>current,write);
  const flight=createFlyover(write,10);
  journey.focus(flyoverPose(0));journey.step(3);flight.start();flight.step(4);
  assert.ok(current.position.distanceTo(before.position)>1);
  flight.stop();const held=current;flight.step(20);assert.equal(current,held);
  journey.back();journey.step(3);
  assert.ok(current.position.distanceTo(before.position)<1e-10);
  assert.ok(current.target.distanceTo(before.target)<1e-10);
});
test('the route settles at the end and can restart without accumulating time',()=>{
  let current;const flight=createFlyover(p=>{current=p;},10);
  flight.start();flight.step(11);assert.equal(flight.active,false);assert.equal(flight.progress,1);
  assert.ok(current.position.distanceTo(flyoverPose(1).position)<1e-10);
  flight.start();flight.step(0);assert.equal(flight.progress,0);assert.ok(current.position.distanceTo(flyoverPose(0).position)<1e-10);
});
