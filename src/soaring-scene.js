import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { thermalAt, thermalIndex, liftAt } from './soaring-model.js';
import { soaringWeather, CLOUD_SHADOW_GLSL } from './soaring-weather.js';
import { createSoaringFraming } from './soaring-framing.js';
import { createSoaringCamera } from './soaring-camera.js';
import { createSoaringTerrain } from './soaring-terrain.js';
import { createSoaringMotion } from './soaring-motion.js';

function storkGeometry() {
  const vertices = [], colours = [];
  const white = new THREE.Color('#f6f0de'), black = new THREE.Color('#343f43'), red = new THREE.Color('#9a5741');
  function triangle(a, b, c, colour) { vertices.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) colours.push(colour.r, colour.g, colour.b); }
  function quad(a, b, c, d, colour) { triangle(a, b, c, colour); triangle(a, c, d, colour); }
  // Broad white wings, separate dark primaries, an outstretched neck and legs.
  quad([-.13,.02,.28],[.13,.02,.28],[.15,0,-.43],[-.15,0,-.43],white);
  triangle([-.13,.02,.28],[0,.13,.52],[.13,.02,.28],white);
  quad([-.055,.05,.35],[.055,.05,.35],[.045,.08,.8],[-.045,.08,.8],white);
  triangle([-.045,.08,.77],[0,.08,1.12],[.045,.08,.77],red);
  triangle([-.12,0,-.35],[.12,0,-.35],[0,0,-.65],white);
  for (const side of [-1, 1]) {
    const p = (x, y, z) => [x * side, y, z];
    quad(p(.08,0,.23),p(.71,.03,.28),p(.96,.01,-.26),p(.13,0,-.32),white);
    quad(p(.71,.03,.28),p(1.12,.025,.21),p(1.24,0,-.2),p(.83,0,-.3),black);
    for (let finger = 0; finger < 5; finger++) {
      const z = .19 - finger * .103;
      triangle(p(1.04,0,z+.04),p(1.36-finger*.025,-.015,z-.05),p(1.08,0,z-.06),black);
    }
    quad(p(.038,-.025,-.36),p(.058,-.025,-.36),p(.063,-.025,-.95),p(.044,-.025,-.95),red);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); return geometry;
}

export function createSoaringScene(container, flock) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.setClearColor('#d5dfd8');
  const canvas = renderer.domElement; canvas.tabIndex = 0; canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Twenty simulated white storks climb in rising air and glide over an imagined landscape. Drag to orbit in Watch view.');
  container.append(canvas);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#d5dfd8', 650, 4200);
  const camera = new THREE.PerspectiveCamera(48, 1, .25, 9000);
  const focus = new THREE.Vector3().fromArray(flock.centre), oldFocus = focus.clone();
  camera.position.copy(focus).add(new THREE.Vector3(95, 45, 150));
  const controls = new OrbitControls(camera, canvas); controls.target.copy(focus); controls.enableDamping = true;
  controls.enablePan = false; controls.minDistance = 25; controls.maxDistance = 500; controls.maxPolarAngle = Math.PI * .68;
  scene.add(new THREE.HemisphereLight('#fff8e7','#67776c',2.4));
  const sun = new THREE.DirectionalLight('#fff0ca',2); sun.position.set(-300,600,200); scene.add(sun);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000,24,12),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,uniforms:{cloudOffset:{value:new THREE.Vector2()}},
    vertexShader:'varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 d;uniform vec2 cloudOffset;${CLOUD_SHADOW_GLSL}
      void main(){vec3 v=normalize(d);vec3 colour=mix(vec3(.87,.87,.78),vec3(.51,.65,.69),smoothstep(-.04,.85,v.y));
      float sun=pow(max(0.,dot(v,normalize(vec3(-.7,.22,.4)))),55.);colour+=vec3(.13,.095,.025)*sun;
      vec2 cloudPoint=cameraPosition.xz+v.xz*max(100.,1100.-cameraPosition.y)/max(.025,v.y);
      float cloud=cloudShadow(cloudPoint,cloudOffset)*smoothstep(.03,.18,v.y);
      colour=mix(colour,vec3(.88,.89,.83),cloud*.6);gl_FragColor=vec4(colour,1.);}`,
  })); scene.add(sky);
  const ground = createSoaringTerrain(); scene.add(ground.mesh);
  const geometry = storkGeometry();
  geometry.setAttribute('phase',new THREE.InstancedBufferAttribute(flock.phase,1));
  geometry.setAttribute('effort',new THREE.InstancedBufferAttribute(new Float32Array(flock.effort),1).setUsage(THREE.DynamicDrawUsage));
  const highlight = new Float32Array(flock.count); geometry.setAttribute('highlight',new THREE.InstancedBufferAttribute(highlight,1));
  const time = { value:0 };
  const material = new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexColors:true,uniforms:{time},
    vertexShader:`attribute float phase,effort,highlight;uniform float time;varying vec3 tint;varying float light,depth;
      void main(){vec3 p=position;float wing=smoothstep(.15,1.3,abs(p.x));p.y+=wing*(.045+.025*sin(time*1.1+phase)+effort*.34*sin(time*9.+phase));
        tint=color;if(color.r>.6)tint=mix(color,vec3(.98,.70,.28),highlight*.65);
        vec3 normal=normalize(mat3(instanceMatrix)*vec3(0.,1.,0.));light=.64+.36*abs(dot(normal,normalize(vec3(-.5,1.,.2))));
        vec4 pView=modelViewMatrix*instanceMatrix*vec4(p,1.);depth=-pView.z;gl_Position=projectionMatrix*pView;}`,
    fragmentShader:'varying vec3 tint;varying float light,depth;void main(){vec3 c=mix(tint*light,vec3(.77,.83,.79),smoothstep(180.,950.,depth));gl_FragColor=vec4(c,1.);}',
  });
  const birds = new THREE.InstancedMesh(geometry,material,flock.count); birds.frustumCulled = false; birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(birds);
  const trailLength = 180, history = new Float32Array(flock.count * trailLength * 3);
  const trailPositions = new Float32Array(flock.count * (trailLength-1) * 6);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage));
  const trails = new THREE.LineSegments(trailGeo,new THREE.LineBasicMaterial({color:'#c49c57',transparent:true,opacity:.27,depthWrite:false})); trails.visible=false; trails.frustumCulled=false; scene.add(trails);
  let head=0,samples=0,lastTrail=-1;
  const liftVitality = new Float32Array(3*2*3*70*2);
  const liftPositions = new Float32Array(3*2*3*70*6), liftGeo = new THREE.BufferGeometry();
  liftGeo.setAttribute('position',new THREE.BufferAttribute(liftPositions,3).setUsage(THREE.DynamicDrawUsage));
  liftGeo.setAttribute('vitality',new THREE.BufferAttribute(liftVitality,1).setUsage(THREE.DynamicDrawUsage));
  const liftLines = new THREE.LineSegments(liftGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:'attribute float vitality;varying float life;void main(){life=vitality;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float life;void main(){gl_FragColor=vec4(.67,.52,.31,.25*life);}',
  })); liftLines.visible=false; liftLines.frustumCulled=false; scene.add(liftLines);
  const framing=createSoaringFraming(), pilot=createSoaringCamera(), dummy=new THREE.Object3D(), forward=new THREE.Vector3(), right=new THREE.Vector3(), up=new THREE.Vector3();
  const motion=createSoaringMotion(flock,pilot);
  const worldUp=new THREE.Vector3(0,1,0), matrix=new THREE.Matrix4(), roll=new THREE.Quaternion(), axis=new THREE.Vector3(0,0,1);
  const desired=new THREE.Vector3(), look=focus.clone(), direction=new THREE.Vector3(1,0,0), point=new THREE.Vector3();
  let mode='watch',selected=0,reduced=false,lost=false;
  function setMode(value) {
    if (value==='air'&&mode!=='air') { pilot.enter(camera.position.toArray()); motion.resetCamera(); }
    if (value!=='air') pilot.leave();
    mode=value; controls.enabled=mode==='watch';
    highlight.fill(0); if(mode!=='watch')highlight[selected]=1; geometry.attributes.highlight.needsUpdate=true;
    if(mode==='watch'){controls.target.copy(focus);camera.up.copy(worldUp);}
  }
  const observer=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();});observer.observe(container);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;container.dispatchEvent(new Event('graphics-lost'));});
  function render(dt, alpha = 1) {
    if(lost)return; const view=motion.sample(alpha); time.value=view.time;
    oldFocus.copy(focus);focus.lerp(point.fromArray(view.centre),1-Math.exp(-dt*2));
    camera.fov+=( (mode==='air'?framing.fieldOfView:mode==='follow'?framing.fieldOfView-10:48)+(camera.aspect<1?12:0)-camera.fov)*(1-Math.exp(-dt*2));camera.updateProjectionMatrix();
    if(mode==='watch'){
      camera.position.add(point.copy(focus).sub(oldFocus));controls.target.copy(focus);controls.update();look.copy(focus);
    }else{
      const k=selected*3;forward.fromArray(view.velocity,k).normalize();direction.lerp(forward,1-Math.exp(-dt*.95)).normalize();right.crossVectors(worldUp,direction).normalize();
      point.fromArray(view.position,k);
      desired.copy(point).addScaledVector(direction,-framing.distance-3).addScaledVector(right,5);desired.y+=4;
      if(mode==='air')camera.position.fromArray(view.camera);else camera.position.lerp(desired,reduced?1:1-Math.exp(-dt*1.5));
      // Keep the companion in view while the camera's own path catches up.
      desired.copy(point).addScaledVector(direction,3);
      desired.x+=framing.attention[0];desired.y+=framing.attention[1];desired.z+=framing.attention[2];
      look.lerp(desired,1-Math.exp(-dt*2));camera.up.lerp(worldUp,1-Math.exp(-dt*2));camera.lookAt(look);
    }
    for(let i=0;i<flock.count;i++){
      forward.fromArray(view.velocity,i*3).normalize();right.crossVectors(worldUp,forward).normalize();up.crossVectors(forward,right);matrix.makeBasis(right,up,forward);
      dummy.quaternion.setFromRotationMatrix(matrix);roll.setFromAxisAngle(axis,view.bank[i]);dummy.quaternion.multiply(roll);dummy.position.fromArray(view.position,i*3);dummy.updateMatrix();birds.setMatrixAt(i,dummy.matrix);
    }
    birds.instanceMatrix.needsUpdate=true;geometry.attributes.effort.array.set(view.effort);geometry.attributes.effort.needsUpdate=true;
    if(flock.time-lastTrail>=.16){for(let i=0;i<flock.count;i++)history.set(flock.position.subarray(i*3,i*3+3),(i*trailLength+head)*3);head=(head+1)%trailLength;samples=Math.min(trailLength,samples+1);lastTrail=flock.time;}
    if(trails.visible){let out=0;for(let i=0;i<flock.count;i++)for(let j=1;j<samples;j++){
      const a=(i*trailLength+(head-j+trailLength)%trailLength)*3,b=(i*trailLength+(head-j-1+trailLength)%trailLength)*3;
      trailPositions.set(history.subarray(a,a+3),out);trailPositions.set(history.subarray(b,b+3),out+3);out+=6;
    }trailGeo.setDrawRange(0,out/3);trailGeo.attributes.position.needsUpdate=true;}
    if(liftLines.visible){let out=0;const first=thermalIndex(view.position[selected*3],view.time)-1;
      for(let id=first;id<first+3;id++){
        const column=thermalAt(id,view.time);
        const pockets=column.kind==='broken'?[-1,1]:[0];
        for(const pocket of pockets)for(let strand=0;strand<3;strand++)for(let j=0;j<70;j++){
          for(const t of [j/70,(j+1)/70]){
            const angle=t*Math.PI*5+strand*Math.PI*2/3-view.time*.1;
            const x=column.x+pocket*column.radius*.48+Math.cos(angle)*column.radius*(pocket ? .43 : 1)*.72;
            const z=column.z+pocket*column.radius*.18+Math.sin(angle)*column.radius*(pocket ? .55 : 1)*.72;
            const y=80+t*470*column.life;
            liftPositions.set([x,y,z],out);liftVitality[out/3]=Math.min(1,liftAt(x,y,z,column)/4);out+=3;
          }
        }
      }
      liftGeo.setDrawRange(0,out/3);liftGeo.attributes.position.needsUpdate=true;liftGeo.attributes.vitality.needsUpdate=true;
    }
    const weather=soaringWeather(view.time);
    sky.material.uniforms.cloudOffset.value.set(weather.cloudX,weather.cloudZ);
    ground.update(camera.position,view.time);
    sky.position.copy(camera.position); renderer.render(scene,camera);
  }
  return {canvas,render,setMode,get selected(){return selected;},
    nextBird(){selected=(selected+1)%flock.count;setMode(mode);},
    advance(dt){framing.advance(dt,flock,selected);pilot.step(dt,flock,selected,framing.distance);motion.capture();},setLift(value){liftLines.visible=value;},setTraces(value){trails.visible=value;},
    setReduced(value){reduced=value;controls.enableDamping=!value;},
    dispose(){observer.disconnect();controls.dispose();scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});renderer.dispose();},
  };
}
