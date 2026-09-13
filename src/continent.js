import './site-shell.js';
import { installStudyDialog,installMobileStudy } from './study-ui.js';
import { installPlaybackKeyboard } from './playback-keyboard.js';
import '@motionstudies/web/tokens.css';
import './network.css';
import './continent.css';
import network from '../data/processed/network-night.json';
import inventory from '../data/processed/network-stations.json';
import { sampleFrame } from './interpolation.js';
import { createContinentScene } from './continent-scene.js';
import { frameMean } from './network-geo.js';
import weather from '../data/processed/cloud-night.json';
import { cloudCoverAt } from './cloud-model.js';
import { palettes, paletteGradient } from './continent-palettes.js';

const names=new Map(inventory.metadata.map(s=>[s.name,s.location]));
const stationName=s=>names.get(s.name)??s.name;
document.querySelector('#continent-app').innerHTML=`
  <header><a class="identity" href="/">ZUGUNRUHE<span>MOTION STUDIES / 03</span></a><span class="header-place">Western Europe · 4–5 September 2018</span><a class="previous" href="/studies/02-archipelago/">Archipelago ↗</a></header>
  <main><div id="world"></div>
    <div class="title"><span class="eyebrow">CONTINENT ABLAZE</span><h1 id="view-title">The sky between.</h1><p id="view-subtitle">A continuous field. One passing night.</p><button id="back-to-network" hidden>← Back to previous view</button></div>
    <div class="inspector"><label for="station">Visit a station</label><select id="station"><option value="-1">Whole field</option>${network.stations.map((s,i)=>`<option value="${i}">${stationName(s)} · ${s.name}</option>`).join('')}</select><div class="palette-control"><label for="palette">Palette</label><select id="palette">${Object.entries(palettes).map(([id,p])=>`<option value="${id}">${p.label}</option>`).join('')}</select></div><div id="reading"></div><label class="inspection"><input id="inspection" type="checkbox"> Show observation support</label><div class="spectrum" id="spectrum"></div><div class="spectrum-key"><span id="legend-low">1 km</span><span id="legend-title">Altitude</span><span id="legend-high">4 km</span></div></div>
    <div class="camera-controls" aria-label="Viewpoint"><button data-view="flyover">100 km · Flyover</button><button data-view="germany">Germany</button><button data-view="europe" class="active">Western Europe</button></div>
    <div class="height-controls"><label for="relief">Terrain relief</label><select id="relief"><option value="1">True scale</option><option value="4">×4</option><option value="8" selected>×8</option></select><label for="height">Layer height</label><select id="height"><option value="1">True scale</option><option value="4" selected>×4</option><option value="8">×8</option></select><label for="luminosity">Luminosity</label><input id="luminosity" type="range" min=".5" max="4" step=".1" value="1.5"><span id="camera-height"></span></div>
    <p class="gesture">Drag to orbit · scroll to zoom · Space play/pause · ← → time</p>
    <div id="graphics-error" hidden>The 3D view needs WebGL. Try reloading in a browser with graphics support.</div>
  </main>
  <footer><div class="weather-controls"><label for="clouds">Cloud cover</label><select id="clouds"><option value="off">Off</option><option value="total">Total</option><option value="low">Low</option><option value="mid">Middle</option><option value="high">High</option></select><span id="weather-reading" aria-live="off"></span><a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener noreferrer">ERA5 · Open-Meteo ↗</a></div><div class="playback"><button id="play" aria-label="Play">▶</button><div class="timeline"><div class="timeline-head"><span>4 SEPTEMBER</span><span id="coverage"></span><strong id="time-label">22:00 <small>UTC</small></strong></div><input id="clock" aria-label="Study time" type="range" min="0" max="144" step=".01" value="48"><div class="ticks"><span>18:00</span><span>00:00</span><span>06:00</span></div></div></div>
    <div class="footnote"><span>Spatial estimate from 37 stations · Western Europe · 1–4 km ASL</span><button id="notes-button" aria-expanded="false">About this study ↗</button></div>
  </footer>
  <section id="notes" hidden><button id="close-notes" aria-label="Close study notes">×</button><h2>Giving the spaces a voice.</h2>
    <p>Keyboard: Space or P plays and pauses. Left and Right scrub five minutes; hold Shift for thirty minutes. Home and End jump to the night’s endpoints. Scrubbing pauses playback. Selectors and other controls retain their normal keys.</p>
    <p>This third study joins the 37 profiles from Archipelago into a continuous estimate of the night sky over Western Europe. The preserved <a href="/studies/02-archipelago/">Archipelago study</a> retains the individual islands.</p>
    <p>At each altitude, nearby valid density observations are combined with distance weights on a 0.25° geographic grid. The weights favour nearby stations and taper to zero at 240 km. Brightness also fades as the nearest available observation recedes beyond 120 km. Missing values are excluded; zero remains zero. This smooth local estimate is not a validated continental migration forecast.</p>
    <p>East and north velocity components are estimated separately from complete pairs. They guide a continuous flowing texture. The texture is illustrative: it does not track individual birds or conserve the number of birds in flight. Adjacent five-minute estimated fields blend in time; this spatial method can fill a missing station observation using its neighbours.</p>
    <p>Colour follows the original fifteen 200 m altitude bands. The estimate covers the neighbourhood of this network, not all of Europe. It has no habitat, wind-weather or migration-route constraints; water is not treated as a barrier. The layer shapes and fine texture are artistic. No narrow flyways can be inferred from their appearance.</p>
    <p>Ember retains the original warm palette; Aquatic moves through blue and cyan; Boreal adds green and violet. Oxygen draws on the <a href="https://science.nasa.gov/earth/earth-observatory/auroras-dancing-in-the-night/">557.7 nm green and 630 nm red oxygen lines</a>. These are artistic palettes across the bird-altitude bands, not auroral emission measurements or a physical aurora altitude scale. Palette changes blend smoothly even while playback is paused.</p>
    <p>Show observation support reveals station markers and changes the light to cool cyan near available observations, warm amber toward the faded outer boundary. This shows distance support, not statistical confidence. Selecting a station displays its measured column mean. The field is smoothed and need not match that measurement exactly.</p>
    <p>Terrain relief defaults to ×8 and layer height to ×4. Each field location is lifted by its additional displayed ground elevation. Bands below the actual terrain are omitted. Luminosity changes a common artistic exposure for every location; it does not change the density estimates. Close views gently reduce exposure to retain detail.</p>
    <p>Play advances five minutes per second. Solar dusk follows the shared clock; camera movement remains independent. The camera controls and Back navigation work as in Archipelago.</p>
    <p>Cloud cover is hourly ERA5 reanalysis from <a href="https://open-meteo.com/en/docs/historical-weather-api">Open-Meteo</a> for the same night, sampled every 0.5° from its 0.25° source grid. Total, low, middle and high are separate cloud-area fractions, not additive layers. A pale veil projects the selected fraction onto the terrain: brighter areas mean more cloud cover. Its height is a display projection, not the actual cloud base or thickness. Bird light is drawn over it for comparison, without simulated occlusion or a claim that the birds flew above the clouds.</p>
    <p>Cloud cover blends bilinearly in space and linearly between hourly UTC samples; no extra cloud drift or fine texture is invented. Missing data remain unavailable. Station percentages are samples of that interpolated reanalysis, not station measurements. Cloud fields do not affect the bird estimates and do not establish a causal weather response. Generated using Copernicus Climate Change Service information; weather data by Open-Meteo, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Fields are subsetted and interpolated for display.</p>
    <p>Bird profiles: <a href="https://zenodo.org/records/4587338">Nussbaumer and contributors, Zenodo v3</a> · CC BY 4.0. Geography: Natural Earth · public domain. Elevation: Mapzen Terrain Tiles · Copernicus / EU-DEM; USGS SRTM and GMTED2010; © offene Daten Österreichs; © Kartverket; © Environment Agency 2015. Solar position: SunCalc.</p>
  </section>`;
const $=id=>document.getElementById(id);
let index=48,playing=false,selected=-1,frames=[],scene;
function select(value){selected=Number(value);$('station').value=selected;scene?.select(selected);updateUI();}
try{scene=createContinentScene($('world'),network.stations,select);}catch(error){$('graphics-error').hidden=false;console.error(error);}
function setFrames(){frames=network.stations.map(s=>sampleFrame(s.frames,index));scene?.setFrames(frames,index);}
function updateUI(){
  const frame=frames[0];if(!frame)return;
  updateWeather(frame.time);
  $('back-to-network').hidden=!scene?.canReturn;$('back-to-network').disabled=scene?.returning??false;
  $('view-title').textContent=selected<0?'The sky between.':stationName(network.stations[selected]);
  $('view-subtitle').textContent=selected<0?'A continuous field. One passing night.':'Within the field. Drag to turn around it.';
  const time=frame.time.slice(11,16);$('time-label').innerHTML=`${time} <small>UTC</small>`;$('clock').value=index;
  $('clock').setAttribute('aria-valuetext',`${time} UTC, ${frame.time.slice(0,10)}`);
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play');
  const complete=frames.filter(f=>f.dens.every(d=>d!==null)).length;
  $('coverage').textContent=`${playing?'Playing':'Paused'} · ${complete}/37 complete profiles`;
  if(selected<0){$('reading').innerHTML='<strong>37 <small>stations</small></strong><p>One continuous spatial estimate<br>Fifteen layers of the night</p>';return;}
  const s=network.stations[selected],f=frames[selected],mean=frameMean(f),valid=f.dens.filter(d=>d!==null).length;
  $('reading').innerHTML=`<strong>${mean===null?'—':mean.toFixed(1)} <small>birds/km³</small></strong><p>${mean===null?'Whole-column mean unavailable':'Mean over 1–4 km ASL'}<br>${valid}/15 altitude bands available<br>${s.lat.toFixed(3)}° N · ${s.lon.toFixed(3)}° E</p>`;
}
$('station').addEventListener('change',()=>select($('station').value));
$('back-to-network').addEventListener('click',()=>select(-1));
$('play').addEventListener('click',()=>{if(!scene)return;if(index>=144)index=0;playing=!playing;setFrames();updateUI();});
$('clock').addEventListener('input',()=>{index=Number($('clock').value);playing=false;setFrames();updateUI();});
$('inspection').addEventListener('change',()=>{
  const inspect=$('inspection').checked;scene?.setInspection(inspect);
  $('palette').disabled=inspect;
  $('spectrum').style.background=inspect?'linear-gradient(90deg,#9a3d14,#21b8d9)':paletteGradient($('palette').value);
  $('legend-low').textContent=inspect?'Further':'1 km';$('legend-title').textContent=inspect?'Observation support':'Altitude';$('legend-high').textContent=inspect?'Near':'4 km';
});
function applyPalette(immediate=false){
  const id=$('palette').value;
  scene?.setPalette(id,immediate);$('spectrum').style.background=paletteGradient(id);
}
const requestedPalette=new URL(location.href).searchParams.get('palette');
$('palette').value=Object.hasOwn(palettes,requestedPalette)?requestedPalette:'ember';
applyPalette(true);
$('palette').addEventListener('change',()=>{
  applyPalette();const url=new URL(location.href);url.searchParams.set('palette',$('palette').value);history.replaceState(null,'',url);
});
function updateWeather(time){
  const mode=$('clouds').value;
  if(mode==='off'){$('weather-reading').textContent='';return;}
  if(selected<0){$('weather-reading').textContent='Hourly · pale = more cover';return;}
  const station=network.stations[selected],cover=cloudCoverAt(weather,mode,station.lat,station.lon,time);
  $('weather-reading').textContent=cover===null?'Cover unavailable':`${Math.round(cover)}% near ${stationName(station)}`;
}
const requestedClouds=new URL(location.href).searchParams.get('clouds');
$('clouds').value=['total','low','mid','high'].includes(requestedClouds)?requestedClouds:'off';
scene?.setClouds($('clouds').value);
$('clouds').addEventListener('change',()=>{
  scene?.setClouds($('clouds').value);updateUI();
  const url=new URL(location.href);url.searchParams.set('clouds',$('clouds').value);history.replaceState(null,'',url);
});
$('luminosity').addEventListener('input',()=>scene?.setGain(Number($('luminosity').value)));
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
function animate(now){const cameraDt=Math.max(0,(now-last)/1000),dt=Math.min(.1,cameraDt);last=now;
  if(!document.hidden){if(playing){index=Math.min(144,index+dt);if(index===144)playing=false;setFrames();}
    const altitude=scene?.draw(dt,playing,cameraDt);
    if(now-lastUI>100){updateUI();$('camera-height').textContent=altitude===undefined?'':`${Math.round(altitude).toLocaleString()} km above Earth`;lastUI=now;}
  }requestAnimationFrame(animate);
}requestAnimationFrame(animate);

installMobileStudy();
