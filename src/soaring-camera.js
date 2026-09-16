import { soaringAir, clamp } from './soaring-model.js';

export function createSoaringCamera() {
  const position = [0, 0, 0], velocity = [0, 0, 0];
  let active = false;
  return { position, velocity,
    enter(point) { position.splice(0, 3, ...point); velocity.fill(0); active = true; },
    leave() { active = false; },
    step(dt, flock, selected) {
      if (!active) return;
      const k = selected * 3, angle = flock.heading[selected];
      const target = [flock.position[k] - Math.cos(angle) * 8 + Math.sin(angle) * 5,
        flock.position[k + 1] + 2, flock.position[k + 2] - Math.sin(angle) * 8 - Math.cos(angle) * 5];
      const air = soaringAir(...position, flock.time);
      const desired = target.map((p, j) => (p - position[j]) * .7 + (j === 1 ? air[1] - .85 : flock.velocity[k + j]));
      desired[1] = clamp(desired[1], -5, 5);
      for (let i = 0; i < flock.count; i++) {
        const delta = position.map((p, j) => p - flock.position[i * 3 + j]);
        const d = Math.hypot(...delta), push = Math.max(0, 1 - d / 7) ** 2 * 7 / Math.max(.5, d);
        for (let j = 0; j < 3; j++) desired[j] += delta[j] * push;
      }
      const speedLimit = Math.min(1, 24 / Math.hypot(...desired));
      const force = desired.map((v, j) => (v * speedLimit - velocity[j]) * 1.2);
      const forceLimit = Math.min(1, 6 / Math.max(.001, Math.hypot(...force)));
      for (let j = 0; j < 3; j++) { velocity[j] += force[j] * forceLimit * dt; position[j] += velocity[j] * dt; }
    },
    get active() { return active; },
  };
}
