// A continuous invented wind field. Units are m/s; no wake or lift/drag solver.
// Broad drifting columns of rising air alternate with a slight subsidence.
export function sampleAir(x, y, z, time, out = [0, 0, 0]) {
  const column = Math.exp(-18 * (Math.sin((x - time * .7 - 24) / 95) ** 2 + Math.sin((z - time * .3 + 10) / 80) ** 2));
  const altitude = Math.exp(-(((y - 18) / 95) ** 2));
  out[0] = .9 + .5 * Math.sin(z / 55 + time * .13) + .25 * Math.sin(x / 35 - time * .31);
  out[1] = (2.1 * column - .12) * altitude;
  out[2] = .4 + .55 * Math.sin(x / 70 - time * .09);
  return out;
}
