/** Interpolate adjacent five-minute profiles, never across missing observations. */
export function sampleFrame(frames, position) {
  const bounded = Math.max(0, Math.min(frames.length - 1, position));
  const index = Math.floor(bounded), fraction = bounded - index;
  const a = frames[index], b = frames[index + 1];
  // Exact observations (including nulls) remain unchanged. No extrapolation.
  if (fraction === 0 || !b) return a;
  const adjacent = Date.parse(b.time) - Date.parse(a.time) === 300_000
    && b.minute - a.minute === 5;
  const mix = (x, y) => adjacent && x !== null && y !== null
    ? x + (y - x) * fraction : null;
  const dens = a.dens.map((v, i) => mix(v, b.dens[i]));
  const ub = [], vb = [];
  for (let i = 0; i < dens.length; i++) {
    const valid = dens[i] !== null && a.ub[i] !== null && a.vb[i] !== null
      && b.ub[i] !== null && b.vb[i] !== null;
    // Blend Cartesian components, not bearings: north never turns via south.
    ub.push(valid ? mix(a.ub[i], b.ub[i]) : null);
    vb.push(valid ? mix(a.vb[i], b.vb[i]) : null);
  }
  const band = dens.slice(0, 5);
  const meanDensity = band.every(v => v !== null) ? band.reduce((sum, v) => sum + v, 0) / band.length : null;
  return { minute: a.minute + (b.minute - a.minute) * fraction,
    time: new Date(Date.parse(a.time) + (Date.parse(b.time) - Date.parse(a.time)) * fraction).toISOString(),
    dens, ub, vb, meanDensity, interpolated: true };
}

/** Keep a visual texture's orientation continuous, including zero velocity. */
export function turnTexture(angle, east, south, dt) {
  if (Math.hypot(east, south) < 1e-6) return angle;
  const target = Math.atan2(south, east);
  const difference = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
  return angle + difference * (1 - Math.exp(-dt / .3));
}
