import './site-shell.js';
import '@motionstudies/web/tokens.css';
import './flock.css';
import { createFlock, STEP } from './flock-model.js';
import { createFlockScene } from './flock-scene.js';
import { installStudyDialog } from './study-ui.js';
import { createFlockSound } from './flock-sound.js';
import { createStartles } from './flock-startle.js';
import { measureAgitation } from './flock-agitation.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
$('flock-app').innerHTML = `
<header><a class="identity" href="/">ZUGUNRUHE<span>MOTION STUDIES 006</span></a></header>
<main id="flock-study" data-camera="watch">
  <div id="flock-world"></div>
  <div class="flock-heading"><p class="eyebrow">A STUDY IN COLLECTIVE MOTION</p><h1>Of a feather.</h1><p>Each bird finds its way through the others.</p></div>
  <div class="flock-caption"><span class="status-dot"></span><span>420 birds · simulated</span><button id="flock-listen" aria-label="Start responsive soundtrack" aria-pressed="false">Listen</button><button id="flock-sound" aria-label="Mute click notes" aria-pressed="true">Notes on</button><button id="flock-about" aria-label="About the flock">About this study ↗</button></div>
  <div class="flock-bottom">
    <div class="camera-story"><p class="eyebrow" id="camera-number">01 / AT A DISTANCE</p><h2 id="camera-title">Watch the flock.</h2><p id="camera-description">A shape made of individual decisions.</p></div>
    <div class="flock-toolbar">
      <div class="camera-modes" role="group" aria-label="Camera viewpoint"><button data-mode="watch" aria-pressed="true">Watch</button><button data-mode="follow" aria-pressed="false">Follow one</button><button data-mode="within" aria-pressed="false">Fly among</button></div>
      <div class="flock-options"><button id="flock-next" hidden>Another bird</button><button id="flock-trails" aria-pressed="false">Traces</button><button id="flock-disturb" aria-pressed="false">Disturb</button><button id="flock-play" aria-label="Pause flock">Ⅱ</button></div>
    </div>
    <div class="flock-foot"><span id="flock-hint">Drag to orbit · scroll to draw closer</span><span id="flock-state" role="status">Seven neighbours. One shared sky.</span></div>
  </div>
  <div id="flock-error" role="alert" hidden></div>
</main>
<section id="flock-notes" hidden><button id="flock-close" aria-label="Close study notes">×</button><h2>Finding a way together.</h2>
  <p>This is a simulation of 420 individual birds, inspired by research on starling flocks. The setting and movements are imagined. They are not observed migration tracks.</p>
  <p>Each bird aligns with and moves towards its seven nearest neighbours, while giving its closest neighbour space. Turns build and relax gradually. Speed varies slightly between individuals; wings alternate between flapping and gliding. A broad, soft boundary and a shared circling tendency keep the birds near an imaginary roost.</p>
  <p><b>Watch</b> lets you orbit the flock. <b>Follow one</b> accompanies a bird marked in warm gold. <b>Fly among</b> brings you into the flock, looking along that bird’s direction of travel. Both travelling views ease into turns and keep the horizon almost level. Another bird changes your companion.</p>
  <p><b>Traces</b> reveal the recent paths of eighteen birds. With <b>Disturb</b> enabled, move the pointer over the sky, or touch and drag. The small gold ring places a local disturbance at the flock’s depth; birds close to it turn away. It is an exploratory interaction, not a model of a particular predator.</p>
  <p><b>Click or tap the sky</b> to play a soft note and startle nearby birds. A gold ripple marks the source at the flock’s depth. Dragging the camera is silent. The provisional tones share Confluence’s D-major pentatonic vocabulary; the final flock soundtrack is still to come. Notes on/off controls the sound while leaving the ripple available.</p>
  <p><b>Listen</b> starts a provisional responsive sound sketch: a quiet foundation with passing tones. When birds disagree with their neighbours’ direction or steer unevenly, notes draw closer together, brighten and move a little more across the stereo field. As the flock settles, the music relaxes slowly. Its harmony stays within the same pitch family.</p>
  <p>The response comes from the birds’ movement, including their spontaneous changes. It is an artistic measure of agitation, not a claim about their emotions. The background music does not startle birds; only your clicks do. Pausing flight holds the musical state while the music continues. Listen stops the sketch; Notes on/off controls click notes separately.</p>
  <p>Space pauses flight. Keys 1, 2 and 3 change the viewpoint; N sounds a note at the centre of the view. Reduced-motion settings start the flock paused. While paused, notes can sound and the camera can be explored, but birds stay still; no startle is saved for later.</p>
  <details><summary>Research behind the rules</summary><p><a href="https://pubmed.ncbi.nlm.nih.gov/18227508/" target="_blank" rel="noreferrer">Ballerini et al. (2008)</a>: topological neighbourhoods. <a href="https://doi.org/10.1371/journal.pone.0126913" target="_blank" rel="noreferrer">Hemelrijk & Hildenbrandt (2015)</a>: distinct neighbourhoods for avoidance and social movement. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/" target="_blank" rel="noreferrer">Attanasi et al. (2014)</a>: propagation of turns. <a href="https://arxiv.org/html/2404.17804v1" target="_blank" rel="noreferrer">Flock2 (2024)</a>: orientation and flight mechanics.</p><p>These papers inform the experiment. This implementation uses simplified steering and bank angles; it does not implement the inertial spin model or the full Flock2 aerodynamic model, and has not been fitted to measured trajectories.</p></details>
</section>`;

const flock = createFlock();
// Settle the initial scatter before showing it.
for (let i = 0; i < 120; i++) flock.step();
let scene, mode = 'watch', playing = !reduced.matches, disturbed = false, traces = false, frame = null, previous = null, accumulator = 0, modal = false;
const startles = createStartles();
const sound = createFlockSound({ createContext() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('Web Audio unavailable');
  return new Audio({ latencyHint: 'interactive' });
} });
let lastStrike = -Infinity, strikes = 0, measuredAt = -Infinity, listening = false, audioRequest = 0;
const views = {
  watch: ['01 / AT A DISTANCE', 'Watch the flock.', 'A shape made of individual decisions.', 'Drag to orbit · scroll to draw closer'],
  follow: ['02 / WITH ONE BIRD', 'A life within the many.', 'Keep company with the bird in gold.', 'Another bird changes your companion'],
  within: ['03 / IN THE CURRENT', 'Become part of the flow.', 'Let the flock carry your point of view.', 'An almost level horizon · a shared direction'],
};
function update() {
  $('flock-study').dataset.camera = mode;
  $('flock-study').dataset.playing = String(playing);
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  const copy = views[mode];
  ['camera-number', 'camera-title', 'camera-description'].forEach((id, i) => { $(id).textContent = copy[i]; });
  $('flock-hint').textContent = disturbed ? 'Move to disturb · click or tap for a note' : mode === 'watch' ? 'Drag to orbit · click or tap for a note' : 'Click or tap for a note · N on keyboard';
  $('flock-next').hidden = mode === 'watch';
  $('flock-play').textContent = playing ? 'Ⅱ' : '▷'; $('flock-play').setAttribute('aria-label', playing ? 'Pause flock' : 'Play flock');
  $('flock-disturb').setAttribute('aria-pressed', String(disturbed)); $('flock-trails').setAttribute('aria-pressed', String(traces));
  $('flock-state').textContent = !playing ? 'Flight paused' : mode === 'follow' ? `Alongside bird ${String(scene.selected + 1).padStart(3, '0')}` : 'Seven neighbours. One shared sky.';
  $('flock-world').classList.toggle('disturbing', disturbed);
}
function setMode(next) { if (!scene) return; mode = next; scene.setMode(next); update(); }
function toggle() { if (!scene) return; playing = !playing; accumulator = 0; if (!playing) startles.clear(); update(); }
function updateListening(starting = false) {
  $('flock-listen').textContent = starting ? 'Starting…' : listening ? 'Listening' : 'Listen';
  $('flock-listen').setAttribute('aria-pressed', String(listening));
  $('flock-listen').setAttribute('aria-busy', String(starting));
  $('flock-listen').setAttribute('aria-label', listening ? 'Stop responsive soundtrack' : 'Start responsive soundtrack');
  $('flock-study').dataset.score = starting ? 'starting' : listening ? 'playing' : 'off';
}
function stopListening() { audioRequest++; listening = false; sound.pauseScore(); updateListening(); }
function strike(x, y) {
  if (!scene || modal || document.hidden || performance.now() - lastStrike < 300) return;
  const point = scene.strike(x, y); if (!point) return;
  lastStrike = performance.now();
  if (playing) startles.add(point, flock.time);
  $('flock-study').dataset.strikes = String(++strikes);
  $('flock-state').textContent = playing ? 'A ripple through the flock.' : 'A note · flight stays paused.';
  const rect = scene.canvas.getBoundingClientRect();
  void sound.strike(((x - rect.left) / rect.width * 2 - 1) * .55).then(note => {
    if (note !== null) $('flock-study').dataset.note = String(note);
  }).catch(() => { $('flock-state').textContent = 'Sound could not start. Click again to retry.'; });
}
try {
  scene = createFlockScene($('flock-world'), flock); scene.setReduced(reduced.matches);
} catch (error) {
  $('flock-error').hidden = false; $('flock-error').textContent = 'This study needs WebGL to draw the birds. Try a browser with hardware graphics enabled.';
  console.error(error); playing = false;
}
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode));
$('flock-play').addEventListener('click', toggle);
$('flock-next').addEventListener('click', () => { scene?.nextBird(); update(); });
$('flock-trails').addEventListener('click', () => { traces = !traces; scene?.setTrails(traces); update(); });
$('flock-disturb').addEventListener('click', () => { disturbed = !disturbed; scene?.setPointer(null); update(); });
$('flock-listen').addEventListener('click', async () => {
  if (listening) { stopListening(); return; }
  const request = ++audioRequest; listening = true; updateListening(true);
  try {
    const started = await sound.playScore();
    if (request !== audioRequest) return;
    listening = started; updateListening();
    if (!started) $('flock-state').textContent = 'Sound could not start. Try Listen again.';
  } catch {
    if (request !== audioRequest) return;
    stopListening(); $('flock-state').textContent = 'Sound could not start. Try Listen again.';
  }
});
$('flock-sound').addEventListener('click', () => {
  sound.setEnabled(!sound.enabled);
  $('flock-sound').textContent = sound.enabled ? 'Notes on' : 'Notes off';
  $('flock-sound').setAttribute('aria-pressed', String(sound.enabled));
  $('flock-sound').setAttribute('aria-label', sound.enabled ? 'Mute click notes' : 'Unmute click notes');
});
const showNotes = installStudyDialog($('flock-notes'), $('flock-about'), $('flock-close'));
$('flock-about').addEventListener('click', () => { modal = true; startles.clear(); sound.silence(); stopListening(); scene?.setPointer(null); showNotes(true); });
$('flock-close').addEventListener('click', () => showNotes(false));
$('flock-notes').addEventListener('close', () => { modal = false; previous = null; requestFrame(); });
if (scene) {
  let gesture = null;
  // Record the whole gesture, not the synthetic click after OrbitControls drags.
  scene.canvas.addEventListener('pointerdown', event => {
    gesture = event.isPrimary && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), moved: false } : null;
  }, { capture: true });
  scene.canvas.addEventListener('pointermove', event => {
    if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 7) gesture.moved = true;
  }, { capture: true });
  scene.canvas.addEventListener('pointerup', event => {
    const down = gesture; gesture = null;
    const rect = scene.canvas.getBoundingClientRect();
    if (down && down.id === event.pointerId && !down.moved && performance.now() - down.at < 650
      && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) strike(event.clientX, event.clientY);
  }, { capture: true });
  for (const type of ['pointercancel', 'lostpointercapture']) scene.canvas.addEventListener(type, () => { gesture = null; });
  // Capture disturbance gestures before OrbitControls receives them.
  for (const type of ['pointerdown', 'pointermove']) scene.canvas.addEventListener(type, event => {
    if (!disturbed) return;
    if (event.pointerType !== 'mouse' && type === 'pointermove' && !event.buttons) return;
    event.stopImmediatePropagation();
    if (type === 'pointerdown') { scene.canvas.focus({ preventScroll: true }); scene.canvas.setPointerCapture(event.pointerId); }
    scene.setPointer(event.clientX, event.clientY);
  }, { capture: true });
  for (const type of ['pointerleave', 'pointercancel']) scene.canvas.addEventListener(type, () => scene.setPointer(null));
  scene.canvas.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') scene.setPointer(null); });
}
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || modal || event.target.closest('button,a,input,select,summary')) return;
  if (event.code === 'Space') { event.preventDefault(); toggle(); }
  else if (['1', '2', '3'].includes(event.key)) { event.preventDefault(); setMode(['watch', 'follow', 'within'][Number(event.key) - 1]); }
  else if (event.key.toLowerCase() === 'n' && scene) { event.preventDefault(); const rect = scene.canvas.getBoundingClientRect(); strike(rect.left + rect.width / 2, rect.top + rect.height / 2); }
});
function requestFrame() { if (!frame && !document.hidden && scene && !modal) frame = requestAnimationFrame(animate); }
function animate(now) {
  frame = null;
  if (document.hidden || modal) { previous = null; return; }
  const dt = previous === null ? STEP : Math.min((now - previous) / 1000, .08); previous = now;
  if (playing) {
    accumulator += dt;
    const threat = disturbed ? scene.threat() : null;
    while (accumulator >= STEP) { flock.step(STEP, threat, startles.sample(flock.time)); accumulator -= STEP; }
  }
  if (flock.time - measuredAt >= .1) {
    const agitation = measureAgitation(flock); measuredAt = flock.time;
    sound.setAgitation(agitation); $('flock-study').dataset.agitation = agitation.toFixed(3);
  }
  $('flock-study').dataset.musicalActivity = sound.scoreActivity.toFixed(3);
  scene.render(dt); requestFrame();
}
$('flock-world').addEventListener('graphics-lost', () => {
  playing = false; if (frame) cancelAnimationFrame(frame); frame = null; scene = null;
  sound.silence(); stopListening(); startles.clear();
  $('flock-error').hidden = false; $('flock-error').textContent = 'Graphics were interrupted. Reload the page to return to the flock.';
  for (const button of document.querySelectorAll('.flock-toolbar button')) button.disabled = true;
  update();
});
reduced.addEventListener('change', () => { scene?.setReduced(reduced.matches); if (reduced.matches) { playing = false; startles.clear(); } update(); });
document.addEventListener('visibilitychange', () => { previous = null; accumulator = 0; scene?.setPointer(null); if (document.hidden) { sound.silence(); stopListening(); startles.clear(); } requestFrame(); });
window.addEventListener('pagehide', event => { if (frame) cancelAnimationFrame(frame); frame = null; previous = null; startles.clear(); stopListening(); if (event.persisted) sound.silence(); else sound.dispose(); });
window.addEventListener('pageshow', requestFrame);
if (!scene) for (const button of document.querySelectorAll('.flock-toolbar button')) button.disabled = true;
update(); updateListening(); requestFrame();
