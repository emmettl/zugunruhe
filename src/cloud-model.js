export const cloudVariables={total:'cloud_cover',low:'cloud_cover_low',mid:'cloud_cover_mid',high:'cloud_cover_high'};

export function cloudBracket(times,time){
  const value=typeof time==='number'?time:Date.parse(time);
  if(!Number.isFinite(value)||value<Date.parse(times[0])||value>Date.parse(times.at(-1)))return null;
  for(let i=0;i<times.length;i++){
    const stamp=Date.parse(times[i]);
    if(value===stamp)return {a:i,b:i,fraction:0};
    if(stamp>value)return {a:i-1,b:i,fraction:(value-Date.parse(times[i-1]))/(stamp-Date.parse(times[i-1]))};
  }
  return null;
}

// Read the same bilinear spatial / linear temporal estimate as the display.
// A missing endpoint with nonzero weight keeps the estimate unavailable.
export function cloudCoverAt(data,mode,lat,lon,time){
  const key=cloudVariables[mode],bracket=cloudBracket(data.times,time);
  const {west,south,step,width,height}=data.grid,x=(lon-west)/step,y=(lat-south)/step;
  if(!key||!bracket||x<0||y<0||x>width-1||y>height-1)return null;
  const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  let value=0;
  for(const [t,wt] of [[bracket.a,1-bracket.fraction],[bracket.b,bracket.fraction]]){
    for(const [ix,wx] of [[x0,1-fx],[Math.min(x0+1,width-1),fx]]){
      for(const [iy,wy] of [[y0,1-fy],[Math.min(y0+1,height-1),fy]]){
        const weight=wt*wx*wy;if(weight===0)continue;
        const sample=data.frames[t][key][iy*width+ix];
        if(sample===null||!Number.isFinite(sample))return null;
        value+=sample*weight;
      }
    }
  }
  return value;
}

// Area-weighted mean of the retained weather grid, not camera-visible coverage.
// Keep missing weighted endpoints unavailable instead of treating them as clear.
export function cloudCoverMean(data,mode,time){
  const key=cloudVariables[mode],bracket=cloudBracket(data.times,time);
  if(!key||!bracket)return null;
  const {south,step,width,height}=data.grid;
  let sum=0,weight=0;
  for(let y=0;y<height;y++){
    const area=Math.cos((south+y*step)*Math.PI/180);
    for(let x=0;x<width;x++){
      const index=y*width+x;
      let cover=0;
      for(const [frame,w] of [[bracket.a,1-bracket.fraction],[bracket.b,bracket.fraction]]){
        if(w===0)continue;
        const value=data.frames[frame]?.[key]?.[index];
        if(!Number.isFinite(value)||value<0||value>100)return null;
        cover+=value*w;
      }
      sum+=cover*area;weight+=area;
    }
  }
  return weight?sum/weight/100:null;
}
