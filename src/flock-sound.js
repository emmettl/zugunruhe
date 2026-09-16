// A provisional instrument: the D-major pentatonic vocabulary of Confluence.
// Keep composition and timbre here so the eventual soundtrack can replace them.
import { createFlockScore } from './flock-score.js';
export const FLOCK_NOTES = [66, 69, 64, 71, 62, 74];
export function createFlockSound({ createContext, notes = FLOCK_NOTES } = {}) {
  let context, master, delay, feedback, wet, enabled = true, disposed = false, pending = false, generation = 0, index = 0, last = -Infinity;
  const voices = new Set();
  let score, scoreTimer, scoreGeneration = 0, agitation = 0, flockState = {};
  function init() {
    context = createContext();
    master = context.createGain(); master.gain.value = .34;
    delay = context.createDelay(1); delay.delayTime.value = .31;
    feedback = context.createGain(); feedback.gain.value = .24;
    wet = context.createGain(); wet.gain.value = .17;
    master.connect(context.destination); master.connect(delay);
    delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(context.destination);
  }
  function stopNotes() {
    generation++;
    for (const voice of voices) voice.stop();
    voices.clear();
    if (context && context.state !== 'closed') {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, .025);
      wet.gain.setTargetAtTime(0, context.currentTime, .025);
    }
  }
  function pauseScore() {
    scoreGeneration++; clearInterval(scoreTimer); scoreTimer = null; score?.stop();
  }
  function silence() { stopNotes(); pauseScore(); }
  return {
    async playScore() {
      if (disposed) return false;
      const request = ++scoreGeneration;
      if (!context) init();
      await context.resume();
      if (disposed || request !== scoreGeneration || context.state !== 'running') return false;
      score ??= createFlockScore(context);
      score.start(); clearInterval(scoreTimer);
      scoreTimer = setInterval(() => score.tick({ ...flockState, agitation }), 100);
      return true;
    },
    pauseScore,
    setAgitation(value) { agitation = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; },
    setState(value) { flockState = { readiness: value.readiness, coherence: value.coherence, alarm: value.alarm }; },
    async strike(pan = 0) {
      if (!enabled || disposed || pending) return null;
      pending = true; const request = generation;
      try {
        if (!context) init();
        await context.resume();
        if (!enabled || disposed || request !== generation || context.state !== 'running') return null;
        const now = context.currentTime;
        if (now - last < .28) return null;
        if (voices.size >= 4) { const oldest = voices.values().next().value; oldest.stop(); voices.delete(oldest); }
        last = now;
        const midi = notes[index++ % notes.length], frequency = 440 * 2 ** ((midi - 69) / 12);
        master.gain.setTargetAtTime(.34, now, .025); wet.gain.setTargetAtTime(.17, now, .025);
        const envelope = context.createGain(), panner = context.createStereoPanner();
        panner.pan.value = Math.max(-.55, Math.min(.55, pan));
        envelope.connect(panner); panner.connect(master);
        const at = now + .012, duration = 3.6, oscillators = [], partialGains = [];
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(.13, at + .075);
        envelope.gain.exponentialRampToValueAtTime(.025, at + .9);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + duration - .04);
        envelope.gain.linearRampToValueAtTime(0, at + duration);
        const voice = { stop() {
          envelope.gain.cancelScheduledValues(context.currentTime);
          envelope.gain.setTargetAtTime(0, context.currentTime, .02);
          for (const oscillator of oscillators) oscillator.stop(context.currentTime + .08);
        } };
        voices.add(voice);
        for (const [multiple, level] of [[1, 1], [2, .13], [3, .025]]) {
          const oscillator = context.createOscillator(), partial = context.createGain();
          oscillator.type = 'sine'; oscillator.frequency.value = frequency * multiple; partial.gain.value = level;
          oscillator.connect(partial); partial.connect(envelope); oscillators.push(oscillator); partialGains.push(partial);
          oscillator.start(at); oscillator.stop(at + duration);
        }
        oscillators[0].onended = () => {
          for (const node of [...oscillators, ...partialGains, envelope, panner]) node.disconnect();
          voices.delete(voice);
        };
        return midi;
      } finally { pending = false; }
    },
    setEnabled(value) { enabled = value; if (!value) stopNotes(); },
    silence,
    dispose() { disposed = true; silence(); score?.dispose(); if (context) void context.close(); },
    get enabled() { return enabled; },
    get scoreActivity() { return score?.activity ?? 0; },
  };
}
