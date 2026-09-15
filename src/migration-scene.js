import { clamp, connected, observationAt, DAY, HOUR, ease, formatTime } from './migration-model.js';

const colours = ['#b1c5c3', '#d5bbaa', '#b6bddb', '#aac4b3', '#c9b0c7', '#e8c799', '#9dc8c6', '#e1b8aa', '#b6c7a4', '#c4bae0', '#9fb8d2', '#d0c5a6', '#bca6bd', '#95bdb0', '#b6bbc8'];
const mix = (a, b, t) => a + (b - a) * t;

export function createMigrationScene(canvas, data, land, onPick) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  let width = 0, height = 0, mixValue = 0, target = 0, transitionStart = 0, transitionFrom = 0;
  let selected = 'linus-b', cache, hitPoints = [], needsPaint = true;
  const tracks = data.tracks.map((track, index) => ({ ...track, colour: colours[index % colours.length] }));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = () => width < 700;
  function frame() {
    return { top: mobile() ? 209 : 84, bottom: height - (mobile() ? 307 : 170), left: mobile() ? 38 : 90, right: width - (mobile() ? 25 : 75) };
  }
  function mapPoint(lon, lat) {
    const f = frame(), scale = Math.min((f.bottom - f.top) / 23, (width - 70) / 23);
    return [(mobile() ? width * .51 : width * .58) + (lon + .8) * Math.cos(41 * Math.PI / 180) * scale,
      (f.top + f.bottom) / 2 + (40.5 - lat) * scale];
  }
  function timePoint(fix) {
    const f = frame();
    return [mix(f.left, f.right, (fix[0] - data.start) / (data.end - data.start)), mix(mobile() ? f.top : 154, f.bottom, (52 - fix[2]) / 23)];
  }
  function point(fix) {
    const m = mapPoint(fix[1], fix[2]), t = timePoint(fix);
    return [mix(m[0], t[0], mixValue), mix(m[1], t[1], mixValue)];
  }
  function buildCache() {
    cache = tracks.map(track => ({ map: track.fixes.map(fix => mapPoint(fix[1], fix[2])), time: track.fixes.map(timePoint) }));
  }
  function position(trackIndex, index) {
    const c = cache[trackIndex];
    return [mix(c.map[index][0], c.time[index][0], mixValue), mix(c.map[index][1], c.time[index][1], mixValue)];
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); buildCache(); needsPaint = true;
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();

  function geography() {
    const alpha = 1 - mixValue;
    if (alpha < .005) return;
    ctx.save(); ctx.globalAlpha = alpha;
    // Regional context only. The observation positions use the same projection.
    ctx.fillStyle = '#0e1820'; ctx.strokeStyle = '#7d979d26'; ctx.lineWidth = .65;
    for (const country of land) {
      ctx.beginPath();
      for (const ring of country.rings) ring.forEach(([lon, lat], i) => { const [x, y] = mapPoint(lon, lat); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.fill(); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.font = `${mobile() ? 8 : 9}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#91a3a36b';
    for (const [name, lon, lat] of [['FRANCE', 2.3, 46.9], ['SPAIN', -3.3, 39.6], ['MOROCCO', -5.1, 31.9], ['ALGERIA', 3, 32.8], ['GERMANY', 10.4, 51.1]]) {
      const [x, y] = mapPoint(lon, lat); ctx.fillText(name, x, y);
    }
    const [gx, gy] = mapPoint(-5.6, 35.96);
    ctx.font = 'italic 10px Georgia, serif'; ctx.fillStyle = '#b7b4a875'; ctx.fillText('Gibraltar', gx + 39, gy + 10);
    ctx.restore();
  }
  function chronology(time) {
    if (mixValue < .005) return;
    const f = frame(); if (!mobile()) f.top = 154; ctx.save(); ctx.globalAlpha = mixValue;
    ctx.font = '9px Inter, system-ui, sans-serif'; ctx.lineWidth = .6;
    for (const lat of [50, 45, 40, 35, 30]) {
      const y = mix(f.top, f.bottom, (52 - lat) / 23);
      ctx.strokeStyle = '#90a1b019'; ctx.beginPath(); ctx.moveTo(f.left, y); ctx.lineTo(f.right, y); ctx.stroke();
      ctx.fillStyle = '#9baab47a'; ctx.textAlign = 'right'; ctx.fillText(`${lat}° N`, f.left - 10, y + 3);
    }
    for (const day of ['2018-08-01', '2018-08-15', '2018-09-01', '2018-09-15']) {
      const t = Date.parse(day) / 1000, x = mix(f.left, f.right, (t - data.start) / (data.end - data.start));
      ctx.textAlign = 'center'; ctx.fillStyle = '#aeb3ba8c'; ctx.fillText(formatTime(t).split(',')[0], x, f.bottom + 23);
    }
    const x = mix(f.left, f.right, (time - data.start) / (data.end - data.start));
    ctx.strokeStyle = '#ecd1a34a'; ctx.beginPath(); ctx.moveTo(x, f.top); ctx.lineTo(x, f.bottom); ctx.stroke();
    ctx.restore();
  }
  function strokeTrack(track, ti, time, bright) {
    const active = selected === 'all' || selected === track.id;
    ctx.strokeStyle = track.colour;
    ctx.globalAlpha = bright ? (active ? .76 : .18) : (active ? .3 : .085);
    ctx.lineWidth = bright && active ? 1.05 : .65;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < track.fixes.length; i++) {
      const fix = track.fixes[i];
      const eligible = !bright || (fix[0] <= time && fix[0] >= time - 3 * DAY);
      if (!eligible) { pen = false; continue; }
      const [x, y] = position(ti, i);
      if (!pen || !i || !connected(track.fixes[i - 1], fix, data.maxConnectionSeconds)) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      pen = true;
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  function glint(x, y, colour, strength, large, quiet) {
    const radius = large ? 23 : 12;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
    halo.addColorStop(0, colour + '60'); halo.addColorStop(.2, colour + '1c'); halo.addColorStop(1, colour + '00');
    ctx.globalAlpha = strength; ctx.fillStyle = halo; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y, large ? 1.8 : 1.05, 0, Math.PI * 2); ctx.fill();
    if (large && !quiet) {
      ctx.strokeStyle = colour; ctx.globalAlpha = strength * .5; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function draw(time, seconds, pinned = null, sparks = true) {
    const transitioning = Math.abs(mixValue - target) > .00001;
    if (transitioning) {
      const progress = reduced.matches ? 1 : clamp((seconds - transitionStart) / 2.8, 0, 1);
      mixValue = mix(transitionFrom, target, ease(progress)); needsPaint = true;
    }
    // At rest, reduced motion has no cosmetic animation.
    const key = `${time}|${selected}|${pinned?.track.id}:${pinned?.index}|${sparks}`;
    if (reduced.matches && !needsPaint && canvas.dataset.key === key) return false;
    canvas.dataset.key = key; needsPaint = false;
    ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * .57, height * .43, 0, width * .57, height * .43, width * .6);
    glow.addColorStop(0, '#15252a55'); glow.addColorStop(.65, '#0c151c20'); glow.addColorStop(1, '#060b1200');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    geography();
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, '#060b12'); shade.addColorStop(.22, '#060b1200');
    shade.addColorStop(.68, '#060b1200'); shade.addColorStop(.9, '#060b12');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.beginPath(); ctx.rect(0, mobile() ? 200 : 75, width, height - (mobile() ? 420 : 205)); ctx.clip();
    chronology(time);
    tracks.forEach((track, ti) => strokeTrack(track, ti, time, false));
    tracks.forEach((track, ti) => strokeTrack(track, ti, time, true));
    hitPoints = [];
    tracks.forEach((track, ti) => {
      const active = selected === 'all' || selected === track.id;
      const current = observationAt(track.fixes, time);
      // Sparse older fixes create a granular trail; all positions are observations.
      if (sparks && active) {
        const startIndex = Math.max(0, (current?.index ?? 0) - 40);
        for (let i = startIndex; current && i < current.index; i += 3) {
          const fix = track.fixes[i], age = time - fix[0];
          if (age > 12 * HOUR) continue;
          const [x, y] = position(ti, i);
          const pulse = reduced.matches ? .55 : .4 + .25 * Math.sin(seconds * .8 + i * 1.73 + ti);
          glint(x, y, track.colour, pulse * (1 - age / (12 * HOUR)) * .65, false, true);
          hitPoints.push({ x, y, track, index: i });
        }
      }
      if (current) {
        const [x, y] = position(ti, current.index);
        const strength = active ? (reduced.matches || !sparks ? .8 : .72 + .24 * Math.sin(seconds * 1.15 + ti * 1.3)) : .3;
        glint(x, y, track.colour, strength, active && sparks, !sparks || reduced.matches);
        hitPoints.push({ x, y, track, index: current.index });
        if (track.id === selected && !pinned) {
          ctx.fillStyle = '#e8d8bdd9'; ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
          const labelX = Math.min(width - 110, x + 14); ctx.fillText(track.name, labelX, y - 9);
          ctx.fillStyle = '#b5beb690'; ctx.font = '9px Inter, system-ui, sans-serif'; ctx.fillText(`${current.fix[2].toFixed(4)}° N`, labelX, y + 6);
        }
      }
    });
    if (pinned) {
      const [x, y] = point(pinned.track.fixes[pinned.index]);
      ctx.strokeStyle = '#f3dfb5'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.stroke();
      glint(x, y, '#f3dfb5', .95, true, reduced.matches);
    }
    ctx.restore();
    return transitioning;
  }
  function click(event) {
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    let best = null, distance = 22;
    for (const p of hitPoints) { const d = Math.hypot(p.x - x, p.y - y); if (d < distance) { best = p; distance = d; } }
    if (best) onPick(best.track.id, best.index);
  }
  canvas.addEventListener('click', click);
  reduced.addEventListener('change', () => { mixValue = target; needsPaint = true; });
  return {
    draw,
    setSelected(id) { selected = id; needsPaint = true; },
    setView(view, seconds) { transitionFrom = mixValue; target = view === 'time' ? 1 : 0; transitionStart = seconds; if (reduced.matches) mixValue = target; needsPaint = true; },
    get transitioning() { return Math.abs(mixValue - target) > .00001; },
    finishTransition() { mixValue = target; needsPaint = true; },
    destroy() { observer.disconnect(); canvas.removeEventListener('click', click); },
  };
}
