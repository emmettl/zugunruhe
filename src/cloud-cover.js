import { createGridTexturePair } from '@motionstudies/three/weather-textures';
import * as THREE from 'three';
import weather from '../data/processed/cloud-night.json';
import {cloudVariables,cloudCoverMean} from './cloud-model.js';
import {publishCloudSound} from './sound-scene.js';
import {R} from './network-geo.js';

// Cloud-area fraction projected onto the landscape, not fabricated cloud volumes.
export function createCloudCover(scene,landscape){
  const {west,south,step,width,height}=weather.grid;
  const geometry=landscape.geometry,bounds=landscape.bounds;
  let mode='off',time=weather.times[0];
  const pair=createGridTexturePair({width,height,times:weather.times,frame(index){
    const values=weather.frames[index][cloudVariables[mode==='off'?'total':mode]],pixels=new Float32Array(width*height*4);
    values.forEach((value,i)=>{pixels[i*4]=value===null?0:value/100;pixels[i*4+1]=pixels[i*4+3]=value===null?0:1;});return pixels;
  }});
  const uniforms={a:pair.uniforms.weatherA,b:pair.uniforms.weatherB,fraction:pair.uniforms.weatherBlend,relief:landscape.relief};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,side:THREE.DoubleSide,
    vertexShader:`attribute float height;uniform float relief;varying vec2 vUv;
      void main(){vUv=vec2((${bounds.west}+uv.x*${bounds.lonSpan}-(${west}.))/${(width-1)*step}.,(${bounds.north}-(1.-uv.y)*${bounds.latSpan}-${south}.)/${(height-1)*step}.);vec3 e=vec3(0.,-${R},0.);vec3 p=e+normalize(position-e)*(${R}+height*relief+.0004);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform sampler2D a,b;uniform float fraction;varying vec2 vUv;
      void main(){if(vUv.x<0.||vUv.x>1.||vUv.y<0.||vUv.y>1.)discard;vec2 uv=(vUv*vec2(${width-1}.,${height-1}.)+.5)/vec2(${width}.,${height}.);
        vec2 left=texture2D(a,uv).rg,right=texture2D(b,uv).rg;
        if((fraction<1.&&left.g<.9999)||(fraction>0.&&right.g<.9999))discard;
        float cover=mix(left.r,right.r,fraction);
        // A broad geographic feather, with both axes fading at corners.
        float latitude=radians(${south}.+vUv.y*${(height-1)*step}.);
        vec2 spanKm=vec2(${(width-1)*step}.*111.195*cos(latitude),${(height-1)*step}.*111.195);
        vec2 feather=clamp(min(vUv,1.-vUv)*spanKm/240.,0.,1.);
        feather=feather*feather*feather*(feather*(feather*6.-15.)+10.);
        float edge=feather.x*feather.y;
        gl_FragColor=vec4(vec3(.48,.55,.60),cover*.65*edge);
      }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=1;scene.add(mesh);
  function setTime(value){
    time=value;
    publishCloudSound({mode,fraction:mode==='off'?null:cloudCoverMean(weather,mode,time)});
    if(mode==='off')return;
    mesh.visible=pair.update(time);
  }
  return {setTime,setMode(value){mode=Object.hasOwn(cloudVariables,value)?value:'off';pair.invalidate();mesh.visible=mode!=='off';setTime(time);},dispose(){pair.dispose();material.dispose();scene.remove(mesh);}};
}
