const clamp = x => Math.max(0, Math.min(1, x));

// Authored episodes, not an estimate of birds' internal or seasonal state.
// Neighbour readiness is read synchronously, so recruitment has time to travel.
export function createFlockLife(count, phase) {
  const readiness = Float64Array.from(phase, p => .08 + .04 * Math.sin(p));
  const alarm = new Float64Array(count), next = new Float64Array(count), nextAlarm = new Float64Array(count);
  const threshold = Float64Array.from(phase, p => .46 + .16 * (.5 + .5 * Math.sin(p * 3)));
  const anchor = [0, 0, 0], bearing = [1, 0, 0];
  const state = { stage: 'gathering', readiness: 0, coherence: 1, alarm: 0, age: 0, passages: 0 };
  function enter(stage, flock) {
    state.stage = stage; state.age = 0;
    if (stage === 'departing') {
      const angle = Math.atan2(flock.heading[2], flock.heading[0]) + .22;
      bearing[0] = Math.cos(angle); bearing[2] = Math.sin(angle);
    }
    if (stage === 'regrouping') {
      state.passages++;
      for (let j = 0; j < 3; j++) anchor[j] = flock.centre[j] + bearing[j] * 28;
    }
  }
  return { state, readiness, alarm, anchor, bearing,
    commitment(i) {
      if (state.stage === 'departing' || state.stage === 'passage') return .35 + .65 * clamp((readiness[i] - threshold[i]) * 5);
      return state.stage === 'stirring' ? clamp((readiness[i] - threshold[i]) * 5) * .45 : 0;
    },
    advance(dt, flock, threat, pulses) {
      state.age += dt;
      let willing = 0, total = 0, alarmTotal = 0, peak = 0, hx = 0, hy = 0, hz = 0;
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        let social = 0, alarmSocial = 0, n = 0;
        for (let j = 0; j < 7; j++) {
          const other = flock.neighbours[i * 7 + j]; if (other < 0) continue;
          social += readiness[other]; alarmSocial += alarm[other]; n++;
        }
        const cooling = state.stage === 'regrouping';
        const growth = (.013 + .009 * (.5 + .5 * Math.sin(phase[i] * 2))) + (n ? Math.max(0, social / n - readiness[i]) * .16 : 0);
        next[i] = cooling ? readiness[i] * Math.exp(-dt / 6) : clamp(readiness[i] + dt * growth * (1 - alarm[i] * .65));
        if (next[i] > threshold[i]) willing++;
        total += next[i];
        let exposure = 0;
        const proximity = (point, radius) => clamp(1 - Math.hypot(...[0, 1, 2].map(j => flock.position[k + j] - point[j])) / radius);
        if (threat) exposure = proximity(threat, 18);
        for (const pulse of pulses) exposure = Math.max(exposure, proximity(pulse.position, 24) * pulse.strength);
        // Influence from neighbours carries a brief alarm, with continuous decay.
        const target = Math.max(exposure, n ? alarmSocial / n * .65 : 0);
        nextAlarm[i] = alarm[i] + (target - alarm[i]) * (1 - Math.exp(-dt / (target > alarm[i] ? .18 : 2.5)));
        alarmTotal += nextAlarm[i]; peak = Math.max(peak, nextAlarm[i]);
        const speed = Math.hypot(...flock.velocity.subarray(k, k + 3)) || 1;
        hx += flock.velocity[k] / speed; hy += flock.velocity[k + 1] / speed; hz += flock.velocity[k + 2] / speed;
      }
      readiness.set(next); alarm.set(nextAlarm);
      state.readiness = total / count;
      state.alarm = clamp(alarmTotal / count * .6 + peak * .4);
      state.coherence = clamp(Math.hypot(hx, hy, hz) / count);
      if (state.stage === 'gathering' && state.age > 10) enter('stirring', flock);
      else if (state.stage === 'stirring' && willing / count > .62 && state.alarm < .22) enter('departing', flock);
      else if (state.stage === 'departing' && state.age > 8 && state.coherence > .88) enter('passage', flock);
      else if (state.stage === 'passage' && state.age > 28) enter('regrouping', flock);
      else if (state.stage === 'regrouping' && state.age > 18 && state.readiness < .12) enter('gathering', flock);
      if (state.stage === 'departing' || state.stage === 'passage') anchor.splice(0, 3, ...flock.centre);
    },
  };
}
