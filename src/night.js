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
import { nightPose,nightChapter,NIGHT_START,NIGHT_END,NIGHT_DURATION,ease } from './night-journey.js';
import { withinNightGap } from './night-data.js';
import { arcPoint } from './network-camera.js';
import { installPlaybackKeyboard } from './playback-keyboard.js';
import { installStudyDialog } from './study-ui.js';
import { nightSound } from './night-sound.js';
import { publishSoundScene } from './sound-scene.js';

const $=id=>document.getElementById(id);
$('night-app').innerHTML=`
<header><a class="identity" href="/">ZUGUNRUHE<span>A NIGHT IN PASSAGE</span></a><span class="header-place">4–5 September 2018</span></header>
<main><div id="world"></div><div class="title"><span class="eyebrow" id="chapter">A CLOUD</span><h1 id="view-title">A night in passage.</h1><p id="view-subtitle">From one cloud to a sea of light.<br>Press play to begin.</p></div>
<div class="night-actions"><button id="continue" hidden>Continue journey</button><button id="controls-button">Controls</button></div>
<div id="graphics-error" hidden>The 3D view needs WebGL. Try reloading in a browser with graphics support.</div></main>
<footer><div class="playback"><button id="play" aria-label="Play" disabled>▶</button><div class="timeline"><div class="timeline-head"><span id="status">Ready · 2¼ minutes</span><strong id="time-label">19:00 <small>UTC</small></strong></div><input type="range" id="clock" aria-label="Study time" min="${NIGHT_START}" max="${NIGHT_END}" step=".01" value="${NIGHT_START}" disabled><div class="ticks"><span>4 Sep · 19:00</span><span>00:00</span><span>5 Sep · 04:30</span></div></div></div><div class="footnote"><span id="evidence">One station · processed radar estimates</span><span>Drag to explore · pinch to zoom · Space to pause</span></div></footer>
<section id="night-controls" hidden><button id="close-controls" aria-label="Close controls">×</button><h2>The passage of a night.</h2><p>Drag to turn the scene. Pinch to move closer. Exploring pauses the journey; Continue journey brings you back.</p>
<div class="night-options"><div><label for="palette">Light</label><select id="palette"><option value="boreal">Boreal</option><option value="aquatic">Aquatic</option><option value="oxygen">Oxygen</option><option value="ember">Ember</option></select></div><div><label for="clouds">Cloud cover</label><select id="clouds"><option value="off">Off</option><option value="low">Low cloud</option><option value="total">Total cloud</option></select></div></div>
<div class="night-chapters" aria-label="Visit a chapter"><button data-time="12">A cloud</button><button data-time="42">Islands</button><button data-time="72">A sea</button></div>
<button id="restart">Begin again</button><p id="coverage"></p><button id="night-notes">About this night ↗</button></section>
<section id="notes" hidden><button id="close-notes" aria-label="Close study notes">×</button><h2>One night, several ways of seeing.</h2>
<p>This first journey follows 4 September 2018 at 19:00 UTC to 5 September at 04:30 UTC. Nine and a half hours pass in about two and a quarter minutes. The journey opens after the nearly empty early-evening profiles, with light already visible. Playback starts only when you ask. The camera itinerary and the moments when the representation changes are artistic choices, not bird routes or changes in measurement coverage.</p>
<p>It begins with the fifteen 1–4 km altitude bins at Memmingen, then reveals the same night at 37 stations in France, Germany, Belgium and the Netherlands. The islands are processed radar estimates with illustrative 80 km footprints, not coverage boundaries. Revealing other stations is a change of view; it is not evidence of departure spreading across Europe.</p>
<p>Optional sound follows those reveals: sustained layers for the cloud, passing tones for the islands, and quiet twinkling phrases for the flow. The upper layers recede toward morning. Playing or scrubbing changes their balance gradually while the musical phrases keep their own pace. This first responsive score is authored around the journey, not a sonification of measured bird density or speed.</p>
<p>Cloud cover adds a tentative musical motif: low, slowly unfolding tones with long tails. Its presence follows the regional mean of the selected ERA5 cloud layer, with gentle fades as time or cloud cover changes. This averages the retained weather grid, not just the area beneath the camera. The notes are composed; only their strength follows weather. Turning cloud cover off lets the motif recede.</p>
<p>The sea then replaces those separate profiles with the existing spatial estimate between stations. Its luminous threads are tracers integrated through estimated horizontal velocities, not tracked individual birds. The estimate has no weather or habitat constraints, and does not cover the entire continent.</p>
<p>At Memmingen, the complete 1–4 km column mean peaks at 24.34 birds/km³ at 23:45 UTC. It falls to 1.56 at 04:30. Of the three local nights already extracted, this one has the highest column peak and is the only one currently prepared across the full network. It is a bounded first choice, not a search result across all migration seasons.</p>
<p>The journey ends at 04:30, when 30 of the 37 stations still have complete fifteen-band profiles. Most stations are unavailable at 00:45, 00:50 and 00:55 UTC. For this continuous journey, missing density and velocity bands during that short gap are linearly interpolated between valid observations at 00:40 and 01:00. The moving trails are integrated through the same interpolated field, so they continue across the gap. This is a presentation estimate, not a recovered observation. Real values remain unchanged, and bands without valid observations on both sides remain unavailable. Controls identifies the interval and shows the original complete-station count. The four individual studies retain their original gap handling; the ending should not be read as no birds. Brightness uses the existing common density scales; it is not a network-wide bird count.</p>
<p>Layer height gradually changes from ×12 to ×4 as the camera rises. Terrain relief is ×8. Colour and fine texture are artistic. Both representations use the same interpolated five-minute clock. Space/P plays or pauses; arrows move five minutes; Shift + arrows thirty minutes; Home/End visit the endpoints. Touch or mouse gestures pause the clock and release the camera. Continue journey returns smoothly without skipping time. With reduced motion enabled, playback advances the data while the camera stays still; chapter controls let you choose a view.</p>
<p>The optional cloud veil is hourly ERA5 cloud-area fraction for the same night, interpolated from the retained Open-Meteo data. Its height is a display projection. It does not affect the bird field or establish a causal response to weather. Generated using Copernicus Climate Change Service information; weather data by <a href="https://open-meteo.com/en/docs/historical-weather-api">Open-Meteo</a>, CC BY 4.0.</p>
<p>Bird profiles: Nussbaumer et al., <a href="https://doi.org/10.5281/zenodo.4587338">Vertical profiles time series of bird density and flight speed vector</a>, version 3, CC BY 4.0. Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen Terrain Tiles</a>. Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers; SRTM and GMTED2010 courtesy of the U.S. Geological Survey; Austria terrain © offene Daten Österreichs; Norway terrain © Kartverket; UK terrain © Environment Agency copyright and/or database right 2015. coastlines and water: Natural Earth. The four individual studies remain available above.</p></section>`;
let scene,index=NIGHT_START,playing=false,guided=true,started=false,returning=null,lastFrame=-1;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let heldPose=nightPose(NIGHT_START);
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
  publishSoundScene(nightSound(index));
  const frames=network.stations.map(s=>sampleFrame(s.frames,index));scene?.setFrames(frames,index);
  const count=frames.filter(f=>frameMean(f)!==null).length;
  $('coverage').textContent=`${count}/37 complete observed station profiles · 1–4 km above sea level. ${withinNightGap(index)?'This interval blends missing bands between the 00:40 and 01:00 observations.':'The short 00:45–00:55 observation gap is interpolated for this journey.'}`;
  $('time-label').innerHTML=`${frames[0].time.slice(11,16)} <small>UTC</small>`;
  const chapter=nightChapter(index);$('chapter').textContent=chapter.name.toUpperCase();
  if(started){$('view-title').textContent=chapter.line;$('view-subtitle').textContent=chapter.detail;}
  $('evidence').textContent=index<24?'Memmingen · processed radar estimates':index<54?`${count}/37 complete profiles · separate observations`:withinNightGap(index)?'Estimated field · temporal interpolation':`${count}/37 complete profiles · estimated field`;
}
function updateUI(){
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
  $('clock').value=index;
  $('continue').hidden=guided||index===NIGHT_END;
  $('status').textContent=returning?'Returning to the journey':!guided?'Exploring · time paused':index===NIGHT_END?'End · play to begin again':playing?nightChapter(index).name:started?'Paused':'Ready · 2¼ minutes';
}
function resume(){
  if(!scene)return;started=true;
  if(index>=NIGHT_END){seek(NIGHT_START);started=true;}
  if(!guided){
    const to=reducedMotion?scene.cameraPose():nightPose(index);
    if(reducedMotion){heldPose=to;guided=true;playing=true;}
    else{returning={from:scene.cameraPose(),to,elapsed:0};guided=true;playing=false;}
  }else playing=true;
  lastFrame=-1;setFrames();updateUI();
}
function seek(value){
  if(!scene)return;index=Math.max(NIGHT_START,Math.min(NIGHT_END,value));playing=false;started=true;guided=true;returning=null;
  heldPose=nightPose(index);scene.driveCamera(heldPose);lastFrame=-1;setFrames();updateUI();
}
$('play').addEventListener('click',()=>{if(playing||returning)pause();else resume();});
$('continue').addEventListener('click',resume);
$('clock').addEventListener('input',event=>seek(Number(event.target.value)));
$('restart').addEventListener('click',()=>{controls(false);seek(NIGHT_START);resume();});
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
  // Controls pause the journey. Keep that backdrop still while a dialog is open,
  // avoiding expensive WebGL frames competing with form and keyboard interaction.
  if(scene&&!document.querySelector('dialog[open]')){
    if(returning){
      returning.elapsed+=dt;const t=ease(returning.elapsed/2.4);
      scene.driveCamera({position:arcPoint(returning.from.position,returning.to.position,t),target:arcPoint(returning.from.target,returning.to.target,t)});
      if(t>=1){returning=null;playing=true;}
    }else{
      if(playing){index=Math.min(NIGHT_END,index+dt*(NIGHT_END-NIGHT_START)/NIGHT_DURATION);if(index===NIGHT_END)playing=false;setFrames();}
      if(guided)scene.driveCamera(reducedMotion?heldPose:nightPose(index));
    }
    scene.draw(dt,playing);updateUI();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
