// Retain the approved pitch, balance and room; extract six complete gestures
// with a short lead-in and a gently faded tail. Never normalise individual clips.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url).pathname;
const out = `${root}audio-studies/06-density`;
const source = `${root}audio-studies/04-responsive/masters/twinkles.wav`;
const score = JSON.parse(await readFile(`${root}audio-studies/03-soft-twinkles/render-manifest.json`));
await mkdir(out, { recursive: true });
const phrases = [];
for (const [index, gesture] of score.gestures.slice(0,6).entries()) {
  const file = `phrase-${index}.mp3`, start = gesture.at - .5;
  execFileSync(process.env.FFMPEG_BIN || 'ffmpeg', ['-v','error','-y','-ss',String(start),'-i',source,'-t','16','-af','afade=t=in:d=0.3,afade=t=out:st=13:d=3','-ar','24000','-c:a','libmp3lame','-q:a','3',`${out}/${file}`]);
  const bytes = await readFile(`${out}/${file}`);
  phrases.push({ file, start, seconds:16, notes:gesture.notes, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(`${out}/manifest.json`, JSON.stringify({ source:'audio-studies/04-responsive/masters/twinkles.wav', sourceSha256:createHash('sha256').update(await readFile(source)).digest('hex'), description:'Approved soft twinkle gestures, fixed levels, 0.5-second lead-in and 3-second tail fade. No pitch or loudness normalisation.', phrases },null,2)+'\n');
