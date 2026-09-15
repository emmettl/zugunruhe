import { densityLight, dateLabel } from './season-model.js';

const stops = [[255, 201, 121], [250, 120, 189], [152, 124, 243], [130, 233, 236]];
export function bandColour(band) {
  const t = band / 14 * 3, i = Math.min(2, Math.floor(t)), f = t - i;
  return stops[i].map((v, c) => Math.round(v + (stops[i + 1][c] - v) * f)).join(',');
}

function setup(canvas) {
  const { width, height } = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.font = '11px system-ui, sans-serif';
  return { ctx, width, height };
}

export function drawCalendar(canvas, nights, selected, cap) {
  const { ctx, width, height } = setup(canvas), left = 54, right = width - 18;
  const top = 30, bottom = height - 52, column = (right - left) / nights.length;
  const bandHeight = (bottom - top) / 15;
  ctx.fillStyle = '#070910'; ctx.fillRect(0, 0, width, height);
  // Missing columns carry a broken grey mark. Zero-density columns retain the
  // coverage mark underneath; they never acquire invented luminous bird density.
  nights.forEach((night, day) => {
    const x = left + day * column;
    if (night.density === null) {
      ctx.fillStyle = '#81859909'; ctx.fillRect(x, top, Math.max(.5, column - .8), bottom - top);
      ctx.fillStyle = '#727a8e66';
      ctx.fillRect(x, bottom + 10, Math.max(.6, column - 1), 1);
      return;
    }
    for (let band = 0; band < 15; band++) {
      const light = densityLight(night.density[band], cap), rgb = bandColour(band);
      if (light === 0) continue;
      const y = bottom - (band + 1) * bandHeight;
      ctx.fillStyle = `rgba(${rgb},${light * .85})`;
      ctx.fillRect(x, y + .4, Math.max(.65, column - .65), bandHeight - .8);
      // A local halo adds softness, without interpolating across calendar days.
      ctx.fillStyle = `rgba(${rgb},${light * .18})`;
      ctx.fillRect(x, y - 2, Math.max(.65, column - .65), bandHeight + 4);
    }
    ctx.fillStyle = '#c9bde5a0'; ctx.fillRect(x, bottom + 8, Math.max(.65, column - 1), 3);
  });
  ctx.textAlign = 'right';
  for (let h = 1; h <= 4; h++) {
    const y = bottom - (h - 1) / 3 * (bottom - top);
    ctx.strokeStyle = '#b4bdd719'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.fillStyle = '#969eb3'; ctx.fillText(`${h} km`, left - 12, y + 4);
  }
  ctx.textAlign = 'left'; ctx.fillStyle = '#949caf'; ctx.fillText('ASL', 13, 14);
  let lastMonth = '';
  nights.forEach((night, day) => {
    const month = night.date.slice(5, 7);
    if (month === lastMonth) return;
    lastMonth = month;
    const x = left + day * column;
    ctx.strokeStyle = '#c3c9e222'; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom + 18); ctx.stroke();
    const showLabel = nights.length <= 250 || width >= 600 || Number(month) % 2 === 1;
    if (showLabel && x < right - 20) {
      ctx.fillStyle = '#9ca5b8'; ctx.fillText(dateLabel(night.date, { month: 'short', day: undefined }), x + 3, bottom + 34);
    }
  });
  const i = nights.findIndex(n => n.date === selected.date), x = left + (i + .5) * column;
  ctx.strokeStyle = '#ede0f4b3'; ctx.beginPath(); ctx.moveTo(x, top - 5); ctx.lineTo(x, bottom + 15); ctx.stroke();
  ctx.fillStyle = '#ede0f4'; ctx.beginPath(); ctx.moveTo(x - 4, top - 10); ctx.lineTo(x + 4, top - 10); ctx.lineTo(x, top - 5); ctx.fill();
  ctx.textAlign = x > width * .75 ? 'right' : 'left';
  ctx.fillText(dateLabel(selected.date, { month: 'short' }), x + (x > width * .75 ? -8 : 8), 17);
}

export function drawTrace(canvas, night, cap) {
  const { ctx, width, height } = setup(canvas), left = 45, right = width - 18, top = 18, bottom = height - 29;
  ctx.strokeStyle = '#c2bdd927'; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
  ctx.textAlign = 'right'; ctx.fillStyle = '#99a3b8'; ctx.fillText(String(Number(cap.toFixed(1))), left - 8, top + 4); ctx.fillText('0', left - 8, bottom + 4);
  const column = (right - left) / 48;
  night.trace.forEach((d, i) => {
    const x = left + i * column;
    if (d === null) { ctx.fillStyle = '#68718e'; ctx.fillRect(x + .5, bottom + 4, Math.max(1, column - 2), 1); return; }
    const bar = Math.min(1, d / cap) * (bottom - top);
    ctx.fillStyle = '#c9b1e0'; ctx.fillRect(x + .5, bottom - Math.max(.7, bar), Math.max(1, column - 1), Math.max(.7, bar));
  });
  ctx.fillStyle = '#99a3b8';
  for (const [label, f] of [['22:00', 0], ['00:00', .5], ['02:00', 1]]) {
    ctx.textAlign = f === 0 ? 'left' : f === 1 ? 'right' : 'center';
    ctx.fillText(label, left + (right - left) * f, height - 7);
  }
}
