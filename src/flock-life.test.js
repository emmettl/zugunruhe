import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlock, STEP } from './flock-model.js';
import { createParticipant } from './flock-camera.js';
import { sampleAir } from './flock-air.js';
import { flockMusic, createMusicalState } from './flock-music-state.js';

test('individual readiness varies and a local alarm is separate from the urge to depart', () => {
  const calm = createFlock(80), startled = createFlock(80);
  for (let i = 0; i < 1200; i++) { calm.step(); startled.step(); }
  assert.ok(Math.max(...calm.life.readiness) - Math.min(...calm.life.readiness) > .05);
  const edge = Array.from({ length: 80 }, (_, i) => i).sort((a, b) => startled.position[a * 3] - startled.position[b * 3])[0];
  const source = [...startled.position.subarray(edge * 3, edge * 3 + 3)]; source[0] -= 12;
  const distant = Array.from({ length: 80 }, (_, i) => i).filter(i => Math.hypot(...source.map((p, j) => p - startled.position[i * 3 + j])) > 24);
  startled.step(STEP, null, [{ position: source, strength: 1 }]); calm.step();
  assert.ok(startled.life.alarm[edge] > 0);
  assert.ok(distant.length > 0); assert.ok(distant.every(i => startled.life.alarm[i] === 0));
  assert.equal(calm.life.state.alarm, 0);
  assert.equal(startled.life.state.readiness, calm.life.state.readiness, 'a click does not inject readiness');
  for (let i = 0; i < 1200; i++) startled.step();
  assert.ok(startled.life.state.alarm < .005, 'alarm recovers without further disturbance');
});

test('participant approaches the flock, stays with a companion and affects only nearby birds initially', () => {
  const flock = createFlock(80), pilot = createParticipant(); pilot.enter([55, 22, 87]);
  let previous = [...pilot.velocity];
  for (let tick = 0; tick < 6000; tick++) {
    flock.step(STEP, null, [], pilot.position); pilot.step(STEP, flock, 0);
    assert.ok(Math.hypot(...pilot.velocity.map((v, j) => (v - previous[j]) / STEP)) < 7.001);
    previous = [...pilot.velocity];
    if (tick > 1800) assert.ok(Math.hypot(...pilot.position.map((p, j) => p - flock.position[j])) < 25);
  }
  const a = createFlock(80), b = createFlock(80), point = [...a.position.subarray(0, 3)]; point[0] += 1;
  const initial = [...a.position]; a.step(); b.step(STEP, null, [], point);
  let changed = 0;
  for (let i = 0; i < a.count; i++) {
    const same = [0, 1, 2].every(j => a.velocity[i * 3 + j] === b.velocity[i * 3 + j]);
    if (Math.hypot(...point.map((p, j) => p - initial[i * 3 + j])) >= 4) assert.ok(same);
    else if (!same) changed++;
  }
  assert.ok(changed > 0);
  pilot.leave(); const held = [...pilot.position]; pilot.step(STEP, flock, 0); assert.deepEqual(pilot.position, held);
});

test('air is bounded and spatially continuous, with rising columns and horizontal drift', () => {
  let maxRise = 0, minRise = Infinity;
  for (let x = -400; x <= 400; x += 10) for (let z = -200; z <= 200; z += 10) {
    const a = sampleAir(x, 18, z, 0), b = sampleAir(x + .01, 18, z, .01);
    assert.ok(a.every(Number.isFinite)); assert.ok(Math.hypot(...a) < 3);
    assert.ok(Math.hypot(...a.map((v, j) => v - b[j])) < .01);
    maxRise = Math.max(maxRise, a[1]); minRise = Math.min(minRise, a[1]);
  }
  assert.ok(maxRise > 1.8 && minRise < 0);
  const flock = createFlock(8), before = [...flock.position]; flock.step();
  for (let j = 0; j < before.length; j++) assert.ok(Math.abs(flock.position[j] - before[j] - (flock.velocity[j] + flock.air[j]) * STEP) < 1e-10);
});

test('purpose, agreement and alarm have distinct musical effects and recover smoothly', () => {
  const calm = flockMusic(.1, { readiness: 0, coherence: 1, alarm: 0 });
  const ready = flockMusic(.1, { readiness: 1, coherence: 1, alarm: 0 });
  const alarm = flockMusic(.1, { readiness: 0, coherence: 1, alarm: 1 });
  const scattered = flockMusic(.1, { readiness: 0, coherence: .5, alarm: 0 });
  assert.ok(ready.interval < calm.interval && ready.breathDepth > calm.breathDepth);
  assert.equal(ready.attack, calm.attack); assert.equal(ready.fragmented, false);
  assert.ok(alarm.attack < calm.attack && alarm.release < calm.release && alarm.brightness > calm.brightness);
  assert.ok(scattered.phaseSpread > calm.phaseSpread && scattered.fragmented);
  const envelope = createMusicalState();
  for (let i = 0; i < 20; i++) envelope.advance({ alarm: 1 }, .1);
  assert.ok(envelope.value.alarm > .99);
  envelope.advance({ alarm: 0 }, .1); assert.ok(envelope.value.alarm > .95);
  for (let i = 0; i < 400; i++) envelope.advance({ alarm: 0 }, .1);
  assert.ok(envelope.value.alarm < .001);
});
