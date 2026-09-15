# Flock — Of a feather

Open `/flock.html`. A standalone simulation study with 420 individual birds in an invented dusk setting. This page contains no observed tracks or radar-derived movement. It is available under **Flock** in the shared study navigation.

## Behaviour

The model lives in `src/flock-model.js` and is independent of rendering. Coordinates represent metres and the simulation uses a fixed 1/60-second step. It starts from a seeded ellipsoidal distribution and settles for two seconds before display.

- Alignment and attraction use the seven nearest birds, with the neighbour network refreshed at 20 Hz.
- Avoidance acts separately on the nearest neighbour, using relative velocity to anticipate approximately a quarter-second ahead.
- A preferred speed varies between individuals; speed stays within 8.5–14 m/s. Lateral steering is limited and acceleration responds over 0.28 seconds to soften the onset and release of turns.
- Bank angle responds to lateral acceleration, using gravity as a reference, and is bounded at approximately 46 degrees. The visual wings alternate smoothly between flapping and gliding.
- A soft radial boundary, vertical restraint and shared circling bias keep the flock near an imaginary roost. These are authored environmental constraints, not evidence of observed roost behaviour.
- The optional pointer disturbance pushes away birds within 18 metres. Its position is projected onto a camera-facing plane through the flock centre; the gold ring marks that location. Responses then influence neighbours through the ordinary social rules.

This is a research-inspired steering model. It does not implement the full inertial spin model or Flock2's lift, drag, thrust and energy dynamics. It is not fitted to empirical bird trajectories and does not guarantee collision-free paths. Wing cadence, geometry, colours and the landscape are illustrative.

## The camera participates

- **Watch:** an orbit camera follows the flock's centre. Drag to orbit and scroll/pinch to change distance.
- **Follow one:** a bird is highlighted in gold. The camera follows behind and slightly alongside it, easing into its direction changes.
- **Fly among:** a close accompanying position looks ahead through the flock. Heading is smoothed separately from the bird's steering; only a small fraction of the bird's roll reaches the camera, keeping the horizon almost level.
- **Another bird:** changes the companion; the camera transitions gradually to the new position.

The camera has no influence on the simulation. Traces show about 1.6 seconds of recent paths for eighteen sampled birds. Space pauses/resumes; 1/2/3 choose the viewpoint. Disturb supports mouse movement and touch dragging. With disturbance disabled, normal orbit gestures return.

The simulation stops advancing when the tab is hidden or notes are open, and never catches up a hidden interval. Reduced-motion preferences start flight paused; play is explicit. Paused flight leaves camera exploration available. A WebGL failure produces a visible explanation.

## Research

- [Ballerini et al. (2008), topological interaction](https://pubmed.ncbi.nlm.nih.gov/18227508/).
- [Hemelrijk & Hildenbrandt (2015), avoidance and internal dynamics](https://doi.org/10.1371/journal.pone.0126913).
- [Attanasi et al. (2014), propagation of turns](https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/).
- [Flock2 (2024), orientation and flight mechanics](https://arxiv.org/html/2404.17804v1).

## Validation

`npm test` includes nearest-neighbour selection, repeatability, locality of the initial disturbance and a two-minute flight check for cohesion, bounded positions, speed and bank angles. `npx playwright test tests/flock.spec.js` checks the production build under `/zugunruhe/` in Chromium and mobile WebKit: rendering errors, all camera modes, companion switching, pause/keyboard controls, traces, disturbance, notes, reduced motion and 320/390/1280-pixel layouts. The production build also verifies the frozen studies' original checksums.

This validates the implementation's behaviour and controls, not biological accuracy. Further work could compare neighbour turnover, spacing and propagation speeds with empirical datasets; refine banking and aerodynamics; and explore a camera that chooses routes through local gaps.

## Musical startle — provisional instrument

A short click/tap in the sky, or N with the scene focused, plays one rounded note and sends a brief local startle through nearby birds. Drags, long presses, secondary clicks and multi-touch gestures do not sound notes. The source uses the same camera-facing depth plane as Disturb; an expanding gold ring identifies it. While flight is paused, a note can sound but no force is queued for resumption.

The instrument is isolated in `src/flock-sound.js`. Its authored sequence uses D-major pentatonic (F♯4, A4, E4, B4, D4, D5), following the existing Confluence pitch vocabulary. Quiet sine partials, a 75 ms entrance, 3.6-second release and restrained stereo echoes are a provisional timbre. The final flock soundtrack remains undecided; this page does not start a background recording. Notes on/off mutes the instrument independently of the visual gesture.

AudioContext creation is lazy and gesture-triggered. Notes are limited to one per 300 ms gesture window; at most four sustained voices remain, with a short fade when replacing the oldest. Muting, opening notes, hiding the page or leaving it silences the instrument and cancels pending starts. Audio failures leave the visual interaction available and can be retried on the next click.

The startle lasts 1.35 simulation seconds, within 24 metres of the source. It rises over 80 ms and then fades. Four simultaneous pulses are allowed. This is an authored association between music and movement, not a measured acoustic or avian startle response. The pulse strength, radius and instrument can be retuned independently when the soundtrack is developed.

## Agitation-responsive sound sketch

**Listen** opts into a quiet generated foundation and passing notes. It uses the same D-major pentatonic family as click notes. This is an auditionable sketch for the interaction, not a settled soundtrack composition. Click-note muting and the background sketch have separate controls. No background sound starts automatically.

`src/flock-agitation.js` measures actual simulation state at approximately 10 Hz:

- Each bird’s angular deviation from the mean direction of its seven neighbours. The RMS over the whole flock and over the most divergent fifth are combined so a local disturbance is not lost in a global average.
- RMS acceleration after subtracting the flock’s mean acceleration, with a dead band. This captures uneven steering while suppressing a uniform collective turn.

The two terms contribute 65% and 35% to a bounded 0–1 signal. Normalisation and weighting are authored parameters, not biologically calibrated thresholds. The measure can rise during spontaneous motion, and a click that does not unsettle nearby birds need not raise it. Neither click count, camera position nor the presence of a pointer directly controls musical agitation.

`src/flock-score.js` turns that signal into a musical response:

- Activity rises with a 0.8-second smoothing time and relaxes over 7 seconds.
- Passing-tone intervals range from roughly 10 seconds at rest to 1.8 seconds at maximum agitation. A persistent phase clock avoids retriggering phrases when the state changes.
- Upper partials brighten gently, the foundation’s low-pass filter opens, and stereo movement quickens. Master gain remains fixed.
- A D3/A3/E4 foundation, a restrained melody, short echoes and bounded polyphony provide a provisional instrument palette. These are deliberately separated from the state measurement so future soundtrack work can replace them.

The scheduler uses AudioContext time, independently of rendering and simulation speed. Pausing the birds holds the measured state while the music keeps moving. Hiding or leaving the page, opening notes, or stopping Listen silences the sketch and cancels pending starts; returning requires an explicit Listen gesture. Delayed ticks do not generate catch-up bursts. Autonomous music does not apply forces to the birds, so there is no runaway feedback loop.

Tests cover calm shared turns, local disorder, smoothing and mapping, actual phrase scheduling at calm/agitated levels, stop/resume behaviour, and opt-in playback in Chromium and mobile WebKit.
