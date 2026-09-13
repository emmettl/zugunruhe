// Musical time belongs to the AudioContext. Scene changes alter the balance of
// synchronized stems, never their playback position, pitch or repeat timing.
export const CROSSFADE_SECONDS = 24;

export function fadeCurve(incoming, samples = 129) {
  return Float32Array.from({ length: samples }, (_, i) => {
    const angle = i / (samples - 1) * Math.PI / 2;
    return incoming ? Math.sin(angle) : Math.cos(angle);
  });
}

export function createSoundtrack({ createContext, loadBuffer, onChange = () => {},
  isHidden = () => false, timers = globalThis, initialVolume = 0.65 }) {
  let context, master, buffers, loading, desired = false, disposed = false;
  let duration = 0, mix = {};
  const layers = new Map();
  let status = 'off', volume = Math.max(0, Math.min(1, initialVolume));
  let generation = 0, started = false, nextStart = 0, interval, suspension;
  const sources = new Set();
  const publish = (next) => { if (next !== status) { status = next; onChange({ status, volume }); } };
  const clearTimers = () => {
    if (interval !== undefined) timers.clearInterval(interval);
    if (suspension !== undefined) timers.clearTimeout(suspension);
    interval = suspension = undefined;
  };
  function ramp(value, duration) {
    if (!master) return;
    const gain = master.gain, now = context.currentTime;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else { gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); }
    if (duration) gain.linearRampToValueAtTime(value, now + duration);
    else gain.setValueAtTime(value, now);
  }
  function schedule(at, first = false) {
    for (const [name, buffer] of Object.entries(buffers)) {
      const source = context.createBufferSource(), envelope = context.createGain();
      source.buffer = buffer;
      envelope.gain.setValueAtTime(first ? 1 : 0, at);
      if (!first) envelope.gain.setValueCurveAtTime(fadeCurve(true), at, CROSSFADE_SECONDS);
      envelope.gain.setValueCurveAtTime(fadeCurve(false), at + buffer.duration - CROSSFADE_SECONDS, CROSSFADE_SECONDS);
      source.connect(envelope); envelope.connect(layers.get(name));
      sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); envelope.disconnect(); };
      source.start(at);
    }
  }
  function replenish() {
    if (!desired || !buffers || disposed) return;
    // Keep more than a complete cycle scheduled, so a busy WebGL frame cannot
    // disturb a join. Suspended contexts retain their scheduled musical position.
    const now = context.currentTime;
    if (nextStart < now) nextStart = now + 0.05;
    while (nextStart < now + duration) {
      schedule(nextStart);
      nextStart += duration - CROSSFADE_SECONDS;
    }
  }
  function ensureContext() {
    if (context) return;
    context = createContext();
    master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    context.addEventListener('statechange', () => {
      // Device interruptions should never leave the button claiming sound is on.
      if (desired && status === 'playing' && context.state !== 'running') pause(true);
    });
  }
  async function play() {
    if (disposed || isHidden()) return false;
    desired = true;
    const ticket = ++generation;
    clearTimers();
    publish(buffers ? 'starting' : 'loading');
    try {
      // Create and resume synchronously inside the originating user gesture.
      ensureContext();
      const resume = context.resume();
      if (!buffers && !loading) loading = Promise.resolve().then(() => loadBuffer(context)).then((loaded) => {
        if (disposed) return;
        const candidate = loaded?.duration ? { recording: loaded } : loaded;
        const entries = Object.entries(candidate || {});
        const length = entries[0]?.[1]?.duration;
        if (!entries.length || !Number.isFinite(length) || length <= CROSSFADE_SECONDS * 2
          || entries.some(([, b]) => !Number.isFinite(b?.duration) || Math.abs(b.duration - length) > .001)) throw new Error('Invalid soundtrack stems');
        buffers = candidate; duration = length;
        for (const [name] of entries) {
          const layer = context.createGain(); layer.gain.value = mix[name] ?? 1;
          layer.connect(master); layers.set(name, layer);
        }
      }).finally(() => { loading = undefined; });
      await Promise.all([resume, loading]);
      if (disposed || !desired || ticket !== generation) return false;
      if (isHidden()) { pause(true); return false; }
      if (context.state !== 'running') throw new Error('Audio is suspended');
      if (!started) {
        const at = context.currentTime + 0.05;
        schedule(at, true);
        nextStart = at + duration - CROSSFADE_SECONDS;
        started = true;
      }
      replenish();
      interval = timers.setInterval(replenish, 1000);
      ramp(volume, 0.8);
      publish('playing');
      return true;
    } catch {
      if (!disposed && desired && ticket === generation) {
        desired = false; clearTimers(); ramp(0, 0);
        void context?.suspend().catch(() => {});
        publish('error');
      }
      return false;
    }
  }
  function pause(immediate = false) {
    if (disposed) return;
    desired = false; ++generation; clearTimers();
    ramp(0, immediate ? 0 : 0.6);
    publish('paused');
    const suspend = () => {
      suspension = undefined;
      if (!desired && !disposed) void context?.suspend().catch(() => {});
    };
    if (immediate) suspend();
    else suspension = timers.setTimeout(suspend, 650);
  }
  function setVolume(value) {
    if (!Number.isFinite(value)) return;
    volume = Math.max(0, Math.min(1, value));
    if (desired && status === 'playing') ramp(volume, 0.15);
  }
  function setMix(values) {
    if (disposed || !values || typeof values !== 'object') return;
    for (const [name, value] of Object.entries(values)) {
      if (!Number.isFinite(value)) continue;
      const target = Math.max(0, Math.min(1, value)), previous = mix[name] ?? 1;
      // Ignore tiny render-frame differences, retaining the last scheduled target.
      if (target === previous && mix[name] !== undefined) continue;
      if (mix[name] !== undefined && target !== 0 && target !== 1 && Math.abs(target - previous) < .005) continue;
      mix[name] = target;
      const gain = layers.get(name)?.gain;
      if (!gain) continue;
      const now = context.currentTime;
      if (!started) gain.setValueAtTime(target, now);
      else {
        if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
        else { const held = gain.value; gain.cancelScheduledValues(now); gain.setValueAtTime(held, now); }
        // Roughly five seconds to arrive, eight to recede. A new scrub redirects
        // the current fade rather than queueing transitions or snapping gains.
        gain.setTargetAtTime(target, now, target > previous ? 1.6 : 2.5);
      }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; desired = false; ++generation; clearTimers();
    for (const source of sources) source.stop();
    sources.clear();
    for (const layer of layers.values()) layer.disconnect();
    layers.clear(); buffers = undefined;
    void context?.close().catch(() => {});
  }
  return { play, pause, setVolume, setMix, dispose,
    get status() { return status; }, get enabled() { return desired; } };
}
