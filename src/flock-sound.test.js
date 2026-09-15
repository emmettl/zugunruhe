import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlockSound, FLOCK_NOTES } from './flock-sound.js';

function fakeContext() {
  const parameter = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: parameter(), pan: parameter(), delayTime: parameter(), frequency: parameter() });
  const context = { state: 'suspended', currentTime: 0, destination: node(), oscillators: [], resumes: 0,
    createGain: node, createDelay: node, createStereoPanner: node,
    createOscillator() { const oscillator = { ...node(), stops: [], start(at) { this.started = at; }, stop(at) { this.stops.push(at); } }; this.oscillators.push(oscillator); return oscillator; },
    async resume() { this.resumes++; this.state = 'running'; }, async close() { this.state = 'closed'; },
  };
  return context;
}
test('click instrument is lazy, uses the score pitch set, limits bursts and fades old voices', async () => {
  const context = fakeContext(); let created = 0;
  const sound = createFlockSound({ createContext() { created++; return context; } });
  assert.equal(created, 0);
  assert.equal(await sound.strike(), FLOCK_NOTES[0]);
  assert.equal(created, 1); assert.equal(context.oscillators.length, 3);
  assert.ok(Math.abs(context.oscillators[0].frequency.value - 369.9944) < .001);
  assert.equal(await sound.strike(), null); assert.equal(context.oscillators.length, 3);
  for (let i = 1; i < 5; i++) { context.currentTime += .4; assert.equal(await sound.strike(), FLOCK_NOTES[i]); }
  assert.equal(context.oscillators[0].stops.length, 2);
  assert.equal(created, 1);
  sound.setEnabled(false); context.currentTime += 1; assert.equal(await sound.strike(), null);
  sound.setEnabled(true); assert.equal(await sound.strike(), FLOCK_NOTES[5]);
  sound.dispose(); assert.equal(context.state, 'closed'); assert.equal(await sound.strike(), null);
});
test('muting while audio resumes cancels the pending note', async () => {
  const context = fakeContext(); let resume;
  context.resume = () => new Promise(resolve => { resume = () => { context.state = 'running'; resolve(); }; });
  const sound = createFlockSound({ createContext: () => context });
  const pending = sound.strike(); sound.setEnabled(false); resume();
  assert.equal(await pending, null); assert.equal(context.oscillators.length, 0);
});
test('audio can be retried after a rejected resume', async () => {
  const context = fakeContext(); context.resume = async () => { throw new Error('Blocked'); };
  const sound = createFlockSound({ createContext: () => context });
  await assert.rejects(sound.strike(), /Blocked/);
  context.resume = async () => { context.state = 'running'; };
  assert.equal(await sound.strike(), FLOCK_NOTES[0]);
});
