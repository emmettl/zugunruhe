// Artistic timbral counterparts to the visual palettes. Cuts only: clarity
// never boosts the approved upper notes. Delay time stays fixed to avoid bends.
export const soundColours = {
  aquatic: { label: 'Aquatic · submerged', cutoff: 1500, treble: -4, halo: .18 },
  ember: { label: 'Ember · warm and veiled', cutoff: 2800, treble: -6, halo: .025 },
  boreal: { label: 'Boreal · softly spacious', cutoff: 6500, treble: -1.5, halo: .085 },
  oxygen: { label: 'Oxygen · clear and close', cutoff: 11000, treble: 0, halo: .015 },
};

export function createSoundColour(context, destination) {
  const filter = context.createBiquadFilter(), shelf = context.createBiquadFilter();
  const dry = context.createGain(), wet = context.createGain();
  const delay = context.createDelay(1), veil = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = Math.min(20000, context.sampleRate * .45); filter.Q.value = .5;
  shelf.type = 'highshelf'; shelf.frequency.value = 1200; shelf.gain.value = 0;
  delay.delayTime.value = .71;
  veil.type = 'lowpass'; veil.frequency.value = 2200; veil.Q.value = .5;
  dry.gain.value = 1; wet.gain.value = 0;
  filter.connect(shelf); shelf.connect(dry); dry.connect(destination);
  shelf.connect(delay); delay.connect(veil); veil.connect(wet); wet.connect(destination);
  let selected;
  function setPalette(id, smooth = true) {
    if (!Object.hasOwn(soundColours, id) || selected === id) return;
    selected = id;
    const colour = soundColours[id], now = context.currentTime;
    for (const [param, target] of [[filter.frequency, Math.min(colour.cutoff, context.sampleRate * .45)],
      [shelf.gain, colour.treble], [dry.gain, 1 - colour.halo], [wet.gain, colour.halo]]) {
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else { const value = param.value; param.cancelScheduledValues(now); param.setValueAtTime(value, now); }
      if (smooth) param.setTargetAtTime(target, now, 1.5);
      else param.setValueAtTime(target, now);
    }
  }
  return { input: filter, setPalette,
    dispose() { for (const node of [filter, shelf, dry, delay, veil, wet]) node.disconnect(); } };
}
