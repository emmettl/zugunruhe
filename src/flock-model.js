import { createFlockLife } from './flock-life.js';
import { sampleAir } from './flock-air.js';
// A starling-inspired experiment. Distances are metres, time is seconds.
// This is an authored model, not a reconstruction or a calibrated flight model.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const STEP = 1 / 60;
export function createFlock(count = 420, seed = 29) {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const position = new Float64Array(count * 3), velocity = new Float64Array(count * 3);
  const acceleration = new Float64Array(count * 3), bank = new Float64Array(count), phase = new Float32Array(count);
  const preferredSpeed = new Float64Array(count), neighbours = new Int32Array(count * 7);
  const centre = [0, 0, 0], heading = [1, 0, 0];
  const distances = new Float64Array(7), ids = new Int32Array(7);
  let time = 0, tick = 0;
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, z = random() * 2 - 1, r = Math.cbrt(random());
    position[i * 3] = Math.cos(a) * Math.sqrt(1 - z * z) * r * 24;
    position[i * 3 + 1] = z * r * 8;
    position[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - z * z) * r * 17;
    preferredSpeed[i] = 10.5 + random() * 1.6;
    velocity[i * 3] = preferredSpeed[i]; velocity[i * 3 + 1] = (random() - .5) * .6; velocity[i * 3 + 2] = (random() - .5) * 1.5;
    phase[i] = random() * Math.PI * 2;
  }
  const life = createFlockLife(count, phase), air = new Float64Array(count * 3), breeze = [0, 0, 0];
  const socialState = { position, velocity, neighbours, centre, heading };
  function measure() {
    centre.fill(0); heading.fill(0);
    for (let j = 0; j < count * 3; j++) { centre[j % 3] += position[j] / count; heading[j % 3] += velocity[j] / count; }
    const speed = Math.hypot(...heading) || 1;
    for (let j = 0; j < 3; j++) heading[j] /= speed;
  }
  function findNeighbours() {
    for (let i = 0; i < count; i++) {
      const k = i * 3; distances.fill(Infinity); ids.fill(-1);
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const q = j * 3, dx = position[q] - position[k], dy = position[q + 1] - position[k + 1], dz = position[q + 2] - position[k + 2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d >= distances[6]) continue;
        let slot = 6;
        while (slot > 0 && d < distances[slot - 1]) { distances[slot] = distances[slot - 1]; ids[slot] = ids[slot - 1]; slot--; }
        distances[slot] = d; ids[slot] = j;
      }
      neighbours.set(ids, i * 7);
    }
  }
  function step(dt = STEP, threat = null, startles = [], participant = null) {
    // Refresh the social network at 20 Hz, integrate steering at 60 Hz.
    if (tick % 3 === 0) findNeighbours();
    life.advance(dt, socialState, threat, startles);
    for (let i = 0; i < count; i++) {
      const k = i * 3, px = position[k], py = position[k + 1], pz = position[k + 2];
      const vx = velocity[k], vy = velocity[k + 1], vz = velocity[k + 2];
      let ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, n = 0;
      for (let r = 0; r < 7; r++) {
        const other = neighbours[i * 7 + r]; if (other < 0) continue;
        const q = other * 3;
        ax += velocity[q] - vx; ay += velocity[q + 1] - vy; az += velocity[q + 2] - vz;
        cx += position[q] - px; cy += position[q + 1] - py; cz += position[q + 2] - pz; n++;
      }
      if (n) { ax = ax / n * 1.5 + cx / n * .42; ay = ay / n * 1.5 + cy / n * .42; az = az / n * 1.5 + cz / n * .42; }
      // Avoid the closest neighbour. Anticipation adds space ahead of a collision.
      const closest = neighbours[i * 7];
      if (closest >= 0) {
        const q = closest * 3;
        const dx = px - position[q] + (vx - velocity[q]) * .25;
        const dy = py - position[q + 1] + (vy - velocity[q + 1]) * .25;
        const dz = pz - position[q + 2] + (vz - velocity[q + 2]) * .25;
        const d = Math.hypot(dx, dy, dz), push = Math.max(0, 1 - d / 3.1) * 14 / Math.max(.15, d);
        ax += dx * push; ay += dy * push; az += dz * push;
      }
      // Each departure moves the gathering place through the landscape.
      const commitment = life.commitment(i), anchor = life.anchor;
      const rx = px - anchor[0], rz = pz - anchor[2];
      const radius = Math.hypot(rx, rz), edge = Math.max(0, (radius - 40) / 30);
      const roost = 1 - commitment;
      ax -= rx / Math.max(1, radius) * edge * 4.5 * roost;
      az -= rz / Math.max(1, radius) * edge * 4.5 * roost;
      ax -= rz / Math.max(1, radius) * edge * 3 * roost;
      az += rx / Math.max(1, radius) * edge * 3 * roost;
      ax += (life.bearing[0] * preferredSpeed[i] - vx) * commitment * .6;
      az += (life.bearing[2] * preferredSpeed[i] - vz) * commitment * .6;
      ay -= (py - anchor[1]) * .065 + vy * .3;
      // The viewer has a small personal space, only while flying among birds.
      if (participant) {
        const dx = px - participant[0], dy = py - participant[1], dz = pz - participant[2];
        const d = Math.hypot(dx, dy, dz), push = Math.max(0, 1 - d / 4) ** 2 * 7 / Math.max(.3, d);
        ax += dx * push; ay += dy * push; az += dz * push;
      }
      // Smooth individual variation: no frame-to-frame random jitter.
      ax += Math.sin(time * .61 + phase[i] * 3) * .26;
      ay += Math.sin(time * .47 + phase[i] * 5) * .18;
      az += Math.cos(time * .53 + phase[i] * 4) * .26;
      if (threat) {
        const dx = px - threat[0], dy = py - threat[1], dz = pz - threat[2], d = Math.hypot(dx, dy, dz);
        const force = 22 * Math.pow(Math.max(0, 1 - d / 18), 2) / Math.max(.4, d);
        ax += dx * force; ay += dy * force; az += dz * force;
      }
      for (const pulse of startles) {
        const dx = px - pulse.position[0], dy = py - pulse.position[1], dz = pz - pulse.position[2], d = Math.hypot(dx, dy, dz);
        const force = 48 * pulse.strength * Math.pow(Math.max(0, 1 - d / 24), 2) / Math.max(.4, d);
        ax += dx * force; ay += dy * force; az += dz * force;
      }
      const speed = Math.hypot(vx, vy, vz), ux = vx / speed, uy = vy / speed, uz = vz / speed;
      const parallel = ax * ux + ay * uy + az * uz;
      ax -= parallel * ux; ay -= parallel * uy; az -= parallel * uz;
      const lateral = Math.hypot(ax, ay, az), limit = Math.min(1, 8 / Math.max(.001, lateral));
      const speedForce = (preferredSpeed[i] - speed) * 1.3;
      ax = ax * limit + ux * speedForce; ay = ay * limit + uy * speedForce; az = az * limit + uz * speedForce;
      // First-order response of acceleration produces continuous turn onset/recovery.
      const response = 1 - Math.exp(-dt / .28);
      acceleration[k] += (ax - acceleration[k]) * response;
      acceleration[k + 1] += (ay - acceleration[k + 1]) * response;
      acceleration[k + 2] += (az - acceleration[k + 2]) * response;
    }
    // Synchronous integration: every bird above sees the same previous state.
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      for (let j = 0; j < 3; j++) velocity[k + j] += acceleration[k + j] * dt;
      const speed = Math.hypot(velocity[k], velocity[k + 1], velocity[k + 2]);
      const bounded = clamp(speed, 8.5, 14);
      sampleAir(position[k], position[k + 1], position[k + 2], time, breeze); air.set(breeze, k);
      for (let j = 0; j < 3; j++) { velocity[k + j] *= bounded / speed; position[k + j] += (velocity[k + j] + air[k + j]) * dt; }
      const horizontal = Math.hypot(velocity[k], velocity[k + 2]) || 1;
      const sideways = (velocity[k + 2] * acceleration[k] - velocity[k] * acceleration[k + 2]) / horizontal;
      const wantedBank = clamp(-Math.atan2(sideways, 9.81), -.8, .8);
      bank[i] += (wantedBank - bank[i]) * (1 - Math.exp(-dt * 4));
    }
    time += dt; tick++; measure();
  }
  measure(); findNeighbours();
  return { count, position, velocity, acceleration, bank, phase, neighbours, centre, heading, air, life, step, get time() { return time; } };
}
