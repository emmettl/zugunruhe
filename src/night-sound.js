import { nightPresentation, between } from './night-journey.js';

// Authored orchestration follows the same continuous reveals as the image.
// These gains are not measurements of migration activity.
export function nightSound(index) {
  const p = nightPresentation(index), morning = between(index, 102, 126);
  return {
    name: morning > .5 ? 'Morning · receding' : p.threads > .1 ? 'Flow · soft twinkles'
      : p.neighbours > .1 ? 'Islands · passing tones' : 'Cloud · sustained',
    mix: {
      sustained: 1 - .18 * morning,
      passing: p.neighbours * (1 - .65 * morning),
      twinkles: p.threads * (1 - morning),
    },
  };
}
