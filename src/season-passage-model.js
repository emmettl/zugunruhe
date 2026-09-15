import { densityLight } from './season-model.js';

export const NIGHT_SPACING = 2.4;
export const DRIFT_DAYS_PER_SECOND = .42;

// A shared flat geographic frame: 20 km per scene unit, east/right, north/back.
export function stationPoint({ lat, lon }) {
  return [(lon - 5.5) * 111.195 * Math.cos(49 * Math.PI / 180) / 20, 0, -(lat - 49) * 111.195 / 20];
}

export function profilesOnDate(stations, studies, date) {
  return stations.map(station => {
    const study = studies.get(station.name);
    const night = study?.nights.find(n => n.date === date);
    if (!night) throw new Error(`Missing calendar for ${station.name}`);
    return night;
  });
}

export function transitionEase(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (10 + t * (-15 + 6 * t));
}

export function buildNightTexture(nights, cap) {
  return new Float32Array(nights.flatMap(n => n.density === null ? Array(15).fill(-1) : n.density.map(d => densityLight(d, cap))));
}

export function advanceSeason(position, seconds, count) {
  return Math.min(Math.max(0, count - 1), position + Math.max(0, Math.min(seconds, .1)) * DRIFT_DAYS_PER_SECOND);
}

export function nearestNight(position, count) {
  return Math.max(0, Math.min(count - 1, Math.round(position)));
}

export function visibleNightIndices(position, count) {
  const start = Math.max(0, Math.floor(position) - 14), end = Math.min(count, start + 64);
  return Array.from({ length: end - start }, (_, i) => start + i);
}
