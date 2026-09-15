import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartles } from './flock-startle.js';
import { createFlock } from './flock-model.js';

test('startles rise, fade, expire, copy their location and bound repeated gestures', () => {
  const pulses = createStartles(), point = [1, 2, 3];
  pulses.add(point, 0); point[0] = 99;
  assert.deepEqual(pulses.sample(.1)[0].position, [1, 2, 3]);
  assert.equal(pulses.sample(0)[0].strength, 0);
  assert.ok(pulses.sample(.1)[0].strength > pulses.sample(1)[0].strength);
  assert.deepEqual(pulses.sample(1.35), []);
  for (let i = 0; i < 20; i++) pulses.add([i, 0, 0], 3);
  assert.equal(pulses.sample(3.1).length, 4);
  pulses.clear(); assert.deepEqual(pulses.sample(3.2), []);
});

test('musical startles initially affect only birds within their local radius', () => {
  const a = createFlock(100), b = createFlock(100), source = [...a.position.subarray(0, 3)]; source[2] += 3;
  const positions = [...a.position];
  a.step(); b.step(undefined, null, [{ position: source, strength: 1 }]);
  let changed = 0, distant = 0;
  for (let i = 0; i < a.count; i++) {
    const distance = Math.hypot(...positions.slice(i * 3, i * 3 + 3).map((v, axis) => v - source[axis]));
    const same = [0, 1, 2].every(axis => a.velocity[i * 3 + axis] === b.velocity[i * 3 + axis]);
    if (distance >= 24) { assert.ok(same); distant++; } else if (!same) changed++;
  }
  assert.ok(changed && distant);
});
