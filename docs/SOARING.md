# Soaring — Borrowed sky

`/soaring.html` is a separate, explicitly simulated study of twenty white storks.
The birds climb in drifting columns of rising air and glide between them over an
imagined landscape. It is linked from the shared navigation beside Flock, and
links onward to the recorded stork journeys at `/migration.html`.

## The flight

The model uses metres, seconds and a fixed 60 Hz step. Each bird has a seeded
climbing radius (30–42 m), efficiency and departure preference. It gains height
when local lift exceeds its sinking speed; banking adds to the sink. A low-height
flapping rule helps it recover. Horizontal wind carries birds and thermals together.

The birds have a broad eastward migration direction and different lateral search
sweeps, but no supplied locations for future thermals. They sample local lift and
remember the strongest encountered position, advecting that estimate with the
wind. That remembered point guides circling. Only the opening bird begins with a
known core. The thermal index is observational bookkeeping, never a steering target.

A visible climber within 380 m, gaining more than 0.65 m/s, can draw another bird
towards its current position. Birds prefer their existing guide while it remains
useful; a sinking or lost companion stops supplying that cue. They avoid returning
to the column they just abandoned. These simple visibility and memory rules are
authored, not a reconstruction of how real storks perceive lift.

## Weather and varied lift

Thermals retain staggered 240-second cycles of growth, decay and quiet. Their
profiles alternate along the route: broad, gentler columns (about 82 m radius,
4.4 m/s peak); narrow, stronger cores (about 48 m, 6.4 m/s); and broken lift with
two smaller pockets separated by a weak saddle. Broken pockets breathe smoothly
over tens of seconds. These are authored contrasts, not calibrated thermal types.
Actual lift is reduced by lifecycle, cloud shade, position and altitude.

Wind shifts over several minutes: the eastward component ranges from 0.55 to
1.65 m/s, and the crosswind from −0.4 to 1.0 m/s. Thermal displacement uses the
analytic integral of that wind. Birds, remembered cores and the air camera all
sample the same field. Broad migration sweeps follow the drifting air mass;
birds still receive no future thermal locations or cloud-based navigation cues.

A continuous cloud pattern moves across the sky and fields. Shade at a thermal's
centre reduces its strength by up to 42%. This is an immediate artistic coupling,
not a model of ground heating or cloud formation. Sky veils, field shadows and
lift strength use the same pattern. The weather caption reports wind speed and
sunlight at the selected bird. All weather follows simulation time and holds on
pause or while hidden. Restart reproduces the same weather and decisions.

Lift guides show the widths and paired pockets; opacity samples actual local
lift, including shade and the broken pockets' pulses. A simplified effort reserve
recovers during climbing and falls during searching and flapping. Lower reserves
increase preferred height gain; weak lift, waiting and departing companions build
readiness. Sustained weak climb can prompt departure before the goal is reached.

In the default weather episode, bird 01 leaves weakening lift at about 55 seconds,
after gaining roughly 98 m. Bird 16 finds the next, narrow core at about 98 seconds.
Bird 01 follows that climber briefly, loses the cue, then samples lift itself at
about 108 seconds. Fifteen other birds enter that column through social cues.
Later, bird 01 joins a climb through companions at about 237 seconds. These are
current authored timings, not measured migration; some birds miss lift and spend
more effort staying aloft.

Social decisions read the previous shared positions, velocities and modes. Unit
tests also run a counterfactual with social cues disabled: independent discovery
still happens, while recruitment disappears. This checks the implemented mechanism;
it is not evidence that the model predicts real flight.

## Views and controls

- **Watch:** orbit and zoom around the group's centre.
- **Follow one:** a close travelling view of the selected bird, tinted gold.
- **With the air:** a camera with its own velocity and acceleration. It samples
  local lift, sinks between thermals and gently seeks a position beside its
  companion, with soft avoidance of nearby birds. The view eases back from 10 to
  15 m as nearby companions thin out; its field of view opens by at most 5 degrees.
  A discovered climber draws the look target at most 3 m away from the selected
  bird, eased over three seconds. Follow uses the same framing with a slightly
  greater following distance. Both views keep the selected bird as their subject
  and do not affect flight.
- **Another bird:** changes the companion and the bird described by the captions.
- **Lift:** schematic helices mark three nearby thermal regions, splitting into
  paired pockets for broken lift. Width and opacity reflect the local lift field;
  these are visual guides, not air-particle trajectories or measured weather.
- **Traces:** up to about 29 seconds of recent paths for all twenty birds.
- **Pause:** holds bird motion and the air camera. Watch and Follow remain explorable.
- **Restart:** returns to Watch and the first climb, preserving the paused/playing
  state and overlay choices. It stops sound.

Height is above the scene's reference plane, not clearance above the terrain.
The landscape patch follows the camera in every view, including journeys with
birds far from the group's centre. It extends beyond the radial haze and reuses
the same mesh. Tile shifts preserve the world-space hills and field pattern.
Bird poses and the air camera interpolate between completed simulation steps,
so faster or uneven display refresh rates do not show repeated 60 Hz poses.
This adds one simulation step (about 17 ms) of visual delay. Pausing or hiding
the page retains that intermediate pose; flight decisions still run at 60 Hz.
Space toggles flight, 1/2/3 select views and N changes birds. Reduced motion begins
paused; explicit Play starts flight. Notes and hidden tabs freeze simulation time
without a catch-up jump. The native notes dialog restores focus when closed.

## Sound direction — air and answering voices

The chosen direction is a quiet, sustained lower voice for the air, with rounded,
sparse phrases above it. It keeps the D-major pentatonic vocabulary. The selected
bird's climb rate draws ascending phrases together; height adds an upper harmonic.
Departure closes a phrase softly on A, followed by longer releases and more space.
Searching thins the upper foundation and leaves longer gaps.

Nearby companions in confident flight allow a second voice to answer alternate
phrases, 2.6 seconds later at less than half the lead amplitude. Stereo movement
gently draws together. Proximity is measured continuously within a roughly 100 m
neighbourhood and eased over four seconds, so individual arrivals do not each
trigger a sound. Seeing a climber and finding lift gradually restores the upper
voices. Readiness slightly shortens phrase spacing. Changing companions does not
invent a departure. These are artistic mappings, not measures of emotion.

Listen remains opt-in. A keyboard-accessible volume slider appears while listening;
zero is silent and changing volume does not restart the composition. The default
is 65%, with the same level used for the standalone listening render. The rendering
uses the live Web Audio graph and the default flight. Weather changes reach the
score through the existing climb, searching, confidence and company inputs.

[Listen to the opening passage](../audio-studies/08-soaring/README.md): an archived
132-second render of the 22 September flight, before the varied weather pass.
Its event timings differ from the current flight; the score design is unchanged. The output has been checked for
finite samples, headroom and silence after stopping. Those signal checks do not
replace listening on headphones and speakers; the sample is provided for that review.

Pausing holds the musical inputs while music continues. Stopping, opening notes,
restarting or hiding the page fades the output and stops scheduling. A pending
AudioContext resume cannot override a later stop. Returning to the page requires
Listen again. Voices are bounded and late timers never generate catch-up bursts.

## Research and limits

- [Van Loon et al. (2011), Simsoar](https://doi.org/10.1016/j.jtbi.2010.10.038):
  individual-based modelling of soaring migration.
- [Flack et al. (2018)](https://pubmed.ncbi.nlm.nih.gov/29798883/):
  social roles in migrating white storks.

These motivate the study's questions. This implementation reproduces neither
paper's model, parameters nor observed tracks. Lift, sink, routing, individual
variation, social cues and the landscape are authored simplifications. There is
no measured weather data, ground-heating model, long-term route learning, thermoregulation, physiological energy
budget, terrain-driven thermal generation or validated aerodynamic model. The
effort reserve is a bounded artistic state; zero does not represent starvation
or disable the low-height recovery rule. The recorded migration study
remains separate and is not used to generate these flights.

## Validation

Unit tests check a full climb/departure/glide/arrival, staggered departures,
repeatability, drift, ten minutes of bounded flight, camera speed and acceleration,
discovery and recruitment (including social cues disabled), rejection of sinking
guides, truthful captions, state-to-music mapping, departure events and cancellation
during audio resume, proximity framing, bounded attention shifts, quiet delayed
answers and volume without restarting.
Terrain checks cover every selectable bird over three simulated hours, distant
camera transfers, negative coordinates, and continuity across tile boundaries.
Weather tests cover distinct lift footprints, cloud weakening, continuous wind
and its integrated drift over three hours. The ten-minute flight encounters all
three lift profiles. Motion tests cover 60, 90, 120 and 144 Hz displays, uneven frame timing, held
intermediate poses and entering the air camera without a position jump.
Browser tests cover Chromium and mobile WebKit: rendering, views, held pause
clicks, overlays, restart, notes/focus, opt-in audio, reduced motion, the recorded
migration link, and layouts from 320 to 1280 px.

Run `npm test`, `npm run build`, then `npx playwright test tests/soaring.spec.js`.
If port 4187 is occupied by another project, set `PREVIEW_PORT=4188` for Playwright,
or `PORT=4188 npm run preview:hosted` for a manual preview.
