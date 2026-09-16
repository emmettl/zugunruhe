import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoaringFlock, thermalAt, soaringAir, SOARING_STEP } from './soaring-model.js';
import { soaringStory } from './soaring-story.js';
import { createSoaringCamera } from './soaring-camera.js';

test('fading lift prompts staggered departure, a search, discovery and recruitment', () => {
  const flock = createSoaringFlock(), firstDeparture = Array(20).fill(null), initial = flock.position[1];
  let departureHeight, arrivalHeight, descending = 0, departureCue;
  const arrivals = [], previousJoins = [...flock.joins], stories = new Set();
  for (let frame = 0; frame < 180 * 60; frame++) {
    flock.step(); stories.add(soaringStory(flock, 0)[0]);
    for (let i = 0; i < 20; i++) {
      if (flock.joins[i] > previousJoins[i] && flock.thermal[i] === 1) arrivals.push({ time: flock.time, cue: flock.cue[i], guide: flock.guide[i] });
      previousJoins[i] = flock.joins[i];
    }
    for (let i = 0; i < 20; i++) if (flock.departures[i] && firstDeparture[i] === null) firstDeparture[i] = flock.time;
    if (flock.departures[0] && departureHeight === undefined) { departureHeight = flock.position[1]; departureCue = flock.cue[0]; }
    if (flock.mode[0] !== 'climbing' && flock.velocity[1] < -.5) descending++;
    if (flock.joins[0] === 2 && arrivalHeight === undefined) arrivalHeight = flock.position[1];
  }
  assert.ok(departureHeight > initial + 60);
  assert.ok(arrivalHeight < departureHeight - 10);
  assert.ok(descending > 15 * 60);
  assert.ok(firstDeparture.every(t => t !== null));
  assert.ok(Math.max(...firstDeparture) - Math.min(...firstDeparture) > 10);
  assert.equal(departureCue, 'weakening lift');
  assert.equal(arrivals[0].cue, 'discovery'); assert.equal(arrivals[0].guide, -1);
  assert.ok(arrivals.filter(a => a.cue === 'companions' && a.time > arrivals[0].time && a.guide >= 0).length >= 8);
  for (const story of ['Time to leave.', 'Searching the sky.', 'A bird shows the way.', 'Together in the climb.']) assert.ok(stories.has(story), story);
});

test('ten minutes of successive thermals remain finite and above ground', () => {
  const flock = createSoaringFlock(); let min = Infinity, max = -Infinity;
  for (let frame = 0; frame < 600 * 60; frame++) {
    flock.step();
    for (let i = 0; i < 20; i++) { min = Math.min(min, flock.position[i * 3 + 1]); max = Math.max(max, flock.position[i * 3 + 1]); }
  }
  assert.ok(min > 80 && max < 620);
  assert.ok([...flock.position, ...flock.velocity, ...flock.bank].every(Number.isFinite));
  assert.ok(flock.departures.every(n => n >= 4));
  assert.ok([...flock.reserve, ...flock.certainty, ...flock.readiness].every(n => n >= 0 && n <= 1));
  assert.ok(flock.position[0] > 3500);
});

test('restart recreates the same journey; drift carries the thermal and its lift together', () => {
  const a = createSoaringFlock(), b = createSoaringFlock();
  for (let frame = 0; frame < 1800; frame++) { a.step(); b.step(); }
  assert.deepEqual(a.position, b.position); assert.deepEqual(a.mode, b.mode);
  const start = thermalAt(0, 0), end = thermalAt(0, 100);
  assert.ok(end.x > start.x && end.z > start.z);
  assert.ok(soaringAir(start.x, 200, start.z, 0)[1] > 4);
  assert.ok(soaringAir(end.x, 200, end.z, 100)[1] < 0);
  const renewed = thermalAt(0, 240); assert.ok(renewed.strength > 4);
  assert.ok(soaringAir(350, 200, 0, 0)[1] < 0);
});

test('air camera has bounded acceleration, accompanies flight and stops when inactive', () => {
  const flock = createSoaringFlock(), camera = createSoaringCamera();
  camera.enter([flock.position[0] - 10, flock.position[1] + 2, flock.position[2] - 5]);
  let worstAcceleration = 0;
  for (let frame = 0; frame < 90 * 60; frame++) {
    flock.step(); const velocity = [...camera.velocity]; camera.step(SOARING_STEP, flock, 0);
    worstAcceleration = Math.max(worstAcceleration, Math.hypot(...camera.velocity.map((v, i) => (v - velocity[i]) / SOARING_STEP)));
    assert.ok(Math.hypot(...camera.velocity) <= 24.01);
  }
  assert.ok(worstAcceleration <= 6.001);
  assert.ok(Math.hypot(...camera.position.map((p, j) => p - flock.position[j])) < 35);
  const held = [...camera.position]; camera.leave(); camera.step(SOARING_STEP, flock, 0); assert.deepEqual(camera.position, held);
});


test('social information leads to actual recruitment; independent searching does not', () => {
  const social = createSoaringFlock(), solo = createSoaringFlock(20, 73, { social: false });
  for (let n = 0; n < 180 * 60; n++) { social.step(); solo.step(); }
  assert.ok(social.recruited.reduce((sum, n) => sum + n, 0) > 20);
  assert.ok(solo.recruited.every(n => n === 0));
  assert.ok(solo.guide.every(n => n === -1));
  assert.notDeepEqual(social.position, solo.position);
});

test('a visible but sinking bird cannot advertise a new climb', () => {
  const flock = createSoaringFlock(2);
  flock.position.set([700, 250, 0, 450, 250, 0]); flock.velocity[1] = -1;
  flock.mode[0] = 'climbing'; flock.mode[1] = 'seeking';
  flock.step(); assert.equal(flock.guide[1], -1);
  flock.velocity[1] = 2; flock.step(); assert.equal(flock.guide[1], 0);
  const caption = soaringStory(flock, 1); assert.match(caption[1], /bird 01/);
});
