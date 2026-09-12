import * as THREE from 'three';
import { globePoint } from './network-geo.js';
import { arcPoint } from './network-camera.js';
export const NIGHT_START=12,NIGHT_END=126,NIGHT_DURATION=135;
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
export const between=(index,a,b)=>ease((index-a)/(b-a));
// Authored viewing positions, not an inferred migration route.
const shots=[
  [0,[47.55,10.55,105],[48.0431,10.2204,22]],
  [24,[47.50,10.1,120],[48.0431,10.2204,18]],
  [48,[45.1,9.6,950],[49,7.5,0]],
  [72,[44.2,8.6,1250],[49,6.5,0]],
  [102,[44.2,5.8,850],[48.4,4.2,0]],
  [126,[44.6,3.5,950],[48.5,3,0]],
].map(([index,eye,target])=>({index,position:new THREE.Vector3(...globePoint(...eye)),target:new THREE.Vector3(...globePoint(...target))}));
export function nightPose(index){
  const bounded=Math.max(0,Math.min(NIGHT_END,index));
  const right=shots.findIndex(s=>s.index>=bounded),b=shots[Math.max(1,right)],a=shots[Math.max(1,right)-1];
  const t=between(bounded,a.index,b.index);
  return {position:arcPoint(a.position,b.position,t),target:arcPoint(a.target,b.target,t)};
}
export function nightPresentation(index){
  return {neighbours:between(index,22,32),sea:between(index,48,66),threads:between(index,66,84),exaggeration:12-8*between(index,24,54)};
}
export function nightChapter(index){
  if(index<24)return {name:'A cloud',line:'Evening over Memmingen.',detail:'One radar. Fifteen layers of air.'};
  if(index<54)return {name:'An archipelago',line:'Islands in the night.',detail:'Separate stations, sharing one clock.'};
  if(index<102)return {name:'A sea',line:'A sea of movement.',detail:'An estimated field across Western Europe.'};
  return {name:'Toward morning',line:'The light begins to thin.',detail:'The observations end here at 04:30 UTC.'};
}
