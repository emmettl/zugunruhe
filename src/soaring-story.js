/** Captions describe the selected bird's decisions, never an invented global plot. */
export function soaringStory(flock, i) {
  if (flock.mode[i] === 'climbing') {
    if (flock.stateAge[i] > 15 && flock.weakTime[i] > 2 && flock.certainty[i] < .55)
      return ['The lift is fading.', 'The circle is giving less height back.'];
    if (flock.cue[i] === 'discovery') return ['Lift, found.', 'A new climb for others to notice.'];
    if (flock.cue[i] === 'companions') return ['Together in the climb.', 'Rising air, found through another bird.'];
    return ['In the climb.', 'A circle becomes a little height.'];
  }
  if (flock.mode[i] === 'gliding' && flock.guide[i] >= 0)
    return ['A bird shows the way.', `Following bird ${String(flock.guide[i] + 1).padStart(2, '0')} towards rising air.`];
  if (flock.cue[i] === 'weakening lift') return ['Time to leave.', 'The lift is fading. The next climb is uncertain.'];
  if (flock.effort[i] > .1) return ['Working to stay aloft.', 'Low on height, still searching for rising air.'];
  return ['Searching the sky.', 'Spending height, watching for a circling bird.'];
}
