import './site-shell.js';
import '@motionstudies/web/tokens.css';
import './season.css';
import manifest from '../data/processed/season-nights-index.json';
import initial from '../data/processed/season-nights/demem.json';
import { periods, periodNights, dateLabel, describeVelocity, nightAtPosition, validateStation } from './season-model.js';
import { drawCalendar, drawTrace, bandColour } from './season-canvas.js';
import { installStudyDialog } from './study-ui.js';

const urls = import.meta.glob('../data/processed/season-nights/*.json', { query: '?url', import: 'default', eager: true });
const $ = id => document.getElementById(id), params = new URL(location.href).searchParams;
const cache = new Map([['demem', initial]]);
let study = initial, period = Object.hasOwn(periods, params.get('period')) ? params.get('period') : 'year';
let visible = periodNights(study.nights, period);
let selected = visible.find(n => n.date === params.get('date')) || visible.find(n => n.date === '2018-09-04') || visible.find(n => n.density !== null) || visible[0];
let playing = false, loading = false, timer;

$('season-app').innerHTML = `
<header><a class="identity" href="/">ZUGUNRUHE<span>MOTION STUDIES 006</span></a></header>
<main>
  <section class="season-heading">
    <div><p class="eyebrow">PASSAGE / 2018</p><h1>A season of nights.</h1><p class="intro">A year unfolds in the air. Each column holds one night.</p></div>
    <div class="station-control"><label for="season-station">The sky above</label><select id="season-station">${manifest.stations.map(s => `<option value="${s.name}" ${s.name === 'demem' ? 'selected' : ''}>${s.label} · ${s.name.slice(0, 2).toUpperCase()}</option>`).join('')}</select><p id="station-location"></p></div>
  </section>
  <div class="season-toolbar"><div class="periods" role="group" aria-label="Season">${Object.entries(periods).map(([id, p]) => `<button data-period="${id}" aria-pressed="${id === period}">${p.label}</button>`).join('')}</div><a id="enter-season" href="season.html">Enter the season ↗</a><span class="window-label">22:00–02:00 UTC · 1–4 km above sea level</span></div>
  <p id="season-error" role="status" hidden></p>
  <section class="calendar-section" aria-label="Calendar of nightly bird density">
    <canvas id="season-calendar" tabindex="0" aria-label="Nightly bird density by altitude. Use left and right arrows to select a night, or the date slider below." aria-describedby="calendar-description"></canvas>
    <div class="calendar-key" id="calendar-description"><span><i class="height-spectrum"></i>Gold below · blue above. Brighter means denser.</span><span><i class="gap-mark"></i>Grey marks: insufficient observations</span></div>
  </section>
  <div class="season-playback"><button id="season-play" aria-label="Play nights" title="Play or pause nights (Space)">▶</button><input id="season-date" type="range" min="0" max="364" step="1" aria-label="Selected night"><span id="range-label"></span></div>
  <div class="season-coverage"><p id="period-coverage"></p><p>January and July are absent from the source calendar.</p></div>
  <section class="night-detail" aria-labelledby="night-title">
    <div class="night-reading"><p class="eyebrow">NIGHT BEGINNING</p><h2 id="night-title"></h2><p id="night-density"></p><p id="night-coverage"></p><p id="night-direction"></p></div>
    <div class="night-trace"><div class="trace-heading"><h3>Within the night</h3><span>Mean density · birds/km³</span></div><canvas id="season-trace" role="img"></canvas><p>Five-minute samples across the same altitude band. Gaps stay open.</p></div>
  </section>
  <details class="profile-details"><summary>Read this night’s altitude profile</summary><p>Mean of the available complete profiles. Values are birds/km³.</p><div id="night-profile"></div></details>
  <footer><span>Processed radar estimates · one year, 37 stations</span><button id="season-about">About the data ↗</button></footer>
</main>
<section id="season-notes" hidden><button id="season-close-notes" aria-label="Close study notes">×</button><h2>A year, with its gaps.</h2>
<p>This first seasonal study samples 2018 at 37 radar locations in France, Germany, Belgium and the Netherlands. There are no Swiss radar observations in this archive. It describes this year’s available observations, not a typical seasonal cycle or a long-term population trend.</p>
<p>Every column is the night beginning on the labelled UTC date: 48 five-minute positions from 22:00 through 01:55 the next morning. The four-hour window remains fixed through the seasons. It is a sample of the night, not its full duration, and can include summer twilight at northern stations. The Spring view covers 12 February–30 June; Autumn covers 1 August–30 November. These are viewing windows, not inferred migration-season boundaries.</p>
<p>A sample is complete only when all fifteen 200 m density bins from 1 to 4 km above sea level have finite, nonnegative values. A calendar column requires at least ${manifest.window.minimumCompleteSamples} of 48 complete samples (at least 80%). Its fifteen heights use the same timestamps. Their arithmetic means set the light. Missing samples are never zero-filled or connected, and nights below the threshold retain grey marks. This threshold checks availability, not biological signal quality.</p>
<p>The archive’s first timestamp is ${manifest.source.firstTimestamp.slice(0, 10)} and its last is ${manifest.source.lastTimestamp.slice(0, 10)}. It contains no January or July timestamps. A night can straddle a month boundary; 31 July can therefore retain observations from 1 August without passing the threshold. Other gaps vary by station. Neither a source gap nor a rejected night establishes an absence of birds.</p>
<p>Altitude determines colour; square-root density determines opacity. All stations and viewing windows share a fixed cap of ${manifest.scale.densityCap.toFixed(2)} birds/km³, the pooled 99th percentile of accepted nightly altitude-bin means. Values above the cap share the brightest light; exact numbers remain in the altitude profile. The soft glow is a display treatment, not a calibrated pixel measurement. No values are interpolated between dates.</p>
<p>The selected night’s large density reading is the mean across the fifteen bins and its complete timestamps. It is a volume density, not total birds, a full-night mean, or migration traffic rate. The five-minute trace shows all complete samples, including on rejected nights. Its labelled linear vertical scale fits the selected night. The optional movement reading is a density-weighted mean of east/north ground-velocity components, requiring at least 39 complete paired profiles. Its bearing points toward travel. Opposing directions can cancel; it is not a distribution of individual speeds or directions.</p>
<p>The source has upstream filtering, bird/insect separation and interpolation, without per-cell measured/interpolated flags. Simulated low-altitude density fields are excluded. Cross-station comparisons use the same display scale but are still subject to differences in radar sampling and calibration. No species or individual tracks can be identified.</p>
<p>The view starts paused. Play steps through four dates per second, including unavailable nights. Arrows select a day, Shift + arrows seven days, Home/End the viewing window’s endpoints. Space plays or pauses. Station and season changes pause playback; the URL retains the selection. Sound is being developed in the other studies.</p>
<p>Source: Raphaël Nussbaumer and contributors, <a href="https://zenodo.org/records/4587338">Vertical profiles time series of bird density and flight speed vector, version 3</a>, CC BY 4.0. Nightly aggregation and visual interpretation by Motion Studies.</p></section>`;

function saveSelection() {
  const url = new URL(location.href);
  url.searchParams.set('station', study.site.name); url.searchParams.set('date', selected.date); url.searchParams.set('period', period);
  history.replaceState(null, '', url);
}

function draw() {
  drawCalendar($('season-calendar'), visible, selected, manifest.scale.densityCap);
  const peak = Math.max(0, ...selected.trace.filter(Number.isFinite));
  const step = peak > 10 ? 10 : peak > 1 ? 1 : .1;
  drawTrace($('season-trace'), selected, Math.max(step, Math.ceil(peak / step) * step));
}

function update() {
  $('enter-season').href = `season.html?station=${study.site.name}&date=${selected.date}&period=${period}`;
  const site = manifest.stations.find(s => s.name === study.site.name), valid = visible.filter(n => n.density !== null).length;
  $('station-location').textContent = `${site.lat.toFixed(2)}° N, ${Math.abs(site.lon).toFixed(2)}° ${site.lon < 0 ? 'W' : 'E'} · ${site.acceptedNights} nights available in 2018`;
  $('season-date').max = visible.length - 1; $('season-date').value = visible.indexOf(selected);
  $('season-date').setAttribute('aria-valuetext', `${dateLabel(selected.date)}, ${selected.completeSamples} of 48 samples available`);
  $('season-play').textContent = playing ? 'Ⅱ' : '▶'; $('season-play').setAttribute('aria-label', playing ? 'Pause nights' : 'Play nights');
  $('season-play').disabled = $('season-date').disabled = $('season-station').disabled = loading;
  for (const button of document.querySelectorAll('[data-period]')) { button.disabled = loading; button.setAttribute('aria-pressed', String(button.dataset.period === period)); }
  $('range-label').textContent = `${dateLabel(visible[0].date, { month: 'short' })} — ${dateLabel(visible.at(-1).date, { month: 'short' })}`;
  $('period-coverage').textContent = `${valid} of ${visible.length} nights shown · shared light scale across stations and seasons`;
  $('night-title').textContent = dateLabel(selected.date);
  $('night-density').innerHTML = selected.meanDensity === null ? '<span class="unavailable">Insufficient observations</span>' : `<strong>${selected.meanDensity.toFixed(2)}</strong> <span>birds/km³<br>mean across 1–4 km ASL</span>`;
  $('night-coverage').textContent = `${selected.completeSamples} / 48 complete samples${selected.density === null ? ' · 39 needed for a calendar column' : ' · four-hour window'}`;
  const v = describeVelocity(selected.velocity);
  $('night-direction').textContent = v ? v.bearing === null ? 'Mean movement cancels · no resultant direction' : `Mean movement toward ${Math.round(v.bearing) % 360}° · ${Math.round(v.speed)} km/h` : 'Mean movement unavailable';
  $('season-trace').setAttribute('aria-label', `${dateLabel(selected.date)}: ${selected.completeSamples} available five-minute density samples, from 22:00 to 02:00 UTC. ${selected.trace.some(Number.isFinite) ? `Values range from ${Math.min(...selected.trace.filter(Number.isFinite)).toFixed(2)} to ${Math.max(...selected.trace.filter(Number.isFinite)).toFixed(2)} birds per cubic kilometre.` : 'No complete profiles available.'}`);
  $('night-profile').innerHTML = `<table><thead><tr><th scope="col">Height above sea level</th><th scope="col">Density · birds/km³</th></tr></thead><tbody>${manifest.altitudeCentresMAsl.map((h, b) => `<tr><th scope="row"><i style="background:rgb(${bandColour(b)})"></i>${((h - 100) / 1000).toFixed(1)}–${((h + 100) / 1000).toFixed(1)} km</th><td>${selected.density === null ? 'Unavailable' : selected.density[b].toFixed(2)}</td></tr>`).reverse().join('')}</tbody></table>`;
  draw();
}

function stop() { playing = false; clearInterval(timer); }
function choose(night) { if (loading) return; stop(); selected = night; update(); saveSelection(); }

$('season-date').addEventListener('input', () => choose(visible[Number($('season-date').value)]));
$('season-play').addEventListener('click', () => {
  if (loading) return;
  if (playing) { stop(); update(); saveSelection(); return; }
  if (selected === visible.at(-1)) selected = visible[0];
  playing = true; update();
  timer = setInterval(() => {
    const next = visible.indexOf(selected) + 1;
    if (next >= visible.length) { stop(); update(); saveSelection(); return; }
    selected = visible[next]; update();
  }, 250);
});

for (const button of document.querySelectorAll('[data-period]')) button.addEventListener('click', () => {
  stop(); period = button.dataset.period; visible = periodNights(study.nights, period);
  selected = visible.find(n => n.date === selected.date) || visible.find(n => n.density !== null) || visible[0];
  update(); saveSelection();
});

async function switchStation(name) {
  if (loading || name === study.site.name || !manifest.stations.some(s => s.name === name)) return;
  stop(); loading = true; $('season-error').hidden = true; $('season-station').value = name;
  $('season-calendar').setAttribute('aria-busy', 'true'); update();
  try {
    if (!cache.has(name)) {
      const response = await fetch(urls[`../data/processed/season-nights/${name}.json`]);
      if (!response.ok) throw new Error('Season unavailable');
      cache.set(name, validateStation(await response.json(), name));
    }
    study = cache.get(name); visible = periodNights(study.nights, period);
    selected = visible.find(n => n.date === selected.date) || visible[0];
    saveSelection();
  } catch {
    $('season-station').value = study.site.name;
    $('season-error').textContent = 'This station could not load. Your previous calendar is still here; choose the station again to retry.';
    $('season-error').hidden = false;
  } finally { loading = false; $('season-calendar').setAttribute('aria-busy', 'false'); update(); }
}
$('season-station').addEventListener('change', () => switchStation($('season-station').value));

const calendar = $('season-calendar');
calendar.addEventListener('pointerdown', event => {
  if (loading || event.button !== 0) return;
  calendar.focus({ preventScroll: true });
  const box = calendar.getBoundingClientRect(); choose(nightAtPosition(event.clientX - box.left, box.width, visible));
});
document.addEventListener('keydown', event => {
  if (loading || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
  if (event.target !== $('season-date') && event.target !== calendar && event.target.closest('input,select,textarea,button,a,summary,[contenteditable]')) return;
  const i = visible.indexOf(selected), step = event.shiftKey ? 7 : 1;
  let next;
  if (event.key === 'ArrowLeft') next = i - step;
  else if (event.key === 'ArrowRight') next = i + step;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = visible.length - 1;
  else if (event.code === 'Space' || event.key.toLowerCase() === 'p') { event.preventDefault(); if (!event.repeat) $('season-play').click(); return; }
  else return;
  event.preventDefault(); choose(visible[Math.max(0, Math.min(visible.length - 1, next))]);
});
const notes = installStudyDialog($('season-notes'), $('season-about'), $('season-close-notes'));
$('season-about').addEventListener('click', () => { stop(); update(); saveSelection(); notes(true); });
$('season-close-notes').addEventListener('click', () => notes(false));
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); update(); saveSelection(); } });
window.addEventListener('pagehide', () => stop());
new ResizeObserver(draw).observe($('season-calendar'));
update();
if (params.has('station')) void switchStation(params.get('station'));
