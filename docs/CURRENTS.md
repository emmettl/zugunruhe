# Study 04 — Currents

`currents.html` carries persistent luminous tracers through the same 37-station
night, 4–5 September 2018, 18:00–06:00 UTC. Sea remains at `continent.html`.
The shared scene retains its original defaults; Currents supplies an additional
path renderer, a quieter initial exposure and its own controls and notes.

## Movement, not tracked birds

The source is the processed radar population velocity (`ub`, east-positive;
`vb`, north-positive, m/s) from Zenodo 4587338 v3. Paths are calculated through
this field. They are not observed individual journeys, species routes or flocks.
No external visual precedents were used.

The estimator retains Sea's 0.25° grid, 90 km Gaussian distance scale, and
180–240 km taper. Density and complete velocity pairs are estimated separately.
For paths, missing velocity stays unavailable rather than becoming a stationary
texture. Support uses the nearer limit of density and complete-velocity support,
fading between 120 and 240 km from the relevant available observations.

Spatial sampling is bilinear. Every corner with nonzero weight must be available.
Five-minute fields interpolate linearly in time; missing endpoints are not
bridged. A second-order midpoint integrator advances positions every 60 seconds,
converting m/s to latitude/longitude displacement on a spherical Earth. The
stored path samples are five minutes apart; display positions interpolate between
them. Each tracer keeps its 200 m altitude band. There is no vertical velocity,
wind-response model, take-off/landing model or mass conservation.

Seeds are reproducible (seed 20180904), with up to 18 new candidates each five
minutes. Grid-node selection is weighted by estimated density × support, with
small within-cell jitter. Initial support must exceed 0.2 and density be positive.
Lifetimes are 150–210 minutes, clipped to the data window. Paths terminate when
velocity/density support becomes unavailable or the sampled terrain reaches their
altitude. Terrain checks use the existing regional height map, including at
integration midpoints; this is not an ecological barrier-avoidance model.

## Appearance and clock

Each thread displays at most its previous 75 minutes, with a brighter leading
end and a fading tail. Births fade in over 10 minutes; the whole thread fades
out over its final 15 minutes. These fades also soften the night-window endpoints.
Widths, population of tracers, tail length, lifetime and exposure are artistic
choices. Density influences seeding and opacity; thread counts are not bird counts.

Playback follows the existing five-real-minutes-per-screen-second clock. Pause
freezes positions; scrubbing reconstructs the exact same paths without replaying
a simulation. No boundary wrapping or random reseeding happens in the browser.
The background still uses Sea's illustrative moving texture and is not transported
density. Travelling threads can be switched off for comparison. Observation
support hides the threads and retains Sea's distance-support display.

Palette, cloud cover, terrain relief, station descent/Back, and keyboard controls
remain available. Aquatic and luminosity 0.8 are the initial Currents settings.

## Reproduction and checks

Run `node scripts/prepare-currents.mjs` to regenerate
`data/processed/currents-night.json` from the checked-in network and terrain.
The initial preparation contains 2,099 paths and 58,176 stored points.

Unit checks verify direction and physical displacement, time-varying velocity,
missing support, zero velocity, and deterministic timeline clipping. Build checks
still verify the frozen Cloud and Archipelago snapshots. Browser checks cover
the new entry, playback, thread visibility control and retained navigation.

## Travelling flyover

The Flyover button now starts a camera itinerary: a smooth descent followed by
65 seconds of forward travel at 100 km, from central Germany along the Alpine
foreland toward eastern France. The camera looks ahead at 25° below the local
horizon along a curved route and
eases into and out of its pass. This viewing route is authored, not inferred from
bird migration data. Sea's earlier static camera presets remain unchanged.

Starting a flyover starts data playback. Camera travel is independent of the data
clock, so pausing or scrubbing the data does not freeze the camera. Stop flyover,
Escape, dragging or scrolling stops at the current viewpoint and restores manual
control. Back returns to the saved pre-flight view, including during descent.
Selecting another preset ends the flight; selecting a station ends the flight and
retains the original return bookmark. At the route's end the camera settles and
Back remains available. Reduced-motion settings use immediate entry and half-speed
cruising for this explicitly requested movement.

Camera tests cover route continuity, 100 km clearance, Stop, exact bookmark
restoration, completion and restart. The local browser check covers the actual
travelling scene and its Stop/Back controls.
