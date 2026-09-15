// A short, local response to an authored musical gesture, in simulation seconds.
export function createStartles() {
  let pulses = [];
  return {
    add(position, time) {
      pulses.push({ position: [...position], start: time });
      if (pulses.length > 4) pulses.shift();
    },
    sample(time) {
      pulses = pulses.filter(pulse => time - pulse.start < 1.35);
      return pulses.map(pulse => {
        const age = Math.max(0, time - pulse.start);
        return { position: pulse.position, strength: Math.min(1, age / .08) * Math.max(0, 1 - age / 1.35) ** 2 };
      });
    },
    clear() { pulses = []; },
  };
}
