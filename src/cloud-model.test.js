import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudBracket,cloudCoverAt} from './cloud-model.js';
const times=['2018-09-04T23:00:00Z','2018-09-05T00:00:00Z'];
const data={times,grid:{west:0,south:0,step:1,width:2,height:2},frames:[{cloud_cover:[0,20,40,60]},{cloud_cover:[40,60,80,100]}]};
test('cloud clock interpolates across midnight and keeps exact final endpoints',()=>{
  assert.deepEqual(cloudBracket(times,'2018-09-04T23:30:00Z'),{a:0,b:1,fraction:.5});
  assert.deepEqual(cloudBracket(times,times[1]),{a:1,b:1,fraction:0});
  assert.equal(cloudBracket(times,'2018-09-05T00:01:00Z'),null);
});
test('cloud cover preserves observed zeros, spatial corners and bilinear means',()=>{
  assert.equal(cloudCoverAt(data,'total',0,0,times[0]),0);
  assert.equal(cloudCoverAt(data,'total',1,1,times[1]),100);
  assert.equal(cloudCoverAt(data,'total',.5,.5,'2018-09-04T23:30:00Z'),50);
  assert.equal(cloudCoverAt(data,'total',-.01,.5,times[0]),null);
});
test('missing cloud values are not bridged; zero-weight neighbours do not hide valid samples',()=>{
  const missing=structuredClone(data);missing.frames[1].cloud_cover[0]=null;
  assert.equal(cloudCoverAt(missing,'total',0,0,times[0]),0);
  assert.equal(cloudCoverAt(missing,'total',0,0,'2018-09-04T23:30:00Z'),null);
  assert.equal(cloudCoverAt(missing,'total',1,1,times[1]),100);
});
