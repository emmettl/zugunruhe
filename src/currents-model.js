import { FIELD_BOUNDS, estimate } from './continent-model.js';
const rad=Math.PI/180,kmPerDegree=6371.0088*rad;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// Unlike the texture field, unavailable velocity must never become zero here.
export function movementGrid(grid,frames){
  const data=new Float32Array(grid.cells.length*15*4);data.fill(NaN);
  for(let band=0;band<15;band++)for(let i=0;i<grid.cells.length;i++){
    const neighbours=grid.cells[i].neighbours,value=estimate(neighbours,frames,band);
    if(value.density===null||value.u===null||value.v===null)continue;
    let nearest=Infinity;
    for(const n of neighbours){const f=frames[n.i];if(Number.isFinite(f.dens[band])&&Number.isFinite(f.ub[band])&&Number.isFinite(f.vb[band]))nearest=Math.min(nearest,n.d);}
    const o=(band*grid.cells.length+i)*4;
    data.set([value.density,value.u,value.v,Math.min(value.support,1-smooth((nearest-120)/120))],o);
  }
  return data;
}
export function sampleMovement(data,lat,lon,band,bounds=FIELD_BOUNDS){
  const width=Math.round((bounds.east-bounds.west)/bounds.step)+1,height=Math.round((bounds.north-bounds.south)/bounds.step)+1;
  const x=(lon-bounds.west)/bounds.step,y=(lat-bounds.south)/bounds.step;
  if(x<0||x>width-1||y<0||y>height-1||band<0||band>=15)return null;
  const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,out=[0,0,0,0];
  for(const [xx,yy,w] of [[x0,y0,(1-fx)*(1-fy)],[Math.min(x0+1,width-1),y0,fx*(1-fy)],[x0,Math.min(y0+1,height-1),(1-fx)*fy],[Math.min(x0+1,width-1),Math.min(y0+1,height-1),fx*fy]]){
    if(w<1e-10)continue;
    const o=(band*width*height+yy*width+xx)*4;
    if(!Number.isFinite(data[o])||!Number.isFinite(data[o+1])||!Number.isFinite(data[o+2])||!Number.isFinite(data[o+3]))return null;
    for(let c=0;c<4;c++)out[c]+=data[o+c]*w;
  }
  return {density:out[0],u:out[1],v:out[2],support:out[3]};
}
export function mixMovement(a,b,f){
  if(f===0)return a;if(f===1)return b;if(!a||!b)return null;
  return Object.fromEntries(['density','u','v','support'].map(k=>[k,a[k]*(1-f)+b[k]*f]));
}
const displace=(p,v,seconds)=>({lat:p.lat+v.v*seconds/1000/kmPerDegree,lon:p.lon+v.u*seconds/1000/(kmPerDegree*Math.cos(p.lat*rad))});
// Explicit midpoint integration. Time is in five-minute study units, velocity m/s.
export function advancePath(p,time,step,sample){
  const a=sample(p,time);if(!a||a.support<=0)return null;
  const mid=displace(p,a,step*150),b=sample(mid,time+step/2);if(!b||b.support<=0)return null;
  const next=displace(p,b,step*300),value=sample(next,time+step);
  return value&&value.support>0?{...next,...value}:null;
}
export function visibleSegments(track,index,trail=15){
  const end=track.start+track.points.length-1;
  if(index<=track.start||index>=end)return [];
  const fade=smooth((index-track.start)/2)*smooth((end-index)/3),segments=[];
  for(let i=Math.max(0,Math.floor(index-trail-track.start));i<track.points.length-1;i++){
    const t=track.start+i,a=Math.max(t,index-trail),b=Math.min(t+1,index);
    if(b<=a)continue;
    const p=track.points[i],q=track.points[i+1],at=f=>p.map((v,k)=>v*(1-f)+q[k]*f);
    segments.push({a:at(a-t),b:at(b-t),tail:Math.max(0,1-(index-(a+b)/2)/trail),fade,band:track.band});
  }
  return segments;
}
