import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import SunCalc from 'suncalc';
import { R, globePoint, cameraAltitude } from './network-geo.js';
import { createContinentalField } from './continent-field.js';
import { createCameraJourney } from './network-camera.js';
import { createNetworkLandscape } from './network-landscape.js';
import { createCloudCover } from './cloud-cover.js';
import { createFlyover,flyoverPose } from './currents-flyover.js';
import { stationLift } from './network-terrain.js';

const earthCentre = new THREE.Vector3(0,-R,0);
const point = (lat,lon,h=0)=>new THREE.Vector3(...globePoint(lat,lon,h));
export function createContinentScene(container, stations, onSelect, createField=createContinentalField, {travellingFlyover=false}={}) {
  const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor('#050610');
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','Continuous luminous layers estimated between thirty-seven radar stations over Western Europe. Drag to orbit; scroll or pinch to zoom. Tap a station to visit it.');
  container.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(52,1,.01,300);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;
  controls.minDistance=1;controls.maxDistance=40;controls.minPolarAngle=.06;controls.maxPolarAngle=1.50;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flyover=createFlyover(pose=>{camera.position.copy(pose.position);controls.target.copy(pose.target);camera.lookAt(controls.target);});
  function stopFlyover(){if(flyover.active){flyover.stop();journey.cancel();}}
  const journey=createCameraJourney(
    ()=>({position:camera.position,target:controls.target}),
    pose=>{camera.position.copy(pose.position);controls.target.copy(pose.target);camera.lookAt(controls.target);},
    moving=>{
      // Flush OrbitControls' pending damping without moving the captured pose.
      const position=camera.position.clone(),target=controls.target.clone();
      controls.enableDamping=false;controls.update();
      camera.position.copy(position);controls.target.copy(target);camera.lookAt(target);
      controls.enableDamping=true;controls.enabled=!moving;
    },
    reducedMotion?0:2.4,
  );
  const sunUniform={value:new THREE.Vector3(-1,0,0)};

  const globe=new THREE.Mesh(new THREE.SphereGeometry(R,128,64),new THREE.MeshBasicMaterial({color:'#080d17'}));
  globe.position.copy(earthCentre);scene.add(globe);

  const landscape=createNetworkLandscape(scene,sunUniform);
  const groundAtStation=stations.map(s=>landscape.heightAt(s.lat,s.lon));
  const stationPoints=stations.map(s=>point(s.lat,s.lon));
  const liftAtStation=i=>stationLift(groundAtStation[i],landscape.relief.value);

  const clouds=createCloudCover(scene,landscape);
  const field=createField(scene,landscape),uniforms=field.uniforms;
  const markers=stations.map((s,i)=>{
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),new THREE.MeshBasicMaterial({color:'#e4e2f0',transparent:true,opacity:.85,depthTest:false}));
    marker.position.copy(point(s.lat,s.lon,groundAtStation[i]*landscape.relief.value+.2));marker.userData.station=i;marker.visible=false;marker.renderOrder=2;scene.add(marker);return marker;
  });
  const labels=[['FRANCE',46.5,2],['GERMANY',51,10],['SWITZERLAND',46.6,8.2],['BELGIUM',50.6,4.4],['NETHERLANDS',52.5,5.5],['Memmingen',48.0431,10.2204]].map(([name,lat,lon])=>{
    const el=document.createElement('span');el.className='map-label';el.textContent=name;container.append(el);return{el,point:point(lat,lon,2)};
  });
  let width=1,height=1,selected=-1;
  function setFrames(frames,index){
    field.setIndex(index);clouds.setTime(frames[0].time);
    const sun=SunCalc.getPosition(new Date(frames[0].time),48.5,6.5);
    sunUniform.value.set(-Math.sin(sun.azimuth)*Math.cos(sun.altitude),Math.sin(sun.altitude),Math.cos(sun.azimuth)*Math.cos(sun.altitude));

  }
  function preset(name){
    if(name==='flyover'&&travellingFlyover){
      if(flyover.active){stopFlyover();return;}
      selected=-1;uniforms.selected.value=-1;
      journey.reset();journey.focus(flyoverPose(0));
      // Explicitly requested travel also runs for reduced-motion users, at a gentler pace.
      flyover.start();return;
    }
    flyover.stop();journey.reset();selected=-1;uniforms.selected.value=-1;
    const presets={flyover:[[45.5,6,100],[49.1,8,1]],germany:[[48,11,500],[51,10,0]],europe:[[44,9,1200],[48.5,6.5,0]]};
    const [eye,target]=presets[name];camera.position.copy(point(...eye));controls.target.copy(point(...target));controls.update();
  }
  preset('europe');
  const observer=new ResizeObserver(()=>{width=container.clientWidth;height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();field.resize?.(width,height);});observer.observe(container);
  const probe=new THREE.Vector3();
  function focusStation(i,force=false){
    stopFlyover();
    if(i<0){journey.back();selected=-1;uniforms.selected.value=-1;return;}
    if(i===selected&&!journey.returning&&!force)return;
    selected=i;uniforms.selected.value=i;
    const s=stations[i],up=stationPoints[i].clone().sub(earthCentre).normalize();
    const target=point(s.lat,s.lon,2*uniforms.exaggeration.value+liftAtStation(i));
    const heading=camera.position.clone().sub(controls.target);
    heading.addScaledVector(up,-heading.dot(up));
    if(heading.lengthSq()<.00001)heading.copy(point(s.lat-.1,s.lon).sub(stationPoints[i]));
    heading.normalize();
    const halfFov=THREE.MathUtils.degToRad(camera.fov/2);
    const distance=Math.max(1.05,.43/(Math.tan(halfFov)*Math.min(.75,camera.aspect*.72)));
    const position=target.clone().addScaledVector(heading,distance*.82).addScaledVector(up,distance*.5724);
    journey.focus({position,target});
  }
  function draw(dt,playing){
    field.draw(dt,playing);
    if(journey.moving){journey.step(dt);if(flyover.active)controls.enabled=false;}
    else if(flyover.active){flyover.step(reducedMotion?dt*.5:dt);controls.enabled=!flyover.active;}
    else controls.update();
    // Keep manual orbit above even the most exaggerated peak in this grid.
    const minimumAltitude=Math.max(20,landscape.maxHeightKm*landscape.relief.value+2);
    if(cameraAltitude(camera.position.toArray())<minimumAltitude)camera.position.sub(earthCentre).setLength(R+minimumAltitude/100).add(earthCentre);
    uniforms.viewExposure.value=THREE.MathUtils.lerp(.3,1,THREE.MathUtils.smoothstep(cameraAltitude(camera.position.toArray()),70,500));
    renderer.render(scene,camera);
    labels.forEach(({el,point:p})=>{probe.copy(p).project(camera);const visible=p.clone().sub(earthCentre).dot(camera.position.clone().sub(p))>0;
      el.hidden=journey.canReturn||!visible||probe.z>1||probe.z<0||Math.abs(probe.x)>.93||Math.abs(probe.y)>.8;el.style.left=`${(probe.x*.5+.5)*width}px`;el.style.top=`${(-probe.y*.5+.5)*height}px`;
    });
    return cameraAltitude(camera.position.toArray());
  }
  const raycaster=new THREE.Raycaster();let down=null,pointerCount=0;
  function pickStation(e){
    if(!markers[0].visible)return -1;
    const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/width*2-1,-(e.clientY-rect.top)/height*2+1),camera);
    let closest=Infinity,picked=-1;
    stations.forEach((s,i)=>{
      const centre=point(s.lat,s.lon,2*uniforms.exaggeration.value+liftAtStation(i)),up=centre.clone().sub(earthCentre).normalize();
      if(up.dot(camera.position.clone().sub(centre))<=0)return;
      const hit=raycaster.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(up,centre),new THREE.Vector3());
      const projected=markers[i].position.clone().project(camera);
      const markerPixels=Math.hypot((projected.x*.5+.5)*width-(e.clientX-rect.left),(-projected.y*.5+.5)*height-(e.clientY-rect.top));
      if((hit&&hit.distanceTo(centre)<.4)||(projected.z>0&&projected.z<1&&markerPixels<(e.pointerType==='touch'?22:12))){
        const distance=centre.distanceTo(camera.position);if(distance<closest){closest=distance;picked=i;}
      }
    });return picked;
  }
  // Capture before OrbitControls so the same gesture takes over immediately.
  if(travellingFlyover)for(const event of ['pointerdown','wheel'])renderer.domElement.addEventListener(event,stopFlyover,{capture:true,passive:true});
  renderer.domElement.addEventListener('pointerdown',e=>{pointerCount++;down=pointerCount===1&&!journey.moving&&e.button===0?[e.clientX,e.clientY]:null;});
  renderer.domElement.addEventListener('pointermove',e=>{
    // Once a finger has dragged, returning to its starting point is still a drag.
    if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)down=null;
    if(!down)renderer.domElement.style.cursor=journey.moving?'default':pickStation(e)>=0?'pointer':'grab';});
  renderer.domElement.addEventListener('pointercancel',()=>{down=null;pointerCount=0;});
  renderer.domElement.addEventListener('pointerup',e=>{
    pointerCount=Math.max(0,pointerCount-1);const start=down;down=null;
    if(!start||journey.moving||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
    const i=pickStation(e);if(i>=0)onSelect(i);
  });
  return {setFrames,draw,preset,stopFlyover,get flying(){return flyover.active;},setThreads:field.setThreads,setClouds:clouds.setMode,setPalette:field.setPalette,setGain:v=>uniforms.gain.value=v,setInspection:v=>{uniforms.inspection.value=v?1:0;markers.forEach(m=>m.visible=v);},setExaggeration:v=>{uniforms.exaggeration.value=v;if(selected>=0)focusStation(selected,true);},
    setRelief:v=>{landscape.relief.value=v;markers.forEach((m,i)=>m.position.copy(point(stations[i].lat,stations[i].lon,groundAtStation[i]*v+.2)));if(selected>=0)focusStation(selected,true);},select:focusStation,
    get canReturn(){return journey.canReturn;},get returning(){return journey.returning;},renderer};
}
