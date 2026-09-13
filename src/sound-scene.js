// A small scene-to-score seam. Publishing is silent and never creates audio.
let current = null;
const listeners = new Set();
export function publishSoundScene(scene) {
  current = scene;
  for (const listener of listeners) listener(scene);
}
export function subscribeSoundScene(listener) {
  listeners.add(listener);
  if (current) listener(current);
  return () => listeners.delete(listener);
}

let clouds = { mode: 'off', fraction: null };
const cloudListeners = new Set();
export function publishCloudSound(scene) {
  clouds = scene;
  for (const listener of cloudListeners) listener(scene);
}
export function subscribeCloudSound(listener) {
  cloudListeners.add(listener); listener(clouds);
  return () => cloudListeners.delete(listener);
}

// An authored response curve: sparse cover remains audible but never gets a
// minimum drone. A true zero, unavailable data, or Off yields silence.
export function cloudMotifGain({ mode, fraction }) {
  return mode === 'off' || !Number.isFinite(fraction) ? 0 : Math.sqrt(Math.max(0,Math.min(1,fraction)));
}
