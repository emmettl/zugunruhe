// One world unit = 100 km. Local basis at 48.5 N, 6.5 E: x east, y up, -z north.
export const R = 63.710088;
const rad = Math.PI / 180, phi0 = 48.5*rad, lambda0 = 6.5*rad;
export function globePoint(lat, lon, altitudeKm = 0) {
  const p = lat*rad, d = lon*rad-lambda0, radius = R+altitudeKm/100;
  return [radius*Math.cos(p)*Math.sin(d),
    radius*(Math.sin(phi0)*Math.sin(p)+Math.cos(phi0)*Math.cos(p)*Math.cos(d))-R,
    radius*(Math.sin(phi0)*Math.cos(p)*Math.cos(d)-Math.cos(phi0)*Math.sin(p))];
}
export function cameraAltitude(point) { return (Math.hypot(point[0],point[1]+R,point[2])-R)*100; }
export function frameMean(frame) {
  return frame.dens.every(d=>d!==null) ? frame.dens.reduce((s,d)=>s+d,0)/frame.dens.length : null;
}
