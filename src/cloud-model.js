import { bracketTime, sampleGriddedSeries, meanGriddedSeries } from '@motionstudies/core/domain/gridded-series';
export const cloudVariables={total:'cloud_cover',low:'cloud_cover_low',mid:'cloud_cover_mid',high:'cloud_cover_high'};
export const cloudBracket=bracketTime;
export function cloudCoverAt(data,mode,lat,lon,time){
  const key=cloudVariables[mode];
  return key?sampleGriddedSeries(data,key,lat,lon,time):null;
}
export function cloudCoverMean(data,mode,time){
  const key=cloudVariables[mode];
  const value=key?meanGriddedSeries(data,key,time,[0,100]):null;
  return value===null?null:value/100;
}
