import test from 'node:test';
import assert from 'node:assert/strict';
import { soaringWeather, cloudShadow } from './soaring-weather.js';
import { thermalAt, thermalIndex, liftAt, soaringAir } from './soaring-model.js';

test('changing wind is bounded and thermal drift integrates that same wind', () => {
  let minZ = Infinity, maxZ = -Infinity;
  for (let t = 0; t <= 10800; t += 7) {
    const w = soaringWeather(t), before = soaringWeather(t - .01), after = soaringWeather(t + .01);
    assert.ok(w.windX >= .55 && w.windX <= 1.65);
    assert.ok(w.windZ >= -.4 && w.windZ <= 1);
    assert.ok(Math.abs((after.driftX - before.driftX) / .02 - w.windX) < 1e-7);
    assert.ok(Math.abs((after.driftZ - before.driftZ) / .02 - w.windZ) < 1e-7);
    const column = thermalAt(7, t), air = soaringAir(column.x, 200, column.z, t);
    assert.equal(thermalIndex(column.x, t), 7);
    assert.equal(air[0], w.windX); assert.equal(air[2], w.windZ);
    minZ = Math.min(minZ, w.windZ); maxZ = Math.max(maxZ, w.windZ);
  }
  assert.ok(minZ < -.35 && maxZ > .95, 'crosswind changes direction gradually');
});

test('broad, narrow and broken columns have distinct lift footprints', () => {
  const columns = [0, 1, 2].map(id => {
    const t = id * 70, w = soaringWeather(t), c = thermalAt(id, t, w);
    // Compare footprints at equal lifecycle age and in full sunlight.
    return thermalAt(id, t, { ...w, cloudX: c.x + 540 * Math.PI / 2, cloudZ: c.z });
  });
  const [broad, narrow, broken] = columns;
  assert.deepEqual(columns.map(c => c.kind), ['broad', 'narrow', 'broken']);
  const core = c => liftAt(c.x, 200, c.z, c);
  assert.ok(narrow.radius < broad.radius && core(narrow) > core(broad));
  assert.ok(liftAt(broad.x + 65, 200, broad.z, broad) / core(broad)
    > liftAt(narrow.x + 65, 200, narrow.z, narrow) / core(narrow) * 2);
  for (const side of [-1, 1]) assert.ok(liftAt(broken.x + side * broken.radius * .48, 200,
    broken.z + side * broken.radius * .18, broken) > core(broken) * 1.4);
  assert.equal(thermalAt(-1, 0).kind, 'broken');
  for (const c of columns) assert.equal(liftAt(c.x, c.top, c.z, c), 0);
});

test('the visible cloud field weakens lift smoothly and keeps repeatable, bounded values', () => {
  const t = 70, base = soaringWeather(t), c = thermalAt(1, t);
  let weakest = Infinity, strongest = 0, darkest = 0;
  for (let offset = -2500; offset <= 2500; offset += 25) {
    const w = { ...base, cloudX: offset }, shadow = cloudShadow(c.x, c.z, w);
    assert.ok(shadow >= 0 && shadow <= 1);
    const column = thermalAt(1, t, w);
    assert.equal(column.sunshine, 1 - .42 * shadow);
    weakest = Math.min(weakest, column.strength); strongest = Math.max(strongest, column.strength);
    darkest = Math.max(darkest, shadow);
    assert.ok(Math.abs(cloudShadow(c.x, c.z, { ...w, cloudX: offset + .01 }) - shadow) < .0001);
  }
  assert.ok(darkest > .9 && strongest > weakest * 1.5);
  assert.deepEqual(soaringWeather(t), base);
  assert.notEqual(cloudShadow(0, 0, base), cloudShadow(0, 0, soaringWeather(t + 120)));
});
