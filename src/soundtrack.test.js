import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundtrack, fadeCurve, CROSSFADE_SECONDS } from './soundtrack.js';

function fixture(load = async () => ({ duration: 180 })) {
  const gains = [], sources = [], changes = [], intervals = new Map(), timeouts = new Map();
  let count = 0, hidden = false, listener;
  const context = {
    currentTime: 0, state: 'suspended', destination: {},
    addEventListener(_, callback) { listener = callback; },
    async resume() { this.state = 'running'; listener?.(); },
    async suspend() { this.state = 'suspended'; listener?.(); },
    async close() { this.state = 'closed'; listener?.(); },
    createGain() {
      const events = [];
      const node = { connect() {}, disconnect() {}, gain: { value: 0,
        cancelAndHoldAtTime: (time) => events.push(['hold', time]),
        setValueAtTime: (value, time) => events.push(['set', value, time]),
        linearRampToValueAtTime: (value, time) => events.push(['ramp', value, time]),
        setValueCurveAtTime: (curve, time, duration) => events.push(['curve', curve, time, duration]),
      }, events };
      gains.push(node); return node;
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
    loadBuffer() { loads++; return load(); }, timers, isHidden: () => hidden,
    onChange: ({ status }) => changes.push(status),
  });
  return { soundtrack, context, gains, sources, changes, intervals, timeouts,
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
