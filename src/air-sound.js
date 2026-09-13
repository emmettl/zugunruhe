// Equal weighting of available radar/height pairs in the chosen view. This is a
// station summary, not an area integral or a count of birds across the region.
export function airSound(frames, band = -1, visible = true) {
  const values = [];
  let expected = 0;
  for (const frame of frames) {
    const bands = band < 0 ? frame.dens.map((_, i) => i) : [band];
    expected += bands.length;
    for (const b of bands) if ([frame.dens[b], frame.ub[b], frame.vb[b]].every(Number.isFinite) && frame.dens[b] >= 0) values.push(frame.dens[b]);
  }
  const coverage = expected ? values.length / expected : 0;
  const density = values.length && coverage >= .5 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  // Authored, fixed across nights: 12 birds/km³ reaches the quiet upper limit.
  const activity = visible && density !== null ? Math.sqrt(Math.min(1, density / 12)) : 0;
  return { name: !visible ? 'Bird phrases resting' : density === null ? 'Bird density unavailable' : 'Density · passing phrases',
    mix: { sustained: 1 }, activity, density, coverage };
}
