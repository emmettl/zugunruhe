import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoaringFlock, thermalAt, soaringAir, SOARING_STEP } from './soaring-model.js';
import { createSoaringCamera } from './soaring-camera.js';

test('storks climb, depart individually, spend height, and find the next thermal', () => {
  const flock = createSoaringFlock(), firstDeparture = Array(20).fill(null), initial = flock.position[1];
  let departureHeight, arrivalHeight, descending = 0;
  for (let frame = 0; frame < 180 * 60; frame++) {
    flock.step();
    for (let i = 0; i < 20; i++) if (flock.departures[i] && firstDeparture[i] === null) firstDeparture[i] = flock.time;
    if (flock.departures[0] && departureHeight === undefined) departureHeight = flock.position[1];
    if (flock.mode[0] === 'gliding' && flock.velocity[1] < -.5) descending++;
    if (flock.joins[0] === 2 && arrivalHeight === undefined) arrivalHeight = flock.position[1];
  }
  assert.ok(departureHeight > initial + 60);
  assert.ok(arrivalHeight < departureHeight - 10);
  assert.ok(descending > 15 * 60);
  assert.ok(firstDeparture.every(t => t !== null));
  assert.ok(Math.max(...firstDeparture) - Math.min(...firstDeparture) > 10);
  assert.ok(flock.joins.every(n => n >= 2));
});

test('ten minutes of successive thermals remain finite and above ground', () => {
  const flock = createSoaringFlock(); let min = Infinity, max = -Infinity;
  for (let frame = 0; frame < 600 * 60; frame++) {
    flock.step();
    for (let i = 0; i < 20; i++) { min = Math.min(min, flock.position[i * 3 + 1]); max = Math.max(max, flock.position[i * 3 + 1]); }
  }
  assert.ok(min > 80 && max < 620);
  assert.ok([...flock.position, ...flock.velocity, ...flock.bank].every(Number.isFinite));
  assert.ok(flock.departures.every(n => n >= 5));
  assert.ok(flock.position[0] > 3500);
});

test('restart recreates the same journey; drift carries the thermal and its lift together', () => {
  const a = createSoaringFlock(), b = createSoaringFlock();
  for (let frame = 0; frame < 1800; frame++) { a.step(); b.step(); }
  assert.deepEqual(a.position, b.position); assert.deepEqual(a.mode, b.mode);
  const start = thermalAt(0, 0), end = thermalAt(0, 100);
  assert.ok(end.x > start.x && end.z > start.z);
  assert.equal(soaringAir(start.x, 200, start.z, 0)[1], soaringAir(end.x, 200, end.z, 100)[1]);
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
