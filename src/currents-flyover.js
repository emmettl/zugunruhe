import * as THREE from 'three';
import { globePoint } from './network-geo.js';
// A camera itinerary chosen for viewing, not an inferred bird migration route.
const route=new THREE.CatmullRomCurve3([
  [9.3,51.4],[8.5,50.1],[9.6,48.8],[9.5,47.6],[7.4,47],[5.7,46.7],
].map(([lon,lat])=>new THREE.Vector3(lon,lat,0)),false,'centripetal');
const smooth=t=>t*t*t*(10+t*(-15+6*t));
export function flyoverPose(progress){
  const t=Math.max(0,Math.min(1,progress)),p=route.getPointAt(t);
  const ahead=t+.07<=1?route.getPointAt(t+.07):route.getPointAt(1).addScaledVector(route.getTangentAt(1),route.getLength()*(t+.07-1));
  return {position:new THREE.Vector3(...globePoint(p.y,p.x,100)),target:new THREE.Vector3(...globePoint(ahead.y,ahead.x,2))};
}
export function createFlyover(writePose,duration=65){
  let active=false,elapsed=0;
  return {
    start(){active=true;elapsed=0;},stop(){active=false;},
    get active(){return active;},get progress(){return Math.min(1,elapsed/duration);},
    step(dt){if(!active)return;elapsed=Math.min(duration,elapsed+Math.max(0,dt));writePose(flyoverPose(smooth(elapsed/duration)));if(elapsed===duration)active=false;},
  };
}
