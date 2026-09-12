import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { turnTexture } from './interpolation.js';
import { createTerrain } from './terrain.js';
import { daylightAt } from './daylight.js';
import { createAtmosphere } from './atmosphere.js';

export const layerColours = Array.from({ length: 15 }, (_, i) => {
  const ramp = [new THREE.Color('#ffc979'), new THREE.Color('#fa78bd'), new THREE.Color('#987cf3'), new THREE.Color('#82e9ec')];
  const t = i / 14 * 3, k = Math.min(2, Math.floor(t));
  return ramp[k].clone().lerp(ramp[k + 1], t - k);
});

const vertexShader = `
  attribute float altitude;
  attribute float band;
  attribute float feather;
  varying vec2 vPosition;
  varying float vBand;
  varying float vFeather;
  void main() {
    vPosition = position.xy;
    vBand = band;
    vFeather = feather;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, altitude, position.y, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float densities[15];
  uniform vec2 textureAxes[15];
  uniform vec2 offsets[15];
  uniform vec3 colours[15];
  uniform float selected;
  uniform float densityMax;
  uniform float exposure;
  varying vec2 vPosition;
  varying float vBand;
  varying float vFeather;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
  }
  void main() {
    int b=int(vBand + 0.5);
    float density=densities[b];
    if(density<0.0) discard;
    vec2 along=textureAxes[b];
    vec2 across=vec2(-along.y,along.x);
    // Keep advected phase in texture coordinates so turning does not rotate
    // an ever-growing displacement and abruptly rearrange the whole field.
    vec2 q=vec2(dot(vPosition,along),dot(vPosition,across))-offsets[b];
    // The noise is a visual texture, not spatial observations or individual birds.
    float bend=noise(vec2(q.x*.45+vBand*2.,q.y*.65))*0.7;
    float ribbon=noise(vec2(q.x*.65+vBand*7.,q.y*3.4+bend));
    float fine=noise(vec2(q.x*2.3-vBand,q.y*17.+bend*3.));
    float body=smoothstep(.18,.85,ribbon);
    float strands=pow(smoothstep(.48,.95,fine),2.0)*body;
    float edge=1.-smoothstep(1.5,3.15,length(vPosition*vec2(.93,1.)));
    edge*=1.-smoothstep(2.6,3.2,max(abs(vPosition.x),abs(vPosition.y)));
    float strength=clamp(density/densityMax,0.,1.);
    float focus=selected<0. || abs(vBand-selected)<.1 ? 1. : .08;
    float alpha=(.24*body+.43*strands)*strength*edge*vFeather*focus*exposure;
    vec3 colour=colours[b] + vec3(strands*.17*strength);
    gl_FragColor=vec4(colour,alpha);
  }
`;

export function createLayers(container, maxDensity, {colours=layerColours,createOverlay,exposure=1,focusExposure=1,fitWidth=1.32}={}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor('#050410');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Bird density layers above real elevation terrain around the Memmingen radar. Vertical scale exaggerated twelve times. Drag to orbit; scroll or pinch to zoom.');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  const lighting = { sunDirection:{value:new THREE.Vector3(-1,0,0)},
    twilight:{value:0}, warmth:{value:0}, daylight:{value:0} };
  const atmosphere = createAtmosphere(scene, lighting);
  const terrain = createTerrain(scene, lighting);
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.enablePan = false;
  controls.minDistance = 5.5;
  controls.maxDistance = 30;
  controls.minPolarAngle = .13;
  controls.maxPolarAngle = Math.PI / 2 - .025;
  function fitFactor(){return Math.max(1,fitWidth/camera.aspect);}
  function home() { const f=fitFactor();camera.position.set(7.2*f, 1.65+4.1*f, 8.6*f); controls.target.set(0, 1.65, 0); controls.update(); }
  home();

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-3.2,-3.2,0,3.2,-3.2,0,3.2,3.2,0,-3.2,3.2,0],3));
  geometry.setIndex([0,1,2,0,2,3]);
  const heights=[],bands=[],feathers=[];
  for(let i=0;i<15;i++) {
    // Multiple soft sheets make each 200 m source band legible as a volume.
    for(let s=0;s<5;s++){ heights.push(1.1+i*.2+(s-2)*.035);bands.push(i);feathers.push([.28,.64,1,.64,.28][s]); }
  }
  geometry.setAttribute('altitude',new THREE.InstancedBufferAttribute(new Float32Array(heights),1));
  geometry.setAttribute('band',new THREE.InstancedBufferAttribute(new Float32Array(bands),1));
  geometry.setAttribute('feather',new THREE.InstancedBufferAttribute(new Float32Array(feathers),1));
  geometry.instanceCount=heights.length;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,2,0),6);
  const uniforms = {
    densities:{value:Array(15).fill(-1)}, textureAxes:{value:Array.from({length:15},()=>new THREE.Vector2(1,0))},
    offsets:{value:Array.from({length:15},()=>new THREE.Vector2())}, colours:{value:colours},
    densityMax:{value:maxDensity}, selected:{value:-1},exposure:{value:exposure}
  };
  const material = new THREE.ShaderMaterial({ vertexShader,fragmentShader,uniforms,
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending });
  const cloud=new THREE.Mesh(geometry,material);cloud.frustumCulled=false;scene.add(cloud);
  const overlay=createOverlay?.(scene);

  const lineMaterial=new THREE.LineBasicMaterial({color:'#a6bacd',transparent:true,opacity:.19});
  function line(points) { const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(g,lineMaterial);scene.add(l);return l; }
  const altitudeAxis = [line([[-4.15,0,4.15],[-4.15,4,4.15]]),
    ...[0,1,2,3,4].map(h=>line([[-4.15,h,4.15],[-3.95,h,4.15]]))];
  const labels = [
    ...[0,1,2,3,4].map(h=>({text:h===0?'Sea level':`${h} km`,altitude:true,point:new THREE.Vector3(-4.45,h,4.15)})),
    {text:'N',point:new THREE.Vector3(0,.5,-4.25)},
    {text:'E',point:new THREE.Vector3(4.25,.5,0)},
    {text:'S',point:new THREE.Vector3(0,.5,4.25)},
    {text:'W',point:new THREE.Vector3(-4.25,.5,0)},
    {text:'Memmingen radar',point:terrain.radarLabel}
  ].map(label=>{const el=document.createElement('span');el.className='world-label';el.textContent=label.text;el.setAttribute('aria-hidden','true');container.append(el);return {...label,el};});
  let width=1,height=1,frame=null,initialSize=true;
  const resize = new ResizeObserver(()=>{
    width=container.clientWidth;height=container.clientHeight;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    if(initialSize){home();initialSize=false;}
  }); resize.observe(container);
  const probe=new THREE.Vector3();
  function updateLabels(){const showAltitude=controls.getPolarAngle()>.3;
    altitudeAxis.forEach(line=>{line.visible=showAltitude;});
    labels.forEach(({point,el,altitude})=>{
    probe.copy(point).project(camera);el.style.left=`${(probe.x*.5+.5)*width}px`;el.style.top=`${(-probe.y*.5+.5)*height}px`;
    el.hidden=(altitude&&!showAltitude)||probe.z>1||Math.abs(probe.x)>.95||Math.abs(probe.y)>.94;
  });}
  const directions=Array.from({length:15},()=>new THREE.Vector2());
  const angles=Array(15).fill(null);
  function setFrame(next) {
    frame=next;
    overlay?.setFrame(next);
    const sun = daylightAt(next.time);
    lighting.sunDirection.value.fromArray(sun.direction);
    lighting.twilight.value = sun.twilight;
    lighting.warmth.value = sun.warmth;
    lighting.daylight.value = sun.daylight;
    for(let i=0;i<15;i++) {
      uniforms.densities.value[i]=next.dens[i]??-1;
      const valid=next.dens[i]!==null && next.ub[i]!==null && next.vb[i]!==null;
      // World x = east; world -z = north.
      directions[i].set(valid?next.ub[i]:0,valid?-next.vb[i]:0);
      if(angles[i]===null&&directions[i].lengthSq()>1e-12){
        angles[i]=Math.atan2(directions[i].y,directions[i].x);
        uniforms.textureAxes.value[i].set(Math.cos(angles[i]),Math.sin(angles[i]));
      }
    }
  }
  function draw(dt,playing) {
    overlay?.draw(dt,playing);
    if(playing&&frame){
      for(let i=0;i<15;i++){
        const flow=directions[i];
        angles[i]=turnTexture(angles[i]??0,flow.x,flow.y,dt);
        const axis=uniforms.textureAxes.value[i];axis.set(Math.cos(angles[i]),Math.sin(angles[i]));
        uniforms.offsets.value[i].x+=(flow.x*axis.x+flow.y*axis.y)*dt*.022;
        uniforms.offsets.value[i].y+=(-flow.x*axis.y+flow.y*axis.x)*dt*.022;
      }
    }
    controls.update();atmosphere.follow(camera);renderer.render(scene,camera);updateLabels();
  }
  function viewTop(){camera.position.set(0,1.65+13*fitFactor(),.01);controls.target.set(0,1.65,0);controls.update();}
  function viewSide(){const f=fitFactor();camera.position.set(8*f,1.65+1.6*f,8*f);controls.target.set(0,1.65,0);controls.update();}
  return {setFrame,draw,home,viewTop,viewSide,selectBand:i=>{uniforms.selected.value=i;uniforms.exposure.value=exposure*(i>=0?focusExposure:1);overlay?.selectBand(i);},
    setFlows:(birds,wind)=>{cloud.visible=birds;overlay?.setVisible(wind);},
    canvas:renderer.domElement,renderer};
}
