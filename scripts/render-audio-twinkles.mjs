// An additive listening experiment over the approved Confluence master.
// The original three sketches are read-only inputs, never re-rendered here.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const soft = process.argv.includes('--soft');
const destination = resolve(root, soft ? 'audio-studies/03-soft-twinkles' : 'audio-studies/02-twinkles');
const fileStem = soft ? '05-confluence-soft-twinkles' : '04-confluence-twinkles';
const rackDist = resolve(process.env.RACK_DIST || resolve(root, '../driftbox/packages/rack/dist'));
const original = resolve(root, 'audio-studies/01-flowing');
const sha = (data) => createHash('sha256').update(data).digest('hex');
const preservedFiles = ['01-sustained.mp3', '02-passing.mp3', '03-confluence.mp3',
  'masters/03-confluence.wav', 'render-manifest.json'];
const preserved = Object.fromEntries(await Promise.all(preservedFiles.map(async (file) => [file, sha(await readFile(resolve(original, file)))])));
const baseManifest = JSON.parse(await readFile(resolve(original, 'render-manifest.json')));
const previousTwinkles = soft ? JSON.parse(await readFile(resolve(root, 'audio-studies/02-twinkles/render-manifest.json'))) : null;
const bytes = await readFile(resolve(original, 'masters/03-confluence.wav'));
// This writer's own 44-byte PCM header; fail closed on any other source format.
if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 16) !== 'WAVEfmt '
  || bytes.readUInt16LE(20) !== 1 || bytes.readUInt16LE(22) !== 2
  || bytes.readUInt16LE(34) !== 16 || bytes.toString('ascii', 36, 40) !== 'data'
  || bytes.readUInt32LE(40) !== bytes.length - 44) throw new Error('Unexpected Confluence master format');
const sr = bytes.readUInt32LE(24);
const length = (bytes.length - 44) / 4;
const seconds = length / sr;
const base = [new Float32Array(length), new Float32Array(length)];
for (let i = 0; i < length; i++) for (let ch = 0; ch < 2; ch++) base[ch][i] = bytes.readInt16LE(44 + i * 4 + ch * 2) / 32767;

const importRack = (file) => import(pathToFileURL(resolve(rackDist, file)).href);
const { RackRenderer } = await importRack('headless.js');
const types = ['wavetable', 'offset', 'vca', 'mixer', 'reverb', 'out'];
const registry = Object.fromEntries(await Promise.all(types.map(async (type) => {
  const module = await importRack(`modules/${type}.js`);
  return [type, module[`${type.toUpperCase()}_MODULE`]];
})));

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
let seed = 9132027;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// Brief gestures rather than a continuous arpeggiator. Each keeps one direction
// across the stereo field; direction and timing are authored, not observed paths.
const gestures = [
  { at: 6.5, notes: [78, 81, 86], gaps: [0, 1.05, 2.32], pan: -0.35 },
  { at: 27.2, notes: [83, 81, 78, 76], gaps: [0, 0.86, 1.97, 3.31], pan: 0.38 },
  { at: 49.8, notes: [76, 78, 83], gaps: [0, 1.26, 2.71], pan: -0.18 },
  { at: 74.0, notes: [86, 81, 78], gaps: [0, 1.12, 2.55], pan: 0.31 },
  { at: 97.6, notes: [78, 81, 83, 86], gaps: [0, 0.94, 2.07, 3.49], pan: -0.42 },
  { at: 120.8, notes: [83, 81, 76], gaps: [0, 1.35, 2.86], pan: 0.26 },
  { at: 145.6, notes: [76, 78, 81], gaps: [0, 1.09, 2.42], pan: -0.29 },
  { at: 160.9, notes: [86, 83, 78], gaps: [0, 1.32, 2.86], pan: 0.32 },
];
const events = [];
const free = new Array(4).fill(0);
for (const gesture of gestures) gesture.notes.forEach((note, index) => {
  const start = gesture.at + gesture.gaps[index];
  const lane = free.indexOf(Math.min(...free));
  if (free[lane] > start) throw new Error('A twinkle would steal a ringing voice');
  const duration = 4.4 + random() * 0.8;
  free[lane] = start + duration;
  events.push({ lane, start, duration, note, attack: 0.075 + random() * 0.065,
    decay: 0.95 + random() * 0.3, amplitude: (0.026 + random() * 0.01) * (1 - index * 0.085),
    pan: gesture.pan + (index / (gesture.notes.length - 1) - 0.5) * 0.25 * (gesture.pan < 0 ? 1 : -1) });
});
if (soft) for (const event of events) {
  const height = clamp((event.note - 78) / 8);
  event.attack += 0.12 + height * 0.16;
  event.amplitude *= 10 ** (-3 * height / 20);
}

const modules = [], cables = [];
const add = (id, type, params) => modules.push({ id, type, params });
const cable = (from, port, to, input) => cables.push({ from: [from, port], to: [to, input] });
add('send', 'mixer', {});
add('room', 'reverb', { algorithm: 1, size: 0.82, decay: 0.88, damp: 0.53, mix: 1, lowCut: 600, highCut: 5200, gate: 0 });
add('space', 'out', { level: 0.4, pan: 0 });
cable('send', 'out', 'room', 'in');
cable('room', 'out', 'space', 'in');
for (let lane = 0; lane < 4; lane++) {
  const id = `t${lane}`;
  add(`${id}pitch`, 'offset', { offset: 0, gain: 0 });
  // Highest note is D6. Fixed lifts keep the pitch knob <= 2, avoiding clamps.
  add(`${id}lift`, 'offset', { offset: 1, gain: 1 });
  add(`${id}octave`, 'offset', { offset: 1, gain: 1 });
  add(`${id}a`, 'wavetable', { tune: 24, position: 0, index: 0.02 });
  add(`${id}b`, 'wavetable', { tune: 24, position: 0, index: 0 });
  add(`${id}gain`, 'vca', { gain: 0, curve: 0 });
  add(`${id}dry`, 'out', { level: 0.58, pan: 0 });
  cable(`${id}pitch`, 'out', `${id}lift`, 'in');
  cable(`${id}lift`, 'out', `${id}a`, 'pitch');
  cable(`${id}lift`, 'out', `${id}octave`, 'in');
  cable(`${id}octave`, 'out', `${id}b`, 'pitch');
  cable(`${id}b`, 'out', `${id}a`, 'pm');
  cable(`${id}a`, 'out', `${id}gain`, 'in');
  cable(`${id}gain`, 'out', `${id}dry`, 'in');
  cable(`${id}gain`, 'out', 'send', `in${lane + 1}`);
}
const renderer = new RackRenderer(registry, { sampleRate: sr, frames: 128 });
renderer.patch = { modules, cables };
if (renderer.notes.length) throw new Error(JSON.stringify(renderer.notes));
console.log(`Rendering ${events.length} twinkles in ${gestures.length} gestures over ${seconds}s`);
const stem = renderer.render(seconds, ({ frame }) => {
  const time = frame / sr;
  for (let lane = 0; lane < 4; lane++) {
    const id = `t${lane}`;
    const event = events.find((e) => e.lane === lane && time >= e.start && time < e.start + e.duration);
    if (!event) { renderer.setParam(`${id}gain`, 'gain', 0); continue; }
    const age = time - event.start;
    const envelope = smooth(age / event.attack) * Math.exp(-age / event.decay) * smooth((event.duration - age) / 1.3);
    renderer.setParam(`${id}pitch`, 'offset', (event.note - 72) / 12);
    renderer.setParam(`${id}a`, 'index', soft
      ? 0.006 + 0.024 * Math.exp(-age / 0.42)
      : 0.008 + 0.048 * Math.exp(-age / 0.42));
    renderer.setParam(`${id}gain`, 'gain', event.amplitude * envelope);
    renderer.setParam(`${id}dry`, 'pan', event.pan);
  }
}).channels;

function rms(channels) {
  let sum = 0;
  for (const channel of channels) for (const sample of channel) {
    if (!Number.isFinite(sample)) throw new Error('Non-finite PCM sample');
    sum += sample * sample;
  }
  return Math.sqrt(sum / (channels[0].length * 2));
}
const baseRms = rms(base);
const relativeDb = soft ? -25 : -20;
const stemGain = baseRms * 10 ** (relativeDb / 20) / rms(stem);
let peak = 0;
const mix = base.map((channel, ch) => Float32Array.from(channel, (value, i) => {
  stem[ch][i] *= stemGain * smooth((seconds - i / sr) / 12);
  const sample = value + stem[ch][i];
  peak = Math.max(peak, Math.abs(sample));
  return sample;
}));
if (peak > 0.72) throw new Error('Insufficient headroom');
const out = Buffer.from(bytes);
for (let i = 0; i < length; i++) for (let ch = 0; ch < 2; ch++) {
  out.writeInt16LE(Math.round(clamp(mix[ch][i] * 32767 + random() - random(), -32768, 32767)), 44 + i * 4 + ch * 2);
}
await mkdir(resolve(destination, 'masters'), { recursive: true });
await writeFile(resolve(destination, 'masters', `${fileStem}.wav`), out);
for (const file of preservedFiles) if (sha(await readFile(resolve(original, file))) !== preserved[file]) throw new Error(`Original changed: ${file}`);
const rackFiles = Object.fromEntries(await Promise.all(Object.keys(baseManifest.rackFiles).map(async (file) => [file, sha(await readFile(resolve(rackDist, file)))])));
await writeFile(resolve(destination, 'render-manifest.json'), JSON.stringify({
  created: new Date().toISOString(), renderScriptSha256: sha(await readFile(fileURLToPath(import.meta.url))),
  seed: 9132027, preservedOriginals: preserved, rackFiles,
  revision: soft ? {
    previousListeningFile: previousTwinkles.sketches[0].listeningFile,
    changes: 'Twinkle stem 5 dB lower by whole-piece RMS; attacks lengthened by 120–280 ms; up to 3 dB extra attenuation on the highest notes before stem gain; gentler upper-partial transient.',
  } : null,
  scene: baseManifest.scene,
  description: 'Original Confluence PCM plus quiet authored upper-register arpeggio gestures. No observation mapping yet.',
  gestures, score: events, patch: renderer.patch,
  balance: { targetStemRelativeRmsDb: relativeDb, actualStemRelativeRmsDb: 20 * Math.log10(rms(stem) / baseRms), stemGain, mixPeakDb: 20 * Math.log10(peak) },
  sketches: [{ name: soft ? 'confluence with softer twinkles' : 'confluence with twinkles', file: fileStem, seconds, sampleRate: sr }],
}, null, 2) + '\n');
console.log(`Twinkle stem ${(20 * Math.log10(rms(stem) / baseRms)).toFixed(1)} dB below base by whole-piece RMS; peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS`);
