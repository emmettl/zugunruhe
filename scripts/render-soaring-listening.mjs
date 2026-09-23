// Render the live score graph against the default simulated flight, without WebGL.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..'), out = resolve(root, 'audio-studies/08-soaring');
const files = ['soaring-score.js', 'soaring-model.js', 'soaring-framing.js'];
const modules = new Map(await Promise.all(files.map(async file => [file, await readFile(resolve(root, 'src', file), 'utf8')])));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route('http://soaring-audio.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (!name) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Soaring audio render</title>' });
    if (!modules.has(name)) return route.fulfill({ status: 404, body: '' });
    await route.fulfill({ contentType: 'text/javascript', body: modules.get(name) });
  });
  await page.goto('http://soaring-audio.test/');
  const result = await page.evaluate(async () => {
    const { createSoaringSound } = await import('/soaring-score.js');
    const { createSoaringFlock } = await import('/soaring-model.js');
    const { soaringCompany } = await import('/soaring-framing.js');
    const rate = 24000, seconds = 132, context = new OfflineAudioContext(2, seconds * rate, rate);
    let time = 0, tick;
    const clock = new Proxy(context, { get(target, key) {
      if (key === 'currentTime') return time;
      if (key === 'state') return 'running';
      if (key === 'resume' || key === 'close') return async () => {};
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    const sound = createSoaringSound({ createContext: () => clock, schedule(fn) { tick = fn; return 1; }, unschedule() { tick = null; } });
    const flock = createSoaringFlock(), events = []; let mode;
    await sound.start();
    for (let step = 0; step < 1280; step++) {
      time = step / 10;
      if (flock.mode[0] !== mode) { mode = flock.mode[0]; events.push({ at: time, mode, guide: flock.guide[0] + 1 }); }
      sound.setState({ bird: 0, height: flock.position[1], climb: flock.velocity[1], mode,
        certainty: flock.certainty[0], readiness: flock.readiness[0], departures: flock.departures[0], company: soaringCompany(flock, 0) });
      tick(); for (let i = 0; i < 6; i++) flock.step();
    }
    time = 128; sound.stop();
    const buffer = await context.startRendering();
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1), bytes = new Uint8Array(left.length * 4), view = new DataView(bytes.buffer);
    let peak = 0, power = 0, lastSecondPeak = 0;
    for (let i = 0; i < left.length; i++) for (const [channel, value] of [[0, left[i]], [1, right[i]]]) {
      if (!Number.isFinite(value)) throw new Error('Non-finite sample');
      peak = Math.max(peak, Math.abs(value)); power += value * value;
      if (i >= left.length - rate) lastSecondPeak = Math.max(lastSecondPeak, Math.abs(value));
      view.setInt16(i * 4 + channel * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
    }
    if (peak > .5 || peak < .005 || lastSecondPeak > .00001) throw new Error(`Invalid level or stop tail: ${peak}, ${lastSecondPeak}`);
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { pcm: btoa(binary), rate, seconds, peakDb: 20 * Math.log10(peak), rmsDb: 10 * Math.log10(power / (left.length * 2)), lastSecondPeak, events };
  });
  const pcm = Buffer.from(result.pcm, 'base64'), wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(result.rate, 24); wav.writeUInt32LE(result.rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
  await mkdir(out, { recursive: true }); await writeFile(resolve(out, 'listen-passage.wav'), wav);
  execFileSync('/usr/bin/afconvert', [resolve(out, 'listen-passage.wav'), resolve(out, 'listen-passage.m4a'), '-f', 'm4af', '-d', 'aac', '-b', '128000']);
  await rm(resolve(out, 'listen-passage.wav'));
  const { pcm: ignored, ...report } = result;
  report.sources = Object.fromEntries([...modules].map(([file, source]) => [file, createHash('sha256').update(source).digest('hex')]));
  await writeFile(resolve(out, 'render.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
