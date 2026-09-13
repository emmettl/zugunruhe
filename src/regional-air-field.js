import * as THREE from 'three';
import wind from '../data/processed/regional-air-wind.json';
import birds from '../data/processed/regional-air-birds.json';
import {globePoint,R} from './network-geo.js';

const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createRegionalAirField(scene,landscape){
 const uniforms={exaggeration:{value:4},relief:landscape.relief,gain:{value:1},viewExposure:{value:1},inspection:{value:0},selected:{value:-1},viewport:{value:new THREE.Vector2(1,1)}};
 let index=36,band=-1,drawn=-1;
 const layers=[wind,birds].map(source=>{
  // World positions and terrain are fixed; calculate once, not every animation frame.
  const tracks=source.tracks.map(t=>({...t,points:t.points.map(p=>[...globePoint(p[0],p[1]),landscape.heightAt(p[0],p[1]),p[2],p[3]])}));
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,-1,0,1,-1,0,0,1,0,0,1,0,1,-1,0,1,1,0],3));
  const capacity=60000,attributes={};
  for(const [name,size] of [['from',3],['to',3],['ground',2],['ink',3]]){attributes[name]=new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,attributes[name]);}
  const isWind=source.kind==='wind';
  const material=new THREE.ShaderMaterial({uniforms:{...uniforms,colour:{value:new THREE.Vector3(...(isWind?[.18,.62,1]:[.3,.9,.6]))},width:{value:isWind?7:4}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
   vertexShader:`attribute vec3 from,to,ink;attribute vec2 ground;uniform vec2 viewport;uniform float relief,exaggeration,width;varying float side,alpha;
    vec3 lift(vec3 p,float h){vec3 e=vec3(0.,-${R},0.);float alt=(1.1+ink.z*.2)*exaggeration+h*(relief-1.)+.1;return e+normalize(p-e)*(${R}+alt/100.);}
    void main(){vec4 a=projectionMatrix*modelViewMatrix*vec4(lift(from,ground.x),1.),b=projectionMatrix*modelViewMatrix*vec4(lift(to,ground.y),1.);
     vec2 delta=(b.xy/b.w-a.xy/a.w)*viewport;float len=length(delta);vec2 normal=len>.00001?vec2(-delta.y,delta.x)/len:vec2(0.,1.);
     vec4 p=mix(a,b,position.x);p.xy+=normal*position.y*width/viewport*2.*p.w;gl_Position=p;side=position.y;alpha=ink.x;}`,
   fragmentShader:`uniform vec3 colour;uniform float gain,viewExposure;varying float side,alpha;
    void main(){float halo=exp(-side*side*4.)*.24,core=exp(-side*side*45.)*.7;
     gl_FragColor=vec4(colour,(halo+core)*alpha*gain*sqrt(viewExposure));}`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=isWind?3:4;scene.add(mesh);
  return {tracks,attributes,geometry,mesh,capacity,isWind,enabled:true};
 });
 function update(){
  if(drawn===index)return;drawn=index;
  for(const layer of layers){
   const {attributes,geometry,capacity,isWind}=layer;let count=0;
   for(const track of layer.tracks){
    if(band>=0&&track.band!==band)continue;
    const end=track.start+track.points.length-1;
    if(index<=track.start||index>=end)continue;
    const fade=smooth((index-track.start)/2)*smooth((end-index)/3),trail=isWind?12:9;
    for(let i=Math.max(0,Math.floor(index-trail-track.start));i<Math.min(track.points.length-1,Math.ceil(index-track.start));i++){
     const time=track.start+i,a=Math.max(time,index-trail),b=Math.min(time+1,index);if(b<=a||count>=capacity)continue;
     const p=track.points[i],q=track.points[i+1],f=a-time,g=b-time;
     const mix=(k,t)=>p[k]+(q[k]-p[k])*t,tail=Math.max(0,1-(index-(a+b)/2)/trail);
     const density=(mix(4,f)+mix(4,g))/2,support=Math.min(mix(5,f),mix(5,g));
     const alpha=(isWind?.6:Math.sqrt(Math.max(0,Math.min(1,density/30))))*support*fade*Math.pow(tail,1.5)*(band<0?.5:1.35);
     if(alpha<.002)continue;
     attributes.from.setXYZ(count,mix(0,f),mix(1,f),mix(2,f));attributes.to.setXYZ(count,mix(0,g),mix(1,g),mix(2,g));
     attributes.ground.setXY(count,mix(3,f),mix(3,g));attributes.ink.setXYZ(count,alpha,0,track.band);count++;
    }
   }
   geometry.instanceCount=count;for(const a of Object.values(attributes)){a.clearUpdateRanges();a.addUpdateRange(0,count*a.itemSize);a.needsUpdate=true;}
  }
 }
 return {uniforms,setIndex(value){index=value;},draw(){update();},resize(w,h){uniforms.viewport.value.set(w,h);},
  setBand(value){band=value;drawn=-1;},setFlows(showBirds,showWind){layers.forEach(l=>{l.mesh.visible=l.isWind?showWind:showBirds;});}};
}
