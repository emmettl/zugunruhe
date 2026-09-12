import * as THREE from 'three';
import { R } from './network-geo.js';

const earthCentre = new THREE.Vector3(0,-R,0);
const smooth = t => t*t*t*(10+t*(-15+6*t));
const clonePose = pose => ({position:pose.position.clone(),target:pose.target.clone()});

// Interpolate direction around Earth, then altitude, avoiding a chord through it.
export function arcPoint(from,to,t) {
  if(t<=0)return from.clone();if(t>=1)return to.clone();
  const a=from.clone().sub(earthCentre),b=to.clone().sub(earthCentre);
  const radius=THREE.MathUtils.lerp(a.length(),b.length(),t);
  const rotation=new THREE.Quaternion().setFromUnitVectors(a.normalize(),b.normalize());
  const partial=new THREE.Quaternion().slerp(rotation,t);
  return a.applyQuaternion(partial).multiplyScalar(radius).add(earthCentre);
}

/** Camera-only navigation. A second station keeps the first return bookmark. */
export function createCameraJourney(readPose,writePose,onMoving=()=>{},duration=2.4) {
  let bookmark=null,flight=null;
  function travel(to,returning=false){
    flight={from:clonePose(readPose()),to:clonePose(to),elapsed:0,returning};
    onMoving(true);
  }
  return {
    focus(to){if(!bookmark)bookmark=clonePose(readPose());travel(to);},
    back(){if(bookmark&&!flight?.returning)travel(bookmark,true);},
    cancel(){flight=null;onMoving(false);},
    reset(){flight=null;bookmark=null;onMoving(false);},
    get canReturn(){return bookmark!==null;},
    get returning(){return flight?.returning??false;},
    get moving(){return flight!==null;},
    step(dt){
      if(!flight)return;
      flight.elapsed+=dt;
      const t=duration===0?1:Math.min(1,flight.elapsed/duration),eased=smooth(t);
      writePose({position:arcPoint(flight.from.position,flight.to.position,eased),
        target:arcPoint(flight.from.target,flight.to.target,eased)});
      if(t===1){const returning=flight.returning;flight=null;if(returning)bookmark=null;onMoving(false);}
    },
  };
}
