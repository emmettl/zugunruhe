/** Bilinear height sampling, in kilometres, on the source's regional grid. */
export function terrainSampler(terrain){
  const latSpan=terrain.spanKm/6371.0088*180/Math.PI;
  const lonSpan=latSpan/Math.cos(terrain.centre.lat*Math.PI/180);
  const west=terrain.centre.lon-lonSpan/2,north=terrain.centre.lat+latSpan/2,size=terrain.size;
  function heightAt(lat,lon){
    const y=Math.max(0,Math.min(size-1,(north-lat)/latSpan*(size-1)));
    const x=Math.max(0,Math.min(size-1,(lon-west)/lonSpan*(size-1)));
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(size-1,x0+1),y1=Math.min(size-1,y0+1),fx=x-x0,fy=y-y0;
    const heights=terrain.elevationMetres;
    const a=heights[y0*size+x0]*(1-fx)+heights[y0*size+x1]*fx;
    const b=heights[y1*size+x0]*(1-fx)+heights[y1*size+x1]*fx;
    return Math.max(0,a*(1-fy)+b*fy)/1000;
  }
  return {heightAt,latSpan,lonSpan,west,north};
}
// Lift the entire station profile by its extra displayed ground elevation.
export function stationLift(groundKm,relief){return groundKm*(relief-1);}
