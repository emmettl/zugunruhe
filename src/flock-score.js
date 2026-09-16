import { createMusicalState, flockMusic } from './flock-music-state.js';
import { createAgitationEnvelope } from './flock-agitation.js';
const midiHz = note => 440 * 2 ** ((note - 69) / 12);
const melody = [66, 69, 64, 71, 69, 74, 66, 62];

/** An optional listening sketch, with its own audio clock and bounded voices. */
export function createFlockScore(context) {
  const output = context.createGain(); output.gain.value = 0; output.connect(context.destination);
  const delay = context.createDelay(1); delay.delayTime.value = .47;
  const feedback = context.createGain(); feedback.gain.value = .27;
  const echo = context.createGain(); echo.gain.value = .19;
  // Echoes return before the output gain, so stopping also silences their tail.
  const bus = context.createGain(); bus.connect(output); bus.connect(delay);
  delay.connect(feedback); feedback.connect(delay); delay.connect(echo); echo.connect(output);
  const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 650; filter.Q.value = .45; filter.connect(bus);
  const drone = [], voices = new Set(), envelope = createAgitationEnvelope(), musicalState = createMusicalState();
  let active = false, last = null, progress = 0, phrase = 0, motion = 0, started = false, breath = 0;
  function startDrones() {
    if (started) return; started = true;
    for (const [note, pan, level] of [[50, -.35, .016], [57, .35, .012], [64, 0, .007]]) {
      const oscillator = context.createOscillator(), gain = context.createGain(), panner = context.createStereoPanner();
      oscillator.type = 'triangle'; oscillator.frequency.value = midiHz(note); gain.gain.value = level; panner.pan.value = pan;
      oscillator.connect(gain); gain.connect(panner); panner.connect(filter); oscillator.start();
      drone.push({ oscillator, gain, panner, pan, level });
    }
  }
  function note(at, music) {
    if (voices.size >= 4) return;
    const index = phrase++;
    const frequency = midiHz(melody[(music.fragmented ? index * 3 : index) % melody.length]);
    const gain = context.createGain(), pan = context.createStereoPanner(), partials = [];
    pan.pan.value = Math.sin(phrase * 2.4) * music.spread; gain.connect(pan); pan.connect(bus);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.018, at + music.attack);
    gain.gain.exponentialRampToValueAtTime(.0001, at + music.release - .1); gain.gain.linearRampToValueAtTime(0, at + music.release);
    const voice = { stop() { gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setTargetAtTime(0, context.currentTime, .025); for (const { oscillator } of partials) oscillator.stop(context.currentTime + .12); } };
    voices.add(voice);
    for (const [multiple, level] of [[1, 1], [2, music.brightness], [3, music.brightness * .2]]) {
      const oscillator = context.createOscillator(), partial = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency * multiple; partial.gain.value = level;
      oscillator.connect(partial); partial.connect(gain); oscillator.start(at); oscillator.stop(at + music.release); partials.push({ oscillator, partial });
    }
    partials[0].oscillator.onended = () => {
      for (const { oscillator, partial } of partials) { oscillator.disconnect(); partial.disconnect(); }
      gain.disconnect(); pan.disconnect(); voices.delete(voice);
    };
  }
  return {
    start() { startDrones(); active = true; last = null; progress = .72; output.gain.setTargetAtTime(.7, context.currentTime, .8); },
    tick(target) {
      if (!active || context.state !== 'running') { last = null; return; }
      const now = context.currentTime, dt = last === null ? 0 : Math.max(0, Math.min(.5, now - last)); last = now;
      const inputs = typeof target === 'number' ? { agitation: target } : target;
      const activity = envelope.advance(inputs.agitation, dt), state = musicalState.advance(inputs, dt), music = flockMusic(activity, state);
      filter.frequency.setTargetAtTime(650 + 1000 * activity + 400 * state.alarm + 180 * state.readiness, now, .7);
      // Quiet foundation, gently changing lateral motion; no agitation gain boost.
      motion += dt * music.motion; breath += dt * music.breathRate * Math.PI * 2;
      drone.forEach((layer, i) => {
        layer.gain.gain.setTargetAtTime(layer.level * (1 - music.breathDepth * (.5 + .5 * Math.sin(breath + i * music.phaseSpread))), now, .5);
        layer.panner.pan.setTargetAtTime(layer.pan + Math.sin(motion * .7 + i * 2) * .12, now, .7);
      });
      progress += dt / music.interval;
      if (progress >= 1) { progress %= 1; note(now + .06, music); }
    },
    stop() {
      active = false; last = null; progress = 0;
      output.gain.cancelScheduledValues(context.currentTime); output.gain.setTargetAtTime(0, context.currentTime, .06);
      for (const voice of voices) voice.stop(); voices.clear();
    },
    dispose() {
      this.stop();
      for (const layer of drone) { layer.oscillator.stop(); layer.oscillator.disconnect(); layer.gain.disconnect(); layer.panner.disconnect(); }
      for (const node of [output, bus, filter, delay, feedback, echo]) node.disconnect();
    },
    get activity() { return envelope.value; },
    get playing() { return active; },
  };
}
