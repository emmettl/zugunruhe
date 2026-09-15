import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { observationAt, connected, distanceKm, validateMigration, advanceClock } from './migration-model.js';

test('an observation stays at its recorded fix and disappears across gaps and track ends', () => {
  const fixes = [[0, 8, 48], [1800, 9, 47], [18000, 3, 40]];
  assert.equal(observationAt(fixes, -1), null);
  assert.deepEqual(observationAt(fixes, 2500), { fix: fixes[1], index: 1 });
  assert.equal(observationAt(fixes, 10000), null);
  assert.deepEqual(observationAt(fixes, 18000), { fix: fixes[2], index: 2 });
  assert.equal(observationAt(fixes, 18001), null);
  assert.equal(connected(fixes[0], fixes[1]), true);
  assert.equal(connected(fixes[1], fixes[2]), false);
});
test('straight-line displacement uses coordinates on the earth', () => {
  assert.equal(distanceKm([0, 8, 48], [1, 8, 48]), 0);
  assert.ok(Math.abs(distanceKm([0, 0, 0], [1, 1, 0]) - 111.195) < .01);
});
test('playback stops at the end without wrapping or advancing backwards', () => {
  assert.equal(advanceClock(99, 2, 6, 100), 100);
  assert.equal(advanceClock(50, -5, 6, 100), 50);
});
test('prepared observations are ordered and source-limited, including fractional timestamps', () => {
  const data = validateMigration(JSON.parse(fs.readFileSync(new URL('../data/processed/migration-storks.json', import.meta.url))));
  assert.equal(data.tracks.length, 15);
  assert.equal(data.sourceCount, 155173);
  assert.equal(data.tracks.reduce((n, t) => n + t.fixes.length, 0), 28298);
  assert.equal(data.start, Math.min(...data.tracks.map(t => t.fixes[0][0])));
  assert.equal(data.end, Math.max(...data.tracks.map(t => t.fixes.at(-1)[0])));
  const b = data.tracks.find(t => t.id === 'linus-b');
  assert.ok(Math.min(...b.fixes.map(f => f[2])) < 31);
  assert.ok(data.tracks.some(t => t.fixes.some(f => f[0] % 1 !== 0)));
  assert.throws(() => validateMigration({ ...data, tracks: [{ fixes: [[1, 2, 3], [1, 3, 4]] }] }), /Invalid recorded fix/);
});
