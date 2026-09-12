// Night-only presentation estimate for the known 00:45–00:55 network dropout.
// Retain real observations; fill only missing bands bracketed by valid values.
export const NIGHT_GAP={before:80,after:84};
export const withinNightGap=index=>index>NIGHT_GAP.before&&index<NIGHT_GAP.after;
export function bridgeNightGap(stations){
  const {before,after}=NIGHT_GAP;
  return stations.map(station=>({...station,frames:station.frames.map((frame,index)=>{
    if(!withinNightGap(index))return frame;
    const a=station.frames[before],b=station.frames[after];
    if(!a||!b||Date.parse(b.time)-Date.parse(a.time)!==(after-before)*300000)return frame;
    const fraction=(index-before)/(after-before);
    const mix=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)?x+(y-x)*fraction:null;
    const dens=frame.dens.map((value,band)=>value??mix(a.dens[band],b.dens[band]));
    const velocity=key=>frame[key].map((value,band)=>{
      if(value!==null)return value;
      const valid=dens[band]!==null&&[a.ub[band],a.vb[band],b.ub[band],b.vb[band]].every(Number.isFinite);
      return valid?mix(a[key][band],b[key][band]):null;
    });
    const band=dens.slice(0,5);
    return {...frame,dens,ub:velocity('ub'),vb:velocity('vb'),
      meanDensity:band.every(Number.isFinite)?band.reduce((sum,v)=>sum+v,0)/band.length:null};
  })}));
}
