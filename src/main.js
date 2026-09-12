import './site-shell.js';
import { installPlaybackKeyboard } from './playback-keyboard.js';
import '@motionstudies/web/tokens.css';
import './style.css';
import study from '../data/processed/memmingen-three-nights.json';
import { createLayers, layerColours } from './layers.js';
import { sampleFrame } from './interpolation.js';
import { daylightAt } from './daylight.js';

const app=document.querySelector('#app');
app.innerHTML=`
  <header><a class="identity" href="/">ZUGUNRUHE<span>MOTION STUDIES / 01</span></a><span class="header-place">Memmingen · Southern Germany · September 2018</span></header>
  <main>
    <section class="stage" aria-label="3D density study">
      <div class="scene" id="scene"></div>
      <div class="scene-heading"><p class="eyebrow">LAYERS</p><h1>The air has depth.</h1><p>Colour follows altitude. Light follows density.</p><p class="sky-state" id="sky-state"></p></div>
      <div class="view-controls" aria-label="Camera view"><button id="orbit" class="active">Perspective</button><button id="side">Side</button><button id="top">Above</button></div>
      <div class="scene-foot"><span>Drag to turn · scroll to move closer</span><span>96 km terrain · vertical scale ×12</span></div>
      <div id="empty" hidden>No density estimates at this time</div>
    </section>
    <aside class="layer-panel">
      <div class="panel-heading"><span>ALTITUDE</span><span>birds/km³</span></div>
      <div id="bands" aria-label="Select an altitude band"></div>
      <div class="layer-detail" id="detail" aria-live="polite"></div>
      <button id="clear-band" hidden>Show all layers</button>
      <p class="key">Same density scale across all nights.<br>— means unavailable.</p>
    </aside>
  </main>
  <section class="playback" aria-label="Study playback">
    <div class="playback-heading"><div class="nights" aria-label="Select a night"></div><div class="time"><strong id="clock"></strong><span>UTC</span></div></div>
    <div class="timeline-row"><button id="play" aria-label="Pause playback">Ⅱ</button><div class="timeline"><svg id="spark" viewBox="0 0 720 48" preserveAspectRatio="none" aria-hidden="true"></svg><input id="time" type="range" min="0" max="144" step="0.01" value="48" aria-label="Study time"><div class="time-ticks"><span>18:00</span><span>00:00</span><span>06:00</span></div></div></div>
    <div class="playback-foot"><span id="status"></span><span>Texture motion is illustrative · estimated velocities guide the flow</span><button class="source-button" id="about" aria-expanded="false">About this study ↗</button></div>
  </section>
  <section class="about-panel" id="source-notes" hidden>
    <h2>One radar. Three nights.</h2><button id="close-about" aria-label="Close data notes">×</button>
    <p>Keyboard: Space or P plays and pauses. Left and Right scrub five minutes; hold Shift for thirty minutes. Home and End jump to the night’s endpoints. Scrubbing pauses playback. Selectors and other controls retain their normal keys.</p>
    <p>Each coloured layer represents a 200-metre altitude band around Memmingen. Brightness is proportional to the source density estimate; texture moves toward the estimated direction at a relative visual speed.</p>
    <p>The horizontal footprint and flowing texture are schematic. They do not show individual birds, paths, measured cloud shapes or spatial differences within a band. Missing density removes a layer; missing velocity leaves its texture still.</p>
    <p>The ground is real elevation data for a 96 × 96 km area centred on the radar at 48.0431° N, 10.2204° E. Contours are 100 metres apart. Terrain and air share the same sea-level altitude scale, exaggerated 12 times relative to horizontal distance. The coloured footprint remains illustrative; it is not a map of bird locations or radar coverage.</p>
    <p>Sky and terrain light follow the sun’s calculated position at the radar on the selected date, using <a href="https://github.com/mourner/suncalc/tree/v1.9.0" target="_blank" rel="noopener noreferrer">SunCalc</a>. Western afterglow fades through twilight; morning light returns from the east. Colour and atmospheric haze are artistic treatments, not recorded weather or a simulation of mountain shadows. Bird-layer brightness keeps its density scale throughout.</p>
    <p>Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener noreferrer">Mapzen Terrain Tiles on AWS</a>, sampled at 500 m spacing. Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers. SRTM and GMTED2010 courtesy of the U.S. Geological Survey. Austria terrain © offene Daten Österreichs — Digitales Geländemodell (DGM) Österreich.</p>
    <p>Playback moves continuously at five minutes per second. Density and velocity are interpolated between adjacent five-minute samples, preserving the exact source values at their timestamps. Missing values are never bridged. Scrubbing pauses. The source archive also includes earlier filtering and interpolation. The small timeline compares source mean density in the 1–2 km band.</p>
    <p>Data: Raphaël Nussbaumer and contributors · <a href="https://zenodo.org/records/4587338" target="_blank" rel="noopener noreferrer">Zenodo, version 3</a> · CC BY 4.0. Selected nights: 2–3, 3–4 and 4–5 September 2018. No species or individual identities are inferred.</p>
  </section>
`;
const maxDensity=Math.max(...study.nights.flatMap(n=>n.frames.flatMap(f=>f.dens.filter(d=>d!==null))));
// Open at dusk, held still so the short accelerated twilight can be seen before playback.
let night=2,index=0,selected=-1,playing=false;
const $=id=>document.getElementById(id),bands=$('bands');
const clock=m=>`${String((18+Math.floor(m/60))%24).padStart(2,'0')}:${String(Math.floor(m)%60).padStart(2,'0')}`;
let layers;
try{layers=createLayers($('scene'),maxDensity);}catch(error){
  $('empty').hidden=false;$('empty').textContent='The 3D view needs WebGL. Density values remain available alongside it.';playing=false;console.error(error);
}
for(let i=14;i>=0;i--){
  const button=document.createElement('button');button.className='band';button.dataset.band=i;
  button.style.setProperty('--band-colour',`#${layerColours[i].getHexString()}`);
  button.innerHTML=`<span class="band-alt">${(study.altitudeCentresMAsl[i]/1000).toFixed(1)}<small> km</small></span><span class="band-track"><span></span></span><span class="band-value"></span>`;
  button.addEventListener('click',()=>{selected=selected===i?-1:i;update();});bands.append(button);
}
study.nights.forEach((n,i)=>{
  const b=document.createElement('button');b.textContent=n.label;b.dataset.night=i;
  b.addEventListener('click',()=>{night=i;update();});document.querySelector('.nights').append(b);
});
function detail(frame){
  if(selected<0){$('detail').innerHTML='<span>Select a layer</span><p>Inspect its density and direction.</p>';$('clear-band').hidden=true;return;}
  $('clear-band').hidden=false;const a=study.altitudeCentresMAsl[selected],d=frame.dens[selected],u=frame.ub[selected],v=frame.vb[selected];
  const velocity=d!==null&&u!==null&&v!==null;
  const speed=velocity?Math.hypot(u,v)*3.6:0;
  const bearing=velocity?(Math.atan2(u,v)*180/Math.PI+360)%360:0;
  $('detail').innerHTML=`<span>${((a-100)/1000).toFixed(1)}–${((a+100)/1000).toFixed(1)} km ASL</span><p>${d===null?'Density unavailable':`${d.toFixed(1)} birds/km³`}<br>${!velocity?'Direction unavailable':speed<.01?'No mean movement':`Toward ${Math.round(bearing)}° · ${speed.toFixed(0)} km/h`}</p>`;
}
let sparkNight=-1;
function sparkline(){
  if(sparkNight===night)return;
  sparkNight=night;
  const frames=study.nights[night].frames;
  const ceiling=Math.max(...study.nights.flatMap(n=>n.frames.map(f=>f.meanDensity??0)));
  let path='',active=false;
  frames.forEach(f=>{if(f.meanDensity===null){active=false;return;}path+=`${active?'L':'M'}${f.minute},${46-f.meanDensity/ceiling*42} `;active=true;});
  $('spark').innerHTML=`<path d="${path}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}
function update(frame=sampleFrame(study.nights[night].frames,index)){
  layers?.setFrame(frame);layers?.selectBand(selected);
  const sun = daylightAt(frame.time);
  $('sky-state').textContent = sun.altitude < -18 ? 'Night' : sun.altitude > 0 ? 'Morning light'
    : sun.direction[0] > 0 ? 'Eastern dawn' : sun.altitude > -6 ? 'Western afterglow' : 'Twilight';
  $('clock').textContent=clock(frame.minute);$('time').value=index;
  $('time').setAttribute('aria-valuetext',`${clock(frame.minute)} UTC, ${frame.time.slice(0,10)}`);
  $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause playback':'Play');
  document.querySelectorAll('[data-night]').forEach(b=>{b.classList.toggle('active',+b.dataset.night===night);b.setAttribute('aria-pressed',String(+b.dataset.night===night));});
  document.querySelectorAll('[data-band]').forEach(b=>{
    const i=+b.dataset.band,d=frame.dens[i];b.querySelector('.band-value').textContent=d===null?'—':d.toFixed(1);
    b.querySelector('.band-track span').style.width=`${d===null?0:d/maxDensity*100}%`;
    b.classList.toggle('selected',selected===i);b.classList.toggle('dimmed',selected>=0&&selected!==i);
    b.setAttribute('aria-pressed',String(selected===i));
    b.setAttribute('aria-label',`${((study.altitudeCentresMAsl[i]-100)/1000).toFixed(1)} to ${((study.altitudeCentresMAsl[i]+100)/1000).toFixed(1)} kilometres above sea level: ${d===null?'unavailable':d.toFixed(1)+' birds per cubic kilometre'}`);
  });
  const valid=frame.dens.filter(d=>d!==null).length;
  if(layers)$('empty').hidden=valid>0;
  $('status').textContent=`${playing?'Playing':'Paused'} · ${valid}/15 bands available · ${frame.interpolated?'Interpolated between samples':'Source sample'}`;
  $('detail').setAttribute('aria-live',playing?'off':'polite');
  detail(frame);sparkline();
}
$('play').addEventListener('click',()=>{if(!layers)return;if(index===144)index=0;playing=!playing;update();});
$('time').addEventListener('input',()=>{index=Number($('time').value);playing=false;update();});
$('clear-band').addEventListener('click',()=>{selected=-1;update();});
[['orbit','home'],['side','viewSide'],['top','viewTop']].forEach(([id,method])=>$(id).addEventListener('click',()=>{
  layers?.[method]();document.querySelectorAll('.view-controls button').forEach(b=>b.classList.toggle('active',b.id===id));
}));
function notes(open){$('source-notes').hidden=!open;$('about').setAttribute('aria-expanded',String(open));if(open)$('close-about').focus();else $('about').focus();}
$('about').addEventListener('click',()=>notes($('source-notes').hidden));$('close-about').addEventListener('click',()=>notes(false));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('source-notes').hidden)notes(false);
});
installPlaybackKeyboard({timeline:$('time'),play:$('play'),blocked:()=>!$('source-notes').hidden});
document.addEventListener('visibilitychange',()=>{last=performance.now();});
let last=performance.now(),lastUi=0;
function animate(now){
  const dt=Math.min((now-last)/1000,.25);last=now;
  if(!document.hidden){
    if(playing){
      index=Math.min(144,index+dt);
      if(index===144)playing=false;
      const frame=sampleFrame(study.nights[night].frames,index);
      layers?.setFrame(frame);
      // GPU values update every frame; text updates at a readable cadence.
      if(now-lastUi>=100||!playing){update(frame);lastUi=now;}
    }
    layers?.draw(dt,playing);
  }
  requestAnimationFrame(animate);
}
layers?.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();playing=false;update();$('empty').hidden=false;$('empty').textContent='The 3D view lost its graphics context. Reload to restore it.';});
update();requestAnimationFrame(animate);
