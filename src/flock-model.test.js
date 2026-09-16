import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlock, STEP } from './flock-model.js';

test('social neighbourhoods select the seven nearest distinct birds', () => {
  const flock = createFlock(32);
  for (let i = 0; i < flock.count; i++) {
    const expected = Array.from({ length: flock.count }, (_, j) => j).filter(j => j !== i).sort((a, b) => {
      const d = j => Math.hypot(...[0, 1, 2].map(axis => flock.position[j * 3 + axis] - flock.position[i * 3 + axis]));
      return d(a) - d(b);
    }).slice(0, 7);
    assert.deepEqual([...flock.neighbours.subarray(i * 7, i * 7 + 7)], expected);
  }
});

test('two migrating passages stay cohesive with finite positions and limited airspeeds and banks', () => {
  const flock = createFlock();
  const stages = new Set();
  for (let tick = 0; tick < 9000; tick++) {
    flock.step(); stages.add(flock.life.state.stage);
    if (tick % 60) continue;
    for (let i = 0; i < flock.count; i++) {
      const p = flock.position.subarray(i * 3, i * 3 + 3), velocity = flock.velocity.subarray(i * 3, i * 3 + 3);
      assert.ok([...p, ...velocity, flock.bank[i]].every(Number.isFinite));
      assert.ok(Math.hypot(...velocity) >= 8.499 && Math.hypot(...velocity) <= 14.001);
      assert.ok(Math.abs(flock.bank[i]) <= .8);
      assert.ok(Math.hypot(...p.map((v, axis) => v - flock.life.anchor[axis])) < 155);
      assert.ok(Math.hypot(...p.map((v, axis) => v - flock.centre[axis])) < 105);
    }
  }
  assert.deepEqual([...stages], ['gathering', 'stirring', 'departing', 'passage', 'regrouping']);
  assert.equal(flock.life.state.passages, 2);
  assert.ok(Math.hypot(...flock.centre) > 200, 'passage leaves the original roost');
});

test('a disturbance affects nearby birds first and repeated inputs reproduce the same flight', () => {
  const a = createFlock(80), b = createFlock(80), c = createFlock(80);
  const threat = [...b.position.subarray(0, 3)]; threat[2] += 2;
  const start = [...b.position];
  a.step(); b.step(STEP, threat); c.step();
  assert.deepEqual(a.position, c.position);
  let changed = 0, distant = 0;
  for (let i = 0; i < a.count; i++) {
    const distance = Math.hypot(...start.slice(i * 3, i * 3 + 3).map((v, axis) => v - threat[axis]));
    const same = [0, 1, 2].every(axis => a.velocity[i * 3 + axis] === b.velocity[i * 3 + axis]);
    if (distance >= 18) { assert.ok(same); distant++; } else if (!same) changed++;
  }
  assert.ok(changed > 0 && distant > 0);
  for (let i = 0; i < 1200; i++) b.step(STEP, i < 180 ? threat : null);
  assert.ok([...b.position, ...b.velocity].every(Number.isFinite));
});
