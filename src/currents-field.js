import * as THREE from 'three';
import paths from '../data/processed/currents-night.json';
import { createContinentalField } from './continent-field.js';
import { visibleSegments } from './currents-model.js';
import { globePoint,R } from './network-geo.js';

export function createCurrentsField(scene,landscape,{stations,tracks=paths.tracks}={}){
  const field=createContinentalField(scene,landscape,{stations}),shared=field.uniforms;
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,-1,0,1,-1,0,0,1,0,0,1,0,1,-1,0,1,1,0],3));
  const capacity=20000,attributes={};
  for(const [name,size] of [['from',3],['to',3],['ground',2],['ink',3]]){
    attributes[name]=new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,attributes[name]);
  }
  const uniforms={...shared,threadOpacity:{value:1},viewport:{value:new THREE.Vector2(1,1)}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 from,to,ink;attribute vec2 ground;uniform vec2 viewport;uniform float relief,exaggeration;varying float side,alpha,band;
      vec3 lifted(vec3 p,float h){vec3 e=vec3(0.,-${R},0.);float altitude=(1.1+ink.z*.2)*exaggeration+h*(relief-1.)+.06;return e+normalize(p-e)*(${R}+altitude/100.);}
      void main(){vec4 a=projectionMatrix*modelViewMatrix*vec4(lifted(from,ground.x),1.),b=projectionMatrix*modelViewMatrix*vec4(lifted(to,ground.y),1.);
        vec2 direction=(b.xy/b.w-a.xy/a.w)*viewport;float len=length(direction);vec2 normal=len>.00001?vec2(-direction.y,direction.x)/len:vec2(0.,1.);
        vec4 p=mix(a,b,position.x);p.xy+=normal*position.y*3.4/viewport*2.*p.w;gl_Position=p;
        side=position.y;alpha=ink.x;band=ink.z;
      }`,
    fragmentShader:`uniform vec3 colourStops[4];uniform float gain,viewExposure,inspection,threadOpacity;varying float side,alpha,band;
      vec3 colour(float b){float t=b/14.;if(t<.333)return mix(colourStops[0],colourStops[1],t*3.);if(t<.666)return mix(colourStops[1],colourStops[2],(t-.333)*3.);return mix(colourStops[2],colourStops[3],(t-.666)*3.);}
      void main(){float halo=exp(-side*side*5.)*.16,core=exp(-side*side*65.)*.7;vec3 c=mix(colour(band),vec3(.8,.96,1.),.5);
        gl_FragColor=vec4(c,(core+halo)*alpha*min(gain,2.)*sqrt(viewExposure)*(1.-inspection)*threadOpacity);
      }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=3;scene.add(mesh);
  let index=48,drawn=-1,enabled=true;
  function update(){
    if(!enabled||uniforms.threadOpacity.value===0){mesh.visible=false;return;}mesh.visible=true;
    if(index===drawn)return;drawn=index;let count=0;
    for(const track of tracks)for(const s of visibleSegments(track,index)){
      if(count===capacity)break;
      const d=(s.a[2]+s.b[2])/2,support=Math.min(s.a[3],s.b[3]);
      const alpha=Math.sqrt(Math.max(0,Math.min(1,d/30)))*support*s.fade*Math.pow(s.tail,1.8);
      if(alpha<.003)continue;
      attributes.from.setXYZ(count,...globePoint(s.a[0],s.a[1]));attributes.to.setXYZ(count,...globePoint(s.b[0],s.b[1]));
      attributes.ground.setXY(count,landscape.heightAt(s.a[0],s.a[1]),landscape.heightAt(s.b[0],s.b[1]));attributes.ink.setXYZ(count,alpha,0,s.band);count++;
    }
    geometry.instanceCount=count;Object.values(attributes).forEach(a=>{a.clearUpdateRanges();a.addUpdateRange(0,count*a.itemSize);a.needsUpdate=true;});
  }
  return {...field,setThreadOpacity(value){uniforms.threadOpacity.value=value;},setIndex(value){index=value;field.setIndex(value);},draw(dt,playing){field.draw(dt,playing);update();},resize(w,h){uniforms.viewport.value.set(w,h);},setThreads(value){enabled=value;drawn=-1;}};
}
