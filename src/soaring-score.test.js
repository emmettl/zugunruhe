import test from 'node:test';
import assert from 'node:assert/strict';
import { soaringMusic, createSoaringSound } from './soaring-score.js';

function fixture() {
  const parameter = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: parameter(), frequency: parameter(), pan: parameter() });
  const context = { state: 'suspended', currentTime: 0, destination: node(), oscillators: [], createGain: node, createStereoPanner: node,
    createOscillator() { const o = { ...node(), stops: [], start() {}, stop(time) { this.stops.push(time); } }; this.oscillators.push(o); return o; },
    async resume() { this.state = 'running'; }, async close() { this.state = 'closed'; } };
  let timer, created = 0;
  const sound = createSoaringSound({ createContext() { created++; return context; }, schedule(fn) { timer = fn; return 1; }, unschedule() { timer = null; } });
  return { context, sound, get created() { return created; }, tick() { context.currentTime += .1; timer?.(); }, get scheduled() { return !!timer; } };
}
test('climb draws phrases together; height enriches tone; gliding opens the sound', () => {
  const level = soaringMusic(), rise = soaringMusic({ height: 500, climb: 3, mode: 'climbing' }), glide = soaringMusic({ mode: 'gliding', climb: -1 });
  assert.ok(rise.interval < level.interval); assert.ok(rise.brightness > level.brightness);
  assert.ok(glide.release > rise.release && glide.spread > rise.spread);
});
test('music is lazy, responds once to departure, ignores companion changes, and stops its clock', async () => {
  const f = fixture(); assert.equal(f.created, 0);
  f.sound.setState({ bird: 0, height: 180, climb: 3, mode: 'climbing', departures: 0 });
  await f.sound.start(); f.tick(); assert.equal(f.context.oscillators.length, 3);
  f.sound.setState({ bird: 0, height: 260, climb: 0, mode: 'seeking', departures: 1 }); f.tick();
  assert.equal(f.context.oscillators.length, 5);
  for (let i = 0; i < 5; i++) f.tick(); assert.equal(f.context.oscillators.length, 5);
  f.sound.setState({ bird: 1, height: 250, climb: -1, mode: 'gliding', departures: 2 }); f.tick();
  assert.equal(f.context.oscillators.length, 5);
  f.sound.stop(); assert.equal(f.scheduled, false); assert.equal(f.sound.playing, false);
  assert.equal(f.context.oscillators[3].stops.length, 2);
  f.sound.dispose(); assert.equal(f.context.state, 'closed'); assert.equal(await f.sound.start(), false);
});
test('stopping while the browser resumes cannot restart the soundtrack', async () => {
  const f = fixture(); let resume;
  f.context.resume = () => new Promise(resolve => { resume = () => { f.context.state = 'running'; resolve(); }; });
  const pending = f.sound.start(); f.sound.stop(); resume();
  assert.equal(await pending, false); assert.equal(f.sound.playing, false); assert.equal(f.scheduled, false);
  f.sound.dispose();
});


test('uncertainty thins the foundation and leaves more silence at equal height and climb', () => {
  const searching = soaringMusic({ height: 250, climb: 0, mode: 'seeking', certainty: .08 });
  const following = soaringMusic({ height: 250, climb: 0, mode: 'gliding', certainty: .75 });
  assert.ok(searching.interval > following.interval + 3);
  assert.ok(searching.foundation < following.foundation * .6);
  assert.ok(searching.brightness < following.brightness);
  assert.ok(soaringMusic({ readiness: 1 }).interval < soaringMusic({ readiness: 0 }).interval);
});
