import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoaringFraming, soaringCompany } from './soaring-framing.js';
import { createSoaringFlock } from './soaring-model.js';

test('company excludes the selected bird and decreases with separation', () => {
  assert.equal(soaringCompany(createSoaringFlock(1), 0), 0);
  const f = createSoaringFlock();
  for (let i = 1; i < f.count; i++) f.position.set(f.position.subarray(0, 3), i * 3);
  assert.equal(soaringCompany(f, 0), 1);
  for (let i = 1; i < f.count; i++) f.position[i * 3] += 600;
  assert.ok(soaringCompany(f, 0) < .001);
});

test('framing opens gradually during separation and keeps a bounded glance towards a guide', () => {
  const f = createSoaringFlock(2), frame = createSoaringFraming();
  f.position.set([0, 200, 0, 350, 230, 20]); f.mode[0] = 'gliding'; f.guide[0] = 1;
  const positions = f.position.slice();
  frame.advance(1 / 60, f, 0); assert.ok(frame.distance < 10.1);
  for (let i = 0; i < 1200; i++) frame.advance(1 / 60, f, 0);
  assert.ok(frame.distance > 14.9 && frame.distance <= 15);
  assert.ok(Math.hypot(...frame.attention) <= 3.001); assert.ok(frame.attention[0] > 2.9);
  assert.deepEqual(f.position, positions);
  f.guide[0] = -1;
  for (let i = 0; i < 1200; i++) frame.advance(1 / 60, f, 0);
  assert.ok(Math.hypot(...frame.attention) < .01);
});
