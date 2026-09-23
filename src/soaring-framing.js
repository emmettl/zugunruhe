import { clamp } from './soaring-model.js';

// Presentation only: neither proximity nor the camera changes the flight rules.
export function soaringCompany(flock, selected) {
  const point = flock.position.subarray(selected * 3, selected * 3 + 3);
  let weight = 0;
  for (let i = 0; i < flock.count; i++) {
    if (i === selected) continue;
    const distance = Math.hypot(...point.map((p, j) => p - flock.position[i * 3 + j]));
    weight += Math.exp(-((distance / 100) ** 2));
  }
  return clamp(weight / 5, 0, 1);
}

export function createSoaringFraming() {
  const attention = [0, 0, 0];
  let company = 1;
  return {
    advance(dt, flock, selected) {
      const ease = 1 - Math.exp(-Math.max(0, dt) / 3);
      company += (soaringCompany(flock, selected) - company) * ease;
      const guide = flock.mode[selected] === 'gliding' ? flock.guide[selected] : -1;
      const target = [0, 0, 0];
      if (guide >= 0) {
        for (let j = 0; j < 3; j++) target[j] = flock.position[guide * 3 + j] - flock.position[selected * 3 + j];
        // A glance, not a switch of subject: at most 3 m away from the companion.
        const scale = Math.min(1, 3 / Math.max(.001, Math.hypot(...target)));
        for (let j = 0; j < 3; j++) target[j] *= scale;
      }
      for (let j = 0; j < 3; j++) attention[j] += (target[j] - attention[j]) * ease;
    },
    attention,
    get company() { return company; },
    get distance() { return 10 + (1 - company) * 5; },
    get fieldOfView() { return 63 + (1 - company) * 5; },
  };
}
