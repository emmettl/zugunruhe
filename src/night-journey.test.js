import test from 'node:test';
import assert from 'node:assert/strict';
import { nightPose,nightPresentation,NIGHT_END } from './night-journey.js';
import { cameraAltitude } from './network-geo.js';

test('the night camera stays above terrain and can hand over within orbit limits',()=>{
  for(let t=0;t<=NIGHT_END;t+=.1){
    const pose=nightPose(t);
    assert(cameraAltitude(pose.position.toArray())>60);
    assert(pose.position.distanceTo(pose.target)>=1);
  }
});
test('chapter boundaries join without camera cuts and seeks clamp to the night',()=>{
  for(const t of [24,48,72,102]){
    assert(nightPose(t-.0001).position.distanceTo(nightPose(t+.0001).position)<.0001);
    assert(nightPose(t-.0001).target.distanceTo(nightPose(t+.0001).target)<.0001);
  }
  assert(nightPose(-1).position.equals(nightPose(0).position));
  assert(nightPose(1000).position.equals(nightPose(NIGHT_END).position));
});
test('observed islands are revealed before interpolation replaces them',()=>{
  assert.equal(nightPresentation(0).neighbours,0);
  assert.equal(nightPresentation(42).neighbours,1);
  assert.equal(nightPresentation(42).sea,0);
  assert.equal(nightPresentation(72).sea,1);
  for(let t=0;t<=NIGHT_END;t+=.1){
    const p=nightPresentation(t);
    for(const key of ['neighbours','sea','threads'])assert(p[key]>=0&&p[key]<=1);
    assert(p.sea===0||p.neighbours===1);
    assert(p.threads===0||p.sea===1);
  }
});
