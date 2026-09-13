// Encode the listening masters with one constant loudness adjustment per sketch.
// Requires FFmpeg with libmp3lame. Does not compress the musical dynamics.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(process.env.AUDIO_OUTPUT || resolve(root, 'audio-studies/01-flowing'));
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';
const run = (args) => execFileSync(ffmpeg, ['-hide_banner', '-nostats', ...args], {
  encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
});
// spawnSync exposes stderr without turning a successful analysis into an exception.
function analyse(path) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', path,
    '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  const summary = result.stderr.slice(result.stderr.lastIndexOf('Summary:'));
  const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const truePeakDb = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  const loudnessRangeLu = Number(summary.match(/LRA:\s+([\d.]+) LU/)?.[1]);
  if (![lufs, truePeakDb, loudnessRangeLu].every(Number.isFinite)) throw new Error(summary);
  return { lufs, truePeakDb, loudnessRangeLu };
}

const manifestPath = resolve(directory, 'render-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath));
for (const sketch of manifest.sketches) {
  const input = resolve(directory, 'masters', `${sketch.file}.wav`);
  const output = resolve(directory, `${sketch.file}.mp3`);
  const source = analyse(input);
  const adjustmentDb = -24 - source.lufs;
  run(['-y', '-i', input, '-af', `volume=${adjustmentDb}dB`, '-c:a', 'libmp3lame', '-b:a', '192k',
    '-id3v2_version', '3', '-metadata', `title=${sketch.name[0].toUpperCase()}${sketch.name.slice(1)}`,
    '-metadata', 'artist=Motion Studies', '-metadata', 'album=Zugunruhe — first listening sketches', output]);
  const decoded = analyse(output);
  if (Math.abs(decoded.lufs + 24) > 0.5 || decoded.truePeakDb > -3) throw new Error(`Encoded level check failed: ${sketch.name}`);
  sketch.listeningFile = { file: `${sketch.file}.mp3`, bytes: (await stat(output)).size, adjustmentDb,
    sha256: createHash('sha256').update(await readFile(output)).digest('hex'), ...decoded };
  console.log(`${sketch.name}: ${decoded.lufs} LUFS, ${decoded.truePeakDb} dBTP, ${(sketch.listeningFile.bytes / 1e6).toFixed(1)} MB`);
}
manifest.encoding = { codec: 'MP3 / libmp3lame / 192 kbit/s', targetLufs: -24,
  processing: 'Constant gain only. Dynamics preserved. Encoded files decoded and checked for loudness and true peak.',
  encoder: execFileSync(ffmpeg, ['-version'], { encoding: 'utf8' }).split('\n')[0] };
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
