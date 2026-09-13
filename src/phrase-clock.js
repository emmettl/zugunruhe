// Musical seconds, independent of the visual timeline. The same clock drives
// browser playback and the retained listening comparisons.
export function createPhraseClock() {
  let target = 0, activity = 0, last = null, progress = .85, phrase = 0;
  return {
    setActivity(value) { target = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; },
    advance(now) {
      if (last === null) { last = now; activity = target; return null; }
      // A delayed timer leaves space instead of playing catch-up notes.
      const dt = Math.max(0, Math.min(2, now - last)); last = now;
      const decay = Math.exp(-dt / 8), previous = activity;
      activity = target + (activity - target) * decay;
      if (target === 0) return null;
      progress += (target * dt + (previous - target) * 8 * (1 - decay)) / 18;
      if (progress < 1) return null;
      progress -= 1;
      return { at: now + .1, index: phrase++ % 6 };
    },
  };
}
