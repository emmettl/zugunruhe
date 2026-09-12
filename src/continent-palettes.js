// Display RGB stops from the lowest to highest bird-altitude band.
// Auroral names describe artistic colour treatments, not atmospheric emissions.
export const palettes = {
  ember: { label: 'Ember', stops: [[1,.53,.20],[1,.20,.49],[.35,.22,1],[.19,.85,.85]] },
  aquatic: { label: 'Aquatic', stops: [[.035,.28,.52],[.08,.56,.78],[.13,.72,.85],[.32,.48,.90]] },
  oxygen: { label: 'Oxygen', stops: [[.12,.38,.20],[.32,.88,.12],[.16,.72,.40],[.78,.14,.20]] },
  boreal: { label: 'Boreal', stops: [[.06,.38,.26],[.18,.82,.40],[.15,.62,.78],[.56,.22,.86]] },
};

export function paletteGradient(id) {
  const stops=palettes[id].stops.map(rgb=>`rgb(${rgb.map(v=>Math.round(v*255)).join(' ')})`);
  return `linear-gradient(90deg,${stops.join(',')})`;
}
