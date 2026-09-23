import { clamp } from './soaring-model.js';

// Musical interpretation of one bird's flight, not a measure of its emotions.
export function soaringMusic({ height = 150, climb = 0, mode = 'seeking', certainty = mode === 'climbing' ? 1 : mode === 'gliding' ? .75 : .08, readiness = 0, company = 0 } = {}) {
  const rising = clamp(climb / 4, 0, 1), altitude = clamp((height - 150) / 400, 0, 1);
  const confidence = clamp(certainty, 0, 1), together = clamp(company, 0, 1) * confidence;
  return { interval: 8 - rising * 3 + (1 - confidence) * 6 - clamp(readiness, 0, 1) * .8,
    release: mode === 'climbing' ? 8 : 10, together, foundation: .35 + confidence * .65,
    brightness: (.04 + altitude * .14) * (.4 + confidence * .6), spread: .6 - together * .35,
    breathRate: .065 + rising * .035, rising };
}

/** Opt-in, bounded voices; stopping invalidates a pending browser audio resume. */
export function createSoaringSound({ createContext, schedule = setInterval, unschedule = clearInterval }) {
  let context, output, timer = null, request = 0, active = false, disposed = false;
  let state = {}, last = null, progress = 0, phrase = 0, breath = 0, departure = null, volume = .65, company = 0;
  const drones = [], voices = new Set();
  const frequency = note => 440 * 2 ** ((note - 69) / 12);
  function init() {
    if (context) return;
    context = createContext(); output = context.createGain(); output.gain.value = 0; output.connect(context.destination);
    for (const [note, level] of [[50, .016], [57, .012], [64, .006]]) {
      const oscillator = context.createOscillator(), gain = context.createGain(), pan = context.createStereoPanner();
      oscillator.frequency.value = frequency(note); gain.gain.value = 0;
      oscillator.connect(gain); gain.connect(pan); pan.connect(output); oscillator.start(); drones.push({ oscillator, gain, pan, level });
    }
  }
  function note(midi, music, delay = 0, level = 1, side = 1) {
    if (voices.size >= 4) return;
    const at = context.currentTime + .02 + delay, gain = context.createGain(), pan = context.createStereoPanner();
    const oscillator = context.createOscillator(), overtone = context.createOscillator(), partial = context.createGain();
    oscillator.frequency.value = frequency(midi); overtone.frequency.value = frequency(midi) * 2;
    partial.gain.value = music.brightness; pan.pan.value = Math.sin(phrase * 2.3) * music.spread * side;
    oscillator.connect(gain); overtone.connect(partial); partial.connect(gain); gain.connect(pan); pan.connect(output);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.027 * level, at + 2);
    gain.gain.exponentialRampToValueAtTime(.0001, at + music.release); gain.gain.linearRampToValueAtTime(0, at + music.release + .1);
    const voice = { oscillator, overtone, gain, pan, partial, until: at + music.release + .2 }; voices.add(voice);
    oscillator.onended = () => { for (const node of [oscillator, overtone, gain, pan, partial]) node.disconnect(); voices.delete(voice); };
    for (const node of [oscillator, overtone]) { node.start(at); node.stop(at + music.release + .2); }
  }
  function tick() {
    if (!active || context.state !== 'running') { last = null; return; }
    const now = context.currentTime, dt = last === null ? 0 : clamp(now - last, 0, .25); last = now;
    // Expiry by the audio clock also permits the exact graph to render offline.
    for (const voice of voices) if (voice.until <= now) voices.delete(voice);
    company += (clamp(state.company ?? 0, 0, 1) - company) * (1 - Math.exp(-dt / 4));
    const music = soaringMusic({ ...state, company }); breath += dt * music.breathRate * Math.PI * 2;
    drones.forEach(({ gain, pan, level }, i) => {
      gain.gain.setTargetAtTime(level * (i === 0 ? .75 + music.foundation * .25 : music.foundation) * (.8 + .2 * Math.sin(breath + i * .3)), now, 1.4);
      pan.pan.setTargetAtTime(i === 0 ? -.2 : Math.sin(now * .055 + i * 2) * (.4 - music.together * .2), now, 2);
    });
    progress += dt / music.interval;
    // Selecting another bird establishes a new baseline, without inventing a departure.
    const event = `${state.bird}:${state.departures}`;
    const leaving = departure !== null && event !== departure && state.bird === state.previousBird && state.mode !== 'climbing';
    departure = event;
    if (leaving || progress >= 1) {
      progress = 0;
      const melody = state.mode === 'climbing' ? [62, 64, 66, 69, 74] : state.mode === 'seeking' ? [62, 57] : [69, 64, 57, 66];
      // Departure completes the phrase softly rather than adding a bright cue.
      note(leaving ? 69 : melody[phrase % melody.length], music);
      if (!leaving && music.together > .45 && phrase % 2 === 1)
        note([69, 66, 74][phrase % 3], music, 2.6, .48, -1);
      phrase++;
    }
    state.previousBird = state.bird;
  }
  function stop() {
    request++; active = false; last = null; progress = 0; departure = null;
    if (timer !== null) unschedule(timer); timer = null;
    if (!context) return;
    output.gain.cancelScheduledValues(context.currentTime); output.gain.setTargetAtTime(0, context.currentTime, .035);
    for (const voice of voices) { voice.gain.gain.cancelScheduledValues(context.currentTime); voice.gain.gain.setTargetAtTime(0, context.currentTime, .02); voice.oscillator.stop(context.currentTime + .15); voice.overtone.stop(context.currentTime + .15); }
  }
  return {
    setState(value) { state = { ...value, previousBird: state.previousBird }; },
    async start() {
      if (disposed) return false;
      const token = ++request; init(); await context.resume();
      if (token !== request || disposed || context.state !== 'running') return false;
      active = true; last = null; progress = .8; departure = null;
      output.gain.setTargetAtTime(volume * 5, context.currentTime, .8);
      if (timer === null) timer = schedule(tick, 100);
      return true;
    }, stop,
    setVolume(value) { volume = clamp(Number.isFinite(value) ? value : .65, 0, 1); if (active) output.gain.setTargetAtTime(volume * 5, context.currentTime, .2); },
    dispose() { stop(); disposed = true; for (const { oscillator, gain, pan } of drones) { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); pan.disconnect(); } output?.disconnect(); void context?.close(); },
    get playing() { return active; },
  };
}
