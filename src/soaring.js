import './site-shell.js';
import './soaring.css';
import { createSoaringFlock, SOARING_STEP } from './soaring-model.js';
import { createSoaringScene } from './soaring-scene.js';
import { soaringStory } from './soaring-story.js';
import { createSoaringSound } from './soaring-score.js';
import { installStudyDialog } from './study-ui.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
$('soaring-app').innerHTML = `
<header><a class="identity" href="/">ZUGUNRUHE<span>STUDIES IN MOTION</span></a></header>
<main id="soaring-study" data-score="off">
  <div id="soaring-world"></div>
  <div class="soaring-heading"><p class="eyebrow">TWENTY WHITE STORKS · A SIMULATION</p><h1>Borrowed sky.</h1><p>Leave the circle. Search for the next climb.</p></div>
  <div class="soaring-caption"><button id="soaring-listen" aria-label="Start soaring soundtrack" aria-pressed="false">Listen</button><button id="soaring-about">About this study ↗</button></div>
  <div class="soaring-bottom">
    <div class="flight-story"><div><p class="eyebrow" id="soaring-bird">WITH BIRD 01</p><h2 id="soaring-stage">In the climb.</h2><p id="soaring-description">A circle becomes a little height.</p></div><div class="flight-measures"><span id="soaring-height"></span><span id="soaring-climb"></span></div></div>
    <div class="soaring-toolbar"><div class="camera-modes" role="group" aria-label="Camera viewpoint"><button data-mode="watch" aria-pressed="true">Watch</button><button data-mode="follow" aria-pressed="false">Follow one</button><button data-mode="air" aria-pressed="false">With the air</button></div><div class="soaring-options"><button id="soaring-next">Another bird</button><button id="soaring-lift" aria-pressed="false">Lift</button><button id="soaring-traces" aria-pressed="false">Traces</button><button id="soaring-play">Pause</button><button id="soaring-restart">Restart</button></div></div>
    <div class="soaring-foot"><span id="soaring-hint">Drag to orbit · scroll to draw closer</span><a href="migration.html">Follow recorded storks ↗</a></div>
    <p id="soaring-status" role="status"></p>
  </div><div id="soaring-error" role="alert" hidden></div>
</main>
<section id="soaring-notes" hidden><button id="soaring-close" aria-label="Close study notes">×</button><h2>A little height, borrowed.</h2>
<p>Twenty imagined white storks circle in rising air, then spend that height gliding towards the next thermal. Each has a different climbing radius, glide efficiency and preferred departure height. The air strengthens, weakens and falls quiet. Birds search independently and can turn towards a visible companion that is gaining height. Departing companions can encourage an earlier departure.</p>
<p>The birds gain height when lift exceeds their sinking speed. Banking costs a little more height. They wait for a turn towards the next thermal before leaving, and can flap if they get too low. Thermals drift, dissipate and reform over an invented landscape. The optional Lift guides fade and shrink with their strength. Birds remember the strongest lift they have encountered to estimate where to circle. A simplified effort reserve recovers in a climb and falls during searching and flapping; a tired bird seeks more height before leaving. Restlessness builds during waiting and weak lift.</p>
<p>This is an authored simulation, not tracked birds, a weather forecast or a validated aerodynamic model. Birds have a broad eastward migration direction, but no map of future thermals. They can miss lift, lose sight of a companion and spend height searching. The opening bird has already found a thermal; subsequent discovery comes from local lift or visible climbing birds. The remembered lift, effort reserve and restlessness are authored behavioural rules, not measured physiology. The short distances, lift, flight rules, social cues and decision thresholds are chosen to make the movement legible. The white-stork form and soaring behaviour distinguish this study from the starling-inspired <a href="flock.html">Flock</a>.</p>
<p><b>Watch</b> lets you orbit the group. <b>Follow one</b> travels beside the bird tinted gold. <b>With the air</b> gives the camera its own momentum and samples the same rising air, with a gentle pull towards your companion and space around nearby birds. The horizon stays level. The camera does not steer the birds.</p>
<p><b>Lift</b> shows schematic spirals marking the rising columns; these are guides, not measured air trajectories. <b>Traces</b> reveal recent flight paths. Height is measured above the imagined reference plane, not the terrain below. The story and measurements always refer to the selected bird, including in Watch.</p>
<p><b>Listen</b> begins a quiet, provisional score in D major pentatonic. Climbing brings ascending phrases closer together; greater height adds an upper harmonic. Departure sounds a high note and opens into longer, wider tones. Searching leaves more silence and thins the upper voices. Noticing a climber and finding lift gradually brings the sound together again; growing readiness slightly draws phrases closer. Pausing holds the flight state while the music continues. Notes and a hidden tab stop sound; Listen starts it again. This is a musical reading of motion, not a claim about a bird’s feelings.</p>
<p>Space pauses flight. Keys 1, 2 and 3 change the view; N changes your companion. Reduced-motion settings start flight paused. Restart returns to the same first climb.</p>
<details><summary>Research and observations</summary><p><a href="https://doi.org/10.1016/j.jtbi.2010.10.038" target="_blank" rel="noreferrer">Van Loon et al. (2011), Simsoar</a> explores individual decisions in soaring migration. <a href="https://pubmed.ncbi.nlm.nih.gov/29798883/" target="_blank" rel="noreferrer">Flack et al. (2018)</a> studies social roles in migrating white storks. These inform the questions here; this study does not reproduce either paper’s model or data.</p><p>For a separate view of measured journeys, <a href="migration.html">follow fifteen recorded white storks</a>. Those migration tracks are not the source of these simulated flights.</p></details></section>`;

let flock, scene, mode = 'watch', playing = !reduced.matches, lift = false, traces = false;
let frame = null, previous = null, accumulator = 0, modal = false, listening = false, audioRequest = 0, lastUI = -Infinity;
const sound = createSoaringSound({ createContext() { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw new Error('Web Audio unavailable'); return new Audio(); } });
function text(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
function update() {
  const study = $('soaring-study'); study.dataset.camera = mode; study.dataset.playing = String(playing);
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  text('soaring-play', playing ? 'Pause' : 'Play'); $('soaring-play').setAttribute('aria-label', playing ? 'Pause soaring' : 'Play soaring');
  for (const [id, value] of [['lift', lift], ['traces', traces]]) $('soaring-' + id).setAttribute('aria-pressed', String(value));
  text('soaring-hint', mode === 'watch' ? 'Drag to orbit · scroll to draw closer' : mode === 'follow' ? 'Alongside one bird · an almost level horizon' : 'Your own momentum · carried by the same air');
  measure();
}
function measure() {
  if (!scene) return;
  const i = scene.selected, k = i * 3, height = flock.position[k + 1], climb = flock.velocity[k + 1];
  const story = soaringStory(flock, i);
  text('soaring-bird', `BIRD ${String(i + 1).padStart(2, '0')} · ${playing ? 'IN FLIGHT' : 'FLIGHT PAUSED'}`);
  text('soaring-stage', story[0]); text('soaring-description', story[1]);
  text('soaring-height', `${Math.round(height)} m high`); text('soaring-climb', `${climb >= 0 ? '+' : '−'}${Math.abs(climb).toFixed(1)} m/s`);
  const study = $('soaring-study'); study.dataset.bird = String(i + 1); study.dataset.time = flock.time.toFixed(2); study.dataset.phase = flock.mode[i];
  study.dataset.cue = flock.cue[i]; study.dataset.guide = String(flock.guide[i] + 1);
  study.dataset.certainty = flock.certainty[i].toFixed(3); study.dataset.reserve = flock.reserve[i].toFixed(3);
  study.dataset.height = height.toFixed(2); study.dataset.departures = String(flock.departures[i]);
  sound.setState({ bird: i, height, climb, mode: flock.mode[i], departures: flock.departures[i], certainty: flock.certainty[i], readiness: flock.readiness[i] });
}
function listeningUI(starting = false) {
  text('soaring-listen', starting ? 'Starting…' : listening ? 'Listening' : 'Listen');
  $('soaring-listen').setAttribute('aria-pressed', String(listening)); $('soaring-listen').setAttribute('aria-busy', String(starting));
  $('soaring-listen').setAttribute('aria-label', listening ? 'Stop soaring soundtrack' : 'Start soaring soundtrack');
  $('soaring-study').dataset.score = starting ? 'starting' : listening ? 'playing' : 'off';
}
function stopSound() { audioRequest++; listening = false; sound.stop(); listeningUI(); }
function error() { playing = false; $('soaring-error').hidden = false; text('soaring-error', 'This study needs WebGL to draw the birds. Try a browser with hardware graphics enabled.'); stopSound(); }
function startScene() {
  scene?.dispose(); $('soaring-world').replaceChildren(); flock = createSoaringFlock();
  try { scene = createSoaringScene($('soaring-world'), flock); scene.setReduced(reduced.matches); scene.setLift(lift); scene.setTraces(traces); mode = 'watch'; $('soaring-error').hidden = true; }
  catch (cause) { scene = null; console.error(cause); error(); }
  previous = null; accumulator = 0; lastUI = -Infinity; update();
}
function setMode(value) { if (!scene) return; mode = value; scene.setMode(value); update(); }
function toggle() { if (!scene) return; playing = !playing; accumulator = 0; update(); }
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode));
$('soaring-play').addEventListener('click', toggle);
$('soaring-next').addEventListener('click', () => { scene?.nextBird(); measure(); });
$('soaring-lift').addEventListener('click', () => { lift = !lift; scene?.setLift(lift); update(); });
$('soaring-traces').addEventListener('click', () => { traces = !traces; scene?.setTraces(traces); update(); });
$('soaring-restart').addEventListener('click', () => { stopSound(); startScene(); requestFrame(); });
$('soaring-listen').addEventListener('click', async () => {
  if (listening) { stopSound(); return; }
  const token = ++audioRequest; listening = true; listeningUI(true); text('soaring-status', '');
  try { const started = await sound.start(); if (token !== audioRequest) return; listening = started; listeningUI(); if (!started) text('soaring-status', 'Sound could not start. Try Listen again.'); }
  catch { if (token !== audioRequest) return; stopSound(); text('soaring-status', 'Sound could not start. Try Listen again.'); }
});
const showNotes = installStudyDialog($('soaring-notes'), $('soaring-about'), $('soaring-close'));
$('soaring-about').addEventListener('click', () => { modal = true; accumulator = 0; stopSound(); showNotes(true); });
$('soaring-close').addEventListener('click', () => showNotes(false));
$('soaring-notes').addEventListener('close', () => { modal = false; previous = null; requestFrame(); });
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || modal || event.target.closest('button,a,input,select,summary')) return;
  if (event.code === 'Space') { event.preventDefault(); toggle(); }
  else if (['1', '2', '3'].includes(event.key)) { event.preventDefault(); setMode(['watch', 'follow', 'air'][Number(event.key) - 1]); }
  else if (event.key.toLowerCase() === 'n') { event.preventDefault(); scene?.nextBird(); measure(); }
});
function requestFrame() { if (frame === null && !document.hidden && !modal && scene) frame = requestAnimationFrame(animate); }
function animate(now) {
  frame = null; if (document.hidden || modal) { previous = null; return; }
  const dt = previous === null ? SOARING_STEP : Math.min(.08, (now - previous) / 1000); previous = now;
  if (playing) { accumulator += dt; while (accumulator >= SOARING_STEP) { flock.step(); scene.advance(SOARING_STEP); accumulator -= SOARING_STEP; } }
  scene.render(dt);
  if (now - lastUI >= 150) { measure(); lastUI = now; }
  requestFrame();
}
document.addEventListener('visibilitychange', () => { previous = null; accumulator = 0; if (document.hidden) { stopSound(); if (frame !== null) cancelAnimationFrame(frame); frame = null; } else requestFrame(); });
reduced.addEventListener('change', () => { scene?.setReduced(reduced.matches); if (reduced.matches) { playing = false; accumulator = 0; } update(); });
$('soaring-world').addEventListener('graphics-lost', () => { error(); update(); if (frame !== null) cancelAnimationFrame(frame); frame = null; });
window.addEventListener('pagehide', () => { stopSound(); if (frame !== null) cancelAnimationFrame(frame); frame = null; previous = null; });
window.addEventListener('pageshow', () => requestFrame());
startScene(); listeningUI(); requestFrame();
