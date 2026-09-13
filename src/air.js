import './site-shell.js';
import '@motionstudies/web/tokens.css';
import './network.css';
import './study-ui.css';
import './air.css';
import './regional-air.css';
import initialStudy from '../data/processed/regional-air-night.json';
import {airNights,loadAirNight} from './regional-air-nights.js';
import inventory from '../data/processed/network-stations.json';
import {sampleAirFrame,describeVector} from './air-model.js';
import {createRegionalAirField} from './regional-air-field.js';
import {createContinentScene} from './continent-scene.js';
import {installStudyDialog} from './study-ui.js';
import {installPlaybackKeyboard} from './playback-keyboard.js';
import {airSound} from './air-sound.js';
import {publishSoundScene} from './sound-scene.js';
const $=id=>document.getElementById(id),names=new Map(inventory.metadata.map(s=>[s.name,s.location]));
let study=initialStudy,night=airNights.find(n=>n.date===study.date),loadingNight=false;
let stations=study.stations.filter(s=>s.lat>=45&&s.lat<=50&&s.lon>=4&&s.lon<=13);
const stationName=s=>names.get(s.name)||s.name;
$('air-app').dataset.sound='density';
$('air-app').innerHTML=`
<header><a class="identity" href="/">ZUGUNRUHE<span>BIRDS AND AIR</span></a><span class="header-place" id="night-place">Swiss-adjacent Europe · 24–25 September 2018</span></header>
<main><div id="world"></div><div class="title"><span class="eyebrow">AIR · ACROSS THE LANDSCAPE</span><h1 id="view-title">Across a changing sky.</h1><p id="view-subtitle">Blue air. Green passage.</p><button id="back-to-network" hidden>← Back to previous view</button></div>
<div class="air-reading" id="reading"></div>
<div class="air-actions"><div class="flow-switches" aria-label="Visible flows"><button id="birds" aria-pressed="true">● Birds</button><button id="wind" aria-pressed="true">╱ Wind</button></div><button id="controls-button">Controls</button></div>
<div id="graphics-error" hidden>The 3D view needs WebGL. Reload in a browser with graphics support.</div></main>
<footer><div class="playback"><button id="play" aria-label="Play" disabled>▶</button><div class="timeline"><div class="timeline-head"><span id="status">24–25 September</span><strong id="time-label"></strong></div><input type="range" id="clock" aria-label="Study time" min="12" max="108" step=".01" value="36" disabled><div class="ticks"><span>20:00</span><span>00:00</span><span>04:00</span></div></div></div><div class="footnote"><span>Interpolated regional fields · radar birds + ERA5 wind</span><span>Drag to turn · pinch to zoom · Space to pause</span></div></footer>
<section id="air-controls" hidden><button id="close-controls" aria-label="Close controls">×</button><h2>Through moving air.</h2>
<div class="control-row"><label for="night">Night</label><select id="night">${airNights.map(n=>`<option value="${n.date}" ${n.date===night.date?'selected':''}>${n.label} 2018</option>`).join('')}</select></div>
<p id="night-status" role="status" hidden></p>
<div class="control-row"><label for="playback-speed">Playback speed</label><select id="playback-speed"><option value="0.25">¼× · very slow</option><option value="0.5">½× · slow</option><option value="1" selected>1× · normal</option><option value="2">2× · fast</option><option value="4">4× · very fast</option></select></div>
<div class="control-row"><label for="altitude">Height</label><select id="altitude"><option value="-1" selected>All heights · 1–4 km</option>${study.altitudeCentresMAsl.map((h,i)=>`<option value="${i}" >${(h/1000).toFixed(1)} km ASL</option>`).join('')}</select></div>
<div class="control-row"><label for="station">Visit a station</label><select id="station"><option value="-1">Across the region</option>${stations.map((s,i)=>`<option value="${i}">${stationName(s)}</option>`).join('')}</select></div>
<div class="view-buttons"><button id="overlook">Regional view</button><button id="flyover" aria-pressed="false">Flyover · 100 km</button></div>
<p id="coverage"></p><p>Wind and birds share a clock and distance scale. The trails follow estimated regional movement; their glow and number are artistic choices.</p><button id="about">About this study ↗</button><a class="study-link" href="air-station.html">Original Memmingen comparison ↗</a></section>
<section id="notes" hidden><button id="close-notes" aria-label="Close study notes">×</button><h2>A changing sky, shared.</h2>
<p>Three contrasting nights: 9–10 September, 24–25 September and 8–9 October 2018. An hourly screen of 92 autumn nights was followed by five-minute checks of candidate windows. These three retain continuous timestamps and avoid the widespread bird-data dropouts found in other candidates. Missing individual profiles remain missing. Selection does not establish biological quality or a causal relationship between birds and wind.</p><p>Switch nights in Controls to compare the same time, height and camera position. The view stays paused; playback speed and visible flows are retained. Brightness, path seeding rules and distance scales are shared across nights. At 22:00 and 2.1 km, September 9 has eastward wind at Montancy, Memmingen and Eisberg; September 24 has sharply differing wind directions across those sites; October 8 has slower wind at the German sites alongside bird passage. These are local examples, not descriptions of the entire night or region.</p>
<p>Blue trails follow wind; green trails follow processed bird movement relative to the ground. Both are integrated through an estimated vector field, not individual tracks, confirmed migration routes, or local turbulent eddies. Bird brightness follows estimated density. Wind brightness and the number of trails do not measure air density. Both sets of trails use the same geographic distance and time scale.</p>
<p>The archive provides 37 locations across France, Germany, Belgium and the Netherlands, with no Swiss radar observations. Wind is ERA5 pressure-level reanalysis sampled upstream at those locations, at hourly 0.25° native resolution. It also informed the upstream bird/insect separation, so the two fields are not independent measurements. Native ERA5 does not resolve valley-scale wind. The original pressure-to-height conversion used a standard atmosphere.</p>
<p>For this regional experiment, each 0.25° field-grid point combines available station profiles within 240 km using a 90 km Gaussian distance kernel, tapered beyond 180 km. Support fades from 120 to 240 km from the nearest available paired observation. The display boundary also feathers over 0.5° latitude and 0.75° longitude. The fields interpolate between grid points and adjacent five-minute frames. Wind availability is independent of missing bird values. Unavailable pairs are never replaced with zero, and no temporal gaps are filled.</p>
<p>Paths use midpoint integration in one-minute steps, retain a fixed altitude, stop at terrain or absent support, and are prepared deterministically. Scrubbing restores the same paths. Wind tails show up to 60 minutes, bird tails 45 minutes. Trail birth and death fade smoothly. Seeds, lifetimes, widths and exposure are display choices; small differences between paths do not establish small-scale measured structure. All heights reduces common exposure to keep overlapping layers legible.</p>
<p>The visible clock runs from 20:00 to 04:00 UTC, opening at 22:00 with all heights visible. Retained data from 19:00 to 04:30 provide warm-up and ending room for trails. At normal speed (1×), five real minutes pass per playback second. Playback speed in Controls ranges from ¼× to 4× and changes both flows together. The chosen speed is retained in the page URL. Camera travel keeps its own pace. Height centres run from 1.1 to 3.9 km above sea level; terrain relief is exaggerated ×8 and layer height ×4. Layers lift with the displayed terrain and omit physically underground bands. No cloud-cover data from another night are shown.</p>
<p>Tap a station, or choose it in Controls, to descend. Back returns to your previous camera position. Flyover is an authored 65-second viewing route across Germany, the Alpine foreland and eastern France, not a migration route. Dragging, pinching or Escape stops it. Controls pauses playback and camera travel; closing it keeps the scene paused. Reduced motion starts paused and uses immediate camera visits; explicit playback and Flyover remain available.</p>
<p>Optional sound keeps a steady sustained bed. Estimated bird density shapes the spacing of six quiet, composed phrases, using one fixed scale across nights. The regional view averages available bird density and velocity pairs at the eleven radar locations within the displayed region, at the selected heights; visiting a station uses that station. This is a station summary, not an area-wide bird count. If fewer than half the selected pairs are available, or Birds is hidden, no new phrases begin. Existing phrases keep their tails. Scrubbing and night changes ease the response gradually without restarting the musical clock. Pitch and phrase loudness stay fixed; the notes and the mapping are artistic choices. Sound pauses separately from the visual clock.</p>
<p>Space or P toggles playback; arrows scrub five minutes, Shift + arrows thirty minutes, Home/End reach the endpoints. Touch rotates and pinches directly. The original single-station <a href="air-station.html">Memmingen comparison</a> remains available.</p>
<p>Profiles: <a href="https://zenodo.org/records/4587338">Nussbaumer and contributors, Zenodo v3</a>, CC BY 4.0. Wind: <a href="https://doi.org/10.24381/cds.bd0915c6">ERA5 pressure-level reanalysis</a>, Copernicus Climate Change Service. Geography: Natural Earth, public domain. Terrain: Mapzen Terrain Tiles, Copernicus / EU-DEM, USGS SRTM and GMTED2010, © offene Daten Österreichs, © Kartverket, © Environment Agency 2015. Solar position: SunCalc. No prior-art visualisations were consulted.</p></section>`;
const speedLabels=new Map([[.25,"¼×"],[.5,"½×"],[1,"1×"],[2,"2×"],[4,"4×"]]);
const requestedSpeed=Number(new URL(location.href).searchParams.get("speed"));
let playbackSpeed=speedLabels.has(requestedSpeed)?requestedSpeed:1;
$("playback-speed").value=String(playbackSpeed);
let index=36,band=-1,selected=-1,playing=false,showBirds=true,showWind=true,scene,field;
function select(value){selected=Number(value);$('station').value=selected;scene?.select(selected);update();}
try{
 scene=createContinentScene($('world'),stations,select,(world,landscape)=>(field=createRegionalAirField(world,landscape)),{travellingFlyover:true,markerScale:.3});
 scene.preset('regional');scene.setInspection(true);
 const canvas=scene.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Blue wind and green bird trails estimated across Swiss-adjacent Europe. Drag to turn; pinch to zoom; tap a station to visit.');
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;$('graphics-error').hidden=false;update();});
 $('play').disabled=$('clock').disabled=false;
}catch(error){$('graphics-error').hidden=false;console.error(error);}
function setFrame(){scene?.setFrames([sampleAirFrame(study.stations[0].frames,index)],index);}
function update(){
 publishSoundScene(airSound((selected<0?stations:[stations[selected]]).map(s=>sampleAirFrame(s.frames,index)),band,showBirds));
 const time=sampleAirFrame(study.stations[0].frames,index).time;
 $('clock').value=index;$('clock').setAttribute('aria-valuetext',`${time.slice(11,16)} UTC, ${time.slice(0,10)}`);$('time-label').innerHTML=`${time.slice(11,16)} <small>UTC</small>`;
 $('status').textContent=`${night.label}${loadingNight?' · loading…':playbackSpeed===1?'':` · ${speedLabels.get(playbackSpeed)}`}`;
 $('night-place').textContent=`Swiss-adjacent Europe · ${night.label} 2018`;
 $('play').disabled=$('clock').disabled=$('flyover').disabled=loadingNight||!scene;
 $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
 $('view-title').textContent=selected<0?'Across a changing sky.':stationName(stations[selected]);
 $('view-subtitle').textContent=selected<0?'Blue air. Green passage.':'Within the flow. Drag to turn.';
 $('back-to-network').hidden=!scene?.canReturn;$('back-to-network').disabled=scene?.returning??false;
 $('flyover').textContent=scene?.flying?'Stop flyover':'Flyover · 100 km';$('flyover').setAttribute('aria-pressed',String(scene?.flying??false));
 const label=band<0?'1–4 km ASL':`${(study.altitudeCentresMAsl[band]/1000).toFixed(1)} km ASL`;
 const reading=selected<0||band<0?`${label} · regional estimate`:(()=>{const f=sampleAirFrame(stations[selected].frames,index),v=(u,v)=>{const a=describeVector(u,v);return a?`${Math.round(a.bearing)}° · ${Math.round(a.speed)} km/h`:'unavailable';};return `${label}<br><span class="wind">Wind toward ${v(f.uw[band],f.vw[band])}</span><br><span class="birds">Birds toward ${v(f.ub[band],f.vb[band])}</span>`;})();
 $('reading').innerHTML=reading;
 const frames=study.stations.map(s=>sampleAirFrame(s.frames,index));const bands=band<0?Array.from({length:15},(_,i)=>i):[band];
 const paired=frames.reduce((n,f)=>n+bands.filter(b=>[f.dens[b],f.ub[b],f.vb[b]].every(Number.isFinite)).length,0);
 $('coverage').textContent=`${paired}/${37*bands.length} bird band profiles available at ${time.slice(11,16)} UTC. Wind profiles available at all 37 locations.`;
}
const controls=installStudyDialog($('air-controls'),$('controls-button'),$('close-controls'));
const notes=installStudyDialog($('notes'),$('about'),$('close-notes'));
function pause(){playing=false;scene?.stopFlyover();update();}
$('controls-button').addEventListener('click',()=>{pause();controls(true);});$('close-controls').addEventListener('click',()=>controls(false));
$('about').addEventListener('click',()=>notes(true));$('close-notes').addEventListener('click',()=>notes(false));
$('station').addEventListener('change',()=>{controls(false);select($('station').value);});$('back-to-network').addEventListener('click',()=>select(-1));
$('playback-speed').addEventListener('change',()=>{
 const value=Number($('playback-speed').value);if(!speedLabels.has(value))return;
 playbackSpeed=value;const url=new URL(location.href);
 if(value===1)url.searchParams.delete('speed');else url.searchParams.set('speed',String(value));
 history.replaceState(null,'',url);update();
});
async function switchNight(next){
 if(loadingNight||next===night)return;
 pause();loadingNight=true;$('night').disabled=true;$('night').value=next.date;
 $('night-status').hidden=false;$('night-status').textContent=`Loading ${next.label}…`;update();
 try{
  const loaded=next.date===initialStudy.date?{study:initialStudy}:await loadAirNight(next);
  // Keep the terrain, station positions, camera and its return bookmark intact.
  if(!loaded.study.stations.every((s,i)=>s.name===initialStudy.stations[i]?.name&&s.lat===initialStudy.stations[i].lat&&s.lon===initialStudy.stations[i].lon))throw new Error('Station layout changed');
  field?.setSources(loaded.flows);study=loaded.study;night=next;
  stations=study.stations.filter(s=>s.lat>=45&&s.lat<=50&&s.lon>=4&&s.lon<=13);
  const url=new URL(location.href);if(next.date===initialStudy.date)url.searchParams.delete('night');else url.searchParams.set('night',next.date);
  history.replaceState(null,'',url);setFrame();$('night-status').hidden=true;
 }catch{
  $('night').value=night.date;$('night-status').textContent='This night could not load. Your previous view is still here; select the night again to retry.';
 }finally{loadingNight=false;$('night').disabled=false;update();}
}
$('night').addEventListener('change',()=>{const next=airNights.find(n=>n.date===$('night').value);if(next)switchNight(next);});
$('altitude').addEventListener('change',()=>{band=Number($('altitude').value);field?.setBand(band);update();});
for(const id of ['birds','wind'])$(id).addEventListener('click',()=>{if(id==='birds')showBirds=!showBirds;else showWind=!showWind;$(id).setAttribute('aria-pressed',String(id==='birds'?showBirds:showWind));field?.setFlows(showBirds,showWind);update();});
$('play').addEventListener('click',()=>{if(!scene||loadingNight)return;if(index>=108)index=12;playing=!playing;setFrame();update();});
$('clock').addEventListener('input',()=>{if(loadingNight)return;playing=false;index=Number($('clock').value);setFrame();update();});
$('overlook').addEventListener('click',()=>{controls(false);scene?.preset('regional');selected=-1;$('station').value='-1';update();});
$('flyover').addEventListener('click',()=>{controls(false);const start=!scene?.flying;scene?.preset('flyover');selected=-1;$('station').value='-1';if(start&&scene){playing=true;if(index>=108)index=12;}setFrame();update();});
installPlaybackKeyboard({timeline:$('clock'),play:$('play'),blocked:()=>loadingNight||!!document.querySelector('dialog[open]')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')){scene?.stopFlyover();update();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
setFrame();update();
const requestedNight=airNights.find(n=>n.date===new URL(location.href).searchParams.get('night'));
if(requestedNight&&requestedNight!==night)switchNight(requestedNight);
let last=performance.now(),lastUI=0;
function draw(now){const dt=Math.min(.1,(now-last)/1000);last=now;
 if(!document.hidden&&!document.querySelector('dialog[open]')){
  if(playing){index=Math.min(108,index+dt*playbackSpeed);if(index===108)playing=false;setFrame();}
  scene?.draw(dt,playing);if(now-lastUI>150){update();lastUI=now;}
 }requestAnimationFrame(draw);}
requestAnimationFrame(draw);
