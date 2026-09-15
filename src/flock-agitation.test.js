import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlock } from './flock-model.js';
import { measureAgitation, createAgitationEnvelope, agitationMusic } from './flock-agitation.js';

test('shared direction and a uniform turn are calm; local disorder raises agitation', () => {
  const flock = createFlock(70);
  for (let i = 0; i < flock.count; i++) { flock.velocity.set([10, 0, 0], i * 3); flock.acceleration.set([0, 0, 2], i * 3); }
  assert.equal(measureAgitation(flock), 0);
  for (let i = 0; i < flock.count; i++) { flock.velocity.set([0, 0, 10], i * 3); flock.acceleration.set([-2, 0, 0], i * 3); }
  assert.equal(measureAgitation(flock), 0);
  for (let i = 0; i < 20; i++) { flock.velocity.set([i % 2 ? 10 : -10, 0, 0], i * 3); flock.acceleration.set([0, i % 2 ? 6 : -6, 0], i * 3); }
  assert.ok(measureAgitation(flock) > .6);
  assert.ok(measureAgitation(flock) <= 1);
});
test('agitation grows quickly, settles slowly, and maps to denser brighter phrases', () => {
  const envelope = createAgitationEnvelope();
  for (let i = 0; i < 10; i++) envelope.advance(1, .1);
  const raised = envelope.value; assert.ok(raised > .7);
  for (let i = 0; i < 10; i++) envelope.advance(0, .1);
  assert.ok(envelope.value > raised * .85);
  for (let i = 0; i < 400; i++) envelope.advance(0, .1);
  assert.ok(envelope.value < .01);
  assert.ok(agitationMusic(1).interval < agitationMusic(0).interval / 4);
  assert.ok(agitationMusic(1).brightness > agitationMusic(0).brightness);
  assert.deepEqual(agitationMusic(NaN), agitationMusic(0));
});
