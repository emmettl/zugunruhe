import { createFieldGrid } from './continent-model.js';
import { movementGrid, sampleMovement, mixMovement } from './currents-model.js';
export const AIR_BOUNDS={west:3,east:14,south:44.5,north:51.5,step:.25};
export const createAirGrid=stations=>createFieldGrid(stations,AIR_BOUNDS);
// Reuse the distance kernel, but require complete vector pairs. Wind support is
// independent of bird availability; the constant density here is a tracer weight.
export function airMovementGrid(grid,frames,kind){
 const source=frames.map(f=>kind==='wind'?{
  dens:f.uw.map((u,b)=>Number.isFinite(u)&&Number.isFinite(f.vw[b])?1:null),ub:f.uw,vb:f.vw,
 }:f);
 return movementGrid(grid,source);
}
export function sampleAirMovement(fields,position,time,band){
 const bounded=Math.max(0,Math.min(fields.length-1,time)),a=Math.floor(bounded+1e-8),f=Math.max(0,bounded-a);
 const sample=i=>sampleMovement(fields[i],position.lat,position.lon,band,AIR_BOUNDS);
 const value=mixMovement(sample(a),f<1e-8?null:sample(Math.min(fields.length-1,a+1)),f<1e-8?0:f);
 if(!value)return null;
 const edge=Math.min((position.lat-AIR_BOUNDS.south)/.5,(AIR_BOUNDS.north-position.lat)/.5,(position.lon-AIR_BOUNDS.west)/.75,(AIR_BOUNDS.east-position.lon)/.75);
 const t=Math.max(0,Math.min(1,edge));return {...value,support:value.support*t*t*(3-2*t)};
}
