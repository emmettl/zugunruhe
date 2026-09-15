export const HOUR = 3600, DAY = 86400;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = t => t * t * t * (t * (6 * t - 15) + 10);

// Exact recorded fix at or before the clock; never extrapolate beyond a track.
export function observationAt(fixes, time, maxAge = 2 * HOUR) {
  let lo = 0, hi = fixes.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (fixes[mid][0] <= time) lo = mid + 1; else hi = mid; }
  const index = lo - 1;
  if (index < 0 || time > fixes.at(-1)[0] || time - fixes[index][0] > maxAge) return null;
  return { fix: fixes[index], index };
}

export function distanceKm(a, b) {
  const r = Math.PI / 180, dLat = (b[2] - a[2]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[2] * r) * Math.cos(b[2] * r) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(clamp(h, 0, 1)));
}

export function connected(a, b, maxGap = 2 * HOUR) { return b[0] > a[0] && b[0] - a[0] <= maxGap; }
export function advanceClock(time, seconds, rate, end) { return Math.min(end, time + Math.max(0, seconds) * rate); }
export function formatTime(time) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(time * 1000));
}
export function dateLabel(time) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(time * 1000));
}
export function latitudeLabel(lat) { return `${Math.abs(lat).toFixed(4)}° ${lat < 0 ? 'S' : 'N'}`; }
export function longitudeLabel(lon) { return `${Math.abs(lon).toFixed(4)}° ${lon < 0 ? 'W' : 'E'}`; }

export function validateMigration(data) {
  if (data.schema !== 1 || !Array.isArray(data.tracks) || !data.tracks.length) throw new Error('Invalid migration data');
  for (const track of data.tracks) {
    if (!track.fixes.length) throw new Error('Empty journey');
    track.fixes.forEach((p, i) => {
      if (p.length !== 3 || !p.every(Number.isFinite) || Math.abs(p[1]) > 180 || Math.abs(p[2]) > 90 || (i && p[0] <= track.fixes[i - 1][0])) throw new Error('Invalid recorded fix');
    });
  }
  return data;
}
