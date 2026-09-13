// Listening study, not the proposed general music API. All synthesis and room DSP
// runs in the existing Driftbox rack. This file authors notes, envelopes and mixes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rackDist = resolve(process.env.RACK_DIST || resolve(root, '../driftbox/packages/rack/dist'));
const destination = resolve(process.env.AUDIO_OUTPUT || resolve(root, 'audio-studies/01-flowing'));
const seconds = Number(process.env.AUDIO_SECONDS || 180);
if (!Number.isFinite(seconds) || seconds < 10 || seconds > 600) throw new Error('AUDIO_SECONDS must be 10–600');
const sr = 44100;
const blockSize = 128;
const preroll = 16;
const seed = 9132026;
const importRack = (path) => import(pathToFileURL(resolve(rackDist, path)).href);
const { RackRenderer } = await importRack('headless.js');
const definitions = await Promise.all(['wavetable', 'offset', 'vca', 'mixer', 'reverb', 'out'].map(async (type) => {
  const mod = await importRack(`modules/${type}.js`);
  return mod[`${type.toUpperCase()}_MODULE`];
}));
const registry = Object.fromEntries(definitions.map((def) => [def.type, def]));
let state = seed;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
const clamp = (x, low = 0, high = 1) => Math.min(high, Math.max(low, x));
const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };

// The first listening comparison holds the scene at 22:00 UTC. No evolving data
// response is claimed: density/height mapping is the subsequent listening study.
const scenePath = 'data/processed/regional-air-2018-09-09-night.json';
const sceneBytes = await readFile(resolve(root, scenePath));
const scene = JSON.parse(sceneBytes);
const observation = scene.stations.find((station) => station.name === 'demem');
if (!observation) throw new Error('Memmingen station demem missing');
const sceneFrame = observation.frames.find((frame) => frame.time === '2018-09-09T22:00:00Z');
if (!sceneFrame) throw new Error('Held scene frame missing');

function patch(kind) {
  const modules = [];
  const cables = [];
  const add = (id, type, params) => modules.push({ id, type, params });
  const cable = (from, out, to, input) => cables.push({ from: [from, out], to: [to, input] });
  add('room', 'reverb', { algorithm: 1, size: 0.92, decay: 0.945, damp: 0.42, mix: 1, lowCut: 190, highCut: 6200, gate: 0 });
  add('space', 'out', { level: kind === 'layers' ? 0.48 : 0.55, pan: 0 });
  cable('room', 'out', 'space', 'in');
  add('sendA', 'mixer', {});
  add('sendB', 'mixer', {});
  cable('sendA', 'out', 'sendB', 'in1');
  cable('sendB', 'out', 'room', 'in');
  const lanes = kind === 'layers' ? 5 : 6;
  for (let i = 0; i < lanes; i++) {
    const id = `v${i}`;
    add(`${id}pitch`, 'offset', { offset: 0, gain: 0 });
    add(`${id}a`, 'wavetable', { tune: kind === 'layers' ? 23.97 : 24, position: kind === 'layers' ? 0.09 : 0, index: 0 });
    add(`${id}b`, 'wavetable', { tune: 24, position: kind === 'layers' ? 0.065 : 0, index: 0 });
    cable(`${id}pitch`, 'out', `${id}a`, 'pitch');
    add(`${id}gain`, 'vca', { gain: 0, curve: 0 });
    if (kind === 'layers') {
      cable(`${id}pitch`, 'out', `${id}b`, 'pitch');
      add(`${id}pair`, 'mixer', {});
      cable(`${id}a`, 'out', `${id}pair`, 'in1');
      cable(`${id}b`, 'out', `${id}pair`, 'in2');
      cable(`${id}pair`, 'out', `${id}gain`, 'in');
    } else {
      // An octave modulator adds a little rounded upper-partial attack to a sine.
      add(`${id}octave`, 'offset', { offset: 1, gain: 1 });
      cable(`${id}pitch`, 'out', `${id}octave`, 'in');
      cable(`${id}octave`, 'out', `${id}b`, 'pitch');
      cable(`${id}b`, 'out', `${id}a`, 'pm');
      cable(`${id}a`, 'out', `${id}gain`, 'in');
    }
    add(`${id}dry`, 'out', { level: kind === 'layers' ? 0.52 : 0.62, pan: (i / (lanes - 1) - 0.5) * 1.05 });
    cable(`${id}gain`, 'out', `${id}dry`, 'in');
    cable(`${id}gain`, 'out', i < 4 ? 'sendA' : 'sendB', `in${i < 4 ? i + 1 : i - 2}`);
  }
  return { modules, cables };
}

function layerEvents() {
  const notes = [[50, 47, 45, 50], [57, 54, 57, 59], [64, 62, 64, 62], [66, 69, 66, 64], [71, 74, 69, 71]];
  const events = [];
  for (let lane = 0; lane < notes.length; lane++) {
    let start = [-15, -10, -4, 10, 23][lane];
    let index = 0;
    while (start < seconds - 25) {
      const duration = 39 + random() * 19;
      events.push({ lane, start, duration, note: notes[lane][index++ % notes[lane].length],
        attack: 9 + random() * 7, release: 13 + random() * 7,
        amplitude: (lane < 2 ? 0.085 : 0.065) * (0.82 + random() * 0.25), phase: random() * Math.PI * 2 });
      start += duration + 2 + random() * 9;
    }
  }
  return events.sort((a, b) => a.start - b.start);
}

function toneEvents() {
  const phrases = [
    { at: -1, notes: [66, 69, 64], gaps: [0, 4.8, 11.4] },
    { at: 19, notes: [71, 74, 69, 64], gaps: [0, 3.6, 9.8, 16.2] },
    { at: 44, notes: [62, 66, 71], gaps: [0, 6.3, 12.1] },
    { at: 66, notes: [69, 64, 57, 66], gaps: [0, 4.7, 11.8, 17.9] },
    { at: 93, notes: [74, 71, 66], gaps: [0, 5.7, 14.2] },
    { at: 117, notes: [64, 69, 62, 66], gaps: [0, 4.1, 10.6, 18.1] },
    { at: 145, notes: [71, 69, 64], gaps: [0, 6.8, 14.4] },
  ];
  const available = new Array(6).fill(-Infinity);
  const events = [];
  for (const phrase of phrases) {
    phrase.notes.forEach((note, index) => {
      const start = phrase.at + phrase.gaps[index];
      if (start > seconds - 19) return;
      const lane = available.indexOf(Math.min(...available));
      if (available[lane] > start) throw new Error('Tone voice stealing would truncate a release');
      const duration = 19 + random() * 6;
      available[lane] = start + duration;
      events.push({ lane, note, start, duration, attack: 0.6 + random() * 0.8,
        amplitude: (0.13 + random() * 0.065) * (note >= 71 ? 0.85 : 1), phase: random() * Math.PI * 2 });
    });
  }
  return events;
}

function control(renderer, kind, events, time) {
  const lanes = kind === 'layers' ? 5 : 6;
  for (let lane = 0; lane < lanes; lane++) {
    const id = `v${lane}`;
    const event = events.find((e) => e.lane === lane && time >= e.start && time < e.start + e.duration);
    if (!event) { renderer.setParam(`${id}gain`, 'gain', 0); continue; }
    const age = time - event.start;
    let envelope;
    if (kind === 'layers') {
      envelope = smooth(age / event.attack) * smooth((event.duration - age) / event.release);
      envelope *= 0.88 + 0.12 * Math.sin(age * 2 * Math.PI / 17 + event.phase);
      renderer.setParam(`${id}a`, 'position', 0.075 + 0.025 * Math.sin(time / 11 + event.phase));
      renderer.setParam(`${id}b`, 'position', 0.06 + 0.025 * Math.sin(time / 17 + event.phase));
    } else {
      envelope = smooth(age / event.attack) * Math.exp(-age / 6.8) * smooth((event.duration - age) / 5);
      renderer.setParam(`${id}a`, 'index', 0.018 + 0.14 * Math.exp(-age / 2.8));
    }
    renderer.setParam(`${id}pitch`, 'offset', (event.note - 60 + (kind === 'layers' ? 0.015 : 0)) / 12);
    renderer.setParam(`${id}gain`, 'gain', event.amplitude * envelope);
    // A small stereo drift, not the scene's measured geographical direction.
    renderer.setParam(`${id}dry`, 'pan', Math.sin(time / 29 + event.phase) * (kind === 'layers' ? 0.42 : 0.6));
  }
}

async function renderStem(kind, events) {
  const renderer = new RackRenderer(registry, { sampleRate: sr, frames: blockSize });
  renderer.patch = patch(kind);
  if (renderer.notes.length) throw new Error(JSON.stringify(renderer.notes));
  console.log(`Rendering ${kind}: ${seconds}s, ${events.length} notes, existing rack DSP`);
  const start = performance.now();
  let lastReport = -1;
  const result = renderer.render(seconds + preroll, ({ frame }) => {
    const time = frame / sr - preroll;
    control(renderer, kind, events, time);
    const part = Math.floor(time / 45);
    if (part > lastReport) { console.log(`${kind}: ${Math.max(0, Math.round(time))}s`); lastReport = part; }
  });
  console.log(`${kind} rendered in ${((performance.now() - start) / 1000).toFixed(1)}s`);
  return result.channels.map((channel) => channel.slice(sr * preroll, sr * (preroll + seconds)));
}

function measure(channels) {
  let peak = 0, sum = 0, dc = 0, maxStep = 0, firstAudible = null;
  const windows = [];
  for (let start = 0; start < channels[0].length; start += sr * 5) {
    let local = 0, count = 0;
    for (const channel of channels) for (let i = start; i < Math.min(start + sr * 5, channel.length); i++) {
      const value = channel[i];
      if (!Number.isFinite(value)) throw new Error('Non-finite audio');
      peak = Math.max(peak, Math.abs(value));
      maxStep = Math.max(maxStep, i ? Math.abs(value - channel[i - 1]) : 0);
      sum += value * value; local += value * value; dc += value; count++;
      if (Math.abs(value) > 0.001 && (firstAudible === null || i / sr < firstAudible)) firstAudible = i / sr;
    }
    windows.push({ second: start / sr, rmsDb: 20 * Math.log10(Math.sqrt(local / count) || 1e-12) });
  }
  const samples = channels[0].length * 2;
  return { peak, peakDb: 20 * Math.log10(peak || 1e-12), rmsDb: 20 * Math.log10(Math.sqrt(sum / samples) || 1e-12), dc: dc / samples, maxStep, firstAudible, windows };
}

function finish(channels) {
  // Only boundaries are faded. No limiter or dynamic compression flattens phrasing.
  for (const channel of channels) for (let i = 0; i < channel.length; i++) {
    const t = i / sr;
    channel[i] *= smooth(t / 1.5) * smooth((seconds - t) / 12);
  }
  const before = measure(channels);
  // An RMS match for this first comparison, not a claim of identical perceived loudness.
  const gain = Math.min(10 ** ((-25 - before.rmsDb) / 20), 0.72 / before.peak);
  for (const channel of channels) for (let i = 0; i < channel.length; i++) channel[i] *= gain;
  const metrics = measure(channels);
  if (metrics.peak > 0.73 || Math.abs(metrics.dc) > 0.001 || metrics.firstAudible > 2) throw new Error('Audio level/start validation failed');
  return { channels, metrics, gain };
}

function wav(channels) {
  const frames = channels[0].length;
  const buffer = Buffer.alloc(44 + frames * 4);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sr, 24); buffer.writeUInt32LE(sr * 4, 28); buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < 2; ch++) {
    // Deterministic TPDF dither before 16-bit quantisation.
    const sample = channels[ch][i] * 32767 + random() - random();
    buffer.writeInt16LE(Math.round(clamp(sample, -32768, 32767)), 44 + i * 4 + ch * 2);
  }
  return buffer;
}

await mkdir(resolve(destination, 'masters'), { recursive: true });
const layersScore = layerEvents();
const tonesScore = toneEvents();
const layers = await renderStem('layers', layersScore);
const tones = await renderStem('tones', tonesScore);
const blend = layers.map((channel, ch) => Float32Array.from(channel, (value, i) => value * 0.9 + tones[ch][i] * 0.46));
const sketches = [];
for (const [index, name, channels] of [[1, 'sustained', layers], [2, 'passing', tones], [3, 'confluence', blend]]) {
  const finished = finish(channels);
  const file = `${String(index).padStart(2, '0')}-${name}`;
  await writeFile(resolve(destination, 'masters', `${file}.wav`), wav(finished.channels));
  sketches.push({ name, file, seconds, sampleRate: sr, gain: finished.gain, metrics: finished.metrics });
  console.log(`${file}: RMS ${finished.metrics.rmsDb.toFixed(1)} dBFS, peak ${finished.metrics.peakDb.toFixed(1)} dBFS`);
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['headless.js', 'graph.js', 'compile.js', 'dsp/wavetable.js', ...definitions.map((d) => `modules/${d.type}.js`)];
const rackFiles = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, digest(await readFile(resolve(rackDist, file)))])));
let rackRevision = 'unknown';
try { rackRevision = execFileSync('git', ['-C', rackDist, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
await writeFile(resolve(destination, 'render-manifest.json'), JSON.stringify({
  created: new Date().toISOString(), seed, rackRevision, rackFiles, renderScriptSha256: digest(await readFile(fileURLToPath(import.meta.url))),
  synthesis: 'Existing Driftbox RackRenderer; five sustained lanes, six passing-tone lanes, one Hall per stem. Blend is a linear sum of stems.',
  scene: { file: scenePath, sha256: digest(sceneBytes), station: observation.name, time: sceneFrame.time,
    role: 'Held reference scene only. These first timbre studies do not yet map observations to musical parameters.', source: scene.source },
  pitchVocabulary: 'D major pentatonic across registers, with B and A bass changes',
  score: { layers: layersScore, tones: tonesScore }, sketches,
}, null, 2) + '\n');
console.log(`Masters and manifest: ${destination}`);
