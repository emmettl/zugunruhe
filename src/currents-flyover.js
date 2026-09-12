import * as THREE from 'three';
import { globePoint,R } from './network-geo.js';
// A camera itinerary chosen for viewing, not an inferred bird migration route.
const route=new THREE.CatmullRomCurve3([
  [9.3,51.4],[8.5,50.1],[9.6,48.8],[9.5,47.6],[7.4,47],[5.7,46.7],
].map(([lon,lat])=>new THREE.Vector3(lon,lat,0)),false,'centripetal');
const smooth=t=>t*t*t*(10+t*(-15+6*t));
const earthCentre=new THREE.Vector3(0,-R,0),pitch=25*Math.PI/180;
export function flyoverPose(progress){
  const t=Math.max(0,Math.min(1,progress)),p=route.getPointAt(t);
  const ahead=t+.07<=1?route.getPointAt(t+.07):route.getPointAt(1).addScaledVector(route.getTangentAt(1),route.getLength()*(t+.07-1));
  const position=new THREE.Vector3(...globePoint(p.y,p.x,100));
  const up=position.clone().sub(earthCentre).normalize();
  const forward=new THREE.Vector3(...globePoint(ahead.y,ahead.x)).sub(position).projectOnPlane(up).normalize();
  // Hold a shallow angle to the local horizon as the route turns over Earth.
  const direction=forward.multiplyScalar(Math.cos(pitch)).addScaledVector(up,-Math.sin(pitch));
  return {position,target:position.clone().addScaledVector(direction,1/Math.sin(pitch))};
}
export function createFlyover(writePose,duration=65){
  let active=false,elapsed=0;
  return {
    start(){active=true;elapsed=0;},stop(){active=false;},
    get active(){return active;},get progress(){return Math.min(1,elapsed/duration);},
    step(dt){if(!active)return;elapsed=Math.min(duration,elapsed+Math.max(0,dt));writePose(flyoverPose(smooth(elapsed/duration)));if(elapsed===duration)active=false;},
  };
}
