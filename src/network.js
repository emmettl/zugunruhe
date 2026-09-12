import './site-shell.js';
import { installStudyDialog,installMobileStudy } from './study-ui.js';
import { installPlaybackKeyboard } from './playback-keyboard.js';
import '@motionstudies/web/tokens.css';
import './network.css';
import network from '../data/processed/network-night.json';
import inventory from '../data/processed/network-stations.json';
import { sampleFrame } from './interpolation.js';
import { createNetworkScene } from './network-scene.js';
import { frameMean } from './network-geo.js';

const names=new Map(inventory.metadata.map(s=>[s.name,s.location]));
const stationName=s=>names.get(s.name)??s.name;
document.querySelector('#network-app').innerHTML=`
  <header><a class="identity" href="/">ZUGUNRUHE<span>MOTION STUDIES / 02</span></a><span class="header-place">Western Europe · 4–5 September 2018</span><a class="previous" href="/studies/01-layers/">Study 01 ↗</a></header>
  <main><div id="world"></div>
    <div class="title"><span class="eyebrow">ARCHIPELAGO</span><h1 id="view-title">Islands in the night.</h1><p id="view-subtitle">Thirty-seven stations. One passing night.</p><button id="back-to-network" hidden>← Back to previous view</button></div>
    <div class="inspector"><label for="station">Look at a station</label><select id="station"><option value="-1">All 37 stations</option>${network.stations.map((s,i)=>`<option value="${i}">${stationName(s)} · ${s.name}</option>`).join('')}</select><div id="reading"></div><div class="spectrum"></div><div class="spectrum-key"><span>1 km</span><span>Altitude</span><span>4 km</span></div></div>
    <div class="camera-controls" aria-label="Viewpoint"><button data-view="flyover">100 km · Flyover</button><button data-view="germany">Germany</button><button data-view="europe" class="active">Western Europe</button></div>
    <div class="height-controls"><label for="relief">Terrain relief</label><select id="relief"><option value="1">True scale</option><option value="4">×4</option><option value="8" selected>×8</option></select><label for="height">Layer height</label><select id="height"><option value="1">True scale</option><option value="8">Exaggerated ×8</option></select><span id="camera-height"></span></div>
    <p class="gesture">Drag to orbit · scroll to zoom · Space play/pause · ← → time</p>
    <div id="graphics-error" hidden>The 3D view needs WebGL. Try reloading in a browser with graphics support.</div>
  </main>
  <footer><div class="playback"><button id="play" aria-label="Play">▶</button><div class="timeline"><div class="timeline-head"><span>4 SEPTEMBER</span><span id="coverage"></span><strong id="time-label">22:00 <small>UTC</small></strong></div><input id="clock" aria-label="Study time" type="range" min="0" max="144" step=".01" value="48"><div class="ticks"><span>18:00</span><span>00:00</span><span>06:00</span></div></div></div>
    <div class="footnote"><span>Each glow is a station’s profile. Space between stations is unsampled.</span><button id="notes-button" aria-expanded="false">About this study ↗</button></div>
  </footer>
  <section id="notes" hidden><button id="close-notes" aria-label="Close study notes">×</button><h2>One night, many islands.</h2>
    <p>Keyboard: Space or P plays and pauses. Left and Right scrub five minutes; hold Shift for thirty minutes. Home and End jump to the night’s endpoints. Scrubbing pauses playback. Selectors and other controls retain their normal keys.</p>
    <p>These are the 37 stations in our existing 2018 archive: 19 in France, 15 in Germany, two in the Netherlands and one in Belgium. They are a subset of the physical radar network. Median nearest-neighbour spacing in this subset is 133 km.</p>
    <p>Every island uses that station’s density and east/north velocity in fifteen 200 m bands, 1–4 km above sea level. Colour follows altitude. All stations share a fixed density scale of 0–100 birds/km³. Composite glow is not a calibrated pixel reading. Direction and relative speed guide the illustrative streaks.</p>
    <p>The soft island footprint is an artistic choice, approximately 80 km across, not measured bird-cloud shape, radar coverage or a spatial interpolation. Darkness between stations means unsampled space. Missing altitude values are omitted; missing velocity leaves the texture still. Zero remains zero.</p>
    <p>The curved ground uses Earth radius 6,371 km and elevation sampled every 4.7 km. Relief defaults to ×8 to reveal ridges and valleys; choose True scale or ×4 for a gentler landscape. Rivers and lakes follow mapped outlines, with river widths enlarged for visibility. Faint contours mark 500 m intervals in the source elevations. This is a broad landscape impression, not a local terrain survey.</p>
    <p>Camera altitude is measured above the reference sphere. The 100 km preset is an oblique regional view; Germany and Western Europe move higher. Layer height controls the 1–4 km altitude bands separately. Exaggerating terrain also lifts each entire station profile by the extra ground height beneath its centre, preserving local clearance at true layer scale. The numerical readings and colours still describe the original observations.</p>
    <p>Click a glowing island or choose a station to descend into it. Back returns to your previous camera position, even after visiting another station. Choosing a viewpoint preset starts a new overview. Camera travel is independent of playback; reduced-motion preferences use immediate transitions.</p>
    <p>Play advances five minutes per second. Complete adjacent five-minute observations interpolate smoothly; gaps are never bridged. The ground’s broad dusk lighting follows the calculated sun position. It does not reproduce recorded weather.</p>
    <p>Bird data: <a href="https://zenodo.org/records/4587338" target="_blank" rel="noopener noreferrer">Nussbaumer and contributors, Zenodo v3</a> · CC BY 4.0. Geography: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · public domain. Elevation: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener noreferrer">Mapzen Terrain Tiles</a> · Copernicus / EU-DEM; USGS SRTM and GMTED2010; © offene Daten Österreichs; © Kartverket; © Environment Agency 2015. Solar position: SunCalc.</p>
  </section>`;
const $=id=>document.getElementById(id);
let index=48,playing=false,selected=-1,frames=[],scene;
function select(value){selected=Number(value);$('station').value=selected;scene?.select(selected);updateUI();}
try{scene=createNetworkScene($('world'),network.stations,select);}catch(error){$('graphics-error').hidden=false;console.error(error);}
function setFrames(){frames=network.stations.map(s=>sampleFrame(s.frames,index));scene?.setFrames(frames);}
function updateUI(){
  const frame=frames[0];if(!frame)return;
  $('back-to-network').hidden=!scene?.canReturn;$('back-to-network').disabled=scene?.returning??false;
  $('view-title').textContent=selected<0?'Islands in the night.':stationName(network.stations[selected]);
  $('view-subtitle').textContent=selected<0?'Thirty-seven stations. One passing night.':'One station, fifteen layers. Drag to turn around it.';
  const time=frame.time.slice(11,16);$('time-label').innerHTML=`${time} <small>UTC</small>`;$('clock').value=index;
  $('clock').setAttribute('aria-valuetext',`${time} UTC, ${frame.time.slice(0,10)}`);
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
  const complete=frames.filter(f=>f.dens.every(d=>d!==null)).length;
  $('coverage').textContent=`${playing?'Playing':'Paused'} · ${complete}/37 complete profiles`;
  if(selected<0){$('reading').innerHTML='<strong>133 <small>km</small></strong><p>Median nearest neighbour<br>One density scale across all stations</p>';return;}
  const s=network.stations[selected],f=frames[selected],mean=frameMean(f),valid=f.dens.filter(d=>d!==null).length;
  $('reading').innerHTML=`<strong>${mean===null?'—':mean.toFixed(1)} <small>birds/km³</small></strong><p>${mean===null?'Whole-column mean unavailable':'Mean over 1–4 km ASL'}<br>${valid}/15 altitude bands available<br>${s.lat.toFixed(3)}° N · ${s.lon.toFixed(3)}° E</p>`;
}
$('station').addEventListener('change',()=>select($('station').value));
$('back-to-network').addEventListener('click',()=>select(-1));
$('play').addEventListener('click',()=>{if(!scene)return;if(index>=144)index=0;playing=!playing;setFrames();updateUI();});
$('clock').addEventListener('input',()=>{index=Number($('clock').value);playing=false;setFrames();updateUI();});
$('height').addEventListener('change',()=>scene?.setExaggeration(Number($('height').value)));
$('relief').addEventListener('change',()=>scene?.setRelief(Number($('relief').value)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{selected=-1;$('station').value='-1';scene?.preset(b.dataset.view);updateUI();document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));}));
const notes=installStudyDialog($('notes'),$('notes-button'),$('close-notes'));
$('notes-button').addEventListener('click',()=>notes($('notes').hidden));$('close-notes').addEventListener('click',()=>notes(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('notes').hidden)notes(false);});
let last=performance.now(),lastUI=0;
installPlaybackKeyboard({timeline:$('clock'),play:$('play'),blocked:()=>!$('notes').hidden});
document.addEventListener('visibilitychange',()=>{last=performance.now();});
scene?.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;$('graphics-error').hidden=false;updateUI();});
setFrames();updateUI();
function animate(now){const dt=Math.min(.1,(now-last)/1000);last=now;
  if(!document.hidden){if(playing){index=Math.min(144,index+dt);if(index===144)playing=false;setFrames();}
    const altitude=scene?.draw(dt,playing);
    if(now-lastUI>100){updateUI();$('camera-height').textContent=altitude===undefined?'':`${Math.round(altitude).toLocaleString()} km above Earth`;lastUI=now;}
  }requestAnimationFrame(animate);
}requestAnimationFrame(animate);

installMobileStudy();
