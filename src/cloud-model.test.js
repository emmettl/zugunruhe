import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudBracket,cloudCoverAt,cloudCoverMean} from './cloud-model.js';
import {cloudMotifGain} from './sound-scene.js';
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

test('regional cloud mean weights area, interpolates time, and keeps missing data distinct from clear sky',()=>{
  const rowWeight=Math.cos(Math.PI/180),mean=(20+100*rowWeight)/(2+2*rowWeight)/100;
  assert.ok(Math.abs(cloudCoverMean(data,'total',times[0])-mean)<1e-12);
  assert.ok(Math.abs(cloudCoverMean(data,'total','2018-09-04T23:30:00Z')-(mean+.2))<1e-12);
  const missing=structuredClone(data);missing.frames[1].cloud_cover[0]=null;
  assert.equal(cloudCoverMean(missing,'total','2018-09-04T23:30:00Z'),null);
  assert.equal(cloudCoverMean(missing,'total',times[0]),cloudCoverMean(data,'total',times[0]));
  assert.equal(cloudCoverMean(data,'low',times[0]),null);
  assert.equal(cloudCoverMean(data,'off',times[0]),null);
  assert.equal(cloudCoverMean(data,'total','2018-09-05T01:00:00Z'),null);
  const clear=structuredClone(data);clear.frames[0].cloud_cover.fill(0);
  assert.equal(cloudCoverMean(clear,'total',times[0]),0);
});

test('cloud motif remains silent for off, unavailable and clear sky, with a bounded continuous cover response',()=>{
  for(const fraction of [null,NaN,0])assert.equal(cloudMotifGain({mode:'total',fraction}),0);
  assert.equal(cloudMotifGain({mode:'off',fraction:1}),0);
  assert.equal(cloudMotifGain({mode:'low',fraction:1}),1);
  assert.equal(cloudMotifGain({mode:'total',fraction:.25}),.5);
  assert.equal(cloudMotifGain({mode:'total',fraction:2}),1);
});
