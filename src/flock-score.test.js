import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlockScore } from './flock-score.js';

function contextStub() {
  const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), pan: param(), frequency: param(), delayTime: param(), Q: param() });
  return { currentTime: 0, state: 'running', destination: node(), oscillators: [],
    createGain: node, createDelay: node, createStereoPanner: node, createBiquadFilter: node,
    createOscillator() { const oscillator = { ...node(), end: Infinity, ended: false, start() {}, stop(time = 0) { this.end = time; } }; this.oscillators.push(oscillator); return oscillator; },
    advance(dt) { this.currentTime += dt; for (const oscillator of this.oscillators) if (!oscillator.ended && oscillator.end <= this.currentTime) { oscillator.ended = true; oscillator.onended?.(); } },
  };
}
function run(activity) {
  const context = contextStub(), score = createFlockScore(context); score.start();
  for (let i = 0; i < 400; i++) { context.advance(.1); score.tick(activity); }
  const notes = (context.oscillators.length - 3) / 3; score.dispose(); return notes;
}
test('actual audio scheduling becomes denser as measured agitation rises', () => {
  const calm = run(0), agitated = run(1);
  assert.ok(calm >= 3 && calm <= 5); assert.ok(agitated > calm * 3);
});
test('stopping prevents new phrases and resuming reuses the foundation without a catch-up burst', () => {
  const context = contextStub(), score = createFlockScore(context); score.start();
  for (let i = 0; i < 50; i++) { context.advance(.1); score.tick(1); }
  score.stop(); const count = context.oscillators.length;
  context.advance(120); score.tick(1); assert.equal(context.oscillators.length, count);
  score.start(); score.tick(1); assert.equal(context.oscillators.length, count);
  context.advance(.1); score.tick(1); assert.equal(context.oscillators.length, count);
  score.dispose(); assert.equal(score.playing, false);
  assert.ok(context.oscillators.every(oscillator => oscillator.end < Infinity));
});
