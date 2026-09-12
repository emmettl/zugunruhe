import './site-shell.js';
import '@motionstudies/web/tokens.css';
import './network.css';
import './study-ui.css';
import './night.css';
import network from '../data/processed/network-night.json';
import { sampleFrame } from './interpolation.js';
import { frameMean } from './network-geo.js';
import { createContinentScene } from './continent-scene.js';
import { createNightField } from './night-field.js';
import { nightPose,nightChapter,NIGHT_END,NIGHT_DURATION,ease } from './night-journey.js';
import { arcPoint } from './network-camera.js';
import { installPlaybackKeyboard } from './playback-keyboard.js';
import { installStudyDialog } from './study-ui.js';

const $=id=>document.getElementById(id);
$('night-app').innerHTML=`
<header><a class="identity" href="/">ZUGUNRUHE<span>A NIGHT IN PASSAGE</span></a><span class="header-place">4–5 September 2018</span></header>
<main><div id="world"></div><div class="title"><span class="eyebrow" id="chapter">A CLOUD</span><h1 id="view-title">A night in passage.</h1><p id="view-subtitle">From one cloud to a sea of light.<br>Press play to begin.</p></div>
<div class="night-actions"><button id="continue" hidden>Continue journey</button><button id="controls-button">Controls</button></div>
<div id="graphics-error" hidden>The 3D view needs WebGL. Try reloading in a browser with graphics support.</div></main>
<footer><div class="playback"><button id="play" aria-label="Play" disabled>▶</button><div class="timeline"><div class="timeline-head"><span id="status">Ready · 2½ minutes</span><strong id="time-label">18:00 <small>UTC</small></strong></div><input type="range" id="clock" aria-label="Study time" min="0" max="126" step=".01" value="0" disabled><div class="ticks"><span>4 Sep · 18:00</span><span>00:00</span><span>5 Sep · 04:30</span></div></div></div><div class="footnote"><span id="evidence">One station · processed radar estimates</span><span>Drag to explore · pinch to zoom · Space to pause</span></div></footer>
<section id="night-controls" hidden><button id="close-controls" aria-label="Close controls">×</button><h2>The passage of a night.</h2><p>Drag to turn the scene. Pinch to move closer. Exploring pauses the journey; Continue journey brings you back.</p>
<div class="night-options"><label for="palette">Light<select id="palette"><option value="boreal">Boreal</option><option value="aquatic">Aquatic</option><option value="oxygen">Oxygen</option><option value="ember">Ember</option></select></label><label for="clouds">Cloud cover<select id="clouds"><option value="off">Off</option><option value="low">Low cloud</option><option value="total">Total cloud</option></select></label></div>
<div class="night-chapters" aria-label="Visit a chapter"><button data-time="12">A cloud</button><button data-time="42">Islands</button><button data-time="72">A sea</button></div>
<button id="restart">Begin again</button><p id="coverage"></p><button id="night-notes">About this night ↗</button></section>
<section id="notes" hidden><button id="close-notes" aria-label="Close study notes">×</button><h2>One night, several ways of seeing.</h2>
<p>This first journey follows 4 September 2018 at 18:00 UTC to 5 September at 04:30 UTC. Ten and a half hours pass in about two and a half minutes. Playback starts only when you ask. The camera itinerary and the moments when the representation changes are artistic choices, not bird routes or changes in measurement coverage.</p>
<p>It begins with the fifteen 1–4 km altitude bins at Memmingen, then reveals the same night at 37 stations in France, Germany, Belgium and the Netherlands. The islands are processed radar estimates with illustrative 80 km footprints, not coverage boundaries. Revealing other stations is a change of view; it is not evidence of departure spreading across Europe.</p>
<p>The sea then replaces those separate profiles with the existing spatial estimate between stations. Its luminous threads are tracers integrated through estimated horizontal velocities, not tracked individual birds. The estimate has no weather or habitat constraints, and does not cover the entire continent.</p>
<p>At Memmingen, the complete 1–4 km column mean peaks at 24.34 birds/km³ at 23:45 UTC. It falls to 1.56 at 04:30. Of the three local nights already extracted, this one has the highest column peak and is the only one currently prepared across the full network. It is a bounded first choice, not a search result across all migration seasons.</p>
<p>The journey ends at 04:30, when 30 of the 37 stations still have complete fifteen-band profiles. Most stations are unavailable at 00:45, 00:50 and 00:55 UTC. The view marks this observation gap; it does not fill it or interpret it as a lull in migration. Missing values remain unavailable; neither the opening darkness nor the ending should be read as no birds. The complete-station count appears in Controls. Brightness uses the existing common density scales; it is not a network-wide bird count.</p>
<p>Layer height gradually changes from ×12 to ×4 as the camera rises. Terrain relief is ×8. Colour and fine texture are artistic. Both representations use the same interpolated five-minute clock. Space/P plays or pauses; arrows move five minutes; Shift + arrows thirty minutes; Home/End visit the endpoints. Touch or mouse gestures pause the clock and release the camera. Continue journey returns smoothly without skipping time. With reduced motion enabled, playback advances the data while the camera stays still; chapter controls let you choose a view.</p>
<p>The optional cloud veil is hourly ERA5 cloud-area fraction for the same night, interpolated from the retained Open-Meteo data. Its height is a display projection. It does not affect the bird field or establish a causal response to weather. Generated using Copernicus Climate Change Service information; weather data by <a href="https://open-meteo.com/en/docs/historical-weather-api">Open-Meteo</a>, CC BY 4.0.</p>
<p>Bird profiles: Nussbaumer et al., <a href="https://doi.org/10.5281/zenodo.4587338">Vertical profiles time series of bird density and flight speed vector</a>, version 3, CC BY 4.0. Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen Terrain Tiles</a>. Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers; SRTM and GMTED2010 courtesy of the U.S. Geological Survey; Austria terrain © offene Daten Österreichs; Norway terrain © Kartverket; UK terrain © Environment Agency copyright and/or database right 2015. coastlines and water: Natural Earth. The four individual studies remain available above.</p></section>`;
let scene,index=0,playing=false,guided=true,started=false,returning=null,lastFrame=-1,sparse=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let heldPose=nightPose(0);
function interrupt(){
  if(!scene)return;playing=false;guided=false;returning=null;scene.releaseCamera();updateUI();
}
try{
  scene=createContinentScene($('world'),network.stations,()=>{},createNightField,{onInteract:interrupt});
  scene.setPalette('boreal',true);scene.setGain(.9);scene.driveCamera(heldPose);
  scene.renderer.domElement.setAttribute('aria-label','A journey from one radar cloud through separate stations to an estimated sea of migration. Drag to pause and explore; pinch to zoom.');
  $('play').disabled=false;$('clock').disabled=false;
}catch(error){$('graphics-error').hidden=false;console.error(error);}
const controls=installStudyDialog($('night-controls'),$('controls-button'),$('close-controls'));
const notes=installStudyDialog($('notes'),$('night-notes'),$('close-notes'));
function pause(){playing=false;if(returning){returning=null;guided=false;scene?.releaseCamera();}updateUI();}
$('controls-button').addEventListener('click',()=>{pause();controls(true);});
$('close-controls').addEventListener('click',()=>controls(false));
$('night-notes').addEventListener('click',()=>notes(true));$('close-notes').addEventListener('click',()=>notes(false));
function setFrames(){
  if(index===lastFrame)return;lastFrame=index;
  const frames=network.stations.map(s=>sampleFrame(s.frames,index));scene?.setFrames(frames,index);
  const count=frames.filter(f=>frameMean(f)!==null).length;
  sparse=index>=12&&count<18;
  $('coverage').textContent=`${count}/37 complete station profiles · 1–4 km above sea level. Gaps remain unavailable.`;
  $('time-label').innerHTML=`${frames[0].time.slice(11,16)} <small>UTC</small>`;
  const chapter=nightChapter(index);$('chapter').textContent=chapter.name.toUpperCase();
  if(started){$('view-title').textContent=chapter.line;$('view-subtitle').textContent=sparse?'Most station profiles are unavailable at this time.':chapter.detail;}
  $('evidence').textContent=index<24?'Memmingen · processed radar estimates':index<54?`${count}/37 complete profiles · separate observations`:`${count}/37 complete profiles · estimated field`;
}
function updateUI(){
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
  $('clock').value=index;
  $('continue').hidden=guided||index===NIGHT_END;
  $('status').textContent=returning?'Returning to the journey':!guided?'Exploring · time paused':index===NIGHT_END?'End · play to begin again':sparse?'Observation gap':playing?nightChapter(index).name:started?'Paused':'Ready · 2½ minutes';
}
function resume(){
  if(!scene)return;started=true;
  if(index>=NIGHT_END){seek(0);started=true;}
  if(!guided){
    const to=reducedMotion?scene.cameraPose():nightPose(index);
    if(reducedMotion){heldPose=to;guided=true;playing=true;}
    else{returning={from:scene.cameraPose(),to,elapsed:0};guided=true;playing=false;}
  }else playing=true;
  lastFrame=-1;setFrames();updateUI();
}
function seek(value){
  if(!scene)return;index=Math.max(0,Math.min(NIGHT_END,value));playing=false;started=true;guided=true;returning=null;
  heldPose=nightPose(index);scene.driveCamera(heldPose);lastFrame=-1;setFrames();updateUI();
}
$('play').addEventListener('click',()=>{if(playing||returning)pause();else resume();});
$('continue').addEventListener('click',resume);
$('clock').addEventListener('input',event=>seek(Number(event.target.value)));
$('restart').addEventListener('click',()=>{controls(false);seek(0);resume();});
for(const button of document.querySelectorAll('[data-time]'))button.addEventListener('click',()=>{controls(false);seek(Number(button.dataset.time));});
$('palette').addEventListener('change',event=>scene?.setPalette(event.target.value));
$('clouds').addEventListener('change',event=>scene?.setClouds(event.target.value));
installPlaybackKeyboard({timeline:$('clock'),play:$('play')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]'))interrupt();});
setFrames();updateUI();
let previous=performance.now();
function draw(now){
  const dt=Math.min(.1,(now-previous)/1000);previous=now;
  if(scene){
    if(returning){
      returning.elapsed+=dt;const t=ease(returning.elapsed/2.4);
      scene.driveCamera({position:arcPoint(returning.from.position,returning.to.position,t),target:arcPoint(returning.from.target,returning.to.target,t)});
      if(t>=1){returning=null;playing=true;}
    }else{
      if(playing){index=Math.min(NIGHT_END,index+dt*NIGHT_END/NIGHT_DURATION);if(index===NIGHT_END)playing=false;setFrames();}
      if(guided)scene.driveCamera(reducedMotion?heldPose:nightPose(index));
    }
    scene.draw(dt,playing);updateUI();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
