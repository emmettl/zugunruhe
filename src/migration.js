import './site-shell.js';
import './migration.css';
import raw from '../data/processed/migration-storks.json';
import land from '../data/processed/migration-land.json';
import { validateMigration, observationAt, clamp, advanceClock, HOUR, DAY, formatTime, dateLabel, latitudeLabel, longitudeLabel, distanceKm } from './migration-model.js';
import { createMigrationScene } from './migration-scene.js';

const data = validateMigration(raw), $ = id => document.getElementById(id), params = new URL(location.href).searchParams;
let selected = data.tracks.some(t => t.id === params.get('bird')) ? params.get('bird') : params.get('bird') === 'all' ? 'all' : 'linus-b';
let view = params.get('view') === 'time' ? 'time' : 'space';
const parsedTime = Date.parse(params.get('at')) / 1000;
let time = clamp(Number.isFinite(parsedTime) ? parsedTime : Date.parse('2018-09-12T12:00:00Z') / 1000, data.start, data.end);
let playing = false, sparks = true, pinned = null, elapsed = 0, last = null, lastPaint = 0, scene;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

$('migration-app').innerHTML = `
<header><a class="identity" href="./">ZUGUNRUHE<span>AN EXPLORATION OF PASSAGE</span></a>
  <nav class="site-navigation" aria-label="Studies"><a href="./season.html">Season of nights</a><a href="./migration.html" aria-current="page">Journeys</a></nav></header>
<main id="migration-stage" data-view="${view}">
  <canvas id="migration-world" tabindex="0" role="img" aria-label="Recorded white stork journeys. Use the controls below to explore observations." aria-describedby="migration-caption"></canvas>
  <div class="migration-heading"><p class="eyebrow">FIFTEEN WHITE STORKS · JUL–SEP 2018</p><h1>A thread of passage.</h1><p>Small lives, long distances.</p></div>
  <div class="migration-actions"><button id="migration-dimension" aria-pressed="${view === 'time'}">${view === 'space' ? 'Unfold time' : 'Return to the land'}<span aria-hidden="true">↗</span></button>
    <label class="bird-choice"><span class="sr-only">Follow a bird</span><select id="migration-bird"><option value="all">All fifteen birds</option>${data.tracks.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select></label></div>
  <div class="migration-orientation" id="migration-orientation">ACROSS THE LAND</div>
  <section class="migration-observation" aria-label="Selected observation">
    <p class="eyebrow" id="migration-observation-kind">A RECORDED POSITION</p><h2 id="migration-value"></h2>
    <p id="migration-fix-detail"></p><p id="migration-distance"></p>
    <div class="observation-actions"><button id="migration-previous" aria-label="Previous recorded position">←</button><button id="migration-pin">Hold this observation</button><button id="migration-next" aria-label="Next recorded position">→</button></div>
  </section>
  <div class="migration-bottom">
    <div class="migration-clock-heading"><p id="migration-date"></p><p id="migration-clock-time"></p></div>
    <input type="range" id="migration-clock" aria-label="Journey time" min="${data.start}" max="${data.end}" step="1" value="${time}">
    <div class="migration-endpoints"><span>30 JULY</span><span>29 SEPTEMBER 2018</span></div>
    <div class="migration-transport"><button id="migration-play" aria-pressed="false"><span aria-hidden="true">▷</span> Follow passage</button><button id="migration-sparks" aria-pressed="true">Glints on</button><p id="migration-caption">A glint is a recorded position. Tap one to hold it.</p><button id="migration-about">About the journeys</button></div>
  </div>
  <p class="sr-only" id="migration-status" role="status"></p>
</main>
<dialog id="migration-notes" aria-labelledby="migration-notes-title"><button id="migration-close" aria-label="Close notes">×</button><p class="eyebrow">READING THE STUDY</p><h2 id="migration-notes-title">Fifteen lives in passage.</h2>
  <p>These are GPS observations of fifteen white storks, from 30 July to 29 September 2018. Their tracks begin around south-west Germany. In this excerpt, some remain in Europe and others reach Morocco.</p>
  <p><strong>Across the land</strong>, each thread joins recorded locations. <strong>Unfold time</strong> spreads those same observations from left to right by date, while north stays above south. A horizontal stretch means little change in latitude; it may include movement east or west.</p>
  <p>Each glint sits on a retained GPS fix. Light, colour and its gentle shimmer are authored; they do not encode altitude, speed or certainty. The brighter trail covers the preceding three days. The faint threads show the whole available excerpt, including dates ahead of the clock.</p>
  <p>The source has 155,173 fixes. This sketch keeps the first fix in each half-hour, plus track ends and both sides of longer gaps. Lines connect observations no more than two hours apart; they are visual connections, not measured paths between fixes. A bird has no current marker more than two hours after a fix, or after its recording ends. Pauses and recording gaps do not establish behaviour or fate.</p>
  <p>Playback advances six recorded hours per second. “Hold” and the arrow controls inspect exact retained observations. The distance shown is straight-line displacement from that bird’s first fix in this excerpt.</p>
  <p>Data: Fiedler, Flack, Schäfle, Keeves, Quetting, Eid, Schmid & Wikelski (2019), <a href="https://doi.org/10.5441/001/1.ck04mn78" target="_blank" rel="noreferrer">LifeTrack White Stork SW Germany</a>, CC0. Subset distributed with <a href="https://movevis.org/reference/whitestork_data.html" target="_blank" rel="noreferrer">moveVis</a>. Land outlines: Natural Earth, public domain. These tagged birds are a small sample, separate from the radar observations in Season of nights.</p>
  <a class="notes-return" href="./season.html">Return to A season of nights ↗</a>
</dialog>`;

$('migration-bird').value = selected;
const track = () => data.tracks.find(t => t.id === selected);
function current() { const t = track(); return t ? observationAt(t.fixes, time) : null; }
function syncUrl() {
  const url = new URL(location.href); url.searchParams.set('bird', selected); url.searchParams.set('view', view);
  url.searchParams.set('at', new Date(time * 1000).toISOString()); history.replaceState(null, '', url);
}
function update() {
  $('migration-clock').value = time;
  $('migration-clock').setAttribute('aria-valuetext', `${formatTime(time)} UTC`);
  $('migration-date').textContent = dateLabel(time);
  $('migration-clock-time').textContent = `${new Date(time * 1000).toISOString().slice(11, 16)} UTC`;
  $('migration-play').innerHTML = `<span aria-hidden="true">${playing ? 'Ⅱ' : '▷'}</span> ${playing ? 'Pause passage' : time >= data.end ? 'Replay passage' : 'Follow passage'}`;
  $('migration-play').setAttribute('aria-pressed', String(playing));
  const t = track(), obs = pinned ? { fix: pinned.track.fixes[pinned.index], index: pinned.index } : current();
  $('migration-observation-kind').textContent = pinned ? 'HELD IN THE LIGHT' : t ? `${t.name.toUpperCase()} · RECORDED POSITION` : 'SHARING A SEASON';
  if (obs && t) {
    $('migration-value').textContent = latitudeLabel(obs.fix[2]);
    $('migration-fix-detail').textContent = `${longitudeLabel(obs.fix[1])} · ${formatTime(obs.fix[0])} UTC`;
    $('migration-distance').textContent = `${Math.round(distanceKm(t.fixes[0], obs.fix)).toLocaleString('en-GB')} km from the first recorded position`;
  } else {
    $('migration-value').textContent = t ? 'Between recordings.' : 'Fifteen journeys.';
    $('migration-fix-detail').textContent = t ? (time < t.fixes[0][0] ? 'This recording has not begun.' : time > t.fixes.at(-1)[0] ? 'This recording has ended.' : 'No position within the preceding two hours.') : 'Choose a bird to find a single thread.';
    $('migration-distance').textContent = t ? 'The gap stays open.' : 'Europe to north-west Africa, over two months.';
  }
  $('migration-value').classList.toggle('is-message', !obs);
  $('migration-pin').disabled = !obs;
  $('migration-pin').textContent = pinned ? 'Release observation' : 'Hold this observation';
  $('migration-previous').disabled = !t || time <= t.fixes[0][0];
  $('migration-next').disabled = !t || time >= t.fixes.at(-1)[0];
  $('migration-orientation').textContent = view === 'space' ? 'ACROSS THE LAND' : 'THROUGH TIME · NORTH ABOVE SOUTH';
  $('migration-stage').dataset.view = view;
  $('migration-dimension').setAttribute('aria-pressed', String(view === 'time'));
  $('migration-dimension').innerHTML = `${view === 'space' ? 'Unfold time' : 'Return to the land'}<span aria-hidden="true">${view === 'space' ? '↗' : '↙'}</span>`;
}
function pause() { playing = false; }
function pick(id, index) {
  pause(); selected = id; const t = track(); time = t.fixes[index][0]; pinned = { track: t, index };
  $('migration-bird').value = id; scene?.setSelected(id); update(); syncUrl();
  $('migration-status').textContent = `Held ${t.name}, ${formatTime(time)} UTC, ${latitudeLabel(t.fixes[index][2])}.`;
}
function step(direction) {
  const t = track(); if (!t) return;
  let index;
  if (direction > 0) index = t.fixes.findIndex(f => f[0] > time);
  else { index = t.fixes.findLastIndex(f => f[0] < time); }
  if (index >= 0) pick(t.id, index);
}
$('migration-previous').addEventListener('click', () => step(-1));
$('migration-next').addEventListener('click', () => step(1));
$('migration-pin').addEventListener('click', () => {
  if (pinned) { pinned = null; update(); return; }
  const obs = current(); if (obs) pick(selected, obs.index);
});
$('migration-dimension').addEventListener('click', () => {
  view = view === 'space' ? 'time' : 'space'; scene?.setView(view, elapsed); update(); syncUrl();
});
$('migration-bird').addEventListener('change', event => { selected = event.target.value; pinned = null; scene?.setSelected(selected); update(); syncUrl(); });
$('migration-clock').addEventListener('input', event => { pause(); pinned = null; time = Number(event.target.value); update(); syncUrl(); });
$('migration-play').addEventListener('click', () => {
  pinned = null; if (time >= data.end) time = data.start; playing = !playing; update(); syncUrl();
});
$('migration-sparks').addEventListener('click', () => {
  sparks = !sparks; $('migration-sparks').textContent = `Glints ${sparks ? 'on' : 'off'}`; $('migration-sparks').setAttribute('aria-pressed', String(sparks));
});
$('migration-world').addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
  if (event.key === ' ') { event.preventDefault(); $('migration-play').click(); }
});
const notes = $('migration-notes');
$('migration-about').addEventListener('click', () => { pause(); update(); notes.showModal(); $('migration-close').focus(); });
$('migration-close').addEventListener('click', () => notes.close());
notes.addEventListener('close', () => $('migration-about').focus());
document.addEventListener('visibilitychange', () => { last = null; if (document.hidden) { pause(); scene?.finishTransition(); update(); syncUrl(); } });
reduced.addEventListener('change', () => { pause(); update(); });

try {
  scene = createMigrationScene($('migration-world'), data, land, pick);
  scene.setSelected(selected); scene.setView(view, elapsed); scene.finishTransition();
} catch (error) {
  $('migration-caption').textContent = 'The drawing is unavailable. The time and observation controls still let you read the journeys.';
  $('migration-dimension').disabled = true; $('migration-sparks').disabled = true;
}
update();
function animate(now) {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  const dt = last === null ? 0 : Math.min((now - last) / 1000, .15); last = now; elapsed += dt;
  if (playing) {
    time = advanceClock(time, dt, 6 * HOUR, data.end);
    if (time >= data.end) { pause(); syncUrl(); }
    update();
  }
  if (now - lastPaint > 32) {
    scene?.draw(time, elapsed, pinned, sparks); lastPaint = now;
    $('migration-stage').dataset.transitioning = String(scene?.transitioning ?? false);
  }
}
requestAnimationFrame(animate);
