import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNightTexture, advanceSeason, nearestNight, visibleNightIndices, DRIFT_DAYS_PER_SECOND, stationPoint, profilesOnDate, transitionEase } from './season-passage-model.js';

test('geography and time use precisely the same selected nightly density', () => {
  const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
  const index = read('../data/processed/season-nights-index.json');
  const studies = new Map(index.stations.map(s => [s.name, read(`../data/processed/season-nights/${s.name}.json`)]));
  for (const date of ['2018-09-29', '2018-07-15', '2018-03-12']) {
    const profiles = profilesOnDate(index.stations, studies, date);
    assert.ok(profiles.every(n => n.date === date));
    const texture = buildNightTexture(profiles, index.scale.densityCap);
    index.stations.forEach((s, i) => {
      const temporal = studies.get(s.name).nights.find(n => n.date === date);
      assert.deepEqual(Array.from(texture.slice(i * 15, (i + 1) * 15)), Array.from(buildNightTexture([temporal], index.scale.densityCap)));
    });
  }
  assert.throws(() => profilesOnDate(index.stations, new Map(), '2018-09-29'));
});

test('the map uses east-right and north-back and transition easing has stable endpoints', () => {
  const origin = stationPoint({ lat: 49, lon: 5.5 });
  assert.equal(origin[0], 0); assert.equal(Math.abs(origin[2]), 0);
  assert.ok(stationPoint({ lat: 50, lon: 6.5 })[0] > 0);
  assert.ok(stationPoint({ lat: 50, lon: 6.5 })[2] < 0);
  assert.equal(transitionEase(-1), 0); assert.equal(transitionEase(2), 1);
  assert.equal(transitionEase(.5), .5);
});

test('night textures preserve missing dates and valid zeros without between-date interpolation', () => {
  const data = buildNightTexture([{ density: null }, { density: Array(15).fill(0) }, { density: Array(15).fill(5) }], 20);
  assert.equal(data.length, 45);
  assert.deepEqual(Array.from(data.slice(0, 15)), Array(15).fill(-1));
  assert.deepEqual(Array.from(data.slice(15, 30)), Array(15).fill(0));
  assert.deepEqual(Array.from(data.slice(30)), Array(15).fill(.5));
});

test('camera drift remains slow, stops at the final date, and cannot jump after backgrounding', () => {
  assert.equal(advanceSeason(5, .1, 122), 5 + .1 * DRIFT_DAYS_PER_SECOND);
  assert.equal(advanceSeason(5, 60, 122), advanceSeason(5, .1, 122));
  assert.equal(advanceSeason(121, .1, 122), 121);
  assert.equal(nearestNight(34.49, 122), 34);
  assert.equal(nearestNight(34.51, 122), 35);
});

test('bounded veil pool retains the selected night and preserves its true index', () => {
  for (let position = 0; position < 365; position += .5) {
    const ids = visibleNightIndices(position, 365);
    assert.ok(ids.length <= 64);
    assert.ok(ids.includes(Math.floor(position)));
    assert.ok(ids.every((n, i) => n >= 0 && n < 365 && (i === 0 || n === ids[i - 1] + 1)));
  }
});
