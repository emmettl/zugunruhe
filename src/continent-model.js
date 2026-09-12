// Local spatial estimate, not a migration forecast. Distances are kilometres.
export const FIELD_BOUNDS={west:-6,east:17,south:42,north:56,step:.25};
export const SUPPORT_KM=240;
const rad=Math.PI/180;
export function distanceKm(a,b){
  const p=(b.lat-a.lat)*rad,q=(b.lon-a.lon)*rad;
  const h=Math.sin(p/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(q/2)**2;
  return 12742.0176*Math.asin(Math.min(1,Math.sqrt(h)));
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function neighboursAt(stations,lat,lon,exclude=-1){
  return stations.map((station,i)=>({i,d:distanceKm(station,{lat,lon})}))
    .filter(n=>n.i!==exclude&&n.d<SUPPORT_KM)
    .map(n=>({...n,w:Math.exp(-.5*(n.d/90)**2)*(1-smooth((n.d-180)/60))}));
}
export function estimate(neighbours,frames,band){
  let weight=0,density=0,velocityWeight=0,u=0,v=0,nearest=Infinity;
  for(const n of neighbours){
    const f=frames[n.i],d=f.dens[band];
    if(d===null||!Number.isFinite(d))continue;
    weight+=n.w;density+=n.w*d;nearest=Math.min(nearest,n.d);
    if(Number.isFinite(f.ub[band])&&Number.isFinite(f.vb[band])){
      velocityWeight+=n.w;u+=n.w*f.ub[band];v+=n.w*f.vb[band];
    }
  }
  if(weight<1e-12)return {density:null,u:null,v:null,support:0};
  return {density:density/weight,u:velocityWeight?u/velocityWeight:null,v:velocityWeight?v/velocityWeight:null,
    support:1-smooth((nearest-120)/120)};
}
export function createFieldGrid(stations,bounds=FIELD_BOUNDS){
  const width=Math.round((bounds.east-bounds.west)/bounds.step)+1;
  const height=Math.round((bounds.north-bounds.south)/bounds.step)+1;
  const cells=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const lat=bounds.south+y*bounds.step,lon=bounds.west+x*bounds.step;
    cells.push({lat,lon,neighbours:neighboursAt(stations,lat,lon)});
  }
  return {width,height,cells};
}
export function sampleGrid(grid,frames){
  const data=new Float32Array(grid.cells.length*15*4);
  for(let band=0;band<15;band++)for(let i=0;i<grid.cells.length;i++){
    const value=estimate(grid.cells[i].neighbours,frames,band),offset=(band*grid.cells.length+i)*4;
    data[offset]=value.density===null?-1:value.density/100;
    data[offset+1]=value.u??0;data[offset+2]=value.v??0;data[offset+3]=value.support;
  }
  return data;
}
