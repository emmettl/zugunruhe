const clamp = value => Math.max(0, Math.min(1, value));

// Motion proxies, not a claim about emotion: local heading disagreement and
// steering that departs from the flock's shared turn. Include disturbed pockets.
export function measureAgitation(flock) {
  const angles = [], meanAcceleration = [0, 0, 0];
  if (flock.acceleration) for (let i = 0; i < flock.count * 3; i++) meanAcceleration[i % 3] += flock.acceleration[i] / flock.count;
  let steeringEnergy = 0;
  for (let i = 0; i < flock.count; i++) {
    let x = 0, y = 0, z = 0, n = 0;
    for (let j = 0; j < 7; j++) {
      const other = flock.neighbours[i * 7 + j]; if (other < 0) continue;
      const k = other * 3, speed = Math.hypot(flock.velocity[k], flock.velocity[k + 1], flock.velocity[k + 2]);
      if (!speed) continue;
      x += flock.velocity[k] / speed; y += flock.velocity[k + 1] / speed; z += flock.velocity[k + 2] / speed; n++;
    }
    const k = i * 3, speed = Math.hypot(flock.velocity[k], flock.velocity[k + 1], flock.velocity[k + 2]), length = Math.hypot(x, y, z);
    if (!n || !speed) continue;
    const cosine = length > 1e-8 ? (x * flock.velocity[k] + y * flock.velocity[k + 1] + z * flock.velocity[k + 2]) / (length * speed) : 0;
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
    angles.push(angle * angle);
    if (flock.acceleration) for (let axis = 0; axis < 3; axis++) steeringEnergy += (flock.acceleration[k + axis] - meanAcceleration[axis]) ** 2;
  }
  if (!angles.length) return 0;
  angles.sort((a, b) => b - a);
  const tailCount = Math.max(1, Math.ceil(angles.length / 5));
  const rms = Math.sqrt(angles.reduce((sum, angle) => sum + angle, 0) / angles.length);
  const tail = Math.sqrt(angles.slice(0, tailCount).reduce((sum, angle) => sum + angle, 0) / tailCount);
  const disagreement = clamp((.35 * rms + .65 * tail - .045) / .28);
  const irregularSteering = clamp((Math.sqrt(steeringEnergy / angles.length) - 1.2) / 4.5);
  return .65 * disagreement + .35 * irregularSteering;
}

// Musical mapping lives separately from both the measurement and the instrument.
export function agitationMusic(value) {
  const a = clamp(Number.isFinite(value) ? value : 0);
  return { interval: 10 - 8.2 * a, brightness: .025 + .19 * a, motion: .05 + .22 * a };
}
export function createAgitationEnvelope() {
  let value = 0;
  return {
    advance(target, dt) {
      target = clamp(Number.isFinite(target) ? target : 0);
      const seconds = Math.max(0, Math.min(.5, dt));
      value += (target - value) * (1 - Math.exp(-seconds / (target > value ? .8 : 7)));
      return value;
    },
    get value() { return value; },
  };
}
