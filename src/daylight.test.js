import test from 'node:test';
import assert from 'node:assert/strict';
import { daylightAt } from './daylight.js';

test('Memmingen afterglow is western and fades continuously into night', () => {
  const start = Date.parse('2018-09-04T18:00:00Z');
  const dusk = daylightAt(start);
  assert.ok(dusk.direction[0] < -.9);
  assert.ok(dusk.altitude < 0 && dusk.altitude > -3);
  assert.ok(dusk.warmth > .9);
  let last = dusk;
  for (let minute = 1; minute <= 120; minute++) {
    const current = daylightAt(start + minute*60000);
    assert.ok(current.twilight <= last.twilight);
    assert.ok(current.warmth <= last.warmth);
    assert.ok(Math.abs(current.warmth-last.warmth) < .03);
    last = current;
  }
  assert.equal(last.twilight, 0);
  assert.equal(last.warmth, 0);
});

test('morning returns from the east, using the selected date and UTC timestamp', () => {
  const dawn = daylightAt('2018-09-05T04:45:00Z');
  assert.ok(dawn.direction[0] > .8);
  assert.ok(dawn.twilight > 0);
  const a = daylightAt('2018-09-02T18:00:00Z');
  const b = daylightAt('2018-09-04T18:00:00Z');
  assert.notEqual(a.altitude,b.altitude);
  assert.deepEqual(a,daylightAt('2018-09-02T20:00:00+02:00'));
});
