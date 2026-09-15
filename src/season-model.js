export const periods = {
  year: { label: '2018', start: '2018-01-01', end: '2018-12-31' },
  spring: { label: 'Spring', start: '2018-02-12', end: '2018-06-30' },
  autumn: { label: 'Autumn', start: '2018-08-01', end: '2018-11-30' },
};

export function periodNights(nights, period = 'year') {
  const range = periods[period] || periods.year;
  return nights.filter(n => n.date >= range.start && n.date <= range.end);
}

export function densityLight(density, cap) {
  if (density === null || !Number.isFinite(density) || density < 0) return null;
  return Math.sqrt(Math.min(density / cap, 1));
}

export function describeVelocity(velocity) {
  if (!velocity || !velocity.every(Number.isFinite)) return null;
  const [east, north] = velocity, speed = Math.hypot(east, north) * 3.6;
  // Opposing passage can cancel: zero resultant has no direction.
  return { speed, bearing: speed < 1e-6 ? null : (Math.atan2(east, north) * 180 / Math.PI + 360) % 360 };
}

export function dateLabel(date, options = {}) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC', ...options })
    .format(new Date(date + 'T12:00:00Z'));
}

export function nightAtPosition(x, width, nights) {
  const fraction = (x - 54) / Math.max(1, width - 72);
  return nights[Math.max(0, Math.min(nights.length - 1, Math.floor(fraction * nights.length)))];
}

export function validateStation(data, name) {
  const nonnegative = v => Number.isFinite(v) && v >= 0;
  if (data?.schemaVersion !== 1 || data.site?.name !== name || !Array.isArray(data.nights) || data.nights.length !== 365 ||
      !data.nights.every((n, i) => n?.date === new Date(Date.UTC(2018, 0, 1 + i)).toISOString().slice(0, 10) &&
        Array.isArray(n.trace) && n.trace.length === 48 && n.trace.every(v => v === null || nonnegative(v)) &&
        Number.isInteger(n.completeSamples) && n.completeSamples === n.trace.filter(Number.isFinite).length &&
        Number.isInteger(n.pairedSamples) && n.pairedSamples >= 0 && n.pairedSamples <= n.completeSamples &&
        (n.completeSamples < 39 ? n.density === null && n.meanDensity === null :
          Array.isArray(n.density) && n.density.length === 15 && n.density.every(nonnegative) && nonnegative(n.meanDensity)) &&
        (n.velocity === null || (n.pairedSamples >= 39 && Array.isArray(n.velocity) &&
          n.velocity.length === 2 && n.velocity.every(Number.isFinite))))) {
    throw new Error('Unexpected seasonal data');
  }
  return data;
}
