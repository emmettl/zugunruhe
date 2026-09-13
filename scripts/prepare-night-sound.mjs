// Recover the three linear stems from the retained listening masters. No new
// composition or independent loudness normalisation: their sum preserves Confluence.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const original = resolve(root, 'audio-studies/01-flowing');
const soft = resolve(root, 'audio-studies/03-soft-twinkles');
const out = resolve(root, 'audio-studies/04-responsive');
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(resolve(original, 'render-manifest.json')));
const softManifest = JSON.parse(await readFile(resolve(soft, 'render-manifest.json')));
const files = [resolve(original, 'masters/01-sustained.wav'), resolve(original, 'masters/02-passing.wav'),
  resolve(original, 'masters/03-confluence.wav'), resolve(soft, 'masters/05-confluence-soft-twinkles.wav')];
const pcm = await Promise.all(files.map(file => readFile(file)));
for (const b of pcm) if (b.toString('ascii', 8, 16) !== 'WAVEfmt ' || b.readUInt16LE(20) !== 1
  || b.readUInt16LE(22) !== 2 || b.readUInt16LE(34) !== 16 || b.toString('ascii', 36, 40) !== 'data'
  || b.length !== pcm[0].length || b.readUInt32LE(24) !== pcm[0].readUInt32LE(24)) throw Error('Incompatible masters');
const listenGain = 10 ** (softManifest.sketches[0].listeningFile.adjustmentDb / 20);
const weights = [.9 * manifest.sketches[2].gain / manifest.sketches[0].gain,
  .46 * manifest.sketches[2].gain / manifest.sketches[1].gain];
const stems = [Buffer.from(pcm[0]), Buffer.from(pcm[1]), Buffer.from(pcm[3])];
let errorPower = 0, peak = 0;
for (let i = 44; i < pcm[0].length; i += 2) {
  const values = [pcm[0].readInt16LE(i) * weights[0], pcm[1].readInt16LE(i) * weights[1],
    pcm[3].readInt16LE(i) - pcm[2].readInt16LE(i)].map(v => v * listenGain);
  const sum = values.reduce((a, b) => a + b, 0);
  errorPower += ((sum - pcm[3].readInt16LE(i) * listenGain) / 32768) ** 2;
  peak = Math.max(peak, Math.abs(sum / 32768));
  values.forEach((v, n) => { if (Math.abs(v) > 32767) throw Error('Stem clipping'); stems[n].writeInt16LE(Math.round(v), i); });
}
const reconstructionRmsDb = 10 * Math.log10(errorPower / ((pcm[0].length - 44) / 2));
if (reconstructionRmsDb > -85 || peak > .72) throw Error('Reconstruction check failed');
await mkdir(resolve(out, 'masters'), { recursive: true });
const encoded = [];
for (const [n, name] of ['sustained', 'passing', 'twinkles'].entries()) {
  const input = resolve(out, 'masters', `${name}.wav`), output = resolve(out, `${name}.mp3`);
  await writeFile(input, stems[n]);
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-ar', '24000', '-c:a', 'libmp3lame', '-q:a', '3', output]);
  const bytes = await readFile(output);
  encoded.push({ name, file: `${name}.mp3`, bytes: bytes.length, sha256: sha(bytes) });
}
await writeFile(resolve(out, 'manifest.json'), JSON.stringify({
  description: 'Synchronized Confluence stems at the approved soft-twinkle balance. MP3 VBR, 24 kHz stereo.',
  sources: files.map((file, n) => ({ file: file.slice(root.length + 1), sha256: sha(pcm[n]) })),
  seconds: 180, sampleRate: 24000, listenGain, weights, reconstructionRmsDb,
  sumPeakDb: 20 * Math.log10(peak), stems: encoded,
}, null, 2) + '\n');
console.log(JSON.stringify({ reconstructionRmsDb, sumPeakDb: 20 * Math.log10(peak), encoded }, null, 2));
