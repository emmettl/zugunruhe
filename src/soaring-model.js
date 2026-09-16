// Authored metres/seconds model. Sensing, flight costs and weather are illustrative.
export const SOARING_STEP = 1 / 60;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function thermalAt(id, time) {
  const age = ((time + 75 - id * 70) % 240 + 240) % 240;
  const life = smooth(0, 25, age) * (1 - smooth(100, 150, age));
  return { id, x: id * 700 + time * 1.1, z: Math.sin(id * 1.8) * 95 + time * .3,
    radius: 61 + Math.sin(id * 2.1) * 6, strength: (4.8 + Math.cos(id * 1.7) * .5) * life, life, top: 620 };
}
export function liftAt(x, y, z, thermal) {
  const radius = Math.hypot(x - thermal.x, z - thermal.z);
  return thermal.strength * Math.exp(-((radius / thermal.radius) ** 2)) * clamp((thermal.top - y) / 130, 0, 1);
}
export function soaringAir(x, y, z, time, around = Math.round((x - time * 1.1) / 700)) {
  let lift = -.14;
  for (let id = around - 1; id <= around + 1; id++) lift += liftAt(x, y, z, thermalAt(id, time));
  return [1.1, lift, .3];
}
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function createSoaringFlock(count = 20, seed = 73, { social = true } = {}) {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const position = new Float64Array(count * 3), velocity = new Float64Array(count * 3);
  const heading = new Float64Array(count), turn = new Float64Array(count), bank = new Float64Array(count);
  const phase = new Float32Array(count), effort = new Float32Array(count), airspeed = new Float64Array(count);
  const efficiency = new Float64Array(count), radius = new Float64Array(count), patience = new Float64Array(count);
  const goal = new Float64Array(count), entered = new Float64Array(count), stateAge = new Float64Array(count);
  const reserve = new Float64Array(count), readiness = new Float64Array(count), certainty = new Float64Array(count);
  const coreX = new Float64Array(count), coreZ = new Float64Array(count), bestLift = new Float64Array(count), weakTime = new Float64Array(count);
  const exitX = new Float64Array(count).fill(-Infinity), exitZ = new Float64Array(count);
  const thermal = new Int32Array(count), departures = new Int32Array(count), joins = new Int32Array(count);
  const guide = new Int32Array(count).fill(-1), discovered = new Int32Array(count), recruited = new Int32Array(count);
  const mode = Array(count).fill('seeking'), cue = Array(count).fill('search');
  const centre = [0, 0, 0], state = { climbing: 0, gliding: 0, searching: 0, meanHeight: 0, meanClimb: 0 };
  const nextHeading = new Float64Array(count), nextTurn = new Float64Array(count), nextVertical = new Float64Array(count);
  let time = 0;
  for (let i = 0; i < count; i++) {
    position[i * 3] = i === 0 ? 32 : -85 - i * 4;
    position[i * 3 + 1] = 145 + random() * 25;
    position[i * 3 + 2] = i === 0 ? 0 : (random() - .5) * 105;
    heading[i] = i === 0 ? Math.PI / 2 : 0;
    airspeed[i] = 12; velocity[i * 3] = Math.cos(heading[i]) * 12 + 1.1; velocity[i * 3 + 2] = Math.sin(heading[i]) * 12 + .3;
    phase[i] = random() * Math.PI * 2; efficiency[i] = .86 + random() * .28;
    radius[i] = 30 + random() * 12; patience[i] = random();
    reserve[i] = .5 + patience[i] * .3; goal[i] = 320 + patience[i] * 55; entered[i] = position[i * 3 + 1];
  }
  // The opening bird has already found this column. Later cores are learned
  // only from encountered lift, by remembering the strongest sampled position.
  mode[0] = 'climbing'; joins[0] = 1; cue[0] = 'lift'; certainty[0] = 1;
  bestLift[0] = 4; coreX[0] = 0; coreZ[0] = 0;
  function measure() {
    centre.fill(0); state.climbing = 0; state.gliding = 0; state.searching = 0; state.meanClimb = 0;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < 3; j++) centre[j] += position[i * 3 + j] / count;
      state.climbing += mode[i] === 'climbing' ? 1 : 0;
      state.gliding += mode[i] === 'gliding' ? 1 : 0;
      state.searching += mode[i] === 'seeking' ? 1 : 0;
      state.meanClimb += velocity[i * 3 + 1] / count;
    }
    state.meanHeight = centre[1];
  }
  function step(dt = SOARING_STEP) {
    const nextMode = [...mode], nextThermal = thermal.slice(), nextCue = [...cue], nextGuide = guide.slice();
    for (let i = 0; i < count; i++) {
      const k = i * 3, x = position[k], y = position[k + 1], z = position[k + 2];
      // Physical air acts everywhere; steering never asks for a future column.
      const air = soaringAir(x, y, z, time), lift = air[1];
      let companion = -1, best = Infinity, leaving = 0, avoidX = 0, avoidZ = 0;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const q = j * 3, sx = x - position[q], sy = y - position[q + 1], sz = z - position[q + 2];
        const d = Math.hypot(sx, sy, sz);
        // A visible bird must actually be gaining height. No shared thermal map.
        if (social && d < 380 && position[q] > x - 90 && mode[j] === 'climbing' && velocity[q + 1] > .65
          && !(departures[i] > 0 && thermal[j] === thermal[i])) {
          const score = d - velocity[q + 1] * 18 - (guide[i] === j ? 35 : 0);
          if (score < best) { best = score; companion = j; }
        }
        if (social && d < 180 && mode[j] !== 'climbing' && departures[j] > 0 && thermal[j] === thermal[i]) leaving++;
        const push = Math.max(0, 1 - d / 8) * 4 / Math.max(.4, d);
        avoidX += sx * push; avoidZ += sz * push;
      }
      stateAge[i] += dt;
      const canJoin = Math.hypot(x - exitX[i], z - exitZ[i]) > 130;
      if (mode[i] !== 'climbing' && canJoin && lift > 1.7 && velocity[k + 1] > .35) {
        nextMode[i] = 'climbing'; nextCue[i] = guide[i] >= 0 ? 'companions' : 'discovery';
        if (guide[i] >= 0) recruited[i]++; else discovered[i]++;
        // This id is observational bookkeeping, used by overlays and to avoid
        // rejoining the just-abandoned column. It is never a navigation target.
        nextThermal[i] = Math.round((x - time * 1.1) / 700);
        coreX[i] = x; coreZ[i] = z; bestLift[i] = lift;
        entered[i] = y; goal[i] = Math.min(520, Math.max(285 + patience[i] * 55, y + 80 + patience[i] * 40 + (1 - reserve[i]) * 25));
        joins[i]++; stateAge[i] = 0; weakTime[i] = 0; readiness[i] = 0;
      } else if (mode[i] === 'climbing') {
        coreX[i] += air[0] * dt; coreZ[i] += air[2] * dt;
        // A decaying best sample lets the estimate adapt as the column weakens.
        bestLift[i] *= Math.exp(-dt * .018);
        if (lift > bestLift[i]) { bestLift[i] = lift; coreX[i] = x; coreZ[i] = z; }
        weakTime[i] = velocity[k + 1] < .9 ? weakTime[i] + dt : 0;
        readiness[i] = clamp(readiness[i] + dt * (.004 + .017 * clamp(1 - velocity[k + 1] / 2, 0, 1) + leaving * .0007), 0, 1);
        const enoughHeight = y >= goal[i] - Math.min(24, leaving * 5) - readiness[i] * 15;
        const fadingLift = stateAge[i] > 18 && weakTime[i] > 4 + patience[i] * 5;
        const facingRoute = Math.abs(angleDifference(0, heading[i])) < .5;
        if (stateAge[i] > 12 && ((enoughHeight && facingRoute) || (fadingLift && (facingRoute || weakTime[i] > 14)))) {
          nextMode[i] = 'seeking'; nextCue[i] = fadingLift ? 'weakening lift' : 'height'; nextGuide[i] = -1;
          exitX[i] = x; exitZ[i] = z; departures[i]++; stateAge[i] = 0;
        }
      } else {
        nextGuide[i] = companion;
        nextMode[i] = companion >= 0 ? 'gliding' : 'seeking';
        if (companion >= 0) nextCue[i] = 'companions';
        else if (stateAge[i] > 9) nextCue[i] = 'search';
      }
      const confidence = nextMode[i] === 'climbing' ? clamp(lift / 3, 0, 1) : nextGuide[i] >= 0 ? .75 : .08;
      certainty[i] += (confidence - certainty[i]) * (1 - Math.exp(-dt / 3));
      reserve[i] = clamp(reserve[i] + dt * (mode[i] === 'climbing' && velocity[k + 1] > 0 ? .003 : -.0007) - dt * effort[i] * .012, 0, 1);
      let desired;
      if (mode[i] === 'climbing') {
        const dx = x - coreX[i], dz = z - coreZ[i], distance = Math.hypot(dx, dz);
        const rx = dx / Math.max(1, distance), rz = dz / Math.max(1, distance);
        const correction = (radius[i] - distance) * .65;
        desired = Math.atan2(rx * 12 + rz * correction + avoidZ, -rz * 12 + rx * correction + avoidX);
      } else if (companion >= 0) {
        desired = Math.atan2(position[companion * 3 + 2] - z + avoidZ * 8, position[companion * 3] - x + avoidX * 8);
      } else {
        // Broad eastward migration and individual sweeps, independent of the
        // hidden thermal locations. Birds can miss lift and spend height searching.
        const lane = Math.sin(phase[i]) * 70;
        desired = clamp((lane - (z - time * .3)) / 160, -.6, .6) + Math.sin(time * .075 + phase[i]) * .32;
        desired += Math.atan2(avoidZ, 14 + avoidX) * .3;
      }
      const targetSpeed = mode[i] === 'climbing' ? 11.7 + patience[i] * .8 : 14.2 + (efficiency[i] - .86) * 5;
      airspeed[i] += (targetSpeed - airspeed[i]) * (1 - Math.exp(-dt / 1.8));
      const wantedTurn = clamp(angleDifference(desired, heading[i]) * 1.7, -.42, .42);
      nextTurn[i] = turn[i] + (wantedTurn - turn[i]) * (1 - Math.exp(-dt / .85));
      nextHeading[i] = heading[i] + nextTurn[i] * dt;
      const wantedBank = Math.atan2(airspeed[i] * nextTurn[i], 9.81);
      bank[i] += (wantedBank - bank[i]) * (1 - Math.exp(-dt / .7));
      const sink = (.7 + .014 * (airspeed[i] - 12) ** 2 + .4 * Math.tan(bank[i]) ** 2) / efficiency[i];
      const flap = y < 95 && air[1] < sink ? clamp((105 - y) / 25, 0, 1) : 0;
      effort[i] += (flap - effort[i]) * (1 - Math.exp(-dt));
      nextVertical[i] = velocity[k + 1] + (air[1] - sink + effort[i] * 3.8 - velocity[k + 1]) * (1 - Math.exp(-dt / 1.2));
    }
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      heading[i] = nextHeading[i]; turn[i] = nextTurn[i]; mode[i] = nextMode[i]; thermal[i] = nextThermal[i]; cue[i] = nextCue[i]; guide[i] = nextGuide[i];
      velocity[k] = Math.cos(heading[i]) * airspeed[i] + 1.1;
      velocity[k + 1] = nextVertical[i]; velocity[k + 2] = Math.sin(heading[i]) * airspeed[i] + .3;
      for (let j = 0; j < 3; j++) position[k + j] += velocity[k + j] * dt;
    }
    time += dt; measure();
  }
  measure();
  return { count, position, velocity, heading, bank, phase, effort, airspeed, efficiency, radius, patience,
    mode, thermal, departures, joins, goal, cue, guide, discovered, recruited, reserve, readiness, certainty,
    stateAge, weakTime, centre, state, step, get time() { return time; } };
}
