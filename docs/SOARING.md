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

The route supplies likely thermal positions, 700 m apart. Birds do not discover
arbitrary invisible air. Nearby circling companions remove a small search wobble;
nearby departures can reduce an individual's preferred exit height. Once high
enough, each bird waits until facing roughly towards the next thermal before
leaving. Social decisions read the previous shared state rather than a partially
updated flock. Restart recreates the same seeded journey.

The default bird's first climb lasts about 35 seconds and gains about 93 m. It
then glides for about 44 seconds, arriving roughly 15 m lower. It can still climb
briefly after deciding to leave because it remains inside the departing thermal.
The timing and distances make the movement legible; they are not a fitted account
of a particular species' migration. Individual flights diverge as the journey goes on.

## Views and controls

- **Watch:** orbit and zoom around the group's centre.
- **Follow one:** a close travelling view of the selected bird, tinted gold.
- **With the air:** a camera with its own velocity and acceleration. It samples
  local lift, sinks between thermals and gently seeks a position beside its
  companion, with soft avoidance of nearby birds. It does not affect the birds.
- **Another bird:** changes the companion and the bird described by the captions.
- **Lift:** schematic helices mark three thermal columns. Their spirals are
  visual guides, not air-particle trajectories or measured weather.
- **Traces:** up to about 29 seconds of recent paths for all twenty birds.
- **Pause:** holds bird motion and the air camera. Watch and Follow remain explorable.
- **Restart:** returns to Watch and the first climb, preserving the paused/playing
  state and overlay choices. It stops sound.

Height is above the scene's reference plane, not clearance above the terrain.
Space toggles flight, 1/2/3 select views and N changes birds. Reduced motion begins
paused; explicit Play starts flight. Notes and hidden tabs freeze simulation time
without a catch-up jump. The native notes dialog restores focus when closed.

## Provisional sound

Listen is opt-in, with a separate audio clock and a quiet D-major pentatonic
foundation. The selected bird's climb rate draws ascending phrases together;
height increases the upper harmonic. Departures sound a high note and gliding
uses wider panning and longer releases. Changing companions does not invent a
departure. This is a musical interpretation of flight, not a measure of emotion.

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
no weather data, route learning, thermoregulation, energy budget, terrain-driven
thermal generation or validated aerodynamic model. The recorded migration study
remains separate and is not used to generate these flights.

## Validation

Unit tests check a full climb/departure/glide/arrival, staggered departures,
repeatability, drift, ten minutes of bounded flight, camera speed and acceleration,
state-to-music mapping, departure events and cancellation during audio resume.
Browser tests cover Chromium and mobile WebKit: rendering, views, held pause
clicks, overlays, restart, notes/focus, opt-in audio, reduced motion, the recorded
migration link, and layouts from 320 to 1280 px.

Run `npm test`, `npm run build`, then `npx playwright test tests/soaring.spec.js`.
If port 4187 is occupied by another project, set `PREVIEW_PORT=4188` for Playwright,
or `PORT=4188 npm run preview:hosted` for a manual preview.
