import './site-shell.js';
import '@motionstudies/web/tokens.css';
import './network.css';
import './study-ui.css';
import './air.css';
import * as THREE from 'three';
import study from '../data/processed/air-three-nights.json';
import {createLayers} from './layers.js';
import {createAirWind} from './air-wind.js';
import {sampleAirFrame,describeVector} from './air-model.js';
import {installStudyDialog} from './study-ui.js';
import {installPlaybackKeyboard} from './playback-keyboard.js';
const $=id=>document.getElementById(id);
$('air-app').innerHTML=`
<header><a class="identity" href="/">ZUGUNRUHE<span>BIRDS AND AIR</span></a><span class="header-place">Memmingen · Alpine foreland · September 2018</span></header>
<main><div id="world"></div><div class="title"><span class="eyebrow">AIR</span><h1>The air has a direction, too.</h1><p>Birds in green. Wind in blue.<br>Three nights, sharing the same sky.</p></div>
<div class="air-reading" id="reading"></div>
<div class="air-actions"><div class="flow-switches" aria-label="Visible flows"><button id="birds" aria-pressed="true">● Birds</button><button id="wind" aria-pressed="true">╱ Wind</button></div><button id="controls-button">Controls</button></div>
<div id="graphics-error" hidden>The 3D view needs WebGL. Reload in a browser with graphics support.</div></main>
<footer><div class="playback"><button id="play" aria-label="Play" disabled>▶</button><div class="timeline"><div class="timeline-head"><span id="status"></span><strong id="time-label"></strong></div><input type="range" id="clock" aria-label="Study time" min="12" max="126" step=".01" value="48" disabled><div class="ticks"><span>19:00</span><span>00:00</span><span>04:30</span></div></div></div><div class="footnote"><span>Processed bird estimates · ERA5 wind · 1–4 km ASL</span><span>Drag to turn · pinch to zoom · Space to pause</span></div></footer>
<section id="air-controls" hidden><button id="close-controls" aria-label="Close controls">×</button><h2>One sky. Three nights.</h2>
<div class="control-row"><label for="night">Night</label><select id="night">${study.nights.map((n,i)=>`<option value="${i}" ${i===1?'selected':''}>${n.label} 2018</option>`).join('')}</select></div>
<div class="control-row"><label for="altitude">Height</label><select id="altitude"><option value="-1">All heights</option>${study.altitudeCentresMAsl.map((h,i)=>`<option value="${i}" ${i===5?'selected':''}>${(h/1000).toFixed(1)} km ASL</option>`).join('')}</select></div>
<div class="view-buttons"><button id="home">Perspective</button><button id="above">Above</button><button id="side">Side</button></div>
<p id="coverage"></p><p>Green brightness follows bird density. Blue strands show wind direction and relative speed; their number and brightness do not measure air density.</p><button id="about">About this study ↗</button></section>
<section id="notes" hidden><button id="close-notes" aria-label="Close study notes">×</button><h2>Birds moving through moving air.</h2>
<p>Three already-selected nights at Memmingen: 2–3, 3–4 and 4–5 September 2018. The clock runs from 19:00 to 04:30 UTC, opening at 22:00 on the middle night. Switching nights preserves the time and camera, and pauses playback. These are a bounded comparison of neighbouring nights, not selected extremes across a season.</p>
<p>Bird density and horizontal movement are the processed radar estimates in the original archive. Wind is ERA5 pressure-level reanalysis, interpolated by the original researchers to each radar position, timestamp and height. Native wind resolution is hourly and 0.25°; pressure was converted to altitude using a standard-atmosphere formula. The archive rounds both components to 0.01 m/s. Wind also informed upstream bird/insect separation, so these estimates are not independent evidence of a behavioural response.</p>
<p>Directions point toward movement, with north at 0° and east at 90°. The readout compares the same 200 m band, at the altitude centre shown. Bird movement is relative to the ground; wind is the movement of air. The displayed speed is the magnitude of the mean vector, not the average speed of individual birds. We do not infer species, individual heading, intent, or causation.</p>
<p>All nights share one brightness scale. Isolating a height boosts its exposure threefold for legibility; All heights restores normal exposure. Green texture and blue strands are illustrative and repeated uniformly across each height, not observed spatial structure or individual paths. Their visual movement uses the same multiplier for bird and wind vectors. The 96 km terrain footprint and twelvefold vertical exaggeration are inherited from Cloud. Source heights are above sea level. With all heights visible, the numeric readout is hidden.</p>
<p>Density and paired vector components interpolate only between adjacent five-minute profiles. Exact source values and missing values are retained; gaps are not filled in this comparison. Wind may remain visible when bird data are unavailable. Pausing freezes both textures. Touch and mouse gestures turn the scene; reduced-motion preferences keep the textures still while the clock may advance.</p>
<p>Bird and deposited wind data: Nussbaumer and contributors, <a href="https://zenodo.org/records/4587338">Zenodo version 3</a>, CC BY 4.0. Weather source: <a href="https://doi.org/10.24381/cds.bd0915c6">ERA5 pressure-level reanalysis</a>, Copernicus Climate Change Service. This view uses the deposited wind values, not a new weather download.</p>
<p>Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen Terrain Tiles</a>. Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers. SRTM and GMTED2010 courtesy of the U.S. Geological Survey. Austria terrain © offene Daten Österreichs — Digitales Geländemodell (DGM) Österreich. Sun position supplies illustrative twilight lighting. No other visualisations were consulted.</p></section>`;
let night=1,index=48,band=5,playing=false,birds=true,wind=true,scene;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const maxDensity=Math.max(...study.nights.flatMap(n=>n.frames.flatMap(f=>f.dens.filter(Number.isFinite))));
try{
 const colours=Array.from({length:15},(_,i)=>new THREE.Color('#73efaa').lerp(new THREE.Color('#b6efce'),i/28));
 scene=createLayers($('world'),maxDensity,{colours,createOverlay:createAirWind,focusExposure:3,fitWidth:.95});
 scene.canvas.setAttribute('aria-label','Bird density in green and ERA5 wind in blue at matching heights over Memmingen. Drag to turn; pinch to zoom.');
 $('play').disabled=false;$('clock').disabled=false;
}catch(error){$('graphics-error').hidden=false;console.error(error);}
const vector=(label,u,v)=>{const d=describeVector(u,v);return `<span class="${label.toLowerCase()}">${label} ${d?d.speed<.1?'· still':`<i style="transform:rotate(${d.bearing}deg)" aria-hidden="true">↑</i> ${Math.round(d.bearing)}° · ${d.speed.toFixed(0)} km/h`:'· unavailable'}</span>`;};
function update(){
 const f=sampleAirFrame(study.nights[night].frames,index);scene?.setFrame(f);scene?.selectBand(band);
 $('clock').value=index;$('clock').setAttribute('aria-valuetext',`${f.time.slice(11,16)} UTC, ${f.time.slice(0,10)}`);
 $('time-label').innerHTML=`${f.time.slice(11,16)} <small>UTC</small>`;
 $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
 $('status').textContent=`${study.nights[night].label} · ${playing?'Playing':'Paused'}`;
 $('reading').hidden=band<0;
 if(band>=0){const valid=f.dens[band]!==null;$('reading').innerHTML=`<span class="reading-height">${(study.altitudeCentresMAsl[band]/1000).toFixed(1)} km ASL</span>${vector('Birds',valid?f.ub[band]:null,valid?f.vb[band]:null)}${vector('Wind',f.uw[band],f.vw[band])}`;}
 const paired=f.dens.filter((d,b)=>d!==null&&[f.ub[b],f.vb[b],f.uw[b],f.vw[b]].every(Number.isFinite)).length;
 $('coverage').textContent=`${paired}/15 bands have both bird and wind estimates at this time. Missing values remain unavailable.`;
}
function pause(){playing=false;update();}
const controls=installStudyDialog($('air-controls'),$('controls-button'),$('close-controls'));
const notes=installStudyDialog($('notes'),$('about'),$('close-notes'));
$('controls-button').addEventListener('click',()=>{pause();controls(true);});$('close-controls').addEventListener('click',()=>controls(false));
$('about').addEventListener('click',()=>notes(true));$('close-notes').addEventListener('click',()=>notes(false));
$('night').addEventListener('change',e=>{night=Number(e.target.value);pause();});
$('altitude').addEventListener('change',e=>{band=Number(e.target.value);update();});
for(const [id,method] of [['home','home'],['above','viewTop'],['side','viewSide']])$(id).addEventListener('click',()=>{scene?.[method]();controls(false);});
for(const id of ['birds','wind'])$(id).addEventListener('click',()=>{if(id==='birds')birds=!birds;else wind=!wind;$(id).setAttribute('aria-pressed',String(id==='birds'?birds:wind));scene?.setFlows(birds,wind);});
$('play').addEventListener('click',()=>{if(!scene)return;if(index>=126)index=12;playing=!playing;update();});
$('clock').addEventListener('input',e=>{index=Number(e.target.value);pause();});
installPlaybackKeyboard({timeline:$('clock'),play:$('play')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
scene?.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;$('play').disabled=true;$('graphics-error').hidden=false;});
update();let last=performance.now(),lastUI=0;
function draw(now){const dt=Math.min(.1,(now-last)/1000);last=now;
 if(!document.hidden){if(playing){index=Math.min(126,index+dt);if(index===126)playing=false;scene?.setFrame(sampleAirFrame(study.nights[night].frames,index));if(now-lastUI>100||!playing){update();lastUI=now;}}
 scene?.draw(dt,playing&&!reduced);}requestAnimationFrame(draw);}
requestAnimationFrame(draw);
