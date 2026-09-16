// A small authored soaring model, in metres and seconds. Flight polars, thermal
// spacing and decisions are illustrative, not fitted to observations.
export const SOARING_STEP = 1 / 60;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function thermalAt(id, time) {
  return { id, x: id * 700 + time * 1.1, z: Math.sin(id * 1.8) * 95 + time * .3,
    radius: 61 + Math.sin(id * 2.1) * 6, strength: 4.8 + Math.cos(id * 1.7) * .5, top: 620 };
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

export function createSoaringFlock(count = 20, seed = 73) {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const position = new Float64Array(count * 3), velocity = new Float64Array(count * 3);
  const heading = new Float64Array(count), turn = new Float64Array(count), bank = new Float64Array(count);
  const phase = new Float32Array(count), effort = new Float32Array(count), airspeed = new Float64Array(count);
  const efficiency = new Float64Array(count), radius = new Float64Array(count), patience = new Float64Array(count);
  const goal = new Float64Array(count), entered = new Float64Array(count), stateAge = new Float64Array(count);
  const thermal = new Int32Array(count), departures = new Int32Array(count), joins = new Int32Array(count);
  const mode = Array(count).fill('seeking'), cue = Array(count).fill('route');
  const centre = [0, 0, 0], state = { climbing: 0, gliding: 0, meanHeight: 0, meanClimb: 0 };
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
    goal[i] = 232 + patience[i] * 55; entered[i] = position[i * 3 + 1];
  }
  mode[0] = 'climbing'; joins[0] = 1; cue[0] = 'lift';
  function measure() {
    centre.fill(0); state.climbing = 0; state.gliding = 0; state.meanClimb = 0;
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < 3; j++) centre[j] += position[i * 3 + j] / count;
      state.climbing += mode[i] === 'climbing' ? 1 : 0;
      state.gliding += mode[i] === 'gliding' ? 1 : 0;
      state.meanClimb += velocity[i * 3 + 1] / count;
    }
    state.meanHeight = centre[1];
  }
  function step(dt = SOARING_STEP) {
    const nextMode = [...mode], nextThermal = thermal.slice(), nextCue = [...cue];
    for (let i = 0; i < count; i++) {
      const k = i * 3, x = position[k], y = position[k + 1], z = position[k + 2];
      const column = thermalAt(thermal[i], time), dx = column.x - x, dz = column.z - z, distance = Math.hypot(dx, dz);
      const lift = liftAt(x, y, z, column);
      let nearbyClimbers = 0, leaving = 0, avoidX = 0, avoidZ = 0;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const q = j * 3, sx = x - position[q], sy = y - position[q + 1], sz = z - position[q + 2];
        const d = Math.hypot(sx, sy, sz);
        if (d < 200 && mode[j] === 'climbing' && thermal[j] === thermal[i]) nearbyClimbers++;
        if (d < 180 && mode[j] === 'gliding' && thermal[j] === thermal[i] + 1) leaving++;
        const push = Math.max(0, 1 - d / 8) * 4 / Math.max(.4, d);
        avoidX += sx * push; avoidZ += sz * push;
      }
      stateAge[i] += dt;
      if (mode[i] !== 'climbing' && distance < column.radius * .84 && lift > 1.4) {
        nextMode[i] = 'climbing'; nextCue[i] = nearbyClimbers ? 'companions' : 'lift';
        entered[i] = y; goal[i] = Math.min(520, Math.max(232 + patience[i] * 55, y + 72 + patience[i] * 45));
        joins[i]++; stateAge[i] = 0;
      } else if (mode[i] === 'climbing') {
        const socialDeparture = Math.min(24, leaving * 5) * (1 - patience[i] * .6);
        const enoughHeight = y >= goal[i] - socialDeparture;
        const fadingLift = stateAge[i] > 16 && lift < 1.1 && y > entered[i] + 30;
        const nextColumn = thermalAt(thermal[i] + 1, time);
        const departureBearing = Math.atan2(nextColumn.z - z, nextColumn.x - x);
        const facingRoute = Math.abs(angleDifference(departureBearing, heading[i])) < .48;
        if (stateAge[i] > 8 && ((enoughHeight && facingRoute) || fadingLift)) {
          nextMode[i] = 'gliding'; nextThermal[i]++; nextCue[i] = enoughHeight ? 'height' : 'weakening lift';
          departures[i]++; stateAge[i] = 0;
        }
      } else if (nearbyClimbers && mode[i] === 'seeking') nextCue[i] = 'companions';

      let desired;
      if (mode[i] === 'climbing') {
        // Tangent plus radial correction produces a climb through the column.
        const rx = -dx / Math.max(1, distance), rz = -dz / Math.max(1, distance);
        const correction = (radius[i] - distance) * .65;
        desired = Math.atan2(rx * 12 + rz * correction + avoidZ, -rz * 12 + rx * correction + avoidX);
      } else {
        // The route supplies likely lift locations. Circling companions improve
        // approach; this is not a claim that birds see invisible columns of air.
        const curiosity = mode[i] === 'seeking' && !nearbyClimbers ? Math.sin(time * .16 + phase[i]) * .12 : 0;
        desired = Math.atan2(dz + avoidZ * 8, dx + avoidX * 8) + curiosity;
      }
      const targetSpeed = mode[i] === 'climbing' ? 11.7 + patience[i] * .8 : 14.2 + (efficiency[i] - .86) * 5;
      airspeed[i] += (targetSpeed - airspeed[i]) * (1 - Math.exp(-dt / 1.8));
      const wantedTurn = clamp(angleDifference(desired, heading[i]) * 1.7, -.42, .42);
      nextTurn[i] = turn[i] + (wantedTurn - turn[i]) * (1 - Math.exp(-dt / .85));
      nextHeading[i] = heading[i] + nextTurn[i] * dt;
      const wantedBank = Math.atan2(airspeed[i] * nextTurn[i], 9.81);
      bank[i] += (wantedBank - bank[i]) * (1 - Math.exp(-dt / .7));
      const sink = (.7 + .014 * (airspeed[i] - 12) ** 2 + .4 * Math.tan(bank[i]) ** 2) / efficiency[i];
      const air = soaringAir(x, y, z, time, thermal[i]);
      const flap = y < 95 && air[1] < sink ? clamp((105 - y) / 25, 0, 1) : 0;
      effort[i] += (flap - effort[i]) * (1 - Math.exp(-dt));
      nextVertical[i] = velocity[k + 1] + (air[1] - sink + effort[i] * 3.8 - velocity[k + 1]) * (1 - Math.exp(-dt / 1.2));
    }
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      heading[i] = nextHeading[i]; turn[i] = nextTurn[i]; mode[i] = nextMode[i]; thermal[i] = nextThermal[i]; cue[i] = nextCue[i];
      velocity[k] = Math.cos(heading[i]) * airspeed[i] + 1.1;
      velocity[k + 1] = nextVertical[i]; velocity[k + 2] = Math.sin(heading[i]) * airspeed[i] + .3;
      for (let j = 0; j < 3; j++) position[k + j] += velocity[k + j] * dt;
    }
    time += dt; measure();
  }
  measure();
  return { count, position, velocity, heading, bank, phase, effort, airspeed, efficiency, radius, patience,
    mode, thermal, departures, joins, goal, cue, centre, state, step, get time() { return time; } };
}
