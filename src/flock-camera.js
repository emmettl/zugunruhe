// A companion with inertia and personal space. This remains an authored camera,
// not an extra biological bird; the horizon is handled separately by the scene.
export function createParticipant() {
  const position = [0, 0, 0], velocity = [0, 0, 0];
  let active = false;
  return { position, velocity,
    enter(point) { position.splice(0, 3, ...point); velocity.fill(0); active = true; },
    leave() { active = false; },
    step(dt, flock, selected) {
      if (!active) return;
      const k = selected * 3, speed = Math.hypot(flock.velocity[k], flock.velocity[k + 2]) || 1;
      const fx = flock.velocity[k] / speed, fz = flock.velocity[k + 2] / speed;
      const target = [flock.position[k] - fx * 4 + fz * 3, flock.position[k + 1] + .6, flock.position[k + 2] - fz * 4 - fx * 3];
      const desired = target.map((p, j) => flock.velocity[k + j] + (flock.air?.[k + j] ?? 0) + (p - position[j]) * .9);
      // Repel from local bodies; nearest gaps emerge from competing pressures.
      const avoid = [0, 0, 0];
      for (let i = 0; i < flock.count; i++) {
        const delta = position.map((p, j) => p - flock.position[i * 3 + j]);
        const distance = Math.hypot(...delta);
        if (distance >= 5) continue;
        const strength = (1 - distance / 5) ** 2 * 12 / Math.max(.3, distance);
        for (let j = 0; j < 3; j++) avoid[j] += delta[j] * strength;
      }
      const pressure = Math.min(1, 5 / Math.max(.001, Math.hypot(...avoid)));
      for (let j = 0; j < 3; j++) desired[j] += avoid[j] * pressure;
      const limit = Math.min(1, 23 / Math.hypot(...desired));
      const acceleration = desired.map((v, j) => (v * limit - velocity[j]) * 1.5);
      const turn = Math.min(1, 7 / Math.max(.001, Math.hypot(...acceleration)));
      for (let j = 0; j < 3; j++) { velocity[j] += acceleration[j] * turn * dt; position[j] += velocity[j] * dt; }
    },
    get active() { return active; },
  };
}
