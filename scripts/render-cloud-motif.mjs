// First cloud listening sketch: slow, veiled open intervals in the existing
// pitch vocabulary. Driftbox supplies the voices and room; the score is authored.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..'), out = resolve(root, 'audio-studies/05-clouds');
const rack = resolve(process.env.RACK_DIST || resolve(root, '../driftbox/packages/rack/dist'));
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg', sr = 24000, seconds = 180, preroll = 12;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const { RackRenderer } = await import(pathToFileURL(resolve(rack, 'headless.js')));
const registry = Object.fromEntries(await Promise.all(['wavetable', 'offset', 'vca', 'mixer', 'reverb', 'out'].map(async type => {
  const module = await import(pathToFileURL(resolve(rack, `modules/${type}.js`)));
  return [type, module[`${type.toUpperCase()}_MODULE`]];
})));
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const phrases = [[-7,[50,57,64]], [26,[52,59,66]], [61,[50,57,64]], [97,[47,54,62]], [132,[45,52,59]]];
const score = phrases.flatMap(([at, notes], phrase) => notes.map((note, lane) => ({
  lane, note, start: at + [0,4.3,9.1][lane], duration: 24 + lane * 2,
  attack: 4.5 + lane, release: 14, pan: [-.25,.2,-.08][lane] * (phrase % 2 ? -1 : 1),
})));
const modules = [], cables = [];
const add = (id,type,params) => modules.push({id,type,params});
const wire = (a,port,b,input) => cables.push({from:[a,port],to:[b,input]});
add('send','mixer',{});
add('room','reverb',{algorithm:1,size:.93,decay:.94,damp:.7,mix:1,lowCut:160,highCut:2400,gate:0});
add('space','out',{level:.7,pan:0}); wire('send','out','room','in'); wire('room','out','space','in');
for (let lane = 0; lane < 3; lane++) {
  const p = `c${lane}`;
  add(`${p}pitch`,'offset',{offset:0,gain:0});
  add(`${p}a`,'wavetable',{tune:23.96,position:.2,index:0});
  add(`${p}b`,'wavetable',{tune:24.025,position:.14,index:0});
  add(`${p}pair`,'mixer',{}); add(`${p}gain`,'vca',{gain:0,curve:0});
  add(`${p}dry`,'out',{level:.3,pan:0});
  for (const voice of ['a','b']) { wire(`${p}pitch`,'out',`${p}${voice}`,'pitch'); wire(`${p}${voice}`,'out',`${p}pair`,voice === 'a' ? 'in1' : 'in2'); }
  wire(`${p}pair`,'out',`${p}gain`,'in'); wire(`${p}gain`,'out',`${p}dry`,'in'); wire(`${p}gain`,'out','send',`in${lane+1}`);
}
const renderer = new RackRenderer(registry,{sampleRate:sr,frames:128}); renderer.patch = {modules,cables};
if (renderer.notes.length) throw Error(JSON.stringify(renderer.notes));
const result = renderer.render(seconds + preroll, ({frame}) => {
  const time = frame / sr - preroll;
  for (let lane = 0; lane < 3; lane++) {
    const p = `c${lane}`, event = score.find(e => e.lane === lane && time >= e.start && time < e.start + e.duration);
    if (!event) { renderer.setParam(`${p}gain`,'gain',0); continue; }
    const age = time - event.start;
    renderer.setParam(`${p}pitch`,'offset',(event.note - 60) / 12);
    renderer.setParam(`${p}gain`,'gain',.07 * smooth(age / event.attack) * smooth((event.duration - age) / event.release));
    renderer.setParam(`${p}dry`,'pan',event.pan);
  }
}).channels.map(c => c.slice(sr * preroll));
let energy = 0;
for (const c of result) for (let i = 0; i < c.length; i++) {
  c[i] *= smooth(i / sr / 1.5) * smooth((seconds - i / sr) / 14);
  if (!Number.isFinite(c[i])) throw Error('Invalid PCM');
  energy += c[i] * c[i];
}
// Quiet at full cloud cover; never independently raised to the main score's level.
const targetRmsDb = -42, gain = 10 ** (targetRmsDb / 20) / Math.sqrt(energy / (sr * seconds * 2));
const pcm = Buffer.alloc(44 + sr * seconds * 4);
pcm.write('RIFF'); pcm.writeUInt32LE(pcm.length - 8,4); pcm.write('WAVEfmt ',8);
pcm.writeUInt32LE(16,16); pcm.writeUInt16LE(1,20); pcm.writeUInt16LE(2,22); pcm.writeUInt32LE(sr,24);
pcm.writeUInt32LE(sr * 4,28); pcm.writeUInt16LE(4,32); pcm.writeUInt16LE(16,34); pcm.write('data',36); pcm.writeUInt32LE(pcm.length - 44,40);
let peak = 0;
for (let i = 0; i < sr * seconds; i++) for (let ch = 0; ch < 2; ch++) {
  const sample = result[ch][i] * gain; peak = Math.max(peak,Math.abs(sample));
  if (Math.abs(sample) > .25) throw Error('Cloud motif too prominent');
  pcm.writeInt16LE(Math.round(sample * 32767),44 + i * 4 + ch * 2);
}
await mkdir(resolve(out,'masters'),{recursive:true});
await writeFile(resolve(out,'masters/cloud-veil.wav'),pcm);
execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',resolve(out,'masters/cloud-veil.wav'),'-c:a','libmp3lame','-q:a','3',resolve(out,'cloud-veil.mp3')]);
const encoded = await readFile(resolve(out,'cloud-veil.mp3'));
const rackFiles = {};
for (const file of ['headless.js',...Object.keys(registry).map(type => `modules/${type}.js`)]) rackFiles[file] = sha(await readFile(resolve(rack,file)));
await writeFile(resolve(out,'manifest.json'),JSON.stringify({description:'Cloud veil: authored slow open intervals, first listening experiment.',seconds,sampleRate:sr,score,patch:renderer.patch,targetRmsDb,peakDb:20*Math.log10(peak),gain,rackFiles,scriptSha256:sha(await readFile(import.meta.filename)),encoded:{bytes:encoded.length,sha256:sha(encoded)}},null,2)+'\n');
console.log(JSON.stringify({targetRmsDb,peakDb:20*Math.log10(peak),bytes:encoded.length}));
