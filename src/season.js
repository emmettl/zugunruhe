import './site-shell.js';
import '@motionstudies/web/tokens.css';
import './season-passage.css';
import manifest from '../data/processed/season-nights-index.json';
import initial from '../data/processed/season-nights/demem.json';
import { periods, periodNights, dateLabel, describeVelocity, validateStation, densityLight } from './season-model.js';
import { advanceSeason, nearestNight, profilesOnDate } from './season-passage-model.js';
import { createSeasonPassage } from './season-passage-scene.js';
import { installStudyDialog } from './study-ui.js';

const $ = id => document.getElementById(id), params = new URL(location.href).searchParams;
const urls = import.meta.glob('../data/processed/season-nights/*.json', { query: '?url', import: 'default', eager: true });
const cache = new Map([['demem', initial]]);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let study = initial, period = Object.hasOwn(periods, params.get('period')) ? params.get('period') : 'autumn';
let nights = periodNights(study.nights, period);
const initialDate = params.get('date') || '2018-09-04';
let position = Math.max(0, nights.findIndex(n => n.date === initialDate));
let playing = false, loading = false, scene, lastSelected = -1, frame, lastTime = null, ambientTime = 0;
let geographyLoaded = false, geographyDate = null;

$('season-app').innerHTML = `
<header><a class="identity" href="/">ZUGUNRUHE<span>MOTION STUDIES 006</span></a></header>
<main id="season-passage">
  <div id="passage-world"></div>
  <div class="passage-heading"><p class="eyebrow" id="passage-period"></p><h1>A season of nights.</h1><p id="passage-place"></p></div>
  <div class="passage-actions"><button id="passage-dimension" aria-pressed="false">Across places</button><button id="passage-view" aria-pressed="false">Look across</button><button id="passage-explore">Explore</button></div>
  <div class="passage-date"><p class="eyebrow">NIGHT BEGINNING</p><h2 id="passage-date-label"></h2><p id="passage-state"></p></div>
  <div class="passage-bottom">
    <p class="passage-thought">Each veil is a night. Distance is time.</p>
    <div class="passage-timeline"><canvas id="passage-score" aria-hidden="true"></canvas><input id="passage-clock" type="range" min="0" max="121" step=".01" aria-label="Night in the season"><div class="passage-endpoints"><span id="passage-start"></span><span id="passage-end"></span></div></div>
    <div class="passage-transport"><button id="passage-play" aria-label="Drift through nights"><span aria-hidden="true">▷</span> Drift through nights</button><span class="passage-gesture">Drag to look around</span><button id="passage-read">Read this night ↗</button></div>
  </div>
  <div id="passage-error" role="status" hidden></div>
</main>
<section id="passage-controls" hidden><button id="passage-close-controls" class="passage-close" aria-label="Close exploration controls">×</button><h2>Through the season.</h2>
  <label for="passage-station">The sky above</label><select id="passage-station">${manifest.stations.map(s => `<option value="${s.name}" ${s.name === study.site.name ? 'selected' : ''}>${s.label} · ${s.name.slice(0, 2).toUpperCase()}</option>`).join('')}</select>
  <label for="passage-season">Time of year</label><select id="passage-season">${Object.entries(periods).map(([id, p]) => `<option value="${id}" ${id === period ? 'selected' : ''}>${id === 'year' ? 'Whole year · 2018' : p.label}</option>`).join('')}</select>
  <p id="passage-availability"></p><p>This is a walk through time. The veils hold nightly estimates at one radar; their folds and the space between them are an imagined setting. Gold sits below pink, violet and blue as altitude rises.</p>
  <p>Across places gathers the same night at all 37 radars on a geographic map. Tap a radar to unfold its season, or select it above and choose Through this place. Returning to the map keeps the date you reached. The chosen veil anchors the transformation.</p>
  <p>Drift moves slowly between dates. You can stop anywhere, drag to look around, or use the ribbon to travel further. Arrow keys move one night; Shift moves seven. Space plays or pauses.</p>
  <a class="passage-data-link" id="passage-data-controls" href="season-data.html">Open the data calendar ↗</a>
</section>
<section id="passage-inspect" hidden><button id="passage-close-inspect" class="passage-close" aria-label="Close night reading">×</button><h2 id="passage-inspect-title">Within the night.</h2><div id="passage-reading"></div>
  <details><summary>How this light relates to the data</summary>
    <p>Each veil represents one four-hour sample, 22:00–02:00 UTC, across fifteen altitude bins spanning 1–4 km above sea level. At least 39 of 48 complete five-minute density profiles are required. Missing nights have no bird veil. Zero density produces no bird light.</p>
    <p>The data and shared square-root light scale are unchanged from the calendar. Camera distance, overlapping veils, folds, reflection and slowly changing texture are artistic treatments. They do not reconstruct terrain, clouds, flight paths or between-night migration. Moving through space changes the viewpoint; it does not interpolate a density between dates. Read exact values in the calendar.</p>
    <p>The geographic view uses historical radar coordinates in a flat regional projection (east right, north back; 20 km per scene unit). Veil width is an illustrative footprint, not radar coverage. Altitude order and density mapping stay the same; one shared exposure increases as veils separate to compensate for lower overlap. Heights are exaggerated and the flat base is not terrain. Country outlines are simplified Natural Earth geometry, public domain. Non-selected places fade as neighbouring dates unfold; they are not transformed into different observations.</p>
    <p>The whole-year view contains gaps: January and July have no timestamps in the source. Other nights can fail the completeness rule. A dark gap does not establish an absence of birds. This is one incomplete year, not a typical seasonal cycle.</p>
    <p>Source: <a href="https://zenodo.org/records/4587338">Raphaël Nussbaumer and contributors, Zenodo v3</a>, CC BY 4.0. Processed radar estimates include upstream filtering and interpolation. No individual birds or species are identified. The separate audio work is not connected to this study.</p>
  </details><a class="passage-data-link" id="passage-data-inspect" href="season-data.html">Read the full data calendar ↗</a>
</section>`;

function selected() { return nights[nearestNight(position, nights.length)]; }
function save() {
  const url = new URL(location.href);
  url.searchParams.set('station', study.site.name); url.searchParams.set('date', selected().date); url.searchParams.set('period', period);
  if (scene?.spatial) url.searchParams.set('view', 'space'); else url.searchParams.delete('view');
  history.replaceState(null, '', url);
}
function drawScore() {
  const canvas = $('passage-score'), rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 1.5);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const w = rect.width / nights.length, height = rect.height;
  nights.forEach((n, i) => {
    if (n.meanDensity === null) { ctx.fillStyle = '#8791a53b'; ctx.fillRect(i * w, height - 2, Math.max(.5, w - 1), 1); return; }
    const light = densityLight(n.meanDensity, manifest.scale.densityCap);
    ctx.fillStyle = `rgba(190,166,213,${.18 + light * .6})`;
    ctx.fillRect(i * w, height - 2 - light * (height - 4), Math.max(.5, w - 1), Math.max(1, light * (height - 4)));
  });
}
function update() {
  const night = selected(), site = manifest.stations.find(s => s.name === study.site.name);
  const spatial = scene?.spatial ?? false, moving = scene?.transitioning ?? false;
  scene?.canvas.setAttribute('aria-label', spatial ? 'Nightly bird-density veils at 37 radar locations. Tap a radar to unfold its season, or choose a station in Explore. Drag to look around.' : 'A passage through nightly altitude veils. Drag to look around. Left and right arrows move between dates.');
  $('season-passage').dataset.view = spatial ? 'space' : 'time'; $('season-passage').dataset.transitioning = String(moving);
  $('passage-dimension').textContent = spatial ? 'Through this place' : 'Across places';
  $('passage-dimension').setAttribute('aria-pressed', String(spatial));
  $('passage-dimension').disabled = loading || moving || !scene;
  $('passage-view').hidden = spatial;
  $('passage-view').textContent = scene?.overview ? 'Step within' : 'Look across'; $('passage-view').setAttribute('aria-pressed', String(scene?.overview ?? false));
  document.querySelector('.passage-heading h1').textContent = spatial ? 'A night across Europe.' : 'A season of nights.';
  document.querySelector('.passage-thought').textContent = spatial ? 'One night, across the landscape. Choose a radar to unfold its season.' : 'Each veil is a night. Distance is time.';
  document.querySelector('.passage-gesture').textContent = spatial ? 'Tap a radar · drag to look around' : 'Drag to look around';
  $('passage-period').textContent = `${spatial ? 'ACROSS PLACES' : period === 'year' ? 'A YEAR IN PASSAGE' : period.toUpperCase()} / 2018`;
  $('passage-place').textContent = site.label;
  $('passage-date-label').textContent = dateLabel(night.date);
  $('passage-state').textContent = night.density === null ? 'No usable observation for this night' : '';
  $('passage-clock').max = nights.length - 1; $('passage-clock').value = position;
  $('passage-clock').setAttribute('aria-valuetext', `${dateLabel(night.date)} 2018, ${site.label}${night.density === null ? ', unavailable' : ''}`);
  const playLabel = playing ? (spatial ? 'Pause nights' : 'Pause drift') : (spatial ? 'Play nights' : 'Drift through nights');
  $('passage-play').innerHTML = `<span aria-hidden="true">${playing ? 'Ⅱ' : '▷'}</span> ${playLabel}`;
  $('passage-play').setAttribute('aria-label', playLabel);
  $('passage-play').disabled = $('passage-clock').disabled = $('passage-view').disabled = loading || moving || !scene;
  $('passage-explore').disabled = $('passage-read').disabled = moving;
  $('passage-station').disabled = $('passage-season').disabled = loading || moving;
  $('passage-start').textContent = dateLabel(nights[0].date, { month: 'short' });
  $('passage-end').textContent = dateLabel(nights.at(-1).date, { month: 'short' });
  $('passage-availability').textContent = spatial && geographyLoaded ? `${profilesOnDate(manifest.stations, cache, night.date).filter(n => n.density !== null).length} of 37 radars have usable observations on ${dateLabel(night.date)}. Selected: ${site.label}.` : `${nights.filter(n => n.density !== null).length} of ${nights.length} nights available at ${site.label}.`;
  $('passage-inspect-title').textContent = `${dateLabel(night.date)} · ${site.label}`;
  const v = describeVelocity(night.velocity);
  $('passage-reading').innerHTML = `<p class="reading-density">${night.meanDensity === null ? 'Insufficient observations' : `<strong>${night.meanDensity.toFixed(2)}</strong> birds/km³`}</p><p>Mean density across 1–4 km above sea level, within the 22:00–02:00 UTC window.</p><p>${night.completeSamples} of 48 complete five-minute profiles${night.density === null ? ' · at least 39 needed for a veil' : ''}.</p><p>${v && v.bearing !== null ? `Mean ground movement toward ${Math.round(v.bearing) % 360}° at ${Math.round(v.speed)} km/h.` : 'Mean direction unavailable or cancelled.'}</p>`;
  const dataUrl = `season-data.html?station=${site.name}&date=${night.date}&period=${period}`;
  $('passage-data-controls').href = $('passage-data-inspect').href = dataUrl;
  if (geographyLoaded && geographyDate !== night.date) syncGeography();
  lastSelected = nearestNight(position, nights.length);
}
function pause() { playing = false; update(); save(); }
function seek(next) {
  if (loading || scene?.transitioning) return;
  playing = false; position = Math.max(0, Math.min(nights.length - 1, next));
  scene?.setPosition(position); update(); save(); requestFrame();
}
function toggle() {
  if (!scene || loading || scene.transitioning) return;
  if (position >= nights.length - 1) { position = 0; scene.setPosition(position); }
  playing = !playing; update(); save(); requestFrame();
}
try {
  scene = createSeasonPassage($('passage-world'), nights, manifest.scale.densityCap, () => { if (scene) pause(); },
    manifest.stations, manifest.stations.find(s => s.name === study.site.name), unfoldStation,
    () => { update(); save(); requestFrame(); });
  scene.setPosition(position);
} catch (error) {
  $('passage-error').hidden = false;
  $('passage-error').innerHTML = 'The light study needs WebGL. <a href="season-data.html">Open the data calendar ↗</a>';
  console.error(error);
}
$('passage-world').addEventListener('graphics-lost', () => {
  pause(); scene = null; update();
  $('passage-error').hidden = false;
  $('passage-error').innerHTML = 'Graphics paused. Reload to return, or <a href="season-data.html">open the data calendar ↗</a>.';
});
$('passage-play').addEventListener('click', toggle);
$('passage-dimension').addEventListener('click', () => changeDimension());
$('passage-clock').addEventListener('input', () => seek(Number($('passage-clock').value)));
$('passage-view').addEventListener('click', () => {
  pause(); scene.setOverview(!scene.overview);
  $('passage-view').textContent = scene.overview ? 'Step within' : 'Look across';
  $('passage-view').setAttribute('aria-pressed', String(scene.overview)); requestFrame();
});
const controls = installStudyDialog($('passage-controls'), $('passage-explore'), $('passage-close-controls'));
const inspect = installStudyDialog($('passage-inspect'), $('passage-read'), $('passage-close-inspect'));
$('passage-explore').addEventListener('click', () => { pause(); controls(true); });
$('passage-close-controls').addEventListener('click', () => controls(false));
$('passage-read').addEventListener('click', () => { pause(); inspect(true); });
$('passage-close-inspect').addEventListener('click', () => inspect(false));
$('passage-season').addEventListener('change', () => {
  const date = selected().date; period = $('passage-season').value; nights = periodNights(study.nights, period);
  const index = nights.findIndex(n => n.date === date);
  position = index >= 0 ? index : Math.max(0, nights.findIndex(n => n.density !== null));
  scene?.setSource(nights); scene?.setPosition(position); playing = false; drawScore(); update(); save(); controls(false); requestFrame();
});
async function switchStation(name) {
  if (loading || scene?.transitioning || name === study.site.name || !manifest.stations.some(s => s.name === name)) return;
  playing = false; loading = true; $('passage-station').value = name; update();
  $('passage-error').hidden = true;
  try {
    if (!cache.has(name)) {
      const response = await fetch(urls[`../data/processed/season-nights/${name}.json`]);
      if (!response.ok) throw new Error('Station unavailable');
      cache.set(name, validateStation(await response.json(), name));
    }
    study = cache.get(name); nights = periodNights(study.nights, period);
    scene?.setSource(nights); scene?.setAnchor(manifest.stations.find(s => s.name === name)); scene?.setPosition(position); drawScore(); save(); controls(false);
  } catch {
    $('passage-station').value = study.site.name;
    $('passage-error').textContent = 'This station could not load. The previous season remains; choose the station again to retry.';
    $('passage-error').hidden = false;
  } finally { loading = false; update(); requestFrame(); }
}
$('passage-station').addEventListener('change', () => switchStation($('passage-station').value));
function syncGeography() {
  scene?.setGeographicProfiles(profilesOnDate(manifest.stations, cache, selected().date));
  geographyDate = selected().date;
}
async function changeDimension(wanted = !scene?.spatial, immediate = false) {
  if (!scene || loading || scene.transitioning || wanted === scene.spatial) return;
  playing = false;
  if (wanted && !geographyLoaded) {
    loading = true; update();
    $('passage-error').hidden = false; $('passage-error').textContent = 'Gathering the radar landscape…';
    try {
      await Promise.all(manifest.stations.map(async station => {
        if (cache.has(station.name)) return;
        const response = await fetch(urls[`../data/processed/season-nights/${station.name}.json`]);
        if (!response.ok) throw new Error('Landscape unavailable');
        cache.set(station.name, validateStation(await response.json(), station.name));
      }));
      geographyLoaded = true; syncGeography(); $('passage-error').hidden = true;
    } catch {
      $('passage-error').textContent = 'The landscape could not fully load. Your time view remains; choose Across places again to retry.';
      loading = false; update(); return;
    }
    loading = false;
  }
  scene.setSpatial(wanted, immediate); update(); save(); requestFrame();
}
async function unfoldStation(name) {
  if (!scene?.spatial || scene.transitioning || loading) return;
  await switchStation(name);
  if (study.site.name === name) await changeDimension(false);
}
document.addEventListener('keydown', event => {
  if (loading || scene?.transitioning || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
  if (event.target !== $('passage-clock') && event.target.closest('input,select,textarea,button,a,summary,[contenteditable]')) return;
  const current = nearestNight(position, nights.length), step = event.shiftKey ? 7 : 1;
  let next;
  if (event.key === 'ArrowRight') next = current + step;
  else if (event.key === 'ArrowLeft') next = current - step;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = nights.length - 1;
  else if (event.code === 'Space' || event.key.toLowerCase() === 'p') { event.preventDefault(); if (!event.repeat) toggle(); return; }
  else return;
  event.preventDefault(); seek(next);
});
function animate(time) {
  frame = null;
  if (document.hidden) { lastTime = null; return; }
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .1); lastTime = time;
  if (playing) {
    position = advanceSeason(position, dt, nights.length); scene?.setPosition(position);
    $('passage-clock').value = position;
    if (nearestNight(position, nights.length) !== lastSelected) { update(); save(); }
    if (position >= nights.length - 1) { playing = false; update(); save(); }
  }
  if (!reduced.matches && !document.querySelector('dialog[open]')) ambientTime += dt;
  scene?.render(ambientTime, dt);
  // Reduced motion keeps a held view still; explicit drift remains available.
  if (scene && !document.querySelector('dialog[open]') && (!reduced.matches || playing || scene.transitioning)) requestFrame();
}
function requestFrame() { if (!frame && !document.hidden) frame = requestAnimationFrame(animate); }
scene?.canvas.addEventListener('pointermove', requestFrame);
scene?.canvas.addEventListener('wheel', requestFrame, { passive: true });
reduced.addEventListener('change', () => { scene?.setReducedMotion(reduced.matches); lastTime = null; requestFrame(); });
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close', () => { lastTime = null; requestFrame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { scene?.finishTransition(); pause(); lastTime = null; } else requestFrame(); });
window.addEventListener('pagehide', () => { playing = false; if (frame) cancelAnimationFrame(frame); frame = null; });
window.addEventListener('pageshow', requestFrame);
new ResizeObserver(() => { drawScore(); requestFrame(); }).observe($('passage-score'));
update(); drawScore(); requestFrame();
void (async () => {
  if (params.has('station')) await switchStation(params.get('station'));
  if (params.get('view') === 'space') await changeDimension(true, true);
})();
