import { readFile, writeFile } from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {airSound} from '../src/air-sound.js';
import {createPhraseClock} from '../src/phrase-clock.js';
const root=new URL('../',import.meta.url).pathname,out=`${root}audio-studies/06-density`;
const ffmpeg=process.env.FFMPEG_BIN||'ffmpeg',sr=24000,seconds=90;
function decode(path){const bytes=execFileSync(ffmpeg,['-v','error','-i',path,'-f','f32le','-ar',String(sr),'-ac','2','pipe:1'],{maxBuffer:100e6});return new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));}
const bed=decode(`${root}audio-studies/04-responsive/sustained.mp3`);
const phrases=Array.from({length:6},(_,i)=>decode(`${out}/phrase-${i}.mp3`));
const records=[];
for(const [name,file,pick] of [['quiet','regional-air-2018-09-09-night.json','min'],['busy','regional-air-2018-10-08-night.json','max']]){
 const study=JSON.parse(await readFile(`${root}data/processed/${file}`));
 const stations=study.stations.filter(s=>s.lat>=45&&s.lat<=50&&s.lon>=4&&s.lon<=13);
 const choices=Array.from({length:97},(_,j)=>({index:j+12,...airSound(stations.map(s=>s.frames[j+12]))})).filter(s=>s.density!==null);
 choices.sort((a,b)=>a.density-b.density);const state=choices[pick==='min'?0:choices.length-1];
 const clock=createPhraseClock();clock.setActivity(state.activity);
 const mix=new Float32Array(seconds*sr*2);mix.set(bed.subarray(0,mix.length));const events=[];
 for(let t=0;t<seconds;t++){
  const event=clock.advance(t);if(!event)continue;events.push(event);
  const offset=Math.round(event.at*sr)*2,pcm=phrases[event.index];
  for(let i=0;i<pcm.length&&offset+i<mix.length;i++)mix[offset+i]+=pcm[i];
 }
 let peak=0,power=0;
 for(let i=0;i<mix.length;i++){
  const t=i/(sr*2),fade=Math.min(1,t/.8,(seconds-t)/3);
  mix[i]*=.65*Math.max(0,fade);peak=Math.max(peak,Math.abs(mix[i]));power+=mix[i]**2;
 }
 if(peak>.8)throw Error('Unexpected level');
 execFileSync(ffmpeg,['-v','error','-y','-f','f32le','-ar',String(sr),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-q:a','3',`${out}/listen-${name}.mp3`],{input:Buffer.from(mix.buffer)});
 records.push({name,file,time:stations[0].frames[state.index].time,density:state.density,coverage:state.coverage,activity:state.activity,events,seconds,peakDb:20*Math.log10(peak),rmsDb:10*Math.log10(power/mix.length)});
}
await writeFile(`${out}/comparison.json`,JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify(records,null,2));
