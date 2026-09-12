import SunCalc from 'suncalc';

const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** SunCalc 1.9: radians, azimuth measured from south towards west. */
export function daylightAt(time) {
  const { altitude, azimuth } = SunCalc.getPosition(new Date(time), 48.0431, 10.2204);
  const degrees = altitude * 180 / Math.PI;
  return {
    direction: [-Math.sin(azimuth) * Math.cos(altitude), Math.sin(altitude), Math.cos(azimuth) * Math.cos(altitude)],
    // Smooth artistic colour envelopes; no recorded weather or sky observations.
    twilight: smooth(-18, -1, degrees),
    warmth: smooth(-12, -1, degrees) * (1 - smooth(3, 15, degrees)),
    daylight: smooth(-1, 12, degrees),
    altitude: degrees,
  };
}
