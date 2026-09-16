# Flock — Of a feather

Open `/flock.html`. A standalone simulation study with 420 individual birds in an invented dusk setting. This page contains no observed tracks or radar-derived movement. It is available under **Flock** in the shared study navigation.

## Behaviour

The model lives in `src/flock-model.js` and is independent of rendering. Coordinates represent metres and the simulation uses a fixed 1/60-second step. It starts from a seeded ellipsoidal distribution and settles for two seconds before display.

- Alignment and attraction use the seven nearest birds, with the neighbour network refreshed at 20 Hz.
- Avoidance acts separately on the nearest neighbour, using relative velocity to anticipate approximately a quarter-second ahead.
- A preferred speed varies between individuals; airspeed stays within 8.5–14 m/s. Ground velocity also includes the local air velocity. Lateral steering is limited and acceleration responds over 0.28 seconds to soften the onset and release of turns.
- Bank angle responds to lateral acceleration, using gravity as a reference, and is bounded at approximately 46 degrees. The visual wings alternate smoothly between flapping and gliding.
- A soft radial boundary, vertical restraint and shared circling bias gather the flock near an imaginary roost. During departure this restraint relaxes and birds recruit into a shared direction; after passage they gather around a new place. These are authored environmental constraints, not evidence of observed roost behaviour.
- The optional pointer disturbance pushes away birds within 18 metres. Its position is projected onto a camera-facing plane through the flock centre; the gold ring marks that location. Responses then influence neighbours through the ordinary social rules.

This is a research-inspired steering model. It does not implement the full inertial spin model or Flock2's lift, drag, thrust and energy dynamics. It is not fitted to empirical bird trajectories and does not guarantee collision-free paths. Wing cadence, geometry, colours and the landscape are illustrative.

## The camera participates

- **Watch:** an orbit camera follows the flock's centre. Drag to orbit and scroll/pinch to change distance.
- **Follow one:** a bird is highlighted in gold. The camera follows behind and slightly alongside it, easing into its direction changes.
- **Fly among:** an independent participant approaches the companion with bounded acceleration (7 m/s²) and speed (23 m/s), aligns with its ground velocity, and adjusts its course around bodies within five metres. Heading is smoothed separately; the horizon stays level. Entry from Watch is a physical approach rather than a cut. Switching companions redirects the existing participant without teleporting it.
- **Another bird:** changes the companion; the camera transitions gradually to the new position.

In Fly among, birds gently give the participant space within four metres. It does not cause alarm or enter the seven-neighbour bird network. Other viewpoints have no influence. The participant advances on the same fixed simulation clock and holds position when flight pauses. Spacing is a soft preference, not a collision guarantee. Traces show about 1.6 seconds of recent paths for eighteen sampled birds. Space pauses/resumes; 1/2/3 choose the viewpoint. Disturb supports mouse movement and touch dragging. With disturbance disabled, normal orbit gestures return.

The simulation stops advancing when the tab is hidden or notes are open, and never catches up a hidden interval. Reduced-motion preferences start flight paused; play is explicit. Paused flight leaves camera exploration available. A WebGL failure produces a visible explanation.

## Research

- [Ballerini et al. (2008), topological interaction](https://pubmed.ncbi.nlm.nih.gov/18227508/).
- [Hemelrijk & Hildenbrandt (2015), avoidance and internal dynamics](https://doi.org/10.1371/journal.pone.0126913).
- [Attanasi et al. (2014), propagation of turns](https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/).
- [Flock2 (2024), orientation and flight mechanics](https://arxiv.org/html/2404.17804v1).

## Validation

`npm test` includes nearest-neighbour selection, repeatability, locality of the initial disturbance and a 150-second flight check spanning two passages for cohesion, distance from the moving gathering place, airspeed and bank angles. Separate checks cover local alarm and recovery, readiness variation, camera acceleration and companion retention, air continuity and advection, and independent musical responses. `npx playwright test tests/flock.spec.js` checks the production build under `/zugunruhe/` in Chromium and mobile WebKit: rendering errors, all camera modes, companion switching, pause/keyboard controls, traces, disturbance, notes, reduced motion and 320/390/1280-pixel layouts. The production build also verifies the frozen studies' original checksums.

This validates the implementation's behaviour and controls, not biological accuracy. Further work could compare neighbour turnover, spacing and propagation speeds with empirical datasets, refine banking and aerodynamics, and develop a separate soaring-species study.

## Musical startle — provisional instrument

A short click/tap in the sky, or N with the scene focused, plays one rounded note and sends a brief local startle through nearby birds. Drags, long presses, secondary clicks and multi-touch gestures do not sound notes. The source uses the same camera-facing depth plane as Disturb; an expanding gold ring identifies it. While flight is paused, a note can sound but no force is queued for resumption.

The instrument is isolated in `src/flock-sound.js`. Its authored sequence uses D-major pentatonic (F♯4, A4, E4, B4, D4, D5), following the existing Confluence pitch vocabulary. Quiet sine partials, a 75 ms entrance, 3.6-second release and restrained stereo echoes are a provisional timbre. The final flock soundtrack remains undecided; this page does not start a background recording. Notes on/off mutes the instrument independently of the visual gesture.

AudioContext creation is lazy and gesture-triggered. Notes are limited to one per 300 ms gesture window; at most four sustained voices remain, with a short fade when replacing the oldest. Muting, opening notes, hiding the page or leaving it silences the instrument and cancels pending starts. Audio failures leave the visual interaction available and can be retried on the next click.

The startle lasts 1.35 simulation seconds, within 24 metres of the source. It rises over 80 ms and then fades. Four simultaneous pulses are allowed. This is an authored association between music and movement, not a measured acoustic or avian startle response. The pulse strength, radius and instrument can be retuned independently when the soundtrack is developed.

## Responsive sound sketch

**Listen** opts into a quiet generated foundation and passing notes. It uses the same D-major pentatonic family as click notes. This is an auditionable sketch for the interaction, not a settled soundtrack composition. Click-note muting and the background sketch have separate controls. No background sound starts automatically.

`src/flock-agitation.js` measures actual simulation state at approximately 10 Hz:

- Each bird’s angular deviation from the mean direction of its seven neighbours. The RMS over the whole flock and over the most divergent fifth are combined so a local disturbance is not lost in a global average.
- RMS acceleration after subtracting the flock’s mean acceleration, with a dead band. This captures uneven steering while suppressing a uniform collective turn.

The two terms contribute 65% and 35% to a bounded 0–1 signal. Normalisation and weighting are authored parameters, not biologically calibrated thresholds. The measure can rise during spontaneous motion, and a click that does not unsettle nearby birds need not raise it. Neither click count, camera position nor the presence of a pointer directly controls musical agitation.

`src/flock-score.js` and `src/flock-music-state.js` combine that signal with three separate model states:

- **Readiness:** individual urge to depart, averaged across the flock. It strengthens a gentle pulse in the foundation and shortens passing-note intervals by up to 30%.
- **Coherence:** magnitude of the average unit air-velocity vector. Aligned flight brings the foundation layers into a shared breathing phase and narrows the passing notes' stereo spread. Scattered flight separates those phases and changes the order of the melody.
- **Alarm:** proximity to a pointer disturbance or click pulse drives a local state. Neighbours carry an attenuated signal; it decays without new stimulation. Musical alarm rises over 0.3 seconds and releases over 5 seconds, shortening note attacks and tails, adding upper partials and changing the melody order.
- The original movement-derived agitation still affects note density, brightness and stereo motion, rising over 0.8 seconds and relaxing over 7 seconds. Readiness and coherence smooth over 4 seconds.
- D3/A3/E4, D-major pentatonic passing tones, short echoes and bounded polyphony remain provisional. Output gain is fixed; the breathing pulse attenuates the foundation rather than boosting its peak. No background audio feeds forces into the simulation.

These are artistic mappings. Alarm is an authored disturbance signal, coherence is a directional statistic, and readiness is an imagined internal state. None claims to measure an actual bird's emotion.

The scheduler uses AudioContext time, independently of rendering and simulation speed. Pausing the birds holds the measured state while the music keeps moving. Hiding or leaving the page, opening notes, or stopping Listen silences the sketch and cancels pending starts; returning requires an explicit Listen gesture. Delayed ticks do not generate catch-up bursts. Autonomous music does not apply forces to the birds, so there is no runaway feedback loop.

Tests cover calm shared turns, local disorder, smoothing and mapping, actual phrase scheduling at calm/agitated levels, stop/resume behaviour, and opt-in playback in Chromium and mobile WebKit.

## A gathering becomes a passage

`src/flock-life.js` gives every bird a different readiness rate and threshold, derived deterministically from its seeded individual variation. Each bird slowly becomes ready, takes encouragement from readier neighbours, and slows its accumulation under alarm. Updates read the previous step synchronously.

The first gathering lasts at least ten simulation seconds. During **stirring**, some birds begin favouring a common direction before others. **Departure** begins once more than 62% cross their individual thresholds and group alarm is low. After at least eight seconds, coherence above 0.88 marks **passage**. Twenty-eight seconds of passage leads to **regrouping** around a new place, where readiness decays; after at least eighteen seconds and readiness below 0.12 another gathering can begin. The default undisturbed first departure is around 25 simulation seconds; the cycle takes roughly 80 seconds.

This is a hybrid of individual recruitment and an authored episode structure. The shared bearing, state gates, short durations and urge variable are artistic decisions, not an empirically calibrated account of Zugunruhe. Biological migratory restlessness is distinct from alarm and generally concerns seasonal disposition to migrate; [the blackbird study](https://www.nature.com/articles/srep34207) helps explain that distinction. [Jackdaw research](https://www.nature.com/articles/s41467-019-13281-4) supports exploring context-dependent behaviour, but this implementation does not reproduce its transit/mobbing rules or claim to simulate jackdaws.

## Moving air

`src/flock-air.js` supplies a deterministic continuous velocity field: a prevailing breeze, gentle spatial and temporal variation, and drifting columns of rising air with slight subsidence between them. Position integrates air-relative bird velocity plus local air velocity. The model still controls preferred airspeed and height; it does not calculate energy, lift, drag or wing wakes, and does not implement stork thermal-seeking decisions.

**Air** reveals 96 faint local direction segments sampled from that same field. Their lattice drifts and recycles around the flock; these are field indicators, not physical tracer trajectories. The air influences the birds regardless of whether the indicators are visible. They use simulation time and hold while flight is paused. The distant invented horizon follows horizontal camera travel so repeated passages cannot leave the sky's backdrop.
