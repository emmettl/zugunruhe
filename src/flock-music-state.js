import { agitationMusic } from './flock-agitation.js';
const unit = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

export function createMusicalState() {
  const value = { readiness: 0, coherence: 1, alarm: 0 };
  return { value,
    advance(target, dt) {
      for (const key of Object.keys(value)) {
        const goal = unit(target[key] ?? (key === 'coherence' ? 1 : 0));
        const seconds = key === 'alarm' ? (goal > value[key] ? .3 : 5) : 4;
        value[key] += (goal - value[key]) * (1 - Math.exp(-Math.max(0, Math.min(.5, dt)) / seconds));
      }
      return value;
    },
  };
}

export function flockMusic(activity, state) {
  const base = agitationMusic(activity), ready = unit(state.readiness), together = unit(state.coherence), alarm = unit(state.alarm);
  return {
    interval: Math.max(1.5, base.interval * (1 - ready * .3)),
    brightness: base.brightness + alarm * .14,
    motion: base.motion,
    attack: .24 - alarm * .19,
    release: 4.6 - alarm * 2.8,
    spread: .2 + (1 - together) * .35 + alarm * .15,
    // Shared breathing when aligned; readiness gives this a clearer pulse.
    breathRate: .12 + ready * .5,
    breathDepth: .08 + ready * .18,
    phaseSpread: (1 - together) * 2.1,
    fragmented: alarm > .25 || together < .72,
  };
}
