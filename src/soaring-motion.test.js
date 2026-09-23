import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoaringMotion } from './soaring-motion.js';
import { SOARING_STEP } from './soaring-model.js';

function fixture() {
  const flock = { position: [0, 150, 0], velocity: [15, 0, 0], bank: [0], effort: [0], centre: [0, 150, 0], time: 0 };
  const pilot = { position: [-10, 152, -5] };
  const motion = createSoaringMotion(flock, pilot);
  function step() {
    flock.time += SOARING_STEP;
    flock.position[0] += 15 * SOARING_STEP; flock.centre[0] = flock.position[0];
    pilot.position[0] = flock.position[0] - 10;
    motion.capture();
  }
  return { flock, pilot, motion, step };
}

for (const hz of [60, 90, 120, 144]) test(`camera and birds travel evenly at ${hz} Hz`, () => {
  const { motion, step } = fixture();
  let accumulator = 0, previous;
  for (let frame = 0; frame < hz * 2; frame++) {
    accumulator += 1 / hz;
    while (accumulator >= SOARING_STEP) { step(); accumulator -= SOARING_STEP; }
    const view = motion.sample(accumulator / SOARING_STEP);
    if (frame > 3) assert.ok(Math.abs(view.camera[0] - previous - 15 / hz) < 1e-10);
    assert.ok(Math.abs(view.position[0] - view.camera[0] - 10) < 1e-10);
    previous = view.camera[0];
  }
});

test('uneven frames stay on the same flight path without altering simulation state', () => {
  const { flock, motion, step } = fixture();
  let elapsed = 0, accumulator = 0;
  for (const dt of Array.from({ length: 200 }, (_, i) => [.006, .011, .023, .008, .041][i % 5])) {
    elapsed += dt; accumulator += dt;
    while (accumulator >= SOARING_STEP) { step(); accumulator -= SOARING_STEP; }
    const before = structuredClone(flock), view = motion.sample(accumulator / SOARING_STEP);
    assert.ok(Math.abs(view.position[0] - 15 * Math.max(0, elapsed - SOARING_STEP)) < 1e-10);
    assert.deepEqual(flock, before);
    // Holding the remainder on pause/hidden tabs must hold the exact visual pose.
    const held = structuredClone(view);
    assert.deepEqual(motion.sample(accumulator / SOARING_STEP), held);
  }
});

test('entering the air view seeds both camera samples at the current eye', () => {
  const { pilot, motion, step } = fixture(); step();
  pilot.position = [85000, 230, -1200]; motion.resetCamera();
  for (const alpha of [0, .3, 1]) assert.deepEqual([...motion.sample(alpha).camera], pilot.position);
});
