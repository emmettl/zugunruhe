// Render between completed simulation steps. The model remains fixed at 60 Hz.
export function createSoaringMotion(flock, pilot) {
  const fields = ['position', 'velocity', 'bank', 'effort', 'centre'];
  function snapshot() {
    return Object.fromEntries([...fields.map(key => [key, Float64Array.from(flock[key])]),
      ['camera', Float64Array.from(pilot.position)], ['time', flock.time]]);
  }
  const previous = snapshot(), current = snapshot(), view = snapshot();
  const arrays = [...fields, 'camera'];
  return {
    capture() {
      for (const key of arrays) {
        previous[key].set(current[key]);
        current[key].set(key === 'camera' ? pilot.position : flock[key]);
      }
      previous.time = current.time; current.time = flock.time;
    },
    resetCamera() {
      previous.camera.set(pilot.position); current.camera.set(pilot.position);
    },
    sample(alpha) {
      const blend = Math.max(0, Math.min(1, alpha));
      for (const key of arrays) for (let i = 0; i < view[key].length; i++) {
        view[key][i] = previous[key][i] + (current[key][i] - previous[key][i]) * blend;
      }
      view.time = previous.time + (current.time - previous.time) * blend;
      return view;
    },
  };
}
