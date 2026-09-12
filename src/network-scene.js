import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import SunCalc from 'suncalc';
import { R, globePoint, cameraAltitude } from './network-geo.js';
import { turnTexture } from './interpolation.js';
import { createCameraJourney } from './network-camera.js';
import { createNetworkLandscape } from './network-landscape.js';
import { stationLift } from './network-terrain.js';

const earthCentre = new THREE.Vector3(0,-R,0);
const point = (lat,lon,h=0)=>new THREE.Vector3(...globePoint(lat,lon,h));
export function createNetworkScene(container, stations, onSelect) {
  const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor('#050610');
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','Thirty-seven radar profiles as luminous altitude layers over a curved map of Western Europe. Drag to orbit; scroll or pinch to zoom. Tap a station to visit it.');
  container.append(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(52,1,.01,300);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;
  controls.minDistance=1;controls.maxDistance=40;controls.minPolarAngle=.06;controls.maxPolarAngle=1.50;
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
    matchMedia('(prefers-reduced-motion: reduce)').matches?0:2.4,
  );
  const sunUniform={value:new THREE.Vector3(-1,0,0)};

  const globe=new THREE.Mesh(new THREE.SphereGeometry(R,128,64),new THREE.MeshBasicMaterial({color:'#080d17'}));
  globe.position.copy(earthCentre);scene.add(globe);

  const landscape=createNetworkLandscape(scene,sunUniform);
  const groundAtStation=stations.map(s=>landscape.heightAt(s.lat,s.lon));
  const liftAtStation=i=>stationLift(groundAtStation[i],landscape.relief.value);

  // Every instance is a soft altitude sheet at one measured station.
  const count=stations.length*15*3;
  const geo=new THREE.InstancedBufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([-.4,-.4,0,.4,-.4,0,.4,.4,0,-.4,.4,0],3));geo.setIndex([0,1,2,0,2,3]);geo.instanceCount=count;
  const arrays={centre:new Float32Array(count*3),east:new Float32Array(count*3),south:new Float32Array(count*3),colour:new Float32Array(count*3),altitude:new Float32Array(count),ground:new Float32Array(count),density:new Float32Array(count),feather:new Float32Array(count),phase:new Float32Array(count*2),axis:new Float32Array(count*2),station:new Float32Array(count),band:new Float32Array(count)};
  const ramp=['#ffc979','#fa78bd','#987cf3','#82e9ec'].map(c=>new THREE.Color(c));
  const stationPoints=stations.map(s=>point(s.lat,s.lon));
  stations.forEach((s,si)=>{
    const c=stationPoints[si],east=point(s.lat,s.lon+.001).sub(c).normalize(),up=c.clone().sub(earthCentre).normalize(),south=east.clone().cross(up).normalize();
    for(let band=0;band<15;band++)for(let sheet=0;sheet<3;sheet++){
      const i=si*45+band*3+sheet,t=band/14*3,k=Math.min(2,Math.floor(t)),colour=ramp[k].clone().lerp(ramp[k+1],t-k);
      arrays.centre.set(c.toArray(),i*3);arrays.east.set(east.toArray(),i*3);arrays.south.set(south.toArray(),i*3);arrays.colour.set(colour.toArray(),i*3);
      arrays.ground[i]=groundAtStation[si]/100;arrays.altitude[i]=(1.1+band*.2+(sheet-1)*.05)/100;arrays.feather[i]=[.45,1,.45][sheet];arrays.station[i]=si;arrays.band[i]=band;arrays.axis[i*2]=1;
    }
  });
  for(const [name,array] of Object.entries(arrays))geo.setAttribute(name,new THREE.InstancedBufferAttribute(array,['centre','east','south','colour'].includes(name)?3:['phase','axis'].includes(name)?2:1));
  const uniforms={exaggeration:{value:1},selected:{value:-1},relief:landscape.relief};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 centre,east,south,colour;attribute float altitude,ground,density,feather,station,band;attribute vec2 phase,axis;uniform float exaggeration,relief;
    varying vec2 vQ;varying vec3 vColour;varying float vDensity,vFeather,vStation,vBand;
    void main(){vec3 earth=vec3(0.,-${R},0.);vec3 p=earth+normalize(centre-earth+east*position.x+south*position.y)*(${R}+altitude*exaggeration+ground*(relief-1.));
      vec2 local=position.xy*8.;vQ=vec2(dot(local,axis),dot(local,vec2(-axis.y,axis.x)))-phase;
      vColour=colour;vDensity=density;vFeather=feather;vStation=station;vBand=band;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float selected;varying vec2 vQ;varying vec3 vColour;varying float vDensity,vFeather,vStation,vBand;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      void main(){if(vDensity<0.)discard;float bend=noise(vQ*.45+vBand)*.8;float body=smoothstep(.2,.8,noise(vec2(vQ.x*.65+vBand*7.,vQ.y*3.4+bend)));float fine=pow(smoothstep(.45,.95,noise(vec2(vQ.x*2.3,vQ.y*17.+bend*3.))),2.);
      float focus=selected<0.||abs(vStation-selected)<.1?1.:.25;
      gl_FragColor=vec4(vColour+fine*.12,(.25*body+.45*fine*body)*vDensity/100.*vFeather*focus);}`});
  // Fade by original local position, independent of advection phase.
  material.vertexShader=material.vertexShader.replace('varying vec2 vQ;','varying vec2 vLocal;varying vec2 vQ;').replace('vec2 local=position.xy*8.;','vec2 local=position.xy*8.;vLocal=local;');
  material.fragmentShader=material.fragmentShader.replace('varying vec2 vQ;','varying vec2 vLocal;varying vec2 vQ;').replace('vFeather*focus);','vFeather*focus*(1.-smoothstep(1.3,3.2,length(vLocal))));');
  const islands=new THREE.Mesh(geo,material);islands.frustumCulled=false;scene.add(islands);
  const markers=stations.map((s,i)=>{
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),new THREE.MeshBasicMaterial({color:'#b8c4c8',transparent:true,opacity:.65}));
    marker.position.copy(point(s.lat,s.lon,groundAtStation[i]*landscape.relief.value+.2));marker.userData.station=i;scene.add(marker);return marker;
  });
  const labels=[['FRANCE',46.5,2],['GERMANY',51,10],['SWITZERLAND',46.6,8.2],['BELGIUM',50.6,4.4],['NETHERLANDS',52.5,5.5],['Memmingen',48.0431,10.2204]].map(([name,lat,lon])=>{
    const el=document.createElement('span');el.className='map-label';el.textContent=name;container.append(el);return{el,point:point(lat,lon,2)};
  });
  let width=1,height=1,currentFrames=[],selected=-1;
  const phases=Array.from({length:stations.length*15},()=>[0,0]),angles=Array(stations.length*15).fill(null);
  function setFrames(frames){
    currentFrames=frames;
    const sun=SunCalc.getPosition(new Date(frames[0].time),48.5,6.5);
    sunUniform.value.set(-Math.sin(sun.azimuth)*Math.cos(sun.altitude),Math.sin(sun.altitude),Math.cos(sun.azimuth)*Math.cos(sun.altitude));
    frames.forEach((f,si)=>{for(let b=0;b<15;b++)for(let j=0;j<3;j++)arrays.density[si*45+b*3+j]=f.dens[b]??-1;});
    geo.attributes.density.needsUpdate=true;
  }
  function preset(name){
    journey.reset();selected=-1;uniforms.selected.value=-1;
    const presets={flyover:[[45.5,6,100],[49.1,8,1]],germany:[[48,11,500],[51,10,0]],europe:[[44,9,1000],[48.5,6.5,0]]};
    const [eye,target]=presets[name];camera.position.copy(point(...eye));controls.target.copy(point(...target));controls.update();
  }
  preset('europe');
  const observer=new ResizeObserver(()=>{width=container.clientWidth;height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();});observer.observe(container);
  const probe=new THREE.Vector3();
  function focusStation(i,force=false){
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
    currentFrames.forEach((f,si)=>{for(let b=0;b<15;b++){
      const n=si*15+b,valid=f.dens[b]!==null&&f.ub[b]!==null&&f.vb[b]!==null,u=valid?f.ub[b]:0,v=valid?-f.vb[b]:0;
      if(angles[n]===null&&valid)angles[n]=Math.atan2(v,u);
      if(playing){angles[n]=turnTexture(angles[n]??0,u,v,dt);const c=Math.cos(angles[n]),s=Math.sin(angles[n]);phases[n][0]+=(u*c+v*s)*dt*.022;phases[n][1]+=(-u*s+v*c)*dt*.022;}
      for(let j=0;j<3;j++){const i=si*45+b*3+j;arrays.phase.set(phases[n],i*2);arrays.axis.set([Math.cos(angles[n]??0),Math.sin(angles[n]??0)],i*2);}
    }});
    geo.attributes.phase.needsUpdate=true;geo.attributes.axis.needsUpdate=true;
    if(journey.moving)journey.step(dt);else controls.update();
    // Keep manual orbit above even the most exaggerated peak in this grid.
    const minimumAltitude=Math.max(20,landscape.maxHeightKm*landscape.relief.value+2);
    if(cameraAltitude(camera.position.toArray())<minimumAltitude)camera.position.sub(earthCentre).setLength(R+minimumAltitude/100).add(earthCentre);
    renderer.render(scene,camera);
    labels.forEach(({el,point:p})=>{probe.copy(p).project(camera);const visible=p.clone().sub(earthCentre).dot(camera.position.clone().sub(p))>0;
      el.hidden=journey.canReturn||!visible||probe.z>1||probe.z<0||Math.abs(probe.x)>.93||Math.abs(probe.y)>.8;el.style.left=`${(probe.x*.5+.5)*width}px`;el.style.top=`${(-probe.y*.5+.5)*height}px`;
    });
    return cameraAltitude(camera.position.toArray());
  }
  const raycaster=new THREE.Raycaster();let down=null,pointerCount=0;
  function pickStation(e){
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
  return {setFrames,draw,preset,setExaggeration:v=>{uniforms.exaggeration.value=v;if(selected>=0)focusStation(selected,true);},
    setRelief:v=>{landscape.relief.value=v;markers.forEach((m,i)=>m.position.copy(point(stations[i].lat,stations[i].lon,groundAtStation[i]*v+.2)));if(selected>=0)focusStation(selected,true);},select:focusStation,
    get canReturn(){return journey.canReturn;},get returning(){return journey.returning;},renderer};
}
