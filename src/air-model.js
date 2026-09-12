import { sampleFrame } from './interpolation.js';
export function sampleAirFrame(frames,index){
  const frame=sampleFrame(frames,index),i=Math.floor(Math.max(0,Math.min(frames.length-1,index))),f=Math.max(0,Math.min(frames.length-1,index))-i;
  if(f===0)return frame;
  const a=frames[i],b=frames[i+1],adjacent=Date.parse(b.time)-Date.parse(a.time)===300000;
  const valid=band=>adjacent&&[a.uw[band],a.vw[band],b.uw[band],b.vw[band]].every(Number.isFinite);
  return {...frame,...Object.fromEntries(['uw','vw'].map(key=>[key,a[key].map((v,band)=>valid(band)?v+(b[key][band]-v)*f:null)]))};
}
export function describeVector(u,v){
  if(!Number.isFinite(u)||!Number.isFinite(v))return null;
  return {speed:Math.hypot(u,v)*3.6,bearing:(Math.atan2(u,v)*180/Math.PI+360)%360};
}
