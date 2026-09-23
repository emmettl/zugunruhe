// An authored, repeatable weather field, not a meteorological forecast.
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function soaringWeather(time) {
  // Analytic integrals keep thermal drift consistent with the changing wind.
  const driftX = 1.1 * time + 99 * (1 - Math.cos(time / 180));
  const driftZ = .3 * time + 168 * (1 - Math.cos(time / 240));
  return { windX: 1.1 + .55 * Math.sin(time / 180), windZ: .3 + .7 * Math.sin(time / 240),
    driftX, driftZ, cloudX: driftX + time * 1.8, cloudZ: driftZ + time * .6 };
}

export function cloudShadow(x, z, weather) {
  const u = (x - weather.cloudX) / 540, v = (z - weather.cloudZ) / 430;
  return smooth(.08, .72, Math.sin(u) * .52 + Math.cos(v + u * .37) * .32 + Math.sin(v * .57 - u * .41) * .16);
}

// Same field and coefficients in the sky, on the ground, and in thermal strength.
export const CLOUD_SHADOW_GLSL = `
  float cloudShadow(vec2 p, vec2 offset) {
    vec2 q=(p-offset)/vec2(540.,430.);
    return smoothstep(.08,.72,sin(q.x)*.52+cos(q.y+q.x*.37)*.32+sin(q.y*.57-q.x*.41)*.16);
  }`;
