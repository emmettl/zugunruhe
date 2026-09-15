import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import SunCalc from 'suncalc';
import { densityLight, describeVelocity, periodNights, nightAtPosition, validateStation } from './season-model.js';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const index = read('../data/processed/season-nights-index.json');
const mem = read('../data/processed/season-nights/demem.json');

test('seasonal assets preserve availability and the source calendar gap', () => {
  assert.equal(index.stations.length, 37);
  let values = [];
  for (const station of index.stations) {
    const data = validateStation(read(`../data/processed/season-nights/${station.name}.json`), station.name);
    let accepted = 0;
    for (const n of data.nights) {
      assert.equal(n.completeSamples, n.trace.filter(Number.isFinite).length);
      assert.ok(n.pairedSamples <= n.completeSamples);
      assert.equal(n.density !== null, n.completeSamples >= 39);
      if (n.density !== null) {
        accepted++; values.push(...n.density);
        assert.ok(n.density.every(v => Number.isFinite(v) && v >= 0));
        const mean = n.trace.filter(Number.isFinite).reduce((a, b) => a + b, 0) / n.completeSamples;
        assert.ok(Math.abs(mean - n.meanDensity) < .00011);
      }
      if (n.date.startsWith('2018-01') || n.date.startsWith('2018-07')) assert.equal(n.density, null);
    }
    assert.equal(accepted, station.acceptedNights);
    for (const m of station.monthly) assert.equal(m.accepted, data.nights.filter(n => Number(n.date.slice(5, 7)) === m.month && n.density !== null).length);
  }
  values.sort((a, b) => a - b);
  assert.equal(index.scale.densityCap, values[Math.ceil(.99 * values.length) - 1]);
  assert.equal(index.scale.pooledBandValues, values.length);
});

test('first familiar September night retains its independently checked summary', () => {
  const n = mem.nights.find(n => n.date === '2018-09-04');
  assert.equal(n.completeSamples, 45);
  assert.equal(n.meanDensity, 21.92);
  assert.deepEqual(n.trace.slice(33, 36), [null, null, null]);
  assert.deepEqual(n.velocity, [-10.8104, -7.0251]);
});

test('display preserves zero and missingness and uses one capped light function', () => {
  assert.equal(densityLight(null, 20), null);
  assert.equal(densityLight(-1, 20), null);
  assert.equal(densityLight(0, 20), 0);
  assert.equal(densityLight(5, 20), .5);
  assert.equal(densityLight(100, 20), 1);
  assert.equal(describeVelocity([0, 0]).bearing, null);
  assert.equal(describeVelocity([10, 0]).bearing, 90);
  assert.equal(describeVelocity([0, -10]).bearing, 180);
  assert.equal(describeVelocity(null), null);
});

test('season boundaries and pointer edges select real dates without wrapping', () => {
  const spring = periodNights(mem.nights, 'spring'), autumn = periodNights(mem.nights, 'autumn');
  assert.equal(spring[0].date, '2018-02-12'); assert.equal(spring.at(-1).date, '2018-06-30');
  assert.equal(autumn.length, 122);
  assert.equal(nightAtPosition(-100, 800, autumn), autumn[0]);
  assert.equal(nightAtPosition(900, 800, autumn), autumn.at(-1));
  assert.throws(() => validateStation(mem, 'frmtc'));
  const malformed = structuredClone(mem); malformed.nights[246].meanDensity = 'not a number';
  assert.throws(() => validateStation(malformed, 'demem'));
});

test('the fixed four-hour window stays below the horizon at all station/date endpoints', () => {
  // It can include civil twilight; do not describe it as full astronomical darkness.
  for (const s of index.stations) for (let day = 0; day < 365; day++) for (const hour of [22, 25 + 55 / 60]) {
    const time = new Date(Date.UTC(2018, 0, day + 1) + hour * 3600000);
    assert.ok(SunCalc.getPosition(time, s.lat, s.lon).altitude < 0);
  }
});
