import * as THREE from 'three';
import network from '../data/processed/network-night.json';
import { palettes } from './continent-palettes.js';
import { createFieldGrid,sampleGrid } from './continent-model.js';
import { globePoint,R } from './network-geo.js';

export function createContinentalField(scene,landscape){
  const grid=createFieldGrid(network.stations),geometry=new THREE.InstancedBufferGeometry();
  const positions=[],grounds=[],uv=[],indices=[];
  // The display mesh is finer than the estimated field, so it follows the ground
  // without implying additional spatial information in the observations.
  const columns=(grid.width-1)*3+1,rows=(grid.height-1)*3+1;
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const u=x/(columns-1),v=y/(rows-1),lat=42+v*14,lon=-6+u*23,i=y*columns+x;
    positions.push(...globePoint(lat,lon));grounds.push(landscape.heightAt(lat,lon)/100);uv.push(u,v);
    if(x<columns-1&&y<rows-1)indices.push(i,i+1,i+columns,i+1,i+columns+1,i+columns);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('ground',new THREE.Float32BufferAttribute(grounds,1));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  geometry.setAttribute('band',new THREE.InstancedBufferAttribute(Float32Array.from({length:15},(_,i)=>i),1));geometry.instanceCount=15;
  const makeTexture=()=>{const t=new THREE.DataTexture(new Float32Array(grid.cells.length*15*4),grid.width,grid.height*15,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;};
  const colourStops=palettes.ember.stops.map(rgb=>new THREE.Vector3(...rgb));
  let targetStops=colourStops.map(c=>c.clone());
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uniforms={colourStops:{value:colourStops},fieldA:{value:makeTexture()},fieldB:{value:makeTexture()},fraction:{value:0},time:{value:0},
    exaggeration:{value:4},relief:landscape.relief,gain:{value:1.5},viewExposure:{value:1},inspection:{value:0},selected:{value:-1}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float ground,band;uniform float exaggeration,relief;varying vec2 vUv,vMap;varying float vBand,vGround;
      void main(){vUv=uv;vBand=band;vGround=ground*100.;vMap=vec2(uv.x*1695.,-uv.y*1556.);vec3 e=vec3(0.,-${R},0.);float altitude=(1.1+band*.2)/100.;
      vec3 p=e+normalize(position-e)*(${R}+altitude*exaggeration+ground*(relief-1.));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform vec3 colourStops[4];uniform sampler2D fieldA,fieldB;uniform float fraction,time,gain,viewExposure,inspection;varying vec2 vUv,vMap;varying float vBand,vGround;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      float textureAt(vec2 p){float bend=noise(p*.38)*2.4;float broad=noise(vec2(p.x*.55,p.y*1.35+bend));float fine=pow(noise(vec2(p.x*1.1,p.y*7.+bend*2.)),3.);return .11+.25*broad+.8*fine;}
      vec3 colour(float b){float t=b/14.;if(t<.333)return mix(colourStops[0],colourStops[1],t*3.);if(t<.666)return mix(colourStops[1],colourStops[2],(t-.333)*3.);return mix(colourStops[2],colourStops[3],(t-.666)*3.);}
      void main(){if(vGround>=1.1+vBand*.2)discard;
        vec2 tex=vec2((vUv.x*${grid.width-1}.+.5)/${grid.width}.,(vBand*${grid.height}.+vUv.y*${grid.height-1}.+.5)/${grid.height*15}.);
        vec4 a=texture2D(fieldA,tex),b=texture2D(fieldB,tex);if((fraction<.0001&&a.r<0.)||(fraction>.9999&&b.r<0.)||(fraction>=.0001&&fraction<=.9999&&(a.r<0.||b.r<0.)))discard;
        vec4 f=mix(a,b,fraction);if(f.a<.001||f.r<=0.)discard;
        vec2 velocity=vec2(f.g,-f.b)*.3;float moving=step(.01,length(velocity));
        float phase=fract(time/24.),other=fract(time/24.+.5),blend=abs(phase*2.-1.);
        vec2 p=vMap/36.+vec2(vBand*.14,vBand*.22);
        float flow=mix(textureAt(p-velocity*phase*24./36.),textureAt(p-velocity*other*24./36.),blend);
        if(moving<.5)flow=textureAt(p);
        vec3 c=colour(vBand);if(inspection>.5)c=mix(vec3(.6,.24,.08),vec3(.13,.72,.85),f.a);
        gl_FragColor=vec4(c,flow*f.r*f.a*gain*viewExposure);
      }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
  let left=-1,right=-1;
  const cache=new Map();
  function frame(index){if(!cache.has(index)){cache.set(index,sampleGrid(grid,network.stations.map(s=>s.frames[index])));if(cache.size>4)cache.delete(cache.keys().next().value);}return cache.get(index);}
  return {uniforms,setPalette(id,immediate=false){
      if(!palettes[id])return;
      targetStops=palettes[id].stops.map(rgb=>new THREE.Vector3(...rgb));
      if(immediate||reducedMotion)colourStops.forEach((c,i)=>c.copy(targetStops[i]));
    },setIndex(index){const a=Math.floor(index),b=Math.min(144,a+1);if(left!==a){uniforms.fieldA.value.image.data=frame(a);uniforms.fieldA.value.needsUpdate=true;left=a;}if(right!==b){uniforms.fieldB.value.image.data=frame(b);uniforms.fieldB.value.needsUpdate=true;right=b;}uniforms.fraction.value=index-a;},
    draw(dt,playing){colourStops.forEach((c,i)=>c.lerp(targetStops[i],1-Math.exp(-dt*5)));if(playing)uniforms.time.value+=dt;}};
}
