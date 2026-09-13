import test from 'node:test';
import assert from 'node:assert/strict';
import { nightSound } from './night-sound.js';

test('the score follows the cloud, islands, visible flow and morning', () => {
  assert.deepEqual(nightSound(12).mix, { sustained: 1, passing: 0, twinkles: 0 });
  assert.deepEqual(nightSound(42).mix, { sustained: 1, passing: 1, twinkles: 0 });
  assert.equal(nightSound(66).mix.twinkles, 0);
  assert.deepEqual(nightSound(84).mix, { sustained: 1, passing: 1, twinkles: 1 });
  const morning = nightSound(126).mix;
  assert.ok(Math.abs(morning.sustained - .82) < 1e-12);
  assert.equal(morning.passing, .35); assert.equal(morning.twinkles, 0);
});

test('forward and reverse scrubs use bounded continuous balances at every boundary', () => {
  for (let index = 12; index <= 126; index += .1) {
    const a = nightSound(index).mix, b = nightSound(index + .01).mix;
    for (const key of Object.keys(a)) {
      assert.ok(a[key] >= 0 && a[key] <= 1);
      assert.ok(Math.abs(a[key] - b[key]) < .003);
    }
  }
});
