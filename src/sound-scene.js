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
