import * as THREE from 'three';
import network from '../data/processed/network-night.json';
import { createCurrentsField } from './currents-field.js';
import { sampleFrame } from './interpolation.js';
import { globePoint,R } from './network-geo.js';
import { nightPresentation } from './night-journey.js';

export function createNightField(scene,landscape){
  const field=createCurrentsField(scene,landscape),shared=field.uniforms;
  const stations=network.stations,count=stations.length*45;
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.4,-.4,0,.4,-.4,0,.4,.4,0,-.4,.4,0],3));
  geometry.setIndex([0,1,2,0,2,3]);geometry.instanceCount=count;
  const arrays={centre:[],east:[],south:[],ground:[],band:[],sheet:[],station:[]};
  const earth=new THREE.Vector3(0,-R,0);
  stations.forEach((s,si)=>{
    const centre=new THREE.Vector3(...globePoint(s.lat,s.lon));
    const east=new THREE.Vector3(...globePoint(s.lat,s.lon+.001)).sub(centre).normalize();
    const south=east.clone().cross(centre.clone().sub(earth).normalize()).normalize();
    for(let band=0;band<15;band++)for(let sheet=0;sheet<3;sheet++){
      arrays.centre.push(...centre);arrays.east.push(...east);arrays.south.push(...south);
      arrays.ground.push(landscape.heightAt(s.lat,s.lon));arrays.band.push(band);arrays.sheet.push(sheet);arrays.station.push(si);
    }
  });
  for(const [name,values] of Object.entries(arrays))geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(values),['centre','east','south'].includes(name)?3:1));
  const density=new Float32Array(count),velocity=new Float32Array(count*2);
  geometry.setAttribute('density',new THREE.InstancedBufferAttribute(density,1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('velocity',new THREE.InstancedBufferAttribute(velocity,2).setUsage(THREE.DynamicDrawUsage));
  const uniforms={...shared,neighbours:{value:0},islandOpacity:{value:1},clock:{value:0},home:{value:stations.findIndex(s=>s.name==='demem')}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 centre,east,south;attribute float ground,band,sheet,station,density;attribute vec2 velocity;
      uniform float exaggeration,relief;varying vec2 q,flow;varying float d,b,f,s;
      void main(){vec3 e=vec3(0.,-${R},0.);float altitude=1.1+band*.2+(sheet-1.)*.05;
        vec3 p=e+normalize(centre-e+east*position.x+south*position.y)*(${R}+(altitude*exaggeration+ground*(relief-1.))/100.);
        q=position.xy*8.;flow=velocity;d=ground>=1.1+band*.2?-1.:density;b=band;f=sheet==1.?1.:.45;s=station;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform vec3 colourStops[4];uniform float neighbours,islandOpacity,home,clock;varying vec2 q,flow;varying float d,b,f,s;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      vec3 colour(float t){t=t/14.*3.;if(t<1.)return mix(colourStops[0],colourStops[1],t);if(t<2.)return mix(colourStops[1],colourStops[2],t-1.);return mix(colourStops[2],colourStops[3],t-2.);}
      float textureAt(vec2 p){float bend=noise(p*.45+b)*.8;float body=smoothstep(.2,.8,noise(vec2(p.x*.65+b*7.,p.y*3.4+bend)));float fine=pow(smoothstep(.45,.95,noise(vec2(p.x*2.3,p.y*17.+bend*3.))),2.);return .25*body+.45*fine*body;}
      void main(){if(d<0.)discard;
        float phase=fract(clock/24.),other=fract(clock/24.+.5),blend=abs(phase*2.-1.);
        float texture=mix(textureAt(q-flow*phase*.16),textureAt(q-flow*other*.16),blend);
        float reveal=abs(s-home)<.1?1.:neighbours,edge=1.-smoothstep(1.3,3.2,length(q));
        gl_FragColor=vec4(colour(b),texture*d/100.*f*edge*reveal*islandOpacity);
      }`});
  const islands=new THREE.Mesh(geometry,material);islands.frustumCulled=false;islands.renderOrder=2;scene.add(islands);
  return {...field,setIndex(index){
    const p=nightPresentation(index);
    shared.fieldOpacity.value=p.sea;field.setThreadOpacity(p.threads);shared.exaggeration.value=p.exaggeration;
    uniforms.neighbours.value=p.neighbours;uniforms.islandOpacity.value=1-p.sea;uniforms.clock.value=index;
    // Give the continuous field the same repeatable texture phase on every seek.
    shared.time.value=index;
    if(p.sea>0)field.setIndex(index);
    if(p.sea<1){stations.forEach((s,si)=>{
      const frame=sampleFrame(s.frames,index);
      for(let b=0;b<15;b++)for(let sheet=0;sheet<3;sheet++){
        const i=si*45+b*3+sheet;density[i]=frame.dens[b]??-1;
        const valid=frame.ub[b]!==null&&frame.vb[b]!==null;
        velocity[i*2]=valid?frame.ub[b]:0;velocity[i*2+1]=valid?-frame.vb[b]:0;
      }
    });geometry.attributes.density.needsUpdate=true;geometry.attributes.velocity.needsUpdate=true;}
    islands.visible=p.sea<1;
  },draw(dt){field.draw(dt,false);}};
}
