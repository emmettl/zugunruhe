import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundtrack, fadeCurve, CROSSFADE_SECONDS } from './soundtrack.js';
import { soundColours } from './sound-colour.js';

function parameter(value = 0) {
  const events = [];
  return { value, events,
    cancelAndHoldAtTime: time => events.push(['hold', time]),
    setValueAtTime: (value, time) => events.push(['set', value, time]),
    linearRampToValueAtTime: (value, time) => events.push(['ramp', value, time]),
    setTargetAtTime: (value, time, tau) => events.push(['target', value, time, tau]),
    setValueCurveAtTime: (curve, time, duration) => events.push(['curve', curve, time, duration]),
  };
}

function fixture(load = async () => ({ duration: 180 }), extra = {}) {
  const gains = [], sources = [], changes = [], intervals = new Map(), timeouts = new Map();
  const filters = [], delays = [];
  let count = 0, hidden = false, listener;
  const context = {
    currentTime: 0, sampleRate: 48000, state: 'suspended', destination: {},
    addEventListener(_, callback) { listener = callback; },
    async resume() { this.state = 'running'; listener?.(); },
    async suspend() { this.state = 'suspended'; listener?.(); },
    async close() { this.state = 'closed'; listener?.(); },
    createGain() {
      const gain = parameter();
      const node = { connect() {}, disconnect() {}, gain, events: gain.events };
      gains.push(node); return node;
    },
    createBiquadFilter() {
      const node = { connect() {}, disconnect() {}, frequency: parameter(350), gain: parameter(), Q: parameter(1) };
      filters.push(node); return node;
    },
    createDelay() {
      const node = { connect() {}, disconnect() {}, delayTime: parameter() };
      delays.push(node); return node;
    },
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, start(at) { this.at = at; }, stop() { this.stopped = true; } };
      sources.push(source); return source;
    },
  };
  const timers = {
    setInterval(fn) { intervals.set(++count, fn); return count; }, clearInterval(id) { intervals.delete(id); },
    setTimeout(fn) { timeouts.set(++count, fn); return count; }, clearTimeout(id) { timeouts.delete(id); },
  };
  let created = 0, loads = 0;
  const soundtrack = createSoundtrack({ createContext() { created++; return context; },
    loadBuffer() { loads++; return load(); }, ...extra, timers, isHidden: () => hidden,
    onChange: ({ status }) => changes.push(status),
  });
  return { soundtrack, context, gains, sources, changes, intervals, timeouts, filters, delays,
    counts: () => ({ created, loads }), hide: () => { hidden = true; } };
}

test('sound is lazy and initial playback pre-schedules a continuous overlap', async () => {
  const f = fixture();
  assert.deepEqual(f.counts(), { created: 0, loads: 0 });
  assert.equal(await f.soundtrack.play(), true);
  assert.deepEqual(f.counts(), { created: 1, loads: 1 });
  assert.equal(f.sources.length, 2);
  assert.equal(f.sources[1].at - f.sources[0].at, 180 - CROSSFADE_SECONDS);
  assert.equal(f.soundtrack.status, 'playing');
  assert.equal(f.intervals.size, 1);
  const curves = f.gains.flatMap(g => g.events.filter(e => e[0] === 'curve'));
  assert.equal(curves.length, 3);
});

test('overlap curves meet without a discontinuity or an equal-power hole', () => {
  const a = fadeCurve(false), b = fadeCurve(true);
  assert.equal(a[0], 1); assert.equal(b[0], 0); assert.equal(b.at(-1), 1);
  for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] ** 2 + b[i] ** 2 - 1) < 1e-6);
});

test('turning off during loading cannot start sound when the fetch completes', async () => {
  let resolve;
  const f = fixture(() => new Promise(r => { resolve = r; }));
  const pending = f.soundtrack.play(); await Promise.resolve();
  f.soundtrack.pause(true); resolve({ duration: 180 });
  assert.equal(await pending, false); assert.equal(f.sources.length, 0);
  assert.equal(f.context.state, 'suspended');
  assert.equal(await f.soundtrack.play(), true);
  assert.deepEqual(f.counts(), { created: 1, loads: 1 });
});

test('rapid off/on during loading uses one fetch and only the latest play intent', async () => {
  let resolve;
  const f = fixture(() => new Promise(r => { resolve = r; }));
  const first = f.soundtrack.play(); await Promise.resolve();
  f.soundtrack.pause(); const latest = f.soundtrack.play();
  resolve({ duration: 180 });
  assert.equal(await first, false); assert.equal(await latest, true);
  assert.equal(f.sources.length, 2); assert.equal(f.timeouts.size, 0);
});

test('pause/resume retains the scheduled musical position and does not duplicate sources', async () => {
  const f = fixture(); await f.soundtrack.play();
  f.context.currentTime = 31; f.soundtrack.pause(true);
  assert.equal(f.intervals.size, 0); assert.equal(f.context.state, 'suspended');
  await f.soundtrack.play();
  assert.equal(f.sources.length, 2); assert.equal(f.sources[0].at, 0.05);
  f.context.currentTime = 140; [...f.intervals.values()][0]();
  assert.equal(f.sources.length, 3);
  assert.equal(f.sources[2].at, 312.05);
});

test('a failed load is retryable and never schedules an empty source', async () => {
  let attempts = 0;
  const f = fixture(async () => { if (++attempts === 1) throw Error('offline'); return { duration: 180 }; });
  assert.equal(await f.soundtrack.play(), false); assert.equal(f.soundtrack.status, 'error');
  assert.equal(f.sources.length, 0);
  assert.equal(await f.soundtrack.play(), true); assert.equal(f.sources.length, 2);
});

test('leaving the page during loading and audio-device interruptions remain silent', async () => {
  let resolve;
  const f = fixture(() => new Promise(r => { resolve = r; }));
  const pending = f.soundtrack.play(); await Promise.resolve();
  f.hide(); resolve({ duration: 180 }); await pending;
  assert.equal(f.sources.length, 0); assert.equal(f.soundtrack.enabled, false);
  assert.equal(await f.soundtrack.play(), false);
  const g = fixture(); await g.soundtrack.play(); await g.context.suspend();
  assert.equal(g.soundtrack.status, 'paused'); assert.equal(g.soundtrack.enabled, false);
});

test('volume does not change source playback rate; disposal cancels a pending start', async () => {
  const f = fixture(); await f.soundtrack.play();
  f.soundtrack.setVolume(0.3);
  assert.deepEqual(f.gains[0].events.at(-1), ['ramp', 0.3, 0.15]);
  assert.ok(f.sources.every(s => s.playbackRate === undefined));
  f.soundtrack.dispose(); assert.ok(f.sources.every(s => s.stopped));
  assert.equal(f.context.state, 'closed');
  let resolve;
  const g = fixture(() => new Promise(r => { resolve = r; }));
  const pending = g.soundtrack.play(); await Promise.resolve(); g.soundtrack.dispose();
  resolve({ duration: 180 }); assert.equal(await pending, false); assert.equal(g.sources.length, 0);
});

test('scene balance is lazy, all stems share one clock, and scrubbing redirects fades without restarting', async () => {
  const f = fixture(async () => ({ sustained: { duration: 180 }, passing: { duration: 180 }, twinkles: { duration: 180 } }));
  f.soundtrack.setMix({ sustained: 1, passing: 0, twinkles: 0 });
  assert.deepEqual(f.counts(), { created: 0, loads: 0 });
  await f.soundtrack.play();
  assert.equal(f.sources.length, 6);
  assert.ok(f.sources.slice(0, 3).every(s => s.at === .05));
  assert.ok(f.sources.slice(3).every(s => s.at === 156.05));
  const passing = f.gains[2], twinkles = f.gains[3];
  assert.equal(passing.gain.value, 0); assert.equal(twinkles.gain.value, 0);
  f.context.currentTime = 10;
  f.soundtrack.setMix({ passing: 1, twinkles: 1 });
  assert.deepEqual(twinkles.events.slice(-2), [['hold', 10], ['target', 1, 10, 1.6]]);
  f.context.currentTime = 10.2;
  f.soundtrack.setMix({ passing: .3, twinkles: 0 });
  assert.deepEqual(twinkles.events.slice(-2), [['hold', 10.2], ['target', 0, 10.2, 2.5]]);
  const events = twinkles.events.length;
  f.soundtrack.setMix({ twinkles: 0 });
  assert.equal(twinkles.events.length, events);
  assert.equal(f.sources.length, 6);
  assert.ok(f.sources.every(s => s.playbackRate === undefined));
  f.soundtrack.pause(true); f.soundtrack.setMix({ passing: 0 }); await f.soundtrack.play();
  assert.equal(f.sources.length, 6);
});

test('mismatched stem durations fail atomically and can be retried', async () => {
  let attempt = 0;
  const f = fixture(async () => ({ sustained: { duration: 180 }, twinkles: { duration: ++attempt === 1 ? 179 : 180 } }));
  assert.equal(await f.soundtrack.play(), false); assert.equal(f.sources.length, 0);
  assert.equal(await f.soundtrack.play(), true); assert.equal(f.sources.length, 4);
});

test('palette is lazy, switches tone gently, and stays independent of score, volume and musical time', async () => {
  const f = fixture();
  f.soundtrack.setPalette('aquatic');
  assert.deepEqual(f.counts(), { created: 0, loads: 0 });
  await f.soundtrack.play();
  assert.deepEqual(f.filters[0].frequency.events.at(-1), ['set', 1500, 0]);
  const starts = f.sources.map(s => s.at), masterEvents = f.gains[0].events.length;
  f.context.currentTime = 12;
  f.soundtrack.setPalette('oxygen');
  assert.deepEqual(f.filters[0].frequency.events.slice(-2), [['hold', 12], ['target', 11000, 12, 1.5]]);
  f.context.currentTime = 12.1;
  f.soundtrack.setPalette('ember');
  assert.deepEqual(f.filters[0].frequency.events.slice(-2), [['hold', 12.1], ['target', 2800, 12.1, 1.5]]);
  const events = f.filters[0].frequency.events.length;
  f.soundtrack.setPalette('ember'); f.soundtrack.setPalette('invalid');
  assert.equal(f.filters[0].frequency.events.length, events);
  assert.equal(f.filters.length, 3); assert.equal(f.delays.length, 1);
  assert.deepEqual(f.sources.map(s => s.at), starts);
  assert.equal(f.gains[0].events.length, masterEvents);
  assert.deepEqual(f.counts(), { created: 1, loads: 1 });
  assert.equal(f.soundtrack.status, 'playing');
  assert.equal(f.delays[0].delayTime.value, .71);
  assert.equal(f.delays[0].delayTime.events.length, 0);
  f.soundtrack.pause(true); f.soundtrack.setPalette('boreal'); await f.soundtrack.play();
  assert.deepEqual(f.sources.map(s => s.at), starts);
});

test('palette profiles keep upper notes unboosted and echoes restrained', () => {
  for (const colour of Object.values(soundColours)) {
    assert.ok(colour.treble <= 0);
    assert.ok(colour.halo >= 0 && colour.halo <= .2);
  }
});


test('density phrases stay opt-in, change spacing without restarting the bed, and dispose together', async () => {
  let phraseLoads = 0;
  const f = fixture(async()=>({sustained:{duration:180}}), {loadPhrases:async()=>{phraseLoads++;return Array.from({length:6},()=>({duration:16}));}});
  f.soundtrack.setActivity(1);
  assert.equal(phraseLoads,0);
  await f.soundtrack.play(); assert.equal(phraseLoads,1);
  const bed = f.sources.slice();
  for(let t=1;t<=4;t++){f.context.currentTime=t;for(const tick of f.intervals.values())tick();}
  assert.equal(f.sources.length,bed.length+1);
  f.soundtrack.setActivity(0);
  for(let t=5;t<=40;t++){f.context.currentTime=t;for(const tick of f.intervals.values())tick();}
  assert.equal(f.sources.length,bed.length+1);
  assert.ok(f.sources.every(s=>!s.stopped)); // Quiet scenes retain sounding tails.
  f.soundtrack.pause(true);assert.equal(f.intervals.size,0);
  await f.soundtrack.play(); assert.equal(phraseLoads,1);
  assert.deepEqual(f.sources.slice(0,bed.length),bed);
  f.soundtrack.dispose(); assert.ok(f.sources.every(s=>s.stopped));
});
