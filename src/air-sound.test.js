import test from 'node:test';
import assert from 'node:assert/strict';
import {airSound} from './air-sound.js';
import {createPhraseClock} from './phrase-clock.js';
const frame=(dens,ub=dens.map(()=>1),vb=dens.map(()=>1))=>({dens,ub,vb});
test('Air density keeps real zeros, requires paired support, and respects the selected height',()=>{
  assert.equal(airSound([frame([0,12])]).density,6);
  assert.equal(airSound([frame([0,12])],0).activity,0);
  assert.equal(airSound([frame([0,12])],1).activity,1);
  assert.equal(airSound([frame([12,null,null])]).density,null);
  assert.equal(airSound([frame([12,0],[null,1])]).density,0);
  assert.equal(airSound([frame([-1,null])]).density,null);
  assert.equal(airSound([]).density,null);
  assert.equal(airSound([frame([12])],-1,false).activity,0);
});
test('density changes phrase frequency, with a bounded rate and fixed phrase order',()=>{
  function events(activity){const c=createPhraseClock(),out=[];c.setActivity(activity);for(let t=0;t<180;t++){const e=c.advance(t);if(e)out.push(e);}return out;}
  const sparse=events(.25),busy=events(1);
  assert.ok(busy.length>sparse.length*2);
  assert.ok(busy.every((e,i)=>!i||e.at-busy[i-1].at>=18-1e-9));
  assert.deepEqual(busy.slice(0,6).map(e=>e.index),[0,1,2,3,4,5]);
  assert.equal(events(0).length,0);
});
test('missing or hidden birds stop new phrases, and a late timer never catches up in a burst',()=>{
  const c=createPhraseClock();c.setActivity(1);c.advance(0);
  c.setActivity(0);for(let t=1;t<=100;t++)assert.equal(c.advance(t),null);
  c.setActivity(1);assert.equal(c.advance(1000),null);
  assert.equal(c.advance(1000),null);
});
